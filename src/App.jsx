import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { brandAlpha, deriveCores } from './lib/utils.js';
import { INIT_BRAND, INIT_PLAN, atLimit, limitFor } from './lib/constants.js';
import { useTx } from './hooks/useTx.js';
import { useProducts } from './hooks/useProducts.js';
import { useLosses } from './hooks/useLosses.js';
import { useSession } from './hooks/useSession.js';
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import Header from './components/Header.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Toast from './components/Toast.jsx';
import Offline from './components/Offline.jsx';
import Confirm from './components/Confirm.jsx';
import SyncBadge from './components/SyncBadge.jsx';
import UpgradeModal from './components/UpgradeModal.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import Onboarding from './components/Onboarding.jsx';
import { PageSkeleton } from './components/ui.jsx';
import Login from './views/Login.jsx';

const Landing       = lazy(function() { return import('./views/Landing.jsx'); });
const Dashboard     = lazy(function() { return import('./views/Dashboard.jsx'); });
const TxView        = lazy(function() { return import('./views/TxView.jsx'); });
const InventoryView = lazy(function() { return import('./views/InventoryView.jsx'); });
const ReportView    = lazy(function() { return import('./views/ReportView.jsx'); });
const EmailView     = lazy(function() { return import('./views/EmailView.jsx'); });
const SettingsView  = lazy(function() { return import('./views/SettingsView.jsx'); });
const PlansView      = lazy(function() { return import('./views/PlansView.jsx'); });
const PrivacyPolicy  = lazy(function() { return import('./views/PrivacyPolicy.jsx'); });
const TermsOfService = lazy(function() { return import('./views/TermsOfService.jsx'); });

