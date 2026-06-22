import React from 'react';

const BG = { error: 'bg-red-600', warning: 'bg-amber-500', success: 'bg-emerald-600' };
const ICON = { error: 'X', warning: '!', success: 'v' };

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 anim-up pointer-events-none">
      <div className={'flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white ' + (BG[toast.type] || 'bg-gray-900')}>
        <span>{ICON[toast.type] || 'OK'}</span>{toast.msg}
      </div>
    </div>
  );
}
