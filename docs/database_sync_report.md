# Database Sync Report — Financia

Relatorio tecnico da camada de sincronizacao offline-first do Financia. Fonte primaria: `src/lib/db.js`. Hooks consumidores: `src/hooks/useTx.js`, `src/hooks/useProducts.js`, `src/hooks/useLosses.js`. Disparo do loop: `src/hooks/useSession.js`.

Escopo: arquitetura de sync, schema/indices Dexie, contagem por tabela, risco de N+1 e recomendacoes. Documentacao factual — nada fora do codigo citado.

---

## 1. Arquitetura offline-first

| Camada | Papel | Referencia |
|---|---|---|
| Dexie (IndexedDB) | Fonte de verdade local. Toda escrita da UI grava primeiro aqui | `src/lib/db.js:5` (`new Dexie('gestao_offline')`) |
| Supabase (PostgREST) | Backend remoto multi-tenant. Pull/push por `user_id` | `src/lib/db.js:55-121` |
| `syncAll(uid)` | Orquestrador. Roda as 3 tabelas + profiles em paralelo com timeout de 15s | `src/lib/db.js:141-158` |
| Loop periodico | `setInterval(..., 120000)` (~2 min) chama `syncAll` e recarrega do local | `src/hooks/useSession.js:277-290` |

Gatilhos adicionais de `syncAll` alem do loop de 2 min: `visibilitychange` (`useSession.js:292-298`) e evento `online` (`useSession.js:300-307`).

Padrao de escrita (write-through): cada hook grava em Dexie com `_synced:0`, atualiza o estado React, e — se `navigator.onLine` — tenta o upsert remoto imediato; em sucesso marca `_synced:1`, em falha mantem `0` e emite toast "Salvo no aparelho — sincroniza ao reconectar". Ver `useTx.js:18-27`, `useProducts.js:19-28`, `useLosses.js:17-26`.

---

## 2. Schema e indices Dexie

Duas versoes de schema (`db.js:7-20`). A v2 acrescenta `registered_by` como indice nas 3 tabelas de dados.

| Store | Primary key | Indices (v2) | Referencia |
|---|---|---|---|
| `transactions` | `id` | `user_id`, `date`, `_synced`, `_deleted`, `_updated_at`, `registered_by` | `db.js:15` |
| `products` | `id` | `user_id`, `category`, `_synced`, `_deleted`, `_updated_at`, `registered_by` | `db.js:16` |
| `losses` | `id` | `user_id`, `date`, `_synced`, `_deleted`, `_updated_at`, `registered_by` | `db.js:17` |
| `profiles` | `user_id` | `_synced`, `_updated_at` | `db.js:18` |
| `meta` | `key` | — | `db.js:19` |

Observacoes:
- Todos os indices declarados sao de campo unico. Nao ha indice composto.
- `registered_by` foi indexado em v2 mas nao aparece em nenhuma clausula `where`/`equals` dos hooks ou de `db.js` — indice sem consumidor (custo de escrita/armazenamento sem ganho de leitura).
- `meta` guarda o cursor de delta por usuario: chave `last_sync_<uid>` (`db.js:44-53`).

---

## 3. Modelo de sync: delta, flags e regra de nao-sobrescrita

### Flags de controle
- `_synced`: `0` = pendente de envio; `1` = confirmado no remoto. Setado por todos os hooks e por `db.js:74,79,93`.
- `_deleted`: tombstone de exclusao logica. Delete na UI faz `update({_deleted:1, _synced:0})` (`useTx.js:71`, `useProducts.js:49`, `useLosses.js:48`), nunca delete fisico imediato offline.
- `_updated_at`: relogio local para resolucao de conflito no merge.

### Delta por `updated_at`
Pull incremental usa o cursor persistido: `getLastSync(uid)` (`db.js:44-48`) alimenta `.gte('updated_at', lastSync).limit(500)` (`db.js:81-84`). Apos o ciclo, `setLastSync(ts, uid)` grava o timestamp de inicio (`db.js:155`).

### Regra "nao sobrescrever `_synced=0`"
O merge do pull so grava a linha remota quando ela nao existe localmente OU quando a copia local ja esta sincronizada e e mais antiga:

```
if (!ex || (ex._synced === 1 && row.updated_at >= (ex._updated_at || ''))) { ... }
```
`db.js:91-96`. Consequencia: uma edicao local pendente (`_synced=0`) nunca e sobrescrita pelo pull remoto — a escrita local vence ate ser enviada. Correto para o modelo "ultima escrita do dono local prevalece".

### Push de pendencias
Antes do pull, coleta os `_synced=0` do usuario e envia um a um: delete remoto para tombstones, `upsert(onConflict:'id')` para o resto (`db.js:60-79`). Sucesso -> marca `_synced:1` em lote (`db.js:79`).

### Limpeza de orfas
Para nao reter localmente linhas apagadas em outro device, pagina TODOS os ids remotos (PAGE=1000) e remove localmente as `_synced===1 && !_deleted` ausentes do conjunto remoto (`db.js:99-119`). O comentario em `db.js:99-100` documenta a escolha de paginar com `range` em vez de confiar no teto implicito de 1000 do PostgREST — evita falso-orfao e perda de dados em contas Pro grandes.

