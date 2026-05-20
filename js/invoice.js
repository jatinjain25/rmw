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

  function init() {
    // Print button
    const btn = document.getElementById('printBtn');
    if (btn) btn.addEventListener('click', () => window.print());

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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
