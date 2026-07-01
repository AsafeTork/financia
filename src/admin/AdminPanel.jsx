import React, { useState, useEffect, useRef } from 'react';
import { Card, Empty, Skeleton } from '../components/ui.jsx';
import { sb } from '../lib/supabase.js';
import { triggerApkBuild, fetchClients, deleteClient, clearClientData, fetchClientUsage, fetchDbStats, fetchStripeOverview } from '../lib/db.js';
import { genPwd, luminance, lightenHex, fmtDate, formatBytes, dbUsage } from '../lib/utils.js';
import { GH_REPO, effectivePlan, PRICING_PLANS, countsAsRevenue, isAdminGranted, waLinkTo } from '../lib/constants.js';

// Limite de armazenamento do plano Supabase (free = 500 MB). Base do alerta de uso.
var DB_LIMIT_BYTES = 500 * 1024 * 1024;

// Cabecalho de secao com barra/icone colorido — organiza o painel por cores e posicao.
function SectionHead({ color, icon, title, right }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="w-1.5 h-5 rounded-full flex-shrink-0" style={{background: color}}/>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      <p className="text-xs font-bold uppercase tracking-wide flex-1" style={{color:'var(--text-muted)'}}>{title}</p>
      {right}
    </div>
  );
}
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
  const [stripeOv, setStripeOv] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [loadingFin, setLoadingFin] = useState(true);
  const logoRef = useRef();

  const reload = function() {
    Promise.all([fetchClients(), fetchClientUsage()]).then(function(res) {
      setClients(res[0]); setUsage(res[1] || {}); setLoadingCli(false);
    });
  };
  useEffect(function() { reload(); }, [done]);

  // Painel financeiro/infra (admin): saldo real Stripe + uso do banco. Carrega uma vez.
  useEffect(function() {
    var alive = true;
    setLoadingFin(true);
    Promise.all([fetchStripeOverview(), fetchDbStats()]).then(function(res) {
      if (!alive) return;
      setStripeOv(res[0]); setDbStats(res[1]); setLoadingFin(false);
    }).catch(function() {
      if (!alive) return;
      setLoadingFin(false);
    });
    return function() { alive = false; };
  }, []);

  const priceOf = function(id) { var p = PRICING_PLANS.find(function(x) { return x.id === id; }); return p ? p.price : 0; };
  const nowMonth = new Date().toISOString().slice(0, 7);
  // Receita REAL: so planos pagos via Stripe (countsAsRevenue exclui cortesia do admin).
  const stats = clients.reduce(function(a, c) {
    var ep = effectivePlan(c);
    a.total += 1;
    if (ep === 'free') { a.free += 1; }
    else {
      if (countsAsRevenue(c)) { a.pagantes += 1; a.mrr += priceOf(ep); }
      else { a.cortesia += 1; }
      if (ep === 'premium') a.premium += 1;
    }
    if (!!c.white_label) a.addon += 1;
    if (c.created_at && String(c.created_at).slice(0, 7) === nowMonth) a.novos += 1;
    return a;
  }, { total: 0, pagantes: 0, cortesia: 0, premium: 0, free: 0, addon: 0, novos: 0, mrr: 0 });
  var mrr = stats.mrr;
  var moneyBR = function(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
  var centsBR = function(c) { return moneyBR((Number(c) || 0) / 100); };
  const wlClients = clients.filter(function(c) { return !!c.white_label; });

  // Derivados do painel financeiro/infra.
  var dbBytes = dbStats && dbStats.db_bytes ? dbStats.db_bytes : 0;
  var dbu = dbUsage(dbBytes, DB_LIMIT_BYTES);
  var dbTables = dbStats && dbStats.tables ? dbStats.tables : [];
  var shownTables = dbTables.slice(0, 5);
  var shownBytes = shownTables.reduce(function(s, t) { return s + (t.bytes || 0); }, 0);
  var otherBytes = Math.max(0, dbBytes - shownBytes);

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
    let invokeRes = null;
    try {
      invokeRes = await sb.functions.invoke('admin-create-client', {body:{
        email:form.email,
        password:form.password,
        company_name:form.companyName,
        primary_color:form.primaryColor || '#002f59',
        secondary_color:form.secondaryColor || null,
        accent_color:form.accentColor || null,
        theme:form.theme || 'light',
        logo_url:form.logoUrl || null
      }});
    } catch (invokeErr) {
      toast('Erro de rede ao criar cliente.', 'error'); setCreating(false); return;
    }
    if (invokeRes.error) {
      const detail = invokeRes.data && invokeRes.data.error ? invokeRes.data.error : '';
      toast(detail === 'email_exists' ? 'E-mail já cadastrado.' : 'Erro ao criar cliente: ' + (detail || invokeRes.error.message), 'error');
      setCreating(false); return;
    }
    const data = invokeRes.data || {};
    if (data.error) {
      toast(data.error === 'email_exists' ? 'E-mail já cadastrado.' : 'Erro: ' + data.error, 'error');
      setCreating(false); return;
    }
    const newUid = data.user_id || null;
    if (data.profile_error) {
      toast('Cliente criado, mas o perfil falhou: ' + data.profile_error, 'error');
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
      if (ok) { toast('Dados limpos.'); setClearTarget(null); reload(); }
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
      {/* === FINANCEIRO (Stripe) — azul === */}
      <div className="rounded-2xl p-4" style={{background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'3px solid #2563eb'}}>
        <SectionHead color="#2563eb" title="Financeiro — Stripe"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          right={loadingFin ? <span className="text-[11px]" style={{color:'var(--text-muted)'}}>carregando...</span> : null}/>
        {loadingFin ? (
          <div className="grid grid-cols-2 gap-2">{[0,1,2,3].map(function(i) { return <Skeleton key={i} h={58} r={12}/>; })}</div>
        ) : stripeOv ? (
          <React.Fragment>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Saldo disponível', centsBR(stripeOv.available_cents), '#16a34a', 'quantia real, pronta para saque'],
                ['A caminho', centsBR(stripeOv.pending_cents), '#2563eb', 'liberando nos próximos dias'],
                ['Receita/mês (estimada)', centsBR(stripeOv.mrr_cents), '#7c3aed', 'soma das assinaturas ativas'],
                ['Assinaturas ativas', String(stripeOv.active_count), '#0f766e', 'pagantes recorrentes na Stripe'],
              ].map(function(kv) {
                return (
                  <div key={kv[0]} className="rounded-xl p-3" style={{background:'var(--bg-subtle)', border:'1px solid var(--border)'}}>
                    <p className="text-[11px]" style={{color:'var(--text-muted)'}}>{kv[0]}</p>
                    <p className="text-lg font-extrabold tabular mt-0.5" style={{color: kv[2]}}>{kv[1]}</p>
                    <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{kv[3]}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] mt-2" style={{color:'var(--text-muted)'}}>O saque para sua conta/chave PIX é feito no painel da Stripe (o app não move o dinheiro por segurança).{stripeOv.truncated ? ' Mostrando as 100 primeiras assinaturas.' : ''}</p>
          </React.Fragment>
        ) : (
          <p className="text-xs" style={{color:'var(--text-muted)'}}>Não foi possível carregar o saldo da Stripe agora. Verifique a configuração da chave ou tente recarregar.</p>
        )}
      </div>

      {/* === BANCO DE DADOS — cor pelo nivel de uso === */}
      <div className="rounded-2xl p-4" style={{background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'3px solid ' + dbu.color}}>
        <SectionHead color={dbu.color} title="Banco de dados"
          icon="M4 7v10c0 1.105 3.582 2 8 2s8-.895 8-2V7M4 7c0 1.105 3.582 2 8 2s8-.895 8-2M4 7c0-1.105 3.582-2 8-2s8 .895 8 2m0 5c0 1.105-3.582 2-8 2s-8-.895-8-2"
          right={dbStats ? <span className="text-[11px] font-bold tabular" style={{color: dbu.color}}>{dbu.pct}%</span> : null}/>
        {loadingFin && !dbStats ? (
          <Skeleton h={64} r={12}/>
        ) : dbStats ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-end justify-between">
              <p className="text-lg font-extrabold tabular" style={{color:'var(--text-main)'}}>{formatBytes(dbBytes)}</p>
              <p className="text-xs" style={{color:'var(--text-muted)'}}>de {formatBytes(DB_LIMIT_BYTES)} (Supabase free)</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--bg-subtle)'}}>
              <div className="h-full rounded-full transition-all" style={{width: dbu.pct + '%', background: dbu.color}}/>
            </div>
            {dbu.level !== 'ok' && (
              <p className="text-[11px] font-semibold" style={{color: dbu.color}}>
                {dbu.level === 'critical' ? 'Crítico — otimize tabelas ou aumente o plano do Supabase.' : 'Atenção — uso alto, planeje otimização ou upgrade.'}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {shownTables.map(function(t) {
                var w = dbBytes > 0 ? Math.max(2, Math.round((t.bytes / dbBytes) * 100)) : 0;
                return (
                  <div key={t.name} className="flex items-center gap-2">
                    <span className="text-[11px] truncate flex-shrink-0" style={{color:'var(--text-sub)', width:96}}>{t.name}</span>
                    <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{background:'var(--bg-subtle)'}}>
                      <div className="h-full rounded-full" style={{width: w + '%', background:'var(--brand, #2563eb)'}}/>
                    </div>
                    <span className="text-[10px] tabular flex-shrink-0" style={{color:'var(--text-muted)', width:64, textAlign:'right'}}>{formatBytes(t.bytes)}</span>
                  </div>
                );
              })}
              {otherBytes > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] truncate flex-shrink-0" style={{color:'var(--text-sub)', width:96}}>outros/índices</span>
                  <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{background:'var(--bg-subtle)'}}>
                    <div className="h-full rounded-full" style={{width: Math.max(2, Math.round((otherBytes / dbBytes) * 100)) + '%', background:'#94a3b8'}}/>
                  </div>
                  <span className="text-[10px] tabular flex-shrink-0" style={{color:'var(--text-muted)', width:64, textAlign:'right'}}>{formatBytes(otherBytes)}</span>
                </div>
              )}
            </div>
            <p className="text-[10px]" style={{color:'var(--text-muted)'}}>Valor total inclui índices e objetos além das tabelas listadas.</p>
          </div>
        ) : (
          <p className="text-xs" style={{color:'var(--text-muted)'}}>Não foi possível ler o tamanho do banco agora.</p>
        )}
      </div>

      <div>
        <SectionHead color="#0f766e" title="Visão geral"
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {[['Clientes', String(stats.total), false], ['Pagantes', String(stats.pagantes), false], ['Free', String(stats.free), false], ['Receita/mês', moneyBR(mrr), true]].map(function(kv) {
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
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[['Premium', stats.premium], ['Cortesia', stats.cortesia], ['Add-on', stats.addon], ['Novos no mês', stats.novos]].filter(function(c) { return c[1] > 0; }).map(function(c) {
            return <span key={c[0]} className="text-[11px] font-semibold px-2 py-1 rounded-md" style={{background:'var(--bg-subtle)', border:'1px solid var(--border)', color:'var(--text-sub)'}}>{c[0]}: <b style={{color:'var(--text-main)'}}>{c[1]}</b></span>;
          })}
          {stats.cortesia > 0 && <span className="text-[11px] px-2 py-1" style={{color:'var(--text-muted)'}}>cortesias não entram na receita</span>}
        </div>

        {wlClients.length > 0 && (
          <div className="rounded-2xl p-3 mb-3" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>
              <p className="text-xs font-bold uppercase tracking-wide flex-1" style={{color:'var(--text-muted)'}}>Personalização — assistente de setup</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{background:'var(--brand)'}}>{wlClients.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {wlClients.map(function(c) {
                var cores = [c.color, c.color_secondary, c.color_accent].filter(Boolean);
                return (
                  <div key={c.user_id} className="rounded-xl p-3 flex flex-col gap-2" style={{background:'var(--bg-subtle)', border:'1px solid var(--border)'}}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{background: c.color || '#002f59'}}>
                        {c.logo_url
                          ? <img src={c.logo_url} alt="" className="w-full h-full object-cover"/>
                          : <span className="text-white text-sm font-bold">{(c.name || '?')[0]}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{color:'var(--text-main)'}}>{c.name || 'Sem nome'}</p>
                        <p className="text-xs truncate" style={{color:'var(--text-sub)'}}>Nicho: {c.niche || c.segment || 'Não informado'}</p>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{background: c.logo_url ? '#dcfce7' : '#fee2e2', color: c.logo_url ? '#16a34a' : '#dc2626'}}>{c.logo_url ? 'Logo OK' : 'Sem logo'}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {cores.length > 0
                        ? cores.map(function(col, i) {
                            return <span key={col + '-' + i} className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded-md" style={{background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-sub)'}}><span className="w-3 h-3 rounded-sm inline-block" style={{background: col}}/>{String(col).toUpperCase()}</span>;
                          })
                        : <span className="text-xs" style={{color:'var(--text-muted)'}}>Cores não definidas</span>}
                      <button onClick={function() { setEditClient(c); }} className="text-xs font-semibold px-2.5 py-1.5 min-h-[44px] rounded-lg text-white ml-auto" style={{background:'var(--brand)'}}>Abrir setup</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl p-3 mb-1" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
          <SectionHead color="#0ea5e9" title="Clientes"
            icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.7"
            right={<span className="text-xs" style={{color:'var(--text-muted)'}}>{visibleClients.length} de {clients.length}</span>}/>
          <div className="relative mb-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Buscar por nome, email ou ID..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
          </div>
          <div className="flex gap-1.5">
            {[['all','Todos'],['pro','Pro'],['premium','Premium'],['free','Free']].map(function(f) {
              var active = planFilter === f[0];
              return <button key={f[0]} onClick={function() { setPlanFilter(f[0]); }} className={'text-xs font-semibold px-3 py-1.5 min-h-[44px] rounded-lg border transition ' + (active ? 'text-white' : 'text-gray-500 border-gray-200 hover:bg-gray-50')} style={active ? {background:'var(--brand)', borderColor:'var(--brand)'} : {}}>{f[1]}</button>;
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
                  var wa = waLinkTo(c.phone, 'Olá! Aqui é da equipe Financia.');
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
                            {isAdminGranted(c) && effectivePlan(c) !== 'free' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{background:'#fef3c7', color:'#b45309'}}>cortesia</span>}
                            {!!c.white_label && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{background:'var(--brand-soft)', color:'var(--brand)'}}>add-on</span>}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{c.user_id.slice(0, 8)}{c.updated_at ? ' · ativo ' + fmtDate(String(c.updated_at).slice(0, 10)) : ''}</p>
                        </div>
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp"
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white transition hover:opacity-90" style={{background:'#16a34a'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.913z"/></svg>
                          </a>
                        )}
                      </div>
                      {usage[c.user_id] && (
                        <div className="flex items-center gap-3 text-xs px-0.5 flex-wrap" style={{color:'var(--text-sub)'}}>
                          <span className="font-semibold tabular">{usage[c.user_id].tx_count}</span><span className="-ml-2.5">lançamentos</span>
                          <span className="font-semibold tabular">{usage[c.user_id].prod_count}</span><span className="-ml-2.5">produtos</span>
                          <span className="font-semibold tabular">{usage[c.user_id].loss_count}</span><span className="-ml-2.5">perdas</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1.5">
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer"
                            className="py-2 text-xs font-semibold rounded-lg border border-green-200 text-green-600 hover:bg-green-50 min-h-[44px] flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.913z"/></svg>
                            WhatsApp
                          </a>
                        )}
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
                          }).catch(function() { toast('Erro ao iniciar acesso ao cliente.', 'error'); });
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
        <SectionHead color="#16a34a" title="Novo cliente" icon="M12 4v16m8-8H4"/>
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
