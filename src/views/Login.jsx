import React, { useState } from 'react';
import { Inp, Spin } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';

export default function Login({ brand }) {
  var [email, setEmail]     = useState('');
  var [pass, setPass]       = useState('');
  var [err, setErr]         = useState('');
  var [loading, setLoading] = useState(false);
  var [resetMode, setResetMode] = useState(false);
  var [resetEmail, setResetEmail] = useState('');
  var [resetSent, setResetSent] = useState(false);

  var resetPassword = async function() {
    if (!resetEmail) return;
    setLoading(true); setErr('');
    var res = await sb.auth.resetPasswordForEmail(resetEmail, { redirectTo: window.location.origin });
    setLoading(false);
    if (res.error) setErr('Erro ao enviar. Verifique o e-mail.');
    else setResetSent(true);
  };

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
    <div className="min-h-screen flex" style={{background:'var(--bg-page)'}}>

      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden" style={{background: brandColor}}>
        <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.12)', pointerEvents:'none'}}/>
        <div style={{position:'relative', zIndex:1}}>
          {brandLogo
            ? <img src={brandLogo} alt="logo" className="w-12 h-12 rounded-2xl object-cover" style={{border:'2px solid rgba(255,255,255,0.25)'}}/>
            : <img src="/icon-192.svg" alt="Financia" className="w-12 h-12"/>
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
              ? <img src={brandLogo} alt="logo" className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-lg" style={{border:'3px solid rgba(0,0,0,0.08)'}}/>
              : <img src="/icon-192.svg" alt="Financia" className="w-20 h-20 mx-auto"/>
            }
            <p className="font-extrabold text-2xl mt-4" style={{color: brandColor, letterSpacing:'-0.5px', fontFamily:'Inter, sans-serif'}}>{brandName}</p>
            <p className="text-xs mt-1.5 text-gray-400 tracking-wide uppercase" style={{fontSize:'10px', letterSpacing:'0.08em'}}>Gestao financeira</p>
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
            {!resetMode && (
          <button onClick={function() { setResetMode(true); setErr(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 text-right self-end -mt-2 mb-1">
            Esqueceu a senha?
          </button>
        )}
        {resetMode && !resetSent && (
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">Recuperar senha</p>
            <input type="email" value={resetEmail}
              onChange={function(e) { setResetEmail(e.target.value); }}
              placeholder="Seu e-mail" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"/>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2">
              <button onClick={function() { setResetMode(false); setErr(''); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">
                Voltar
              </button>
              <button onClick={resetPassword} disabled={loading || !resetEmail}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{background:'var(--brand,#002f59)'}}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </div>
          </div>
        )}
        {resetSent && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex flex-col gap-2 text-center">
            <p className="text-sm font-semibold text-green-700">Link enviado!</p>
            <p className="text-xs text-green-600">Verifique seu e-mail para redefinir a senha.</p>
            <button onClick={function() { setResetMode(false); setResetSent(false); setErr(''); }}
              className="text-xs text-gray-500 underline mt-1">Voltar ao login</button>
          </div>
        )}
        {!resetMode && !resetSent && (
          <button onClick={login} disabled={loading || !email || !pass}
            className="w-full text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition hover:opacity-90"
            style={{background: brandColor, marginTop:4}}>
            {loading ? <Spin white/> : 'Entrar'}
          </button>
        )}
          </div>

          <p className="text-center text-xs mt-10 text-gray-300">{brandName} . gestao financeira</p>
        </div>
      </div>
    </div>
  );
}
