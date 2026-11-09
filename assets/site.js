/* ==========================================================
   Benjamin Hejda – shared site script (v3)
   Mobile menu, pop-up dialogs and a few helpers.
   The menu and language links are written into each page
   by build/build.mjs, so nothing here needs editing for new pages.
   ========================================================== */
(function () {
  var lang = document.documentElement.getAttribute('data-lang') || 'en';

  /* ---------- Mobile menu ---------- */
  var menu = document.getElementById('mobileMenu');
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) closeBtn.focus(); else openBtn.focus();
  }
  if (menu) {
    openBtn.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  }

  /* ---------- Pop-up dialog ---------- */
  var dialog = document.createElement('dialog');
  dialog.className = 'pop';
  dialog.innerHTML = '<div class="pop-body"><button class="pop-close" type="button" aria-label="' +
    (document.body.getAttribute('data-close') || 'Close') + '">✕</button><div class="pop-content"></div></div>';
  document.body.appendChild(dialog);
  dialog.querySelector('.pop-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', function () { document.body.style.overflow = ''; });

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.Site = {
    lang: lang,
    escape: escape,
    /* Site.openModal(htmlString, { wide: bool }) */
    openModal: function (html, opts) {
      dialog.classList.toggle('wide', !!(opts && opts.wide));
      dialog.querySelector('.pop-content').innerHTML = html;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
      dialog.querySelector('.pop-body').scrollTop = 0;
    },
    closeModal: function () { dialog.close(); }
  };
})();
