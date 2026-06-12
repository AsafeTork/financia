# gestao-financeira — Contexto para Claude Code

## Stack
Vite 5 + React 18 + Tailwind CSS v3 + Supabase JS v2 + Dexie v3 (offline-first)

## Deploy
Render static site — auto-deploy no push para `main`
URL: https://gestao-financeira-7heu.onrender.com

## Regras de código (inegociáveis)
- SEM optional chaining (`?.`) — browsers antigos
- SEM arrow spreads iniciais (`=> ({...spread, x})`) — parse error no build
- SEM emojis em strings JS/JSX
- `service_role` key NUNCA no front — apenas `anon` key via variável de ambiente
- Credenciais sempre em `.env` (não commitado) — ver `.env.example`

## Variáveis de ambiente
```
VITE_SUPABASE_URL      → URL do projeto Supabase
VITE_SUPABASE_ANON_KEY → chave pública (anon/publishable)
```
Configurar também no painel do Render em Environment Variables.

## Arquivos críticos
- `src/lib/supabase.js` — client Supabase (usa import.meta.env)
- `src/lib/db.js` — Dexie + syncAll/syncTable (offline-first)
- `src/lib/utils.js` — fmt, uid, now, today, safe, luminance, deriveCores
- `src/lib/constants.js` — PLAN_LIMITS, INIT_BRAND, atLimit, effectivePlan
- `src/components/ui.jsx` — Card, Modal, Inp, Sel, Btn, Badge, Empty, EditBtn, DelBtn
- `src/App.jsx` — estado global, CRUD, sincronização, roteamento por hash

## CSS vars de tema (index.css)
```
--bg-page, --bg-card, --bg-input, --bg-subtle
--text-main, --text-sub, --text-muted
--border-color
--brand, --brand-soft, --brand-secondary, --brand-accent
```
Dark mode via `data-theme="dark"` no `<html>`. NUNCA usar `bg-white` hardcoded.

## Banco (Supabase kxeqhorxhlgwcgywovqr)
Tabelas: `transactions`, `products`, `losses`, `company_profiles`, `user_roles`
Funções RPC SECURITY DEFINER:
- `set_client_plan(a_target, b_plan, c_actor)` — único jeito de alterar plano
- `admin_impersonate_start(target_uid)` → retorna `{email, temp_pass}`
- `admin_impersonate_restore(target_uid)` → restaura senha original (sem old_hash)
- `admin_delete_client(target_uid)` → deleta dados + auth.users

## White-label
Cada cliente tem paleta própria (primary/secondary/accent + light/dark theme).
CSS vars são setadas via `applyBrandVars()` em App.jsx.

## Planos
- Free: 50 transações / 20 produtos / 10 perdas (totais, não mensais)
- Pro: ilimitado — ativado via `set_client_plan` RPC (nunca UPDATE direto)

## Branches de fix (em andamento)
- `fix/sprint-1-security` — segurança crítica
- `fix/sprint-2-data-integrity` — integridade de dados e sincronização
- `fix/sprint-3-dark-mode` — dark mode base (ui.jsx)
- `fix/sprint-4-functional` — bugs funcionais
- `fix/sprint-5-polish` — visual e acessibilidade
