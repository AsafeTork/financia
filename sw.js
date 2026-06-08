const CACHE = 'nancia-v3';
const BRAND_CACHE = 'nancia-brand';
const URLS_TO_CACHE = ['/', '/icon-192.svg', '/icon-512.svg'];

// ── Instala e cacheia ───────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== BRAND_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Recebe atualizações de marca do app ─────────────────────────────────────
self.addEventListener('message', async e => {
  if (e.data && e.data.type === 'UPDATE_BRAND') {
    const cache = await caches.open(BRAND_CACHE);
    await cache.put('/_brand', new Response(JSON.stringify({
      name: e.data.name || 'Nancia',
      logo_url: e.data.logo_url || null,
      color: e.data.color || '#002f59',
    }), { headers: { 'Content-Type': 'application/json' } }));
  }
});

// ── Gera manifest dinamico com logo/nome atuais ─────────────────────────────
async function dynamicManifest() {
  let name = 'Nancia', logo_url = null, color = '#002f59';
  try {
    const cache = await caches.open(BRAND_CACHE);
    const resp = await cache.match('/_brand');
    if (resp) { const d = await resp.json(); name = d.name||name; logo_url = d.logo_url; color = d.color||color; }
  } catch(_) {}

  const iconSrc = logo_url || '/icon-512.svg';
  const iconType = iconSrc.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

  const manifest = {
    name,
    short_name: name.length > 12 ? name.split(' ')[0] : name,
    description: 'Gestao financeira para pequenas empresas',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: color,
    theme_color: color,
    icons: [
      { src: iconSrc, sizes: '192x192', type: iconType },
      { src: iconSrc, sizes: '512x512', type: iconType, purpose: 'any maskable' },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache',
    },
  });
}

// ── Intercepta fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Manifest dinamico
  if (url.pathname === '/manifest.json') {
    e.respondWith(dynamicManifest());
    return;
  }

  // Network-first com fallback para cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok && e.request.method === 'GET' && !url.pathname.startsWith('/rest/')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
