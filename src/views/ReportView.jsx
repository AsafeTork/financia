import React, { useState, useMemo } from 'react';
import { Card, PageHead } from '../components/ui.jsx';
import ExportButtons from '../components/ExportButtons.jsx';
import { fmt, today, brandAlpha } from '../lib/utils.js';
import { effectivePlan } from '../lib/constants.js';
import { exportPDF, exportXLS } from '../lib/exporters.js';

export default function ReportView({ tx, brand, toast, onNav, planInfo }) {
  var accentColor = (brand && brand.color) || '#1a6b5c';
  var paid = effectivePlan(planInfo) !== 'free';

  var allMonths = useMemo(function() {
    return Array.from(new Set(tx.map(function(t) { return t.date.slice(0, 7); }))).sort(function(a, b) { return b.localeCompare(a); });
  }, [tx]);

  var [month, setMonth] = useState(today().slice(0, 7));

  var filtered = tx.filter(function(t) { return t.date.startsWith(month); });
  var income  = filtered.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var expense = filtered.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var bycat   = filtered.filter(function(t) { return t.type === 'expense'; }).reduce(function(a, t) { var k = t.category || 'Outro'; a[k] = (a[k] || 0) + t.amount; return a; }, {});

  var monthLabel = function(m) { return new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };
  var curRealMonth = today().slice(0, 7);
  var nextDisabled = month >= curRealMonth;
  var shiftMonth = function(delta) {
    var p = month.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1 + delta, 1);
    var mm = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (mm > curRealMonth) return;
    setMonth(mm);
  };

  var sortedRows = function() {
    return filtered.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  };
  var doExport = function(kind) {
    if (!paid) { if (onNav) onNav('planos'); return; }
    var headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Método/Cat'];
    var rows = sortedRows().map(function(t) {
      return [t.date, t.desc || '', (t.type === 'income' ? '+' : '-') + fmt(t.amount), (t.type === 'income' ? 'Entrada' : 'Saída'), (t.method || t.category || '')];
    });
    if (kind === 'xls') { exportXLS({ filename: 'relatorio-' + month, headers: headers, rows: rows }); toast('Excel exportado!'); return; }
    var ok = exportPDF({
      title: 'Relatório ' + monthLabel(month),
      brandName: (brand && brand.name) || 'Financia',
      subtitle: 'Relatório financeiro — ' + monthLabel(month),
      accent: accentColor, headers: headers, rows: rows,
      kpis: [
        { label: 'Entradas', value: fmt(income), color: accentColor },
        { label: 'Saídas', value: fmt(expense), color: '#ef4444' },
        { label: 'Resultado', value: fmt(income - expense) },
      ],
    });
    if (!ok) toast('Permita pop-ups para exportar o PDF.', 'error');
  };

  var kpis = [
    {l:'Entradas', v:income, c:accentColor},
    {l:'Saídas',   v:expense, c:'#ef4444'},
    {l:'Resultado', v:income - expense, c: income - expense >= 0 ? accentColor : '#ef4444'},
    {l:'Registros', v:filtered.length, c:'var(--text-sub)', isCount:true},
  ];

  if (allMonths.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHead
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color={accentColor}
          title="Relatório"
          sub="Fechamento mensal"
        />
        <Card>
          <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background: brandAlpha(accentColor, 0.08)}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{color:'var(--text-main)'}}>Nenhum dado disponível</p>
            <p className="text-xs max-w-xs leading-relaxed" style={{color:'var(--text-muted)'}}>Registre vendas e despesas para gerar relatórios mensais.</p>
            {onNav && (
              <button onClick={function() { onNav('income'); }}
                className="text-xs font-semibold px-5 py-3 rounded-xl text-white hover:opacity-90 mt-1 min-h-[44px]"
                style={{background: accentColor}}>
                Registrar primeira venda
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        color={accentColor}
        title="Relatório"
        sub="Fechamento mensal"
      />

      <Card className="px-2 py-2 flex items-center justify-between gap-2">
        <button onClick={function() { shiftMonth(-1); }} aria-label="Mês anterior"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition hover:bg-[var(--bg-subtle)]" style={{color:'var(--text-sub)'}}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div className="text-center min-w-0">
          <p className="text-sm font-semibold capitalize truncate" style={{color:'var(--text-main)'}}>{monthLabel(month)}</p>
          <p className="text-[11px]" style={{color:'var(--text-muted)'}}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={function() { shiftMonth(1); }} disabled={nextDisabled} aria-label="Próximo mês"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed" style={{color:'var(--text-sub)'}}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </Card>

      {filtered.length > 0 && (
        <Card className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{color:'var(--text-main)'}}>Exportar relatório</p>
          <ExportButtons paid={paid} color={accentColor}
            onPDF={function() { doExport('pdf'); }}
            onXLS={function() { doExport('xls'); }}
            onLocked={function() { if (onNav) onNav('planos'); }}/>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {kpis.map(function(item) {
          return (
            <Card key={item.l} className="px-4 py-3.5 overflow-hidden" accent={true} color={item.c}>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1.5" style={{color:'var(--text-muted)'}}>{item.l}</p>
              <p className={'font-bold mt-1.5 tabular ' + (item.isCount ? 'text-xl' : 'text-lg')} style={{color: item.c, letterSpacing:'-0.5px'}}>
                {item.isCount ? item.v : fmt(item.v)}
              </p>
            </Card>
          );
        })}
      </div>

      {Object.keys(bycat).length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-semibold mb-3" style={{color:'var(--text-main)'}}>Despesas por categoria</p>
          <div className="flex flex-col gap-2.5">
            {Object.entries(bycat).sort(function(a, b) { return b[1] - a[1]; }).map(function(pair) {
              var cat = pair[0]; var val = pair[1];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs w-24 flex-shrink-0 truncate" style={{color:'var(--text-sub)'}}>{cat}</span>
                  <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{background:'var(--bg-subtle)'}}>
                    <div className="h-full rounded-full" style={{width:(val/expense*100).toFixed(0)+'%', background:'#ef4444'}}/>
                  </div>
                  <span className="text-xs font-semibold tabular w-20 text-right" style={{color:'var(--text-sub)'}}>{fmt(val)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-5 py-4 flex items-center justify-between" style={{borderBottom:'1px solid var(--border)'}}>
          <p className="text-sm font-semibold" style={{color:'var(--text-main)'}}>Movimentações</p>
          <span className="text-xs" style={{color:'var(--text-muted)'}}>{filtered.length} registros</span>
        </div>
        {filtered.length === 0
          ? <div className="py-10 text-center text-sm" style={{color:'var(--text-muted)'}}>Sem registros neste mês.</div>
          : (
            <>
              <div className="divide-y" style={{borderColor:'var(--border)'}}>
                {filtered.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).map(function(t) {
                  var isInc = t.type === 'income';
                  return (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3 transition-colors duration-150 hover:bg-[var(--bg-subtle)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: isInc ? brandAlpha(accentColor, 0.1) : 'rgba(239,68,68,0.08)'}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isInc ? accentColor : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={isInc ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{color:'var(--text-main)'}}>{t.desc}</p>
                          <p className="text-xs truncate" style={{color:'var(--text-muted)'}}>{new Date(t.date + 'T12:00').toLocaleDateString('pt-BR') + ' . ' + (t.method || t.category || '') + (t.registered_by ? ' . ' + t.registered_by : '')}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular flex-shrink-0 ml-3" style={{color: isInc ? accentColor : '#ef4444'}}>
                        {(isInc ? '+' : '-') + fmt(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-5 py-3.5" style={{borderTop:'1px solid var(--border)', background:'var(--bg-subtle)'}}>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-sub)'}}>Resultado do mês</span>
                <span className="text-sm font-bold tabular" style={{color: income - expense >= 0 ? accentColor : '#ef4444'}}>
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
