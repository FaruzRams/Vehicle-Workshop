/* ==========================================================================
   views/kasir.js — Kasir, keranjang, pembayaran, cetak struk
   ========================================================================== */
window.Views = window.Views || {};

Views.kasir = (function () {

  /* ---------------- Status lokal ---------------- */
  let keranjang = [];   // {tipe, refId, nama, harga, qty, modal, stok}
  let pelangganId = ''; // '' = pelanggan umum
  let diskon = 0;
  let metode = 'Tunai';
  let bayar = 0;
  let mekanikId = '';
  let tahap = 'selesai';
  let tab = 'jasa';
  let kata = '';

  const el = () => document.getElementById('t-kasir');

  /** Dipanggil view lain (mis. dari booking) untuk membuka kasir siap pakai */
  function siapkan(pelanggan) {
    keranjang = []; diskon = 0; bayar = 0; metode = 'Tunai';
    pelangganId = pelanggan && pelanggan.id ? pelanggan.id : '';
    mekanikId = ''; tahap = 'selesai';
    tab = 'jasa'; kata = '';
  }

  function reset() {
    keranjang = []; pelangganId = ''; diskon = 0; bayar = 0; metode = 'Tunai';
    mekanikId = ''; tahap = 'selesai';
    tab = 'jasa'; kata = '';
  }

  /* ---------------- Render ---------------- */
  function render() {
    const db = Store.get();

    el().innerHTML = `
      <div class="kasir-wrap">
        <div class="pilih-barang">
          <div class="tab-bar">
            <button type="button" class="tab-btn ${tab === 'jasa' ? 'aktif' : ''}" data-tab="jasa">🛠️ Jasa / Layanan</button>
            <button type="button" class="tab-btn ${tab === 'barang' ? 'aktif' : ''}" data-tab="barang">📦 Sparepart</button>
          </div>
          <div class="kasir-cari">
            <div class="cari">
              <input type="search" id="kasirCari" placeholder="${tab === 'jasa' ? 'Cari layanan, contoh: ganti oli' : 'Cari barang, kode, kategori...'}" value="${U.esc(kata)}">
            </div>
          </div>
          <div class="daftar-pilih" id="daftarPilih"></div>
        </div>

        <div class="keranjang" id="keranjangPanel"></div>
      </div>`;

    // peristiwa samping
    el().querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab; kata = ''; render();
    }));
    el().querySelector('#kasirCari').addEventListener('input',
      U.debounce((e) => { kata = e.target.value; gambarDaftar(); }, 180));

    gambarDaftar();
    gambarKeranjang();
    gambarJudul();
  }

  function gambarJudul() {
    const aksi = document.getElementById('kepalaAksi');
    aksi.innerHTML = `<button class="btn btn-abu" id="btnRiwayatHari">🧾 Transaksi hari ini</button>`;
    aksi.querySelector('#btnRiwayatHari').addEventListener('click', riwayatHariIni);
  }

  /* ---------------- Daftar pilihan barang / jasa ---------------- */
  function gambarDaftar() {
    const db = Store.get();
    const kotak = el().querySelector('#daftarPilih');
    if (!kotak) return;
    const kunci = kata.toLowerCase();

    if (tab === 'jasa') {
      const daftar = db.services.filter(s => s.aktif !== false &&
        (!kunci || (s.nama + ' ' + (s.ket || '')).toLowerCase().includes(kunci)));
      kotak.innerHTML = daftar.length ? daftar.map(s => `
        <button type="button" class="kotak-item" data-jasa="${s.id}">
          <span class="ki-nama">${U.esc(s.nama)}</span>
          <span class="ki-harga">${U.rupiah(s.harga)}</span>
          <span class="ki-meta">${U.esc(s.ket || 'layanan bengkel')}</span>
        </button>`).join('') : kosong('🔍', 'Layanan tidak ditemukan', 'Coba kata kunci lain atau tambah jasa di Pengaturan.');

      kotak.querySelectorAll('[data-jasa]').forEach(b =>
        b.addEventListener('click', () => tambah('jasa', b.dataset.jasa)));
    } else {
      const daftar = db.products.filter(p =>
        !kunci || (p.nama + ' ' + (p.kode || '') + ' ' + (p.kategori || '')).toLowerCase().includes(kunci));
      kotak.innerHTML = daftar.length ? daftar.map(p => {
        const sisa = p.stok || 0;
        const diKeranjang = keranjang.find(i => i.refId === p.id)?.qty || 0;
        const tersedia = sisa - diKeranjang;
        return `<button type="button" class="kotak-item" data-brg="${p.id}" ${tersedia <= 0 ? 'disabled' : ''}>
          <span class="ki-nama">${U.esc(p.nama)}</span>
          <span class="ki-harga">${U.rupiah(p.hargaJual)}</span>
          <span class="ki-meta ${sisa <= (p.stokMin || 0) ? 'kritis' : ''}">
            ${sisa <= 0 ? 'stok habis' : 'stok ' + U.angka(sisa) + ' ' + U.esc(p.satuan || 'pcs')}
            ${p.kode ? ' · ' + U.esc(p.kode) : ''}
          </span>
        </button>`;
      }).join('') : kosong('🔍', 'Barang tidak ditemukan', 'Coba kata kunci lain atau tambah sparepart baru.');

      kotak.querySelectorAll('[data-brg]').forEach(b =>
        b.addEventListener('click', () => tambah('barang', b.dataset.brg)));
    }
  }

  function kosong(ikon, judul, teks) {
    return `<div class="kosong" style="grid-column:1/-1"><span class="kosong-ikon">${ikon}</span>
      <strong>${judul}</strong><span>${teks}</span></div>`;
  }

  /* ---------------- Keranjang ---------------- */
  function tambah(tipe, refId) {
    const db = Store.get();
    const item = keranjang.find(i => i.tipe === tipe && i.refId === refId);

    if (tipe === 'jasa') {
      const s = db.services.find(x => x.id === refId);
      if (!s) return;
      if (item) item.qty += 1;
      else keranjang.push({ tipe, refId, nama: s.nama, harga: s.harga, qty: 1, modal: 0 });
    } else {
      const p = db.products.find(x => x.id === refId);
      if (!p) return;
      const dipakai = item ? item.qty : 0;
      if (dipakai + 1 > (p.stok || 0)) { UI.toast('Stok "' + p.nama + '" tidak cukup.', 'peringatan'); return; }
      if (item) item.qty += 1;
      else keranjang.push({ tipe, refId, nama: p.nama, harga: p.hargaJual, qty: 1, modal: p.hargaBeli, stok: p.stok });
    }

    gambarKeranjang();
    if (tipe === 'barang') gambarDaftar();
  }

  function ubahQty(idx, delta) {
    const it = keranjang[idx];
    if (!it) return;
    let q = it.qty + delta;
    if (q <= 0) { hapusItem(idx); return; }
    if (it.tipe === 'barang') {
      const p = Store.get().products.find(x => x.id === it.refId);
      const maks = p ? (p.stok || 0) : q;
      if (q > maks) { UI.toast('Melebihi stok tersedia (' + maks + ').', 'peringatan'); q = maks; }
    }
    it.qty = q;
    gambarKeranjang();
    if (it.tipe === 'barang') gambarDaftar();
  }

  function hapusItem(idx) {
    const it = keranjang[idx];
    keranjang.splice(idx, 1);
    gambarKeranjang();
    if (it && it.tipe === 'barang') gambarDaftar();
  }

  function hitungTotal() {
    const subtotal = keranjang.reduce((a, i) => a + i.harga * i.qty, 0);
    const potongan = Math.min(Math.max(0, diskon), subtotal);
    const total = subtotal - potongan;
    const kembali = bayar - total;
    return { subtotal, potongan, total, kembali };
  }

  function gambarKeranjang() {
    const db = Store.get();
    const panel = document.getElementById('keranjangPanel');
    if (!panel) return;
    const { subtotal, potongan, total, kembali } = hitungTotal();

    const opsiPelanggan = db.customers
      .slice().sort((a, b) => a.nama.localeCompare(b.nama))
      .map(c => `<option value="${c.id}" ${c.id === pelangganId ? 'selected' : ''}>${U.esc(c.nama)}${c.plat ? ' — ' + U.esc(c.plat) : ''}</option>`)
      .join('');

    panel.innerHTML = `
      <div class="keranjang-kepala">
        <h3>🧾 Transaksi Baru</h3>
        <div class="form-field">
          <label>Pelanggan</label>
          <select id="pilihPelanggan">
            <option value="">— Pelanggan umum —</option>
            ${opsiPelanggan}
            <option value="__baru__">＋ Tambah pelanggan baru…</option>
          </select>
        </div>
      </div>

      <div class="keranjang-daftar" id="isiKeranjang"></div>

      <div class="keranjang-kaki">
        <div class="baris-total"><span>Subtotal</span><span id="lblSubtotal">${U.rupiah(subtotal)}</span></div>
        <div class="diskon-baris">
          <label for="inputDiskon">Diskon (Rp)</label>
          <input type="number" id="inputDiskon" min="0" step="1000" value="${diskon || ''}" placeholder="0">
        </div>
        <div class="baris-total"><span>Jumlah bayar</span><span id="lblTotal">${U.rupiah(total)}</span></div>

        <div class="bayar-grup">
          <div class="form-field">
            <label>Mekanik</label>
            <select id="pilihMekanik">${Views.progres.pilihanMekanik(mekanikId)}</select>
          </div>
          <div class="form-field">
            <label>Tahap pengerjaan</label>
            <select id="pilihTahap">
              ${Views.progres.TAHAP.map(x => `<option value="${x.nilai}" ${x.nilai === tahap ? 'selected' : ''}>${x.ikon} ${x.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="bayar-grup">
          <div class="form-field">
            <label>Metode</label>
            <select id="pilihMetode">
              ${['Tunai', 'Transfer', 'QRIS', 'Debit']
                .map(m => `<option ${m === metode ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label>Diterima (Rp)</label>
            <input type="number" id="inputBayar" min="0" step="1000" value="${bayar || ''}" placeholder="0">
          </div>
        </div>

        <div class="baris-total bayar ${kembali < 0 ? 'kurang' : 'lebih'}" id="barisSelisih">
          <span id="lblSelisih">${kembali < 0 ? 'Kurang' : 'Kembali'}</span>
          <span id="nilaiSelisih">${U.rupiah(Math.abs(kembali))}</span>
        </div>

        <div class="baris-total besar"><span>TOTAL</span><span id="lblTotalBesar">${U.rupiah(total)}</span></div>

        <div class="keranjang-aksi">
          <button class="btn btn-utama" id="btnSimpanCetak" ${keranjang.length ? '' : 'disabled'}>
            💾 Simpan &amp; Cetak
          </button>
          <button class="btn btn-abu" id="btnKosongkan" ${keranjang.length ? '' : 'disabled'} title="Kosongkan keranjang">🗑</button>
        </div>
        <button class="btn btn-lembut btn-block" id="btnSimpanSaja" style="margin-top:8px" ${keranjang.length ? '' : 'disabled'}>
          Simpan saja (tanpa cetak)
        </button>
      </div>`;

    // daftar item
    const isi = panel.querySelector('#isiKeranjang');
    isi.innerHTML = keranjang.length ? keranjang.map((i, idx) => `
      <div class="item-keranjang">
        <div>
          <div class="item-nama">${U.esc(i.nama)}</div>
          <div class="item-harga">${i.tipe === 'jasa' ? 'jasa' : 'barang'} · ${U.rupiah(i.harga)} × ${i.qty} = ${U.rupiah(i.harga * i.qty)}</div>
        </div>
        <div class="item-jumlah">${U.rupiah(i.harga * i.qty)}</div>
        <div class="item-kendali">
          <button type="button" class="qty-btn" data-kurang="${idx}">−</button>
          <input type="number" class="qty-input" data-qty="${idx}" value="${i.qty}" min="1">
          <button type="button" class="qty-btn" data-tambah="${idx}">＋</button>
          <button type="button" class="item-hapus" data-hapus="${idx}" title="Hapus">✕</button>
        </div>
      </div>`).join('')
      : `<div class="kosong" style="padding:28px 12px"><span class="kosong-ikon">🛒</span>
          <strong>Keranjang kosong</strong><span>Klik layanan atau barang untuk menambahkan.</span></div>`;

    // peristiwa
    isi.querySelectorAll('[data-kurang]').forEach(b => b.onclick = () => ubahQty(+b.dataset.kurang, -1));
    isi.querySelectorAll('[data-tambah]').forEach(b => b.onclick = () => ubahQty(+b.dataset.tambah, 1));
    isi.querySelectorAll('[data-hapus]').forEach(b => b.onclick = () => hapusItem(+b.dataset.hapus));
    isi.querySelectorAll('[data-qty]').forEach(inp => inp.onchange = () => {
      const idx = +inp.dataset.qty;
      const tujuan = U.toNumber(inp.value);
      const selisih = tujuan - keranjang[idx].qty;
      if (selisih !== 0) ubahQty(idx, selisih);
      else gambarKeranjang();
    });

    panel.querySelector('#pilihPelanggan').onchange = (e) => {
      if (e.target.value === '__baru__') { pilihPelangganBaru(); return; }
      pelangganId = e.target.value;
    };
    panel.querySelector('#inputDiskon').oninput = (e) => {
      diskon = Math.max(0, U.toNumber(e.target.value));
      perbaruiTanpaUlangGambar();
    };
    panel.querySelector('#inputBayar').oninput = (e) => {
      bayar = Math.max(0, U.toNumber(e.target.value));
      perbaruiTanpaUlangGambar();
    };
    panel.querySelector('#pilihMetode').onchange = (e) => { metode = e.target.value; };
    panel.querySelector('#pilihMekanik').onchange = (e) => { mekanikId = e.target.value; };
    panel.querySelector('#pilihTahap').onchange = (e) => { tahap = e.target.value; };
    panel.querySelector('#btnSimpanCetak').onclick = () => selesaikan(true);
    panel.querySelector('#btnSimpanSaja').onclick = () => selesaikan(false);
    panel.querySelector('#btnKosongkan').onclick = async () => {
      if (!keranjang.length) return;
      const ok = await UI.konfirmasi({
        pesan: 'Kosongkan seluruh isi keranjang?', labelYa: 'Kosongkan'
      });
      if (ok) { keranjang = []; diskon = 0; bayar = 0; render(); }
    };
  }

  /** Perbarui baris total saja (hindari render ulang penuh saat mengetik) */
  function perbaruiTanpaUlangGambar() {
    const panel = document.getElementById('keranjangPanel');
    if (!panel) return;
    const { subtotal, total, kembali } = hitungTotal();
    const tulis = (id, teks) => {
      const n = panel.querySelector('#' + id);
      if (n) n.textContent = teks;
    };
    tulis('lblSubtotal', U.rupiah(subtotal));
    tulis('lblTotal', U.rupiah(total));
    tulis('lblTotalBesar', U.rupiah(total));
    tulis('lblSelisih', kembali < 0 ? 'Kurang' : 'Kembali');
    tulis('nilaiSelisih', U.rupiah(Math.abs(kembali)));
    const baris = panel.querySelector('#barisSelisih');
    if (baris) {
      baris.classList.toggle('kurang', kembali < 0);
      baris.classList.toggle('lebih', kembali >= 0);
    }
  }

  async function pilihPelangganBaru() {
    const data = await Views.pelanggan.formCepat();
    if (data) { pelangganId = data.id; }
    gambarKeranjang();
  }

  /* ---------------- Simpan transaksi ---------------- */
  async function selesaikan(cetak) {
    if (!keranjang.length) { UI.toast('Keranjang masih kosong.', 'peringatan'); return; }

    const db = Store.get();
    const { subtotal, potongan, total, kembali } = hitungTotal();

    // cek ulang stok
    for (const i of keranjang) {
      if (i.tipe !== 'barang') continue;
      const p = db.products.find(x => x.id === i.refId);
      if (!p || (p.stok || 0) < i.qty) {
        UI.toast(`Stok "${i.nama}" tidak mencukupi (sisa ${p ? p.stok : 0}).`, 'gagal');
        return;
      }
    }

    if (cetak && kembali < 0) {
      const ok = await UI.konfirmasi({
        judul: 'Uang diterima kurang',
        pesan: `Uang diterima ${U.rupiah(bayar)} masih kurang ${U.rupiah(-kembali)} dari total ${U.rupiah(total)}. Tetap simpan transaksi?`,
        labelYa: 'Tetap simpan'
      });
      if (!ok) return;
    }

    const pelanggan = db.customers.find(c => c.id === pelangganId) || null;
    const now = Date.now();
    const tanggal = U.today();
    const mekanik = mekanikId ? Views.progres.dariId(mekanikId) : null;

    const trx = {
      id: Store.nextId('trx', 'TR'),
      no: Hitung.nomorStruk(tanggal),
      tanggal, waktu: now,
      customerId: pelanggan ? pelanggan.id : null,
      namaPelanggan: pelanggan ? pelanggan.nama : 'Pelanggan Umum',
      hp: pelanggan ? pelanggan.hp : '',
      plat: pelanggan ? pelanggan.plat : '',
      items: keranjang.map(i => ({
        tipe: i.tipe, refId: i.refId, nama: i.nama,
        harga: i.harga, qty: i.qty, modal: i.modal || 0,
        subtotal: i.harga * i.qty
      })),
      subtotal, diskon: potongan, total,
      metode, bayar, kembalian: Math.max(0, kembali),
      kasir: db.settings.kasir || 'Kasir',
      mekanikId: mekanik ? mekanik.id : '',
      mekanikNama: mekanik ? mekanik.nama : '',
      tahap,
      tahapRiwayat: [{ tahap, waktu: now, catatan: '', oleh: db.settings.kasir || 'Kasir' }]
    };

    // potong stok
    trx.items.filter(i => i.tipe === 'barang').forEach(i => {
      const p = db.products.find(x => x.id === i.refId);
      if (p) { p.stok = Math.max(0, (p.stok || 0) - i.qty); p.updatedAt = now; }
    });

    db.transactions.push(trx);
    Store.save();

    const salinan = JSON.parse(JSON.stringify(trx));
    reset();
    UI.toast(`Transaksi ${trx.no} tersimpan. Total ${U.rupiah(trx.total)}`, 'sukses');

    if (cetak) cetakStruk(salinan);
    render();
  }

  /* ---------------- Cetak struk ---------------- */
  function cetakStruk(trx) {
    const s = Store.get().settings;
    const garis = '──────────────────────────────';
    const html = `
      <div class="struk">
        <div class="struk-teks">
          <div class="struk-judul">${U.esc(s.namaBengkel)}</div>
          <div>${U.esc(s.alamat || '')}</div>
          <div>${U.esc(s.telp ? 'Telp: ' + s.telp : '')}</div>
        </div>
        <div class="struk-garis"></div>
        <table class="struk-tbl">
          <tr><td>No.</td><td class="kanan">${U.esc(trx.no)}</td></tr>
          <tr><td>Tanggal</td><td class="kanan">${U.tglWaktu(trx.waktu)}</td></tr>
          <tr><td>Pelanggan</td><td class="kanan">${U.esc(trx.namaPelanggan)}</td></tr>
          ${trx.plat ? `<tr><td>No. Pol</td><td class="kanan">${U.esc(trx.plat)}</td></tr>` : ''}
          <tr><td>Kasir</td><td class="kanan">${U.esc(trx.kasir || '-')}</td></tr>
          ${trx.mekanikNama ? `<tr><td>Mekanik</td><td class="kanan">${U.esc(trx.mekanikNama)}</td></tr>` : ''}
          ${trx.tahap && trx.tahap !== 'selesai' && trx.tahap !== 'diambil'
            ? `<tr><td>Status</td><td class="kanan">${U.esc(Views.progres.infoTahap(trx.tahap).label)}</td></tr>` : ''}
        </table>
        <div class="struk-garis"></div>
        <table class="struk-tbl">
          ${trx.items.map(i => `
            <tr>
              <td>${U.esc(i.nama)}</td>
              <td class="kanan">${i.qty} × ${U.rupiah(i.harga).replace('Rp', '').trim()}</td>
            </tr>
            <tr class="struk-sub"><td></td><td class="kanan">= ${U.rupiah(i.subtotal)}</td></tr>
          `).join('')}
        </table>
        <div class="struk-garis"></div>
        <table class="struk-tbl">
          <tr><td>Subtotal</td><td class="kanan">${U.rupiah(trx.subtotal)}</td></tr>
          ${trx.diskon ? `<tr><td>Diskon</td><td class="kanan">-${U.rupiah(trx.diskon)}</td></tr>` : ''}
          <tr class="struk-total"><td>TOTAL</td><td class="kanan">${U.rupiah(trx.total)}</td></tr>
          <tr><td>${U.esc(trx.metode)}</td><td class="kanan">${U.rupiah(trx.bayar)}</td></tr>
          ${trx.kembalian ? `<tr><td>Kembali</td><td class="kanan">${U.rupiah(trx.kembalian)}</td></tr>` : ''}
        </table>
        <div class="struk-garis"></div>
        <div class="struk-teks">${U.esc(s.footerStruk || '')}</div>
        <div style="text-align:center;margin-top:8px;font-size:11px;">*** ${U.esc(trx.no)} ***</div>
      </div>`;

    const area = document.getElementById('cetakArea');
    area.innerHTML = html;
    setTimeout(() => { window.print(); }, 60);
  }

  /* ---------------- Riwayat hari ini ---------------- */
  function riwayatHariIni() {
    const hariIni = U.today();
    const daftar = Store.get().transactions
      .filter(t => t.tanggal === hariIni)
      .sort((a, b) => b.waktu - a.waktu);

    const isi = daftar.length ? `
      <div class="tabel-scroll"><table class="data">
        <thead><tr>
          <th>No. Struk</th><th>Pelanggan</th><th>Progress</th>
          <th class="kanan">Total</th><th class="tengah">Aksi</th>
        </tr></thead>
        <tbody>${daftar.map(t => `
          <tr>
            <td class="kuat">${U.esc(t.no)}<span class="sub">${U.jam(t.waktu)}</span></td>
            <td>${U.esc(t.namaPelanggan)}<span class="sub">${U.esc(t.metode)} · ${(t.items || []).length} item</span></td>
            <td>${Views.progres.badgeTahap(t.tahap || 'selesai')}
              <span class="sub">${t.mekanikNama ? '👷 ' + U.esc(t.mekanikNama) : 'belum ada mekanik'}</span></td>
            <td class="kanan kuat">${U.rupiah(t.total)}</td>
            <td class="tengah">
              <button class="btn btn-kecil btn-lembut" data-atur="${t.id}">🔄 Progress</button>
              <button class="btn btn-kecil btn-abu" data-wa="${t.id}" title="Kirim tautan cek via WhatsApp">📲</button>
              <button class="btn btn-kecil btn-abu" data-cetak="${t.id}">🖨</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`
      : `<div class="kosong"><span class="kosong-ikon">🧾</span>
          <strong>Belum ada transaksi hari ini</strong><span>Semua transaksi akan muncul di sini.</span></div>`;

    const m = UI.buka({
      judul: 'Transaksi hari ini · ' + U.tglRingkas(hariIni),
      isi,
      lebar: 'besar',
      aksi: [{ label: 'Tutup', kelas: 'btn-abu' }]
    });
    m.overlay.querySelectorAll('[data-cetak]').forEach(b => b.onclick = () => {
      const t = Store.get().transactions.find(x => x.id === b.dataset.cetak);
      if (t) { m.tutup(); cetakStruk(t); }
    });
    m.overlay.querySelectorAll('[data-atur]').forEach(b => b.onclick = async () => {
      await Views.progres.aturTransaksi(b.dataset.atur);
      m.tutup();
      render();
    });
    m.overlay.querySelectorAll('[data-wa]').forEach(b => b.onclick = () => {
      const t = Store.get().transactions.find(x => x.id === b.dataset.wa);
      if (!t) return;
      const info = Views.progres.infoTahap(t.tahap || 'selesai');
      Views.progres.bagianWa({
        hp: t.hp, nama: t.namaPelanggan, plat: t.plat,
        kode: t.no, status: info.label,
        catatan: ((t.tahapRiwayat || []).slice().reverse().find(r => r.catatan) || {}).catatan || ''
      });
    });
  }

  return { render, siapkan, reset, cetakStruk };
})();
