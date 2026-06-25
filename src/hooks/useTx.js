import { useState } from 'react';
import { sb } from '../lib/supabase.js';
import { ldb } from '../lib/db.js';
import { now } from '../lib/utils.js';
import { isRecurringId, addSkip } from '../lib/recurring.js';

export function useTx(session, enforceLimit, toast) {
  var [tx, setTx] = useState([]);

  var addTx = async function(t) {
    var cnt = await ldb.transactions.where('user_id').equals(session.user.id).filter(function(r) { return !r._deleted; }).count();
    if (!enforceLimit('transactions', cnt)) return false;
    if (!t.desc || !t.desc.trim()) { toast('Descrição obrigatória', 'error'); return false; }
    if (!t.amount || Number(t.amount) <= 0) { toast('Valor deve ser maior que zero', 'error'); return false; }
    var userId = session.user.id;
    var rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    var row = {id:t.id, type:t.type, description:t.desc, amount:Number(t.amount), date:t.date, method:t.method||null, category:t.cat||null, items:t.items||null, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now(), desc:t.desc, cat:t.cat||null};
    try { await ldb.transactions.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setTx(function(p) { return [row].concat(p); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').upsert({id:row.id, type:row.type, description:row.description, amount:row.amount, date:row.date, method:row.method, category:row.category, items:row.items, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.transactions.update(row.id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  var editTx = async function(id, u) {
    if (!u.desc || !u.desc.trim()) { toast('Descrição obrigatória', 'error'); return false; }
    if (!u.amount || Number(u.amount) <= 0) { toast('Valor deve ser maior que zero', 'error'); return false; }
    var upd = {description:u.desc, amount:Number(u.amount), date:u.date, method:u.method||null, category:u.cat||null, updated_at:now(), _synced:0, _updated_at:now(), desc:u.desc, cat:u.cat||null};
    try { await ldb.transactions.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setTx(function(p) { return p.map(function(t) { return t.id === id ? Object.assign({}, t, upd) : t; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').update({description:upd.description, amount:upd.amount, date:upd.date, method:upd.method, category:upd.category, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.transactions.update(id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  // Insere uma transacao gerada (recorrente) SEM o gate de limite — a despesa fixa
  // ja foi configurada pelo usuario e nao pode ser silenciosamente descartada.
  // Disponivel para todos os planos. Idempotente pelo id deterministico.
  var addGenerated = async function(row) {
    var existing = await ldb.transactions.get(row.id);
    if (existing) return false;
    try { await ldb.transactions.put(row); }
    catch (e) { return false; }
    setTx(function(p) {
      if (p.some(function(t) { return t.id === row.id; })) return p;
      return [Object.assign({}, row, {desc:row.description||row.desc, cat:row.category||row.cat})].concat(p);
    });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').upsert({id:row.id, type:row.type, description:row.description, amount:row.amount, date:row.date, method:row.method, category:row.category, items:row.items, user_id:row.user_id, registered_by:row.registered_by, updated_at:row.updated_at});
        if (!res.error) await ldb.transactions.update(row.id, {_synced:1});
      } catch (e) {}
    }
    return true;
  };

  var deleteTx = async function(id) {
    if (isRecurringId(id)) { try { var r = await ldb.transactions.get(id); if (r) await addSkip(r.user_id, id); } catch (e) {} }
    try { await ldb.transactions.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setTx(function(p) { return p.filter(function(t) { return t.id !== id; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').delete().eq('id', id);
        if (!res.error) await ldb.transactions.delete(id);
      } catch(e) { toast('Removido do aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  return {tx, setTx, addTx, addGenerated, editTx, deleteTx};
}
