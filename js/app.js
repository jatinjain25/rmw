/* =============================================================
   Rajasthan Marble World — Dashboard logic
   ============================================================= */

(function () {
  'use strict';

  const COLORS = window.MARBLE_COLORS || [];

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Indian numeric formatting (e.g. 19,11,600.00) ----------
  const inrFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatINR = (n) => '₹ ' + inrFmt.format(Number(n) || 0);

  // ---------- State ----------
  const state = {
    rows: [],          // { id, colorId, area, rate, description }
    activeRowId: null, // when colour modal is open
  };

  let nextRowId = 1;

  // ---------- Refs ----------
  const itemsBody   = $('#itemsBody');
  const rowTpl      = $('#rowTpl');

  const subTotalEl  = $('#subTotal');
  const taxPctEl    = $('#taxPct');
  const taxAmtEl    = $('#taxAmt');
  const laborEl     = $('#laborCharge');
  const laborAmtEl  = $('#laborAmt');
  const grandEl     = $('#grandTotal');

  const colorModal  = $('#colorModal');
  const colorGrid   = $('#colorGrid');
  const colorSearch = $('#colorSearch');
  const modalCount  = $('#modalCount');

  // ---------- Helpers ----------
  function findColor(id) {
    return COLORS.find(c => c.id === id) || null;
  }

  function applySwatchVars(el, color) {
    if (!color) {
      el.style.removeProperty('--base');
      el.style.removeProperty('--accent');
      el.classList.add('swatch-empty');
      return;
    }
    el.classList.remove('swatch-empty');
    el.style.setProperty('--base', color.base);
    el.style.setProperty('--accent', color.accent);
    // If a real image exists, render it as background-image (overrides gradients).
    if (color.image) {
      el.style.backgroundImage = `url('${color.image}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    } else {
      el.style.removeProperty('background-image');
      el.style.removeProperty('background-size');
      el.style.removeProperty('background-position');
    }
  }

  // ---------- Row management ----------
  function addRow(data) {
    const row = {
      id: nextRowId++,
      colorId: data?.colorId || null,
      name: data?.name ?? '',   // optional display-name override
      area: data?.area ?? '',
      rate: data?.rate ?? '',
      description: data?.description ?? '',
    };
    state.rows.push(row);
    renderRow(row);
    renumberRows();
    computeTotals();
  }

  function renderRow(row) {
    const frag = rowTpl.content.cloneNode(true);
    const el   = frag.querySelector('.item-row');
    el.dataset.rowId = row.id;

    // Initial values
    el.querySelector('.area-input').value = row.area;
    el.querySelector('.rate-input').value = row.rate;
    el.querySelector('.desc-input').value = row.description;

    const nameInput = el.querySelector('.mat-name-input');
    nameInput.value = row.name;

    if (row.colorId) {
      const color = findColor(row.colorId);
      if (color) {
        applySwatchVars(el.querySelector('.swatch'), color);
        el.querySelector('.color-name').textContent = color.name;
        // Empty name box falls back to the colour name — show it as placeholder.
        nameInput.placeholder = color.name;
      }
    }

    // Wire events
    el.querySelector('.color-pick').addEventListener('click', () => openColorModal(row.id));

    nameInput.addEventListener('input', (e) => {
      row.name = e.target.value;
    });

    el.querySelector('.area-input').addEventListener('input', (e) => {
      row.area = e.target.value;
      updateRowAmount(el, row);
      computeTotals();
    });

    el.querySelector('.rate-input').addEventListener('input', (e) => {
      row.rate = e.target.value;
      updateRowAmount(el, row);
      computeTotals();
    });

    el.querySelector('.desc-input').addEventListener('input', (e) => {
      row.description = e.target.value;
    });

    el.querySelector('.row-remove').addEventListener('click', () => removeRow(row.id));

    itemsBody.appendChild(frag);
    updateRowAmount(el, row);
  }

  function removeRow(id) {
    if (state.rows.length === 1) {
      // Reset the single remaining row instead of leaving zero rows.
      const row = state.rows[0];
      row.colorId = null; row.area = ''; row.rate = ''; row.description = ''; row.name = '';
      const el = itemsBody.querySelector(`[data-row-id="${row.id}"]`);
      if (el) {
        el.querySelector('.area-input').value = '';
        el.querySelector('.rate-input').value = '';
        el.querySelector('.desc-input').value = '';
        const nameInput = el.querySelector('.mat-name-input');
        nameInput.value = '';
        nameInput.placeholder = 'Display name (optional)';
        applySwatchVars(el.querySelector('.swatch'), null);
        el.querySelector('.color-name').textContent = 'Select colour (optional)';
        updateRowAmount(el, row);
      }
      computeTotals();
      return;
    }
    state.rows = state.rows.filter(r => r.id !== id);
    const el = itemsBody.querySelector(`[data-row-id="${id}"]`);
    if (el) el.remove();
    renumberRows();
    computeTotals();
  }

  function renumberRows() {
    $$('.item-row', itemsBody).forEach((el, i) => {
      el.querySelector('.sr').textContent = (i + 1) + '.';
    });
  }

  function rowAmount(row) {
    const a = parseFloat(row.area) || 0;
    const r = parseFloat(row.rate) || 0;
    return a * r;
  }

  function updateRowAmount(el, row) {
    el.querySelector('.amount').textContent = formatINR(rowAmount(row));
  }

  // ---------- Totals ----------
  function computeTotals() {
    const subTotal = state.rows.reduce((s, r) => s + rowAmount(r), 0);
    const taxPct   = parseFloat(taxPctEl.value) || 0;
    const taxAmt   = subTotal * (taxPct / 100);
    const labor    = parseFloat(laborEl.value) || 0;
    const grand    = subTotal + taxAmt + labor;

    subTotalEl.textContent = formatINR(subTotal);
    taxAmtEl.textContent   = formatINR(taxAmt);
    laborAmtEl.textContent = formatINR(labor);
    grandEl.textContent    = formatINR(grand);
  }

  // ---------- Color picker modal ----------
  function openColorModal(rowId) {
    state.activeRowId = rowId;
    const row = state.rows.find(r => r.id === rowId);
    renderColorGrid('', row?.colorId);
    colorSearch.value = '';
    colorModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => colorSearch.focus(), 50);
  }

  function closeColorModal() {
    state.activeRowId = null;
    colorModal.setAttribute('aria-hidden', 'true');
  }

  function renderColorGrid(query, selectedId) {
    const q = query.trim().toLowerCase();
    const list = q ? COLORS.filter(c => c.name.toLowerCase().includes(q)) : COLORS;

    colorGrid.innerHTML = '';
    list.forEach(color => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'color-card' + (color.id === selectedId ? ' is-selected' : '');
      card.dataset.colorId = color.id;

      const sw = document.createElement('span');
      sw.className = 'swatch';
      applySwatchVars(sw, color);

      const lbl = document.createElement('span');
      lbl.className = 'label';
      lbl.textContent = color.name;

      card.appendChild(sw);
      card.appendChild(lbl);
      card.addEventListener('click', () => selectColor(color.id));
      colorGrid.appendChild(card);
    });

    modalCount.textContent = `${list.length} / ${COLORS.length}`;
  }

  function selectColor(colorId) {
    const row = state.rows.find(r => r.id === state.activeRowId);
    if (!row) { closeColorModal(); return; }
    row.colorId = colorId;
    const color = findColor(colorId);
    const el = itemsBody.querySelector(`[data-row-id="${row.id}"]`);
    if (el && color) {
      applySwatchVars(el.querySelector('.swatch'), color);
      el.querySelector('.color-name').textContent = color.name;

      // Empty name box falls back to the colour name — surface it as placeholder.
      el.querySelector('.mat-name-input').placeholder = color.name;

      // Auto-fill description if the user hasn't typed one yet.
      if (!row.description && color.description) {
        row.description = color.description;
        el.querySelector('.desc-input').value = color.description;
      }
    }
    closeColorModal();
  }

  // ---------- Reset ----------
  function resetAll() {
    if (!confirm('Reset the dashboard? All entered data will be lost.')) return;
    state.rows = [];
    itemsBody.innerHTML = '';
    $('#customerName').value = '';
    $('#customerAddress').value = '';
    $('#customerCity').value = '';
    $('#customerCountry').value = 'India';
    $('#invoiceNo').value = '';
    setTodayDate();
    $('#invoiceValidity').value = '30 Days';
    taxPctEl.value = '18';
    laborEl.value = '0';
    addRow();
    computeTotals();
  }

  // ---------- Generate invoice ----------
  function generateInvoice() {
    // A row is usable if it has either a catalogue colour or a typed name,
    // plus a positive area and rate.
    const hasMaterial = (r) => r.colorId || r.name.trim();
    const isUsable = (r) => hasMaterial(r) && (parseFloat(r.area) > 0) && (parseFloat(r.rate) > 0);

    // Validate at least one populated row
    const populated = state.rows.filter(isUsable);
    if (!populated.length) {
      alert('Add at least one line item with a colour (or granite name), area, and rate.');
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      customer: {
        name:    $('#customerName').value.trim(),
        address: $('#customerAddress').value.trim(),
        city:    $('#customerCity').value.trim(),
        country: $('#customerCountry').value.trim() || 'India',
      },
      invoice: {
        no:       $('#invoiceNo').value.trim(),
        date:     $('#invoiceDate').value,
        validity: $('#invoiceValidity').value.trim() || '30 Days',
      },
      items: state.rows.filter(isUsable).map(r => {
        const c = findColor(r.colorId);
        // Typed name overrides the catalogue name; image always follows the
        // selected colour (blank for a name-only custom item).
        return {
          colorId:     r.colorId || null,
          name:        r.name.trim() || (c ? c.name : ''),
          base:        c ? c.base : '#f5efe3',
          accent:      c ? c.accent : '#d9d1c1',
          image:       c ? c.image : '',
          description: r.description || '',
          area:        parseFloat(r.area) || 0,
          rate:        parseFloat(r.rate) || 0,
        };
      }),
      taxPct:       parseFloat(taxPctEl.value) || 0,
      laborCharge:  parseFloat(laborEl.value) || 0,
    };

    try {
      sessionStorage.setItem('rmw_invoice_data', JSON.stringify(payload));
    } catch (e) {
      alert('Could not save invoice data: ' + e.message);
      return;
    }
    window.location.href = 'invoice.html';
  }

  // ---------- Init ----------
  function setTodayDate() {
    const d = new Date();
    const iso = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    $('#invoiceDate').value = iso;
  }

  function init() {
    setTodayDate();

    // Default invoice no: RMW/INV/<FY>/001
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    $('#invoiceNo').value = `RMW/INV/${y}-${String(y + 1).slice(-2)}/001`;

    addRow();

    // Header actions
    $('#addRowBtn').addEventListener('click', () => addRow());
    $('#resetBtn').addEventListener('click', resetAll);
    $('#generateBtn').addEventListener('click', generateInvoice);

    // Totals listeners
    taxPctEl.addEventListener('input', computeTotals);
    laborEl.addEventListener('input', computeTotals);

    // Modal close
    $$('.modal [data-close-modal]').forEach(el =>
      el.addEventListener('click', closeColorModal)
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && colorModal.getAttribute('aria-hidden') === 'false') {
        closeColorModal();
      }
    });

    // Modal search
    colorSearch.addEventListener('input', (e) => {
      const row = state.rows.find(r => r.id === state.activeRowId);
      renderColorGrid(e.target.value, row?.colorId);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
