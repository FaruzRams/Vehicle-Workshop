/* ==========================================================================
   views/pelanggan.js — Data pelanggan & riwayat service
   ========================================================================== */
window.Views = window.Views || {};

Views.pelanggan = (function () {
  let kata = '';

  const el = () => document.getElementById('t-pelanggan');

  const fieldForm = () => ([
    { nama: 'nama', label: 'Nama pelanggan', tipe: 'teks', wajib: true, lebar: 'panjang', placeholder: 'Contoh: Budi Santoso' },
    { nama: 'hp', label: 'No. HP / WA', tipe: 'teks', placeholder: '08xx xxxx xxxx' },
    { nama: 'kendaraan', label: 'Kendaraan', tipe: 'teks', placeholder: 'Honda Beat, Toyota Avanza, dll.' },
    { nama: 'plat', label: 'No. Polisi', tipe: 'teks', placeholder: 'BM 1234 XY' },
    { nama: 'alamat', label: 'Alamat', tipe: 'teks', lebar: 'panjang' },
    { nama: 'catatan', label: 'Catatan', tipe: 'textarea', lebar: 'panjang', placeholder: 'Riwayat keluhan, preferensi, dll.' }
  ]);

  /* ---------------- Render tabel ---------------- */
  function render() {
    const db = Store.get();
    const kunci = kata.toLowerCase();

    const daftar = db.customers
      .filter(c => !kunci || (c.nama + ' ' + (c.hp || '') + ' ' + (c.plat || '') + ' ' +
        (c.kendaraan || '') + ' ' + (c.alamat || '')).toLowerCase().includes(kunci))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

    el().innerHTML = `
      <div class="toolbar">
        <div class="cari">
          <input type="search" id="cariPelanggan" placeholder="Cari nama, HP, atau plat nomor…" value="${U.esc(kata)}">
        </div>
        <div class="spacer"></div>
        <button class="btn btn-abu" id="btnEksporPelanggan">⬇ Ekspor CSV</button>
        <button class="btn btn-utama" id="btnTambahPelanggan">＋ Tambah Pelanggan</button>
      </div>

      <div class="bungkus-tabel">
        ${daftar.length ? `
        <div class="tabel-scroll">
          <table class="data">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Kendaraan</th>
                <th>Kontak</th>
                <th class="kanan">Kunjungan</th>
                <th class="kanan">Total belanja</th>
                <th class="tengah">Aksi</th>
              </tr>
            </thead>
            <tbody>${daftar.map(c => {
              const riwayat = db.transactions.filter(t => t.customerId === c.id);
              const total = riwayat.reduce((a, t) => a + (t.total || 0), 0);
              const terakhir = riwayat.length
                ? riwayat.map(t => t.tanggal).sort().pop() : null;
              return `
                <tr>
                  <td class="kuat">${U.esc(c.nama)}
                    <span class="sub">${U.esc(c.alamat || '—')}${c.catatan ? ' · ' + U.esc(c.catatan) : ''}</span>
                  </td>
                  <td>${U.esc(c.kendaraan || '—')}
                    <span class="sub">${c.plat ? U.esc(c.plat) : ''}</span></td>
                  <td>${U.esc(c.hp || '—')}
                    ${terakhir ? `<span class="sub">terakhir ${U.tglPanjang(terakhir)}</span>` : ''}</td>
                  <td class="kanan">${U.angka(riwayat.length)}×</td>
                  <td class="kanan kuat">${U.rupiah(total)}</td>
                  <td class="aksi tengah">
                    <button class="btn btn-kecil btn-lembut" data-riwayat="${c.id}">Riwayat</button>
                    <button class="btn btn-kecil btn-abu" data-edit="${c.id}">✏</button>
                    <button class="btn btn-kecil btn-abu" data-hapus="${c.id}">🗑</button>
                  </td>
                </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div class="kaki-tabel">
          <span>${U.angka(daftar.length)} pelanggan ditampilkan</span>
          <span>Total belanja seluruhnya: <b>${U.rupiah(daftar.reduce((a, c) =>
            a + db.transactions.filter(t => t.customerId === c.id).reduce((x, t) => x + t.total, 0), 0))}</b></span>
        </div>`
        : kosongTabel()}
      </div>`;

    // peristiwa
    el().querySelector('#cariPelanggan').addEventListener('input',
      U.debounce(e => { kata = e.target.value; render(); pilihUlang('#cariPelanggan'); }, 200));
    el().querySelector('#btnTambahPelanggan').onclick = tambah;
    el().querySelector('#btnEksporPelanggan').onclick = ekspor;
    el().querySelectorAll('[data-riwayat]').forEach(b => b.onclick = () => riwayat(b.dataset.riwayat));
    el().querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ubah(b.dataset.edit));
    el().querySelectorAll('[data-hapus]').forEach(b => b.onclick = () => hapus(b.dataset.hapus));
  }

  function pilihUlang(sel) {
    const inp = el().querySelector(sel);
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  function kosongTabel() {
    return `<div class="kosong"><span class="kosong-ikon">👥</span>
      <strong>Belum ada data pelanggan</strong>
      <span>Tambahkan pelanggan agar riwayat servicenya tercatat.</span></div>`;
  }

  /* ---------------- Tambah (form cepat untuk kasir) ---------------- */
  async function formCepat() {
    const data = await UI.form({
      judul: 'Tambah Pelanggan Baru',
      fields: fieldForm(),
      labelSimpan: 'Simpan pelanggan'
    });
    if (!data) return null;
    return simpan(data);
  }

  function simpan(data) {
    const db = Store.get();
    const id = Store.nextId('cust', 'CU');
    const c = {
      id, nama: data.nama, hp: data.hp || '', kendaraan: data.kendaraan || '',
      plat: (data.plat || '').toUpperCase(), alamat: data.alamat || '',
      catatan: data.catatan || '', createdAt: Date.now()
    };
    db.customers.push(c);
    Store.save();
    UI.toast(`Pelanggan "${c.nama}" ditambahkan.`);
    return c;
  }

  async function tambah() {
    const data = await UI.form({
      judul: 'Tambah Pelanggan',
      fields: fieldForm(),
      labelSimpan: 'Simpan pelanggan'
    });
    if (data) { simpan(data); render(); }
  }

  async function ubah(id) {
    const db = Store.get();
    const c = db.customers.find(x => x.id === id);
    if (!c) return;
    const data = await UI.form({
      judul: 'Ubah Data Pelanggan',
      fields: fieldForm().map(f => ({ ...f, nilai: c[f.nama] })),
      labelSimpan: 'Simpan perubahan'
    });
    if (!data) return;
    Object.assign(c, {
      nama: data.nama, hp: data.hp || '', kendaraan: data.kendaraan || '',
      plat: (data.plat || '').toUpperCase(), alamat: data.alamat || '',
      catatan: data.catatan || ''
    });
    // ikut perbarui nama pada transaksi lama agar riwayat tetap cocok
    db.transactions.forEach(t => { if (t.customerId === c.id) t.namaPelanggan = c.nama; });
    Store.save();
    UI.toast('Data pelanggan diperbarui.');
    render();
  }

  async function hapus(id) {
    const db = Store.get();
    const c = db.customers.find(x => x.id === id);
    if (!c) return;
    const jml = db.transactions.filter(t => t.customerId === id).length;
    const ok = await UI.konfirmasi({
      judul: 'Hapus pelanggan',
      pesan: `Hapus "<b>${U.esc(c.nama)}</b>" dari data?${jml ? ` Riwayat ${jml} transaksi tetap tersimpan di laporan.` : ''}`,
      labelYa: 'Hapus', bahaya: true
    });
    if (!ok) return;
    db.customers = db.customers.filter(x => x.id !== id);
    Store.save();
    UI.toast('Pelanggan dihapus.', 'info');
    render();
  }

  /* ---------------- Riwayat ---------------- */
  function riwayat(id) {
    const db = Store.get();
    const c = db.customers.find(x => x.id === id);
    if (!c) return;
    const trx = db.transactions.filter(t => t.customerId === id).sort((a, b) => b.waktu - a.waktu);
    const total = trx.reduce((a, t) => a + t.total, 0);

    const isi = `
      <div class="baris-total"><span>${U.esc(c.kendaraan || '—')} ${c.plat ? '· ' + U.esc(c.plat) : ''}</span><span>${U.esc(c.hp || '')}</span></div>
      <div class="baris-total" style="margin-bottom:14px"><span>Total kunjungan</span><span><b>${U.angka(trx.length)}×</b> · <b>${U.rupiah(total)}</b></span></div>
      ${c.catatan ? `<p style="font-size:13.5px;color:var(--teks-2);margin-bottom:14px">📝 ${U.esc(c.catatan)}</p>` : ''}
      ${trx.length ? `<div class="tabel-scroll"><table class="data" style="min-width:auto">
        <thead><tr><th>Tanggal</th><th>Isi service</th><th>Progress</th><th class="kanan">Total</th><th class="tengah"></th></tr></thead>
        <tbody>${trx.map(t => `
          <tr>
            <td class="kuat">${U.tglPanjang(t.tanggal)}<span class="sub">${U.esc(t.no)}</span></td>
            <td>${(t.items || []).map(i => U.esc(i.nama) + ' ×' + i.qty).join(', ')}
              <span class="sub">${U.esc(t.metode)}${t.mekanikNama ? ' · 👷 ' + U.esc(t.mekanikNama) : ''}</span></td>
            <td>${Views.progres.badgeTahap(t.tahap || 'selesai')}</td>
            <td class="kanan kuat">${U.rupiah(t.total)}</td>
            <td class="tengah">
              <button class="btn btn-kecil btn-lembut" data-atur="${t.id}">🔄</button>
              <button class="btn btn-kecil btn-abu" data-wa="${t.id}" title="Kirim tautan cek via WhatsApp">📲</button>
              <button class="btn btn-kecil btn-abu" data-cetak="${t.id}">🖨</button>
            </td>
          </tr>`).join('')}</tbody></table></div>`
      : `<div class="kosong"><span class="kosong-ikon">🧾</span><strong>Belum pernah servis</strong>
          <span>Transaksi pertama akan muncul di sini.</span></div>`}`;

    const m = UI.buka({
      judul: 'Riwayat — ' + c.nama,
      isi, lebar: 'besar',
      aksi: [{ label: 'Tutup', kelas: 'btn-abu' }]
    });
    m.overlay.querySelectorAll('[data-cetak]').forEach(b => b.onclick = () => {
      const t = Store.get().transactions.find(x => x.id === b.dataset.cetak);
      if (t) { m.tutup(); Views.kasir.cetakStruk(t); }
    });
    m.overlay.querySelectorAll('[data-atur]').forEach(b => b.onclick = async () => {
      await Views.progres.aturTransaksi(b.dataset.atur);
      m.tutup();
      render();
    });
    m.overlay.querySelectorAll('[data-wa]').forEach(b => b.onclick = () => {
      const t = Store.get().transactions.find(x => x.id === b.dataset.wa);
      if (!t) return;
      Views.progres.bagianWa({
        hp: t.hp || c.hp, nama: t.namaPelanggan || c.nama, plat: t.plat || c.plat,
        kode: t.no,
        status: Views.progres.infoTahap(t.tahap || 'selesai').label,
        catatan: ((t.tahapRiwayat || []).slice().reverse().find(r => r.catatan) || {}).catatan || ''
      });
    });
  }

  function ekspor() {
    const db = Store.get();
    const baris = [['Nama', 'No. HP', 'Kendaraan', 'No. Polisi', 'Alamat', 'Catatan', 'Kunjungan', 'Total Belanja']];
    db.customers.slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id')).forEach(c => {
      const trx = db.transactions.filter(t => t.customerId === c.id);
      baris.push([c.nama, c.hp, c.kendaraan, c.plat, c.alamat, c.catatan,
        trx.length, trx.reduce((a, t) => a + t.total, 0)]);
    });
    U.downloadCSV(`pelanggan-${U.today()}.csv`, baris);
    UI.toast('Data pelanggan diunduh (CSV).', 'info');
  }

  return { render, formCepat, riwayat };
})();
