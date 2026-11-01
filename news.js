import { db, auth } from "./firebase.js";
import {
  ref,
  push,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import { compressImage } from "./image-compressor.js";

const ADMIN_UID = "HWQfLxdBkqNWNdeCxec0PD3ddBJ2";

const form = document.getElementById("newsForm");
const publishButton = document.querySelector(".btn-publish");
const newsList = document.querySelector(".news-empty");
const newsCount = document.querySelector(".news-count");

// Mengubah foto menjadi Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
      new Error("Gagal membaca foto.")
    );

    reader.readAsDataURL(file);
  });
}

// Mengamankan teks sebelum ditampilkan
function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Menampilkan berita dari Firebase
if (form && publishButton) {

  publishButton.disabled = false;

  onValue(ref(db, "berita"), snapshot => {
    const data = snapshot.val() || {};
    const entries = Object.entries(data).reverse();

    if (newsCount) {
      newsCount.textContent = `${entries.length} Berita`;
    }

    if (!newsList) return;

    if (entries.length === 0) {
      newsList.textContent = "Belum ada berita.";
      return;
    }

    newsList.innerHTML = entries.map(([id, news]) => {

      const photo = news.fotoBase64 &&
        news.fotoBase64.startsWith("data:image/jpeg;base64,")
        ? `<img src="${news.fotoBase64}"
             alt="Foto berita"
             style="width:100%;max-width:320px;height:auto;
             border-radius:10px;margin:10px 0;">`
        : "";

      return `
        <div class="news-item">
          <h3>${escapeHTML(news.judul)}</h3>
          <p>${escapeHTML(news.kategori)}</p>
          ${photo}
          <p>${escapeHTML(news.isi)}</p>
          <small>${escapeHTML(news.tanggal)}</small>
        </div>
      `;
    }).join("");
  });

  // Tombol Publikasikan Berita
  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!auth.currentUser ||
        auth.currentUser.uid !== ADMIN_UID) {
      alert("Silakan login sebagai admin.");
      return;
    }

    const judul = document.getElementById("newsTitle")
      .value.trim();

    const kategori = document.getElementById("newsCategory")
      .value;

    const isi = document.getElementById("newsContent")
      .value.trim();

    const foto = document.getElementById("newsImage")
      .files[0];

    if (!judul || !isi) {
      alert("Judul dan isi berita wajib diisi.");
      return;
    }

    publishButton.disabled = true;
    publishButton.textContent = "Memproses...";

    try {
      let fotoBase64 = "";

      // Kompres foto jika pengguna memilih foto
      if (foto) {

        if (foto.size > 15 * 1024 * 1024) {
          throw new Error(
            "Foto asli terlalu besar. Maksimal 15 MB."
          );
        }

        const compressed = await compressImage(foto, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.75
        });

        // Batasi hasil kompresi maksimal 400 KB
        if (compressed.size > 400 * 1024) {
          throw new Error(
            "Ukuran foto setelah kompresi masih terlalu besar. Gunakan foto lain."
          );
        }

        fotoBase64 = await fileToBase64(compressed);
      }

      publishButton.textContent = "Menyimpan berita...";

      await push(ref(db, "berita"), {
        judul: judul,
        kategori: kategori,
        isi: isi,
        fotoBase64: fotoBase64,
        tanggal: new Date().toLocaleString("id-ID"),
        tanggalDibuat: serverTimestamp(),
        status: "terbit"
      });

      alert("Berita berhasil dipublikasikan!");

      form.reset();

    } catch (error) {
      console.error("Kesalahan berita:", error);
      alert("Gagal menyimpan berita: " + error.message);
    }

    publishButton.disabled = false;
    publishButton.textContent = "Publikasikan Berita";
  });
}
