# 🔧 Bengkel Sederhana

Aplikasi web sederhana untuk bisnis bengkel keluarga: **kasir, data pelanggan,
manajemen sparepart, booking/antrian, laporan keuangan, dan pelacakan progress motor**.

Murni HTML + CSS + JavaScript. **Tidak perlu install apa pun**, tidak perlu internet,
data disimpan di komputer bengkel itu sendiri (localStorage browser).

Warna: hijau tosca tua + mint pucat + kartu putih (meniru referensi desain).

---

## 🚀 Cara Membuka

**Cara termudah:** klik dua kali file `index.html` → terbuka langsung di browser
(Chrome / Edge / Firefox).

> Jika pada beberapa komputer data tidak tersimpan saat dibuka lewat klik dua kali,
> jalankan sekali perintah berikut di folder ini (butuh Python):
>
> ```
> python -m http.server 8765
> ```
>
> lalu buka alamat `http://127.0.0.1:8765/`

Agar praktis, buat pintasan (shortcut) di Desktop menuju `index.html`.

---

## 📋 Menu

| Menu | Isi |
|---|---|
| **Dasbor** | Pendapatan hari ini, jumlah transaksi, antrian booking, stok menipis, rekap bulan ini |
| **Kasir** | Pilih jasa/sparepart → keranjang → diskon → bayar → **cetak struk** |
| **Pelanggan** | Data nama, HP, kendaraan, plat, alamat + riwayat service & total belanja |
| **Sparepart** | Harga beli/jual, margin, stok, batas minimum, sesuaikan stok (masuk/keluar/opname) |
| **Booking & Antrian** | Jadwal per tanggal, status: menunggu → dikerjakan → selesai/batal, tombol langsung ke kasir |
| **Laporan** | Rentang tanggal, pendapatan, laba kotor, jasa vs barang, barang terlaris, ekspor CSV, cetak laporan A4 |

