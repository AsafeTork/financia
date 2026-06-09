# HANDOFF — Financia (gestao-financeira)

Audience: next Claude session. Asafe is not a coder. Tom: tecnico direto.

## Decisoes permanentes

- Pricing: Freemium. Free (offline, limites) + Pro R$ 70/mes (online, ilimitado).
- Limites Free: 50 tx / 20 produtos / 10 perdas (totais, nao por mes).
- Pro ativado manualmente pelo admin no painel — sem Stripe nesta fase.
- Migração Vite: APROVADA mas POSTERGADA. Branch `refactor/vite`, nunca no main, so quando Asafe pedir.
- Stripe (Phase 3): postergado ate Asafe confirmar.
- Token GitHub no localStorage: risco baixo por ora, sem clientes em producao.

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

## Estado do codigo (main, ultimo commit ff77c05)

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

## Proximas tarefas (em ordem de prioridade)

1. **Mover token GitHub do localStorage para sessionStorage**
   Linha ~870 do index.html: `localStorage.getItem("nancia_gh_token")`.
   sessionStorage limpa ao fechar o browser — reduz janela de exposicao.
   Baixa prioridade enquanto nao houver clientes em producao.

2. **Fase 3 Stripe** — so quando Asafe pedir.
   Arquitetura: Edge Function Supabase cria checkout session, webhook atualiza plan via
   set_client_plan. Nunca chave Stripe no front.

## Problemas conhecidos

- Cliente promovido para Pro precisa fazer logout/login (ou esperar 2min de sync) para ver mudanca.
- Limites Free sao totais (nao por mes).
- Babel no browser: performance ruim em mobile antigo. Resolvido na migracao Vite.
- index.html monolitico ~1960 linhas. Resolvido na migracao Vite.

