import { runWithAIGuard, sb } from './supabase.js';

var _memo = {};
var _inflight = {};
var MEMO_TTL = 2 * 60 * 1000;

var clean = function(v, n) { return String(v || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, n); };
var keyOf = function(body) { return JSON.stringify(body); };
var now = function() { return Date.now(); };
var getMemo = function(k) {
  var row = _memo[k];
  if (!row) return null;
  if (now() > row.exp) { delete _memo[k]; return null; }
  return row.val;
};
var setMemo = function(k, v) { _memo[k] = { val: v, exp: now() + MEMO_TTL }; };

var HEX_RE = /^#[0-9a-fA-F]{6}$/;
var firstHex = function(s) { var m = String(s || '').match(/#[0-9a-fA-F]{6}/); return m ? m[0] : null; };

function fallbackText(mode, prompt) {
  var p = clean(prompt, 300);
  if (mode === 'email') {
    return 'Assunto: Atualização rápida\n\nOlá,\n\nSegue uma atualização breve sobre ' + (p || 'o tema solicitado') + '.\n\nSe quiser, ajusto para um tom mais formal ou mais direto.\n\nAtenciosamente,';
  }
  if (mode === 'insights') {
    return '- Reduza a maior despesa primeiro e acompanhe por 7 dias.\n- Revise preço/margem dos itens mais vendidos.\n- Aumente ticket médio com combo ou adicional simples.\n- Defina meta semanal e compare com o realizado.';
  }
  if (mode === 'palette') {
    return '{"primary":"#002f59","secondary":"#dbe7f3","accent":"#2563eb","theme":"light","rationale":"fallback local"}';
  }
  return 'Não consegui gerar agora. Tente novamente em instantes.';
}

function normalizeMode(v) {
  var m = clean(v, 24);
  if (m === 'email' || m === 'insights' || m === 'palette') return m;
  return '';
}

function maxForMode(mode, req) {
  var n = Math.round(Number(req) || 0);
  var base = mode === 'palette' ? 140 : mode === 'insights' ? 220 : mode === 'email' ? 320 : 420;
  if (!n) return base;
  return Math.max(40, Math.min(base, n));
}

// Compat:
// 1) askAI(prompt, system, maxTokens)
// 2) askAI(prompt, { mode, system, maxTokens })
export var askAI = async function(prompt, systemOrOpts, maxTokens) {
  var opts = (systemOrOpts && typeof systemOrOpts === 'object') ? systemOrOpts : {};
  var mode = normalizeMode(opts.mode);
  var p = clean(prompt, 2200);
  var s = clean(typeof systemOrOpts === 'string' ? systemOrOpts : opts.system, 320);
  var mt = maxForMode(mode, opts.maxTokens || maxTokens);
  if (!p) return { ok: false, error: 'Pergunta vazia.' };

  var body = { prompt: p, max_tokens: mt, cache_first: true };
  if (mode) body.mode = mode;
  if (s) body.system = s;

  var key = keyOf(body);
  var m = getMemo(key);
  if (m) return m;
  if (_inflight[key]) return _inflight[key];

  var req = (async function() {
    try {
      var res = await runWithAIGuard(function() {
        return sb.functions.invoke('ai', { body: body });
      });
      if (res && !res.error && res.data && res.data.text) {
        var okOut = { ok: true, text: clean(res.data.text, 9000) };
        setMemo(key, okOut);
        return okOut;
      }
      var data = res && res.data ? res.data : {};
      if (data && data.error && data.error === 'missing_api_key') {
        return { ok: false, error: 'IA ainda não configurada (defina a chave no Supabase).' };
      }
      var fb = { ok: true, text: fallbackText(mode, p) };
      setMemo(key, fb);
      return fb;
    } catch (e) {
      var fb = { ok: true, text: fallbackText(mode, p) };
      setMemo(key, fb);
      return fb;
    } finally {
      delete _inflight[key];
    }
  })();
  _inflight[key] = req;
  return req;
};

export var gerarPaleta = async function(opts) {
  var o = opts || {};
  var cores = (o.colors || []).filter(function(c) { return HEX_RE.test(c); });
  var n = clean(o.name, 60);
  var sg = clean(o.segment, 60);
  var c = cores.length ? cores.slice(0, 6).join(',') : 'none';
  var compactPrompt = 'n=' + (n || '-') + ';s=' + (sg || '-') + ';c=' + c;
  var res = await askAI(compactPrompt, { mode: 'palette', maxTokens: 140 });
  if (!res.ok) return { ok: false, error: res.error };

  var data;
  try {
    var txt = res.text;
    var start = txt.indexOf('{');
    var end = txt.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no json');
    data = JSON.parse(txt.slice(start, end + 1));
  } catch (e) {
    return {
      ok: true,
      palette: { primary: '#002f59', secondary: '#dbe7f3', accent: '#2563eb', theme: 'light' },
      rationale: 'fallback local',
    };
  }

  var primary = firstHex(data.primary) || '#002f59';
  return {
    ok: true,
    palette: {
      primary: primary,
      secondary: firstHex(data.secondary) || '#dbe7f3',
      accent: firstHex(data.accent) || '#2563eb',
      theme: data.theme === 'dark' ? 'dark' : 'light',
    },
    rationale: String(data.rationale || '').slice(0, 160),
  };
};

