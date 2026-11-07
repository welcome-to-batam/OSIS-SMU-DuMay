
import { db } from "./firebase.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const pengurusGrid = document.getElementById("pengurusGrid");

// Amankan teks agar tidak dianggap sebagai HTML
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Ambil dan tampilkan data pengurus
onValue(ref(db, "pengurus"), snapshot => {
  const data = snapshot.val();

  if (!data) {
    pengurusGrid.innerHTML = `
      <div class="empty">
        Belum ada data pengurus OSIS.
      </div>
    `;
    return;
  }

  
const urutanJabatan = [
  "ketua osis",
  "wakil ketua osis",
  "wakil ketua",
  "sekretaris",
  "wakil sekretaris",
  "bendahara",
  "wakil bendahara",
  "koordinator bidang",
  "ketua bidang"
];

function prioritasJabatan(jabatan) {
  const namaJabatan = String(jabatan || "")
    .toLowerCase()
    .trim();

  const index = urutanJabatan.findIndex(posisi =>
    namaJabatan.includes(posisi)
  );

  return index === -1 ? 100 : index;
}

const entries = Object.entries(data)
  .filter(([id, item]) => item.status === "aktif")
  .sort((a, b) => {
    const prioritasA = prioritasJabatan(a[1].jabatan);
    const prioritasB = prioritasJabatan(b[1].jabatan);

    if (prioritasA !== prioritasB) {
      return prioritasA - prioritasB;
    }

    return String(a[1].jabatan || "")
      .localeCompare(String(b[1].jabatan || ""), "id");
  });

  if (entries.length === 0) {
    pengurusGrid.innerHTML = `
      <div class="empty">
        Belum ada pengurus OSIS yang aktif.
      </div>
    `;
    return;
  }

  pengurusGrid.innerHTML = entries.map(([id, item], index) => {
    const photo =
      typeof item.fotoBase64 === "string" &&
      item.fotoBase64.startsWith("data:image/")
        ? item.fotoBase64
        : "";

    return `
      <a class="pengurus-card"
         href="profil-pengurus.html?id=${encodeURIComponent(id)}">

        <div class="crown">♛</div>

        <div class="photo-frame">
          ${
            photo
              ? `<img src="${photo}" alt="${escapeHTML(item.nama)}" loading="lazy">`
              : `<div class="no-photo">Foto belum tersedia</div>`
          }
        </div>

        <div class="rank">
          ${escapeHTML(item.jabatan || "Pengurus OSIS")}
        </div>

        <h3>${escapeHTML(item.nama || "Nama belum tersedia")}</h3>

        <p class="kelas">
          Kelas ${escapeHTML(item.kelas || "-")}
        </p>

      </a>
    `;
  }).join("");

}, error => {
  console.error("Gagal memuat pengurus:", error);

  pengurusGrid.innerHTML = `
    <div class="error">
      Gagal memuat data pengurus.<br>
      Silakan periksa koneksi internet.
    </div>
  `;
});
