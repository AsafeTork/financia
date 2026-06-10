import React, { useState, useMemo } from 'react';
import { Card, Sel, Empty } from '../components/ui.jsx';
import { fmt, today, monthLabel } from '../lib/utils.js';

export default function ReportView({ tx, toast }) {
  const months = useMemo(function() {
    return Array.from(new Set(tx.map(function(t) { return t.date.slice(0, 7); }))).sort(function(a, b) { return b.localeCompare(a); });
  }, [tx]);
  const [month, setMonth] = useState(today().slice(0, 7));

  const filtered = tx.filter(function(t) { return t.date.startsWith(month); });
  const income = filtered.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  const expense = filtered.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  const bycat = filtered.filter(function(t) { return t.type === 'expense'; }).reduce(function(a, t) { const k = t.category || 'Outro'; a[k] = (a[k] || 0) + t.amount; return a; }, {});

  const exportCSV = function() {
    const rows = filtered.map(function(t) { return t.date + ',"' + t.desc + '",' + t.amount.toFixed(2) + ',' + (t.type === 'income' ? 'Entrada' : 'Saida') + ',' + (t.method || t.category || ''); });
    const csv = 'Data,Descricao,Valor,Tipo,Metodo/Cat\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'relatorio-' + month + '.csv';
    a.click();
    toast('CSV exportado!');
  };

  const kpis = [
    {l:'Entradas', v:income, c:'#1a6b5c'},
    {l:'Saidas', v:expense, c:'#ef4444'},
    {l:'Lucro', v:income - expense, c:income - expense >= 0 ? '#1a6b5c' : '#ef4444'},
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">Relatorio</h2><p className="text-sm text-gray-400 mt-0.5">Fechamento mensal</p></div>
        {filtered.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>CSV
          </button>
        )}
      </div>

      {months.length === 0
        ? <Card><Empty icon="[A]" title="Nenhum dado" sub="Registre vendas e despesas para gerar relatorios."/></Card>
        : (
          <>
            <Sel label="Periodo" value={month} onChange={function(e) { setMonth(e.target.value); }}>
              {months.map(function(m) { return <option key={m} value={m}>{monthLabel(m)}</option>; })}
            </Sel>
            <div className="grid grid-cols-3 gap-3">
              {kpis.map(function(item) {
                return (
                  <Card key={item.l} className="p-4 text-center overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:item.c}}/>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.l}</p>
                    <p className="text-sm font-bold mt-2" style={{color:item.c}}>{fmt(item.v)}</p>
                  </Card>
                );
              })}
            </div>
            {Object.keys(bycat).length > 0 && (
              <Card className="p-5">
                <p className="text-sm font-semibold text-gray-800 mb-3">Despesas por categoria</p>
                <div className="flex flex-col gap-2.5">
                  {Object.entries(bycat).sort(function(a, b) { return b[1] - a[1]; }).map(function(pair) {
                    const cat = pair[0], val = pair[1];
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0 truncate">{cat}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{width:(val/expense*100).toFixed(0)+'%'}}/></div>
                        <span className="text-xs font-semibold text-gray-600 w-20 text-right">{fmt(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            <Card>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Movimentacoes</p>
                <span className="text-xs text-gray-400">{filtered.length + ' registros'}</span>
              </div>
              {filtered.length === 0
                ? <div className="py-10 text-center text-sm text-gray-400">Sem registros neste mes.</div>
                : (
                  <div className="divide-y divide-gray-50">
                    {filtered.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).map(function(t) {
                      return (
                        <div key={t.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ' + (t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>{t.type === 'income' ? 'UP' : 'DOWN'}</div>
                            <div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p><p className="text-xs text-gray-400">{new Date(t.date + 'T12:00').toLocaleDateString('pt-BR') + ' . ' + (t.method || t.category || '') + (t.registered_by ? ' . ' + t.registered_by : '')}</p></div>
                          </div>
                          <span className={'text-sm font-semibold flex-shrink-0 ml-3 ' + (t.type === 'income' ? 'text-green-600' : 'text-red-500')}>{(t.type === 'income' ? '+' : '-') + fmt(t.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </Card>
          </>
        )
      }
    </div>
  );
}
