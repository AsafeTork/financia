// Edge Function: create-payment
// Cobranca UNICA (nao recorrente) para o add-on de Personalizacao (white-label).
// Cria um PaymentIntent e devolve o client_secret para confirmar via Stripe Elements
// DENTRO do app, sem redirecionar. Preco inline em BRL (centavos).
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizeKind } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Preco do pacote de personalizacao: R$ 497,00 (centavos). Espelha WHITELABEL.price.
const WHITE_LABEL_PRICE = 49700;

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
    const kind = sanitizeKind(body && body.kind);
    const useSavedCard = !!(body && body.use_saved_card);
    if (!kind) {
      return jsonResponse(400, { error: 'invalid_kind' });
    }
    const admin = getAdminClient();
    const allowed = await enforceRateLimit(admin, user.id, 'create_payment', 60, 6);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customer = await findOrCreateCustomer(stripe, user.email, user.id);
    const customerId = customer.id;

    // Pagar com o cartao salvo (off_session): confirma na hora e devolve status.
    if (useSavedCard) {
      const invoiceSettings = customer.invoice_settings || {};
      let defaultPm = invoiceSettings.default_payment_method || null;
      if (!defaultPm) {
        const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
        if (list && list.data && list.data.length > 0) defaultPm = list.data[0].id;
      }
      if (!defaultPm) {
        return jsonResponse(400, { error: 'no_payment_method' });
      }
      const pi = await stripe.paymentIntents.create({
        amount: WHITE_LABEL_PRICE,
        currency: 'brl',
        customer: customerId,
        description: 'Financia - Personalizacao (white-label)',
        payment_method: defaultPm,
        off_session: true,
        confirm: true,
        metadata: { user_id: user.id, kind: 'white_label' },
      }).catch(function (confirmErr) {
        const raw = confirmErr && confirmErr.raw ? confirmErr.raw : null;
        const failedPi = raw && raw.payment_intent ? raw.payment_intent : null;
        if (failedPi) return failedPi;
        throw confirmErr;
      });
      if (pi.status === 'succeeded') {
        return jsonResponse(200, { status: 'paid' });
      }
      if (pi.client_secret && (pi.status === 'requires_action' || pi.status === 'requires_confirmation')) {
        return jsonResponse(200, { clientSecret: pi.client_secret, requiresAction: true });
      }
      return jsonResponse(402, { error: 'payment_failed' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: WHITE_LABEL_PRICE,
      currency: 'brl',
      customer: customerId,
      description: 'Financia - Personalizacao (white-label)',
      automatic_payment_methods: { enabled: true },
      metadata: { user_id: user.id, kind: 'white_label' },
    });

    if (!paymentIntent || !paymentIntent.client_secret) {
      return jsonResponse(500, { error: 'no_client_secret' });
    }

    return jsonResponse(200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
