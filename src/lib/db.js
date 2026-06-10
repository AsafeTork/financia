import Dexie from 'dexie';
import { sb } from './supabase.js';
import { now } from './utils.js';

export const ldb = new Dexie('gestao_offline');

ldb.version(1).stores({
  transactions: 'id, user_id, date, _synced, _deleted, _updated_at',
  products:     'id, user_id, category, _synced, _deleted, _updated_at',
  losses:       'id, user_id, date, _synced, _deleted, _updated_at',
  profiles:     'user_id, _synced, _updated_at',
  meta:         'key',
});
ldb.version(2).stores({
  transactions: 'id, user_id, date, _synced, _deleted, _updated_at, registered_by',
  products:     'id, user_id, category, _synced, _deleted, _updated_at, registered_by',
  losses:       'id, user_id, date, _synced, _deleted, _updated_at, registered_by',
  profiles:     'user_id, _synced, _updated_at',
  meta:         'key',
});

export const toLocal = (row, extra = {}) => ({
  ...row,
  _synced: 1,
  _deleted: 0,
  _updated_at: row.updated_at || row.created_at || now(),
  ...extra,
});

const TX_FIELDS  = ['id','type','description','amount','date','method','category','items','user_id','registered_by','updated_at'];
const PRD_FIELDS = ['id','name','category','price','cost','stock','user_id','registered_by','updated_at'];
const LSS_FIELDS = ['id','description','qty','reason','date','user_id','registered_by','updated_at'];

const FIELD_MAP = {
  transactions: TX_FIELDS,
  products:     PRD_FIELDS,
  losses:       LSS_FIELDS,
};

const pickFields = (obj, fields) => {
  const out = {};
  fields.forEach(k => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
};

const getLastSync = async () => {
  const r = await ldb.meta.get('last_sync');
  return r ? r.val : '1970-01-01T00:00:00Z';
};

export const setLastSync = ts => ldb.meta.put({ key: 'last_sync', val: ts });

export const syncTable = async (uid, table, ldbTable, mapLocal) => {
  if (!navigator.onLine) return;
  const lastSync = await getLastSync();
  const fields = FIELD_MAP[table] || [];

  const unsynced = await ldbTable.where('user_id').equals(uid).and(r => r._synced === 0).toArray();
  for (const row of unsynced) {
    try {
      if (row._deleted) {
        await sb.from(table).delete().eq('id', row.id);
        await ldbTable.delete(row.id);
      } else {
        const sbRow = pickFields(
          { ...row, description: row.description || row.desc, category: row.category || row.cat },
          fields
        );
        const { error } = await sb.from(table).upsert(sbRow);
        if (!error) await ldbTable.update(row.id, { _synced: 1 });
      }
    } catch (_) {}
  }

  const { data: remote, error: pullErr } = await sb.from(table).select('*')
    .eq('user_id', uid)
    .gte('updated_at', lastSync)
    .limit(500);
  if (pullErr) return;
  for (const row of remote || []) {
    const existing = await ldbTable.get(row.id);
    if (!existing || existing._synced === 1) {
      await ldbTable.put(toLocal(row, mapLocal(row)));
    }
  }
};

const PROFILE_WRITE_FIELDS = ['user_id','name','logo','color','logo_url'];

export const syncProfiles = async uid => {
  if (!navigator.onLine) return;
  const unsynced = await ldb.profiles.where('user_id').equals(uid).and(r => r._synced === 0).toArray();
  for (const row of unsynced) {
    const clean = {};
    PROFILE_WRITE_FIELDS.forEach(k => { if (row[k] !== undefined) clean[k] = row[k]; });
    const { error } = await sb.from('company_profiles').upsert(clean);
    if (!error) await ldb.profiles.update(uid, { _synced: 1 });
  }
  const { data } = await sb.from('company_profiles').select('*').eq('user_id', uid).maybeSingle();
  if (data) await ldb.profiles.put(toLocal(data));
};

export const syncAll = async uid => {
  if (!uid || !navigator.onLine) return false;
  try {
    const ts = now();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000));
    await Promise.race([
      Promise.all([
        syncTable(uid, 'transactions', ldb.transactions, r => ({ desc: r.description, cat: r.category })),
        syncTable(uid, 'products',     ldb.products,     () => ({})),
        syncTable(uid, 'losses',       ldb.losses,       r => ({ desc: r.description })),
        syncProfiles(uid),
      ]),
      timeout,
    ]);
    await setLastSync(ts);
    return true;
  } catch (e) { console.warn('syncAll:', e.message); return false; }
};

export const fetchClients = async () => {
  try {
    const { data } = await sb.from('company_profiles').select('*').order('user_id');
    return data || [];
  } catch (_) { return []; }
};

export const deleteClient = async uid => {
  try {
    await sb.from('company_profiles').delete().eq('user_id', uid);
    await sb.from('transactions').delete().eq('user_id', uid);
    await sb.from('products').delete().eq('user_id', uid);
    await sb.from('losses').delete().eq('user_id', uid);
    await sb.from('user_roles').delete().eq('user_id', uid);
    return true;
  } catch (_) { return false; }
};

export const triggerApkBuild = async (clientName, logoUrl, primaryColor) => {
  const tok = sessionStorage.getItem('nancia_gh_token') || '';
  if (!tok) return false;
  const res = await fetch(
    'https://api.github.com/repos/AsafeTork/gestao-financeira/actions/workflows/build-apk.yml/dispatches',
    {
      method: 'POST',
      headers: { Authorization: 'token ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: {
        client_name: clientName || 'Financia',
        logo_url: logoUrl || '',
        primary_color: (primaryColor || '#002f59').replace('#', ''),
      }}),
    }
  );
  return res.status === 204;
};
