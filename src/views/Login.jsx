import React, { useState } from 'react';
import { Inp, Spin } from '../components/ui.jsx';
import { signIn, sendPasswordReset, signUp, signInWithGoogle } from '../lib/auth.js';
import { passwordStrength, validPhone, maskPhone, safe } from '../lib/utils.js';

var ACCENT = '#0f9d6c';

function GoogleBtn({ onClick, loading, label }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-50"
      style={{ border: '1px solid #e2e8f0', color: '#1f2937', background: '#fff' }}>
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
      {label}
    </button>
  );
}

export default function Login({ brand }) {
  var [mode, setMode] = useState('login');
  var [email, setEmail] = useState('');
  var [pass, setPass] = useState('');
  var [suName, setSuName] = useState('');
  var [suEmail, setSuEmail] = useState('');
  var [suPhone, setSuPhone] = useState('');
  var [suPass, setSuPass] = useState('');
  var [err, setErr] = useState('');
  var [loading, setLoading] = useState(false);
  var [signupDone, setSignupDone] = useState(false);
  var [resetMode, setResetMode] = useState(false);
  var [resetEmail, setResetEmail] = useState('');
  var [resetSent, setResetSent] = useState(false);

  var brandColor = (brand && brand.color) || '#002f59';
  var brandName = (brand && brand.name) || 'Financia';
  var brandLogo = (brand && brand.logo_url) || null;
  var pwSt = passwordStrength(suPass);

  var switchMode = function(m) { setMode(m); setErr(''); setResetMode(false); setResetSent(false); setSignupDone(false); };

  var login = async function() {
    if (!email || !pass) return;
    setLoading(true); setErr('');
    try {
      var res = await signIn(email, pass);
      if (res.error) setErr(res.error.message.indexOf('Invalid') !== -1 ? 'E-mail ou senha incorretos.' : 'Erro ao entrar. Tente novamente.');
    } catch (e) { setErr('Erro de conexão. Verifique sua internet.'); }
    finally { setLoading(false); }
  };

  var doSignup = async function() {
    if (!suName.trim()) { setErr('Informe o nome da empresa ou o seu nome.'); return; }
    if (!suEmail.trim()) { setErr('Informe o e-mail.'); return; }
    if (!validPhone(suPhone)) { setErr('Informe um telefone válido com DDD.'); return; }
    if (pwSt.score < 2) { setErr('Escolha uma senha mais forte (8+ caracteres, com números e letras).'); return; }
    setLoading(true); setErr('');
    try {
      var res = await signUp(suEmail.trim(), suPass, { name: safe(suName), phone: suPhone.replace(/\D/g, '') });
      if (res.error) {
        setErr(res.error.message.indexOf('already') !== -1 ? 'Já existe uma conta com este e-mail.' : 'Não foi possível criar a conta. Tente novamente.');
      } else if (!(res.data && res.data.session)) {
        setSignupDone(true);
      }
    } catch (e) { setErr('Erro de conexão. Verifique sua internet.'); }
    finally { setLoading(false); }
  };

  var doGoogle = async function() {
    setErr('');
    try {
      var res = await signInWithGoogle();
      if (res && res.error) setErr('Login com Google indisponível no momento.');
    } catch (e) { setErr('Login com Google indisponível no momento.'); }
  };

  var resetPassword = async function() {
    if (!resetEmail) return;
    setLoading(true); setErr('');
    var res = await sendPasswordReset(resetEmail);
    setLoading(false);
    if (res.error) setErr('Erro ao enviar. Verifique o e-mail.');
    else setResetSent(true);
  };

  var onSubmit = function(e) {
    e.preventDefault();
    if (resetMode) { if (!resetSent) resetPassword(); return; }
    if (mode === 'login') login(); else doSignup();
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#fbfaf7' }}>

      {/* Painel de marca */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden" style={{ background: brandColor }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(90% 70% at 80% 10%, rgba(255,255,255,0.12), transparent 55%)' }} />
        <div className="relative">
          {brandLogo
            ? <img src={brandLogo} alt="logo" className="w-12 h-12 rounded-2xl object-cover" style={{ border: '2px solid rgba(255,255,255,0.25)' }} />
            : <img src="/icon-192.svg" alt="" className="w-12 h-12" />}
          <p className="font-display text-white font-semibold text-2xl mt-4" style={{ letterSpacing: '-0.3px' }}>{brandName}</p>
        </div>
        <div className="relative">
          <p className="font-display text-white font-semibold" style={{ fontSize: '2.25rem', lineHeight: 1.1, letterSpacing: '-1px' }}>
            O controle do seu negócio começa aqui.
          </p>
          <div className="mt-7 flex flex-col gap-3">
            {['Vendas, despesas e estoque num app só', 'Funciona offline, sincroniza sozinho', 'Relatórios que mostram o seu lucro'].map(function(t) {
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{t}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="relative text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Gestão financeira para pequenos negócios</p>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          <div className="lg:hidden text-center mb-8">
            {brandLogo
              ? <img src={brandLogo} alt="logo" className="w-16 h-16 rounded-2xl object-cover mx-auto" style={{ border: '3px solid rgba(0,0,0,0.06)' }} />
              : <img src="/icon-192.svg" alt="" className="w-16 h-16 mx-auto" />}
            <p className="font-display font-semibold text-2xl mt-3" style={{ color: brandColor, letterSpacing: '-0.3px' }}>{brandName}</p>
          </div>

          {/* Abas */}
          <div className="flex p-1 rounded-2xl mb-7" style={{ background: '#f1efe9' }}>
            {[['login', 'Entrar'], ['signup', 'Criar conta']].map(function(t) {
              var active = mode === t[0] && !resetMode;
              return (
                <button key={t[0]} type="button" onClick={function() { switchMode(t[0]); }}
                  className={'flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition' + (active ? '' : ' hover:text-gray-600')}
                  style={active ? { background: '#fff', color: brandColor, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#7a8794' }}>
                  {t[1]}
                </button>
              );
            })}
          </div>

          {signupDone ? (
            <div className="anim-scale p-5 rounded-2xl text-center flex flex-col gap-2" style={{ background: 'rgba(15,157,108,0.08)', border: '1px solid rgba(15,157,108,0.25)' }}>
              <p className="font-display text-lg font-semibold" style={{ color: ACCENT }}>Conta criada!</p>
              <p className="text-sm" style={{ color: '#4b5563' }}>Enviamos um e-mail de confirmação para <b>{suEmail}</b>. Confirme para entrar.</p>
              <button type="button" onClick={function() { switchMode('login'); }} className="text-xs underline mt-1 min-h-[44px] inline-flex items-center justify-center self-center hover:text-gray-800" style={{ color: '#6b7280' }}>Voltar para entrar</button>
            </div>
          ) : resetMode ? (
            resetSent ? (
              <div className="anim-scale p-5 rounded-2xl text-center flex flex-col gap-2" style={{ background: 'rgba(15,157,108,0.08)', border: '1px solid rgba(15,157,108,0.25)' }}>
                <p className="font-semibold text-sm" style={{ color: ACCENT }}>Link enviado!</p>
                <p className="text-xs" style={{ color: '#4b5563' }}>Verifique seu e-mail para redefinir a senha.</p>
                <button type="button" onClick={function() { switchMode('login'); }} className="text-xs underline mt-1 min-h-[44px] inline-flex items-center justify-center self-center hover:text-gray-800" style={{ color: '#6b7280' }}>Voltar ao login</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <h2 className="font-display text-2xl font-semibold" style={{ color: '#111827', letterSpacing: '-0.5px' }}>Recuperar senha</h2>
                <Inp label="E-mail" type="email" value={resetEmail} onChange={function(e) { setResetEmail(e.target.value); }} placeholder="seu@email.com" />
                {err && <p className="text-xs text-red-500">{err}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={function() { switchMode('login'); }} className="flex-1 min-h-[44px] py-3 rounded-xl border text-sm text-gray-600 flex items-center justify-center gap-1.5 transition hover:bg-gray-50" style={{ borderColor: '#e2e8f0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
                    Voltar
                  </button>
                  <button disabled={loading || !resetEmail} className="flex-1 min-h-[44px] py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition hover:opacity-90" style={{ background: brandColor }}>{loading ? 'Enviando...' : 'Enviar link'}</button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <h2 className="font-display text-2xl font-semibold" style={{ color: '#111827', letterSpacing: '-0.5px' }}>
                {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta grátis'}
              </h2>

              <GoogleBtn onClick={doGoogle} loading={loading} label={mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'} />

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: '#e8e4db' }} />
                <span className="text-xs" style={{ color: '#9aa5b1' }}>ou</span>
                <div className="flex-1 h-px" style={{ background: '#e8e4db' }} />
              </div>

              {mode === 'signup' && (
                <Inp label="Nome da empresa ou seu nome" value={suName} onChange={function(e) { setSuName(e.target.value); }} placeholder="Ex: Padaria do João" />
              )}

              <Inp label="E-mail" type="email"
                value={mode === 'login' ? email : suEmail}
                onChange={function(e) { (mode === 'login' ? setEmail : setSuEmail)(e.target.value); }}
                placeholder="seu@email.com" />

              {mode === 'signup' && (
                <Inp label="Telefone (com DDD)" type="tel" value={suPhone}
                  onChange={function(e) { setSuPhone(maskPhone(e.target.value)); }}
                  placeholder="(11) 91234-5678" />
              )}

              <div>
                <Inp label="Senha" type="password"
                  value={mode === 'login' ? pass : suPass}
                  onChange={function(e) { (mode === 'login' ? setPass : setSuPass)(e.target.value); }}
                  placeholder={mode === 'login' ? 'Sua senha' : 'Crie uma senha forte'} />
                {mode === 'signup' && suPass.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#eceae3' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: pwSt.pct + '%', background: pwSt.color }} />
                    </div>
                    <p className="text-xs mt-1 font-medium" style={{ color: pwSt.color }}>Senha {pwSt.label.toLowerCase()}</p>
                  </div>
                )}
              </div>

              {err && (
                <div className="anim-up flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  <p className="text-xs font-medium text-red-600">{err}</p>
                </div>
              )}

              {mode === 'login' && (
                <button type="button" onClick={function() { setResetMode(true); setErr(''); }} className="text-xs self-end -mt-1 min-h-[44px] inline-flex items-center hover:text-gray-700" style={{ color: '#7a8794' }}>Esqueceu a senha?</button>
              )}

              <button disabled={loading} className="w-full text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition hover:opacity-90" style={{ background: brandColor }}>
                {loading ? <Spin white /> : (mode === 'login' ? 'Entrar' : 'Criar conta grátis')}
              </button>

              {mode === 'signup' && (
                <p className="text-xs text-center leading-relaxed" style={{ color: '#9aa5b1' }}>Ao criar a conta você concorda em usar o Financia para o seu negócio.</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
