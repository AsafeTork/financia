import { describe, it, expect, vi } from 'vitest';

// Evita carregar db.js -> supabase.js (sem env no ambiente de teste).
vi.mock('./db.js', function() {
  return { ldb: { meta: { get: async function() { return null; }, put: async function() {} }, transactions: { get: async function() { return null; } } } };
});

import {
  periodOf, daysInMonth, dueDate, recurringId, isRecurringId,
  activeTemplates, buildRecurringRow,
} from './recurring.js';

describe('periodOf', function() {
  it('formata YYYY-MM com mes zero-pad', function() {
    expect(periodOf(new Date(2026, 5, 15))).toBe('2026-06');
    expect(periodOf(new Date(2026, 0, 1))).toBe('2026-01');
  });
});

describe('daysInMonth', function() {
  it('fevereiro nao bissexto = 28', function() { expect(daysInMonth('2026-02')).toBe(28); });
  it('fevereiro bissexto = 29', function() { expect(daysInMonth('2024-02')).toBe(29); });
  it('abril = 30', function() { expect(daysInMonth('2026-04')).toBe(30); });
});

describe('dueDate', function() {
  it('dia normal', function() { expect(dueDate('2026-06', 5)).toBe('2026-06-05'); });
  it('clampa dia 31 em fevereiro', function() { expect(dueDate('2026-02', 31)).toBe('2026-02-28'); });
  it('clampa dia 0 para 1', function() { expect(dueDate('2026-06', 0)).toBe('2026-06-01'); });
});

describe('recurringId', function() {
  it('e deterministico para o mesmo conteudo+periodo', function() {
    var tpl = { desc: 'Aluguel', amount: 1500, day: 5 };
    expect(recurringId('u1', tpl, '2026-06')).toBe(recurringId('u1', tpl, '2026-06'));
  });
  it('muda quando o valor muda', function() {
    var a = recurringId('u1', { desc: 'Aluguel', amount: 1500, day: 5 }, '2026-06');
    var b = recurringId('u1', { desc: 'Aluguel', amount: 1600, day: 5 }, '2026-06');
    expect(a).not.toBe(b);
  });
  it('muda a cada periodo', function() {
    var t = { desc: 'Aluguel', amount: 1500, day: 5 };
    expect(recurringId('u1', t, '2026-06')).not.toBe(recurringId('u1', t, '2026-07'));
  });
  it('gera id com prefixo rec-', function() {
    expect(isRecurringId(recurringId('u1', { desc: 'x', amount: 1, day: 1 }, '2026-06'))).toBe(true);
  });
});

describe('isRecurringId', function() {
  it('falso para id normal', function() { expect(isRecurringId('1782423456')).toBe(false); });
  it('falso para nao-string', function() { expect(isRecurringId(null)).toBe(false); });
});

describe('activeTemplates', function() {
  it('filtra inativos e invalidos', function() {
    var list = [
      { desc: 'Aluguel', amount: 1500, day: 5, active: true },
      { desc: 'Pausado', amount: 100, day: 10, active: false },
      { desc: '', amount: 100, day: 5, active: true },
      { desc: 'ZeroValor', amount: 0, day: 5, active: true },
      { desc: 'SemDia', amount: 50, day: 0, active: true },
    ];
    var out = activeTemplates(list);
    expect(out.length).toBe(1);
    expect(out[0].desc).toBe('Aluguel');
  });
  it('lista vazia retorna vazio', function() { expect(activeTemplates([]).length).toBe(0); });
});

describe('buildRecurringRow', function() {
  it('monta despesa com flag e id deterministico', function() {
    var row = buildRecurringRow('u1', { desc: 'Aluguel', amount: 1500, day: 5, category: 'Fixo' }, '2026-06', 'Joao');
    expect(row.type).toBe('expense');
    expect(row.amount).toBe(1500);
    expect(row.date).toBe('2026-06-05');
    expect(row.recurring).toBe(1);
    expect(isRecurringId(row.id)).toBe(true);
    expect(row.registered_by).toBe('Joao');
    expect(row._synced).toBe(0);
  });
});
