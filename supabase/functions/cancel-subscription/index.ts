// Edge Function: cancel-subscription
// Agenda o cancelamento da assinatura ativa no fim do periodo ja pago (o usuario
// mantem o plano ate la e depois volta para Grátis via webhook). Idempotente.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient } from '../_shared/security.ts';
import { htmlFromText, sendSystemEmail } from '../_shared/mailer.ts';

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
    const allowed = await enforceRateLimit(admin, user.id, 'cancel_subscription', 60, 4);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    const customer = await findCustomer(stripe, user.email, user.id);
    if (!customer) {
      return jsonResponse(200, { ok: true, status: 'no_subscription' });
    }

    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 20 });
    const activeSub = activeSubscriptionOf(subs);
    if (!activeSub) {
      return jsonResponse(200, { ok: true, status: 'no_subscription' });
    }

    const updated = await stripe.subscriptions.update(activeSub.id, {
      cancel_at_period_end: true,
      metadata: { user_id: user.id },
    });

    if (user.email) {
      const cancelDate = new Date(Number(updated.current_period_end) * 1000).toLocaleDateString('pt-BR');
      const txt =
        'Cancelamento agendado com sucesso.' + '\n\n' +
        'Sua assinatura continuará ativa até ' + cancelDate + '.' + '\n' +
        'Após essa data, sua conta voltará para o plano Grátis.';
      await sendSystemEmail({
        to: String(user.email),
        subject: 'Cancelamento agendado - Financia',
        text: txt,
        html: htmlFromText(txt),
      });
    }

    return jsonResponse(200, { ok: true, status: 'scheduled', cancel_at: updated.current_period_end });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
