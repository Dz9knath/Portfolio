// Builds every page of the site from the data in content/ (and assets/facts.js).
// Run from the repo root:  node build/build.mjs      (Node 18+, no dependencies)
// Edit text in content/*.json, then re-run this script and commit the HTML.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL('content/' + f, ROOT), 'utf8'));
const write = (f, s) => writeFileSync(new URL(f, ROOT), s);

const LANGS = ['en', 'cz', 'de', 'pt'];
const HTML_LANG = { en: 'en', cz: 'cs', de: 'de', pt: 'pt' };
const LANG_CODE = { en: 'EN', cz: 'CZ', de: 'DE', pt: 'PT' };
const LANG_NAME = { en: 'English', cz: 'Čeština', de: 'Deutsch', pt: 'Português' };
const PAGES = ['home', 'growth', 'experience', 'gallery', 'blog', 'fun', 'chess', 'contacts'];

const UI = read('ui.json'), TITLES = read('titles.json'), HOME = read('home.json'), LOG = read('changelog.json');
const GROWTH = read('growth.json'), EXP = read('experience.json'), BLOG = read('blog.json');
const GAL = read('gallery.json'), CONTACT = read('contact.json'), FUN = read('fun.json'), CHESS = read('chess.json');

const file = (page, lang) => page + (lang === 'en' ? '' : '-' + lang) + '.html';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

const DESC = {
  en: t => `${t} – portfolio of Benjamin Hejda, a Czech business student, rugby coach and endurance athlete.`,
  cz: t => `${t} – portfolio Benjamina Hejdy, českého studenta businessu, trenéra ragby a vytrvalostního sportovce.`,
  de: t => `${t} – Portfolio von Benjamin Hejda, tschechischer Business-Student, Rugbytrainer und Ausdauersportler.`,
  pt: t => `${t} – portfólio de Benjamin Hejda, estudante de gestão checo, treinador de rugby e atleta de resistência.`
};
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%231e1b4b'/%3E%3Ccircle cx='20' cy='44' r='7' fill='%23ff5470'/%3E%3Ccircle cx='32' cy='44' r='7' fill='%23ffc83d'/%3E%3Ccircle cx='44' cy='44' r='7' fill='%2319c2a0'/%3E%3Ctext x='32' y='30' text-anchor='middle' font-family='Arial,sans-serif' font-weight='bold' font-size='22' fill='%23fff'%3EBH%3C/text%3E%3C/svg%3E";

const FLAGS = {
  en: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#1f3a8a"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#d6263a" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6.4"/><path d="M15 0v20M0 10h30" stroke="#d6263a" stroke-width="3.6"/></svg>',
  cz: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0 0l15 10L0 20z" fill="#11457e"/></svg>',
  de: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.67" fill="#111"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/></svg>',
  pt: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="12" height="20" fill="#046a38"/><rect x="12" width="18" height="20" fill="#da291c"/><circle cx="12" cy="10" r="4.2" fill="#ffe900"/><circle cx="12" cy="10" r="2.2" fill="#fff" stroke="#da291c" stroke-width="0.8"/></svg>'
};
function langLinks(page, lang) {
  return `<nav class="langs" aria-label="${esc(UI[lang].language)}">` + LANGS.map(l =>
    `<a href="${file(page, l)}" hreflang="${HTML_LANG[l]}" lang="${HTML_LANG[l]}" title="${LANG_NAME[l]}" aria-label="${LANG_NAME[l]}"${l === lang ? ' aria-current="true"' : ''}>${FLAGS[l]}</a>`).join('') + '</nav>';
}
const wordmark = (lang) => `<a class="wordmark" href="${file('home', lang)}">Ben Hejda</a>`;

function topbar(page, lang) {
  const u = UI[lang];
  const link = p => `<li><a href="${file(p, lang)}"${p === page ? ' aria-current="page"' : ''}>${esc(u.nav[p])}</a></li>`;
  const links = PAGES.map(link).join('');
  const barLinks = PAGES.filter(p => p !== 'contacts').map(link).join(''); // Contact is the always-visible button
  return `<a class="skip" href="#main">${esc(u.skip)}</a>
  <header class="topbar">
    <div class="wrap">
      ${wordmark(lang)}
      <ul class="nav">${barLinks}</ul>
      ${langLinks(page, lang)}
      <a class="btn small color contact-btn" href="${file('contacts', lang)}"${page === 'contacts' ? ' aria-current="page"' : ''}>${esc(u.nav.contacts)}</a>
      <button id="menuOpen" class="btn small light menu-btn" type="button" aria-controls="mobileMenu" aria-expanded="false">${esc(u.menu)}</button>
    </div>
  </header>
  <div id="mobileMenu" class="mobile-menu" role="dialog" aria-modal="true" aria-label="${esc(u.menu)}">
    <div class="top">${wordmark(lang)}<button id="menuClose" class="btn small" type="button">${esc(u.closeMenu)}</button></div>
    <ul>${links}</ul>
    ${langLinks(page, lang)}
  </div>`;
}

