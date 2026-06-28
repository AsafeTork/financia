// Suite gerada por script (data-driven): tabelas + loops sobre as funcoes puras reais.
// Objetivo: cobertura ampla (700+ casos) deterministica e nao-brittle.
// Regras: locale/data -> propriedades; aleatorio -> formato/unicidade; resto -> valor exato.
import { describe, it, expect } from 'vitest';
import {
  fmt, hexToRgb, brandAlpha, fmtDate, monthLabel, now, today, prevDays,
  safe, isUrl, genPwd, uid, luminance, onColor, readableBrand, lightenHex,
  hexToHsl, hslToHex, deriveCores, passwordStrength, cleanNumeric, validPhone, maskPhone,
} from '../../lib/utils.js';
import {
  effectivePlan, limitFor, atLimit, waLink, PLAN_LIMITS, PRICING_PLANS,
  WHITELABEL, THEME_PRESETS, NAV, TEMPLATES, INIT_BRAND, INIT_PLAN, PLAN_KIND_LABEL,
  SUPPORT_EMAIL, WHATSAPP,
} from '../../lib/constants.js';
import { friendlyStripeError, stripeAppearance } from '../../lib/stripe.js';
import { periodOf, daysInMonth, dueDate, recurringId, isRecurringId, activeTemplates, buildRecurringRow } from '../../lib/recurring.js';
import { parsePhone, buildPhone } from '../../components/PhoneInput.jsx';

var HEX_RE = /^#[0-9a-f]{6}$/i;
var HEXES = [
  '#000000', '#ffffff', '#002f59', '#ff0000', '#00ff00', '#0000ff', '#123456', '#abcdef',
  '#ABCDEF', '#7f1d1d', '#14532d', '#2563eb', '#dc2626', '#16a34a', '#7c3aed', '#ea580c',
  '#db2777', '#0d9488', '#1f2937', '#0ea5e9', '#dbe7f3', '#dcfce7', '#fee2e2', '#ede9fe',
  '#ffedd5', '#fce7f3', '#ccfbf1', '#e5e7eb', '#111827', '#4c1d95', '#831843', '#0f3d3e',
  '#7c2d12', '#009739', '#FEDD00', '#046A38', '#DA291C', '#3C3B6E', '#B22234', '#74ACDF',
  '#006847', '#CE1126', '#AA151B', '#F1BF00', '#0f9d6c', '#eab308', '#22c55e', '#f97316',
  '#ef4444', '#8b5cf6',
];

