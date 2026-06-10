import React from 'react';
import { NAV } from '../lib/constants.js';

export default function Sidebar({ view, onNav, brand, open, onClose, isAdmin }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={onClose}/>}
      <aside
        className={'fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ' + (open ? 'translate-x-0' : '-translate-x-full') + ' lg:translate-x-0'}
        style={{background:'#0f1c2e'}}>
        <div className="px-5 py-5 flex items-center gap-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {brand.logo_url
            ? <img src={brand.logo_url} alt="logo" className="w-9 h-9 rounded-xl object-cover flex-shrink-0"/>
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{background: brand.color}}>
                <span className="text-white font-bold">{(brand.logo || 'F')[0]}</span>
              </div>
          }
          <div className="min-w-0">
            <p className="font-bold text-white truncate text-sm">{brand.name}</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>Painel financeiro</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.filter(function(v) { return !v.adminOnly || isAdmin; }).map(function(item) {
            var active = view === item.key;
            return (
              <button key={item.key} onClick={function() { onNav(item.key); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition w-full text-left"
                style={active
                  ? {background: 'rgba(255,255,255,0.07)', color: 'white'}
                  : {color: 'rgba(255,255,255,0.38)'}}>
                {active && (
                  <div className="absolute left-3 w-0.5 h-5 rounded-r-full" style={{background: brand.color, marginLeft:'-12px'}}/>
                )}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={item.d}/>
                </svg>
                <span className="truncate">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: brand.color}}/>}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.15)'}}>Financia v5 . gestao financeira</p>
        </div>
      </aside>
    </>
  );
}
