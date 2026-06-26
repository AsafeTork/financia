// Edge Function: stripe-webhook
// Recebe eventos da Stripe e ativa/rebaixa o plano via RPC SECURITY DEFINER.
// A atualizacao do plano passa por stripe_activate_plan (o trigger prevent_plan_change
// bloqueia UPDATE direto na company_profiles).
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function plainResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async function (req) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    return plainResponse(500, { error: 'stripe_not_configured' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event = null;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (verifyErr) {
    return plainResponse(400, { error: 'invalid_signature' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata ? session.metadata : {};
      const userId = session.client_reference_id ? session.client_reference_id : meta.user_id;
      const planId = meta.plan_id ? meta.plan_id : 'pro';
      const expires = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

      if (userId) {
        await supabase.rpc('stripe_activate_plan', {
          p_user: userId,
          p_plan: planId,
          p_expires: expires,
        });
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      // Fluxo in-app (Stripe Elements): a assinatura default_incomplete so confirma
      // aqui, quando a primeira fatura e paga. Ativa o plano lido do metadata da sub.
      const invoice = event.data.object;
      const subId = invoice.subscription ? invoice.subscription : null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const m = sub.metadata ? sub.metadata : {};
        const userId = m.user_id ? m.user_id : null;
        const planId = m.plan_id ? m.plan_id : 'pro';
        if (userId) {
          const expires = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.rpc('stripe_activate_plan', {
            p_user: userId,
            p_plan: planId,
            p_expires: expires,
          });
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const subMeta = sub.metadata ? sub.metadata : {};
      const userId = subMeta.user_id ? subMeta.user_id : null;
      if (userId) {
        await supabase.rpc('stripe_activate_plan', {
          p_user: userId,
          p_plan: 'free',
          p_expires: null,
        });
      }
    }

    return plainResponse(200, { received: true });
  } catch (err) {
    return plainResponse(200, { received: true });
  }
});
