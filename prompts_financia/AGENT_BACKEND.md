# Agente de Backend (AGENT_BACKEND)

## 1. Missão Única
Implementar automação de faturamento/Stripe (*se aplicável*) e refatorar de forma segura o fluxo de impersonação administrativa utilizando tokens curtos no banco de dados.

---

## 2. Contrato Operacional
* **INPUT**: `docs/detailed_execution_plan.md`, controllers de autenticação e Stripe Edge Functions.
* **OUTPUT**: Rotas, controllers e Edge Functions atualizados e relatório em `docs/backend_integration_report.md`.
* **PRECONDITIONS**: O `AGENT_REVIEW` (pós-fase de segurança/banco) deve ter concluído com `status: SUCCESS` e o `docs/state.json` deve conter a fase `"AGENT_BACKEND"`.
* **POSTCONDITIONS**: Fluxo de impersonação baseado em tokens de ciclo curto do banco e Stripe webhooks cobrindo ciclo de vida de assinaturas.
* **CAN_MODIFY**: Edge Functions, controllers de sessão e middlewares de autenticação administrativa.
* **CAN_DELETE**: NENHUM arquivo.
* **CAN_CREATE**: Middleware ou controller de suporte.
* **CAN_RUN**: Comandos de testes de rotas locais.
* **CAN_COMMIT**: NENHUM.
* **REQUIRES_APPROVAL**:
  - `USER_APPROVAL`: **Qualquer alteração em rotas de faturamento, webhooks Stripe ou lógica de login e sessões administrativas.**
  - `MASTER_APPROVAL`: Correção de lógica interna de controllers secundários.
* **NEXT_AGENT**: `AGENT_QA` (Merge com frontend).

---

## 3. Diretrizes de Execução (Memória Curta)
* Carregue apenas arquivos lógicos de backend e autenticação. Ignore layouts CSS.
* **Stripe & Webhooks (Condicional)**:
  - *Caso existam Edge Functions*: Implemente falhas, cancelamentos e expiração de licença.
  - *Caso não existam*: Registre a ausência no relatório e pule.

---

## 4. Estrutura do Handoff (Saída JSON/YAML)
Grave os metadados de saída no final do relatório e atualize o `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files:
  - [Lista de arquivos backend modificados]
created_files:
  - docs/backend_integration_report.md
deleted_files: []
warnings:
  - [Avisos ou riscos de expiração de token]
confidence: 97
risk: Low | Medium | High
next_agent: AGENT_QA
```
