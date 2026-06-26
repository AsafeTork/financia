import React, { useState, useEffect, useRef } from 'react';
import { Card, Empty, Skeleton } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';
import { triggerApkBuild, fetchClients, deleteClient, clearClientData, fetchClientUsage } from '../lib/db.js';
import { genPwd, luminance, lightenHex, fmtDate } from '../lib/utils.js';
import { GH_REPO, effectivePlan, PRICING_PLANS } from '../lib/constants.js';
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
  const [clearTarget, setClearTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [usage, setUsage] = useState({});
  const logoRef = useRef();

  const reload = function() {
    Promise.all([fetchClients(), fetchClientUsage()]).then(function(res) {
      setClients(res[0]); setUsage(res[1] || {}); setLoadingCli(false);
    });
  };
  useEffect(function() { reload(); }, [done]);

  const priceOf = function(id) { var p = PRICING_PLANS.find(function(x) { return x.id === id; }); return p ? p.price : 0; };
  const nowMonth = new Date().toISOString().slice(0, 7);
  const stats = clients.reduce(function(a, c) {
    var ep = effectivePlan(c);
    a.total += 1;
    if (ep === 'free') { a.free += 1; } else { a.pro += 1; a.mrr += priceOf(ep); }
    if (c.created_at && String(c.created_at).slice(0, 7) === nowMonth) a.novos += 1;
    return a;
  }, { total: 0, pro: 0, free: 0, novos: 0, mrr: 0 });
  var mrr = stats.mrr;
  var moneyBR = function(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };

  const visibleClients = clients.filter(function(c) {
    if (planFilter !== 'all' && effectivePlan(c) !== planFilter) return false;
    if (!search.trim()) return true;
    var q = search.toLowerCase();
    return [(c.name || ''), (c.email || ''), (c.user_id || '')].some(function(v) { return v.toLowerCase().indexOf(q) !== -1; });
  });

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

  const handleClear = function(c, tables) {
    var label = tables.length === 3 ? 'TODOS os dados' : tables.join(', ');
    confirm('Limpar ' + label + ' de "' + (c.name || c.user_id) + '"? Isso nao pode ser desfeito.', async function() {
      const ok = await clearClientData(c.user_id, tables);
      if (ok) { toast('Dados limpos.'); setClearTarget(null); }
      else toast('Erro ao limpar dados.', 'error');
    });
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
        <p className="text-xs font-bold uppercase tracking-wide mb-2.5" style={{color:'var(--text-muted)'}}>Visão geral</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[['Clientes', String(stats.total), false], ['Assinantes Pro', String(stats.pro), false], ['No plano Free', String(stats.free), false], ['Receita/mês', moneyBR(mrr), true]].map(function(kv) {
            var hl = kv[2];
            return (
              <div key={kv[0]} className="rounded-xl p-3 relative overflow-hidden" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
                {hl && <div style={{position:'absolute', top:0, left:0, right:0, height:3, background:'var(--brand-grad, var(--brand))'}}/>}
                <p className="text-xs" style={{color:'var(--text-muted)'}}>{kv[0]}</p>
                <p className="text-lg font-extrabold tabular mt-0.5" style={{color: hl ? 'var(--brand)' : 'var(--text-main)'}}>{kv[1]}</p>
              </div>
            );
          })}
        </div>
        {stats.novos > 0 && <p className="text-xs mb-3" style={{color:'var(--text-sub)'}}>{stats.novos} novo(s) cliente(s) neste mês</p>}

        <div className="rounded-2xl p-3 mb-1" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>Clientes</p>
            <span className="text-xs" style={{color:'var(--text-muted)'}}>{visibleClients.length} de {clients.length}</span>
          </div>
          <div className="relative mb-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Buscar por nome, email ou ID..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
          </div>
          <div className="flex gap-1.5">
            {[['all','Todos'],['pro','Pro'],['free','Free']].map(function(f) {
              var active = planFilter === f[0];
              return <button key={f[0]} onClick={function() { setPlanFilter(f[0]); }} className={'text-xs font-semibold px-3 py-1.5 min-h-[36px] rounded-lg border transition ' + (active ? 'text-white' : 'text-gray-500 border-gray-200 hover:bg-gray-50')} style={active ? {background:'var(--brand)', borderColor:'var(--brand)'} : {}}>{f[1]}</button>;
            })}
          </div>
        </div>

        {loadingCli
          ? <div className="flex flex-col gap-2">{[0,1,2].map(function(i) { return <Skeleton key={i} h={88} r={12}/>; })}</div>
          : clients.length === 0
            ? <Empty title="Nenhum cliente ainda" sub="Crie o primeiro cliente no formulario abaixo."/>
            : visibleClients.length === 0
              ? <Empty title="Nenhum cliente encontrado" sub="Tente outro termo de busca ou limpe os filtros." action="Limpar filtros" onAction={function() { setSearch(''); setPlanFilter('all'); }}/>
              : (
              <div className="flex flex-col gap-2">
                {visibleClients.map(function(c) {
                  return (
                    <div key={c.user_id} className="rounded-xl p-3 flex flex-col gap-2.5" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden" style={{background:c.color||'#002f59'}}>
                          {c.logo_url
                            ? <img src={c.logo_url} className="w-full h-full object-cover" alt=""/>
                            : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(c.name || '?')[0]}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{color:'var(--text-main)'}}>{c.name || 'Sem nome'}</p>
                            <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ' + (effectivePlan(c) !== 'free' ? 'text-white' : 'text-gray-600 bg-gray-100')} style={effectivePlan(c) !== 'free' ? {background:'#1a6b5c'} : {}}>
                              {effectivePlan(c) === 'premium' ? 'PREMIUM' : (effectivePlan(c) === 'pro' ? 'PRO' : 'FREE')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{c.user_id.slice(0, 8)}{c.updated_at ? ' · ativo ' + fmtDate(String(c.updated_at).slice(0, 10)) : ''}</p>
                        </div>
                      </div>
                      {usage[c.user_id] && (
                        <div className="flex items-center gap-3 text-xs px-0.5 flex-wrap" style={{color:'var(--text-sub)'}}>
                          <span className="font-semibold tabular">{usage[c.user_id].tx_count}</span><span className="-ml-2.5">lançamentos</span>
                          <span className="font-semibold tabular">{usage[c.user_id].prod_count}</span><span className="-ml-2.5">produtos</span>
                          <span className="font-semibold tabular">{usage[c.user_id].loss_count}</span><span className="-ml-2.5">perdas</span>
                        </div>
                      )}
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
                        }} className="py-2 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 min-h-[44px] flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                          Entrar
                        </button>
                        <button onClick={function() { setEditClient(c); }} className="py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 min-h-[44px] flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          Editar
                        </button>
                        <button onClick={function() { triggerApkBuild(c.name, c.logo_url, c.color).then(function(r) {
                              if (r.ok) { toast('Build iniciado! Veja em Actions no GitHub.', 'success'); return; }
                              if (r.reason === 'no_token') { toast('Configure o token GitHub antes.', 'error'); return; }
                              if (r.reason === 'api_error' && r.status === 401) { toast('Token invalido ou expirado.', 'error'); return; }
                              if (r.reason === 'api_error' && r.status === 404) { toast('Repositorio ou workflow nao encontrado.', 'error'); return; }
                              toast('Erro ao acionar build (status ' + (r.status || 'rede') + ').', 'error');
                            }); }} className="py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 min-h-[44px] flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>
                          Gerar APK
                        </button>
                        <button onClick={function() { handleDelete(c); }} className="py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 min-h-[44px] flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          Excluir
                        </button>
                      </div>
                      <button onClick={function() { setClearTarget(clearTarget === c.user_id ? null : c.user_id); }}
                        className="w-full py-2 text-xs font-semibold rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 min-h-[44px]">
                        {clearTarget === c.user_id ? 'Cancelar' : 'Limpar dados'}
                      </button>
                      {clearTarget === c.user_id && (
                        <div className="flex flex-col gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <p className="text-xs font-semibold text-orange-700">Selecione o que limpar:</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={function() { handleClear(c, ['transactions']); }}
                              className="py-2 text-xs font-semibold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-100 min-h-[44px]">Transacoes</button>
                            <button onClick={function() { handleClear(c, ['products']); }}
                              className="py-2 text-xs font-semibold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-100 min-h-[44px]">Produtos</button>
                            <button onClick={function() { handleClear(c, ['losses']); }}
                              className="py-2 text-xs font-semibold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-100 min-h-[44px]">Perdas</button>
                            <button onClick={function() { handleClear(c, ['transactions','products','losses']); }}
                              className="py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 min-h-[44px]">Tudo</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
        }
      </div>

      <hr style={{borderColor:'var(--border)'}}/>

      <div>
        <p className="text-sm font-bold mb-3" style={{color:'var(--text-main)'}}>Novo cliente</p>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'var(--bg-subtle)'}}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome da empresa</label>
              <input value={form.companyName} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {companyName:e.target.value}); }); }}
                placeholder="Ex: Padaria do Joao"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border-2 border-dashed border-gray-200" style={{background:form.primaryColor+'22'}}>
                {form.logoUrl
                  ? <img src={form.logoUrl} className="w-full h-full object-contain p-1" alt=""/>
                  : <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                }
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={function(e) { uploadLogo(e.target.files[0]); }}/>
                <button onClick={function() { logoRef.current.click(); }} disabled={uploading} className="border border-gray-200 rounded-xl py-2 min-h-[44px] text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {uploading ? 'Enviando...' : 'Upload de logo'}
                </button>
                {form.logoUrl && <button onClick={function() { setForm(function(f) { return Object.assign({}, f, {logoUrl:'', colors:['#002f59'], primaryColor:'#002f59', secondaryColor:'', accentColor:''}); }); }} className="text-xs text-red-400 text-center hover:text-red-500 py-1">Remover logo</button>}
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
                    className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-mono flex-1 focus:outline-none" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
                  <div className="w-7 h-7 rounded-lg border border-gray-100 flex-shrink-0" style={{background:val}}/>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</label>
            <input type="email" value={form.email} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {email:e.target.value}); }); }}
              placeholder="cliente@email.com"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Senha</label>
              <input type="text" value={form.password} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {password:e.target.value}); }); }}
                placeholder="Minimo 8 chars"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
            </div>
            <button onClick={function() { setForm(function(f) { return Object.assign({}, f, {password:genPwd()}); }); }}
              className="border border-gray-200 rounded-xl px-3 min-h-[44px] text-xs font-semibold text-gray-600 hover:bg-gray-50 flex-shrink-0 mt-6">Gerar</button>
          </div>
          <button onClick={create} disabled={creating || building || !form.email || !form.password}
            className="w-full text-white rounded-xl py-3 text-sm font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{background:'#002f59'}}>
            {(creating || building) ? 'Aguarde...' : 'Criar cliente + APK'}
          </button>
          {done && (
            <div className="rounded-2xl p-4 flex flex-col gap-3 anim-up" style={{background:'#f0fdf4', border:'1px solid #bbf7d0'}}>
              <p className="text-sm font-bold" style={{color:'var(--text-main)'}}>OK: {done.companyName || 'Cliente'} criado!</p>
              <div className="rounded-xl p-3 font-mono text-xs flex flex-col gap-1" style={{background:'var(--bg-input)', border:'1px solid var(--border)'}}>
                <p><span className="text-gray-400">Email: </span><b>{done.email}</b></p>
                <p><span className="text-gray-400">Senha: </span><b>{done.password}</b></p>
                {done.buildOk && <p><span className="text-gray-400">APK: </span><a href={'https://github.com/' + GH_REPO + '/actions'} target="_blank" rel="noreferrer" className="text-blue-500 underline">github.com/.../actions</a></p>}
              </div>
              <button onClick={function() { copyWpp(null, done); }}
                className="w-full text-white rounded-xl py-2.5 min-h-[44px] text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2"
                style={{background:'#002f59'}}>
                {copied === done.email
                  ? <React.Fragment><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Copiado!</React.Fragment>
                  : 'Copiar para WhatsApp'}
              </button>
              <button onClick={function() { setDone(null); }} className="text-xs text-gray-400 text-center hover:text-gray-600 min-h-[44px]">Criar outro</button>
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
