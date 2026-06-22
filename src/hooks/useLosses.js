import { useState } from 'react';
import { sb } from '../lib/supabase.js';
import { ldb } from '../lib/db.js';
import { now } from '../lib/utils.js';

export function useLosses(session, enforceLimit, toast) {
  var [losses, setLosses] = useState([]);

  var addLoss = async function(l) {
    var cnt = await ldb.losses.where('user_id').equals(session.user.id).filter(function(r) { return !r._deleted; }).count();
    if (!enforceLimit('losses', cnt)) return false;
    if (!l.desc || !l.desc.trim()) { toast('Descrição obrigatória', 'error'); return false; }
    if (!l.qty || Number(l.qty) <= 0) { toast('Quantidade deve ser maior que zero', 'error'); return false; }
    var userId = session.user.id;
    var rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    var row = {id:l.id, description:l.desc, qty:Number(l.qty), reason:l.reason||null, date:l.date, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now(), desc:l.desc};
    try { await ldb.losses.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setLosses(function(p) { return [row].concat(p); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('losses').upsert({id:row.id, description:row.description, qty:row.qty, reason:row.reason, date:row.date, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.losses.update(row.id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  var editLoss = async function(id, u) {
    if (!u.desc || !u.desc.trim()) { toast('Descrição obrigatória', 'error'); return false; }
    if (!u.qty || Number(u.qty) <= 0) { toast('Quantidade deve ser maior que zero', 'error'); return false; }
    var upd = {description:u.desc, qty:Number(u.qty), reason:u.reason||null, date:u.date, updated_at:now(), _synced:0, _updated_at:now(), desc:u.desc};
    try { await ldb.losses.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setLosses(function(p) { return p.map(function(l) { return l.id === id ? Object.assign({}, l, upd) : l; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('losses').update({description:upd.description, qty:upd.qty, reason:upd.reason, date:upd.date, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.losses.update(id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  var deleteLoss = async function(id) {
    try { await ldb.losses.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setLosses(function(p) { return p.filter(function(l) { return l.id !== id; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('losses').delete().eq('id', id);
        if (!res.error) await ldb.losses.delete(id);
      } catch(e) { toast('Removido do aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  return {losses, setLosses, addLoss, editLoss, deleteLoss};
}
