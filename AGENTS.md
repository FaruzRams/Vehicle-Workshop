# AGENTS.md

Web app statik untuk bengkel keluarga (kasir, pelanggan, sparepart, booking, laporan).
Murni HTML/CSS/JS + `localStorage`. **Tidak ada** bundler, `package.json`, test suite, linter, CI, atau git repo.

## Menjalankan & memverifikasi

- Buka `index.html` langsung (klik dua kali) — itu cara utamanya, dan harus tetap bisa.
  Alternatif: `python -m http.server 8765` lalu `http://127.0.0.1:8765/`.
- Tidak ada test. Verifikasi minimal setelah mengubah JS (`node --check` hanya mau
  satu berkas per panggilan):
  ```powershell
  Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
  ```
  `node --check` hanya memeriksa sintaks. Untuk uji perilaku, `npm install jsdom` di folder
  **luar** repo (jangan menaruh `node_modules` di sini), muat `index.html` dengan
  `runScripts: 'dangerously'`, sisipkan tiap file JS sebagai `<script>` teks (bukan `eval` —
  `const` top-level di `eval` tidak menjadi global), lalu panggil `App.mulai()`.
  `window.print` harus di-stub.

## Batasan yang gampang salah

- **Bukan ES module.** Jangan pakai `import`/`export` — akan gagal saat dibuka lewat `file://`.
  Setiap file adalah script klasik yang mendeklarasikan global: `U`, `Store`, `UI`, `Hitung`,
  `Views`, `App`. Karena `const` top-level, global ini **tidak** terlihat di `window.x`;
  akses dari luar harus lewat `eval('App.pergi(...)')`.
- **Urutan script di `index.html` wajib**: `utils → store → ui → hitung → views/* → app.js`.
  Menambah file JS = menambah `<script src>` di sana. `app.js` harus terakhir
  (mendaftarkan `DOMContentLoaded → App.mulai`).
- View mendaftarkan diri sendiri: `window.Views = window.Views || {}; Views.nama = {...}`
  — mendeklarasikan `const Views` di file view akan bentrok dengan file view lain.
- Setiap view hanya punya kewajiban `render()`. `App.pergi('nama')` memanggilnya.
  Container view adalah `#t-<nama>`, tombol nav memakai `data-tampilan="<nama>"`.
- **Cross-view (jangan diputus)**: `Views.kasir.cetakStruk`, `Views.kasir.siapkan`,
  `Views.pelanggan.formCepat` dipakai view lain; `App.pergi` dipakai di dalam view.
- `Views.progres` (tahap pengerjaan, penugasan mechanik, timeline, tautan WhatsApp)
  dipakai semua view **dan** oleh `cek.html`. Menambah tahap baru = ubah
  `Views.progres.TAHAP`, jangan di-hardcode di view.
- **Ada dua entrypoint HTML**: `index.html` (kasir, lengkap dengan semua view) dan
  `cek.html` (halaman pelanggan, hanya memuat `utils.js` + `store.js` +
  `views/progres.js` + `halaman-cek.js`). Keduanya membaca localStorage yang sama.
  Karena `cek.html` tidak memuat `ui.js`/`app.js`, **semua rujukan `UI` di
  `store.js` dan `views/progres.js` wajib dijaga `typeof UI !== 'undefined'`** —
  plain `UI && UI.toast` akan ReferenceError di halaman pelanggan.
- Atribut `data-*` harus unik per elemen. Kartu booking memakai `data-kartu-status`,
  sedangkan tombol filter status memakai `data-filter` — jangan disamakan, kalau tidak
  `querySelectorAll('[data-status]')` ikut mencocokkan kartu dan filter saling menimpa.
- Jaringan: halaman selalu mengatur `location.hash` di `App.pergi` (di dalam `try/catch`)
  supaya tiap menu bisa di-bookmark. Jangan menambah router berbasis hash tanpa
  listener `hashchange`.

## Data

- Satu kunci `localStorage`: `bengkel-app-db-v1`. Baca dengan `Store.get()`,
  **selalu `Store.save()` setelah memutasi objeknya** (tidak ada reaktivitas/otomatis).
- `Store.load()` mengisi data contoh saat kunci kosong. `Store.resetAll()` = kembali ke
  data contoh — jangan dipanggil sebagai "refresh".
- `Store.load()` juga bermigrasi: field baru ditambahkan sebagai "lalu jalankan
  `seedMechanics(db)` bila array-nya belum ada" di blok yang sama.
- `Store.nextId(kunci, prefix)` padding 3 digit (`BR001`); nomor struk beda format:
  `INV-YYYYMMDD-0001` dari `Hitung.nomorStruk`. Kode booking untuk pelanggan dibuat
  terpisah oleh `Views.progres.kodeBooking` (`BK-0001`) — jangan pakai `b.id` mentah.
- Semua perhitungan laporan ada di `js/hitung.js` (`ringkasan`, `kumpulkanItem`,
  `dalamRentang`). Jangan hitung ulang pendapatan/laba di tempat lain.
- Transaksi & booking menyimpan `mekanikId` + `mekanikNama` (nama ikut disalin agar tetap
  tampil bila mekanik dihapus) dan transaksi juga `tahap` + `tahapRiwayat[]`
  (`{tahap, waktu, catatan, oleh}`).

## Konvensi kode (berbeda dari default JS)

- **Seluruh identifier, komentar, dan teks UI berbahasa Indonesia.** Kunci objek juga:
  `nama`, `harga`, `tipe`, `wajib`, `nilai`, `pilihan`, `lebar`, `petunjuk`, `mati`.
- `UI.form({ fields })` memakai `tipe` literal: `teks | angka | tanggal | waktu | pilih |
  textarea | password`; `wajib` (boolean), `pilihan: [{nilai, label}]`, `lebar: 'panjang'`
  = span 2 kolom. `UI.form` resolve `null` batal/klik luar; `UI.buka` aksi:
  `onClick` mengembalikan `false` membatalkan auto-close, `tutup: false` menahan modal terbuka.
- Rupiah/tanggal: **hanya** `U.rupiah`, `U.tglPanjang`, `U.tglRingkas`, `U.angka`
  (jangan `toLocaleString`). Semua data yang disisipkan ke HTML wajib `U.esc(...)`.
- Gaya: class Indonesia (`.kartu`, `.btn-utama`, `.lencana`, `.baris-stat`,
  `.kartu-booking`). Warna **hanya** lewat variabel `:root` di `css/style.css` —
  jangan menulis hex langsung di selector, karena palet yang dipakai adalah
  tosca tua (`--utama`) + mint (`--mint`) + kartu putih, dan tema mudah diacak.
- Timeline progress pakai `.progres` / `.progres-langkah` (kelas `lewat`/`aktif`/`belum`),
  bukan bullet bawaan browser.

## Cetak

- Konten dicetak dengan mengisi `#cetakArea` lalu `window.print()` (CSS `@media print`
  menyembunyikan semua `body > *` selain `#cetakArea`).
- Struk = `@page { size: 80mm auto }` dari stylesheet head. Laporan menyuntik
  `<style>@page { size: A4 }</style>` **di dalam** `#cetakArea` — aturan tersebut menang
  karena urutan dokumen setelah stylesheet head. Jangan dipindah ke `style.css`.

## Data contoh

Repo sengaja terisi data contoh (12 jasa, 19 sparepart, 4 pelanggan, 1 booking) agar bisa
dicoba langsung. Jangan "memperbaiki" jadi kosong; pengguna mengosongkannya lewat menu
Cadangan Data. `README.md` berisi panduan pemakaian untuk pengguna akhir.
