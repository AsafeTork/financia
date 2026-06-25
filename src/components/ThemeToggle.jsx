import React from 'react';

// Botão de alternância de tema Dark/Light.
// variant 'floating' = pílula sobre o conteúdo (desktop).
// variant 'header'   = embutido na barra colorida (mobile); usa `onBrand` no ícone.
export default function ThemeToggle({ theme, onToggle, variant, onBrand }) {
  var isDark = theme === 'dark';
  var label = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro';
  var header = variant === 'header';

  var iconColor = header ? (onBrand || '#ffffff') : 'var(--text-main)';
  var base = 'inline-flex items-center justify-center rounded-xl transition min-w-[44px] min-h-[44px] hover:opacity-90';
  var style = header
    ? { background: 'rgba(0,0,0,0.18)' }
    : { background: 'var(--bg-card)', border: '1px solid var(--border-md)', boxShadow: 'var(--shadow-sm)' };

  return (
    <button type="button" onClick={onToggle} aria-label={label} title={label} aria-pressed={isDark}
      className={base} style={style}>
      {isDark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
