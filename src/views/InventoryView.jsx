import React, { useState, useMemo } from 'react';
import { Card, Inp, Modal, EditBtn, DelBtn, Badge } from '../components/ui.jsx';
import { PSearch } from '../components/SaleForm.jsx';
import { fmt, fmtDate, today, safe, uid, brandAlpha } from '../lib/utils.js';

export default function InventoryView({ products, losses, onAddProduct, onEditProduct, onDeleteProduct, onAddLoss, onEditLoss, onDeleteLoss, onAdjustStock, brand, toast, confirm }) {
  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(new Set());
  const [pm, setPm] = useState(false);
  const [editP, setEditP] = useState(null);
  const [lm, setLm] = useState(false);
  const [editL, setEditL] = useState(null);
  const [sm, setSm] = useState(null);
  const [pf, setPf] = useState({name:'', category:'', price:'', cost:'', stock:''});
  const [lf, setLf] = useState({desc:'', qty:'1', reason:'', date:today()});
  const [sq, setSq] = useState('1');
  const [saving, setSaving] = useState(false);

  const saveProd = async function() {
    if (!pf.name || !pf.price) return;
    if (Number(pf.price) <= 0) { toast('Preco deve ser maior que zero', 'error'); return; }
    setSaving(true);
    try {
      await onAddProduct({id:'P'+String(Date.now()).slice(-6), name:safe(pf.name), category:pf.category||null, price:Number(pf.price), cost:pf.cost?Number(pf.cost):null, stock:pf.stock!==''?Number(pf.stock):null});
      toast('Produto adicionado!');
      setPm(false);
      setPf({name:'', category:'', price:'', cost:'', stock:''});
    } catch(_) {}
    finally { setSaving(false); }
  };
  const saveEditP = async function() {
    if (!editP.name || !editP.price) return;
    if (Number(editP.price) <= 0) { toast('Preco deve ser maior que zero', 'error'); return; }
    setSaving(true);
    try {
      await onEditProduct(editP.id, {name:safe(editP.name), category:editP.category||null, price:Number(editP.price), cost:editP.cost?Number(editP.cost):null, stock:editP.stock!==''&&editP.stock!=null?Number(editP.stock):null});
      toast('Produto atualizado');
      setEditP(null);
    } catch(_) {}
    finally { setSaving(false); }
  };
  const saveLoss = async function() {
    if (!lf.desc || !lf.qty) return;
    setSaving(true);
    try {
      await onAddLoss({id:uid(), desc:safe(lf.desc), qty:Number(lf.qty), reason:lf.reason, date:lf.date});
      const p = products.find(function(p) { return p.name === lf.desc; });
      if (p && p.stock != null) await onAdjustStock(p.id, -Number(lf.qty));
      toast(p ? 'Perda registrada e estoque abatido' : 'Perda registrada (produto nao encontrado no estoque)');
      setLm(false);
      setLf({desc:'', qty:'1', reason:'', date:today()});
    } catch(_) {}
    finally { setSaving(false); }
  };
  const saveEditL = async function() {
    if (!editL.desc || !editL.qty) return;
    setSaving(true);
    try {
      await onEditLoss(editL.id, {desc:safe(editL.desc), qty:Number(editL.qty), reason:editL.reason, date:editL.date});
      toast('Perda atualizada');
      setEditL(null);
    } catch(_) {}
    finally { setSaving(false); }
  };
  const saveStock = async function() {
    if (!sq || !sm) return;
    setSaving(true);
    try {
      await onAdjustStock(sm, Number(sq));
      toast('Estoque atualizado!');
      setSm(null);
      setSq('1');
    } catch(_) {}
    finally { setSaving(false); }
  };
  const toggleCat = function(cat) {
    setCollapsed(function(p) { const n = new Set(p); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  };

  const disp = search.trim()
    ? products.filter(function(p) { return [p.name, p.category, p.id].filter(Boolean).some(function(v) { return v.toLowerCase().includes(search.toLowerCase()); }); })
    : products;

  const grouped = Object.entries(
    disp.reduce(function(a, p) { const k = p.category || 'Sem categoria'; if (!a[k]) a[k] = []; a[k].push(p); return a; }, {})
  ).sort(function(pair1, pair2) {
    if (pair1[0] === 'Sem categoria') return 1;
    if (pair2[0] === 'Sem categoria') return -1;
    return pair1[0].localeCompare(pair2[0]);
  });

  const sp = sm ? products.find(function(p) { return p.id === sm; }) : null;

  var TABS = [
    {key:'products', label:'Produtos', count: products.length},
    {key:'losses',   label:'Perdas',   count: losses.length},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="page-header">Estoque e Perdas</h2>
          <p className="page-sub">{products.length} produto{products.length !== 1 ? 's' : ''} . {losses.length} perda{losses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-shrink-0">
          {tab === 'products' && (
            <button onClick={function() { setPm(true); }}
              className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition"
              style={{background: brand.color}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Adicionar
            </button>
          )}
          {tab === 'losses' && (
            <button onClick={function() { setLm(true); }}
              className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition bg-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Registrar perda
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-100">
        {TABS.map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              className={'flex items-center gap-2 pb-3 px-1 mr-5 text-sm font-medium transition-colors ' + (active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600')}
              style={active ? {borderBottom: '2px solid ' + brand.color} : {}}>
              {t.label}
              <span className={'text-xs font-semibold px-1.5 py-0.5 rounded-md ' + (active ? 'text-white' : 'text-gray-400 bg-gray-100')}
                style={active ? {background: brand.color} : {}}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'products' && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Buscar por nome ou categoria..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl"/>
            </div>
          </div>
          {disp.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background: brandAlpha(brand.color, 0.08)}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Nenhum produto cadastrado</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Adicione produtos ou servicos com preco, custo e controle de estoque.</p>
              <button onClick={function() { setPm(true); }} className="mt-1 text-xs font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition" style={{background: brand.color}}>
                + Adicionar produto
              </button>
            </div>
          ) : (
            grouped.map(function(pair) {
              var cat = pair[0], items = pair[1];
              return (
                <div key={cat}>
                  <button onClick={function() { toggleCat(cat); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition border-b border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <svg className={'w-3.5 h-3.5 text-gray-400 transition-transform ' + (collapsed.has(cat) ? '-rotate-90' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</span>
                    </div>
                    <span className="text-xs text-gray-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                  </button>
                  {!collapsed.has(cat) && (
                    <div className="divide-y divide-gray-50">
                      {items.map(function(p) {
                        var stockOut = p.stock != null && p.stock <= 0;
                        var stockLow = p.stock != null && p.stock > 0 && p.stock <= 5;
                        var stockOk  = p.stock != null && p.stock > 5;
                        var margin   = p.cost != null && p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : null;
                        var marginColor = margin === null ? '' : margin > 30 ? '#16a34a' : margin > 10 ? '#d97706' : '#dc2626';
                        return (
                          <div key={p.id} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                                  {p.category && (
                                    <Badge color="#6b7280" bg="#f3f4f6">{p.category}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-xs font-semibold tabular" style={{color: brand.color}}>{fmt(p.price)}</span>
                                  {p.cost != null && <span className="text-xs text-gray-400 tabular">Custo {fmt(p.cost)}</span>}
                                  {margin !== null && (
                                    <span className="text-xs font-semibold" style={{color: marginColor}}>{margin.toFixed(0)}% margem</span>
                                  )}
                                  {p.registered_by && <span className="text-xs text-gray-400">por {p.registered_by}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {p.stock != null && (
                                  <button onClick={function() { setSm(p.id); setSq('1'); }}
                                    className={'text-xs font-semibold px-2.5 py-1 rounded-lg mr-0.5 transition ' + (stockOut ? 'bg-red-50 text-red-600' : stockLow ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')}>
                                    {stockOut ? 'Esgotado' : p.stock + ' un'}
                                  </button>
                                )}
                                <EditBtn onClick={function() { setEditP({id:p.id, name:p.name, category:p.category||'', price:String(p.price), cost:p.cost!=null?String(p.cost):'', stock:p.stock!=null?String(p.stock):''}); }}/>
                                <DelBtn onClick={function() { confirm('Excluir "' + p.name + '"?', async function() { await onDeleteProduct(p.id); toast('Produto removido'); }); }}/>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
      )}

      {tab === 'losses' && (
        <Card>
          {losses.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-50">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Nenhuma perda registrada</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Registre produtos vencidos, cancelados ou danificados.</p>
              <button onClick={function() { setLm(true); }} className="mt-1 text-xs font-semibold px-5 py-2.5 rounded-xl text-white bg-red-500 hover:opacity-90 transition">
                + Registrar perda
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {losses.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).map(function(l) {
                return (
                  <div key={l.id} className="flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{l.qty + 'x ' + l.desc}</p>
                        <p className="text-xs text-gray-400">{fmtDate(l.date)}{l.reason ? ' . ' + l.reason : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditBtn onClick={function() { setEditL({id:l.id, desc:l.desc, qty:String(l.qty), reason:l.reason||'', date:l.date}); }}/>
                      <DelBtn onClick={function() { confirm('Excluir esta perda?', async function() { await onDeleteLoss(l.id); toast('Perda removida'); }); }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {pm && (
        <Modal title="Novo Produto ou Servico" onClose={function() { setPm(false); }} onSave={saveProd} saving={saving}>
          <Inp label="Nome *" value={pf.name} onChange={function(e) { setPf(function(f) { return Object.assign({}, f, {name:e.target.value}); }); }} placeholder="Ex: Corte de cabelo, Camiseta P..."/>
          <Inp label="Categoria" value={pf.category} onChange={function(e) { setPf(function(f) { return Object.assign({}, f, {category:e.target.value}); }); }} placeholder="Ex: Servicos, Roupas, Alimentos..."/>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Preco de venda *" type="number" step="0.01" min="0" value={pf.price} onChange={function(e) { setPf(function(f) { return Object.assign({}, f, {price:e.target.value}); }); }} placeholder="0,00"/>
            <Inp label="Custo" type="number" step="0.01" min="0" value={pf.cost} onChange={function(e) { setPf(function(f) { return Object.assign({}, f, {cost:e.target.value}); }); }} placeholder="0,00"/>
          </div>
          <Inp label="Estoque inicial (em branco para servicos)" type="number" min="0" value={pf.stock} onChange={function(e) { setPf(function(f) { return Object.assign({}, f, {stock:e.target.value}); }); }} placeholder="Ex: 50"/>
        </Modal>
      )}
      {editP && (
        <Modal title="Editar Produto" onClose={function() { setEditP(null); }} onSave={saveEditP} saving={saving} saveLabel="Salvar alteracoes">
          <Inp label="Nome *" value={editP.name} onChange={function(e) { setEditP(function(f) { return Object.assign({}, f, {name:e.target.value}); }); }}/>
          <Inp label="Categoria" value={editP.category} onChange={function(e) { setEditP(function(f) { return Object.assign({}, f, {category:e.target.value}); }); }} placeholder="Ex: Servicos, Roupas..."/>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Preco de venda *" type="number" step="0.01" min="0" value={editP.price} onChange={function(e) { setEditP(function(f) { return Object.assign({}, f, {price:e.target.value}); }); }}/>
            <Inp label="Custo" type="number" step="0.01" min="0" value={editP.cost} onChange={function(e) { setEditP(function(f) { return Object.assign({}, f, {cost:e.target.value}); }); }} placeholder="Opcional"/>
          </div>
          <Inp label="Estoque atual" type="number" min="0" value={editP.stock} onChange={function(e) { setEditP(function(f) { return Object.assign({}, f, {stock:e.target.value}); }); }} placeholder="Em branco para servicos"/>
        </Modal>
      )}
      {lm && (
        <Modal title="Registrar Perda" onClose={function() { setLm(false); }} onSave={saveLoss} color="#dc2626" saving={saving}>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Produto</label><PSearch products={products} value={lf.desc} onSelect={function(p) { setLf(function(f) { return Object.assign({}, f, {desc:p.name}); }); }} onChange={function(v) { setLf(function(f) { return Object.assign({}, f, {desc:v}); }); }} placeholder="Buscar ou digitar"/></div>
          <Inp label="Quantidade" type="number" min="1" value={lf.qty} onChange={function(e) { setLf(function(f) { return Object.assign({}, f, {qty:e.target.value}); }); }}/>
          <Inp label="Motivo (opcional)" value={lf.reason} onChange={function(e) { setLf(function(f) { return Object.assign({}, f, {reason:e.target.value}); }); }} placeholder="Ex: Vencimento, Avaria..."/>
          <Inp label="Data" type="date" value={lf.date} onChange={function(e) { setLf(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
        </Modal>
      )}
      {editL && (
        <Modal title="Editar Perda" onClose={function() { setEditL(null); }} onSave={saveEditL} color="#dc2626" saving={saving} saveLabel="Salvar alteracoes">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Produto</label><PSearch products={products} value={editL.desc} onSelect={function(p) { setEditL(function(f) { return Object.assign({}, f, {desc:p.name}); }); }} onChange={function(v) { setEditL(function(f) { return Object.assign({}, f, {desc:v}); }); }} placeholder="Buscar ou digitar"/></div>
          <Inp label="Quantidade" type="number" min="1" value={editL.qty} onChange={function(e) { setEditL(function(f) { return Object.assign({}, f, {qty:e.target.value}); }); }}/>
          <Inp label="Motivo" value={editL.reason} onChange={function(e) { setEditL(function(f) { return Object.assign({}, f, {reason:e.target.value}); }); }} placeholder="Ex: Vencimento..."/>
          <Inp label="Data" type="date" value={editL.date} onChange={function(e) { setEditL(function(f) { return Object.assign({}, f, {date:e.target.value}); }); }}/>
        </Modal>
      )}
      {sm && sp && (
        <Modal title={'Repor estoque: ' + sp.name} onClose={function() { setSm(null); }} onSave={saveStock} saving={saving} saveLabel="Adicionar">
          <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between"><span className="text-sm text-gray-600">Estoque atual</span><span className="text-lg font-bold tabular">{sp.stock + ' un.'}</span></div>
          <Inp label="Quantidade a adicionar" type="number" min="1" value={sq} onChange={function(e) { setSq(e.target.value); }} placeholder="Ex: 10"/>
          {sq && Number(sq) > 0 && <p className="text-xs text-gray-400 text-center">{'Novo estoque: ' + ((sp.stock || 0) + Number(sq)) + ' un.'}</p>}
        </Modal>
      )}
    </div>
  );
}
