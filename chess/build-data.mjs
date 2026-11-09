// Builds chess/ben.json from Ben's public chess.com games.
// Runs monthly in GitHub Actions (.github/workflows/chess-data.yml). No dependencies (Node 20+).
import { writeFileSync } from 'node:fs';

const USER = 'dz9knath';
const UA = { 'User-Agent': 'benhejda-portfolio-chess-bot (github.com/Dz9knath/Portfolio)' };
const CLASSES = { bullet: '1', blitz: '3', rapid: '10' }; // chess.com time class -> minutes on the site
const BOOK_PLIES = 24;   // how deep the opening book goes (12 moves each)
const MIN_COUNT = 2;     // a position needs at least this many of Ben's games to count

async function getJSON(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.json();
    if (r.status === 429) { await new Promise(s => setTimeout(s, 3000 * (attempt + 1))); continue; }
    throw new Error(url + ' -> ' + r.status);
  }
  throw new Error('rate limited: ' + url);
}

// "1. e4 {[%clk 0:00:59.9]} 1... e5 {[%clk 0:00:59.5]} ..." -> [{san, clk}]
function parseMoves(pgn) {
  const body = pgn.split(/\r?\n\r?\n/).slice(1).join(' ');
  const out = [];
  const re = /(\d+\.(?:\.\.)?)\s*([^\s{]+)(?:\s*\{\[%clk (\d+):(\d+):([\d.]+)\]\})?/g;
  let m;
  while ((m = re.exec(body))) {
    const san = m[2];
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(san)) break;
    const clk = m[3] !== undefined ? (+m[3]) * 3600 + (+m[4]) * 60 + parseFloat(m[5]) : null;
    out.push({ san: san.replace(/[?!]+$/, ''), clk });
  }
  return out;
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const { archives } = await getJSON(`https://api.chess.com/pub/player/${USER}/games/archives`);
const games = [];
for (const url of archives) {
  const { games: g } = await getJSON(url);
  games.push(...g);
}
games.sort((a, b) => a.end_time - b.end_time);

const data = { user: USER, updated: new Date().toISOString().slice(0, 10), totalGames: games.length, timeControls: {} };

for (const [cls, minutes] of Object.entries(CLASSES)) {
  const gs = games.filter(g => g.time_class === cls && g.rules === 'chess' && g.pgn);
  const tc = { minutes: +minutes, games: gs.length, rating: null, record: { win: 0, loss: 0, draw: 0 }, book: { white: {}, black: {} }, think: {}, firstMoves: { white: {}, blackVsE4: {}, blackVsD4: {} } };
  const thinkByPhase = { opening: [], middle: [], late: [] };

  for (const g of gs) {
    const white = g.white.username.toLowerCase() === USER;
    const me = white ? g.white : g.black;
    tc.rating = me.rating; // games are sorted, so the last one wins
    const res = me.result;
    if (res === 'win') tc.record.win++;
    else if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(res)) tc.record.draw++;
    else tc.record.loss++;

    const moves = parseMoves(g.pgn);
    const color = white ? 'white' : 'black';
    const inc = +(String(g.time_control).split('+')[1] || 0);
    for (let i = 0; i < moves.length; i++) {
      const mine = (i % 2 === 0) === white;
      if (!mine) continue;
      if (i < BOOK_PLIES) {
        const key = moves.slice(0, i).map(m => m.san).join(' ');
        const book = tc.book[color];
        (book[key] ||= {})[moves[i].san] = (book[key][moves[i].san] || 0) + 1;
      }
      // seconds Ben spent on this move, as a share of the clock he had left
      const prev = i >= 2 ? moves[i - 2].clk : (+String(g.time_control).split('+')[0]);
      if (moves[i].clk != null && prev != null && prev > 0) {
        const spent = prev - moves[i].clk + inc;
        if (spent >= 0) {
          const phase = i < 20 ? 'opening' : i < 60 ? 'middle' : 'late';
          thinkByPhase[phase].push(spent / prev);
        }
      }
    }
    if (white && moves[0]) tc.firstMoves.white[moves[0].san] = (tc.firstMoves.white[moves[0].san] || 0) + 1;
    if (!white && moves[1] && moves[0].san === 'e4') tc.firstMoves.blackVsE4[moves[1].san] = (tc.firstMoves.blackVsE4[moves[1].san] || 0) + 1;
    if (!white && moves[1] && moves[0].san === 'd4') tc.firstMoves.blackVsD4[moves[1].san] = (tc.firstMoves.blackVsD4[moves[1].san] || 0) + 1;
  }

  // drop rare positions so the book only holds real habits
  for (const color of ['white', 'black']) {
    const book = tc.book[color];
    for (const key of Object.keys(book)) {
      const total = Object.values(book[key]).reduce((a, b) => a + b, 0);
      if (total < MIN_COUNT) delete book[key];
    }
  }
  for (const p of Object.keys(thinkByPhase)) tc.think[p] = median(thinkByPhase[p]);
  data.timeControls[minutes] = tc;
}

writeFileSync(new URL('./ben.json', import.meta.url), JSON.stringify(data));
for (const [m, tc] of Object.entries(data.timeControls)) {
  console.log(`${m} min: ${tc.games} games, rating ${tc.rating}, book positions W ${Object.keys(tc.book.white).length} / B ${Object.keys(tc.book.black).length}`);
}
