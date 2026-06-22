import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTx } from './useTx.js';

var mockPut    = vi.fn(async function() {});
var mockUpdate = vi.fn(async function() {});
var mockDelete = vi.fn(async function() {});

vi.mock('../lib/db.js', function() {
  return {
    ldb: {
      transactions: {
        put:    function() { return mockPut.apply(this, arguments); },
        update: function() { return mockUpdate.apply(this, arguments); },
        delete: function() { return mockDelete.apply(this, arguments); },
      },
    },
  };
});

var mockUpsert = vi.fn(async function() { return {error: null}; });
var mockSbUpdate = vi.fn(function() { return {eq: vi.fn(async function() { return {error: null}; })}; });
var mockSbDelete = vi.fn(function() { return {eq: vi.fn(async function() { return {error: null}; })}; });

vi.mock('../lib/supabase.js', function() {
  return {
    sb: {
      from: function() {
        return {
          upsert: function() { return mockUpsert.apply(this, arguments); },
          update: function() { return mockSbUpdate.apply(this, arguments); },
          delete: function() { return mockSbDelete.apply(this, arguments); },
        };
      },
    },
  };
});

var session = {
  user: { id: 'u1', email: 'a@b.com', user_metadata: { name: 'Teste' } },
};

function makeHook(limitOk) {
  var enforceLimit = vi.fn(function() { return limitOk !== false; });
  var toast = vi.fn();
  var hook = renderHook(function() { return useTx(session, enforceLimit, toast); });
  return { hook: hook, enforceLimit: enforceLimit, toast: toast };
}

function makeTx(overrides) {
  return Object.assign({ id: 'tx1', type: 'income', desc: 'Venda', amount: '100', date: '2026-01-01', method: 'pix', cat: 'vendas' }, overrides || {});
}

beforeEach(function() {
  mockPut.mockClear();
  mockUpdate.mockClear();
  mockDelete.mockClear();
  mockUpsert.mockClear();
  mockSbUpdate.mockClear();
  mockSbDelete.mockClear();
  Object.defineProperty(navigator, 'onLine', {value: false, configurable: true});
});

describe('addTx', function() {
  it('caminho feliz: adiciona transacao', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    expect(mockPut).toHaveBeenCalledOnce();
    expect(hook.result.current.tx).toHaveLength(1);
    expect(hook.result.current.tx[0].description).toBe('Venda');
  });

  it('rejeita desc vazia', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx({desc: ''})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita amount zero', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx({amount: '0'})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita amount negativo', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx({amount: '-5'})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('bloqueia quando limite atingido', async function() {
    var { hook, enforceLimit } = makeHook(false);
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    expect(enforceLimit).toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('erro no Dexie mostra toast de erro', async function() {
    mockPut.mockRejectedValueOnce(new Error('disk full'));
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('disk full'), 'error');
  });
});

describe('editTx', function() {
  it('caminho feliz: edita transacao', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    await act(async function() { await hook.result.current.editTx('tx1', makeTx({desc:'Venda 2', amount:'200'})); });
    expect(mockUpdate).toHaveBeenCalled();
    expect(hook.result.current.tx[0].description).toBe('Venda 2');
    expect(hook.result.current.tx[0].amount).toBe(200);
  });

  it('rejeita desc vazia na edicao', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.editTx('tx1', makeTx({desc:''})); });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita amount invalido na edicao', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.editTx('tx1', makeTx({amount:'0'})); });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

describe('deleteTx', function() {
  it('remove transacao do estado', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    expect(hook.result.current.tx).toHaveLength(1);
    await act(async function() { await hook.result.current.deleteTx('tx1'); });
    expect(hook.result.current.tx).toHaveLength(0);
  });

  it('marca _deleted no Dexie', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    await act(async function() { await hook.result.current.deleteTx('tx1'); });
    expect(mockUpdate).toHaveBeenCalledWith('tx1', expect.objectContaining({_deleted: 1}));
  });

  it('erro no Dexie mostra toast', async function() {
    mockUpdate.mockRejectedValueOnce(new Error('io error'));
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addTx(makeTx()); });
    await act(async function() { await hook.result.current.deleteTx('tx1'); });
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('io error'), 'error');
  });
});
