// Calibration: how well does Maia (at a given Elo setting and temperature) predict Ben's real moves?
// Usage: node calibrate.mjs <onnxruntime-web+chess.js node_modules dir>   (dev tool, not used by the site)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(process.argv[2] + '/');
const ort = require('onnxruntime-web'); const { Chess } = require('chess.js');
const Core = createRequire(import.meta.url)('./maia/maia-core.js');
const IDX = JSON.parse(readFileSync(new URL('./maia/all_moves_maia3.json', import.meta.url)));
const games = JSON.parse(readFileSync(new URL('./ben-games.json', import.meta.url)));
ort.env.wasm.numThreads = 1;
const s = await ort.InferenceSession.create(readFileSync(new URL('./maia/maia3_simplified.onnx', import.meta.url)), { graphOptimizationLevel: 'basic' });
const ELOS = [600, 800, 1000, 1200, 1500], PER_TC = 140;
const out = {};
for (const tc of ['1', '3', '10']) {
  const samples = [];
  const gs = games[tc].filter((_, i) => i % Math.max(1, Math.floor(games[tc].length / 50)) === 0).slice(0, 50);
  for (const g of gs) {
    const sans = g.m.split(' '); const c = new Chess(); const white = g.c === 'w';
    for (let i = 0; i < sans.length; i++) {
      const mine = (i % 2 === 0) === white;
      if (mine && i >= 10 && samples.length < PER_TC && (i % 3 === 0)) {
        const fen = c.fen(); const legal = c.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
        const mv = c.moves({ verbose: true }).find(m => m.san.replace(/[+#]/g, '') === sans[i].replace(/[+#]/g, ''));
        if (mv) samples.push({ fen, legal, played: mv.from + mv.to + (mv.promotion || ''), g: g.r, ply: i, byElo: {} });
      }
      try { c.move(sans[i]); } catch { break; }
    }
  }
  for (const smp of samples) {
    const { tokens, legal } = Core.prepare(smp.fen, smp.legal, IDX);
    for (const e of ELOS) {
      const r = await s.run({ tokens: new ort.Tensor('float32', tokens, [1, 64, 12]), elo_self: new ort.Tensor('float32', Float32Array.from([e]), [1]), elo_oppo: new ort.Tensor('float32', Float32Array.from([e]), [1]) });
      smp.byElo[e] = legal.map(m => [m.uci, r.logits_move.data[m.index]]);
    }
  }
  out[tc] = samples; console.log(tc, 'min:', samples.length, 'positions done');
}
writeFileSync(process.argv[3] || 'calib-raw.json', JSON.stringify(out));
