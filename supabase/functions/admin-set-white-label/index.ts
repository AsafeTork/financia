import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizeUuid } from '../_shared/security.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

Deno.serve(async function(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse(500, { error: 'not_configured' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse(401, { error: 'unauthorized' });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const userResult = await callerClient.auth.getUser();
    const caller = userResult && userResult.data ? userResult.data.user : null;
    if (!caller) return jsonResponse(401, { error: 'unauthorized' });

    const admin = createClient(supabaseUrl, serviceKey);
    const roleRes = await admin.from('user_roles').select('role').eq('user_id', caller.id).maybeSingle();
    const isAdmin = roleRes && roleRes.data && roleRes.data.role === 'admin';
    if (!isAdmin) return jsonResponse(403, { error: 'forbidden' });

    const secAdmin = getAdminClient();
    const allowed = await enforceRateLimit(secAdmin, caller.id, 'admin_set_white_label', 60, 20);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const targetUserId = sanitizeUuid(body && body.target_user_id);
    const enabled = !!(body && body.enabled);
    if (!targetUserId) return jsonResponse(400, { error: 'missing_target' });

    const rpc = await admin.rpc('set_white_label', { p_user: targetUserId, p_on: enabled });
    if (rpc && rpc.error) {
      return jsonResponse(400, { error: String(rpc.error.message || 'rpc_failed') });
    }

    return jsonResponse(200, { ok: true });
  } catch (err) {
    return jsonResponse(500, { error: String(err && err.message ? err.message : err) });
  }
});

