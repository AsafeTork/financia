import { useState } from 'react';
import { sb } from '../lib/supabase.js';
import { ldb } from '../lib/db.js';
import { now } from '../lib/utils.js';

export function useProducts(session, enforceLimit, toast) {
  var [products, setProducts] = useState([]);

  var addProduct = async function(p) {
    var cnt = await ldb.products.where('user_id').equals(session.user.id).filter(function(r) { return !r._deleted; }).count();
    if (!enforceLimit('products', cnt)) return false;
    if (!p.name || !p.name.trim()) { toast('Nome do produto obrigatório', 'error'); return false; }
    if (p.price == null || Number(p.price) < 0) { toast('Preço inválido', 'error'); return false; }
    if (p.stock != null && Number(p.stock) < 0) { toast('Estoque inválido', 'error'); return false; }
    var userId = session.user.id;
    var rb = session.user.user_metadata && session.user.user_metadata.name ? session.user.user_metadata.name : session.user.email;
    var stock = (p.stock !== '' && p.stock != null) ? Number(p.stock) : null;
    var row = {id:p.id, name:p.name, category:p.category||null, price:Number(p.price), cost:Number(p.cost)||0, stock:stock, user_id:userId, registered_by:rb, updated_at:now(), _synced:0, _deleted:0, _updated_at:now()};
    try { await ldb.products.put(row); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setProducts(function(prev) { return prev.concat([row]); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('products').upsert({id:row.id, name:row.name, category:row.category, price:row.price, cost:row.cost, stock:row.stock, user_id:userId, registered_by:rb, updated_at:row.updated_at});
        if (!res.error) await ldb.products.update(row.id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  var editProduct = async function(id, u) {
    if (!u.name || !u.name.trim()) { toast('Nome do produto obrigatório', 'error'); return false; }
    var upd = {name:u.name, category:u.category||null, price:Number(u.price), cost:Number(u.cost)||0, stock:(u.stock!==''&&u.stock!=null)?Number(u.stock):null, updated_at:now(), _synced:0, _updated_at:now()};
    try { await ldb.products.update(id, upd); }
    catch(e) { toast('Erro ao salvar: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setProducts(function(p) { return p.map(function(prod) { return prod.id === id ? Object.assign({}, prod, upd) : prod; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('products').update({name:upd.name, category:upd.category, price:upd.price, cost:upd.cost, stock:upd.stock, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.products.update(id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  var deleteProduct = async function(id) {
    try { await ldb.products.update(id, {_deleted:1, _synced:0, _updated_at:now()}); }
    catch(e) { toast('Erro ao excluir: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setProducts(function(p) { return p.filter(function(prod) { return prod.id !== id; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('products').delete().eq('id', id);
        if (!res.error) await ldb.products.delete(id);
      } catch(e) { toast('Removido do aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  var adjustStock = async function(id, delta) {
    var found = products.find(function(p) { return p.id === id; });
    if (!found) return false;
    var ns = Math.max(0, (found.stock || 0) + delta);
    var upd = {stock:ns, updated_at:now(), _synced:0, _updated_at:now()};
    try { await ldb.products.update(id, upd); }
    catch(e) { toast('Erro ao ajustar estoque: ' + (e.message || 'tente novamente'), 'error'); return false; }
    setProducts(function(p) { return p.map(function(prod) { return prod.id === id ? Object.assign({}, prod, upd) : prod; }); });
    if (navigator.onLine) {
      try {
        var res = await sb.from('products').update({stock:ns, updated_at:upd.updated_at}).eq('id', id);
        if (!res.error) await ldb.products.update(id, {_synced:1});
        else toast('Salvo no aparelho — sincroniza ao reconectar', 'warning');
      } catch(e) { toast('Salvo no aparelho — sincroniza ao reconectar', 'warning'); }
    }
    return true;
  };

  return {products, setProducts, addProduct, editProduct, deleteProduct, adjustStock};
}
