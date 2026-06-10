import React, { useState } from 'react';
import { Inp, Sel, Spin } from './ui.jsx';
import { fmt, today, safe, uid } from '../lib/utils.js';

export function PSearch({ products, value, onSelect, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const filtered = value.length > 0
    ? products.filter(function(p) { return p.name.toLowerCase().includes(value.toLowerCase()); })
    : products;
  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={function(e) { onChange(e.target.value); setOpen(true); }}
        onFocus={function() { setOpen(true); }}
        onBlur={function() { setTimeout(function() { setOpen(false); }, 300); }}
        placeholder={placeholder || (products.length > 0 ? 'Buscar produto...' : 'Descricao')}
        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500 transition w-full"
      />
      {open && products.length > 0 && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 z-30 overflow-hidden max-h-48 overflow-y-auto" style={{boxShadow:'0 8px 24px rgba(0,0,0,0.1)'}}>
          {filtered.map(function(p) {
            return (
              <button key={p.id} onPointerDown={function() { onSelect(p); setOpen(false); }} className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {p.category && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md flex-shrink-0">{p.category}</span>}
                  <span className="text-sm text-gray-800 truncate">{p.name}</span>
                  {p.stock != null && <span className={'text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ' + (p.stock <= 0 ? 'bg-red-50 text-red-500' : p.stock <= 5 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500')}>{p.stock}un</span>}
                </div>
                <span className="text-xs font-semibold text-gray-400 ml-2">{fmt(p.price)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CartRow({ item, idx, products, onChange, onSelect, onRemove }) {
  const lt = (Number(item.qty) || 0) * (Number(item.up) || 0);
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PSearch products={products} value={item.desc} onSelect={function(p) { onSelect(idx, p.name, p.price); }} onChange={function(v) { onChange(idx, 'desc', v); }}/>
        {onRemove && (
          <button onClick={onRemove} className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        )}
      </div>
      <div className="flex items-end gap-2">
        <Inp label="Qtd" type="number" min="1" value={item.qty} onChange={function(e) { onChange(idx, 'qty', e.target.value); }} className="w-16 flex-shrink-0"/>
        <Inp label="Preco unit." type="number" step="0.01" min="0" value={item.up} onChange={function(e) { onChange(idx, 'up', e.target.value); }} className="flex-1"/>
        <div className="flex flex-col gap-1.5 w-24 flex-shrink-0">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</label>
          <div className="border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-700 font-semibold">{lt > 0 ? fmt(lt) : '-'}</div>
        </div>
      </div>
    </div>
  );
}

export function SaleForm({ products, brand, onSave, onClose }) {
  const [items, setItems] = useState([{desc:'', qty:'1', up:''}]);
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState('PIX');
  const [saving, setSaving] = useState(false);
  const total = items.reduce(function(s, i) { return s + (Number(i.qty) || 0) * (Number(i.up) || 0); }, 0);

  const ch = function(idx, f, v) {
    setItems(function(p) { return p.map(function(it, i) { return i === idx ? Object.assign({}, it, {[f]:v}) : it; }); });
  };
  const sel = function(idx, name, price) {
    setItems(function(p) { return p.map(function(it, i) { return i === idx ? Object.assign({}, it, {desc:name, up:String(price)}) : it; }); });
  };
  const save = async function() {
    const valid = items.filter(function(i) { return i.desc && i.up; });
    if (!valid.length || !total) return;
    setSaving(true);
    await onSave({
      id: uid(),
      type: 'income',
      desc: safe(valid.length === 1 ? valid[0].desc : valid.length + ' itens'),
      items: valid.map(function(i) { return {desc:safe(i.desc), qty:Number(i.qty)||1, unitPrice:Number(i.up)}; }),
      amount: total,
      date: date,
      method: method,
    });
    onClose();
  };

  const METHODS = ['PIX','Dinheiro','Cartao de Debito','Cartao de Credito','Boleto','Transferencia'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col" style={{maxHeight:'90vh',boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <span className="font-semibold text-gray-900">Nova Venda</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {items.map(function(it, idx) {
              return (
                <CartRow key={idx} item={it} idx={idx} products={products} onChange={ch} onSelect={sel}
                  onRemove={items.length > 1 ? function() { setItems(function(p) { return p.filter(function(_, i) { return i !== idx; }); }); } : null}
                />
              );
            })}
            <button onClick={function() { setItems(function(p) { return p.concat([{desc:'', qty:'1', up:''}]); }); }} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 w-fit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Adicionar item
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-600">Total da venda</span>
            <span className="text-2xl font-bold text-gray-900">{fmt(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Data" type="date" value={date} onChange={function(e) { setDate(e.target.value); }}/>
            <Sel label="Pagamento" value={method} onChange={function(e) { setMethod(e.target.value); }}>
              {METHODS.map(function(m) { return <option key={m}>{m}</option>; })}
            </Sel>
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-6 pt-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2" style={{background:brand.color}}>
            {saving ? <Spin white/> : ('Confirmar . ' + fmt(total))}
          </button>
        </div>
      </div>
    </div>
  );
}
