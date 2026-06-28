import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, getPublishableKey, stripeAppearance, friendlyStripeError } from '../lib/stripe.js';
import { sb } from '../lib/supabase.js';
import { fmt } from '../lib/utils.js';
import { Spin } from './ui.jsx';

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// Extrai a mensagem REAL de erro do retorno de sb.functions.invoke, sem mascarar a causa.
// Em erro HTTP a supabase-js poe a resposta crua em error.context (um Response).
function readFnErrorMessage(result, data) {
  if (data && data.error) return Promise.resolve(data.error);
  var err = result ? result.error : null;
  if (!err) return Promise.resolve('');
  var ctx = err.context;
  if (!ctx || typeof ctx.json !== 'function') return Promise.resolve(err.message || '');
  return ctx.json()
    .then(function(b) { return (b && b.error) ? b.error : (err.message || ''); })
    .catch(function() { return err.message || ''; });
}

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

export default function StripeCheckout({ plan, brand, onClose, onDone, toast, mode }) {
  var checkoutMode = mode === 'payment' ? 'payment' : 'subscription';
  var [clientSecret, setClientSecret] = useState('');
  var [loadErr, setLoadErr] = useState('');
  var [loading, setLoading] = useState(true);
  var [stripePromise, setStripePromise] = useState(null);
  var [attempt, setAttempt] = useState(0);
  var retry = function() { setAttempt(function(a) { return a + 1; }); };

  useEffect(function() {
    var alive = true;
    var settled = false;
    var timer = null;
    setLoading(true);
    setLoadErr('');
    setClientSecret('');

    var fail = function(msg) {
      if (!alive || settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setLoadErr(msg);
      setLoading(false);
    };
    var ok = function(cs) {
      if (!alive || settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setClientSecret(cs);
      setLoading(false);
    };

    // Servidor pode estar reativando (cold start): em vez de travar no skeleton, avisa e oferece retry.
    timer = setTimeout(function() {
      fail('O servidor está demorando para responder (pode estar reativando). Toque em Tentar de novo.');
    }, 30000);

    // 1) Resolve a chave publicavel (build env -> Supabase). Sem ela, nao monta o form.
    getPublishableKey().then(function(key) {
      if (!alive || settled) return;
      if (!key) {
        fail('Chave pública do Stripe ausente. Defina STRIPE_PUBLISHABLE_KEY (pk_...) nos secrets do Supabase ou VITE_STRIPE_PUBLISHABLE_KEY no front.');
        return;
      }
      setStripePromise(getStripe());
      // 2) Inicia o pagamento (clientSecret) na edge function correspondente.
      var fnName = checkoutMode === 'payment' ? 'create-payment' : 'create-subscription';
      var fnBody = checkoutMode === 'payment' ? { kind: 'white_label' } : { plan_id: plan.id };
      sb.functions.invoke(fnName, { body: fnBody }).then(function(result) {
        if (!alive || settled) return;
        var data = result && result.data ? result.data : null;
        if (data && data.clientSecret) { ok(data.clientSecret); return; }
        // Mostra a causa REAL (mensagem da Stripe / codigo do backend) em vez de generico.
        readFnErrorMessage(result, data).then(function(msg) { fail(friendlyStripeError(msg)); });
      }).catch(function() {
        fail('Erro de conexão. Verifique sua internet e tente de novo.');
      });
    }).catch(function() {
      fail('Erro de conexão. Verifique sua internet e tente de novo.');
    });

    return function() { alive = false; if (timer) clearTimeout(timer); };
  }, [plan.id, attempt]);

  var done = function() {
    var msg = checkoutMode === 'payment'
      ? 'Pagamento recebido! Sua personalização será liberada em instantes.'
      : 'Pagamento recebido! Seu plano será ativado em instantes.';
    if (toast) toast(msg, 'success');
    if (onDone) onDone();
    onClose();
  };

  var options = clientSecret ? { clientSecret: clientSecret, appearance: stripeAppearance(brand.color, isDarkTheme()) } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col anim-scale" style={{ background: 'var(--bg-card)', maxHeight: '92vh', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <span className="font-semibold text-gray-900">{checkoutMode === 'payment' ? 'Comprar' : 'Assinar'} {plan.name}</span>
            <p className="text-xs text-gray-400">{fmt(plan.price)}{plan.period || (checkoutMode === 'payment' ? ' (única)' : '/mês')}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading && (
            <div className="flex flex-col gap-3">
              <div className="skeleton" style={{ height: 44 }} />
              <div className="skeleton" style={{ height: 44 }} />
              <div className="skeleton" style={{ height: 48 }} />
            </div>
          )}
          {!loading && loadErr && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <p className="text-sm font-medium" style={{ color: 'var(--text-sub)' }}>{loadErr}</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm font-semibold px-5 py-2.5 rounded-xl border min-h-[44px]" style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}>Fechar</button>
                <button onClick={retry} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white min-h-[44px]" style={{ background: brand.color }}>Tentar de novo</button>
              </div>
            </div>
          )}
          {!loading && !loadErr && options && stripePromise && (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm plan={plan} brand={brand} onDone={done} onClose={onClose} mode={checkoutMode} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
