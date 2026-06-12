import React, { useState, useEffect } from 'react';

export default function Offline() {
  var [off, setOff] = useState(!navigator.onLine);
  useEffect(function() {
    var on = function() { setOff(false); };
    var off2 = function() { setOff(true); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off2);
    return function() {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off2);
    };
  }, []);
  return off ? (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-semibold text-center py-2">
      Sem internet - alteracoes nao serao salvas
    </div>
  ) : null;
}
