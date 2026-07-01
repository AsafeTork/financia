import nodemailer from 'npm:nodemailer@6.9.15';

function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name);
  if (v && String(v).trim()) return String(v).trim();
  return fallback || '';
}

function parsePort(raw: string): number {
  const n = Number(raw || '587');
  if (!Number.isFinite(n) || n <= 0) return 587;
  return Math.round(n);
}

export type SystemEmailInput = {
  to: string,
  subject: string,
  text: string,
  html?: string,
};

export function mailerConfigured(): boolean {
  const host = env('SMTP_HOST');
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  const from = env('SMTP_FROM_EMAIL');
  return !!(host && user && pass && from);
}

export async function sendSystemEmail(input: SystemEmailInput): Promise<{ ok: boolean, skipped?: boolean, error?: string }> {
  const host = env('SMTP_HOST');
  const port = parsePort(env('SMTP_PORT', '587'));
  const secure = String(port) === '465';
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  const fromEmail = env('SMTP_FROM_EMAIL');
  const fromName = env('SMTP_FROM_NAME', 'Financia');

  if (!host || !user || !pass || !fromEmail) {
    return { ok: false, skipped: true, error: 'smtp_not_configured' };
  }
  if (!input || !input.to || !input.subject || !input.text) {
    return { ok: false, error: 'invalid_email_input' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      auth: { user: user, pass: pass },
      pool: false,
    });
    await transporter.sendMail({
      from: '"' + fromName + '" <' + fromEmail + '>',
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html || undefined,
    });
    return { ok: true };
  } catch (err) {
    const msg = err && (err as any).message ? String((err as any).message) : String(err);
    return { ok: false, error: msg };
  }
}

export function htmlFromText(text: string): string {
  const safe = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap;line-height:1.45;color:#0f172a">' + safe + '</div>';
}
