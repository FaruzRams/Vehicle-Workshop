/* ==========================================================================
   views/booking.js — Booking jadwal & antrian kendaraan
   ========================================================================== */
window.Views = window.Views || {};

Views.booking = (function () {
  let tanggal = U.today();
  let statusFilter = '';

  const el = () => document.getElementById('t-booking');

  const LABEL_STATUS = {
    menunggu: 'Menunggu', dikerjakan: 'Dikerjakan', selesai: 'Selesai', batal: 'Batal'
  };
  const LENCANA = { menunggu: 'kuning', dikerjakan: 'biru', selesai: 'hijau', batal: 'abu' };

  const fieldForm = (b) => ([
    { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, nilai: b ? b.tanggal : tanggal },
    { nama: 'jam', label: 'Jam', tipe: 'waktu', wajib: true, nilai: b ? b.jam : '09:00' },
    { nama: 'namaPelanggan', label: 'Nama pelanggan', tipe: 'teks', wajib: true, nilai: b ? b.namaPelanggan : '', placeholder: 'Nama pelanggan' },
    { nama: 'hp', label: 'No. HP', tipe: 'teks', nilai: b ? b.hp : '', placeholder: '08xx xxxx xxxx' },
    { nama: 'kendaraan', label: 'Kendaraan', tipe: 'teks', nilai: b ? b.kendaraan : '', placeholder: 'Honda Beat, Avanza, dll.' },
    { nama: 'plat', label: 'No. Polisi', tipe: 'teks', nilai: b ? b.plat : '', placeholder: 'BM 1234 XY' },
    { nama: 'layanan', label: 'Layanan yang diminta', tipe: 'pilih', lebar: 'panjang', nilai: b ? b.layanan : '', pilihan: layananOpsi() },
    { nama: 'mekanik', label: 'Mekanik yang ditugaskan', tipe: 'pilih', lebar: 'panjang', nilai: b ? b.mekanikId || '' : '', pilihan: Views.progres.pilihanOpsiMekanik() },
    { nama: 'keluhan', label: 'Keluhan / keterangan', tipe: 'textarea', lebar: 'panjang', nilai: b ? b.keluhan : '', placeholder: 'Ceritakan gejala atau permintaan pelanggan…' }
  ]);

  function layananOpsi() {
    return Store.get().services
      .filter(s => s.aktif !== false)
      .map(s => ({ nilai: s.nama, label: `${s.nama} — ${U.rupiah(s.harga)}` }));
  }

  /* ---------------- Render ---------------- */
  function render() {
    const db = Store.get();
    const semua = db.bookings.filter(b => b.tanggal === tanggal);
    const daftar = semua
      .filter(b => !statusFilter || b.status === statusFilter)
      .sort((a, b) => (a.jam || '').localeCompare(b.jam || ''));

    const hitung = (s) => semua.filter(b => b.status === s).length;
    const urutan = ['menunggu', 'dikerjakan', 'selesai'];

    el().innerHTML = `
      <div class="toolbar">
        <div class="nav-tanggal">
          <button class="btn btn-abu btn-ikonal" id="tglSebelum" title="Hari sebelumnya">‹</button>
          <input type="date" id="pilihTanggal" value="${tanggal}" style="width:auto">
          <button class="btn btn-abu btn-ikonal" id="tglSesudah" title="Hari berikutnya">›</button>
          <button class="btn btn-lembut btn-kecil" id="tglHariIni">Hari ini</button>
        </div>
        <div class="spacer"></div>
        <button class="btn btn-utama" id="btnTambahBooking">＋ Tambah Booking</button>
      </div>

      <div class="toolbar" style="margin-top:-6px">
        <button class="btn btn-kecil ${statusFilter === '' ? 'btn-utama' : 'btn-abu'}" data-filter="">Semua (${semua.length})</button>
        ${urutan.map(s => `<button class="btn btn-kecil ${statusFilter === s ? 'btn-utama' : 'btn-abu'}" data-filter="${s}">
          ${LABEL_STATUS[s]} (${hitung(s)})</button>`).join('')}
        ${hitung('batal') ? `<button class="btn btn-kecil ${statusFilter === 'batal' ? 'btn-utama' : 'btn-abu'}" data-filter="batal">Batal (${hitung('batal')})</button>` : ''}
        <div class="spacer"></div>
        <span style="font-size:13px;color:var(--teks-2)">
          ${U.tglRingkas(tanggal)} · ${hitung('menunggu')} menunggu · ${hitung('dikerjakan')} dalam antrian
        </span>
      </div>

      <div id="daftarBooking">
        ${daftar.length ? daftar.map(kartu).join('') : `
          <div class="kartu"><div class="kosong">
            <span class="kosong-ikon">📅</span>
            <strong>Tidak ada booking pada tanggal ini</strong>
            <span>Tekan "Tambah Booking" untuk mencatat jadwal baru.</span>
          </div></div>`}
      </div>`;

    // peristiwa tanggal
    el().querySelector('#tglSebelum').onclick = () => geserHari(-1);
    el().querySelector('#tglSesudah').onclick = () => geserHari(1);
    el().querySelector('#tglHariIni').onclick = () => { tanggal = U.today(); render(); };
    el().querySelector('#pilihTanggal').onchange = e => { if (e.target.value) { tanggal = e.target.value; render(); } };
    el().querySelector('#btnTambahBooking').onclick = () => tambah();

    el().querySelectorAll('[data-filter]').forEach(b =>
      b.onclick = () => { statusFilter = b.dataset.filter; render(); });

    // aksi kartu
    el().querySelectorAll('[data-statuskan]').forEach(b => b.onclick = () =>
      ubahStatus(b.dataset.id, b.dataset.statuskan));
    el().querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ubah(b.dataset.edit));
    el().querySelectorAll('[data-hapus]').forEach(b => b.onclick = () => hapus(b.dataset.hapus));
    el().querySelectorAll('[data-kasir]').forEach(b => b.onclick = () => keKasir(b.dataset.kasir));
    el().querySelectorAll('[data-tugas]').forEach(b => b.onclick = async () => {
      await Views.progres.aturBooking(b.dataset.tugas);
      render();
    });
    el().querySelectorAll('[data-wa]').forEach(b => b.onclick = () => {
      const bk = Store.get().bookings.find(x => x.id === b.dataset.wa);
      if (!bk) return;
      Views.progres.bagianWa({
        hp: bk.hp, nama: bk.namaPelanggan, kendaraan: bk.kendaraan, plat: bk.plat,
        kode: Views.progres.kodeBooking(bk),
        status: Views.progres.infoStatus(bk.status).label,
        catatan: bk.keluhan
      });
    });
  }

  function geserHari(n) {
    const d = U.parseDate(tanggal);
    d.setDate(d.getDate() + n);
    tanggal = U.isoDate(d);
    render();
  }

  function kartu(b) {
    const bisaKerjakan = b.status === 'menunggu';
    const bisaSelesai = b.status === 'dikerjakan' || b.status === 'menunggu';
    return `
      <div class="kartu-booking" data-kartu-status="${b.status}">
        <div class="bk-utama">
          <div class="bk-jam">${U.esc(b.jam || '--:--')}</div>
          <div class="bk-nama">${U.esc(b.namaPelanggan)}</div>
          <div class="bk-ket">
            ${U.esc(b.kendaraan || 'Kendaraan belum dicatat')}${b.plat ? ' · ' + U.esc(b.plat) : ''}
            ${b.layanan ? '<br>🛠 ' + U.esc(b.layanan) : ''}
            ${b.keluhan ? '<br>💬 ' + U.esc(b.keluhan) : ''}
          </div>
          <div class="bk-tag">${b.hp ? '📱 ' + U.esc(b.hp) : ''}${b.mekanikNama ? ' · 👷 ' + U.esc(b.mekanikNama) : ''}</div>
        </div>
        <div class="bk-sisi">
          <span class="lencana lencana-${LENCANA[b.status]}">${LABEL_STATUS[b.status]}</span>
          <div class="bk-aksi">
            ${bisaKerjakan ? `<button class="btn btn-kecil btn-lembut" data-statuskan="dikerjakan" data-id="${b.id}">▶ Kerjakan</button>` : ''}
            ${bisaSelesai ? `<button class="btn btn-kecil btn-sukses" data-statuskan="selesai" data-id="${b.id}">✓ Selesai</button>` : ''}
            ${b.status !== 'selesai' && b.status !== 'batal' ? `<button class="btn btn-kecil btn-abu" data-statuskan="batal" data-id="${b.id}">Batal</button>` : ''}
            <button class="btn btn-kecil btn-abu" data-wa="${b.id}" title="Kirim tautan cek progress via WhatsApp">📲</button>
            <button class="btn btn-kecil btn-abu" data-tugas="${b.id}" title="Tugaskan mekanik">👷 ${b.mekanikNama ? 'Ganti' : 'Tugaskan'}</button>
            <button class="btn btn-kecil btn-utama" data-kasir="${b.id}">🧾 ke Kasir</button>
            <button class="btn btn-kecil btn-abu" data-edit="${b.id}">✏</button>
            <button class="btn btn-kecil btn-abu" data-hapus="${b.id}">🗑</button>
          </div>
        </div>
      </div>`;
  }

  /* ---------------- Aksi ---------------- */
  function ubahStatus(id, status) {
    const b = Store.get().bookings.find(x => x.id === id);
    if (!b) return;
    b.status = status;
    Store.save();
    UI.toast(`Booking ${b.namaPelanggan} → ${LABEL_STATUS[status]}.`, 'info');
    render();
  }

  async function tambah(b) {
    const data = await UI.form({
      judul: b ? 'Ubah Booking' : 'Tambah Booking Baru',
      fields: fieldForm(b),
      labelSimpan: b ? 'Simpan perubahan' : 'Simpan booking'
    });
    if (!data) return;
    const db = Store.get();
    const mekanik = data.mekanik ? Views.progres.dariId(data.mekanik) : null;
    const isi = {
      tanggal: data.tanggal, jam: data.jam,
      namaPelanggan: data.namaPelanggan, hp: data.hp,
      kendaraan: data.kendaraan, plat: (data.plat || '').toUpperCase(),
      layanan: data.layanan, keluhan: data.keluhan,
      mekanikId: mekanik ? mekanik.id : '',
      mekanikNama: mekanik ? mekanik.nama : ''
    };
    if (b) {
      Object.assign(b, isi);
      b.updatedAt = Date.now();
      Store.save();
      UI.toast('Booking diperbarui.');
    } else {
      db.bookings.push({
        id: Store.nextId('book', 'BK'),
        ...isi,
        status: 'menunggu',
        createdAt: Date.now()
      });
      Store.save();
      tanggal = data.tanggal;
      UI.toast(`Booking untuk ${data.namaPelanggan} dicatat.`);
    }
    render();
  }

  async function ubah(id) {
    const b = Store.get().bookings.find(x => x.id === id);
    if (b) tambah(b);
  }

  async function hapus(id) {
    const b = Store.get().bookings.find(x => x.id === id);
    if (!b) return;
    const ok = await UI.konfirmasi({
      judul: 'Hapus booking',
      pesan: `Hapus booking <b>${U.esc(b.namaPelanggan)}</b> pada ${U.tglPanjang(b.tanggal)} pukul ${U.esc(b.jam)}?`,
      labelYa: 'Hapus', bahaya: true
    });
    if (!ok) return;
    const db = Store.get();
    db.bookings = db.bookings.filter(x => x.id !== id);
    Store.save();
    UI.toast('Booking dihapus.', 'info');
    render();
  }

  /** Cari atau buat pelanggan dari data booking, lalu buka kasir */
  function keKasir(id) {
    const db = Store.get();
    const b = db.bookings.find(x => x.id === id);
    if (!b) return;

    let pelanggan = db.customers.find(c =>
      (b.hp && c.hp === b.hp) || (b.plat && c.plat === b.plat) ||
      (b.namaPelanggan && c.nama.toLowerCase() === b.namaPelanggan.toLowerCase()));

    if (!pelanggan) {
      pelanggan = {
        id: Store.nextId('cust', 'CU'),
        nama: b.namaPelanggan, hp: b.hp || '', kendaraan: b.kendaraan || '',
        plat: (b.plat || '').toUpperCase(), alamat: '', catatan: 'Dibuat dari booking ' + U.tglPanjang(b.tanggal),
        createdAt: Date.now()
      };
      db.customers.push(pelanggan);
      Store.save();
    }

    Views.kasir.siapkan(pelanggan);
    UI.toast(`Kasir siap untuk ${pelanggan.nama} (${b.layanan || 'servis'}).`, 'info');
    App.pergi('kasir');
  }

  return { render };
})();
