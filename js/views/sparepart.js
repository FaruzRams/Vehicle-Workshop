/* ==========================================================================
   views/sparepart.js — Manajemen stok & harga sparepart
   ========================================================================== */
window.Views = window.Views || {};

Views.sparepart = (function () {
  let kata = '';
  let kategori = '';
  let hanyaKritis = false;

  const el = () => document.getElementById('t-sparepart');

  const fieldForm = (p) => ([
    { nama: 'kode', label: 'Kode barang (SKU)', tipe: 'teks', nilai: p ? p.kode : '', placeholder: 'Otomatis jika kosong' },
    { nama: 'nama', label: 'Nama barang', tipe: 'teks', wajib: true, nilai: p ? p.nama : '', lebar: 'panjang', placeholder: 'Contoh: Oli Mesin MPX2 1L' },
    { nama: 'kategori', label: 'Kategori', tipe: 'teks', nilai: p ? p.kategori : '', placeholder: 'Pelumas, Rem, Kelistrikan, dll.' },
    { nama: 'satuan', label: 'Satuan', tipe: 'teks', nilai: p ? (p.satuan || 'pcs') : 'pcs', placeholder: 'pcs, liter, set' },
    { nama: 'hargaBeli', label: 'Harga beli (modal)', tipe: 'angka', wajib: true, nilai: p ? p.hargaBeli : 0, min: 0 },
    { nama: 'hargaJual', label: 'Harga jual', tipe: 'angka', wajib: true, nilai: p ? p.hargaJual : 0, min: 0 },
    { nama: 'stok', label: 'Stok saat ini', tipe: 'angka', nilai: p ? p.stok : 0, min: 0, petunjuk: 'Ubah lewat tombol +/- di tabel untuk riwayat yang lebih rapi.' },
    { nama: 'stokMin', label: 'Batas stok minimum', tipe: 'angka', nilai: p ? p.stokMin != null ? p.stokMin : 3 : 3, min: 0, petunjuk: 'Ditandai merah bila stok menyentuh angka ini.' }
  ]);

  /* ---------------- Render ---------------- */
  function render() {
    const db = Store.get();
    const kunci = kata.toLowerCase();
    const daftarKategori = [...new Set(db.products.map(p => p.kategori).filter(Boolean))].sort();

    const daftar = db.products.filter(p => {
      if (kunci && !(p.nama + ' ' + (p.kode || '') + ' ' + (p.kategori || '')).toLowerCase().includes(kunci)) return false;
      if (kategori && p.kategori !== kategori) return false;
      if (hanyaKritis && (p.stok || 0) > (p.stokMin || 0)) return false;
      return true;
    }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

    const nilai = daftar.reduce((a, p) => a + (p.hargaBeli || 0) * (p.stok || 0), 0);
    const kritis = db.products.filter(p => (p.stok || 0) <= (p.stokMin || 0)).length;

    el().innerHTML = `
      <div class="toolbar">
        <div class="cari">
          <input type="search" id="cariBarang" placeholder="Cari nama, kode, atau kategori…" value="${U.esc(kata)}">
        </div>
        <select id="filterKategori" style="width:auto;min-width:160px">
          <option value="">Semua kategori</option>
          ${daftarKategori.map(k => `<option ${k === kategori ? 'selected' : ''}>${U.esc(k)}</option>`).join('')}
        </select>
        <button class="btn ${hanyaKritis ? 'btn-utama' : 'btn-abu'}" id="btnKritis">
          ⚠ Stok menipis ${kritis ? '(' + kritis + ')' : ''}
        </button>
        <div class="spacer"></div>
        <button class="btn btn-abu" id="btnEksporBarang">⬇ Ekspor CSV</button>
        <button class="btn btn-utama" id="btnTambahBarang">＋ Tambah Barang</button>
      </div>

      <div class="bungkus-tabel">
        ${daftar.length ? `
        <div class="tabel-scroll">
          <table class="data">
            <thead>
              <tr>
                <th>Barang</th>
                <th class="kanan">Harga beli</th>
                <th class="kanan">Harga jual</th>
                <th class="kanan">Margin</th>
                <th class="tengah">Stok</th>
                <th class="kanan">Nilai stok</th>
                <th class="tengah">Aksi</th>
              </tr>
            </thead>
            <tbody>${daftar.map(p => {
              const kritisBaris = (p.stok || 0) <= (p.stokMin || 0);
              const margin = (p.hargaJual || 0) - (p.hargaBeli || 0);
              const marginPct = p.hargaBeli ? Math.round(margin / p.hargaBeli * 100) : 0;
              return `
                <tr class="${kritisBaris ? 'baris-stok-rendah' : ''}">
                  <td class="kuat">${U.esc(p.nama)}
                    <span class="sub">${U.esc(p.kode || '')}${p.kategori ? ' · ' + U.esc(p.kategori) : ''}</span>
                  </td>
                  <td class="kanan">${U.rupiah(p.hargaBeli)}</td>
                  <td class="kanan kuat">${U.rupiah(p.hargaJual)}</td>
                  <td class="kanan">${U.rupiah(margin)}<span class="sub">${marginPct}%</span></td>
                  <td class="tengah">
                    <span class="lencana lencana-${p.stok <= 0 ? 'merah' : kritisBaris ? 'kuning' : 'hijau'}">
                      ${U.angka(p.stok)} ${U.esc(p.satuan || 'pcs')}
                    </span>
                    ${p.stok <= (p.stokMin || 0) ? `<span class="sub" style="color:var(--bahaya)">min ${p.stokMin}</span>` : ''}
                  </td>
                  <td class="kanan">${U.rupiah((p.hargaBeli || 0) * (p.stok || 0))}</td>
                  <td class="aksi tengah">
                    <button class="btn btn-kecil btn-lembut" data-stok="${p.id}" title="Tambah / kurangi stok">± Stok</button>
                    <button class="btn btn-kecil btn-abu" data-edit="${p.id}">✏</button>
                    <button class="btn btn-kecil btn-abu" data-hapus="${p.id}">🗑</button>
                  </td>
                </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div class="kaki-tabel">
          <span>${U.angka(daftar.length)} barang ditampilkan</span>
          <span>Nilai persediaan: <b>${U.rupiah(nilai)}</b></span>
        </div>`
        : `<div class="kosong"><span class="kosong-ikon">📦</span>
            <strong>Tidak ada barang yang cocok</strong>
            <span>Ubah kata kunci atau tambah barang baru.</span></div>`}
      </div>`;

    el().querySelector('#cariBarang').addEventListener('input',
      U.debounce(e => { kata = e.target.value; render(); fokusUlang(); }, 200));
    el().querySelector('#filterKategori').onchange = e => { kategori = e.target.value; render(); };
    el().querySelector('#btnKritis').onclick = () => { hanyaKritis = !hanyaKritis; render(); };
    el().querySelector('#btnTambahBarang').onclick = tambah;
    el().querySelector('#btnEksporBarang').onclick = ekspor;
    el().querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ubah(b.dataset.edit));
    el().querySelectorAll('[data-hapus]').forEach(b => b.onclick = () => hapus(b.dataset.hapus));
    el().querySelectorAll('[data-stok]').forEach(b => b.onclick = () => adjustStok(b.dataset.stok));
  }

  function fokusUlang() {
    const inp = el().querySelector('#cariBarang');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  /* ---------------- CRUD ---------------- */
  async function tambah() {
    const data = await UI.form({
      judul: 'Tambah Barang Sparepart',
      fields: fieldForm(null),
      labelSimpan: 'Simpan barang'
    });
    if (!data) return;
    const db = Store.get();
    const urut = db.products.length + 1;
    db.products.push({
      id: Store.nextId('prod', 'BR'),
      kode: data.kode || 'SKU-' + String(urut).padStart(4, '0'),
      nama: data.nama, kategori: data.kategori || 'Umum',
      satuan: data.satuan || 'pcs',
      hargaBeli: data.hargaBeli, hargaJual: data.hargaJual,
      stok: data.stok, stokMin: data.stokMin,
      updatedAt: Date.now()
    });
    Store.save();
    UI.toast(`Barang "${data.nama}" ditambahkan.`);
    render();
  }

  async function ubah(id) {
    const db = Store.get();
    const p = db.products.find(x => x.id === id);
    if (!p) return;
    const data = await UI.form({
      judul: 'Ubah Barang',
      fields: fieldForm(p),
      labelSimpan: 'Simpan perubahan'
    });
    if (!data) return;
    Object.assign(p, {
      kode: data.kode || p.kode, nama: data.nama, kategori: data.kategori || 'Umum',
      satuan: data.satuan || 'pcs', hargaBeli: data.hargaBeli, hargaJual: data.hargaJual,
      stok: data.stok, stokMin: data.stokMin, updatedAt: Date.now()
    });
    Store.save();
    UI.toast('Barang diperbarui.');
    render();
  }

  async function hapus(id) {
    const db = Store.get();
    const p = db.products.find(x => x.id === id);
    if (!p) return;
    const dipakai = db.transactions.some(t => (t.items || []).some(i => i.refId === id));
    const ok = await UI.konfirmasi({
      judul: 'Hapus barang',
      pesan: `Hapus "<b>${U.esc(p.nama)}</b>" dari daftar stok?${dipakai ? ' Riwayat penjualan lama tetap tersimpan.' : ''}`,
      labelYa: 'Hapus', bahaya: true
    });
    if (!ok) return;
    db.products = db.products.filter(x => x.id !== id);
    Store.save();
    UI.toast('Barang dihapus.', 'info');
    render();
  }

  /* ---------------- Penyesuaian stok ---------------- */
  async function adjustStok(id) {
    const db = Store.get();
    const p = db.products.find(x => x.id === id);
    if (!p) return;

    const data = await UI.form({
      judul: 'Sesuaikan Stok — ' + p.nama,
      lebar: 'kecil',
      fields: [
        { nama: 'jenis', label: 'Jenis penyesuaian', tipe: 'pilih', wajib: true, lebar: 'panjang',
          nilai: 'masuk',
          pilihan: [
            { nilai: 'masuk', label: 'Barang masuk (pembelian)' },
            { nilai: 'keluar', label: 'Barang keluar (rusak / hilang)' },
            { nilai: 'set', label: 'Tetapkan langsung (stok opname)' }
          ] },
        { nama: 'jumlah', label: 'Jumlah', tipe: 'angka', wajib: true, min: 0, lebar: 'panjang' },
        { nama: 'keterangan', label: 'Keterangan', tipe: 'teks', lebar: 'panjang', placeholder: 'Opsional' },
        { nama: 'stokSekarang', label: 'Stok saat ini', tipe: 'angka', nilai: p.stok, mati: true, lebar: 'panjang' }
      ],
      labelSimpan: 'Terapkan'
    });
    if (!data) return;

    const sebelum = p.stok || 0;
    if (data.jenis === 'masuk') p.stok = sebelum + data.jumlah;
    else if (data.jenis === 'keluar') p.stok = Math.max(0, sebelum - data.jumlah);
    else p.stok = data.jumlah;

    p.updatedAt = Date.now();
    Store.save();
    UI.toast(`Stok ${p.nama}: ${sebelum} → ${p.stok}. ${data.keterangan || ''}`, 'sukses');
    render();
  }

  function ekspor() {
    const db = Store.get();
    const baris = [['Kode', 'Nama', 'Kategori', 'Satuan', 'Harga Beli', 'Harga Jual', 'Stok', 'Batas Min', 'Nilai Stok']];
    db.products.forEach(p => baris.push([
      p.kode, p.nama, p.kategori, p.satuan || 'pcs',
      p.hargaBeli, p.hargaJual, p.stok, p.stokMin,
      (p.hargaBeli || 0) * (p.stok || 0)
    ]));
    U.downloadCSV(`sparepart-${U.today()}.csv`, baris);
    UI.toast('Daftar sparepart diunduh (CSV).', 'info');
  }

  return { render };
})();
