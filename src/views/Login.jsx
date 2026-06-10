import React, { useState } from 'react';
import { Inp, Spin } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';

export default function Login({ brand }) {
  var [email, setEmail]     = useState('');
  var [pass, setPass]       = useState('');
  var [err, setErr]         = useState('');
  var [loading, setLoading] = useState(false);

  var brandColor  = (brand && brand.color)   || '#002f59';
  var brandName   = (brand && brand.name)    || 'Financia';
  var brandLogo   = (brand && brand.logo_url) || null;
  var brandLetter = (brand && brand.logo)    || 'F';

  var login = async function() {
    if (!email || !pass) return;
    setLoading(true); setErr('');
    var res = await sb.auth.signInWithPassword({email:email, password:pass});
    if (res.error) {
      if (res.error.message.indexOf('Invalid') !== -1) setErr('E-mail ou senha incorretos.');
      else setErr('Erro ao entrar. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{background:'#f0f4ff'}}>

      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden" style={{background: brandColor}}>
        <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.12)', pointerEvents:'none'}}/>
        <div style={{position:'relative', zIndex:1}}>
          {brandLogo
            ? <img src={brandLogo} alt="logo" className="w-12 h-12 rounded-2xl object-cover" style={{border:'2px solid rgba(255,255,255,0.25)'}}/>
            : <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.2)'}}>
                {brandLetter[0]}
              </div>
          }
          <p className="text-white font-bold text-2xl mt-4" style={{letterSpacing:'-0.5px'}}>{brandName}</p>
        </div>
        <div style={{position:'relative', zIndex:1}}>
          <svg width="48" height="40" viewBox="0 0 48 40" fill="none" style={{marginBottom:24, opacity:0.6}}>
            <rect x="0" y="22" width="12" height="18" rx="3" fill="white"/>
            <rect x="15" y="10" width="12" height="30" rx="3" fill="white"/>
            <rect x="30" y="14" width="12" height="26" rx="3" fill="white"/>
            <rect x="45" y="5" width="3" height="35" rx="1.5" fill="white" opacity="0.4"/>
          </svg>
          <p className="text-white text-3xl font-extrabold leading-tight" style={{letterSpacing:'-0.5px'}}>
            Gestao financeira<br/>
            <span style={{opacity:0.7}}>para seu negocio.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.6)'}}>
            Controle vendas, despesas e estoque<br/>em um so lugar — online e offline.
          </p>
        </div>
        <div style={{position:'relative', zIndex:1}}>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>Gestao financeira para pequenos negocios</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          <div className="lg:hidden text-center mb-10">
            {brandLogo
              ? <img src={brandLogo} alt="logo" className="w-14 h-14 rounded-2xl object-cover mx-auto" style={{border:'2px solid rgba(0,0,0,0.06)'}}/>
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mx-auto" style={{background: brandColor}}>
                  {brandLetter[0]}
                </div>
            }
            <p className="font-bold text-xl mt-3" style={{color: brandColor, letterSpacing:'-0.5px'}}>{brandName}</p>
            <p className="text-xs mt-1 text-gray-400">Gestao financeira para seu negocio</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900" style={{letterSpacing:'-0.5px'}}>Bem-vindo de volta</h2>
            <p className="text-sm text-gray-500 mt-1">Entre com seu e-mail e senha para continuar</p>
          </div>

          <div className="flex flex-col gap-4">
            <Inp label="E-mail" type="email" value={email}
              onChange={function(e) { setEmail(e.target.value); }}
              placeholder="seu@email.com"
              error={err && err.indexOf('E-mail') !== -1 ? err : ''}/>
            <Inp label="Senha" type="password" value={pass}
              onChange={function(e) { setPass(e.target.value); }}
              placeholder="Sua senha"
              onKeyDown={function(e) { if (e.key === 'Enter') login(); }}/>
            {err && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{background:'#fef2f2', border:'1px solid #fecaca'}}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <p className="text-xs font-medium text-red-600">{err}</p>
              </div>
            )}
            <button onClick={login} disabled={loading || !email || !pass}
              className="w-full text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition hover:opacity-90"
              style={{background: brandColor, marginTop:4}}>
              {loading ? <Spin white/> : 'Entrar'}
            </button>
            <button className="text-xs text-gray-400 hover:text-gray-600 text-center mt-1" type="button">
              Esqueceu a senha?
            </button>
          </div>

          <p className="text-center text-xs mt-10 text-gray-300">{brandName} . gestao financeira</p>
        </div>
      </div>
    </div>
  );
}
