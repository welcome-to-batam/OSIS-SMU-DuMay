import { db, auth } from "./firebase.js";

import {
  ref,
  push,
  onValue,
  update,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const ADMIN_UID = "HWQfLxdBkqNWNdeCxec0PD3ddBJ2";

// ELEMEN FORM
const form = document.getElementById("agendaForm");
const titleInput = document.getElementById("agendaTitle");
const categoryInput = document.getElementById("agendaCategory");
const dateInput = document.getElementById("agendaDate");
const timeInput = document.getElementById("agendaTime");
const locationInput = document.getElementById("agendaLocation");
const descriptionInput = document.getElementById("agendaDescription");

const submitButton = document.getElementById("agendaSubmit");
const agendaList = document.getElementById("agendaList");
const agendaCount = document.querySelector(".agenda-count");

let editingId = null;

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

// RESET FORM
function resetAgendaForm() {
  form.reset();
  editingId = null;

  submitButton.textContent = "Simpan Agenda";

  const cancelButton = document.getElementById("cancelAgendaEdit");

  if (cancelButton) {
    cancelButton.remove();
  }
}

// TOMBOL BATAL EDIT
function showCancelButton() {
  if (document.getElementById("cancelAgendaEdit")) return;

  const button = document.createElement("button");

  button.type = "button";
  button.id = "cancelAgendaEdit";
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

  button.addEventListener("click", resetAgendaForm);

  submitButton.insertAdjacentElement("afterend", button);
}

// TAMPILKAN DAFTAR AGENDA
onValue(ref(db, "agenda"), snapshot => {
  const data = snapshot.val();

  if (!data) {
    agendaList.innerHTML = `
      <p style="text-align:center;padding:20px;color:#8492a6;">
        Belum ada agenda kegiatan.
      </p>
    `;

    if (agendaCount) agendaCount.textContent = "0";
    return;
  }

  const entries = Object.entries(data).sort((a, b) => {
    const dateA = `${a[1].tanggal || ""}T${a[1].waktu || "00:00"}`;
    const dateB = `${b[1].tanggal || ""}T${b[1].waktu || "00:00"}`;

    return dateA.localeCompare(dateB);
  });

  if (agendaCount) {
    agendaCount.textContent = entries.length;
  }

  agendaList.innerHTML = entries.map(([id, item]) => `
    <div class="agenda-item"
      style="padding:16px;margin-bottom:14px;border:1px solid #e5eaf0;border-radius:12px;">

      <h4 style="margin:0 0 8px;">
        ${escapeHTML(item.nama)}
      </h4>

      <span style="color:#2878e5;font-size:12px;font-weight:700;">
        ${escapeHTML(item.kategori)}
      </span>

      <p style="margin:12px 0 5px;">
        <strong>Tanggal:</strong>
        ${escapeHTML(item.tanggal)}
      </p>

      <p style="margin:5px 0;">
        <strong>Waktu:</strong>
        ${escapeHTML(item.waktu)}
      </p>

      <p style="margin:5px 0;">
        <strong>Lokasi:</strong>
        ${escapeHTML(item.lokasi)}
      </p>

      <p style="margin:10px 0;">
        ${escapeHTML(item.deskripsi)}
      </p>

      <div style="display:flex;gap:8px;margin-top:14px;">

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
  `).join("");
});

// TAMBAH DAN EDIT AGENDA
form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const nama = titleInput.value.trim();
  const kategori = categoryInput.value;
  const tanggal = dateInput.value;
  const waktu = timeInput.value;
  const lokasi = locationInput.value.trim();
  const deskripsi = descriptionInput.value.trim();

  if (!nama || !tanggal || !waktu || !lokasi || !deskripsi) {
    alert("Mohon lengkapi semua formulir agenda.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";

    const agendaData = {
      nama,
      kategori,
      tanggal,
      waktu,
      lokasi,
      deskripsi,
      terakhirDiubah: serverTimestamp()
    };

    if (editingId) {
      await update(ref(db, "agenda/" + editingId), agendaData);

      alert("Agenda berhasil diperbarui!");

    } else {
      await push(ref(db, "agenda"), {
        ...agendaData,
        tanggalDibuat: serverTimestamp(),
        status: "aktif"
      });

      alert("Agenda berhasil ditambahkan!");
    }

    resetAgendaForm();

  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan agenda: " + error.message);

  } finally {
    submitButton.disabled = false;

    if (!editingId) {
      submitButton.textContent = "Simpan Agenda";
    }
  }
});

// TOMBOL EDIT DAN HAPUS
agendaList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  if (!isAdmin()) {
    alert("Silakan login sebagai admin.");
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const itemRef = ref(db, "agenda/" + id);

  if (action === "edit") {
    try {
      const { get } = await import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js"
      );

      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        alert("Agenda tidak ditemukan.");
        return;
      }

      const item = snapshot.val();

      editingId = id;

      titleInput.value = item.nama || "";
      categoryInput.value = item.kategori || "Kegiatan OSIS";
      dateInput.value = item.tanggal || "";
      timeInput.value = item.waktu || "";
      locationInput.value = item.lokasi || "";
      descriptionInput.value = item.deskripsi || "";

      submitButton.textContent = "Simpan Perubahan";

      showCancelButton();

      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error(error);
      alert("Gagal membuka agenda: " + error.message);
    }
  }

  if (action === "delete") {
    const yakin = confirm(
      "Apakah kamu yakin ingin menghapus agenda ini?"
    );

    if (!yakin) return;

    try {
      await remove(itemRef);

      if (editingId === id) {
        resetAgendaForm();
      }

      alert("Agenda berhasil dihapus!");

    } catch (error) {
      console.error(error);
      alert("Gagal menghapus agenda: " + error.message);
    }
  }
});
    
