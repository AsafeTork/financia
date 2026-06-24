import React, { useMemo, useReducer } from 'react';
import { Card, Inp, Modal, EditBtn, DelBtn, Badge, Btn, PageHead } from '../components/ui.jsx';
import { PSearch } from '../components/SaleForm.jsx';
import { fmt, fmtDate, today, safe, uid, brandAlpha } from '../lib/utils.js';

var INIT_PF = {name:'', category:'', price:'', cost:'', stock:''};

function initState() {
  return {
    tab: 'products',
    search: '',
    collapsed: new Set(),
    pm: false,
    editP: null,
    lm: false,
    editL: null,
    sm: null,
    pf: {name:'', category:'', price:'', cost:'', stock:''},
    lf: {desc:'', qty:'1', reason:'', date:today()},
    sq: '1',
    saving: false
  };
}

function reducer(state, action) {
  switch(action.type) {
    case 'SET_TAB':      return Object.assign({}, state, {tab: action.v});
    case 'SET_SEARCH':   return Object.assign({}, state, {search: action.v});
    case 'TOGGLE_COLLAPSE': {
      var n = new Set(state.collapsed);
      n.has(action.v) ? n.delete(action.v) : n.add(action.v);
      return Object.assign({}, state, {collapsed: n});
    }
    case 'OPEN_PM':       return Object.assign({}, state, {pm: true, pf: INIT_PF});
    case 'CLOSE_PM':      return Object.assign({}, state, {pm: false});
    case 'SET_EDIT_P':    return Object.assign({}, state, {editP: action.v});
    case 'PATCH_EDIT_P':  return Object.assign({}, state, {editP: Object.assign({}, state.editP, action.v)});
    case 'OPEN_LM':       return Object.assign({}, state, {lm: true, lf: {desc:'', qty:'1', reason:'', date:today()}});
    case 'CLOSE_LM':      return Object.assign({}, state, {lm: false});
    case 'SET_EDIT_L':    return Object.assign({}, state, {editL: action.v});
    case 'PATCH_EDIT_L':  return Object.assign({}, state, {editL: Object.assign({}, state.editL, action.v)});
    case 'SET_SM':        return Object.assign({}, state, {sm: action.v, sq: '1'});
    case 'SET_PF':        return Object.assign({}, state, {pf: Object.assign({}, state.pf, action.v)});
    case 'SET_LF':        return Object.assign({}, state, {lf: Object.assign({}, state.lf, action.v)});
    case 'SET_SQ':        return Object.assign({}, state, {sq: action.v});
    case 'SET_SAVING':    return Object.assign({}, state, {saving: action.v});
    default:              return state;
  }
}

