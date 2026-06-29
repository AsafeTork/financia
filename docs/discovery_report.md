# Discovery Report — Financia

> Gerado por **AGENT_DISCOVERY** em 2026-06-28. Varredura física read-only. Baseado em `docs/context_bootstrap.md`.

## 1. Inventário Físico (arquivos ativos, linhas)

### `src/` raiz
| Arquivo | Linhas | Papel |
|---|---|---|
| App.jsx | 255 | Roteamento, auth, loadData, applyBrandVars, **enforceLimit** |
| main.jsx | 22 | Entry React |
| index.css | 183 | CSS vars do tema (Design System) |
| animations.css | 330 | Animações globais |

### `src/lib/` (8 módulos + 5 testes)
| Arquivo | Linhas | Papel |
|---|---|---|
| db.js | 195 | Dexie + sync loop + **triggerApkBuild** |
| supabase.js | 81 | Cliente Supabase (anon) |
| auth.js | 32 | Helpers auth |
| constants.js | 91 | **PLAN_LIMITS, PRICING, atLimit, limitFor, effectivePlan, WHITELABEL** |
| utils.js | 144 | fmt, safe, deriveCores, luminance |
| stripe.js | 51 | Integração Stripe (front) |
| ai.js | 65 | **IA de Insights** |
| recurring.js | 82 | Lançamentos recorrentes |
| exporters.js | 52 | Exportação de dados |
| pwa.js | 109 | Service worker / PWA |
| _testes_ | — | cleanNumeric.test, constants.test, recurring.test, utils.test |

### `src/hooks/` (5 hooks + 3 testes)
| Arquivo | Linhas | Papel |
|---|---|---|
| useSession.js | 356 | Sessão, auth, impersonação, loadData, **saveBrand** |
| useTx.js | 78 | Transações (+ test 179) |
| useProducts.js | 74 | Inventário (+ test 140) |
| useLosses.js | 56 | Perdas (+ test 135) |
| useScrollReveal.js | 82 | Animação on-scroll |

### `src/views/` (12 telas)
| Arquivo | Linhas | Roadmap |
|---|---|---|
| Login.jsx | 239 | **Bloco 1**: split-screen, checkbox Termos, phone, email fixo |
| SettingsView.jsx | 249 | **Bloco 1+3**: senha/pagamento/plano/telefone/suporte, aba Aparência, rodapé |
| PlansView.jsx | 182 | **Bloco 2**: Stripe Elements in-app, checklist benefícios |
| Dashboard.jsx | 306 | **Bloco 4+5**: contadores, botão IA |
| ReportView.jsx | 205 | **Bloco 2+5**: export PDF/Excel, IA |
| TxView.jsx | 276 | **Bloco 4**: validação números gigantes |
| InventoryView.jsx | 363 | inventário |
| Landing.jsx | 314 | landing pública |
| EmailView.jsx | 101 | view email |
| TermsOfService.jsx | 114 | **Bloco 1**: alvo do link de aceite |
| PrivacyPolicy.jsx | 110 | política |

### `src/components/` (24)
| Arquivo | Linhas | Nota |
|---|---|---|
| ui.jsx | 233 | **Inp** (validação de input) — Bloco 4 |
| PhoneInput.jsx | 196 | **Bloco 1**: input telefone unificado |
| SaleForm.jsx | 135 | **Bloco 4**: registro em lote |
| StripeCheckout.jsx | 134 | **JÁ EXISTE** — scaffolding Stripe Elements |
| RecurringManager.jsx | 107 | **JÁ EXISTE** — recorrentes |
| ExportButtons.jsx | 29 | **JÁ EXISTE** — export |
| UpgradeModal.jsx | 69 | modal upgrade plano |
| UsageBar.jsx | 98 | barra de uso/limites |
| AdminPanel.jsx (admin/) | 441 | painel admin |
| ClientEditModal.jsx (admin/) | 391 | editor cliente/paleta/plano |
| GhTokenCard.jsx (admin/) | 33 | token GitHub |
| _outros_ | — | BottomNav, Confirm, Header, InstallButton, LogoImg, Offline, Onboarding, Sidebar, SyncBadge, ThemeToggle, Toast, UpdateBanner |

### `supabase/functions/` (6 edge functions Deno/TS)
| Função | Linhas | Nota |
|---|---|---|
| create-checkout-session | 81 | **REDIRECT** atual — roadmap pede substituir por Elements |
| create-payment | 78 | PaymentIntent (Elements) — base para Bloco 2/3 |
| create-subscription | 108 | Subscription (Elements) — base para Bloco 2 |
| stripe-webhook | 88 | webhook → ativa plano |
| stripe-config | 22 | expõe config pública Stripe |
| admin-create-client | 101 | criação de cliente admin |

