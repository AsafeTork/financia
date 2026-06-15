import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';
import { triggerApkBuild, fetchClients, deleteClient } from '../lib/db.js';
import { genPwd, luminance, lightenHex } from '../lib/utils.js';
import { GH_REPO, effectivePlan } from '../lib/constants.js';
import ClientEditModal from './ClientEditModal.jsx';

export default function AdminPanel({ toast, confirm, session }) {
  const adminEmail = session && session.user ? session.user.email : 'admin';
  const BLANK = {email:'', password:'', companyName:'', logoUrl:'', primaryColor:'#002f59', secondaryColor:'', accentColor:'', colors:['#002f59']};
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
      const cv = document.createElement('canvas'); cv.width = 50; cv.height = 50;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 50, 50);
      const d = ctx.getImageData(0, 0, 50, 50).data;
      const buckets = {};
      for (var i = 0; i < d.length; i += 4) {
        if (d[i+3] < 128) continue;
        const r = Math.round(d[i]/48)*48, g = Math.round(d[i+1]/48)*48, b = Math.round(d[i+2]/48)*48;
        if (r > 230 && g > 230 && b > 230) continue;
        const k = r + ',' + g + ',' + b; buckets[k] = (buckets[k] || 0) + 1;
      }
      const allHexes = Object.entries(buckets)
        .sort(function(a, b) { return b[1] - a[1]; })
        .map(function(pair) {
          const parts = pair[0].split(',').map(Number);
          return '#' + parts.map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
        });
      var dark = null; var mid = null; var light = null;
      for (var j = 0; j < allHexes.length; j++) {
        const lum = luminance(allHexes[j]);
        if (!dark && lum < 0.2) dark = allHexes[j];
        else if (!mid && lum >= 0.2 && lum <= 0.6) mid = allHexes[j];
        else if (!light && lum > 0.6) light = allHexes[j];
      }
      const primary = dark || allHexes[0] || '#002f59';
      const secondary = mid || lightenHex(primary, 0.78);
      const accent = light || lightenHex(primary, 0.92);
      setForm(function(f) { return Object.assign({}, f, {primaryColor:primary, secondaryColor:secondary, accentColor:accent, colors:allHexes.slice(0,5)}); });
    } catch(_) {}
  };

  const uploadLogo = async function(file) {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.indexOf(file.type) === -1) { toast('Use PNG, JPG ou WebP.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('Imagem deve ter menos de 2MB.', 'error'); return; }
    setUploading(true);
    const extMap = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
    const adminUid = session && session.user ? session.user.id : 'admin';
    const path = adminUid + '/clients/' + Date.now() + '.' + (extMap[file.type] || 'jpg');
    const upRes = await sb.storage.from('logos').upload(path, file, {upsert:true, contentType:file.type});
    if (upRes.error) { toast('Erro no upload: ' + upRes.error.message, 'error'); setUploading(false); return; }
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
    if (form.password.length < 8) { toast('Senha mínimo 8 chars.', 'error'); return; }
    if (!form.companyName) { toast('Informe o nome da empresa.', 'error'); return; }
    setCreating(true);
    const authRes = await sb.auth.signUp({email:form.email, password:form.password});
    if (authRes.error) { toast(authRes.error.message.includes('already') ? 'E-mail já cadastrado.' : 'Erro: ' + authRes.error.message, 'error'); setCreating(false); return; }
    const newUid = authRes.data && authRes.data.user ? authRes.data.user.id : null;
    if (newUid) {
      await sb.from('company_profiles').upsert({user_id:newUid, name:form.companyName, color:form.primaryColor||'#002f59', color_secondary:form.secondaryColor||null, color_accent:form.accentColor||null, theme:form.theme||'light', logo:'G', logo_url:form.logoUrl||null});
    }
    const tok = localStorage.getItem('nancia_gh_token') || '';
    if (!tok) { toast('Cliente criado! Configure o token GitHub.', 'error'); setDone(Object.assign({}, form, {buildOk:false, newUid:newUid})); setForm(BLANK); setCreating(false); return; }
    setBuilding(true);
    const built = await triggerApkBuild(form.companyName, form.logoUrl, form.primaryColor);
    setBuilding(false);
    setDone(Object.assign({}, form, {buildOk:built.ok, newUid:newUid}));
    setForm(BLANK);
    setCreating(false);
    toast(built.ok ? 'Cliente criado! APK em ~2min.' : 'Cliente criado, mas APK falhou: ' + (built.status || built.reason || ''), built.ok ? 'success' : 'error');
  };

  const copyWpp = async function(c, done_) {
    const d = done_ || c;
    const msg = (d.companyName || d.name || 'Financia') + '\n\nLink: https://financia-gestao.onrender.com\nEmail: ' + d.email + '\nSenha: ' + d.password + (d.buildOk ? '\nAPK: github.com/' + GH_REPO + '/actions' : '');
    await navigator.clipboard.writeText(msg);
    setCopied(d.email || d.user_id);
    setTimeout(function() { setCopied(null); }, 2000);
    toast('Copiado!');
  };

  const handleDelete = function(c) {
    confirm('Excluir todos os dados de "' + (c.name || c.user_id) + '"? Isso não pode ser desfeito.', async function() {
      const ok = await deleteClient(c.user_id);
      if (ok) { toast('Cliente excluído.'); reload(); }
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
                    <div key={c.user_id} className="rounded-xl border border-gray-100 p-3 flex flex-col gap-2.5 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden" style={{background:c.color||'#002f59'}}>
                          {c.logo_url
                            ? <img src={c.logo_url} className="w-full h-full object-cover" alt=""/>
                            : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(c.name || '?')[0]}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{c.name || 'Sem nome'}</p>
                            <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ' + (effectivePlan(c) === 'pro' ? 'text-white' : 'text-gray-600 bg-gray-100')} style={effectivePlan(c) === 'pro' ? {background:'#1a6b5c'} : {}}>
                              {effectivePlan(c) === 'pro' ? 'PRO' : 'FREE'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{c.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={function() {
                          sb.rpc('admin_impersonate_start', {target_uid: c.user_id}).then(function(res) {
                            if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
                            var d = res.data;
                            localStorage.setItem('_imp', JSON.stringify({
                              email: d.email,
                              pass: d.temp_pass,
                              uid: c.user_id,
                              exp: Date.now() + 30000
                            }));
                            window.open(window.location.origin + window.location.pathname + '?imp=1', '_blank');
                            setTimeout(function() { localStorage.removeItem('_imp'); }, 30000);
                            toast('Abrindo conta de ' + c.name, 'success');
                          });
                        }} className="py-2 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 min-h-[40px]">Entrar</button>
                        <button onClick={function() { setEditClient(c); }} className="py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 min-h-[40px]">Editar</button>
                        <button onClick={function() { triggerApkBuild(c.name, c.logo_url, c.color).then(function(r) {
                              if (r.ok) { toast('Build iniciado! Veja em Actions no GitHub.', 'success'); return; }
                              if (r.reason === 'no_token') { toast('Configure o token GitHub antes.', 'error'); return; }
                              if (r.reason === 'api_error' && r.status === 401) { toast('Token invalido ou expirado.', 'error'); return; }
                              if (r.reason === 'api_error' && r.status === 404) { toast('Repositorio ou workflow nao encontrado.', 'error'); return; }
                              toast('Erro ao acionar build (status ' + (r.status || 'rede') + ').', 'error');
                            }); }} className="py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 min-h-[40px]">Gerar APK</button>
                        <button onClick={function() { handleDelete(c); }} className="py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 min-h-[40px]">Excluir</button>
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
                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={function(e) { uploadLogo(e.target.files[0]); }}/>
                <button onClick={function() { logoRef.current.click(); }} disabled={uploading} className="border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  {uploading ? 'Enviando...' : 'Upload de logo'}
                </button>
                {form.logoUrl && <button onClick={function() { setForm(function(f) { return Object.assign({}, f, {logoUrl:'', colors:['#002f59'], primaryColor:'#002f59', secondaryColor:'', accentColor:''}); }); }} className="text-xs text-red-400 text-center">Remover logo</button>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cores</label>
            {[
              {label:'Primaria', key:'primaryColor'},
              {label:'Secundaria', key:'secondaryColor'},
              {label:'Acento', key:'accentColor'}
            ].map(function(field) {
              var val = form[field.key] || '#cccccc';
              return (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">{field.label}</span>
                  <input type="color" value={val}
                    onChange={function(e) { var v = e.target.value; setForm(function(f) { var upd = {}; upd[field.key] = v; return Object.assign({}, f, upd); }); }}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input value={form[field.key] || ''}
                    onChange={function(e) { var v = e.target.value; setForm(function(f) { var upd = {}; upd[field.key] = v; return Object.assign({}, f, upd); }); }}
                    maxLength={7} placeholder="#000000"
                    className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-mono flex-1 focus:outline-none focus:border-gray-400 bg-white"/>
                  <div className="w-7 h-7 rounded-lg border border-gray-100 flex-shrink-0" style={{background:val}}/>
                </div>
              );
            })}
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
          onSave={function(updated) { setClients(function(cs) { return cs.map(function(c) { return c.user_id === updated.user_id ? updated : c; }); }); setEditClient(null); reload(); }}
          onClose={function() { setEditClient(null); }}
          toast={toast}
        />
      )}
    </div>
  );
}
