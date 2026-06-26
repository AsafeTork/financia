import React, { useState, useMemo } from 'react';
import { Card, PageHead } from '../components/ui.jsx';
import { fmt, today, brandAlpha } from '../lib/utils.js';
import { effectivePlan } from '../lib/constants.js';

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

  var csvEscape = function(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n=+\-@]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  var htmlEscape = function(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var download = function(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  };
  var tipoLabel = function(t) { return t.type === 'income' ? 'Entrada' : 'Saida'; };
  var sortedRows = function() {
    return filtered.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  };

  var exportCSV = function() {
    if (!paid) { if (onNav) onNav('planos'); return; }
    var rows = sortedRows().map(function(t) { return csvEscape(t.date) + ',' + csvEscape(t.desc) + ',' + t.amount.toFixed(2) + ',' + tipoLabel(t) + ',' + csvEscape(t.method || t.category || ''); });
    var csv = 'Data,Descrição,Valor,Tipo,Método/Cat\n' + rows.join('\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'relatorio-' + month + '.csv');
    toast('CSV exportado!');
  };

  var exportXLS = function() {
    if (!paid) { if (onNav) onNav('planos'); return; }
    var head = '<tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Tipo</th><th>Método/Cat</th></tr>';
    var body = sortedRows().map(function(t) {
      return '<tr><td>' + htmlEscape(t.date) + '</td><td>' + htmlEscape(t.desc) + '</td><td>' + t.amount.toFixed(2).replace('.', ',') + '</td><td>' + tipoLabel(t) + '</td><td>' + htmlEscape(t.method || t.category || '') + '</td></tr>';
    }).join('');
    var foot = '<tr><td colspan="2"><b>Resultado</b></td><td colspan="3"><b>' + (income - expense).toFixed(2).replace('.', ',') + '</b></td></tr>';
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head>'
      + '<body><table border="1">' + head + body + foot + '</table></body></html>';
    download(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' }), 'relatorio-' + month + '.xls');
    toast('Excel exportado!');
  };

  var exportPDF = function() {
    if (!paid) { if (onNav) onNav('planos'); return; }
    var win = window.open('', '_blank');
    if (!win) { toast('Permita pop-ups para exportar o PDF.', 'error'); return; }
    var label = new Date(month + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    var rows = sortedRows().map(function(t) {
      var val = (t.type === 'income' ? '+' : '-') + fmt(t.amount);
      return '<tr><td>' + htmlEscape(new Date(t.date + 'T12:00').toLocaleDateString('pt-BR')) + '</td><td>' + htmlEscape(t.desc) + '</td><td class="r" style="color:' + (t.type === 'income' ? accentColor : '#ef4444') + '">' + htmlEscape(val) + '</td></tr>';
    }).join('');
    var doc = '<!doctype html><html><head><meta charset="utf-8"><title>Relatório ' + htmlEscape(label) + '</title>'
      + '<style>*{font-family:Arial,Helvetica,sans-serif;color:#111}body{margin:32px}h1{font-size:20px;margin:0}'
      + '.sub{color:#666;font-size:12px;margin:2px 0 20px}.kpis{display:flex;gap:16px;margin-bottom:20px}'
      + '.kpi{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}.kpi p{margin:0}.kpi .l{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.5px}'
      + '.kpi .v{font-size:16px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:12px}'
      + 'th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #eee}th{color:#888;text-transform:uppercase;font-size:10px}.r{text-align:right;font-weight:700;white-space:nowrap}'
      + '@media print{body{margin:0}}</style></head><body>'
      + '<h1>' + htmlEscape((brand && brand.name) || 'Financia') + '</h1><p class="sub">Relatório financeiro — ' + htmlEscape(label) + '</p>'
      + '<div class="kpis"><div class="kpi"><p class="l">Entradas</p><p class="v" style="color:' + accentColor + '">' + htmlEscape(fmt(income)) + '</p></div>'
      + '<div class="kpi"><p class="l">Saídas</p><p class="v" style="color:#ef4444">' + htmlEscape(fmt(expense)) + '</p></div>'
      + '<div class="kpi"><p class="l">Resultado</p><p class="v">' + htmlEscape(fmt(income - expense)) + '</p></div></div>'
      + '<table><thead><tr><th>Data</th><th>Descrição</th><th class="r">Valor</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<script>window.onload=function(){window.print();}<\/script></body></html>';
    win.document.write(doc);
    win.document.close();
    toast('Abrindo PDF para impressão...');
  };

  var EXPORTS = [
    { key: 'pdf', label: 'PDF', act: exportPDF, icon: 'M9 13h6m-6 4h6M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z' },
    { key: 'xls', label: 'Excel', act: exportXLS, icon: 'M9 17l3-3m0 0l3 3m-3-3v6M4 7h16M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2M4 7v12a2 2 0 002 2' },
    { key: 'csv', label: 'CSV', act: exportCSV, icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
  ];

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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {allMonths.map(function(m) {
          var active = m === month;
          var shortLabel = new Date(m + '-15').toLocaleDateString('pt-BR', {month:'short', year:'2-digit'});
          return (
            <button key={m} onClick={function() { setMonth(m); }}
              className={'flex-shrink-0 px-3.5 min-h-[44px] rounded-xl text-xs font-semibold ' + (active ? 'text-white' : 'hover:opacity-80')}
              style={active ? {background: accentColor} : {background:'var(--bg-subtle)', color:'var(--text-sub)'}}>
              {shortLabel}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 && (
        <Card className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <p className="text-sm font-semibold" style={{color:'var(--text-main)'}}>Exportar relatório</p>
          </div>
          {paid ? (
            <div className="flex items-center gap-2">
              {EXPORTS.map(function(ex) {
                return (
                  <button key={ex.key} onClick={ex.act} className="flex items-center gap-1.5 text-xs font-semibold px-3 min-h-[44px] rounded-xl text-white transition hover:opacity-90" style={{background: accentColor}}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ex.icon}/></svg>
                    {ex.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <button onClick={function() { if (onNav) onNav('planos'); }} className="flex items-center gap-2 text-xs font-semibold px-4 min-h-[44px] rounded-xl transition hover:opacity-90" style={{background:'var(--bg-subtle)', color:'var(--text-sub)', border:'1px solid var(--border)'}}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              PDF, Excel e CSV no Pro
            </button>
          )}
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
