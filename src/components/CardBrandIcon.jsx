import React from 'react';

// Marca visual (logo simplificado) do cartao por bandeira. Sem imagens externas:
// desenha o mark da bandeira para o cliente reconhecer o cartao de relance.
var BRAND_STYLE = {
  visa:      { bg: '#1a1f71', label: 'VISA', italic: true },
  amex:      { bg: '#2e77bb', label: 'AMEX', italic: false },
  elo:       { bg: '#000000', label: 'elo', italic: false },
  hipercard: { bg: '#b3131b', label: 'Hiper', italic: false },
  diners:    { bg: '#0079be', label: 'Diners', italic: false },
  discover:  { bg: '#f76b1c', label: 'Disc', italic: false },
  jcb:       { bg: '#0b4ea2', label: 'JCB', italic: false },
  unionpay:  { bg: '#005bac', label: 'UPay', italic: false },
};

export default function CardBrandIcon({ brand }) {
  var b = String(brand || '').toLowerCase();
  var box = 'rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden';
  var dims = { width: 40, height: 28 };

  if (b === 'mastercard') {
    return (
      <div className={box} style={Object.assign({}, dims, { background: '#1a1a1a' })}>
        <svg width="34" height="22" viewBox="0 0 34 22" aria-label="Mastercard">
          <circle cx="13" cy="11" r="8" fill="#eb001b" />
          <circle cx="21" cy="11" r="8" fill="#f79e1b" fillOpacity="0.85" />
        </svg>
      </div>
    );
  }

  var st = BRAND_STYLE[b];
  if (st) {
    return (
      <div className={box} style={Object.assign({}, dims, { background: st.bg })} aria-label={st.label}>
        <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, fontStyle: st.italic ? 'italic' : 'normal' }}>{st.label}</span>
      </div>
    );
  }

  // Fallback: icone generico de cartao quando a bandeira nao e conhecida.
  return (
    <div className={box} style={Object.assign({}, dims, { background: '#475569' })} aria-label="Cartão">
      <svg width="20" height="20" fill="none" stroke="#ffffff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
    </div>
  );
}
