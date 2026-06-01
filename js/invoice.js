/* =============================================================
   Rajasthan Marble World — Invoice page renderer
   Reads the payload saved by the dashboard from sessionStorage
   and populates the static invoice template.
   ============================================================= */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- Indian numeric formatting ----------
  const inrFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fmt = (n) => inrFmt.format(Number(n) || 0);

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).toUpperCase();
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function loadPayload() {
    try {
      const raw = sessionStorage.getItem('rmw_invoice_data');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read invoice data:', e);
      return null;
    }
  }

  function renderBillTo(customer) {
    const lines = [];
    if (customer?.name)    lines.push(customer.name);
    if (customer?.address) lines.push(customer.address);
    if (customer?.city)    lines.push(customer.city);
    if (customer?.country) lines.push(customer.country + '.');

    const host = $('#billToLines');
    if (!lines.length) {
      host.innerHTML = '<span class="bill-line">—</span>';
      return;
    }
    host.innerHTML = lines.map(l => `<span class="bill-line">${escapeHtml(l)}</span>`).join('');
  }

  function renderMeta(invoice) {
    $('#invInvoiceNo').textContent = invoice?.no || '—';
    $('#invDate').textContent      = invoice?.date ? fmtDate(invoice.date) : '—';
    $('#invValidity').textContent  = invoice?.validity || '30 Days';
  }

  function renderItems(items) {
    const body = $('#invItemsBody');
    body.innerHTML = '';

    items.forEach((it, i) => {
      const amount = (it.area || 0) * (it.rate || 0);
      const tr = document.createElement('tr');

      // Swatch: real image if provided, otherwise CSS-gradient placeholder
      const swatchStyle = it.image
        ? `background-image:url('${escapeHtml(it.image)}');background-size:cover;background-position:center;`
        : `background-image:radial-gradient(ellipse at 25% 20%, ${it.accent}, transparent 55%),radial-gradient(ellipse at 75% 65%, ${it.accent}, transparent 60%),linear-gradient(135deg, ${it.base} 0%, ${it.base} 100%);`;

      const swatchHtml = it.image
        ? `<img class="material-swatch" src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}">`
        : `<span class="material-swatch" style="${swatchStyle}display:inline-block"></span>`;

      tr.innerHTML = `
        <td class="col-sno">${i + 1}.</td>
        <td class="col-mat">
          <div class="material-cell">
            ${swatchHtml}
            <span class="material-name">${escapeHtml(it.name)}</span>
          </div>
        </td>
        <td class="col-desc">${escapeHtml(it.description || '')}</td>
        <td class="col-area">${fmt(it.area)}</td>
        <td class="col-rate">${fmt(it.rate)}</td>
        <td class="col-amt">${fmt(amount)}</td>
      `;
      body.appendChild(tr);
    });
  }

  function renderTotals(items, taxPct, laborCharge) {
    const subTotal = items.reduce((s, it) => s + (it.area * it.rate), 0);
    const taxAmt   = subTotal * ((taxPct || 0) / 100);
    const labor    = laborCharge || 0;
    const grand    = subTotal + taxAmt + labor;

    const foot = $('#invTotalsFoot');
    const rows = [];

    rows.push(`
      <tr>
        <td colspan="4"></td>
        <td class="totals-label">Sub Total</td>
        <td class="totals-value">${fmt(subTotal)}</td>
      </tr>`);

    if ((taxPct || 0) > 0) {
      rows.push(`
        <tr>
          <td colspan="4"></td>
          <td class="totals-label">GST (${fmtPct(taxPct)}%)</td>
          <td class="totals-value">${fmt(taxAmt)}</td>
        </tr>`);
    }

    if (labor > 0) {
      rows.push(`
        <tr>
          <td colspan="4"></td>
          <td class="totals-label">Labour Charge</td>
          <td class="totals-value">${fmt(labor)}</td>
        </tr>`);
    }

    rows.push(`
      <tr class="grand-total">
        <td colspan="4"></td>
        <td class="totals-label">Grand Total (INR)</td>
        <td class="totals-value">${fmt(grand)}</td>
      </tr>`);

    foot.innerHTML = rows.join('');
  }

  function fmtPct(p) {
    // Trim trailing zeros: 18.00 → 18, 18.50 → 18.5
    const s = Number(p).toFixed(2);
    return s.replace(/\.?0+$/, '');
  }

  // ---------- Fit-to-one-page ----------
  // A4 height in px at 96 dpi (browsers print at this assumption).
  const A4_HEIGHT_PX = (297 / 25.4) * 96; // ≈ 1122.52

  // Shrinks .invoice-page contents so the whole invoice fits in one A4 page.
  // Wraps direct children once in .invoice-fit so transform-scale can be applied
  // without breaking the flex column layout.
  function fitToOnePage() {
    const page = document.querySelector('.invoice-page');
    if (!page) return;

    let fit = page.querySelector(':scope > .invoice-fit');
    if (!fit) {
      fit = document.createElement('div');
      fit.className = 'invoice-fit';
      // Move all existing children into the wrapper, in order.
      while (page.firstChild) fit.appendChild(page.firstChild);
      page.appendChild(fit);
    }

    // Reset prior fit
    fit.style.transform = '';
    fit.style.transformOrigin = '';
    fit.style.width = '';
    fit.style.height = '';

    // Target is always exactly one A4 page. We must NOT use the on-screen page
    // height here: .invoice-page has min-height:297mm and is a flex column, so
    // when content overflows it grows past 297mm — measuring that would make the
    // target equal the natural height and the scale-down would never fire.
    const targetH  = A4_HEIGHT_PX;
    const naturalH = fit.scrollHeight;

    if (naturalH > targetH + 0.5) {
      const scale = (targetH / naturalH) * 0.99; // ~1% safety margin so nothing clips
      fit.style.transformOrigin = 'top left';
      fit.style.transform = `scale(${scale})`;
      // Compensate the width so the visual width still equals 210mm after scaling
      fit.style.width = (100 / scale) + '%';
    }
  }

  function init() {
    // Print button — fit again right before opening the print dialog
    const btn = document.getElementById('printBtn');
    if (btn) btn.addEventListener('click', () => {
      fitToOnePage();
      // Give the layout a frame to settle before opening the dialog
      setTimeout(() => window.print(), 50);
    });

    // Re-fit on resize and on the browser's print event (lots of UAs trigger reflow)
    window.addEventListener('resize', () => requestAnimationFrame(fitToOnePage));
    window.addEventListener('beforeprint', fitToOnePage);

    const data = loadPayload();
    if (!data) {
      // No data — show a friendly placeholder rather than an empty invoice.
      $('#invItemsBody').innerHTML = `
        <tr>
          <td colspan="6" style="padding:40px;text-align:center;color:#6a6a6a;font-family:'Cormorant Garamond',serif;font-size:14pt;letter-spacing:1.5px;">
            No invoice data found. Please generate from the
            <a href="index.html" style="color:#0d3a2b;text-decoration:underline;">dashboard</a>.
          </td>
        </tr>`;
      $('#invTotalsFoot').innerHTML = '';
      return;
    }

    renderMeta(data.invoice);
    renderBillTo(data.customer);
    renderItems(data.items || []);
    renderTotals(data.items || [], data.taxPct || 0, data.laborCharge || 0);

    // After rendering, wait for web fonts + images, then fit.
    const refit = () => requestAnimationFrame(fitToOnePage);
    refit();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refit);
    }
    // Re-fit once images load (swatch dimensions can shift before fonts/images settle)
    const imgs = document.querySelectorAll('.invoice-page img');
    let pending = imgs.length;
    if (pending === 0) {
      setTimeout(refit, 60);
    } else {
      imgs.forEach(img => {
        const done = () => { if (--pending === 0) refit(); };
        if (img.complete) done();
        else { img.addEventListener('load', done); img.addEventListener('error', done); }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
