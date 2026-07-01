import React, { useMemo, useState } from 'react';
import { Card } from '../components/ui.jsx';
import { KpiCard, BarChartSVG, UsageBar } from '../components/UsageBar.jsx';
import { fmt, fmtDate, today, prevDays, brandAlpha } from '../lib/utils.js';
import { PLAN_LIMITS, effectivePlan } from '../lib/constants.js';
import { askAI } from '../lib/aiClient.js';

export default function Dashboard({ tx, products, brand, onNav, planInfo, lossesCount, onUpgrade }) {
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
  var canUseAI = plan !== 'free';
  var lowStock = products.filter(function(p) { return p.stock != null && p.stock <= 5; });
  // Uso por categoria (cada uma com seu proprio limite e cor — independentes).
  var usage = [
    { key: 'transactions', label: 'Transações', used: tx.length,        limit: PLAN_LIMITS.free.transactions, color: brand.color },
    { key: 'products',     label: 'Produtos',   used: products.length,  limit: PLAN_LIMITS.free.products,     color: '#0f9d6c' },
    { key: 'losses',       label: 'Perdas',     used: lossesCount || 0, limit: PLAN_LIMITS.free.losses,       color: '#8b5cf6' },
  ];
  var reachedCats = usage.filter(function(u) { return u.used >= u.limit; });
  var anyReached = plan === 'free' && reachedCats.length > 0;
  var recent   = tx.slice().sort(function(a, b) { return b.date.localeCompare(a.date); }).slice(0, 8);
  var hour     = new Date().getHours();
  var greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  var [aiText, setAiText]       = useState('');
  var [aiLoading, setAiLoading] = useState(false);
  var [aiErr, setAiErr]         = useState('');

  var gerarInsights = async function() {
    setAiLoading(true); setAiErr(''); setAiText('');
    var byCat = mtx.filter(function(t) { return t.type === 'expense'; }).reduce(function(a, t) {
      var k = t.category || t.cat || 'Outros';
      a[k] = (a[k] || 0) + t.amount;
      return a;
    }, {});
    var topCats = Object.keys(byCat).map(function(k) { return [k, byCat[k]]; })
      .sort(function(a, b) { return b[1] - a[1]; }).slice(0, 3);
    var nSales = mtx.filter(function(t) { return t.type === 'income'; }).length;
    var ticket = nSales > 0 ? ti / nSales : 0;

    var top = topCats.map(function(c) { return c[0] + ':' + Math.round(c[1]); }).join('|');
    var resumo = 'in=' + Math.round(ti)
      + ';out=' + Math.round(to)
      + ';profit=' + Math.round(profitCurr)
      + ';profit_var=' + (profVar == null ? 'na' : String(profVar))
      + ';sales=' + nSales
      + ';ticket=' + Math.round(ticket)
      + ';top_exp=' + (top || 'none')
      + ';low_stock=' + lowStock.length
      + ';products=' + products.length
      + ';entries=' + mtx.length;
    var r = await askAI(resumo, { mode: 'insights', maxTokens: 220 });
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

      {tx.length === 0 && products.length === 0 && (
        <Card className="p-5" accent={true} color={brand.color}>
          <p className="font-display text-lg font-semibold mt-1" style={{color:'var(--text-main)'}}>Bem-vindo ao Financia</p>
          <p className="text-sm mt-1 mb-4" style={{color:'var(--text-sub)'}}>Em 3 passos o controle do seu negócio começa a funcionar.</p>
          <div className="flex flex-col gap-2">
            {[
              {n:'1', t:'Cadastre seus produtos ou serviços', act:function() { onNav('inventory'); }, btn:'Cadastrar'},
              {n:'2', t:'Registre a sua primeira venda', act:function() { onNav('income'); }, btn:'Registrar'},
              {n:'3', t:'Acompanhe o lucro aqui no painel', act:null, btn:''}
            ].map(function(step) {
              return (
                <div key={step.n} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{background:'var(--bg-subtle)'}}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background: brand.color}}>{step.n}</span>
                  <span className="text-sm flex-1 min-w-0" style={{color:'var(--text-main)'}}>{step.t}</span>
                  {step.act && (
                    <button onClick={step.act} className="text-xs font-semibold px-3 rounded-lg flex-shrink-0 inline-flex items-center justify-center min-h-[44px] hover:opacity-90" style={{background: brandAlpha(brand.color, 0.12), color: brand.color}}>{step.btn}</button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 px-4 py-3.5 flex flex-col gap-2" style={{background:'rgba(245,158,11,0.10)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"/>
              <p className="text-sm font-semibold text-amber-800">Estoque baixo</p>
            </div>
            <button onClick={function() { onNav('inventory'); }} className="text-xs text-amber-600 font-semibold hover:underline inline-flex items-center min-h-[44px] -my-2.5 px-1 flex-shrink-0">
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
          variation={outVar}
          invert={true}
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
          {canUseAI && (
            <button onClick={gerarInsights} disabled={aiLoading}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-white transition hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{background: brand.color}}>
              {aiLoading ? 'Analisando...' : (aiText ? 'Atualizar' : 'Gerar análise')}
            </button>
          )}
        </div>
        {!canUseAI ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 leading-relaxed">Disponível apenas para planos Pro e Premium.</p>
            <button onClick={onUpgrade}
              className="self-start text-xs font-semibold px-3 py-2 rounded-lg text-white transition hover:opacity-90 min-h-[44px]"
              style={{background: brand.color}}>
              Fazer upgrade
            </button>
          </div>
        ) : (
          <React.Fragment>
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
          </React.Fragment>
        )}
      </Card>

      {plan === 'free' && (
        <Card className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Plano gratuito</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white" style={{background: brand.color}}>FREE</span>
          </div>
          <div className="flex flex-col gap-3">
            {usage.map(function(u, i) {
              return (
                <div key={u.key} className={i > 0 ? 'pt-3 border-t' : ''} style={i > 0 ? {borderColor:'var(--border)'} : {}}>
                  <UsageBar label={u.label} used={u.used} limit={u.limit} color={u.color}/>
                </div>
              );
            })}
          </div>
          {anyReached && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 border border-amber-200" style={{background:'rgba(245,158,11,0.07)'}}>
              <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1"/>
              <p className="text-xs font-semibold text-amber-700">
                {'Limite de ' + reachedCats.map(function(c) { return c.label.toLowerCase(); }).join(' e ') + ' atingido. As demais categorias continuam liberadas.'}
              </p>
            </div>
          )}
          <button onClick={onUpgrade}
            className="flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-xl py-3 min-h-[44px] transition hover:opacity-90"
            style={{background: brand.color}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
            {anyReached ? 'Liberar tudo — fazer upgrade' : 'Ver planos e fazer upgrade'}
          </button>
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
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:'#ef4444'}}/>
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
            <button onClick={function() { onNav('report'); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium inline-flex items-center min-h-[44px] -my-4 px-1 flex-shrink-0">
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
                <button onClick={function() { onNav('income'); }} className="text-xs font-semibold px-4 py-3 rounded-lg text-white min-h-[44px] hover:opacity-90" style={{background:'#22c55e'}}>+ Venda</button>
                <button onClick={function() { onNav('expense'); }} className="text-xs font-semibold px-4 py-3 rounded-lg text-white bg-red-400 min-h-[44px] hover:opacity-90">+ Despesa</button>
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
                        <p className="text-xs text-gray-400 truncate">{fmtDate(t.date)}{t.method ? ' . ' + t.method : ''}{t.category ? ' . ' + t.category : ''}</p>
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
