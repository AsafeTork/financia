import React from 'react';

export default function SyncBadge({ status }) {
  if (status === 'idle') return null;
  const cfgMap = {
    syncing: { bg: '#2563eb', text: 'Sincronizando...', icon: '~' },
    ok:      { bg: '#1a6b5c', text: 'Sincronizado',     icon: 'OK' },
    error:   { bg: '#dc2626', text: 'Sem internet',     icon: '(!)' },
  };
  const cfg = cfgMap[status];
  if (!cfg) return null;
  return (
    <div style={{position:'fixed',top:8,right:8,zIndex:9999,background:cfg.bg,color:'#fff',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:4,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
      <span style={{display:'inline-block',animation:status === 'syncing' ? 'spin 1s linear infinite' : 'none'}}>{cfg.icon}</span>
      {cfg.text}
    </div>
  );
}
