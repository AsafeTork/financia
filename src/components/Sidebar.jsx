import React from 'react';
import { NAV } from '../lib/constants.js';

export default function Sidebar({ view, onNav, brand, open, onClose, isAdmin, session }) {
  var email = session && session.user ? session.user.email : '';
  var navItems = NAV.filter(function(v) { return !v.adminOnly || isAdmin; });
  var mainItems = navItems.filter(function(v) { return v.key !== 'settings'; });
  var settingsItem = navItems.find(function(v) { return v.key === 'settings'; });

  function NavBtn(item) {
    var active = view === item.key;
    return (
      <button key={item.key} onClick={function() { onNav(item.key); onClose(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition w-full text-left relative"
        style={active
          ? {background: 'rgba(255,255,255,0.12)', color: 'white', borderLeft: '3px solid white', paddingLeft: 9}
          : {color: 'rgba(255,255,255,0.5)', paddingLeft: 12}}>
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={item.d}/>
        </svg>
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={onClose}/>}
      <aside
        className={'fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ' + (open ? 'translate-x-0' : '-translate-x-full') + ' lg:translate-x-0'}
        style={{background: brand.color || '#0f1c2e'}}>

        <div className="px-5 py-5 flex items-center gap-3" style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          {brand.logo_url
            ? <img src={brand.logo_url} alt="logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" style={{border:'2px solid rgba(255,255,255,0.2)'}}/>
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.2)'}}>
                <span className="text-white font-bold">{(brand.logo || 'F')[0]}</span>
              </div>
          }
          <div className="min-w-0">
            <p className="font-bold text-white truncate text-sm">{brand.name}</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>Painel financeiro</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {mainItems.map(NavBtn)}
        </nav>

        <div className="px-3 pb-3" style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:12}}>
          {settingsItem && NavBtn(settingsItem)}
        </div>

        {email && (
          <div className="px-5 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-xs truncate" style={{color:'rgba(255,255,255,0.3)'}}>{email}</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.15)'}}>Financia v5</p>
          </div>
        )}
      </aside>
    </>
  );
}
