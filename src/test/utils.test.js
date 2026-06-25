import { describe, it, expect } from 'vitest';
import {
  fmt, hexToRgb, brandAlpha, fmtDate, monthLabel, today, prevDays,
  safe, isUrl, genPwd, uid, luminance, lightenHex, hexToHsl, hslToHex,
  deriveCores, passwordStrength, validPhone, maskPhone,
} from '../lib/utils.js';

// ---------------------------------------------------------------------------
// fmt
// ---------------------------------------------------------------------------
describe('fmt', function() {
  it('formata zero', function() { expect(fmt(0)).toBe('R$\xa00,00'); });
  it('formata zero (inclui R$)', function() { expect(fmt(0)).toContain('R$'); });
  it('formata inteiro positivo', function() { expect(fmt(100)).toContain('100'); });
  it('usa vírgula como separador decimal', function() { expect(fmt(1.5)).toContain(','); });
  it('formata null como zero', function() { expect(fmt(null)).toContain('0'); });
  it('formata undefined como zero', function() { expect(fmt(undefined)).toContain('0'); });
  it('formata valor com centavos', function() { expect(fmt(0.01)).toContain('0,01'); });
  it('formata 1000 com separador de milhar', function() { expect(fmt(1000)).toContain('1'); });
  it('retorna sempre string', function() { expect(typeof fmt(42)).toBe('string'); });
  it('formata negativo', function() { expect(fmt(-50)).toContain('-'); });
  it('formata 50.50 corretamente', function() { expect(fmt(50.5)).toContain('50,50'); });
  it('formata 1234.56 preserva centavos', function() { expect(fmt(1234.56)).toContain('1.234,56'); });
});

// ---------------------------------------------------------------------------
// hexToRgb
// ---------------------------------------------------------------------------
describe('hexToRgb', function() {
  it('#002f59 → r=0', function() { expect(hexToRgb('#002f59').r).toBe(0); });
  it('#002f59 → g=47', function() { expect(hexToRgb('#002f59').g).toBe(47); });
  it('#002f59 → b=89', function() { expect(hexToRgb('#002f59').b).toBe(89); });
  it('#ffffff → 255,255,255', function() { expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 }); });
  it('#000000 → 0,0,0', function() { expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 }); });
  it('#ff0000 → r=255', function() { expect(hexToRgb('#ff0000').r).toBe(255); });
  it('#ff0000 → g=0', function() { expect(hexToRgb('#ff0000').g).toBe(0); });
  it('#0f9d6c → r=15, g=157, b=108', function() { expect(hexToRgb('#0f9d6c')).toEqual({ r: 15, g: 157, b: 108 }); });
  it('string vazia usa default #002f59', function() { expect(hexToRgb('').r).toBe(0); });
  it('retorna objeto com r/g/b', function() {
    var c = hexToRgb('#aabbcc');
    expect(c).toHaveProperty('r');
    expect(c).toHaveProperty('g');
    expect(c).toHaveProperty('b');
  });
});

