/* ==========================================================================
   views/laporan.js — Laporan keuangan, laba, dan ekspor
   ========================================================================== */
window.Views = window.Views || {};

Views.laporan = (function () {
  let preset = '7hari';
  let dari = '';
  let sampai = '';
  let trxTerbuka = '';

  const el = () => document.getElementById('t-laporan');

  const PRESET = [
    { nilai: 'hari', label: 'Hari ini' },
    { nilai: '7hari', label: '7 hari terakhir' },
    { nilai: 'bulan', label: 'Bulan ini' },
    { nilai: 'kemarin', label: 'Kemarin' },
    { nilai: 'semua', label: 'Semua data' }
  ];

  function rentangAktif() {
    const t = U.today();
    switch (preset) {
      case 'hari': return [t, t];
      case 'kemarin': { const k = U.isoDate(new Date(Date.now() - 86400000)); return [k, k]; }
      case 'bulan': return [t.slice(0, 7) + '-01', t];
      case 'semua': return ['', ''];
      default: return [dari || t, sampai || t];
    }
  }

  function render() {
    const [rDari, rSampai] = rentangAktif();
    const trx = Hitung.dalamRentang(rDari, rSampai).sort((a, b) => b.waktu - a.waktu);
    const r = Hitung.ringkasan(trx);
    const item = Hitung.kumpulkanItem(trx);
    const barang = item.filter(i => i.tipe !== 'jasa').sort((a, b) => b.omzet - a.omzet);
    const jasa = item.filter(i => i.tipe === 'jasa').sort((a, b) => b.omzet - a.omzet);
    const perHari = Hitung.perHari(trx);
    const maksHari = Math.max(1, ...perHari.map(h => h.pendapatan));

    const judulRentang = rDari
      ? `${U.tglPanjang(rDari)} — ${U.tglPanjang(rSampai)}`
      : 'Seluruh data tersimpan';

    el().innerHTML = `
      <div class="toolbar">
        <div class="rentang-btn">
          ${PRESET.map(p => `<button class="btn btn-kecil btn-abu ${preset === p.nilai ? 'aktif' : ''}"
            data-preset="${p.nilai}">${p.label}</button>`).join('')}
        </div>
        <div class="spacer"></div>
        <div class="nav-tanggal">
          <input type="date" id="dariTanggal" value="${rDari}" ${preset !== 'khusus' ? 'disabled' : ''}>
          <span style="color:var(--teks-3)">s.d.</span>
          <input type="date" id="sampaiTanggal" value="${rSampai}" ${preset !== 'khusus' ? 'disabled' : ''}>
          <button class="btn btn-kecil btn-lembut" id="btnTerapkan" disabled>Terapkan</button>
        </div>
      </div>

      <div class="toolbar" style="margin-top:-6px">
        <span style="font-size:13.5px;color:var(--teks-2)">📄 <b>${judulRentang}</b> · ${U.angka(r.jumlah)} transaksi</span>
        <div class="spacer"></div>
        <button class="btn btn-abu" id="btnEksporLaporan">⬇ Ekspor CSV</button>
        <button class="btn btn-utama" id="btnCetakLaporan">🖨 Cetak laporan</button>
      </div>

      <div class="baris-stat">
        <div class="stat stat-hijau"><div class="stat-ikon">💰</div><div class="stat-badan">
          <div class="stat-label">Total pendapatan</div>
          <div class="stat-nilai">${U.rupiah(r.pendapatan)}</div>
          <div class="stat-catatan">setelah diskon ${U.rupiah(r.diskon)}</div>
        </div></div>

        <div class="stat stat-biru"><div class="stat-ikon">🧾</div><div class="stat-badan">
          <div class="stat-label">Jumlah transaksi</div>
          <div class="stat-nilai">${U.angka(r.jumlah)}</div>
          <div class="stat-catatan">rata2 ${U.rupiah(r.rata2)} per transaksi</div>
        </div></div>

        <div class="stat stat-ungu"><div class="stat-ikon">📈</div><div class="stat-badan">
          <div class="stat-label">Laba kotor</div>
          <div class="stat-nilai">${U.rupiah(r.laba)}</div>
          <div class="stat-catatan">${r.pendapatan ? Math.round(r.laba / r.pendapatan * 100) : 0}% dari pendapatan</div>
        </div></div>

        <div class="stat stat-cyan"><div class="stat-ikon">🛠️</div><div class="stat-badan">
          <div class="stat-label">Omzet jasa</div>
          <div class="stat-nilai">${U.rupiah(r.omzetJasa)}</div>
          <div class="stat-catatan">${r.pendapatan ? Math.round(r.omzetJasa / (r.omzetJasa + r.omzetBarang) * 100) : 0}% dari penjualan</div>
        </div></div>

        <div class="stat stat-jingga"><div class="stat-ikon">📦</div><div class="stat-badan">
          <div class="stat-label">Omzet barang</div>
          <div class="stat-nilai">${U.rupiah(r.omzetBarang)}</div>
          <div class="stat-catatan">${U.angka(item.filter(i => i.tipe !== 'jasa').reduce((a, i) => a + i.qty, 0))} barang terjual</div>
        </div></div>
      </div>

      <div class="grid-2" style="margin-bottom:16px">
        <div class="kartu">
          <div class="kartu-kepala"><div><h3>Pendapatan per Hari</h3><p>Grafik harian pada rentang ini</p></div></div>
          <div class="kartu-isi">
            ${perHari.length ? `<div class="bar-laporan">${perHari.map(h => `
              <div class="baris-bar">
                <span class="bb-nama">${U.tglPanjang(h.tanggal)}</span>
                <span class="bb-bilah"><i style="width:${Math.max(3, h.pendapatan / maksHari * 100)}%"></i></span>
                <span class="bb-nilai">${U.rupiah(h.pendapatan)}</span>
              </div>`).join('')}</div>`
              : `<div class="kosong" style="padding:24px"><span class="kosong-ikon">📊</span>
                  <strong>Belum ada pendapatan</strong><span>Pilih rentang tanggal lain.</span></div>`}
          </div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala"><div><h3>Barang Terlaris</h3><p>Diurutkan dari omzet</p></div></div>
          <div class="kartu-isi">
            ${rankTabel(barang, 'barang')}
          </div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala"><div><h3>Jasa Paling Diminta</h3><p>Diurutkan dari omzet</p></div></div>
          <div class="kartu-isi">
            ${rankTabel(jasa, 'jasa')}
          </div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala"><div><h3>Metode Pembayaran</h3><p>Sebaran penerimaan uang</p></div></div>
          <div class="kartu-isi">${metodeTabel(trx)}</div>
        </div>
      </div>

      <div class="bungkus-tabel">
        <div class="kartu-kepala" style="border-bottom:1px solid var(--garis)">
          <div><h3>Rincian Transaksi</h3><p>Klik baris untuk melihat isi transaksi</p></div>
        </div>
        ${trx.length ? `
        <div class="tabel-scroll">
          <table class="data">
            <thead><tr>
              <th>Tanggal</th><th>No. Struk</th><th>Pelanggan</th><th>Isi</th>
              <th class="kanan">Diskon</th><th class="kanan">Total</th><th class="kanan">Laba</th>
            </tr></thead>
            <tbody>${trx.map(t => barisTrx(t)).join('')}</tbody>
          </table>
        </div>
        <div class="kaki-tabel">
          <span>${U.angka(r.jumlah)} transaksi</span>
          <span>Pendapatan <b>${U.rupiah(r.pendapatan)}</b> · Laba kotor <b>${U.rupiah(r.laba)}</b></span>
        </div>`
        : `<div class="kosong"><span class="kosong-ikon">📈</span>
            <strong>Belum ada transaksi pada rentang ini</strong>
            <span>Coba pilih rentang tanggal yang lain.</span></div>`}
      </div>`;

    // peristiwa
    el().querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
      preset = b.dataset.preset;
      if (preset !== 'khusus') { const [d, s] = rentangAktif(); dari = d; sampai = s; }
      render();
    });
    const btnTerapkan = el().querySelector('#btnTerapkan');
    const inDari = el().querySelector('#dariTanggal');
    const inSampai = el().querySelector('#sampaiTanggal');
    [inDari, inSampai].forEach(i => i.onchange = () => {
      preset = 'khusus'; dari = inDari.value; sampai = inSampai.value;
      btnTerapkan.disabled = false;
    });
    btnTerapkan.onclick = () => render();
    el().querySelector('#btnEksporLaporan').onclick = () => ekspor(trx, rDari, rSampai);
    el().querySelector('#btnCetakLaporan').onclick = () => cetak(trx, r, rDari, rSampai, judulRentang);

    el().querySelectorAll('[data-buka]').forEach(b => b.onclick = () => {
      trxTerbuka = trxTerbuka === b.dataset.buka ? '' : b.dataset.buka;
      render();
    });
  }

  /* ---------------- Potongan tabel ---------------- */
  function rankTabel(daftar, tipe) {
    if (!daftar.length) {
      return `<div class="kosong" style="padding:24px"><span class="kosong-ikon">📋</span>
        <strong>Belum ada data</strong><span>Data akan muncul setelah ada penjualan.</span></div>`;
    }
    const maks = Math.max(1, ...daftar.map(d => d.omzet));
    return `<div class="bar-laporan">${daftar.slice(0, 6).map(d => `
      <div class="baris-bar">
        <span class="bb-nama" title="${U.esc(d.nama)}">${U.esc(d.nama)}</span>
        <span class="bb-bilah"><i style="width:${Math.max(4, d.omzet / maks * 100)}%"></i></span>
        <span class="bb-nilai">${tipe === 'jasa' ? U.angka(d.qty) + '×' : U.rupiah(d.omzet)}</span>
      </div>`).join('')}</div>`;
  }

  function metodeTabel(trx) {
    if (!trx.length) return `<div class="kosong" style="padding:24px"><span class="kosong-ikon">💳</span>
      <strong>Belum ada data</strong><span>Pembayaran akan muncul di sini.</span></div>`;
    const peta = {};
    trx.forEach(t => {
      const m = t.metode || 'Tunai';
      peta[m] = peta[m] || { total: 0, jumlah: 0 };
      peta[m].total += t.total || 0;
      peta[m].jumlah += 1;
    });
    const maks = Math.max(1, ...Object.values(peta).map(v => v.total));
    return `<div class="bar-laporan">${Object.entries(peta).sort((a, b) => b[1].total - a[1].total).map(([m, v]) => `
      <div class="baris-bar">
        <span class="bb-nama">${U.esc(m)}</span>
        <span class="bb-bilah"><i style="width:${Math.max(4, v.total / maks * 100)}%"></i></span>
        <span class="bb-nilai">${U.rupiah(v.total)}</span>
      </div>`).join('')}</div>`;
  }

  function labaTrx(t) {
    return (t.items || []).reduce((a, i) => a + (i.tipe === 'jasa'
      ? (i.subtotal || 0)
      : (i.subtotal || 0) - (i.modal || 0) * (i.qty || 0)), 0);
  }

  function barisTrx(t) {
    const terbuka = trxTerbuka === t.id;
    const utama = `
      <tr data-buka="${t.id}" style="cursor:pointer" class="${terbuka ? 'detail-trx' : ''}">
        <td>${U.tglPanjang(t.tanggal)}<span class="sub">${U.jam(t.waktu)}</span></td>
        <td class="kuat">${U.esc(t.no)}<span class="sub">${U.esc(t.metode)}</span></td>
        <td>${U.esc(t.namaPelanggan)}</td>
        <td>${U.esc((t.items || []).map(i => i.nama).slice(0, 2).join(', '))}${(t.items || []).length > 2 ? ' …' : ''}
          <span class="sub">${U.angka((t.items || []).length)} item</span></td>
        <td class="kanan">${t.diskon ? '-' + U.rupiah(t.diskon) : '—'}</td>
        <td class="kanan kuat">${U.rupiah(t.total)}</td>
        <td class="kanan">${U.rupiah(labaTrx(t))}</td>
      </tr>`;
    if (!terbuka) return utama;

    const detail = `
      <tr class="detail-trx"><td colspan="7">
        <div class="detail-inner">
          <table>
            <thead><tr><th>Item</th><th style="text-align:right">Qty</th>
              <th style="text-align:right">Harga</th><th style="text-align:right">Jumlah</th></tr></thead>
            <tbody>${(t.items || []).map(i => `<tr>
              <td>${U.esc(i.nama)} <span style="color:var(--teks-3)">(${i.tipe === 'jasa' ? 'jasa' : 'barang'})</span></td>
              <td>${i.qty}</td><td>${U.rupiah(i.harga)}</td><td>${U.rupiah(i.subtotal)}</td>
            </tr>`).join('')}</tbody>
          </table>
          <div style="margin-top:8px;text-align:right">
            <div class="baris-total"><span>Subtotal</span><span>${U.rupiah(t.subtotal)}</span></div>
            ${t.diskon ? `<div class="baris-total"><span>Diskon</span><span>-${U.rupiah(t.diskon)}</span></div>` : ''}
            <div class="baris-total bayar"><span>Total</span><span>${U.rupiah(t.total)}</span></div>
            <div class="baris-total"><span>${U.esc(t.metode)} diterima</span><span>${U.rupiah(t.bayar)}</span></div>
            <div style="margin-top:9px;display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;align-items:center">
              <span style="margin-right:auto">${Views.progres.badgeTahap(t.tahap || 'selesai')}
                <span style="margin-left:6px">${Views.progres.badgeMekanik(t.mekanikNama)}</span></span>
              <button class="btn btn-kecil btn-lembut" data-atur="${t.id}">🔄 Atur progress</button>
              <button class="btn btn-kecil btn-abu" data-cetakulang="${t.id}">🖨 Cetak struk</button>
            </div>
          </div>
        </div>
      </td></tr>`;

    // tombol di baris detail (cetak struk & atur progress)
    setTimeout(() => {
      const cetak = el().querySelector(`[data-cetakulang="${t.id}"]`);
      if (cetak) cetak.onclick = (e) => { e.stopPropagation(); Views.kasir.cetakStruk(t); };
      const atur = el().querySelector(`[data-atur="${t.id}"]`);
      if (atur) atur.onclick = async (e) => {
        e.stopPropagation();
        await Views.progres.aturTransaksi(t.id);
        render();
      };
    }, 0);

    return utama + detail;
  }

  /* ---------------- Ekspor ---------------- */
  function ekspor(trx, dariT, sampaiT) {
    const baris = [['No Struk', 'Tanggal', 'Waktu', 'Pelanggan', 'Metode', 'Item', 'Qty', 'Harga', 'Jumlah', 'Diskon', 'Total', 'Laba']];
    trx.forEach(t => {
      const isi = (t.items || []).map(i =>
        [t.no, t.tanggal, U.jam(t.waktu), t.namaPelanggan, t.metode,
          i.nama, i.qty, i.harga, i.subtotal, '', '', '']).filter(r => r.some(v => v !== ''));
      isi.forEach(r => baris.push(r));
      baris.push(['', '', '', '', '', '', '', '', '', t.diskon, t.total, labaTrx(t)]);
    });
    baris.push([]);
    baris.push(['RINGKASAN', `${dariT || 'awal'} s.d. ${sampaiT || 'sekarang'}`]);
    const r = Hitung.ringkasan(trx);
    baris.push(['Pendapatan', r.pendapatan, 'Jumlah transaksi', r.jumlah, 'Laba kotor', r.laba]);
    baris.push(['Omzet jasa', r.omzetJasa, 'Omzet barang', r.omzetBarang, 'Diskon', r.diskon]);

    U.downloadCSV(`laporan-${dariT || 'semua'}-${sampaiT || 'sekarang'}.csv`, baris);
    UI.toast('Laporan diunduh (CSV).', 'info');
  }

  function cetak(trx, r, dariT, sampaiT, judul) {
    const area = document.getElementById('cetakArea');
    area.innerHTML = `
      <style>@page { size: A4 portrait; margin: 14mm; }</style>
      <div class="laporan-cetak">
        <div class="lc-kepala">
          <h2>${U.esc(Store.get().settings.namaBengkel)}</h2>
          <div class="lc-meta">${U.esc(Store.get().settings.alamat || '')} ${Store.get().settings.telp ? '· Telp ' + U.esc(Store.get().settings.telp) : ''}</div>
          <div class="lc-meta">Dicetak ${U.tglWaktu(Date.now())} oleh ${U.esc(Store.get().settings.kasir || 'Kasir')}</div>
        </div>

        <h3 style="font-size:14px;margin-bottom:3px">Laporan Keuangan Bengkel</h3>
        <div class="lc-meta">Periode: ${judul}</div>

        <div class="lc-stat">
          <div>Pendapatan<b>${U.rupiah(r.pendapatan)}</b></div>
          <div>Transaksi<b>${U.angka(r.jumlah)}</b></div>
          <div>Rata-rata<b>${U.rupiah(r.rata2)}</b></div>
          <div>Laba kotor<b>${U.rupiah(r.laba)}</b></div>
          <div>Omzet jasa<b>${U.rupiah(r.omzetJasa)}</b></div>
          <div>Omzet barang<b>${U.rupiah(r.omzetBarang)}</b></div>
        </div>

        <table>
          <thead><tr><th>Tanggal</th><th>No. Struk</th><th>Pelanggan</th><th>Metode</th>
            <th class="kanan">Diskon</th><th class="kanan">Total</th><th class="kanan">Laba</th></tr></thead>
          <tbody>${trx.map(t => `<tr>
            <td>${U.tglPanjang(t.tanggal)}</td><td>${U.esc(t.no)}</td><td>${U.esc(t.namaPelanggan)}</td>
            <td>${U.esc(t.metode)}</td><td class="kanan">${t.diskon ? U.rupiah(t.diskon) : '—'}</td>
            <td class="kanan">${U.rupiah(t.total)}</td><td class="kanan">${U.rupiah(labaTrx(t))}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><th colspan="5">Total</th><th class="kanan">${U.rupiah(r.pendapatan)}</th>
            <th class="kanan">${U.rupiah(r.laba)}</th></tr></tfoot>
        </table>

        <div style="margin-top:26px;display:flex;gap:60px;font-size:12px">
          <div>Dibuat oleh,<br><br><br>( ${U.esc(Store.get().settings.kasir || 'Kasir')} )</div>
          <div>Diperiksa oleh,<br><br><br>( ........................................ )</div>
        </div>
      </div>`;
    setTimeout(() => window.print(), 60);
  }

  return { render };
})();
