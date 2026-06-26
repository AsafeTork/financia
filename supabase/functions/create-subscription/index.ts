// Edge Function: create-subscription
// Cria uma assinatura mensal com payment_behavior=default_incomplete e devolve o
// client_secret do PaymentIntent para confirmar via Stripe Elements (PaymentElement)
// DENTRO do app — sem redirecionar para o Checkout hospedado.
// Precos inline em BRL (centavos), sem depender de Stripe Price ID.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_PRICES = { pro: 4990, premium: 9990 };

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

async function findOrCreateCustomer(stripe, email, userId) {
  if (email) {
    const existing = await stripe.customers.list({ email: email, limit: 1 });
    if (existing && existing.data && existing.data.length > 0) return existing.data[0].id;
  }
  const created = await stripe.customers.create({ email: email || undefined, metadata: { user_id: userId } });
  return created.id;
}

// Subscriptions nao aceitam price_data.product_data (criacao inline de produto).
// E preciso referenciar um Product existente. Busca por metadata.plan_id e cria se faltar.
async function findOrCreateProduct(stripe, planId) {
  try {
    const found = await stripe.products.search({
      query: "active:'true' AND metadata['plan_id']:'" + planId + "'",
      limit: 1,
    });
    if (found && found.data && found.data.length > 0) return found.data[0].id;
  } catch (searchErr) {
    // Search API indisponivel: cai para create.
  }
  const created = await stripe.products.create({
    name: 'Financia ' + planId,
    metadata: { plan_id: planId },
  });
  return created.id;
}

Deno.serve(async function (req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return jsonResponse(500, { error: 'stripe_not_configured' });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const userResult = await supabase.auth.getUser();
    const user = userResult && userResult.data ? userResult.data.user : null;
    if (!user) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    let body = {};
    try { body = await req.json(); } catch (parseErr) { body = {}; }
    const planId = body && body.plan_id ? body.plan_id : null;
    if (planId !== 'pro' && planId !== 'premium') {
      return jsonResponse(400, { error: 'invalid_plan' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customerId = await findOrCreateCustomer(stripe, user.email, user.id);
    const productId = await findOrCreateProduct(stripe, planId);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'brl',
            product: productId,
            unit_amount: PLAN_PRICES[planId],
            recurring: { interval: 'month' },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: user.id, plan_id: planId },
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice && invoice.payment_intent ? invoice.payment_intent : null;
    if (!paymentIntent || !paymentIntent.client_secret) {
      return jsonResponse(500, { error: 'no_client_secret' });
    }

    return jsonResponse(200, {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
