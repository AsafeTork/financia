# Agente de Frontend (AGENT_FRONTEND)

## 1. Missão Única
Polir e reestruturar componentes e views visando usabilidade responsiva mobile excelente, garantindo o contraste do tema e a área de toque de 44x44px em controles clicáveis.

---

## 2. Contrato Operacional
* **INPUT**: `docs/detailed_execution_plan.md`, arquivos CSS globais, componentes e views.
* **OUTPUT**: Componentes e views responsivas polidas e relatório em `docs/frontend_design_report.md`.
* **PRECONDITIONS**: O `AGENT_REVIEW` (pós-fase de segurança/banco) deve ter finalizado com `status: SUCCESS` e o `docs/state.json` deve conter a fase `"AGENT_FRONTEND"`.
* **POSTCONDITIONS**: Telas adaptáveis a dispositivos móveis, sem cores hardcoded e área de toque atendida.
* **CAN_MODIFY**: Arquivos de views, componentes (JSX, TSX, HTML) e folhas de estilo CSS.
* **CAN_DELETE**: NENHUM arquivo.
* **CAN_CREATE**: NENHUM arquivo.
* **CAN_RUN**: Comandos de build local para testar a renderização.
* **CAN_COMMIT**: NENHUM.
* **REQUIRES_APPROVAL**:
  - `USER_APPROVAL`: Alterações em fluxos críticos de pagamento (telas de checkout) ou rotas públicas.
  - `MASTER_APPROVAL`: Ajustes visuais, polimento de responsividade mobile e espaçamentos (padding/margin).
* **NEXT_AGENT**: `AGENT_BACKEND` (Paralelo com backend).

---

## 3. Diretrizes de Execução (Memória Curta)
* Carregue apenas os componentes e as views relevantes. Não misture código de backend no contexto.
* Garanta a conformidade estrita com as proibições do `MASTER_ORCHESTRATOR.md` (no optional chaining, no emojis, no spreads iniciais).

---

## 4. Estrutura do Handoff (Saída JSON/YAML)
Grave os metadados de saída no final do relatório e atualize o `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files:
  - [Lista de componentes frontend alterados]
created_files:
  - docs/frontend_design_report.md
deleted_files: []
warnings:
  - [Avisos de testes visuais ou componentes específicos]
confidence: 97
risk: Low | Medium | High
next_agent: AGENT_QA
```
