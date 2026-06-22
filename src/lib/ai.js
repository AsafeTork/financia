import { sb } from './supabase.js';

// Chama a Edge Function 'ai' (DeepSeek). A chave fica no servidor (secret),
// nunca no navegador. Retorna { ok, text } ou { ok:false, error }.
export var askAI = async function(prompt, system, maxTokens) {
  try {
    var res = await sb.functions.invoke('ai', {
      body: { prompt: prompt, system: system || '', max_tokens: maxTokens || 700 },
    });
    if (res.error) return { ok: false, error: 'Não foi possível conectar com a IA.' };
    var data = res.data || {};
    if (data.error) {
      var msg = data.error === 'missing_api_key'
        ? 'IA ainda não configurada (defina a chave no Supabase).'
        : 'A IA não conseguiu responder agora.';
      return { ok: false, error: msg };
    }
    return { ok: true, text: (data.text || '').trim() };
  } catch (e) {
    return { ok: false, error: 'Erro de conexão com a IA.' };
  }
};

var HEX_RE = /^#[0-9a-fA-F]{6}$/;
var firstHex = function(s) { var m = String(s || '').match(/#[0-9a-fA-F]{6}/); return m ? m[0] : null; };

// Gera uma paleta harmonica a partir das cores e do segmento da empresa.
// Retorna { ok, palette:{primary,secondary,accent,theme}, rationale } ou { ok:false, error }.
export var gerarPaleta = async function(opts) {
  var o = opts || {};
  var cores = (o.colors || []).filter(function(c) { return HEX_RE.test(c); });
  var ctx = [];
  if (o.name) ctx.push('Empresa: ' + o.name + '.');
  if (o.segment) ctx.push('Segmento: ' + o.segment + '.');
  if (cores.length) ctx.push('Cores da marca: ' + cores.join(', ') + '.');
  else ctx.push('Sem cores definidas — proponha algo profissional para o segmento.');

  var system = 'Voce e um designer de identidade visual. Responda APENAS com JSON valido, '
    + 'sem texto fora do JSON, sem markdown. Formato exato: '
    + '{"primary":"#RRGGBB","secondary":"#RRGGBB","accent":"#RRGGBB","theme":"light","rationale":"frase curta em portugues"}. '
    + 'primary = cor principal (sidebar, botoes), forte e legivel com texto branco. '
    + 'secondary = tom suave/claro para fundos e badges. '
    + 'accent = cor de CONTRASTE harmonica para destaques, graficos e CTAs (diferente da primary). '
    + 'theme = "light" ou "dark". Garanta bom contraste e harmonia.';

  var res = await askAI(ctx.join(' '), system, 300);
  if (!res.ok) return { ok: false, error: res.error };

  var data;
  try {
    var txt = res.text;
    var start = txt.indexOf('{');
    var end = txt.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no json');
    data = JSON.parse(txt.slice(start, end + 1));
  } catch (e) {
    return { ok: false, error: 'A IA respondeu em formato inesperado. Tente de novo.' };
  }

  var primary = firstHex(data.primary);
  if (!primary) return { ok: false, error: 'A IA nao retornou uma cor valida.' };
  return {
    ok: true,
    palette: {
      primary: primary,
      secondary: firstHex(data.secondary) || '',
      accent: firstHex(data.accent) || '',
      theme: data.theme === 'dark' ? 'dark' : 'light',
    },
    rationale: String(data.rationale || '').slice(0, 160),
  };
};
