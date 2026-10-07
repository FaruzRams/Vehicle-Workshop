/* ==========================================================================
   utils.js — Fungsi bantuan (format, tanggal, html, unduh file)
   ========================================================================== */

const U = (() => {
  const rp = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  });
  const num = new Intl.NumberFormat('id-ID');

  /** Format angka -> "Rp 150.000" */
  function rupiah(n) {
    const v = Number(n) || 0;
    return rp.format(v).replace(/\s/g, ' ');
  }

  /** Format angka polos -> "1.250" */
  function angka(n) {
    return num.format(Number(n) || 0);
  }

  /** "2026-10-07" -> Date (lokal, jam 00:00) */
  function parseDate(iso) {
    if (!iso) return new Date();
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  /** Date -> "2026-10-07" */
  function isoDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Hari ini dalam format ISO */
  function today() {
    return isoDate(new Date());
  }

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  /** "2026-10-07" -> "7 Oktober 2026" */
  function tglPanjang(iso) {
    const d = parseDate(iso);
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** "2026-10-07" -> "Rabu, 7 Okt 2026" */
  function tglRingkas(iso) {
    const d = parseDate(iso);
    const b = BULAN[d.getMonth()].slice(0, 3);
    return `${HARI[d.getDay()]}, ${d.getDate()} ${b} ${d.getFullYear()}`;
  }

  /** Timestamp -> "07 Okt 2026, 14:35" */
  function tglWaktu(ts) {
    const d = new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ` +
      `${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /** Jam -> "14:35" */
  function jam(ts) {
    const d = new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /** Escape karakter khusus HTML */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** "Rp 1.250.000" / "1250000" / "1.250.000" -> 1250000 */
  function toNumber(v) {
    if (typeof v === 'number') return v;
    if (v == null) return 0;
    const clean = String(v).replace(/[^\d.-]/g, '');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  /** Debounce sederhana */
  function debounce(fn, ms = 250) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Unduh data sebagai file CSV (kompatibel Excel Indonesia) */
  function downloadCSV(filename, rows) {
    const body = rows.map(r => r.map(cell => {
      const s = String(cell == null ? '' : cell);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /** Nama file aman */
  function safeName(s) {
    return String(s || 'file').replace(/[^\w.-]+/g, '-');
  }

  /** Gabungkan class bantu */
  function cx(...parts) {
    return parts.filter(Boolean).join(' ');
  }

  /** "0812-3456" -> "628123456" (format WhatsApp) */
  function waTelp(nomor) {
    let n = String(nomor || '').replace(/\D/g, '');
    if (!n) return '';
    if (n.startsWith('0')) n = '62' + n.slice(1);
    if (n.startsWith('+62')) n = n.slice(1);
    return n;
  }

  /** Buka WhatsApp dengan pesan siap kirim */
  function bukaWa(nomor, pesan) {
    const n = waTelp(nomor);
    if (!n) return false;
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(pesan || ''), '_blank', 'noopener');
    return true;
  }

  return {
    rupiah, angka, isoDate, today, parseDate, tglPanjang, tglRingkas,
    tglWaktu, jam, esc, toNumber, debounce, downloadCSV, safeName, cx,
    waTelp, bukaWa, BULAN, HARI
  };
})();
