# Context Bootstrap — Financia (gestao-financeira)

> Gerado por **AGENT_CONTEXT** em 2026-06-28. Somente leitura de configs. Nenhum código alterado.

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| Nome (package) | `gestao-financeira` |
| Produto | Financia |
| Versão | 5.1.0 |
| Tipo | SaaS financeiro multi-tenant, offline-first |
| `type` módulo | ESM (`"type": "module"`) |
| Entry Electron | `electron/main.cjs` (CommonJS) |
| Git | repo ativo, branch `main`, último commit `9beaea4` (2026-06-27) |

## 2. Stack Detectada (via package.json)

**Runtime**
- React `^18.3.1` + react-dom `^18.3.1`
- `@supabase/supabase-js` `^2.45.0`
- `dexie` `^3.2.7` (IndexedDB / offline-first)
- `@stripe/react-stripe-js` `^6.6.0` + `@stripe/stripe-js` `^9.8.0`

**Build / Dev**
- Vite `^5.4.10` + `@vitejs/plugin-react` `^4.3.1`
- Tailwind CSS `^3.4.14` + PostCSS `^8.4.47` + autoprefixer `^10.4.20`
- Electron `^31` + electron-builder `^24.13.3` (target NSIS Windows)

**Testes**
- Vitest `^4.1.9` (env jsdom, setup `./src/test/setup.js`, globals on)
- @testing-library/react `^16.3.2` + jest-dom `^6.9.1`
- @playwright/test `^1.61.0` (E2E)

## 3. Scripts npm

| Script | Comando |
|---|---|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `electron:start` | `electron .` |
| `electron:build` | `electron-builder --win` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

> **AVISO**: não existe script `lint`. Nenhum config eslint/prettier/biome na raiz. CLAUDE.md global referencia `npm run lint`, mas o projeto Financia **não tem lint**. Validação de sintaxe = `scripts/verify_syntax.cjs` + build Vite.

## 4. Configs Detectadas

- `vite.config.js` — publicDir `public`, outDir `dist`, `emptyOutDir`, bloco `test` (jsdom).
- `tailwind.config.js` — content `./index.html` + `./src/**/*.{js,jsx}`; theme vazio (tema vive em CSS vars no `index.css`); sem plugins.
- `postcss.config.js` — presente (tailwind + autoprefixer).
- `render.yaml` — static site; build `npm install && npm run build`; serve `dist/`; CSP rígida + HSTS + X-Frame-Options SAMEORIGIN + bloqueio de `/package.json`; SPA rewrite `/* -> /index.html`.
- `.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` (pk_). Chave secreta Stripe só no Supabase (Edge Function secrets).
- `.gitignore` / `.claudeignore` / `.cloudignore` presentes.

## 5. Backend Supabase

- **Migrations**: 10 arquivos em `supabase/migrations/` (plan columns, RLS admin, plan protection trigger, audit harden, impersonation cron/security, stripe activate, white-label add-on + guard).
- **Edge Functions** (6): `admin-create-client`, `create-checkout-session`, `create-payment`, `create-subscription`, `stripe-config`, `stripe-webhook`.
- **RPCs SECURITY DEFINER**: `set_client_plan(a_target,b_plan,c_actor)`, `prevent_plan_change()` (trigger), `admin_impersonate_start/restore`, `admin_delete_client`.

## 6. Regras de Código INEGOCIÁVEIS (de CLAUDE.md)

- PROIBIDO optional chaining `?.` (browsers legados).
- PROIBIDO arrow spreads iniciais `=> ({...spread, x})` (parse error Vite).
- PROIBIDO emojis em strings JS/JSX.
- PROIBIDO `service_role` key no front — só RLS + `sb.rpc()` SECURITY DEFINER.
- PROIBIDO credenciais hardcoded — só `.env`.
- PROIBIDO classes de cor hardcoded (`bg-white`, `text-black`) — usar CSS vars do tema.
- OBRIGATÓRIO confirmação antes de ação destrutiva.
- OBRIGATÓRIO toque mínimo 44×44px; `truncate` em listas; `overflow-x: hidden` em html/body.

## 7. Invariantes de Domínio

- **Multi-tenant**: toda query/policy RLS filtra `auth.uid() = user_id`.
- **Plano**: alterado SÓ via RPC `set_client_plan`; trigger `prevent_plan_change` bloqueia UPDATE direto.
- **Limites Free**: 50 tx / 20 produtos / 10 perdas (totais, não mensais). Pro = ilimitado.
- **Sync**: Dexie = fonte local; sync bidirecional a cada 2 min; flag `_synced`; delta por `updated_at`.
- **Hash routing**: `#dashboard #income #expense #inventory #report #settings`.

## 8. Deploy / CI

- Render static site, auto-deploy em push `main` (~2-3 min). URL `https://financia-gestao.onrender.com`.
- GitHub Actions `.github/workflows/build.yml` — gera APK Android + EXE Windows, cria Release.
- `triggerApkBuild()` em `src/lib/db.js` dispara `build.yml` via GitHub API.

## 9. Escopo de Trabalho (roadmap aprovado pelo dono — referência p/ PLANNING)

Refactor por componente (não tudo de uma vez): **(1)** Auth/Settings, **(2)** Planos via Stripe Elements in-app (sem redirect), **(3)** Add-on Personalização (pagamento único), **(4)** Bugs (cascata de limites, contador não atualiza, recorrentes, lote, números gigantes, rodapé), **(5)** IA de Insights p/ todos.

> Itens de auth, billing, schema, migrations e `package.json` são **USER_APPROVAL** pela política do MASTER_ORCHESTRATOR.

## 10. Avisos (warnings)

- `npm run lint` inexistente — não há linter configurado. QA deve usar build + verify_syntax + vitest.
- Sem `tsconfig.json` — projeto é JS/JSX puro, sem TypeScript no front (Edge Functions são `.ts` Deno).
- `NOTA_BLOCKED.md`: feature `isLandingPreview` nunca foi commitada (não é cache).
- `CLAUDE_HANDOFF.md` (2026-06-15) descreve Stripe como "Fase 3 adiada", mas o repo JÁ tem 6 edge functions Stripe e deps `@stripe/*` instaladas → estado evoluiu; roadmap atual pede Stripe Elements ativo. Tratar handoff como histórico, roadmap como atual.

---

```yaml
status: SUCCESS
modified_files:
  - docs/state.json
created_files:
  - docs/context_bootstrap.md
deleted_files: []
warnings:
  - "Projeto nao tem script lint nem config eslint/prettier/biome (CLAUDE.md global cita npm run lint inexistente aqui)"
  - "Sem tsconfig.json — front e JS/JSX puro"
  - "CLAUDE_HANDOFF.md desatualizado quanto a Stripe (diz Fase 3 adiada, mas edge functions Stripe ja existem)"
confidence: 100
risk: Low
next_agent: AGENT_DISCOVERY
```
