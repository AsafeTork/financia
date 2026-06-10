import React from 'react';
import { isUrl } from '../lib/utils.js';

export default function LogoImg({ logo, logoUrl, color, sz, rd }) {
  const src = logoUrl || (isUrl(logo) ? logo : null);
  const size = sz || 'w-9 h-9';
  const rnd = rd !== undefined ? rd : 'rounded-xl';
  return (
    <div className={size + ' ' + rnd + ' overflow-hidden flex items-center justify-center flex-shrink-0'} style={{background:color || '#002f59'}}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-contain"/>
        : <span className="text-white font-bold" style={{fontSize:'0.85em'}}>{((logo || 'F')[0]).toUpperCase()}</span>
      }
    </div>
  );
}
