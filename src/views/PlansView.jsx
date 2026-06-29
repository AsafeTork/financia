import React, { useState } from 'react';
import { Card, PageHead, Modal } from '../components/ui.jsx';
import { PRICING_PLANS, WHITELABEL, waLink, effectivePlan, planChangeCta } from '../lib/constants.js';
import { fmt } from '../lib/utils.js';
import { sb } from '../lib/supabase.js';
import { friendlyStripeError, readFnErrorMessage } from '../lib/stripe.js';
import StripeCheckout from '../components/StripeCheckout.jsx';

var CheckIcon = function({ color }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7"/>
    </svg>
  );
};

// Texto do botao conforme a acao decidida por planChangeCta.
function ctaLabel(kind, plan) {
  if (kind === 'subscribe') return 'Assinar ' + plan.name;
  if (kind === 'upgrade') return 'Fazer upgrade';
  if (kind === 'downgrade') return 'Mudar para ' + plan.name;
  if (kind === 'cancel') return 'Voltar para o Grátis';
  return 'Seu plano atual';
}

function PlanCard({ plan, brand, cta, onAction, open, onToggle }) {
  var popular = !!plan.popular;
  var isFree = plan.id === 'free';
  var priceNote = isFree ? 'grátis para sempre, sem cartão' : 'cobrado mensalmente, cancele quando quiser';
  var current = cta.kind === 'current';
  var kind = cta.kind;

  return (
    <Card className="p-5 flex flex-col gap-4" accent={popular} color={brand.color}>
      {popular && (
        <span className="absolute top-0 right-5 text-[11px] font-bold px-3 py-1 rounded-b-md text-white shadow-sm"
          style={{background: brand.color}}>
          Mais escolhido
        </span>
      )}
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="flex items-start justify-between gap-2 text-left w-full min-h-[44px]">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold truncate" style={{color:'var(--text-main)'}}>{plan.name}</p>
          <p className="text-xs mt-0.5" style={{color:'var(--text-sub)'}}>{plan.tagline}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {current && <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:'var(--brand-soft)', color: brand.color}}>Seu plano</span>}
          <svg className="w-4 h-4 transition-transform" style={{transform: open ? 'rotate(180deg)' : 'none', color:'var(--text-sub)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
        </div>
      </button>

      <div>
        <div className="flex items-end gap-1">
          <span className="font-display text-3xl font-bold" style={{color:'var(--text-main)'}}>
            {plan.price === 0 ? 'Grátis' : fmt(plan.price)}
          </span>
          {plan.period && <span className="text-sm mb-1" style={{color:'var(--text-sub)'}}>{plan.period}</span>}
        </div>
        <p className="text-xs mt-1.5" style={{color:'var(--text-sub)'}}>{priceNote}</p>
      </div>

      {open && (
      <div className="flex flex-col gap-2">
        {plan.features.map(function(f) {
          var ladder = f.indexOf('Tudo do') === 0;
          if (ladder) {
            return (
              <div key={f} className="flex items-center gap-2 pb-1.5 mb-0.5" style={{borderBottom:'1px dashed var(--border)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                <span className="text-sm font-bold" style={{color:'var(--text-main)'}}>{f}</span>
              </div>
            );
          }
          return (
            <div key={f} className="flex items-start gap-2">
              <CheckIcon color={brand.color}/>
              <span className="text-sm" style={{color:'var(--text-main)'}}>{f}</span>
            </div>
          );
        })}
      </div>
      )}

      {current && (
        <div className="mt-1 text-center text-sm font-semibold px-4 py-3 rounded-xl min-h-[44px] flex items-center justify-center" style={{background:'var(--brand-soft)', color: brand.color}}>Seu plano atual</div>
      )}
      {(kind === 'subscribe' || kind === 'upgrade') && (
        <button type="button" onClick={function() { onAction(plan, kind); }}
          className="mt-1 w-full text-sm font-semibold px-4 py-3 rounded-xl text-white transition hover:opacity-90 min-h-[44px] flex items-center justify-center gap-2"
          style={{background: brand.color}}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          {ctaLabel(kind, plan)}
        </button>
      )}
      {kind === 'downgrade' && (
        <button type="button" onClick={function() { onAction(plan, kind); }}
          className="mt-1 w-full text-sm font-semibold px-4 py-3 rounded-xl transition hover:opacity-80 min-h-[44px] flex items-center justify-center gap-2"
          style={{background:'var(--brand-soft)', color: brand.color}}>
          {ctaLabel(kind, plan)}
        </button>
      )}
      {kind === 'cancel' && (
        <button type="button" onClick={function() { onAction(plan, kind); }}
          className="mt-1 w-full text-sm font-semibold px-4 py-3 rounded-xl border transition hover:bg-gray-50 min-h-[44px] flex items-center justify-center"
          style={{borderColor:'var(--border)', color:'var(--text-sub)'}}>
          {ctaLabel(kind, plan)}
        </button>
      )}
    </Card>
  );
}

var WL_PLAN = { id: 'white_label', name: 'Personalização', price: WHITELABEL.price, period: '' };

export default function PlansView({ brand, planInfo, toast, onNav }) {
  var plan = effectivePlan(planInfo);
  var checkoutState = useState(null);
  var checkout = checkoutState[0];
  var setCheckout = checkoutState[1];
  var cancelState = useState(false);
  var cancelOpen = cancelState[0];
  var setCancelOpen = cancelState[1];
  var cancellingState = useState(false);
  var cancelling = cancellingState[0];
  var setCancelling = cancellingState[1];
  var openState = useState(plan && plan !== 'free' ? plan : 'pro');
  var openPlan = openState[0];
  var setOpenPlan = openState[1];
  var customCents = planInfo && planInfo.custom_price_cents ? planInfo.custom_price_cents : 0;
  var wlState = useState(false);
  var wlOpen = wlState[0];
  var setWlOpen = wlState[1];
  var hasWhiteLabel = !!(brand && brand.white_label);
  var wlMsg = 'Olá! Quero o app personalizado da minha empresa (logo, nome e cores). Pode me passar como funciona?';
  var duvidaMsg = 'Olá! Tenho uma dúvida sobre o Financia.';

  // Decide o que fazer ao clicar no botao de um plano.
  var handleAction = function(p, kind) {
    if (kind === 'cancel') { setCancelOpen(true); return; }
    setCheckout({ plan: p, kind: kind });
  };

  var confirmCancel = async function() {
    setCancelling(true);
    try {
      var res = await sb.functions.invoke('cancel-subscription', { body: {} });
      var data = res && res.data ? res.data : null;
      if (!data || !data.ok) {
        var msg = await readFnErrorMessage(res, data);
        if (toast) toast(friendlyStripeError(msg), 'error');
        setCancelling(false);
        return;
      }
      if (toast) toast('Assinatura cancelada. Você fica no plano atual até o fim do período já pago.', 'success');
      setCancelling(false);
      setCancelOpen(false);
    } catch (e) {
      if (toast) toast('Erro ao cancelar. Tente de novo.', 'error');
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-0">
      <button type="button" onClick={function() { try { sessionStorage.setItem('financia_settings_tab', 'subscription'); } catch (e) {} if (onNav) onNav('settings'); }}
        className="self-start inline-flex items-center gap-1.5 text-sm font-semibold min-h-[44px] px-2 -ml-2 rounded-xl transition hover:opacity-70"
        style={{color:'var(--text-sub)'}}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        Voltar para Assinatura
      </button>
      <PageHead
        icon="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
        color={brand.color}
        title="Planos e personalização"
        sub="Escolha o plano ou tenha o app com a cara da sua empresa"
      />

      {customCents > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{background:'var(--brand-soft)', border:'1px solid var(--border)'}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: brand.color}}>
            <svg className="w-5 h-5" fill="none" stroke="#ffffff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6M9.5 9h.01M14.5 15h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{color: brand.color}}>Você tem um preço especial</p>
            <p className="text-xs" style={{color:'var(--text-sub)'}}>Combinado com você: <b>{fmt(customCents / 100)}/mês</b> no plano que assinar.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {PRICING_PLANS.map(function(p) {
          return <PlanCard key={p.id} plan={p} brand={brand} cta={planChangeCta(plan, p.id)} onAction={handleAction}
            open={openPlan === p.id} onToggle={function() { setOpenPlan(openPlan === p.id ? null : p.id); }}/>;
        })}
      </div>

      {checkout && (
        <StripeCheckout plan={checkout.plan} ctaKind={checkout.kind} brand={brand} toast={toast}
          onClose={function() { setCheckout(null); }}/>
      )}

      {cancelOpen && (
        <Modal title="Cancelar assinatura" onClose={function() { setCancelOpen(false); }}
          onSave={confirmCancel} saving={cancelling} saveLabel="Confirmar cancelamento"
          color="#dc2626">
          <p className="text-sm" style={{color:'var(--text-main)'}}>
            Você voltará para o plano Grátis ao fim do período já pago. Seus dados continuam salvos.
          </p>
          <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
            Pode reativar quando quiser. Nenhuma cobrança nova será feita.
          </p>
        </Modal>
      )}

      {wlOpen && (
        <StripeCheckout plan={WL_PLAN} mode="payment" brand={brand} toast={toast}
          onClose={function() { setWlOpen(false); }}/>
      )}

      {/* Pacote white-label — pagamento unico */}
      <Card className="p-5 flex flex-col gap-4" variant="raised" accent={true} color={brand.color}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{background:'var(--brand-soft)'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z M12 12l8-4.5M12 12v9M12 12L4 7.5"/>
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-semibold" style={{color:'var(--text-main)'}}>App da sua empresa</p>
            <p className="text-xs mt-0.5" style={{color:'var(--text-sub)'}}>{WHITELABEL.tagline}</p>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="font-display text-3xl font-bold" style={{color:'var(--text-main)'}}>{fmt(WHITELABEL.price)}</span>
          <span className="text-sm mb-1 font-semibold" style={{color: brand.color}}>pagamento único</span>
        </div>

        <div className="flex flex-col gap-2">
          {WHITELABEL.features.map(function(f) {
            return (
              <div key={f} className="flex items-start gap-2">
                <CheckIcon color={brand.color}/>
                <span className="text-sm" style={{color:'var(--text-main)'}}>{f}</span>
              </div>
            );
          })}
        </div>

        {hasWhiteLabel ? (
          <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl min-h-[44px]" style={{background:'var(--brand-soft)', color: brand.color}}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
            Personalização ativa — configure em Aparência
          </div>
        ) : (
          <div className="mt-1 flex flex-col gap-2">
            <button type="button" onClick={function() { setWlOpen(true); }}
              className="w-full text-sm font-semibold px-4 py-3 rounded-xl text-white transition hover:opacity-90 min-h-[44px] flex items-center justify-center gap-2"
              style={{background: brand.color}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              Comprar personalização — {fmt(WHITELABEL.price)}
            </button>
            <a href={waLink(wlMsg)} target="_blank" rel="noopener noreferrer"
              className="text-center text-xs font-semibold transition hover:opacity-70" style={{color: brand.color}}>
              Prefere falar antes? Chamar no WhatsApp
            </a>
          </div>
        )}
      </Card>

      {/* Contato / negociacao */}
      <Card className="p-5 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'var(--brand-soft)'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11 11 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
        </div>
        <div>
          <p className="font-display text-base font-semibold" style={{color:'var(--text-main)'}}>Dúvidas ou quer negociar?</p>
          <p className="text-xs mt-1" style={{color:'var(--text-sub)'}}>Fale comigo no WhatsApp. Respondo pessoalmente.</p>
        </div>
        <a href={waLink(duvidaMsg)} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold px-5 py-3 rounded-xl transition hover:opacity-90 min-h-[44px] flex items-center gap-2"
          style={{background:'var(--brand-soft)', color: brand.color}}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.913z"/></svg>
          Falar no WhatsApp
        </a>
      </Card>
    </div>
  );
}
