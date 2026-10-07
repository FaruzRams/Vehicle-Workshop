/* ==========================================================================
   app.js — Navigasi, pengaturan, cadangan data
   ========================================================================== */

const App = (() => {
  const JUDUL = {
    dasbor: ['Dasbor', 'Ringkasan kegiatan bengkel hari ini'],
    kasir: ['Kasir', 'Catat penjualan jasa & sparepart, lalu cetak struk'],
    pelanggan: ['Data Pelanggan', 'Identitas pelanggan dan riwayat servicenya'],
    sparepart: ['Sparepart & Stok', 'Harga, jumlah stok, dan nilai persediaan'],
    booking: ['Booking & Antrian', 'Jadwal kedatangan dan antrian kendaraan'],
    laporan: ['Laporan Keuangan', 'Pendapatan, laba, dan rekap penjualan']
  };

  let aktif = 'dasbor';

  /* ---------------- Navigasi ---------------- */
  function pergi(nama, opsi) {
    if (!JUDUL[nama]) return;
    aktif = nama;

    document.querySelectorAll('.tampilan').forEach(s => { s.hidden = s.id !== 't-' + nama; });
    document.querySelectorAll('.nav-item').forEach(b =>
      b.classList.toggle('aktif', b.dataset.tampilan === nama));

    document.getElementById('judulTampilan').textContent = JUDUL[nama][0];
    document.getElementById('subTampilan').textContent = JUDUL[nama][1];
    document.getElementById('kepalaAksi').innerHTML = '';

    // alamat ikut berubah supaya halaman bisa di-bookmark / dibagikan ke pelanggan
    try {
      if (String(location.hash).slice(1) !== nama) location.hash = nama;
    } catch (e) { /* diabaikan: sebagian browser menolak ubah hash dari file:// */ }

    if (opsi) Views[nama].siapkan && Views[nama].siapkan(opsi);
    Views[nama].render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = `${JUDUL[nama][0]} — ${Store.get().settings.namaBengkel}`;
  }

  function sinkronNama() {
    const s = Store.get().settings;
    document.getElementById('sisiNama').textContent = s.namaBengkel || 'Bengkel Sederhana';
  }

  /* ---------------- Pengaturan ---------------- */
  async function bukaPengaturan() {
    const s = Store.get().settings;
    const data = await UI.form({
      judul: 'Pengaturan Bengkel',
      lebar: 'besar',
      fields: [
        { nama: 'namaBengkel', label: 'Nama bengkel', tipe: 'teks', wajib: true, nilai: s.namaBengkel, lebar: 'panjang' },
        { nama: 'kasir', label: 'Nama kasir (tampil di struk)', tipe: 'teks', nilai: s.kasir },
        { nama: 'alamat', label: 'Alamat', tipe: 'teks', nilai: s.alamat, lebar: 'panjang' },
        { nama: 'telp', label: 'No. Telp / WA', tipe: 'teks', nilai: s.telp },
        { nama: 'footerStruk', label: 'Catatan kaki struk', tipe: 'textarea', nilai: s.footerStruk, lebar: 'panjang' }
      ],
      labelSimpan: 'Simpan pengaturan'
    });
    if (!data) return;
    Object.assign(s, data);
    Store.save();
    sinkronNama();
    UI.toast('Pengaturan disimpan.');
    if (aktif === 'dasbor') pergi(aktif); else document.title = `${JUDUL[aktif][0]} — ${s.namaBengkel}`;
  }

  /* ---------------- Kelola daftar jasa ---------------- */
  async function bukaLayanan() {
    const gambar = () => {
      const daftar = Store.get().services;
      return daftar.length ? `<div class="tabel-scroll"><table class="data" style="min-width:auto">
        <thead><tr><th>Layanan</th><th class="kanan">Harga</th><th class="tengah">Aktif</th><th></th></tr></thead>
        <tbody>${daftar.map(s => `<tr>
          <td class="kuat">${U.esc(s.nama)}<span class="sub">${U.esc(s.ket || '')}</span></td>
          <td class="kanan">${U.rupiah(s.harga)}</td>
          <td class="tengah">${s.aktif !== false
            ? '<span class="lencana lencana-hijau">aktif</span>'
            : '<span class="lencana lencana-abu">nonaktif</span>'}</td>
          <td class="aksi">
            <button class="btn btn-kecil btn-abu" data-editjasa="${s.id}">✏</button>
            <button class="btn btn-kecil btn-abu" data-hapusjasa="${s.id}">🗑</button>
          </td></tr>`).join('')}</tbody></table></div>`
        : `<div class="kosong"><span class="kosong-ikon">🛠️</span>
            <strong>Belum ada layanan</strong><span>Tambahkan jasa agar muncul di kasir.</span></div>`;
    };

    let modal = UI.buka({
      judul: 'Kelola Daftar Jasa / Layanan',
      isi: `<div id="isiJasa">${gambar()}</div>`,
      lebar: 'besar',
      aksi: [
        { label: 'Tutup', kelas: 'btn-abu' },
        { label: '＋ Tambah Jasa', kelas: 'btn-utama', tutup: false, onClick: async () => {
          await formJasa(null);
          segar();
          return false;
        } }
      ]
    });

    const segar = () => {
      modal.overlay.querySelector('#isiJasa').innerHTML = gambar();
      ikat();
    };
    const ikat = () => {
      modal.overlay.querySelectorAll('[data-editjasa]').forEach(b => b.onclick = async () => {
        await formJasa(b.dataset.editjasa); segar();
      });
      modal.overlay.querySelectorAll('[data-hapusjasa]').forEach(b => b.onclick = async () => {
        const s = Store.get().services.find(x => x.id === b.dataset.hapusjasa);
        const ok = await UI.konfirmasi({
          pesan: `Hapus layanan "<b>${U.esc(s.nama)}</b>"?`, labelYa: 'Hapus', bahaya: true
        });
        if (ok) {
          const db = Store.get();
          db.services = db.services.filter(x => x.id !== s.id);
          Store.save(); UI.toast('Layanan dihapus.', 'info'); segar();
        }
      });
    };
    ikat();
  }

  async function formJasa(id) {
    const db = Store.get();
    const s = id ? db.services.find(x => x.id === id) : null;
    const data = await UI.form({
      judul: s ? 'Ubah Jasa' : 'Tambah Jasa',
      lebar: 'kecil',
      fields: [
        { nama: 'nama', label: 'Nama layanan', tipe: 'teks', wajib: true, nilai: s ? s.nama : '', lebar: 'panjang', placeholder: 'Contoh: Ganti oli mesin' },
        { nama: 'harga', label: 'Harga (Rp)', tipe: 'angka', wajib: true, nilai: s ? s.harga : 0, min: 0 },
        { nama: 'ket', label: 'Keterangan', tipe: 'teks', nilai: s ? s.ket : '', lebar: 'panjang' },
        { nama: 'aktif', label: 'Status', tipe: 'pilih', nilai: s && s.aktif === false ? 'tidak' : 'ya',
          pilihan: [{ nilai: 'ya', label: 'Aktif (tampil di kasir)' }, { nilai: 'tidak', label: 'Nonaktif' }] }
      ],
      labelSimpan: 'Simpan'
    });
    if (!data) return;
    if (s) {
      Object.assign(s, { nama: data.nama, harga: data.harga, ket: data.ket, aktif: data.aktif === 'ya' });
    } else {
      db.services.push({
        id: Store.nextId('serv', 'SV'),
        nama: data.nama, harga: data.harga, ket: data.ket, aktif: data.aktif === 'ya'
      });
    }
    Store.save();
    UI.toast('Daftar jasa diperbarui.');
  }

  /* ---------------- Kelola daftar mekanik ---------------- */
  async function bukaMekanik() {
    const gambar = () => {
      const daftar = Store.get().mechanics || [];
      const beban = Views.progres.beban();
      return daftar.length ? `<div class="tabel-scroll"><table class="data" style="min-width:auto">
        <thead><tr><th>Mekanik</th><th>Spesialisasi</th><th class="tengah">Status</th><th class="tengah">Tugas aktif</th><th></th></tr></thead>
        <tbody>${daftar.map(m => {
          const b = beban.find(x => x.id === m.id) || { unit: 0, booking: 0 };
          return `<tr>
          <td class="kuat">${U.esc(m.nama)}</td>
          <td>${U.esc(m.spesialisasi || '—')}</td>
          <td class="tengah">${m.aktif !== false
            ? '<span class="lencana lencana-hijau">aktif</span>'
            : '<span class="lencana lencana-abu">nonaktif</span>'}</td>
          <td class="tengah">${b.unit + b.booking ? `<b>${b.unit + b.booking}</b> unit` : '—'}</td>
          <td class="aksi">
            <button class="btn btn-kecil btn-abu" data-editmekanik="${m.id}">✏</button>
            <button class="btn btn-kecil btn-abu" data-hapusmekanik="${m.id}">🗑</button>
          </td></tr>`;
        }).join('')}</tbody></table></div>`
        : `<div class="kosong"><span class="kosong-ikon">👷</span>
            <strong>Belum ada mekanik</strong><span>Tambahkan nama mekanik agar bisa ditugaskan.</span></div>`;
    };

    const modal = UI.buka({
      judul: 'Kelola Daftar Mekanik',
      isi: `<div id="isiMekanik">${gambar()}</div>`,
      lebar: 'besar',
      aksi: [
        { label: 'Tutup', kelas: 'btn-abu' },
        {
          label: '＋ Tambah Mekanik', kelas: 'btn-utama', tutup: false,
          onClick: async () => { await formMekanik(null); segar(); return false; }
        }
      ]
    });

    const segar = () => {
      modal.overlay.querySelector('#isiMekanik').innerHTML = gambar();
      ikat();
    };
    const ikat = () => {
      modal.overlay.querySelectorAll('[data-editmekanik]').forEach(b => b.onclick = async () => {
        await formMekanik(b.dataset.editmekanik); segar();
      });
      modal.overlay.querySelectorAll('[data-hapusmekanik]').forEach(b => b.onclick = async () => {
        const db = Store.get();
        const m = db.mechanics.find(x => x.id === b.dataset.hapusmekanik);
        const dipakai = (db.transactions || []).filter(t => t.mekanikId === m.id).length
          + (db.bookings || []).filter(x => x.mekanikId === m.id).length;
        const ok = await UI.konfirmasi({
          pesan: `Hapus mekanik "<b>${U.esc(m.nama)}</b>"?${dipakai ? ` ${dipakai} penugasan tetap tersimpan.` : ''}`,
          labelYa: 'Hapus', bahaya: true
        });
        if (ok) {
          db.mechanics = db.mechanics.filter(x => x.id !== m.id);
          Store.save(); UI.toast('Mekanik dihapus.', 'info'); segar();
        }
      });
    };
    ikat();
  }

  async function formMekanik(id) {
    const db = Store.get();
    const m = id ? (db.mechanics || []).find(x => x.id === id) : null;
    const data = await UI.form({
      judul: m ? 'Ubah Mekanik' : 'Tambah Mekanik',
      lebar: 'kecil',
      fields: [
        { nama: 'nama', label: 'Nama mekanik', tipe: 'teks', wajib: true, lebar: 'panjang',
          nilai: m ? m.nama : '', placeholder: 'Contoh: Agus Priyanto' },
        { nama: 'spesialisasi', label: 'Spesialisasi', tipe: 'teks', lebar: 'panjang',
          nilai: m ? m.spesialisasi : '', placeholder: 'Contoh: Mesin & tune up' },
        { nama: 'aktif', label: 'Status', tipe: 'pilih',
          nilai: m && m.aktif === false ? 'tidak' : 'ya',
          pilihan: [{ nilai: 'ya', label: 'Aktif (bisa ditugaskan)' }, { nilai: 'tidak', label: 'Nonaktif' }] }
      ],
      labelSimpan: 'Simpan'
    });
    if (!data) return;
    if (m) {
      Object.assign(m, { nama: data.nama, spesialisasi: data.spesialisasi, aktif: data.aktif === 'ya' });
      // nama ikut diperbarui pada transaksi & booking yang menunjuk dia
      db.transactions.forEach(t => { if (t.mekanikId === m.id) t.mekanikNama = m.nama; });
      db.bookings.forEach(x => { if (x.mekanikId === m.id) x.mekanikNama = m.nama; });
    } else {
      db.mechanics.push({
        id: Store.nextId('mech', 'MC'),
        nama: data.nama, spesialisasi: data.spesialisasi,
        aktif: data.aktif === 'ya', createdAt: Date.now()
      });
    }
    Store.save();
    UI.toast('Daftar mekanik diperbarui.');
  }

  /* ---------------- Cadangan & pemulihan ---------------- */
  function bukaCadangan() {
    UI.buka({
      judul: 'Cadangan Data',
      isi: `
        <p style="font-size:14px;line-height:1.65;color:var(--teks-2);margin-bottom:14px">
          Semua data disimpan di browser komputer ini (<b>localStorage</b>).
          Unduh cadangan secara berkala agar aman jika komputer berganti atau data browser dibersihkan.
        </p>
        <div class="kartu" style="box-shadow:none;margin-bottom:10px">
          <div class="kartu-isi">
            <div class="baris-total"><span>Jumlah pelanggan</span><span>${U.angka(Store.get().customers.length)}</span></div>
            <div class="baris-total"><span>Jumlah barang</span><span>${U.angka(Store.get().products.length)}</span></div>
            <div class="baris-total"><span>Jumlah layanan</span><span>${U.angka(Store.get().services.length)}</span></div>
            <div class="baris-total"><span>Jumlah transaksi</span><span>${U.angka(Store.get().transactions.length)}</span></div>
            <div class="baris-total"><span>Jumlah booking</span><span>${U.angka(Store.get().bookings.length)}</span></div>
          </div>
        </div>
        <input type="file" id="fileCadangan" accept="application/json,.json" style="display:none">`,
      lebar: 'sedang',
      aksi: [
        {
          label: '🗑 Hapus semua data', kelas: 'btn-bahaya', tutup: false,
          onClick: async ({ tutup }) => {
            const ok = await UI.konfirmasi({
              judul: 'Hapus semua data',
              pesan: 'Seluruh data pelanggan, barang, transaksi, dan booking akan <b>dihapus permanen</b>. Disarankan unduh cadangan dulu. Lanjutkan?',
              labelYa: 'Ya, hapus semua', bahaya: true
            });
            if (ok) { Store.resetAll(); tutup(); UI.toast('Semua data dikembalikan ke kondisi awal.', 'info'); pergi('dasbor'); }
          }
        },
        {
          label: '📤 Unduh cadangan', kelas: 'btn-lembut', tutup: false,
          onClick: () => {
            const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `cadangan-bengkel-${U.today()}.json`;
            document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            UI.toast('File cadangan diunduh.');
          }
        },
        {
          label: '📥 Pulihkan dari file', kelas: 'btn-utama', tutup: false,
          onClick: () => document.getElementById('fileCadangan').click()
        },
        { label: 'Tutup', kelas: 'btn-abu' }
      ]
    });

    const input = document.getElementById('fileCadangan');
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const teks = await file.text();
        const ok = await UI.konfirmasi({
          judul: 'Pulihkan cadangan',
          pesan: `Data saat ini akan <b>digantikan</b> oleh isi file <b>${U.esc(file.name)}</b>. Lanjutkan?`,
          labelYa: 'Pulihkan'
        });
        if (!ok) return;
        Store.importJSON(teks);
        UI.toast('Cadangan berhasil dipulihkan.');
        pergi('dasbor');
        document.querySelectorAll('.overlay').forEach(o => o.remove());
      } catch (e) {
        UI.toast('Gagal memulihkan: ' + e.message, 'gagal');
      }
    };
  }

  /* ---------------- Init ---------------- */
  function mulai() {
    Store.load();
    sinkronNama();

    document.querySelectorAll('.nav-item').forEach(b =>
      b.addEventListener('click', () => pergi(b.dataset.tampilan)));

    document.getElementById('btnPengaturan').addEventListener('click', bukaPengaturan);
    document.getElementById('btnCadangan').addEventListener('click', bukaCadangan);
    document.getElementById('btnLayanan').addEventListener('click', bukaLayanan);
    document.getElementById('btnMekanik').addEventListener('click', bukaMekanik);

    // Pintasan keyboard: Ctrl/Cmd + 1..6
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const urut = ['dasbor', 'kasir', 'pelanggan', 'sparepart', 'booking', 'laporan'];
      const i = Number(e.key) - 1;
      if (i >= 0 && i < urut.length) { e.preventDefault(); pergi(urut[i]); }
    });

    // Buka halaman sesuai alamat (mis. index.html#cek), default ke Dasbor
    const awal = String(location.hash || '').slice(1);
    pergi(JUDUL[awal] ? awal : 'dasbor');
  }

  return { pergi, mulai, bukaPengaturan, bukaCadangan, bukaLayanan, bukaMekanik };
})();

document.addEventListener('DOMContentLoaded', App.mulai);
