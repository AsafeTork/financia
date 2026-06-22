import { describe, it, expect } from 'vitest';
import { effectivePlan, limitFor, atLimit, PLAN_LIMITS } from './constants.js';

const FREE = { plan: 'free', plan_expires_at: null };
const PRO  = { plan: 'pro',  plan_expires_at: null };
const PRO_EXPIRED = { plan: 'pro', plan_expires_at: '2000-01-01T00:00:00Z' };
const PRO_ACTIVE  = { plan: 'pro', plan_expires_at: '2099-01-01T00:00:00Z' };

describe('effectivePlan', function() {
  it('retorna free para plano free', function() {
    expect(effectivePlan(FREE)).toBe('free');
  });
  it('retorna pro sem expiracao', function() {
    expect(effectivePlan(PRO)).toBe('pro');
  });
  it('retorna pro com data futura', function() {
    expect(effectivePlan(PRO_ACTIVE)).toBe('pro');
  });
  it('retorna free para pro expirado', function() {
    expect(effectivePlan(PRO_EXPIRED)).toBe('free');
  });
  it('retorna free para null', function() {
    expect(effectivePlan(null)).toBe('free');
  });
});

describe('limitFor', function() {
  it('retorna limite correto para free/transactions', function() {
    expect(limitFor(FREE, 'transactions')).toBe(PLAN_LIMITS.free.transactions);
  });
  it('retorna Infinity para pro/products', function() {
    expect(limitFor(PRO, 'products')).toBe(Infinity);
  });
});

describe('atLimit', function() {
  it('detecta limite atingido no free', function() {
    expect(atLimit(FREE, 'transactions', 50)).toBe(true);
  });
  it('false antes do limite', function() {
    expect(atLimit(FREE, 'transactions', 49)).toBe(false);
  });
  it('nunca atinge limite no pro', function() {
    expect(atLimit(PRO, 'transactions', 999999)).toBe(false);
  });
  it('detecta limite de produtos', function() {
    expect(atLimit(FREE, 'products', 20)).toBe(true);
  });
  it('detecta limite de perdas', function() {
    expect(atLimit(FREE, 'losses', 10)).toBe(true);
  });
});