// ---------------------------------------------------------------------------
// 1) Funcoes de cor (property-based) — 50 hexes x 8 invariantes
// ---------------------------------------------------------------------------
describe('cores: invariantes por hex', function() {
  HEXES.forEach(function(hex) {
    it('hexToRgb componentes 0-255 inteiros: ' + hex, function() {
      var c = hexToRgb(hex);
      expect(Number.isInteger(c.r)).toBe(true);
      expect(c.r).toBeGreaterThanOrEqual(0); expect(c.r).toBeLessThanOrEqual(255);
      expect(c.g).toBeGreaterThanOrEqual(0); expect(c.g).toBeLessThanOrEqual(255);
      expect(c.b).toBeGreaterThanOrEqual(0); expect(c.b).toBeLessThanOrEqual(255);
    });
    it('luminance entre 0 e 1: ' + hex, function() {
      var l = luminance(hex);
      expect(l).toBeGreaterThanOrEqual(0); expect(l).toBeLessThanOrEqual(1);
    });
    it('onColor retorna cor de texto valida: ' + hex, function() {
      expect(['#0a2540', '#ffffff']).toContain(onColor(hex));
    });
    it('hexToHsl faixas h/s/l: ' + hex, function() {
      var hsl = hexToHsl(hex);
      expect(hsl.h).toBeGreaterThanOrEqual(0); expect(hsl.h).toBeLessThanOrEqual(360);
      expect(hsl.s).toBeGreaterThanOrEqual(0); expect(hsl.s).toBeLessThanOrEqual(1);
      expect(hsl.l).toBeGreaterThanOrEqual(0); expect(hsl.l).toBeLessThanOrEqual(1);
    });
    it('hslToHex(hexToHsl) gera hex valido: ' + hex, function() {
      var hsl = hexToHsl(hex);
      expect(HEX_RE.test(hslToHex(hsl.h, hsl.s, hsl.l))).toBe(true);
    });
    it('lightenHex(0.4) gera hex valido: ' + hex, function() {
      expect(HEX_RE.test(lightenHex(hex, 0.4))).toBe(true);
    });
    it('deriveCores retorna secondary/accent hex validos: ' + hex, function() {
      var d = deriveCores(hex);
      expect(HEX_RE.test(d.secondary)).toBe(true);
      expect(HEX_RE.test(d.accent)).toBe(true);
    });
    it('readableBrand gera hex valido: ' + hex, function() {
      expect(HEX_RE.test(readableBrand(hex))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 2) hexToRgb / brandAlpha — valores exatos
// ---------------------------------------------------------------------------
describe('hexToRgb exato', function() {
  var T = [
    ['#000000', 0, 0, 0], ['#ffffff', 255, 255, 255], ['#ff0000', 255, 0, 0],
    ['#00ff00', 0, 255, 0], ['#0000ff', 0, 0, 255], ['#002f59', 0, 47, 89],
    ['#123456', 18, 52, 86], ['#abcdef', 171, 205, 239], ['#0f9d6c', 15, 157, 108],
    ['#7f1d1d', 127, 29, 29], ['#2563eb', 37, 99, 235], ['#16a34a', 22, 163, 74],
  ];
  T.forEach(function(row) {
    it('hexToRgb ' + row[0], function() {
      var c = hexToRgb(row[0]);
      expect(c).toEqual({ r: row[1], g: row[2], b: row[3] });
    });
  });
  it('hexToRgb sem # usa default quando vazio', function() {
    expect(hexToRgb('')).toEqual({ r: 0, g: 47, b: 89 });
  });
  it('hexToRgb null usa default', function() {
    expect(hexToRgb(null)).toEqual({ r: 0, g: 47, b: 89 });
  });
});

describe('brandAlpha exato', function() {
  var T = [
    ['#000000', 0.5, 'rgba(0,0,0,0.5)'], ['#ffffff', 1, 'rgba(255,255,255,1)'],
    ['#ff0000', 0.2, 'rgba(255,0,0,0.2)'], ['#002f59', 0.1, 'rgba(0,47,89,0.1)'],
    ['#123456', 0.75, 'rgba(18,52,86,0.75)'], ['#0f9d6c', 0.3, 'rgba(15,157,108,0.3)'],
    ['#2563eb', 0, 'rgba(37,99,235,0)'], ['#16a34a', 0.9, 'rgba(22,163,74,0.9)'],
    ['#dc2626', 0.08, 'rgba(220,38,38,0.08)'], ['#7c3aed', 0.45, 'rgba(124,58,237,0.45)'],
  ];
  T.forEach(function(row) {
    it('brandAlpha ' + row[0] + ' @' + row[1], function() {
      expect(brandAlpha(row[0], row[1])).toBe(row[2]);
    });
  });
});

describe('lightenHex bordas', function() {
  HEXES.slice(0, 12).forEach(function(hex) {
    it('lightenHex(' + hex + ', 1) === #ffffff', function() {
      expect(lightenHex(hex, 1)).toBe('#ffffff');
    });
  });
  it('lightenHex(#000000, 0) === #000000', function() {
    expect(lightenHex('#000000', 0)).toBe('#000000');
  });
  it('lightenHex clareia (luminance nao diminui)', function() {
    expect(luminance(lightenHex('#002f59', 0.5))).toBeGreaterThanOrEqual(luminance('#002f59'));
  });
});

// ---------------------------------------------------------------------------
// 3) fmt + datas (property-based, anti-brittle)
// ---------------------------------------------------------------------------
describe('fmt formato monetario', function() {
  var FMT_RE = /^R\$ -?[\d.]+,\d{2}$/;
  var nums = [0, 1, 5, 10, 99, 100, 1000, 1234.5, 1234.56, 9999999, 0.01, 0.1, 0.99, 50, 49.9, 99.9, 497, 12.34, 1000000, 7, 3.333, 250, 19.99, 2, 42, 8.5, 123456.78, 0.5, 33, 88.88];
  nums.forEach(function(n) {
    it('fmt(' + n + ') casa formato R$', function() {
      expect(FMT_RE.test(fmt(n))).toBe(true);
    });
  });
  it('fmt(0) === "R$ 0,00"', function() { expect(fmt(0)).toBe('R$ 0,00'); });
  it('fmt(null) === "R$ 0,00"', function() { expect(fmt(null)).toBe('R$ 0,00'); });
  it('fmt(undefined) === "R$ 0,00"', function() { expect(fmt(undefined)).toBe('R$ 0,00'); });
  it('fmt sempre retorna string', function() { expect(typeof fmt(42)).toBe('string'); });
  it('fmt usa virgula decimal', function() { expect(fmt(1.5)).toContain(','); });
  it('fmt(1000) agrupa milhar com ponto', function() { expect(fmt(1000)).toBe('R$ 1.000,00'); });
});

describe('datas (propriedades)', function() {
  var dates = ['2024-01-15', '2024-02-29', '2023-12-31', '2024-06-01', '2025-03-10', '2024-11-30', '2024-07-04', '2022-05-20', '2024-09-09', '2024-10-31', '2026-01-01', '2024-08-08'];
  dates.forEach(function(d) {
    it('fmtDate(' + d + ') contem barras (pt-BR)', function() {
      var out = fmtDate(d);
      expect(typeof out).toBe('string');
      expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });
  var months = ['2024-01', '2024-02', '2024-03', '2024-06', '2024-12', '2023-07', '2025-05', '2024-09', '2024-11', '2022-04', '2026-02', '2024-10'];
  months.forEach(function(m) {
    it('monthLabel(' + m + ') contem o ano', function() {
      var out = monthLabel(m);
      expect(typeof out).toBe('string');
      expect(out).toContain(m.split('-')[0]);
    });
  });
  it('now() formato ISO', function() { expect(now()).toMatch(/^\d{4}-\d{2}-\d{2}T/); });
  it('today() formato YYYY-MM-DD', function() { expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
  it('today() tem 10 chars', function() { expect(today().length).toBe(10); });
  it('prevDays(0) === today()', function() { expect(prevDays(0)).toBe(today()); });
  it('prevDays(7) formato ISO', function() { expect(prevDays(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
  it('prevDays(30) < today()', function() { expect(prevDays(30) < today()).toBe(true); });
  it('prevDays(1) < today()', function() { expect(prevDays(1) < today()).toBe(true); });
});

// ---------------------------------------------------------------------------
// 4) safe / isUrl / validPhone / maskPhone
// ---------------------------------------------------------------------------
describe('safe sanitiza', function() {
  var T = [
    ['<b>x</b>', 'bx/b'], ['hello', 'hello'], ['  pad  ', 'pad'], ['a"b', 'ab'],
    ['javascript:alert(1)', 'alert(1)'], ['JAVASCRIPT:x', 'x'], ['', ''],
    ['<script>', 'script'], ['"q"', 'q'], ['normal texto', 'normal texto'],
    ['a<b>c', 'abc'], ['  trim', 'trim'], ['trim  ', 'trim'], ['<<>>', ''],
    ['Ola mundo', 'Ola mundo'], ['x>y<z', 'xyz'],
  ];
  T.forEach(function(row) {
    it('safe(' + JSON.stringify(row[0]) + ')', function() { expect(safe(row[0])).toBe(row[1]); });
  });
  it('safe(null) === ""', function() { expect(safe(null)).toBe(''); });
  it('safe(undefined) === ""', function() { expect(safe(undefined)).toBe(''); });
  it('safe(0) === ""', function() { expect(safe(0)).toBe(''); });
  it('safe(123) === "123"', function() { expect(safe(123)).toBe('123'); });
  it('safe limita a 200 chars', function() {
    var big = '';
    for (var i = 0; i < 300; i++) big += 'a';
    expect(safe(big).length).toBe(200);
  });
});

describe('isUrl', function() {
  var T = [
    ['http://a.com', true], ['https://a.com', true], ['data:image/png;base64,xx', true],
    ['/caminho', true], ['ftp://x', false], ['foo', false], ['', false],
    ['HTTP://A', false], [' http://a', false], ['mailto:x', false],
    ['/', true], ['https://', true], ['http', true], ['data:', true],
    ['www.site.com', false], ['./rel', false],
  ];
  T.forEach(function(row) {
    it('isUrl(' + JSON.stringify(row[0]) + ') === ' + row[1], function() {
      expect(isUrl(row[0])).toBe(row[1]);
    });
  });
  it('isUrl(null) === false', function() { expect(isUrl(null)).toBe(false); });
  it('isUrl(undefined) === false', function() { expect(isUrl(undefined)).toBe(false); });
});

describe('validPhone', function() {
  var T = [
    ['1234567890', true], ['12345678901', true], ['123456789012', true], ['1234567890123', true],
    ['123456789', false], ['12345678', false], ['12345678901234', false], ['', false],
    ['(11) 98765-4321', true], ['+55 11 98765-4321', true], ['11 3216-5498', true],
    ['abc', false], ['551132165498', true], ['1', false], ['1234567', false], ['999999999999', true],
  ];
  T.forEach(function(row) {
    it('validPhone(' + JSON.stringify(row[0]) + ') === ' + row[1], function() {
      expect(validPhone(row[0])).toBe(row[1]);
    });
  });
  it('validPhone(null) === false', function() { expect(validPhone(null)).toBe(false); });
  it('validPhone(undefined) === false', function() { expect(validPhone(undefined)).toBe(false); });
});

describe('maskPhone', function() {
  var T = [
    ['11987654321', '(11) 98765-4321'], ['1132165498', '(11) 3216-5498'],
    ['119', '(11) 9'], ['11', '(11'], ['1', '(1'], ['', ''],
    ['1198765432199', '(11) 98765-4321'], ['1234567', '(12) 3456-7'],
    ['12', '(12'], ['123456', '(12) 3456'],
  ];
  T.forEach(function(row) {
    it('maskPhone(' + JSON.stringify(row[0]) + ')', function() {
      expect(maskPhone(row[0])).toBe(row[1]);
    });
  });
  it('maskPhone(null) === ""', function() { expect(maskPhone(null)).toBe(''); });
  it('maskPhone tira nao-digitos', function() { expect(maskPhone('(11) 9')).toBe('(11) 9'); });
});

// ---------------------------------------------------------------------------
// 5) genPwd / uid (aleatorio: formato + unicidade)
// ---------------------------------------------------------------------------
describe('genPwd', function() {
  var i;
  for (i = 0; i < 20; i++) {
    it('genPwd #' + i + ' tem 12 chars do charset', function() {
      var p = genPwd();
      expect(p.length).toBe(12);
      expect(/^[A-Za-z0-9!@#]{12}$/.test(p)).toBe(true);
    });
  }
});

describe('uid', function() {
  it('uid retorna string nao vazia', function() { expect(uid().length).toBeGreaterThan(0); });
  it('uid gera 50 ids unicos', function() {
    var set = {};
    for (var i = 0; i < 50; i++) set[uid()] = true;
    expect(Object.keys(set).length).toBe(50);
  });
  var k;
  for (k = 0; k < 10; k++) {
    it('uid #' + k + ' so digitos', function() { expect(/^\d+$/.test(uid())).toBe(true); });
  }
});

// ---------------------------------------------------------------------------
// 6) passwordStrength
// ---------------------------------------------------------------------------
describe('passwordStrength', function() {
  it('vazio => score 0 label vazio', function() {
    var r = passwordStrength('');
    expect(r.score).toBe(0); expect(r.label).toBe(''); expect(r.pct).toBe(0);
  });
  it('null => score 0', function() { expect(passwordStrength(null).score).toBe(0); });
  var cases = [
    ['abcdefgh', 1], ['abcdefghijkl', 2], ['Abcdefghijkl', 3], ['Abcdefghijk1', 4],
    ['Abcdefghijk1!', 5], ['abc', 0], ['Ab1!', 3], ['abcdefg', 0], ['ABCDEFGH', 1],
    ['12345678', 2], ['Abcdefgh', 2], ['Abcdefgh1', 3], ['Abcdefgh1!', 4],
  ];
  cases.forEach(function(row) {
    it('score de ' + JSON.stringify(row[0]) + ' === ' + row[1], function() {
      expect(passwordStrength(row[0]).score).toBe(row[1]);
    });
  });
  var pws = ['a', 'ab1', 'Abcd1234', 'Senha123!', 'X', 'longsenha', 'Aa1!Aa1!Aa1!'];
  pws.forEach(function(pw) {
    it('score 0..5 e propriedades p/ ' + JSON.stringify(pw), function() {
      var r = passwordStrength(pw);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(5);
      expect(typeof r.label).toBe('string');
      expect(typeof r.pct).toBe('number');
    });
  });
});

// ---------------------------------------------------------------------------
// 7) cleanNumeric
// ---------------------------------------------------------------------------
describe('cleanNumeric', function() {
  var T = [
    ['12.50', undefined, '12.50', false], ['12a!', undefined, '12', true],
    ['12,5', undefined, '12.5', false], ['1.2.3', undefined, '1.23', false],
    ['1,2,3', undefined, '1.23', false], ['', undefined, '', false],
    ['abc', undefined, '', true], ['100', undefined, '100', false],
    ['0', undefined, '0', false], ['9999', undefined, '9999', false],
    ['1.999', undefined, '1.999', false], ['12,34', undefined, '12.34', false],
    ['R$ 50', undefined, '50', true], ['10.5', { decimals: false }, '105', true],
    ['100', { decimals: false }, '100', false], ['abc', { decimals: false }, '', true],
    ['50,5', { decimals: false }, '505', true], ['7', { decimals: false }, '7', false],
  ];
  T.forEach(function(row) {
    it('cleanNumeric(' + JSON.stringify(row[0]) + ',' + JSON.stringify(row[1]) + ')', function() {
      var r = cleanNumeric(row[0], row[1]);
      expect(r.value).toBe(row[2]);
      expect(r.invalid).toBe(row[3]);
    });
  });
  it('null => vazio valido', function() {
    var r = cleanNumeric(null);
    expect(r.value).toBe(''); expect(r.invalid).toBe(false);
  });
  it('limita maxLen padrao decimals (12)', function() {
    expect(cleanNumeric('123456789012345').value.length).toBe(12);
  });
  it('limita maxLen custom', function() {
    expect(cleanNumeric('123456789', { maxLen: 4 }).value.length).toBe(4);
  });
  it('limita maxLen inteiro (7)', function() {
    expect(cleanNumeric('123456789', { decimals: false }).value.length).toBe(7);
  });
  it('so simbolos => vazio invalido', function() {
    var r = cleanNumeric('!!!');
    expect(r.value).toBe(''); expect(r.invalid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8) Planos: effectivePlan / limitFor / atLimit
// ---------------------------------------------------------------------------
describe('effectivePlan', function() {
  var future = new Date(Date.now() + 86400000).toISOString();
  var past = new Date(Date.now() - 86400000).toISOString();
  var T = [
    [null, 'free'], [undefined, 'free'], [{}, 'free'], [{ plan: 'free' }, 'free'],
    [{ plan: 'pro' }, 'pro'], [{ plan: 'premium' }, 'premium'], [{ plan: 'enterprise' }, 'free'],
    [{ plan: null }, 'free'], [{ plan: 'pro', plan_expires_at: future }, 'pro'],
    [{ plan: 'pro', plan_expires_at: past }, 'free'],
    [{ plan: 'premium', plan_expires_at: future }, 'premium'],
    [{ plan: 'premium', plan_expires_at: past }, 'free'],
    [{ plan: 'free', plan_expires_at: past }, 'free'],
    [{ plan: 'pro', plan_expires_at: null }, 'pro'],
    [{ plan: 'PRO' }, 'free'], [{ plan: '' }, 'free'],
  ];
  T.forEach(function(row, i) {
    it('effectivePlan caso ' + i, function() { expect(effectivePlan(row[0])).toBe(row[1]); });
  });
});

describe('limitFor / atLimit', function() {
  var plans = [['free', { plan: 'free' }], ['pro', { plan: 'pro' }], ['premium', { plan: 'premium' }]];
  var kinds = ['transactions', 'products', 'losses'];
  var freeLimits = { transactions: 50, products: 20, losses: 10 };
  plans.forEach(function(p) {
    kinds.forEach(function(k) {
      it('limitFor ' + p[0] + '/' + k, function() {
        var exp = p[0] === 'free' ? freeLimits[k] : Infinity;
        expect(limitFor(p[1], k)).toBe(exp);
      });
    });
  });
  kinds.forEach(function(k) {
    var lim = freeLimits[k];
    it('atLimit free ' + k + ' no limite => true', function() { expect(atLimit({ plan: 'free' }, k, lim)).toBe(true); });
    it('atLimit free ' + k + ' abaixo => false', function() { expect(atLimit({ plan: 'free' }, k, lim - 1)).toBe(false); });
    it('atLimit free ' + k + ' acima => true', function() { expect(atLimit({ plan: 'free' }, k, lim + 5)).toBe(true); });
    it('atLimit free ' + k + ' zero => false', function() { expect(atLimit({ plan: 'free' }, k, 0)).toBe(false); });
    it('atLimit pro ' + k + ' nunca atinge', function() { expect(atLimit({ plan: 'pro' }, k, 999999)).toBe(false); });
    it('atLimit premium ' + k + ' nunca atinge', function() { expect(atLimit({ plan: 'premium' }, k, 999999)).toBe(false); });
  });
});

// ---------------------------------------------------------------------------
// 9) waLink
// ---------------------------------------------------------------------------
describe('waLink', function() {
  var base = 'https://wa.me/' + WHATSAPP;
  it('mensagem simples', function() { expect(waLink('hi')).toBe(base + '?text=hi'); });
  it('vazio sem ?text', function() { expect(waLink('')).toBe(base); });
  it('undefined sem ?text', function() { expect(waLink(undefined)).toBe(base); });
  it('encoda espaco', function() { expect(waLink('a b')).toBe(base + '?text=a%20b'); });
  it('encoda acento', function() { expect(waLink('Ola!')).toContain('?text=Ola'); });
  it('comeca com base', function() { expect(waLink('x').indexOf(base)).toBe(0); });
  it('encoda caracteres especiais', function() { expect(waLink('a&b')).toContain('%26'); });
  it('mensagem longa encodada', function() { expect(waLink('preciso de ajuda')).toContain('%20'); });
  it('WHATSAPP so digitos', function() { expect(/^\d+$/.test(WHATSAPP)).toBe(true); });
  it('SUPPORT_EMAIL valido', function() { expect(SUPPORT_EMAIL).toContain('@'); });
});

// ---------------------------------------------------------------------------
// 10) Estruturas de constants
// ---------------------------------------------------------------------------
describe('PLAN_LIMITS estrutura', function() {
  ['free', 'pro', 'premium'].forEach(function(p) {
    ['transactions', 'products', 'losses'].forEach(function(k) {
      it('PLAN_LIMITS.' + p + '.' + k + ' numerico', function() {
        expect(typeof PLAN_LIMITS[p][k]).toBe('number');
      });
    });
  });
});

describe('PRICING_PLANS estrutura', function() {
  it('tem 3 planos', function() { expect(PRICING_PLANS.length).toBe(3); });
  PRICING_PLANS.forEach(function(p) {
    it('plano ' + p.id + ' tem id string', function() { expect(typeof p.id).toBe('string'); });
    it('plano ' + p.id + ' tem name string', function() { expect(typeof p.name).toBe('string'); });
    it('plano ' + p.id + ' tem price numerico', function() { expect(typeof p.price).toBe('number'); });
    it('plano ' + p.id + ' tem features nao vazio', function() {
      expect(Array.isArray(p.features)).toBe(true);
      expect(p.features.length).toBeGreaterThan(0);
    });
  });
});

describe('THEME_PRESETS estrutura', function() {
  THEME_PRESETS.forEach(function(t) {
    it('preset ' + t.name + ' color hex', function() { expect(HEX_RE.test(t.color)).toBe(true); });
    it('preset ' + t.name + ' secondary hex', function() { expect(HEX_RE.test(t.secondary)).toBe(true); });
    it('preset ' + t.name + ' accent hex', function() { expect(HEX_RE.test(t.accent)).toBe(true); });
  });
});

describe('NAV estrutura', function() {
  NAV.forEach(function(n) {
    it('nav ' + n.key + ' key string', function() { expect(typeof n.key).toBe('string'); });
    it('nav ' + n.key + ' label string', function() { expect(typeof n.label).toBe('string'); });
    it('nav ' + n.key + ' path d string', function() { expect(typeof n.d).toBe('string'); });
  });
});

describe('TEMPLATES estrutura', function() {
  TEMPLATES.forEach(function(t) {
    it('template ' + t.id + ' id string', function() { expect(typeof t.id).toBe('string'); });
    it('template ' + t.id + ' name string', function() { expect(typeof t.name).toBe('string'); });
    it('template ' + t.id + ' subject string', function() { expect(typeof t.subject).toBe('string'); });
    it('template ' + t.id + ' body string', function() { expect(typeof t.body).toBe('string'); });
  });
});

describe('INIT defaults', function() {
  it('INIT_PLAN.plan === free', function() { expect(INIT_PLAN.plan).toBe('free'); });
  it('INIT_PLAN.plan_expires_at null', function() { expect(INIT_PLAN.plan_expires_at).toBe(null); });
  it('INIT_BRAND.name string', function() { expect(typeof INIT_BRAND.name).toBe('string'); });
  it('INIT_BRAND.color hex', function() { expect(HEX_RE.test(INIT_BRAND.color)).toBe(true); });
  it('INIT_BRAND.theme light', function() { expect(INIT_BRAND.theme).toBe('light'); });
  it('INIT_BRAND.white_label false', function() { expect(INIT_BRAND.white_label).toBe(false); });
  it('WHITELABEL.price numerico', function() { expect(typeof WHITELABEL.price).toBe('number'); });
  it('WHITELABEL.features nao vazio', function() { expect(WHITELABEL.features.length).toBeGreaterThan(0); });
  it('PLAN_KIND_LABEL tem transactions', function() { expect(typeof PLAN_KIND_LABEL.transactions).toBe('string'); });
});

// ---------------------------------------------------------------------------
// 11) friendlyStripeError / stripeAppearance
// ---------------------------------------------------------------------------
describe('friendlyStripeError', function() {
  it('stripe_not_configured', function() { expect(friendlyStripeError('stripe_not_configured')).toMatch(/chave|configurad/i); });
  it('unauthorized', function() { expect(friendlyStripeError('unauthorized')).toMatch(/sess/i); });
  it('invalid_plan', function() { expect(friendlyStripeError('invalid_plan')).toMatch(/plano/i); });
  it('invalid_kind', function() { expect(friendlyStripeError('invalid_kind')).toMatch(/item|compra/i); });
  it('no_client_secret', function() { expect(friendlyStripeError('no_client_secret')).toMatch(/iniciar|cobran/i); });
  it('mensagem crua preservada', function() { expect(friendlyStripeError('Your card was declined.')).toBe('Your card was declined.'); });
  it('codigo desconhecido preservado', function() { expect(friendlyStripeError('weird_code_123')).toBe('weird_code_123'); });
  it('vazio => padrao', function() { expect(friendlyStripeError('')).toMatch(/pagamento/i); });
  it('null => padrao', function() { expect(friendlyStripeError(null)).toMatch(/pagamento/i); });
  it('undefined => padrao', function() { expect(friendlyStripeError(undefined)).toMatch(/pagamento/i); });
  it('null e undefined dao a mesma msg', function() {
    expect(friendlyStripeError(null)).toBe(friendlyStripeError(undefined));
  });
});

describe('stripeAppearance', function() {
  var colors = ['#002f59', '#ff0000', '#16a34a', '#7c3aed', '#0f9d6c'];
  colors.forEach(function(c) {
    it('light ' + c + ' theme flat + colorPrimary', function() {
      var a = stripeAppearance(c, false);
      expect(a.theme).toBe('flat');
      expect(a.variables.colorPrimary).toBe(c);
    });
    it('dark ' + c + ' theme night', function() {
      expect(stripeAppearance(c, true).theme).toBe('night');
    });
  });
  it('null brandColor usa default', function() {
    expect(stripeAppearance(null, false).variables.colorPrimary).toBe('#002f59');
  });
  it('tem rules object', function() {
    expect(typeof stripeAppearance('#002f59', false).rules).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// 12) recurring
// ---------------------------------------------------------------------------
describe('daysInMonth', function() {
  var T = [
    ['2024-01', 31], ['2024-02', 29], ['2023-02', 28], ['2024-03', 31], ['2024-04', 30],
    ['2024-05', 31], ['2024-06', 30], ['2024-07', 31], ['2024-08', 31], ['2024-09', 30],
    ['2024-10', 31], ['2024-11', 30], ['2024-12', 31], ['2000-02', 29], ['2025-02', 28], ['2028-02', 29],
  ];
  T.forEach(function(row) {
    it('daysInMonth(' + row[0] + ') === ' + row[1], function() { expect(daysInMonth(row[0])).toBe(row[1]); });
  });
});

describe('dueDate', function() {
  var T = [
    ['2024-01', 5, '2024-01-05'], ['2024-02', 31, '2024-02-29'], ['2024-04', 31, '2024-04-30'],
    ['2024-01', 0, '2024-01-01'], ['2024-01', -3, '2024-01-01'], ['2024-12', 25, '2024-12-25'],
    ['2024-01', 1, '2024-01-01'], ['2024-01', 31, '2024-01-31'], ['2024-06', 31, '2024-06-30'],
    ['2023-02', 30, '2023-02-28'], ['2024-11', 15, '2024-11-15'], ['2024-07', 9, '2024-07-09'],
  ];
  T.forEach(function(row) {
    it('dueDate(' + row[0] + ',' + row[1] + ') === ' + row[2], function() { expect(dueDate(row[0], row[1])).toBe(row[2]); });
  });
});

describe('periodOf', function() {
  it('jan 2024', function() { expect(periodOf(new Date(2024, 0, 15))).toBe('2024-01'); });
  it('dez 2024', function() { expect(periodOf(new Date(2024, 11, 1))).toBe('2024-12'); });
  it('jun 2023', function() { expect(periodOf(new Date(2023, 5, 20))).toBe('2023-06'); });
  it('set 2024', function() { expect(periodOf(new Date(2024, 8, 3))).toBe('2024-09'); });
  it('out 2025', function() { expect(periodOf(new Date(2025, 9, 10))).toBe('2025-10'); });
  it('sem arg formato', function() { expect(periodOf()).toMatch(/^\d{4}-\d{2}$/); });
  var m;
  for (m = 0; m < 12; m++) {
    (function(mm) {
      it('mes ' + mm + ' padding 2 digitos', function() {
        var p = periodOf(new Date(2024, mm, 1));
        expect(p).toMatch(/^2024-\d{2}$/);
        expect(p.split('-')[1].length).toBe(2);
      });
    })(m);
  }
});

describe('recurringId / isRecurringId', function() {
  var tpl = { desc: 'Aluguel', amount: 1000, day: 5 };
  it('formato rec-...-periodo', function() {
    expect(recurringId('u1', tpl, '2024-01')).toMatch(/^rec-[a-z0-9]+-2024-01$/);
  });
  it('idempotente (mesmos args => mesmo id)', function() {
    expect(recurringId('u1', tpl, '2024-01')).toBe(recurringId('u1', tpl, '2024-01'));
  });
  it('desc diferente => id diferente', function() {
    expect(recurringId('u1', { desc: 'Luz', amount: 1000, day: 5 }, '2024-01')).not.toBe(recurringId('u1', tpl, '2024-01'));
  });
  it('amount diferente => id diferente', function() {
    expect(recurringId('u1', { desc: 'Aluguel', amount: 2000, day: 5 }, '2024-01')).not.toBe(recurringId('u1', tpl, '2024-01'));
  });
  it('uid diferente => id diferente', function() {
    expect(recurringId('u2', tpl, '2024-01')).not.toBe(recurringId('u1', tpl, '2024-01'));
  });
  it('periodo diferente => id diferente', function() {
    expect(recurringId('u1', tpl, '2024-02')).not.toBe(recurringId('u1', tpl, '2024-01'));
  });
  it('gerado e reconhecido por isRecurringId', function() {
    expect(isRecurringId(recurringId('u1', tpl, '2024-01'))).toBe(true);
  });
  it('desc case-insensitive', function() {
    expect(recurringId('u1', { desc: 'ALUGUEL', amount: 1000, day: 5 }, '2024-01')).toBe(recurringId('u1', tpl, '2024-01'));
  });
  var ids = ['rec-abc-2024-01', 'rec-x', 'rec-'];
  ids.forEach(function(id) {
    it('isRecurringId(' + id + ') true', function() { expect(isRecurringId(id)).toBe(true); });
  });
  var notIds = ['abc', '', 'transaction-1', 'REC-x'];
  notIds.forEach(function(id) {
    it('isRecurringId(' + JSON.stringify(id) + ') false', function() { expect(isRecurringId(id)).toBe(false); });
  });
  it('isRecurringId(123) false', function() { expect(isRecurringId(123)).toBe(false); });
  it('isRecurringId(null) false', function() { expect(isRecurringId(null)).toBe(false); });
  it('isRecurringId(undefined) false', function() { expect(isRecurringId(undefined)).toBe(false); });
});

describe('activeTemplates', function() {
  it('template valido passa', function() { expect(activeTemplates([{ desc: 'a', amount: 1, day: 1 }]).length).toBe(1); });
  it('active false exclui', function() { expect(activeTemplates([{ active: false, desc: 'a', amount: 1, day: 1 }]).length).toBe(0); });
  it('desc vazio exclui', function() { expect(activeTemplates([{ desc: '', amount: 1, day: 1 }]).length).toBe(0); });
  it('desc so espaco exclui', function() { expect(activeTemplates([{ desc: '   ', amount: 1, day: 1 }]).length).toBe(0); });
  it('amount zero exclui', function() { expect(activeTemplates([{ desc: 'a', amount: 0, day: 1 }]).length).toBe(0); });
  it('amount negativo exclui', function() { expect(activeTemplates([{ desc: 'a', amount: -5, day: 1 }]).length).toBe(0); });
  it('day zero exclui', function() { expect(activeTemplates([{ desc: 'a', amount: 1, day: 0 }]).length).toBe(0); });
  it('lista vazia => vazio', function() { expect(activeTemplates([]).length).toBe(0); });
  it('null => vazio', function() { expect(activeTemplates(null).length).toBe(0); });
  it('undefined => vazio', function() { expect(activeTemplates(undefined).length).toBe(0); });
  it('dois validos => 2', function() {
    expect(activeTemplates([{ desc: 'a', amount: 1, day: 1 }, { desc: 'b', amount: 2, day: 2 }]).length).toBe(2);
  });
  it('mistura mantem so validos', function() {
    expect(activeTemplates([{ desc: 'a', amount: 1, day: 1 }, { active: false, desc: 'b', amount: 2, day: 2 }]).length).toBe(1);
  });
  it('active true explicito passa', function() {
    expect(activeTemplates([{ active: true, desc: 'a', amount: 1, day: 1 }]).length).toBe(1);
  });
});

describe('buildRecurringRow', function() {
  var row = buildRecurringRow('u1', { desc: 'Aluguel', amount: 1000, day: 5, category: 'Casa' }, '2024-01', 'Me');
  it('type expense', function() { expect(row.type).toBe('expense'); });
  it('amount numerico', function() { expect(row.amount).toBe(1000); });
  it('date via dueDate', function() { expect(row.date).toBe('2024-01-05'); });
  it('category custom', function() { expect(row.category).toBe('Casa'); });
  it('recurring flag 1', function() { expect(row.recurring).toBe(1); });
  it('_synced 0', function() { expect(row._synced).toBe(0); });
  it('_deleted 0', function() { expect(row._deleted).toBe(0); });
  it('id e recurring', function() { expect(isRecurringId(row.id)).toBe(true); });
  it('user_id', function() { expect(row.user_id).toBe('u1'); });
  it('registered_by custom', function() { expect(row.registered_by).toBe('Me'); });
  it('description trim', function() { expect(row.description).toBe('Aluguel'); });
  var row2 = buildRecurringRow('u2', { desc: ' Luz ', amount: 90, day: 50 }, '2024-02');
  it('category default Fixo', function() { expect(row2.category).toBe('Fixo'); });
  it('registered_by default Recorrente', function() { expect(row2.registered_by).toBe('Recorrente'); });
  it('day clamp ao mes (fev)', function() { expect(row2.date).toBe('2024-02-29'); });
});

// ---------------------------------------------------------------------------
// 13) PhoneInput: parsePhone / buildPhone
// ---------------------------------------------------------------------------
describe('parsePhone', function() {
  it('BR 11 digitos', function() { expect(parsePhone('11987654321')).toEqual({ iso: 'BR', digits: '11987654321' }); });
  it('BR 10 digitos', function() { expect(parsePhone('1132165498')).toEqual({ iso: 'BR', digits: '1132165498' }); });
  it('vazio => BR vazio', function() { expect(parsePhone('')).toEqual({ iso: 'BR', digits: '' }); });
  it('null => BR vazio', function() { expect(parsePhone(null)).toEqual({ iso: 'BR', digits: '' }); });
  it('undefined => BR vazio', function() { expect(parsePhone(undefined)).toEqual({ iso: 'BR', digits: '' }); });
  it('lixo => BR vazio', function() { expect(parsePhone('abc')).toEqual({ iso: 'BR', digits: '' }); });
  it('BR com DDI 55 (13)', function() { expect(parsePhone('5511987654321')).toEqual({ iso: 'BR', digits: '11987654321' }); });
  it('BR com DDI 55 (12)', function() { expect(parsePhone('551132165498')).toEqual({ iso: 'BR', digits: '1132165498' }); });
  it('PT com DDI 351', function() { expect(parsePhone('351912345678')).toEqual({ iso: 'PT', digits: '912345678' }); });
  it('AR com DDI 54', function() { expect(parsePhone('541123456789')).toEqual({ iso: 'AR', digits: '1123456789' }); });
  it('MX com DDI 52', function() { expect(parsePhone('521234567890')).toEqual({ iso: 'MX', digits: '1234567890' }); });
  it('mascara BR', function() { expect(parsePhone('(11) 98765-4321')).toEqual({ iso: 'BR', digits: '11987654321' }); });
  it('iso sempre string', function() { expect(typeof parsePhone('11987654321').iso).toBe('string'); });
  it('digits sempre string', function() { expect(typeof parsePhone('11987654321').digits).toBe('string'); });
  it('tira nao-digitos', function() { expect(parsePhone('+55 11 9 8765 4321').digits.length).toBe(11); });
});

describe('buildPhone', function() {
  it('BR 11 valido', function() {
    var r = buildPhone('BR', '11987654321');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+5511987654321'); expect(r.country).toBe('BR'); expect(r.dialCode).toBe('+55');
  });
  it('BR 10 valido', function() {
    var r = buildPhone('BR', '1132165498');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+551132165498');
  });
  it('PT 9 valido', function() {
    var r = buildPhone('PT', '912345678');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+351912345678');
  });
  it('US 10 valido', function() {
    var r = buildPhone('US', '2025550123');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+12025550123');
  });
  it('AR 10 valido', function() {
    var r = buildPhone('AR', '1123456789');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+541123456789');
  });
  it('MX 10 valido', function() {
    var r = buildPhone('MX', '1234567890');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+521234567890');
  });
  it('ES 9 valido', function() {
    var r = buildPhone('ES', '912345678');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+34912345678');
  });
  it('BR curto invalido', function() { expect(buildPhone('BR', '123').valid).toBe(false); });
  it('BR vazio invalido e164 vazio', function() {
    var r = buildPhone('BR', '');
    expect(r.valid).toBe(false); expect(r.e164).toBe('');
  });
  it('PT errado tamanho invalido', function() { expect(buildPhone('PT', '12').valid).toBe(false); });
  it('iso desconhecido cai em BR', function() {
    var r = buildPhone('ZZ', '11987654321');
    expect(r.valid).toBe(true); expect(r.e164).toBe('+5511987654321');
  });
  it('national reflete digits', function() { expect(buildPhone('BR', '11987654321').national).toBe('11987654321'); });
  it('BR 12 digitos invalido', function() { expect(buildPhone('BR', '119876543210').valid).toBe(false); });
});

describe('phone round-trip build->parse', function() {
  var cases = [
    ['BR', '11987654321'], ['BR', '1132165498'], ['PT', '912345678'],
    ['AR', '1123456789'], ['MX', '1234567890'],
  ];
  cases.forEach(function(row) {
    it('roundtrip ' + row[0] + ' ' + row[1], function() {
      var e164 = buildPhone(row[0], row[1]).e164;
      var parsed = parsePhone(e164);
      expect(parsed.iso).toBe(row[0]);
      expect(parsed.digits).toBe(row[1]);
    });
  });
  cases.forEach(function(row) {
    it('roundtrip ' + row[0] + ' ' + row[1] + ' mantem valid', function() {
      var built = buildPhone(row[0], row[1]);
      expect(built.valid).toBe(true);
      var re = buildPhone(parsePhone(built.e164).iso, parsePhone(built.e164).digits);
      expect(re.e164).toBe(built.e164);
    });
  });
});
