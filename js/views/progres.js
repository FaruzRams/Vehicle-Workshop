/* ==========================================================================
   views/progres.js — Penugasan mekanik & pelacakan progress pengerjaan
   Dipakai bersama oleh kasir, booking, pelanggan, laporan, dan halaman cek.
   ========================================================================== */
window.Views = window.Views || {};

Views.progres = (function () {

  /* Tahap pengerjaan work order (transaksi) — urutan menentukan posisi timeline */
  const TAHAP = [
    { nilai: 'diterima', label: 'Kendaraan diterima', ikon: '📥', warna: 'biru',
      ket: 'Kendaraan sudah diterima di bengkel' },
    { nilai: 'diperiksa', label: 'Sedang diperiksa', ikon: '🔍', warna: 'biru',
      ket: 'Mekanik sedang memeriksa kendaraan' },
    { nilai: 'dikerjakan', label: 'Sedang dikerjakan', ikon: '🔧', warna: 'ungu',
      ket: 'Pengerjaan sedang berlangsung' },
    { nilai: 'menunggu_sparepart', label: 'Menunggu sparepart', ikon: '⏳', warna: 'kuning',
      ket: 'Menunggu pengadaan barang' },
    { nilai: 'selesai', label: 'Selesai dikerjakan', ikon: '✅', warna: 'hijau',
      ket: 'Pekerjaan selesai, siap diambil' },
    { nilai: 'diambil', label: 'Sudah diambil', ikon: '🚗', warna: 'abu',
      ket: 'Kendaraan sudah diserahkan ke pelanggan' }
  ];

  const TAHAP_AKTIF = ['diterima', 'diperiksa', 'dikerjakan', 'menunggu_sparepart'];

  /** Status antrian booking yang ditampilkan sebagai progress */
  const STATUS_BOOKING = [
    { nilai: 'menunggu', label: 'Menunggu giliran', ikon: '🕐', warna: 'kuning',
      ket: 'Booking tercatat, menunggu jadwal' },
    { nilai: 'dikerjakan', label: 'Sedang dikerjakan', ikon: '🔧', warna: 'ungu',
      ket: 'Kendaraan sedang dikerjakan' },
    { nilai: 'selesai', label: 'Selesai', ikon: '✅', warna: 'hijau',
      ket: 'Pekerjaan selesai' },
    { nilai: 'batal', label: 'Dibatalkan', ikon: '🚫', warna: 'abu',
      ket: 'Booking dibatalkan' }
  ];

  const infoTahap = (n) => TAHAP.find(t => t.nilai === n) || TAHAP[TAHAP.length - 2];
  const infoStatus = (n) => STATUS_BOOKING.find(s => s.nilai === n) || STATUS_BOOKING[0];
  const urutanTahap = (n) => {
    const i = TAHAP.findIndex(t => t.nilai === n);
    return i < 0 ? TAHAP.length - 2 : i;
  };

  /** "BK-0001" — kode ramah pelanggan untuk booking */
  function kodeBooking(b) {
    const angka = String(b.id || '').replace(/\D/g, '');
    return 'BK-' + String(Number(angka || 0)).padStart(4, '0');
  }

  function normKode(s) {
    return String(s || '').toUpperCase().replace(/[\s-]/g, '');
  }

  /* ---------------- Potongan tampilan ---------------- */
  function badgeTahap(nilai) {
    const t = infoTahap(nilai);
    return `<span class="lencana lencana-${t.warna}">${t.ikon} ${t.label}</span>`;
  }

  function badgeMekanik(nama) {
    if (!nama) return `<span class="lencana lencana-abu">belum ditugaskan</span>`;
    return `<span class="lencana lencana-biru">👷 ${U.esc(nama)}</span>`;
  }

  /**
   * Timeline kemajuan pengerjaan.
   * daftar  : TAHAP atau STATUS_BOOKING
   * posisi  : index langkah aktif
   * riwayat : [{tahap|status, waktu, catatan}] untuk keterangan waktu
   */
  function garis(daftar, posisi, riwayat) {
    const catat = (nilai) => {
      const r = [...(riwayat || [])].reverse().find(x => (x.tahap || x.status) === nilai);
      return r ? `<span class="pl-waktu">${U.tglWaktu(r.waktu)}${r.catatan ? ' · ' + U.esc(r.catatan) : ''}</span>` : '';
    };
    return `<ol class="progres">${
      daftar.map((s, i) => {
        const kelas = i < posisi ? 'lewat' : i === posisi ? 'aktif' : 'belum';
        return `<li class="progres-langkah ${kelas}">
          <span class="pl-titik">${i < posisi ? '✓' : s.ikon}</span>
          <div class="pl-teks">
            <b>${U.esc(s.label)}</b>
            <span>${U.esc(s.ket)}</span>
            ${(i <= posisi && kelas !== 'belum') ? catat(s.nilai) : ''}
          </div>
        </li>`;
      }).join('')}</ol>`;
  }

  /** Progress untuk transaksi (work order) */
  function garisTransaksi(t) {
    const tahap = t.tahap || 'selesai';
    return garis(TAHAP, urutanTahap(tahap), t.tahapRiwayat);
  }

  /** Progress untuk booking */
  function garisBooking(b) {
    const i = STATUS_BOOKING.findIndex(s => s.nilai === b.status);
    return garis(STATUS_BOOKING, i < 0 ? 0 : i,
      [{ status: b.status, waktu: b.updatedAt || b.createdAt, catatan: '' }]);
  }

  /* ---------------- Pilihan mekanik ---------------- */
  function daftarMekanik(hanyaAktif) {
    const d = Store.get().mechanics || [];
    return d.filter(m => !hanyaAktif || m.aktif !== false);
  }

  /** Potongan <option> untuk select mekanik */
  function pilihanMekanik(nilaiTerpilih, semua) {
    const list = daftarMekanik(!semua);
    const tersembunyi = semua ? [] : list.filter(m => m.id === nilaiTerpilih);
    const opsi = [...list, ...tersembunyi];
    return `<option value="">— belum ditugaskan —</option>` + opsi.map(m =>
      `<option value="${m.id}" ${m.id === nilaiTerpilih ? 'selected' : ''}>${U.esc(m.nama)}${
        m.spesialisasi ? ' — ' + U.esc(m.spesialisasi) : ''}${m.aktif === false ? ' (nonaktif)' : ''}</option>`
    ).join('');
  }

  function dariId(id) {
    return (Store.get().mechanics || []).find(m => m.id === id) || null;
  }

  /* ---------------- Beban kerja mekanik ---------------- */
  function beban() {
    const db = Store.get();
    const peta = new Map();
    (db.mechanics || []).forEach(m => peta.set(m.id, {
      id: m.id, nama: m.nama, spesialisasi: m.spesialisasi, aktif: m.aktif !== false,
      unit: 0, booking: 0, contoh: []
    }));

    (db.transactions || []).forEach(t => {
      if (!t.mekanikId || !TAHAP_AKTIF.includes(t.tahap || 'selesai')) return;
      const e = peta.get(t.mekanikId) || { nama: t.mekanikNama, unit: 0, booking: 0, contoh: [] };
      e.unit += 1;
      if (e.contoh.length < 3) e.contoh.push(t.plat || t.namaPelanggan || t.no);
      peta.set(t.mekanikId, e);
    });

    (db.bookings || []).forEach(b => {
      if (!b.mekanikId || (b.status !== 'menunggu' && b.status !== 'dikerjakan')) return;
      const e = peta.get(b.mekanikId) || { nama: b.mekanikNama, unit: 0, booking: 0, contoh: [] };
      e.booking += 1;
      if (e.contoh.length < 3) e.contoh.push(b.plat || b.namaPelanggan);
      peta.set(b.mekanikId, e);
    });

    return [...peta.values()].sort((a, b) =>
      (b.unit + b.booking) - (a.unit + a.booking) || a.nama.localeCompare(b.nama, 'id'));
  }

  /* ---------------- Modal pengaturan ---------------- */
  async function aturTransaksi(id) {
    const t = Store.get().transactions.find(x => x.id === id);
    if (!t) return null;

    const data = await UI.form({
      judul: `Atur Progress — ${t.no}`,
      lebar: 'sedang',
      fields: [
        { nama: 'mekanik', label: 'Mekanik yang ditugaskan', tipe: 'pilih', lebar: 'panjang',
          nilai: t.mekanikId || '', pilihan: pilihanOpsiMekanik() },
        { nama: 'tahap', label: 'Tahap pengerjaan', tipe: 'pilih', wajib: true, lebar: 'panjang',
          nilai: t.tahap || 'selesai',
          pilihan: TAHAP.map(x => ({ nilai: x.nilai, label: x.ikon + ' ' + x.label })) },
        { nama: 'catatan', label: 'Catatan (opsional)', tipe: 'teks', lebar: 'panjang',
          placeholder: 'Contoh: ganti tromol, tunggu part 2 hari' }
      ],
      labelSimpan: 'Simpan progress'
    });
    if (!data) return null;

    const m = data.mekanik ? dariId(data.mekanik) : null;
    const tahapBaru = data.tahap;
    const berubah = (t.tahap || 'selesai') !== tahapBaru || (t.mekanikId || '') !== (data.mekanik || '');

    t.mekanikId = m ? m.id : '';
    t.mekanikNama = m ? m.nama : '';
    t.tahap = tahapBaru;
    if (berubah || data.catatan) {
      t.tahapRiwayat = t.tahapRiwayat || [];
      t.tahapRiwayat.push({
        tahap: tahapBaru, waktu: Date.now(),
        catatan: data.catatan || '', oleh: Store.get().settings.kasir || 'Kasir'
      });
    }
    Store.save();
    UI.toast(`${t.no} → ${infoTahap(tahapBaru).label}${m ? ' · ' + m.nama : ''}`);
    return t;
  }

  async function aturBooking(id) {
    const b = Store.get().bookings.find(x => x.id === id);
    if (!b) return null;

    const data = await UI.form({
      judul: `Tugaskan Mekanik — ${b.namaPelanggan}`,
      lebar: 'kecil',
      fields: [
        { nama: 'mekanik', label: 'Mekanik yang ditugaskan', tipe: 'pilih', lebar: 'panjang',
          nilai: b.mekanikId || '', pilihan: pilihanOpsiMekanik() },
        { nama: 'layanan', label: 'Layanan', tipe: 'teks', lebar: 'panjang', nilai: b.layanan || '' }
      ],
      labelSimpan: 'Simpan penugasan'
    });
    if (!data) return null;

    const m = data.mekanik ? dariId(data.mekanik) : null;
    b.mekanikId = m ? m.id : '';
    b.mekanikNama = m ? m.nama : '';
    b.layanan = data.layanan;
    b.updatedAt = Date.now();
    Store.save();
    UI.toast(`Mekanik ${m ? m.nama : 'dikosongkan'} untuk booking ${b.namaPelanggan}.`);
    return b;
  }

  /** Format pilihan untuk UI.form (tipe 'pilih') — semua mekanik agar nilai lama tetap tampil */
  function pilihanOpsiMekanik() {
    return daftarMekanik(false).map(m => ({
      nilai: m.id,
      label: m.nama + (m.spesialisasi ? ' — ' + m.spesialisasi : '') + (m.aktif === false ? ' (nonaktif)' : '')
    }));
  }

  /* ---------------- Pembagian via WhatsApp ---------------- */
  /** Tautan halaman pelanggan menuju folder yang sama: cek.html?kode=... */
  function tautanCek(kode) {
    let dasar = String(location.href).split('#')[0].split('?')[0];
    dasar = dasar.replace(/[^\\/]*$/, '');
    return dasar + 'cek.html' + (kode ? '?kode=' + encodeURIComponent(kode) : '');
  }

  /** Pesan WhatsApp untuk pelanggan */
  function pesanWa(o) {
    const s = Store.get().settings;
    const nama = (o.nama || '').trim();
    const motor = [o.kendaraan, o.plat].filter(Boolean).join(' · ');
    return [
      `Halo${nama ? ' Pak/Bu ' + nama : ''},`,
      motor ? `Motor Anda (${motor})` : 'Motor Anda',
      `sedang di ${s.namaBengkel}.`,
      o.status ? `Status: ${o.status}` : '',
      o.catatan ? `Catatan: ${o.catatan}` : '',
      '',
      `Cek progress mandiri di sini: ${tautanCek(o.kode)}`,
      '',
      'Terima kasih 🙏'
    ].filter(x => x !== '').join('\n');
  }

  /** Kirim tautan cek ke nomor WhatsApp pelanggan */
  function bagikanWa(o) {
    if (!U.waTelp(o.hp)) {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Nomor WhatsApp pelanggan belum diisi.', 'peringatan');
      return false;
    }
    return U.bukaWa(o.hp, pesanWa(o));
  }

  return {
    TAHAP, STATUS_BOOKING, TAHAP_AKTIF,
    infoTahap, infoStatus, urutanTahap,
    kodeBooking, normKode,
    badgeTahap, badgeMekanik, garisTransaksi, garisBooking,
    daftarMekanik, pilihanMekanik, pilihanOpsiMekanik, dariId,
    beban, aturTransaksi, aturBooking,
    tautanCek, pesanWa, bagikanWa
  };
})();
