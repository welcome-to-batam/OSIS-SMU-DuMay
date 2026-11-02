
import { db } from "./firebase.js";

import {
    ref,
    push,
    set,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// Elemen halaman
const form = document.getElementById("aspirasiForm");
const daftarAspirasi = document.getElementById("aspirasiPublikList");
const tombolKirim = document.getElementById("btnKirimAspirasi");

let semuaAspirasi = {};
let semuaKomentar = {};
let semuaReaksi = {};

// ID pengunjung sederhana untuk browser ini
function ambilIDPengunjung() {
    let id = localStorage.getItem("osisPengunjungID");

    if (!id) {
        id = "pengunjung_" +
            Date.now().toString(36) + "_" +
            Math.random().toString(36).slice(2);

        localStorage.setItem("osisPengunjungID", id);
    }

    return id;
}

const pengunjungID = ambilIDPengunjung();

// Mengamankan teks HTML
function escapeHTML(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

// Format tanggal
function formatTanggal(waktu) {
    if (!waktu) return "Baru saja";

    return new Date(waktu).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Mengirim aspirasi
form?.addEventListener("submit", async event => {
    event.preventDefault();

    const nama = document.getElementById("aspirasiNama").value.trim();
    const kelas = document.getElementById("aspirasiKelas").value.trim();
    const kategori = document.getElementById("aspirasiKategori").value;
    const isi = document.getElementById("aspirasiIsi").value.trim();

    if (!nama || !kelas || !kategori || !isi) {
        alert("Mohon lengkapi semua kolom aspirasi.");
        return;
    }

    tombolKirim.disabled = true;
    tombolKirim.textContent = "Mengirim...";

    try {
        const lokasi = push(ref(db, "aspirasi"));

        await set(lokasi, {
            nama,
            kelas,
            kategori,
            isi,
            status: "Baru",
            tanggalDibuat: serverTimestamp()
        });

        alert("Aspirasi berhasil dikirim. Terima kasih!");
        form.reset();

    } catch (error) {
        console.error("Gagal mengirim aspirasi:", error);
        alert("Aspirasi gagal dikirim. Silakan coba lagi.");
    } finally {
        tombolKirim.disabled = false;
        tombolKirim.textContent = "Kirim Aspirasi";
    }
});

// Menghitung komentar dan reaksi
function hitungJumlah(objek) {
    return Object.keys(objek || {}).length;
}

function hitungReaksi(reaksi) {
    let suka = 0;
    let tidakSuka = 0;

    Object.values(reaksi || {}).forEach(item => {
        if (item.jenis === "suka") suka++;
        if (item.jenis === "tidak suka") tidakSuka++;
    });

    return { suka, tidakSuka };
}

// Menampilkan semua aspirasi
function tampilkanAspirasi() {
    if (!daftarAspirasi) return;

    daftarAspirasi.innerHTML = "";

    const dataAspirasi = Object.entries(semuaAspirasi)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) =>
            (b.tanggalDibuat || 0) - (a.tanggalDibuat || 0)
        );

    if (dataAspirasi.length === 0) {
        daftarAspirasi.innerHTML =
            "<p>Belum ada aspirasi siswa. Jadilah yang pertama menyampaikan aspirasi!</p>";
        return;
    }

    dataAspirasi.forEach(data => {
        const komentar =
            semuaKomentar[data.id] || {};

        const reaksi =
            semuaReaksi[data.id] || {};

        const jumlahKomentar = hitungJumlah(komentar);
        const jumlahReaksi = hitungReaksi(reaksi);

        const reaksiSaya = reaksi[pengunjungID]?.jenis || "";

        const kartu = document.createElement("article");
        kartu.className = "aspirasi-card";
        kartu.dataset.id = data.id;

        kartu.innerHTML = `
            <div class="aspirasi-card-top">
                <strong>${escapeHTML(data.nama)}</strong>
                <span>${escapeHTML(data.kelas)}</span>
            </div>

            <div class="aspirasi-kategori">
                ${escapeHTML(data.kategori)}
            </div>

            <p class="aspirasi-card-isi">
                ${escapeHTML(data.isi).replace(/\n/g, "<br>")}
            </p>

            <div class="aspirasi-card-bottom">
                <span>Status: ${escapeHTML(data.status || "Baru")}</span>
                <small>${formatTanggal(data.tanggalDibuat)}</small>
            </div>

            <div class="aspirasi-interaksi">
                <button
                    type="button"
                    class="tombol-reaksi ${reaksiSaya === "suka" ? "aktif" : ""}"
                    data-jenis="suka"
                    data-id="${escapeHTML(data.id)}">
                    👍 ${jumlahReaksi.suka}
                </button>

                <button
                    type="button"
                    class="tombol-reaksi ${reaksiSaya === "tidak suka" ? "aktif" : ""}"
                    data-jenis="tidak suka"
                    data-id="${escapeHTML(data.id)}">
                    👎 ${jumlahReaksi.tidakSuka}
                </button>

                <span class="jumlah-komentar">
                    💬 ${jumlahKomentar} komentar
                </span>
            </div>

            <a
                class="tombol-lihat-komentar"
                href="komentar.html?aspirasi=${encodeURIComponent(data.id)}">
                Lihat Komentar →
            </a>
        `;

        daftarAspirasi.appendChild(kartu);
    });
}

// Membaca aspirasi
onValue(ref(db, "aspirasi"), snapshot => {
    semuaAspirasi = snapshot.val() || {};
    tampilkanAspirasi();
}, error => {
    console.error("Gagal membaca aspirasi:", error);
    daftarAspirasi.innerHTML =
        "<p>Aspirasi belum dapat dimuat. Silakan coba lagi.</p>";
});

// Membaca komentar untuk menghitung jumlahnya
onValue(ref(db, "komentarAspirasi"), snapshot => {
    semuaKomentar = snapshot.val() || {};
    tampilkanAspirasi();
}, error => {
    console.error("Gagal membaca komentar:", error);
});

// Membaca reaksi aspirasi
onValue(ref(db, "reaksiAspirasi"), snapshot => {
    semuaReaksi = snapshot.val() || {};
    tampilkanAspirasi();
}, error => {
    console.error("Gagal membaca reaksi:", error);
});

// Mengirim atau mengubah reaksi
daftarAspirasi?.addEventListener("click", async event => {
    const tombol = event.target.closest(".tombol-reaksi");

    if (!tombol) return;

    const aspirasiId = tombol.dataset.id;
    const jenis = tombol.dataset.jenis;

    if (!aspirasiId || !["suka", "tidak suka"].includes(jenis)) {
        return;
    }

    tombol.disabled = true;

    const lokasi = ref(
        db,
        `reaksiAspirasi/${aspirasiId}/${pengunjungID}`
    );

    const reaksiLama =
        semuaReaksi[aspirasiId]?.[pengunjungID]?.jenis || "";

    try {
        if (reaksiLama === jenis) {
            await set(lokasi, null);
        } else {
            await set(lokasi, {
                jenis,
                tanggalDibuat: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Gagal menyimpan reaksi:", error);
        alert("Reaksi gagal disimpan. Silakan coba lagi.");
    } finally {
        tombol.disabled = false;
    }
});
