import React from 'react';
import { luminance } from '../lib/utils.js';

export default function Header({ brand, onMenuOpen, syncStatus }) {
  var dotColor = syncStatus === 'ok' ? '#22c55e' : syncStatus === 'error' ? '#ef4444' : '#94a3b8';
  var lum = luminance(brand.color || '#002f59');
  var textColor = lum > 0.4 ? '#111827' : '#ffffff';
  var overlayAlpha = lum > 0.4 ? '0.08' : '0.18';
  return (
    <header className="sticky top-0 z-20 lg:hidden shadow-sm" style={{background: brand.color}}>
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {brand.logo_url
            ? <img src={brand.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" style={{border:'2px solid rgba(0,0,0,0.15)'}}/>
            : <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(0,0,0,' + overlayAlpha + ')', border:'2px solid rgba(0,0,0,0.15)'}}>
                <span className="font-bold text-sm" style={{color: textColor}}>{(brand.logo || 'F')[0]}</span>
              </div>
          }
          <span className="font-semibold text-sm truncate" style={{color: textColor}}>{brand.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full" style={{background: dotColor}}/>
          <button onClick={onMenuOpen} className="p-2 rounded-xl" style={{background:'rgba(0,0,0,' + overlayAlpha + ')'}}>
            <svg className="w-4 h-4" fill="none" stroke={textColor} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
