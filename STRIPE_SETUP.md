# Stripe — Configuração final

As Edge Functions já foram implantadas pelo orchestrator. Só faltam **2 secrets**
para o fluxo de pagamento ficar funcional.

## 1. Definir os 2 secrets (nomes apenas — sem valores aqui)

```
supabase secrets set STRIPE_SECRET_KEY=sk_xxx --project-ref kxeqhorxhlgwcgywovqr
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref kxeqhorxhlgwcgywovqr
```

## 2. Variáveis já injetadas automaticamente

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente nas
Edge Functions pelo Supabase. Nenhuma ação necessária para elas.

## 3. Preços

Os preços são definidos inline em BRL (centavos) dentro de
`create-checkout-session` (pro = 4990, premium = 9990). Portanto **NÃO é
necessário** criar nenhum Stripe Price ID.

## 4. Registrar o webhook no painel da Stripe

Endpoint a registrar no Stripe Dashboard:

```
https://kxeqhorxhlgwcgywovqr.supabase.co/functions/v1/stripe-webhook
```

Assine os eventos:

- `checkout.session.completed`
- `customer.subscription.deleted`

Depois de criar o endpoint, copie o **signing secret** gerado pela Stripe e
use-o como valor de `STRIPE_WEBHOOK_SECRET` no comando do passo 1.

## Status

As funções `create-checkout-session` e `stripe-webhook` já estão implantadas
pelo orchestrator. Só restam os 2 secrets acima.
