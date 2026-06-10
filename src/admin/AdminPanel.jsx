import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';
import { triggerApkBuild, fetchClients, deleteClient } from '../lib/db.js';
import { genPwd } from '../lib/utils.js';
import { GH_REPO } from '../lib/constants.js';
import ClientEditModal from './ClientEditModal.jsx';
import { effectivePlan } from '../lib/constants.js';

export default function AdminPanel({ toast, confirm, session }) {
  const adminEmail = session && session.user ? session.user.email : 'admin';
  const BLANK = {email:'', password:'', companyName:'', logoUrl:'', primaryColor:'#002f59', secondaryColor:'', accentColor:'', theme:'light', colors:[]};
  const [form, setForm] = useState(BLANK);
  const [creating, setCreating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [done, setDone] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingCli, setLoadingCli] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [copied, setCopied] = useState(null);
  const logoRef = useRef();

  const reload = function() { fetchClients().then(function(c) { setClients(c); setLoadingCli(false); }); };
  useEffect(function() { reload(); }, [done]);

  const luminance = function(r,g,b) { const [rs,gs,bs]=[r,g,b].map(function(c){c=c/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}); return 0.2126*rs+0.7152*gs+0.0722*bs; };
  const extractColors = function(img) {
    try {
      const cv = document.createElement('canvas'); cv.width = 50; cv.height = 50;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 50, 50);
      const d = ctx.getImageData(0, 0, 50, 50).data;
      const buckets = {};
      for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] < 128) continue;
        const r = Math.round(d[i]/48)*48, g = Math.round(d[i+1]/48)*48, b = Math.round(d[i+2]/48)*48;
        if (r > 220 && g > 220 && b > 220) continue;
        const k = r+','+g+','+b; buckets[k] = (buckets[k]||0)+1;
      }
      const sorted = Object.entries(buckets).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
      const hexes = sorted.map(function(pair) { const parts = pair[0].split(',').map(Number); return '#' + parts.map(function(v) { return v.toString(16).padStart(2, '0'); }).join(''); });
      if (hexes.length) const toHex2 = function(k) { const [r2,g2,b2]=k.split(',').map(Number); return '#'+[r2,g2,b2].map(function(v){return v.toString(16).padStart(2,'0');}).join(''); };
        const sorted2 = Object.entries(buckets).sort(function(a,b2){return b2[1]-a[1];});
        const dark2=[],mid2=[],light2=[];
        sorted2.forEach(function(entry){const k=entry[0]; const [r2,g2,b2]=k.split(',').map(Number); const l2=luminance(r2,g2,b2); const hex=toHex2(k); if(l2<0.15)dark2.push(hex); else if(l2<0.5)mid2.push(hex); else light2.push(hex);});
        const prim = dark2[0]||mid2[0]||light2[0]||'#002f59';
        const sec  = mid2[0]||(dark2[1]||light2[0])||'';
        const acc  = light2[0]||(mid2[1]||dark2[1])||'';
        setForm(function(f) { return Object.assign({}, f, {colors:[prim,sec,acc].filter(Boolean), primaryColor:prim, secondaryColor:sec, accentColor:acc}); });
    } catch(_) {}
  };

  const uploadLogo = async function(file) {
    if (!file) return;
    setUploading(true);
    const path = 'client-logos/' + Date.now() + '.' + file.name.split('.').pop();
    const upRes = await sb.storage.from('logos').upload(path, file, {upsert:true});
    if (upRes.error) { toast('Erro no upload.', 'error'); setUploading(false); return; }
    const urlRes = sb.storage.from('logos').getPublicUrl(path);
    const url = urlRes.data.publicUrl + '?t=' + Date.now();
    setForm(function(f) { return Object.assign({}, f, {logoUrl:url}); });
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = function() { extractColors(img); };
    img.src = url;
    setUploading(false);
    toast('Logo enviado!');
  };

  const create = async function() {
    if (!form.email || !form.password) { toast('Preencha email e senha.', 'error'); return; }
    if (form.password.length < 8) { toast('Senha minimo 8 chars.', 'error'); return; }
    if (!form.companyName) { toast('Informe o nome da empresa.', 'error'); return; }
    setCreating(true);
    const authRes = await sb.auth.signUp({email:form.email, password:form.password});
    if (authRes.error) { toast(authRes.error.message.includes('already') ? 'Email ja cadastrado.' : 'Erro: ' + authRes.error.message, 'error'); setCreating(false); return; }
    const newUid = authRes.data && authRes.data.user ? authRes.data.user.id : null;
    if (newUid) {
      await sb.from('company_profiles').upsert({user_id:newUid, name:form.companyName, color:form.primaryColor||'#002f59', logo:'G', logo_url:form.logoUrl||null});
    }
    const tok = sessionStorage.getItem('nancia_gh_token') || '';
    if (!tok) { toast('Cliente criado! Configure token GitHub.', 'error'); setDone(Object.assign({}, form, {buildOk:false, newUid:newUid})); setForm(BLANK); setCreating(false); return; }
    setBuilding(true);
    const built = await triggerApkBuild(form.companyName, form.logoUrl, form.primaryColor);
    setBuilding(false);
    setDone(Object.assign({}, form, {buildOk:built, newUid:newUid}));
    setForm(BLANK);
    setCreating(false);
    toast(built ? 'Cliente criado! APK em ~2min.' : 'Erro no APK - verifique token.', built ? 'success' : 'error');
  };

  const copyWpp = async function(c, done_) {
    const d = done_ || c;
    const msg = (d.companyName || d.name || 'Financia') + '\n\nLink: https://gestao-financeira-7heu.onrender.com\nEmail: ' + d.email + '\nSenha: ' + d.password + (d.buildOk ? '\nAPK: github.com/' + GH_REPO + '/actions' : '');
    await navigator.clipboard.writeText(msg);
    setCopied(d.email || d.user_id);
    setTimeout(function() { setCopied(null); }, 2000);
    toast('Copiado!');
  };

  const handleDelete = function(c) {
    confirm('Excluir todos os dados de "' + (c.name || c.user_id) + '"? Isso nao pode ser desfeito.', async function() {
      const ok = await deleteClient(c.user_id);
      if (ok) { toast('Cliente excluido.'); reload(); }
      else toast('Erro ao excluir.', 'error');
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-bold text-gray-800 mb-2">Clientes cadastrados</p>
        {loadingCli
          ? <p className="text-xs text-gray-400">Carregando...</p>
          : clients.length === 0
            ? <p className="text-xs text-gray-400">Nenhum cliente ainda.</p>
            : (
              <div className="flex flex-col gap-2">
                {clients.map(function(c) {
                  return (
                    <div key={c.user_id} className="rounded-xl border border-gray-100 p-3 flex items-center gap-3 bg-white">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden" style={{background:c.color||'#002f59'}}>
                        {c.logo_url
                          ? <img src={c.logo_url} className="w-full h-full object-cover" alt=""/>
                          : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(c.name || '?')[0]}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">{c.name || 'Sem nome'}</p>
                          <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ' + (effectivePlan(c) === 'pro' ? 'text-white' : 'text-gray-600 bg-gray-100')} style={effectivePlan(c) === 'pro' ? {background:'#1a6b5c'} : {}}>
                            {effectivePlan(c) === 'pro' ? 'PRO' : 'FREE'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{c.user_id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={function() { setEditClient(c); }} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Editar</button>
                        <button onClick={function() { triggerApkBuild(c.name, c.logo_url, c.color).then(function(ok) { toast(ok ? 'APK iniciado!' : 'Sem token.', ok ? 'success' : 'error'); }); }} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">APK</button>
                        <button onClick={function() { handleDelete(c); }} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        }
      </div>

      <hr className="border-gray-100"/>

      <div>
        <p className="text-sm font-bold text-gray-800 mb-3">Novo cliente</p>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'#f8fafc'}}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome da empresa</label>
              <input value={form.companyName} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {companyName:e.target.value}); }); }}
                placeholder="Ex: Padaria do Joao"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-400"/>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border-2 border-dashed border-gray-200" style={{background:form.primaryColor+'22'}}>
                {form.logoUrl
                  ? <img src={form.logoUrl} className="w-full h-full object-contain p-1" alt=""/>
                  : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">[E]</div>
                }
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={function(e) { uploadLogo(e.target.files[0]); }}/>
                <button onClick={function() { logoRef.current.click(); }} disabled={uploading} className="border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  {uploading ? 'Enviando...' : '[Upload] Logo'}
                </button>
                {form.colors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {[
                      {label:'Primaria',   val:form.primaryColor,   key:'primaryColor'},
                      {label:'Secundaria', val:form.secondaryColor, key:'secondaryColor'},
                      {label:'Acento',     val:form.accentColor,    key:'accentColor'},
                    ].map(function(slot, idx) {
                      const suggested = form.colors[idx] || '';
                      return (
                        <div key={slot.key} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-20 flex-shrink-0">{slot.label}</span>
                          {suggested && <div className="w-6 h-6 rounded-md flex-shrink-0 border border-gray-200" style={{background:suggested}} title={'Sugestao: '+suggested}/>}
                          <input type="color" value={slot.val || suggested || '#002f59'}
                            onChange={function(e) { const v=e.target.value; setForm(function(f){const u={};u[slot.key]=v;return Object.assign({},f,u);}); }}
                            className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"/>
                          <span className="text-xs font-mono text-gray-400 flex-1">{slot.val || suggested || '#002f59'}</span>
                          {suggested && suggested !== slot.val && (
                            <button onClick={function(){setForm(function(f){const u={};u[slot.key]=suggested;return Object.assign({},f,u);});}}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 flex-shrink-0">
                              Aplicar
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">Tema</span>
                      {['light','dark'].map(function(t) {
                        return (
                          <button key={t} onClick={function(){setForm(function(f){return Object.assign({},f,{theme:t});});}}
                            className="text-xs px-3 py-1 rounded-lg border font-semibold"
                            style={{background:form.theme===t?'var(--brand,#002f59)':'transparent', color:form.theme===t?'#fff':'#6b7280', borderColor: form.theme===t?'transparent':'#e5e7eb'}}>
                            {t === 'light' ? 'Claro' : 'Escuro'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</label>
            <input type="email" value={form.email} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {email:e.target.value}); }); }}
              placeholder="cliente@email.com"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-400"/>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Senha</label>
              <input type="text" value={form.password} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {password:e.target.value}); }); }}
                placeholder="Minimo 8 chars"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-400"/>
            </div>
            <button onClick={function() { setForm(function(f) { return Object.assign({}, f, {password:genPwd()}); }); }}
              className="border border-gray-200 rounded-xl px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex-shrink-0 mt-6">Gerar</button>
          </div>
          <button onClick={create} disabled={creating || building || !form.email || !form.password}
            className="w-full text-white rounded-xl py-3 text-sm font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{background:'#002f59'}}>
            {(creating || building) ? 'Aguarde...' : 'Criar cliente + APK'}
          </button>
          {done && (
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'#f0fdf4', border:'1px solid #bbf7d0'}}>
              <p className="text-sm font-bold text-gray-800">OK: {done.companyName || 'Cliente'} criado!</p>
              <div className="bg-white rounded-xl p-3 font-mono text-xs flex flex-col gap-1 border border-gray-100">
                <p><span className="text-gray-400">Email: </span><b>{done.email}</b></p>
                <p><span className="text-gray-400">Senha: </span><b>{done.password}</b></p>
                {done.buildOk && <p><span className="text-gray-400">APK: </span><a href={'https://github.com/' + GH_REPO + '/actions'} target="_blank" rel="noreferrer" className="text-blue-500 underline">github.com/.../actions</a></p>}
              </div>
              <button onClick={function() { copyWpp(null, done); }}
                className="w-full text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90"
                style={{background:'#002f59'}}>
                {copied === done.email ? 'OK Copiado!' : 'Copiar para WhatsApp'}
              </button>
              <button onClick={function() { setDone(null); }} className="text-xs text-gray-400 text-center hover:text-gray-600">Criar outro</button>
            </div>
          )}
        </div>
      </div>

      {editClient && (
        <ClientEditModal
          client={editClient}
          adminEmail={adminEmail}
          onSave={function(updated) { setClients(function(cs) { return cs.map(function(c) { return c.user_id === updated.user_id ? updated : c; }); }); setEditClient(null); }}
          onClose={function() { setEditClient(null); }}
          toast={toast}
        />
      )}
    </div>
  );
}
