
import { db } from "./firebase.js";

import {
    ref,
    push,
    set,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// Elemen form
const form = document.getElementById("aspirasiForm");
const daftarAspirasi = document.getElementById("aspirasiPublikList");
const tombolKirim = document.getElementById("btnKirimAspirasi");

// Mengamankan teks agar tidak dibaca sebagai HTML
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

// Mengirim aspirasi ke Firebase
form?.addEventListener("submit", async (event) => {
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
        const lokasiAspirasi = push(ref(db, "aspirasi"));

        await set(lokasiAspirasi, {
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
        alert("Aspirasi belum berhasil dikirim. Silakan coba lagi.");
    } finally {
        tombolKirim.disabled = false;
        tombolKirim.textContent = "Kirim Aspirasi";
    }
});

// Membaca dan menampilkan aspirasi dari Firebase
const aspirasiRef = ref(db, "aspirasi");

onValue(aspirasiRef, (snapshot) => {
    daftarAspirasi.innerHTML = "";

    if (!snapshot.exists()) {
        daftarAspirasi.innerHTML =
            "<p>Belum ada aspirasi siswa. Jadilah yang pertama menyampaikan aspirasi!</p>";
        return;
    }

    const dataAspirasi = [];

    snapshot.forEach((childSnapshot) => {
        dataAspirasi.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
        });
    });

    // Aspirasi terbaru ditampilkan paling atas
    dataAspirasi.sort((a, b) =>
        (b.tanggalDibuat || 0) - (a.tanggalDibuat || 0)
    );

    dataAspirasi.forEach((data) => {
        const kartu = document.createElement("article");
        kartu.className = "aspirasi-card";

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
        `;

        daftarAspirasi.appendChild(kartu);
    });

}, (error) => {
    console.error("Gagal membaca aspirasi:", error);
    daftarAspirasi.innerHTML =
        "<p>Aspirasi belum dapat dimuat. Silakan coba beberapa saat lagi.</p>";
});
                                           
