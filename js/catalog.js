// Catalog grid — 14 marbles with real photos in /assets/colors/.
// Categories drive the filter chips.

(function () {
  'use strict';

  const MARBLES = [
    { file: 'black-blue.jpg',         name: 'Black Blue',         category: 'blues',  caption: 'Granite' },
    { file: 'black-dc.jpg',           name: 'Black DC',           category: 'blacks', caption: 'Granite' },
    { file: 'black-galaxy.jpg',       name: 'Black Galaxy',       category: 'blacks', caption: 'Granite · Gold Fleck' },
    { file: 'celwhite.jpg',           name: 'Cel White',          category: 'whites', caption: 'Marble' },
    { file: 'coffee.jpg',             name: 'Coffee',             category: 'browns', caption: 'Granite' },
    { file: 'jet-black.jpg',          name: 'Jet Black',          category: 'blacks', caption: 'Granite' },
    { file: 'p-white.jpg',            name: 'Premium White',      category: 'whites', caption: 'Marble' },
    { file: 'r-black.jpg',            name: 'R Black',            category: 'blacks', caption: 'Granite' },
    { file: 'royal-black.jpg',        name: 'Royal Black',        category: 'blacks', caption: 'Granite' },
    { file: 'safari-blue.jpg',        name: 'Safari Blue',        category: 'blues',  caption: 'Granite' },
    { file: 'safari-pearl-blue.jpg',  name: 'Safari Pearl Blue',  category: 'blues',  caption: 'Granite' },
    { file: 'tan-brown-red.jpg',      name: 'Tan Brown Red',      category: 'browns', caption: 'Granite' },
    { file: 'tan-red.jpg',            name: 'Tan Red',            category: 'browns', caption: 'Granite' },
    { file: 'tiki-brown.jpg',         name: 'Tiki Brown',         category: 'browns', caption: 'Granite' },
  ];

  const grid = document.getElementById('catalogGrid');
  const filterRow = document.getElementById('catalogFilters');
  if (!grid) return;

  function render(activeCategory) {
    const visible = activeCategory === 'all'
      ? MARBLES
      : MARBLES.filter(m => m.category === activeCategory);

    grid.innerHTML = visible.map(m => `
      <article class="marble-card" data-cat="${m.category}">
        <div class="marble-image">
          <img src="assets/colors/${m.file}" alt="${m.name}" loading="lazy">
        </div>
        <div class="marble-body">
          <div class="marble-name">${m.name}</div>
          <div class="marble-cat">${m.caption}</div>
          <a href="quotation.html" class="btn btn-green">Request Quote →</a>
        </div>
      </article>
    `).join('');

    if (!visible.length) {
      grid.innerHTML = `
        <div class="catalog-empty" style="grid-column:1/-1;">
          <p>No materials match this filter. <a href="quotation.html">Request a custom quote →</a></p>
        </div>`;
    }
  }

  render('all');

  if (filterRow) {
    filterRow.addEventListener('click', function (e) {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      filterRow.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      render(chip.dataset.cat || 'all');
    });
  }
})();
