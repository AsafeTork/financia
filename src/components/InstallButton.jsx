import React from 'react';
import { onInstallAvailable, promptInstall } from '../lib/pwa.js';

// Botao de instalacao do PWA. So aparece quando o navegador sinaliza que o app
// e instalavel e ainda nao foi instalado — util para quem fechou o aviso inicial.
export default function InstallButton({ brand }) {
  var st = React.useState(false);
  var available = st[0];
  var setAvailable = st[1];
  React.useEffect(function() {
    var off = onInstallAvailable(function(ok) { setAvailable(ok); });
    return off;
  }, []);
  if (!available) return null;
  var color = (brand && brand.color) || 'var(--brand)';
  return (
    <button onClick={function() { promptInstall(); }}
      className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition hover:opacity-80 min-h-[44px]"
      style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--brand-soft)'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{color:'var(--text-main)'}}>Instalar aplicativo</p>
        <p className="text-xs truncate" style={{color:'var(--text-sub)'}}>Acesso rápido e uso offline no aparelho</p>
      </div>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--text-sub)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
    </button>
  );
}
