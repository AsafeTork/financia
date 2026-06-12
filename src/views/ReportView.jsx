import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui.jsx';
import { fmt, today, monthLabel, brandAlpha } from '../lib/utils.js';

export default function ReportView({ tx, brand, toast }) {
  var accentColor = (brand && brand.color) || '#1a6b5c';

  var allMonths = useMemo(function() {
    return Array.from(new Set(tx.map(function(t) { return t.date.slice(0, 7); }))).sort(function(a, b) { return b.localeCompare(a); });
  }, [tx]);

  var recentMonths = useMemo(function() {
    var now = today().slice(0, 7);
    var months = [];
    for (var i = 0; i < 6; i++) {
      var d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    return months;
  }, []);

  var [month, setMonth] = useState(today().slice(0, 7));

  var filtered = tx.filter(function(t) { return t.date.startsWith(month); });
  var income  = filtered.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var expense = filtered.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var bycat   = filtered.filter(function(t) { return t.type === 'expense'; }).reduce(function(a, t) { var k = t.category || 'Outro'; a[k] = (a[k] || 0) + t.amount; return a; }, {});

  var exportCSV = function() {
    var rows = filtered.map(function(t) { return t.date + ',"' + t.desc + '",' + t.amount.toFixed(2) + ',' + (t.type === 'income' ? 'Entrada' : 'Saida') + ',' + (t.method || t.category || ''); });
    var csv = 'Data,Descricao,Valor,Tipo,Metodo/Cat\n' + rows.join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'relatorio-' + month + '.csv';
    a.click();
    toast('CSV exportado!');
  };

  var kpis = [
    {l:'Entradas', v:income, c:accentColor},
    {l:'Saidas',   v:expense, c:'#ef4444'},
    {l:'Resultado', v:income - expense, c: income - expense >= 0 ? accentColor : '#ef4444'},
    {l:'Registros', v:filtered.length, c:'#64748b', isCount:true},
  ];

  if (allMonths.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="page-header">Relatorio</h2>
          <p className="page-sub">Fechamento mensal</p>
        </div>
        <Card>
          <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background: brandAlpha(accentColor, 0.08)}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">Nenhum dado disponivel</p>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Registre vendas e despesas para gerar relatorios mensais.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="page-header">Relatorio</h2>
          <p className="page-sub">Fechamento mensal</p>
        </div>
        {filtered.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            CSV
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {allMonths.map(function(m) {
          var active = m === month;
          var shortLabel = new Date(m + '-15').toLocaleDateString('pt-BR', {month:'short', year:'2-digit'});
          return (
            <button key={m} onClick={function() { setMonth(m); }}
              className={'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ' + (active ? 'text-white' : 'text-gray-500 bg-gray-100 hover:bg-gray-200')}
              style={active ? {background: accentColor} : {}}>
              {shortLabel}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map(function(item) {
          return (
            <Card key={item.l} className="px-4 py-3.5 overflow-hidden" accent={true} color={item.c}>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1.5" style={{color:'#94a3b8'}}>{item.l}</p>
              <p className={'font-bold mt-1.5 tabular ' + (item.isCount ? 'text-xl' : 'text-lg')} style={{color: item.c, letterSpacing:'-0.5px'}}>
                {item.isCount ? item.v : fmt(item.v)}
              </p>
            </Card>
          );
        })}
      </div>

      {Object.keys(bycat).length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Despesas por categoria</p>
          <div className="flex flex-col gap-2.5">
            {Object.entries(bycat).sort(function(a, b) { return b[1] - a[1]; }).map(function(pair) {
              var cat = pair[0]; var val = pair[1];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0 truncate">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:(val/expense*100).toFixed(0)+'%', background:'#ef4444'}}/>
                  </div>
                  <span className="text-xs font-semibold tabular text-gray-600 w-20 text-right">{fmt(val)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Movimentacoes</p>
          <span className="text-xs text-gray-400">{filtered.length} registros</span>
        </div>
        {filtered.length === 0
          ? <div className="py-10 text-center text-sm text-gray-400">Sem registros neste mes.</div>
          : (
            <>
              <div className="divide-y divide-gray-50">
                {filtered.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).map(function(t) {
                  var isInc = t.type === 'income';
                  return (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: isInc ? brandAlpha(accentColor, 0.1) : 'rgba(239,68,68,0.08)'}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isInc ? accentColor : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={isInc ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p>
                          <p className="text-xs text-gray-400">{new Date(t.date + 'T12:00').toLocaleDateString('pt-BR') + ' . ' + (t.method || t.category || '') + (t.registered_by ? ' . ' + t.registered_by : '')}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular flex-shrink-0 ml-3" style={{color: isInc ? accentColor : '#ef4444'}}>
                        {(isInc ? '+' : '-') + fmt(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultado do mes</span>
                <span className={'text-sm font-bold tabular ' + (income - expense >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {income - expense >= 0 ? '+' : ''}{fmt(income - expense)}
                </span>
              </div>
            </>
          )
        }
      </Card>
    </div>
  );
}