function footer(page, lang) {
  const u = UI[lang];
  const items = LOG[lang].map(([date, ver, text]) => `<li><span class="ver">${esc(ver)}<small>${esc(date)}</small></span><span>${esc(text)}</span></li>`).join('');
  return `<footer class="site-footer">
    <div class="wrap">
      <details class="news"><summary>${esc(u.news)}</summary><ol>${items}</ol></details>
      <div class="row"><span>© 2026 Benjamin Hejda. ${esc(u.footer)}</span>${langLinks(page, lang)}</div>
    </div>
  </footer>`;
}

function render({ page, lang, title, body, scripts = '' }) {
  const full = page === 'home' ? `Benjamin Hejda – ${TITLES[lang].home}` : `${title} | Benjamin Hejda`;
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${file(page, l)}" />`).join('\n  ');
  write(file(page, lang), `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}" data-lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(full)}</title>
  <meta name="description" content="${esc(DESC[lang](title))}" />
  <meta name="theme-color" content="#1e1b4b" />
  <link rel="icon" href="${FAVICON}" />
  <link rel="preload" href="assets/fonts/bricolage-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="assets/site.css" />
  ${alt}
</head>
<body data-page="${page}" data-close="${esc(UI[lang].close)}">
  <!-- Generated by build/build.mjs from content/*.json – edit those, not this file. -->
  ${topbar(page, lang)}
  <main id="main">
${body.trim()}
  </main>
  ${footer(page, lang)}
  <script src="assets/site.js"></script>${scripts}
</body>
</html>
`);
}

// "“Quote.” – Author"  ->  quote text with the author on a line of its own
const quoteHTML = q => { const i = q.lastIndexOf(' – '); return i < 0 ? esc(q) : `${esc(q.slice(0, i))}<cite>– ${esc(q.slice(i + 3))}</cite>`; };
const pageHead = (title, lead) => `<div class="page-head"><div class="wrap"><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div></div>`;

