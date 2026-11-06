
import { db } from "./firebase.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const daftarAgenda = document.getElementById("daftarAgenda");

function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

onValue(ref(db, "agenda"), snapshot => {
    if (!daftarAgenda) return;

    if (!snapshot.exists()) {
        daftarAgenda.innerHTML = `
            <div class="card">
                <p style="text-align:center;">
                    Belum ada agenda kegiatan.
                </p>
            </div>
        `;
        return;
    }

    const agenda = Object.entries(snapshot.val())
        .filter(([id, item]) => item.status === "aktif")
        .sort((a, b) => {
            const tanggalA = `${a[1].tanggal || ""}T${a[1].waktu || "00:00"}`;
            const tanggalB = `${b[1].tanggal || ""}T${b[1].waktu || "00:00"}`;

            return tanggalA.localeCompare(tanggalB);
        });

    if (agenda.length === 0) {
        daftarAgenda.innerHTML = `
            <div class="card">
                <p style="text-align:center;">
                    Belum ada agenda kegiatan.
                </p>
            </div>
        `;
        return;
    }

    daftarAgenda.innerHTML = agenda.map(([id, item]) => `
        <article class="card" style="margin-bottom:16px;padding:18px;">

            <h2 style="margin-top:0;">
                ${aman(item.nama)}
            </h2>

            <span style="color:#2878e5;font-weight:700;">
                ${aman(item.kategori)}
            </span>

            <p>
                📅 <strong>Tanggal:</strong>
                ${aman(item.tanggal)}
            </p>

            <p>
                🕒 <strong>Waktu:</strong>
                ${aman(item.waktu)}
            </p>

            <p>
                📍 <strong>Lokasi:</strong>
                ${aman(item.lokasi)}
            </p>

            <p style="white-space:pre-line;">
                ${aman(item.deskripsi)}
            </p>

        </article>
    `).join("");

}, error => {
    console.error("Gagal membaca agenda:", error);

    daftarAgenda.innerHTML = `
        <div class="card">
            <p>Agenda gagal dimuat. Silakan coba kembali.</p>
        </div>
    `;
});
