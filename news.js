
import { db, auth } from "./firebase.js";

import {
  ref,
  push,
  get,
  onValue,
  update,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import { compressImage } from "./image-compressor.js";

const ADMIN_UID = "HWQfLxdBkqNWNdeCxec0PD3ddBJ2";

// FORM TAMBAH BERITA
const form = document.getElementById("newsForm");
const publishButton = document.querySelector(".btn-publish");

// DAFTAR BERITA
const newsList = document.querySelector(".news-empty");
const newsCount = document.querySelector(".news-count");

// MODAL EDIT
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editNewsForm");
const editTitle = document.getElementById("editTitle");
const editCategory = document.getElementById("editCategory");
const editContent = document.getElementById("editContent");
const editImage = document.getElementById("editImage");
const editPhotoPreview = document.getElementById("editPhotoPreview");

const closeEditModal = document.getElementById("closeEditModal");
const cancelEdit = document.getElementById("cancelEdit");
const saveEdit = document.getElementById("saveEdit");

let currentEditingId = null;
let currentPhoto = "";

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

// KONVERSI FOTO KE BASE64
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

// KOMPRES FOTO
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
      "Foto masih terlalu besar setelah dikompres. Gunakan foto lain."
    );
  }

  return await fileToBase64(compressed);
}

// TUTUP MODAL
function hideEditModal() {
  editModal.classList.remove("show");
  editForm.reset();

  currentEditingId = null;
  currentPhoto = "";

  editPhotoPreview.removeAttribute("src");
}

// TOMBOL BATAL DAN TUTUP
closeEditModal.addEventListener("click", hideEditModal);
cancelEdit.addEventListener("click", hideEditModal);

// KLIK DI LUAR MODAL
editModal.addEventListener("click", event => {
  if (event.target === editModal) {
    hideEditModal();
  }
});

// PRATINJAU FOTO BARU
editImage.addEventListener("change", async () => {
  const file = editImage.files[0];

  if (!file) {
    editPhotoPreview.src = currentPhoto;
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Pilih file gambar yang valid.");
    editImage.value = "";
    editPhotoPreview.src = currentPhoto;
    return;
  }

  const objectURL = URL.createObjectURL(file);
  editPhotoPreview.src = objectURL;
});

// AMBIL DAN TAMPILKAN BERITA DARI FIREBASE
onValue(ref(db, "berita"), snapshot => {
  if (!newsList) return;

  const data = snapshot.val();

  if (!data) {
    newsList.innerHTML = `
      <p style="text-align:center;padding:25px;color:#8492a6;">
        Belum ada berita yang diterbitkan.
      </p>
    `;

    if (newsCount) newsCount.textContent = "0";
    return;
  }

  const entries = Object.entries(data).reverse();

  if (newsCount) {
    newsCount.textContent = entries.length;
  }

  newsList.innerHTML = entries.map(([id, item]) => {
    const photo = typeof item.fotoBase64 === "string" &&
      item.fotoBase64.startsWith("data:image/")
      ? `<img src="${item.fotoBase64}"
          alt="Foto berita"
          style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin:10px 0;">`
      : "";

    return `
      <div class="news-item"
        style="padding:15px;margin-bottom:15px;border:1px solid #e5eaf0;border-radius:12px;">

        <h3>${escapeHTML(item.judul)}</h3>

        <small style="color:#2878e5;">
          ${escapeHTML(item.kategori)}
        </small>

        ${photo}

        <p>${escapeHTML(item.isi)}</p>

        <small style="color:#8492a6;">
          ${escapeHTML(item.tanggal || "")}
        </small>

        <div style="display:flex;gap:8px;margin-top:12px;">

          <button type="button"
            data-action="edit"
            data-id="${escapeHTML(id)}"
            style="background:#2878e5;color:white;border:0;padding:9px 16px;border-radius:8px;cursor:pointer;">
            Edit
          </button>

          <button type="button"
            data-action="delete"
            data-id="${escapeHTML(id)}"
            style="background:#e74c3c;color:white;border:0;padding:9px 16px;border-radius:8px;cursor:pointer;">
            Hapus
          </button>

        </div>
      </div>
    `;
  }).join("");

});

// TAMBAH BERITA BARU
form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    alert("Akses admin tidak ditemukan. Silakan login kembali.");
    return;
  }

  const judul = document.getElementById("newsTitle").value.trim();
  const kategori = document.getElementById("newsCategory").value;
  const isi = document.getElementById("newsContent").value.trim();
  const imageFile = document.getElementById("newsImage").files[0];

  if (!judul || !isi) {
    alert("Judul dan isi berita wajib diisi.");
    return;
  }

  try {
    publishButton.disabled = true;
    publishButton.textContent = "Menyimpan...";

    let fotoBase64 = "";

    if (imageFile) {
      fotoBase64 = await preparePhoto(imageFile);
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

  } finally {
    publishButton.disabled = false;
    publishButton.textContent = "Publikasikan Berita";
  }
});

// TOMBOL EDIT DAN HAPUS
newsList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;

  const itemRef = ref(db, "berita/" + id);

  // EDIT BERITA
  if (action === "edit") {
    try {
      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        alert("Berita tidak ditemukan.");
        return;
      }

      const item = snapshot.val();

      currentEditingId = id;
      currentPhoto = item.fotoBase64 || "";

      editTitle.value = item.judul || "";
      editCategory.value = item.kategori || "Pengumuman";
      editContent.value = item.isi || "";

      if (currentPhoto.startsWith("data:image/")) {
        editPhotoPreview.src = currentPhoto;
      } else {
        editPhotoPreview.removeAttribute("src");
      }

      editImage.value = "";

      editModal.classList.add("show");

    } catch (error) {
      console.error(error);
      alert("Gagal membuka berita: " + error.message);
    }
  }

  // HAPUS BERITA
  if (action === "delete") {
    const yakin = confirm(
      "Apakah kamu yakin ingin menghapus berita ini?"
    );

    if (!yakin) return;

    try {
      await remove(itemRef);
      alert("Berita berhasil dihapus!");

    } catch (error) {
      console.error(error);
      alert("Gagal menghapus berita: " + error.message);
    }
  }
});

// SIMPAN PERUBAHAN EDIT
editForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin() || !currentEditingId) {
    alert("Sesi admin tidak valid.");
    return;
  }

  const judul = editTitle.value.trim();
  const kategori = editCategory.value;
  const isi = editContent.value.trim();
  const imageFile = editImage.files[0];

  if (!judul || !isi) {
    alert("Judul dan isi berita wajib diisi.");
    return;
  }

  try {
    saveEdit.disabled = true;
    saveEdit.textContent = "Menyimpan...";

    const perubahan = {
      judul,
      kategori,
      isi,
      tanggal: new Date().toLocaleString("id-ID"),
      terakhirDiubah: serverTimestamp()
    };

    // FOTO HANYA DIPERBARUI JIKA ADA FOTO BARU
    if (imageFile) {
      perubahan.fotoBase64 = await preparePhoto(imageFile);
    }

    await update(
      ref(db, "berita/" + currentEditingId),
      perubahan
    );

    alert("Perubahan berita berhasil disimpan!");

    hideEditModal();

  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan perubahan: " + error.message);

  } finally {
    saveEdit.disabled = false;
    saveEdit.textContent = "Simpan Perubahan";
  }
});
                      
