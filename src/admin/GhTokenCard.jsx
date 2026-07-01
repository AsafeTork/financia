import React, { useState } from 'react';
import { Card } from '../components/ui.jsx';

export default function GhTokenCard({ toast }) {
  const [tok, setTok] = useState(localStorage.getItem('nancia_gh_token') || '');
  const save = function() {
    const v = tok.trim();
    if (v) { localStorage.setItem('nancia_gh_token', v); toast('Token salvo!'); }
    else { localStorage.removeItem('nancia_gh_token'); toast('Token removido.'); }
  };
  return (
    <Card className="p-4 flex flex-col gap-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Token GitHub Actions</p>
      <form onSubmit={function(e) { e.preventDefault(); save(); }} className="flex gap-2">
        <input type="password" value={tok} onChange={function(e) { setTok(e.target.value); }}
          placeholder="ghp_xxxxxxxxxxxx"
          autoComplete="off"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono flex-1 focus:outline-none focus:border-gray-400" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
        <button type="submit" className="px-4 min-h-[44px] text-white rounded-xl text-sm font-semibold flex-shrink-0 hover:opacity-90" style={{background:'#002f59'}}>Salvar</button>
      </form>
      {!tok && (
        <p className="text-xs font-semibold flex items-center gap-1.5" style={{color:'#dc2626'}}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          Sem token - APK não gerado.
        </p>
      )}
      {tok && (
        <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          Token configurado.
        </p>
      )}
    </Card>
  );
}
