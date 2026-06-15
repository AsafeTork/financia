# gestao-financeira — Contexto para Claude Code

## Stack
Vite 5 + React 18 + Tailwind CSS v3 + Supabase JS v2 + Dexie v3 (offline-first)
Desktop Windows: Electron 31 (electron-builder, NSIS)

## Deploy
Render static site — auto-deploy no push para `main`
URL: https://gestao-financeira-7heu.onrender.com

## Regras de código (inegociáveis)
- SEM optional chaining (`?.`) — browsers antigos
- SEM arrow spreads iniciais (`=> ({...spread, x})`) — parse error no build
- SEM emojis em strings JS/JSX
- `service_role` key NUNCA no front — apenas `anon` key via variável de ambiente
- Credenciais sempre em `.env` (não commitado)
- Toda ação destrutiva pede confirmação antes de executar
- Área de toque mínima 44×44px em todos os elementos interativos
- Textos em listas sempre com `truncate` — sem overflow horizontal

## Variáveis de ambiente
```
VITE_SUPABASE_URL      → URL do projeto Supabase
VITE_SUPABASE_ANON_KEY → chave pública (anon/publishable)
```
Configurar também no painel do Render em Environment Variables.

## Arquivos críticos
- `src/lib/supabase.js` — client Supabase (usa import.meta.env)
- `src/lib/db.js` — Dexie + syncAll/syncTable + triggerApkBuild
- `src/lib/utils.js` — fmt, uid, now, today, safe, luminance, deriveCores
- `src/lib/constants.js` — PLAN_LIMITS, INIT_BRAND, atLimit, effectivePlan
- `src/components/ui.jsx` — Card, Modal, Inp, Sel, Btn, Badge, Empty, EditBtn, DelBtn
- `src/App.jsx` — estado global, CRUD, sync, roteamento hash, impersonação
- `electron/main.cjs` — main process Electron (abre URL de produção)
- `scripts/gen_icons.py` — gera ícones PNG para APK Android
- `scripts/gen_icon_win.py` — gera ícone ICO para Windows (16/32/48/256px)
- `.github/workflows/build.yml` — Build Release: APK + EXE + GitHub Release

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
- `admin_impersonate_restore(target_uid)` → restaura senha original
- `admin_delete_client(target_uid)` → deleta dados + auth.users

Prefixos a_/b_/c_ nos parâmetros SQL são intencionais: PostgREST serializa
parâmetros em ordem alfabética; os prefixos garantem alinhamento posicional.

## Impersonação (admin → cliente)
Fluxo cross-tab via localStorage:
1. Admin abre `origin + pathname + ?imp=1` (nunca com hash — ficaria dentro do fragmento)
2. Nova aba lê `localStorage._imp`, assina como cliente, remove o payload
3. Aba do cliente guarda UID em `sessionStorage._imp_uid`
4. Ao fechar (`pagehide`): escreve `localStorage._imp_restore = uid`
5. Aba admin ouve `storage` event e chama `admin_impersonate_restore(uid)`

## Auth — eventos importantes (onAuthStateChange)
- `INITIAL_SESSION`: ignorar — já tratado por `getSession()` na inicialização
- `TOKEN_REFRESHED`: ignorar — não muda o usuário, não recarregar dados
- `SIGNED_IN` / `USER_UPDATED`: recarregar dados do usuário
- Safety timer de 20s em `loadData` evita spinner eterno em edge cases

## White-label
Cada cliente tem paleta própria (primary/secondary/accent + light/dark theme).
CSS vars setadas via `applyBrandVars()` em App.jsx.
secondary/accent derivados automaticamente via `deriveCores(primary)` se null no banco.

## Planos
- Free: 50 transações / 20 produtos / 10 perdas (totais, não mensais)
- Pro: ilimitado — ativado via `set_client_plan` RPC (nunca UPDATE direto)

## Electron (Windows)
- `electron/main.cjs` usa `.cjs` porque `package.json` tem `"type": "module"`
- Não empacota código local — apenas abre a URL de produção
- `npm run electron:start` para testar, `npm run electron:build` para gerar .exe
- Ícone gerado em runtime pelo CI (`scripts/gen_icon_win.py`) — não commitado

## GitHub Actions
Workflow em `.github/workflows/build.yml` (nome: "Build Release")
- Job `build-apk` (ubuntu): compila APK com Gradle
- Job `build-windows` (windows): gera EXE com electron-builder
- Job `create-release`: cria GitHub Release com ambos os artefatos
- `triggerApkBuild()` em `src/lib/db.js` dispara este workflow via GitHub API
- Secrets necessários: `KEYSTORE_B64`, `KEYSTORE_PASS`, `KEY_ALIAS`
- `GITHUB_TOKEN` automático com `permissions: contents: write`
