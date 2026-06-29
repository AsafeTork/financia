import { describe, it, expect } from 'vitest';
import { planRank, planChangeCta } from './constants.js';

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
