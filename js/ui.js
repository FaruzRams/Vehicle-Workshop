/* ==========================================================================
   ui.js — Komponen antarmuka bersama: modal, form, konfirmasi, toast
   ========================================================================== */

const UI = (() => {
  let modalHost = null;
  let toastHost = null;

  function hosts() {
    if (!modalHost) modalHost = document.getElementById('modalHost');
    if (!toastHost) toastHost = document.getElementById('toastHost');
    return { modalHost, toastHost };
  }

  /* ---------------- Toast ---------------- */
  function toast(pesan, tipe = 'sukses') {
    const { toastHost: host } = hosts();
    if (!host) return;
    const ikon = { sukses: '✓', gagal: '✕', info: 'i', peringatan: '!' }[tipe] || 'i';
    const el = document.createElement('div');
    el.className = `toast toast-${tipe}`;
    el.innerHTML = `<span class="toast-ikon">${ikon}</span><span>${U.esc(pesan)}</span>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('tampil'));
    setTimeout(() => {
      el.classList.remove('tampil');
      setTimeout(() => el.remove(), 350);
    }, 3200);
  }

  /* ---------------- Modal dasar ---------------- */
  /**
   * Buka modal.
   * opts: { judul, isi (HTML string), aksi: [{label, kelas, onClick}], lebar, tutupBatal }
   */
  function buka(opts) {
    const { modalHost: host } = hosts();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const lebar = opts.lebar || 'sedang';
    overlay.innerHTML = `
      <div class="modal modal-${lebar}" role="dialog" aria-modal="true" aria-label="${U.esc(opts.judul || '')}">
        <div class="modal-kepala">
          <h3>${U.esc(opts.judul || '')}</h3>
          <button type="button" class="modal-tutup" aria-label="Tutup">&times;</button>
        </div>
        <div class="modal-isi">${opts.isi || ''}</div>
        ${opts.aksi && opts.aksi.length ? `<div class="modal-aksi">${
          opts.aksi.map((a, i) =>
            `<button type="button" class="btn ${a.kelas || 'btn-utama'}" data-aksi="${i}">${U.esc(a.label)}</button>`
          ).join('')
        }</div>` : ''}
      </div>`;

    const tutup = () => {
      overlay.classList.remove('tampil');
      setTimeout(() => overlay.remove(), 200);
      document.removeEventListener('keydown', onKey);
    };

    function onKey(e) {
      if (e.key === 'Escape') tutup();
    }

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && opts.tutupBatal !== false) tutup();
    });
    overlay.querySelector('.modal-tutup').addEventListener('click', tutup);
    document.addEventListener('keydown', onKey);

    if (opts.aksi) {
      overlay.querySelectorAll('[data-aksi]').forEach(btn => {
        const a = opts.aksi[Number(btn.dataset.aksi)];
        btn.addEventListener('click', () => {
          const hasil = a.onClick ? a.onClick({ overlay, tutup, btn }) : null;
          if (hasil !== false && a.tutup !== false) tutup();
        });
      });
    }

    host.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.toggle('tampil', true));

    const fokusPertama = overlay.querySelector('input, select, textarea, button.btn-utama');
    if (fokusPertama) setTimeout(() => fokusPertama.focus(), 120);

    return { overlay, tutup };
  }

  /* ---------------- Form berbasis daftar field ---------------- */
  /**
   * field: { nama, label, tipe:'teks|angka|tanggal|waktu|pilih|textarea|password',
   *          wajib, nilai, pilihan:[{nilai,label}], petunjuk, lebar:'pendek|panjang',
   *          placeholder, min, max, langkah, mati }
   */
  function form(cfg) {
    const idForm = 'f' + Math.random().toString(36).slice(2, 8);

    const isiHTML = `
      <form id="${idForm}" class="form-grid" novalidate>
        ${cfg.fields.map(f => {
          const wajib = f.wajib ? ' <span class="wajib">*</span>' : '';
          const cls = U.cx('form-field', f.lebar === 'panjang' ? 'span-2' : '');
          const nilai = f.nilai == null ? '' : f.nilai;
          let kontrol = '';
          const umum = `name="${U.esc(f.nama)}" id="${idForm}-${U.esc(f.nama)}"
            ${f.wajib ? 'required' : ''} ${f.mati ? 'disabled' : ''}
            placeholder="${U.esc(f.placeholder || '')}"`;

          switch (f.tipe) {
            case 'textarea':
              kontrol = `<textarea ${umum} rows="3">${U.esc(nilai)}</textarea>`;
              break;
            case 'pilih':
              kontrol = `<select ${umum}>
                <option value="">— pilih —</option>
                ${(f.pilihan || []).map(p => {
                  const v = typeof p === 'object' ? p.nilai : p;
                  const l = typeof p === 'object' ? p.label : p;
                  return `<option value="${U.esc(v)}" ${String(v) === String(nilai) ? 'selected' : ''}>${U.esc(l)}</option>`;
                }).join('')}
              </select>`;
              break;
            case 'angka':
              kontrol = `<input type="number" ${umum} value="${U.esc(nilai)}"
                min="${f.min != null ? f.min : 0}" ${f.max != null ? `max="${f.max}"` : ''}
                step="${f.langkah != null ? f.langkah : 1}">`;
              break;
            case 'tanggal':
              kontrol = `<input type="date" ${umum} value="${U.esc(nilai)}">`;
              break;
            case 'waktu':
              kontrol = `<input type="time" ${umum} value="${U.esc(nilai)}">`;
              break;
            case 'password':
              kontrol = `<input type="password" ${umum} value="${U.esc(nilai)}">`;
              break;
            default:
              kontrol = `<input type="text" ${umum} value="${U.esc(nilai)}">`;
          }

          return `<div class="${cls}">
            <label for="${idForm}-${U.esc(f.nama)}">${U.esc(f.label || f.nama)}${wajib}</label>
            ${kontrol}
            ${f.petunjuk ? `<small class="petunjuk">${f.petunjuk}</small>` : ''}
          </div>`;
        }).join('')}
      </form>`;

    return new Promise((resolve) => {
      let selesai = false;
      const m = buka({
        judul: cfg.judul,
        isi: isiHTML,
        lebar: cfg.lebar,
        aksi: [
          { label: 'Batal', kelas: 'btn-abu', onClick: () => { if (!selesai) { selesai = true; resolve(null); } } },
          {
            label: cfg.labelSimpan || 'Simpan',
            kelas: 'btn-utama',
            onClick: ({ overlay }) => {
              const formEl = overlay.querySelector('form');
              const data = ambilNilai(formEl, cfg.fields);
              const salah = validasi(formEl, cfg.fields);
              if (salah) { toast(salah, 'peringatan'); return false; }
              selesai = true;
              resolve(data);
              return true;
            }
          }
        ]
      });

      m.overlay.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = m.overlay.querySelector('.btn-utama');
        btn.click();
      });

      m.overlay.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('overlay') && !selesai) {
          selesai = true; resolve(null);
        }
      });
    });
  }

  function ambilNilai(formEl, fields) {
    const out = {};
    fields.forEach(f => {
      const el = formEl.elements[f.nama];
      if (!el) { out[f.nama] = ''; return; }
      if (f.tipe === 'angka') out[f.nama] = U.toNumber(el.value);
      else out[f.nama] = String(el.value).trim();
    });
    return out;
  }

  function validasi(formEl, fields) {
    for (const f of fields) {
      const el = formEl.elements[f.nama];
      if (!el) continue;
      const v = String(el.value || '').trim();
      if (f.wajib && !v) return `Kolom "${f.label || f.nama}" wajib diisi.`;
      if (f.tipe === 'angka' && v !== '' && f.min != null && U.toNumber(v) < f.min) {
        return `Nilai "${f.label}" minimal ${f.min}.`;
      }
    }
    return null;
  }

  /* ---------------- Konfirmasi ---------------- */
  function konfirmasi(cfg) {
    return new Promise((resolve) => {
      let selesai = false;
      const isi = `<p class="konfirmasi-teks">${cfg.pesan || 'Yakin melanjutkan?'}</p>`;
      buka({
        judul: cfg.judul || 'Konfirmasi',
        isi,
        lebar: 'kecil',
        aksi: [
          { label: cfg.labelBatal || 'Batal', kelas: 'btn-abu', onClick: () => { if (!selesai) { selesai = true; resolve(false); } } },
          {
            label: cfg.labelYa || 'Ya, lanjutkan',
            kelas: cfg.bahaya ? 'btn-bahaya' : 'btn-utama',
            onClick: () => { if (!selesai) { selesai = true; resolve(true); } }
          }
        ]
      });
    });
  }

  return { toast, buka, form, konfirmasi };
})();
