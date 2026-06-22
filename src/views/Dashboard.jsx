import React, { useMemo, useState } from 'react';
import { Card } from '../components/ui.jsx';
import { KpiCard, BarChartSVG, UsageBar } from '../components/UsageBar.jsx';
import { fmt, fmtDate, today, prevDays, brandAlpha } from '../lib/utils.js';
import { PLAN_LIMITS, effectivePlan } from '../lib/constants.js';
import { askAI } from '../lib/ai.js';

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

  var plan     = effectivePlan(planInfo);
  var lowStock = products.filter(function(p) { return p.stock != null && p.stock <= 5; });
  var atAnyLimit = plan === 'free' && (
    tx.length >= PLAN_LIMITS.free.transactions ||
    products.length >= PLAN_LIMITS.free.products ||
    (lossesCount || 0) >= PLAN_LIMITS.free.losses
  );
  var recent   = tx.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).slice(0, 8);
  var hour     = new Date().getHours();
  var greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  var [aiText, setAiText]       = useState('');
  var [aiLoading, setAiLoading] = useState(false);
  var [aiErr, setAiErr]         = useState('');

  var gerarInsights = async function() {
    setAiLoading(true); setAiErr(''); setAiText('');
    var resumo = 'Mes atual. Entradas: ' + fmt(ti) + '. Saidas: ' + fmt(to) + '. Lucro: ' + fmt(profitCurr) + '.';
    if (profVar !== null) resumo += ' Variacao do lucro vs mes anterior: ' + profVar + '%.';
    if (lowStock.length > 0) resumo += ' Produtos com estoque baixo: ' + lowStock.length + '.';
    resumo += ' Total de produtos: ' + products.length + '. Lancamentos no mes: ' + mtx.length + '.';
    var sys = 'Voce e um consultor financeiro para pequenos negocios no Brasil. Com base nos numeros, escreva no maximo 4 dicas curtas, praticas e diretas, em portugues do Brasil, sem jargao e sem repetir os numeros. Foque em acoes concretas. Use uma linha por dica comecando com "- ".';
    var r = await askAI(resumo, sys, 400);
    setAiLoading(false);
    if (r.ok) setAiText(r.text); else setAiErr(r.error);
  };

  return (
    <div className="flex flex-col gap-5">

      <div>
        <h1 className="page-header">{greeting}</h1>
        <p className="page-sub capitalize">
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
        <KpiCard label="Entradas do mês"
          value={fmt(ti)}
          color="#22c55e"
          accentBar="#22c55e"
          variation={inVar}
          onClick={function() { onNav('income'); }}
          sub={inVar === null ? 'Sem dados anteriores' : undefined}/>
        <KpiCard label="Saídas do mês"
          value={fmt(to)}
          color="#ef4444"
          accentBar="#ef4444"
          variation={outVar !== null ? -outVar : null}
          onClick={function() { onNav('expense'); }}
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

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>
            </svg>
            <p className="text-sm font-semibold text-gray-800 truncate">Insights da IA</p>
          </div>
          <button onClick={gerarInsights} disabled={aiLoading}
            className="text-xs font-semibold px-3 py-2 rounded-lg text-white transition hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{background: brand.color}}>
            {aiLoading ? 'Analisando...' : (aiText ? 'Atualizar' : 'Gerar análise')}
          </button>
        </div>
        {aiErr && <p className="text-xs text-red-500">{aiErr}</p>}
        {!aiText && !aiErr && !aiLoading && <p className="text-xs text-gray-400 leading-relaxed">Receba dicas práticas baseadas nos seus números do mês.</p>}
        {aiLoading && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="skeleton" style={{height:10, width:'100%'}}/>
            <div className="skeleton" style={{height:10, width:'85%'}}/>
            <div className="skeleton" style={{height:10, width:'70%'}}/>
          </div>
        )}
        {aiText && <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{color:'var(--text-sub)'}}>{aiText}</div>}
      </Card>

      {plan === 'free' && (
        <Card className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Plano gratuito</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white" style={{background: brand.color}}>FREE</span>
          </div>
          <UsageBar label="Transações" used={tx.length} limit={PLAN_LIMITS.free.transactions} color={brand.color} accentColor={brand.color}/>
          <UsageBar label="Produtos"   used={products.length} limit={PLAN_LIMITS.free.products} color={brand.color} accentColor={brand.color}/>
          <UsageBar label="Perdas"     used={lossesCount || 0} limit={PLAN_LIMITS.free.losses} color={brand.color} accentColor={brand.color}/>
          {atAnyLimit && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-red-200" style={{background:'rgba(239,68,68,0.06)'}}>
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"/>
              <p className="text-xs font-semibold text-red-700">Plano gratuito esgotado — novos registros bloqueados</p>
            </div>
          )}
          <a href="https://wa.me/5591992086829?text=Quero%20ativar%20o%20plano%20Pro%20do%20Financia"
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-xl py-3 min-h-[44px] transition hover:opacity-90"
            style={{background:'#25d366'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.554 4.103 1.523 5.83L.057 23.25l5.565-1.457A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.876 0-3.63-.487-5.147-1.342l-.369-.217-3.302.866.878-3.21-.24-.38A9.954 9.954 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Ativar plano Pro via WhatsApp
          </a>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">Últimos 7 dias</p>
          <div className="flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background: brand.color}}/>
              Entradas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 inline-block"/>
              Saídas
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
              <p className="text-sm font-semibold text-gray-700">Nenhuma movimentação ainda</p>
              <p className="text-xs text-gray-400">Registre sua primeira venda para ver o resumo aqui.</p>
              <button onClick={function() { onNav('income'); }}
                className="text-xs font-semibold px-5 py-3 rounded-xl text-white transition hover:opacity-90 min-h-[44px]"
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
          <p className="text-sm font-semibold text-gray-800">Movimentações recentes</p>
          {recent.length > 0 && (
            <button onClick={function() { onNav('report'); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
              Ver relatório
            </button>
          )}
        </div>
        {recent.length === 0
          ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p className="text-sm text-gray-400">Nenhuma movimentação</p>
              <div className="flex gap-3">
                <button onClick={function() { onNav('income'); }} className="text-xs font-semibold px-4 py-3 rounded-lg text-white min-h-[44px]" style={{background:'#22c55e'}}>+ Venda</button>
                <button onClick={function() { onNav('expense'); }} className="text-xs font-semibold px-4 py-3 rounded-lg text-white bg-red-400 min-h-[44px]">+ Despesa</button>
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
