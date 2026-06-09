# HANDOFF — Financia (gestao-financeira)

Audience: next Claude session. Asafe is not a coder. Tom: tecnico direto.

## Session 2026-06-09 — Plans rollout Phase 1+2

### Decisoes que ja foram tomadas
- Pricing: Freemium. Free = offline-only no cliente. Pro = R$ 70/mes.
- Limites Free: 50 transactions / 20 products / 10 losses (totais, nao mensais).
- Pro ativado MANUALMENTE pelo admin no painel — sem Stripe nesta fase.
- Migration Vite esta APROVADA mas POSPOSTA. Branch dedicada `refactor/vite`, NUNCA no main, e so depois que plans estiver estavel. Nao iniciar Vite ate Asafe pedir.
- Stripe = Phase 3, posterga ate Asafe confirmar.

### O que foi feito nesta sessao
Branch: `feat/plans-gating` (criada a partir de main em 6a9c868).

Arquivos novos:
- `supabase/migrations/20260609_add_plan_to_company_profiles.sql` — ALTER TABLE para adicionar 3 colunas (plan, plan_expires_at, plan_activated_by) + check constraint + index + bloco de comentarios explicando como configurar RLS.
- `CLAUDE_HANDOFF.md` — este arquivo.

Arquivos modificados:
- `index.html` — gating completo de planos (no JSX inline):
  - Helpers globais: `INIT_PLAN`, `PLAN_LIMITS`, `effectivePlan(p)`, `limitFor`, `atLimit`, `PLAN_KIND_LABEL`.
  - Componente `UpgradeModal` (mostra limite atingido + CTA "fale com suporte"). Nenhum botao de checkout — manual por enquanto.
  - State no `App()`: `planInfo` + `setPlanInfo`, `upgradeNotice` + `setUpgradeNotice`, `enforceLimit(kind, count)`.
  - `loadFromLocal` e fallback do `loadData` carregam `plan/plan_expires_at/plan_activated_by` do profile.
  - Logout reseta planInfo para INIT_PLAN.
  - `addTx`, `addProduct`, `addLoss` chamam `enforceLimit` antes de inserir; bloqueia e abre UpgradeModal.
  - `syncProfiles` agora usa whitelist `PROFILE_WRITE_FIELDS = ['user_id','name','logo','color','logo_url']`. Front nunca envia campos de plan para o servidor.
  - `ClientEditModal` ganhou seletor Free/Pro. Quando admin altera para Pro, envia `plan='pro', plan_expires_at=null, plan_activated_by=<email do admin>`.
  - `AdminPanel` recebe `session`, expoe `adminEmail`, passa para o modal.
  - Lista de clientes do AdminPanel mostra badge FREE/PRO (calculado via `effectivePlan(c)`).

Sintaxe validada com `@babel/parser` (PARSE OK, 1844 linhas no bloco babel).

Commits: ver `git log feat/plans-gating ^main`.

### Estado do app
- Codigo: completo e parseavel, mas DEPENDE da migration ter sido aplicada no Supabase para funcionar em prod.
- Se a migration NAO rodou: as colunas nao existem, `pr.data.plan` vira `undefined`, `effectivePlan` retorna 'free' por default, e o gating funciona com limite Free para TODOS (inclusive contas que deveriam ser Pro). Comportamento aceitavel mas indesejado — rodar a migration assim que Asafe puder.
- Front nunca quebra se as colunas faltarem.

### O QUE ASAFE PRECISA FAZER (bloqueio externo)
1. Abrir Supabase Studio do projeto `kxeqhorxhlgwcgywovqr`.
2. SQL Editor > colar conteudo de `supabase/migrations/20260609_add_plan_to_company_profiles.sql` > Run.
3. **CRITICO**: configurar RLS para que usuarios comuns NAO possam UPDATE em `plan`, `plan_expires_at`, `plan_activated_by`. Ver bloco de comentarios na migration para opcoes. Sem isso, qualquer cliente vira Pro via devtools com 1 linha de JS no console.

### Proxima tarefa (depois da migration + RLS)
Em ordem:
1. **Auditar RLS de company_profiles** — confirmar que mesmo apos a migration, somente admin altera colunas de plan. Tentar do front (sb.from('company_profiles').update({plan:'pro'}).eq('user_id', <self>)) com conta nao-admin e confirmar erro.
2. **Indicador de uso no Dashboard** para quem e Free: barra "Voce usou X/50 transacoes". Componente nao foi criado nesta sessao.
3. **Email/notificacao** quando admin promove cliente para Pro — fora de escopo desta sessao.
4. **Phase 3 (Stripe)** — so quando Asafe pedir. Edge Function para checkout, webhook que atualiza `plan` via SECURITY DEFINER function. NAO usar PAT/admin keys no client.

### Problemas conhecidos / divida tecnica
- Token GitHub ainda no localStorage do front (linha ~798) — risco ALTO, herdado, fora do escopo desta sessao. Asafe ja foi alertado em 2026-06-09.
- index.html monolitico — migration Vite POSPOSTA por decisao explicita do Asafe.
- Limites Free sao TOTAIS, nao por mes. Se isso for confuso para o usuario, ajustar `PLAN_LIMITS` e os call sites (count seria de tx do mes vigente).
- Cliente promovido para Pro precisa fazer logout/login OU esperar 2min (intervalo do syncProfiles) para o front pegar o novo plan. Aceitavel por enquanto.

### Como rodar local (Asafe)
Servico esta no Render: `https://gestao-financeira-7heu.onrender.com`. Render auto-deploya a partir do main. Branch feat/plans-gating NAO sera deployada ate fazer merge.

### Branch e PR
Branch: feat/plans-gating, baseada em main (6a9c868).
PR sera aberto ao final desta sessao. Aguardar Asafe revisar e fazer merge.
