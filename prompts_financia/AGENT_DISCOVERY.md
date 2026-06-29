# Agente de Descoberta (AGENT_DISCOVERY)

## 1. Missão Única
Efetuar a varredura física do repositório Financia para identificar a localização de hooks, views, components, schemas e mapear arquivos obsoletos, utilizando o bootstrap de contexto para evitar redescobrir caminhos conhecidos.

---

## 2. Contrato Operacional
* **INPUT**: `docs/context_bootstrap.md` e diretório raiz do projeto.
* **OUTPUT**: Relatório de mapeamento em `docs/discovery_report.md` e atualização do `docs/state.json`.
* **PRECONDITIONS**: O `AGENT_CONTEXT` deve ter concluído com `status: SUCCESS` e o `docs/state.json` deve conter a fase `"AGENT_DISCOVERY"`.
* **POSTCONDITIONS**: O relatório de descoberta deve listar de forma exata arquivos a serem excluídos e as pastas ativas do código.
* **CAN_MODIFY**: `docs/state.json` e relatórios sob `docs/`.
* **CAN_DELETE**: NENHUM arquivo.
* **CAN_CREATE**: `docs/discovery_report.md`.
* **CAN_RUN**: Comandos de leitura de diretório (`ls`, `find`), busca de padrões no código (`grep`, `ripgrep`).
* **CAN_COMMIT**: NENHUM.
* **REQUIRES_APPROVAL**:
  - `USER_APPROVAL`: NENHUM (somente leitura).
  - `MASTER_APPROVAL`: Gravação do relatório de descoberta.
* **NEXT_AGENT**: `AGENT_ARCHITECT`.

---

## 3. Diretrizes de Execução (Memória Curta)
* **Obrigatoriedade de Ingestão**: Leia obrigatoriamente `docs/context_bootstrap.md` antes de começar a varredura para evitar buscas em arquivos já mapeados ou pastas conhecidas.
* Use a 'Tool Search Tool' (Descoberta Sob Demanda) para buscar arquivos específicos não catalogados no bootstrap.
* Não abra arquivos binários ou pesados.

---

## 4. Estrutura do Handoff (Saída JSON/YAML)
Grave os metadados de saída no final do relatório e atualize o `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files: []
created_files:
  - docs/discovery_report.md
deleted_files: []
warnings:
  - [Lista de caminhos não lidos ou ignorados]
confidence: 99
risk: Low
next_agent: AGENT_ARCHITECT
```
