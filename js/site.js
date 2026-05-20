// Shared site-shell behavior: mobile nav toggle + active-link highlight.
(function () {
  'use strict';

  const body = document.body;
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      body.classList.toggle('nav-open');
      const open = body.classList.contains('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close drawer when a nav link is tapped (mobile UX)
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close drawer when viewport grows past mobile breakpoint
    const mq = window.matchMedia('(min-width: 821px)');
    const onMq = function (e) {
      if (e.matches) {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else mq.addListener(onMq);
  }

  // Highlight active nav link based on current page
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const baseName = path.replace(/\.html$/, '') || 'index';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    const href = (a.getAttribute('href') || '').toLowerCase();
    const target = href.replace(/\.html$/, '').replace(/^\/+/, '') || 'index';
    if (target === baseName) a.classList.add('active');
  });
})();
