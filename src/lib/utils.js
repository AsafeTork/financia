export const fmt = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const hexToRgb = function(hex) {
  var h = (hex || '#002f59').replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
};
export const brandAlpha = function(hex, a) {
  var c = hexToRgb(hex);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
};
export const fmtDate = s => new Date(s + 'T12:00').toLocaleDateString('pt-BR');
export const monthLabel = s => { const [y, m] = s.split('-'); return new Date(+y, +m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };
export const now = () => new Date().toISOString();
export const today = () => new Date().toISOString().split('T')[0];
export const prevDays = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
export const safe = s => String(s || '').replace(/[<>"]/g, '').replace(/javascript:/gi, '').trim().slice(0, 200);
export const isUrl = s => !!(s && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('/')));
export const genPwd = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'; return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join(''); };
let _id = 1;
export const uid = () => String(Date.now()) + String(++_id);

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
