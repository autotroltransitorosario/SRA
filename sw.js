/* Service worker SRA
   - App shell en caché para abrir sin conexión.
   - Los datos (Google Sheets, otro origen) NUNCA se cachean aquí: van siempre a la red,
     así las tablas están online y actualizadas. La app guarda su propia copia
     de respaldo solo para mostrar algo si se corta la conexión. */
const VERSION = 'sra-v27';
const SHELL = ['./', './index.html', './manifest.webmanifest', './logo.png', './logo-sra.png', './favicon.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // Google Sheets: directo a la red

  if (req.mode === 'navigate') {                        // HTML: red primero, caché de respaldo
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {     // sin caché HTTP: siempre la versión publicada
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(                                        // resto: caché y actualiza en segundo plano
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
