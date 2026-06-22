# HANDOFF — Financia (gestao-financeira)

Audiência: próxima sessão Claude. Asafe não é programador. Tom: técnico direto.

---

## Decisões permanentes

- Freemium: Free (offline, limites totais) + Pro R$ 70/mês (ilimitado, online).
- Limites Free: 50 tx / 20 produtos / 10 perdas (totais, não mensais).
- Pro ativado manualmente pelo admin no painel — sem Stripe nesta fase.
- Stripe (Fase 3): adiado até Asafe pedir.
- Token GitHub (`nancia_gh_token`): localStorage (persiste). `is_admin`: sessionStorage (limpa ao fechar).

---

## Regras de código (não violar)

- Sem optional chaining (`?.`) — pode causar erros em browsers antigos.
- Sem arrow spreads iniciais (`=> ({...spread})`) — causa parse error no build.
- Sem emoji em strings JS/JSX.
- Deploy: `git push` no main → Render auto-builda com `npm install && npm run build`.
- Nunca `service_role` key no front — tudo via RLS + `sb.rpc()` SECURITY DEFINER.
- Estrutura: `src/lib/`, `src/components/`, `src/views/`, `src/admin/`.
- `onSave` no SettingsView passa APENAS `{name, logo, logo_url, color}` — não color_secondary/accent/theme (esses ficam só no admin).

---

## Estado do banco (Supabase kxeqhorxhlgwcgywovqr)

### Migrations aplicadas

| Migration | O que faz |
|-----------|-----------|
| `20260609_add_plan_to_company_profiles.sql` | Colunas plan / plan_expires_at / plan_activated_by |
| `20260609_rls_admin_read_profiles.sql` | Policy select_own_or_admin em company_profiles |
| `20260609_rls_admin_delete_client.sql` | Policies DELETE para admin em todas as tabelas |
| `20260609_fix_plan_protection.sql` | Policy UPDATE com WITH CHECK (obsoleta, trigger é a solução) |
| Migration paleta (aplicada manualmente) | color_secondary / color_accent / theme em company_profiles |

### Funções e triggers (criados manualmente no Studio)

**`set_client_plan(a_target uuid, b_plan text, c_actor text)`** SECURITY DEFINER
- Prefixos a_/b_/c_ para alinhar ordem alfabética com ordem posicional (PostgREST serializa JSON alfabeticamente).
- Verifica se caller é admin via `user_roles (auth.uid())`.
- Define `set_config("app.allow_plan_change", "1", true)` antes do UPDATE.
- c_actor recebe adminEmail (string), não UUID.
- Única forma válida de alterar plan/plan_expires_at/plan_activated_by.

**`prevent_plan_change()`** trigger BEFORE UPDATE em company_profiles
- Permite bypass se `current_setting("app.allow_plan_change", true) = "1"`.
- Bloqueia mudanças diretas em plan/plan_expires_at/plan_activated_by.
- Não usa SECURITY DEFINER (necessário para que current_setting funcione).

**`admin_impersonate_start(target_uid)`** → retorna `{email, temp_pass}`
**`admin_impersonate_restore(target_uid)`** → restaura senha original (sem old_hash)
**`admin_delete_client(target_uid)`** → deleta dados + auth.users

### Validação (2026-06-09, PASSOU)

- Cliente PATCH plan=pro via REST: HTTP 400, plan não muda.
- Admin `set_client_plan` pro: HTTP 204, plan vira pro.
- Admin `set_client_plan` free: HTTP 204, plan volta para free.

---

## Estado do storage

| Dado | Onde | Comportamento |
|------|------|---------------|
| `nancia_gh_token` | localStorage | Persiste entre sessões (config admin) |
| `is_admin` | sessionStorage | Limpa ao fechar browser |
| `role_<uid>` | Dexie ldb.meta | Cache offline da role, ligado ao UID |
| `last_sync` | Dexie ldb.meta | Timestamp do sync incremental |
| `_imp` | localStorage | Payload de impersonação (TTL 60s, removido após leitura) |
| `_imp_uid` | sessionStorage | UID do cliente sendo impersonado (aba de impersonação) |
| `_imp_restore` | localStorage | Sinal cross-tab para restaurar senha (storage event) |
| tx / products / losses / profiles | Dexie | Offline-first por design |
| JWT Supabase Auth | localStorage (SDK interno) | Fora do controle do app — não alterar |

---

## Estado do código (main, 2026-06-15)

Stack: **Vite 5 + React 18 + Tailwind CSS v3 + Supabase JS v2 + Dexie v3**

### O que funciona (main)

**App geral**
- Offline-first: Dexie primeiro, sync Supabase em background a cada 2min.
- Hash routing: `#dashboard`, `#income`, `#expense`, `#inventory`, `#report`, `#settings`.
- Gating de planos: `enforceLimit` bloqueia addTx/addProduct/addLoss quando Free atinge limite.
- `onAuthStateChange` ignora `INITIAL_SESSION` (já tratado por `getSession()`) e `TOKEN_REFRESHED` (não muda usuário).
- Safety timer de 20s no `loadData` evita spinner eterno caso todos os eventos auth sejam filtrados.
- overflow-x: hidden em html/body + `truncate` em textos de lista — sem scroll horizontal.