const VALID_VIEWS = ['dashboard','income','expense','inventory','email','report','settings','planos'];
const hashView = function() { const h = window.location.hash.replace('#',''); return VALID_VIEWS.includes(h) ? h : 'dashboard'; };
const isLandingPreview = function() { return window.location.hash.replace('#','') === 'landing'; };
const isLegalPage = function() { var h = window.location.hash.replace('#',''); return h === 'privacidade' || h === 'termos'; };

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
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const onboardingRef                   = useRef(null); // null=indeciso, true/false=decidido
  const [themePref, setThemePref]       = useState(function() { try { return localStorage.getItem('financia_theme'); } catch (e) { return null; } });
  const toastId                         = useRef(0);

  // Tema efetivo: preferência salva do usuário tem prioridade sobre o tema da marca.
  var effectiveTheme = themePref || (brand && brand.theme) || 'light';

  const toggleTheme = useCallback(function() {
    setThemePref(function(prev) {
      var current = prev || (brand && brand.theme) || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('financia_theme', next); } catch (e) {}
      return next;
    });
  }, [brand]);

  const navTo = useCallback(function(v) {
    var go = function() { setView(v); window.location.hash = v; };
    // View Transitions API nativa: anima a troca de pagina quando suportado.
    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(function() { flushSync(go); });
    } else {
      go();
    }
  }, []);

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
    el.style.setProperty('--brand-accent-soft', brandAlpha(accent, 0.12));
    el.style.setProperty('--brand-grad', 'linear-gradient(135deg, ' + primary + ' 0%, ' + accent + ' 100%)');
  }, []);
  useEffect(function() { applyBrandVars(brand); }, [brand]);

  // data-theme aplicado separado: respeita a preferência do usuário (persistida).
  useEffect(function() {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

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

  // Decisao de onboarding (nome/telefone). Corrige o loop telefone<->dashboard:
  // - so decide com o perfil ja carregado (dataLoading === false);
  // - telefone tratado por digitos (com ou sem +);
  // - regra monotonica: pode sumir (true->false) quando o telefone chega ou o
  //   usuario conclui, mas NUNCA reaparece (false->true) por causa de um sync.
  useEffect(function() {
    if (!session) { onboardingRef.current = null; setOnboardingNeeded(false); return; }
    if (dataLoading) return;
    var meta2 = session.user.user_metadata || {};
    var gName = meta2.full_name || meta2.name || '';
    var doneFlag = !!localStorage.getItem('financia_onboarded_' + session.user.id);
    var digits = function(s) { return String(s || '').replace(/\D/g, ''); };
    var hasPhone = digits(brand.phone).length > 0 || digits(meta2.phone).length > 0;
    var needName = !!gName && brand.name === gName;
    var needs = !doneFlag && (needName || !hasPhone);
    if (onboardingRef.current === null) {
      onboardingRef.current = needs;
      setOnboardingNeeded(needs);
    } else if (onboardingRef.current === true && !needs) {
      onboardingRef.current = false;
      setOnboardingNeeded(false);
    }
  }, [session, dataLoading, brand]);

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

  const {tx, setTx, addTx, addGenerated, editTx, deleteTx}                              = useTx(session, enforceLimit, toast);
  const {products, setProducts, addProduct, editProduct, deleteProduct, adjustStock}    = useProducts(session, enforceLimit, toast);
  const {losses, setLosses, addLoss, editLoss, deleteLoss}                             = useLosses(session, enforceLimit, toast);

  const {saveBrand, savePhone, loadData} = useSession({
    toast, session, setSession,
    isAdminDB, setIsAdminDB,
    setAppLoading, setDataLoading, setDataError,
    setBrand, setPlanInfo, setSyncStatus,
    setTx, setProducts, setLosses,
  });

  if (appLoading) return <Loader/>;

  // Páginas legais — acessíveis sem autenticação
  if (isLegalPage()) {
    var legalHash = window.location.hash.replace('#','');
    return (
      <Suspense fallback={<Loader/>}>
        {legalHash === 'privacidade' ? <PrivacyPolicy/> : <TermsOfService/>}
      </Suspense>
    );
  }

  if (isLandingPreview()) {
    return (
      <Suspense fallback={<Loader/>}>
        <Landing brand={brand} onEnter={function() { window.location.hash = ''; setShowLogin(true); }}/>
      </Suspense>
    );
  }
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

  var uid = session.user.id;
  var meta = session.user.user_metadata || {};
  var googleName = meta.full_name || meta.name || '';
  var phoneDigits = String(brand.phone || '').replace(/\D/g, '');
  var metaPhoneDigits = String(meta.phone || '').replace(/\D/g, '');
  var needsName = !!googleName && brand.name === googleName;
  var needsPhone = phoneDigits.length === 0 && metaPhoneDigits.length === 0;
  if (onboardingNeeded) {
    var finishOnboarding = function(data) {
      var tasks = [];
      if (needsName && data.name) {
        var nb = Object.assign({}, brand, {name: data.name});
        tasks.push(Promise.resolve(saveBrand(nb)));
      }
      if (data.phone) tasks.push(Promise.resolve(savePhone(data.phone)));
      return Promise.all(tasks).then(function() {
        localStorage.setItem('financia_onboarded_' + uid, '1');
        onboardingRef.current = false;
        setOnboardingNeeded(false);
      });
    };
    return <Onboarding brand={brand} needsName={needsName} needsPhone={needsPhone} onSave={finishOnboarding}/>;
  }

  var currentView = (view === 'email' && !isAdminDB) ? 'dashboard' : view;

  const p = {brand:brand, toast:toast, confirm:confirm};
  const views = {
    dashboard: React.createElement(Dashboard, {tx:tx, products:products, brand:brand, onNav:navTo, planInfo:planInfo, lossesCount:losses.length, onUpgrade:function() { navTo('planos'); }}),
    income:    React.createElement(TxView, Object.assign({type:'income', tx:tx, products:products, onAdd:addTx, onEdit:editTx, onDelete:deleteTx, onDeductStock:function(id,qty){adjustStock(id,-qty);}, planInfo:planInfo, onNav:navTo}, p)),
    expense:   React.createElement(TxView, Object.assign({type:'expense', tx:tx, products:products, onAdd:addTx, onEdit:editTx, onDelete:deleteTx, onDeductStock:function(){}, onAddGenerated:addGenerated, uid:uid, planInfo:planInfo, onNav:navTo}, p)),
    inventory: React.createElement(InventoryView, Object.assign({products:products, losses:losses, onAddProduct:addProduct, onEditProduct:editProduct, onDeleteProduct:deleteProduct, onAddLoss:addLoss, onEditLoss:editLoss, onDeleteLoss:deleteLoss, onAdjustStock:adjustStock, planInfo:planInfo, onNav:navTo}, p)),
    email:     React.createElement(EmailView, {brand:brand, toast:toast}),
    report:    React.createElement(ReportView, {tx:tx, brand:brand, toast:toast, onNav:navTo, planInfo:planInfo}),
    settings:  React.createElement(SettingsView, {brand:brand, session:session, planInfo:planInfo, onSave:saveBrand, onSavePhone:savePhone, toast:toast, confirm:confirm, isAdmin:isAdminDB, onNav:navTo}),
    planos:    React.createElement(PlansView, {brand:brand, planInfo:planInfo, toast:toast}),
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{background:'var(--bg-page)'}}>
      <Offline/>
      <UpdateBanner brand={brand}/>
      <SyncBadge status={syncStatus}/>
      <Sidebar view={view} onNav={navTo} brand={brand} open={sidebarOpen} isAdmin={isAdminDB} session={session} onClose={function() { setSidebarOpen(false); }}/>
      <div className="hidden lg:block fixed top-4 right-4 z-30">
        <ThemeToggle theme={effectiveTheme} onToggle={toggleTheme} variant="floating"/>
      </div>
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 w-full">
        <Header brand={brand} syncStatus={syncStatus} theme={effectiveTheme} onToggleTheme={toggleTheme} onMenuOpen={function() { setSidebarOpen(true); }}/>
        <main className="flex-1 p-4 lg:p-8 max-w-2xl w-full mx-auto pb-24 lg:pb-8 min-w-0 overflow-x-hidden">
          <Suspense fallback={<PageSkeleton/>}>
            {views[currentView]}
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
