// Edge Function: stripe-webhook
// Recebe eventos da Stripe e ativa/rebaixa o plano via RPC SECURITY DEFINER.
// A atualizacao do plano passa por stripe_activate_plan (o trigger prevent_plan_change
// bloqueia UPDATE direto na company_profiles).
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { htmlFromText, sendSystemEmail } from '../_shared/mailer.ts';

function plainResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function brlFromCents(cents: unknown): string {
  const n = Number(cents || 0);
  const v = Number.isFinite(n) ? (n / 100) : 0;
  return 'R$ ' + v.toFixed(2).replace('.', ',');
}

async function userEmailById(supabase: any, userId: string): Promise<string> {
  if (!userId) return '';
  try {
    const userRes = await supabase.auth.admin.getUserById(userId);
    const u = userRes && userRes.data ? userRes.data.user : null;
    return u && u.email ? String(u.email) : '';
  } catch (_) {
    return '';
  }
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
        const to = await userEmailById(supabase, String(userId));
        if (to) {
          const txt =
            'Pagamento confirmado.' + '\n\n' +
            'Seu plano foi ativado com sucesso no Financia.' + '\n' +
            'Plano: ' + String(planId || 'pro') + '\n\n' +
            'Obrigado por assinar!';
          await sendSystemEmail({
            to: to,
            subject: 'Pagamento confirmado - Financia',
            text: txt,
            html: htmlFromText(txt),
          });
        }
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
          const to = await userEmailById(supabase, String(userId));
          if (to) {
            const txt =
              'Cobrança confirmada com sucesso.' + '\n\n' +
              'Plano: ' + String(planId || 'pro') + '\n' +
              'Valor: ' + brlFromCents(invoice.amount_paid) + '\n' +
              'Fatura: ' + String(invoice.number || invoice.id || '') + '\n\n' +
              'Seu acesso continua ativo.';
            await sendSystemEmail({
              to: to,
              subject: 'Cobrança confirmada - Financia',
              text: txt,
              html: htmlFromText(txt),
            });
          }
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subId = invoice.subscription ? String(invoice.subscription) : '';
      let userId = '';
      let planId = 'pro';
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          const m = sub && sub.metadata ? sub.metadata : {};
          userId = m.user_id ? String(m.user_id) : '';
          planId = m.plan_id ? String(m.plan_id) : 'pro';
        } catch (_) {}
      }
      const to = userId ? await userEmailById(supabase, userId) : '';
      if (to) {
        const txt =
          'Não conseguimos confirmar a cobrança da sua assinatura.' + '\n\n' +
          'Plano: ' + String(planId || 'pro') + '\n' +
          'Valor pendente: ' + brlFromCents(invoice.amount_due) + '\n' +
          'Fatura: ' + String(invoice.number || invoice.id || '') + '\n\n' +
          'Atualize o cartão em Configurações > Assinatura para evitar interrupção.';
        await sendSystemEmail({
          to: to,
          subject: 'Falha na cobrança - Financia',
          text: txt,
          html: htmlFromText(txt),
        });
      }
    } else if (event.type === 'invoice.upcoming') {
      const invoice = event.data.object;
      const subId = invoice.subscription ? String(invoice.subscription) : '';
      let userId = '';
      let planId = 'pro';
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          const m = sub && sub.metadata ? sub.metadata : {};
          userId = m.user_id ? String(m.user_id) : '';
          planId = m.plan_id ? String(m.plan_id) : 'pro';
        } catch (_) {}
      }
      const to = userId ? await userEmailById(supabase, userId) : '';
      if (to) {
        const dueDate = invoice.next_payment_attempt
          ? new Date(Number(invoice.next_payment_attempt) * 1000).toLocaleDateString('pt-BR')
          : 'em breve';
        const txt =
          'Lembrete de cobrança da sua assinatura.' + '\n\n' +
          'Plano: ' + String(planId || 'pro') + '\n' +
          'Próxima cobrança: ' + brlFromCents(invoice.amount_due) + '\n' +
          'Data prevista: ' + dueDate + '\n\n' +
          'Se precisar, atualize o cartão em Configurações > Assinatura.';
        await sendSystemEmail({
          to: to,
          subject: 'Lembrete de cobrança - Financia',
          text: txt,
          html: htmlFromText(txt),
        });
      }
    } else if (event.type === 'payment_intent.succeeded') {
      // Cobranca unica do add-on de personalizacao (white-label). So age quando o
      // metadata marca kind=white_label (ignora os PaymentIntents das assinaturas).
      const pi = event.data.object;
      const pm = pi.metadata ? pi.metadata : {};
      if (pm.kind === 'white_label' && pm.user_id) {
        await supabase.rpc('set_white_label', { p_user: pm.user_id, p_on: true });
        const to = await userEmailById(supabase, String(pm.user_id));
        if (to) {
          const txt =
            'Pedido de personalização confirmado.' + '\n\n' +
            'Recebemos seu pagamento e iniciaremos a preparação do app personalizado.' + '\n\n' +
            'Você pode ajustar nome, logo e cores em Configurações > Aparência.';
          await sendSystemEmail({
            to: to,
            subject: 'Personalização confirmada - Financia',
            text: txt,
            html: htmlFromText(txt),
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
        const to = await userEmailById(supabase, String(userId));
        if (to) {
          const txt =
            'Sua assinatura foi encerrada e sua conta voltou para o plano Grátis.' + '\n\n' +
            'Se quiser reativar um plano pago, acesse a aba de Assinatura.';
          await sendSystemEmail({
            to: to,
            subject: 'Assinatura encerrada - Financia',
            text: txt,
            html: htmlFromText(txt),
          });
        }
      }
    }

    return plainResponse(200, { received: true });
  } catch (err) {
    return plainResponse(200, { received: true });
  }
});
