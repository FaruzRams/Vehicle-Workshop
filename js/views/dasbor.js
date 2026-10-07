/* ==========================================================================
   views/dasbor.js — Ringkasan harian bengkel
   ========================================================================== */
window.Views = window.Views || {};

Views.dasbor = (function () {
  const el = () => document.getElementById('t-dasbor');

  function render() {
    const db = Store.get();
    const hariIni = U.today();
    const trxHariIni = db.transactions.filter(t => t.tanggal === hariIni);
    const ringkas = Hitung.ringkasan(trxHariIni);
    const bookingHariIni = db.bookings
      .filter(b => b.tanggal === hariIni)
      .sort((a, b) => (a.jam || '').localeCompare(b.jam || ''));
    const kritis = Hitung.stokKritis();

    const kemarin = U.isoDate(new Date(Date.now() - 86400000));
    const trxKemarin = db.transactions.filter(t => t.tanggal === kemarin);
    const pendapatanKemarin = Hitung.ringkasan(trxKemarin).pendapatan;
    const selisih = ringkas.pendapatan - pendapatanKemarin;

    const belumSelesai = db.bookings.filter(b => b.status === 'menunggu' || b.status === 'dikerjakan').length;
    const motorAktif = db.transactions.filter(t => Views.progres.TAHAP_AKTIF.includes(t.tahap || 'selesai')).length;
    const bulanIni = db.transactions.filter(t => t.tanggal.slice(0, 7) === hariIni.slice(0, 7));
    const ringkasBulan = Hitung.ringkasan(bulanIni);

    el().innerHTML = `
      <div class="baris-stat">
        <div class="stat stat-hijau stat-gelap">
          <div class="stat-ikon">💰</div>
          <div class="stat-badan">
            <div class="stat-label">Pendapatan hari ini</div>
            <div class="stat-nilai">${U.rupiah(ringkas.pendapatan)}</div>
            <div class="stat-catatan">${selisih === 0 ? 'sama dengan kemarin' :
              (selisih > 0 ? '↑ ' : '↓ ') + U.rupiah(Math.abs(selisih)) + ' dari kemarin'}</div>
          </div>
        </div>

        <div class="stat stat-biru">
          <div class="stat-ikon">🧾</div>
          <div class="stat-badan">
            <div class="stat-label">Transaksi hari ini</div>
            <div class="stat-nilai">${U.angka(ringkas.jumlah)}</div>
            <div class="stat-catatan">rata2 ${U.rupiah(ringkas.rata2)} / transaksi</div>
          </div>
        </div>

        <div class="stat stat-ungu">
          <div class="stat-ikon">🏍️</div>
          <div class="stat-badan">
            <div class="stat-label">Motor dikerjakan</div>
            <div class="stat-nilai">${U.angka(motorAktif)} unit</div>
            <div class="stat-catatan">belum diambil pelanggan</div>
          </div>
        </div>

        <div class="stat stat-jingga">
          <div class="stat-ikon">📅</div>
          <div class="stat-badan">
            <div class="stat-label">Booking hari ini</div>
            <div class="stat-nilai">${U.angka(bookingHariIni.length)}</div>
            <div class="stat-catatan">${belumSelesai ? belumSelesai + ' belum selesai' : 'semua beres'}</div>
          </div>
        </div>

        <div class="stat stat-merah">
          <div class="stat-ikon">⚠️</div>
          <div class="stat-badan">
            <div class="stat-label">Stok menipis</div>
            <div class="stat-nilai">${U.angka(kritis.length)}</div>
            <div class="stat-catatan">${kritis.length ? 'segera belanja ulang' : 'semua aman'}</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="kartu">
          <div class="kartu-kepala">
            <div><h3>Antrian Booking Hari Ini</h3><p>${U.tglRingkas(hariIni)}</p></div>
            <button class="btn btn-kecil btn-lembut" data-ke="booking">Lihat semua</button>
          </div>
          <div class="kartu-isi" id="dasborBooking">${isiBooking(bookingHariIni)}</div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala">
            <div><h3>Stok Perlu Diperhatikan</h3><p>Barang dengan sisa di bawah batas minimum</p></div>
            <button class="btn btn-kecil btn-lembut" data-ke="sparepart">Kelola stok</button>
          </div>
          <div class="kartu-isi" id="dasborStok">${isiStok(kritis)}</div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala">
            <div><h3>Transaksi Terakhir</h3><p>5 penjualan terbaru</p></div>
            <button class="btn btn-kecil btn-lembut" data-ke="laporan">Buka laporan</button>
          </div>
          <div class="kartu-isi" style="padding:0">${isiTrx(db.transactions)}</div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala">
            <div><h3>Beban Kerja Mekanik</h3><p>Motor &amp; booking yang sedang ditangani</p></div>
            <button class="btn btn-kecil btn-lembut" id="btnDaftarMekanik">Kelola</button>
          </div>
          <div class="kartu-isi">${isiMekanik(Views.progres.beban())}</div>
        </div>

        <div class="kartu">
          <div class="kartu-kepala">
            <div><h3>Rekap Bulan Ini</h3><p>${U.BULAN[Number(hariIni.slice(5, 7)) - 1]} ${hariIni.slice(0, 4)}</p></div>
          </div>
          <div class="kartu-isi">
            <div class="baris-total"><span>Pendapatan</span><span class="kuat">${U.rupiah(ringkasBulan.pendapatan)}</span></div>
            <div class="baris-total"><span>Jumlah transaksi</span><span>${U.angka(ringkasBulan.jumlah)} kali</span></div>
            <div class="baris-total"><span>Omzet jasa</span><span>${U.rupiah(ringkasBulan.omzetJasa)}</span></div>
            <div class="baris-total"><span>Omzet barang</span><span>${U.rupiah(ringkasBulan.omzetBarang)}</span></div>
            <div class="baris-total besar"><span>Laba kotor</span><span>${U.rupiah(ringkasBulan.laba)}</span></div>
          </div>
        </div>
      </div>`;

    el().querySelectorAll('[data-ke]').forEach(b =>
      b.addEventListener('click', () => App.pergi(b.dataset.ke)));

    const btnMek = el().querySelector('#btnDaftarMekanik');
    if (btnMek) btnMek.addEventListener('click', () => App.bukaMekanik());
  }

  function isiMekanik(list) {
    if (!list.length) {
      return `<div class="kosong" style="padding:24px"><span class="kosong-ikon">👷</span>
        <strong>Belum ada mekanik</strong>
        <span>Tambahkan di menu <b>Daftar Mekanik</b> untuk mulai menugaskan.</span></div>`;
    }
    return `<div class="daftar-mekanik">${list.map(m => `
      <div class="baris-mekanik">
        <div class="bm-avatar">${U.esc((m.nama || '?').trim().charAt(0).toUpperCase())}</div>
        <div>
          <div class="bm-nama">${U.esc(m.nama || 'Tanpa nama')}${m.aktif === false ? ' <span class="lencana lencana-abu">nonaktif</span>' : ''}</div>
          <div class="bm-spes">${U.esc(m.spesialisasi || 'Tanpa spesialisasi')}${m.contoh && m.contoh.length ? ' · ' + U.esc(m.contoh.join(', ')) : ''}</div>
        </div>
        <div class="bm-beban">
          ${m.unit ? `<span class="lencana lencana-biru">🔧 ${m.unit} motor</span>` : ''}
          ${m.booking ? `<span class="lencana lencana-kuning">📅 ${m.booking} booking</span>` : ''}
          ${!m.unit && !m.booking ? '<span class="lencana lencana-hijau"> bebas</span>' : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  function isiBooking(list) {
    if (!list.length) {
      return `<div class="kosong"><span class="kosong-ikon">📅</span>
        <strong>Belum ada booking hari ini</strong><span>Tambahkan dari menu Booking &amp; Antrian.</span></div>`;
    }
    const warna = { menunggu: 'kuning', dikerjakan: 'biru', selesai: 'hijau', batal: 'abu' };
    return list.slice(0, 6).map(b => `
      <div class="kartu-booking" data-kartu-status="${b.status}" style="margin-bottom:9px">
        <div class="bk-utama">
          <div class="bk-jam">${U.esc(b.jam)} · ${U.esc(b.namaPelanggan)}</div>
          <div class="bk-ket">${U.esc(b.kendaraan || '-')}${b.plat ? ' · ' + U.esc(b.plat) : ''} — ${U.esc(b.layanan)}</div>
        </div>
        <div class="bk-sisi">
          <span class="lencana lencana-${warna[b.status] || 'abu'}">${U.esc(b.status)}</span>
        </div>
      </div>`).join('');
  }

  function isiStok(list) {
    if (!list.length) {
      return `<div class="kosong"><span class="kosong-ikon">✅</span>
        <strong>Semua stok aman</strong><span>Tidak ada barang di bawah batas minimum.</span></div>`;
    }
    return `<div class="tabel-scroll"><table class="data" style="min-width:auto">
      <tbody>${list.slice(0, 7).map(p => `
        <tr class="baris-stok-rendah">
          <td class="kuat">${U.esc(p.nama)}<span class="sub">${U.esc(p.kategori || '')}</span></td>
          <td class="kanan"><span class="lencana lencana-${p.stok <= 0 ? 'merah' : 'kuning'}">
            ${p.stok <= 0 ? 'habis' : 'sisa ' + U.angka(p.stok)}</span></td>
        </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function isiTrx(list) {
    const terbaru = [...list].sort((a, b) => b.waktu - a.waktu).slice(0, 5);
    if (!terbaru.length) {
      return `<div class="kosong"><span class="kosong-ikon">🧾</span>
        <strong>Belum ada transaksi</strong><span>Mulai dari menu Kasir.</span></div>`;
    }
    return `<div class="tabel-scroll"><table class="data" style="min-width:auto">
      <tbody>${terbaru.map(t => `
        <tr>
          <td class="kuat">${U.esc(t.namaPelanggan || 'Umum')}<span class="sub">${U.esc(t.no)}</span></td>
          <td class="sub" style="text-align:right;white-space:nowrap">${U.jam(t.waktu)}</td>
          <td class="kanan kuat">${U.rupiah(t.total)}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
  }

  return { render };
})();
