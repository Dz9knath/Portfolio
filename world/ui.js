/* ==========================================================
   Page logic for the train world: scrolling drives the train,
   the line map jumps between stops, and "getting off" opens a
   sheet with that stop's content. Text and station order come
   from window.WORLD, which build/build.mjs writes into the page.
   ========================================================== */
import { startWorld } from './world.js';

const W = window.WORLD, T = W.t, IDS = W.ids, N = IDS.length;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

/* ---------- the 3D world ---------- */
let world = null;
try {
  world = startWorld({
    canvas: $('world'), stationIds: IDS, photos: W.photos,
    lowPower: Math.min(window.innerWidth, window.innerHeight) < 600,
    onTag, onSecret
  });
  const names = IDS.map(id => T.stations[id][0]);
  world.setSignNames(names);
  if (document.fonts && document.fonts.load) document.fonts.load('700 48px Overpass').then(() => world.setSignNames(names)).catch(() => { });
} catch (e) {
  $('world').hidden = true; $('no3d').hidden = false; $('ticket').hidden = true;
}

/* ---------- scrolling = driving ---------- */
const spacer = $('spacer');
let seg = 1, current = -1, atStation = true;
function layout() {
  const keep = seg > 1 ? window.scrollY / seg : null;
  seg = Math.round(window.innerHeight * 1.15);
  spacer.style.height = (seg * (N - 1) + window.innerHeight) + 'px';
  if (keep != null) window.scrollTo(0, keep * seg);
}
function onScroll() {
  const f = Math.max(0, Math.min(N - 1, window.scrollY / seg));
  if (world) world.setProgress(f / (N - 1));
  const i = Math.round(f), near = Math.abs(f - i) < 0.22;
  $('ticket').classList.toggle('gone', window.scrollY > 30);
  if (i !== current) {
    current = i;
    document.querySelectorAll('#line li').forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.toggle('here', k === i); if (k === i) li.querySelector('button').setAttribute('aria-current', 'step'); else li.querySelector('button').removeAttribute('aria-current'); });
    const here = document.querySelector('#line li.here'); if (here && here.scrollIntoView) here.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    const [name, line] = T.stations[IDS[i]];
    $('cardName').textContent = name; $('cardLine').textContent = line;
    $('cardKicker').textContent = (i + 1) + ' / ' + N;
    $('cardNext').hidden = i >= N - 1;
  }
  if (near !== atStation) { atStation = near; $('stationCard').classList.toggle('away', !near); }
}
const goTo = (i, instant) => window.scrollTo({ top: Math.max(0, Math.min(N - 1, i)) * seg, behavior: instant ? 'auto' : 'smooth' });
window.addEventListener('resize', () => { layout(); onScroll(); });
window.addEventListener('scroll', onScroll, { passive: true });
document.querySelectorAll('#line button').forEach((b, i) => b.addEventListener('click', () => goTo(i)));
$('cardOpen').addEventListener('click', () => openPanel(IDS[current]));
$('cardNext').addEventListener('click', () => goTo(current + 1));
document.addEventListener('keydown', e => {
  if (sheet.open || e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') { goTo(current + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { goTo(current - 1); e.preventDefault(); }
  if (e.key === 'Enter' && document.activeElement === document.body) openPanel(IDS[current]);
});

/* ---------- sheets ---------- */
const sheet = $('sheet');
const WIDE = { chess: true, pier: true };
let openId = null;
const loaded = {};
function openPanel(id, opts) {
  const sec = sheet.querySelector('[data-panel="' + id + '"]'); if (!sec) return;
  sheet.querySelectorAll('[data-panel]').forEach(s => { s.hidden = s !== sec; });
  openId = id;
  $('sheetTitle').textContent = sec.dataset.title; $('sheetKicker').textContent = sec.dataset.kicker || '';
  sheet.classList.toggle('wide', !!WIDE[id]);
  const i = IDS.indexOf(id);
  $('sheetPrev').hidden = i <= 0; $('sheetNext').hidden = i < 0 || i >= N - 1;
  if (!sheet.open) { sheet.showModal(); if (world) world.pause(); }
  sheet.querySelector('.sheet-body').scrollTop = 0;
  history.replaceState(null, '', '#' + id);
  if (id === 'chess' && !loaded.chess) { loaded.chess = true; import('../assets/chess.js'); }
  if (id === 'facts' && !loaded.facts) { loaded.facts = true; const s = document.createElement('script'); s.src = 'assets/facts.js'; s.onload = initFacts; document.head.appendChild(s); }
  if (id === 'secrets') renderSecrets();
  if (opts && opts.photo != null) showPhoto(opts.photo);
}
sheet.addEventListener('close', () => { openId = null; closeViewer(); if (world) world.resume(); history.replaceState(null, '', location.pathname + location.search); });
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
$('sheetClose').addEventListener('click', () => sheet.close());
const hop = d => { const i = IDS.indexOf(openId) + d; sheet.close(); goTo(i); };
$('sheetPrev').addEventListener('click', () => hop(-1));
$('sheetNext').addEventListener('click', () => hop(1));
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openPanel(b.dataset.open); }));

