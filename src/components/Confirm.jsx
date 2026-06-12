import React from 'react';

export default function Confirm({ msg, onOk, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl w-full max-w-xs p-6 flex flex-col gap-4" style={{boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <p className="text-sm text-gray-700 text-center leading-relaxed">{msg}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={onOk} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90">Confirmar</button>
        </div>
      </div>
    </div>
  );
}
