export const fmt = function(n) { return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
export const hexToRgb = function(hex) {
  var h = (hex || '#002f59').replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
};
export const brandAlpha = function(hex, a) {
  var c = hexToRgb(hex);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
};
export const fmtDate = function(s) { return new Date(s + 'T12:00').toLocaleDateString('pt-BR'); };
export const monthLabel = function(s) { const [y, m] = s.split('-'); return new Date(+y, +m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };
export const now = function() { return new Date().toISOString(); };
export const today = function() { return new Date().toISOString().split('T')[0]; };
export const prevDays = function(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
export const safe = function(s) { return String(s || '').replace(/[<>"]/g, '').replace(/javascript:/gi, '').trim().slice(0, 200); };
export const isUrl = function(s) { return !!(s && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('/'))); };
export const genPwd = function() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'; return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join(''); };
let _id = 1;
export const uid = function() { return String(Date.now()) + String(++_id); };

export const luminance = function(hex) {
  var c = hexToRgb(hex);
  var toLinear = function(v) { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
};
export const lightenHex = function(hex, factor) {
  var c = hexToRgb(hex);
  var r = Math.round(c.r + (255 - c.r) * factor);
  var g = Math.round(c.g + (255 - c.g) * factor);
  var b = Math.round(c.b + (255 - c.b) * factor);
  return '#' + [r, g, b].map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
};
export const deriveCores = function(primary) {
  return {
    secondary: lightenHex(primary || '#002f59', 0.78),
    accent:    lightenHex(primary || '#002f59', 0.92),
  };
};

const PW_LEVELS = [
  { label: 'Muito fraca', pct: 20, color: '#ef4444' },
  { label: 'Fraca',       pct: 40, color: '#f97316' },
  { label: 'Razoável',    pct: 62, color: '#eab308' },
  { label: 'Boa',         pct: 82, color: '#22c55e' },
  { label: 'Forte',       pct: 100, color: '#0f9d6c' },
];

export const passwordStrength = function(pw) {
  if (!pw) return { score: 0, label: '', pct: 0, color: '#e5e7eb' };
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) s += 1;
  let idx = s - 1;
  if (idx < 0) idx = 0;
  if (idx > 4) idx = 4;
  return Object.assign({ score: s }, PW_LEVELS[idx]);
};

export const validPhone = function(s) {
  const digits = String(s || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
};

export const maskPhone = function(s) {
  let d = String(s || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? '(' + d : d;
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
};