// ---------------------------------------------------------------------------
// brandAlpha
// ---------------------------------------------------------------------------
describe('brandAlpha', function() {
  it('gera rgba com alpha correto', function() { expect(brandAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)'); });
  it('alpha 1 → opaco', function() { expect(brandAlpha('#ffffff', 1)).toBe('rgba(255,255,255,1)'); });
  it('alpha 0 → transparente', function() { expect(brandAlpha('#000000', 0)).toBe('rgba(0,0,0,0)'); });
  it('#002f59 0.08 → rgba(0,47,89,0.08)', function() { expect(brandAlpha('#002f59', 0.08)).toBe('rgba(0,47,89,0.08)'); });
  it('sempre começa com rgba(', function() { expect(brandAlpha('#0f9d6c', 0.12)).toMatch(/^rgba\(/); });
});

// ---------------------------------------------------------------------------
// safe
// ---------------------------------------------------------------------------
describe('safe', function() {
  it('string normal passa sem alteração', function() { expect(safe('hello')).toBe('hello'); });
  it('remove <', function() { expect(safe('<script>')).not.toContain('<'); });
  it('remove >', function() { expect(safe('a>b')).not.toContain('>'); });
  it('remove "', function() { expect(safe('"valor"')).not.toContain('"'); });
  it('remove javascript:', function() { expect(safe('javascript:alert()')).not.toContain('javascript:'); });
  it('null retorna string vazia', function() { expect(safe(null)).toBe(''); });
  it('undefined retorna string vazia', function() { expect(safe(undefined)).toBe(''); });
  it('trunca em 200 chars', function() { expect(safe('a'.repeat(300)).length).toBe(200); });
  it('faz trim', function() { expect(safe('  ok  ')).toBe('ok'); });
  it('retorna string', function() { expect(typeof safe('x')).toBe('string'); });
});

// ---------------------------------------------------------------------------
// isUrl
// ---------------------------------------------------------------------------
describe('isUrl', function() {
  it('https é URL', function() { expect(isUrl('https://example.com')).toBe(true); });
  it('http é URL', function() { expect(isUrl('http://example.com')).toBe(true); });
  it('/ é URL (caminho relativo)', function() { expect(isUrl('/icon.png')).toBe(true); });
  it('data: é URL', function() { expect(isUrl('data:image/png;base64,abc')).toBe(true); });
  it('texto sem protocolo não é URL', function() { expect(isUrl('nao-e-url')).toBe(false); });
  it('string vazia não é URL', function() { expect(isUrl('')).toBe(false); });
  it('null não é URL', function() { expect(isUrl(null)).toBe(false); });
  it('undefined não é URL', function() { expect(isUrl(undefined)).toBe(false); });
});

// ---------------------------------------------------------------------------
// today / prevDays
// ---------------------------------------------------------------------------
describe('today', function() {
  it('retorna string', function() { expect(typeof today()).toBe('string'); });
  it('tem 10 caracteres (YYYY-MM-DD)', function() { expect(today().length).toBe(10); });
  it('formato YYYY-MM-DD', function() { expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
});

describe('prevDays', function() {
  it('prevDays(0) igual a today()', function() { expect(prevDays(0)).toBe(today()); });
  it('prevDays(1) anterior a today', function() { expect(prevDays(1) < today()).toBe(true); });
  it('prevDays(7) é 7 dias atrás', function() {
    var d = new Date(); d.setDate(d.getDate() - 7);
    expect(prevDays(7)).toBe(d.toISOString().split('T')[0]);
  });
  it('formato YYYY-MM-DD', function() { expect(prevDays(30)).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
});

// ---------------------------------------------------------------------------
// fmtDate
// ---------------------------------------------------------------------------
describe('fmtDate', function() {
  it('retorna string', function() { expect(typeof fmtDate('2024-01-15')).toBe('string'); });
  it('formato pt-BR contém /', function() { expect(fmtDate('2024-01-15')).toContain('/'); });
  it('data de final de ano é válida', function() { expect(fmtDate('2024-12-31')).toContain('31'); });
});

// ---------------------------------------------------------------------------
// monthLabel
// ---------------------------------------------------------------------------
describe('monthLabel', function() {
  it('janeiro está presente', function() { expect(monthLabel('2024-01').toLowerCase()).toContain('jan'); });
  it('dezembro está presente', function() { expect(monthLabel('2024-12').toLowerCase()).toContain('dez'); });
  it('ano está presente', function() { expect(monthLabel('2024-06')).toContain('2024'); });
  it('retorna string', function() { expect(typeof monthLabel('2025-03')).toBe('string'); });
});

// ---------------------------------------------------------------------------
// uid / genPwd
// ---------------------------------------------------------------------------
describe('uid', function() {
  it('retorna string', function() { expect(typeof uid()).toBe('string'); });
  it('não é vazio', function() { expect(uid().length).toBeGreaterThan(0); });
  it('duas chamadas retornam valores diferentes', function() { expect(uid()).not.toBe(uid()); });
  it('começa com dígitos (timestamp)', function() { expect(uid()).toMatch(/^\d+/); });
});

describe('genPwd', function() {
  it('retorna string', function() { expect(typeof genPwd()).toBe('string'); });
  it('comprimento 12', function() { expect(genPwd().length).toBe(12); });
  it('não contém caracteres ambíguos (0, O, I, l, 1)', function() {
    var p = genPwd();
    expect(p).not.toMatch(/[0OIl1]/);
  });
  it('duas chamadas raramente iguais', function() {
    var results = new Set(Array.from({ length: 10 }, genPwd));
    expect(results.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// luminance
// ---------------------------------------------------------------------------
describe('luminance', function() {
  it('#ffffff → 1', function() { expect(luminance('#ffffff')).toBeCloseTo(1, 3); });
  it('#000000 → 0', function() { expect(luminance('#000000')).toBe(0); });
  it('#ff0000 ≈ 0.2126', function() { expect(luminance('#ff0000')).toBeCloseTo(0.2126, 3); });
  it('retorna número entre 0 e 1', function() {
    var l = luminance('#002f59');
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// lightenHex
// ---------------------------------------------------------------------------
describe('lightenHex', function() {
  it('#000000 factor=1 → #ffffff', function() { expect(lightenHex('#000000', 1)).toBe('#ffffff'); });
  it('#000000 factor=0 → #000000', function() { expect(lightenHex('#000000', 0)).toBe('#000000'); });
  it('#ff0000 factor=0.5 → #ff8080', function() { expect(lightenHex('#ff0000', 0.5)).toBe('#ff8080'); });
  it('#000000 factor=0.5 → #808080', function() { expect(lightenHex('#000000', 0.5)).toBe('#808080'); });
  it('resultado começa com #', function() { expect(lightenHex('#002f59', 0.3)).toMatch(/^#[0-9a-f]{6}$/i); });
});

// ---------------------------------------------------------------------------
// hexToHsl / hslToHex
// ---------------------------------------------------------------------------
describe('hexToHsl', function() {
  it('#ff0000 → h≈0', function() { expect(hexToHsl('#ff0000').h).toBeCloseTo(0, 0); });
  it('#00ff00 → h≈120', function() { expect(hexToHsl('#00ff00').h).toBeCloseTo(120, 0); });
  it('#0000ff → h≈240', function() { expect(hexToHsl('#0000ff').h).toBeCloseTo(240, 0); });
  it('#ffffff → s=0, l=1', function() { var c = hexToHsl('#ffffff'); expect(c.s).toBe(0); expect(c.l).toBe(1); });
  it('#000000 → s=0, l=0', function() { var c = hexToHsl('#000000'); expect(c.s).toBe(0); expect(c.l).toBe(0); });
});

describe('hslToHex', function() {
  it('h=0 s=1 l=0.5 → #ff0000', function() { expect(hslToHex(0, 1, 0.5)).toBe('#ff0000'); });
  it('h=120 s=1 l=0.5 → #00ff00', function() { expect(hslToHex(120, 1, 0.5)).toBe('#00ff00'); });
  it('h=240 s=1 l=0.5 → #0000ff', function() { expect(hslToHex(240, 1, 0.5)).toBe('#0000ff'); });
  it('s=0 l=0 → preto', function() { expect(hslToHex(0, 0, 0)).toBe('#000000'); });
  it('s=0 l=1 → branco', function() { expect(hslToHex(0, 0, 1)).toBe('#ffffff'); });
  it('retorna string hex de 7 chars', function() { expect(hslToHex(200, 0.5, 0.5)).toMatch(/^#[0-9a-f]{6}$/i); });
});

// ---------------------------------------------------------------------------
// deriveCores
// ---------------------------------------------------------------------------
describe('deriveCores', function() {
  it('retorna objeto com secondary e accent', function() {
    var r = deriveCores('#002f59');
    expect(r).toHaveProperty('secondary');
    expect(r).toHaveProperty('accent');
  });
  it('secondary é string hex', function() { expect(deriveCores('#002f59').secondary).toMatch(/^#[0-9a-f]{6}$/i); });
  it('accent é string hex', function() { expect(deriveCores('#002f59').accent).toMatch(/^#[0-9a-f]{6}$/i); });
  it('secondary ≠ accent', function() {
    var r = deriveCores('#002f59');
    expect(r.secondary).not.toBe(r.accent);
  });
  it('cores diferentes para primárias diferentes', function() {
    var a = deriveCores('#002f59').accent;
    var b = deriveCores('#ff0000').accent;
    expect(a).not.toBe(b);
  });
  it('sem parâmetro usa default', function() {
    var r = deriveCores();
    expect(r.secondary).toMatch(/^#/);
    expect(r.accent).toMatch(/^#/);
  });
});

// ---------------------------------------------------------------------------
// passwordStrength
// ---------------------------------------------------------------------------
describe('passwordStrength', function() {
  it('string vazia → score 0', function() { expect(passwordStrength('').score).toBe(0); });
  it('string vazia → pct 0', function() { expect(passwordStrength('').pct).toBe(0); });
  it('null → score 0', function() { expect(passwordStrength(null).score).toBe(0); });
  it('abc (curto, minúsculas) → pct 20', function() { expect(passwordStrength('abc').pct).toBe(20); });
  it('abcdefgh (>=8) → score 1', function() { expect(passwordStrength('abcdefgh').score).toBe(1); });
  it('Abcdefgh (>=8 + misto) → score 2', function() { expect(passwordStrength('Abcdefgh').score).toBe(2); });
  it('Abcdefg1 (>=8 + misto + dígito) → score 3', function() { expect(passwordStrength('Abcdefg1').score).toBe(3); });
  it('Abcdefg1! (todos exceto length>=12) → score 4', function() { expect(passwordStrength('Abcdefg1!').score).toBe(4); });
  it('Abcdefgh123! (todos) → score 5, pct 100', function() {
    var r = passwordStrength('Abcdefgh123!');
    expect(r.score).toBe(5);
    expect(r.pct).toBe(100);
  });
  it('Forte tem label "Forte"', function() { expect(passwordStrength('Abcdefgh123!').label).toBe('Forte'); });
  it('cor retornada é string', function() { expect(typeof passwordStrength('teste').color).toBe('string'); });
  it('pct sempre entre 0 e 100', function() {
    expect(passwordStrength('abc').pct).toBeGreaterThanOrEqual(0);
    expect(passwordStrength('Abcdefgh123!').pct).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// validPhone
// ---------------------------------------------------------------------------
describe('validPhone', function() {
  it('11 dígitos → válido', function() { expect(validPhone('11912345678')).toBe(true); });
  it('10 dígitos → válido', function() { expect(validPhone('1191234567')).toBe(true); });
  it('13 dígitos com código país → válido', function() { expect(validPhone('+5511912345678')).toBe(true); });
  it('9 dígitos → inválido', function() { expect(validPhone('123456789')).toBe(false); });
  it('14 dígitos → inválido', function() { expect(validPhone('12345678901234')).toBe(false); });
  it('string vazia → inválido', function() { expect(validPhone('')).toBe(false); });
  it('null → inválido', function() { expect(validPhone(null)).toBe(false); });
  it('undefined → inválido', function() { expect(validPhone(undefined)).toBe(false); });
  it('número formatado com parênteses → válido', function() { expect(validPhone('(91) 9 9208-6829')).toBe(true); });
  it('letras → inválido', function() { expect(validPhone('abcdefghijk')).toBe(false); });
});

// ---------------------------------------------------------------------------
// maskPhone
// ---------------------------------------------------------------------------
describe('maskPhone', function() {
  it('vazio retorna vazio', function() { expect(maskPhone('')).toBe(''); });
  it('null retorna vazio', function() { expect(maskPhone(null)).toBe(''); });
  it('1 dígito → (X', function() { expect(maskPhone('9')).toBe('(9'); });
  it('2 dígitos → (XX', function() { expect(maskPhone('91')).toBe('(91'); });
  it('3 dígitos → (XX) Y', function() { expect(maskPhone('919')).toBe('(91) 9'); });
  it('10 dígitos (fixo) → (XX) XXXX-XXXX', function() { expect(maskPhone('1191234567')).toBe('(11) 9123-4567'); });
  it('11 dígitos (celular) → (XX) XXXXX-XXXX', function() { expect(maskPhone('11912345678')).toBe('(11) 91234-5678'); });
  it('remove não-dígitos antes de mascarar', function() {
    expect(maskPhone('(91) 99208-6829')).toBe('(91) 99208-6829');
  });
  it('trunca em 11 dígitos', function() {
    expect(maskPhone('119123456789999')).toBe('(11) 91234-5678');
  });
  it('retorna string', function() { expect(typeof maskPhone('11912345678')).toBe('string'); });
});
