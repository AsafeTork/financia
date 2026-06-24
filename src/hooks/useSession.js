import { useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabase.js';
import { ldb, syncAll, toLocal, setLastSync } from '../lib/db.js';
import { now } from '../lib/utils.js';
import { INIT_BRAND, INIT_PLAN } from '../lib/constants.js';

export function useSession(p) {
  var toast         = p.toast;
  var session       = p.session;
  var setSession    = p.setSession;
  var isAdminDB     = p.isAdminDB;
  var setIsAdminDB  = p.setIsAdminDB;
  var setAppLoading = p.setAppLoading;
  var setDataLoading= p.setDataLoading;
  var setDataError  = p.setDataError;
  var setBrand      = p.setBrand;
  var setPlanInfo   = p.setPlanInfo;
  var setSyncStatus = p.setSyncStatus;
  var setTx         = p.setTx;
  var setProducts   = p.setProducts;
  var setLosses     = p.setLosses;

  var uidRef        = useRef(null);
  var loadingRef    = useRef(0);
  var channelRef    = useRef(null);
  var syncingRef    = useRef(false);
  var debounceRef   = useRef(null);
  var retryRef      = useRef(null);
  var retryDelayRef = useRef(1000);

  var runSync = function() {
    var userId = uidRef.current;
    if (!userId || !navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    syncAll(userId).then(function(ok) {
      syncingRef.current = false;
      if (ok) loadFromLocal(userId);
    }).catch(function() { syncingRef.current = false; });
  };

  var subscribeRealtime = function(uid) {
    if (channelRef.current) { sb.removeChannel(channelRef.current); channelRef.current = null; }
    var doSync = function() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(runSync, 800);
    };
    channelRef.current = sb.channel('rt-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, doSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, doSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'losses' }, doSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_profiles' }, doSync)
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          retryDelayRef.current = 1000;
          runSync();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (retryRef.current) clearTimeout(retryRef.current);
          var delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * 2, 30000);
          retryRef.current = setTimeout(function() {
            if (uidRef.current && navigator.onLine) subscribeRealtime(uidRef.current);
          }, delay);
        }
      });
  };

  var loadFromLocal = async function(userId) {
    var results = await Promise.all([
      ldb.profiles.get(userId),
      ldb.products.where('user_id').equals(userId).filter(function(r) { return !r._deleted; }).sortBy('created_at'),
      ldb.transactions.where('user_id').equals(userId).filter(function(r) { return !r._deleted; }).reverse().sortBy('date'),
      ldb.losses.where('user_id').equals(userId).filter(function(r) { return !r._deleted; }).reverse().sortBy('date'),
      ldb.meta.get('role_' + userId),
    ]);
    var profile = results[0], prods = results[1], txs = results[2], lss = results[3], roleMeta = results[4];
    if (profile) {
      setBrand({name:profile.name, logo:profile.logo, color:profile.color, color_secondary:profile.color_secondary||null, color_accent:profile.color_accent||null, theme:profile.theme||'light', logo_url:profile.logo_url||null, phone:profile.phone||''});
      setPlanInfo({plan:profile.plan||'free', plan_expires_at:profile.plan_expires_at||null, plan_activated_by:profile.plan_activated_by||null});
    }
    setProducts(prods);
    setTx(txs.map(function(t) { return Object.assign({}, t, {desc:t.description||t.desc, cat:t.category||t.cat}); }));
    setLosses(lss.map(function(l) { return Object.assign({}, l, {desc:l.description||l.desc}); }));
    var roleVal = roleMeta ? roleMeta.val : null;
    setIsAdminDB(roleVal === 'admin');
  };

  var fetchRole = async function(userId) {
    try {
      var res = await Promise.race([
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

  var loadData = async function(userId) {
    var token = ++loadingRef.current;
    uidRef.current = userId;
    setDataError(null);
    var localDone = false;
    var localTimer = setTimeout(function() {
      if (!localDone && loadingRef.current === token) setDataLoading(true);
    }, 150);
    try {
      await loadFromLocal(userId);
      localDone = true;
      clearTimeout(localTimer);
      if (loadingRef.current !== token) return;
      setDataLoading(false);
      subscribeRealtime(userId);
      if (navigator.onLine) {
        setSyncStatus('syncing');
        var res = await Promise.all([syncAll(userId), fetchRole(userId)]);
        if (loadingRef.current !== token) return;
        var ok = res[0], admin = res[1];
        setIsAdminDB(admin);
        if (!admin) sessionStorage.removeItem('is_admin');
        if (ok) {
          await loadFromLocal(userId);
          if (loadingRef.current !== token) return;
          setSyncStatus('ok');
          setTimeout(function() { setSyncStatus('idle'); }, 3000);
        } else {
          setSyncStatus('error');
          setTimeout(function() { setSyncStatus('idle'); }, 5000);
        }
      }
    } catch(e) {
      localDone = true;
      clearTimeout(localTimer);
      if (loadingRef.current !== token) return;
      setDataLoading(false);
      setSyncStatus('error');
      setTimeout(function() { setSyncStatus('idle'); }, 5000);
      if (navigator.onLine) {
        try {
          var allRes = await Promise.all([
            sb.from('company_profiles').select('*').eq('user_id', userId).maybeSingle(),
            sb.from('products').select('*').order('created_at').limit(500),
            sb.from('transactions').select('*').order('date', {ascending:false}).limit(500),
            sb.from('losses').select('*').order('date', {ascending:false}).limit(500),
            sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
          ]);
          var pr = allRes[0], pdr = allRes[1], txr = allRes[2], lr = allRes[3], roleRes = allRes[4];
          if (pr.data) {
            var prof = pr.data;
            setBrand({name:prof.name, logo:prof.logo, color:prof.color, color_secondary:prof.color_secondary||null, color_accent:prof.color_accent||null, theme:prof.theme||'light', logo_url:prof.logo_url||null, phone:prof.phone||''});
            setPlanInfo({plan:prof.plan||'free', plan_expires_at:prof.plan_expires_at||null, plan_activated_by:prof.plan_activated_by||null});
            await ldb.profiles.put(toLocal(prof));
          }
          if (pdr.data) {
            setProducts(pdr.data);
            await ldb.products.bulkPut(pdr.data.map(function(r) { return toLocal(r, {user_id:userId}); }));
          }
          if (txr.data) {
            var mappedTx = txr.data.map(function(t) { return Object.assign({}, t, {desc:t.description, cat:t.category}); });
            setTx(mappedTx);
            await ldb.transactions.bulkPut(txr.data.map(function(r) { return toLocal(r, {user_id:userId, desc:r.description, cat:r.category}); }));
          }
          if (lr.data) {
            var mappedL = lr.data.map(function(l) { return Object.assign({}, l, {desc:l.description}); });
            setLosses(mappedL);
            await ldb.losses.bulkPut(lr.data.map(function(r) { return toLocal(r, {user_id:userId, desc:r.description}); }));
          }
          var roleData = roleRes && roleRes.data ? roleRes.data : null;
          setIsAdminDB(roleData && roleData.role === 'admin');
          await setLastSync(now(), userId);
        } catch(e2) { setDataError('Erro ao carregar dados.'); }
      } else {
        setDataError('Sem conexão e sem dados locais. Conecte-se pelo menos uma vez.');
      }
    } finally {
      clearTimeout(localTimer);
      if (loadingRef.current === token) setDataLoading(false);
    }
  };

  var saveBrand = async function(nb) {
    var userId = session.user.id;
    var row = {user_id:userId, name:nb.name, logo:nb.logo, color:nb.color, color_secondary:nb.color_secondary||null, color_accent:nb.color_accent||null, theme:nb.theme||'light', logo_url:nb.logo_url||null, updated_at:now(), _synced:0, _updated_at:now()};
    try { await ldb.profiles.put(row); }
    catch(e) { toast('Erro ao salvar configurações: ' + (e.message || 'tente novamente'), 'error'); return; }
    setBrand(nb);
    toast('Configurações salvas', 'success');
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({type:'UPDATE_BRAND', name:nb.name, logo_url:nb.logo_url||null, color:nb.color||'#002f59'});
    }
    if (navigator.onLine) {
      try {
        var res = await sb.from('company_profiles').upsert({user_id:userId, name:nb.name, logo:nb.logo, color:nb.color, color_secondary:nb.color_secondary||null, color_accent:nb.color_accent||null, theme:nb.theme||'light', logo_url:nb.logo_url||null});
        if (!res.error) await ldb.profiles.update(userId, {_synced:1});
        else toast('Não sincronizado — tentaremos em breve', 'warning');
      } catch(e) { toast('Não sincronizado — tentaremos em breve', 'warning'); }
    }
  };

  useEffect(function() {
    var cachedUid = localStorage.getItem('financia_last_uid');
    if (cachedUid) { loadFromLocal(cachedUid).catch(function() {}); }

    var _authTimer = setTimeout(function() { setAppLoading(false); }, 8000);
    sb.auth.getSession().then(function(res) {
      clearTimeout(_authTimer);
      var s = res.data.session;
      setSession(s);
      if (s) {
        localStorage.setItem('financia_last_uid', s.user.id);
        localStorage.setItem('financia_seen', '1');
        loadData(s.user.id);
      } else {
        localStorage.removeItem('financia_last_uid');
        if (cachedUid) { setTx([]); setProducts([]); setLosses([]); setBrand(INIT_BRAND); setPlanInfo(INIT_PLAN); }
      }
      setAppLoading(false);
    }).catch(function() { clearTimeout(_authTimer); setAppLoading(false); });

    var authSub = sb.auth.onAuthStateChange(function(event, s) {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setSession(s);
      if (s) {
        localStorage.setItem('financia_last_uid', s.user.id);
        localStorage.setItem('financia_seen', '1');
        if (s.user.id !== uidRef.current) {
          setIsAdminDB(false);
          sessionStorage.removeItem('is_admin');
          loadData(s.user.id);
        }
      } else {
        localStorage.removeItem('financia_last_uid');
        ++loadingRef.current;
        setDataLoading(false);
        uidRef.current = null;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (retryRef.current) clearTimeout(retryRef.current);
        if (channelRef.current) { sb.removeChannel(channelRef.current); channelRef.current = null; }
        setTx([]); setProducts([]); setLosses([]);
        setBrand(INIT_BRAND); setPlanInfo(INIT_PLAN);
        setIsAdminDB(false); sessionStorage.removeItem('is_admin');
      }
    });

    var syncInterval = setInterval(async function() {
      var userId = uidRef.current;
      if (!userId || !navigator.onLine) return;
      setSyncStatus('syncing');
      var ok = await syncAll(userId);
      if (ok) {
        await loadFromLocal(userId);
        setSyncStatus('ok');
        setTimeout(function() { setSyncStatus('idle'); }, 3000);
      } else {
        setSyncStatus('error');
        setTimeout(function() { setSyncStatus('idle'); }, 5000);
      }
    }, 120000);

    var onVisible = function() {
      if (document.visibilityState !== 'visible') return;
      var userId = uidRef.current;
      if (!userId || !navigator.onLine) return;
      syncAll(userId).then(function(ok) { if (ok) loadFromLocal(userId); });
    };
    document.addEventListener('visibilitychange', onVisible);

    var onOnline = function() {
      var userId = uidRef.current;
      if (!userId) return;
      retryDelayRef.current = 1000;
      subscribeRealtime(userId);
      syncAll(userId).then(function(ok) { if (ok) loadFromLocal(userId); });
    };
    window.addEventListener('online', onOnline);

    return function() {
      authSub.data.subscription.unsubscribe();
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
      if (channelRef.current) { sb.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, []);

  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (!params.get('imp')) return;
    var raw = localStorage.getItem('_imp');
    if (!raw) return;
    try {
      var imp = JSON.parse(raw);
      if (Date.now() > imp.exp) { localStorage.removeItem('_imp'); return; }
      localStorage.removeItem('_imp');
      window.history.replaceState({}, '', window.location.pathname);
      sb.auth.signInWithPassword({email: imp.email, password: imp.pass}).then(function(res) {
        if (!res.error) { sessionStorage.setItem('_imp_uid', imp.uid); }
      });
    } catch(e) { localStorage.removeItem('_imp'); }
  }, []);

  useEffect(function() {
    var handler = function() {
      var uid = sessionStorage.getItem('_imp_uid');
      if (uid) { localStorage.setItem('_imp_restore', uid); sessionStorage.removeItem('_imp_uid'); }
    };
    window.addEventListener('pagehide', handler);
    return function() { window.removeEventListener('pagehide', handler); };
  }, []);

  useEffect(function() {
    if (!isAdminDB) return;
    var handler = function(e) {
      if (e.key !== '_imp_restore' || !e.newValue) return;
      var uid = e.newValue;
      localStorage.removeItem('_imp_restore');
      sb.rpc('admin_impersonate_restore', {target_uid: uid}).catch(function() {});
    };
    window.addEventListener('storage', handler);
    return function() { window.removeEventListener('storage', handler); };
  }, [isAdminDB]);

  var savePhone = async function(newPhone) {
    var userId = session.user.id;
    var clean = (newPhone || '').replace(/\D/g, '');
    try {
      var existing = await ldb.profiles.get(userId);
      if (existing) await ldb.profiles.update(userId, {phone:clean, _synced:0, _updated_at:now()});
    } catch(e) {}
    setBrand(function(b) { return Object.assign({}, b, {phone:clean}); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('company_profiles').update({phone:clean}).eq('user_id', userId);
        if (!res.error) { await ldb.profiles.update(userId, {_synced:1}); toast('Telefone atualizado', 'success'); }
        else toast('Não sincronizado — tentaremos em breve', 'warning');
      } catch(e) { toast('Não sincronizado — tentaremos em breve', 'warning'); }
    } else {
      toast('Telefone salvo — sincroniza quando online', 'success');
    }
    return true;
  };

  return {saveBrand, savePhone, loadData};
}
