import React from 'react';
import { formatCardLabel } from '../lib/stripe.js';

// Previsualizacao SEGURA do cartao salvo: bandeira + 4 finais + validade.
// Nunca recebe nem exibe o numero completo (a Stripe so devolve os 4 finais).
export default function CardPreview({ card, brand }) {
  if (!card || !card.brand || !card.last4) return null;
  var color = (brand && brand.color) || '#002f59';
  var label = formatCardLabel(card);
  var exp = '';
  if (card.exp_month && card.exp_year) {
    var mm = String(card.exp_month).padStart(2, '0');
    var yy = String(card.exp_year).slice(-2);
    exp = mm + '/' + yy;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
      <div className="w-10 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: color }}>
        <svg className="w-5 h-5" fill="none" stroke="#ffffff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{label}</p>
        {exp && <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Validade {exp}</p>}
      </div>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
    </div>
  );
}
