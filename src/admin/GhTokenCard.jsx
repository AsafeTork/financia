import React, { useState } from 'react';
import { Card } from '../components/ui.jsx';

export default function GhTokenCard({ toast }) {
  const [tok, setTok] = useState(sessionStorage.getItem('nancia_gh_token') || '');
  const save = function() {
    const v = tok.trim();
    if (v) { sessionStorage.setItem('nancia_gh_token', v); toast('Token salvo!'); }
    else { sessionStorage.removeItem('nancia_gh_token'); toast('Token removido.'); }
  };
  return (
    <Card className="p-4 flex flex-col gap-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Token GitHub Actions</p>
      <div className="flex gap-2">
        <input type="password" value={tok} onChange={function(e) { setTok(e.target.value); }}
          placeholder="ghp_xxxxxxxxxxxx"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono flex-1 focus:outline-none focus:border-gray-400"/>
        <button onClick={save} className="px-4 py-2 text-white rounded-xl text-sm font-semibold flex-shrink-0" style={{background:'#002f59'}}>Salvar</button>
      </div>
      {!tok && <p className="text-xs font-semibold" style={{color:'#dc2626'}}>(!) Sem token - APK nao gerado.</p>}
      {tok  && <p className="text-xs text-green-600 font-semibold">Token configurado.</p>}
    </Card>
  );
}
