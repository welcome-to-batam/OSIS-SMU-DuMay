
import { getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getMessaging, getToken, deleteToken, onMessage, isSupported
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";

// Public VAPID Key dari Firebase Console
const VAPID_KEY = "BNT7tql1kVYfHVSCWka_N3uOWhZ6a7fc8LEXFxJXHoTkdo-0YCZ2xh8EVY32ZGPNXeB4eZp0d06COlv5rN-9Sbs";

// Mengaktifkan notifikasi pada perangkat admin
export async function aktifkanNotifikasiAdmin() {
  try {
    if (!("Notification" in window)) {
      throw new Error("Browser tidak mendukung notifikasi.");
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker tidak didukung.");
    }

    const supported = await isSupported();

    if (!supported) {
      throw new Error("Firebase Messaging tidak didukung browser ini.");
    }

    if (VAPID_KEY === "TEMPEL_PUBLIC_VAPID_KEY_DI_SINI") {
  throw new Error("VAPID Key belum diisi.");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }

    const registration = await navigator.serviceWorker.register(
  "./sw.js"
);
    
    const messaging = getMessaging(getApp());

// Hapus token lama yang sudah tidak berlaku
await deleteToken(messaging);

// Buat token FCM baru
const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error("Token notifikasi gagal dibuat.");
    }

    console.log("Notifikasi admin berhasil diaktifkan.");

    return token;

  } catch (error) {
    console.error("Gagal mengaktifkan notifikasi:", error);
    throw error;
  }
}

// Menerima pesan ketika halaman sedang terbuka
export async function dengarkanNotifikasiAdmin(callback) {
  const supported = await isSupported();

  if (!supported) {
    throw new Error("Firebase Messaging tidak didukung.");
  }

  const messaging = getMessaging(getApp());

  return onMessage(messaging, (payload) => {
    console.log("Notifikasi baru:", payload);

    if (typeof callback === "function") {
      callback(payload);
    }
  });
}
