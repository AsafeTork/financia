// Edge Function: admin-create-client
// Cria um novo cliente (auth.users + company_profiles) usando a service_role,
// SEM trocar a sessao do admin (o bug de sb.auth.signUp no front deslogava o admin).
// Verifica que o chamador e admin (user_roles.role === 'admin') antes de qualquer acao.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

Deno.serve(async function (req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(500, { error: 'not_configured' });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    // 1) Identifica o chamador a partir do JWT.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const userResult = await callerClient.auth.getUser();
    const caller = userResult && userResult.data ? userResult.data.user : null;
    if (!caller) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    // 2) Confirma que o chamador e admin (via service_role, ignora RLS).
    const admin = createClient(supabaseUrl, serviceKey);
    const roleRes = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    const isAdmin = roleRes && roleRes.data && roleRes.data.role === 'admin';
    if (!isAdmin) {
      return jsonResponse(403, { error: 'forbidden' });
    }

    // 3) Valida entrada.
    let body = {};
    try { body = await req.json(); } catch (parseErr) { body = {}; }
    const email = body && body.email ? String(body.email).trim() : '';
    const password = body && body.password ? String(body.password) : '';
    const companyName = body && body.company_name ? String(body.company_name) : '';
    if (!email || !password) {
      return jsonResponse(400, { error: 'missing_credentials' });
    }
    if (password.length < 8) {
      return jsonResponse(400, { error: 'weak_password' });
    }
    if (!companyName) {
      return jsonResponse(400, { error: 'missing_company' });
    }

    // 4) Cria o usuario ja confirmado (nao envia email, nao troca a sessao do admin).
    const created = await admin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });
    if (created.error) {
      const msg = String(created.error.message || '');
      const dup = msg.indexOf('already') !== -1 || msg.indexOf('registered') !== -1;
      return jsonResponse(dup ? 409 : 400, { error: dup ? 'email_exists' : 'create_failed', detail: msg });
    }
    const newUid = created.data && created.data.user ? created.data.user.id : null;
    if (!newUid) {
      return jsonResponse(500, { error: 'no_uid' });
    }

    // 5) Cria o perfil da empresa.
    const profileRes = await admin.from('company_profiles').upsert({
      user_id: newUid,
      name: companyName,
      color: body.primary_color || '#002f59',
      color_secondary: body.secondary_color || null,
      color_accent: body.accent_color || null,
      theme: body.theme || 'light',
      logo: 'G',
      logo_url: body.logo_url || null,
    });
    if (profileRes.error) {
      // Usuario foi criado; reporta o erro de perfil mas devolve o uid para nao orfanar.
      return jsonResponse(207, { user_id: newUid, profile_error: String(profileRes.error.message || '') });
    }

    return jsonResponse(200, { user_id: newUid });
  } catch (err) {
    return jsonResponse(500, { error: 'internal', detail: String(err && err.message ? err.message : err) });
  }
});
