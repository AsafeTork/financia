# HANDOFF — Financia (gestao-financeira)

Audience: next Claude session. Asafe is not a coder. Tom: tecnico direto.

## Decisoes permanentes

- Pricing: Freemium. Free (offline, limites) + Pro R$ 70/mes (online, ilimitado).
- Limites Free: 50 tx / 20 produtos / 10 perdas (totais, nao por mes).
- Pro ativado manualmente pelo admin no painel — sem Stripe nesta fase.
- Migração Vite: APROVADA mas POSTERGADA. Branch `refactor/vite`, nunca no main, so quando Asafe pedir.
- Stripe (Phase 3): postergado ate Asafe confirmar.
- Token GitHub no localStorage: risco alto, conhecido, nao urgente pois nao ha clientes em producao.

## Regras de codigo (nao violar)

- Sem optional chaining (?.) — Babel CDN nao suporta
- Sem arrow spreads iniciais (`=> {...spread}`) — causa parse error
- Sem emoji em strings JS
- Script tag: `<script type="text/babel" data-presets="react">`
- Deploy sempre via git push main; Render auto-deploya
- Nunca service_role key no front — tudo via RLS + sb.rpc() SECURITY DEFINER
- Checklist pre-commit obrigatorio (ver abaixo)

### Checklist pre-commit (rodar com node no diretorio do repo)

```js
const fs=require('fs'),parser=require('@babel/parser');
const js=fs.readFileSync('index.html','utf8').match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
parser.parse(js,{sourceType:'script',plugins:['jsx']});
console.assert((js.match(/=>\{?\s*\.\.\./g)||[]).length===0,'arrow spreads');
console.assert((js.match(/\?\.[a-zA-Z_]/g)||[]).length===0,'optional chain');
console.assert(js.includes('const fmt'),'const fmt');
console.assert(js.includes('const today'),'const today');
console.log('OK');
```

## Estado do banco (Supabase kxeqhorxhlgwcgywovqr)

Migrations ja aplicadas:
- `20260609_add_plan_to_company_profiles.sql` — colunas plan/plan_expires_at/plan_activated_by
- `20260609_rls_admin_read_profiles.sql` — policy select_own_or_admin em company_profiles
- `20260609_rls_admin_delete_client.sql` — policies DELETE para admin em todas as tabelas
- `set_client_plan` SECURITY DEFINER function — criada por Asafe (nao ha migration file, foi rodada manualmente)

RLS pendente (nao confirmada):
- Policy UPDATE em company_profiles que bloqueia cliente de alterar plan diretamente.
  O front usa sb.rpc('set_client_plan') agora, entao o risco diminuiu, mas a policy de
  UPDATE ainda deve existir para defesa em profundidade.

## Estado do codigo (main, ultimo commit a133c3c)

O que funciona:
- Gating de planos: enforceLimit bloqueia addTx/addProduct/addLoss quando Free bate limite
- UpgradeModal aparece quando limite atingido
- AdminPanel: lista clientes com badge FREE/PRO, botao Editar abre ClientEditModal
- ClientEditModal: altera name/color via update direto; altera plan via sb.rpc('set_client_plan')
- Dashboard: card "Uso do plano gratuito" visivel so para Free, com barras de progresso
  (fica amarelo quando passa 80% do limite)
- Navegacao persistida no hash da URL (#dashboard, #inventory, etc.)
- fetchClients usa RLS policy "select_own_or_admin" — sem service_role no front
- fetchRole retorna boolean correto para isAdmin
- handleSaveBrand com try/finally — botao nao trava em caso de erro
- Todos os CRUDs (addTx..saveBrand): try/catch em writes Dexie; estado so atualiza apos confirmacao
- addTx/addProduct/addLoss: validacoes de input (desc obrigatoria, valor>0, qty>0)
- addProduct usa campos explicitos (sem spread ...p)
- editTx/editProduct/editLoss maps: Object.assign em vez de spread
- syncProfiles: so marca _synced=1 se upsert Supabase nao retornar erro
- syncTable pull: retorna cedo se query Supabase retornar erro (nao corrompe dados locais)

## Proximas tarefas (em ordem de prioridade)

1. **Verificar RLS UPDATE em company_profiles**
   Confirmar que cliente nao pode alterar plan diretamente via devtools mesmo com rpc bloqueado.
   Teste: logar como conta nao-admin, rodar no console:
   `sb.from('company_profiles').update({plan:'pro'}).eq('user_id','<self_uid>').then(console.log)`
   Deve retornar erro de RLS ou sucesso sem efeito. Se alterar, criar policy UPDATE.

2. **Mover token GitHub do localStorage para sessionStorage**
   Linha ~870: `localStorage.getItem('nancia_gh_token')`.
   sessionStorage limpa ao fechar o browser — reduz janela de exposicao.
   Baixa prioridade enquanto nao houver clientes em producao.

3. **Fase 3 Stripe** — so quando Asafe pedir.
   Arquitetura: Edge Function Supabase cria checkout session, webhook atualiza plan via
   sb.rpc('set_client_plan'). Nunca chave Stripe no front.

## Problemas conhecidos

- Cliente promovido para Pro precisa fazer logout/login (ou esperar 2min de sync) para ver mudanca.
  Aceitavel por enquanto.
- Limites Free sao totais (nao por mes). Se Asafe quiser mudar para "por mes", ajustar
  PLAN_LIMITS e os call sites (count seria de tx/produtos/perdas do mes vigente).
- Babel no browser em producao: performance ruim em mobile antigo. Resolvido na migracao Vite.
- index.html monolitico ~1960 linhas. Resolvido na migracao Vite.
