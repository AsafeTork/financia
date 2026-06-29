# Financia — Documentação Operacional

Este diretório contém os artefatos gerados pelo pipeline multiagente de desenvolvimento.

## Arquivos de Estado do Pipeline

| Arquivo | Descrição |
|---|---|
| `state.json` | Estado global do pipeline — lido e atualizado por cada agente |
| `context_bootstrap.md` | Gerado por `AGENT_CONTEXT` — mapa de tecnologias e configurações |
| `discovery_report.md` | Gerado por `AGENT_DISCOVERY` — inventário do repositório |
| `architecture_analysis.md` | Gerado por `AGENT_ARCHITECT` — dependências e riscos arquiteturais |
| `detailed_execution_plan.md` | Gerado por `AGENT_PLANNING` — plano aprovado de alterações |
| `security_audit_report.md` | Gerado por `AGENT_SECURITY` — auditoria de RLS e multi-tenant |
| `database_sync_report.md` | Gerado por `AGENT_DATABASE` — otimizações de sync e índices |
| `frontend_design_report.md` | Gerado por `AGENT_FRONTEND` — alterações visuais e responsividade |
| `backend_integration_report.md` | Gerado por `AGENT_BACKEND` — lógica de negócio e impersonação |
| `code_review_report.md` | Gerado por `AGENT_REVIEW` — auditoria de conformidade de sintaxe |
| `qa_test_report.md` | Gerado por `AGENT_QA` — resultados de testes e validações |
| `release_summary.md` | Gerado por `AGENT_RELEASE` — resumo de entrega e commits |
| `CONTEXT_MAP.md` | Mapa de RPCs do Supabase (mantido por `AGENT_DOCUMENTATION`) |
| `ARCHITECTURE.md` | Diagrama de arquitetura (mantido por `AGENT_DOCUMENTATION`) |

## Diretório `history/`

Backups de relatórios anteriores para preservação de histórico. Nunca sobrescreva um relatório sem mover a versão anterior para `history/`.
