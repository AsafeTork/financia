# CLAUDE.md — Financia (gestao-financeira)

> Documento canônico para Claude Code. Leia completamente antes de qualquer ação.

---

## Stack e Plataformas

- **Frontend**: Vite 5 + React 18 + Tailwind CSS v3
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions + Auth)
- **Offline-first**: Dexie v3 (IndexedDB)
- **Desktop**: Electron 31 (renderiza produção: `https://financia-gestao.onrender.com`)
- **Deploy**: Render static site — auto-deploy em push para `main`
- **CI/CD**: GitHub Actions (`.github/workflows/build.yml`) — gera APK Android + EXE Windows
- **Pagamentos**: Stripe (@stripe/react-stripe-js + @stripe/stripe-js) — Fase 3, ainda não ativo
- **Testes**: Vitest + Testing Library + Playwright

---

## Estrutura de Diretórios

```
src/
  App.jsx            # Roteamento, auth, loadData, applyBrandVars
  main.jsx           # Entry point React
  index.css          # CSS vars globais de tema (Design System)
  animations.css     # Animações globais
  lib/
    db.js            # Dexie local + loop de sync + triggerApkBuild
    supabase.js      # Cliente Supabase (anon key via env)
    auth.js          # Helpers de autenticação
    constants.js     # Limites de plano, configurações globais
    utils.js         # Funções utilitárias
    stripe.js        # Integração Stripe (fase 3)
    ai.js            # Integração IA
    pwa.js           # Service worker / PWA
    recurring.js     # Lançamentos recorrentes
    exporters.js     # Exportação de dados
  hooks/
    useSession.js    # Sessão, autenticação, impersonação, loadData
    useTx.js         # Transações (receitas/despesas)
    useProducts.js   # Inventário / produtos
    useLosses.js     # Perdas
    useScrollReveal.js
  views/
    Dashboard.jsx
    TxView.jsx
    InventoryView.jsx
    ReportView.jsx
    SettingsView.jsx
    PlansView.jsx
    Login.jsx
    Landing.jsx
    EmailView.jsx
    PrivacyPolicy.jsx
    TermsOfService.jsx
  components/        # Componentes reutilizáveis
  admin/             # Painel admin (AdminPanel, ClientEditModal, etc.)
supabase/
  migrations/        # Migrações SQL aplicadas no Supabase
  functions/         # Edge Functions
electron/
  main.cjs           # Main process Electron (CommonJS)
scripts/             # gen_icons.py, gen_icon_win.py, verify_syntax.cjs
```

---

## Regras de Código — INEGOCIÁVEIS

> Estas regras são anti-falhas críticas. Nunca violar.

- **PROIBIDO** optional chaining (`?.`) — causa erros em browsers legados suportados
- **PROIBIDO** arrow spreads iniciais (`=> ({...spread, x})`) — causa parse error no build Vite
- **PROIBIDO** emojis em strings JS/JSX
- **PROIBIDO** `service_role` key no frontend — toda operação privilegiada via RLS + `sb.rpc()` SECURITY DEFINER
- **PROIBIDO** credenciais hardcoded — sempre via `.env` (nunca commitado)
- **PROIBIDO** classes de cor hardcoded como `bg-white`, `text-black` — usar variáveis CSS do tema
- **OBRIGATÓRIO** confirmação antes de qualquer ação destrutiva na UX
- **OBRIGATÓRIO** área de toque mínima de 44×44px em todos os elementos interativos
- **OBRIGATÓRIO** classe `truncate` em textos de lista para evitar overflow horizontal
- **OBRIGATÓRIO** `overflow-x: hidden` em `html/body`

---

## Design System (CSS Vars — index.css)

Variáveis obrigatórias do tema:

```css
--bg-page, --bg-card, --bg-input, --bg-subtle
--text-main, --text-sub, --text-muted
--border-color
--brand, --brand-soft, --brand-secondary, --brand-accent
```

- **Dark mode**: controlado via `data-theme="dark"` na tag `<html>`
- **Cores derivadas**: `deriveCores(primary)` gera secondary e accent automaticamente se nulas no banco
- **Aplicação**: `applyBrandVars()` em `App.jsx`
- **Fontes**: Inter, classes `.tabular`, `.value-xl`, `.page-header`, `.page-sub`

---

## Roteamento

Hash routing: `#dashboard`, `#income`, `#expense`, `#inventory`, `#report`, `#settings`

---

## Sincronização Offline-First

- **Estratégia**: Dexie (IndexedDB) é a fonte de verdade local
- **Sync remoto**: bidirecional a cada 2 minutos via `db.js`
- **Flag de sync**: coluna `_synced` (0 = não sincronizado)
- **Delta**: coluna `updated_at` como base de paginação incremental
- **Regra**: registros com `_synced = 0` não podem sofrer UPDATE remoto antes de sincronizar

---

## Segurança e RLS (Multi-tenant)

- **Isolamento**: toda query e policy RLS DEVE filtrar por `auth.uid() = user_id`
- **Função de plano**: `set_client_plan(a_target, b_plan, c_actor)` — SECURITY DEFINER
  - Prefixos `a_`, `b_`, `c_` são obrigatórios (PostgREST serializa JSON em ordem alfabética)
  - Única forma válida de alterar `plan` / `plan_expires_at` / `plan_activated_by`
- **Trigger de proteção**: `prevent_plan_change()` em `company_profiles` bloqueia alterações diretas
- **Admin gates**: funções RPC SECURITY DEFINER validam `role = 'admin'` via `user_roles`

---

## Limites de Plano

| Plano | Transações | Produtos | Perdas |
|-------|-----------|----------|--------|
| Free  | 50 total  | 20 total | 10 total |
| Pro   | Ilimitado | Ilimitado | Ilimitado |

