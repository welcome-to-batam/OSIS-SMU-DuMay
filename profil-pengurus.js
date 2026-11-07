
import { db } from "./firebase.js";

import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const profileContainer = document.getElementById("profileContainer");

// Amankan teks HTML
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Ambil ID pengurus dari alamat halaman
const params = new URLSearchParams(window.location.search);
const pengurusId = params.get("id");

// Tampilkan pesan jika ID tidak ditemukan
if (!pengurusId) {
  showError("Profil pengurus tidak ditemukan.");
} else {
  loadProfile();
}

// Tampilkan pesan kesalahan
function showError(message) {
  profileContainer.innerHTML = `
    <div class="profile-card error">
      ${escapeHTML(message)}
      <br><br>
      <a class="back" href="pengurus.html">
        Kembali ke Daftar Pengurus
      </a>
    </div>
  `;
}

// Ambil data profil dari Firebase
async function loadProfile() {
  try {
    const snapshot = await get(
      ref(db, "pengurus/" + pengurusId)
    );

    if (!snapshot.exists()) {
      showError("Data pengurus tidak ditemukan.");
      return;
    }

    const item = snapshot.val();

    if (item.status !== "aktif") {
      showError("Profil pengurus ini sudah tidak aktif.");
      return;
    }

    const photo =
      typeof item.fotoBase64 === "string" &&
      item.fotoBase64.startsWith("data:image/")
        ? item.fotoBase64
        : "";

    profileContainer.innerHTML = `
      <div class="profile-card">

        <div class="ornament">♛ ✦ ♛</div>

        ${
          photo
            ? `
              <div class="photo-frame">
                <img
                  src="${photo}"
                  alt="${escapeHTML(item.nama)}">
              </div>
            `
            : `
              <p>Foto pengurus belum tersedia.</p>
            `
        }

        <div class="rank">
          ${escapeHTML(item.jabatan || "Pengurus OSIS")}
        </div>

        <h1>${escapeHTML(item.nama || "Nama belum tersedia")}</h1>

        <p class="subtitle">
          Pengurus OSIS SMU DuMay
        </p>

        <div class="bio-section">
          <h3>BIODATA PENGURUS</h3>

          <div class="bio-row">
            <span class="bio-label">Nama Lengkap</span>
            <span class="bio-value">${escapeHTML(item.nama || "-")}</span>
          </div>

          <div class="bio-row">
            <span class="bio-label">Jabatan</span>
            <span class="bio-value">${escapeHTML(item.jabatan || "-")}</span>
          </div>

          <div class="bio-row">
            <span class="bio-label">Kelas</span>
            <span class="bio-value">${escapeHTML(item.kelas || "-")}</span>
          </div>

          <div class="bio-row">
            <span class="bio-label">Periode</span>
            <span class="bio-value">${escapeHTML(item.periode || "-")}</span>
          </div>

          <div class="bio-row">
            <span class="bio-label">Biodata</span>
            <span class="bio-value">${escapeHTML(item.biodata || "Biodata belum ditambahkan.")}</span>
          </div>
        </div>

      </div>
    `;

    document.title =
      (item.nama || "Profil Pengurus") + " - OSIS SMU DuMay";

  } catch (error) {
    console.error("Gagal memuat profil:", error);
    showError("Gagal memuat profil. Periksa koneksi internet.");
  }
}
