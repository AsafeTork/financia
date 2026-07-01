import { createClient } from '@supabase/supabase-js';

var AI_GUARD_KEY = '__financia_ai_guard_depth__';
if (typeof globalThis !== 'undefined' && typeof globalThis[AI_GUARD_KEY] !== 'number') {
  globalThis[AI_GUARD_KEY] = 0;
}

function aiGuardDepth() {
  if (typeof globalThis === 'undefined') return 0;
  var v = globalThis[AI_GUARD_KEY];
  return typeof v === 'number' ? v : 0;
}

export function runWithAIGuard(fn) {
  if (typeof fn !== 'function') return Promise.resolve(null);
  if (typeof globalThis !== 'undefined') globalThis[AI_GUARD_KEY] = aiGuardDepth() + 1;
  var done = function() {
    if (typeof globalThis !== 'undefined') globalThis[AI_GUARD_KEY] = Math.max(0, aiGuardDepth() - 1);
  };
  try {
    return Promise.resolve(fn()).finally(done);
  } catch (e) {
    done();
    return Promise.reject(e);
  }
}

function missingSupabaseError() {
  return new Error('Supabase nao configurado');
}

function createNoopQueryBuilder() {
  var state = { operation: 'select' };

  function response() {
    return { data: null, error: missingSupabaseError() };
  }

  function builder() {}
  builder.prototype = {
    select: function() { state.operation = 'select'; return this; },
    insert: function() { state.operation = 'insert'; return this; },
    upsert: function() { state.operation = 'upsert'; return this; },
    update: function() { state.operation = 'update'; return this; },
    delete: function() { state.operation = 'delete'; return this; },
    eq: function() { return this; },
    neq: function() { return this; },
    gt: function() { return this; },
    gte: function() { return this; },
    lt: function() { return this; },
    lte: function() { return this; },
    ilike: function() { return this; },
    like: function() { return this; },
    contains: function() { return this; },
    overlaps: function() { return this; },
    in: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; },
    range: function() { return this; },
    maybeSingle: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
    single: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
    then: function(resolve, reject) { return Promise.resolve(response()).then(resolve, reject); },
    catch: function(reject) { return Promise.resolve(response()).catch(reject); },
    finally: function(cb) { return Promise.resolve(response()).finally(cb); },
  };

  return new builder();
}

function createNoopChannel() {
  return {
    on: function() { return this; },
    subscribe: function(cb) {
      if (typeof cb === 'function') cb('CLOSED');
      return this;
    },
  };
}

function createNoopStorageBucket() {
  return {
    upload: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
    getPublicUrl: function() { return { data: { publicUrl: null } }; },
  };
}

function createNoopSupabaseClient() {
  var authSub = { data: { subscription: { unsubscribe: function() {} } } };
  return {
    auth: {
      getSession: function() { return Promise.resolve({ data: { session: null }, error: null }); },
      onAuthStateChange: function() { return authSub; },
      signInWithPassword: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
      signUp: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
      signInWithOAuth: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
      resetPasswordForEmail: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
      updateUser: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
      signOut: function() { return Promise.resolve({ data: null, error: null }); },
    },
    storage: {
      from: function() { return createNoopStorageBucket(); },
    },
    functions: {
      invoke: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
    },
    from: function() { return createNoopQueryBuilder(); },
    rpc: function() { return Promise.resolve({ data: null, error: missingSupabaseError() }); },
    channel: function() { return createNoopChannel(); },
    removeChannel: function() { return null; },
  };
}

var supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export var sb = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : createNoopSupabaseClient();

if (sb && sb.functions && typeof sb.functions.invoke === 'function') {
  var _origInvoke = sb.functions.invoke.bind(sb.functions);
  sb.functions.invoke = function(name, opts) {
    if (name === 'ai' && import.meta.env.DEV && aiGuardDepth() < 1) {
      throw new Error('AI calls must go through src/lib/aiClient.js');
    }
    return _origInvoke(name, opts);
  };
}
