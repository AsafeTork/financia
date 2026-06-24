import React from 'react';
import { Card, PageHead } from '../components/ui.jsx';
import { PRICING_PLANS, WHITELABEL, waLink, effectivePlan } from '../lib/constants.js';
import { fmt } from '../lib/utils.js';

var CheckIcon = function({ color }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7"/>
    </svg>
  );
};

function PlanCard({ plan, brand, current }) {
  var popular = !!plan.popular;
  var msg = 'Ola! Tenho interesse no plano ' + plan.name + ' do Financia. Pode me ajudar?';
  return (
    <Card className="p-5 flex flex-col gap-4" accent={popular} color={brand.color}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold" style={{color:'var(--text-main)'}}>{plan.name}</p>
          <p className="text-xs mt-0.5" style={{color:'var(--text-sub)'}}>{plan.tagline}</p>
        </div>
        {popular && <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white flex-shrink-0" style={{background: brand.color}}>Popular</span>}
        {current && <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{background:'var(--brand-soft)', color: brand.color}}>Seu plano</span>}
      </div>

      <div className="flex items-end gap-1">
        <span className="font-display text-3xl font-bold" style={{color:'var(--text-main)'}}>
          {plan.price === 0 ? 'Grátis' : fmt(plan.price)}
        </span>
        {plan.period && <span className="text-sm mb-1" style={{color:'var(--text-sub)'}}>{plan.period}</span>}
      </div>

      <div className="flex flex-col gap-2">
        {plan.features.map(function(f) {
          return (
            <div key={f} className="flex items-start gap-2">
              <CheckIcon color={brand.color}/>
              <span className="text-sm" style={{color:'var(--text-main)'}}>{f}</span>
            </div>
          );
        })}
      </div>

      {plan.id !== 'free' && (
        <a href={waLink(msg)} target="_blank" rel="noopener noreferrer"
          className="mt-1 text-center text-sm font-semibold px-4 py-3 rounded-xl text-white transition hover:opacity-90 min-h-[44px] flex items-center justify-center"
          style={{background: brand.color}}>
          {plan.cta}
        </a>
      )}
    </Card>
  );
}

export default function PlansView({ brand, planInfo }) {
  var plan = effectivePlan(planInfo);
  var wlMsg = 'Ola! Quero o app personalizado da minha empresa (logo, nome e cores). Pode me passar como funciona?';
  var duvidaMsg = 'Ola! Tenho uma duvida sobre o Financia.';

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-0">
      <PageHead
        icon="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
        color={brand.color}
        title="Planos e personalização"
        sub="Escolha o plano ou tenha o app com a cara da sua empresa"
      />

      <div className="flex flex-col gap-3">
        {PRICING_PLANS.map(function(p) {
          return <PlanCard key={p.id} plan={p} brand={brand} current={plan === p.id}/>;
        })}
      </div>

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

        <a href={waLink(wlMsg)} target="_blank" rel="noopener noreferrer"
          className="mt-1 text-center text-sm font-semibold px-4 py-3 rounded-xl text-white transition hover:opacity-90 min-h-[44px] flex items-center justify-center gap-2"
          style={{background: brand.color}}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.913z"/></svg>
          Quero meu app personalizado
        </a>
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
