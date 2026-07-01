import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var PM_RE = /^pm_[A-Za-z0-9]+$/;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var HEX_COLOR_RE = /^#?[0-9a-fA-F]{6}$/;

export function sanitizeText(value: unknown, maxLen: number): string {
  var s = String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  return s.slice(0, maxLen);
}

export function sanitizeEmail(value: unknown): string {
  var email = sanitizeText(value, 320).toLowerCase();
  return EMAIL_RE.test(email) ? email : '';
}

export function sanitizeUuid(value: unknown): string {
  var id = sanitizeText(value, 64);
  return UUID_RE.test(id) ? id : '';
}

export function sanitizePaymentMethodId(value: unknown): string {
  var pm = sanitizeText(value, 80);
  return PM_RE.test(pm) ? pm : '';
}

export function sanitizePlanId(value: unknown): string {
  var plan = sanitizeText(value, 16);
  return plan === 'pro' || plan === 'premium' ? plan : '';
}

export function sanitizeKind(value: unknown): string {
  var kind = sanitizeText(value, 32);
  return kind === 'white_label' ? kind : '';
}

export function sanitizeOrigin(value: string | null, fallback: string): string {
  var origin = value || fallback;
  try {
    var u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return fallback;
    return u.origin;
  } catch (_) {
    return fallback;
  }
}

export function sanitizeHexColor(value: unknown, fallback?: string): string {
  var raw = sanitizeText(value, 16);
  if (!HEX_COLOR_RE.test(raw)) return fallback || '';
  return raw.charAt(0) === '#' ? raw : ('#' + raw);
}

export function sanitizeUrl(value: unknown): string {
  var raw = sanitizeText(value, 500);
  if (!raw) return '';
  try {
    var u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return u.toString();
  } catch (_) {
    return '';
  }
}

export function asPositiveInt(value: unknown, min: number, max: number): number | null {
  var n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function getAdminClient() {
  var supabaseUrl = Deno.env.get('SUPABASE_URL');
  var serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

function toHex(bytes: Uint8Array): string {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

async function requestHash(payload: unknown): Promise<string> {
  var body = JSON.stringify(payload == null ? {} : payload);
  var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return toHex(new Uint8Array(digest));
}

export async function enforceRateLimit(
  admin: any,
  userId: string | null,
  action: string,
  windowSeconds: number,
  maxRequests: number
): Promise<boolean> {
  if (!admin) return true;
  try {
    var uid = userId || null;
    var key = 'rl:' + action + ':' + (uid || 'anon');
    var since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    var q = admin.from('ai_cache')
      .select('id', { count: 'exact', head: true })
      .eq('scope', 'rate_limit')
      .eq('cache_key', key)
      .gt('created_at', since);

    if (uid) q = q.eq('user_id', uid);

    var res = await q;
    var count = res && typeof res.count === 'number' ? res.count : 0;
    if (count >= maxRequests) return false;

    await admin.from('ai_cache').insert({
      scope: 'rate_limit',
      cache_key: key,
      request_hash: null,
      user_id: uid,
      action: action,
      response: null,
      status: 200,
      expires_at: new Date(Date.now() + windowSeconds * 1000).toISOString(),
    });
    return true;
  } catch (_) {
    return true;
  }
}

export async function cacheGet(
  admin: any,
  cacheKey: string,
  payload: unknown
): Promise<any | null> {
  if (!admin) return null;
  try {
    var hash = await requestHash(payload);
    var nowIso = new Date().toISOString();
    var res = await admin.from('ai_cache')
      .select('response')
      .eq('scope', 'cache')
      .eq('cache_key', cacheKey)
      .eq('request_hash', hash)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!res || !res.data) return null;
    return res.data.response || null;
  } catch (_) {
    return null;
  }
}

export async function cacheSet(
  admin: any,
  cacheKey: string,
  payload: unknown,
  response: unknown,
  ttlSeconds: number,
  userId?: string | null
): Promise<void> {
  if (!admin) return;
  try {
    var hash = await requestHash(payload);
    await admin.from('ai_cache').insert({
      scope: 'cache',
      cache_key: cacheKey,
      request_hash: hash,
      user_id: userId || null,
      action: cacheKey,
      response: response == null ? {} : response,
      status: 200,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch (_) {}
}
