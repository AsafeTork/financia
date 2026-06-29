// Edge Function: admin-stripe-overview
// SO admin. Devolve a quantidade REAL na conta Stripe (saldo disponivel + a caminho)
// e a estimativa de receita mensal (MRR) somando as assinaturas ativas de verdade.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

function sumBalanceBRL(list) {
  let cents = 0;
  if (list) {
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].currency === 'brl') cents += list[i].amount;
    }
  }
  return cents;
}

// Valor mensal de um item, normalizando intervalo (ano -> /12, semana -> *52/12).
function monthlyCentsOf(item) {
  if (!item || !item.price || !item.price.unit_amount) return 0;
  const qty = item.quantity ? item.quantity : 1;
  const amount = item.price.unit_amount * qty;
  const rec = item.price.recurring || {};
  const interval = rec.interval || 'month';
  const count = rec.interval_count ? rec.interval_count : 1;
  if (interval === 'year') return Math.round(amount / (12 * count));
  if (interval === 'week') return Math.round((amount * 52) / (12 * count));
  if (interval === 'day') return Math.round((amount * 365) / (12 * count));
  return Math.round(amount / count);
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const userResult = await supabase.auth.getUser();
    const user = userResult && userResult.data ? userResult.data.user : null;
    if (!user) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    // Gate de admin via service role (user_roles).
    const admin = createClient(supabaseUrl, serviceKey);
    const roleRes = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRes || !roleRes.data) {
      return jsonResponse(403, { error: 'not_authorized' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

    const balance = await stripe.balance.retrieve();
    const availableCents = sumBalanceBRL(balance ? balance.available : null);
    const pendingCents = sumBalanceBRL(balance ? balance.pending : null);

    // MRR real: soma das assinaturas ATIVAS (status que cobram). Pagina ate 100.
    let mrrCents = 0;
    let activeCount = 0;
    let truncated = false;
    const subs = await stripe.subscriptions.list({ status: 'all', limit: 100 });
    if (subs && subs.data) {
      for (let i = 0; i < subs.data.length; i++) {
        const s = subs.data[i];
        if (ACTIVE_STATUSES.indexOf(s.status) === -1) continue;
        if (s.cancel_at_period_end) { /* ainda conta ate o fim do periodo */ }
        activeCount++;
        const items = s.items && s.items.data ? s.items.data : [];
        for (let j = 0; j < items.length; j++) { mrrCents += monthlyCentsOf(items[j]); }
      }
      truncated = !!subs.has_more;
    }

    return jsonResponse(200, {
      available_cents: availableCents,
      pending_cents: pendingCents,
      currency: 'brl',
      mrr_cents: mrrCents,
      active_count: activeCount,
      truncated: truncated,
    });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonResponse(500, { error: String(message) });
  }
});
