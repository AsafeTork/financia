// Edge Function: set-default-payment-method
// Apos o cliente confirmar o SetupIntent no app, define o novo cartao (payment_method)
// como padrao do customer e de todas as assinaturas ativas dele. O customer e resolvido
// pelo email do usuario autenticado — so altera as proprias assinaturas.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizePaymentMethodId } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

async function findCustomerId(stripe, email) {
  if (!email) return null;
  const existing = await stripe.customers.list({ email: email, limit: 1 });
  if (existing && existing.data && existing.data.length > 0) return existing.data[0].id;
  return null;
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
    const pmId = sanitizePaymentMethodId(body && body.payment_method_id);
    if (!pmId) {
      return jsonResponse(400, { error: 'no_payment_method' });
    }
    const admin = getAdminClient();
    const allowed = await enforceRateLimit(admin, user.id, 'set_default_payment_method', 60, 10);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customerId = await findCustomerId(stripe, user.email);
    if (!customerId) {
      return jsonResponse(404, { error: 'no_customer' });
    }

    // Define o cartao padrao para faturas futuras do customer.
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pmId },
    });

    // Aplica o mesmo cartao como padrao em todas as assinaturas ativas do customer.
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    let updated = 0;
    if (subs && subs.data) {
      for (let i = 0; i < subs.data.length; i++) {
        const sub = subs.data[i];
        if (ACTIVE_STATUSES.indexOf(sub.status) !== -1) {
          await stripe.subscriptions.update(sub.id, { default_payment_method: pmId });
          updated++;
        }
      }
    }

    return jsonResponse(200, { ok: true, subscriptions_updated: updated });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
