// Edge Function: admin-set-custom-price
// SO admin. Define (ou limpa) o preco customizado de um cliente:
//  1) grava via RPC admin_set_custom_price (gate de admin + validacao no banco);
//  2) se o cliente JA tem assinatura ativa na Stripe, ajusta o preco do item agora
//     (proration_behavior 'none' -> sem cobranca surpresa, vale no proximo ciclo).
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { asPositiveInt, enforceRateLimit, getAdminClient, sanitizeUuid } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_PRICES = { pro: 4990, premium: 9990 };
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

async function findCustomer(stripe, email, userId) {
  if (!email) return null;
  const existing = await stripe.customers.list({ email: email, limit: 20 });
  if (existing && existing.data && existing.data.length > 0) {
    for (let i = 0; i < existing.data.length; i++) {
      const c = existing.data[i];
      const m = c && c.metadata ? c.metadata : {};
      if (m.user_id && String(m.user_id) === String(userId)) return c;
    }
    return existing.data[0];
  }
  return null;
}

function activeSubscriptionOf(subs) {
  if (!subs || !subs.data) return null;
  for (let i = 0; i < subs.data.length; i++) {
    if (ACTIVE_STATUSES.indexOf(subs.data[i].status) !== -1) return subs.data[i];
  }
  return null;
}

async function findOrCreateProduct(stripe, planId) {
  try {
    const found = await stripe.products.search({
      query: "active:'true' AND metadata['plan_id']:'" + planId + "'",
      limit: 1,
    });
    if (found && found.data && found.data.length > 0) return found.data[0].id;
  } catch (searchErr) {
    // Search indisponivel: cai para create.
  }
  const created = await stripe.products.create({ name: 'Financia ' + planId, metadata: { plan_id: planId } });
  return created.id;
}

async function standardPriceId(stripe, planId) {
  const lookupKey = 'financia_' + planId + '_monthly';
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found && found.data && found.data.length > 0) return found.data[0].id;
  const productId = await findOrCreateProduct(stripe, planId);
  const price = await stripe.prices.create({
    currency: 'brl', unit_amount: PLAN_PRICES[planId], recurring: { interval: 'month' },
    product: productId, lookup_key: lookupKey, metadata: { plan_id: planId },
  });
  return price.id;
}

async function customPriceId(stripe, planId, cents, userId) {
  const short = String(userId).replace(/-/g, '').slice(0, 12);
  const lookupKey = 'financia_' + planId + '_c' + cents + '_' + short;
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found && found.data && found.data.length > 0) return found.data[0].id;
  const productId = await findOrCreateProduct(stripe, planId);
  const price = await stripe.prices.create({
    currency: 'brl', unit_amount: cents, recurring: { interval: 'month' },
    product: productId, lookup_key: lookupKey, metadata: { plan_id: planId, custom_for: userId },
  });
  return price.id;
}

function planOfSub(sub) {
  const m = sub.metadata ? sub.metadata : {};
  if (m.plan_id === 'pro' || m.plan_id === 'premium') return m.plan_id;
  const item = sub.items && sub.items.data ? sub.items.data[0] : null;
  const pm = item && item.price && item.price.metadata ? item.price.metadata : {};
  if (pm.plan_id === 'pro' || pm.plan_id === 'premium') return pm.plan_id;
  return 'pro';
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

    let body = {};
    try { body = await req.json(); } catch (parseErr) { body = {}; }
    const targetUserId = sanitizeUuid(body && body.target_user_id);
    const rawCents = body && (body.cents === 0 || body.cents) ? body.cents : null;
    const cents = (rawCents === null || rawCents === undefined) ? null : asPositiveInt(rawCents, 0, 100000000);
    if (!targetUserId) {
      return jsonResponse(400, { error: 'missing_target' });
    }
    if (rawCents !== null && rawCents !== undefined && cents === null) {
      return jsonResponse(400, { error: 'invalid_price' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 1) Grava via RPC (com a auth do admin chamador: a RPC valida role='admin').
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const callerRes = await supabase.auth.getUser();
    const caller = callerRes && callerRes.data ? callerRes.data.user : null;
    if (!caller) return jsonResponse(401, { error: 'unauthorized' });
    const secAdmin = getAdminClient();
    const allowed = await enforceRateLimit(secAdmin, caller.id, 'admin_set_custom_price', 60, 20);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });
    const rpcRes = await supabase.rpc('admin_set_custom_price', { a_target: targetUserId, b_cents: cents });
    if (rpcRes && rpcRes.error) {
      const msg = rpcRes.error.message || 'rpc_failed';
      const code = msg.indexOf('not authorized') !== -1 ? 403 : 400;
      return jsonResponse(code, { error: String(msg) });
    }
    // 2) Aplica na assinatura ativa, se existir.
    const admin = createClient(supabaseUrl, serviceKey);
    const userRes = await admin.auth.admin.getUserById(targetUserId);
    const targetUser = userRes && userRes.data ? userRes.data.user : null;
    const email = targetUser ? targetUser.email : null;
    if (!email) {
      return jsonResponse(200, { ok: true, applied: false });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customer = await findCustomer(stripe, email, targetUserId);
    if (!customer) {
      return jsonResponse(200, { ok: true, applied: false });
    }
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 20 });
    const sub = activeSubscriptionOf(subs);
    if (!sub) {
      return jsonResponse(200, { ok: true, applied: false });
    }
    const item = sub.items && sub.items.data ? sub.items.data[0] : null;
    if (!item) {
      return jsonResponse(200, { ok: true, applied: false });
    }

    const planId = planOfSub(sub);
    const newPriceId = (cents && cents > 0)
      ? await customPriceId(stripe, planId, cents, targetUserId)
      : await standardPriceId(stripe, planId);

    if (item.price && item.price.id === newPriceId) {
      return jsonResponse(200, { ok: true, applied: false });
    }

    // proration_behavior 'none': novo preco vale no proximo ciclo, sem cobranca/credito agora.
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: 'none',
      metadata: { user_id: targetUserId, plan_id: planId },
    });

    return jsonResponse(200, { ok: true, applied: true });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
