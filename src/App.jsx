import React, { useState, useCallback, useEffect, useRef } from 'react';
import { sb } from './lib/supabase.js';
import { ldb, syncAll, toLocal, setLastSync } from './lib/db.js';
import { now, today, safe, uid } from './lib/utils.js';
import { INIT_BRAND, INIT_PLAN, atLimit, limitFor } from './lib/constants.js';
import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import Offline from './components/Offline.jsx';
import Confirm from './components/Confirm.jsx';
import UpgradeModal from './components/UpgradeModal.jsx';
import SyncBadge from './components/SyncBadge.jsx';
import Dashboard from './views/Dashboard.jsx';
import TxView from './views/TxView.jsx';
import InventoryView from './views/InventoryView.jsx';
import ReportView from './views/ReportView.jsx';
import EmailView from './views/EmailView.jsx';
import SettingsView from './views/SettingsView.jsx';
import Login from './views/Login.jsx';

const VALID_VIEWS = ['dashboard','income','expense','inventory','email','report','settings'];
const hashView = function() { const h = window.location.hash.replace('#',''); return VALID_VIEWS.includes(h) ? h : 'dashboard'; };

function Loader({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3" style={{background:'#f8fafc'}}>
      <div className="w-10 h-10 border-2 border-gray-200 rounded-full animate-spin" style={{borderTopColor:'#1a6b5c'}}/>
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const uidRef = useRef(null);
  const [isAdminDB, setIsAdminDB] = useState(sessionStorage.getItem('is_admin') === '1');
  const [appLoading, setAppLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [view, setView] = useState(hashView);
  const navTo = useCallback(function(v) { setView(v); window.location.hash = v; }, []);
  const [brand, setBrand] = useState(INIT_BRAND);
  const [planInfo, setPlanInfo] = useState(INIT_PLAN);
  const [tx, setTx] = useState([]);
  const [products, setProducts] = useState([]);
  const [losses, setLosses] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastData, setToastData] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [upgradeNotice, setUpgradeNotice] = useState(null);

  const enforceLimit = useCallback(function(kind, currentCount) {
    if (atLimit(planInfo, kind, currentCount)) {
      setUpgradeNotice({kind:kind, limit:limitFor(planInfo, kind)});
      return false;
    }
    return true;
  }, [planInfo]);

  const toast = useCallback(function(msg, type) {
    if (!type) type = 'success';
    setToastData({msg:msg, type:type});
    setTimeout(function() { setToastData(null); }, 3000);
  }, []);

  const confirm = useCallback(function(msg, onOk) { setConfirmData({msg:msg, onOk:onOk}); }, []);

  const loadFromLocal = async function(userId) {
    const results = await Promise.all([
      ldb.profiles.get(userId),
      ldb.products.where('user_id').equals(userId).filter(function(r) { return !r._deleted; }).sortBy('created_at'),
      ldb.transactions.where('user_id').equals(userId).filter(function(r) { return !r._deleted; }).reverse().sortBy('date'),
      ldb.losses.where('user_id').equals(userId).filter(function(r) { return !r._deleted; }).reverse().sortBy('date'),
      ldb.meta.get('role_' + userId),
    ]);
    const profile = results[0], prods = results[1], txs = results[2], lss = results[3], roleMeta = results[4];
    if (profile) {
      setBrand({name:profile.name, logo:profile.logo, color:profile.color, logo_url:profile.logo_url||null});
      setPlanInfo({plan:profile.plan||'free', plan_expires_at:profile.plan_expires_at||null, plan_activated_by:profile.plan_activated_by||null});
    }
    setProducts(prods);
    setTx(txs.map(function(t) { return Object.assign({}, t, {desc:t.description||t.desc, cat:t.category||t.cat}); }));
    setLosses(lss.map(function(l) { return Object.assign({}, l, {desc:l.description||l.desc}); }));
    const roleVal = roleMeta ? roleMeta.val : null;
    setIsAdminDB(roleVal === 'admin');
  };

  const fetchRole = async function(userId) {
    try {
      const res = await Promise.race([
        sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        new Promise(function(_, r) { setTimeout(function() { r(new Error('timeout')); }, 5000); }),
      ]);
      if (res.data && res.data.role) {
        await ldb.meta.put({key:'role_'+userId, val:res.data.role});
        sessionStorage.setItem('is_admin', res.data.role === 'admin' ? '1' : '0');
      }
      return !!(res.data && res.data.role === 'admin');
    } catch(_) { return false; }
  };

  const loadData = async function(userId) {
    uidRef.current = userId;
    setDataLoading(true); setDataError(null);
    try {
      await loadFromLocal(userId);
      setDataLoading(false);
      if (navigator.onLine) {
        setSyncStatus('syncing');
        const res = await Promise.all([syncAll(userId), fetchRole(userId)]);
        const ok = res[0], admin = res[1];
        setIsAdminDB(admin);
        if (!admin) sessionStorage.removeItem('is_admin');
        if (ok) { await loadFromLocal(userId); setSyncStatus('ok'); setTimeout(function() { setSyncStatus('idle'); }, 3000); }
        else { setSyncStatus('error'); setTimeout(function() { setSyncStatus('idle'); }, 5000); }
      }
    } catch(e) {
      if (navigator.onLine) {
        try {
          const allRes = await Promise.all([
            sb.from('company_profiles').select('*').eq('user_id', userId).maybeSingle(),
            sb.from('products').select('*').order('created_at').limit(500),
            sb.from('transactions').select('*').order('date', {ascending:false}).limit(500),
            sb.from('losses').select('*').order('date', {ascending:false}).limit(500),
            sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
          ]);
          const pr = allRes[0], pdr = allRes[1], txr = allRes[2], lr = allRes[3], roleRes = allRes[4];
          if (pr.data) { const p = pr.data; setBrand({name:p.name, logo:p.logo, color:p.color, logo_url:p.logo_url||null}); setPlanInfo({plan:p.plan||'free', plan_expires_at:p.plan_expires_at||null, plan_activated_by:p.plan_activated_by||null}); await ldb.profiles.put(toLocal(p)); }
          if (pdr.data) { setProducts(pdr.data); await ldb.products.bulkPut(pdr.data.map(function(r) { return toLocal(r, {user_id:userId}); })); }
          if (txr.data) { const mapped = txr.data.map(function(t) { return Object.assign({}, t, {desc:t.description, cat:t.category}); }); setTx(mapped); await ldb.transactions.bulkPut(txr.data.map(function(r) { return toLocal(r, {user_id:userId, desc:r.description, cat:r.category}); })); }
          if (lr.data) { const mapped = lr.data.map(function(l) { return Object.assign({}, l, {desc:l.description}); }); setLosses(mapped); await ldb.losses.bulkPut(lr.data.map(function(r) { return toLocal(r, {user_id:userId, desc:r.description}); })); }
          const roleData = roleRes && roleRes.data ? roleRes.data : null;
          setIsAdminDB(roleData && roleData.role === 'admin');
          await setLastSync(now());
        } catch(e2) { setDataError('Erro ao carregar dados.'); setDataLoading(false); }
      } else {
        setDataError('Sem conexao e sem dados locais. Conecte-se pelo menos uma vez.');
        setDataLoading(false);
      }
    }
    setDataLoading(false);
  };

  useEffect(function() {
    sb.auth.getSession().then(function(res) {
      const s = res.data.session;
      setSession(s);
      if (s) loadData(s.user.id);
      setAppLoading(false);
    });
    const authSub = sb.auth.onAuthStateChange(function(_, s) {
      setSession(s);
      if (s) { setIsAdminDB(false); sessionStorage.removeItem('is_admin'); loadData(s.user.id); }
      else { setTx([]); setProducts([]); setLosses([]); setBrand(INIT_BRAND); setPlanInfo(INIT_PLAN); setIsAdminDB(false); sessionStorage.removeItem('is_admin'); }
    });
    const syncInterval = setInterval(async function() {
      const userId = uidRef.current;
      if (!userId || !navigator.onLine) return;
      const ok = await syncAll(userId);
      if (ok) { await loadFromLocal(userId); setSyncStatus('ok'); setTimeout(function() { setSyncStatus('idle'); }, 3000); }
    }, 120000);
    const onHash = function() { setView(hashView()); };
    window.addEventListener('hashchange', onHash);
    return function() {
      authSub.data.subscription.unsubscribe();
      clearInterval(syncInterval);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const addTx = async function(t) {
    if (!enforceLimit('transactions', tx.length)) return;
    if (!t.desc || !t.desc.trim()) { toast('Descricao obrigatoria', 'error'); return; }
    if (!t.amount || Number(t.amount) <= 0) { toast('Valor deve ser maior que zero', 'error'); return; }
    const userId = session.user.id;
    const rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    const row = {id:t.id, type:t.type, description:t.desc, amount:Number(t.amount), date:t.date, method:t.method||null, category:t.cat||null, items:t.items||null, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now(), desc:t.desc, cat:t.cat||null};
    try { await ldb.transactions.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setTx(function(p) { return [row].concat(p); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('transactions').upsert({id:row.id, type:row.type, description:row.description, amount:row.amount, date:row.date, method:row.method, category:row.category, items:row.items, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.transactions.update(row.id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const editTx = async function(id, u) {
    if (!u.desc || !u.desc.trim()) { toast('Descricao obrigatoria', 'error'); return; }
    if (!u.amount || Number(u.amount) <= 0) { toast('Valor deve ser maior que zero', 'error'); return; }
    const upd = {description:u.desc, amount:Number(u.amount), date:u.date, method:u.method||null, category:u.cat||null, updated_at:now(), _synced:0, _updated_at:now(), desc:u.desc, cat:u.cat||null};
    try { await ldb.transactions.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setTx(function(p) { return p.map(function(t) { return t.id === id ? Object.assign({}, t, upd) : t; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('transactions').update({description:upd.description, amount:upd.amount, date:upd.date, method:upd.method, category:upd.category, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.transactions.update(id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const deleteTx = async function(id) {
    try { await ldb.transactions.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return; }
    setTx(function(p) { return p.filter(function(t) { return t.id !== id; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('transactions').delete().eq('id', id);
        if (!res.error) await ldb.transactions.delete(id);
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const addProduct = async function(p) {
    if (!enforceLimit('products', products.length)) return;
    if (!p.name || !p.name.trim()) { toast('Nome do produto obrigatorio', 'error'); return; }
    if (p.price == null || Number(p.price) < 0) { toast('Preco invalido', 'error'); return; }
    if (p.stock != null && Number(p.stock) < 0) { toast('Estoque invalido', 'error'); return; }
    const userId = session.user.id;
    const rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    const row = {id:p.id, name:p.name, category:p.category||null, price:Number(p.price), cost:Number(p.cost)||0, stock:Number(p.stock)||0, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now()};
    try { await ldb.products.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setProducts(function(prev) { return prev.concat([row]); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('products').upsert({id:row.id, name:row.name, category:row.category, price:row.price, cost:row.cost, stock:row.stock, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.products.update(row.id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const editProduct = async function(id, u) {
    if (!u.name || !u.name.trim()) { toast('Nome do produto obrigatorio', 'error'); return; }
    const upd = {name:u.name, category:u.category||null, price:Number(u.price), cost:Number(u.cost)||0, stock:Number(u.stock)||0, updated_at:now(), _synced:0, _updated_at:now()};
    try { await ldb.products.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setProducts(function(p) { return p.map(function(prod) { return prod.id === id ? Object.assign({}, prod, upd) : prod; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('products').update({name:upd.name, category:upd.category, price:upd.price, cost:upd.cost, stock:upd.stock, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.products.update(id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const deleteProduct = async function(id) {
    try { await ldb.products.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return; }
    setProducts(function(p) { return p.filter(function(prod) { return prod.id !== id; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('products').delete().eq('id', id);
        if (!res.error) await ldb.products.delete(id);
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const adjustStock = async function(id, delta) {
    const found = products.find(function(p) { return p.id === id; });
    if (!found) return;
    const ns = Math.max(0, (found.stock || 0) + delta);
    const upd = {stock:ns, updated_at:now(), _synced:0, _updated_at:now()};
    try { await ldb.products.update(id, upd); }
    catch(e) { toast('Erro ao ajustar estoque: ' + (e.message || 'tente novamente'), 'error'); return; }
    setProducts(function(p) { return p.map(function(prod) { return prod.id === id ? Object.assign({}, prod, upd) : prod; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('products').update({stock:ns, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.products.update(id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const addLoss = async function(l) {
    if (!enforceLimit('losses', losses.length)) return;
    if (!l.desc || !l.desc.trim()) { toast('Descricao obrigatoria', 'error'); return; }
    if (!l.qty || Number(l.qty) <= 0) { toast('Quantidade deve ser maior que zero', 'error'); return; }
    const userId = session.user.id;
    const rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    const row = {id:l.id, description:l.desc, qty:Number(l.qty), reason:l.reason||null, date:l.date, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now(), desc:l.desc};
    try { await ldb.losses.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setLosses(function(p) { return [row].concat(p); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('losses').upsert({id:row.id, description:row.description, qty:row.qty, reason:row.reason, date:row.date, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.losses.update(row.id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const editLoss = async function(id, u) {
    if (!u.desc || !u.desc.trim()) { toast('Descricao obrigatoria', 'error'); return; }
    if (!u.qty || Number(u.qty) <= 0) { toast('Quantidade deve ser maior que zero', 'error'); return; }
    const upd = {description:u.desc, qty:Number(u.qty), reason:u.reason||null, date:u.date, updated_at:now(), _synced:0, _updated_at:now(), desc:u.desc};
    try { await ldb.losses.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setLosses(function(p) { return p.map(function(l) { return l.id === id ? Object.assign({}, l, upd) : l; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('losses').update({description:upd.description, qty:upd.qty, reason:upd.reason, date:upd.date, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.losses.update(id, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const deleteLoss = async function(id) {
    try { await ldb.losses.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return; }
    setLosses(function(p) { return p.filter(function(l) { return l.id !== id; }); });
    if (navigator.onLine) {
      try {
        const res = await sb.from('losses').delete().eq('id', id);
        if (!res.error) await ldb.losses.delete(id);
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  const saveBrand = async function(nb) {
    const userId = session.user.id;
    const row = {user_id:userId, name:nb.name, logo:nb.logo, color:nb.color, logo_url:nb.logo_url||null, updated_at:now(), _synced:0, _updated_at:now()};
    try { await ldb.profiles.put(row); }
    catch(e) { toast('Erro ao salvar configuracoes: ' + (e.message || 'tente novamente'), 'error'); return; }
    setBrand(nb);
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({type:'UPDATE_BRAND', name:nb.name, logo_url:nb.logo_url||null, color:nb.color||'#002f59'});
    }
    if (navigator.onLine) {
      try {
        const res = await sb.from('company_profiles').upsert({user_id:userId, name:nb.name, logo:nb.logo, color:nb.color, logo_url:nb.logo_url||null});
        if (!res.error) await ldb.profiles.update(userId, {_synced:1});
        else toast('Aviso: nao sincronizado — sera tentado em breve.', 'success');
      } catch(e) { toast('Aviso: nao sincronizado — sera tentado em breve.', 'success'); }
    }
  };

  if (appLoading) return <Loader/>;
  if (!session) return <Login/>;
  if (dataLoading) return <Loader text="Carregando seus dados..."/>;
  if (dataError) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6" style={{background:'#f8fafc'}}>
      <span className="text-4xl">(!)</span>
      <p className="text-sm font-semibold text-gray-700">{dataError}</p>
      <button onClick={function() { loadData(session.user.id); }} className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold bg-green-600">Tentar novamente</button>
    </div>
  );

  const p = {brand:brand, toast:toast, confirm:confirm};
  const views = {
    dashboard: React.createElement(Dashboard, {tx:tx, products:products, brand:brand, onNav:navTo, planInfo:planInfo, lossesCount:losses.length}),
    income:    React.createElement(TxView, Object.assign({type:'income', tx:tx, products:products, onAdd:addTx, onEdit:editTx, onDelete:deleteTx, onDeductStock:function(id,qty){adjustStock(id,-qty);}}, p)),
    expense:   React.createElement(TxView, Object.assign({type:'expense', tx:tx, products:products, onAdd:addTx, onEdit:editTx, onDelete:deleteTx, onDeductStock:function(){}}, p)),
    inventory: React.createElement(InventoryView, Object.assign({products:products, losses:losses, onAddProduct:addProduct, onEditProduct:editProduct, onDeleteProduct:deleteProduct, onAddLoss:addLoss, onEditLoss:editLoss, onDeleteLoss:deleteLoss, onAdjustStock:adjustStock}, p)),
    email:     React.createElement(EmailView, {brand:brand, toast:toast}),
    report:    React.createElement(ReportView, {tx:tx, toast:toast}),
    settings:  React.createElement(SettingsView, {brand:brand, session:session, onSave:saveBrand, toast:toast, confirm:confirm, isAdmin:isAdminDB}),
  };

  return (
    <div className="min-h-screen flex" style={{background:'#f8fafc'}}>
      <Offline/>
      <SyncBadge status={syncStatus}/>
      <Sidebar view={view} onNav={navTo} brand={brand} open={sidebarOpen} isAdmin={isAdminDB} onClose={function() { setSidebarOpen(false); }}/>
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={function() { setSidebarOpen(true); }} className="text-gray-400 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="flex items-center gap-2">
            {brand.logo_url
              ? <img src={brand.logo_url} alt="logo" className="w-7 h-7 rounded-lg object-cover"/>
              : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{background:brand.color}}><span className="text-white font-bold">{((brand.logo||'F')[0])}</span></div>
            }
            <span className="font-bold text-gray-900 text-sm">{brand.name}</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-2xl w-full mx-auto">{views[view]}</main>
      </div>
      <Toast toast={toastData}/>
      {confirmData && <Confirm msg={confirmData.msg} onOk={function() { confirmData.onOk(); setConfirmData(null); }} onCancel={function() { setConfirmData(null); }}/>}
      {upgradeNotice && <UpgradeModal kind={upgradeNotice.kind} limit={upgradeNotice.limit} onClose={function() { setUpgradeNotice(null); }}/>}
    </div>
  );
}
