// Builds the site from the data in content/ (and assets/facts.js).
// Run from the repo root:  node build/build.mjs      (Node 18+, no dependencies)
//
// Pages it writes, in four languages (en has no suffix; -cz, -de, -pt):
//   home*.html   the train world (3D code in world/, styles in assets/world.css)
//   cv*.html     the plain "Skip to CV" page
//   growth, experience, gallery, blog, fun, chess, contacts*.html
//                short redirects, so old links land on the right stop
// Edit text in content/*.json, re-run this script and commit the HTML.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL('content/' + f, ROOT), 'utf8'));
const write = (f, s) => writeFileSync(new URL(f, ROOT), s);

const LANGS = ['en', 'cz', 'de', 'pt'];
const HTML_LANG = { en: 'en', cz: 'cs', de: 'de', pt: 'pt' };
const LANG_NAME = { en: 'English', cz: 'Čeština', de: 'Deutsch', pt: 'Português' };

const UI = read('ui.json'), TITLES = read('titles.json'), HOME = read('home.json'), LOG = read('changelog.json');
const GROWTH = read('growth.json'), EXP = read('experience.json'), BLOG = read('blog.json');
const GAL = read('gallery.json'), CONTACT = read('contact.json'), FUN = read('fun.json'), CHESS = read('chess.json');
const WORLD = read('world.json');

const file = (page, lang) => page + (lang === 'en' ? '' : '-' + lang) + '.html';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

const DESC = {
  en: 'Benjamin Hejda: finance and AI student, rugby coach and endurance athlete from the Czech Republic. A portfolio you travel through by train.',
  cz: 'Benjamin Hejda: student financí a AI, trenér ragby a vytrvalostní sportovec z Česka. Portfolio, kterým projedete vlakem.',
  de: 'Benjamin Hejda: Student für Finance und KI, Rugbytrainer und Ausdauersportler aus Tschechien. Ein Portfolio, das man mit dem Zug bereist.',
  pt: 'Benjamin Hejda: estudante de finanças e IA, treinador de rugby e atleta de resistência da Chéquia. Um portfólio que se percorre de comboio.'
};
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%2317357a'/%3E%3Crect x='5' y='5' width='54' height='54' rx='4' fill='none' stroke='%23fff' stroke-width='4'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-family='Arial,sans-serif' font-weight='bold' font-size='26' fill='%23fff'%3EBH%3C/text%3E%3C/svg%3E";

const FLAGS = {
  en: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#1f3a8a"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#d6263a" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6.4"/><path d="M15 0v20M0 10h30" stroke="#d6263a" stroke-width="3.6"/></svg>',
  cz: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0 0l15 10L0 20z" fill="#11457e"/></svg>',
  de: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.67" fill="#111"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/></svg>',
  pt: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="12" height="20" fill="#046a38"/><rect x="12" width="18" height="20" fill="#da291c"/><circle cx="12" cy="10" r="4.2" fill="#ffe900"/><circle cx="12" cy="10" r="2.2" fill="#fff" stroke="#da291c" stroke-width="0.8"/></svg>'
};
const langLinks = (page, lang) => `<nav class="langs" aria-label="${esc(UI[lang].language)}">` + LANGS.map(l =>
  `<a href="${file(page, l)}" hreflang="${HTML_LANG[l]}" lang="${HTML_LANG[l]}" title="${LANG_NAME[l]}" aria-label="${LANG_NAME[l]}"${l === lang ? ' aria-current="true"' : ''}>${FLAGS[l]}</a>`).join('') + '</nav>';

const head = (page, lang, title) => `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}" data-lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(DESC[lang])}" />
  <meta name="theme-color" content="#17357a" />
  <link rel="icon" href="${FAVICON}" />
  <link rel="preload" href="assets/fonts/overpass-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="assets/world.css" />
  ${LANGS.map(l => `<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${file(page, l)}" />`).join('\n  ')}
