
import { db } from "./firebase.js";

import {
    ref,
    push,
    set,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const daftarAspirasi = document.getElementById("aspirasiPublikList");

let semuaKomentar = {};
let semuaBalasan = {};

// Mengamankan teks dari HTML berbahaya
function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

// Format tanggal komentar
function formatWaktu(waktu) {
    if (!waktu) return "Baru saja";

    return new Date(waktu).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Menampilkan komentar dan balasan pada setiap aspirasi
function tampilkanKomentar() {
    const kartuAspirasi = daftarAspirasi.querySelectorAll(".aspirasi-card");

    kartuAspirasi.forEach(kartu => {
        const aspirasiId = kartu.dataset.id;

        if (!aspirasiId) return;

        let area = kartu.querySelector(".komentar-aspirasi-area");

        if (!area) {
            area = document.createElement("div");
            area.className = "komentar-aspirasi-area";
            kartu.appendChild(area);
        }

        const komentar = semuaKomentar[aspirasiId] || {};

        const daftarKomentar = Object.entries(komentar)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) =>
                (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
            );

        let html = `
            <div class="komentar-judul">
                💬 Komentar (${daftarKomentar.length})
            </div>
        `;

        if (daftarKomentar.length === 0) {
            html += `<p class="komentar-kosong">Belum ada komentar. Jadilah yang pertama mendukung aspirasi ini!</p>`;
        }

        daftarKomentar.forEach(item => {
            const balasan = (
                semuaBalasan[aspirasiId]?.[item.id] || {}
            );

            const daftarBalasan = Object.entries(balasan)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) =>
                    (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
                );

            html += `
                <div class="komentar-item">

                    <div class="komentar-identitas">
                        <strong>${aman(item.nama)}</strong>
                        <span>${aman(item.kelas)}</span>
                    </div>

                    <p class="komentar-isi">
                        ${aman(item.isi).replace(/\n/g, "<br>")}
                    </p>

                    <small class="komentar-waktu">
                        ${formatWaktu(item.tanggalDibuat)}
                    </small>

                    <div class="daftar-balasan">
            `;

            daftarBalasan.forEach(jawaban => {
                html += `
                    <div class="balasan-item">

                        <div class="komentar-identitas">
                            <strong>${aman(jawaban.nama)}</strong>
                            <span>${aman(jawaban.kelas)}</span>
                        </div>

                        <p class="komentar-isi">
                            ${aman(jawaban.isi).replace(/\n/g, "<br>")}
                        </p>

                        <small class="komentar-waktu">
                            ${formatWaktu(jawaban.tanggalDibuat)}
                        </small>

                    </div>
                `;
            });

            html += `
                    </div>

                    <form class="form-balasan"
                          data-aspirasi-id="${aman(aspirasiId)}"
                          data-komentar-id="${aman(item.id)}">

                        <input
                            type="text"
                            name="nama"
                            placeholder="Nama lengkap"
                            maxlength="80"
                            required
                        >

                        <input
                            type="text"
                            name="kelas"
                            placeholder="Kelas"
                            maxlength="30"
                            required
                        >

                        <textarea
                            name="isi"
                            placeholder="Balas komentar ini..."
                            maxlength="1000"
                            rows="2"
                            required
                        ></textarea>

                        <button type="submit">
                            Kirim Balasan
                        </button>

                    </form>

                </div>
            `;
        });

        html += `
            <form class="form-komentar"
                  data-aspirasi-id="${aman(aspirasiId)}">

                <h4>Tulis Komentar</h4>

                <input
                    type="text"
                    name="nama"
                    placeholder="Nama lengkap"
                    maxlength="80"
                    required
                >

                <input
                    type="text"
                    name="kelas"
                    placeholder="Kelas"
                    maxlength="30"
                    required
                >

                <textarea
                    name="isi"
                    placeholder="Tuliskan dukungan atau pendapatmu..."
                    maxlength="1000"
                    rows="3"
                    required
                ></textarea>

                <button type="submit">
                    Kirim Komentar
                </button>

            </form>
        `;

        area.innerHTML = html;
    });
}

// Membaca seluruh komentar dari Firebase
onValue(ref(db, "komentarAspirasi"), snapshot => {
    semuaKomentar = snapshot.val() || {};
    tampilkanKomentar();
}, error => {
    console.error("Gagal membaca komentar:", error);
});

// Membaca seluruh balasan dari Firebase
onValue(ref(db, "balasanAspirasi"), snapshot => {
    semuaBalasan = snapshot.val() || {};
    tampilkanKomentar();
}, error => {
    console.error("Gagal membaca balasan:", error);
});

// Mengirim komentar dan balasan
daftarAspirasi.addEventListener("submit", async event => {
    const form = event.target;

    const isKomentar = form.matches(".form-komentar");
    const isBalasan = form.matches(".form-balasan");

    if (!isKomentar && !isBalasan) return;

    event.preventDefault();

    const nama = form.elements.nama.value.trim();
    const kelas = form.elements.kelas.value.trim();
    const isi = form.elements.isi.value.trim();

    const aspirasiId = form.dataset.aspirasiId;
    const komentarId = form.dataset.komentarId;

    if (!nama || !kelas || !isi) {
        alert("Mohon lengkapi nama, kelas, dan isi pesan.");
        return;
    }

    const tombol = form.querySelector("button");
    tombol.disabled = true;
    tombol.textContent = "Mengirim...";

    try {
        let lokasi;

        if (isKomentar) {
            lokasi = push(
                ref(db, `komentarAspirasi/${aspirasiId}`)
            );
        } else {
            lokasi = push(
                ref(db, `balasanAspirasi/${aspirasiId}/${komentarId}`)
            );
        }

        await set(lokasi, {
            nama,
            kelas,
            isi,
            tanggalDibuat: serverTimestamp()
        });

        form.reset();

        alert(
            isKomentar
                ? "Komentar berhasil dikirim!"
                : "Balasan berhasil dikirim!"
        );

    } catch (error) {
        console.error("Gagal mengirim pesan:", error);
        alert("Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
        tombol.disabled = false;
        tombol.textContent = isKomentar
            ? "Kirim Komentar"
            : "Kirim Balasan";
    }
});

// Memantau perubahan daftar aspirasi
const pengamat = new MutationObserver(() => {
    tampilkanKomentar();
});

pengamat.observe(daftarAspirasi, {
    childList: true
});
                                              
