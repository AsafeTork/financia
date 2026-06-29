# Agente de Liberação (AGENT_RELEASE)

## 1. Missão Única
Consolidar a entrega de código, efetuar a remoção física dos arquivos obsoletos do repositório, emitir o relatório de liberação e executar os commits do Git agrupados por macro-escopo.

---

## 2. Contrato Operacional
* **INPUT**: `docs/discovery_report.md` contendo a lista de obsoletos e status atual do Git.
* **OUTPUT**: Limpeza física dos arquivos deletados, criação de `docs/release_summary.md`, atualização do `docs/state.json` e commits consolidados.
* **PRECONDITIONS**: O `AGENT_DOCUMENTATION` deve ter finalizado com `status: SUCCESS` e a fase corrente no `state.json` deve ser `"AGENT_RELEASE"`.
* **POSTCONDITIONS**: Árvore do projeto limpa, sem arquivos não rastreados pendentes de commit.
* **CAN_MODIFY**: `docs/state.json` e relatório de liberação.
* **CAN_DELETE**: Arquivos obsoletos mapeados na fase de descoberta (`docs/discovery_report.md`).
* **CAN_CREATE**: `docs/release_summary.md`.
* **CAN_RUN**: Comandos Git (`git status`, `git add`, `git commit`) e comandos de exclusão (`rm`, `del`).
* **CAN_COMMIT**: Sim. Commits de agrupamento macro permitidos.
* **REQUIRES_APPROVAL**:
  - `USER_APPROVAL`: **A consolidação final do Git e eventual submissão/push para branch remota de produção exige sinal verde do Usuário.**
  - `MASTER_APPROVAL`: Exclusão física de arquivos de documentação obsoleta local.
* **NEXT_AGENT**: Final do fluxo (Pipeline concluído).

---

## 3. Diretrizes de Execução (Memória Curta)
* Carregue apenas os relatórios da pasta `/docs` e o status de modificações do repositório.
* **Política de Commits Agrupados (Macro-escopo - Invariante)**:
  - **PROIBIDO** realizar micro-commits por arquivo ou tela individual.
  - Faça commits consolidados que representem o escopo de entregas.
  - **Exemplos de commits obrigatórios**:
    - `style(views): polimento de responsividade mobile`
    - `style(components): padronização de área de toque`
    - `style(layout): refinamento visual geral`
    - `style(theme): melhoria de contraste e tipografia`
    - `feat(security): correções de RLS e multi-tenant`
    - `feat(sync): otimizações de índices de paginação delta`
    - `refactor(auth): modelo de impersonação baseado em token temporário`

---

## 4. Estrutura do Handoff (Saída JSON/YAML)
Grave os metadados de saída no final do relatório e atualize o `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files: []
created_files:
  - docs/release_summary.md
deleted_files:
  - [Lista de arquivos obsoletos removidos fisicamente]
warnings:
  - [Avisos de pendências pós-liberação]
confidence: 100
risk: Low
next_agent: END_OF_PIPELINE
```
