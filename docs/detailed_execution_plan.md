# Detailed Execution Plan — Financia

> Gerado por **AGENT_PLANNING** em 2026-06-28. Base: `architecture_analysis.md` + leitura cirúrgica do código de Bloco 4.
> **STATUS: AGUARDANDO USER_APPROVAL** (contrato do AGENT_PLANNING exige sinal verde do usuário antes das fases de modificação).

## 0. Achado que muda o plano

O roadmap aprovado é de **2026-06-25**; o `main` está em **2026-06-27 (9beaea4)**. A re-validação contra o código atual mostra que **o Bloco 4 (Bugs) — único bloco elegível a MASTER_APPROVAL — já está implementado**. Não há escopo de correção autônomo restante. Todo o trabalho remanescente do roadmap exige **USER_APPROVAL** (auth/schema, billing, CI, secrets).

## 1. Re-validação do Bloco 4 (Bugs) — evidência por arquivo:linha

| Bug do roadmap | Estado atual | Evidência |
|---|---|---|
| Cascata: limite de UMA categoria bloqueia as outras | **JÁ CORRIGIDO** | `App.jsx:161` `enforceLimit(kind, currentCount)` por categoria; cada hook conta a própria tabela: `useTx.js:11`, `useProducts.js:10`, `useLosses.js:10`. UI confirma: `Dashboard.jsx:224` "As demais categorias continuam liberadas." |
| Contador da UI não atualiza após registro | **JÁ CORRIGIDO** | Contagens derivam do state: `Dashboard.jsx:48-50` (`tx.length`, `products.length`, `lossesCount`); `lossesCount={losses.length}` em `App.jsx:247`. `setTx/setProducts/setLosses` atualizam na hora (`useTx.js:20`, `useProducts.js:21`, `useLosses.js:19`). |
| Números gigantes / "Caracteres não permitidos" | **JÁ CORRIGIDO** | `utils.js:126 cleanNumeric` (normaliza, 1 separador, `maxLen` anti-overflow, flag `invalid`); `ui.jsx:42 NumInp` consome e exibe erro; coberto por `cleanNumeric.test.js` (8 casos). |
| Rodapé com textos de infra (Versão/Supabase/Render) | **JÁ REMOVIDO** | `grep -i 'Vers|Supabase|Render|version'` em `SettingsView.jsx` → 0 matches. |
| Registro em lote de vendas sem burlar/duplicar limites | **OK por design** | Venda em lote = 1 transação com `items[]` (`useTx.addTx` conta 1, `row.items`). Não multiplica limite. |
| Recorrentes automáticas p/ TODOS os planos | **JÁ ATENDIDO** | `useTx.addGenerated` (linha 51) insere sem gate de limite, comentário "Disponivel para todos os planos"; idempotente por id. |

> **Conclusão**: 0 (zero) correções pendentes elegíveis a execução autônoma. Re-implementar qualquer item acima violaria a regra de debugging (não consertar o que não está quebrado).

## 2. Escopos remanescentes (todos USER_APPROVAL) — staged, prontos p/ ativação sob instrução

> Cada incremento abaixo é uma instrução separada (modelo "por componente" do dono). `locked_files` só é fixado quando o usuário escolher o incremento.

### Incremento A — Bloco 1 UI Auth/Settings (risco médio, frontend)
- **Objetivo**: split-screen no Login (lado com cor da logo + contraste via `luminance`/`readableBrand`), checkbox de aceite dos Termos (link p/ TermsOfService), PhoneInput unificado aceitando "+", aplicar `SUPPORT_EMAIL`/`waLink` onde faltar; Settings com alterar senha/pagamento/plano/telefone/suporte.
- **locked_files**: `src/views/Login.jsx`, `src/components/PhoneInput.jsx`, `src/views/SettingsView.jsx`, `src/lib/constants.js` (aditivo), `src/lib/utils.js` (só leitura/aditivo).
- **Colisão**: PhoneInput tem 3 consumidores (Login, SettingsView, Onboarding) → alterar de forma aditiva, testar os 3.
- **Aprovação**: USER (mexe em fluxo de auth/cadastro).

