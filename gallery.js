
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
const form = document.getElementById("galleryForm");
const titleInput = document.getElementById("galleryTitle");
const descriptionInput = document.getElementById("galleryDescription");
const imageInput = document.getElementById("galleryImage");
const preview = document.getElementById("galleryPreview");

const submitButton = document.getElementById("gallerySubmit");
const galleryList = document.getElementById("galleryList");
const galleryCount = document.getElementById("galleryCount");

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

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  clearPreviewURL();

  if (!file) {
    preview.src = currentPhoto || "";
    preview.style.display = currentPhoto ? "block" : "none";
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Pilih file gambar yang valid.");
    imageInput.value = "";
    preview.src = currentPhoto || "";
    return;
  }

  previewURL = URL.createObjectURL(file);
  preview.src = previewURL;
  preview.style.display = "block";
});

// TOMBOL BATAL EDIT
function showCancelButton() {
  if (document.getElementById("cancelGalleryEdit")) return;

  const button = document.createElement("button");

  button.type = "button";
  button.id = "cancelGalleryEdit";
  button.textContent = "Batal Edit";

  button.style.cssText = `
    margin-top:10px;
    margin-left:8px;
    padding:12px 18px;
    border:0;
    border-radius:8px;
    background:#edf1f6;
    color:#475569;
    font-weight:700;
    cursor:pointer;
  `;

  button.addEventListener("click", resetForm);

  submitButton.insertAdjacentElement("afterend", button);
}

// RESET FORM
function resetForm() {
  form.reset();

  editingId = null;
  currentPhoto = "";

  clearPreviewURL();

  preview.removeAttribute("src");
  preview.style.display = "none";

  imageInput.required = true;

  submitButton.textContent = "Simpan Dokumentasi";

  const cancelButton = document.getElementById("cancelGalleryEdit");

  if (cancelButton) cancelButton.remove();
}

// TAMPILKAN GALERI DARI FIREBASE
onValue(ref(db, "galeri"), snapshot => {
  const data = snapshot.val();

  if (!data) {
    galleryList.innerHTML = `
      <p style="text-align:center;padding:20px;color:#8492a6;grid-column:1/-1;">
        Belum ada dokumentasi foto.
      </p>
    `;

    galleryCount.textContent = "0";
    return;
  }

  const entries = Object.entries(data).reverse();

  galleryCount.textContent = entries.length;

  galleryList.innerHTML = entries.map(([id, item]) => {
    const photo = typeof item.fotoBase64 === "string" &&
      item.fotoBase64.startsWith("data:image/")
      ? item.fotoBase64
      : "";

    return `
      <div class="gallery-item"
        style="border:1px solid #e5eaf0;border-radius:12px;overflow:hidden;background:white;">

        ${photo ? `
          <img src="${photo}"
            alt="${escapeHTML(item.judul)}"
            style="width:100%;height:150px;object-fit:cover;">
        ` : `
          <div style="height:150px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#8492a6;">
            Foto tidak tersedia
          </div>
        `}

        <div style="padding:13px;">
          <h4 style="margin:0 0 8px;">
            ${escapeHTML(item.judul)}
          </h4>

          <p style="font-size:13px;color:#64748b;margin:0 0 10px;">
            ${escapeHTML(item.keterangan)}
          </p>

          <small style="color:#94a3b8;">
            ${escapeHTML(item.tanggal || "")}
          </small>

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

// TAMBAH DOKUMENTASI
form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const judul = titleInput.value.trim();
  const keterangan = descriptionInput.value.trim();
  const imageFile = imageInput.files[0];

  if (!judul || !keterangan) {
    alert("Judul dan keterangan wajib diisi.");
    return;
  }

  if (!editingId && !imageFile) {
    alert("Silakan pilih foto dokumentasi.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";

    const perubahan = {
      judul,
      keterangan,
      terakhirDiubah: serverTimestamp()
    };

    if (imageFile) {
      perubahan.fotoBase64 = await preparePhoto(imageFile);
    }

    if (editingId) {
      await update(ref(db, "galeri/" + editingId), perubahan);

      alert("Dokumentasi berhasil diperbarui!");

    } else {
      await push(ref(db, "galeri"), {
        ...perubahan,
        tanggal: new Date().toLocaleString("id-ID"),
        tanggalDibuat: serverTimestamp(),
        status: "aktif"
      });

      alert("Dokumentasi berhasil disimpan!");
    }

    resetForm();

  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan dokumentasi: " + error.message);

  } finally {
    submitButton.disabled = false;

    if (!editingId) {
      submitButton.textContent = "Simpan Dokumentasi";
    }
  }
});

// TOMBOL EDIT DAN HAPUS
galleryList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const itemRef = ref(db, "galeri/" + id);

  // EDIT DOKUMENTASI
  if (action === "edit") {
    try {
      const { get } = await import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js"
      );

      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        alert("Dokumentasi tidak ditemukan.");
        return;
      }

      const item = snapshot.val();

      editingId = id;
      currentPhoto = item.fotoBase64 || "";

      titleInput.value = item.judul || "";
      descriptionInput.value = item.keterangan || "";

      preview.src = currentPhoto;
      preview.style.display = currentPhoto ? "block" : "none";

      imageInput.value = "";
      imageInput.required = false;

      submitButton.textContent = "Simpan Perubahan";

      showCancelButton();

      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error(error);
      alert("Gagal membuka dokumentasi: " + error.message);
    }
  }

  // HAPUS DOKUMENTASI
  if (action === "delete") {
    const yakin = confirm(
      "Apakah kamu yakin ingin menghapus dokumentasi ini?"
    );

    if (!yakin) return;

    try {
      await remove(itemRef);

      if (editingId === id) {
        resetForm();
      }

      alert("Dokumentasi berhasil dihapus!");

    } catch (error) {
      console.error(error);
      alert("Gagal menghapus dokumentasi: " + error.message);
    }
  }
});
  
