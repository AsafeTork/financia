import { describe, it, expect } from 'vitest';
import { isAdminGranted, countsAsRevenue } from './constants.js';

// Regra de negocio: plano dado MANUALMENTE pelo admin (plan_activated_by = email do
// admin) NAO conta como receita; plano pago via Stripe (plan_activated_by = uuid do
// webhook) conta. Plano expirado/free nunca conta.
describe('isAdminGranted', function() {
  it('email do admin => cortesia (true)', function() {
    expect(isAdminGranted({ plan: 'pro', plan_activated_by: 'admin@gestao.com' })).toBe(true);
  });
  it('uuid do stripe => nao e cortesia (false)', function() {
    expect(isAdminGranted({ plan: 'pro', plan_activated_by: '7f2b4c1d-fb44-4616-9cf7-1a8963b09d2d' })).toBe(false);
  });
  it('null => false', function() { expect(isAdminGranted({ plan: 'pro', plan_activated_by: null })).toBe(false); });
  it('objeto vazio => false', function() { expect(isAdminGranted({})).toBe(false); });
  it('null profile => false', function() { expect(isAdminGranted(null)).toBe(false); });
});

describe('countsAsRevenue', function() {
  it('pro pago via stripe => true', function() {
    expect(countsAsRevenue({ plan: 'pro', plan_activated_by: 'uuid-real' })).toBe(true);
  });
  it('pro cortesia do admin => false', function() {
    expect(countsAsRevenue({ plan: 'pro', plan_activated_by: 'admin@x.com' })).toBe(false);
  });
  it('premium pago futuro => true', function() {
    var future = new Date(Date.now() + 86400000).toISOString();
    expect(countsAsRevenue({ plan: 'premium', plan_activated_by: 'uuid', plan_expires_at: future })).toBe(true);
  });
  it('free => false', function() { expect(countsAsRevenue({ plan: 'free' })).toBe(false); });
  it('pro expirado => false', function() {
    var past = new Date(Date.now() - 86400000).toISOString();
    expect(countsAsRevenue({ plan: 'pro', plan_activated_by: 'uuid', plan_expires_at: past })).toBe(false);
  });
  it('null => false', function() { expect(countsAsRevenue(null)).toBe(false); });
});
