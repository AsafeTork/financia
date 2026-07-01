// Edge Function: get-payment-method
// Devolve o cartao padrao salvo do usuario (bandeira + 4 finais + validade), sem
// expor o numero completo. Resolve o customer por email. Se nao houver cartao ou
// customer, devolve { card: null }.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cacheGet, cacheSet, enforceRateLimit, getAdminClient } from '../_shared/security.ts';

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

function cardFromPaymentMethod(pm) {
  if (!pm || !pm.card) return null;
  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    exp_month: pm.card.exp_month,
    exp_year: pm.card.exp_year,
  };
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
    const allowed = await enforceRateLimit(admin, user.id, 'get_payment_method', 60, 30);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const cachePayload = { user_id: user.id };
    const cached = await cacheGet(admin, 'stripe:get-payment-method:' + user.id, cachePayload);
    if (cached && Object.prototype.hasOwnProperty.call(cached, 'card')) {
      return jsonResponse(200, cached);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customer = await findCustomer(stripe, user.email);
    if (!customer) {
      const noCard = { card: null };
      await cacheSet(admin, 'stripe:get-payment-method:' + user.id, cachePayload, noCard, 60, user.id);
      return jsonResponse(200, noCard);
    }

    // 1) cartao padrao de fatura.
    const invoiceSettings = customer.invoice_settings || {};
    let pmId = invoiceSettings.default_payment_method || null;

    // 2) sem padrao definido: pega o primeiro cartao anexado, se houver.
    if (!pmId) {
      const list = await stripe.paymentMethods.list({ customer: customer.id, type: 'card', limit: 1 });
      if (list && list.data && list.data.length > 0) pmId = list.data[0].id;
    }

    if (!pmId) {
      const noCard = { card: null };
      await cacheSet(admin, 'stripe:get-payment-method:' + user.id, cachePayload, noCard, 60, user.id);
      return jsonResponse(200, noCard);
    }

    const pm = await stripe.paymentMethods.retrieve(pmId);
    const response = { card: cardFromPaymentMethod(pm), payment_method_id: pmId };
    await cacheSet(admin, 'stripe:get-payment-method:' + user.id, cachePayload, response, 60, user.id);
    return jsonResponse(200, response);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
