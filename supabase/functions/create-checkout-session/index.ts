// Edge Function: create-checkout-session
// Cria uma Stripe Checkout Session (assinatura mensal) para o plano escolhido.
// Precos inline em BRL (centavos) — nao depende de Stripe Price ID.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizeOrigin, sanitizePlanId } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_PRICES = { pro: 4990, premium: 9990 };

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) {
    headers[keys[i]] = CORS_HEADERS[keys[i]];
  }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
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
    try {
      body = await req.json();
    } catch (parseErr) {
      body = {};
    }
    const planId = sanitizePlanId(body && body.plan_id);
    if (!planId) {
      return jsonResponse(400, { error: 'invalid_plan' });
    }

    const admin = getAdminClient();
    const allowed = await enforceRateLimit(admin, user.id, 'create_checkout_session', 60, 5);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const origin = sanitizeOrigin(req.headers.get('origin'), 'https://financia-gestao.onrender.com');

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: PLAN_PRICES[planId],
            recurring: { interval: 'month' },
            product_data: { name: 'Financia ' + planId },
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { user_id: user.id, plan_id: planId },
      subscription_data: { metadata: { user_id: user.id, plan_id: planId } },
      success_url: origin + '/?checkout=success#planos',
      cancel_url: origin + '/?checkout=cancel#planos',
    });

    return jsonResponse(200, { url: session.url });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
