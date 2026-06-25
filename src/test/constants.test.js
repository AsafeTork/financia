import { describe, it, expect } from 'vitest';
import {
  INIT_BRAND, INIT_PLAN, PLAN_LIMITS, PLAN_KIND_LABEL,
  effectivePlan, limitFor, atLimit,
  waLink, WHATSAPP,
  PRICING_PLANS, THEME_PRESETS, NAV, TEMPLATES,
} from '../lib/constants.js';

var FREE = { plan: 'free' };
var PRO  = { plan: 'pro', plan_expires_at: null };
var PRO_EXPIRED  = { plan: 'pro', plan_expires_at: '2000-01-01T00:00:00Z' };
var PRO_FUTURE   = { plan: 'pro', plan_expires_at: '2099-12-31T00:00:00Z' };

// ---------------------------------------------------------------------------
// PLAN_LIMITS
// ---------------------------------------------------------------------------
describe('PLAN_LIMITS', function() {
  it('free transactions = 50', function() { expect(PLAN_LIMITS.free.transactions).toBe(50); });
  it('free products = 20', function() { expect(PLAN_LIMITS.free.products).toBe(20); });
  it('free losses = 10', function() { expect(PLAN_LIMITS.free.losses).toBe(10); });
  it('pro transactions = Infinity', function() { expect(PLAN_LIMITS.pro.transactions).toBe(Infinity); });
  it('pro products = Infinity', function() { expect(PLAN_LIMITS.pro.products).toBe(Infinity); });
  it('pro losses = Infinity', function() { expect(PLAN_LIMITS.pro.losses).toBe(Infinity); });
});

// ---------------------------------------------------------------------------
// PLAN_KIND_LABEL
// ---------------------------------------------------------------------------
describe('PLAN_KIND_LABEL', function() {
  it('transactions → transacoes', function() { expect(PLAN_KIND_LABEL.transactions).toBe('transacoes'); });
  it('products → produtos', function() { expect(PLAN_KIND_LABEL.products).toBe('produtos'); });
  it('losses → perdas', function() { expect(PLAN_KIND_LABEL.losses).toBe('perdas'); });
});

// ---------------------------------------------------------------------------
// effectivePlan
// ---------------------------------------------------------------------------
describe('effectivePlan', function() {
  it('null → free', function() { expect(effectivePlan(null)).toBe('free'); });
  it('undefined → free', function() { expect(effectivePlan(undefined)).toBe('free'); });
  it('objeto vazio → free', function() { expect(effectivePlan({})).toBe('free'); });
  it('plano free → free', function() { expect(effectivePlan(FREE)).toBe('free'); });
  it('pro sem expiração → pro', function() { expect(effectivePlan(PRO)).toBe('pro'); });
  it('pro com expiração futura → pro', function() { expect(effectivePlan(PRO_FUTURE)).toBe('pro'); });
  it('pro expirado → free', function() { expect(effectivePlan(PRO_EXPIRED)).toBe('free'); });
  it('plano "premium" não reconhecido → free', function() { expect(effectivePlan({ plan: 'premium' })).toBe('free'); });
  it('plan_expires_at null com pro → pro', function() {
    expect(effectivePlan({ plan: 'pro', plan_expires_at: null })).toBe('pro');
  });
  it('retorna apenas "free" ou "pro"', function() {
    var results = [effectivePlan(FREE), effectivePlan(PRO), effectivePlan(null)];
    results.forEach(function(r) { expect(['free', 'pro']).toContain(r); });
  });
});

// ---------------------------------------------------------------------------
// limitFor
// ---------------------------------------------------------------------------
describe('limitFor', function() {
  it('free transactions → 50', function() { expect(limitFor(FREE, 'transactions')).toBe(50); });
  it('free products → 20', function() { expect(limitFor(FREE, 'products')).toBe(20); });
  it('free losses → 10', function() { expect(limitFor(FREE, 'losses')).toBe(10); });
  it('pro transactions → Infinity', function() { expect(limitFor(PRO, 'transactions')).toBe(Infinity); });
  it('pro products → Infinity', function() { expect(limitFor(PRO, 'products')).toBe(Infinity); });
  it('pro losses → Infinity', function() { expect(limitFor(PRO, 'losses')).toBe(Infinity); });
  it('pro expirado transactions → 50 (cai para free)', function() {
    expect(limitFor(PRO_EXPIRED, 'transactions')).toBe(50);
  });
  it('null (sem plano) → 50 transações', function() { expect(limitFor(null, 'transactions')).toBe(50); });
});

