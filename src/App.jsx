import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { brandAlpha, deriveCores } from './lib/utils.js';
import { INIT_BRAND, INIT_PLAN, atLimit, limitFor } from './lib/constants.js';
import { useTx } from './hooks/useTx.js';
import { useProducts } from './hooks/useProducts.js';
import { useLosses } from './hooks/useLosses.js';
import { useSession } from './hooks/useSession.js';
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import Offline from './components/Offline.jsx';
import Confirm from './components/Confirm.jsx';
import SyncBadge from './components/SyncBadge.jsx';
import UpgradeModal from './components/UpgradeModal.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import { PageSkeleton } from './components/ui.jsx';
import Login from './views/Login.jsx';

const Landing       = lazy(function() { return import('./views/Landing.jsx'); });
const Dashboard     = lazy(function() { return import('./views/Dashboard.jsx'); });
const TxView        = lazy(function() { return import('./views/TxView.jsx'); });
const InventoryView = lazy(function() { return import('./views/InventoryView.jsx'); });
const ReportView    = lazy(function() { return import('./views/ReportView.jsx'); });
const EmailView     = lazy(function() { return import('./views/EmailView.jsx'); });
const SettingsView  = lazy(function() { return import('./views/SettingsView.jsx'); });
const PlansView     = lazy(function() { return import('./views/PlansView.jsx'); });

const VALID_VIEWS = ['dashboard','income','expense','inventory','email','report','settings','planos'];
const hashView = function() { const h = window.location.hash.replace('#',''); return VALID_VIEWS.includes(h) ? h : 'dashboard'; };

