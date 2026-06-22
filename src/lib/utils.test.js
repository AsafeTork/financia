import { describe, it, expect } from 'vitest';
import { fmt, safe, deriveCores, brandAlpha } from './utils.js';

describe('fmt', function() {
  it('formata zero', function() {
    expect(fmt(0)).toBe('R$ 0,00');
  });
  it('formata valor inteiro', function() {
    expect(fmt(1000)).toMatch(/1\.000,00/);
  });
  it('formata null como zero', function() {
    expect(fmt(null)).toBe('R$ 0,00');
  });
  it('formata valor decimal', function() {
    expect(fmt(9.99)).toMatch(/9,99/);
  });
});

describe('safe', function() {
  it('remove tags HTML', function() {
    expect(safe('<script>alert(1)</script>')).not.toContain('<');
    expect(safe('<script>alert(1)</script>')).not.toContain('>');
  });
  it('remove javascript:', function() {
    expect(safe('javascript:alert(1)')).not.toContain('javascript:');
  });
  it('limita a 200 caracteres', function() {
    expect(safe('a'.repeat(300))).toHaveLength(200);
  });
  it('passa string normal sem alteracao', function() {
    expect(safe('Venda normal')).toBe('Venda normal');
  });
  it('trata null como string vazia', function() {
    expect(safe(null)).toBe('');
  });
});

describe('deriveCores', function() {
  it('retorna secondary e accent', function() {
    var cores = deriveCores('#002f59');
    expect(cores).toHaveProperty('secondary');
    expect(cores).toHaveProperty('accent');
  });
  it('secondary e accent sao strings hex', function() {
    var cores = deriveCores('#002f59');
    expect(cores.secondary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(cores.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('accent e mais claro que secondary', function() {
    var cores = deriveCores('#002f59');
    expect(cores.accent > cores.secondary).toBe(true);
  });
  it('funciona com null (usa fallback)', function() {
    var cores = deriveCores(null);
    expect(cores.secondary).toBeTruthy();
  });
});

describe('brandAlpha', function() {
  it('retorna string rgba', function() {
    expect(brandAlpha('#002f59', 0.5)).toMatch(/^rgba\(/);
  });
  it('inclui o alpha correto', function() {
    expect(brandAlpha('#002f59', 0.08)).toContain('0.08');
  });
});