function onTag(tag) {
  const [kind, v] = tag.split(':');
  if (kind === 'station') { const i = IDS.indexOf(v); if (i !== current) goTo(i); openPanel(v); }
  else if (kind === 'photo') openPanel('pier', { photo: +v });
  else if (kind === 'panel') openPanel(v);
}

/* ---------- secrets ---------- */
const SECRETS = ['horn', 'cow', 'try', 'plane', 'king', 'night', 'gold'];
let found = store.get('secrets', []).filter(s => SECRETS.includes(s));
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }
function secretCount() { $('secretCount').textContent = found.length + '/' + SECRETS.length; }
function onSecret(name) {
  if (found.includes(name)) return;
  found.push(name); store.set('secrets', found); secretCount();
  toast(found.length === SECRETS.length ? T.secrets.all : T.secrets.found + ': ' + T.secrets.names[name] + ' (' + found.length + '/' + SECRETS.length + ')');
}
function renderSecrets() {
  $('secretList').innerHTML = SECRETS.map(s => '<li class="' + (found.includes(s) ? 'got' : '') + '"><span>' + (found.includes(s) ? esc(T.secrets.names[s]) : '? ? ?') + '</span></li>').join('');
  $('secretAll').hidden = found.length < SECRETS.length;
}
secretCount();

/* ---------- sound ---------- */
let muted = store.get('muted', false);
function paintSound() { $('soundBtn').textContent = muted ? T.soundOff : T.soundOn; $('soundBtn').setAttribute('aria-pressed', String(!muted)); if (world) world.setMuted(muted); }
$('soundBtn').addEventListener('click', () => { muted = !muted; store.set('muted', muted); paintSound(); });
paintSound();

/* ---------- photo viewer ---------- */
const pins = [].slice.call(document.querySelectorAll('.pin'));
let at = 0;
function showPhoto(i) {
  at = (i + pins.length) % pins.length;
  const img = pins[at].querySelector('img');
  $('viewerImg').src = img.getAttribute('src'); $('viewerImg').alt = img.alt; $('viewerCap').textContent = img.alt;
  $('viewer').hidden = false;
}
function closeViewer() { $('viewer').hidden = true; }
pins.forEach((p, i) => p.addEventListener('click', () => showPhoto(i)));
$('viewerPrev').addEventListener('click', () => showPhoto(at - 1));
$('viewerNext').addEventListener('click', () => showPhoto(at + 1));
$('viewerClose').addEventListener('click', closeViewer);
$('viewer').addEventListener('click', e => { if (e.target === $('viewer')) closeViewer(); });
sheet.addEventListener('cancel', e => { if (!$('viewer').hidden) { e.preventDefault(); closeViewer(); } });
document.addEventListener('keydown', e => { if ($('viewer').hidden) return; if (e.key === 'ArrowLeft') showPhoto(at - 1); if (e.key === 'ArrowRight') showPhoto(at + 1); });
if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(x => x.target.classList.toggle('in-view', x.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
  pins.forEach(p => io.observe(p));
}

/* ---------- fun facts (data in assets/facts.js; "about me" facts are paused) ---------- */
function initFacts() {
  const FACTS = window.FACTS, LANG = document.documentElement.getAttribute('data-lang') || 'en', toggle = $('nsfwToggle');
  let category = null, deck = [], cur = null;
  toggle.checked = store.get('showNsfw', false) === true;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const newDeck = () => { deck = shuffle(FACTS.filter(x => x.cat === category && (toggle.checked || !x.nsfw))); if (cur && deck.length > 1 && deck[deck.length - 1] === cur) deck.unshift(deck.pop()); };
  const next = () => { if (!deck.length) newDeck(); cur = deck.pop(); show(); };
  function show() {
    $('factNum').innerHTML = esc(T.factNum) + cur.num + (cur.nsfw ? '<span class="tag18">18+</span>' : ''); $('factNum').hidden = false;
    $('factText').textContent = cur[LANG] || cur.en; $('factText').classList.remove('fact-start');
    $('factSource').hidden = !cur.src; if (cur.src) $('factSource').href = cur.src;
    $('factFooter').hidden = false;
  }
  document.querySelectorAll('.fact-cats .btn[data-cat]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.fact-cats .btn[data-cat]').forEach(b => b.classList.toggle('active', b === btn));
    category = btn.dataset.cat; cur = null; newDeck(); next();
  }));
  $('nextButton').addEventListener('click', next);
  toggle.addEventListener('change', () => { store.set('showNsfw', toggle.checked); if (!category) return; newDeck(); if (!toggle.checked && cur && cur.nsfw) next(); });
}

/* ---------- start ---------- */
layout();
const start = location.hash.slice(1);
if (start && sheet.querySelector('[data-panel="' + start + '"]')) {
  const i = IDS.indexOf(start === 'blog' ? 'rokycany' : start);
  if (i > 0) goTo(i, true);
  onScroll(); openPanel(start);
} else onScroll();
