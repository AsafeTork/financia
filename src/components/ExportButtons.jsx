import React from 'react';

// Botoes de exportacao padronizados em todo o app: [PDF] e [Excel], identicos e
// minimalistas. Liberados no plano pago; Free vê um botao bloqueado que leva aos planos.
export default function ExportButtons({ paid, onPDF, onXLS, onLocked, color }) {
  var c = color || 'var(--brand)';

  if (!paid) {
    return (
      <button type="button" onClick={onLocked} title="Exportar disponível no Pro" aria-label="Exportar disponível no Pro"
        className="flex items-center gap-1.5 text-xs font-semibold px-3 min-h-[44px] rounded-xl transition hover:opacity-90"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        Exportar
      </button>
    );
  }

  var items = [{ key: 'pdf', label: 'PDF', act: onPDF }, { key: 'xls', label: 'Excel', act: onXLS }];
  return (
    <div className="flex items-center gap-2">
      {items.map(function(it) {
        return (
          <button key={it.key} type="button" onClick={it.act} title={'Exportar ' + it.label} aria-label={'Exportar ' + it.label}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 min-h-[44px] rounded-xl transition hover:opacity-90"
            style={{ border: '1px solid var(--border)', color: 'var(--text-sub)', background: 'var(--bg-card)' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h4M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
