# HANDOFF — Financia (gestao-financeira)

Audience: next Claude session. Asafe nao eh coder. Tom: tecnico direto.

---

## Decisoes permanentes

- Pricing: Freemium. Free (offline, limites) + Pro R$ 70/mes (online, ilimitado).
- Limites Free: 50 tx / 20 produtos / 10 perdas (totais, nao por mes).
- Pro ativado manualmente pelo admin no painel — sem Stripe nesta fase.
- Stripe (Phase 3): postergado ate Asafe confirmar.
- Token GitHub (`nancia_gh_token`): localStorage (persiste). `is_admin`: sessionStorage (limpa ao fechar).

---

## Regras de codigo (nao violar)

- Sem optional chaining (`?.`) — pode causar erros em browsers antigos
- Sem arrow spreads iniciais (`=> {...spread}`) — causa parse error
- Sem emoji em strings JS
- Deploy: `git push` no main → Render auto-builda com `npm install && npm run build`
- Nunca `service_role` key no front — tudo via RLS + `sb.rpc()` SECURITY DEFINER
- Estrutura: `src/lib/`, `src/components/`, `src/views/`, `src/admin/`
- `onSave` no SettingsView passa APENAS `{name, logo, logo_url, color}` — nao color_secondary/accent/theme (esses ficam so no admin)

---

## Estado do banco (Supabase kxeqhorxhlgwcgywovqr)

### Migrations aplicadas

| Migration | O que faz |
|-----------|-----------|
| `20260609_add_plan_to_company_profiles.sql` | colunas plan / plan_expires_at / plan_activated_by |
| `20260609_rls_admin_read_profiles.sql` | policy select_own_or_admin em company_profiles |
| `20260609_rls_admin_delete_client.sql` | policies DELETE para admin em todas as tabelas |
| `20260609_fix_plan_protection.sql` | policy UPDATE com WITH CHECK (obsoleta, trigger eh a solucao) |

### PENDENTE — Asafe deve rodar no Studio

```sql
-- Paleta multi-tom + tema por cliente
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS color_secondary text,
  ADD COLUMN IF NOT EXISTS color_accent    text,
  ADD COLUMN IF NOT EXISTS theme           text DEFAULT 'light';
```

Sem isso, `color_secondary` / `color_accent` / `theme` nao persistem no banco.
O app funciona mesmo sem a migration — deriva as cores automaticamente via `deriveCores()`.

### Funcoes e triggers (criados manualmente no Studio)

**`set_client_plan(a_target uuid, b_plan text, c_actor text)`** SECURITY DEFINER
- Prefixos a_/b_/c_ para alinhar ordem alfabetica com ordem posicional (PostgREST serializa JSON alfabeticamente)
- Verifica se caller eh admin via `user_roles (auth.uid())`
- Define `set_config("app.allow_plan_change", "1", true)` antes do UPDATE
- c_actor recebe adminEmail (string), nao UUID
- Unica forma valida de alterar plan/plan_expires_at/plan_activated_by

**`prevent_plan_change()`** trigger BEFORE UPDATE em company_profiles
- Permite bypass se `current_setting("app.allow_plan_change", true) = "1"`
- Bloqueia mudancas diretas em plan/plan_expires_at/plan_activated_by
- NAO usa SECURITY DEFINER (necessario para que current_setting funcione)

### Validacao (2026-06-09, PASSOU)

- Cliente PATCH plan=pro via REST: HTTP 400, plan nao muda
- Admin `set_client_plan` pro: HTTP 204, plan vira pro
- Admin `set_client_plan` free: HTTP 204, plan volta para free

---

## Estado do storage

| Dado | Onde | Comportamento |
|------|------|---------------|
| `nancia_gh_token` | localStorage | Persiste entre sessoes (config admin) |
| `is_admin` | sessionStorage | Limpa ao fechar browser |
| `role_<uid>` | Dexie ldb.meta | Cache offline da role, ligado ao UID |
| `last_sync` | Dexie ldb.meta | Timestamp do sync incremental |
| tx / products / losses / profiles | Dexie | Offline-first por design |
| JWT Supabase Auth | localStorage (SDK interno) | Fora do controle do app — nao alterar |

---

## Estado do codigo (main, commit 20a8bf3 — 2026-06-10)

Stack: **Vite 5 + React 18 + Tailwind CSS v3 + Supabase JS v2 + Dexie v3**

### Branches

| Branch | Status |
|--------|--------|
| `main` | Producao — deploy automatico via Render |
| `feat/ui-final` | **Em progresso** — redesign visual completo (6 commits, aguarda aprovacao) |
| `feat/visual-redesign` | Mergeado em main em 2026-06-10 |
| `feat/color-palette` | Mergeado em main em 2026-06-10 |
| `refactor/vite` | Mergeado em main em 2026-06-09 — mantida como backup |

### feat/ui-final — estado atual (commit 5e11f06, aguarda aprovacao para merge)

