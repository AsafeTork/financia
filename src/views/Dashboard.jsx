import React, { useMemo } from 'react';
import { Card } from '../components/ui.jsx';
import { KpiCard, BarChartSVG, UsageBar } from '../components/UsageBar.jsx';
import { fmt, fmtDate, today, prevDays, brandAlpha } from '../lib/utils.js';
import { PLAN_LIMITS, effectivePlan } from '../lib/constants.js';

export default function Dashboard({ tx, products, brand, onNav, planInfo, lossesCount }) {
  var cm = today().slice(0, 7);
  var now_d = new Date();
  var prevM = new Date(now_d.getFullYear(), now_d.getMonth() - 1, 1);
  var pm = prevM.getFullYear() + '-' + String(prevM.getMonth() + 1).padStart(2, '0');

  var mtx  = tx.filter(function(t) { return t.date.startsWith(cm); });
  var pmtx = tx.filter(function(t) { return t.date.startsWith(pm); });

  var ti   = mtx.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var to   = mtx.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var pmi  = pmtx.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var pmo  = pmtx.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);

  var dtx  = tx.filter(function(t) { return t.date === today(); });
  var di   = dtx.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var dout = dtx.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);

  var inVar  = pmi  > 0 ? Math.round(((ti - pmi) / pmi) * 100)   : null;
  var outVar = pmo  > 0 ? Math.round(((to - pmo) / pmo) * 100)   : null;
  var profitCurr = ti - to;
  var profitPrev = pmi - pmo;
  var profVar = profitPrev !== 0 ? Math.round(((profitCurr - profitPrev) / Math.abs(profitPrev)) * 100) : null;

  var chartData = useMemo(function() {
    return Array.from({length: 7}, function(_, i) {
      var d = prevDays(6 - i);
      var dt = tx.filter(function(t) { return t.date === d; });
      return {
        day: new Date(d + 'T12:00').toLocaleDateString('pt-BR', {weekday: 'short'}),
        i: dt.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0),
        o: dt.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0),
      };
    });
  }, [tx]);

  var lowStock = products.filter(function(p) { return p.stock != null && p.stock <= 5; });
  var recent   = tx.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).slice(0, 8);
  var plan     = effectivePlan(planInfo);
  var companyName = (brand && brand.name) ? brand.name : '';

  return (
    <div className="flex flex-col gap-5">

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
          {new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}
        </p>

      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 px-4 py-3.5 flex flex-col gap-2" style={{background:'rgba(245,158,11,0.10)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"/>
              <p className="text-sm font-semibold text-amber-800">Estoque baixo</p>
            </div>
            <button onClick={function() { onNav('inventory'); }} className="text-xs text-amber-600 font-semibold hover:underline">
              Ver estoque
            </button>
          </div>
          {lowStock.slice(0, 3).map(function(p) {
            return (
              <div key={p.id} className="flex items-center justify-between pl-3.5">
                <span className="text-sm text-amber-700">{p.name}</span>
                <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (p.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700')}>
                  {p.stock <= 0 ? 'Esgotado' : p.stock + ' un.'}
                </span>
              </div>
            );
          })}
          {lowStock.length > 3 && <p className="text-xs text-amber-600 pl-3.5">+{lowStock.length - 3} outros com estoque baixo</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Entradas do mes"
          value={fmt(ti)}
          color="#22c55e"
          accentBar="#22c55e"
          variation={inVar}
          sub={inVar === null ? 'Sem dados anteriores' : undefined}/>
        <KpiCard label="Saidas do mes"
          value={fmt(to)}
          color="#ef4444"
          accentBar="#ef4444"
          variation={outVar !== null ? -outVar : null}
          sub={outVar === null ? 'Sem dados anteriores' : undefined}/>
        <KpiCard label="Resultado"
          value={fmt(profitCurr)}
          color={brand.color}
          accentBar={brand.color}
          variation={profVar}
          sub={profVar === null ? 'Sem dados anteriores' : undefined}/>
        <KpiCard label="Saldo hoje"
          value={fmt(di - dout)}
          color="#3b82f6"
          accentBar="#3b82f6"
          sub={di > 0 || dout > 0 ? ('+' + fmt(di) + ' / -' + fmt(dout)) : 'Sem movimento hoje'}/>
      </div>

      {plan === 'free' && (
        <Card className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Plano gratuito</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white" style={{background: brand.color}}>FREE</span>
          </div>
          <UsageBar label="Transacoes" used={tx.length} limit={PLAN_LIMITS.free.transactions} color={brand.color} accentColor={brand.color}/>
          <UsageBar label="Produtos"   used={products.length} limit={PLAN_LIMITS.free.products} color={brand.color} accentColor={brand.color}/>
          <UsageBar label="Perdas"     used={lossesCount || 0} limit={PLAN_LIMITS.free.losses} color={brand.color} accentColor={brand.color}/>
          <p className="text-xs text-gray-400">Upgrade para Pro: registros ilimitados.</p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">Ultimos 7 dias</p>
          <div className="flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background: brand.color}}/>
              Entradas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 inline-block"/>
              Saidas
            </span>
          </div>
        </div>
        {tx.length === 0
          ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <svg width="52" height="44" viewBox="0 0 52 44" fill="none">
                <rect x="2" y="22" width="12" height="20" rx="3" fill={brandAlpha(brand.color, 0.12)}/>
                <rect x="18" y="10" width="12" height="32" rx="3" fill={brandAlpha(brand.color, 0.22)}/>
                <rect x="34" y="15" width="12" height="27" rx="3" fill={brandAlpha(brand.color, 0.17)}/>
                <rect x="2" y="42" width="44" height="2" rx="1" fill={brandAlpha(brand.color, 0.1)}/>
              </svg>
              <p className="text-sm font-semibold text-gray-700">Nenhuma movimentacao ainda</p>
              <p className="text-xs text-gray-400">Registre sua primeira venda para ver o resumo aqui.</p>
              <button onClick={function() { onNav('income'); }}
                className="text-xs font-semibold px-5 py-2.5 rounded-xl text-white transition hover:opacity-90"
                style={{background: brand.color}}>
                Registrar primeira venda
              </button>
            </div>
          )
          : <BarChartSVG data={chartData} color={brand.color}/>
        }
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Movimentacoes recentes</p>
          {recent.length > 0 && (
            <button onClick={function() { onNav('report'); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
              Ver relatorio
            </button>
          )}
        </div>
        {recent.length === 0
          ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p className="text-sm text-gray-400">Nenhuma movimentacao</p>
              <div className="flex gap-3">
                <button onClick={function() { onNav('income'); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{background:'#22c55e'}}>+ Venda</button>
                <button onClick={function() { onNav('expense'); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-red-400">+ Despesa</button>
              </div>
            </div>
          )
          : (
            <div className="divide-y divide-gray-50">
              {recent.map(function(t) {
                var isInc = t.type === 'income';
                return (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{background: isInc ? brandAlpha(brand.color, 0.1) : 'rgba(239,68,68,0.08)'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={isInc ? brand.color : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={isInc ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p>
                        <p className="text-xs text-gray-400">{fmtDate(t.date)}{t.method ? ' . ' + t.method : ''}{t.category ? ' . ' + t.category : ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular flex-shrink-0 ml-3" style={{color: isInc ? brand.color : '#ef4444'}}>
                      {(isInc ? '+' : '-') + fmt(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>
    </div>
  );
}