export default function InventoryView({ products, losses, onAddProduct, onEditProduct, onDeleteProduct, onAddLoss, onEditLoss, onDeleteLoss, onAdjustStock, brand, toast, confirm }) {
  const [state, dispatch] = useReducer(reducer, null, initState);
  const {tab, search, collapsed, pm, editP, lm, editL, sm, pf, lf, sq, saving} = state;

  const saveProd = async function() {
    if (!pf.name || !pf.price) return;
    if (Number(pf.price) <= 0) { toast('Preço deve ser maior que zero', 'error'); return; }
    dispatch({type:'SET_SAVING', v:true});
    try {
      var ok = await onAddProduct({id:'P'+String(Date.now()).slice(-6), name:safe(pf.name), category:pf.category||null, price:Number(pf.price), cost:pf.cost?Number(pf.cost):null, stock:pf.stock!==''?Number(pf.stock):null});
      if (!ok) return;
      toast('Produto adicionado!');
      dispatch({type:'CLOSE_PM'});
    } catch(_) {}
    finally { dispatch({type:'SET_SAVING', v:false}); }
  };
  const saveEditP = async function() {
    if (!editP.name || !editP.price) return;
    if (Number(editP.price) <= 0) { toast('Preço deve ser maior que zero', 'error'); return; }
    dispatch({type:'SET_SAVING', v:true});
    try {
      var ok = await onEditProduct(editP.id, {name:safe(editP.name), category:editP.category||null, price:Number(editP.price), cost:editP.cost?Number(editP.cost):null, stock:editP.stock!==''&&editP.stock!=null?Number(editP.stock):null});
      if (!ok) return;
      toast('Produto atualizado');
      dispatch({type:'SET_EDIT_P', v:null});
    } catch(_) {}
    finally { dispatch({type:'SET_SAVING', v:false}); }
  };
  const saveLoss = async function() {
    if (!lf.desc || !lf.qty) return;
    dispatch({type:'SET_SAVING', v:true});
    try {
      var ok = await onAddLoss({id:uid(), desc:safe(lf.desc), qty:Number(lf.qty), reason:lf.reason, date:lf.date});
      if (!ok) return;
      const p = products.find(function(p) { return p.name === lf.desc; });
      if (p && p.stock != null) await onAdjustStock(p.id, -Number(lf.qty));
      toast(p ? 'Perda registrada e estoque abatido' : 'Perda registrada (produto nao encontrado no estoque)');
      dispatch({type:'CLOSE_LM'});
    } catch(_) {}
    finally { dispatch({type:'SET_SAVING', v:false}); }
  };
  const saveEditL = async function() {
    if (!editL.desc || !editL.qty) return;
    dispatch({type:'SET_SAVING', v:true});
    try {
      var ok = await onEditLoss(editL.id, {desc:safe(editL.desc), qty:Number(editL.qty), reason:editL.reason, date:editL.date});
      if (!ok) return;
      toast('Perda atualizada');
      dispatch({type:'SET_EDIT_L', v:null});
    } catch(_) {}
    finally { dispatch({type:'SET_SAVING', v:false}); }
  };
  const saveStock = async function() {
    if (!sq || !sm) return;
    dispatch({type:'SET_SAVING', v:true});
    try {
      var ok = await onAdjustStock(sm, Number(sq));
      if (!ok) return;
      toast('Estoque atualizado!');
      dispatch({type:'SET_SM', v:null});
    } catch(_) {}
    finally { dispatch({type:'SET_SAVING', v:false}); }
  };
  const toggleCat = function(cat) {
    dispatch({type:'TOGGLE_COLLAPSE', v:cat});
  };

  const listMemo = useMemo(function() {
    var disp = search.trim()
      ? products.filter(function(p) { return [p.name, p.category, p.id].filter(Boolean).some(function(v) { return v.toLowerCase().indexOf(search.toLowerCase()) !== -1; }); })
      : products;
    var grouped = Object.entries(
      disp.reduce(function(a, p) { var k = p.category || 'Sem categoria'; if (!a[k]) a[k] = []; a[k].push(p); return a; }, {})
    ).sort(function(pair1, pair2) {
      if (pair1[0] === 'Sem categoria') return 1;
      if (pair2[0] === 'Sem categoria') return -1;
      return pair1[0].localeCompare(pair2[0]);
    });
    return {disp: disp, grouped: grouped};
  }, [products, search]);

  const disp    = listMemo.disp;
  const grouped = listMemo.grouped;
  const sp      = sm ? products.find(function(p) { return p.id === sm; }) : null;

  var TABS = [
    {key:'products', label:'Produtos', count: products.length},
    {key:'losses',   label:'Perdas',   count: losses.length},
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        color={brand.color}
        title="Estoque e Perdas"
        sub={products.length + ' produto' + (products.length !== 1 ? 's' : '') + ' . ' + losses.length + ' perda' + (losses.length !== 1 ? 's' : '')}
        right={<>
          {tab === 'products' && (
            <Btn onClick={function() { dispatch({type:'OPEN_PM'}); }} style={{background: brand.color}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Adicionar
            </Btn>
          )}
          {tab === 'losses' && (
            <Btn onClick={function() { dispatch({type:'OPEN_LM'}); }} style={{background:'#ef4444'}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Registrar perda
            </Btn>
          )}
        </>}
      />

      <div className="flex border-b border-gray-100">
        {TABS.map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { dispatch({type:'SET_TAB', v:t.key}); }}
              className={'flex items-center gap-2 pb-3 px-1 mr-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-sm ' + (active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600')}
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
              <input value={search} onChange={function(e) { dispatch({type:'SET_SEARCH', v:e.target.value}); }} placeholder="Buscar por nome ou categoria..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
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
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Adicione produtos ou serviços com preço, custo e controle de estoque.</p>
              <Btn onClick={function() { dispatch({type:'OPEN_PM'}); }} className="mt-1" style={{background: brand.color}}>
                + Adicionar produto
              </Btn>
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
                        var margin   = p.cost != null && p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : null;
                        var marginColor = margin === null ? '' : margin > 30 ? '#16a34a' : margin > 10 ? '#d97706' : '#dc2626';
                        return (
                          <div key={p.id} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                  {p.category && (
                                    <Badge color="var(--text-sub)" bg="var(--bg-subtle)">{p.category}</Badge>
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
                                  <button onClick={function() { dispatch({type:'SET_SM', v:p.id}); }}
                                    className={'text-xs font-semibold px-2.5 py-1 rounded-lg mr-0.5 transition ' + (stockOut ? 'bg-red-50 text-red-600' : stockLow ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')}>
                                    {stockOut ? 'Esgotado' : p.stock + ' un'}
                                  </button>
                                )}
                                <EditBtn onClick={function() { dispatch({type:'SET_EDIT_P', v:{id:p.id, name:p.name, category:p.category||'', price:String(p.price), cost:p.cost!=null?String(p.cost):'', stock:p.stock!=null?String(p.stock):''}}); }}/>
                                <DelBtn onClick={function() { confirm('Excluir "' + p.name + '"?', async function() { var ok = await onDeleteProduct(p.id); if (ok) toast('Produto removido'); }); }}/>
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
              <Btn onClick={function() { dispatch({type:'OPEN_LM'}); }} className="mt-1" style={{background:'#ef4444'}}>
                + Registrar perda
              </Btn>
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
                        <p className="text-sm font-semibold text-gray-800 truncate">{l.qty + 'x ' + l.desc}</p>
                        <p className="text-xs text-gray-400 truncate">{fmtDate(l.date)}{l.reason ? ' . ' + l.reason : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditBtn onClick={function() { dispatch({type:'SET_EDIT_L', v:{id:l.id, desc:l.desc, qty:String(l.qty), reason:l.reason||'', date:l.date}}); }}/>
                      <DelBtn onClick={function() { confirm('Excluir esta perda?', async function() { var ok = await onDeleteLoss(l.id); if (ok) toast('Perda removida'); }); }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {pm && (
        <Modal title="Novo Produto ou Serviço" onClose={function() { dispatch({type:'CLOSE_PM'}); }} onSave={saveProd} saving={saving}>
          <Inp label="Nome *" value={pf.name} onChange={function(e) { dispatch({type:'SET_PF', v:{name:e.target.value}}); }} placeholder="Ex: Corte de cabelo, Camiseta P..."/>
          <Inp label="Categoria" value={pf.category} onChange={function(e) { dispatch({type:'SET_PF', v:{category:e.target.value}}); }} placeholder="Ex: Serviços, Roupas, Alimentos..."/>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Preço de venda *" type="number" step="0.01" min="0" value={pf.price} onChange={function(e) { dispatch({type:'SET_PF', v:{price:e.target.value}}); }} placeholder="0,00"/>
            <Inp label="Custo" type="number" step="0.01" min="0" value={pf.cost} onChange={function(e) { dispatch({type:'SET_PF', v:{cost:e.target.value}}); }} placeholder="0,00"/>
          </div>
          <Inp label="Estoque inicial (em branco para serviços)" type="number" min="0" value={pf.stock} onChange={function(e) { dispatch({type:'SET_PF', v:{stock:e.target.value}}); }} placeholder="Ex: 50"/>
        </Modal>
      )}
      {editP && (
        <Modal title="Editar Produto" onClose={function() { dispatch({type:'SET_EDIT_P', v:null}); }} onSave={saveEditP} saving={saving} saveLabel="Salvar alterações">
          <Inp label="Nome *" value={editP.name} onChange={function(e) { dispatch({type:'PATCH_EDIT_P', v:{name:e.target.value}}); }}/>
          <Inp label="Categoria" value={editP.category} onChange={function(e) { dispatch({type:'PATCH_EDIT_P', v:{category:e.target.value}}); }} placeholder="Ex: Serviços, Roupas..."/>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Preço de venda *" type="number" step="0.01" min="0" value={editP.price} onChange={function(e) { dispatch({type:'PATCH_EDIT_P', v:{price:e.target.value}}); }}/>
            <Inp label="Custo" type="number" step="0.01" min="0" value={editP.cost} onChange={function(e) { dispatch({type:'PATCH_EDIT_P', v:{cost:e.target.value}}); }} placeholder="Opcional"/>
          </div>
          <Inp label="Estoque atual" type="number" min="0" value={editP.stock} onChange={function(e) { dispatch({type:'PATCH_EDIT_P', v:{stock:e.target.value}}); }} placeholder="Em branco para serviços"/>
        </Modal>
      )}
      {lm && (
        <Modal title="Registrar Perda" onClose={function() { dispatch({type:'CLOSE_LM'}); }} onSave={saveLoss} color="#dc2626" saving={saving}>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Produto</label><PSearch products={products} value={lf.desc} onSelect={function(p) { dispatch({type:'SET_LF', v:{desc:p.name}}); }} onChange={function(v) { dispatch({type:'SET_LF', v:{desc:v}}); }} placeholder="Buscar ou digitar"/></div>
          <Inp label="Quantidade" type="number" min="1" value={lf.qty} onChange={function(e) { dispatch({type:'SET_LF', v:{qty:e.target.value}}); }}/>
          <Inp label="Motivo (opcional)" value={lf.reason} onChange={function(e) { dispatch({type:'SET_LF', v:{reason:e.target.value}}); }} placeholder="Ex: Vencimento, Avaria..."/>
          <Inp label="Data" type="date" value={lf.date} onChange={function(e) { dispatch({type:'SET_LF', v:{date:e.target.value}}); }}/>
        </Modal>
      )}
      {editL && (
        <Modal title="Editar Perda" onClose={function() { dispatch({type:'SET_EDIT_L', v:null}); }} onSave={saveEditL} color="#dc2626" saving={saving} saveLabel="Salvar alterações">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Produto</label><PSearch products={products} value={editL.desc} onSelect={function(p) { dispatch({type:'PATCH_EDIT_L', v:{desc:p.name}}); }} onChange={function(v) { dispatch({type:'PATCH_EDIT_L', v:{desc:v}}); }} placeholder="Buscar ou digitar"/></div>
          <Inp label="Quantidade" type="number" min="1" value={editL.qty} onChange={function(e) { dispatch({type:'PATCH_EDIT_L', v:{qty:e.target.value}}); }}/>
          <Inp label="Motivo" value={editL.reason} onChange={function(e) { dispatch({type:'PATCH_EDIT_L', v:{reason:e.target.value}}); }} placeholder="Ex: Vencimento..."/>
          <Inp label="Data" type="date" value={editL.date} onChange={function(e) { dispatch({type:'PATCH_EDIT_L', v:{date:e.target.value}}); }}/>
        </Modal>
      )}
      {sm && sp && (
        <Modal title={'Repor estoque: ' + sp.name} onClose={function() { dispatch({type:'SET_SM', v:null}); }} onSave={saveStock} saving={saving} saveLabel="Adicionar">
          <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between"><span className="text-sm text-gray-600">Estoque atual</span><span className="text-lg font-bold tabular">{sp.stock + ' un.'}</span></div>
          <Inp label="Quantidade a adicionar" type="number" min="1" value={sq} onChange={function(e) { dispatch({type:'SET_SQ', v:e.target.value}); }} placeholder="Ex: 10"/>
          {sq && Number(sq) > 0 && <p className="text-xs text-gray-400 text-center">{'Novo estoque: ' + ((sp.stock || 0) + Number(sq)) + ' un.'}</p>}
        </Modal>
      )}
    </div>
  );
}
