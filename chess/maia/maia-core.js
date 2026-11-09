/*
 * Maia 3 helpers: turn a chess position into model input and the model's
 * output into move probabilities.
 *
 * Adapted from the Maia Platform frontend (github.com/CSSLab/maia-platform-frontend),
 * which is licensed under the GNU General Public License v3.0. This file,
 * maia3_simplified.onnx and all_moves_maia3.json are distributed under that
 * same licence: https://www.gnu.org/licenses/gpl-3.0.html
 *
 * Maia expects the side to move to be White, so positions with Black to move
 * are mirrored first and the chosen move is mirrored back.
 */
(function (root) {
  const PIECES = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];

  const mirrorSquare = sq => sq[0] + (9 - +sq[1]);
  const mirrorMove = uci => mirrorSquare(uci.slice(0, 2)) + mirrorSquare(uci.slice(2, 4)) + uci.slice(4);
  const swapCase = s => s.replace(/[a-zA-Z]/g, c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()));

  function mirrorFEN(fen) {
    const [pos, turn, castling, ep, half, full] = fen.split(' ');
    const mirrored = pos.split('/').reverse().map(swapCase).join('/');
    let c = '';
    if (castling !== '-') {
      if (castling.includes('k')) c += 'K';
      if (castling.includes('q')) c += 'Q';
      if (castling.includes('K')) c += 'k';
      if (castling.includes('Q')) c += 'q';
    }
    return [mirrored, turn === 'w' ? 'b' : 'w', c || '-', ep === '-' ? '-' : mirrorSquare(ep), half, full].join(' ');
  }

  // (64 squares x 12 piece types), square index = rank * 8 + file, rank 0 = White's back rank
  function boardTokens(fen) {
    const t = new Float32Array(64 * 12);
    const rows = fen.split(' ')[0].split('/');
    for (let r = 0; r < 8; r++) {
      const rank = 7 - r;
      let file = 0;
      for (const ch of rows[r]) {
        if (/\d/.test(ch)) { file += +ch; continue; }
        t[(rank * 8 + file) * 12 + PIECES.indexOf(ch)] = 1;
        file++;
      }
    }
    return t;
  }

  /*
   * prepare(fen, legalMovesUci) -> { tokens, legal: [{uci, index}], flipped }
   * legalMovesUci = legal moves in the ORIGINAL position, e.g. ['e2e4', 'e7e8q']
   */
  function prepare(fen, legalUci, moveIndex) {
    const flipped = fen.split(' ')[1] === 'b';
    const f = flipped ? mirrorFEN(fen) : fen;
    const legal = [];
    for (const uci of legalUci) {
      const key = flipped ? mirrorMove(uci) : uci;
      const index = moveIndex[key];
      if (index !== undefined) legal.push({ uci, index });
    }
    return { tokens: boardTokens(f), legal, flipped };
  }

  // logits over all 4352 moves -> probabilities over the legal ones, best first
  function policy(logits, legal) {
    const ls = legal.map(m => logits[m.index]);
    const max = Math.max(...ls);
    const ex = ls.map(l => Math.exp(l - max));
    const sum = ex.reduce((a, b) => a + b, 0);
    return legal.map((m, i) => ({ uci: m.uci, p: ex[i] / sum })).sort((a, b) => b.p - a.p);
  }

  // Pick a move the way a human of that rating might: sample from the policy,
  // ignoring very unlikely moves so the bot does not play nonsense.
  function sample(probs, rand = Math.random, floor = 0.02) {
    const pool = probs.filter(m => m.p >= floor);
    const list = pool.length ? pool : probs.slice(0, 1);
    const total = list.reduce((a, m) => a + m.p, 0);
    let r = rand() * total;
    for (const m of list) { r -= m.p; if (r <= 0) return m.uci; }
    return list[0].uci;
  }

  const api = { mirrorFEN, mirrorMove, boardTokens, prepare, policy, sample };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MaiaCore = api;
})(typeof self !== 'undefined' ? self : this);
