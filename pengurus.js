
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

// ELEMEN FORM
const form = document.getElementById("pengurusForm");
const namaInput = document.getElementById("pengurusNama");
const jabatanInput = document.getElementById("pengurusJabatan");
const kelasInput = document.getElementById("pengurusKelas");
const periodeInput = document.getElementById("pengurusPeriode");
const fotoInput = document.getElementById("pengurusFoto");
const preview = document.getElementById("pengurusPreview");
const submitButton = document.getElementById("pengurusSubmit");
const cancelButton = document.getElementById("pengurusCancel");
const pengurusList = document.getElementById("pengurusList");
const pengurusCount = document.querySelector(".pengurus-count");

let editingId = null;
let currentPhoto = "";
let previewURL = null;

// CEK ADMIN
function isAdmin() {
  return auth.currentUser?.uid === ADMIN_UID;
}

// AMANKAN TEKS HTML
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// KOMPRES FOTO DAN UBAH KE BASE64
async function preparePhoto(file) {
  if (!file) return "";

  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Ukuran foto asli maksimal 15 MB.");
  }

  const compressed = await compressImage(file);

  if (compressed.size > 400 * 1024) {
    throw new Error(
      "Foto masih terlalu besar setelah dikompres. Silakan pilih foto lain."
    );
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
      new Error("Gagal membaca foto.")
    );

    reader.readAsDataURL(compressed);
  });
}

// PRATINJAU FOTO
function clearPreviewURL() {
  if (previewURL) {
    URL.revokeObjectURL(previewURL);
    previewURL = null;
  }
}

fotoInput.addEventListener("change", () => {
  const file = fotoInput.files[0];

  clearPreviewURL();

  if (!file) {
    preview.src = currentPhoto || "";
    preview.style.display = currentPhoto ? "block" : "none";
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Pilih file gambar yang valid.");
    fotoInput.value = "";
    preview.src = currentPhoto || "";
    preview.style.display = currentPhoto ? "block" : "none";
    return;
  }

  previewURL = URL.createObjectURL(file);
  preview.src = previewURL;
  preview.style.display = "block";
});

// RESET FORM
function resetForm() {
  form.reset();

  editingId = null;
  currentPhoto = "";

  clearPreviewURL();

  preview.removeAttribute("src");
  preview.style.display = "none";

  fotoInput.required = true;
  submitButton.textContent = "Simpan Pengurus";

  cancelButton.style.display = "none";
}

// BATAL EDIT
cancelButton.addEventListener("click", resetForm);

// TAMPILKAN DATA PENGURUS
onValue(ref(db, "pengurus"), snapshot => {
  const data = snapshot.val();

  if (!data) {
    pengurusList.innerHTML = `
      <p style="text-align:center;padding:20px;color:#8492a6;">
        Belum ada data pengurus OSIS.
      </p>
    `;

    pengurusCount.textContent = "0";
    return;
  }

  const entries = Object.entries(data).reverse();

  pengurusCount.textContent = entries.length;

  pengurusList.innerHTML = entries.map(([id, item]) => {
    const photo =
      typeof item.fotoBase64 === "string" &&
      item.fotoBase64.startsWith("data:image/")
        ? item.fotoBase64
        : "";

    return `
      <div class="pengurus-item"
        style="display:flex;gap:14px;align-items:center;padding:14px;margin-bottom:12px;border:1px solid #e5eaf0;border-radius:12px;background:white;flex-wrap:wrap;">

        ${photo ? `
          <img src="${photo}"
            alt="${escapeHTML(item.nama)}"
            style="width:85px;height:85px;object-fit:cover;border-radius:12px;">
        ` : `
          <div style="width:85px;height:85px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#8492a6;border-radius:12px;">
            Tanpa Foto
          </div>
        `}

        <div style="flex:1;min-width:150px;">
          <h4 style="margin:0 0 6px;">
            ${escapeHTML(item.nama)}
          </h4>

          <p style="margin:4px 0;color:#2878e5;font-weight:700;">
            ${escapeHTML(item.jabatan)}
          </p>

          <p style="margin:4px 0;font-size:13px;color:#64748b;">
            Kelas: ${escapeHTML(item.kelas)}
          </p>

          <p style="margin:4px 0;font-size:13px;color:#64748b;">
            Periode: ${escapeHTML(item.periode)}
          </p>

          <div style="display:flex;gap:8px;margin-top:12px;">
            <button type="button"
              data-action="edit"
              data-id="${escapeHTML(id)}"
              style="background:#2878e5;color:white;border:0;padding:8px 13px;border-radius:8px;cursor:pointer;">
              Edit
            </button>

            <button type="button"
              data-action="delete"
              data-id="${escapeHTML(id)}"
              style="background:#e74c3c;color:white;border:0;padding:8px 13px;border-radius:8px;cursor:pointer;">
              Hapus
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
});

// TAMBAH DAN EDIT PENGURUS
form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const nama = namaInput.value.trim();
  const jabatan = jabatanInput.value.trim();
  const kelas = kelasInput.value.trim();
  const periode = periodeInput.value.trim();
  const imageFile = fotoInput.files[0];

  if (!nama || !jabatan || !kelas || !periode) {
    alert("Mohon lengkapi semua data pengurus.");
    return;
  }

  if (!editingId && !imageFile) {
    alert("Silakan pilih foto pengurus.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";

    const perubahan = {
      nama,
      jabatan,
      kelas,
      periode,
      terakhirDiubah: serverTimestamp()
    };

    if (imageFile) {
      perubahan.fotoBase64 = await preparePhoto(imageFile);
    }

    if (editingId) {
      await update(ref(db, "pengurus/" + editingId), perubahan);

      alert("Data pengurus berhasil diperbarui!");
    } else {
      await push(ref(db, "pengurus"), {
        ...perubahan,
        tanggalDibuat: serverTimestamp(),
        status: "aktif"
      });

      alert("Data pengurus berhasil ditambahkan!");
    }

    resetForm();

  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan data pengurus: " + error.message);

  } finally {
    submitButton.disabled = false;

    if (!editingId) {
      submitButton.textContent = "Simpan Pengurus";
    }
  }
});

// TOMBOL EDIT DAN HAPUS
pengurusList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const itemRef = ref(db, "pengurus/" + id);

  if (action === "edit") {
    try {
      const { get } = await import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js"
      );

      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        alert("Data pengurus tidak ditemukan.");
        return;
      }

      const item = snapshot.val();

      editingId = id;

      namaInput.value = item.nama || "";
      jabatanInput.value = item.jabatan || "";
      kelasInput.value = item.kelas || "";
      periodeInput.value = item.periode || "";

      currentPhoto = item.fotoBase64 || "";

      clearPreviewURL();

      preview.src = currentPhoto;
      preview.style.display = currentPhoto ? "block" : "none";

      fotoInput.required = false;
      submitButton.textContent = "Simpan Perubahan";
      cancelButton.style.display = "inline-block";

      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error(error);
      alert("Gagal membuka data pengurus: " + error.message);
    }
  }

  if (action === "delete") {
    const yakin = confirm(
      "Apakah kamu yakin ingin menghapus data pengurus ini?"
    );

    if (!yakin) return;

    try {
      await remove(itemRef);

      if (editingId === id) {
        resetForm();
      }

      alert("Data pengurus berhasil dihapus!");

    } catch (error) {
      console.error(error);
      alert("Gagal menghapus data pengurus: " + error.message);
    }
  }
});
    
