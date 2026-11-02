
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
let semuaReaksiBalasan = {};
let semuaTanggapan = {};

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

    // Membaca komentar utama
    onValue(ref(db, `komentarAspirasi/${aspirasiId}`), snapshot => {
        semuaKomentar = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca balasan komentar
    onValue(ref(db, `balasanAspirasi/${aspirasiId}`), snapshot => {
        semuaBalasan = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca reaksi komentar
    onValue(ref(db, `reaksiKomentar/${aspirasiId}`), snapshot => {
        semuaReaksiKomentar = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca reaksi balasan
    onValue(ref(db, `reaksiBalasanAspirasi/${aspirasiId}`), snapshot => {
        semuaReaksiBalasan = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca tanggapan terhadap balasan
    onValue(ref(db, `tanggapanBalasanAspirasi/${aspirasiId}`), snapshot => {
        semuaTanggapan = snapshot.val() || {};
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
        const balasan = semuaBalasan[item.id] || {};

        const daftarBalasan = Object.entries(balasan)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) =>
                (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
            );

        const reaksi = semuaReaksiKomentar[item.id] || {};
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
                        data-target="komentar"
                        data-komentar="${aman(item.id)}">
                        Balas (${daftarBalasan.length})
                    </button>
                </div>

                <div class="daftar-balasan">
        `;

        // Menampilkan setiap balasan
        daftarBalasan.forEach(jawaban => {
            const reaksiJawaban =
                semuaReaksiBalasan[item.id]?.[jawaban.id] || {};

            const jumlahReaksiJawaban =
                hitungReaksi(reaksiJawaban);

            const reaksiJawabanSaya =
                reaksiJawaban[pengunjungID]?.jenis || "";

            const tanggapan =
                semuaTanggapan[item.id]?.[jawaban.id] || {};

            const daftarTanggapan = Object.entries(tanggapan)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) =>
                    (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
                );

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

                    <div class="interaksi-komentar">
                        <button
                            type="button"
                            class="tombol-reaksi-balasan ${reaksiJawabanSaya === "suka" ? "aktif" : ""}"
                            data-komentar="${aman(item.id)}"
                            data-balasan="${aman(jawaban.id)}"
                            data-jenis="suka">
                            👍 ${jumlahReaksiJawaban.suka}
                        </button>

                        <button
                            type="button"
                            class="tombol-reaksi-balasan ${reaksiJawabanSaya === "tidak suka" ? "aktif" : ""}"
                            data-komentar="${aman(item.id)}"
                            data-balasan="${aman(jawaban.id)}"
                            data-jenis="tidak suka">
                            👎 ${jumlahReaksiJawaban.tidakSuka}
                        </button>

                        <button
                            type="button"
                            class="tombol-balas"
                            data-target="balasan"
                            data-komentar="${aman(item.id)}"
                            data-balasan="${aman(jawaban.id)}">
                            Balas (${daftarTanggapan.length})
                        </button>
                    </div>

                    <div class="daftar-tanggapan">
            `;

            // Menampilkan tanggapan terhadap balasan
            daftarTanggapan.forEach(tanggapanItem => {
                html += `
                    <div class="tanggapan-item">
                        <div class="komentar-identitas">
                            <strong>${aman(tanggapanItem.nama)}</strong>
                            <span>${aman(tanggapanItem.kelas)}</span>
                        </div>

                        <p class="komentar-isi">
                            ${aman(tanggapanItem.isi).replace(/\n/g, "<br>")}
                        </p>

                        <small class="komentar-waktu">
                            ${waktuIndonesia(tanggapanItem.tanggalDibuat)}
                        </small>
                    </div>
                `;
            });

            html += `
                    </div>

                    <div
                        class="tempat-form-tanggapan"
                        id="formTanggapan-${aman(item.id)}-${aman(jawaban.id)}">
                    </div>

                </div>
            `;
        });

        html += `
                </div>

                <div
                    class="tempat-form-balasan"
                    id="formBalasan-${aman(item.id)}">
                </div>

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

// Membuka form balasan atau tanggapan
daftarKomentar.addEventListener("click", event => {
    const tombol = event.target.closest(".tombol-balas");
    if (!tombol) return;

    const target = tombol.dataset.target;
    const komentarId = tombol.dataset.komentar;
    const balasanId = tombol.dataset.balasan;

    let tempat;

    if (target === "balasan") {
        tempat = document.getElementById(
            `formTanggapan-${komentarId}-${balasanId}`
        );
    } else {
        tempat = document.getElementById(
            `formBalasan-${komentarId}`
        );
    }

    if (!tempat) return;

    if (tempat.innerHTML.trim()) {
        tempat.innerHTML = "";
        return;
    }

    const kelasForm = target === "balasan"
        ? "form-tanggapan"
        : "form-balasan";

    tempat.innerHTML = `
        <form class="${kelasForm}"
              data-komentar="${aman(komentarId)}"
              data-balasan="${aman(balasanId || "")}">

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
                placeholder="${target === "balasan" ? "Tulis tanggapan..." : "Tulis balasan..."}"
                maxlength="1000"
                rows="2"
                required
            ></textarea>

            <button type="submit">
                ${target === "balasan" ? "Kirim Tanggapan" : "Kirim Balasan"}
            </button>
        </form>
    `;
});

// Mengirim komentar, balasan, dan tanggapan
daftarKomentar.addEventListener("submit", async event => {
    const form = event.target;

    const isTanggapan = form.matches(".form-tanggapan");
    const isBalasan = form.matches(".form-balasan");
    const isKomentar = form.id === "formKomentarBaru";

    if (!isTanggapan && !isBalasan && !isKomentar) return;

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
        let lokasi;

        if (isTanggapan) {
            lokasi = push(ref(
                db,
                `tanggapanBalasanAspirasi/${aspirasiId}/${form.dataset.komentar}/${form.dataset.balasan}`
            ));
        } else if (isBalasan) {
            lokasi = push(ref(
                db,
                `balasanAspirasi/${aspirasiId}/${form.dataset.komentar}`
            ));
        } else {
            lokasi = push(ref(
                db,
                `komentarAspirasi/${aspirasiId}`
            ));
        }

        await set(lokasi, {
            nama,
            kelas,
            isi,
            tanggalDibuat: serverTimestamp()
        });

        alert(
            isTanggapan
                ? "Tanggapan berhasil dikirim!"
                : isBalasan
                    ? "Balasan berhasil dikirim!"
                    : "Komentar berhasil dikirim!"
        );

        form.reset();

        if (isBalasan || isTanggapan) {
            form.remove();
        }

    } catch (error) {
        console.error("Gagal mengirim pesan:", error);
        alert("Pesan gagal dikirim. Periksa koneksi atau aturan Firebase.");
    } finally {
        if (tombol.isConnected) {
            tombol.disabled = false;
            tombol.textContent = isTanggapan
                ? "Kirim Tanggapan"
                : isBalasan
                    ? "Kirim Balasan"
                    : "Kirim Komentar";
        }
    }
});

// Mengirim atau mengubah reaksi komentar dan balasan
daftarKomentar.addEventListener("click", async event => {
    const tombol = event.target.closest(
        ".tombol-reaksi-komentar, .tombol-reaksi-balasan"
    );

    if (!tombol) return;

    const komentarId = tombol.dataset.komentar;
    const balasanId = tombol.dataset.balasan;
    const jenis = tombol.dataset.jenis;

    if (!komentarId || !["suka", "tidak suka"].includes(jenis)) {
        return;
    }

    const isReaksiBalasan =
        tombol.classList.contains("tombol-reaksi-balasan");

    const reaksiLama = isReaksiBalasan
        ? semuaReaksiBalasan[komentarId]?.[balasanId]?.[pengunjungID]?.jenis || ""
        : semuaReaksiKomentar[komentarId]?.[pengunjungID]?.jenis || "";

    const lokasi = isReaksiBalasan
        ? ref(
            db,
            `reaksiBalasanAspirasi/${aspirasiId}/${komentarId}/${balasanId}/${pengunjungID}`
        )
        : ref(
            db,
            `reaksiKomentar/${aspirasiId}/${komentarId}/${pengunjungID}`
        );

    tombol.disabled = true;

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
        alert("Reaksi gagal disimpan. Periksa aturan Firebase.");
    } finally {
        if (tombol.isConnected) {
            tombol.disabled = false;
        }
    }
});
            