**Impersonação (admin → cliente)**
- Admin clica "Entrar": chama `admin_impersonate_start`, salva payload em `localStorage._imp` com TTL 60s.
- Abre `origin + pathname + ?imp=1` (sem hash, senão `?imp=1` fica dentro do fragmento).
- Nova aba lê `_imp`, chama `signInWithPassword`, remove `_imp`, guarda UID em `sessionStorage._imp_uid`.
- Ao fechar a aba (`pagehide`): escreve `localStorage._imp_restore = uid`.
- Aba admin ouve `storage` event: detecta `_imp_restore`, chama `admin_impersonate_restore(uid)`.
- Isso restaura a senha do cliente sem afetar o admin (admin não precisou re-logar).

**Correções de UX (sprint de polish 2026-06-14)**
- Acentos corrigidos em todo o app (Relatório, Início, Despesas, ícone, etc.).
- Área de toque ≥44×44px: hamburger, "Esqueceu a senha?", CTAs de dashboard, botões de login.
- Botões do card de cliente no admin: grid 2×2 (Entrar / Editar / Gerar APK / Excluir) — sempre acessíveis.
- Textos longos com `truncate` em TxView, InventoryView e ReportView.

**Visual / branding**
- White-label: `brand.color` aplicado via CSS vars `--brand`, `--brand-soft`, `--brand-secondary`, `--brand-accent`.
- `data-theme="dark"` / `"light"` no `<html>` controla tema.
- Paleta 3 cores: primary / secondary / accent; secondary/accent derivadas se null no banco.
- Inter font, classes `.tabular`, `.value-xl`, `.page-header`, `.page-sub`.

**Admin**
- AdminPanel: lista clientes com badge FREE/PRO, grid 2×2 de ações por cliente.
- ClientEditModal: editor completo de paleta (3 ColorField + PreviewPaleta + tema + plano).
- GhTokenCard: token GitHub para disparar build via GitHub Actions.

**Infra**
- fetchClients usa RLS policy `select_own_or_admin` — sem service_role no front.
- render.yaml: static site, `npm install && npm run build`, serve `dist/`, rewrite SPA.

### Electron (Windows)

- `electron/main.cjs`: abre `https://financia-gestao.onrender.com` em janela nativa.
- Links externos abrem no browser padrão (não em nova janela Electron).
- Menu nativo removido.
- Ícone gerado por `scripts/gen_icon_win.py` em runtime no CI.
- Build local: `npm run electron:build` → gera instalador NSIS em `dist/`.

### GitHub Actions — Build Release

Arquivo: `.github/workflows/build.yml` (nome do workflow: "Build Release")

**Job `build-apk`** (ubuntu-latest):
- Compila APK Android com Gradle, assina com keystore de `KEYSTORE_B64`.
- Salva APK como artefato temporário `release-apk` (1 dia).

**Job `build-windows`** (windows-latest):
- Instala Node 20 + dependências.
- Gera `electron/icon.ico` via `scripts/gen_icon_win.py`.
- Roda `npx electron-builder --win --publish never`.
- Salva EXE como artefato temporário `release-exe` (1 dia).

**Job `create-release`** (ubuntu-latest, depende dos dois anteriores):
- Baixa APK + EXE.
- Cria GitHub Release com `gh release create` (tag timestamp, título com nome do cliente).
- APK e EXE ficam anexados ao release em **Releases** do repositório.

`GITHUB_TOKEN` com `permissions: contents: write` — não precisa de secret adicional.
`triggerApkBuild()` em `src/lib/db.js` ainda dispara o arquivo `build.yml` via GitHub API — o nome do arquivo não mudou.

---

## Deploy (Render)

- URL: https://financia-gestao.onrender.com
- Qualquer push para `main` dispara deploy automático.
- Build: ~2-3 min.
- Build warning "chunk > 500kB" é esperado (Dexie + Supabase SDK) — não é erro.
- `render.yaml` correto: buildCommand, staticPublishPath, rota SPA rewrite.

---

## Próximas tarefas (em ordem de prioridade)

1. **Fase 3 Stripe** — só quando Asafe pedir.
   - Arquitetura: Edge Function Supabase cria checkout session, webhook atualiza plan via `set_client_plan`.
   - Nunca chave Stripe no front.

---

## Problemas conhecidos

- Cliente promovido para Pro precisa fazer logout/login (ou esperar 2min de sync) para ver mudança de plano.
- Admin precisa re-logar ao abrir nova aba (sessionStorage limpa — comportamento esperado).
- Build JS: ~555 kB / ~155 kB gzip — aviso do Vite, não erro.
- Impersonação depende do evento `pagehide` na aba do cliente: se o usuário forçar fechamento (kill processo) o evento pode não disparar, e a senha do cliente fica temporária até expirar.