function Loader({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3" style={{background:'var(--bg-page)'}}>
      <div className="w-10 h-10 border-2 border-gray-200 rounded-full animate-spin" style={{borderTopColor:'var(--brand)'}}/>
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}

export default function App() {
  const [session, setSession]           = useState(null);
  const [isAdminDB, setIsAdminDB]       = useState(sessionStorage.getItem('is_admin') === '1');
  const [appLoading, setAppLoading]     = useState(true);
  const [dataLoading, setDataLoading]   = useState(false);
  const [dataError, setDataError]       = useState(null);
  const [brand, setBrand]               = useState(INIT_BRAND);
  const [planInfo, setPlanInfo]         = useState(INIT_PLAN);
  const [syncStatus, setSyncStatus]     = useState('idle');
  const [view, setView]                 = useState(hashView);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [toasts, setToasts]             = useState([]);
  const [confirmData, setConfirmData]   = useState(null);
  const [showLogin, setShowLogin]       = useState(false);
  const [showUpgrade, setShowUpgrade]   = useState(false);
  const toastId                         = useRef(0);

  const navTo = useCallback(function(v) { setView(v); window.location.hash = v; }, []);

  const applyBrandVars = useCallback(function(b) {
    var primary   = b.color || '#002f59';
    var derived   = deriveCores(primary);
    var secondary = b.color_secondary || derived.secondary;
    var accent    = b.color_accent    || derived.accent;
    var el = document.documentElement;
    el.style.setProperty('--brand', primary);
    el.style.setProperty('--brand-soft', brandAlpha(primary, 0.08));
    el.style.setProperty('--brand-secondary', secondary);
    el.style.setProperty('--brand-accent', accent);
    el.setAttribute('data-theme', b.theme || 'light');
  }, []);
  useEffect(function() { applyBrandVars(brand); }, [brand]);

  useEffect(function() {
    if (!dataLoading) return;
    var t = setTimeout(function() { setDataLoading(false); setSyncStatus('idle'); }, 25000);
    return function() { clearTimeout(t); };
  }, [dataLoading]);

  useEffect(function() {
    var onHash = function() { setView(hashView()); };
    window.addEventListener('hashchange', onHash);
    return function() { window.removeEventListener('hashchange', onHash); };
  }, []);

  const dismissToast = useCallback(function(id) {
    setToasts(function(list) { return list.filter(function(t) { return t.id !== id; }); });
  }, []);

  const toast = useCallback(function(msg, type) {
    if (!type) type = 'success';
    var id = ++toastId.current;
    setToasts(function(list) { return list.concat([{id:id, msg:msg, type:type}]); });
    setTimeout(function() {
      setToasts(function(list) { return list.filter(function(t) { return t.id !== id; }); });
    }, type === 'error' ? 4000 : 3000);
  }, []);

  const confirm = useCallback(function(msg, onOk) { setConfirmData({msg:msg, onOk:onOk}); }, []);

  const enforceLimit = useCallback(function(kind, currentCount) {
    if (atLimit(planInfo, kind, currentCount)) {
      setShowUpgrade({ kind: kind, limit: limitFor(planInfo, kind) });
      return false;
    }
    return true;
  }, [planInfo]);

  const {tx, setTx, addTx, editTx, deleteTx}                                           = useTx(session, enforceLimit, toast);
  const {products, setProducts, addProduct, editProduct, deleteProduct, adjustStock}    = useProducts(session, enforceLimit, toast);
  const {losses, setLosses, addLoss, editLoss, deleteLoss}                             = useLosses(session, enforceLimit, toast);

  const {saveBrand, loadData} = useSession({
    toast, session, setSession,
    isAdminDB, setIsAdminDB,
    setAppLoading, setDataLoading, setDataError,
    setBrand, setPlanInfo, setSyncStatus,
    setTx, setProducts, setLosses,
  });

  if (appLoading) return <Loader/>;
  if (!session) {
    var seen = !!localStorage.getItem('financia_seen');
    if (!seen && !showLogin) {
      return (
        <Suspense fallback={<Loader/>}>
          <Landing brand={brand} onEnter={function() { setShowLogin(true); }}/>
        </Suspense>
      );
    }
    return <Login brand={brand}/>;
  }
  if (dataLoading) return <Loader text="Carregando seus dados..."/>;
  if (dataError) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6" style={{background:'var(--bg-page)'}}>
      <span className="text-4xl">(!)</span>
      <p className="text-sm font-semibold text-gray-700">{dataError}</p>
      <button onClick={function() { loadData(session.user.id); }} className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold bg-green-600">Tentar novamente</button>
    </div>
  );

  const p = {brand:brand, toast:toast, confirm:confirm};
  const views = {
    dashboard: React.createElement(Dashboard, {tx:tx, products:products, brand:brand, onNav:navTo, planInfo:planInfo, lossesCount:losses.length, onUpgrade:function() { navTo('planos'); }}),
    income:    React.createElement(TxView, Object.assign({type:'income', tx:tx, products:products, onAdd:addTx, onEdit:editTx, onDelete:deleteTx, onDeductStock:function(id,qty){adjustStock(id,-qty);}}, p)),
    expense:   React.createElement(TxView, Object.assign({type:'expense', tx:tx, products:products, onAdd:addTx, onEdit:editTx, onDelete:deleteTx, onDeductStock:function(){}}, p)),
    inventory: React.createElement(InventoryView, Object.assign({products:products, losses:losses, onAddProduct:addProduct, onEditProduct:editProduct, onDeleteProduct:deleteProduct, onAddLoss:addLoss, onEditLoss:editLoss, onDeleteLoss:deleteLoss, onAdjustStock:adjustStock}, p)),
    email:     React.createElement(EmailView, {brand:brand, toast:toast}),
    report:    React.createElement(ReportView, {tx:tx, brand:brand, toast:toast, onNav:navTo}),
    settings:  React.createElement(SettingsView, {brand:brand, session:session, onSave:saveBrand, toast:toast, confirm:confirm, isAdmin:isAdminDB}),
    planos:    React.createElement(PlansView, {brand:brand, planInfo:planInfo}),
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{background:'var(--bg-page)'}}>
      <Offline/>
      <UpdateBanner brand={brand}/>
      <SyncBadge status={syncStatus}/>
      <Sidebar view={view} onNav={navTo} brand={brand} open={sidebarOpen} isAdmin={isAdminDB} session={session} onClose={function() { setSidebarOpen(false); }}/>
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 w-full">
        <Header brand={brand} syncStatus={syncStatus} onMenuOpen={function() { setSidebarOpen(true); }}/>
        <main className="flex-1 p-4 lg:p-8 max-w-2xl w-full mx-auto pb-24 lg:pb-8 min-w-0 overflow-x-hidden">
          <Suspense fallback={<PageSkeleton/>}>
            {views[view]}
          </Suspense>
        </main>
      </div>
      <BottomNav view={view} onNav={navTo} brand={brand}/>
      <Toast toasts={toasts} onDismiss={dismissToast}/>
      {confirmData && <Confirm msg={confirmData.msg} onOk={function() { confirmData.onOk(); setConfirmData(null); }} onCancel={function() { setConfirmData(null); }}/>}
      {showUpgrade && <UpgradeModal reason={typeof showUpgrade === 'object' ? showUpgrade : null} brand={brand} onClose={function() { setShowUpgrade(false); }}/>}
    </div>
  );
}