</head>`;

// "“Quote.” – Author"  ->  quote text with the author on a line of its own
const quoteHTML = q => { const i = q.lastIndexOf(' – '); return i < 0 ? esc(q) : `${esc(q.slice(0, i))}<cite>– ${esc(q.slice(i + 3))}</cite>`; };

const ICONS = {
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor"/><path d="M7 10v7M7 7v.01M11 17v-7M11 13c0-2 1.2-3 2.7-3S16 11 16 13v4" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M13.5 20v-6.5h2.2l.3-2.5h-2.5V9.4c0-.7.2-1.2 1.2-1.2H16V6a17 17 0 0 0-2-.1c-2 0-3.3 1.2-3.3 3.4V11H8.5v2.5h2.2V20" fill="#fff"/></svg>'
};
const contactList = () => `<ul class="contact-list">
            <li><a class="primary" href="mailto:${CONTACT.email}">${ICONS.email}<span>${CONTACT.email}</span></a></li>
            ${CONTACT.links.map(([k, href, label]) => `<li><a href="${href}" target="_blank" rel="noopener">${ICONS[k]}<span>${esc(label)}</span></a></li>`).join('\n            ')}
          </ul>`;

const growthRows = (lang, list) => `<ul class="rows">
            ${list.map(i => { const c = GROWTH.cards[i], [t, d] = c[lang]; return `<li><h3>${esc(t)}</h3><div class="tags">${c.tags.map(x => `<span class="tag t-${x}">${esc(GROWTH.ui[lang].tags[x])}</span>`).join('')}</div><p>${esc(d)}</p></li>`; }).join('\n            ')}
          </ul>`;
const VISIT = { en: 'Visit website', cz: 'Navštívit web', de: 'Website besuchen', pt: 'Visitar o site' };
const jobRows = (lang, withPhotos) => `<ul class="rows">
            ${EXP.jobs.map(j => { const [role, period, summary, full, skills, orgOverride] = j[lang]; const org = orgOverride || j.org;
    return `<li><div class="job-head"><h3>${esc(role)}</h3><span class="when">${esc(period)}</span></div><div class="job-org">${esc(org)}</div>${withPhotos && j.image ? `<img src="${j.image}" alt="${esc(role + ', ' + org)}" loading="lazy" />` : ''}<p>${esc(withPhotos ? full : summary)}</p><div class="tags">${(skills || []).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>${withPhotos && j.link ? `<p><a class="link" href="${j.link}" target="_blank" rel="noopener">${esc(VISIT[lang])} ↗</a></p>` : ''}</li>`; }).join('\n            ')}
          </ul>`;

/* ======================= HOME: the train world ======================= */
const OPEN_PHOTO = { en: 'Click to enlarge', cz: 'Kliknutím zvětšíte', de: 'Zum Vergrößern klicken', pt: 'Clica para ampliar' };
const PREV = { en: 'Previous photo', cz: 'Předchozí fotka', de: 'Vorheriges Foto', pt: 'Foto anterior' };
const NEXT = { en: 'Next photo', cz: 'Další fotka', de: 'Nächstes Foto', pt: 'Foto seguinte' };
// photos shown on the boards of the Photo Pier, in order (indexes into content/gallery.json)
const BOARD_PHOTOS = [0, 1, 2, 3, 4, 5, 6];

for (const lang of LANGS) {
  const w = WORLD[lang], u = UI[lang], h = HOME[lang], g = GROWTH.ui[lang], c = CHESS[lang], f = FUN[lang], b = BLOG[lang];
  const st = id => w.stations[id];
  const panel = (id, title, kicker, body) => `
        <section data-panel="${id}" data-title="${esc(title)}" data-kicker="${esc(kicker)}" hidden>
          ${body.trim()}
        </section>`;
  const stop = (id, body) => panel(id, st(id)[0], st(id)[1], body);
  const chessI18n = { ...c }; delete chessI18n.credit; delete chessI18n.intro; delete chessI18n.lead;

  const panels = [
    stop('rokycany', `<p class="intro">${esc(w.intros.rokycany)}</p>
          ${growthRows(lang, WORLD.cards.rokycany)}
          <p style="margin-top:22px"><button class="btn plain" type="button" data-open="blog">${esc(w.blogBtn)}</button></p>`),
    stop('pilsen', `<p class="intro">${esc(w.intros.pilsen)}</p>
          <blockquote class="quote">${quoteHTML(g.quotes.Sport)}</blockquote>
          ${growthRows(lang, WORLD.cards.pilsen)}`),
    stop('ohio', `<p class="intro">${esc(w.intros.ohio)}</p>
          ${growthRows(lang, WORLD.cards.ohio)}`),
    stop('aveiro', `<p class="intro">${esc(w.intros.aveiro)}</p>
          <blockquote class="quote">${quoteHTML(g.quotes.Exchange)}</blockquote>
          ${growthRows(lang, WORLD.cards.aveiro)}`),
    stop('pier', `<p class="intro">${esc(w.intros.pier)}</p>
          <div class="wall">
            ${GAL.photos.map((src, i) => `<button class="pin" type="button"><img src="${src}" alt="${esc(GAL.captions[lang][i])}" loading="lazy" /><span class="cap">${esc(GAL.captions[lang][i])}<small>${esc(OPEN_PHOTO[lang])}</small></span></button>`).join('\n            ')}
          </div>`),
    stop('yard', `<p class="intro">${esc(w.intros.yard)}</p>
          ${jobRows(lang, true)}`),
    stop('chess', `<p class="intro">${esc(c.intro)}</p>
          <div class="chess-layout">
            <div>
              <div class="player"><span id="name-bot"></span><span id="clock-bot" class="clock">–:––</span></div>
              <div class="board-box">
                <div id="board" class="board" role="group" aria-label="${esc(st('chess')[0])}"></div>
                <div id="result" class="result" hidden>
                  <h3 id="resultTitle"></h3>
                  <p id="resultReason"></p>
                  <div class="row"><button id="rematch" class="btn" type="button">${esc(c.rematch)}</button><button id="change" class="btn plain" type="button">${esc(c.change)}</button></div>
                  <a id="profile" class="link" href="https://www.chess.com/member/dz9knath" target="_blank" rel="noopener">${esc(c.profile)}</a>
                </div>
              </div>
              <div class="player"><span id="name-you"></span><span id="clock-you" class="clock">–:––</span></div>
            </div>
            <div class="chess-side">
              <div id="setup" class="setup">
                <h3>${esc(c.time)}</h3>
                <div class="opts">
                  <button type="button" data-tc="1">1 ${esc(c.min)}<small>${esc(c.ben)} <span id="rating-1">…</span></small></button>
                  <button type="button" data-tc="3" class="active">3 ${esc(c.min)}<small>${esc(c.ben)} <span id="rating-3">…</span></small></button>
                  <button type="button" data-tc="10">10 ${esc(c.min)}<small>${esc(c.ben)} <span id="rating-10">…</span></small></button>
                </div>
                <h3>${esc(c.color)}</h3>
                <div class="opts">
                  <button type="button" data-color="w" class="active">${esc(c.white)}</button>
                  <button type="button" data-color="b">${esc(c.black)}</button>
                  <button type="button" data-color="r">${esc(c.random)}</button>
                </div>
                <button id="play" class="btn" type="button">${esc(c.play)}</button>
              </div>
              <div id="game" hidden>
                <p id="loadMsg" class="load-msg" hidden></p>
                <p id="status" class="status" aria-live="polite"></p>
                <div id="moves" class="moves"></div>
                <p style="margin-top:10px"><button id="resign" class="btn small plain" type="button">${esc(c.resign)}</button></p>
              </div>
              <div class="score-card" id="score"></div>
              <p class="credit">${c.credit}</p>
            </div>
          </div>`),
    stop('facts', `<p class="intro">${esc(f.intro)}</p>
          <div class="fact-cats" role="group">
            <button class="btn" type="button" data-cat="well">${esc(f.well)}</button>
            <button class="btn" type="button" data-cat="unknown">${esc(f.unknown)}</button>
            <button class="btn soon" type="button" disabled>${esc(f.me)} <small>${esc(u.comingSoon)}</small></button>
          </div>
          <div class="fact-card" aria-live="polite">
            <div class="fact-num" id="factNum" hidden></div>
            <p class="fact-text fact-start" id="factText">${esc(f.start)}</p>
            <div class="fact-footer" id="factFooter" hidden>
              <button id="nextButton" class="btn" type="button">${esc(f.next)}</button>
              <a id="factSource" class="link" href="#" target="_blank" rel="noopener">${esc(f.source)}</a>
            </div>
          </div>
          <div class="nsfw-switch"><label for="nsfwToggle"><input type="checkbox" id="nsfwToggle" role="switch"><span class="track" aria-hidden="true"></span><span>${esc(f.toggle)}</span></label></div>`),
    stop('delhi', `<p class="intro">${esc(h.nowText)}</p>
          <p>${esc(h.intro)}</p>
          <blockquote class="quote">${quoteHTML(g.defaultQuote)}</blockquote>
          ${growthRows(lang, WORLD.cards.delhi)}
          <p style="margin-top:22px"><a class="btn" href="${file('cv', lang)}">${esc(w.cv.title)}</a></p>`),
    stop('dubai', `<p class="intro">${esc(w.intros.dubai)}</p>
          ${contactList()}
          <details class="news"><summary>${esc(u.news)}</summary><ol>${LOG[lang].map(([date, ver, text]) => `<li><span class="ver">${esc(ver)}<small>${esc(date)}</small></span><span>${esc(text)}</span></li>`).join('')}</ol></details>
          <p class="credit" style="margin-top:18px">© 2026 Benjamin Hejda. ${esc(u.footer)}</p>`),
    panel('blog', b.h, '', `<p class="intro">${esc(b.intro)}</p>
          ${b.posts.map(p => `<article class="post"><h3>${esc(p.title)}</h3><div class="meta"><span>${esc(p.date)}</span><span>${esc(p.readTime)}</span>${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div><div class="body">${String(p.content).split(/\n\s*\n/).map(x => `<p>${esc(x)}</p>`).join('')}</div></article>`).join('\n')}`),
    panel('secrets', w.secrets.label, '', `<p class="intro">${esc(w.secrets.hint)}</p>
          <ul class="secret-list" id="secretList"></ul>
          <p id="secretAll" class="intro" style="margin-top:22px" hidden>${esc(w.secrets.all)} <a class="link" href="mailto:${CONTACT.email}">${CONTACT.email}</a></p>`)
  ].join('\n');

  const data = {
    ids: WORLD.order,
    photos: BOARD_PHOTOS.map(i => GAL.photos[i]),
    t: { stations: w.stations, secrets: w.secrets, soundOn: w.soundOn, soundOff: w.soundOff, factNum: f.num }
  };

  write(file('home', lang), `${head('home', lang, 'Benjamin Hejda')}
