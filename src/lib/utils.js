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
