
import { db } from "./firebase.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const daftarGaleri = document.getElementById("daftarGaleri");

function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

onValue(ref(db, "galeri"), snapshot => {
    if (!daftarGaleri) return;

    if (!snapshot.exists()) {
        daftarGaleri.innerHTML = `
            <p style="text-align:center;padding:25px;grid-column:1/-1;">
                Belum ada dokumentasi kegiatan.
            </p>
        `;
        return;
    }

    const galeri = Object.entries(snapshot.val())
        .filter(([id, item]) => item.status === "aktif")
        .reverse();

    if (galeri.length === 0) {
        daftarGaleri.innerHTML = `
            <p style="text-align:center;padding:25px;grid-column:1/-1;">
                Belum ada dokumentasi kegiatan.
            </p>
        `;
        return;
    }

    daftarGaleri.innerHTML = galeri.map(([id, item]) => {
        const foto =
            typeof item.fotoBase64 === "string" &&
            item.fotoBase64.startsWith("data:image/")
            ? item.fotoBase64
            : "";

        return `
            <article class="galeri-card">

                ${foto ? `
                    <img
                        src="${foto}"
                        alt="${aman(item.judul)}"
                        loading="lazy"
                    >
                ` : `
                    <div style="height:145px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#8492a6;">
                        Foto tidak tersedia
                    </div>
                `}

                <div class="galeri-info">
                    <h3>${aman(item.judul)}</h3>

                    <p>${aman(item.keterangan)}</p>

                    <small>${aman(item.tanggal || "")}</small>
                </div>

            </article>
        `;
    }).join("");

}, error => {
    console.error("Gagal membaca galeri:", error);

    daftarGaleri.innerHTML = `
        <p style="text-align:center;padding:25px;grid-column:1/-1;">
            Dokumentasi gagal dimuat. Silakan coba kembali.
        </p>
    `;
});
