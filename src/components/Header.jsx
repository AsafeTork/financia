import React from 'react';

export default function Header({ brand, onMenuOpen }) {
  return (
    <header className="sticky top-0 z-20 lg:hidden" style={{background: brand.color}}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {brand.logo_url
            ? <img src={brand.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0"/>
            : <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(255,255,255,0.2)'}}>
                <span className="text-white font-bold text-sm">{(brand.logo || 'F')[0]}</span>
              </div>
          }
          <span className="font-bold text-white text-sm truncate">{brand.name}</span>
        </div>
        <button onClick={onMenuOpen} className="flex-shrink-0 p-2 rounded-xl" style={{background:'rgba(255,255,255,0.15)'}}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
