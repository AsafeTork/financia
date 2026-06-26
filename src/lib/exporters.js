// Exportadores minimalistas e sem dependencias: PDF (janela de impressao) e
// Excel (planilha HTML .xls). Padronizam Ganhos, Despesas, Estoque e Relatorio.

function htmlEscape(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// opts: { filename, headers:[string], rows:[[string]] }
export function exportXLS(opts) {
  var headers = opts.headers || [];
  var rows = opts.rows || [];
  var head = '<tr>' + headers.map(function(h) { return '<th>' + htmlEscape(h) + '</th>'; }).join('') + '</tr>';
  var body = rows.map(function(r) {
    return '<tr>' + r.map(function(c) { return '<td>' + htmlEscape(c) + '</td>'; }).join('') + '</tr>';
  }).join('');
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">'
    + '<head><meta charset="utf-8"></head><body><table border="1">' + head + body + '</table></body></html>';
  var blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = (opts.filename || 'export') + '.xls'; a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

// opts: { title, subtitle, brandName, accent, headers, rows, kpis:[{label,value,color}] }
export function exportPDF(opts) {
  var headers = opts.headers || [];
  var rows = opts.rows || [];
  var win = window.open('', '_blank');
  if (!win) return false;
  var lastH = headers.length - 1;
  var ths = headers.map(function(h, i) { return '<th' + (i === lastH ? ' class="r"' : '') + '>' + htmlEscape(h) + '</th>'; }).join('');
  var trs = rows.map(function(r) {
    var last = r.length - 1;
    return '<tr>' + r.map(function(c, i) { return '<td' + (i === last ? ' class="r"' : '') + '>' + htmlEscape(c) + '</td>'; }).join('') + '</tr>';
  }).join('');
  var kpis = (opts.kpis || []).map(function(k) {
    return '<div class="kpi"><p class="l">' + htmlEscape(k.label) + '</p><p class="v" style="color:' + (k.color || '#111') + '">' + htmlEscape(k.value) + '</p></div>';
  }).join('');
  var doc = '<!doctype html><html><head><meta charset="utf-8"><title>' + htmlEscape(opts.title || 'Relatorio') + '</title>'
    + '<style>*{font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + 'body{margin:32px}h1{font-size:20px;margin:0}.sub{color:#666;font-size:12px;margin:2px 0 18px}'
    + '.kpis{display:flex;gap:12px;margin-bottom:18px}.kpi{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}.kpi p{margin:0}'
    + '.kpi .l{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.5px}.kpi .v{font-size:15px;font-weight:700;margin-top:4px}'
    + 'table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #eee}'
    + 'th{color:#888;text-transform:uppercase;font-size:10px}.r{text-align:right;white-space:nowrap}td.r{font-weight:700}'
    + '@media print{body{margin:0}}</style></head><body>'
    + '<h1>' + htmlEscape(opts.brandName || 'Financia') + '</h1><p class="sub">' + htmlEscape(opts.subtitle || '') + '</p>'
    + (kpis ? '<div class="kpis">' + kpis + '</div>' : '')
    + '<table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table>'
    + '<script>window.onload=function(){window.print();}<\/script></body></html>';
  win.document.write(doc);
  win.document.close();
  return true;
}
