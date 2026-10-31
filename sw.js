const CACHE_NAME = 'osis-dumay-v8';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './manifest.json'
  './logo-osis.jpg' // Tambahkan baris ini
  './icon-192.png', // Tambahkan ikon baru Anda di sini
  './icon-512.png'  // Tambahkan ikon baru Anda di sini
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
