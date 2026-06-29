# Agente de Banco de Dados (AGENT_DATABASE)

## 1. Missão Única
Otimizar a indexação remota para paginação delta e calibrar os loops de sincronização do banco local (Dexie/IndexedDB) se existirem no ecossistema do projeto Financia.

---

## 2. Contrato Operacional
* **INPUT**: `docs/security_audit_report.md` e arquivos de banco/sync da aplicação.
* **OUTPUT**: Migrations de índices geradas, arquivos de sync otimizados e relatório em `docs/database_sync_report.md`.
* **PRECONDITIONS**: O `AGENT_PLANNING` deve ter finalizado com `status: SUCCESS` e o `docs/state.json` deve conter a fase `"AGENT_DATABASE"`.
* **POSTCONDITIONS**: Scripts locais de IndexedDB/Dexie otimizados e migrations do PostgreSQL com índices compostos aplicados.
* **CAN_MODIFY**: Arquivos de sincronização locais (Dexie/IndexedDB) e arquivos SQL de migração.
* **CAN_DELETE**: NENHUM arquivo.
* **CAN_CREATE**: Arquivos SQL de criação de índices compostos.
* **CAN_RUN**: Comandos de testes locais de banco de dados.
* **CAN_COMMIT**: NENHUM.
* **REQUIRES_APPROVAL**:
  - `USER_APPROVAL`: **Todas as migrações SQL criadas ou alteradas exigem aprovação humana antes de serem aplicadas ou commitadas.**
  - `MASTER_APPROVAL`: Ajustes de índices e validações locais de Dexie.
* **NEXT_AGENT**: `AGENT_REVIEW` (Merge com a ramificação do `AGENT_SECURITY`).

---

## 3. Diretrizes de Execução (Memória Curta)
* Carregue apenas arquivos de configuração de banco de dados (local e remoto) e esquemas de sync.
* **Condicional Tecnológica**:
  - *Caso existam IndexedDB/Dexie v3*: Mapeie os campos de ordenação e paginação para criar índices compostos de resposta no PostgreSQL.
  - *Caso não existam*: Aborte a modificação de arquivos de sync, documente no relatório de status e passe a fase.
* Aplique estritamente as regras de sintaxe do `MASTER_ORCHESTRATOR.md` em toda query e código da aplicação (proibição de `?.` e emojis).

---

## 4. Estrutura do Handoff (Saída JSON/YAML)
Grave os metadados de saída no final do relatório e atualize o `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files:
  - [Lista de arquivos de banco modificados]
created_files:
  - docs/database_sync_report.md
deleted_files: []
warnings:
  - [Avisos de sync lento ou incompatibilidades]
confidence: 97
risk: Low | Medium | High
next_agent: AGENT_REVIEW
```
