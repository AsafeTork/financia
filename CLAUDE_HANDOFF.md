# HANDOFF — Financia (gestao-financeira)

Audience: next Claude session. Asafe is not a coder. Tom: tecnico direto.

## Decisoes permanentes

- Pricing: Freemium. Free (offline, limites) + Pro R$ 70/mes (online, ilimitado).
- Limites Free: 50 tx / 20 produtos / 10 perdas (totais, nao por mes).
- Pro ativado manualmente pelo admin no painel — sem Stripe nesta fase.
- Migracao Vite: CONCLUIDA e MERGEADA no main (commit 2d3b83f, aprovado por Asafe em 2026-06-09).
- Stripe (Phase 3): postergado ate Asafe confirmar.
- Token GitHub e is_admin: em sessionStorage (nao persistem entre sessoes).

## Regras de codigo (nao violar)

- Sem optional chaining (?.) — pode causar erros em browsers antigos
- Sem arrow spreads iniciais (`=> {...spread}`) — causa parse error
- Sem emoji em strings JS
- Deploy: git push main → Render auto-builda com `npm install && npm run build`
- Nunca service_role key no front — tudo via RLS + sb.rpc() SECURITY DEFINER
- Estrutura de arquivos: src/lib/, src/components/, src/views/, src/admin/

## Estado do banco (Supabase kxeqhorxhlgwcgywovqr)

### Migrations aplicadas

- `20260609_add_plan_to_company_profiles.sql` — colunas plan/plan_expires_at/plan_activated_by
- `20260609_rls_admin_read_profiles.sql` — policy select_own_or_admin em company_profiles
- `20260609_rls_admin_delete_client.sql` — policies DELETE para admin em todas as tabelas
- `20260609_fix_plan_protection.sql` — policy UPDATE com WITH CHECK (obsoleta, trigger eh a solucao)

### PENDENTE — rodar no Studio antes de mergear feat/color-palette

```sql
-- Migration: paleta multi-tom + tema por cliente
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS color_secondary text,
  ADD COLUMN IF NOT EXISTS color_accent    text,
  ADD COLUMN IF NOT EXISTS theme           text DEFAULT 'light';
```

Colunas adicionadas:
- `color_secondary` (text, nullable) — cor secundaria; se null, o app deriva automaticamente via lightenHex(primary, 0.78)
- `color_accent`    (text, nullable) — cor de acento; se null, deriva via lightenHex(primary, 0.92)
- `theme`           (text, default 'light') — valores: 'light' | 'dark'

### Funcoes e triggers (criados manualmente no Studio, sem migration file)

- `set_client_plan(a_target uuid, b_plan text, c_actor text)` SECURITY DEFINER
  - Params nomeados com prefixos a_/b_/c_ para que ordem alfabetica = ordem posicional
    (PostgREST serializa JSON alfabeticamente; sem isso o actor ia para a posicao de target)
  - Verifica se caller eh admin via user_roles (auth.uid())
  - Define `set_config("app.allow_plan_change", "1", true)` antes do UPDATE
  - Unica forma valida de alterar plan/plan_expires_at/plan_activated_by
  - c_actor recebe adminEmail (string), nao UUID

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
| nancia_gh_token | localStorage | OK — persiste entre sessoes (configuracao admin, nao dado de sessao) |
| is_admin | sessionStorage | OK — limpa ao fechar browser |
| role_<uid> | Dexie ldb.meta | OK — cache offline da role, ligado ao UID |
| last_sync | Dexie ldb.meta | OK — timestamp tecnico de sync incremental |
| tx/products/losses/profiles | Dexie | OK — offline-first por design |
| JWT Supabase Auth | localStorage (SDK interno) | Fora do controle do app — comportamento padrao do @supabase/supabase-js, nao alterar |

localStorage direto: apenas nancia_gh_token (GhTokenCard.jsx + db.js triggerApkBuild).

## Estado do codigo (main, ultimo commit b2b126d — 2026-06-10)

Stack: Vite 5 + React 18 + Tailwind CSS v3 + Supabase JS v2 + Dexie v3

