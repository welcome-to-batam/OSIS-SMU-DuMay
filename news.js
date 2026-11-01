
import { db, auth } from "./firebase.js";

import {
  ref,
  push,
  onValue,
  update,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import { compressImage } from "./image-compressor.js";

const ADMIN_UID = "HWQfLxdBkqNWNdeCxec0PD3ddBJ2";

const form = document.getElementById("newsForm");
const publishButton = document.querySelector(".btn-publish");
const newsList = document.querySelector(".news-empty");
const newsCount = document.querySelector(".news-count");

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca foto."));
    reader.readAsDataURL(file);
  });
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function isAdmin() {
  return auth.currentUser &&
    auth.currentUser.uid === ADMIN_UID;
}

// MEMBACA DAN MENAMPILKAN BERITA
if (form && publishButton && newsList) {

  publishButton.disabled = false;

  onValue(ref(db, "berita"), snapshot => {
    const data = snapshot.val() || {};
    const entries = Object.entries(data).reverse();

    if (newsCount) {
      newsCount.textContent = `${entries.length} Berita`;
    }

    if (entries.length === 0) {
      newsList.innerHTML = "Belum ada berita.";
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
        <div class="news-item"
             style="padding:15px;margin:12px 0;
             border:1px solid #ddd;border-radius:12px;">

          <h3>${escapeHTML(news.judul)}</h3>

          <p>${escapeHTML(news.kategori)}</p>

          ${photo}

          <p>${escapeHTML(news.isi)}</p>

          <small>${escapeHTML(news.tanggal)}</small>

          <div style="display:flex;gap:10px;margin-top:15px;">

            <button type="button"
              data-action="edit"
              data-id="${escapeHTML(id)}"
              style="padding:9px 16px;border:0;
              border-radius:7px;background:#1976d2;color:white;">
              Edit
            </button>

            <button type="button"
              data-action="delete"
              data-id="${escapeHTML(id)}"
              style="padding:9px 16px;border:0;
              border-radius:7px;background:#dc3545;color:white;">
              Hapus
            </button>

          </div>
        </div>
      `;
    }).join("");
  });

  // MENAMBAHKAN BERITA BARU
  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isAdmin()) {
      alert("Silakan login sebagai admin.");
      return;
    }

    const judul = document.getElementById("newsTitle").value.trim();
    const kategori = document.getElementById("newsCategory").value;
    const isi = document.getElementById("newsContent").value.trim();
    const foto = document.getElementById("newsImage").files[0];

    if (!judul || !isi) {
      alert("Judul dan isi berita wajib diisi.");
      return;
    }

    publishButton.disabled = true;
    publishButton.textContent = "Memproses...";

    try {
      let fotoBase64 = "";

      if (foto) {
        if (foto.size > 15 * 1024 * 1024) {
          throw new Error("Foto asli maksimal 15 MB.");
        }

        const compressed = await compressImage(foto, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.75
        });

        if (compressed.size > 400 * 1024) {
          throw new Error("Hasil kompresi foto masih lebih dari 400 KB.");
        }

        fotoBase64 = await fileToBase64(compressed);
      }

      await push(ref(db, "berita"), {
        judul,
        kategori,
        isi,
        fotoBase64,
        tanggal: new Date().toLocaleString("id-ID"),
        tanggalDibuat: serverTimestamp(),
        status: "terbit"
      });

      alert("Berita berhasil dipublikasikan!");
      form.reset();

    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan berita: " + error.message);
    }

    publishButton.disabled = false;
    publishButton.textContent = "Publikasikan Berita";
  });

  // TOMBOL EDIT DAN HAPUS
  newsList.addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    if (!isAdmin()) {
      alert("Akses admin diperlukan.");
      return;
    }

    const id = button.dataset.id;
    const action = button.dataset.action;
    const itemRef = ref(db, "berita/" + id);

    if (action === "edit") {

      const snapshot = await new Promise((resolve, reject) => {
        onValue(itemRef, resolve, reject, { onlyOnce: true });
      });

      const news = snapshot.val();

      if (!news) {
        alert("Berita tidak ditemukan.");
        return;
      }

      const judul = prompt("Edit judul berita:", news.judul);
      if (judul === null) return;

      const kategori = prompt("Edit kategori berita:", news.kategori);
      if (kategori === null) return;

      const isi = prompt("Edit isi berita:", news.isi);
      if (isi === null) return;

      if (!judul.trim() || !isi.trim()) {
        alert("Judul dan isi berita tidak boleh kosong.");
        return;
      }

      try {
        await update(itemRef, {
          judul: judul.trim(),
          kategori: kategori.trim(),
          isi: isi.trim(),
          tanggal: new Date().toLocaleString("id-ID"),
          terakhirDiubah: serverTimestamp()
        });

        alert("Berita berhasil diperbarui. Foto tetap tersimpan.");

      } catch (error) {
        console.error(error);
        alert("Gagal mengedit berita: " + error.message);
      }
    }

    if (action === "delete") {

      const yakin = confirm(
        "Yakin ingin menghapus berita ini beserta fotonya?"
      );

      if (!yakin) return;

      try {
        await remove(itemRef);
        alert("Berita berhasil dihapus.");

      } catch (error) {
        console.error(error);
        alert("Gagal menghapus berita: " + error.message);
      }
    }
  });
}
