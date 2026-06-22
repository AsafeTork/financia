import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProducts } from './useProducts.js';

var mockPut    = vi.fn(async function() {});
var mockUpdate = vi.fn(async function() {});
var mockDelete = vi.fn(async function() {});

vi.mock('../lib/db.js', function() {
  return {
    ldb: {
      products: {
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
  var hook = renderHook(function() { return useProducts(session, enforceLimit, toast); });
  return { hook: hook, enforceLimit: enforceLimit, toast: toast };
}

function makeProd(overrides) {
  return Object.assign({ id: 'p1', name: 'Produto A', category: 'cat1', price: '50', cost: '20', stock: '10' }, overrides || {});
}

beforeEach(function() {
  mockPut.mockClear();
  mockUpdate.mockClear();
  mockDelete.mockClear();
  Object.defineProperty(navigator, 'onLine', {value: false, configurable: true});
});

describe('addProduct', function() {
  it('caminho feliz: adiciona produto', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd()); });
    expect(mockPut).toHaveBeenCalledOnce();
    expect(hook.result.current.products).toHaveLength(1);
    expect(hook.result.current.products[0].name).toBe('Produto A');
  });

  it('rejeita nome vazio', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({name: ''})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita preco negativo', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({price: '-1'})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('rejeita estoque negativo', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({stock: '-5'})); });
    expect(mockPut).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('bloqueia quando limite atingido', async function() {
    var { hook, enforceLimit } = makeHook(false);
    await act(async function() { await hook.result.current.addProduct(makeProd()); });
    expect(enforceLimit).toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('aceita preco zero', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({price: '0'})); });
    expect(mockPut).toHaveBeenCalledOnce();
  });
});

describe('editProduct', function() {
  it('edita produto existente', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd()); });
    await act(async function() { await hook.result.current.editProduct('p1', makeProd({name:'Produto B', price:'99'})); });
    expect(mockUpdate).toHaveBeenCalled();
    expect(hook.result.current.products[0].name).toBe('Produto B');
    expect(hook.result.current.products[0].price).toBe(99);
  });

  it('rejeita nome vazio na edicao', async function() {
    var { hook, toast } = makeHook();
    await act(async function() { await hook.result.current.editProduct('p1', makeProd({name:''})); });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

describe('deleteProduct', function() {
  it('remove produto do estado', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd()); });
    await act(async function() { await hook.result.current.deleteProduct('p1'); });
    expect(hook.result.current.products).toHaveLength(0);
    expect(mockUpdate).toHaveBeenCalledWith('p1', expect.objectContaining({_deleted: 1}));
  });
});

describe('adjustStock', function() {
  it('incrementa estoque', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({stock: '10'})); });
    await act(async function() { await hook.result.current.adjustStock('p1', 5); });
    expect(hook.result.current.products[0].stock).toBe(15);
  });

  it('decrementa estoque', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({stock: '10'})); });
    await act(async function() { await hook.result.current.adjustStock('p1', -3); });
    expect(hook.result.current.products[0].stock).toBe(7);
  });

  it('nao deixa estoque negativo', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.addProduct(makeProd({stock: '5'})); });
    await act(async function() { await hook.result.current.adjustStock('p1', -99); });
    expect(hook.result.current.products[0].stock).toBe(0);
  });

  it('ignora id inexistente', async function() {
    var { hook } = makeHook();
    await act(async function() { await hook.result.current.adjustStock('nao-existe', 1); });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