O que funciona:
- Gating de planos: enforceLimit bloqueia addTx/addProduct/addLoss quando Free bate limite
- UpgradeModal aparece quando limite atingido
- AdminPanel: lista clientes com badge FREE/PRO, botao Editar abre ClientEditModal
- ClientEditModal: altera name/color via update direto; altera plan via sb.rpc("set_client_plan", {a_target, b_plan, c_actor:adminEmail})
- Dashboard: card "Uso do plano gratuito" visivel so para Free, com barras de progresso
- Navegacao persistida no hash da URL (#dashboard, #inventory, etc.)
- fetchClients usa RLS policy "select_own_or_admin" — sem service_role no front
- Todos os CRUDs: try/catch em writes Dexie E em blocos Supabase (navigator.onLine)
- syncProfiles e syncTable: verificam erro antes de marcar _synced=1
- nancia_gh_token em localStorage (persiste); is_admin em sessionStorage (limpa ao fechar)
- Offline-first: Dexie primeiro, sync Supabase em background a cada 2min
- render.yaml configurado: static site, build npm install && npm run build, serve dist/

## Deploy (Render)

- URL: https://gestao-financeira-7heu.onrender.com
- Render detecta render.yaml automaticamente no root do repo
- Build Command: `npm install && npm run build`
- Publish Dir: `dist`
- Qualquer push para main dispara novo deploy automaticamente
- Build leva ~2-3 min; verificado online em 2026-06-09

## Migracao Vite — historico completo (CONCLUIDA)

Merge commit: `2d3b83f` — aprovado por Asafe (41/41 checks), mergeado em 2026-06-09.
Branch `refactor/vite` mantida como backup.

| Step | Commit | Descricao |
|------|--------|-----------|
| 1 | 3282b27 | Vite setup, index.html, package.json, configs |
| 2 | 9af4e0f | src/lib/utils.js, constants.js, supabase.js |
| 3 | 2510d6c | src/lib/db.js (Dexie schema v1/v2, syncAll, fetchClients...) |
| 4-8 | 87837a9 | Todos os components, views, admin, App.jsx |
| 9 | 4aca538 | render.yaml |
| fix | 0260943 | 11 try/catch CRUD Supabase + fmtDate InventoryView |
| merge | 2d3b83f | Merge refactor/vite → main |

## Redesign visual (branch feat/visual-redesign — NAO mergeado em main)

5 commits concluidos em 2026-06-10. Aguardando aprovacao de Asafe para merge.

| Commit | Hash | Descricao |
|--------|------|-----------|
| 1 | (base) | hexToRgb/brandAlpha utils, CSS vars --brand, ui.jsx, BottomNav.jsx |
| 2 | (layout) | Header.jsx mobile, Sidebar atualizado, constants labels, App.jsx |
| 3 | (dashboard) | KPI cards com variacao vs mes anterior, BarChartSVG colorido |
| 4 | (listas) | TxView agrupado por data, InventoryView tabs underline, empty states SVG |
| 5 | 817da74 | SettingsView tabs underline, color picker dinamico, SVG checkmarks; ReportView brand |

Principais mudancas do redesign:
- White-label real: brand.color aplicado em header, botoes, KPIs, tabs, badges
- `brandAlpha(hex, a)` para fundos suaves sem dependencias extras
- CSS var `--brand` no :root para focus rings globais
- Bottom nav mobile 5 itens (lg:hidden); Sidebar desktop-only
- KPIs com % variacao vs mes anterior
- Listas agrupadas por data com subtotal do dia
- Empty states com SVG e CTA em brand.color

## Proximas tarefas (em ordem de prioridade)

1. **Aprovar e mergear feat/visual-redesign** — Asafe precisa revisar e aprovar.
2. **Fase 3 Stripe** — so quando Asafe pedir.
   Arquitetura: Edge Function Supabase cria checkout session, webhook atualiza plan via
   set_client_plan. Nunca chave Stripe no front.

## Problemas conhecidos

- Cliente promovido para Pro precisa fazer logout/login (ou esperar 2min de sync) para ver mudanca.
- Limites Free sao totais (nao por mes).
- Admin que usa sessionStorage para is_admin precisa re-logar ao abrir nova aba (comportamento esperado).
- Build JS: 535 kB / 151 kB gzip (Dexie + Supabase SDK). Aviso do Vite, nao erro.
