
import { db } from "./firebase.js";

import {
    ref,
    push,
    set,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const parameter = new URLSearchParams(window.location.search);
const aspirasiId = parameter.get("aspirasi");

const detailAspirasi = document.getElementById("detailAspirasi");
const daftarKomentar = document.getElementById("daftarKomentar");

let semuaKomentar = {};
let semuaBalasan = {};
let semuaReaksiKomentar = {};

function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, karakter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[karakter]);
}

function waktuIndonesia(waktu) {
    if (!waktu) return "Baru saja";

    return new Date(waktu).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

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

if (!aspirasiId) {
    detailAspirasi.innerHTML =
        "<p>Identitas aspirasi tidak ditemukan.</p>";
    daftarKomentar.innerHTML = "";
} else {

    // Membaca detail aspirasi
    onValue(ref(db, `aspirasi/${aspirasiId}`), snapshot => {
        if (!snapshot.exists()) {
            detailAspirasi.innerHTML =
                "<p>Aspirasi tidak ditemukan.</p>";
            return;
        }

        const data = snapshot.val();

        detailAspirasi.innerHTML = `
            <article class="aspirasi-card">
                <div class="aspirasi-card-top">
                    <strong>${aman(data.nama)}</strong>
                    <span>${aman(data.kelas)}</span>
                </div>

                <div class="aspirasi-kategori">
                    ${aman(data.kategori)}
                </div>

                <p class="aspirasi-card-isi">
                    ${aman(data.isi).replace(/\n/g, "<br>")}
                </p>

                <div class="aspirasi-card-bottom">
                    <span>Status: ${aman(data.status || "Baru")}</span>
                    <small>${waktuIndonesia(data.tanggalDibuat)}</small>
                </div>
            </article>
        `;
    });

    // Membaca komentar
    onValue(ref(db, `komentarAspirasi/${aspirasiId}`), snapshot => {
        semuaKomentar = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca balasan
    onValue(ref(db, `balasanAspirasi/${aspirasiId}`), snapshot => {
        semuaBalasan = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca reaksi komentar
    onValue(ref(db, `reaksiKomentar/${aspirasiId}`), snapshot => {
        semuaReaksiKomentar = snapshot.val() || {};
        tampilkanKomentar();
    });
}

function hitungReaksi(objek) {
    let suka = 0;
    let tidakSuka = 0;

    Object.values(objek || {}).forEach(item => {
        if (item.jenis === "suka") suka++;
        if (item.jenis === "tidak suka") tidakSuka++;
    });

    return { suka, tidakSuka };
}

function tampilkanKomentar() {
    if (!aspirasiId) return;

    const daftar = Object.entries(semuaKomentar)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) =>
            (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
        );

    let html = `
        <h2>💬 ${daftar.length} Komentar</h2>
    `;

    if (daftar.length === 0) {
        html += `<p>Belum ada komentar. Jadilah yang pertama!</p>`;
    }

    daftar.forEach(item => {
        const balasan =
            semuaBalasan[item.id] || {};

        const daftarBalasan = Object.entries(balasan)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) =>
                (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
            );

        const reaksi =
            semuaReaksiKomentar[item.id] || {};

        const jumlahReaksi = hitungReaksi(reaksi);
        const reaksiSaya = reaksi[pengunjungID]?.jenis || "";

        html += `
            <article class="komentar-item">

                <div class="komentar-identitas">
                    <strong>${aman(item.nama)}</strong>
                    <span>${aman(item.kelas)}</span>
                </div>

                <p class="komentar-isi">
                    ${aman(item.isi).replace(/\n/g, "<br>")}
                </p>

                <small class="komentar-waktu">
                    ${waktuIndonesia(item.tanggalDibuat)}
                </small>

                <div class="interaksi-komentar">
                    <button
                        type="button"
                        class="tombol-reaksi-komentar ${reaksiSaya === "suka" ? "aktif" : ""}"
                        data-komentar="${aman(item.id)}"
                        data-jenis="suka">
                        👍 ${jumlahReaksi.suka}
                    </button>

                    <button
                        type="button"
                        class="tombol-reaksi-komentar ${reaksiSaya === "tidak suka" ? "aktif" : ""}"
                        data-komentar="${aman(item.id)}"
                        data-jenis="tidak suka">
                        👎 ${jumlahReaksi.tidakSuka}
                    </button>

                    <button
                        type="button"
                        class="tombol-balas"
                        data-komentar="${aman(item.id)}">
                        Balas (${daftarBalasan.length})
                    </button>
                </div>

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
                        ${waktuIndonesia(jawaban.tanggalDibuat)}
                    </small>
                </div>
            `;
        });

        html += `
                </div>

                <div class="tempat-form-balasan"
                     id="formBalasan-${aman(item.id)}"></div>

            </article>
        `;
    });

    html += `
        <form id="formKomentarBaru" class="form-komentar">
            <h3>Tulis Komentar</h3>

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
                placeholder="Tuliskan pendapat atau dukunganmu..."
                maxlength="1000"
                rows="3"
                required
            ></textarea>

            <button type="submit">Kirim Komentar</button>
        </form>
    `;

    daftarKomentar.innerHTML = html;
}

// Membuka form balasan hanya saat tombol Balas ditekan
daftarKomentar.addEventListener("click", event => {
    const tombol = event.target.closest(".tombol-balas");
    if (!tombol) return;

    const komentarId = tombol.dataset.komentar;
    const tempat = document.getElementById(
        `formBalasan-${komentarId}`
    );

    if (!tempat) return;

    if (tempat.innerHTML.trim()) {
        tempat.innerHTML = "";
        return;
    }

    tempat.innerHTML = `
        <form class="form-balasan"
              data-komentar="${aman(komentarId)}">

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
                placeholder="Tulis balasan..."
                maxlength="1000"
                rows="2"
                required
            ></textarea>

            <button type="submit">Kirim Balasan</button>
        </form>
    `;
});

// Mengirim komentar dan balasan
daftarKomentar.addEventListener("submit", async event => {
    const form = event.target;

    const isBalasan = form.matches(".form-balasan");
    const isKomentar = form.id === "formKomentarBaru";

    if (!isBalasan && !isKomentar) return;

    event.preventDefault();

    const nama = form.elements.nama.value.trim();
    const kelas = form.elements.kelas.value.trim();
    const isi = form.elements.isi.value.trim();

    if (!nama || !kelas || !isi) {
        alert("Mohon lengkapi semua kolom.");
        return;
    }

    const tombol = form.querySelector("button");
    tombol.disabled = true;
    tombol.textContent = "Mengirim...";

    try {
        const lokasi = isBalasan
            ? push(ref(
                db,
                `balasanAspirasi/${aspirasiId}/${form.dataset.komentar}`
            ))
            : push(ref(
                db,
                `komentarAspirasi/${aspirasiId}`
            ));

        await set(lokasi, {
            nama,
            kelas,
            isi,
            tanggalDibuat: serverTimestamp()
        });

        alert(isBalasan
            ? "Balasan berhasil dikirim!"
            : "Komentar berhasil dikirim!"
        );

        form.reset();

        if (isBalasan) {
            form.remove();
        }

    } catch (error) {
        console.error("Gagal mengirim komentar:", error);
        alert("Pesan gagal dikirim. Periksa koneksi atau aturan Firebase.");
    } finally {
        if (tombol.isConnected) {
            tombol.disabled = false;
            tombol.textContent = isBalasan
                ? "Kirim Balasan"
                : "Kirim Komentar";
        }
    }
});

// Mengirim atau mengubah reaksi komentar
daftarKomentar.addEventListener("click", async event => {
    const tombol = event.target.closest(".tombol-reaksi-komentar");
    if (!tombol) return;

    const komentarId = tombol.dataset.komentar;
    const jenis = tombol.dataset.jenis;

    if (!komentarId || !["suka", "tidak suka"].includes(jenis)) {
        return;
    }

    tombol.disabled = true;

    const reaksiLama =
        semuaReaksiKomentar[komentarId]?.[pengunjungID]?.jenis || "";

    const lokasi = ref(
        db,
        `reaksiKomentar/${aspirasiId}/${komentarId}/${pengunjungID}`
    );

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
        console.error("Gagal menyimpan reaksi komentar:", error);
        alert("Reaksi gagal disimpan. Periksa aturan Firebase.");
    } finally {
        tombol.disabled = false;
    }
});
                      
