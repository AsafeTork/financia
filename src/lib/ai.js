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
