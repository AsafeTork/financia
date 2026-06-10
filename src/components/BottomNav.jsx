import React from 'react';

var ITEMS = [
  { key: 'dashboard', label: 'Inicio',  d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'income',    label: 'Vendas',  d: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { key: 'expense',   label: 'Saidas',  d: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
  { key: 'inventory', label: 'Estoque', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'settings',  label: 'Mais',    d: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
];

var OVERFLOW_KEYS = ['settings', 'email', 'report'];

export default function BottomNav({ view, onNav, brand }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
      style={{background:'var(--bg-page)', borderTop:'1px solid var(--border-color, #f1f5f9)', paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
      <div className="flex">
        {ITEMS.map(function(item) {
          var isOverflow = OVERFLOW_KEYS.indexOf(item.key) !== -1;
          var active = view === item.key || (isOverflow && OVERFLOW_KEYS.indexOf(view) !== -1);
          return (
            <button key={item.key} onClick={function() { onNav(item.key); }}
              className="relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors min-w-0"
              style={{color: active ? brand.color : '#94a3b8'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.d}/>
              </svg>
              <span style={{fontSize: 10, fontWeight: active ? 600 : 400, lineHeight: '14px'}}>{item.label}</span>
              {active && (
                <div className="absolute bottom-0 w-6 h-0.5 rounded-t-full" style={{background: brand.color}}/>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
