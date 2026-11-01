const CACHE_NAME = 'osis-dumay-v27';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './manifest.json'
  './logo-osis.jpg' // Tambahkan baris ini
  './icon-192.png', // Tambahkan ikon baru Anda di sini
  './icon-512.png'  // Tambahkan ikon baru Anda di sini
  './banner.png' // Daftarkan berkas banner di sini
  './kegiatan-terbaru.jpg' // Tambahkan berkas foto ini
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
