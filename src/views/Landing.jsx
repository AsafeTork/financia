import React from 'react';
import { PRICING_PLANS, WHATSAPP, waLink as makeWaLink } from '../lib/constants.js';
import { useScrollReveal } from '../hooks/useScrollReveal.js';

var INK = '#0a2540';
var BRAND = '#002f59';
var ACCENT = '#0f9d6c';
var WARM = '#fbfaf7';
var MUTED = '#5b6b7c';

var money = function(v) { return v === 0 ? 'R$ 0' : 'R$ ' + v.toFixed(2).replace('.', ','); };

var FEATURES = [
  { t: 'Funciona offline', d: 'Registre a venda na hora, mesmo sem sinal. Tudo sincroniza sozinho quando a internet volta.',
    icon: 'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01' },
  { t: 'Ao vivo entre celulares', d: 'Você no caixa, seu sócio no estoque — os mesmos números, atualizados na hora nos dois aparelhos.',
    icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3' },
  { t: 'Vendas, despesas e estoque', d: 'O que entra, o que sai e o que tem na prateleira. Um app só, sem planilha bagunçada.',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { t: 'Relatórios que decidem por você', d: 'Lucro do mês, onde o dinheiro está vazando e exportação pra planilha em um toque.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

var FAQ = [
  { q: 'Preciso de internet pra usar?', a: 'Não. O Financia funciona offline e sincroniza sozinho quando a conexão volta. Você nunca perde uma venda.' },
  { q: 'Funciona no celular e no computador?', a: 'Sim. Roda no navegador de qualquer aparelho e pode ser instalado como aplicativo no celular e no Windows.' },
  { q: 'Dá pra começar de graça?', a: 'Dá. O plano Grátis já resolve pra quem está começando, sem cartão de crédito. Quando crescer, você passa pro Pro.' },
  { q: 'Meus dados ficam seguros?', a: 'Ficam. Cada conta enxerga apenas os próprios dados, com conexão criptografada e isolamento por usuário no banco.' },
];

// Camada fixa (desktop): flutua nas laterais ao longo de toda a pagina, com
// parallax pelo scroll. Posicionadas nas bordas para nao cobrir o conteudo.
var MONEY_NOTES = [
  { v: '+R$ 250',  type: 'gain', top: '16%', left: '2.5%', dur: 6,   delay: 0,   rot: -8, factor: 0.06,  size: 13 },
  { v: '-R$ 80',   type: 'loss', top: '26%', right: '3%',  dur: 7,   delay: 0.8, rot: 7,  factor: 0.05,  size: 12 },
  { v: '+R$ 1.2k', type: 'gain', top: '54%', left: '3.5%', dur: 8,   delay: 0.4, rot: 6,  factor: 0.08,  size: 13 },
  { v: '-R$ 40',   type: 'loss', top: '70%', right: '4%',  dur: 6.5, delay: 1.2, rot: -6, factor: 0.07,  size: 11 },
  { v: '+R$ 500',  type: 'gain', top: '40%', right: '5.5%',dur: 7.5, delay: 0.2, rot: -5, factor: 0.045, size: 12 },
];

export default function Landing({ onEnter }) {
  var waLink = makeWaLink('Quero conhecer o Financia para o meu negócio.');
  var delay = function(ms) { return { animationDelay: ms + 'ms', animationFillMode: 'both' }; };
  var scrollState = React.useState(0);
  var scrollY = scrollState[0];
  var setScrollY = scrollState[1];
  React.useEffect(function() {
    var onScroll = function() { setScrollY(window.scrollY || 0); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return function() { window.removeEventListener('scroll', onScroll); };
  }, []);
  var statsRef = useScrollReveal();
  var featRef = useScrollReveal();
  var priceRef = useScrollReveal();
  var faqRef = useScrollReveal();
  var ctaRef = useScrollReveal();

  return (
    <div className="relative overflow-hidden" style={{ color: INK, minHeight: '100vh' }}>

      {/* Fundo gradiente continuo cobrindo 100% da pagina (nivel mais baixo). */}
      <div className="fixed inset-0" style={{ zIndex: -20, background: 'linear-gradient(180deg, #fcfbf8 0%, #f4f8f5 45%, #eef3fa 100%)' }} aria-hidden="true" />

      {/* Notas de dinheiro (nivel intermediario): presas ao container central
          max-w-7xl — nunca coladas nas bordas da janela. Opacidade leve, atras do
          texto. Parallax vertical pelo scroll. Apenas desktop. */}
      <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-7xl px-4 sm:px-6 lg:px-8 pointer-events-none" style={{ zIndex: -10, opacity: 0.55 }} aria-hidden="true">
        {MONEY_NOTES.map(function(n, i) {
          var pos = { top: n.top };
          if (n.left) pos.left = n.left;
          if (n.right) pos.right = n.right;
          var isGain = n.type === 'gain';
          return (
            <div key={'note-' + i} className="absolute" style={Object.assign({}, pos, { transform: 'translateY(' + (scrollY * n.factor).toFixed(1) + 'px)' })}>
              <div className="money-note select-none" style={{ '--dur': n.dur + 's', '--delay': n.delay + 's', '--rot': n.rot + 'deg' }}>
                <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 shadow-lg" style={{ background: isGain ? 'rgba(15,157,108,0.95)' : 'rgba(225,29,72,0.95)', color: '#fff', fontSize: n.size + 'px', border: '1px solid rgba(255,255,255,0.28)' }}>
                  <svg width={Math.round(n.size)} height={Math.round(n.size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={isGain ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} /></svg>
                  <span className="font-bold tabular">{n.v}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conteudo no nivel mais alto (acima do gradiente e das notas), em coluna flex. */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">

      <header className="sticky top-0 z-30" style={{ background: 'rgba(251,250,247,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(10,37,64,0.08)' }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.svg" alt="Financia" className="w-8 h-8" />
            <span className="font-display text-xl font-semibold" style={{ color: INK, letterSpacing: '-0.3px' }}>Financia</span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <button onClick={onEnter} className="text-sm font-semibold px-4 min-h-[44px] rounded-xl text-white transition hover:opacity-90" style={{ background: BRAND }}>Entrar</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-16 lg:pt-20 lg:pb-24 relative overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
          <div>
            <div className="anim-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: 'rgba(15,157,108,0.1)', color: ACCENT }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
              Feito para o pequeno negócio brasileiro
            </div>
            <h1 className="anim-up font-display font-semibold" style={Object.assign({ color: INK, fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', lineHeight: 1.02, letterSpacing: '-1.5px' }, delay(60))}>
              Suas finanças no controle, <span style={{ fontStyle: 'italic', color: ACCENT }}>sem complicação</span>.
            </h1>
            <p className="anim-up mt-6 text-lg max-w-md" style={Object.assign({ color: MUTED, lineHeight: 1.55 }, delay(140))}>
              Vendas, despesas e estoque do seu negócio em um só lugar. Esqueça o caderninho e a planilha confusa.
            </p>
            <div className="anim-up mt-8 flex flex-col sm:flex-row gap-3" style={delay(220)}>
              <button onClick={onEnter} className="text-sm font-semibold px-7 py-4 rounded-2xl text-white transition hover:opacity-90 hover:-translate-y-0.5" style={{ background: BRAND, boxShadow: '0 10px 30px rgba(0,47,89,0.25)' }}>
                Criar conta grátis
              </button>
              <a href="#planos" className="text-sm font-semibold px-7 py-4 rounded-2xl transition hover:bg-black/5 text-center" style={{ border: '1px solid rgba(10,37,64,0.15)', color: INK }}>
                Ver planos
              </a>
            </div>
            <div className="anim-up mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={Object.assign({ color: MUTED }, delay(300))}>
              {['Sem cartão de crédito', 'Funciona offline', 'Pronto em 1 minuto'].map(function(t) {
                return (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    {t}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Mockup do produto */}
          <div className="anim-up relative" style={delay(180)}>
            <div className="absolute -inset-6 rounded-3xl" style={{ background: 'radial-gradient(120% 120% at 70% 20%, rgba(15,157,108,0.16), transparent 60%)' }} />
            <div className="lp-ring absolute -inset-8 rounded-full pointer-events-none" aria-hidden="true" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(15,157,108,0.12) 80deg, transparent 170deg, rgba(0,47,89,0.12) 260deg, transparent 360deg)', opacity: 0.65 }} />
            <div className="relative rounded-3xl p-5 sm:p-6 float-slow" style={{ background: '#fff', border: '1px solid rgba(10,37,64,0.08)', boxShadow: '0 30px 70px rgba(10,37,64,0.18)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium" style={{ color: MUTED }}>Resultado do mês</p>
                  <p className="font-display font-semibold tabular" style={{ color: INK, fontSize: '1.9rem', letterSpacing: '-0.5px' }}>R$ 8.420</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(15,157,108,0.12)', color: ACCENT }}>+18%</span>
              </div>
              <div className="flex items-end gap-1.5 h-24 mb-4">
                {[40, 62, 48, 80, 55, 92, 70].map(function(h, i) {
                  return <div key={String(i) + '-' + h} className="flex-1 rounded-md lp-bar" style={{ height: h + '%', background: i === 5 ? ACCENT : 'rgba(0,47,89,0.14)', animationDelay: (300 + i * 90) + 'ms' }} />;
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3.5" style={{ background: WARM }}>
                  <p className="text-xs" style={{ color: MUTED }}>Entradas</p>
                  <p className="font-bold tabular mt-0.5" style={{ color: INK }}>R$ 14.200</p>
                </div>
                <div className="rounded-2xl p-3.5" style={{ background: WARM }}>
                  <p className="text-xs" style={{ color: MUTED }}>Saídas</p>
                  <p className="font-bold tabular mt-0.5" style={{ color: INK }}>R$ 5.780</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prova / faixa */}
      <section ref={statsRef} className="max-w-6xl mx-auto px-5 py-10 scroll-reveal">
        <div className="rounded-3xl px-6 py-8 grid grid-cols-3 gap-4 text-center" style={{ background: '#fff', border: '1px solid rgba(10,37,64,0.08)' }}>
          {[['100%', 'no seu controle, online ou offline'], ['1 min', 'pra criar a conta e começar'], ['R$ 0', 'pra usar o plano grátis']].map(function(s) {
            return (
              <div key={s[0]}>
                <p className="font-display font-semibold" style={{ color: INK, fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', letterSpacing: '-0.5px' }}>{s[0]}</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>{s[1]}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section ref={featRef} className="max-w-6xl mx-auto px-5 py-14 scroll-reveal">
        <div className="max-w-xl mb-10">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Por que o Financia</p>
          <h2 className="font-display font-semibold mt-2" style={{ color: INK, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-1px', lineHeight: 1.1 }}>Tudo que o seu negócio precisa, nada que ele não usa</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(function(f) {
            return (
              <div key={f.t} className="rounded-3xl p-7 transition duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ background: '#fff', border: '1px solid rgba(10,37,64,0.08)', boxShadow: '0 2px 10px rgba(10,37,64,0.04)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(15,157,108,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <p className="font-display font-semibold text-xl mb-1.5" style={{ color: INK }}>{f.t}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{f.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section ref={priceRef} id="planos" className="max-w-6xl mx-auto px-5 py-16 scroll-mt-20 scroll-reveal">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Planos</p>
          <h2 className="font-display font-semibold mt-2" style={{ color: INK, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-1px' }}>Um preço justo pra cada fase</h2>
          <p className="mt-3 text-sm" style={{ color: MUTED }}>Comece de graça. Mude de plano quando quiser, sem fidelidade.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PRICING_PLANS.map(function(p) {
            var popular = !!p.popular;
            var isFree = p.id === 'free';
            var isPremiumCard = p.id === 'premium';
            var priceNote = isFree ? 'grátis para sempre, sem cartão' : 'cobrado mensalmente, cancele quando quiser';
            var btnStyle = popular ? { background: ACCENT, color: '#fff' } : (isFree ? { background: 'rgba(10,37,64,0.06)', color: INK } : { background: BRAND, color: '#fff' });
            var cardBorder = popular ? ('1px solid ' + INK) : ('1px solid ' + (isPremiumCard ? 'rgba(15,157,108,0.35)' : 'rgba(10,37,64,0.1)'));
            return (
              <div key={p.id}
                className={'rounded-3xl p-7 flex flex-col gap-5 relative transition duration-200' + (popular ? ' md:-translate-y-3' : '')}
                style={{ background: popular ? INK : '#fff', border: cardBorder, boxShadow: popular ? '0 30px 70px rgba(10,37,64,0.30)' : '0 2px 14px rgba(10,37,64,0.05)' }}>

                {popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap" style={{ background: ACCENT, color: '#fff', boxShadow: '0 6px 16px rgba(15,157,108,0.4)' }}>Mais escolhido</span>}

                {/* Nome + para quem e */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-2xl" style={{ color: popular ? '#fff' : INK }}>{p.name}</p>
                    {isPremiumCard && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(15,157,108,0.12)', color: ACCENT }}>Completo</span>}
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: popular ? 'rgba(255,255,255,0.65)' : MUTED }}>{p.tagline}</p>
                </div>

                {/* Preco + microcopy de confianca */}
                <div>
                  <div className="flex items-end gap-1">
                    <span className="font-display font-semibold tabular" style={{ color: popular ? '#fff' : INK, fontSize: '2.6rem', letterSpacing: '-1px', lineHeight: 1 }}>{money(p.price)}</span>
                    {p.period && <span className="text-sm mb-1.5" style={{ color: popular ? 'rgba(255,255,255,0.6)' : MUTED }}>{p.period}</span>}
                  </div>
                  <p className="text-xs mt-2.5" style={{ color: popular ? 'rgba(255,255,255,0.5)' : MUTED }}>{priceNote}</p>
                </div>

                {/* CTA */}
                <button onClick={onEnter} className="text-sm font-semibold py-3.5 rounded-2xl transition hover:opacity-90 min-h-[44px]" style={btnStyle}>{p.cta}</button>

                {/* Beneficios */}
                <div className="flex flex-col gap-2.5 pt-1">
                  {p.features.map(function(feat) {
                    var ladder = feat.indexOf('Tudo do') === 0;
                    if (ladder) {
                      return (
                        <div key={feat} className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: '1px dashed ' + (popular ? 'rgba(255,255,255,0.2)' : 'rgba(10,37,64,0.12)') }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                          <span className="text-sm font-bold" style={{ color: popular ? '#fff' : INK }}>{feat}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={feat} className="flex items-start gap-2.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><path d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm" style={{ color: popular ? 'rgba(255,255,255,0.9)' : 'rgba(10,37,64,0.82)' }}>{feat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Garantias + canal sob medida */}
        <div className="mt-9 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs" style={{ color: MUTED }}>
            {['Sem fidelidade', 'Troque ou cancele quando quiser', 'Pagamento seguro pela Stripe'].map(function(t) {
              return (
                <span key={t} className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  {t}
                </span>
              );
            })}
          </div>
          <a href={waLink} target="_blank" rel="noreferrer" className="text-xs font-semibold transition hover:opacity-70" style={{ color: BRAND }}>Precisa de algo sob medida? Fale no WhatsApp</a>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqRef} className="max-w-2xl mx-auto px-5 py-14 scroll-reveal">
        <h2 className="font-display font-semibold text-center mb-10" style={{ color: INK, fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.5px' }}>Perguntas frequentes</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map(function(item) {
            return (
              <details key={item.q} className="rounded-2xl p-5 group transition duration-200 hover:border-black/15" style={{ background: '#fff', border: '1px solid rgba(10,37,64,0.08)' }}>
                <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between min-h-[44px] -my-1.5 py-1.5" style={{ color: INK }}>
                  {item.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-3 transition-transform group-open:rotate-180" style={{ color: MUTED }}><path d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="text-sm mt-3 leading-relaxed" style={{ color: MUTED }}>{item.a}</p>
              </details>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
      <section ref={ctaRef} className="max-w-6xl mx-auto px-5 py-12 scroll-reveal">
        <div className="rounded-[2rem] px-6 py-16 text-center relative overflow-hidden" style={{ background: INK }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(80% 120% at 50% 0%, rgba(15,157,108,0.22), transparent 55%)' }} />
          <div className="relative">
            <h2 className="font-display font-semibold text-white" style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3rem)', letterSpacing: '-1px', lineHeight: 1.1 }}>Comece a organizar o seu negócio hoje</h2>
            <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Conta grátis, sem cartão. Leva menos de um minuto.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={onEnter} className="text-sm font-semibold px-8 py-4 rounded-2xl transition hover:opacity-90" style={{ background: ACCENT, color: '#fff' }}>Criar conta grátis</button>
              <a href={waLink} target="_blank" rel="noreferrer" className="text-sm font-semibold px-8 py-4 rounded-2xl transition hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>Falar no WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-5 py-10" style={{ borderTop: '1px solid rgba(10,37,64,0.08)' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/icon-192.svg" alt="" className="w-6 h-6" />
            <span className="font-display text-sm font-semibold" style={{ color: INK }}>Financia</span>
          </div>
          <p className="text-xs" style={{ color: MUTED }}>Gestão financeira para pequenos negócios</p>
          <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
            <a href="#privacidade" className="transition hover:opacity-70" style={{ color: MUTED }}>Privacidade</a>
            <a href="#termos" className="transition hover:opacity-70" style={{ color: MUTED }}>Termos de Uso</a>
          </div>
        </div>
      </footer>

      </div>
    </div>
  );
}