### `supabase/migrations/` (10) e infra
- 10 migrations (ver bootstrap §5). `electron/main.cjs` (32), `scripts/` (gen_icons), `.github/workflows/build.yml` (180), `public/` (manifest, sw.js, assetlinks).

## 2. Scaffolding pré-existente relevante ao roadmap

> O roadmap descreve itens como "novos", mas a varredura mostra base já presente. PLANNING deve reusar, não recriar:
- **Stripe Elements**: `src/components/StripeCheckout.jsx` + edge functions `create-payment` e `create-subscription` já existem. O `create-checkout-session` (redirect) é o legado a aposentar.
- **Export**: `src/components/ExportButtons.jsx` + `src/lib/exporters.js` existem (roadmap diz "hoje só CSV em ReportView" — verificar cobertura real em ARCHITECT).
- **Recorrentes**: `src/components/RecurringManager.jsx` + `src/lib/recurring.js` existem (roadmap pede recorrentes p/ todos os planos — checar gating).
- **Limites/uso**: `src/components/UsageBar.jsx` + `constants.js` (atLimit/limitFor) + `App.jsx` (enforceLimit) — núcleo do bug de cascata (Bloco 4).

## 3. Duplicação detectada (NÃO obsoleto — consolidar com cuidado)

Cobertura de teste duplicada em dois diretórios:
- `src/lib/constants.test.js` (48) **e** `src/test/constants.test.js` (231) — ambos testam PLAN_LIMITS/effectivePlan/limitFor/atLimit (casos diferentes, não idênticos).
- `src/lib/utils.test.js` (62) **e** `src/test/utils.test.js` (261) — ambos testam fmt/safe (casos diferentes).

> Ação sugerida (PLANNING): consolidar em um local após diff de casos. **Não deletar antes de mesclar casos únicos** — risco de perder cobertura.

## 4. Candidatos a obsoleto / histórico (NÃO deletar nesta fase)

| Arquivo | Status | Razão |
|---|---|---|
| `supabase/migrations/20260609_fix_plan_protection.sql` (16) | Superada | CLAUDE.md: substituída pela trigger `prevent_plan_change`. **Migration aplicada — preservar histórico, não deletar.** |
| `supabase/functions/create-checkout-session` | A aposentar | Roadmap substitui redirect por Elements. Remover só depois do novo fluxo validado (Bloco 2). |
| `CLAUDE_HANDOFF.md` | Desatualizado | Diz "Stripe Fase 3 adiada" enquanto edge functions Stripe já existem. Tratar como histórico. |

> Nenhum arquivo `.bak`, binário órfão ou dead-file evidente encontrado na varredura. CAN_DELETE = NENHUM nesta fase.

## 5. Mapa diretriz → arquivo (confirmado fisicamente)

| Bloco roadmap | Arquivos-alvo confirmados |
|---|---|
| 1 Auth/Settings | `views/Login.jsx`, `views/TermsOfService.jsx`, `components/PhoneInput.jsx`, `lib/constants.js`, `views/SettingsView.jsx`, `lib/utils.js` (luminance/deriveCores) |
| 2 Planos Stripe Elements | `views/PlansView.jsx`, `components/StripeCheckout.jsx`, `lib/stripe.js`, `lib/constants.js`, `views/ReportView.jsx` (export), `functions/create-payment`, `functions/create-subscription`, `functions/stripe-webhook` |
| 3 Add-on Personalização | `lib/constants.js` (WHITELABEL), `views/SettingsView.jsx`, `hooks/useSession.js` (saveBrand), `lib/db.js` (triggerApkBuild), `.github/workflows/build.yml` |
| 4 Bugs | `App.jsx` (enforceLimit), `lib/constants.js` (atLimit/limitFor), `hooks/useTx,useProducts,useLosses`, `views/Dashboard.jsx`, `components/SaleForm.jsx`, `components/ui.jsx`, `views/TxView.jsx`, `views/SettingsView.jsx` (rodapé) |
| 5 IA Insights | `lib/ai.js`, `views/Dashboard.jsx`, `views/ReportView.jsx` |

---

```yaml
status: SUCCESS
modified_files:
  - docs/state.json
created_files:
  - docs/discovery_report.md
deleted_files: []
warnings:
  - "Cobertura de teste duplicada: src/lib/*.test.js vs src/test/*.test.js (constants, utils) — consolidar antes de deletar"
  - "create-checkout-session (redirect) sera legado apos Stripe Elements (Bloco 2)"
  - "20260609_fix_plan_protection.sql superada por trigger, mas e migration aplicada — preservar"
confidence: 99
risk: Low
next_agent: AGENT_ARCHITECT
```