### Incremento B — Bloco 5 IA Insights
- **Objetivo**: liberar "Gerar análise" p/ todos; enviar dados reais do mês ao backend p/ dicas específicas.
- **BLOQUEIO (R3)**: a função de backend da IA **não foi localizada** entre as 6 edge functions. Precisa o usuário informar onde o prompt vive (edge function `ai`? serviço externo? `ai.js` chama `sb.functions.invoke(<qual>)`). Sem isso, só o gating no front (`Dashboard.jsx`/`ReportView.jsx`) é possível.
- **locked_files (front)**: `src/lib/ai.js`, `src/views/Dashboard.jsx`, `src/views/ReportView.jsx`.
- **Aprovação**: MASTER no front; **USER** se tocar edge function/secret.

### Incremento C — Bloco 2 Planos via Stripe Elements (risco alto, billing)
- **Objetivo**: checkout in-app sem redirect; aposentar `create-checkout-session`; checklist de benefícios + preços; export PDF/Excel já existe → só gating por plano.
- **BLOQUEIO (R2)**: confirmar qual fluxo está live hoje (`StripeCheckout` já em PlansView+SettingsView; `create-payment`/`create-subscription` existem). Precisa decidir subscription vs payment intent e estado do webhook.
- **locked_files**: `src/views/PlansView.jsx`, `src/components/StripeCheckout.jsx`, `src/lib/stripe.js`, `src/lib/constants.js`, `supabase/functions/create-payment/*`, `supabase/functions/create-subscription/*`, `supabase/functions/stripe-webhook/*`.
- **Aprovação**: **USER** (billing + edge functions + secrets).

### Incremento D — Bloco 3 Add-on Personalização (risco alto, billing + CI)
- **Objetivo**: compra única Stripe libera aba "Aparência" (gating de `saveBrand`); CTA "Falar com Desenvolvedor" → `triggerApkBuild`.
- **locked_files**: `src/lib/constants.js`, `src/views/SettingsView.jsx`, `src/hooks/useSession.js`, `src/lib/db.js`, `.github/workflows/build.yml`.
- **Aprovação**: **USER** (billing + CI).

### Incremento E — Bloco 1 "1 login por conta" (risco alto, schema + auth)
- **Objetivo**: enforcement server-side de sessão única no Free vs múltiplos no Pro/Premium. Não existe hoje.
- **locked_files**: migration nova + RLS/RPC + `useSession.js`. **Requer desenho prévio (brainstorming + Stripe/Supabase best practices).**
- **Aprovação**: **USER** (schema + auth).

### Manutenção — consolidar testes duplicados (baixo risco)
- `src/lib/constants.test.js` ⇄ `src/test/constants.test.js`; `src/lib/utils.test.js` ⇄ `src/test/utils.test.js`. Mesclar casos únicos antes de remover um lado. Aprovação: MASTER.

## 3. Recomendação

1. Como o Bloco 4 já está pronto, **não há ação autônoma a executar agora**.
2. O dono deve escolher **qual incremento (A–E)** quer primeiro. Recomendo a ordem A → B → C → D → E (menor risco/aprovação primeiro), alinhada ao DAG técnico do ARCHITECT.
3. B, C e D dependem de **inputs do dono** (localização do backend IA; fluxo Stripe live; modelo de cobrança do add-on) antes de planejar a fundo.

---

```yaml
status: AWAITING_USER_APPROVAL
modified_files:
  - docs/state.json
created_files:
  - docs/detailed_execution_plan.md
deleted_files: []
warnings:
  - "Bloco 4 (unico MASTER_APPROVAL) ja implementado no main 9beaea4 — sem escopo autonomo restante"
  - "Incrementos B/C/E bloqueados por inputs do dono (backend IA, fluxo Stripe live, desenho de sessao unica)"
  - "Nenhum locked_files fixado: aguardando o dono escolher o incremento (A-E)"
confidence: 95
risk: Medium
next_agent: PAUSED_FOR_USER_APPROVAL
```
