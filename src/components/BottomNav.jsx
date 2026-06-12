import React from 'react';

var ITEMS = [
  { key: 'dashboard', label: 'Inicio',    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'income',    label: 'Vendas / Ganhos',    d: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { key: 'expense',   label: 'Saidas',    d: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
  { key: 'inventory', label: 'Estoque',   d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'settings',  label: 'Config',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function BottomNav({ view, onNav, brand }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
      style={{background:'var(--bg-page)', borderTop:'1px solid var(--border-color, #f1f5f9)', paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
      <div className="flex h-16">
        {ITEMS.map(function(item) {
          var active = view === item.key;
          return (
            <button key={item.key} onClick={function() { onNav(item.key); }}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0 pt-1"
              style={{color: active ? brand.color : '#94a3b8'}}>
              {active && (
                <div className="absolute top-0 left-1/2 w-5 h-0.5 rounded-b-full" style={{background: brand.color, transform:'translateX(-50%)'}}/>
              )}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.d}/>
              </svg>
              <span style={{fontSize: 10, fontWeight: active ? 600 : 400, lineHeight: '14px'}}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
