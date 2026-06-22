import React from 'react';

export default function Confirm({ msg, onOk, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{background:'rgba(15,23,42,0.55)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)'}}>
      <div className="rounded-2xl w-full max-w-xs p-6 flex flex-col gap-4 anim-scale" style={{background:'var(--bg-card)', boxShadow:'var(--shadow-lg)'}}>
        <p className="text-sm text-center leading-relaxed" style={{color:'var(--text-main)'}}>{msg}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={onOk} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700">Confirmar</button>
        </div>
      </div>
    </div>
  );
}
