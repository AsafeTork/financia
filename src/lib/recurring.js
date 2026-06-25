import { ldb } from './db.js';
import { now } from './utils.js';

// Despesas recorrentes fixas (aluguel, contas mensais).
// Os templates ficam no Dexie local (meta) por usuario; as transacoes GERADAS
// sao transacoes normais que sincronizam e contam 1x no limite do plano.
// O id da transacao gerada e deterministico por CONTEUDO + periodo, garantindo
// idempotencia entre dispositivos (sem duplicar o mesmo aluguel do mes).

var METdata = function(uid) { return 'recurring_' + uid; };
var SKIPdata = function(uid) { return 'recurring_skip_' + uid; };

export async function getRecurring(uid) {
  try { var r = await ldb.meta.get(METdata(uid)); return (r && r.val) || []; }
  catch (e) { return []; }
}
export async function setRecurring(uid, list) {
  return ldb.meta.put({ key: METdata(uid), val: list || [] });
}
export async function getSkips(uid) {
  try { var r = await ldb.meta.get(SKIPdata(uid)); return (r && r.val) || []; }
  catch (e) { return []; }
}
export async function addSkip(uid, id) {
  var s = await getSkips(uid);
  if (s.indexOf(id) === -1) { s.push(id); await ldb.meta.put({ key: SKIPdata(uid), val: s }); }
}

export function periodOf(date) {
  var d = date || new Date();
  var m = d.getMonth() + 1;
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m);
}
export function daysInMonth(period) {
  var p = period.split('-');
  return new Date(Number(p[0]), Number(p[1]), 0).getDate();
}
export function dueDate(period, day) {
  var dim = daysInMonth(period);
  var dd = Math.min(Math.max(Number(day) || 1, 1), dim);
  return period + '-' + (dd < 10 ? '0' + dd : dd);
}

function hashStr(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); }
  return (h >>> 0).toString(36);
}

export function recurringId(uid, tpl, period) {
  var key = uid + '|' + String(tpl.desc || '').trim().toLowerCase() + '|' + Number(tpl.amount) + '|' + Number(tpl.day);
  return 'rec-' + hashStr(key) + '-' + period;
}
export function isRecurringId(id) {
  return typeof id === 'string' && id.indexOf('rec-') === 0;
}

export function activeTemplates(list) {
  return (list || []).filter(function(t) {
    return t.active !== false && t.desc && t.desc.trim() && Number(t.amount) > 0 && Number(t.day) >= 1;
  });
}

export function buildRecurringRow(uid, tpl, period, rb) {
  var id = recurringId(uid, tpl, period);
  var ts = now();
  var desc = String(tpl.desc || '').trim();
  var cat = tpl.category || 'Fixo';
  return {
    id: id, type: 'expense', description: desc, amount: Number(tpl.amount),
    date: dueDate(period, tpl.day), method: null, category: cat, items: null,
    user_id: uid, registered_by: rb || 'Recorrente', updated_at: ts,
    _synced: 0, _deleted: 0, _updated_at: ts, desc: desc, cat: cat, recurring: 1,
  };
}

// Calcula as transacoes recorrentes do mes que ainda nao existem localmente.
// existsFn(id) -> Promise<bool>. Retorna apenas as linhas novas a inserir.
export async function pendingRecurring(uid, list, period, existsFn) {
  var active = activeTemplates(list);
  if (!active.length) return [];
  var skips = await getSkips(uid);
  var out = [];
  for (var i = 0; i < active.length; i++) {
    var id = recurringId(uid, active[i], period);
    if (skips.indexOf(id) !== -1) continue;
    var exists = await existsFn(id);
    if (!exists) out.push(buildRecurringRow(uid, active[i], period, active[i].rb));
  }
  return out;
}
