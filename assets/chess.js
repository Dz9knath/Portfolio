/* ==========================================================
   "Beat Ben" chess bot – page logic.
   Opening book, thinking speed and rating come from chess/ben.json (built monthly from
   Ben's chess.com games). Moves outside the book come from Maia 3 (chess/maia/), tuned with
   chess/bot-settings.json. Strings come from window.CHESS_I18N (set by each language page).
   ========================================================== */
import { Chess } from '../chess/lib/chess.js';

const T = window.CHESS_I18N;
const $ = id => document.getElementById(id);
const PROFILE = 'https://www.chess.com/member/dz9knath';
const SCORE_API = 'https://abacus.jasoncameron.dev';
const SCORE_NS = 'benhejda-portfolio-chess';
const GLYPH = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const FILES = 'abcdefgh';

let BEN = null, SETTINGS = null;
let worker = null, workerReady = false, workerWaiters = [], thinkId = 0, thinkResolvers = {};
let tc = '3', pickedColor = 'w', userColor = 'w';
let game, clocks, turnStart, timer, over, selected, targets, lastMove, botBusy, started;
let lastTickAt = 0;

/* ---------- data ---------- */
async function loadData() {
  try {
    [BEN, SETTINGS] = await Promise.all([
      fetch('chess/ben.json').then(r => r.json()),
      fetch('chess/bot-settings.json').then(r => r.json())
    ]);
  } catch (e) { BEN = null; }
  for (const m of ['1', '3', '10']) {
    const el = $('rating-' + m);
    if (el && BEN && BEN.timeControls[m]) el.textContent = BEN.timeControls[m].rating;
  }
}

/* ---------- Maia worker ---------- */
function startWorker() {
  if (worker) return workerReadyPromise;
  worker = new Worker('chess/maia/maia-worker.js', { type: 'module' });
  workerReadyPromise = new Promise((resolve, reject) => {
    worker.onmessage = ev => {
      const d = ev.data;
      if (d.type === 'progress') $('loadMsg').textContent = T.loading + ' ' + d.pct + '%';
      else if (d.type === 'ready') { workerReady = true; resolve(); }
      else if (d.type === 'move') { const r = thinkResolvers[d.id]; if (r) { delete thinkResolvers[d.id]; r(d.probs); } }
      else if (d.type === 'error') { reject(new Error(d.message)); Object.values(thinkResolvers).forEach(r => r(null)); thinkResolvers = {}; }
    };
    worker.onerror = e => reject(new Error(e.message || 'worker'));
  });
  worker.postMessage({ type: 'init' });
  return workerReadyPromise;
}
let workerReadyPromise = null;

function maiaMove(cfg) {
  return new Promise(resolve => {
    const id = ++thinkId;
    thinkResolvers[id] = resolve;
    const legal = game.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
    worker.postMessage({ type: 'think', id, fen: game.fen(), legal, elo: cfg.elo, temp: cfg.temp });
  });
}

function sampleMove(probs, floor) {
  const pool = probs.filter(m => m.p >= floor);
  const list = pool.length ? pool : probs.slice(0, 1);
  const total = list.reduce((a, m) => a + m.p, 0);
  let r = Math.random() * total;
  for (const m of list) { r -= m.p; if (r <= 0) return m.uci; }
  return list[0].uci;
}

/* ---------- bot ---------- */
function bookMove() {
  if (!BEN) return null;
  const book = BEN.timeControls[tc].book[userColor === 'w' ? 'black' : 'white'];
  const entry = book[game.history().join(' ')];
  if (!entry) return null;
  const legal = new Set(game.moves());
  const opts = Object.entries(entry).filter(([san]) => legal.has(san));
  if (!opts.length) return null;
  let r = Math.random() * opts.reduce((a, [, n]) => a + n, 0);
  for (const [san, n] of opts) { r -= n; if (r <= 0) return san; }
  return opts[0][0];
}

function thinkDelay(isBook) {
  const botColor = userColor === 'w' ? 'b' : 'w';
  const remaining = clocks[botColor] / 1000;
  const ply = game.history().length;
  const phase = ply < 20 ? 'opening' : ply < 60 ? 'middle' : 'late';
  const share = (BEN && BEN.timeControls[tc].think[phase]) || 0.02;
  const jitter = Math.exp((Math.random() + Math.random() + Math.random() - 1.5) * 1.1);
  let s = share * remaining * jitter * (isBook ? 0.6 : 1);
  s = Math.max(0.25, Math.min(s, remaining * 0.25));
  return s * 1000;
}

