import { describe, it, expect } from 'vitest';
import { cleanNumeric } from './utils.js';

describe('cleanNumeric', function() {
  it('caminho feliz: decimal valido passa intacto', function() {
    var r = cleanNumeric('12.50');
    expect(r.value).toBe('12.50');
    expect(r.invalid).toBe(false);
  });

  it('entrada invalida: letra/simbolo marca invalid e e removido', function() {
    var r = cleanNumeric('12a!');
    expect(r.value).toBe('12');
    expect(r.invalid).toBe(true);
  });

  it('normaliza virgula para ponto', function() {
    expect(cleanNumeric('12,5').value).toBe('12.5');
  });

  it('mantem apenas o primeiro separador decimal', function() {
    expect(cleanNumeric('1.2.3').value).toBe('1.23');
    expect(cleanNumeric('1,2,3').value).toBe('1.23');
  });

  it('limita o comprimento (anti-overflow de layout)', function() {
    var r = cleanNumeric('123456789012345', { maxLen: 12 });
    expect(r.value.length).toBe(12);
  });

  it('modo inteiro: remove ponto/virgula e marca invalid', function() {
    var r = cleanNumeric('10.5', { decimals: false });
    expect(r.value).toBe('105');
    expect(r.invalid).toBe(true);
  });

  it('entrada vazia / null: value vazio e valido', function() {
    expect(cleanNumeric('').value).toBe('');
    expect(cleanNumeric(null).value).toBe('');
    expect(cleanNumeric(null).invalid).toBe(false);
  });

  it('so simbolos invalidos: value vazio mas invalid=true', function() {
    var r = cleanNumeric('abc');
    expect(r.value).toBe('');
    expect(r.invalid).toBe(true);
  });
});