// ---------------------------------------------------------------------------
// atLimit
// ---------------------------------------------------------------------------
describe('atLimit', function() {
  it('free transactions no limite exato (50) → true', function() { expect(atLimit(FREE, 'transactions', 50)).toBe(true); });
  it('free transactions abaixo (49) → false', function() { expect(atLimit(FREE, 'transactions', 49)).toBe(false); });
  it('free transactions acima (51) → true', function() { expect(atLimit(FREE, 'transactions', 51)).toBe(true); });
  it('free products no limite (20) → true', function() { expect(atLimit(FREE, 'products', 20)).toBe(true); });
  it('free products abaixo (0) → false', function() { expect(atLimit(FREE, 'products', 0)).toBe(false); });
  it('free losses no limite (10) → true', function() { expect(atLimit(FREE, 'losses', 10)).toBe(true); });
  it('free losses abaixo (9) → false', function() { expect(atLimit(FREE, 'losses', 9)).toBe(false); });
  it('pro transactions nunca atinge limite (50) → false', function() {
    expect(atLimit(PRO, 'transactions', 50)).toBe(false);
  });
  it('pro transactions com 1 milhão → false', function() {
    expect(atLimit(PRO, 'transactions', 1000000)).toBe(false);
  });
  it('pro products com 999 → false', function() {
    expect(atLimit(PRO, 'products', 999)).toBe(false);
  });
  it('pro losses com 100 → false', function() {
    expect(atLimit(PRO, 'losses', 100)).toBe(false);
  });
  it('free transactions com 0 → false', function() {
    expect(atLimit(FREE, 'transactions', 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// waLink
// ---------------------------------------------------------------------------
describe('waLink', function() {
  it('contém o número correto', function() { expect(waLink()).toContain(WHATSAPP); });
  it('começa com https://wa.me/', function() { expect(waLink()).toMatch(/^https:\/\/wa\.me\//); });
  it('msg falsy não adiciona ?text=', function() { expect(waLink()).not.toContain('?text='); });
  it('msg vazia não adiciona ?text=', function() { expect(waLink('')).not.toContain('?text='); });
  it('null não adiciona ?text=', function() { expect(waLink(null)).not.toContain('?text='); });
  it('msg preenchida adiciona ?text=', function() { expect(waLink('oi')).toContain('?text='); });
  it('msg com espaço é URL-encoded', function() { expect(waLink('oi tudo')).toContain('%20'); });
  it('retorna string', function() { expect(typeof waLink('msg')).toBe('string'); });
});

// ---------------------------------------------------------------------------
// WHATSAPP
// ---------------------------------------------------------------------------
describe('WHATSAPP', function() {
  it('é string', function() { expect(typeof WHATSAPP).toBe('string'); });
  it('só dígitos', function() { expect(WHATSAPP).toMatch(/^\d+$/); });
  it('tem código de país (55)', function() { expect(WHATSAPP.startsWith('55')).toBe(true); });
});

// ---------------------------------------------------------------------------
// INIT_BRAND
// ---------------------------------------------------------------------------
describe('INIT_BRAND', function() {
  it('name = Financia', function() { expect(INIT_BRAND.name).toBe('Financia'); });
  it('color = #002f59', function() { expect(INIT_BRAND.color).toBe('#002f59'); });
  it('theme = light', function() { expect(INIT_BRAND.theme).toBe('light'); });
  it('phone = string vazia', function() { expect(INIT_BRAND.phone).toBe(''); });
  it('tem propriedade logo', function() { expect(INIT_BRAND).toHaveProperty('logo'); });
  it('tem propriedade logo_url', function() { expect(INIT_BRAND).toHaveProperty('logo_url'); });
});

// ---------------------------------------------------------------------------
// INIT_PLAN
// ---------------------------------------------------------------------------
describe('INIT_PLAN', function() {
  it('plan = free', function() { expect(INIT_PLAN.plan).toBe('free'); });
  it('plan_expires_at = null', function() { expect(INIT_PLAN.plan_expires_at).toBeNull(); });
  it('plan_activated_by = null', function() { expect(INIT_PLAN.plan_activated_by).toBeNull(); });
});

// ---------------------------------------------------------------------------
// PRICING_PLANS
// ---------------------------------------------------------------------------
describe('PRICING_PLANS', function() {
  it('tem 3 planos', function() { expect(PRICING_PLANS.length).toBe(3); });
  it('primeiro é free', function() { expect(PRICING_PLANS[0].id).toBe('free'); });
  it('segundo é pro', function() { expect(PRICING_PLANS[1].id).toBe('pro'); });
  it('terceiro é premium', function() { expect(PRICING_PLANS[2].id).toBe('premium'); });
  it('pro é popular', function() { expect(PRICING_PLANS[1].popular).toBeTruthy(); });
  it('free tem preço zero', function() { expect(PRICING_PLANS[0].price).toBe(0); });
  it('pro tem preço > 0', function() { expect(PRICING_PLANS[1].price).toBeGreaterThan(0); });
  it('todos têm features como array', function() {
    PRICING_PLANS.forEach(function(p) { expect(Array.isArray(p.features)).toBe(true); });
  });
  it('todos têm pelo menos 1 feature', function() {
    PRICING_PLANS.forEach(function(p) { expect(p.features.length).toBeGreaterThan(0); });
  });
  it('todos têm name e cta', function() {
    PRICING_PLANS.forEach(function(p) {
      expect(typeof p.name).toBe('string');
      expect(typeof p.cta).toBe('string');
    });
  });
});

// ---------------------------------------------------------------------------
// NAV
// ---------------------------------------------------------------------------
describe('NAV', function() {
  it('tem itens', function() { expect(NAV.length).toBeGreaterThan(0); });
  it('contém dashboard', function() { expect(NAV.some(function(n) { return n.key === 'dashboard'; })).toBe(true); });
  it('contém settings', function() { expect(NAV.some(function(n) { return n.key === 'settings'; })).toBe(true); });
  it('contém report', function() { expect(NAV.some(function(n) { return n.key === 'report'; })).toBe(true); });
  it('email tem adminOnly = true', function() {
    var email = NAV.find(function(n) { return n.key === 'email'; });
    expect(email.adminOnly).toBe(true);
  });
  it('todos têm key e label', function() {
    NAV.forEach(function(n) {
      expect(typeof n.key).toBe('string');
      expect(typeof n.label).toBe('string');
    });
  });
  it('todos têm d (path do ícone)', function() {
    NAV.forEach(function(n) { expect(typeof n.d).toBe('string'); });
  });
  it('dashboard não tem adminOnly', function() {
    var d = NAV.find(function(n) { return n.key === 'dashboard'; });
    expect(d.adminOnly).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// THEME_PRESETS
// ---------------------------------------------------------------------------
describe('THEME_PRESETS', function() {
  it('tem 8 presets', function() { expect(THEME_PRESETS.length).toBe(8); });
  it('todos têm name', function() {
    THEME_PRESETS.forEach(function(t) { expect(typeof t.name).toBe('string'); });
  });
  it('todos têm color em hex', function() {
    THEME_PRESETS.forEach(function(t) { expect(t.color).toMatch(/^#[0-9a-f]{6}$/i); });
  });
  it('todos têm secondary em hex', function() {
    THEME_PRESETS.forEach(function(t) { expect(t.secondary).toMatch(/^#[0-9a-f]{6}$/i); });
  });
  it('todos têm accent em hex', function() {
    THEME_PRESETS.forEach(function(t) { expect(t.accent).toMatch(/^#[0-9a-f]{6}$/i); });
  });
  it('todos têm segment', function() {
    THEME_PRESETS.forEach(function(t) { expect(typeof t.segment).toBe('string'); });
  });
  it('nomes são únicos', function() {
    var names = THEME_PRESETS.map(function(t) { return t.name; });
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------------------------
describe('TEMPLATES', function() {
  it('tem pelo menos 3 templates', function() { expect(TEMPLATES.length).toBeGreaterThanOrEqual(3); });
  it('todos têm id', function() {
    TEMPLATES.forEach(function(t) { expect(typeof t.id).toBe('string'); });
  });
  it('todos têm name', function() {
    TEMPLATES.forEach(function(t) { expect(typeof t.name).toBe('string'); });
  });
  it('template welcome existe', function() {
    expect(TEMPLATES.some(function(t) { return t.id === 'welcome'; })).toBe(true);
  });
  it('template custom existe', function() {
    expect(TEMPLATES.some(function(t) { return t.id === 'custom'; })).toBe(true);
  });
});
