import React, { useMemo } from 'react';
import { Card } from '../components/ui.jsx';
import { KpiCard, BarChartSVG, UsageBar } from '../components/UsageBar.jsx';
import { fmt, fmtDate, today, prevDays } from '../lib/utils.js';
import { PLAN_LIMITS, effectivePlan } from '../lib/constants.js';

export default function Dashboard({ tx, products, brand, onNav, planInfo, lossesCount }) {
  const cm = today().slice(0, 7);
  const mtx = tx.filter(function(t) { return t.date.startsWith(cm); });
  const ti = mtx.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  const to = mtx.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  const dtx = tx.filter(function(t) { return t.date === today(); });
  const di = dtx.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
  const dout = dtx.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);

  const chartData = useMemo(function() {
    return Array.from({length:7}, function(_, i) {
      const d = prevDays(6 - i);
      const dt = tx.filter(function(t) { return t.date === d; });
      return {
        day: new Date(d + 'T12:00').toLocaleDateString('pt-BR', {weekday:'short'}),
        i: dt.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0),
        o: dt.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0),
      };
    });
  }, [tx]);

  const lowStock = products.filter(function(p) { return p.stock != null && p.stock <= 5; });
  const recent = tx.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</p>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">Estoque baixo</p>
            <button onClick={function() { onNav('inventory'); }} className="text-xs text-amber-600 font-semibold hover:underline">Ver estoque</button>
          </div>
          {lowStock.map(function(p) {
            return (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm text-amber-700">{p.name}</span>
                <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (p.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700')}>{p.stock <= 0 ? 'Esgotado' : p.stock + ' un.'}</span>
              </div>
            );
          })}
        </div>
      )}

      {effectivePlan(planInfo) === 'free' && (
        <Card className="px-5 py-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Uso do plano gratuito</p>
          <UsageBar label="Transacoes" used={tx.length} limit={PLAN_LIMITS.free.transactions}/>
          <UsageBar label="Produtos" used={products.length} limit={PLAN_LIMITS.free.products}/>
          <UsageBar label="Perdas" used={lossesCount || 0} limit={PLAN_LIMITS.free.losses}/>
          <p className="text-xs text-gray-400">Faca upgrade para o Plano Pro e tenha tudo ilimitado.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Entradas (mes)" value={fmt(ti)} color="#1a6b5c"/>
        <KpiCard label="Saidas (mes)" value={fmt(to)} color="#ef4444"/>
        <KpiCard label="Lucro liquido" value={fmt(ti - to)} color={brand.color} sub="Este mes"/>
        <KpiCard label="Saldo hoje" value={fmt(di - dout)} color="#3b82f6" sub={'+' + fmt(di) + ' / -' + fmt(dout)}/>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Ultimos 7 dias</p>
          <div className="flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-600 inline-block"/>Entradas</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 inline-block"/>Saidas</span>
          </div>
        </div>
        {tx.length === 0
          ? <div className="flex flex-col items-center py-8 gap-2"><p className="text-sm text-gray-300">Nenhuma movimentacao ainda</p><button onClick={function() { onNav('income'); }} className="text-xs font-semibold text-green-600 hover:underline">Registrar primeira venda</button></div>
          : <BarChartSVG data={chartData}/>
        }
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Movimentacoes recentes</p>
          {recent.length > 0 && <button onClick={function() { onNav('report'); }} className="text-xs text-gray-400 hover:text-gray-600">Ver relatorio</button>}
        </div>
        {recent.length === 0
          ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <span className="text-3xl">[Lista]</span>
              <p className="text-sm text-gray-500">Nenhuma movimentacao</p>
              <div className="flex gap-3">
                <button onClick={function() { onNav('income'); }} className="text-xs font-semibold text-green-600 hover:underline">+ Venda</button>
                <button onClick={function() { onNav('expense'); }} className="text-xs font-semibold text-red-500 hover:underline">+ Despesa</button>
              </div>
            </div>
          )
          : (
            <div className="divide-y divide-gray-50">
              {recent.map(function(t) {
                return (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ' + (t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>{t.type === 'income' ? 'UP' : 'DOWN'}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p>
                        <p className="text-xs text-gray-400">{fmtDate(t.date) + ' . ' + (t.method || t.category || '') + (t.registered_by ? ' . ' + t.registered_by : '')}</p>
                      </div>
                    </div>
                    <span className={'text-sm font-semibold flex-shrink-0 ml-3 ' + (t.type === 'income' ? 'text-green-600' : 'text-red-500')}>{(t.type === 'income' ? '+' : '-') + fmt(t.amount)}</span>
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
