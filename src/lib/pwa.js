// Registro do service worker com atualizacao confiavel.
// Em alguns dispositivos (PWA instalado, iOS) o app ficava preso na versao
// antiga: faltava detectar o novo SW e recarregar. Aqui forcamos a troca.

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  // Se a pagina ja esta sob controle de um SW, qualquer troca de controlador
  // a partir daqui significa atualizacao -> recarrega uma unica vez.
  // Na primeira instalacao (sem controller) nao recarrega, evitando reload a toa.
  if (navigator.serviceWorker.controller) {
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    reg.update();

    reg.addEventListener('updatefound', function() {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function() {
        if (nw.state === 'installed' && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Re-checa atualizacao periodicamente enquanto o app fica aberto.
    setInterval(function() { reg.update(); }, 30 * 60 * 1000);
  }).catch(function() {});

  // Checa atualizacao sempre que o app volta ao foco.
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg) reg.update();
    });
  });
}
