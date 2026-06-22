const CACHE = 'financia-v4';
const STATIC = ['/', '/manifest.json', '/icon-192.svg', '/icon-512.svg'];

// Avisa todas as abas o progresso do cache (alimenta a barra do banner).
function postProgress(pct) {
  return self.clients.matchAll({ includeUncontrolled: true }).then(function(cls) {
    cls.forEach(function(cl) { cl.postMessage({ type: 'CACHE_PROGRESS', pct: pct }); });
  });
}

self.addEventListener('install', function(e) {
  // Cacheia item a item reportando progresso. NAO chama skipWaiting:
  // o novo SW fica em espera ate o usuario clicar em "Atualizar".
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      var done = 0;
      function next(i) {
        if (i >= STATIC.length) return Promise.resolve();
        return c.add(STATIC[i]).catch(function() {}).then(function() {
          done++;
          return postProgress(Math.round((done / STATIC.length) * 100)).then(function() { return next(i + 1); });
        });
      }
      return next(0);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegacoes (HTML): network-first para sempre pegar a versao nova; cache no offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put('/', clone); });
        return res;
      }).catch(function() {
        return caches.match('/').then(function(c) { return c || caches.match(req); });
      })
    );
    return;
  }

  // Assets com hash (imutaveis): cache-first; busca rede se faltar e guarda
  if (url.pathname.indexOf('/assets/') === 0) {
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE).then(function(c) { c.put(req, clone); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Demais GET same-origin: network-first com fallback de cache
  e.respondWith(
    fetch(req).then(function(res) {
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, clone); });
      }
      return res;
    }).catch(function() { return caches.match(req); })
  );
});
