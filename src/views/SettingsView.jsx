import React, { useState, useRef } from 'react';
import { Card, Inp, Spin, PageHead } from '../components/ui.jsx';
import { updatePassword, uploadLogo as uploadToStorage, signOut as doSignOut } from '../lib/auth.js';
import AdminPanel from '../admin/AdminPanel.jsx';
import GhTokenCard from '../admin/GhTokenCard.jsx';

export default function SettingsView({ brand, session, onSave, toast, confirm, isAdmin, onNav }) {
  var [tab, setTab] = useState(isAdmin ? 'clients' : 'security');
  var [form, setForm] = useState(Object.assign({}, brand));
  var [saving, setSaving] = useState(false);
  var [pwForm, setPwForm] = useState({newPw:'', confirm:''});
  var [pwSaving, setPwSaving] = useState(false);
  var [uploading, setUploading] = useState(false);
  var fileRef = useRef();
  React.useEffect(function() {
    if (isAdmin && tab === 'security') {
      setTab('clients');
    } else if (!isAdmin && (tab === 'brand' || tab === 'clients')) {
      setTab('security');
    }
  }, [isAdmin]);
  
    const changePw = async function() {
    if (pwForm.newPw !== pwForm.confirm) { toast('As senhas não coincidem.', 'error'); return; }
    if (pwForm.newPw.length < 8) { toast('Senha deve ter ao menos 8 caracteres.', 'error'); return; }
    setPwSaving(true);
    const res = await updatePassword(pwForm.newPw);
    if (res.error) toast('Erro ao alterar senha.', 'error');
    else { toast('Senha alterada!'); setPwForm({newPw:'', confirm:''}); }
    setPwSaving(false);
  };

  const compressImage = function(rawFile) {
    return new Promise(function(resolve) {
      if (rawFile.type === 'image/svg+xml') { resolve(rawFile); return; }
      const img = new Image();
      img.onload = function() {
        const MAX = 512;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round((h/w)*MAX); w = MAX; } else { w = Math.round((w/h)*MAX); h = MAX; } }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function(b) { resolve(b || rawFile); }, 'image/webp', 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(rawFile);
    });
  };

  const uploadLogo = async function(rawFile) {
    if (!rawFile) return;
    const file = await compressImage(rawFile);
    if (file.size > 2*1024*1024) { toast('Imagem deve ter menos de 2MB.', 'error'); return; }
    setUploading(true);
    const ext = file.type === 'image/webp' ? 'webp' : rawFile.name.split('.').pop();
    const path = session.user.id + '/logo.' + ext;
    var result = await uploadToStorage(path, file);
    if (result.error) { toast('Erro no upload.', 'error'); setUploading(false); return; }
    var url = result.url + '?t=' + Date.now();
    setForm(function(f) { return Object.assign({}, f, {logo_url:url}); });
    const imgEl = new Image(); imgEl.crossOrigin = 'anonymous';
    imgEl.onload = function() {
      try {
        const cv = document.createElement('canvas'); cv.width = 50; cv.height = 50;
        const ctx = cv.getContext('2d'); ctx.drawImage(imgEl, 0, 0, 50, 50);
        const px = ctx.getImageData(0, 0, 50, 50).data; const bk = {};
        for (let i = 0; i < px.length; i += 4) {
          if (px[i+3] < 128) continue;
          const r = Math.round(px[i]/32)*32, g = Math.round(px[i+1]/32)*32, b = Math.round(px[i+2]/32)*32;
          if (r > 230 && g > 230 && b > 230) continue;
          const k = r + ',' + g + ',' + b; bk[k] = (bk[k] || 0) + 1;
        }
        const hexes = Object.entries(bk).sort(function(a, b2) { return b2[1] - a[1]; }).slice(0, 6)
          .map(function(pair) { const parts = pair[0].split(',').map(Number); return '#' + parts.map(function(v) { return v.toString(16).padStart(2,'0'); }).join(''); });
        if (hexes.length) { setForm(function(f) { return Object.assign({}, f, {color:hexes[0]}); }); }
      } catch(_) {}
    };
    imgEl.src = url;
    toast('Logo enviada!');
    setUploading(false);
  };

  const allTabs = [{key:'security',label:'Segurança'},{key:'account',label:'Conta'},{key:'clients',label:'Clientes',adminOnly:true}];
  const tabs = allTabs.filter(function(t) { return !t.adminOnly || isAdmin; });

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        title="Configurações"
        sub="Aparência, segurança e conta"
      />

      {onNav && (
        <button onClick={function() { onNav('planos'); }}
          className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition hover:opacity-90 min-h-20"
          style={{background:'var(--brand-soft)', border:'1px solid var(--border)'}}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: brand.color}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"/></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{color:'var(--text-main)'}}>Planos e personalização</p>
            <p className="text-xs" style={{color:'var(--text-sub)'}}>Ver planos, app da sua empresa e contato</p>
          </div>
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="var(--text-sub)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      )}

      <div className="flex border-b border-gray-200">
        {tabs.map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              className={'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ' + (active ? 'text-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600')}
              style={active ? {borderColor: form.color, color: form.color} : {}}>
              {t.label}
            </button>
          );
        })}
      </div>
{tab === 'security' && (
        <Card className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Alterar senha</p>
            <p className="text-xs text-gray-400 mb-4">Use uma senha forte com letras, números e símbolos.</p>
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
          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="flex justify-between text-sm mb-1.5"><span style={{color:'var(--text-sub)'}}>Versão</span><span className="font-medium" style={{color:'var(--text-main)'}}>5.0</span></div>
            <div className="flex justify-between text-sm mb-1.5"><span style={{color:'var(--text-sub)'}}>Banco</span><span className="font-medium" style={{color:'var(--text-main)'}}>Supabase (PostgreSQL)</span></div>
            <div className="flex justify-between text-sm"><span style={{color:'var(--text-sub)'}}>Hospedagem</span><span className="font-medium" style={{color:'var(--text-main)'}}>Render</span></div>
          </div>
          <div className="rounded-xl border p-4 flex flex-col gap-3" style={{background:'var(--bg-subtle)', borderColor:'var(--border)'}}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--text-sub)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <p className="text-sm font-semibold" style={{color:'var(--text-main)'}}>Instalar como app</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2"><span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{color:'var(--text-muted)'}}>Android</span><p className="text-xs" style={{color:'var(--text-sub)'}}>Toque nos 3 pontinhos do Chrome e escolha "Adicionar a tela inicial"</p></div>
              <div className="flex items-start gap-2"><span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{color:'var(--text-muted)'}}>iPhone</span><p className="text-xs" style={{color:'var(--text-sub)'}}>Toque no ícone de compartilhar do Safari e escolha "Adicionar à tela de início"</p></div>
            </div>
          </div>
          <button onClick={function() { confirm('Sair da conta?', function() { doSignOut(); }); }} className="w-full rounded-xl py-3 text-sm font-medium transition min-h-12" style={{border:'1px solid var(--border)', color:'var(--text-sub)', background:'var(--bg-card)'}} onMouseEnter={function(e) { e.target.style.background = 'var(--bg-subtle)'; }} onMouseLeave={function(e) { e.target.style.background = 'var(--bg-card)'; }}>Sair da conta</button>
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
