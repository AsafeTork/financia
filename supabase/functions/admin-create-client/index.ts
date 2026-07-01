// Edge Function: admin-create-client
// Cria um novo cliente (auth.users + company_profiles) usando a service_role,
// SEM trocar a sessao do admin (o bug de sb.auth.signUp no front deslogava o admin).
// Verifica que o chamador e admin (user_roles.role === 'admin') antes de qualquer acao.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, getAdminClient, sanitizeEmail, sanitizeHexColor, sanitizeText, sanitizeUrl } from '../_shared/security.ts';
import { htmlFromText, sendSystemEmail } from '../_shared/mailer.ts';

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
    const email = sanitizeEmail(body && body.email);
    const password = sanitizeText(body && body.password, 128);
    const companyName = sanitizeText(body && body.company_name, 120);
    if (!email || !password) {
      return jsonResponse(400, { error: 'missing_credentials' });
    }
    if (password.length < 8) {
      return jsonResponse(400, { error: 'weak_password' });
    }
    if (!companyName) {
      return jsonResponse(400, { error: 'missing_company' });
    }
    const secAdmin = getAdminClient();
    const allowed = await enforceRateLimit(secAdmin, caller.id, 'admin_create_client', 60, 5);
    if (!allowed) return jsonResponse(429, { error: 'rate_limited' });

    // 4) Cria o usuário sem confirmação automática (confirma via link no e-mail).
    const created = await admin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false,
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
      color: sanitizeHexColor(body && body.primary_color, '#002f59'),
      color_secondary: sanitizeHexColor(body && body.secondary_color) || null,
      color_accent: sanitizeHexColor(body && body.accent_color) || null,
      theme: sanitizeText(body && body.theme, 10) === 'dark' ? 'dark' : 'light',
      logo: 'G',
      logo_url: sanitizeUrl(body && body.logo_url) || null,
    });
    if (profileRes.error) {
      // Usuario foi criado; reporta o erro de perfil mas devolve o uid para nao orfanar.
      return jsonResponse(207, { user_id: newUid, profile_error: String(profileRes.error.message || '') });
    }

    const loginUrl = 'https://financia-gestao.onrender.com';
    let confirmUrl = '';
    try {
      const linkRes = await admin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: { redirectTo: loginUrl },
      });
      const props = linkRes && linkRes.data ? linkRes.data.properties : null;
      confirmUrl = props && props.action_link ? String(props.action_link) : '';
    } catch (_) {}

    const mailText =
      'Olá, ' + companyName + '!' + '\n\n' +
      'Sua conta foi criada no Financia.' + '\n\n' +
      'Confirme seu e-mail para ativar a conta:' + '\n' +
      (confirmUrl ? (confirmUrl + '\n\n') : '') +
      'Depois da confirmação, acesse com:' + '\n' +
      '- E-mail: ' + email + '\n' +
      '- Senha inicial: ' + password + '\n\n' +
      'Acesse: ' + loginUrl + '\n\n' +
      'Recomendação: altere sua senha no primeiro acesso.' + '\n\n' +
      'Equipe Financia';
    const mailHtml =
      '<div style="margin:0;padding:24px;background:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#24292f">' +
        '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d0d7de;border-radius:10px;overflow:hidden">' +
          '<div style="padding:20px 24px;border-bottom:1px solid #d8dee4;background:#f6f8fa">' +
            '<h1 style="margin:0;font-size:18px;line-height:1.3;color:#24292f">Confirme seu e-mail no Financia</h1>' +
          '</div>' +
          '<div style="padding:24px">' +
            '<p style="margin:0 0 12px 0">Olá, <b>' + companyName + '</b>.</p>' +
            '<p style="margin:0 0 16px 0">Sua conta foi criada. Para ativar, confirme seu e-mail.</p>' +
            (confirmUrl
              ? '<p style="margin:0 0 18px 0"><a href="' + confirmUrl + '" style="display:inline-block;background:#2da44e;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:8px">Confirmar e-mail</a></p>'
              : '') +
            '<p style="margin:0 0 8px 0;font-size:13px;color:#57606a">Dados de acesso:</p>' +
            '<p style="margin:0 0 4px 0"><b>Login:</b> ' + email + '</p>' +
            '<p style="margin:0 0 12px 0"><b>Senha inicial:</b> ' + password + '</p>' +
            (confirmUrl ? '<p style="margin:0 0 8px 0;font-size:12px;color:#57606a">Se o botão não funcionar, copie e cole este link no navegador:</p><p style="word-break:break-all;font-size:12px;color:#0969da;margin:0 0 14px 0">' + confirmUrl + '</p>' : '') +
            '<p style="margin:0;font-size:12px;color:#57606a">Após o primeiro acesso, altere sua senha em Configurações.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    const mailResult = await sendSystemEmail({
      to: email,
      subject: 'Confirme seu e-mail para ativar sua conta - Financia',
      text: mailText,
      html: confirmUrl ? mailHtml : htmlFromText(mailText),
    });

    return jsonResponse(200, {
      user_id: newUid,
      email_confirmation: confirmUrl ? 'sent' : 'missing_link',
      mail_error: mailResult && !mailResult.ok ? (mailResult.error || 'mail_failed') : null,
    });
  } catch (err) {
    return jsonResponse(500, { error: 'internal', detail: String(err && err.message ? err.message : err) });
  }
});
