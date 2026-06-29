import { describe, it, expect } from 'vitest';
import { planRank, planChangeCta, waLinkTo, displayPlanPrice } from './constants.js';

// Hierarquia: free < pro < premium. Usada para decidir upgrade/downgrade.
describe('planRank', function() {
  it('ordena free < pro < premium', function() {
    expect(planRank('free')).toBe(0);
    expect(planRank('pro')).toBe(1);
    expect(planRank('premium')).toBe(2);
  });
  it('plano desconhecido vale 0 (free)', function() {
    expect(planRank('xyz')).toBe(0);
    expect(planRank(null)).toBe(0);
    expect(planRank(undefined)).toBe(0);
  });
});

// Decide a acao do botao no card de plano conforme o plano ATUAL do usuario.
describe('planChangeCta', function() {
  it('mesmo plano => atual e desabilitado', function() {
    expect(planChangeCta('pro', 'pro')).toEqual({ kind: 'current', disabled: true });
    expect(planChangeCta('free', 'free')).toEqual({ kind: 'current', disabled: true });
  });
  it('free -> pago => assinar', function() {
    expect(planChangeCta('free', 'pro')).toEqual({ kind: 'subscribe', disabled: false });
    expect(planChangeCta('free', 'premium')).toEqual({ kind: 'subscribe', disabled: false });
  });
  it('pago inferior -> superior => upgrade', function() {
    expect(planChangeCta('pro', 'premium')).toEqual({ kind: 'upgrade', disabled: false });
  });
  it('pago superior -> inferior => downgrade (nunca "assinar" solto)', function() {
    expect(planChangeCta('premium', 'pro')).toEqual({ kind: 'downgrade', disabled: false });
  });
  it('pago -> free => cancelar', function() {
    expect(planChangeCta('pro', 'free')).toEqual({ kind: 'cancel', disabled: false });
    expect(planChangeCta('premium', 'free')).toEqual({ kind: 'cancel', disabled: false });
  });
  it('plano atual nulo/desconhecido trata como free', function() {
    expect(planChangeCta(null, 'pro')).toEqual({ kind: 'subscribe', disabled: false });
    expect(planChangeCta('zzz', 'free')).toEqual({ kind: 'current', disabled: true });
  });
});

// Link wa.me para o telefone de UM cliente (contato direto), nao o numero da empresa.
describe('waLinkTo', function() {
  it('monta link com digitos do telefone', function() {
    expect(waLinkTo('+55 91 99999-0000', 'oi')).toMatch(/^https:\/\/wa\.me\/5591999990000/);
  });
  it('inclui texto codificado', function() {
    expect(waLinkTo('5591999990000', 'a b')).toContain('text=a%20b');
  });
  it('telefone vazio retorna string vazia', function() {
    expect(waLinkTo('', 'x')).toBe('');
    expect(waLinkTo(null, 'x')).toBe('');
  });
  it('telefone curto demais retorna vazio', function() {
    expect(waLinkTo('123', 'x')).toBe('');
  });
});

// Preco a exibir: usa preco customizado (cortesia/desconto) se houver.
describe('displayPlanPrice', function() {
  it('sem custom usa preco do plano', function() {
    expect(displayPlanPrice(49.9, null)).toEqual({ value: 49.9, custom: false, original: 49.9 });
  });
  it('custom zero ignora', function() {
    expect(displayPlanPrice(49.9, 0)).toEqual({ value: 49.9, custom: false, original: 49.9 });
  });
  it('custom em centavos vira reais', function() {
    expect(displayPlanPrice(49.9, 2990)).toEqual({ value: 29.9, custom: true, original: 49.9 });
  });
});
