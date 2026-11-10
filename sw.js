
const CACHE_NAME = 'osis-dumay-v60';

const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './manifest.json',
  './logo-osis.jpg',
  './icon-192.png',
  './icon-512.png',
  './banner.png',
  './kegiatan-terbaru.jpg'
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

// =====================================
// FIREBASE CLOUD MESSAGING
// =====================================

importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyB4PC6RCkq6D9RQ18WiDaC1K9fJpL1J4Fg",
  authDomain: "osis-smu-dumay.firebaseapp.com",
  databaseURL: "https://osis-smu-dumay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "osis-smu-dumay",
  messagingSenderId: "1006411216895",
  appId: "1:1006411216895:web:6b62afafed1f32ff3359ca"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.notification?.title || "Aspirasi Baru - OSIS SMU DuMay";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "Ada aspirasi siswa baru yang masuk.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: {
      url: payload.data?.url || "./admin.html"
    }
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || "./admin.html";

  event.waitUntil(
    clients.openWindow(targetUrl)
  );
});