Branch com redesign visual completo, direcao "Corporativo Confiavel" (QuickBooks/Monday style).
**NAO mergear no main sem aprovacao de Asafe.**

6 commits feitos:
1. `e3695c4` — index.css + ui.jsx: Inter font, CSS vars, classes `.tabular`/`.page-header`/`.page-sub`, componentes `Btn`/`Badge`/`Divider`, `Card` com variantes
2. `1b0a17d` — Header + Sidebar + BottomNav: h-14, sync status dot, active sidebar indicator, 5 itens diretos no BottomNav
3. `2ab7372` — Dashboard + UsageBar: `greeting()`, KpiCard com variacao %, BarChartSVG com Y-axis grid
4. `ffae687` — TxView: `page-header`/`page-sub`, `w-9/h-9` icon circles, `.tabular` em valores
5. `cf5191e` — InventoryView + ReportView: tabs com Badge counter, margin% color-coded, month pills scrollaveis, 4 KPI cards
6. `5e11f06` — Login: split layout desktop (painel esquerdo brand-colored + SVG decorativo), mobile centered, error alert, "Esqueceu a senha?"

Todos os 6 commits passaram `npm run build` limpo.

### O que funciona (main)

**App geral**
- Offline-first: Dexie primeiro, sync Supabase em background a cada 2min
- Hash routing: `#dashboard`, `#inventory`, `#settings`, etc.
- Gating de planos: `enforceLimit` bloqueia addTx/addProduct/addLoss quando Free atinge limite
- `setDataLoading(false)` no `catch(e)` do loadData (evita spinner eterno em erro)

**Visual / branding**
- White-label: `brand.color` aplicado em toda UI via CSS vars `--brand`, `--brand-soft`, `--brand-secondary`, `--brand-accent`
- `data-theme="dark"` / `"light"` no `<html>` controla tema via CSS overrides com `!important`
- `--border-color` definido no dark theme para BottomNav e outros elementos inline
- BottomNav usa `background: var(--bg-page)` e `borderTop: var(--border-color, #f1f5f9)` — suporta dark
- Paleta 3 cores: primary / secondary / accent; secondary/accent derivadas automaticamente se null em banco
- `deriveCores(primary)` → `{ secondary: lightenHex(primary, 0.78), accent: lightenHex(primary, 0.92) }`

**Views**
- Dashboard: KPIs com variacao % vs mes anterior; grafico 7 dias; alerta de estoque baixo
- TxView: transacoes agrupadas por data; empty states SVG
- InventoryView: tabs underline; badges de estoque coloridos
- SettingsView: abas Security / Conta / Clientes(admin-only); tab inicial sempre 'security'; `onSave` passa apenas `{name, logo, logo_url, color}`

**Admin**
- AdminPanel: lista clientes com badge FREE/PRO; botao Editar; botao Del (icone SVG lixeira); `reload()` chamado apos `onSave`
- ClientEditModal: editor completo de paleta (3 ColorField + PreviewPaleta + tema + plano); extracao de cores da logo por grupo de luminancia; `console.log('[ClientEditModal save]', ...)` temporario para diagnostico
- Extracao de cores: bucket=48, filtro near-white>240, deduplicacao por distancia<30, 3 grupos (dark<0.15 / mid 0.15-0.5 / light>0.5), grupos vazios derivados via `lightenHex`
- UI extracao: 3 linhas rotuladas (Primaria / Secundaria / Acento) + "Aplicar" individual + "Aplicar todas de uma vez"
- GhTokenCard: token GitHub para disparar build APK via GitHub Actions

**Infra**
- fetchClients usa RLS policy `select_own_or_admin` — sem service_role no front
- Todos CRUDs: try/catch em writes Dexie E em blocos Supabase (`navigator.onLine`)
- render.yaml: static site, `npm install && npm run build`, serve `dist/`

---

## Deploy (Render)

- URL: https://gestao-financeira-7heu.onrender.com
- Qualquer push para `main` dispara deploy automatico
- Build: ~2-3 min
- Build warning "chunk > 500kB" eh esperado (Dexie + Supabase SDK) — nao eh erro

---

## Proximas tarefas (em ordem de prioridade)

1. **Aprovar e mergear feat/ui-final** — Asafe deve revisar o redesign e confirmar merge para main
2. **Rodar migration SQL no Supabase Studio** — Asafe deve executar o ALTER TABLE acima para que paleta persista
3. **Remover console.log temporario** no ClientEditModal.jsx apos confirmar que o save funciona
4. **Fase 3 Stripe** — so quando Asafe pedir
   - Arquitetura: Edge Function Supabase cria checkout session, webhook atualiza plan via `set_client_plan`
   - Nunca chave Stripe no front

---

## Problemas conhecidos

- Cliente promovido para Pro precisa fazer logout/login (ou esperar 2min de sync) para ver mudanca de plano
- Admin precisa re-logar ao abrir nova aba (sessionStorage limpa — comportamento esperado)
- Build JS: ~555 kB / ~155 kB gzip — aviso do Vite, nao erro
