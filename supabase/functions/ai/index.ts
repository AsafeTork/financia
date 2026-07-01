import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cacheGet, cacheSet, enforceRateLimit, getAdminClient, sanitizeText } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, payload: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) headers[keys[i]] = (CORS_HEADERS as any)[keys[i]];
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

function modelName() {
  return Deno.env.get('OPENAI_MODEL') || Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-chat';
}

function apiBase() {
  return Deno.env.get('OPENAI_BASE_URL') || Deno.env.get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com';
}

function sanitizeMode(value: any): string {
  var m = sanitizeText(value, 24);
  if (m === 'email' || m === 'insights' || m === 'palette') return m;
  return '';
}

function modeTokens(mode: string, requested: number): number {
  var maxByMode = mode === 'palette' ? 140 : mode === 'insights' ? 220 : mode === 'email' ? 320 : 420;
  return Math.max(40, Math.min(maxByMode, requested));
}

function modeSystem(mode: string, custom: string): string {
  if (custom) return custom;
  if (mode === 'palette') {
    return 'Designer. JSON puro: {"primary":"#RRGGBB","secondary":"#RRGGBB","accent":"#RRGGBB","theme":"light|dark","rationale":"curta"}';
  }
  if (mode === 'email') {
    return 'Email PT-BR. Saida: linha1 "Assunto: ...", depois corpo. Sem texto extra.';
  }
  if (mode === 'insights') {
    return 'Consultor financeiro PT-BR. Ate 4 linhas iniciando com "- ". Acoes praticas, sem repetir dados crus.';
  }
  return 'PT-BR. Objetivo e curto.';
}

Deno.serve(async function(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('DEEPSEEK_API_KEY') || '';
  if (!apiKey) return jsonResponse(500, { error: 'missing_api_key' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { error: 'unauthorized' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const userResult = await supabase.auth.getUser();
  const user = userResult && userResult.data ? userResult.data.user : null;
  if (!user) return jsonResponse(401, { error: 'unauthorized' });

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }

  const prompt = sanitizeText(body && body.prompt, 2200);
  const mode = sanitizeMode(body && body.mode);
  const systemIn = sanitizeText(body && body.system, 320);
  const maxReq = Math.round(Number(body && body.max_tokens) || 420);
  const maxTokens = modeTokens(mode, maxReq);
  if (!prompt) return jsonResponse(400, { error: 'invalid_prompt' });

  const admin = getAdminClient();
  const system = modeSystem(mode, systemIn);
  const requestPayload = { p: prompt, s: system, m: modelName(), t: maxTokens, md: mode || '-' };
  const cacheKey = 'ai:' + user.id + ':' + (mode || 'default');
  const cached = await cacheGet(admin, cacheKey, requestPayload);
  if (cached && cached.text) return jsonResponse(200, cached);
  const allow = await enforceRateLimit(admin, user.id, 'ai_prompt', 60, 10);
  if (!allow) return jsonResponse(429, { error: 'rate_limited' });

  const payload = {
    model: modelName(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: mode === 'palette' ? 0.2 : 0.35,
  };

  const llmRes = await fetch(apiBase().replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(function() { return null; });

  if (!llmRes) return jsonResponse(502, { error: 'upstream_unreachable' });
  if (!llmRes.ok) {
    const raw = await llmRes.text().catch(function() { return ''; });
    return jsonResponse(502, { error: sanitizeText(raw, 200) || 'upstream_error' });
  }

  const data = await llmRes.json().catch(function() { return null; });
  const text = sanitizeText(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content, 8000);
  if (!text) return jsonResponse(502, { error: 'empty_response' });

  const response = { text: text };
  await cacheSet(admin, cacheKey, requestPayload, response, 6 * 3600, user.id);
  return jsonResponse(200, response);
});