- Limites são **totais**, não mensais
- Ativação do Pro: exclusivamente via RPC `set_client_plan` — nunca via UPDATE direto

---

## Funções RPC e Triggers no Supabase

| Função/Trigger | Tipo | Descrição |
|---|---|---|
| `set_client_plan(a_target, b_plan, c_actor)` | RPC SECURITY DEFINER | Altera plano do cliente com validação de admin |
| `prevent_plan_change()` | Trigger BEFORE UPDATE | Bloqueia alterações diretas em campos de plano |
| `admin_impersonate_start(target_uid)` | RPC | Retorna `{email, temp_pass}` para impersonação |
| `admin_impersonate_restore(target_uid)` | RPC | Restaura senha original após impersonação |
| `admin_delete_client(target_uid)` | RPC | Deleta dados + auth.users do cliente |

---

## Fluxo de Impersonação (Admin → Cliente)

Executado cross-tab via `localStorage` e `sessionStorage`:

1. Admin clica "Entrar" → chama `admin_impersonate_start`, salva payload em `localStorage._imp` (TTL 60s)
2. Abre `origin + pathname + ?imp=1` — **sem hash**, senão `?imp=1` fica dentro do fragmento
3. Nova aba lê `_imp`, chama `signInWithPassword`, remove `_imp`, guarda UID em `sessionStorage._imp_uid`
4. Ao fechar aba (`pagehide`): escreve `localStorage._imp_restore = uid`
5. Aba admin ouve `storage` event: detecta `_imp_restore`, chama `admin_impersonate_restore(uid)`

> **Problema conhecido**: `pagehide` pode não disparar em kill forçado do processo. Senha fica temporária até expirar.

---

## Ciclo de Vida Auth (onAuthStateChange)

| Evento | Ação |
|---|---|
| `INITIAL_SESSION` | Ignorar — já tratado por `getSession()` no bootstrap |
| `TOKEN_REFRESHED` | Ignorar — não altera dados estruturais |
| `SIGNED_IN` / `USER_UPDATED` | Recarregar dados do usuário obrigatoriamente |

- Safety timer de 20s no `loadData` para mitigar travamento de spinner

---

## Storage (localStorage / sessionStorage / Dexie)

| Dado | Onde | Comportamento |
|------|------|---------------|
| `nancia_gh_token` | localStorage | Persiste entre sessões |
| `is_admin` | sessionStorage | Limpa ao fechar browser |
| `role_<uid>` | Dexie `ldb.meta` | Cache offline da role |
| `last_sync` | Dexie `ldb.meta` | Timestamp do sync incremental |
| `_imp` | localStorage | Payload de impersonação (TTL 60s) |
| `_imp_uid` | sessionStorage | UID do cliente sendo impersonado |
| `_imp_restore` | localStorage | Sinal cross-tab para restaurar sessão |

---

## Divisão de Escopo no Desenvolvimento

| Escopo Claude | Escopo Usuário |
|---|---|
| Lógica de estado e hooks | Estilização Tailwind |
| Integrações de APIs | Identidade visual |
| Regras de negócio | Customização CSS corporativo |
| Tratamento de erros | Ajustes finos do design system |

---

## Migrações Aplicadas (Supabase)

| Arquivo | O que faz |
|---|---|
| `20260609_add_plan_to_company_profiles.sql` | Colunas plan / plan_expires_at / plan_activated_by |
| `20260609_rls_admin_read_profiles.sql` | Policy select_own_or_admin em company_profiles |
| `20260609_rls_admin_delete_client.sql` | Policies DELETE para admin |
| `20260609_fix_plan_protection.sql` | Policy UPDATE (obsoleta, substituída por trigger) |
| `20260624_audit_harden_admin_gates.sql` | Hardenização de gates admin |
| `20260624_impersonation_cron.sql` | Cron de limpeza de tokens de impersonação |
| `20260624_impersonation_security.sql` | Segurança do fluxo de impersonação |
| `20260624_stripe_activate_plan.sql` | Ativação de plano via Stripe (fase 3) |
| `20260626000000_white_label_addon.sql` | White-label: color_secondary / color_accent / theme |
| `20260626000001_harden_guard_white_label.sql` | Guard de proteção white-label |

---

## Comandos Importantes

```bash
npm run dev           # Servidor de desenvolvimento Vite
npm run build         # Build de produção
npm run test          # Vitest (suite de testes)
npm run electron:start # Inicia Electron localmente
npm run electron:build # Gera instalador NSIS para Windows
git push origin main  # Dispara deploy automático no Render (~2-3 min)
```

---

## Localização dos Agentes de Orquestração

Os prompts de orquestração multiagente para Claude Code estão em:

```
prompts_financia/
  MASTER_ORCHESTRATOR.md
  AGENT_CONTEXT.md
  AGENT_DISCOVERY.md
  AGENT_ARCHITECT.md
  AGENT_PLANNING.md
  AGENT_SECURITY.md
  AGENT_DATABASE.md
  AGENT_FRONTEND.md
  AGENT_BACKEND.md
  AGENT_REVIEW.md
  AGENT_QA.md
  AGENT_DOCUMENTATION.md
  AGENT_RELEASE.md
```

---

## Problemas Conhecidos

- Cliente promovido para Pro precisa de logout/login (ou 2min de sync) para ver mudança
- Admin precisa re-logar ao abrir nova aba (sessionStorage limpa — comportamento esperado)
- Build JS ~555 kB / ~155 kB gzip — aviso do Vite, não erro
- Impersonação depende de `pagehide`: kill forçado do processo pode perder o evento