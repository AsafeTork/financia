import React from 'react';

// Exportacao padronizada em todo o app: um unico botao duplo, simetrico e
// minimalista. Lado esquerdo vermelho [PDF], lado direito verde [Excel], com
// micro-animacao no hover. Liberado no plano pago; Free vê um botao bloqueado.
export default function ExportButtons({ paid, onPDF, onXLS, onLocked }) {
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

  return (
    <div className="exp-split" role="group" aria-label="Exportar">
      <button type="button" onClick={onPDF} className="exp-half exp-pdf" title="Exportar PDF" aria-label="Exportar PDF">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/><path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5"/></svg>
        PDF
      </button>
      <span className="exp-divider" aria-hidden="true"/>
      <button type="button" onClick={onXLS} className="exp-half exp-xls" title="Exportar Excel" aria-label="Exportar Excel">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z"/><path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16M10 4v16"/></svg>
        Excel
      </button>
    </div>
  );
}
