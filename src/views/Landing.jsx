import React from 'react';
import { PRICING_PLANS, WHATSAPP } from '../lib/constants.js';
import { brandAlpha } from '../lib/utils.js';

var money = function(v) { return v === 0 ? 'R$ 0' : 'R$ ' + v.toFixed(2).replace('.', ','); };

var FEATURES = [
  { t: 'Funciona offline', d: 'Registre vendas mesmo sem internet. Tudo sincroniza sozinho quando reconectar.',
    d2: 'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01' },
  { t: 'Tempo real entre celulares', d: 'Você no caixa e seu sócio no estoque, vendo os mesmos números ao vivo.',
    d2: 'M12 4v16m8-8H4' },
  { t: 'Vendas, despesas e estoque', d: 'Tudo em um só app: o que entra, o que sai e o que tem em estoque.',
    d2: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { t: 'Relatórios que ajudam a decidir', d: 'Lucro do mês, despesas por categoria e exportação para planilha.',
    d2: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

var FAQ = [
  { q: 'Preciso de internet para usar?', a: 'Não. O Financia funciona offline e sincroniza automaticamente quando a conexão volta. Seus dados nunca se perdem.' },
  { q: 'Funciona no celular e no computador?', a: 'Sim. Funciona no navegador de qualquer aparelho e pode ser instalado como aplicativo no celular e no Windows.' },
  { q: 'Posso começar de graça?', a: 'Sim. O plano Grátis é completo para começar, sem cartão de crédito. Quando o negócio crescer, você muda para o Pro.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Cada conta acessa apenas os próprios dados, com conexão criptografada (HTTPS) e isolamento por usuário no banco.' },
];

export default function Landing({ brand, onEnter }) {
  var c = (brand && brand.color) || '#002f59';
  var waLink = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Quero conhecer o Financia para o meu negocio.');

  var planCTA = function(p) {
    if (p.id === 'premium') return waLink;
    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>

      <header className="sticky top-0 z-20" style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.svg" alt="Financia" className="w-8 h-8" />
            <span className="font-extrabold text-lg" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Financia</span>
          </div>
          <button onClick={onEnter}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition hover:opacity-90"
            style={{ background: c }}>
            Entrar
          </button>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-5 pt-14 pb-16 lg:pt-24 lg:pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
          style={{ background: brandAlpha(c, 0.1), color: c }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
          Online e offline, no celular e no computador
        </div>
        <h1 className="font-extrabold mx-auto max-w-3xl" style={{ color: 'var(--text-main)', fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.08, letterSpacing: '-1px' }}>
          A gestão financeira do seu negócio, simples de verdade
        </h1>
        <p className="mt-5 text-base lg:text-lg max-w-xl mx-auto" style={{ color: 'var(--text-sub)' }}>
          Controle vendas, despesas e estoque em um só lugar. Sem planilha confusa, sem complicação — feito para quem toca o negócio no dia a dia.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onEnter}
            className="text-sm font-semibold px-7 py-3.5 rounded-xl text-white transition hover:opacity-90"
            style={{ background: c }}>
            Começar grátis
          </button>
          <a href="#planos"
            className="text-sm font-semibold px-7 py-3.5 rounded-xl border transition hover:bg-gray-50"
            style={{ borderColor: 'var(--border-md)', color: 'var(--text-main)' }}>
            Ver planos
          </a>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>Sem cartão de crédito para começar</p>
      </section>

      <section className="max-w-5xl mx-auto px-5 pb-16">
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(function(f) {
            return (
              <div key={f.t} className="rounded-2xl p-6 flex gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: brandAlpha(c, 0.1) }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.d2} /></svg>
                </div>
                <div>
                  <p className="font-bold text-sm mb-1" style={{ color: 'var(--text-main)' }}>{f.t}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>{f.d}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="planos" className="max-w-5xl mx-auto px-5 py-12 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="font-extrabold" style={{ color: 'var(--text-main)', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', letterSpacing: '-0.5px' }}>Planos que cabem no seu bolso</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-sub)' }}>Comece de graça. Mude de plano quando quiser, sem fidelidade.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PRICING_PLANS.map(function(p) {
            var popular = !!p.popular;
            var href = planCTA(p);
            return (
              <div key={p.id}
                className="rounded-2xl p-6 flex flex-col gap-5 relative"
                style={{
                  background: 'var(--bg-card)',
                  border: popular ? ('2px solid ' + c) : '1px solid var(--border)',
                  boxShadow: popular ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  transform: popular ? 'scale(1.02)' : 'none',
                }}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: c, transform: 'translateX(-50%)' }}>
                    Mais popular
                  </span>
                )}
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>{p.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.tagline}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="font-extrabold tabular" style={{ color: 'var(--text-main)', fontSize: '2rem', letterSpacing: '-1px' }}>{money(p.price)}</span>
                  {p.period && <span className="text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>{p.period}</span>}
                </div>
                {href
                  ? <a href={href} target="_blank" rel="noreferrer"
                      className="text-center text-sm font-semibold py-3 rounded-xl transition hover:opacity-90"
                      style={popular ? { background: c, color: '#fff' } : { border: '1px solid var(--border-md)', color: 'var(--text-main)' }}>
                      {p.cta}
                    </a>
                  : <button onClick={onEnter}
                      className="text-sm font-semibold py-3 rounded-xl transition hover:opacity-90"
                      style={popular ? { background: c, color: '#fff' } : { border: '1px solid var(--border-md)', color: 'var(--text-main)' }}>
                      {p.cta}
                    </button>
                }
                <div className="flex flex-col gap-2.5 pt-1">
                  {p.features.map(function(feat) {
                    return (
                      <div key={feat} className="flex items-start gap-2.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><path d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm" style={{ color: 'var(--text-sub)' }}>{feat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="font-extrabold text-center mb-8" style={{ color: 'var(--text-main)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.5px' }}>Perguntas frequentes</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map(function(item) {
            return (
              <details key={item.q} className="rounded-2xl p-5 group" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                  {item.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-3 transition-transform group-open:rotate-180" style={{ color: 'var(--text-muted)' }}><path d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-sub)' }}>{item.a}</p>
              </details>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-12">
        <div className="rounded-3xl px-6 py-12 text-center" style={{ background: c }}>
          <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', letterSpacing: '-0.5px' }}>Pronto para organizar o seu negócio?</h2>
          <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Comece grátis hoje. Leva menos de um minuto.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onEnter} className="text-sm font-semibold px-7 py-3.5 rounded-xl bg-white transition hover:opacity-90" style={{ color: c }}>
              Começar grátis
            </button>
            <a href={waLink} target="_blank" rel="noreferrer" className="text-sm font-semibold px-7 py-3.5 rounded-xl transition" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }}>
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <img src="/icon-192.svg" alt="" className="w-6 h-6" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Financia</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gestão financeira para pequenos negócios</p>
      </footer>

    </div>
  );
}