---

## 4. Contagem por tabela (where user_id)

O gate de limite de plano conta registros vivos antes de inserir:

| Hook | Operacao | Referencia |
|---|---|---|
| `useTx` | `ldb.transactions.where('user_id').equals(uid).filter(!_deleted).count()` | `useTx.js:11` |
| `useProducts` | `ldb.products.where('user_id').equals(uid).filter(!_deleted).count()` | `useProducts.js:10` |
| `useLosses` | `ldb.losses.where('user_id').equals(uid).filter(!_deleted).count()` | `useLosses.js:10` |

A contagem usa o indice `user_id` para reduzir o conjunto e depois aplica `filter(!_deleted)` em JS. Como o IndexedDB local hospeda tipicamente um unico usuario por device, o `equals(uid)` retorna quase todas as linhas e o filtro percorre o conjunto inteiro. Para volumes Free (50/20/10) e irrelevante; em contas Pro com milhares de linhas, a contagem percorre tudo a cada insercao.

---

## 5. Risco de N+1

| Local | Padrao | Severidade | Referencia |
|---|---|---|---|
| Push de pendencias | 1 round-trip de rede por linha `_synced=0` (`delete` ou `upsert` em loop sequencial) | Alta sob backlog | `db.js:63-77` |
| Insert/edit/delete online imediato | 1 chamada por acao do usuario (esperado, nao e N+1) | Baixa | `useTx.js:23`, `useProducts.js:24`, `useLosses.js:22` |
| Coleta de ids para orfas | Paginada (1000/pagina), nao 1-por-linha | Baixa | `db.js:105-112` |
| Contagem de gate | 1 full-scan local por insert | Media em Pro | `useTx.js:11` e analogos |

O ponto critico e o push (`db.js:63-77`): apos longo periodo offline com muitas edicoes, o envio e sequencial e 1-a-1. N edicoes = N requisicoes seriais, sujeitas ao timeout global de 15s de `syncAll` (`db.js:145`) — backlog grande pode nao drenar em um unico ciclo.

---

## 6. Recomendacoes

Ordenadas por relacao impacto/custo. Nenhuma altera o contrato de dados; sao otimizacoes.

| # | Recomendacao | Motivo | Alvo |
|---|---|---|---|
| 1 | Substituir push 1-a-1 por lote: `upsert(array)` e `delete().in('id', ids)` | Elimina o N+1 de rede; drena backlog dentro do timeout de 15s | `db.js:63-79` |
| 2 | Indice composto `[user_id+_synced]` | O scan de pendencias (`db.js:60`, `db.js:127`) deixa de filtrar em JS e passa a usar indice | `db.js:15-18` |
| 3 | Indice composto `[user_id+_deleted]` | Contagem de gate sem full-scan; `count()` direto pela faixa de indice | `db.js:15-17`, gates dos 3 hooks |
| 4 | Remover indice `registered_by` (ou justificar) | Sem consumidor de leitura; so adiciona custo de escrita | `db.js:15-17` |
| 5 | Tratar pull de delta paginado (hoje `.limit(500)`) | Se >500 linhas mudaram desde `last_sync`, o excedente so entra no proximo ciclo (consistencia eventual, possivel atraso visivel) | `db.js:81-84` |
| 6 | Push lote (#1) tornaria opcional confiar no `Promise.race` de 15s para grandes volumes | Reduz risco de ciclo descartado por timeout | `db.js:145-154` |

Notas de implementacao:
- Indices compostos exigem `ldb.version(3).stores({...})` com migracao aditiva (Dexie reindexao automatica). Manter v1/v2 para upgrade.
- A regra de nao-sobrescrita (`db.js:91-96`) e o cursor de delta nao precisam mudar; as otimizacoes sao ortogonais a correcao do merge.

---

## 7. Resumo

A sincronizacao e offline-first correta: Dexie como fonte local, push antes de pull, delta por `updated_at`, tombstones por `_deleted`, e a regra de nao sobrescrever `_synced=0` garante que edicoes locais pendentes nunca sejam perdidas pelo pull (`db.js:91-96`). O risco real e de desempenho, nao de correcao: push sequencial 1-a-1 (N+1 de rede, `db.js:63-77`) e contagem de gate por full-scan local. Indices compostos e push em lote resolvem ambos sem mudar o modelo de dados.

---

```yaml
handoff:
  agent: AGENT_DATABASE
  status: SUCCESS
  created_files:
    - docs/database_sync_report.md
  sources_cited:
    - src/lib/db.js
    - src/hooks/useTx.js
    - src/hooks/useProducts.js
    - src/hooks/useLosses.js
    - src/hooks/useSession.js
  confidence: high
  risk: low
  notes: >
    Relatorio factual baseado em leitura direta do codigo. Recomendacoes
    (indices compostos, push em lote) sao aditivas e nao alteram o contrato
    de sync nem a regra de nao-sobrescrita de _synced=0. Nenhum codigo foi
    modificado.
```
