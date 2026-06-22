import { vi } from 'vitest';

export function makeLdbTable() {
  var store = {};
  return {
    put: vi.fn(async function(row) { store[row.id] = row; return row.id; }),
    update: vi.fn(async function(id, upd) { if (store[id]) store[id] = Object.assign({}, store[id], upd); }),
    delete: vi.fn(async function(id) { delete store[id]; }),
    get: vi.fn(async function(id) { return store[id] || null; }),
    _store: store,
  };
}

export function makeSb() {
  var chain = {
    error: null,
    data: null,
    upsert: vi.fn(async function() { return {error: null}; }),
    update: vi.fn(function() { return chain; }),
    delete: vi.fn(function() { return chain; }),
    eq: vi.fn(function() { return chain; }),
  };
  return {
    from: vi.fn(function() { return chain; }),
    _chain: chain,
  };
}

export function makeSession(overrides) {
  return Object.assign({
    user: {
      id: 'user-123',
      email: 'test@test.com',
      user_metadata: { name: 'Test User' },
    },
  }, overrides || {});
}

export function makeEnforceLimit(allow) {
  return vi.fn(function() { return allow !== false; });
}

export function makeToast() {
  return vi.fn();
}