> Halaman pelanggan bukan menu di dalam aplikasi ini, tapi berkas terpisah:
> **`cek.html`** — buka saja, tanpa login, tidak ada menu kasir. Lihat bagian
> [Halaman Pelanggan](#-halaman-pelanggan-cekhtml) di bawah.

### Menu samping bawah
- **Daftar Mekanik** — nama mekanik + spesialisasi, aktif/nonaktif, dan jumlah tugas aktif
- **Daftar Jasa** — tambah/ubah harga layanan yang muncul di kasir
- **Pengaturan** — nama bengkel, alamat, telp, nama kasir, catatan kaki struk
- **Cadangan Data** — unduh cadangan (`.json`), pulihkan dari file, atau hapus semua data

---

## 👷 Penugasan Mekanik & Progress Motor

**Tahap pengerjaan** (dipakai pada transaksi/struk):

| Tahap | Arti |
|---|---|
| 📥 Kendaraan diterima | Sudah masuk bengkel |
| 🔍 Sedang diperiksa | Mekanik memeriksa |
| 🔧 Sedang dikerjakan | Pengerjaan berjalan |
| ⏳ Menunggu sparepart | Menunggu pengadaan barang |
| ✅ Selesai dikerjakan | Siap diambil |
| 🚗 Sudah diambil | Sudah diserahkan |

- Di **Kasir**, pilih mekanik & tahap sebelum menyimpan transaksi.
- Ubah kapan saja lewat tombol **🔄 Atur progress** di: Laporan (baris transaksi),
  Riwayat Pelanggan, atau Transaksi hari ini di Kasir. Setiap perubahan tercatat
  lengkap dengan waktu, catatan, dan nama petugas — itulah yang dilihat pelanggan.
- Di **Booking**, tombol **👷** menugaskan mekanik; status antriannya
  (menunggu → dikerjakan → selesai) tampil sebagai progress di halaman cek.
- **Dasbor** menampilkan "Motor dikerjakan" dan "Beban Kerja Mekanik" per orang.

**Cara pelanggan cek motor:** beri tahu pelanggan kode di struk (`INV-…-0001`) atau
kode booking (`BK-0001` — tampil di halaman Cek Progress & daftar booking).
Pelanggan cukup mengetik kode tersebut di menu **Cek Progress**; tidak perlu login.

---

## ⌨️ Pintasan keyboard

`Ctrl` + `1` … `Ctrl` + `6` → pindah menu (Dasbor, Kasir, Pelanggan, Sparepart, Booking, Laporan)

---

## 📱 Halaman Pelanggan (`cek.html`)

Berkas terpisah untuk pelanggan. **Tidak perlu login, tidak ada menu kasir.**
Hanya bisa melihat: apakah motornya sudah bisa dijemput atau belum.

**Cara membuka:**
- Klik dua kali `cek.html`
- atau lewat tautan yang dikirim bengkel: `cek.html?kode=BK-0001`
  (kode otomatis terisi dan hasilnya langsung tampil)

**Cara pelanggan mencari:** masukkan salah satu dari —
`BK-0001` (kode booking) · `INV-20261007-0001` (nomor struk) · nomor HP · nomor polisi.
Huruf besar/kecil dan tanda `-` bebas.

**Isi halaman:** spanduk besar **"✅ Motor Anda SIAP DIAMBIL"** atau tahap yang sedang
ditempuh (📥 diterima → 🔍 diperiksa → 🔧 dikerjakan → ⏳ menunggu sparepart → ✅ selesai),
nama mekanik, catatan bengkel, rincian biaya, dan tombol **Chat Bengkel via WhatsApp**.

### Kirim tautannya lewat WhatsApp

Tekan tombol **📲** di salah satu tempat ini:

| Tempat | Tombol |
|---|---|
| **Booking** — di kartu booking | 📲 |
| **Kasir** → Transaksi hari ini → 🔄 Progress | 📲 |
| **Pelanggan** → Riwayat → 🔄 | 📲 |

WhatsApp langsung terbuka ke nomor pelanggan dengan pesan siap kirim berisi
status motor dan tautan `cek.html?kode=...`. Pelanggan tinggal menekan kirim.
Nomor HP pelanggan harus diisi lebih dulu (menu Pelanggan, atau otomatis dari Booking).

> **Penting:** `cek.html` membaca data dari browser yang **sama** dengan aplikasi kasir.
> - Diklik dua kali di komputer bengkel → otomatis sama.
> - Kalau memakai `python -m http.server`, buka `http://127.0.0.1:8765/cek.html`
>   dari komputer yang sama (bukan dari HP, kecuali HP-nya satu jaringan & alamat
>   IP komputer dipakai). Untukuel HP, simpan `cek.html` di lokasi yang bisa diakses
>   (mis. di dalam folder yang di-share/hosting), atau cek via WhatsApp saja.

---

## 💾 Tentang Data

- Data tersimpan di **browser komputer ini** (localStorage, kunci `bengkel-app-db-v1`).
- **Sering-seringlah unduh cadangan** lewat menu *Cadangan Data*, apalagi sebelum:
  - membersihkan data browser,
  - ganti komputer / reinstall browser.
- Cadangan berupa file `.json` yang bisa dipulihkan kembali lewat menu yang sama.
- Untuk laporan, tersedia **Ekspor CSV** (bisa dibuka di Excel) pada menu Pelanggan,
  Sparepart, dan Laporan.

---

## 🖨 Cetak Struk & Laporan

- Struk dicetak ukuran **kertas 80 mm** (kertas struk kasir / nota biasa).
- Laporan dicetak ukuran **A4**.
- Pada dialog cetak browser, pilih printer atau "Save as PDF" bila ingin menyimpan file.

---

## 🗂 Struktur File

```
index.html              kerangka halaman
css/style.css           seluruh tampilan (termasuk gaya cetak)
js/utils.js             format rupiah, tanggal, ekspor CSV
js/store.js             penyimpanan data (localStorage) + data contoh
js/ui.js                modal, form, konfirmasi, toast
js/hitung.js            perhitungan ringkasan & laporan
js/app.js               navigasi, pengaturan, cadangan
js/views/progres.js     tahap pengerjaan, penugasan mekanik, timeline
js/views/dasbor.js
js/views/kasir.js
js/views/pelanggan.js
js/views/sparepart.js
js/views/booking.js
js/views/laporan.js
js/halaman-cek.js     logika cek.html (halaman pelanggan, tanpa menu kasir)
```

`cek.html` sengaja mandiri: ia memuat `utils.js` + `store.js` + `views/progres.js`
saja (bukan `ui.js`, `app.js`, atau view lain) supaya ringan untuk dibuka pelanggan.

Saat pertama dibuka, aplikasi terisi **data contoh** (jasa, sparepart, beberapa pelanggan)
agar langsung bisa dicoba. Hapus lewat menu **Cadangan Data → Hapus semua data**
untuk memulai dari kosong, atau ubah sesuai bengkel Anda lewat menu masing-masing.
