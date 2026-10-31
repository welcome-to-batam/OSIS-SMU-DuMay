
import { db, auth } from "./firebase.js";
import {
  ref,
  push,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const form = document.getElementById("newsForm");
const publishButton = document.querySelector(".btn-publish");
const newsList = document.querySelector(".news-empty");
const newsCount = document.querySelector(".news-count");

if (form && publishButton) {
  publishButton.disabled = false;

  // Tampilkan berita yang tersimpan di Firebase
  onValue(ref(db, "berita"), (snapshot) => {
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

    newsList.innerHTML = entries.map(([id, news]) => `
      <div class="news-item">
        <h3>${escapeHTML(news.judul)}</h3>
        <p>${escapeHTML(news.kategori)}</p>
        <p>${escapeHTML(news.isi)}</p>
        <small>${news.tanggal || ""}</small>
      </div>
    `).join("");
  });

  // Simpan berita baru
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!auth.currentUser ||
        auth.currentUser.uid !== "HWQfLxdBkqNWNdeCxec0PD3ddBJ2") {
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

    if (foto) {
      alert("Fitur kompresi dan penyimpanan foto akan kita aktifkan pada tahap berikutnya. Untuk sementara, simpan berita tanpa foto.");
      return;
    }

    publishButton.disabled = true;
    publishButton.textContent = "Menyimpan...";

    try {
      await push(ref(db, "berita"), {
        judul,
        kategori,
        isi,
        fotoURL: "",
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
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
