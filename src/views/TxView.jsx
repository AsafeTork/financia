import React, { useState, useMemo } from 'react';
import { Card, Inp, NumInp, Sel, Modal, EditBtn, DelBtn, Spin, Btn, PageHead, Empty } from '../components/ui.jsx';
import { SaleForm } from '../components/SaleForm.jsx';
import ExportButtons from '../components/ExportButtons.jsx';
import { fmt, fmtDate, today, safe, uid, brandAlpha } from '../lib/utils.js';
import { isRecurringId, getRecurring, setRecurring, buildRecurringRow, periodOf } from '../lib/recurring.js';
import { effectivePlan } from '../lib/constants.js';
import { exportPDF, exportXLS } from '../lib/exporters.js';

export default function TxView({ type, tx, products, onAdd, onEdit, onDelete, onDeductStock, onAddGenerated, uid: userId, brand, toast, confirm, planInfo, onNav }) {
  var isIncome = type === 'income';
  var accentColor = isIncome ? brand.color : '#ef4444';
  var accentBg    = isIncome ? brandAlpha(brand.color, 0.08) : 'rgba(239,68,68,0.06)';
  var paid = effectivePlan(planInfo) !== 'free';

  var [modal, setModal]       = useState(false);
  var [editItem, setEditItem] = useState(null);
  var [saving, setSaving]     = useState(false);
  var [search, setSearch]     = useState('');
  var [dateFrom, setDateFrom] = useState('');
  var [dateTo, setDateTo]     = useState('');
  var [form, setForm] = useState({desc:'', amount:'', date:today(), cat:'Fixo', method:'PIX', fixo:false, day:'5'});

  var cats    = ['Fixo','Variavel','Estoque','Marketing','Pessoal','Servicos','Outro'];
  var METHODS = ['PIX','Dinheiro','Cartao de Debito','Cartao de Credito','Boleto','Transferencia'];

  var memo = useMemo(function() {
    var f = tx.filter(function(t) { return t.type === type; });
    if (search)   f = f.filter(function(t) { return t.desc.toLowerCase().indexOf(search.toLowerCase()) !== -1; });
    if (dateFrom) f = f.filter(function(t) { return t.date >= dateFrom; });
    if (dateTo)   f = f.filter(function(t) { return t.date <= dateTo; });
    f.sort(function(a, b) { return b.date.localeCompare(a.date); });
    var total = f.reduce(function(s, t) { return s + t.amount; }, 0);
    var grouped = {};
    var groupOrder = [];
    f.forEach(function(t) {
      if (!grouped[t.date]) { grouped[t.date] = []; groupOrder.push(t.date); }
      grouped[t.date].push(t);
    });
    return {filtered: f, total: total, grouped: grouped, groupOrder: groupOrder};
  }, [tx, type, search, dateFrom, dateTo]);

  var filtered  = memo.filtered;
  var total     = memo.total;
  var grouped   = memo.grouped;
  var groupOrder = memo.groupOrder;

  var openEdit = function(t) {
    setEditItem({id:t.id, desc:t.desc, amount:String(t.amount), date:t.date, cat:t.category||'Fixo', method:t.method||'PIX'});
  };
  var saveEdit = async function() {
    if (!editItem.desc || !editItem.amount) return;
    setSaving(true);
    try {
      var ok = await onEdit(editItem.id, {desc:safe(editItem.desc), amount:Number(editItem.amount), date:editItem.date, method:isIncome ? editItem.method : null, cat:isIncome ? null : editItem.cat});
      if (!ok) return;
      toast(isIncome ? 'Venda atualizada' : 'Despesa atualizada');
      setEditItem(null);
    } catch(_) {}
    finally { setSaving(false); }
  };
  var resetForm = function() { setForm({desc:'', amount:'', date:today(), cat:'Fixo', method:'PIX', fixo:false, day:'5'}); };
  var saveNew = async function() {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    try {
      if (!isIncome && form.fixo) {
        var day = Number(form.day) || 5;
        var tpl = { id: uid(), desc: safe(form.desc), amount: Number(form.amount), day: day, category: form.cat, active: true };
        var list = await getRecurring(userId);
        await setRecurring(userId, list.concat([tpl]));
        var row = buildRecurringRow(userId, tpl, periodOf(new Date()));
        var okR = onAddGenerated ? await onAddGenerated(row) : true;
        if (okR === false) return;
        toast('Despesa fixa adicionada — repete todo mês.');
        setModal(false);
        resetForm();
        return;
      }
      var ok = await onAdd({id:uid(), type:type, desc:safe(form.desc), amount:Number(form.amount), date:form.date, method:isIncome ? form.method : null, cat:isIncome ? null : form.cat});
      if (!ok) return;
      toast(isIncome ? 'Venda registrada!' : 'Despesa registrada!');
      setModal(false);
      resetForm();
    } catch(_) {}
    finally { setSaving(false); }
  };
  var doExport = function(kind) {
    var headers = ['Data', 'Descrição', 'Valor', isIncome ? 'Pagamento' : 'Categoria'];
    var rows = filtered.map(function(t) {
      return [fmtDate(t.date), t.desc || '', fmt(t.amount), isIncome ? (t.method || '') : (t.category || t.cat || '')];
    });
    var fname = (isIncome ? 'vendas' : 'despesas') + '-' + today();
    if (kind === 'xls') { exportXLS({ filename: fname, headers: headers, rows: rows }); toast('Excel exportado!'); return; }
    var ok = exportPDF({
      title: isIncome ? 'Vendas' : 'Despesas',
      brandName: (brand && brand.name) || 'Financia',
      subtitle: (isIncome ? 'Vendas / Ganhos' : 'Despesas') + ' — ' + filtered.length + ' registro(s) — total ' + fmt(total),
      accent: accentColor, headers: headers, rows: rows,
      kpis: [{ label: 'Total', value: fmt(total), color: accentColor }, { label: 'Registros', value: String(filtered.length) }],
    });
    if (!ok) toast('Permita pop-ups para exportar o PDF.', 'error');
  };

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-0">

      <PageHead
        icon={isIncome ? 'M12 4v16m8-8l-8-8-8 8' : 'M12 20V4m-8 8l8 8 8-8'}
        color={accentColor}
        title={isIncome ? 'Vendas / Ganhos' : 'Despesas'}
        sub={<>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}{' . '}<span className="font-semibold tabular" style={{color: accentColor}}>{fmt(total)}</span></>}
        right={<>
          {filtered.length > 0 && (
            <ExportButtons paid={paid} color={accentColor}
              onPDF={function() { doExport('pdf'); }}
              onXLS={function() { doExport('xls'); }}
              onLocked={function() { if (onNav) onNav('planos'); }}/>
          )}
          <Btn onClick={function() { setModal(true); }} style={{background: accentColor}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            {isIncome ? 'Nova Venda' : 'Nova Despesa'}
          </Btn>
        </>}
      />

      <Card className="p-4">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={search} onChange={function(e) { setSearch(e.target.value); }}
            placeholder={'Buscar ' + (isIncome ? 'vendas' : 'despesas') + '...'}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl transition"
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
            className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 min-h-[44px] -my-2.5 rounded-lg">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            Limpar filtros
          </button>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <Empty
            color={accentColor}
            icon={(
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={isIncome ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}/>
              </svg>
            )}
            title={isIncome ? 'Nenhuma venda registrada' : 'Nenhuma despesa registrada'}
            sub={isIncome ? 'Registre vendas com múltiplos itens e cálculo automático do total.' : 'Registre aluguel, energia, fornecedores e outras saídas.'}
            action={isIncome ? 'Nova Venda' : 'Nova Despesa'}
            onAction={function() { setModal(true); }}
          />
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
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{t.desc}</p>
                              {t.items && t.items.length > 1 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background: accentBg, color: accentColor}}>{t.items.length} itens</span>
                              )}
                              {isRecurringId(t.id) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-violet-50 text-violet-600">recorrente</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">
                              {t.method || t.category || ''}
                              {t.registered_by ? ' . ' + t.registered_by : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                          <span className="text-sm font-bold tabular mr-1" style={{color: accentColor}}>
                            {(isIncome ? '+' : '-') + fmt(t.amount)}
                          </span>
                          <EditBtn onClick={function() { openEdit(t); }}/>
                          <DelBtn onClick={function() { confirm('Excluir este registro?', async function() { var ok = await onDelete(t.id); if (ok) toast('Removido'); }); }}/>
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
              var ok = await onAdd(sale);
              if (!ok) return false;
              if (sale.items) {
                sale.items.forEach(function(it) {
                  var p = products.find(function(p) { return p.name === it.desc; });
                  if (p && p.stock != null) onDeductStock(p.id, it.qty);
                });
              }
              toast('Venda registrada!');
              return true;
            }}
            onClose={function() { setModal(false); }}
          />
        ) : (
          <Modal title="Nova Despesa" onClose={function() { setModal(false); }} onSave={saveNew} saving={saving} color={accentColor}>
            <Inp label="Descrição" value={form.desc} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {desc:e.target.value}); }); }} placeholder="Ex: Aluguel, Energia..."/>
            <div className="grid grid-cols-2 gap-3">
              <NumInp label="Valor (R$)" value={form.amount} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {amount:e.target.value}); }); }} placeholder="0,00"/>
              <Inp label="Data" type="date" value={form.date} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
            </div>
            <Sel label="Categoria" value={form.cat} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {cat:e.target.value}); }); }}>
              {cats.map(function(c) { return <option key={c}>{c}</option>; })}
            </Sel>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{color:'var(--text-sub)'}}>Tipo de despesa</label>
              <div className="grid grid-cols-2 gap-2">
                {[{k:false, l:'Variável', d:'Lançamento único'}, {k:true, l:'Fixa (mensal)', d:'Repete todo mês'}].map(function(opt) {
                  var sel = form.fixo === opt.k;
                  return (
                    <button key={String(opt.k)} type="button" aria-pressed={sel}
                      onClick={function() { setForm(function(f) { return Object.assign({}, f, {fixo:opt.k}); }); }}
                      className="rounded-xl px-3 py-2.5 text-left transition min-h-[44px]"
                      style={sel ? {border:'1.5px solid ' + accentColor, background: accentBg} : {border:'1px solid var(--border)', background:'var(--bg-card)'}}>
                      <p className="text-sm font-semibold" style={{color: sel ? accentColor : 'var(--text-main)'}}>{opt.l}</p>
                      <p className="text-[11px]" style={{color:'var(--text-sub)'}}>{opt.d}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.fixo && (
              <NumInp label="Dia do vencimento" decimals={false} maxLen={2} value={form.day} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {day:e.target.value}); }); }} placeholder="5"/>
            )}
          </Modal>
        )
      )}

      {editItem && (
        <Modal title={isIncome ? 'Editar Venda' : 'Editar Despesa'} onClose={function() { setEditItem(null); }} onSave={saveEdit} saving={saving} saveLabel="Salvar alterações" color={accentColor}>
          <Inp label="Descrição" value={editItem.desc} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {desc:e.target.value}); }); }}/>
          <div className="grid grid-cols-2 gap-3">
            <NumInp label="Valor (R$)" value={editItem.amount} onChange={function(e) { setEditItem(function(f) { return Object.assign({}, f, {amount:e.target.value}); }); }}/>
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
