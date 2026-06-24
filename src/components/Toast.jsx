import React from 'react';

const BG = { error: 'bg-red-600', warning: 'bg-amber-500', success: 'bg-emerald-600' };
const ICON = {
  error:   React.createElement('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2.5', strokeLinecap:'round'}, React.createElement('path', {d:'M18 6L6 18M6 6l12 12'})),
  warning: React.createElement('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2.5', strokeLinecap:'round', strokeLinejoin:'round'}, React.createElement('path', {d:'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'})),
  success: React.createElement('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2.5', strokeLinecap:'round'}, React.createElement('path', {d:'M5 13l4 4L19 7'})),
};

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || !toasts.length) return null;
  var visible = toasts.slice(-4);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
      {visible.map(function(t) {
        return (
          <button
            key={t.id}
            onClick={function() { if (onDismiss) onDismiss(t.id); }}
            className={'pointer-events-auto anim-up flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white w-full justify-center ' + (BG[t.type] || 'bg-gray-900')}
          >
            <span className="flex-shrink-0">{ICON[t.type] || 'OK'}</span>
            <span className="truncate">{t.msg}</span>
          </button>
        );
      })}
    </div>
  );
}
