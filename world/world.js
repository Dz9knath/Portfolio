/* ==========================================================
   Ben's journey by train – the 3D world behind the home page.
   Everything is built from coloured blocks in code (no model files).
   The page (world/ui.js) tells the world how far along the line the
   train should be; the world tells the page what was clicked.
   Uses three.js (MIT licence, world/three-LICENSE.txt).
   ========================================================== */
import * as THREE from './three.module.min.js';

export const STEP = 120; // distance between stations

/* ---------- small helpers ---------- */
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(20261110);
const pick = a => a[Math.floor(rnd() * a.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function startWorld({ canvas, stationIds, photos, onTag, onSecret, lowPower }) {
  const N = stationIds.length;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 900);

  const DAY = { sky: new THREE.Color('#bfe3ff'), sun: 1.9, amb: 1.25 };
  const NIGHT = { sky: new THREE.Color('#141b3d'), sun: 0.35, amb: 0.55 };
  scene.background = DAY.sky.clone();
  scene.fog = new THREE.Fog(scene.background, 150, 420);
  const hemi = new THREE.HemisphereLight('#ffffff', '#8a7f6a', DAY.amb);
  const sun = new THREE.DirectionalLight('#fff4dd', DAY.sun);
  sun.position.set(-40, 80, 60);
  scene.add(hemi, sun, sun.target);

  /* ---------- the line ---------- */
  const ZS = [0, -7, 6, -6, 7, 0, -7, 6, 0, 0, 0, 0];
  const pts = [new THREE.Vector3(-70, 0, 0)];
  for (let i = 0; i < N; i++) pts.push(new THREE.Vector3(i * STEP, 0, ZS[i % ZS.length]));
  pts.push(new THREE.Vector3((N - 1) * STEP + 26, 0, ZS[(N - 1) % ZS.length]));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const LEN = curve.getLength();
  // arc-length position (0..1) of every station
  const stationU = [];
  {
    const S = 4000; let best = Array(N).fill(1e9), u = Array(N).fill(0);
    for (let k = 0; k <= S; k++) {
      const p = curve.getPointAt(k / S);
      for (let i = 0; i < N; i++) { const d = Math.abs(p.x - i * STEP) + Math.abs(p.z - ZS[i % ZS.length]); if (d < best[i]) { best[i] = d; u[i] = k / S; } }
    }
    stationU.push(...u);
  }
  const trackZ = x => { // z of the line at a given x (the line never doubles back)
    let lo = 0, hi = 1;
    for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (curve.getPointAt(m).x < x) lo = m; else hi = m; }
    return curve.getPointAt((lo + hi) / 2).z;
  };

  /* ---------- blocks: every static box lives in one instanced mesh ---------- */
  const blocks = []; // {x,y,z,w,h,d,c,r,tag}
  // box with its bottom centre at (x, y, z)
  const B = (x, y, z, w, h, d, c, tag, r = 0) => blocks.push({ x, y: y + h / 2, z, w, h, d, c, r, tag });

  // water bands (centre x, half width); the Photo Pier station stands in the sea
  const idx = id => stationIds.indexOf(id);
  const WATER = [[1.5 * STEP, 18], [2.5 * STEP, 18], [idx('pier') * STEP, 62], [(idx('dubai') - 0.5) * STEP, 18]];
  const isWater = x => WATER.some(([c, h]) => Math.abs(x - c) < h);
  const GROUND = { rokycany: '#7dba6b', pilsen: '#70b060', ohio: '#a5c25f', aveiro: '#ead9a4', pier: '#ead9a4', yard: '#9fae8a', chess: '#62b473', facts: '#aaa69d', delhi: '#dbb56e', dubai: '#eedcab' };
  const groundColor = x => GROUND[stationIds[clamp(Math.round(x / STEP), 0, N - 1)]] || '#7dba6b';
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); };

  const X0 = -110, X1 = (N - 1) * STEP + 110;
  for (let x = X0; x < X1; x += 10) for (let z = -100; z < 50; z += 10) {
    const cx = x + 5, cz = z + 5;
    if (isWater(cx)) { B(cx, -5.2, cz, 10, 4, 10, shade('#3f93da', (rnd() - 0.5) * 0.03)); continue; }
    const far = cz < -62 ? Math.floor(rnd() * 3) * 2.2 + (cz < -80 ? 3 : 0) : 0; // low hills on the horizon
    B(cx, -4, cz, 10, 4 + far, 10, shade(groundColor(cx), (rnd() - 0.5) * 0.035));
  }

  // rails, sleepers, bridge piers
  {
    const n = Math.floor(LEN / 1.5);
    for (let k = 0; k <= n; k++) {
      const u = k / n, p = curve.getPointAt(u), t = curve.getTangentAt(u), r = Math.atan2(-t.z, t.x);
      const nx = -t.z, nz = t.x;
      const water = isWater(p.x);
      if (water) B(p.x, 0, p.z, 1.6, 0.35, 5.6, '#8a6a4a', null, r); // bridge deck
      B(p.x, water ? 0.35 : 0, p.z, 0.55, 0.22, 3.6, '#6b4a33', null, r);
      for (const s of [-1.05, 1.05]) B(p.x + nx * s, (water ? 0.35 : 0) + 0.22, p.z + nz * s, 1.55, 0.2, 0.22, '#55585f', null, r);
      if (water && k % 8 === 0) B(p.x, -5, p.z, 1.4, 5, 3.4, '#9a9a9a', null, r);
      if (!water && k % 2 === 0) B(p.x, -0.02, p.z, 1.6, 0.08, 4.6, '#b9ad98', null, r); // gravel bed
    }
  }

  /* ---------- scenery pieces ---------- */
  const tree = (x, z, kind = 'round') => {
    const h = 2 + rnd() * 1.5;
    if (kind === 'palm') {
      B(x, 0, z, 0.7, 6.5, 0.7, '#9a7b55');
      for (const [dx, dz] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]]) B(x + dx, 6.2, z + dz, 2.6 - Math.abs(dz) * 1.1, 0.5, 2.6 - Math.abs(dx) * 1.1, '#3f9a55');
      B(x, 6.5, z, 1.4, 0.6, 1.4, '#4bab60'); return;
    }
    B(x, 0, z, 0.8, h, 0.8, '#7a5a3c');
    const leaf = kind === 'autumn' ? pick(['#e2893b', '#d9552f', '#e8b53a']) : kind === 'pine' ? '#2f7d4f' : pick(['#3f9d55', '#4cae5f', '#379150']);
    if (kind === 'pine') { B(x, h, z, 3.4, 1.4, 3.4, leaf); B(x, h + 1.4, z, 2.4, 1.4, 2.4, leaf); B(x, h + 2.8, z, 1.3, 1.4, 1.3, leaf); }
    else { B(x, h, z, 3.4, 2.6, 3.4, leaf); B(x, h + 2.6, z, 2.2, 1.3, 2.2, shade(leaf, 0.04)); }
  };
  const house = (x, z, w, d, h, wall, roof, tag) => {
    B(x, 0, z, w, h, d, wall, tag);
    B(x, h, z, w + 0.8, 0.9, d + 0.8, roof, tag); B(x, h + 0.9, z, w - 1.2, 0.9, d - 1.2, roof, tag); if (w > 5) B(x, h + 1.8, z, w - 3.2, 0.8, d - 3.2, roof, tag);
    B(x - w * 0.22, 0, z + d / 2 + 0.05, 1.1, 2, 0.12, '#5b3f2b', tag); // door
    for (let wx = -w / 2 + 1.4; wx < w / 2 - 0.5; wx += 2.2) for (let wy = 2.6; wy < h - 0.8; wy += 2.4) if (!(wy < 3 && Math.abs(wx + w * 0.22) < 1.2)) B(x + wx, wy, z + d / 2 + 0.05, 1, 1.2, 0.12, '#2b3f66', tag);
  };
  const signPosts = []; // filled per station, turned into text signs after the instanced mesh
  const platform = (i, sx, sz) => {
    B(sx, 0, sz - 5, 30, 0.7, 4, '#cfc8bb'); B(sx, 0.7, sz - 3.3, 30, 0.1, 0.5, '#f2c230');
    for (const dx of [-5.2, 5.2]) B(sx + dx, 0.7, sz - 6, 0.35, 7.4, 0.35, '#3a3f4a');
    signPosts.push({ i, x: sx, y: 7.4, z: sz - 6 });
    for (const dx of [-11, 11]) { B(sx + dx, 0.7, sz - 6.2, 0.3, 3.4, 0.3, '#3a3f4a'); B(sx + dx, 4.1, sz - 6.2, 0.9, 0.5, 0.9, '#ffe9a8'); } // lamps
    for (const dx of [-8.5, 8.5]) { B(sx + dx, 0.7, sz - 6, 2.6, 0.5, 0.9, '#7a5a3c'); B(sx + dx, 1.2, sz - 6.4, 2.6, 0.8, 0.15, '#7a5a3c'); } // benches
  };

  const dynamic = []; // meshes that move or need their own click target
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const box = (parent, x, y, z, w, h, d, c, tag) => { // one-off mesh; y is the bottom
    const m = new THREE.Mesh(unit, mat(c)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
    if (tag) { m.userData.tag = tag; dynamic.push(m); }
    parent.add(m); return m;
  };
  const anim = []; // functions (time, dt) called every frame

  const BUILD = {
    rokycany(sx, sz, tag) {
      // church
      house(sx - 16, sz - 22, 8, 13, 7, '#f1e6c8', '#b5452f', tag);
      B(sx - 16, 0, sz - 30.5, 5, 15, 5, '#f1e6c8', tag); B(sx - 16, 15, sz - 30.5, 5.8, 1, 5.8, '#3f4a5a', tag); B(sx - 16, 16, sz - 30.5, 4, 1.6, 4, '#3f4a5a', tag); B(sx - 16, 17.6, sz - 30.5, 2.2, 1.8, 2.2, '#3f4a5a', tag);
      B(sx - 16, 19.4, sz - 30.5, 0.3, 2.2, 0.3, '#e8c44a', tag); B(sx - 16, 20.6, sz - 30.5, 1.3, 0.3, 0.3, '#e8c44a', tag);
      B(sx - 16, 9, sz - 27.9, 1.6, 1.6, 0.12, '#f7f3e6', tag);
      // school
      house(sx + 10, sz - 24, 20, 9, 9, '#f0cf73', '#a84a32', tag);
      B(sx + 10, 9.2, sz - 19.3, 6, 1.6, 0.3, '#f7f3e6', tag);
      // town
      house(sx - 2, sz - 40, 7, 7, 5, '#e9b6a0', '#a84a32'); house(sx + 26, sz - 42, 8, 7, 6, '#cfe0ea', '#b5452f'); house(sx - 30, sz - 42, 7, 7, 5, '#f4e9c9', '#a84a32'); house(sx + 32, sz - 16, 6, 6, 4.5, '#f6dfb0', '#b5452f');
      // newsstand = blog
      B(sx + 22, 0, sz - 10, 4.2, 3, 3, '#2f6f8f', 'panel:blog'); B(sx + 22, 3, sz - 10, 5, 0.5, 3.8, '#e8c44a', 'panel:blog'); B(sx + 22, 1.3, sz - 8.45, 3.2, 1.2, 0.1, '#f7f3e6', 'panel:blog');
      for (const [x, z, k] of [[-28, -14, 'round'], [-24, -30, 'round'], [0, -14, 'round'], [20, -38, 'pine'], [38, -30, 'pine'], [-38, -24, 'pine'], [-6, -52, 'pine'], [14, -54, 'round'], [-30, 12, 'round'], [18, 14, 'round'], [-8, 20, 'pine']]) tree(sx + x, sz + z, k);
      // the cow (secret)
      const cow = new THREE.Group(); cow.position.set(sx - 6, 0, sz + 11); scene.add(cow);
      box(cow, 0, 1, 0, 3, 1.6, 1.5, '#f7f3e6', 'secret:cow'); box(cow, -0.5, 1.6, 0.76, 1.1, 0.8, 0.05, '#2a2a2a'); box(cow, 0.9, 1.2, 0.76, 0.6, 0.6, 0.05, '#2a2a2a');
      box(cow, 1.9, 1.7, 0, 1.2, 1.2, 1.2, '#f7f3e6', 'secret:cow'); box(cow, 2.5, 1.8, 0, 0.3, 0.5, 0.9, '#e7a7a0');
      for (const [x, z] of [[-1.1, -0.5], [-1.1, 0.5], [1.1, -0.5], [1.1, 0.5]]) box(cow, x, 0, z, 0.4, 1, 0.4, '#f7f3e6');
      let jump = -1;
      acts['secret:cow'] = () => { if (jump < 0) jump = 0; beep([196, 147], 0.5, 'sawtooth'); };
      anim.push((t, dt) => { if (jump >= 0) { jump += dt * 1.6; cow.position.y = Math.sin(Math.min(jump, 1) * Math.PI) * 5; cow.rotation.x = Math.min(jump, 1) * Math.PI * 2; if (jump >= 1) { jump = -1; cow.rotation.x = 0; cow.position.y = 0; } } });
    },
    pilsen(sx, sz, tag) {
      const px = sx, pz = sz - 26;
      B(px, 0, pz, 44, 0.15, 26, '#3f9a4f', tag);
      for (const dx of [-22, -11, 0, 11, 22]) B(px + dx, 0.15, pz, 0.3, 0.05, 26, '#f7f3e6');
      for (const dz of [-13, 13]) B(px, 0.15, pz + dz, 44, 0.05, 0.3, '#f7f3e6');
      for (const dx of [-22, 22]) { for (const dz of [-2.8, 2.8]) B(px + dx, 0, pz + dz, 0.4, 11, 0.4, '#f7f3e6', tag); B(px + dx, 4, pz, 0.4, 0.4, 6, '#f7f3e6', tag); }
      for (let r = 0; r < 5; r++) B(px, r * 1.2, pz - 16 - r * 1.6, 40, 1.2, 1.6, r % 2 ? '#2f5fa8' : '#e9e9ee', tag); // stand
      B(px, 6, pz - 24.5, 40, 0.6, 3, '#d7141a', tag);
      house(sx - 36, sz - 14, 9, 7, 5, '#efe7d6', '#3f4a5a', tag); // clubhouse
      for (const [x, z, k] of [[-46, -30, 'round'], [-38, -40, 'pine'], [24, -44, 'pine'], [-30, 14, 'round'], [26, 16, 'round'], [4, 22, 'pine']]) tree(sx + x, sz + z, k);
      // rugby ball (secret): kick it between the posts
      const ball = new THREE.Group(); const home = new THREE.Vector3(px + 9, 0.5, pz + 2); ball.position.copy(home); scene.add(ball);
      box(ball, 0, 0, 0, 1.6, 1, 1, '#f7f3e6', 'secret:try'); box(ball, 0, 0.35, 0, 0.5, 0.32, 1.02, '#d7141a');
      let fly = -1;
      acts['secret:try'] = () => { if (fly < 0) fly = 0; beep([330, 494, 659], 0.35, 'triangle'); };
      anim.push((t, dt) => { if (fly >= 0) { fly += dt * 0.8; const k = Math.min(fly, 1); ball.position.set(lerp(home.x, px + 26, k), home.y + Math.sin(k * Math.PI) * 12 + k * 4, home.z - k * 2); ball.rotation.z = -k * 14; if (fly > 1.6) { fly = -1; ball.position.copy(home); ball.rotation.z = 0; } } });
    },
    ohio(sx, sz, tag) {
      house(sx - 6, sz - 24, 24, 10, 8, '#b85c45', '#6a6f78', tag); B(sx - 6, 8.2, sz - 18.9, 9, 1.8, 0.3, '#f7f3e6', tag);
      // flag
      B(sx + 12, 0, sz - 16, 0.3, 12, 0.3, '#d9d9de');
      for (let r = 0; r < 6; r++) B(sx + 14.4, 9 + r * 0.45, sz - 16, 4.5, 0.45, 0.12, r % 2 ? '#f7f3e6' : '#c8313b'); B(sx + 13.1, 10.35, sz - 15.93, 1.9, 1.35, 0.12, '#2b3f8f');
      // school bus
      const bx = sx - 22, bz = sz - 10;
      B(bx, 0.7, bz, 9, 2.6, 3, '#f2b90f', tag); B(bx + 5.4, 0.7, bz, 1.8, 1.5, 3, '#f2b90f', tag); B(bx, 1.5, bz + 1.52, 9, 0.3, 0.05, '#222', tag);
      for (let w = -3.4; w <= 3.4; w += 1.7) B(bx + w, 2.2, bz + 1.52, 1.2, 0.8, 0.05, '#2b3f66', tag);
      for (const w of [-3, 3.6]) for (const s of [-1.5, 1.5]) B(bx + w, 0, bz + s, 1.2, 1.2, 0.4, '#222');
      // football field + Y posts
      const fx = sx + 22, fz = sz - 30;
      B(fx, 0, fz, 28, 0.15, 18, '#4f9d4a', tag); for (let k = -12; k <= 12; k += 4) B(fx + k, 0.15, fz, 0.25, 0.05, 18, '#f7f3e6');
      for (const s of [-14, 14]) { B(fx + s, 0, fz, 0.4, 4, 0.4, '#f2c230', tag); B(fx + s, 4, fz, 0.4, 0.4, 5, '#f2c230', tag); for (const dz of [-2.5, 2.5]) B(fx + s, 4, fz + dz, 0.4, 5, 0.4, '#f2c230', tag); }
      for (const [x, z] of [[-36, -22], [-30, -40], [2, -44], [38, -14], [-32, 14], [10, 18], [30, 16], [-12, 24], [38, -46]]) tree(sx + x, sz + z, 'autumn');
    },
    aveiro(sx, sz, tag) {
      // canal
      for (let x = -50; x <= 50; x += 10) B(sx + x, -0.6, sz - 18, 10, 0.7, 7, '#3f93da');
      B(sx, 0, sz - 14.2, 100, 0.3, 0.6, '#d9cbb0'); B(sx, 0, sz - 21.8, 100, 0.3, 0.6, '#d9cbb0');
      // striped houses (Costa Nova)
      const cols = ['#d7333a', '#2f6fbf', '#2f9d6a', '#e8a920', '#2aa3b5', '#c8448a'];
      for (let k = 0; k < 6; k++) {
        const hx = sx - 25 + k * 10, hz = sz - 30;
        for (let s = 0; s < 7; s++) B(hx - 3 + s, 0, hz, 1, 7, 6, s % 2 ? '#f7f3e6' : cols[k], tag);
        B(hx, 7, hz, 7.6, 0.8, 6.6, '#a84a32', tag); B(hx, 7.8, hz, 5, 0.8, 4.6, '#a84a32', tag);
        B(hx, 0, hz + 3.05, 1.2, 2.2, 0.12, '#5b3f2b', tag); B(hx, 3.8, hz + 3.05, 1.6, 1.6, 0.12, '#2b3f66', tag);
      }
      // moliceiro boat (bobs)
      const boat = new THREE.Group(); boat.position.set(sx + 4, 0.1, sz - 18); scene.add(boat);
      box(boat, 0, 0, 0, 9, 0.9, 2.4, '#f2c230', tag); box(boat, 0, 0.9, 0, 9, 0.25, 2.6, '#d7333a', tag);
      box(boat, 5, 0.5, 0, 1.4, 1.2, 1.6, '#2f6fbf', tag); box(boat, 5.9, 1.5, 0, 0.9, 1.5, 1, '#2f6fbf', tag); box(boat, -5, 0.5, 0, 1.2, 1, 1.6, '#2f9d6a', tag);
      anim.push(t => { boat.position.y = 0.1 + Math.sin(t * 1.3) * 0.12; boat.rotation.z = Math.sin(t * 0.9) * 0.03; });
      for (const [x, z] of [[-40, -10], [36, -10], [-34, -42], [40, -40], [-20, 14], [22, 16]]) tree(sx + x, sz + z, 'palm');
    },
    pier(sx, sz, tag) {
      B(sx, 0, sz - 16, 70, 0.6, 22, '#b88a5a', tag);
      for (let x = -32; x <= 32; x += 8) for (const dz of [-6, -26]) B(sx + x, -5, sz + dz, 1, 5, 1, '#7a5a3c');
      for (let x = -34; x <= 34; x += 4) B(sx + x, 0.6, sz - 26.7, 0.3, 1.4, 0.3, '#7a5a3c'); B(sx, 1.8, sz - 26.7, 70, 0.25, 0.3, '#7a5a3c');
      // lighthouse
      const lx = sx + 44, lz = sz - 30;
      B(lx, -5, lz, 9, 5.6, 9, '#8e8e8e');
      for (let s = 0; s < 6; s++) B(lx, 0.6 + s * 3, lz, 5 - s * 0.4, 3, 5 - s * 0.4, s % 2 ? '#f7f3e6' : '#d7333a', tag);
      B(lx, 18.6, lz, 3.8, 0.5, 3.8, '#3a3f4a', tag); B(lx, 19.1, lz, 2, 2, 2, '#ffe9a8', tag); B(lx, 21.1, lz, 2.8, 0.8, 2.8, '#d7333a', tag);
      // photo boards are added after the instanced mesh (they need textures)
      for (let k = 0; k < Math.min(photos.length, 7); k++) { const bx = sx - 30 + k * 10; B(bx - 3.6, 0.6, sz - 20, 0.4, 2, 0.4, '#5b3f2b'); B(bx + 3.6, 0.6, sz - 20, 0.4, 2, 0.4, '#5b3f2b'); }
    },
    yard(sx, sz, tag) {
      // festival stage
      B(sx - 20, 0, sz - 30, 20, 1.6, 10, '#3a3f4a', tag); for (const dx of [-9.5, 9.5]) B(sx - 20 + dx, 1.6, sz - 34, 1, 10, 1, '#55585f', tag); B(sx - 20, 11.6, sz - 30, 21, 1, 11, '#2a2d35', tag);
      for (const dx of [-7.6, 7.6]) B(sx - 20 + dx, 1.6, sz - 26.5, 2.2, 3.6, 2, '#17181c', tag);
      for (const [dx, c] of [[-4, '#ff5470'], [0, '#ffc83d'], [4, '#19c2a0']]) B(sx - 20 + dx, 10.8, sz - 25.6, 1, 0.8, 1, c, tag);
      // food stalls with striped awnings
      for (const [dx, c] of [[4, '#d7333a'], [14, '#2f6fbf']]) {
        B(sx + dx, 0, sz - 16, 7, 2.6, 4, '#f7f3e6', tag); B(sx + dx, 1.2, sz - 13.9, 6.4, 0.3, 0.6, '#b88a5a', tag);
        for (let s = 0; s < 8; s++) B(sx + dx - 3.5 + s + 0.5, 3.6, sz - 15.4, 1, 0.4, 5.6, s % 2 ? '#f7f3e6' : c, tag);
        for (const p of [-3.3, 3.3]) B(sx + dx + p, 2.6, sz - 13.2, 0.25, 1, 0.25, '#55585f');
      }
      // paintball arena
      const ax = sx + 34, az = sz - 30;
      B(ax, 0, az, 26, 0.12, 20, '#8a7a5a', tag);
      for (const [x, z, w, d, c] of [[-8, -4, 4, 1.2, '#2f6fbf'], [-2, 4, 1.2, 5, '#d7333a'], [5, -5, 5, 1.2, '#e8a920'], [9, 4, 1.2, 4, '#2f9d6a'], [-9, 6, 3, 1.2, '#c8448a'], [1, -1, 2, 2, '#55585f']]) B(ax + x, 0.12, az + z, w, 2.4, d, c, tag);
      for (let k = 0; k < 14; k++) B(ax - 12 + rnd() * 24, 0.13, az - 9 + rnd() * 18, 0.9, 0.04, 0.9, pick(['#ff5470', '#ffc83d', '#19c2a0', '#3355ff']));
      for (const [x, z] of [[-40, -14], [-6, -42], [48, -8], [-32, 14], [20, 16], [8, -34]]) tree(sx + x, sz + z, 'round');
      for (let k = 0; k < 5; k++) B(sx - 6 + k * 1.5, 0, sz - 9, 1.3, 1.3 + (k % 2) * 1.3, 1.3, '#b88a5a'); // crates
    },
    chess(sx, sz, tag) {
      const bx = sx, bz = sz - 26, s = 3;
      B(bx, 0, bz, s * 8 + 2, 0.5, s * 8 + 2, '#6b4a33', tag);
      for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) B(bx - s * 3.5 + f * s, 0.5, bz - s * 3.5 + r * s, s, 0.2, s, (f + r) % 2 ? '#f0e6cf' : '#8b9cf5', tag);
      const piece = (f, r, kind, c) => {
        const x = bx - s * 3.5 + f * s, z = bz - s * 3.5 + r * s, y = 0.7;
        B(x, y, z, 1.8, 0.5, 1.8, c, tag);
        if (kind === 'p') { B(x, y + 0.5, z, 1.1, 1.3, 1.1, c, tag); B(x, y + 1.8, z, 1.4, 1, 1.4, c, tag); }
        if (kind === 'r') { B(x, y + 0.5, z, 1.4, 2.6, 1.4, c, tag); B(x, y + 3.1, z, 1.9, 0.8, 1.9, c, tag); }
        if (kind === 'n') { B(x, y + 0.5, z, 1.3, 2.2, 1.3, c, tag); B(x + 0.3, y + 2.7, z, 2, 1.2, 1.2, c, tag); }
        if (kind === 'b') { B(x, y + 0.5, z, 1.2, 3, 1.2, c, tag); B(x, y + 3.5, z, 0.8, 0.9, 0.8, c, tag); }
        if (kind === 'q') { B(x, y + 0.5, z, 1.3, 3.6, 1.3, c, tag); B(x, y + 4.1, z, 1.8, 0.6, 1.8, c, tag); B(x, y + 4.7, z, 0.7, 0.7, 0.7, c, tag); }
      };
      const W = '#fbf7ea', K = '#2a2740';
      // a middlegame after 1.d4 (Ben's favourite first move)
      [[0, 7, 'r'], [7, 7, 'r'], [1, 7, 'n'], [5, 5, 'n'], [2, 7, 'b'], [5, 7, 'b'], [3, 7, 'q']].forEach(([f, r, k]) => piece(f, r, k, W));
      [0, 1, 2, 4, 5, 6, 7].forEach(f => piece(f, 6, 'p', W)); piece(3, 4, 'p', W);
      [[0, 0, 'r'], [7, 0, 'r'], [1, 0, 'n'], [5, 2, 'n'], [2, 0, 'b'], [5, 0, 'b'], [3, 0, 'q']].forEach(([f, r, k]) => piece(f, r, k, K));
      [0, 1, 2, 3, 5, 7].forEach(f => piece(f, 1, 'p', K)); piece(4, 2, 'p', K); piece(6, 2, 'p', K);
      // kings are separate so one can be tipped over (secret)
      const king = (f, r, c, secret) => {
        const g = new THREE.Group(); g.position.set(bx - s * 3.5 + f * s, 0.7, bz - s * 3.5 + r * s); scene.add(g);
        const t = secret ? 'secret:king' : tag;
        box(g, 0, 0, 0, 1.8, 0.5, 1.8, c, t); box(g, 0, 0.5, 0, 1.3, 4, 1.3, c, t); box(g, 0, 4.5, 0, 1.9, 0.6, 1.9, c, t); box(g, 0, 5.1, 0, 0.4, 1.4, 0.4, '#e8c44a', t); box(g, 0, 5.6, 0, 1.2, 0.4, 0.4, '#e8c44a', t);
        return g;
      };
      king(4, 7, W, false);
      const bk = king(4, 0, K, true); let tip = 0, tipping = false;
      acts['secret:king'] = () => { tipping = !tipping; beep(tipping ? [220, 165, 110] : [110, 165, 220], 0.4, 'square'); };
      anim.push((t, dt) => { tip = clamp(tip + (tipping ? dt : -dt) * 2.4, 0, 1); bk.rotation.z = -tip * tip * Math.PI / 2; });
      for (const [x, z, k] of [[-26, -14, 'round'], [26, -12, 'round'], [-30, -40, 'pine'], [30, -42, 'pine'], [-20, 14, 'round'], [24, 16, 'pine'], [0, -48, 'round'], [-44, -26, 'round'], [44, -28, 'pine']]) tree(sx + x, sz + z, k);
      for (const dx of [-18, 18]) { B(sx + dx, 0, sz - 12, 3.4, 0.6, 1, '#7a5a3c'); B(sx + dx, 0.6, sz - 12.5, 3.4, 0.9, 0.2, '#7a5a3c'); }
    },
    facts(sx, sz, tag) {
      B(sx - 8, 0, sz - 28, 30, 11, 14, '#8f959e', tag);
      for (let k = 0; k < 5; k++) { B(sx - 20 + k * 6, 11, sz - 28, 6, 1.6, 14, k % 2 ? '#7c828b' : '#a3a8b0', tag); }
      for (let wx = -19; wx <= 3; wx += 4.4) B(sx + wx, 5.5, sz - 20.95, 2.6, 2.6, 0.12, '#ffe9a8', tag);
      B(sx - 8, 0, sz - 20.95, 4, 4, 0.14, '#3a3f4a', tag);
      B(sx + 14, 0, sz - 30, 4, 24, 4, '#b85c45', tag); B(sx + 14, 24, sz - 30, 5, 1.2, 5, '#f7f3e6', tag); B(sx + 14, 16, sz - 30, 4.1, 1.4, 4.1, '#f7f3e6', tag);
      // conveyor with fact boxes
      B(sx + 6, 0, sz - 14, 26, 1.2, 2.4, '#55585f', tag);
      const crates = []; for (let k = 0; k < 5; k++) { const g = new THREE.Group(); scene.add(g); box(g, 0, 0, 0, 1.6, 1.6, 1.6, pick(['#ffc83d', '#ff5470', '#19c2a0', '#a894ff']), tag); crates.push(g); }
      anim.push(t => crates.forEach((g, k) => { const u = (t * 0.12 + k / 5) % 1; g.position.set(sx - 6 + u * 24, 1.2, sz - 14); }));
      // the big question block
      const q = new THREE.Group(); q.position.set(sx + 24, 6, sz - 22); scene.add(q);
      box(q, 0, -2, 0, 4, 4, 4, '#ffc83d', tag);
      B(sx + 24, 0, sz - 22, 2, 3.6, 2, '#55585f', tag);
      anim.push(t => { q.rotation.y = t * 0.8; q.position.y = 6 + Math.sin(t * 2) * 0.4; });
      // chimney smoke
      const puffs = []; for (let k = 0; k < 6; k++) { const g = new THREE.Group(); scene.add(g); box(g, 0, 0, 0, 2.4, 2.4, 2.4, '#f2f2f2'); puffs.push(g); }
      anim.push(t => puffs.forEach((g, k) => { const u = (t * 0.1 + k / 6) % 1; g.position.set(sx + 14 + u * 9, 26 + u * 16, sz - 30); g.scale.setScalar(0.6 + u * 1.4); }));
      // the big switch (secret): day / night
      const lx = sx - 16, lz = sz - 7.6;
      B(lx, 0.7, lz, 1.6, 2.2, 1.2, '#f2c230', 'secret:night'); B(lx, 0.7, lz + 0.62, 1.2, 0.5, 0.05, '#222', 'secret:night');
      const lever = new THREE.Group(); lever.position.set(lx, 2.9, lz); scene.add(lever);
      box(lever, 0, 0, 0, 0.3, 2, 0.3, '#3a3f4a', 'secret:night'); box(lever, 0, 2, 0, 0.8, 0.8, 0.8, '#d7333a', 'secret:night');
      lever.rotation.z = 0.6;
      acts['secret:night'] = () => { night = !night; beep(night ? [440, 220] : [220, 440], 0.25, 'square'); };
      anim.push((t, dt) => { lever.rotation.z = lerp(lever.rotation.z, night ? -0.6 : 0.6, Math.min(1, dt * 8)); });
      for (const [x, z] of [[-34, -14], [38, -40], [-30, 14], [20, 16]]) tree(sx + x, sz + z, 'pine');
    },
    delhi(sx, sz, tag) {
      // India Gate
      const gx = sx - 18, gz = sz - 28, S = '#dcb98a';
      for (const dx of [-5, 5]) B(gx + dx, 0, gz, 4.5, 14, 5, S, tag);
      B(gx, 14, gz, 15, 3, 5.4, S, tag); B(gx, 17, gz, 11, 1.6, 4.6, S, tag); B(gx, 18.6, gz, 6, 1.4, 3.6, S, tag); B(gx, 20, gz, 3, 0.8, 2.4, shade(S, -0.08), tag);
      // campus
      house(sx + 16, sz - 26, 22, 10, 11, '#f4f1ea', '#2aa3b5', tag);
      B(sx + 16, 11.5, sz - 20.9, 8, 1.8, 0.3, '#1e1b4b', tag);
      for (let k = 0; k < 9; k++) B(sx + 5 + k * 2.8, 13.6 + (k % 2) * 0.5, sz - 20, 1.6, 1, 0.12, k % 2 ? '#ff9933' : '#138808'); // bunting
      // auto-rickshaws
      for (const [dx, dz] of [[-4, -11], [30, -12]]) {
        B(sx + dx, 0.5, sz + dz, 3.6, 1.5, 2.2, '#1f8a4c', tag); B(sx + dx - 0.2, 2, sz + dz, 3, 1.3, 2.2, '#f2c230', tag); B(sx + dx + 1.4, 2, sz + dz, 0.1, 1.1, 1.9, '#2b3f66', tag);
        for (const [wx, wz] of [[1.5, 0], [-1.2, -1.1], [-1.2, 1.1]]) B(sx + dx + wx, 0, sz + dz + wz, 0.9, 0.9, 0.35, '#222');
      }
      for (const [x, z] of [[-40, -14], [40, -14], [-34, -44], [2, -46], [42, -42], [-28, 14], [24, 16], [-2, 22]]) tree(sx + x, sz + z, 'palm');
      for (let k = 0; k < 10; k++) B(sx - 44 + rnd() * 88, 0, sz - 60 + rnd() * 18, 2 + rnd() * 3, 3 + rnd() * 6, 2 + rnd() * 3, pick(['#e8c9a0', '#f1d9b8', '#d9a57a', '#f4e3c9'])); // old city blocks
    },
    dubai(sx, sz, tag) {
      // the tower, still going up
      const tx = sx + 6, tz = sz - 32; let y = 0;
      [[10, 8], [8.4, 7], [7, 7], [5.6, 6], [4.2, 6], [2.8, 5], [1.6, 4]].forEach(([w, h], k) => { B(tx, y, tz, w, h, w, k % 2 ? '#a9d4ea' : '#8fc3df', tag); y += h; });
      B(tx, y, tz, 0.5, 6, 0.5, '#d9d9de', tag);
      // crane
      const cx = sx - 16, cz = sz - 30;
      B(cx, 0, cz, 1.6, 30, 1.6, '#f2b90f', tag); B(cx + 7, 30, cz, 26, 1.2, 1.2, '#f2b90f', tag); B(cx - 6, 28.6, cz, 3, 2.6, 2, '#55585f', tag); B(cx, 31.2, cz, 2.4, 2.4, 2.4, '#f2b90f', tag);
      B(cx + 16, 21, cz, 0.15, 9, 0.15, '#222'); B(cx + 16, 18, cz, 3, 3, 3, '#b88a5a', tag);
      // smaller towers
      for (const [dx, dz, w, h, c] of [[28, -38, 7, 20, '#c9dfe9'], [38, -24, 6, 13, '#e9e2cf'], [-34, -40, 8, 16, '#d5e6ee'], [-44, -24, 6, 10, '#e9e2cf']]) { B(sx + dx, 0, sz + dz, w, h, w, c, tag); B(sx + dx, h, sz + dz, w - 2, 2, w - 2, shade(c, -0.06), tag); }
      // dunes
      for (const [dx, dz, w] of [[-30, 16, 16], [10, 20, 20], [36, 12, 12], [-6, -52, 22], [50, -50, 16]]) { B(sx + dx, 0, sz + dz, w, 1.2, w * 0.6, '#e6cf96'); B(sx + dx + 1, 1.2, sz + dz, w * 0.6, 1, w * 0.36, '#ecd9a6'); }
      for (const [x, z] of [[-26, -12], [24, -12], [44, -8], [-40, -8]]) tree(sx + x, sz + z, 'palm');
      // barriers and the buffer stop at the end of the line
      for (let k = 0; k < 6; k++) B(sx - 8 + k * 3.2, 0, sz - 14, 2.6, 1.2, 0.4, k % 2 ? '#f7f3e6' : '#d7333a');
      const ex = sx + 26, ez = trackZ(sx + 26);
      B(ex + 2, 0, ez, 1, 2.4, 4.6, '#d7333a'); B(ex + 1.2, 1.2, ez, 0.8, 0.8, 5.4, '#f7f3e6');
      // golden block (secret), half hidden behind a dune
      const g = new THREE.Group(); g.position.set(sx + 12, 1.4, sz + 17); scene.add(g);
      box(g, 0, 0, 0, 1.8, 1.8, 1.8, '#e8c44a', 'secret:gold');
      let found = 0; acts['secret:gold'] = () => { found = 1; beep([523, 659, 784, 1047], 0.5, 'triangle'); };
      anim.push((t, dt) => { g.rotation.y = t * 1.5; if (found > 0) { found += dt; g.position.y = 1.4 + Math.min(found - 1, 3) * 6; g.scale.setScalar(Math.max(0, 1 - (found - 1) / 3)); } });
    }
  };

  /* ---------- sound (only ever after a click) ---------- */
  let audio = null, muted = false;
  function beep(freqs, dur = 0.3, type = 'sine') {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      freqs.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = type; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
        const s = t0 + i * dur * 0.55;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.08, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.start(s); o.stop(s + dur + 0.02);
      });
    } catch (e) { /* no sound available: fine */ }
  }

  const acts = {}; // secret tag -> what happens in the world
  let night = false;

  // build every station
  stationIds.forEach((id, i) => {
    const sx = i * STEP, sz = ZS[i % ZS.length];
    platform(i, sx, sz);
    if (BUILD[id]) BUILD[id](sx, sz, 'station:' + id);
  });

  // one instanced mesh for all static blocks
  const inst = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial(), blocks.length);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    blocks.forEach((b, i) => { p.set(b.x, b.y, b.z); q.setFromAxisAngle(up, b.r); s.set(b.w, b.h, b.d); m.compose(p, q, s); inst.setMatrixAt(i, m); inst.setColorAt(i, c.set(b.c)); });
    inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
  }
  scene.add(inst);

  /* ---------- station name signs (Czech-railway blue) ---------- */
  const signs = [];
  function setSignNames(names) {
    signs.forEach(s => { scene.remove(s); s.material.map.dispose(); s.material.dispose(); });
    signs.length = 0;
    signPosts.forEach(({ i, x, y, z }) => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112;
      const g = cv.getContext('2d');
      g.fillStyle = '#17357a'; g.fillRect(0, 0, 512, 112); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(7, 7, 498, 98);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = 64; do { g.font = '700 ' + size + 'px Bricolage, Arial, sans-serif'; size -= 4; } while (g.measureText(names[i]).width > 460 && size > 20);
      g.fillText(names[i], 256, 60);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 2.5), new THREE.MeshBasicMaterial({ map: tex }));
      m.position.set(x, y, z + 0.2); m.userData.tag = 'station:' + stationIds[i]; scene.add(m); signs.push(m);
    });
  }

  /* ---------- photo boards on the pier ---------- */
  const boards = [];
  {
    const i = idx('pier');
    if (i >= 0) {
      const sx = i * STEP, sz = ZS[i % ZS.length], loader = new THREE.TextureLoader();
      photos.slice(0, 7).forEach((src, k) => {
        const g = new THREE.Group(); g.position.set(sx - 30 + k * 10, 2.4, sz - 20); scene.add(g);
        const frame = box(g, 0, 0, -0.2, 8, 8.6, 0.3, '#f7f3e6', 'photo:' + k);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.8), new THREE.MeshBasicMaterial({ color: '#cfd6e6' }));
        m.position.set(0, 4.3, 0); m.userData.tag = 'photo:' + k; g.add(m); boards.push(m);
        loader.load(src, tex => { tex.colorSpace = THREE.SRGBColorSpace; const a = tex.image.width / tex.image.height, want = 7.2 / 7.8; // crop to the board
          if (a > want) { tex.repeat.set(want / a, 1); tex.offset.set((1 - want / a) / 2, 0); } else { tex.repeat.set(1, a / want); tex.offset.set(0, (1 - a / want) * 0.7); }
          m.material.map = tex; m.material.color.set('#ffffff'); m.material.needsUpdate = true; });
        frame.userData.tag = 'photo:' + k;
      });
    }
  }

  /* ---------- the train ---------- */
  const cars = [];
  const car = (offset, build) => { const g = new THREE.Group(); build(g); scene.add(g); cars.push({ g, offset }); return g; };
  const wheels = (g, xs) => xs.forEach(x => [-1.25, 1.25].forEach(z => box(g, x, 0.25, z, 1.1, 1.1, 0.3, '#22242a')));
  const loco = car(0, g => {
    box(g, 0, 0.8, 0, 7, 0.6, 2.6, '#22242a', 'secret:horn');
    box(g, 0.9, 1.4, 0, 4.6, 1.9, 2.2, '#d7333a', 'secret:horn'); box(g, -2.2, 1.4, 0, 2.4, 3.2, 2.6, '#d7333a', 'secret:horn');
    box(g, -2.2, 4.6, 0, 3, 0.35, 3, '#22242a', 'secret:horn'); box(g, -2.2, 3.1, 1.31, 1.3, 1, 0.05, '#bfe3ff'); box(g, -2.2, 3.1, -1.31, 1.3, 1, 0.05, '#bfe3ff');
    box(g, 2.3, 3.3, 0, 0.9, 1.5, 0.9, '#22242a', 'secret:horn'); box(g, 2.3, 4.8, 0, 1.3, 0.4, 1.3, '#22242a');
    box(g, 0.6, 3.3, 0, 0.7, 0.6, 0.7, '#e8c44a'); box(g, 3.3, 1.6, 0, 0.2, 0.7, 0.7, '#ffe9a8'); box(g, 0.9, 2.2, 1.12, 4.6, 0.3, 0.05, '#f2c230'); box(g, 0.9, 2.2, -1.12, 4.6, 0.3, 0.05, '#f2c230');
    box(g, 3.9, 0.5, 0, 0.9, 0.7, 2.4, '#55585f');
    wheels(g, [-2.4, -0.4, 1.6]);
  });
  car(8.6, g => { box(g, 0, 0.8, 0, 7, 0.6, 2.6, '#22242a'); box(g, 0, 1.4, 0, 7, 2.6, 2.5, '#2f6fbf'); box(g, 0, 4, 0, 7.3, 0.35, 2.8, '#e9e9ee'); for (let x = -2.5; x <= 2.5; x += 1.66) { box(g, x, 2.4, 1.26, 1.1, 1, 0.05, '#ffe9a8'); box(g, x, 2.4, -1.26, 1.1, 1, 0.05, '#ffe9a8'); } wheels(g, [-2.4, 2.4]); });
  car(17, g => { box(g, 0, 0.8, 0, 7, 0.6, 2.6, '#22242a'); box(g, 0, 1.4, 0, 7, 2.6, 2.5, '#2f9d6a'); box(g, 0, 4, 0, 7.3, 0.35, 2.8, '#e9e9ee'); for (let x = -2.5; x <= 2.5; x += 1.66) { box(g, x, 2.4, 1.26, 1.1, 1, 0.05, '#ffe9a8'); box(g, x, 2.4, -1.26, 1.1, 1, 0.05, '#ffe9a8'); } wheels(g, [-2.4, 2.4]); });
  car(24.6, g => { box(g, 0, 0.8, 0, 6, 0.6, 2.6, '#22242a'); box(g, 0, 1.4, 0, 6, 1.2, 2.4, '#b88a5a'); box(g, -1, 2.6, 0, 1.6, 1, 1, '#f7f3e6'); box(g, -1, 3, 0, 0.5, 0.33, 1.02, '#d7141a'); box(g, 1.2, 2.6, 0.2, 1.4, 1.4, 1.4, '#ffc83d'); wheels(g, [-2, 2]); }); // freight: a rugby ball and a fact box

  // smoke
  const smoke = []; for (let k = 0; k < 10; k++) { const m = box(scene, 0, -50, 0, 1, 1, 1, '#f2f2f2'); m.material = new THREE.MeshLambertMaterial({ color: '#f2f2f2', transparent: true }); smoke.push({ m, life: 1 }); }
  let smokeAt = 0, hornBoost = 0;
  acts['secret:horn'] = () => { hornBoost = 1; beep([311, 311, 370], 0.5, 'sawtooth'); };

  // plane over the first sea (secret: does a loop)
  const plane = new THREE.Group(); scene.add(plane);
  box(plane, 0, 0, 0, 7, 1.4, 1.4, '#f7f3e6', 'secret:plane'); box(plane, 0.4, 0.4, 0, 2, 0.3, 9, '#d7333a', 'secret:plane'); box(plane, -3.2, 0.6, 0, 1, 1.8, 0.3, '#d7333a', 'secret:plane'); box(plane, -3.2, 0.5, 0, 1, 0.25, 3.4, '#d7333a'); box(plane, 3.4, 0.5, 0, 0.5, 0.7, 1.2, '#2b3f66');
  let loop = -1; acts['secret:plane'] = () => { if (loop < 0) loop = 0; beep([392, 523, 659, 784], 0.3, 'sine'); };
  anim.push((t, dt) => {
    const u = (t * 0.035) % 1, x = lerp(STEP * 0.9, STEP * 3.1, u);
    let y = 34 + Math.sin(t * 0.7) * 1.5, rot = 0;
    if (loop >= 0) { loop += dt * 0.7; const a = Math.min(loop, 1) * Math.PI * 2; y += (1 - Math.cos(a)) * 6; rot = a; if (loop >= 1) loop = -1; }
    plane.position.set(x, y, -34); plane.rotation.z = rot;
  });

  // clouds
  for (let k = 0; k < 14; k++) {
    const g = new THREE.Group(); const x0 = rnd() * (X1 - X0) + X0, y = 46 + rnd() * 16, z = -70 + rnd() * 50, sp = 0.6 + rnd();
    box(g, 0, 0, 0, 10 + rnd() * 6, 2.4, 5, '#ffffff'); box(g, 2, 2.4, 0, 6, 2, 4, '#ffffff'); box(g, -4, 1.6, 1, 5, 1.8, 3.4, '#ffffff');
    scene.add(g); anim.push(t => { g.position.set(((x0 + t * sp - X0) % (X1 - X0)) + X0, y, z); });
  }
  // stars for the night
  const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  { const a = []; for (let k = 0; k < 500; k++) a.push(X0 + rnd() * (X1 - X0), 40 + rnd() * 120, -120 - rnd() * 120); stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); }
  scene.add(stars);

  /* ---------- driving ---------- */
  let targetU = stationU[0], u = stationU[0];
  // p = 0..1 scroll progress; stations are evenly spaced in scroll, the train eases in and out of each
  function setProgress(p) {
    const f = clamp(p, 0, 1) * (N - 1), i = Math.min(Math.floor(f), N - 2), k = f - i;
    const e = k * k * k * (k * (k * 6 - 15) + 10);
    targetU = lerp(stationU[i], stationU[i + 1], e);
  }
  const pos = new THREE.Vector3(), tan = new THREE.Vector3(), look = new THREE.Vector3(), camPos = new THREE.Vector3();
  let mouseX = 0, mouseY = 0, wide = true, nightK = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; wide = w / h > 1;
    camera.fov = wide ? 38 : 52; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  window.addEventListener('pointermove', e => { mouseX = e.clientX / window.innerWidth - 0.5; mouseY = e.clientY / window.innerHeight - 0.5; });

  /* ---------- clicking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tagAt(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([inst, ...dynamic, ...signs, ...boards], false)[0];
    if (!hit) return null;
    return hit.object === inst ? blocks[hit.instanceId].tag : hit.object.userData.tag;
  }
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 600) { down = null; return; }
    down = null;
    const tag = tagAt(e.clientX, e.clientY); if (!tag) return;
    if (acts[tag]) { acts[tag](); if (onSecret) onSecret(tag.split(':')[1]); }
    else if (onTag) onTag(tag);
  });
  let hoverAt = 0;
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now(); if (now - hoverAt < 60) return; hoverAt = now;
    canvas.style.cursor = tagAt(e.clientX, e.clientY) ? 'pointer' : '';
  });

  /* ---------- frame loop ---------- */
  let last = performance.now(), running = true, T = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    const speed = Math.abs(targetU - u) * LEN;
    u = lerp(u, targetU, 1 - Math.pow(0.0015, dt));
    cars.forEach(c => {
      const cu = clamp(u - c.offset / LEN, 0, 1);
      curve.getPointAt(cu, pos); curve.getTangentAt(cu, tan);
      c.g.position.set(pos.x, (isWater(pos.x) ? 0.35 : 0) + 0.45, pos.z);
      c.g.rotation.y = Math.atan2(-tan.z, tan.x);
    });
    curve.getPointAt(u, pos);
    // camera: a fixed three-quarter view that rides along with the engine
    const off = wide ? [-4, 30, 50] : [-5, 46, 66];
    camPos.set(pos.x + off[0] + mouseX * 6, off[1] - mouseY * 4, pos.z + off[2]);
    camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
    look.set(camera.position.x - off[0] + (wide ? 2 : 0), 3, pos.z - (wide ? 9 : 12));
    camera.lookAt(look);
    sun.position.set(pos.x - 40, 80, 60); sun.target.position.set(pos.x, 0, 0);

    // smoke puffs
    smokeAt -= dt * (1 + Math.min(speed, 40) * 0.25 + hornBoost * 6); hornBoost = Math.max(0, hornBoost - dt);
    if (smokeAt <= 0) { smokeAt = 0.5; const s = smoke.find(s => s.life >= 1); if (s) { s.life = 0; loco.localToWorld(s.m.position.set(2.3, 5.4, 0)); } }
    smoke.forEach(s => { if (s.life < 1) { s.life += dt * 0.7; s.m.position.y += dt * 5; s.m.position.x -= dt * 2; s.m.scale.setScalar(0.8 + s.life * 2.4); s.m.material.opacity = 1 - s.life; } else s.m.position.y = -50; });

    // day / night
    nightK = lerp(nightK, night ? 1 : 0, Math.min(1, dt * 2.5));
    scene.background.lerpColors(DAY.sky, NIGHT.sky, nightK); scene.fog.color.copy(scene.background);
    sun.intensity = lerp(DAY.sun, NIGHT.sun, nightK); hemi.intensity = lerp(DAY.amb, NIGHT.amb, nightK); stars.material.opacity = nightK;

    anim.forEach(f => f(T, dt));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setProgress, setSignNames,
    setMuted(m) { muted = m; },
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
    // for tests
    _debug: () => ({ u, targetU, blocks: blocks.length })
  };
}
