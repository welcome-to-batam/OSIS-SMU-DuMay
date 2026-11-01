
import { db, auth } from "./firebase.js";

import {
    ref,
    onValue,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const daftar = document.getElementById("aspirasiList");
const totalEl = document.querySelector(".aspirasi-count");
const baruEl = document.querySelector(".aspirasi-new-count");
const selesaiEl = document.querySelector(".aspirasi-done-count");

const ADMIN_UID = "HWQfLxdBkqNWNdeCxec0PD3ddBJ2";

function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

function tanggal(waktu) {
    if (!waktu) return "Tanggal tidak tersedia";

    return new Date(waktu).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function tampilkanAspirasi(snapshot) {
    daftar.innerHTML = "";

    if (!snapshot.exists()) {
        daftar.innerHTML = "<p>Belum ada aspirasi siswa.</p>";
        totalEl.textContent = "0";
        baruEl.textContent = "0";
        selesaiEl.textContent = "0";
        return;
    }

    const data = [];

    snapshot.forEach(item => {
        data.push({
            id: item.key,
            ...item.val()
        });
    });

    data.sort((a, b) =>
        (b.tanggalDibuat || 0) - (a.tanggalDibuat || 0)
    );

    totalEl.textContent = data.length;
    baruEl.textContent = data.filter(item =>
        item.status === "Baru"
    ).length;
    selesaiEl.textContent = data.filter(item =>
        item.status === "Selesai"
    ).length;

    data.forEach(item => {
        const kartu = document.createElement("div");
        kartu.className = "admin-aspirasi-card";

        kartu.innerHTML = `
            <div class="admin-aspirasi-heading">
                <div>
                    <strong>${aman(item.nama)}</strong>
                    <span>${aman(item.kelas)}</span>
                </div>
                <small>${tanggal(item.tanggalDibuat)}</small>
            </div>

            <div class="admin-aspirasi-category">
                ${aman(item.kategori)}
            </div>

            <p class="admin-aspirasi-content">
                ${aman(item.isi).replace(/\n/g, "<br>")}
            </p>

            <div class="admin-aspirasi-actions">
                <label>
                    Status Aspirasi
                    <select class="aspirasi-status-select"
                            data-id="${aman(item.id)}">
                        <option value="Baru" ${item.status === "Baru" ? "selected" : ""}>Baru</option>
                        <option value="Diproses" ${item.status === "Diproses" ? "selected" : ""}>Diproses</option>
                        <option value="Selesai" ${item.status === "Selesai" ? "selected" : ""}>Selesai</option>
                    </select>
                </label>

                <button type="button"
                        class="btn-hapus-aspirasi"
                        data-id="${aman(item.id)}">
                    Hapus Aspirasi
                </button>
            </div>
        `;

        daftar.appendChild(kartu);
    });
}

// Pastikan hanya admin yang menjalankan pengelolaan
onAuthStateChanged(auth, user => {
    if (!user || user.uid !== ADMIN_UID) {
        daftar.innerHTML = "<p>Silakan login sebagai admin untuk mengelola aspirasi.</p>";
        return;
    }

    onValue(ref(db, "aspirasi"), snapshot => {
        tampilkanAspirasi(snapshot);
    }, error => {
        console.error("Gagal memuat aspirasi:", error);
        daftar.innerHTML = "<p>Gagal memuat data aspirasi.</p>";
    });
});

// Mengubah status aspirasi
daftar.addEventListener("change", async event => {
    if (!event.target.matches(".aspirasi-status-select")) return;

    const id = event.target.dataset.id;
    const status = event.target.value;

    try {
        await update(ref(db, `aspirasi/${id}`), { status });
    } catch (error) {
        console.error("Gagal mengubah status:", error);
        alert("Status gagal diperbarui. Silakan coba lagi.");
    }
});

// Menghapus aspirasi
daftar.addEventListener("click", async event => {
    const tombol = event.target.closest(".btn-hapus-aspirasi");
    if (!tombol) return;

    const id = tombol.dataset.id;

    if (!confirm("Apakah kamu yakin ingin menghapus aspirasi ini?")) {
        return;
    }

    tombol.disabled = true;

    try {
        await remove(ref(db, `aspirasi/${id}`));
    } catch (error) {
        console.error("Gagal menghapus aspirasi:", error);
        alert("Aspirasi gagal dihapus. Silakan coba lagi.");
        tombol.disabled = false;
    }
});
          
