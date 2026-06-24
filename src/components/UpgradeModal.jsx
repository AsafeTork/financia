import React from 'react';
import { PRICING_PLANS, WHATSAPP, PLAN_KIND_LABEL } from '../lib/constants.js';
import { brandAlpha } from '../lib/utils.js';

var money = function(v) { return v === 0 ? 'R$ 0' : 'R$ ' + v.toFixed(2).replace('.', ','); };

export default function UpgradeModal({ reason, brand, onClose }) {
  var c = (brand && brand.color) || '#002f59';
  var plans = PRICING_PLANS.filter(function(p) { return p.id !== 'free'; });
  var waBase = 'https://wa.me/' + WHATSAPP + '?text=';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
      <div className="rounded-2xl w-full max-w-md flex flex-col anim-scale" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', maxHeight: '92vh' }}>

        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
                {reason ? 'Seu plano grátis chegou ao limite' : 'Desbloqueie tudo no Pro'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
                {reason
                  ? 'Você atingiu ' + reason.limit + ' ' + (PLAN_KIND_LABEL[reason.kind] || 'itens') + '. Faça upgrade para continuar sem limites.'
                  : 'Mais espaço, mais recursos e suporte para o seu negócio crescer.'}
              </p>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-3 overflow-y-auto">
          {plans.map(function(p) {
            var popular = !!p.popular;
            var wa = waBase + encodeURIComponent('Quero ativar o plano ' + p.name + ' do Financia.');
            return (
              <div key={p.id} className="rounded-2xl p-4" style={{ border: popular ? ('2px solid ' + c) : '1px solid var(--border)', background: popular ? brandAlpha(c, 0.05) : 'transparent' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{p.name}</span>
                    {popular && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: c }}>Recomendado</span>}
                  </div>
                  <span className="font-display font-semibold tabular" style={{ color: 'var(--text-main)' }}>{money(p.price)}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{p.period}</span></span>
                </div>
                <div className="flex flex-col gap-1.5 mb-3">
                  {p.features.slice(0, 4).map(function(f) {
                    return (
                      <div key={f} className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f9d6c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><path d="M5 13l4 4L19 7" /></svg>
                        <span className="text-xs" style={{ color: 'var(--text-sub)' }}>{f}</span>
                      </div>
                    );
                  })}
                </div>
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="block text-center text-sm font-semibold py-3 rounded-xl transition hover:opacity-90 min-h-[44px] flex items-center justify-center"
                  style={popular ? { background: c, color: '#fff' } : { border: '1px solid var(--border-md)', color: 'var(--text-main)' }}>
                  Quero o {p.name}
                </a>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 flex-shrink-0">
          <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-medium min-h-[44px] flex items-center justify-center transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