<body>
  <!-- Generated by build/build.mjs from content/*.json – edit those, not this file. -->
  <canvas id="world" aria-hidden="true"></canvas>
  <div id="no3d" class="no3d" hidden>${esc(w.nowebgl)}</div>

  <header class="hud-top">
    <a class="plate" href="${file('home', lang)}"><strong>Ben Hejda</strong><span>${esc(w.tagline)}</span></a>
    <div class="hud-actions">
      ${langLinks('home', lang)}
      <button id="soundBtn" class="chip-btn" type="button"></button>
      <button class="chip-btn" type="button" data-open="secrets">${esc(w.secrets.label)} <span id="secretCount">0/7</span></button>
      <a class="chip-btn dark" href="${file('cv', lang)}">${esc(w.skipCv)}</a>
      <button class="chip-btn yellow" type="button" data-open="dubai">${esc(w.contact)}</button>
    </div>
  </header>

  <div id="ticket" class="ticket"><span>Rokycany → Dubai</span><span>${esc(w.scroll)} <span class="arrow" aria-hidden="true">↓</span></span></div>

  <aside id="stationCard" class="station-card" aria-live="polite">
    <div class="sign"><small id="cardKicker"></small><h2 id="cardName"></h2></div>
    <div class="body">
      <p id="cardLine"></p>
      <div class="row"><button id="cardOpen" class="btn yellow" type="button">${esc(w.getOff)}</button><button id="cardNext" class="btn plain" type="button">${esc(w.next)} →</button></div>
    </div>
  </aside>

  <nav id="line" class="line" aria-label="${esc(w.line)}">
    <ol>${WORLD.order.map(id => `<li><button type="button"><i></i>${esc(st(id)[0])}</button></li>`).join('')}</ol>
  </nav>

  <div id="toast" class="toast" role="status"></div>
  <div id="spacer" class="spacer"></div>

  <dialog id="sheet" class="sheet">
    <div class="sheet-head">
      <div class="sign"><small id="sheetKicker"></small><h2 id="sheetTitle"></h2></div>
      <button id="sheetClose" class="sheet-close" type="button">✕ <span>${esc(w.close)}</span></button>
    </div>
    <div class="sheet-body">${panels}
    </div>
    <div class="sheet-foot">
      <button id="sheetPrev" class="btn small plain" type="button">← ${esc(w.prev)}</button>
      <span></span>
      <button id="sheetNext" class="btn small" type="button">${esc(w.next)} →</button>
    </div>
    <div id="viewer" class="viewer" hidden>
      <button id="viewerPrev" type="button" aria-label="${esc(PREV[lang])}">←</button>
      <figure><img id="viewerImg" alt="" /><figcaption id="viewerCap"></figcaption></figure>
      <button id="viewerNext" type="button" aria-label="${esc(NEXT[lang])}">→</button>
      <button id="viewerClose" class="x" type="button" aria-label="${esc(u.close)}">✕</button>
    </div>
  </dialog>

  <noscript><p style="position:fixed;inset:auto 0 0 0;background:#fff;padding:16px;z-index:99"><a href="${file('cv', lang)}">${esc(w.skipCv)}</a></p></noscript>
  <script>window.WORLD = ${json(data)}; window.CHESS_I18N = ${json(chessI18n)};</script>
  <script type="module" src="world/ui.js"></script>
</body>
</html>
`);

  /* ======================= CV ======================= */
  const cv = w.cv;
  write(file('cv', lang), `${head('cv', lang, cv.title + ' | Benjamin Hejda')}
<body class="cv">
  <!-- Generated by build/build.mjs from content/*.json – edit those, not this file. -->
  <main class="cv-page">
    <div class="cv-top">
      <a class="btn small plain" href="${file('home', lang)}">← ${esc(cv.back)}</a>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${langLinks('cv', lang)}<button class="btn small" type="button" onclick="window.print()">${esc(cv.print)}</button></div>
    </div>
    <header class="cv-head">
      <div><h1>Benjamin Hejda</h1><p>${esc(u.role)}</p>
        <div class="cv-contact"><a href="mailto:${CONTACT.email}">${CONTACT.email}</a><a href="${CONTACT.links[0][1]}">${esc(CONTACT.links[0][2])}</a><a href="https://dz9knath.github.io/Portfolio/">dz9knath.github.io/Portfolio</a></div>
      </div>
      <img src="assets/photos/t1spQG4.jpg" alt="${esc(u.photoAlt)}" />
    </header>
    <h2>${esc(cv.education)}</h2>
    <ul class="rows">${cv.edu.map(([name, when, text]) => `<li><div class="job-head"><h3>${esc(name)}</h3><span class="when">${esc(when)}</span></div><p>${esc(text)}</p></li>`).join('')}</ul>
    <h2>${esc(cv.experience)}</h2>
    ${jobRows(lang, false)}
    <h2>${esc(cv.highlights)}</h2>
    ${growthRows(lang, [5, 9, 2, 3, 4, 13, 17])}
    <h2>${esc(cv.languages)}</h2>
    <p style="margin-top:8px">${esc(cv.langs)}</p>
  </main>
</body>
</html>
`);

  /* ======================= old addresses -> the right stop ======================= */
  const OLD = { growth: '', experience: '#yard', gallery: '#pier', blog: '#blog', fun: '#facts', chess: '#chess', contacts: '#dubai' };
  for (const [page, hash] of Object.entries(OLD)) {
    const to = file('home', lang) + hash;
    write(file(page, lang), `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}">
<head>
  <meta charset="UTF-8" />
  <title>Benjamin Hejda</title>
  <meta http-equiv="refresh" content="0; url=${to}" />
  <link rel="canonical" href="${file('home', lang)}" />
  <script>location.replace(${JSON.stringify(to)});</script>
</head>
<body><p><a href="${to}">Benjamin Hejda</a></p></body>
</html>
`);
  }
}

console.log('Built', LANGS.length * 9, 'pages.');
