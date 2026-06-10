import React, { useState } from 'react';
import { Inp, Spin } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';

const SVG_DESKTOP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="48" height="48"><rect x="2" y="52" width="22" height="46" rx="4" fill="#ffffff" fill-opacity="0.3"/><rect x="31" y="22" width="22" height="76" rx="4" fill="#6ec6c8"/><rect x="60" y="2" width="22" height="96" rx="4" fill="#8cf2d1"/><path d="M82 28 L62 20 L38 54 L26 43 L18 51 L38 71 L82 28Z" fill="#ffffff"/></svg>';
const SVG_MOBILE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="44" height="44" style="display:inline-block"><rect x="2" y="52" width="22" height="46" rx="4" fill="#002f59"/><rect x="31" y="22" width="22" height="76" rx="4" fill="#1a6b5c"/><rect x="60" y="2" width="22" height="96" rx="4" fill="#6ec6c8"/><path d="M82 28 L62 20 L38 54 L26 43 L18 51 L38 71 L82 28Z" fill="#8cf2d1"/></svg>';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async function() {
    if (!email || !pass) return;
    setLoading(true); setErr('');
    const res = await sb.auth.signInWithPassword({email:email, password:pass});
    if (res.error) {
      if (res.error.message.includes('Invalid')) setErr('E-mail ou senha incorretos.');
      else setErr('Erro ao entrar. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{background:'#f0f4ff'}}>
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12" style={{background:'#002f59'}}>
        <div>
          <div dangerouslySetInnerHTML={{__html:SVG_DESKTOP}}/>
          <p className="text-white font-bold text-2xl mt-3" style={{letterSpacing:'-0.5px'}}>Financia</p>
        </div>
        <div>
          <p className="text-white text-3xl font-bold leading-tight" style={{letterSpacing:'-0.5px'}}>Gestao financeira<br/><span style={{color:'#8cf2d1'}}>inteligente</span> para<br/>seu negocio.</p>
          <p className="mt-4 text-sm" style={{color:'#6ec6c8'}}>Controle vendas, despesas e estoque<br/>em um so lugar - online e offline.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full" style={{background:'#8cf2d1'}}/>
          <div className="w-2 h-2 rounded-full" style={{background:'#6ec6c8', opacity:0.4}}/>
          <div className="w-2 h-2 rounded-full" style={{background:'#6ec6c8', opacity:0.4}}/>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xs">
          <div className="lg:hidden text-center mb-10">
            <div dangerouslySetInnerHTML={{__html:SVG_MOBILE}}/>
            <p className="font-bold text-xl mt-2" style={{color:'#002f59', letterSpacing:'-0.5px'}}>Financia</p>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{color:'#002f59', letterSpacing:'-0.5px'}}>Bem-vindo</h2>
          <p className="text-sm mb-8" style={{color:'#64748b'}}>Entre com seu e-mail e senha</p>
          <div className="flex flex-col gap-4">
            <Inp label="E-mail" type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="seu@email.com"/>
            <Inp label="Senha" type="password" value={pass} onChange={function(e) { setPass(e.target.value); }} placeholder="..." onKeyDown={function(e) { if (e.key === 'Enter') login(); }}/>
            {err && <p className="text-xs font-medium px-1" style={{color:'#dc2626'}}>{err}</p>}
            <button onClick={login} disabled={loading || !email || !pass}
              className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{background:'#002f59', marginTop:4}}>
              {loading ? <Spin white/> : 'Entrar'}
            </button>
          </div>
          <p className="text-center text-xs mt-8" style={{color:'#94a3b8'}}>Financia . gestao financeira</p>
        </div>
      </div>
    </div>
  );
}
