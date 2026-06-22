// Registro do service worker com atualizacao controlada pelo usuario.
// Em vez de recarregar sozinho (que falhava/atrapalhava em alguns dispositivos),
// emitimos eventos para a UI mostrar um banner com barra de progresso e botao.

var listeners = [];
var waitingSW = null;

// Inscreve a UI nos eventos de atualizacao. Retorna funcao para cancelar.
export function onSWUpdate(cb) {
  listeners.push(cb);
  return function() { listeners = listeners.filter(function(f) { return f !== cb; }); };
}

function emit(state) {
  for (var i = 0; i < listeners.length; i++) { listeners[i](state); }
}

// Chamado pela UI quando o usuario clica em "Atualizar".
export function applyUpdate() {
  if (waitingSW) waitingSW.postMessage({ type: 'SKIP_WAITING' });
}

function watchInstall(nw, reg) {
  if (!nw) return;
  emit({ status: 'downloading', pct: 10 });
  nw.addEventListener('statechange', function() {
    if (nw.state === 'installed' && reg.waiting) {
      waitingSW = reg.waiting;
      emit({ status: 'ready' });
    }
  });
}

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  // Troca de controlador = atualizacao aplicada -> recarrega uma unica vez.
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Progresso de cache reportado pelo proprio SW durante a instalacao.
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'CACHE_PROGRESS') {
      emit({ status: 'downloading', pct: e.data.pct });
    }
  });

  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    reg.update();

    // Atualizacao ja baixada enquanto o app estava fechado.
    if (reg.waiting && navigator.serviceWorker.controller) {
      waitingSW = reg.waiting;
      emit({ status: 'ready' });
    }

    reg.addEventListener('updatefound', function() {
      // So mostra banner se ja havia um SW controlando (e atualizacao, nao 1a instalacao).
      if (!navigator.serviceWorker.controller) return;
      watchInstall(reg.installing, reg);
    });

    setInterval(function() { reg.update(); }, 30 * 60 * 1000);
  }).catch(function() {});

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg) reg.update();
    });
  });
}