async function botTurn() {
  if (over || botBusy) return;
  botBusy = true;
  const t0 = performance.now();
  setStatus(T.botThinking);
  let san = bookMove(), uci = null, isBook = !!san;
  if (!san) {
    const cfg = (SETTINGS && SETTINGS[tc]) || { elo: 800, temp: 1.25, floor: 0.004 };
    const probs = await maiaMove(cfg);
    if (over) { botBusy = false; return; }
    if (probs) uci = sampleMove(probs, cfg.floor);
    else { // network trouble: fall back to any legal move so the game never hangs
      const all = game.moves({ verbose: true }); const m = all[Math.floor(Math.random() * all.length)];
      uci = m.from + m.to + (m.promotion || '');
    }
  }
  const wait = game.history().length < 2 ? 500 : thinkDelay(isBook);
  const left = wait - (performance.now() - t0);
  if (left > 0) await new Promise(r => setTimeout(r, left));
  botBusy = false;
  if (over) return;
  try {
    const mv = san ? game.move(san) : game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    afterMove(mv, 'bot');
  } catch (e) { /* should never happen; ignore */ }
}

/* ---------- clock ---------- */
function fmt(ms) {
  ms = Math.max(0, ms);
  if (ms < 20000) return Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' + Math.floor((ms % 1000) / 100);
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function renderClocks() {
  const bot = userColor === 'w' ? 'b' : 'w';
  $('clock-bot').textContent = fmt(clocks[bot]);
  $('clock-you').textContent = fmt(clocks[userColor]);
  const turn = game.turn();
  $('clock-bot').classList.toggle('on', !over && turn === bot);
  $('clock-you').classList.toggle('on', !over && turn === userColor);
  $('clock-bot').classList.toggle('low', clocks[bot] < 10000);
  $('clock-you').classList.toggle('low', clocks[userColor] < 10000);
}

function tick() {
  if (over) return;
  const now = performance.now(), dt = now - lastTickAt; lastTickAt = now;
  // The first move of each side is untimed (like an abort window), clocks start from ply 2.
  if (game.history().length >= 2) {
    const c = game.turn();
    clocks[c] -= dt;
    if (clocks[c] <= 0) { clocks[c] = 0; renderClocks(); return finish(c === userColor ? 'bot' : 'you', 'timeout'); }
  }
  renderClocks();
}

/* ---------- board ---------- */
const PIECE_NAMES = T.pieces;

function buildBoard() {
  const b = $('board'); b.innerHTML = '';
  const flip = userColor === 'b';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const file = flip ? 7 - f : f, rank = flip ? r : 7 - r;
    const sq = FILES[file] + (rank + 1);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'sq ' + ((file + rank) % 2 ? 'light' : 'dark'); el.dataset.sq = sq;
    if (f === 0) el.dataset.rank = rank + 1;
    if (r === 7) el.dataset.file = FILES[file];
    b.appendChild(el);
  }
}

function renderBoard() {
  const inCheck = game.inCheck() ? game.turn() : null;
  for (const el of $('board').children) {
    const sq = el.dataset.sq, p = game.get(sq);
    el.className = el.className.replace(/ ?(sel|target|last|check|capture)/g, '');
    el.innerHTML = '';
    if (p) {
      const s = document.createElement('span');
      s.className = 'pc ' + p.color; s.textContent = GLYPH[p.type] + '︎';
      el.appendChild(s);
    }
    el.setAttribute('aria-label', sq + (p ? ', ' + (p.color === 'w' ? T.white : T.black) + ' ' + PIECE_NAMES[p.type] : ''));
    if (selected === sq) el.classList.add('sel');
    if (targets && targets[sq]) el.classList.add('target', ...(p ? ['capture'] : []));
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) el.classList.add('last');
    if (inCheck && p && p.type === 'k' && p.color === inCheck) el.classList.add('check');
  }
}

function onSquare(sq) {
  if (over || !started || botBusy || game.turn() !== userColor) return;
  const p = game.get(sq);
  if (selected && targets && targets[sq]) {
    const mv = game.move({ from: selected, to: sq, promotion: 'q' }); // pawns always promote to a queen
    selected = null; targets = null;
    afterMove(mv, 'you');
    return;
  }
  if (p && p.color === userColor) {
    selected = sq; targets = {};
    for (const m of game.moves({ square: sq, verbose: true })) targets[m.to] = true;
  } else { selected = null; targets = null; }
  renderBoard();
}

function afterMove(mv, who) {
  lastMove = mv; selected = null; targets = null;
  renderBoard(); renderClocks(); renderMoves();
  if (game.isCheckmate()) return finish(who, 'checkmate');
  if (game.isStalemate()) return finish('draw', 'stalemate');
  if (game.isThreefoldRepetition()) return finish('draw', 'repetition');
  if (game.isInsufficientMaterial()) return finish('draw', 'insufficient');
  if (game.isDraw()) return finish('draw', 'fifty');
  if (who === 'you') { setStatus(T.botThinking); botTurn(); }
  else setStatus(game.inCheck() ? T.check : T.yourTurn);
}

