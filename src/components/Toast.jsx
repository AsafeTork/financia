import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 anim-up pointer-events-none">
      <div className={'flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white ' + (toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900')}>
        <span>{toast.type === 'error' ? 'X' : 'OK'}</span>{toast.msg}
      </div>
    </div>
  );
}
