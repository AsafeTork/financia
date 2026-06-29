# Architecture Analysis — Financia

> Gerado por **AGENT_ARCHITECT** em 2026-06-28. Base: `context_bootstrap.md` + `discovery_report.md` + grafo de imports (análise estática de linhas `import`).

## 1. Grafo de Dependências — Hubs (fan-in)

Camadas (de baixo p/ cima): `supabase.js` → `db.js`/`utils.js` → `constants.js`/`recurring.js`/`ai.js`/`auth.js`/`stripe.js`/`exporters.js` → `ui.jsx` → hooks → views/components → `App.jsx`.

| Módulo | Fan-in (quem importa) | Blast radius |
|---|---|---|
| `lib/utils.js` | ~todos os arquivos (fmt, safe, brandAlpha, deriveCores, luminance, uid, now, cleanNumeric...) | **CRÍTICO** |
| `lib/constants.js` | App, todas as views, Sidebar, UpgradeModal, EmailView, hooks, admin | **CRÍTICO** |
| `components/ui.jsx` | todas as views + SaleForm, RecurringManager, Onboarding, UsageBar, admin (Inp/NumInp/Card/Modal...) — depende de `utils.cleanNumeric` | **ALTO** |
| `lib/supabase.js` (`sb`) | hooks, db, stripe, ai, auth, admin, StripeCheckout | **ALTO** (data layer) |
| `lib/db.js` (`ldb`) | hooks, recurring, admin | Médio |

> **Regra de ouro p/ PLANNING**: mudanças em `utils.js`, `constants.js`, `ui.jsx` devem ser **aditivas** (novos exports). Alterar assinatura de `fmt`/`safe`/`Inp`/`cleanNumeric` ou shape de `PLAN_LIMITS`/`effectivePlan` quebra dezenas de consumidores.

## 2. Estado real vs roadmap (correções ao roadmap)

A varredura revela que vários itens "novos" do roadmap **já têm implementação parcial**:

| Roadmap diz | Realidade no código |
|---|---|
| "Export hoje só CSV" | `exporters.js` expõe `exportPDF` e `exportXLS`, **já importados** por TxView, ReportView, InventoryView. PDF/Excel já existem → tarefa real é **gating por plano**, não criar. |
| "Stripe Elements a criar" | `StripeCheckout.jsx` existe e já é importado por **PlansView e SettingsView**; edge functions `create-payment` + `create-subscription` existem. Tarefa real = aposentar `create-checkout-session` (redirect) e confirmar fluxo Elements live. |
| "Email fixo criar const" | `SUPPORT_EMAIL` já existe em `constants.js`, já importado por Login e SettingsView. Tarefa = aplicar onde falta + WhatsApp `waLink`. |
| "Premium não existe" | `PLAN_LIMITS.premium` já presente (testado em `constants.test.js`). Tarefa = preço/benefícios/IA gating, não criar plano. |
| "Recorrentes p/ todos" | `recurring.js` + `RecurringManager.jsx` existem; useSession usa `pendingRecurring`. Tarefa = remover gating por plano. |

> PLANNING deve **confirmar premissa abrindo o arquivo** antes de implementar (evita recriar o que existe).

## 3. Riscos Arquiteturais

| # | Risco | Severidade | Detalhe |
|---|---|---|---|
| R1 | Hubs `utils/constants/ui` acoplados a tudo | Alta | Qualquer refactor não-aditivo tem blast radius global. Mitigar: só adicionar exports. |
| R2 | Stripe com **dois fluxos coexistindo** | Alta | redirect (`create-checkout-session`) vs Elements (`create-payment`/`create-subscription`). `StripeCheckout` já em PlansView+SettingsView. Confirmar qual está live antes de mexer. Billing = **USER_APPROVAL**. |
| R3 | **Backend de IA não localizado** | Média | `ai.js` (`askAI`) chama `sb` (edge function?), mas **não há função `ai`/`insights` entre as 6 edge functions**. Roadmap Bloco 5 pede "mudar prompt do backend" — alvo do prompt não confirmado. Precisa descoberta extra ou input do dono. |
| R4 | "1 login por conta" (Free) inexistente | Alta | Enforcement server-side novo (sessões/auth + schema). **USER_APPROVAL** (auth + schema). Item arquitetural pesado — isolar. |
| R5 | Bug cascata de limites | Baixa (isolado) | `App.enforceLimit` + `constants.atLimit`/`limitFor` + hooks. Lógica auto-contida, sem schema. Ótimo primeiro alvo. |
| R6 | Cobertura de teste duplicada | Baixa | `src/lib/*.test.js` vs `src/test/*.test.js` (constants, utils). Consolidar após diff — sem impacto em produção. |
| R7 | `create-checkout-session` legado | Baixa | Remover só após Elements validado (depende de R2). |

