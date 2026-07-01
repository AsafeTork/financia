import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizeEmail, sanitizeText } from '../_shared/security.ts';
import { htmlFromText, sendSystemEmail } from '../_shared/mailer.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, payload: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) headers[keys[i]] = (CORS_HEADERS as any)[keys[i]];
  return new Response(JSON.stringify(payload), { status, headers });
}

Deno.serve(async function (req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse(401, { error: 'unauthorized' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anon || !service) return jsonResponse(500, { error: 'not_configured' });

    const callerClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const meRes = await callerClient.auth.getUser();
    const me = meRes && meRes.data ? meRes.data.user : null;
    if (!me) return jsonResponse(401, { error: 'unauthorized' });

    const admin = createClient(supabaseUrl, service);
    const roleRes = await admin.from('user_roles').select('role').eq('user_id', me.id).eq('role', 'admin').maybeSingle();
    const isAdmin = !!(roleRes && roleRes.data && roleRes.data.role === 'admin');
    if (!isAdmin) return jsonResponse(403, { error: 'forbidden' });

    const secAdmin = getAdminClient();
    const allowed = await enforceRateLimit(secAdmin, me.id, 'send_custom_email', 60, 20);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    let body: any = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const to = sanitizeEmail(body && body.to);
    const subject = sanitizeText(body && body.subject, 180);
    const text = sanitizeText(body && body.body, 10000);
    if (!to || !subject || !text) return jsonResponse(400, { error: 'invalid_payload' });

    const sent = await sendSystemEmail({
      to,
      subject,
      text,
      html: htmlFromText(text),
    });
    if (!sent.ok) {
      if (sent.skipped) return jsonResponse(500, { error: 'smtp_not_configured' });
      return jsonResponse(500, { error: sent.error || 'send_failed' });
    }
    return jsonResponse(200, { ok: true });
  } catch (err) {
    const message = err && (err as any).message ? String((err as any).message) : String(err);
    return jsonResponse(500, { error: message });
  }
});
