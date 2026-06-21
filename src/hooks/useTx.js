import { useState } from 'react';
import { sb } from '../lib/supabase.js';
import { ldb } from '../lib/db.js';
import { now } from '../lib/utils.js';

export function useTx(session, enforceLimit, toast) {
  var [tx, setTx] = useState([]);

  var addTx = async function(t) {
    var cnt = await ldb.transactions.where('user_id').equals(session.user.id).filter(function(r) { return !r._deleted; }).count();
    if (!enforceLimit('transactions', cnt)) return;
    if (!t.desc || !t.desc.trim()) { toast('Descrição obrigatória', 'error'); return; }
    if (!t.amount || Number(t.amount) <= 0) { toast('Valor deve ser maior que zero', 'error'); return; }
    var userId = session.user.id;
    var rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    var row = {id:t.id, type:t.type, description:t.desc, amount:Number(t.amount), date:t.date, method:t.method||null, category:t.cat||null, items:t.items||null, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now(), desc:t.desc, cat:t.cat||null};
    try { await ldb.transactions.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setTx(function(p) { return [row].concat(p); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').upsert({id:row.id, type:row.type, description:row.description, amount:row.amount, date:row.date, method:row.method, category:row.category, items:row.items, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.transactions.update(row.id, {_synced:1});
        else toast('Aviso: não sincronizado — será tentado em breve.', 'success');
      } catch(e) { toast('Aviso: não sincronizado — será tentado em breve.', 'success'); }
    }
  };

  var editTx = async function(id, u) {
    if (!u.desc || !u.desc.trim()) { toast('Descrição obrigatória', 'error'); return; }
    if (!u.amount || Number(u.amount) <= 0) { toast('Valor deve ser maior que zero', 'error'); return; }
    var upd = {description:u.desc, amount:Number(u.amount), date:u.date, method:u.method||null, category:u.cat||null, updated_at:now(), _synced:0, _updated_at:now(), desc:u.desc, cat:u.cat||null};
    try { await ldb.transactions.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return; }
    setTx(function(p) { return p.map(function(t) { return t.id === id ? Object.assign({}, t, upd) : t; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').update({description:upd.description, amount:upd.amount, date:upd.date, method:upd.method, category:upd.category, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.transactions.update(id, {_synced:1});
        else toast('Aviso: não sincronizado — será tentado em breve.', 'success');
      } catch(e) { toast('Aviso: não sincronizado — será tentado em breve.', 'success'); }
    }
  };

  var deleteTx = async function(id) {
    try { await ldb.transactions.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return; }
    setTx(function(p) { return p.filter(function(t) { return t.id !== id; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('transactions').delete().eq('id', id);
        if (!res.error) await ldb.transactions.delete(id);
      } catch(e) { toast('Aviso: não sincronizado — será tentado em breve.', 'success'); }
    }
  };

  return {tx, setTx, addTx, editTx, deleteTx};
}
