# HANDOFF — Financia (gestao-financeira)

Audience: next Claude session. Asafe is not a coder. Tom: tecnico direto.

## Decisoes permanentes

- Pricing: Freemium. Free (offline, limites) + Pro R$ 70/mes (online, ilimitado).
- Limites Free: 50 tx / 20 produtos / 10 perdas (totais, nao por mes).
- Pro ativado manualmente pelo admin no painel — sem Stripe nesta fase.
- Migração Vite: APROVADA mas POSTERGADA. Branch `refactor/vite`, nunca no main, so quando Asafe pedir.
- Stripe (Phase 3): postergado ate Asafe confirmar.
- Token GitHub e is_admin: migrados para sessionStorage (commit 6c33786).

## Regras de codigo (nao violar)

- Sem optional chaining (?.) — Babel CDN nao suporta
- Sem arrow spreads iniciais (`=> {...spread}`) — causa parse error
- Sem emoji em strings JS
- Script tag: `<script type="text/babel" data-presets="react">`
- Deploy sempre via git push main; Render auto-deploya
- Nunca service_role key no front — tudo via RLS + sb.rpc() SECURITY DEFINER
- Checklist pre-commit obrigatorio (ver abaixo)

### Checklist pre-commit

```js
const fs=require("fs"),parser=require("@babel/parser");
const js=fs.readFileSync("index.html","utf8").match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
parser.parse(js,{sourceType:"script",plugins:["jsx"]});
console.assert((js.match(/=>\{?\s*\.\.\./g)||[]).length===0,"arrow spreads");
console.assert((js.match(/\?\.[a-zA-Z_]/g)||[]).length===0,"optional chain");
console.assert(js.includes("const fmt"),"const fmt");
console.assert(js.includes("const today"),"const today");
console.assert(!js.includes("localStorage"),"localStorage direto — use sessionStorage ou Dexie");
console.log("OK");
```

## Estado do banco (Supabase kxeqhorxhlgwcgywovqr)

### Migrations aplicadas

- `20260609_add_plan_to_company_profiles.sql` — colunas plan/plan_expires_at/plan_activated_by
- `20260609_rls_admin_read_profiles.sql` — policy select_own_or_admin em company_profiles
- `20260609_rls_admin_delete_client.sql` — policies DELETE para admin em todas as tabelas
- `20260609_fix_plan_protection.sql` — policy UPDATE com WITH CHECK (obsoleta, trigger eh a solucao)

### Funcoes e triggers (criados manualmente no Studio, sem migration file)

- `set_client_plan(actor uuid, new_plan text, target uuid)` SECURITY DEFINER
  - Verifica se caller eh admin via user_roles
  - Define `set_config("app.allow_plan_change", "1", true)` antes do UPDATE
  - Unica forma valida de alterar plan/plan_expires_at/plan_activated_by

- `prevent_plan_change()` trigger BEFORE UPDATE em company_profiles
  - Permite bypass se `current_setting("app.allow_plan_change", true) = "1"`
  - Bloqueia qualquer mudanca em plan/plan_expires_at/plan_activated_by
  - NAO usa SECURITY DEFINER (importante — para que current_setting funcione corretamente)

### Teste de validacao (realizado em 2026-06-09, PASSOU)

- Cliente PATCH plan=pro via REST: HTTP 400, plan nao muda
- Admin set_client_plan pro: HTTP 204, plan vira pro
- Admin set_client_plan free: HTTP 204, plan volta para free

## Estado do storage (auditado em 2026-06-09)

| Dado | Storage | Status |
|------|---------|--------|
| nancia_gh_token | sessionStorage | OK — limpa ao fechar browser |
| is_admin | sessionStorage | OK — limpa ao fechar browser |
| role_<uid> | Dexie ldb.meta | OK — cache offline da role, ligado ao UID |
| last_sync | Dexie ldb.meta | OK — timestamp tecnico de sync incremental |
| tx/products/losses/profiles | Dexie | OK — offline-first por design |
| JWT Supabase Auth | localStorage (SDK interno) | Fora do controle do app — comportamento padrao do @supabase/supabase-js, nao alterar |

