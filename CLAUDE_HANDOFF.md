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
- `20260609_fix_plan_protection.sql` — **PENDENTE EXECUCAO NO STUDIO** (ver abaixo)

RLS UPDATE — VULNERABILIDADE CONFIRMADA E CORRECAO PRONTA:
- Teste realizado (2026-06-09): cliente conseguiu fazer PATCH plan=pro via API REST (HTTP 200)
- Causa: policy update_own_branding_only nao tinha WITH CHECK — so tinha USING
- Trigger prevent_plan_change criado manualmente NAO estava bloqueando (motivo desconhecido)
- Correcao: migration `20260609_fix_plan_protection.sql` ja no repo, precisa ser rodada no Studio

**ACAO NECESSARIA — rodar no Supabase SQL Editor:**
```sql
DROP POLICY IF EXISTS update_own_branding_only ON public.company_profiles;

CREATE POLICY update_own_branding_only ON public.company_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND plan = (SELECT plan FROM public.company_profiles WHERE user_id = auth.uid())
    AND (plan_expires_at IS NOT DISTINCT FROM (SELECT plan_expires_at FROM public.company_profiles WHERE user_id = auth.uid()))
    AND (plan_activated_by IS NOT DISTINCT FROM (SELECT plan_activated_by FROM public.company_profiles WHERE user_id = auth.uid()))
  );
```
Apos rodar: repetir o teste abaixo para confirmar que retorna 403.

## Estado do codigo (main, ultimo commit 48fad32)

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

1. **URGENTE: Aplicar migration fix_plan_protection no Studio**
   Copiar o SQL acima e rodar no Supabase SQL Editor.
   Depois testar: logar como teste@gestao.com, rodar no console do app:
   `sb.from('company_profiles').update({plan:'pro'}).eq('user_id','<self_uid>').then(console.log)`
   Deve retornar erro 403 (violacao de policy).

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
  PLAN_LIMITS e os call sites.
- Babel no browser em producao: performance ruim em mobile antigo. Resolvido na migracao Vite.
- index.html monolitico ~1960 linhas. Resolvido na migracao Vite.

