import React from 'react';
import { formatCardLabel } from '../lib/stripe.js';
import CardBrandIcon from './CardBrandIcon.jsx';

// Previsualizacao SEGURA do cartao salvo: logo da bandeira + 4 finais + validade.
// Nunca recebe nem exibe o numero completo (a Stripe so devolve os 4 finais).
export default function CardPreview({ card }) {
  if (!card || !card.brand || !card.last4) return null;
  var label = formatCardLabel(card);
  var exp = '';
  if (card.exp_month && card.exp_year) {
    var mm = String(card.exp_month).padStart(2, '0');
    var yy = String(card.exp_year).slice(-2);
    exp = mm + '/' + yy;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
      <CardBrandIcon brand={card.brand} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{label}</p>
        {exp && <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Validade {exp}</p>}
      </div>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
    </div>
  );
}
