import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, getPublishableKey, stripeAppearance, friendlyStripeError, readFnErrorMessage } from '../lib/stripe.js';
import { sb } from '../lib/supabase.js';
import { fmt } from '../lib/utils.js';
import { Spin } from './ui.jsx';
import CardPreview from './CardPreview.jsx';

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// Copy do botao de confirmacao conforme a acao (assinar / upgrade / downgrade).
function confirmLabel(ctaKind) {
  if (ctaKind === 'upgrade') return 'Confirmar upgrade';
  if (ctaKind === 'downgrade') return 'Confirmar mudança';
  return 'Confirmar assinatura';
}

// Formulario com PaymentElement: usado para cartao NOVO (assinatura) e white-label.
function PaymentForm({ plan, brand, onDone, onClose, mode }) {
  var stripe = useStripe();
  var elements = useElements();
  var [submitting, setSubmitting] = useState(false);
  var [payErr, setPayErr] = useState('');

  var submit = async function(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setPayErr('');
    try {
      var sub = await elements.submit();
      if (sub.error) { setPayErr(sub.error.message || 'Verifique os dados do cartão.'); setSubmitting(false); return; }
      var res = await stripe.confirmPayment({
        elements: elements,
        confirmParams: { return_url: window.location.origin + '/?checkout=success#planos' },
        redirect: 'if_required',
      });
      if (res.error) {
        setPayErr(res.error.message || 'Não foi possível concluir o pagamento.');
        setSubmitting(false);
        return;
      }
      onDone();
    } catch (err) {
      setPayErr('Erro inesperado no pagamento. Tente de novo.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {payErr && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <p className="text-xs font-medium text-red-600">{payErr}</p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={submitting} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={!stripe || submitting} className="flex-1 text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition" style={{ background: brand.color }}>
          {submitting ? <Spin white /> : ('Pagar ' + fmt(plan.price))}
        </button>
      </div>
      <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>{mode === 'payment' ? 'Pagamento único e seguro, processado pela Stripe.' : 'Pagamento seguro processado pela Stripe. Você pode cancelar quando quiser.'}</p>
    </form>
  );
}

export default function StripeCheckout({ plan, brand, onClose, onDone, toast, mode, ctaKind }) {
  var checkoutMode = mode === 'payment' ? 'payment' : 'subscription';
  var kind = ctaKind || 'subscribe';
  var isChange = checkoutMode === 'subscription' && (kind === 'upgrade' || kind === 'downgrade');

  // phase: 'loading' | 'error' | 'form' | 'saved' | 'change'
  var [phase, setPhase] = useState('loading');
  var [clientSecret, setClientSecret] = useState('');
  var [loadErr, setLoadErr] = useState('');
  var [stripePromise, setStripePromise] = useState(null);
  var [card, setCard] = useState(null);
  var [confirming, setConfirming] = useState(false);
  var [actionErr, setActionErr] = useState('');
  var [attempt, setAttempt] = useState(0);
  var [useOtherCard, setUseOtherCard] = useState(false);
  var retry = function() { setActionErr(''); setUseOtherCard(false); setAttempt(function(a) { return a + 1; }); };

  useEffect(function() {
    var alive = true;
    var settled = false;
    var timer = null;
    setPhase('loading');
    setLoadErr('');
    setClientSecret('');

    var fail = function(msg) {
      if (!alive || settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setLoadErr(msg);
      setPhase('error');
    };
    var toForm = function(cs) {
      if (!alive || settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setClientSecret(cs);
      setPhase('form');
    };
    var toPreview = function(c, nextPhase) {
      if (!alive || settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setCard(c);
      setPhase(nextPhase);
    };

    timer = setTimeout(function() {
      fail('O servidor está demorando para responder (pode estar reativando). Toque em Tentar de novo.');
    }, 30000);

    // Inicia a assinatura com cartao NOVO (PaymentElement).
    var startNewCardSubscription = function() {
      sb.functions.invoke('create-subscription', { body: { plan_id: plan.id } }).then(function(result) {
        if (!alive || settled) return;
        var data = result && result.data ? result.data : null;
        if (data && data.clientSecret) { toForm(data.clientSecret); return; }
        // Servidor pode ter detectado assinatura ativa e ja ter mudado o plano.
        if (data && (data.status === 'changed' || data.status === 'active' || data.status === 'unchanged')) { done(); return; }
        readFnErrorMessage(result, data).then(function(msg) { fail(friendlyStripeError(msg)); });
      }).catch(function() {
        fail('Erro de conexão. Verifique sua internet e tente de novo.');
      });
    };

    // Inicia o pagamento white-label com cartao NOVO (PaymentElement).
    var startNewCardPayment = function() {
      sb.functions.invoke('create-payment', { body: { kind: 'white_label' } }).then(function(result) {
        if (!alive || settled) return;
        var data = result && result.data ? result.data : null;
        if (data && data.clientSecret) { toForm(data.clientSecret); return; }
        if (data && data.status === 'paid') { done(); return; }
        readFnErrorMessage(result, data).then(function(msg) { fail(friendlyStripeError(msg)); });
      }).catch(function() {
        fail('Erro de conexão. Verifique sua internet e tente de novo.');
      });
    };

    getPublishableKey().then(function(key) {
      if (!alive || settled) return;
      if (!key) {
        fail('Chave pública do Stripe ausente. Defina STRIPE_PUBLISHABLE_KEY (pk_...) nos secrets do Supabase ou VITE_STRIPE_PUBLISHABLE_KEY no front.');
        return;
      }
      setStripePromise(getStripe());

      // White-label: pagamento unico. Se ja existe cartao salvo, oferece pagar com ele.
      if (checkoutMode === 'payment') {
        sb.functions.invoke('get-payment-method', { body: {} }).then(function(result) {
          if (!alive || settled) return;
          var data = result && result.data ? result.data : null;
          var savedCard = data && data.card ? data.card : null;
          if (savedCard) { toPreview(savedCard, 'saved'); return; }
          startNewCardPayment();
        }).catch(function() {
          if (!alive || settled) return;
          startNewCardPayment();
        });
        return;
      }

      // Assinatura: verifica cartao salvo para decidir confirmacao rapida x formulario.
      sb.functions.invoke('get-payment-method', { body: {} }).then(function(result) {
        if (!alive || settled) return;
        var data = result && result.data ? result.data : null;
        var savedCard = data && data.card ? data.card : null;
        if (isChange) { toPreview(savedCard, 'change'); return; }
        if (savedCard) { toPreview(savedCard, 'saved'); return; }
        startNewCardSubscription();
      }).catch(function() {
        // Sem conseguir checar o cartao: cai para o formulario de cartao novo.
        if (!alive || settled) return;
        startNewCardSubscription();
      });
    }).catch(function() {
      fail('Erro de conexão. Verifique sua internet e tente de novo.');
    });

    return function() { alive = false; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line
  }, [plan.id, attempt]);

  var done = function(customMsg) {
    var msg = customMsg;
    if (!msg) {
      if (checkoutMode === 'payment') msg = 'Pagamento recebido! Sua personalização será liberada em instantes.';
      else if (isChange) msg = 'Plano alterado! A mudança já está valendo.';
      else msg = 'Pagamento recebido! Seu plano será ativado em instantes.';
    }
    if (toast) toast(msg, 'success');
    if (onDone) onDone();
    onClose();
  };

  // Paga o pacote white-label com o cartao ja salvo (off_session + 3DS se preciso).
  var runWhiteLabelSaved = async function() {
    setConfirming(true);
    setActionErr('');
    try {
      var res = await sb.functions.invoke('create-payment', { body: { kind: 'white_label', use_saved_card: true } });
      var data = res && res.data ? res.data : null;
      if (data && data.status === 'paid') { done(); return; }
      if (data && data.clientSecret) {
        var stripe = await stripePromise;
        if (!stripe) { setActionErr('Não foi possível carregar o Stripe. Tente de novo.'); setConfirming(false); return; }
        var r = await stripe.handleNextAction({ clientSecret: data.clientSecret });
        if (r && r.error) { setActionErr(r.error.message || 'Autenticação do cartão falhou.'); setConfirming(false); return; }
        done();
        return;
      }
      var msg = await readFnErrorMessage(res, data);
      setActionErr(friendlyStripeError(msg));
      setConfirming(false);
    } catch (err) {
      setActionErr('Erro de conexão. Tente de novo.');
      setConfirming(false);
    }
  };

  // Confirma assinatura/mudanca usando o cartao salvo (ou mudando o plano no servidor).
  var runSubscription = async function(useSaved) {
    setConfirming(true);
    setActionErr('');
    try {
      var body = { plan_id: plan.id };
      if (useSaved) body.use_saved_card = true;
      var res = await sb.functions.invoke('create-subscription', { body: body });
      var data = res && res.data ? res.data : null;
      if (data && (data.status === 'active' || data.status === 'changed' || data.status === 'unchanged')) {
        if (data.status === 'changed' && data.scheduled) {
          done('Downgrade agendado. Você mantém o plano atual até o fim do período já pago e depois muda automaticamente para o ' + plan.name + '.');
        } else {
          done();
        }
        return;
      }
      if (data && data.clientSecret && (data.requiresAction || useSaved || isChange)) {
        var stripe = await stripePromise;
        if (!stripe) { setActionErr('Não foi possível carregar o Stripe. Tente de novo.'); setConfirming(false); return; }
        var r = await stripe.handleNextAction({ clientSecret: data.clientSecret });
        if (r && r.error) { setActionErr(r.error.message || 'Autenticação do cartão falhou.'); setConfirming(false); return; }
        done();
        return;
      }
      // Servidor pediu cartao novo (sem assinatura ativa / sem cartao salvo): vai ao formulario.
      if (data && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setUseOtherCard(false);
        setPhase('form');
        setConfirming(false);
        return;
      }
      var msg = await readFnErrorMessage(res, data);
      setActionErr(friendlyStripeError(msg));
      setConfirming(false);
    } catch (err) {
      setActionErr('Erro de conexão. Tente de novo.');
      setConfirming(false);
    }
  };

  var headerTitle;
  if (checkoutMode === 'payment') headerTitle = 'Comprar ' + plan.name;
  else if (isChange) headerTitle = 'Mudar para ' + plan.name;
  else headerTitle = 'Assinar ' + plan.name;

  var options = clientSecret ? { clientSecret: clientSecret, appearance: stripeAppearance(brand.color, isDarkTheme()) } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col anim-scale" style={{ background: 'var(--bg-card)', maxHeight: '92vh', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <span className="font-semibold text-gray-900">{headerTitle}</span>
            <p className="text-xs text-gray-400">{fmt(plan.price)}{plan.period || (checkoutMode === 'payment' ? ' (única)' : '/mês')}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {phase === 'loading' && (
            <div className="flex flex-col gap-3">
              <div className="skeleton" style={{ height: 44 }} />
              <div className="skeleton" style={{ height: 44 }} />
              <div className="skeleton" style={{ height: 48 }} />
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <p className="text-sm font-medium" style={{ color: 'var(--text-sub)' }}>{loadErr}</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm font-semibold px-5 py-2.5 rounded-xl border min-h-[44px]" style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}>Fechar</button>
                <button onClick={retry} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white min-h-[44px]" style={{ background: brand.color }}>Tentar de novo</button>
              </div>
            </div>
          )}

          {(phase === 'saved' || phase === 'change') && !useOtherCard && (
            <div className="flex flex-col gap-4">
              {isChange && (
                <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
                  {kind === 'upgrade' ? 'Você vai subir para o ' : 'Você vai mudar para o '}<span className="font-semibold" style={{ color: 'var(--text-main)' }}>{plan.name}</span>. Cobrado no cartão salvo, com ajuste proporcional.
                </p>
              )}
              {card ? <CardPreview card={card} brand={brand} /> : (
                <p className="text-sm" style={{ color: 'var(--text-sub)' }}>Confirme para concluir.</p>
              )}
              {actionErr && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  <p className="text-xs font-medium text-red-600">{actionErr}</p>
                </div>
              )}
              <button onClick={function() { if (checkoutMode === 'payment') { runWhiteLabelSaved(); } else { runSubscription(phase === 'saved'); } }} disabled={confirming}
                className="w-full text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition" style={{ background: brand.color }}>
                {confirming ? <Spin white /> : (checkoutMode === 'payment' ? ('Pagar ' + fmt(plan.price)) : confirmLabel(kind))}
              </button>
              {phase === 'saved' && (
                <button onClick={function() { setUseOtherCard(true); setActionErr(''); startNewCardFromSaved(); }} disabled={confirming}
                  className="text-xs font-semibold text-center transition hover:opacity-70 disabled:opacity-50" style={{ color: brand.color }}>
                  Usar outro cartão
                </button>
              )}
              <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>Pagamento seguro processado pela Stripe. Você pode cancelar quando quiser.</p>
            </div>
          )}

          {phase === 'form' && options && stripePromise && (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm plan={plan} brand={brand} onDone={done} onClose={onClose} mode={checkoutMode} />
            </Elements>
          )}
          {phase === 'form' && (!options || !stripePromise) && (
            <div className="flex flex-col gap-3">
              <div className="skeleton" style={{ height: 44 }} />
              <div className="skeleton" style={{ height: 48 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Troca para cartao novo a partir da tela de cartao salvo: busca clientSecret.
  function startNewCardFromSaved() {
    setPhase('loading');
    if (checkoutMode === 'payment') {
      sb.functions.invoke('create-payment', { body: { kind: 'white_label' } }).then(function(result) {
        var data = result && result.data ? result.data : null;
        if (data && data.clientSecret) { setClientSecret(data.clientSecret); setPhase('form'); return; }
        if (data && data.status === 'paid') { done(); return; }
        readFnErrorMessage(result, data).then(function(msg) { setLoadErr(friendlyStripeError(msg)); setPhase('error'); });
      }).catch(function() {
        setLoadErr('Erro de conexão. Verifique sua internet e tente de novo.');
        setPhase('error');
      });
      return;
    }
    sb.functions.invoke('create-subscription', { body: { plan_id: plan.id } }).then(function(result) {
      var data = result && result.data ? result.data : null;
      if (data && data.clientSecret) { setClientSecret(data.clientSecret); setPhase('form'); return; }
      if (data && (data.status === 'changed' || data.status === 'active' || data.status === 'unchanged')) { done(); return; }
      readFnErrorMessage(result, data).then(function(msg) { setLoadErr(friendlyStripeError(msg)); setPhase('error'); });
    }).catch(function() {
      setLoadErr('Erro de conexão. Verifique sua internet e tente de novo.');
      setPhase('error');
    });
  }
}
