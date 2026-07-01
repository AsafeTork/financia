// Edge Function: create-subscription
// Gerencia a assinatura mensal do usuario de forma COMPLETA e idempotente:
//  - Sem assinatura ativa + sem cartao salvo  -> cria default_incomplete e devolve
//    clientSecret para confirmar via PaymentElement (cartao novo no app).
//  - Sem assinatura ativa + use_saved_card     -> cria com o cartao padrao salvo e
//    confirma off_session; devolve {status:'active'} ou {clientSecret,requiresAction}.
//  - JA tem assinatura ativa (upgrade/downgrade) -> ALTERA o item existente (nao cria
//    outra), com proration; devolve {status:'changed'}. Evita cobranca duplicada.
// Precos via Price com lookup_key estavel (financia_<plan>_monthly).
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizePlanId } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_PRICES = { pro: 4990, premium: 9990 };
const PLAN_RANK = { free: 0, pro: 1, premium: 2 };
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

// Descobre o plano atual de uma assinatura (metadata da sub ou do price).
function planOfSub(sub) {
  const m = sub.metadata ? sub.metadata : {};
  if (m.plan_id === 'pro' || m.plan_id === 'premium') return m.plan_id;
  const item = sub.items && sub.items.data ? sub.items.data[0] : null;
  const pm = item && item.price && item.price.metadata ? item.price.metadata : {};
  if (pm.plan_id === 'pro' || pm.plan_id === 'premium') return pm.plan_id;
  return 'pro';
}

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

async function findOrCreateCustomer(stripe, email, userId) {
  if (email) {
    const existing = await stripe.customers.list({ email: email, limit: 1 });
    if (existing && existing.data && existing.data.length > 0) return existing.data[0];
  }
  return await stripe.customers.create({ email: email || undefined, metadata: { user_id: userId } });
}

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

// Price recorrente estavel por plano (reaproveitado em assinar e mudar de plano).
async function findOrCreatePrice(stripe, planId) {
  const lookupKey = 'financia_' + planId + '_monthly';
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found && found.data && found.data.length > 0) return found.data[0].id;
  const productId = await findOrCreateProduct(stripe, planId);
  const price = await stripe.prices.create({
    currency: 'brl',
    unit_amount: PLAN_PRICES[planId],
    recurring: { interval: 'month' },
    product: productId,
    lookup_key: lookupKey,
    metadata: { plan_id: planId },
  });
  return price.id;
}

function activeSubscriptionOf(subs) {
  if (!subs || !subs.data) return null;
  for (let i = 0; i < subs.data.length; i++) {
    if (ACTIVE_STATUSES.indexOf(subs.data[i].status) !== -1) return subs.data[i];
  }
  return null;
}

// Resolve o Price: se o cliente tem preco customizado (desconto do admin), cria/reaproveita
// um Price especifico por (plano + valor + cliente). lookup_key inclui o valor, entao mudar
// o desconto gera um novo Price automaticamente, sem transfer_lookup_key.
async function resolvePriceId(stripe, planId, customCents, userId) {
  if (customCents && customCents > 0) {
    const short = String(userId).replace(/-/g, '').slice(0, 12);
    const lookupKey = 'financia_' + planId + '_c' + customCents + '_' + short;
    const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (found && found.data && found.data.length > 0) return found.data[0].id;
    const productId = await findOrCreateProduct(stripe, planId);
    const price = await stripe.prices.create({
      currency: 'brl',
      unit_amount: customCents,
      recurring: { interval: 'month' },
      product: productId,
      lookup_key: lookupKey,
      metadata: { plan_id: planId, custom_for: userId },
    });
    return price.id;
  }
  return findOrCreatePrice(stripe, planId);
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
    const planId = sanitizePlanId(body && body.plan_id);
    const useSavedCard = !!(body && body.use_saved_card);
    if (!planId) {
      return jsonResponse(400, { error: 'invalid_plan' });
    }
    const admin = getAdminClient();
    const allowed = await enforceRateLimit(admin, user.id, 'create_subscription', 60, 8);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    // Preco customizado (desconto manual do admin) do proprio usuario, se houver.
    let customCents = 0;
    try {
      const prof = await supabase.from('company_profiles').select('custom_price_cents').eq('user_id', user.id).maybeSingle();
      if (prof && prof.data && prof.data.custom_price_cents) customCents = prof.data.custom_price_cents;
    } catch (profErr) {
      customCents = 0;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customer = await findOrCreateCustomer(stripe, user.email, user.id);
    const customerId = customer.id;
    const priceId = await resolvePriceId(stripe, planId, customCents, user.id);

    // 1) Ja existe assinatura ativa? Entao MUDA de plano (upgrade/downgrade), sem duplicar.
    const subsList = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const activeSub = activeSubscriptionOf(subsList);
    if (activeSub) {
      const item = activeSub.items && activeSub.items.data ? activeSub.items.data[0] : null;
      if (!item) {
        return jsonResponse(500, { error: 'subscription_without_item' });
      }
      // Ja esta no mesmo preco? Nada a fazer.
      if (item.price && item.price.id === priceId) {
        return jsonResponse(200, { status: 'unchanged' });
      }
      // Upgrade: cobra a diferenca proporcional AGORA e ativa o plano maior (webhook).
      // Downgrade: NAO cobra/credita agora; o plano mais barato passa a valer so no
      // proximo ciclo. O cliente mantem o plano mais caro ate o fim do periodo ja pago.
      const currentPlanId = planOfSub(activeSub);
      const isDowngrade = PLAN_RANK[planId] < PLAN_RANK[currentPlanId];
      await stripe.subscriptions.update(activeSub.id, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: isDowngrade ? 'none' : 'always_invoice',
        metadata: { user_id: user.id, plan_id: planId },
      });
      return jsonResponse(200, { status: 'changed', scheduled: isDowngrade });
    }

    // 2) Sem assinatura: pagar com cartao salvo (off_session) se solicitado.
    if (useSavedCard) {
      const invoiceSettings = customer.invoice_settings || {};
      const defaultPm = invoiceSettings.default_payment_method || null;
      if (!defaultPm) {
        return jsonResponse(400, { error: 'no_payment_method' });
      }
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: defaultPm,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { user_id: user.id, plan_id: planId },
      });
      const invoice = subscription.latest_invoice;
      const pi = invoice && invoice.payment_intent ? invoice.payment_intent : null;
      if (!pi) {
        return jsonResponse(500, { error: 'no_client_secret' });
      }
      if (pi.status === 'succeeded') {
        return jsonResponse(200, { status: 'active' });
      }
      try {
        const confirmed = await stripe.paymentIntents.confirm(pi.id, { off_session: true });
        if (confirmed.status === 'succeeded') {
          return jsonResponse(200, { status: 'active' });
        }
        if (confirmed.client_secret) {
          return jsonResponse(200, { clientSecret: confirmed.client_secret, requiresAction: true });
        }
        return jsonResponse(402, { error: 'payment_failed' });
      } catch (confirmErr) {
        const raw = confirmErr && confirmErr.raw ? confirmErr.raw : null;
        const failedPi = raw && raw.payment_intent ? raw.payment_intent : null;
        if (failedPi && failedPi.client_secret) {
          return jsonResponse(200, { clientSecret: failedPi.client_secret, requiresAction: true });
        }
        const msg = confirmErr && confirmErr.message ? confirmErr.message : 'payment_failed';
        return jsonResponse(402, { error: String(msg) });
      }
    }

    // 3) Sem assinatura e cartao novo: devolve clientSecret para o PaymentElement.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
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