/* ======================= HOME ======================= */
const HIGHLIGHTS = [0, 1, 2, 5, 6, 9, 12, 13]; // indexes into content/growth.json cards
for (const lang of LANGS) {
  const u = UI[lang], h = HOME[lang], g = GROWTH.ui[lang];
  const hl = HIGHLIGHTS.map(i => {
    const c = GROWTH.cards[i], [t, d] = c[lang], tag = c.tags[0];
    return `<li class="t-${tag}"><a href="${file('growth', lang)}#card-${i}"><span class="chip">${esc(g.tags[tag])}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></a></li>`;
  }).join('\n          ');
  const work = EXP.jobs.map((j, i) => {
    const [role, period, , , , orgOverride] = j[lang];
    return `<li><a href="${file('experience', lang)}#job-${i}"><span class="ico" aria-hidden="true">${j.icon}</span><span><strong>${esc(role)}</strong><span>${esc(orgOverride || j.org)}</span></span><span class="when">${esc(period)}</span></a></li>`;
  }).join('\n          ');
  const body = `
    <section class="hero">
      <div class="wrap">
        <div>
          <h1>${esc(u.hello)}</h1>
          <p class="role">${esc(u.role)}</p>
          <div class="ctas">
            <a class="btn" href="${file('experience', lang)}">${esc(u.ctaWork)}</a>
            <a class="btn light" href="${file('contacts', lang)}">${esc(u.ctaContact)}</a>
          </div>
        </div>
        <div class="portrait">
          <img src="assets/photos/t1spQG4.jpg" alt="${esc(u.photoAlt)}" width="1067" height="1600" fetchpriority="high" />
          <ul class="stamps">${u.stamps.map(s => `<li class="stamp">${esc(s)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>

    <section class="band now">
      <div class="wrap">
        <p class="label">${esc(h.nowLabel)}</p>
        <div><h2>${esc(h.nowTitle)}</h2><p>${esc(h.nowText)}</p></div>
      </div>
    </section>

    <section class="band">
      <div class="wrap">
        <div class="section-head"><h2>${esc(u.highlights)}</h2><a class="text-link" href="${file('growth', lang)}">${esc(u.allGrowth)}</a></div>
        <ul class="highlights">
          ${hl}
        </ul>
      </div>
    </section>

    <section class="band" style="padding-top:0">
      <div class="wrap">
        <div class="section-head"><h2>${esc(u.work)}</h2><a class="text-link" href="${file('experience', lang)}">${esc(u.allWork)}</a></div>
        <ul class="work-list">
          ${work}
        </ul>
      </div>
    </section>

    <section class="band" style="padding-top:0">
      <div class="wrap">
        <div class="section-head"><h2>${esc(u.play)}</h2></div>
        <div class="play-grid">
          <a class="play-tile chess" href="${file('chess', lang)}"><span class="glyph" aria-hidden="true">♞</span><h3>${esc(u.playChess)}</h3><p>${esc(h.tiles.chess)}</p></a>
          <a class="play-tile fun" href="${file('fun', lang)}"><span class="glyph" aria-hidden="true">?</span><h3>${esc(u.playFun)}</h3><p>${esc(h.tiles.fun)}</p></a>
        </div>
      </div>
    </section>

    <section class="band talk">
      <div class="wrap">
        <h2>${esc(u.talk)}</h2>
        <div class="ctas">
          <a class="btn" href="mailto:${CONTACT.email}">${esc(u.email)}</a>
          <a class="btn light" href="${CONTACT.links[0][1]}" target="_blank" rel="noopener">${esc(u.linkedin)}</a>
        </div>
      </div>
    </section>`;
  render({ page: 'home', lang, title: TITLES[lang].home, body });
}

/* ======================= GROWTH ======================= */
for (const lang of LANGS) {
  const g = GROWTH.ui[lang];
  const filters = ['all', ...GROWTH.tags].map(t => `<button type="button" data-tag="${t}" class="${t === 'all' ? '' : 't-' + t}" aria-pressed="${t === 'all'}">${esc(t === 'all' ? g.all : g.tags[t])}</button>`).join('');
  const cards = GROWTH.cards.map((c, i) => {
    const [t, d] = c[lang];
    return `<li data-tags="${c.tags.join(' ')}" class="t-${c.tags[0]}"><button type="button" data-i="${i}" id="card-${i}"><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="chips">${c.tags.map(x => `<span class="chip t-${x}">${esc(g.tags[x])}</span>`).join('')}</span></button></li>`;
  }).join('\n        ');
  const data = GROWTH.cards.map(c => ({ t: c[lang][0], d: c[lang][1], tags: c.tags }));
  const body = `
    ${pageHead(TITLES[lang].growth, g.intro)}
    <div class="wrap">
      <blockquote class="quote" id="quote" aria-live="polite">${quoteHTML(g.defaultQuote)}</blockquote>
      <div class="filters" role="group">${filters}</div>
      <ul class="cards" id="cards">
        ${cards}
      </ul>
    </div>`;
  const scripts = `
  <script>
  (function () {
    var CARDS = ${json(data)}, TAGS = ${json(g.tags)}, QUOTES = ${json(Object.fromEntries(Object.entries(g.quotes).map(([k, v]) => [k, quoteHTML(v)])))}, DEFAULT_QUOTE = ${json(quoteHTML(g.defaultQuote))};
    var esc = Site.escape;
    function open(i) {
      var c = CARDS[i];
      Site.openModal('<h2>' + esc(c.t) + '</h2><p class="chips" style="margin-bottom:16px">' + c.tags.map(function (t) { return '<span class="chip t-' + t + '">' + esc(TAGS[t]) + '</span>'; }).join('') + '</p><p>' + esc(c.d) + '</p>');
    }
    document.getElementById('cards').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) open(+b.dataset.i); });
    document.querySelectorAll('.filters button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tag = btn.dataset.tag;
        document.querySelectorAll('.filters button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        document.querySelectorAll('#cards li').forEach(function (li) { li.hidden = tag !== 'all' && li.dataset.tags.split(' ').indexOf(tag) < 0; });
        document.getElementById('quote').innerHTML = tag === 'all' ? DEFAULT_QUOTE : QUOTES[tag];
      });
    });
    var m = location.hash.match(/^#card-(\\d+)$/);
    if (m && CARDS[+m[1]]) open(+m[1]);
  })();
  </script>`;
  render({ page: 'growth', lang, title: TITLES[lang].growth, body, scripts });
}

/* ======================= EXPERIENCE ======================= */
const LEAD_EXP = { en: 'Open a role to read the full story.', cz: 'Otevřete roli a přečtěte si celý příběh.', de: 'Öffne eine Rolle, um alles zu lesen.', pt: 'Abre uma função para ler a história completa.' };
const VISIT = { en: 'Visit website', cz: 'Navštívit web', de: 'Website besuchen', pt: 'Visitar o site' };
for (const lang of LANGS) {
  const items = EXP.jobs.map((j, i) => {
    const [role, period, summary, full, skills, orgOverride] = j[lang];
    const org = orgOverride || j.org;
    return `<li><details class="job" id="job-${i}"${i === 0 ? ' open' : ''}>
          <summary><span class="ico" aria-hidden="true">${j.icon}</span><span><h2>${esc(role)}</h2><span class="org">${esc(org)}</span></span><span class="when">${esc(period)}</span></summary>
          <div class="detail">
            <p class="summary-line">${esc(summary)}</p>
            ${j.image ? `<img src="${j.image}" alt="${esc(role + ' – ' + org)}" loading="lazy" />` : ''}
            <p>${esc(full)}</p>
            <p class="chips">${(skills || []).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</p>
            ${j.link ? `<p><a class="text-link" href="${j.link}" target="_blank" rel="noopener">${esc(VISIT[lang])} ↗</a></p>` : ''}
          </div>
        </details></li>`;
  }).join('\n        ');
  const body = `
    ${pageHead(TITLES[lang].experience, LEAD_EXP[lang])}
    <div class="wrap">
      <ul class="jobs">
        ${items}
      </ul>
    </div>`;
  const scripts = `
  <script>
    var m = location.hash.match(/^#job-(\\d+)$/), d = m && document.getElementById('job-' + m[1]);
    if (d) { d.open = true; d.scrollIntoView(); }
  </script>`;
  render({ page: 'experience', lang, title: TITLES[lang].experience, body, scripts });
}

/* ======================= GALLERY ======================= */
const OPEN = { en: 'Click to enlarge', cz: 'Kliknutím zvětšíte', de: 'Zum Vergrößern klicken', pt: 'Clica para ampliar' };
const PREV = { en: 'Previous photo', cz: 'Předchozí fotka', de: 'Vorheriges Foto', pt: 'Foto anterior' };
const NEXT = { en: 'Next photo', cz: 'Další fotka', de: 'Nächstes Foto', pt: 'Foto seguinte' };
for (const lang of LANGS) {
  const items = GAL.photos.map((src, i) => `<button class="pin" type="button" data-i="${i}"><img src="${src}" alt="${esc(GAL.captions[lang][i])}" loading="lazy" /><span class="cap">${esc(GAL.captions[lang][i])}<small>${esc(OPEN[lang])}</small></span></button>`).join('\n      ');
  const body = `
    ${pageHead(TITLES[lang].gallery, GAL.lead[lang])}
    <div class="wall" id="gallery">
      ${items}
    </div>`;
  const scripts = `
  <script>
  (function () {
    var pins = [].slice.call(document.querySelectorAll('.pin')), at = 0, esc = Site.escape;
    function show(i) {
      at = (i + pins.length) % pins.length;
      var img = pins[at].querySelector('img');
      Site.openModal('<div class="viewer"><button class="nav-btn" type="button" data-step="-1" aria-label="${esc(PREV[lang])}">←</button>' +
        '<figure><img src="' + img.getAttribute('src') + '" alt="' + esc(img.alt) + '"><figcaption>' + esc(img.alt) + '</figcaption></figure>' +
        '<button class="nav-btn" type="button" data-step="1" aria-label="${esc(NEXT[lang])}">→</button></div>', { wide: true });
    }
    document.getElementById('gallery').addEventListener('click', function (e) { var b = e.target.closest('.pin'); if (b) show(+b.dataset.i); });
    document.addEventListener('click', function (e) { var b = e.target.closest('.viewer .nav-btn'); if (b) show(at + +b.dataset.step); });
    document.addEventListener('keydown', function (e) {
      if (!document.querySelector('dialog.pop[open] .viewer')) return;
      if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1);
    });
    // On touch screens there is no hover, so the photo nearest the middle of the screen shows its caption.
    if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (x) { x.target.classList.toggle('in-view', x.isIntersecting); }); }, { rootMargin: '-35% 0px -35% 0px' });
      pins.forEach(function (p) { io.observe(p); });
    }
  })();
  </script>`;
  render({ page: 'gallery', lang, title: TITLES[lang].gallery, body, scripts });
}

/* ======================= BLOG ======================= */
for (const lang of LANGS) {
  const b = BLOG[lang];
  const posts = b.posts.map(p => `<article class="post">
          <h2>${esc(p.title)}</h2>
          <div class="meta"><span>${esc(p.date)}</span><span>${esc(p.readTime)}</span>${p.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
          ${p.image ? `<img src="${p.image}" alt="" loading="lazy" />` : ''}
          <div class="body">${String(p.content).split(/\n\s*\n/).map(x => `<p>${esc(x)}</p>`).join('')}</div>
        </article>`).join('\n        ');
  const body = `
    ${pageHead(b.h, b.intro)}
    <div class="wrap">
      <div class="posts">
        ${posts}
      </div>
    </div>`;
  render({ page: 'blog', lang, title: TITLES[lang].blog, body });
}

/* ======================= CONTACT ======================= */
const ICONS = {
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor"/><path d="M7 10v7M7 7v.01M11 17v-7M11 13c0-2 1.2-3 2.7-3S16 11 16 13v4" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M13.5 20v-6.5h2.2l.3-2.5h-2.5V9.4c0-.7.2-1.2 1.2-1.2H16V6a17 17 0 0 0-2-.1c-2 0-3.3 1.2-3.3 3.4V11H8.5v2.5h2.2V20" fill="#fff"/></svg>'
};
for (const lang of LANGS) {
  const links = [`<li><a class="primary" href="mailto:${CONTACT.email}">${ICONS.email}<span>${CONTACT.email}</span></a></li>`,
    ...CONTACT.links.map(([k, href, label]) => `<li><a href="${href}" target="_blank" rel="noopener">${ICONS[k]}<span>${esc(label)}</span></a></li>`)].join('\n          ');
  const body = `
    ${pageHead(TITLES[lang].contacts, CONTACT.lead[lang])}
    <div class="wrap">
      <div class="contact-grid">
        <img src="${CONTACT.photo}" alt="Benjamin Hejda" width="800" height="800" />
        <ul class="contact-list">
          ${links}
        </ul>
      </div>
    </div>`;
  render({ page: 'contacts', lang, title: TITLES[lang].contacts, body });
}

/* ======================= FUN FACTS ======================= */
for (const lang of LANGS) {
  const f = FUN[lang], u = UI[lang];
  const body = `
    ${pageHead(TITLES[lang].fun, f.intro)}
    <div class="wrap">
      <div class="fact-cats" role="group">
        <button class="btn" type="button" data-cat="well">${esc(f.well)}</button>
        <button class="btn" type="button" data-cat="unknown">${esc(f.unknown)}</button>
        <button class="btn soon" type="button" disabled aria-disabled="true">${esc(f.me)} <small>${esc(u.comingSoon)}</small></button>
      </div>
      <div class="fact-card" id="factCard" aria-live="polite">
        <div class="fact-num" id="factNum" hidden></div>
        <p class="fact-text fact-start" id="factText">${esc(f.start)}</p>
        <div class="fact-footer" id="factFooter" hidden>
          <button id="nextButton" class="btn" type="button">${esc(f.next)}</button>
          <a id="factSource" class="text-link" href="#" target="_blank" rel="noopener">${esc(f.source)}</a>
        </div>
      </div>
      <div class="nsfw-switch">
        <label for="nsfwToggle"><input type="checkbox" id="nsfwToggle" role="switch"><span class="track" aria-hidden="true"></span><span>${esc(f.toggle)}</span></label>
      </div>
    </div>`;
  const scripts = `
  <script src="assets/facts.js"></script>
  <script>
  (function () {
    // The facts live in assets/facts.js. "About me" facts (cat "me") are paused for now.
    var LANG = Site.lang, NUM = ${json(f.num)};
    var toggle = document.getElementById('nsfwToggle'), card = document.getElementById('factCard');
    var category = null, deck = [], current = null, shown = 0;
    try { toggle.checked = localStorage.getItem('showNsfw') === '1'; } catch (e) {}
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function newDeck() {
      deck = shuffle(FACTS.filter(function (x) { return x.cat === category && (toggle.checked || !x.nsfw); }));
      if (current && deck.length > 1 && deck[deck.length - 1] === current) deck.unshift(deck.pop());
    }
    function next() { if (!deck.length) newDeck(); current = deck.pop(); show(); }
    function show() {
      var x = current, num = document.getElementById('factNum'), text = document.getElementById('factText');
      num.innerHTML = NUM + x.num + (x.nsfw ? '<span class="tag18">18+</span>' : '');
      num.hidden = false;
      text.textContent = x[LANG] || x.en; text.classList.remove('fact-start');
      var src = document.getElementById('factSource'); src.hidden = !x.src; if (x.src) src.href = x.src;
      document.getElementById('factFooter').hidden = false;
      card.className = 'fact-card c' + (shown++ % 5);
    }
    document.querySelectorAll('.fact-cats .btn[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.fact-cats .btn[data-cat]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        category = btn.dataset.cat; current = null; newDeck(); next();
      });
    });
    document.getElementById('nextButton').addEventListener('click', next);
    toggle.addEventListener('change', function () {
      try { localStorage.setItem('showNsfw', toggle.checked ? '1' : '0'); } catch (e) {}
      if (!category) return;
      newDeck();
      if (!toggle.checked && current && current.nsfw) next();
    });
  })();
  </script>`;
  render({ page: 'fun', lang, title: TITLES[lang].fun, body, scripts });
}

/* ======================= CHESS ======================= */
for (const lang of LANGS) {
  const c = CHESS[lang];
  const i18n = { ...c }; delete i18n.credit; delete i18n.intro; delete i18n.lead;
  const body = `
    ${pageHead(TITLES[lang].chess, c.intro)}
    <div class="wrap">
      <div class="chess-layout">
        <div>
          <div class="player"><span id="name-bot"></span><span id="clock-bot" class="clock">–:––</span></div>
          <div class="board-box">
            <div id="board" class="board" role="group" aria-label="Chess board"></div>
            <div id="result" class="result" hidden>
              <h2 id="resultTitle"></h2>
              <p id="resultReason"></p>
              <div class="row">
                <button id="rematch" class="btn" type="button">${esc(c.rematch)}</button>
                <button id="change" class="btn light" type="button">${esc(c.change)}</button>
              </div>
              <a id="profile" class="text-link" href="https://www.chess.com/member/dz9knath" target="_blank" rel="noopener">${esc(c.profile)}</a>
            </div>
          </div>
          <div class="player"><span id="name-you"></span><span id="clock-you" class="clock">–:––</span></div>
        </div>
        <div class="chess-side">
          <section id="setup" class="setup">
            <h2>${esc(c.time)}</h2>
            <div class="opts">
              <button type="button" data-tc="1">1 ${esc(c.min)}<small>${esc(c.ben)} <span id="rating-1">…</span></small></button>
              <button type="button" data-tc="3" class="active">3 ${esc(c.min)}<small>${esc(c.ben)} <span id="rating-3">…</span></small></button>
              <button type="button" data-tc="10">10 ${esc(c.min)}<small>${esc(c.ben)} <span id="rating-10">…</span></small></button>
            </div>
            <h2>${esc(c.color)}</h2>
            <div class="opts">
              <button type="button" data-color="w" class="active">${esc(c.white)}</button>
              <button type="button" data-color="b">${esc(c.black)}</button>
              <button type="button" data-color="r">${esc(c.random)}</button>
            </div>
            <button id="play" class="btn" type="button">${esc(c.play)}</button>
          </section>
          <section id="game" hidden>
            <p id="loadMsg" class="load-msg" hidden></p>
            <p id="status" class="status" aria-live="polite"></p>
            <div id="moves" class="moves"></div>
            <p style="margin-top:12px"><button id="resign" class="btn small light" type="button">${esc(c.resign)}</button></p>
          </section>
          <div class="score-card" id="score"></div>
          <p class="credit">${c.credit}</p>
        </div>
      </div>
    </div>`;
  const scripts = `
  <script>window.CHESS_I18N = ${json(i18n)};</script>
  <script type="module" src="assets/chess.js"></script>`;
  render({ page: 'chess', lang, title: TITLES[lang].chess, body, scripts });
}

console.log('Built', PAGES.length * LANGS.length, 'pages.');
