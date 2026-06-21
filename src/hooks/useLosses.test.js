import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLosses } from './useLosses.js';

var mockPut    = vi.fn(async function() {});
var mockUpdate = vi.fn(async function() {});
var mockDelete = vi.fn(async function() {});

vi.mock('../lib/db.js', function() {
  return {
    ldb: {
      losses: {
        put:    function() { return mockPut.apply(this, arguments); },
        update: function() { return mockUpdate.apply(this, arguments); },
        delete: function() { return mockDelete.apply(this, arguments); },
      },
    },
  };
});

vi.mock('../lib/supabase.js', function() {
  var eq = vi.fn(async function() { return {error: null}; });
  return {
    sb: {
      from: function() {
        return {
          upsert: vi.fn(async function() { return {error: null}; }),
          update: vi.fn(function() { return {eq: eq}; }),
          delete: vi.fn(function() { return {eq: eq}; }),
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
  var hook = renderHook(function() { return useLosses(session, enforceLimit, toast); });
  return { hook: hook, enforceLimit: enforceLimit, toast: toast };
}

function makeLoss(overrides) {
  return Object.assign({ id: 'l1', desc: 'Produto quebrado', qty: '2', reason: 'Queda', date: '2026-01-01' }, overrides || {});
}

beforeEach(function() {
  mockPut.mockClear();
  mockUpdate.mockClear();
  mockDelete.mockClear();
  Object.defineProperty(navigator, 'onLine', {value: false, configurable: true});
});

describe('addLoss', function() {
  it('caminho feliz: registra perda', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss()); });
    expect(mockPut).toHaveBeenCalledOnce();
    expect(hook.result.current.losses).toHaveLength(1);
    expect(hook.result.current.losses[0].description).toBe('Produto quebrado');
  });

  it('rejeita desc vazia', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss({desc: ''})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita qty zero', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss({qty: '0'})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita qty negativa', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss({qty: '-1'})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('bloqueia quando limite atingido', async function() {
    var { hook, enforceLimit } = makeHook(false);
    await act(async function() { await hook.result.current.addLoss(makeLoss()); });
    expect(enforceLimit).toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('aceita reason null/vazio', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss({reason: ''})); });
    expect(mockPut).toHaveBeenCalledOnce();
    expect(hook.result.current.losses[0].reason).toBeNull();
  });

  it('erro no Dexie mostra toast', async function() {
    mockPut.mockRejectedValueOnce(new Error('quota exceeded'));
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss()); });
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('quota exceeded'), 'error');
  });
});

describe('editLoss', function() {
  it('edita perda existente', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss()); });
    await act(async function() { await hook.result.current.editLoss('l1', makeLoss({desc:'Novo', qty:'5'})); });
    expect(mockUpdate).toHaveBeenCalled();
    expect(hook.result.current.losses[0].description).toBe('Novo');
    expect(hook.result.current.losses[0].qty).toBe(5);
  });

  it('rejeita desc vazia na edicao', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.editLoss('l1', makeLoss({desc:''})); });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita qty invalida na edicao', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.editLoss('l1', makeLoss({qty:'0'})); });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

describe('deleteLoss', function() {
  it('remove perda do estado', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss()); });
    await act(async function() { await hook.result.current.deleteLoss('l1'); });
    expect(hook.result.current.losses).toHaveLength(0);
    expect(mockUpdate).toHaveBeenCalledWith('l1', expect.objectContaining({_deleted: 1}));
  });

  it('erro no Dexie mostra toast', async function() {
    mockUpdate.mockRejectedValueOnce(new Error('lock error'));
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addLoss(makeLoss()); });
    await act(async function() { await hook.result.current.deleteLoss('l1'); });
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('lock error'), 'error');
  });
});
