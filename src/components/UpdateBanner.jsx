import React, { useState, useEffect } from 'react';
import { onSWUpdate, applyUpdate } from '../lib/pwa.js';

export default function UpdateBanner({ brand }) {
  var [state, setState] = useState(null);
  var [applying, setApplying] = useState(false);

  useEffect(function() {
    var off = onSWUpdate(function(s) { setState(s); });
    return off;
  }, []);

  if (!state) return null;

  var c = (brand && brand.color) || '#002f59';
  var ready = state.status === 'ready';
  var pct = ready ? 100 : (state.pct || 10);

  function update() { setApplying(true); applyUpdate(); }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] p-3 flex justify-center anim-down" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
      <div className="w-full max-w-md rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brand-soft)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              {ready ? 'Atualização pronta' : 'Baixando atualização...'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
              {ready ? 'Uma nova versão está disponível.' : 'Aguarde, salvando no aparelho.'}
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--brand-soft)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: pct + '%', background: c }}/>
        </div>

        {ready && (
          <button onClick={update} disabled={applying}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition hover:opacity-90 disabled:opacity-50 min-h-[44px]"
            style={{ background: c }}>
            {applying ? 'Atualizando...' : 'Atualizar agora'}
          </button>
        )}
      </div>
    </div>
  );
}