Zero usos de localStorage direto no codigo do app. Checklist pre-commit agora valida isso.

## Estado do codigo (main, ultimo commit 6c33786)

O que funciona:
- Gating de planos: enforceLimit bloqueia addTx/addProduct/addLoss quando Free bate limite
- UpgradeModal aparece quando limite atingido
- AdminPanel: lista clientes com badge FREE/PRO, botao Editar abre ClientEditModal
- ClientEditModal: altera name/color via update direto; altera plan via sb.rpc("set_client_plan")
- Dashboard: card "Uso do plano gratuito" visivel so para Free, com barras de progresso
- Navegacao persistida no hash da URL (#dashboard, #inventory, etc.)
- fetchClients usa RLS policy "select_own_or_admin" — sem service_role no front
- Todos os CRUDs: try/catch em writes Dexie; validacoes de input
- syncProfiles e syncTable: verificam erro antes de marcar _synced=1
- nancia_gh_token e is_admin em sessionStorage (nao persistem entre sessoes)

## Migracao Vite (branch refactor/vite)

**NUNCA mergear no main sem aprovacao explicita de Asafe.**

Ultimo commit: `0260943`

| Step | Status | Commit | Descricao |
|------|--------|--------|-----------|
| 1 | DONE | 3282b27 | Vite setup, index.html, package.json, configs, src/index.css, src/main.jsx |
| 2 | DONE | 9af4e0f | src/lib/utils.js, constants.js, supabase.js |
| 3 | DONE | 2510d6c | src/lib/db.js (Dexie schema v1/v2, syncAll, syncTable, syncProfiles, fetchClients, deleteClient, triggerApkBuild) |
| 4 | DONE | 87837a9 | src/components/ (ui, Toast, Offline, Confirm, UpgradeModal, LogoImg, SyncBadge, UsageBar, SaleForm, Sidebar) |
| 5 | DONE | 87837a9 | src/views/ Dashboard, TxView, InventoryView, ReportView, EmailView |
| 6 | DONE | 87837a9 | src/admin/ GhTokenCard, ClientEditModal, AdminPanel |
| 7 | DONE | 87837a9 | src/views/ SettingsView, Login |
| 8 | DONE | 87837a9 | src/App.jsx + src/main.jsx (App completo, auth, todos os CRUDs) |
| 9 | DONE | 4aca538 | render.yaml — static site, buildCommand: npm install && npm run build, serve dist/ |
| 10 | DONE | — | npm run build passou limpo (97 modulos, 534 kB JS / 150 kB gzip) |
| 11 | DONE | 0260943 | Bug fixes pre-merge: 11 try/catch em CRUD Supabase (App.jsx) + fmtDate import/uso em InventoryView.jsx |

Branch `refactor/vite` foi pushed para GitHub. Para deploy em producao: **Asafe precisa aprovar o merge no main** e re-apontar o servico Render para usar render.yaml (ou configurar manualmente Build Command = `npm install && npm run build`, Publish Dir = `dist`).

## Proximas tarefas (em ordem de prioridade)

1. **Fase 3 Stripe** — so quando Asafe pedir.
   Arquitetura: Edge Function Supabase cria checkout session, webhook atualiza plan via
   set_client_plan. Nunca chave Stripe no front.

## Correccoes aplicadas (commit 0260943)

- App.jsx: todos os 11 blocos `if (navigator.onLine) { sb... }` agora tem try/catch
  (addTx, editTx, deleteTx, addProduct, editProduct, deleteProduct, adjustStock,
  addLoss, editLoss, deleteLoss, saveBrand)
- InventoryView.jsx: `fmtDate` adicionado ao import e substituiu `new Date()` inline
  na aba de perdas — corrige ReferenceError em runtime

## Problemas conhecidos

- Cliente promovido para Pro precisa fazer logout/login (ou esperar 2min de sync) para ver mudanca.
- Limites Free sao totais (nao por mes).
- Babel no browser: performance ruim em mobile antigo. Resolvido na migracao Vite.
- index.html monolitico ~1960 linhas. Resolvido na migracao Vite.
- Admin que usa sessionStorage para is_admin precisa re-logar ao abrir nova aba (comportamento esperado).
