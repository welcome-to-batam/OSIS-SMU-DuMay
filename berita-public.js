
import { db } from "./firebase.js";
import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const daftarBerita = document.getElementById("daftarBerita");

function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

onValue(ref(db, "berita"), snapshot => {
    if (!daftarBerita) return;

    if (!snapshot.exists()) {
        daftarBerita.innerHTML = `
            <div class="card">
                <p style="text-align:center;">
                    Belum ada berita yang diterbitkan.
                </p>
            </div>
        `;
        return;
    }

    const berita = Object.entries(snapshot.val())
        .filter(([id, item]) => item.status === "terbit")
        .sort((a, b) =>
            (b[1].tanggalDibuat || 0) -
            (a[1].tanggalDibuat || 0)
        );

    if (berita.length === 0) {
        daftarBerita.innerHTML = `
            <div class="card">
                <p style="text-align:center;">
                    Belum ada berita yang diterbitkan.
                </p>
            </div>
        `;
        return;
    }

    daftarBerita.innerHTML = berita.map(([id, item]) => {
        const foto =
            typeof item.fotoBase64 === "string" &&
            item.fotoBase64.startsWith("data:image/")
            ? `
                <img
                    src="${item.fotoBase64}"
                    alt="${aman(item.judul)}"
                    style="width:100%;max-height:230px;object-fit:cover;border-radius:12px;margin:12px 0;"
                >
            `
            : "";

        return `
            <article class="card" style="margin-bottom:16px;">
                <h2>${aman(item.judul)}</h2>
                <small style="color:#2878e5;">
                    ${aman(item.kategori)}
                </small>
                ${foto}
                <p style="white-space:pre-line;">
                    ${aman(item.isi)}
                </p>
                <small style="color:#8492a6;">
                    ${aman(item.tanggal || "")}
                </small>
            </article>
        `;
    }).join("");
}, error => {
    console.error("Gagal membaca berita:", error);
    daftarBerita.innerHTML = `
        <div class="card">
            <p>Berita gagal dimuat. Silakan coba kembali.</p>
        </div>
    `;
});
