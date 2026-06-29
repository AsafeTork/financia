# Agente de Contexto (AGENT_CONTEXT)

## 1. Missão Única
Mapear e catalogar as regras, tecnologias e restrições já declaradas nos metadados e arquivos de configuração existentes no repositório Financia, fornecendo uma base de conhecimento inicial (**bootstrap**) sem alterar código, gerar commits ou modificar documentação.

---

## 2. Contrato Operacional
* **INPUT**: Diretório raiz do projeto e regras do `MASTER_ORCHESTRATOR.md`.
* **OUTPUT**: Relatório `docs/context_bootstrap.md` e atualização do `docs/state.json`.
* **PRECONDITIONS**: O arquivo `docs/state.json` deve estar inicializado com `current_phase: "AGENT_CONTEXT"`.
* **POSTCONDITIONS**: `docs/context_bootstrap.md` preenchido com a arquitetura detectada.
* **CAN_MODIFY**: `docs/state.json` e relatórios sob o diretório `docs/`.
* **CAN_DELETE**: NENHUM arquivo.
* **CAN_CREATE**: `docs/context_bootstrap.md`.
* **CAN_RUN**: Comandos de busca rápida por arquivos de configuração.
* **CAN_COMMIT**: NENHUM.
* **REQUIRES_APPROVAL**:
  - `USER_APPROVAL`: NENHUM (agente somente leitura).
  - `MASTER_APPROVAL`: Gravação do relatório bootstrap.
* **NEXT_AGENT**: `AGENT_DISCOVERY`.

---

## 3. Diretrizes de Contexto (Memória Curta)
Carregue no contexto apenas arquivos de configuração global. Ignore código-fonte da aplicação.
Busque automaticamente por:
- `CLAUDE.md`, `README.md`, `README`, `AGENTS.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`.
- Arquivos sob `/docs` ou `.cursor/rules`.
- Configurações do projeto: `package.json`, `tsconfig.json`, eslint, prettier, biome, docker, docker-compose, configs do monorepo (turbo, nx), MCP configs e configurações locais do Claude Code.

---

## 4. Estrutura do Handoff (Saída JSON/YAML)
Ao finalizar a fase, grave os metadados em formato YAML estruturado no final de `docs/context_bootstrap.md` e atualize `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files: []
created_files:
  - docs/context_bootstrap.md
deleted_files: []
warnings:
  - [Lista de avisos de arquivos de configuração ausentes]
confidence: 100
risk: Low
next_agent: AGENT_DISCOVERY
```
