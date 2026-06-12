import React, { useState, useMemo } from 'react';
import { Card, Inp, Sel, Modal, EditBtn, DelBtn, Spin } from '../components/ui.jsx';
import { SaleForm } from '../components/SaleForm.jsx';
import { fmt, fmtDate, today, safe, uid, brandAlpha } from '../lib/utils.js';

export default function TxView({ type, tx, products, onAdd, onEdit, onDelete, onDeductStock, brand, toast, confirm }) {
  var isIncome = type === 'income';
  var accentColor = isIncome ? brand.color : '#ef4444';
  var accentBg    = isIncome ? brandAlpha(brand.color, 0.08) : 'rgba(239,68,68,0.06)';

  var [modal, setModal]       = useState(false);
  var [editItem, setEditItem] = useState(null);
  var [saving, setSaving]     = useState(false);
  var [search, setSearch]     = useState('');
  var [dateFrom, setDateFrom] = useState('');
  var [dateTo, setDateTo]     = useState('');
  var [form, setForm] = useState({desc:'', amount:'', date:today(), cat:'Fixo', method:'PIX'});

  var cats    = ['Fixo','Variavel','Estoque','Marketing','Pessoal','Servicos','Outro'];
  var METHODS = ['PIX','Dinheiro','Cartao de Debito','Cartao de Credito','Boleto','Transferencia'];

  var filtered = tx.filter(function(t) { return t.type === type; });
  if (search)   filtered = filtered.filter(function(t) { return t.desc.toLowerCase().indexOf(search.toLowerCase()) !== -1; });
  if (dateFrom) filtered = filtered.filter(function(t) { return t.date >= dateFrom; });
  if (dateTo)   filtered = filtered.filter(function(t) { return t.date <= dateTo; });
  filtered.sort(function(a, b) { return b.date.localeCompare(a.date); });
  var total = filtered.reduce(function(s, t) { return s + t.amount; }, 0);

  var grouped = {};
  var groupOrder = [];
  filtered.forEach(function(t) {
    if (!grouped[t.date]) { grouped[t.date] = []; groupOrder.push(t.date); }
    grouped[t.date].push(t);
  });

  var openEdit = function(t) {
    setEditItem({id:t.id, desc:t.desc, amount:String(t.amount), date:t.date, cat:t.category||'Fixo', method:t.method||'PIX'});
  };
  var saveEdit = async function() {
    if (!editItem.desc || !editItem.amount) return;
    setSaving(true);
    try {
      await onEdit(editItem.id, {desc:safe(editItem.desc), amount:Number(editItem.amount), date:editItem.date, method:isIncome ? editItem.method : null, cat:isIncome ? null : editItem.cat});
      toast(isIncome ? 'Venda atualizada' : 'Despesa atualizada');
      setEditItem(null);
    } catch(_) {}
    finally { setSaving(false); }
  };
  var saveNew = async function() {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    try {
      await onAdd({id:uid(), type:type, desc:safe(form.desc), amount:Number(form.amount), date:form.date, method:isIncome ? form.method : null, cat:isIncome ? null : form.cat});
      toast(isIncome ? 'Venda registrada!' : 'Despesa registrada!');
      setModal(false);
      setForm({desc:'', amount:'', date:today(), cat:'Fixo', method:'PIX'});
    } catch(_) {}
    finally { setSaving(false); }
  };
  var csvEscape = function(v) {
    var s = String(v || '');
    if (/[",\n=+\-@]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  var exportCSV = function() {
    var rows = filtered.map(function(t) { return csvEscape(t.date) + ',' + csvEscape(t.desc||'') + ',' + t.amount.toFixed(2) + ',' + csvEscape(t.method || t.category || ''); });
    var csv = 'Data,Descricao,Valor,Tipo\n' + rows.join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = (isIncome ? 'vendas' : 'despesas') + '-' + today() + '.csv';
    a.click();
    toast('CSV exportado!');
  };

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-0">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="page-header">{isIncome ? 'Vendas / Ganhos' : 'Despesas'}</h2>
          <p className="page-sub">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}{' . '}
            <span className="font-semibold tabular" style={{color: accentColor}}>{fmt(total)}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={exportCSV} title="Exportar CSV"
            className="p-2.5 border border-gray-200 text-gray-400 rounded-xl hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
          <button onClick={function() { setModal(true); }}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition"
            style={{background: accentColor}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            {isIncome ? 'Nova Venda' : 'Nova Despesa'}
          </button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={search} onChange={function(e) { setSearch(e.target.value); }}
            placeholder={'Buscar ' + (isIncome ? 'vendas' : 'despesas') + '...'}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl"
            style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Inp type="date" value={dateFrom} onChange={function(e) { setDateFrom(e.target.value); }} placeholder="De"/>
          <Inp type="date" value={dateTo}   onChange={function(e) { setDateTo(e.target.value); }}   placeholder="Ate"/>
        </div>
        {dateFrom && dateTo && dateFrom > dateTo && (
          <p className="text-xs text-red-500 mt-1">Data inicial deve ser anterior ou igual a data final.</p>
        )}
        {(search || dateFrom || dateTo) && (
          <button onClick={function() { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            Limpar filtros
          </button>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background: accentBg}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={isIncome ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">{isIncome ? 'Nenhuma venda registrada' : 'Nenhuma despesa registrada'}</p>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              {isIncome ? 'Registre vendas com multiplos itens e calculo automatico do total.' : 'Registre aluguel, energia, fornecedores e outras saidas.'}
            </p>
            <button onClick={function() { setModal(true); }}
              className="mt-1 text-xs font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition"
              style={{background: accentColor}}>
              {isIncome ? '+ Nova Venda' : '+ Nova Despesa'}
            </button>
          </div>
        ) : (
          <div>
            {groupOrder.map(function(date) {
              var dayItems = grouped[date];
              var dayTotal = dayItems.reduce(function(s, t) { return s + t.amount; }, 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{fmtDate(date)}</span>
                    <span className="text-xs font-semibold tabular" style={{color: accentColor}}>{fmt(dayTotal)}</span>
                  </div>
                  {dayItems.map(function(t) {
                    return (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: accentBg}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d={isIncome ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{t.desc}</p>
                            <p className="text-xs text-gray-400">
                              {t.method || t.category || ''}
                              {t.items && t.items.length > 1 ? ' . ' + t.items.length + ' itens' : ''}
                              {t.registered_by ? ' . ' + t.registered_by : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                          <span className="text-sm font-bold tabular mr-1" style={{color: accentColor}}>
                            {(isIncome ? '+' : '-') + fmt(t.amount)}
                          </span>
                          <EditBtn onClick={function() { openEdit(t); }}/>
                          <DelBtn onClick={function() { confirm('Excluir este registro?', async function() { await onDelete(t.id); toast('Removido'); }); }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {modal && (isIncome
        ? (
          <SaleForm products={products} brand={brand}
            onSave={async function(sale) {
              await onAdd(sale);
              if (sale.items) {
                sale.items.forEach(function(it) {
                  var p = products.find(function(p) { return p.name === it.desc; });
                  if (p && p.stock != null) onDeductStock(p.id, it.qty);
                });
              }
              toast('Venda registrada!');
            }}
            onClose={function() { setModal(false); }}
          />
        ) : (
          <Modal title="Nova Despesa" onClose={function() { setModal(false); }} onSave={saveNew} saving={saving} color={accentColor}>
            <Inp label="Descricao" value={form.desc} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {desc:e.target.value}); }); }} placeholder="Ex: Aluguel, Energia..."/>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Valor (R$)" type="number" step="0.01" min="0" value={form.amount} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {amount:e.target.value}); }); }} placeholder="0,00"/>
              <Inp label="Data" type="date" value={form.date} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
            </div>
            <Sel label="Categoria" value={form.cat} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {cat:e.target.value}); }); }}>
              {cats.map(function(c) { return <option key={c}>{c}</option>; })}
            </Sel>
          </Modal>
        )
      )}

      {editItem && (
        <Modal title={isIncome ? 'Editar Venda' : 'Editar Despesa'} onClose={function() { setEditItem(null); }} onSave={saveEdit} saving={saving} saveLabel="Salvar alteracoes" color={accentColor}>
          <Inp label="Descricao" value={editItem.desc} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {desc:e.target.value}); }); }}/>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Valor (R$)" type="number" step="0.01" min="0" value={editItem.amount} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {amount:e.target.value}); }); }}/>
            <Inp label="Data" type="date" value={editItem.date} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
          </div>
          {isIncome
            ? <Sel label="Pagamento" value={editItem.method} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {method:e.target.value}); }); }}>{METHODS.map(function(m) { return <option key={m}>{m}</option>; })}</Sel>
            : <Sel label="Categoria" value={editItem.cat}    onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {cat:e.target.value}); }); }}>{cats.map(function(c) { return <option key={c}>{c}</option>; })}</Sel>
          }
        </Modal>
      )}
    </div>
  );
}
