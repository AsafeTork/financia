# Copilot Instructions for Financia

## Build, test, and lint commands

```bash
npm run dev
npm run build
npm run test
npm run test -- src/hooks/useTx.test.js
npm run test -- src/hooks/useTx.test.js -t "caminho feliz"
npm run electron:start
npm run electron:build
```

Linting is not currently wired in `package.json` (no `lint` script/config in repo).

## High-level architecture

- This is an offline-first React app (`src/App.jsx`) where Dexie (`src/lib/db.js`) is the local source of truth and Supabase is synchronized in the background.
- Session/bootstrap flow is centralized in `src/hooks/useSession.js`: it loads local data first, then syncs remotely, subscribes to realtime channels, and runs periodic sync every 2 minutes.
- Domain state is split into hooks (`useTx`, `useProducts`, `useLosses`) that write to Dexie first and then attempt Supabase writes when online.
- UI routing is hash-based (`#dashboard`, `#income`, `#expense`, `#inventory`, `#email`, `#report`, `#settings`, `#planos`), coordinated in `App.jsx`.
- Multi-tenant security and billing logic are enforced in Supabase migrations/RPCs (`supabase/migrations/*`), especially around plan changes and admin-only operations.

## Key conventions in this repository

- Do not use optional chaining (`?.`) or arrow functions returning object spreads like `=> ({ ...x })`; both are explicitly blocked by project rules.
- Do not hardcode privileged backend access in frontend (`service_role` is forbidden). Privileged operations must go through admin-gated RPCs/Edge Functions.
- `company_profiles.plan*` fields must be changed through `set_client_plan(...)`; direct updates are protected by DB-level guards/triggers.
- For PostgREST RPC payload stability, ordered RPC params use alphabetical prefixes (`a_`, `b_`, `c_`) in SQL function signatures.
- Offline sync relies on `_synced`, `_deleted`, and `_updated_at` fields. Keep these semantics intact when adding local write paths.
- Keep destructive user actions behind explicit confirmation modals (pattern used with `Confirm` in `App.jsx`).
- Touch targets in interactive controls should be at least `44x44` and list rows should use `truncate` to avoid horizontal overflow on mobile.
- Theme must be driven by CSS variables in `src/index.css` (`--brand`, `--brand-secondary`, `--brand-accent`, etc.), not hardcoded Tailwind color classes.
