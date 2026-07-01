// Edge Function: create-setup-intent
// Cria um SetupIntent para o cliente atualizar/adicionar o cartao DENTRO do app
// (Stripe Elements / PaymentElement em modo setup), sem redirect e sem cobranca.
// O cliente Stripe e resolvido por email (mesmo padrao de create-subscription).
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const admin = getAdminClient();
    const allowed = await enforceRateLimit(admin, user.id, 'create_setup_intent', 60, 8);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customerId = await findOrCreateCustomer(stripe, user.email, user.id);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { user_id: user.id },
    });

    if (!setupIntent || !setupIntent.client_secret) {
      return jsonResponse(500, { error: 'no_setup_secret' });
    }

    return jsonResponse(200, { clientSecret: setupIntent.client_secret });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
