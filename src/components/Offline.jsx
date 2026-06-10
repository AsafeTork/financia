import React, { useState, useEffect } from 'react';

export default function Offline() {
  const [off, setOff] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOff(false);
    const off2 = () => setOff(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off2);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off2); };
  }, []);
  return off ? (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-semibold text-center py-2">
      Sem internet - alteracoes nao serao salvas
    </div>
  ) : null;
}
