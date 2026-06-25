import React, { useState, useEffect } from 'react';
import { Inp, NumInp, Sel, Spin } from './ui.jsx';
import { fmt, uid as genId, safe } from '../lib/utils.js';
import { getRecurring, setRecurring, buildRecurringRow, periodOf } from '../lib/recurring.js';

var CATS = ['Fixo', 'Variavel', 'Estoque', 'Marketing', 'Pessoal', 'Servicos', 'Outro'];

// Gerenciador de despesas recorrentes fixas (aluguel, contas mensais).
// Disponivel para todos os planos. Ao adicionar, ja registra a despesa do mes atual.
export default function RecurringManager({ uid, color, toast, onClose, onApply }) {
  var [list, setList] = useState([]);
  var [form, setForm] = useState({ desc: '', amount: '', day: '5', category: 'Fixo' });
  var [busy, setBusy] = useState(false);

  useEffect(function() {
    var alive = true;
    getRecurring(uid).then(function(l) { if (alive) setList(l); });
    return function() { alive = false; };
  }, [uid]);

  var persist = async function(next) {
    setList(next);
    await setRecurring(uid, next);
  };

  var add = async function() {
    var desc = safe(form.desc);
    var amount = Number(form.amount);
    var day = Number(form.day);
    if (!desc) { toast('Informe a descrição (ex: Aluguel).', 'error'); return; }
    if (!(amount > 0)) { toast('Informe um valor maior que zero.', 'error'); return; }
    if (!(day >= 1 && day <= 31)) { toast('Dia do vencimento entre 1 e 31.', 'error'); return; }
    setBusy(true);
    var tpl = { id: genId(), desc: desc, amount: amount, day: day, category: form.category, active: true };
    var next = list.concat([tpl]);
    try {
      await persist(next);
      if (onApply) {
        var row = buildRecurringRow(uid, tpl, periodOf(new Date()));
        await onApply(row);
      }
      toast('Despesa recorrente adicionada.');
      setForm({ desc: '', amount: '', day: '5', category: 'Fixo' });
    } catch (e) { toast('Erro ao salvar.', 'error'); }
    finally { setBusy(false); }
  };

  var toggle = function(id) {
    var next = list.map(function(t) { return t.id === id ? Object.assign({}, t, { active: t.active === false }) : t; });
    persist(next);
  };
  var remove = function(id) {
    persist(list.filter(function(t) { return t.id !== id; }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col anim-scale" style={{ background: 'var(--bg-card)', maxHeight: '90vh', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <span className="font-semibold text-gray-900">Despesas recorrentes</span>
            <p className="text-xs text-gray-400">Registradas automaticamente todo mês</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">
          {list.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Nenhuma despesa recorrente ainda. Adicione aluguel, energia, internet e outras contas fixas.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map(function(t) {
                var on = t.active !== false;
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{t.desc}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-sub)' }}>{fmt(t.amount) + ' . todo dia ' + t.day + ' . ' + (t.category || 'Fixo')}</p>
                    </div>
                    <button onClick={function() { toggle(t.id); }} aria-pressed={on} aria-label={on ? 'Pausar' : 'Ativar'} title={on ? 'Ativa' : 'Pausada'}
                      className="relative w-11 h-6 rounded-full flex-shrink-0 transition" style={{ background: on ? '#16a34a' : '#cbd5e1' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all" style={{ left: on ? '22px' : '2px' }} />
                    </button>
                    <button onClick={function() { remove(t.id); }} aria-label="Remover" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nova recorrente</p>
            <Inp label="Descrição" value={form.desc} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { desc: e.target.value }); }); }} placeholder="Ex: Aluguel, Internet..." />
            <div className="grid grid-cols-2 gap-3">
              <NumInp label="Valor (R$)" value={form.amount} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { amount: e.target.value }); }); }} placeholder="0,00" />
              <NumInp label="Dia do mês" decimals={false} maxLen={2} value={form.day} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { day: e.target.value }); }); }} placeholder="5" />
            </div>
            <Sel label="Categoria" value={form.category} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { category: e.target.value }); }); }}>
              {CATS.map(function(c) { return <option key={c}>{c}</option>; })}
            </Sel>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6 pt-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">Fechar</button>
          <button onClick={add} disabled={busy} className="flex-1 text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 transition" style={{ background: color || 'var(--brand)' }}>
            {busy ? <Spin white /> : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
