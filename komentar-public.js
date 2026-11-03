
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

    onValue(ref(db, `komentarAspirasi/${aspirasiId}`), snapshot => {
        semuaKomentar = snapshot.val() || {};
        tampilkanKomentar();
    });

    onValue(ref(db, `balasanAspirasi/${aspirasiId}`), snapshot => {
        semuaBalasan = snapshot.val() || {};
        tampilkanKomentar();
    });

    onValue(ref(db, `reaksiKomentar/${aspirasiId}`), snapshot => {
        semuaReaksiKomentar = snapshot.val() || {};
        tampilkanKomentar();
    });

    onValue(ref(db, `reaksiBalasanAspirasi/${aspirasiId}`), snapshot => {
        semuaReaksiBalasan = snapshot.val() || {};
        tampilkanKomentar();
    });

    // Membaca tanggapan lama agar tetap tampil.
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

// Menggabungkan balasan baru dan tanggapan lama
// menjadi satu pohon komentar.
function buatPohonBalasan(komentarId) {
    const semua = {};

    const balasanLama = semuaBalasan[komentarId] || {};

    Object.entries(balasanLama).forEach(([id, data]) => {
        semua[id] = {
            id,
            ...data,
            parentId: data.parentId || ""
        };
    });

    const tanggapanLama = semuaTanggapan[komentarId] || {};

    Object.entries(tanggapanLama).forEach(([balasanIndukId, daftar]) => {
        Object.entries(daftar || {}).forEach(([id, data]) => {
            semua[id] = {
                id,
                ...data,
                parentId: data.parentId || balasanIndukId,
                _lama: true
            };
        });
    });

    const pohon = {};

    Object.values(semua).forEach(item => {
        const induk = item.parentId || "";
        if (!pohon[induk]) pohon[induk] = [];
        pohon[induk].push(item);
    });

    Object.values(pohon).forEach(daftar => {
        daftar.sort((a, b) =>
            (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
        );
    });

    return pohon;
}

function tampilkanKomentar() {
    if (!aspirasiId) return;

    const daftar = Object.entries(semuaKomentar)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) =>
            (a.tanggalDibuat || 0) - (b.tanggalDibuat || 0)
        );

    let html = `<h2>💬 ${daftar.length} Komentar</h2>`;

    if (daftar.length === 0) {
        html += `<p>Belum ada komentar. Jadilah yang pertama!</p>`;
    }

    daftar.forEach(item => {
        const reaksi = semuaReaksiKomentar[item.id] || {};
        const jumlah = hitungReaksi(reaksi);
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
                    <button type="button"
                        class="tombol-reaksi-komentar ${reaksiSaya === "suka" ? "aktif" : ""}"
                        data-komentar="${aman(item.id)}"
                        data-jenis="suka">
                        👍 ${jumlah.suka}
                    </button>

                    <button type="button"
                        class="tombol-reaksi-komentar ${reaksiSaya === "tidak suka" ? "aktif" : ""}"
                        data-komentar="${aman(item.id)}"
                        data-jenis="tidak suka">
                        👎 ${jumlah.tidakSuka}
                    </button>

                    <button type="button"
                        class="tombol-balas"
                        data-target="komentar"
                        data-komentar="${aman(item.id)}">
                        Balas
                    </button>
                </div>

                <div class="tempat-form-balasan"
                    id="formBalasan-${aman(item.id)}"></div>

                <div class="daftar-balasan">
                    ${tampilkanPohon(item.id, "", 1)}
                </div>
            </article>
        `;
    });

    html += `
        <form id="formKomentarBaru" class="form-komentar">
            <h3>Tulis Komentar</h3>
            <input type="text" name="nama"
                placeholder="Nama lengkap" maxlength="80" required>
            <input type="text" name="kelas"
                placeholder="Kelas" maxlength="30" required>
            <textarea name="isi"
                placeholder="Tuliskan pendapat atau dukunganmu..."
                maxlength="1000" rows="3" required></textarea>
            <button type="submit">Kirim Komentar</button>
        </form>
    `;

    daftarKomentar.innerHTML = html;
}

// Fungsi rekursif: setiap balasan dapat memiliki balasan lagi.
function tampilkanPohon(komentarId, parentId = "", tingkat = 1) {
    const pohon = buatPohonBalasan(komentarId);
    const daftar = pohon[parentId] || {};

    return daftar.map(jawaban => {
        const reaksi =
            semuaReaksiBalasan[komentarId]?.[jawaban.id] || {};

        const jumlah = hitungReaksi(reaksi);
        const reaksiSaya = reaksi[pengunjungID]?.jenis || "";

        const indentasi = Math.min(tingkat, 8) * 12;

        return `
            <div class="balasan-item"
                 style="margin-left:${indentasi}px">

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
                    <button type="button"
                        class="tombol-reaksi-balasan ${reaksiSaya === "suka" ? "aktif" : ""}"
                        data-komentar="${aman(komentarId)}"
                        data-balasan="${aman(jawaban.id)}"
                        data-jenis="suka">
                        👍 ${jumlah.suka}
                    </button>

                    <button type="button"
                        class="tombol-reaksi-balasan ${reaksiSaya === "tidak suka" ? "aktif" : ""}"
                        data-komentar="${aman(komentarId)}"
                        data-balasan="${aman(jawaban.id)}"
                        data-jenis="tidak suka">
                        👎 ${jumlah.tidakSuka}
                    </button>

                    <button type="button"
                        class="tombol-balas"
                        data-target="balasan"
                        data-komentar="${aman(komentarId)}"
                        data-balasan="${aman(jawaban.id)}">
                        Balas
                    </button>
                </div>

                <div class="tempat-form-tanggapan"
                    id="formBalasan-${aman(komentarId)}-${aman(jawaban.id)}"></div>

                <div class="daftar-tanggapan">
                    ${tampilkanPohon(komentarId, jawaban.id, tingkat + 1)}
                </div>
            </div>
        `;
    }).join("");
}

// Membuka form balasan pada komentar yang dipilih.
daftarKomentar.addEventListener("click", event => {
    const tombol = event.target.closest(".tombol-balas");
    if (!tombol) return;

    const komentarId = tombol.dataset.komentar;
    const target = tombol.dataset.target;
    const parentId = target === "balasan"
        ? tombol.dataset.balasan
        : "";

    const tempat = parentId
        ? document.getElementById(
            `formBalasan-${komentarId}-${parentId}`
        )
        : document.getElementById(
            `formBalasan-${komentarId}`
        );

    if (!tempat) return;

    if (tempat.innerHTML.trim()) {
        tempat.innerHTML = "";
        return;
    }

    tempat.innerHTML = `
        <form class="form-balasan"
            data-komentar="${aman(komentarId)}"
            data-parent="${aman(parentId)}">

            <input type="text" name="nama"
                placeholder="Nama lengkap" maxlength="80" required>

            <input type="text" name="kelas"
                placeholder="Kelas" maxlength="30" required>

            <textarea name="isi"
                placeholder="Tulis balasan..."
                maxlength="1000" rows="2" required></textarea>

            <button type="submit">Kirim Balasan</button>
        </form>
    `;
});

// Mengirim komentar dan balasan baru.
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
        let lokasi;

        if (isBalasan) {
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

        const dataBaru = {
            nama,
            kelas,
            isi,
            tanggalDibuat: serverTimestamp()
        };

        if (isBalasan && form.dataset.parent) {
            dataBaru.parentId = form.dataset.parent;
        }

        await set(lokasi, dataBaru);

        alert(isBalasan
            ? "Balasan berhasil dikirim!"
            : "Komentar berhasil dikirim!");

        form.reset();

        if (isBalasan) form.remove();

    } catch (error) {
        console.error("Gagal mengirim pesan:", error);
        alert("Pesan gagal dikirim. Periksa aturan Firebase.");
    } finally {
        if (tombol.isConnected) {
            tombol.disabled = false;
            tombol.textContent = isBalasan
                ? "Kirim Balasan"
                : "Kirim Komentar";
        }
    }
});

// Reaksi pada komentar dan seluruh tingkat balasan.
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

    const isBalasan =
        tombol.classList.contains("tombol-reaksi-balasan");

    const reaksiLama = isBalasan
        ? semuaReaksiBalasan[komentarId]?.[balasanId]?.[pengunjungID]?.jenis || ""
        : semuaReaksiKomentar[komentarId]?.[pengunjungID]?.jenis || "";

    const lokasi = isBalasan
        ? ref(db,
            `reaksiBalasanAspirasi/${aspirasiId}/${komentarId}/${balasanId}/${pengunjungID}`)
        : ref(db,
            `reaksiKomentar/${aspirasiId}/${komentarId}/${pengunjungID}`);

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
        if (tombol.isConnected) tombol.disabled = false;
    }
});
            
