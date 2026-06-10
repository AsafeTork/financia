import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={'bg-white rounded-2xl shadow-sm border border-gray-100 ' + className}>{children}</div>
);

export const Inp = ({ label, hint, className = '', ...p }) => (
  <div className={'flex flex-col gap-1.5 ' + className}>
    {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
    <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500 transition w-full" {...p}/>
    {hint && <p className="text-xs text-red-400">{hint}</p>}
  </div>
);

export const Sel = ({ label, className = '', children, ...p }) => (
  <div className={'flex flex-col gap-1.5 ' + className}>
    {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
    <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500 transition" {...p}>{children}</select>
  </div>
);

export const Textarea = ({ label, className = '', ...p }) => (
  <div className={'flex flex-col gap-1.5 ' + className}>
    {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
    <textarea className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500 transition w-full resize-none" rows={6} {...p}/>
  </div>
);

export const Spin = ({ white }) => (
  <div className={'w-5 h-5 border-2 rounded-full animate-spin flex-shrink-0 ' + (white ? 'border-white border-t-transparent' : 'border-gray-300 border-t-gray-700')}/>
);

export const Empty = ({ icon, title, sub, action, onAction }) => (
  <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
    <div className="text-4xl">{icon}</div>
    <p className="text-sm font-semibold text-gray-700">{title}</p>
    <p className="text-xs text-gray-400 max-w-xs">{sub}</p>
    {action && <button onClick={onAction} className="mt-2 text-xs font-semibold px-4 py-2 rounded-xl text-white bg-green-600">{action}</button>}
  </div>
);

export const Modal = ({ title, onClose, onSave, color = '#1a6b5c', saving, children, saveLabel = 'Salvar', wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{background:'rgba(0,0,0,0.5)'}}>
    <div className={'bg-white rounded-2xl flex flex-col w-full ' + (wide ? 'max-w-lg' : 'max-w-sm')} style={{boxShadow:'0 25px 60px rgba(0,0,0,0.2)',maxHeight:'90vh'}}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <span className="font-semibold text-gray-900">{title}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="px-6 py-4 flex flex-col gap-3 overflow-y-auto flex-1">{children}</div>
      <div className="flex gap-2 px-6 pb-5 flex-shrink-0 pt-2">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
        <button onClick={onSave} disabled={saving} className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2" style={{background:color}}>
          {saving ? <Spin white/> : saveLabel}
        </button>
      </div>
    </div>
  </div>
);

export const EditBtn = ({ onClick }) => (
  <button onClick={onClick} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition flex-shrink-0">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
  </button>
);

export const DelBtn = ({ onClick }) => (
  <button onClick={onClick} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
  </button>
);
