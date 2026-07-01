// Edge Function: remove-payment-method
// Remove (detach) o cartao salvo do usuario e limpa o padrao de fatura do customer.
// Idempotente: sem customer ou sem cartao, devolve { ok: true }.
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

async function findCustomer(stripe, email) {
  if (!email) return null;
  const existing = await stripe.customers.list({ email: email, limit: 1 });
  if (existing && existing.data && existing.data.length > 0) return existing.data[0];
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
    const admin = getAdminClient();
    const allowed = await enforceRateLimit(admin, user.id, 'remove_payment_method', 60, 6);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customer = await findCustomer(stripe, user.email);
    if (!customer) {
      return jsonResponse(200, { ok: true });
    }

    // Detach de todos os cartoes anexados ao customer.
    const list = await stripe.paymentMethods.list({ customer: customer.id, type: 'card', limit: 20 });
    let removed = 0;
    if (list && list.data) {
      for (let i = 0; i < list.data.length; i++) {
        await stripe.paymentMethods.detach(list.data[i].id);
        removed++;
      }
    }

    // Limpa o padrao de fatura (referencia a um cartao que nao existe mais).
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: '' },
    });

    return jsonResponse(200, { ok: true, removed: removed });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
