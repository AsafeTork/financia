import React from 'react';

export const Card = function({ children, className, hover, variant, accent, color }) {
  var base = 'border rounded-xl ';
  if (variant === 'flat')        base += 'border-gray-100 ';
  else if (variant === 'raised') base += 'border-gray-100 shadow-md ';
  else                           base += 'border-gray-100 shadow-sm ';
  if (hover) base += 'card-hover ';
  return (
    <div className={base + (className || '')} style={{position:'relative', overflow:'hidden', background:'var(--bg-card)'}}>
      {accent && <div style={{position:'absolute', top:0, left:0, right:0, height:3, background: color || 'var(--brand, #1a6b5c)', borderRadius:'inherit inherit 0 0'}}/>}
      {children}
    </div>
  );
};

export const Inp = function({ label, hint, error, success, className, icon, ...p }) {
  var borderColor = error ? '#ef4444' : success ? '#22c55e' : '';
  return (
    <div className={'flex flex-col gap-1.5 ' + (className || '')}>
      {label && (
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-gray-400">{icon}</span>}
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
        </div>
      )}
      <input
        className="border border-gray-200 rounded-xl px-3 py-3 text-sm transition w-full"
        style={Object.assign({background:'var(--bg-input)', color:'var(--text-main)'}, borderColor ? {borderColor: borderColor} : {})}
        {...p}
      />
      {(hint || error) && (
        <p className={'text-xs mt-0.5 ' + (error ? 'text-red-500' : 'text-gray-400')}>{error || hint}</p>
      )}
    </div>
  );
};

export const Sel = function({ label, className, children, ...p }) {
  return (
    <div className={'flex flex-col gap-1.5 ' + (className || '')}>
      {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}
      <select className="border border-gray-200 rounded-xl px-3 py-3 text-sm transition" style={{background:'var(--bg-input)', color:'var(--text-main)'}} {...p}>{children}</select>
    </div>
  );
};

export const Textarea = function({ label, className, ...p }) {
  return (
    <div className={'flex flex-col gap-1.5 ' + (className || '')}>
      {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}
      <textarea className="border border-gray-200 rounded-xl px-3 py-3 text-sm transition w-full resize-none" style={{background:'var(--bg-input)', color:'var(--text-main)'}} rows={6} {...p}/>
    </div>
  );
};

export const Spin = function({ white, size }) {
  var sz = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={sz + ' border-2 rounded-full animate-spin flex-shrink-0 ' + (white ? 'border-white border-t-transparent' : 'border-gray-300 border-t-gray-700')}/>
  );
};

var BTN_VARIANTS = {
  primary:   'text-white hover:opacity-90 disabled:opacity-40',
  secondary: 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40',
  ghost:     'text-gray-600 hover:bg-gray-100 disabled:opacity-40',
  danger:    'text-white bg-red-500 hover:bg-red-600 disabled:opacity-40',
};
var BTN_SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-sm rounded-xl',
};

export const Btn = function({ variant, size, loading, children, style, className, ...p }) {
  var v = variant || 'primary';
  var s = size || 'md';
  return (
    <button
      className={'font-semibold flex items-center justify-center gap-2 transition ' + BTN_VARIANTS[v] + ' ' + BTN_SIZES[s] + ' ' + (className || '')}
      style={style}
      disabled={loading || p.disabled}
      {...p}
    >
      {loading ? <Spin white={v === 'primary' || v === 'danger'} size="sm"/> : children}
    </button>
  );
};

export const Badge = function({ color, bg, children }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{color: color || '#1a6b5c', background: bg || 'rgba(26,107,92,0.1)'}}
    >
      {children}
    </span>
  );
};

export const Divider = function({ label }) {
  if (!label) return <div className="border-t border-gray-100 my-1"/>;
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 border-t border-gray-100"/>
      <span className="text-xs text-gray-400 font-medium flex-shrink-0">{label}</span>
      <div className="flex-1 border-t border-gray-100"/>
    </div>
  );
};

export const Empty = function({ icon, title, sub, action, onAction, color }) {
  return (
    <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1" style={{background: color ? 'rgba(0,0,0,0.04)' : '#f1f5f9'}}>
        {icon && typeof icon === 'string' && icon.length <= 2
          ? <span className="text-2xl">{icon}</span>
          : icon
          ? icon
          : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color || '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          )
        }
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">{sub}</p>
      {action && (
        <button onClick={onAction}
          className="mt-1 text-xs font-semibold px-5 py-2.5 rounded-xl text-white transition hover:opacity-90"
          style={{background: color || '#1a6b5c'}}>
          {action}
        </button>
      )}
    </div>
  );
};

export const Modal = function({ title, onClose, onSave, color, saving, children, saveLabel, wide }) {
  var bg = color || '#1a6b5c';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className={'rounded-2xl flex flex-col w-full ' + (wide ? 'max-w-lg' : 'max-w-sm')} style={{background:'var(--bg-card)', boxShadow:'0 25px 60px rgba(0,0,0,0.2)', maxHeight:'90vh'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <span className="font-semibold text-gray-900">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3 overflow-y-auto flex-1">{children}</div>
        <div className="flex gap-2 px-6 pb-5 flex-shrink-0 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40 transition" style={{background: bg}}>
            {saving ? <Spin white/> : (saveLabel || 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const EditBtn = function({ onClick }) {
  return (
    <button onClick={onClick} title="Editar" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition flex-shrink-0">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
    </button>
  );
};

export const DelBtn = function({ onClick }) {
  return (
    <button onClick={onClick} title="Excluir" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
    </button>
  );
};
