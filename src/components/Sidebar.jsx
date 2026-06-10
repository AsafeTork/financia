import React from 'react';
import { NAV } from '../lib/constants.js';

export default function Sidebar({ view, onNav, brand, open, onClose, isAdmin }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={onClose}/>}
      <aside className={'fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ' + (open ? 'translate-x-0' : '-translate-x-full') + ' lg:translate-x-0'} style={{background:'#002f59'}}>
        <div className="px-5 py-5 flex items-center gap-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {brand.logo_url
            ? <img src={brand.logo_url} alt="logo" className="w-9 h-9 rounded-xl object-cover flex-shrink-0"/>
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:brand.color}}>
                <span className="text-white font-bold">{((brand.logo || 'F')[0])}</span>
              </div>
          }
          <span className="font-bold text-white truncate">{brand.name}</span>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.filter(function(v) { return !v.adminOnly || isAdmin; }).map(function(item) {
            var key = item.key, label = item.label, d = item.d;
            return (
              <button key={key} onClick={function() { onNav(key); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition w-full text-left relative"
                style={view === key ? {background:'rgba(255,255,255,0.08)', color:'white'} : {color:'rgba(255,255,255,0.4)'}}>
                {view === key && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{background:brand.color}}/>}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d}/></svg>
                {label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.2)'}}>v5.0</p>
        </div>
      </aside>
    </>
  );
}
