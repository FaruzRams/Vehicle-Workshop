/* ==========================================================================
   halaman-cek.js — Logika cek.html (halaman pelanggan, tanpa menu kasir)
   Hanya membaca data dari Store; tidak pernah menulis transaksi baru.
   ========================================================================== */
(function () {
  const $ = (s) => document.querySelector(s);
  let hasilCari = [];

  document.addEventListener('DOMContentLoaded', () => {
    Store.load();
    const s = Store.get().settings;

    document.title = 'Cek Progress — ' + s.namaBengkel;
    $('#namaBengkel').textContent = s.namaBengkel;
    $('#alamatBengkel').textContent = [s.alamat, s.telp].filter(Boolean).join(' · ');
    $('#footerBengkel').textContent = s.namaBengkel + (s.alamat ? ' — ' + s.alamat : '');

    $('#formCari').addEventListener('submit', (e) => {
      e.preventDefault();
      cari($('#inputKode').value);
    });

    $('#inputKode').addEventListener('input', U.debounce((e) => {
      if (e.target.value.trim().length >= 4) cari(e.target.value);
    }, 350));

    const tombol = $('#btnChatBengkel');
    if (U.waTelp(s.telp)) {
      tombol.hidden = false;
      tombol.onclick = () => U.bukaWa(s.telp,
        `Halo, saya ingin menanyakan progress service motor saya di ${s.namaBengkel}.`);
    }

    // tautan dari WhatsApp: cek.html?kode=BK-0001
    const kode = new URLSearchParams(location.search).get('kode');
    if (kode) {
      $('#inputKode').value = kode;
      cari(kode);
    } else {
      $('#hasil').innerHTML = kosongAwal();
    }
  });

  /* ---------------- Pencarian ---------------- */
  function cari(kata) {
    const k = Views.progres.normKode(kata);
    if (!k) return;

    const db = Store.get();
    const trx = db.transactions.filter(t =>
      Views.progres.normKode(t.no) === k ||
      Views.progres.normKode(t.id) === k ||
      (t.hp && Views.progres.normKode(t.hp) === k) ||
      (t.plat && Views.progres.normKode(t.plat) === k))
      .sort((a, b) => (b.waktu || 0) - (a.waktu || 0));

    const booking = db.bookings.filter(b =>
      Views.progres.normKode(Views.progres.kodeBooking(b)) === k ||
      Views.progres.normKode(b.id) === k ||
      (b.hp && Views.progres.normKode(b.hp) === k) ||
      (b.plat && Views.progres.normKode(b.plat) === k))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const semua = [
      ...trx.map(t => ({ jenis: 'trx', data: t })),
      ...booking.map(b => ({ jenis: 'booking', data: b }))
    ].sort((a, b) => ((b.data.waktu || b.data.createdAt || 0) - (a.data.waktu || a.data.createdAt || 0)));

    const hasil = $('#hasil');
    hasilCari = semua;
    if (!semua.length) hasil.innerHTML = kartuTidakDitemukan(kata);
    else if (semua.length === 1) {
      hasil.innerHTML = (semua[0].jenis === 'trx' ? kartuTrx : kartuBooking)(semua[0].data);
    } else {
      hasil.innerHTML = kartuDaftar(semua);
      hasil.querySelectorAll('[data-pilih]').forEach(b => b.onclick = () => {
        const item = hasilCari[Number(b.dataset.pilih)];
        if (item) hasil.innerHTML = (item.jenis === 'trx' ? kartuTrx : kartuBooking)(item.data);
      });
    }
    if (hasil.scrollIntoView) hasil.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------------- Tampilan ---------------- */
  function kosongAwal() {
    return `<div class="kartu"><div class="kosong">
      <span class="kosong-ikon">🏍️</span>
      <strong>Masukkan kode motor Anda</strong>
      <span>Ketik kode di atas, lalu tekan <b>Cek Motor Saya</b>.</span>
    </div></div>`;
  }

  function kartuTidakDitemukan(kata) {
    const s = Store.get().settings;
    return `<div class="kartu"><div class="kosong">
      <span class="kosong-ikon">🔎</span>
      <strong>Data tidak ditemukan</strong>
      <span>Kode <b>${U.esc(kata)}</b> tidak terdaftar. Periksa kembali kode di struk Anda,
      atau hubungi bengkel bila motor dicatat dengan nama/HP lain.</span>
      ${U.waTelp(s.telp) ? `<a class="btn btn-sukses" style="margin-top:14px" target="_blank" rel="noopener"
        href="https://wa.me/${U.waTelp(s.telp)}?text=${encodeURIComponent('Halo, saya cek progress motor di ' + s.namaBengkel + ' tapi kodenya tidak ditemukan. Boleh dibantu?')}"
        >💬 Tanya via WhatsApp</a>` : ''}
    </div></div>`;
  }

  function kartuDaftar(list) {
    return `<div class="kartu">
      <div class="kartu-kepala"><div><h3>${list.length} motor ditemukan</h3>
        <p>Pilih motor yang ingin dicek</p></div></div>
      <div class="kartu-isi"><div class="daftar-cocok">
        ${list.map((item, i) => {
          const d = item.data;
          const kode = item.jenis === 'trx' ? d.no : Views.progres.kodeBooking(d);
          const motor = [d.plat, item.jenis === 'booking' ? d.kendaraan : ''].filter(Boolean).join(' · ');
          const info = item.jenis === 'trx'
            ? Views.progres.infoTahap(d.tahap || 'selesai')
            : Views.progres.infoStatus(d.status);
          return `<button type="button" class="temuan" data-pilih="${i}">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <b>${U.esc(kode)}</b>
              <span class="lencana lencana-${info.warna}">${info.ikon} ${U.esc(info.label)}</span>
            </div>
            <div class="te">${U.esc(item.jenis === 'trx' ? (d.namaPelanggan || 'Umum') : d.namaPelanggan)} · ${U.esc(motor || '—')}</div>
            <div class="tm"><span>${U.tglPanjang(d.tanggal)}</span>
              <span>${d.mekanikNama ? '👷 ' + U.esc(d.mekanikNama) : 'mekanik belum ditugaskan'}</span></div>
          </button>`;
        }).join('')}
      </div></div>
    </div>`;
  }

  /** Ringkasan besar: siap diambil atau belum */
  function spanduk(tahap) {
    const info = Views.progres.infoTahap(tahap);
    const siap = tahap === 'selesai' || tahap === 'diambil';
    return `<div class="spanduk ${siap ? 'siap' : 'proses'}">
      <div class="sp-teks">
        <span class="sp-judul">${siap ? '✅ Motor Anda SIAP DIAMBIL' : info.ikon + ' ' + U.esc(info.label)}</span>
        <span class="sp-ket">${siap
          ? (tahap === 'diambil' ? 'Motor sudah diserahkan ke Anda. Terima kasih!' : info.ket + ' Silakan datang ke bengkel.')
          : info.ket + ' Halaman ini bisa dicek lagi sewaktu-waktu.'}</span>
      </div>
    </div>`;
  }

  function kartuTrx(t) {
    const tahap = t.tahap || 'selesai';
    const catatan = (t.tahapRiwayat || []).slice().reverse().find(r => r.catatan);
    return `<div class="kartu">
      ${spanduk(tahap)}
      <div class="kartu-isi">
        <div class="info-motor" style="margin-bottom:16px">
          <div><span>No. Struk</span><b class="kode-besar">${U.esc(t.no)}</b></div>
          <div><span>Motor</span><b>${U.esc(t.plat || '—')}</b></div>
          <div><span>Pelanggan</span><b>${U.esc(t.namaPelanggan || 'Umum')}</b></div>
          <div><span>Masuk</span><b>${U.tglWaktu(t.waktu)}</b></div>
          <div><span>Mekanik</span><b>${U.esc(t.mekanikNama || 'Belum ditugaskan')}</b></div>
        </div>

        <h3 class="pelanggan-sub">Tahap pengerjaan</h3>
        ${Views.progres.garisTransaksi(t)}

        ${catatan ? `<div class="kotak-catatan">
          <b>Catatan bengkel</b>
          <p>${U.esc(catatan.catatan)}</p>
        </div>` : ''}

        <h3 class="pelanggan-sub">Rincian biaya</h3>
        <div class="tabel-scroll"><table class="data" style="min-width:auto">
          <tbody>
            ${(t.items || []).map(i => `<tr>
              <td>${U.esc(i.nama)}<span class="sub">${i.qty} × ${U.rupiah(i.harga)}</span></td>
              <td class="kanan kuat">${U.rupiah(i.subtotal)}</td>
            </tr>`).join('')}
            ${t.diskon ? `<tr><td>Diskon</td><td class="kanan">-${U.rupiah(t.diskon)}</td></tr>` : ''}
            <tr><td class="kuat">Total</td><td class="kanan kuat">${U.rupiah(t.total)}</td></tr>
          </tbody>
        </table></div>
      </div>
    </div>`;
  }

  function kartuBooking(b) {
    const info = Views.progres.infoStatus(b.status);
    const selesai = b.status === 'selesai';
    return `<div class="kartu">
      <div class="spanduk ${selesai ? 'siap' : b.status === 'batal' ? 'batal' : 'proses'}">
        <div class="sp-teks">
          <span class="sp-judul">${selesai ? '✅ Motor Anda SIAP DIAMBIL' : info.ikon + ' ' + U.esc(info.label)}</span>
          <span class="sp-ket">${U.esc(info.ket)}</span>
        </div>
      </div>
      <div class="kartu-isi">
        <div class="info-motor" style="margin-bottom:16px">
          <div><span>Kode Booking</span><b class="kode-besar">${U.esc(Views.progres.kodeBooking(b))}</b></div>
          <div><span>Tanggal</span><b>${U.tglPanjang(b.tanggal)}</b></div>
          <div><span>Jam</span><b>${U.esc(b.jam || '—')}</b></div>
          <div><span>Motor</span><b>${U.esc(b.kendaraan || '—')}</b>${b.plat ? `<span class="kecil">${U.esc(b.plat)}</span>` : ''}</div>
          <div><span>Mekanik</span><b>${U.esc(b.mekanikNama || 'Belum ditugaskan')}</b></div>
        </div>

        <h3 class="pelanggan-sub">Status antrian</h3>
        ${Views.progres.garisBooking(b)}

        ${b.layanan ? `<div class="kotak-catatan">
          <b>Layanan</b>
          <p>${U.esc(b.layanan)}</p>
          ${b.keluhan ? `<p style="margin-top:6px;color:var(--teks-3)">Keluhan: ${U.esc(b.keluhan)}</p>` : ''}
        </div>` : ''}
      </div>
    </div>`;
  }
})();
