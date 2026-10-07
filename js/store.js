/* ==========================================================================
   store.js — Lapisan data (localStorage)
   Semua data aplikasi disimpan di satu objek `db` pada browser ini.
   ========================================================================== */

const Store = (() => {
  const KEY = 'bengkel-app-db-v1';
  let db = null;
  const listeners = [];

  /* ---------- Skema awal + data contoh ---------- */
  function blankDB() {
    return {
      version: 1,
      settings: {
        namaBengkel: 'Bengkel Keluarga',
        alamat: 'Jl. Contoh Alamat No. 123, Riau',
        telp: '0812-0000-0000',
        footerStruk: 'Terima kasih atas kunjungan Anda. Barang yang sudah dibeli tidak dapat ditukar.',
        kasir: 'Kasir',
        pajakPersen: 0
      },
      customers: [],
      products: [],
      services: [],
      mechanics: [],
      transactions: [],
      bookings: [],
      seq: { trx: 0, cust: 0, prod: 0, serv: 0, book: 0, mech: 0 }
    };
  }

  /** Data contoh mekanik (dipakai saat seeding & migrasi database lama) */
  function seedMechanics(d) {
    const contoh = [
      ['Agus Priyanto', 'Mesin & tune up'],
      ['Rudi Hartono', 'Kelistrikan & CVT'],
      ['Wahyu Setiawan', 'Rem, ban & kaki-kaki']
    ];
    contoh.forEach(([nama, spesialisasi]) => {
      d.mechanics.push({
        id: 'MC' + String(++d.seq.mech).padStart(3, '0'),
        nama, spesialisasi, aktif: true, createdAt: Date.now()
      });
    });
    return d;
  }

  function seed() {
    const d = blankDB();
    seedMechanics(d);

    // Layanan / jasa
    const jasa = [
      ['Servis ringan', 50000, 'Ganti oli + cek umum'],
      ['Ganti oli mesin', 35000, 'Termasuk filter oli'],
      ['Tune up', 125000, 'Setel klep, busi, filter'],
      ['Ganti kampas rem depan', 60000, 'Jasa pasang'],
      ['Ganti kampas rem belakang', 60000, 'Jasa pasang'],
      ['Cuci karburator / injeksi', 80000, ''],
      ['Overhaul mesin', 450000, 'Bongkar total, belum termasuk sparepart'],
      ['Ganti ban (per roda)', 20000, 'Jasa pasang + balancing ringan'],
      ['Servis CVT matic', 90000, 'Bersih roller, van belt, sass'],
      ['Perpanjangan STNK / pajak', 50000, 'Jasa administrasi'],
      ['Bubut / skrap tromol', 45000, ''],
      ['Setel rantai + ganti gear', 40000, '']
    ];
    jasa.forEach(([nama, harga, ket]) => {
      d.services.push({
        id: 'SV' + String(++d.seq.serv).padStart(3, '0'),
        nama, harga, ket, aktif: true
      });
    });

    // Sparepart
    const barang = [
      ['Oli Mesin MPX2 1L', 'Pelumas', 46000, 58000, 24],
      ['Oli Mesin 10W-30 1L', 'Pelumas', 42000, 55000, 18],
      ['Filter Oli', 'Filter', 18000, 28000, 15],
      ['Filter Udara', 'Filter', 25000, 40000, 10],
      ['Busi Iridium', 'Kelistrikan', 45000, 65000, 20],
      ['Busi Biasa', 'Kelistrikan', 18000, 30000, 25],
      ['Aki MF 12V-5Ah', 'Kelistrikan', 285000, 365000, 5],
      ['Kampas Rem Depan', 'Rem', 85000, 120000, 8],
      ['Kampas Rem Belakang', 'Rem', 75000, 110000, 8],
      ['Minyak Rem DOT-4', 'Rem', 32000, 45000, 12],
      ['Van Belt CVT', 'Roda', 62000, 85000, 7],
      ['Ban Tubeless 90/80-14', 'Ban', 285000, 360000, 6],
      ['Ban Tubeless 100/80-14', 'Ban', 320000, 405000, 4],
      ['Rantai + Gear Set', 'Roda', 175000, 235000, 7],
      ['Roller CVT', 'Roda', 45000, 65000, 10],
      ['Lampu Depan LED', 'Kelistrikan', 55000, 85000, 9],
      ['Kunci T Sok 14', 'Perkakas', 38000, 55000, 6],
      ['Air Radiator 1L', 'Pelumas', 22000, 35000, 11]
    ];
    barang.forEach((row) => {
      const [nama, kategori, beli, jual, stok] = row;
      d.products.push({
        id: 'BR' + String(++d.seq.prod).padStart(3, '0'),
        kode: 'SKU-' + String(d.seq.prod).padStart(4, '0'),
        nama, kategori, hargaBeli: beli, hargaJual: jual,
        stok, stokMin: 3, satuan: 'pcs', updatedAt: Date.now()
      });
    });

    // Pelanggan contoh
    const pelanggan = [
      ['Budi Santoso', '081370011223', 'Dataran Kerendang', 'Honda Beat', 'B 2345 KDA'],
      ['Siti Aminah', '081381234567', 'Simpang Tiga', 'Yamaha NMAX', 'BM 4412 UY'],
      ['Rahmat Hidayat', '085274455661', 'Bandar Sri Bandar', 'Suzuki Carry', 'BM 1187 TR'],
      ['Dewi Lestari', '085399887766', 'Pekanbaru Kota', 'Honda Vario', 'BM 2290 PL']
    ];
    pelanggan.forEach(([nama, hp, alamat, kendaraan, plat]) => {
      d.customers.push({
        id: 'CU' + String(++d.seq.cust).padStart(3, '0'),
        nama, hp, alamat, kendaraan, plat,
        catatan: '', createdAt: Date.now()
      });
    });

    // Booking contoh hari ini
    d.bookings.push({
      id: 'BK' + String(++d.seq.book).padStart(3, '0'),
      tanggal: todayISO(), jam: '09:00',
      namaPelanggan: 'Budi Santoso', hp: '081370011223',
      kendaraan: 'Honda Beat', plat: 'B 2345 KDA',
      layanan: 'Servis ringan', keluhan: 'Mesin kasar, minta cek oli',
      status: 'menunggu',
      mekanikId: d.mechanics[0] ? d.mechanics[0].id : '',
      mekanikNama: d.mechanics[0] ? d.mechanics[0].nama : '',
      createdAt: Date.now()
    });

    return d;
  }

  function todayISO() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* ---------- Baca / simpan ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        db = JSON.parse(raw);
        // pastikan field baru tersedia
        const base = blankDB();
        db.settings = Object.assign({}, base.settings, db.settings || {});
        db.seq = Object.assign({}, base.seq, db.seq || {});
        ['customers', 'products', 'services', 'transactions', 'bookings']
          .forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });

        // migrasi: database lama belum punya daftar mekanik
        if (!Array.isArray(db.mechanics)) {
          db.mechanics = [];
          seedMechanics(db);
        }
        return db;
      }
    } catch (e) {
      console.warn('Gagal membaca data tersimpan:', e);
    }
    db = seed();
    persist();
    return db;
  }

  function persist() {
    db.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Gagal menyimpan:', e);
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Gagal menyimpan data! Penyimpanan browser penuh?', 'error');
    }
    listeners.forEach(fn => { try { fn(db); } catch (err) { console.error(err); } });
  }

  function get() {
    if (!db) load();
    return db;
  }

  function save() { persist(); }

  function nextId(kind, prefix) {
    const d = get();
    d.seq[kind] = (d.seq[kind] || 0) + 1;
    return prefix + String(d.seq[kind]).padStart(4, '0');
  }

  function subscribe(fn) { listeners.push(fn); }

  /** Salin cadangan (backup) ke file JSON */
  function exportJSON() {
    return JSON.stringify(get(), null, 2);
  }

  /** Pulihkan dari file JSON */
  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products)) {
      throw new Error('Format file tidak dikenali');
    }
    db = parsed;
    persist();
    return db;
  }

  /** Kosongkan seluruh transaksi (data lain tetap) */
  function resetAll() {
    db = blankDB();
    db = seed();
    persist();
  }

  return { get, save, load, nextId, subscribe, exportJSON, importJSON, resetAll, KEY };
})();