## 4. Roadmap → blast radius → nível de aprovação

| Bloco | Arquivos núcleo | Blast | Aprovação |
|---|---|---|---|
| **4 Bugs** (cascata, contador, números gigantes, rodapé, lote) | App.jsx, constants.js, hooks, ui.jsx, Dashboard, SaleForm, TxView, SettingsView | Médio (toca hubs, mas aditivo/cirúrgico) | **MASTER_APPROVAL** (lógica interna + UX) |
| **4 NOVO** recorrentes p/ todos | recurring.js, useTx, transações | Médio | MASTER (sem schema novo) |
| **5 IA** liberar p/ todos + prompt real | ai.js, Dashboard, ReportView, **edge function IA (?)** | Baixo (front) / ? (backend) | MASTER no front; **USER** se mexer edge/secret |
| **1 Auth UI** (split, termos, phone, email) | Login, SettingsView, PhoneInput, constants, utils | Médio (PhoneInput tem 3 consumidores) | MASTER (UI) |
| **1 "1 login por conta"** | auth + schema + sessão server-side | Alto | **USER_APPROVAL** |
| **2 Planos Stripe Elements** | PlansView, StripeCheckout, stripe.js, edge functions, webhook | Alto (billing) | **USER_APPROVAL** |
| **3 Add-on Personalização** | constants, SettingsView, useSession.saveBrand, db.triggerApkBuild, build.yml | Alto (billing + CI) | **USER_APPROVAL** |

## 5. Ordem técnica ótima de execução (recomendação p/ PLANNING)

Princípio: menor blast radius + menor nível de aprovação primeiro; itens arquiteturais (schema/billing/auth) por último e isolados.

1. **Bloco 4 — Bugs** (cascata de limites, contador não atualiza, números gigantes, rodapé infra). Auto-contido, sem schema, MASTER_APPROVAL. **Primeiro incremento seguro.**
2. **Bloco 4 NOVO + 5 IA front** (recorrentes p/ todos; liberar botão IA). Front-only se IA não tocar edge/secret.
3. **Bloco 1 Auth UI** (split-screen, checkbox Termos, PhoneInput unificado, email/whatsapp). Frontend; coordenar PhoneInput (3 consumidores).
4. **Bloco 5 IA backend** (prompt com dados reais) — **bloqueado até localizar/confirmar a edge function de IA (R3)**.
5. **Bloco 2 Planos Stripe Elements** — **USER_APPROVAL**. Resolver R2 (qual fluxo live) antes.
6. **Bloco 1 "1 login por conta" + Bloco 3 Add-on** — **USER_APPROVAL** (schema/auth/billing/CI). Maior risco, por último.

## 6. Conflito de governança detectado (escalar em PLANNING)

> O `launch_prompt` pede rodar o pipeline **até RELEASE sem supervisão**, mas:
> - O roadmap do dono diz "implementar **por componente, sob instrução dele**, não tudo de uma vez".
> - 4 dos 7 blocos exigem **USER_APPROVAL** (auth/billing/schema/CI) pela Política de Aprovação em Dois Níveis do MASTER_ORCHESTRATOR.
>
> **Recomendação**: `AGENT_PLANNING` deve escopar apenas o **incremento 1 (Bloco 4 — Bugs)** como `locked_files`, que é MASTER_APPROVAL, e **registrar `USER_APPROVAL` pendente** em `state.json` para os blocos de auth/billing/schema antes de prosseguir. Não há item específico nomeado no launch_prompt → começar pelo conjunto seguro e pausar para aprovação nos demais.

---

```yaml
status: SUCCESS
modified_files:
  - docs/state.json
created_files:
  - docs/architecture_analysis.md
deleted_files: []
warnings:
  - "R1: utils.js/constants.js/ui.jsx sao hubs criticos — so mudancas aditivas"
  - "R2: dois fluxos Stripe coexistem (redirect legado vs Elements) — confirmar qual e live"
  - "R3: backend de IA nao localizado entre as 6 edge functions — Bloco 5 backend bloqueado"
  - "R4: '1 login por conta' exige schema+auth novos — USER_APPROVAL"
  - "Governanca: launch_prompt (rodar ate RELEASE) conflita com roadmap (por componente) + 4 blocos exigem USER_APPROVAL"
confidence: 96
risk: Medium
next_agent: AGENT_PLANNING
```