function renderMoves() {
  const h = game.history(); let out = '';
  for (let i = 0; i < h.length; i += 2) out += (i / 2 + 1) + '. ' + h[i] + (h[i + 1] ? ' ' + h[i + 1] : '') + '  ';
  $('moves').textContent = out;
  $('moves').scrollLeft = $('moves').scrollWidth;
}

function setStatus(s) { $('status').textContent = s; }

/* ---------- score ---------- */
const KEYS = { you: 'visitors', bot: 'ben', draw: 'draws' };
let score = { visitors: 0, ben: 0, draws: 0 }, scoreRemote = false;

function localScore() { try { return JSON.parse(localStorage.getItem('chessScore')) || null; } catch (e) { return null; } }
function saveLocal() { try { localStorage.setItem('chessScore', JSON.stringify(score)); } catch (e) { } }

async function api(path) {
  const r = await fetch(SCORE_API + path); if (r.status === 404) return { value: 0 };
  if (!r.ok) throw new Error(r.status); return r.json();
}

async function loadScore() {
  try {
    const [v, b, d] = await Promise.all(['visitors', 'ben', 'draws'].map(k => api('/get/' + SCORE_NS + '/' + k)));
    score = { visitors: v.value | 0, ben: b.value | 0, draws: d.value | 0 }; scoreRemote = true;
  } catch (e) { score = localScore() || score; scoreRemote = false; }
  renderScore();
}

async function recordResult(who) {
  const key = KEYS[who]; score[key]++;
  if (scoreRemote) {
    try { const r = await api('/hit/' + SCORE_NS + '/' + key); if (typeof r.value === 'number') score[key] = r.value; }
    catch (e) { scoreRemote = false; }
  }
  if (!scoreRemote) saveLocal();
  renderScore();
}

function renderScore() {
  $('score').innerHTML = '<strong>' + T.scoreTitle + '</strong> ' + score.visitors + ' – ' + score.ben +
    (score.draws ? ' <span class="muted">(' + score.draws + ' ' + T.draws + ')</span>' : '') +
    (scoreRemote ? '' : ' <span class="muted">(' + T.scoreLocal + ')</span>');
}

/* ---------- game flow ---------- */
function finish(who, reason) {
  if (over) return;
  over = true; clearInterval(timer); renderClocks();
  recordResult(who);
  $('resultTitle').textContent = who === 'you' ? T.youWon : who === 'bot' ? T.benWon : T.drawn;
  $('resultReason').textContent = T.reasons[reason] || '';
  $('result').hidden = false;
  setStatus(who === 'you' ? T.youWon : who === 'bot' ? T.benWon : T.drawn);
  $('resign').hidden = true;
  $('rematch').focus({ preventScroll: true });
}

async function play() {
  userColor = pickedColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : pickedColor;
  $('setup').hidden = true; $('game').hidden = false; $('result').hidden = true;
  $('loadMsg').hidden = false; $('loadMsg').textContent = T.loading + ' 0%';
  game = new Chess(); over = false; started = false; botBusy = false; selected = targets = lastMove = null;
  const mins = +tc; clocks = { w: mins * 60000, b: mins * 60000 };
  buildBoard(); renderBoard(); renderClocks(); renderMoves();
  $('name-bot').textContent = T.ben + ' (' + T.bot + ' · ' + ((BEN && BEN.timeControls[tc].rating) || '') + ')';
  $('name-you').textContent = T.you;
  $('resign').hidden = false;
  setStatus('');
  try { await startWorker(); } catch (e) {
    $('loadMsg').textContent = T.loadError; workerReadyPromise = null; worker = null; return;
  }
  $('loadMsg').hidden = true;
  started = true; lastTickAt = performance.now();
  timer = setInterval(tick, 100);
  if (userColor === 'b') { setStatus(T.botThinking); botTurn(); } else setStatus(T.yourTurn);
}

function toSetup() {
  clearInterval(timer); over = true;
  $('game').hidden = true; $('setup').hidden = false; $('result').hidden = true;
}

function init() {
  $('profile').href = PROFILE;
  for (const b of document.querySelectorAll('[data-tc]')) b.addEventListener('click', () => {
    tc = b.dataset.tc; document.querySelectorAll('[data-tc]').forEach(x => x.classList.toggle('active', x === b));
  });
  for (const b of document.querySelectorAll('[data-color]')) b.addEventListener('click', () => {
    pickedColor = b.dataset.color; document.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('active', x === b));
  });
  $('play').addEventListener('click', play);
  $('resign').addEventListener('click', () => finish('bot', 'resign'));
  $('rematch').addEventListener('click', () => { if (pickedColor === 'r') { /* new random colour */ } play(); });
  $('change').addEventListener('click', toSetup);
  $('board').addEventListener('click', e => { const b = e.target.closest('.sq'); if (b) onSquare(b.dataset.sq); });
  loadData(); loadScore();
}

init();
