// Guarda la app en el celular para que abra sin internet.
// Las voces no pasan por aquí: la app las guarda aparte (IndexedDB) al descargarlas.
const VERSION = "9c5df07b7c41";
const CACHE = 'escucha-' + VERSION;
const ARCHIVOS = [
 "./",
 "voz-worker.js",
 "manifest.webmanifest",
 "ort/ort.wasm-core.min.js",
 "ort/ort-wasm-simd.wasm",
 "iconos/icono-192.png",
 "iconos/apple-touch-icon.png",
 "iconos/favicon-64.png",
 "phon/datos-espeak.wasm",
 "phon/piper_phonemize.js",
 "phon/piper_phonemize.wasm",
 "fuentes/Jost-latin-ext.woff2",
 "fuentes/Jost-latin.woff2",
 "fuentes/Lato-latin-400.woff2",
 "fuentes/Lato-latin-700.woff2",
 "fuentes/Lato-latin-900.woff2",
 "fuentes/Lato-latin-ext-400.woff2",
 "fuentes/Lato-latin-ext-700.woff2",
 "fuentes/Lato-latin-ext-900.woff2",
 "fuentes/fuentes.css",
 "lib/pdfjs-dist@3.11.174/build/pdf.min.js",
 "lib/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
 "lib/mammoth@1.6.0/mammoth.browser.min.js",
 "lib/jszip@3.10.1/dist/jszip.min.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('escucha-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/voces/')) return;
  // La página: primero internet (para recibir versiones nuevas) y, sin conexión, la copia guardada.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('./', copia)); } return r; })
        .catch(() => caches.match('./'))
    );
    return;
  }
  // Lo demás: la copia guardada y, si no está, internet (y se guarda para la próxima).
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((guardado) => guardado || fetch(e.request).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
      return r;
    }))
  );
});
