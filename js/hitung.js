/* ==========================================================================
   hitung.js — Perhitungan ringkasan transaksi & laporan
   ========================================================================== */

const Hitung = (() => {

  /** Transaksi pada rentang tanggal ISO (inklusif) */
  function dalamRentang(dari, sampai) {
    const trx = Store.get().transactions;
    return trx.filter(t => (!dari || t.tanggal >= dari) && (!sampai || t.tanggal <= sampai));
  }

  /** Gabungkan item semua transaksi (untuk ranking produk/jasa) */
  function kumpulkanItem(daftarTrx) {
    const peta = new Map();
    daftarTrx.forEach(t => (t.items || []).forEach(it => {
      const kunci = (it.tipe || 'barang') + ':' + (it.refId || it.nama);
      const lama = peta.get(kunci) || {
        tipe: it.tipe, nama: it.nama, qty: 0, omzet: 0, laba: 0
      };
      lama.qty += it.qty || 0;
      lama.omzet += it.subtotal || 0;
      lama.laba += it.tipe === 'jasa'
        ? (it.subtotal || 0)
        : (it.subtotal || 0) - (it.modal || 0) * (it.qty || 0);
      peta.set(kunci, lama);
    }));
    return [...peta.values()];
  }

  /** Ringkasan angka dari daftar transaksi */
  function ringkasan(daftarTrx) {
    let pendapatan = 0, omzetJasa = 0, omzetBarang = 0, laba = 0, diskon = 0;

    daftarTrx.forEach(t => {
      pendapatan += t.total || 0;
      diskon += t.diskon || 0;
      (t.items || []).forEach(it => {
        if (it.tipe === 'jasa') {
          omzetJasa += it.subtotal || 0;
          laba += it.subtotal || 0;
        } else {
          omzetBarang += it.subtotal || 0;
          laba += (it.subtotal || 0) - (it.modal || 0) * (it.qty || 0);
        }
      });
    });

    const jumlah = daftarTrx.length;
    return {
      pendapatan, omzetJasa, omzetBarang, laba, diskon, jumlah,
      rata2: jumlah ? Math.round(pendapatan / jumlah) : 0
    };
  }

  /** Pendapatan per tanggal (untuk grafik) */
  function perHari(daftarTrx) {
    const peta = new Map();
    daftarTrx.forEach(t => {
      const v = peta.get(t.tanggal) || { tanggal: t.tanggal, pendapatan: 0, jumlah: 0 };
      v.pendapatan += t.total || 0;
      v.jumlah += 1;
      peta.set(t.tanggal, v);
    });
    return [...peta.values()].sort((a, b) => a.tanggal < b.tanggal ? -1 : 1);
  }

  /** Stok yang menipis / habis */
  function stokKritis() {
    return Store.get().products
      .filter(p => (p.stok || 0) <= (p.stokMin || 0))
      .sort((a, b) => (a.stok || 0) - (b.stok || 0));
  }

  /** Nomor struk unik: INV-20261007-0001 */
  function nomorStruk(tanggalISO) {
    const d = Store.get();
    const pola = tanggalISO.replace(/-/g, '');
    let n = d.transactions.filter(t => t.tanggal === tanggalISO).length + 1;
    let no = `INV-${pola}-${String(n).padStart(4, '0')}`;
    while (d.transactions.some(t => t.no === no)) {
      n += 1;
      no = `INV-${pola}-${String(n).padStart(4, '0')}`;
    }
    return no;
  }

  /** Total item dalam satu transaksi */
  function subtotalItem(it) {
    return (it.harga || 0) * (it.qty || 0);
  }

  return { dalamRentang, kumpulkanItem, ringkasan, perHari, stokKritis, nomorStruk, subtotalItem };
})();
