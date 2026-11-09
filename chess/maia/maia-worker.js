/*
 * Runs the Maia 3 neural network off the main thread so the board and clocks stay smooth.
 * Based on the Maia Platform frontend (GPL-3.0), see maia-core.js.
 */
import * as ort from '../lib/ort.wasm.min.mjs';
import './maia-core.js'; // sets self.MaiaCore

ort.env.wasm.wasmPaths = new URL('../lib/', import.meta.url).href;
ort.env.wasm.numThreads = 1;

let session = null, moveIndex = null;

async function load() {
  const [idx, resp] = await Promise.all([
    fetch(new URL('./all_moves_maia3.json', import.meta.url)).then(r => r.json()),
    fetch(new URL('./maia3_simplified.onnx', import.meta.url))
  ]);
  moveIndex = idx;
  const total = +resp.headers.get('content-length') || 45700000;
  const reader = resp.body.getReader();
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    self.postMessage({ type: 'progress', pct: Math.min(99, Math.round(got / total * 100)) });
  }
  const buf = new Uint8Array(got); let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'basic' });
  self.postMessage({ type: 'ready' });
}

async function think({ id, fen, legal, elo, temp }) {
  const { tokens, legal: L } = self.MaiaCore.prepare(fen, legal, moveIndex);
  const e = Float32Array.from([elo]);
  const r = await session.run({
    tokens: new ort.Tensor('float32', tokens, [1, 64, 12]),
    elo_self: new ort.Tensor('float32', e, [1]),
    elo_oppo: new ort.Tensor('float32', e, [1])
  });
  const logits = r.logits_move.data;
  const ls = L.map(m => logits[m.index] / temp);
  const max = Math.max(...ls);
  const ex = ls.map(l => Math.exp(l - max));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = L.map((m, i) => ({ uci: m.uci, p: ex[i] / sum })).sort((a, b) => b.p - a.p);
  self.postMessage({ type: 'move', id, probs });
}

self.onmessage = async ev => {
  try {
    if (ev.data.type === 'init') await load();
    else if (ev.data.type === 'think') await think(ev.data);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err && err.message || err) });
  }
};
