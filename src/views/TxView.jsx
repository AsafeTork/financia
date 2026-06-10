import React, { useState } from 'react';
import { Card, Inp, Sel, Modal, EditBtn, DelBtn, Empty, Spin } from '../components/ui.jsx';
import { SaleForm } from '../components/SaleForm.jsx';
import { fmt, fmtDate, today, safe, uid } from '../lib/utils.js';

export default function TxView({ type, tx, products, onAdd, onEdit, onDelete, onDeductStock, brand, toast, confirm }) {
  const isIncome = type === 'income';
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const cats = ['Fixo','Variavel','Estoque','Marketing','Pessoal','Servicos','Outro'];
  const [form, setForm] = useState({desc:'', amount:'', date:today(), cat:'Fixo', method:'PIX'});

  let filtered = tx.filter(function(t) { return t.type === type; });
  if (search) filtered = filtered.filter(function(t) { return t.desc.toLowerCase().includes(search.toLowerCase()); });
  if (dateFrom) filtered = filtered.filter(function(t) { return t.date >= dateFrom; });
  if (dateTo) filtered = filtered.filter(function(t) { return t.date <= dateTo; });
  filtered.sort(function(a, b) { return b.date.localeCompare(a.date); });
  const total = filtered.reduce(function(s, t) { return s + t.amount; }, 0);

  const openEdit = function(t) {
    setEditItem({id:t.id, desc:t.desc, amount:String(t.amount), date:t.date, cat:t.category||'Fixo', method:t.method||'PIX'});
  };
  const saveEdit = async function() {
    if (!editItem.desc || !editItem.amount) return;
    setSaving(true);
    await onEdit(editItem.id, {desc:safe(editItem.desc), amount:Number(editItem.amount), date:editItem.date, method:isIncome ? editItem.method : null, cat:isIncome ? null : editItem.cat});
    toast(isIncome ? 'Venda atualizada' : 'Despesa atualizada');
    setSaving(false);
    setEditItem(null);
  };
  const saveNew = async function() {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    await onAdd({id:uid(), type:type, desc:safe(form.desc), amount:Number(form.amount), date:form.date, method:isIncome ? form.method : null, cat:isIncome ? null : form.cat});
    toast(isIncome ? 'Venda registrada!' : 'Despesa registrada!');
    setModal(false);
    setSaving(false);
    setForm({desc:'', amount:'', date:today(), cat:'Fixo', method:'PIX'});
  };
  const exportCSV = function() {
    const rows = filtered.map(function(t) { return t.date + ',"' + (t.desc||'') + '",' + t.amount.toFixed(2) + ',' + (t.method || t.category || ''); });
    const csv = 'Data,Descricao,Valor,Tipo\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = (isIncome ? 'vendas' : 'despesas') + '-' + today() + '.csv';
    a.click();
    toast('CSV exportado!');
  };

  const METHODS = ['PIX','Dinheiro','Cartao de Debito','Cartao de Credito','Boleto','Transferencia'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isIncome ? 'Vendas' : 'Despesas'}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length + ' registro' + (filtered.length !== 1 ? 's' : '') + ' . '}<span className={'font-semibold ' + (isIncome ? 'text-green-600' : 'text-red-500')}>{fmt(total)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} title="Exportar CSV" className="p-2.5 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </button>
          <button onClick={function() { setModal(true); }} className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90" style={{background:brand.color}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            {isIncome ? 'Nova Venda' : 'Nova Despesa'}
          </button>
        </div>
      </div>

      <Card className="p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filtros</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Buscar descricao..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white"/>
          </div>
          <Inp type="date" value={dateFrom} onChange={function(e) { setDateFrom(e.target.value); }} placeholder="Data inicial"/>
          <Inp type="date" value={dateTo} onChange={function(e) { setDateTo(e.target.value); }} placeholder="Data final"/>
        </div>
        {(search || dateFrom || dateTo) && <button onClick={function() { setSearch(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-gray-600 w-fit">Limpar filtros</button>}
      </Card>

      <Card>
        {filtered.length === 0
          ? <Empty icon={isIncome ? '[R]' : '[S]'} title={isIncome ? 'Nenhuma venda' : 'Nenhuma despesa'} sub={isIncome ? 'Registre vendas com multiplos itens e calculo automatico.' : 'Registre aluguel, energia, fornecedores e outras saidas.'}/>
          : (
            <div className="divide-y divide-gray-50">
              {filtered.map(function(t) {
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ' + (isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>{isIncome ? 'UP' : 'DOWN'}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p>
                        <p className="text-xs text-gray-400">{fmtDate(t.date) + ' . ' + (t.method || t.category || '') + (t.items && t.items.length > 1 ? ' . ' + t.items.length + ' itens' : '') + (t.registered_by ? ' . ' + t.registered_by : '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={'text-sm font-semibold mr-1 ' + (isIncome ? 'text-green-600' : 'text-red-500')}>{(isIncome ? '+' : '-') + fmt(t.amount)}</span>
                      <EditBtn onClick={function() { openEdit(t); }}/>
                      <DelBtn onClick={function() { confirm('Excluir este registro?', async function() { await onDelete(t.id); toast('Removido'); }); }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>

      {modal && (isIncome
        ? (
          <SaleForm products={products} brand={brand}
            onSave={async function(sale) {
              await onAdd(sale);
              if (sale.items) {
                sale.items.forEach(function(it) {
                  const p = products.find(function(p) { return p.name === it.desc; });
                  if (p && p.stock != null) onDeductStock(p.id, it.qty);
                });
              }
              toast('Venda registrada!');
            }}
            onClose={function() { setModal(false); }}
          />
        )
        : (
          <Modal title="Nova Despesa" onClose={function() { setModal(false); }} onSave={saveNew} saving={saving}>
            <Inp label="Descricao" value={form.desc} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {desc:e.target.value}); }); }} placeholder="Ex: Aluguel, Energia..."/>
            <Inp label="Valor (R$)" type="number" step="0.01" min="0" value={form.amount} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {amount:e.target.value}); }); }} placeholder="0,00"/>
            <Inp label="Data" type="date" value={form.date} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
            <Sel label="Categoria" value={form.cat} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {cat:e.target.value}); }); }}>{cats.map(function(c) { return <option key={c}>{c}</option>; })}</Sel>
          </Modal>
        )
      )}

      {editItem && (
        <Modal title={isIncome ? 'Editar Venda' : 'Editar Despesa'} onClose={function() { setEditItem(null); }} onSave={saveEdit} saving={saving} saveLabel="Salvar alteracoes">
          <Inp label="Descricao" value={editItem.desc} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {desc:e.target.value}); }); }}/>
          <Inp label="Valor (R$)" type="number" step="0.01" min="0" value={editItem.amount} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {amount:e.target.value}); }); }}/>
          <Inp label="Data" type="date" value={editItem.date} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
          {isIncome
            ? <Sel label="Pagamento" value={editItem.method} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {method:e.target.value}); }); }}>{METHODS.map(function(m) { return <option key={m}>{m}</option>; })}</Sel>
            : <Sel label="Categoria" value={editItem.cat} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {cat:e.target.value}); }); }}>{cats.map(function(c) { return <option key={c}>{c}</option>; })}</Sel>
          }
        </Modal>
      )}
    </div>
  );
}
