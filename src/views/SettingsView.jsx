import React, { useState } from 'react';
import { Card, Inp, Spin, PageHead } from '../components/ui.jsx';
import PhoneInput, { parsePhone, buildPhone } from '../components/PhoneInput.jsx';
import { updatePassword, signOut as doSignOut } from '../lib/auth.js';
import { effectivePlan, PRICING_PLANS, waLink, SUPPORT_EMAIL } from '../lib/constants.js';
import AdminPanel from '../admin/AdminPanel.jsx';
import GhTokenCard from '../admin/GhTokenCard.jsx';

export default function SettingsView({ brand, session, planInfo, onSave, onSavePhone, toast, confirm, isAdmin, onNav }) {
  var [tab, setTab] = useState(isAdmin ? 'clients' : 'security');
  var [pwForm, setPwForm] = useState({newPw:'', confirm:''});
  var [pwSaving, setPwSaving] = useState(false);
  var [phoneData, setPhoneData] = useState(function() { var p = parsePhone(brand.phone); return buildPhone(p.iso, p.digits); });
  var [phoneSaving, setPhoneSaving] = useState(false);
  var initParsed = parsePhone(brand.phone);
  var initE164 = buildPhone(initParsed.iso, initParsed.digits).e164;
  React.useEffect(function() {
    if (isAdmin && tab === 'security') {
      setTab('clients');
    } else if (!isAdmin && tab === 'clients') {
      setTab('security');
    }
  }, [isAdmin]);

  const savePhone = async function() {
    setPhoneSaving(true);
    await onSavePhone(phoneData.e164);
    setPhoneSaving(false);
  };

  const changePw = async function() {
    if (pwForm.newPw !== pwForm.confirm) { toast('As senhas não coincidem.', 'error'); return; }
    if (pwForm.newPw.length < 8) { toast('Senha deve ter ao menos 8 caracteres.', 'error'); return; }
    setPwSaving(true);
    const res = await updatePassword(pwForm.newPw);
    if (res.error) toast('Erro ao alterar senha.', 'error');
    else { toast('Senha alterada!'); setPwForm({newPw:'', confirm:''}); }
    setPwSaving(false);
  };

  var hasWhiteLabel = !!(brand && brand.white_label);
  var [appForm, setAppForm] = useState(function() {
    return { color: brand.color || '#002f59', color_secondary: brand.color_secondary || '', logo_url: brand.logo_url || '' };
  });
  var [appSaving, setAppSaving] = useState(false);
  var onLogoFile = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) { toast('Imagem muito grande (máx. 512KB).', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function() { setAppForm(function(f) { return Object.assign({}, f, { logo_url: String(reader.result) }); }); };
    reader.readAsDataURL(file);
  };
  var setAppField = function(key, value) {
    setAppForm(function(f) { var o = Object.assign({}, f); o[key] = value; return o; });
  };
  var saveAppearance = async function() {
    setAppSaving(true);
    var nb = Object.assign({}, brand, { color: appForm.color, color_secondary: appForm.color_secondary || null, logo_url: appForm.logo_url || null });
    await onSave(nb);
    setAppSaving(false);
  };
  var devMsg = 'Olá! Tenho o pacote de personalização e quero gerar o APK customizado do meu app.';

  const allTabs = [{key:'security',label:'Segurança'},{key:'account',label:'Conta'}];
  if (hasWhiteLabel) allTabs.push({key:'appearance',label:'Aparência'});
  allTabs.push({key:'clients',label:'Clientes',adminOnly:true});
  const tabs = allTabs.filter(function(t) { return !t.adminOnly || isAdmin; });

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        title="Configurações"
        sub="Aparência, segurança e conta"
      />

      {onNav && (function() {
        var planId = effectivePlan(planInfo || {});
        var planMeta = PRICING_PLANS.filter(function(p) { return p.id === planId; })[0] || PRICING_PLANS[0];
        return (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'var(--brand-soft)', border:'1px solid var(--border)'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{color:'var(--text-main)'}}>{brand.name}</p>
                <p className="text-xs" style={{color:'var(--text-sub)'}}>Plano atual</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white flex-shrink-0" style={{background: brand.color}}>{planMeta.name}</span>
            </div>
            <button onClick={function() { onNav('planos'); }}
              className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2 transition hover:opacity-80 min-h-[44px]"
              style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: brand.color}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"/></svg>
              </div>
              <span className="text-sm font-semibold flex-1" style={{color:'var(--text-main)'}}>Gerenciar plano</span>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--text-sub)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        );
      })()}

      <div className="flex border-b" style={{borderColor:'var(--border)'}}>
        {tabs.map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              className={'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ' + (active ? 'text-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600')}
              style={active ? {borderColor: brand.color, color: brand.color} : {}}>
              {t.label}
            </button>
          );
        })}
      </div>
{tab === 'security' && (
        <Card className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold mb-1" style={{color:'var(--text-main)'}}>Alterar senha</p>
            <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>Use uma senha forte com letras, números e símbolos.</p>
            <div className="flex flex-col gap-3">
              <Inp label="Nova senha" type="password" value={pwForm.newPw} onChange={function(e) { setPwForm(function(f) { return Object.assign({}, f, {newPw:e.target.value}); }); }} placeholder="Mínimo 8 caracteres" hint={pwForm.newPw.length > 0 && pwForm.newPw.length < 8 ? 'Muito curta' : ''}/>
              <Inp label="Confirmar senha" type="password" value={pwForm.confirm} onChange={function(e) { setPwForm(function(f) { return Object.assign({}, f, {confirm:e.target.value}); }); }} placeholder="Repita a senha" hint={pwForm.confirm && pwForm.newPw !== pwForm.confirm ? 'Senhas diferentes' : ''}/>
              <button onClick={changePw} disabled={pwSaving || !pwForm.newPw || !pwForm.confirm} className="w-full text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40" style={{background:brand.color}}>
                {pwSaving ? <Spin white/> : 'Alterar senha'}
              </button>
            </div>
          </div>
          <div className="border-t pt-4" style={{borderColor:'var(--border)'}}>
            <p className="text-sm font-semibold mb-2" style={{color:'var(--text-main)'}}>Segurança do sistema</p>
            {['Dados criptografados no Supabase','Cada usuário acessa apenas seus dados (RLS)','Conexão sempre via HTTPS','Sessão expira automaticamente','Nunca compartilhe sua senha'].map(function(s, i) {
              return (
                <div key={i} className="flex items-center gap-2.5 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#dcfce7'}}>
                    <svg className="w-3 h-3" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p className="text-sm" style={{color:'var(--text-sub)'}}>{s}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'account' && (
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{background:'var(--bg-subtle)'}}>
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden" style={{background:brand.color}}>
              {brand.logo_url
                ? <img src={brand.logo_url} alt="logo" className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{brand.name ? brand.name[0].toUpperCase() : (session && session.user && session.user.email ? session.user.email[0].toUpperCase() : 'U')}</div>
              }
            </div>
            <div className="min-w-0"><p className="text-sm font-semibold truncate" style={{color:'var(--text-main)'}}>{brand.name || (session && session.user ? session.user.email : '')}</p><p className="text-xs truncate" style={{color:'var(--text-sub)'}}>{session && session.user ? session.user.email : 'Usuário ativo'}</p></div>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label:'Alterar senha', desc:'Defina uma nova senha de acesso', icon:'M8 11V7a4 4 0 118 0v4m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z', act:function() { setTab('security'); } },
              { label:'Gerenciar forma de pagamento', desc:'Cartão e cobrança da assinatura', icon:'M3 10h18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z', act:function() { if (onNav) onNav('planos'); } },
              { label:'Alterar plano', desc:'Compare e troque de plano', icon:'M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z', act:function() { if (onNav) onNav('planos'); } },
            ].map(function(a) {
              return (
                <button key={a.label} onClick={a.act}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition hover:opacity-80 min-h-[44px]"
                  style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--brand-soft)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon}/></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{color:'var(--text-main)'}}>{a.label}</p>
                    <p className="text-xs truncate" style={{color:'var(--text-sub)'}}>{a.desc}</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--text-sub)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            <PhoneInput label="Atualizar número de telefone" value={brand.phone || ''} onChange={setPhoneData}/>
            <button onClick={savePhone} disabled={phoneSaving || !phoneData.valid || phoneData.e164 === initE164} className="w-full mt-3 text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40 min-h-12" style={{background:brand.color}}>
              {phoneSaving ? <Spin white/> : 'Salvar telefone'}
            </button>
          </div>

          <a href={waLink('Olá! Preciso de ajuda com o Financia.')} target="_blank" rel="noreferrer"
            className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition hover:opacity-90 min-h-12" style={{background:'#16a34a'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.4A10 10 0 1012 2zm0 1.8a8.2 8.2 0 11-4.2 15.2l-.3-.2-2.8.8.8-2.7-.2-.3A8.2 8.2 0 0112 3.8zm4.7 10.3c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.4-.4-.5 0-.5.4-1.5.1-.2 0-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.8-.8 1.9-.1 3 .7 1.1 1.7 2.6 3.7 3.4 1.3.6 1.8.6 2.5.5.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z"/></svg>
            Falar com o Suporte
          </a>
          <p className="text-xs text-center -mt-1" style={{color:'var(--text-muted)'}}>Ou por e-mail: <a href={'mailto:' + SUPPORT_EMAIL} className="underline" style={{color:'var(--text-sub)'}}>{SUPPORT_EMAIL}</a></p>

          <button onClick={function() { confirm('Sair da conta?', function() { doSignOut(); }); }} className="w-full rounded-xl py-3 text-sm font-medium transition min-h-12" style={{border:'1px solid var(--border)', color:'var(--text-sub)', background:'var(--bg-card)'}} onMouseEnter={function(e) { e.target.style.background = 'var(--bg-subtle)'; }} onMouseLeave={function(e) { e.target.style.background = 'var(--bg-card)'; }}>Sair da conta</button>
        </Card>
      )}

      {tab === 'appearance' && hasWhiteLabel && (
        <Card className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold mb-1" style={{color:'var(--text-main)'}}>Identidade visual</p>
            <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>Defina as 2 cores principais e a logo da sua empresa.</p>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{background: appForm.color}}>
                {appForm.logo_url
                  ? <img src={appForm.logo_url} alt="logo" className="w-full h-full object-cover"/>
                  : <span className="text-white text-xl font-bold">{brand.name ? brand.name[0].toUpperCase() : 'A'}</span>}
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <label className="text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer text-center min-h-[44px] flex items-center justify-center" style={{background:'var(--brand-soft)', color: brand.color}}>
                  Enviar logo
                  <input type="file" accept="image/*" onChange={onLogoFile} className="hidden"/>
                </label>
                {appForm.logo_url && (
                  <button type="button" onClick={function() { setAppField('logo_url', ''); }} className="text-xs font-medium" style={{color:'var(--text-muted)'}}>Remover logo</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{k:'color',l:'Cor principal'},{k:'color_secondary',l:'Cor secundária'}].map(function(field) {
                var val = appForm[field.k] || '#002f59';
                return (
                  <div key={field.k} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold" style={{color:'var(--text-sub)'}}>{field.l}</span>
                    <div className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{border:'1px solid var(--border)'}}>
                      <input type="color" value={val} onChange={function(e) { setAppField(field.k, e.target.value); }} className="w-9 h-9 rounded-lg cursor-pointer flex-shrink-0" style={{border:'none', background:'transparent'}}/>
                      <span className="text-sm font-mono uppercase" style={{color:'var(--text-main)'}}>{val}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={saveAppearance} disabled={appSaving} className="w-full text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40 min-h-12" style={{background: brand.color}}>
            {appSaving ? <Spin white/> : 'Salvar aparência'}
          </button>

          <a href={waLink(devMsg)} target="_blank" rel="noreferrer"
            className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition hover:opacity-90 min-h-12" style={{border:'1px solid var(--border)', color:'var(--text-main)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
            Falar com o Desenvolvedor (gerar APK)
          </a>
        </Card>
      )}

      {tab === 'clients' && (
        <div className="flex flex-col gap-4">
          <GhTokenCard toast={toast}/>
          <Card className="p-6"><AdminPanel toast={toast} confirm={confirm} session={session}/></Card>
        </div>
      )}
    </div>
  );
}
