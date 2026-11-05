/* ==========================================================
   Benjamin Hejda – shared site script
   Builds the burger menu on every page and provides a modal.
   To add/rename a page or language, edit PAGES / LABELS below.
   ========================================================== */
(function () {
  var LANGS = ['cz', 'en', 'de', 'pt'];
  var FLAG = { cz: 'cz', en: 'gb', de: 'de', pt: 'pt' };
  var LANG_NAME = { cz: 'Čeština', en: 'English', de: 'Deutsch', pt: 'Português' };
  var PAGES = ['home', 'blog', 'growth', 'experience', 'gallery', 'fun', 'contacts'];

  var LABELS = {
    en: { home: 'Home', blog: 'Blog', growth: 'Growth & Learning', experience: 'Experience', gallery: 'Gallery', fun: 'Fun Facts', contacts: 'Contacts', open: 'Open menu', close: 'Close menu', closeModal: 'Close' },
    cz: { home: 'Domů', blog: 'Blog', growth: 'Růst a vzdělávání', experience: 'Zkušenosti', gallery: 'Galerie', fun: 'Zajímavosti', contacts: 'Kontakty', open: 'Otevřít menu', close: 'Zavřít menu', closeModal: 'Zavřít' },
    de: { home: 'Startseite', blog: 'Blog', growth: 'Entwicklung & Lernen', experience: 'Berufserfahrung', gallery: 'Galerie', fun: 'Wissenswertes', contacts: 'Kontakt', open: 'Menü öffnen', close: 'Menü schließen', closeModal: 'Schließen' },
    pt: { home: 'Início', blog: 'Blog', growth: 'Crescimento & Aprendizagem', experience: 'Experiência', gallery: 'Galeria', fun: 'Curiosidades', contacts: 'Contactos', open: 'Abrir menu', close: 'Fechar menu', closeModal: 'Fechar' }
  };

  var lang = document.documentElement.getAttribute('data-lang') || 'en';
  var page = document.body.getAttribute('data-page') || 'home';
  var T = LABELS[lang] || LABELS.en;

  function fileFor(p, l) { return p + (l === 'en' ? '' : '-' + l) + '.html'; }

  /* ---------- Build menu ---------- */
  var burger = document.createElement('button');
  burger.className = 'burger';
  burger.type = 'button';
  burger.setAttribute('aria-controls', 'sidebar');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', T.open);
  burger.innerHTML = '<span></span><span></span><span></span>';

  var backdrop = document.createElement('div');
  backdrop.className = 'menu-backdrop';

  var nav = document.createElement('nav');
  nav.className = 'sidebar';
  nav.id = 'sidebar';
  nav.setAttribute('aria-label', 'Menu');

  var flags = '<div class="flags">' + LANGS.map(function (l) {
    return '<a href="' + fileFor(page, l) + '" hreflang="' + (l === 'cz' ? 'cs' : l) + '" title="' + LANG_NAME[l] + '"' +
      (l === lang ? ' aria-current="true"' : '') + '><img src="https://flagcdn.com/w80/' + FLAG[l] + '.png" alt="' + LANG_NAME[l] + '" width="48" height="32"></a>';
  }).join('') + '</div>';

  var links = '<ul class="nav-links">' + PAGES.map(function (p) {
    return '<li><a href="' + fileFor(p, lang) + '"' + (p === page ? ' aria-current="page"' : '') + '>' + T[p] + '</a></li>';
  }).join('') + '</ul>';

  nav.innerHTML = flags + links;
  document.body.prepend(nav);
  document.body.prepend(backdrop);
  document.body.prepend(burger);

  function setMenu(open) {
    nav.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? T.close : T.open);
    if (open) { var first = nav.querySelector('.nav-links a'); if (first) first.focus({ preventScroll: true }); }
  }
  function isOpen() { return nav.classList.contains('open'); }

  burger.addEventListener('click', function () { setMenu(!isOpen()); });
  backdrop.addEventListener('click', function () { setMenu(false); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });

  /* ---------- Modal ---------- */
  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = '<div class="modal-box"><button class="modal-close" type="button" aria-label="' + T.closeModal + '">&times;</button><div class="modal-inner"></div></div>';
  document.body.appendChild(modal);
  var modalBox = modal.querySelector('.modal-box');
  var modalInner = modal.querySelector('.modal-inner');
  var lastFocus = null;

  function closeModal() {
    modal.classList.remove('show');
    document.body.classList.remove('menu-open');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('show')) closeModal();
    else if (isOpen()) { setMenu(false); burger.focus(); }
  });

  /* Site.openModal(htmlString, { wide: bool }) */
  window.Site = {
    lang: lang,
    page: page,
    openModal: function (html, opts) {
      lastFocus = document.activeElement;
      modalBox.classList.toggle('wide', !!(opts && opts.wide));
      modalInner.innerHTML = html;
      modal.classList.add('show');
      document.body.classList.add('menu-open');
      modalBox.scrollTop = 0;
      modal.querySelector('.modal-close').focus({ preventScroll: true });
    },
    closeModal: closeModal,
    escape: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };
})();
