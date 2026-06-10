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
  const BLANK = {email:'', password:'', companyName:'', logoUrl:'', primaryColor:'#002f59', colors:['#002f59']};
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

  const extractColors = function(img) {
    try {
      const c = document.createElement('canvas'); c.width = 50; c.height = 50;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 50, 50);
      const d = ctx.getImageData(0, 0, 50, 50).data;
      const buckets = {};
      for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] < 128) continue;
        const r = Math.round(d[i]/32)*32, g = Math.round(d[i+1]/32)*32, b = Math.round(d[i+2]/32)*32;
        if (r > 230 && g > 230 && b > 230) continue;
        const k = r + ',' + g + ',' + b; buckets[k] = (buckets[k] || 0) + 1;
      }
      const sorted = Object.entries(buckets).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
      const hexes = sorted.map(function(pair) { const parts = pair[0].split(',').map(Number); return '#' + parts.map(function(v) { return v.toString(16).padStart(2, '0'); }).join(''); });
      if (hexes.length) setForm(function(f) { return Object.assign({}, f, {colors:hexes, primaryColor:hexes[0]}); });
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
                        <button onClick={function() { handleDelete(c); }} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50">Del</button>
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
                  <div className="flex items-center gap-1.5">
                    {form.colors.map(function(c) {
                      return (
                        <button key={c} onClick={function() { setForm(function(f) { return Object.assign({}, f, {primaryColor:c}); }); }}
                          className="w-6 h-6 rounded-md flex-shrink-0"
                          style={{background:c, outline:form.primaryColor === c ? '2px solid #002f59' : 'none', outlineOffset:'2px'}}/>
                      );
                    })}
                    <input type="color" value={form.primaryColor}
                      onChange={function(e) { const v = e.target.value; setForm(function(f) { return Object.assign({}, f, {primaryColor:v, colors:Array.from(new Set([v].concat(f.colors))).slice(0,5)}); }); }}
                      className="w-6 h-6 rounded-md border border-gray-200 cursor-pointer"/>
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
