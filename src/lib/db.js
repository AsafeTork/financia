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

export const toLocal = function(row, extra) {
  if (!extra) extra = {};
  var base = { _synced: 1, _deleted: 0, _updated_at: row.updated_at || row.created_at || now() };
  return Object.assign({}, row, base, extra);
};

const TX_FIELDS  = ['id','type','description','amount','date','method','category','items','user_id','registered_by','updated_at'];
const PRD_FIELDS = ['id','name','category','price','cost','stock','user_id','registered_by','updated_at'];
const LSS_FIELDS = ['id','description','qty','reason','date','user_id','registered_by','updated_at'];

const FIELD_MAP = {
  transactions: TX_FIELDS,
  products:     PRD_FIELDS,
  losses:       LSS_FIELDS,
};

const pickFields = function(obj, fields) {
  const out = {};
  fields.forEach(function(k) { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
};

const getLastSync = async function(uid) {
  const key = uid ? 'last_sync_' + uid : 'last_sync';
  const r = await ldb.meta.get(key);
  return r ? r.val : '1970-01-01T00:00:00Z';
};

export const setLastSync = function(ts, uid) {
  const key = uid ? 'last_sync_' + uid : 'last_sync';
  return ldb.meta.put({ key: key, val: ts });
};

export const syncTable = async function(uid, table, ldbTable, mapLocal) {
  if (!navigator.onLine) return;
  const lastSync = await getLastSync(uid);
  const fields = FIELD_MAP[table] || [];

  const unsynced = await ldbTable.where('user_id').equals(uid).and(r => r._synced === 0).toArray();
  const toDeleteIds = [];
  const toMarkSynced = [];
  for (const row of unsynced) {
    try {
      if (row._deleted) {
        await sb.from(table).delete().eq('id', row.id);
        toDeleteIds.push(row.id);
      } else {
        const sbRow = pickFields(
          Object.assign({}, row, { description: row.description || row.desc, category: row.category || row.cat }),
          fields
        );
        const { error } = await sb.from(table).upsert(sbRow, { onConflict: 'id' });
        if (!error) toMarkSynced.push(row.id);
      }
    } catch (_) {}
  }
  if (toDeleteIds.length > 0) await ldbTable.bulkDelete(toDeleteIds);
  if (toMarkSynced.length > 0) await ldbTable.where('id').anyOf(toMarkSynced).modify({ _synced: 1 });

  const { data: remote, error: pullErr } = await sb.from(table).select('*')
    .eq('user_id', uid)
    .gte('updated_at', lastSync)
    .limit(500);
  if (pullErr || !remote || remote.length === 0) return;

  const remoteIds = remote.map(function(r) { return r.id; });
  const existingArr = await ldbTable.bulkGet(remoteIds);
  const rowsToPut = [];
  remote.forEach(function(row, i) {
    const ex = existingArr[i];
    if (!ex || (ex._synced === 1 && row.updated_at >= (ex._updated_at || ''))) {
      rowsToPut.push(toLocal(row, mapLocal(row)));
    }
  });
  if (rowsToPut.length > 0) await ldbTable.bulkPut(rowsToPut);

  const { data: allIds } = await sb.from(table).select('id').eq('user_id', uid);
  if (allIds) {
    const remoteSet = new Set(allIds.map(function(r) { return r.id; }));
    const localAll = await ldbTable.where('user_id').equals(uid).toArray();
    const orphans = localAll
      .filter(function(r) { return r._synced === 1 && !r._deleted && !remoteSet.has(r.id); })
      .map(function(r) { return r.id; });
    if (orphans.length > 0) await ldbTable.bulkDelete(orphans);
  }
};

const PROFILE_WRITE_FIELDS = ['user_id','name','logo','color','color_secondary','color_accent','theme','logo_url'];

export const syncProfiles = async function(uid) {
  if (!navigator.onLine) return;
  const unsynced = await ldb.profiles.where('user_id').equals(uid).and(r => r._synced === 0).toArray();
  for (const row of unsynced) {
    const clean = {};
    PROFILE_WRITE_FIELDS.forEach(function(k) { if (row[k] !== undefined) clean[k] = row[k]; });
    clean.updated_at = row.updated_at || now();
    const { error } = await sb.from('company_profiles').upsert(clean, { onConflict: 'user_id' });
    if (!error) await ldb.profiles.update(uid, { _synced: 1 });
  }
  const { data } = await sb.from('company_profiles').select('*').eq('user_id', uid).maybeSingle();
  if (data) await ldb.profiles.put(toLocal(data));
};

export const syncAll = async function(uid) {
  if (!uid || !navigator.onLine) return false;
  try {
    const ts = now();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000));
    await Promise.race([
      Promise.all([
        syncTable(uid, 'transactions', ldb.transactions, function(r) { return { desc: r.description, cat: r.category }; }),
        syncTable(uid, 'products',     ldb.products,     function() { return {}; }),
        syncTable(uid, 'losses',       ldb.losses,       function(r) { return { desc: r.description }; }),
        syncProfiles(uid),
      ]),
      timeout,
    ]);
    await setLastSync(ts, uid);
    return true;
  } catch (_) { return false; }
};

export const fetchClients = async function() {
  try {
    const { data } = await sb.from('company_profiles').select('*').order('user_id');
    return data || [];
  } catch (_) { return []; }
};

/* v2 — usa RPC SECURITY DEFINER que deleta auth.users tambem */
export const deleteClient = async function(uid) {
  try {
    const { error } = await sb.rpc('admin_delete_client', { target_uid: uid });
    if (error) throw error;
    return true;
  } catch (_) { return false; }
};

export const clearClientData = async function(uid, tables) {
  try {
    const { error } = await sb.rpc('admin_clear_client_data', { a_uid: uid, b_tables: tables });
    if (error) throw error;
    return true;
  } catch (_) { return false; }
};

export const triggerApkBuild = async function(clientName, logoUrl, primaryColor) {
  const tok = localStorage.getItem('nancia_gh_token') || '';
  if (!tok) return { ok: false, reason: 'no_token' };
  try {
    const res = await fetch(
      'https://api.github.com/repos/AsafeTork/financia/actions/workflows/build.yml/dispatches',
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
    if (res.status === 204) return { ok: true };
    return { ok: false, reason: 'api_error', status: res.status };
  } catch(e) {
    return { ok: false, reason: 'network_error' };
  }
};
