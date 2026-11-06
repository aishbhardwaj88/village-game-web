import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS, localPt } from './anchors.js';
import { texturedBox } from './materials.js';
import { drawBilingual, hiFont, enFont, HI_FAMILY } from './signPaint.js';
import { MAP_COMPOUND_WALLS } from './mapCompoundWalls.js';

/**
 * Wall writing and small stories (docs/VILLAGE_VOCABULARY.md section 12). Nine pieces, one shared canvas atlas:
 *   peshab sign + god tile (tyre shop wall), two half-painted-over election slogans (weighbridge, petrol pump walls),
 *   chalk cricket score on a blackboard-painted patch (tubewell wall), children's chalk drawings (anganwadi wall),
 *   shaadi card pasted on a gate leaf (sweet shop wall), "To Let" with a padlock (general store wall),
 *   a PCO STD ISD kiosk with its shutter down (outside the bus stop wall), yesterday's newspaper on the open-air
 *   barber's tool box, and a child-seat cycle at the school gate.
 * Wall pieces sit on the real 1 Nov compound-wall runs (src/mapCompoundWalls.js: wall 1.15 m high, 0.24 m thick, pilasters
 * every 4 m from the run start), centred between pilasters, on both faces. Hindi first (bold, larger), English second.
 * No party names or symbols: slogans carry a plain sun/star only. No real brands. Nothing at faith buildings.
 * Cost: 1 decal mesh (alpha-blended atlas) + 1 metal mesh (kiosk + cycle) = 2 draw calls.
 */

const AW = 2048, AH = 1536, PPM = 400; // atlas px, pixels per metre of painted surface
const CELLS = {
  peshab: { x: 0, y: 0, w: 640, h: 220 },
  slogan1: { x: 640, y: 0, w: 640, h: 220 },
  slogan2: { x: 1280, y: 0, w: 640, h: 220 },
  cricket: { x: 0, y: 220, w: 640, h: 220 },
  kids: { x: 640, y: 220, w: 800, h: 240 },
  tolet: { x: 1440, y: 220, w: 512, h: 220 },
  card: { x: 0, y: 460, w: 180, h: 240 },
  pco: { x: 200, y: 460, w: 512, h: 200 },
  news: { x: 740, y: 460, w: 192, h: 144 },
  dark: { x: 960, y: 460, w: 32, h: 32 }, // shutter slats strip (kiosk front)
  shutter: { x: 1000, y: 460, w: 512, h: 768 },
};
const uvOf = (c) => [c.x / AW, 1 - (c.y + c.h) / AH, (c.x + c.w) / AW, 1 - c.y / AH];

const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Paint wear: knock small specks and scuffs out of the alpha of a cell so the paint reads aged, never pristine. */
function wear(g, c, amount, seed) {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < amount; i++) {
    const x = c.x + rnd(seed + i * 3) * c.w, y = c.y + rnd(seed + i * 3 + 1) * c.h;
    g.globalAlpha = 0.25 + rnd(seed + i * 3 + 2) * 0.5;
    g.fillStyle = '#000';
    const r = 0.8 + rnd(seed + i * 7) * 2.4;
    g.fillRect(x, y, r * (1 + rnd(seed + i) * 2), r);
  }
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Hindi bold first and larger, English beneath, via the shared board painter, inside a sub-rect of a cell. */
function bilingual(g, hi, en, c, rect, fg, opts = {}) {
  return drawBilingual(g, hi, en, { x: c.x + rect.x + (opts.align === 'left' ? 0 : rect.w / 2), y: c.y + rect.y, w: rect.w, h: rect.h, fg, ...opts });
}

function paintAtlas(g) {
  g.clearRect(0, 0, AW, AH);

  // ---- peshab: whitewashed panel, red border, a painted god tile on the left, the notice on the right ----
  {
    const c = CELLS.peshab;
    g.fillStyle = '#efe9d8'; roundRect(g, c.x + 3, c.y + 3, c.w - 6, c.h - 6, 8); g.fill();
    g.strokeStyle = '#9a2a1e'; g.lineWidth = 5; roundRect(g, c.x + 9, c.y + 9, c.w - 18, c.h - 18, 6); g.stroke();
    // god tile: glazed ceramic square, pastel figure on a lotus with a halo and a marigold garland (no named deity)
    const tx = c.x + 22, ty = c.y + 22, ts = c.h - 44;
    g.fillStyle = '#f6efd8'; g.fillRect(tx, ty, ts, ts);
    g.strokeStyle = '#c9a227'; g.lineWidth = 4; g.strokeRect(tx + 2, ty + 2, ts - 4, ts - 4);
    const cx = tx + ts / 2;
    const grad = g.createRadialGradient(cx, ty + ts * 0.36, 4, cx, ty + ts * 0.36, ts * 0.34);
    grad.addColorStop(0, '#fff4c2'); grad.addColorStop(1, 'rgba(255,214,102,0.0)');
    g.fillStyle = grad; g.fillRect(tx, ty, ts, ts);
    g.strokeStyle = '#d99a1c'; g.lineWidth = 3; g.beginPath(); g.arc(cx, ty + ts * 0.36, ts * 0.17, 0, Math.PI * 2); g.stroke(); // halo
    g.fillStyle = '#3f6f9a'; g.beginPath(); g.arc(cx, ty + ts * 0.36, ts * 0.1, 0, Math.PI * 2); g.fill(); // head, blue skin
    g.fillStyle = '#e8b53a'; g.beginPath(); g.moveTo(cx - ts * 0.19, ty + ts * 0.74); g.quadraticCurveTo(cx, ty + ts * 0.40, cx + ts * 0.19, ty + ts * 0.74); g.closePath(); g.fill(); // seated body, saffron-yellow cloth
    g.fillStyle = '#d96a8a'; // lotus petals
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(cx + i * ts * 0.08, ty + ts * 0.82, ts * 0.05, ts * 0.09, i * 0.22, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e8932a'; // marigold garland across the top
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(tx + 8 + i * ((ts - 16) / 8), ty + 10 + Math.sin(i / 8 * Math.PI) * 10, 5, 0, Math.PI * 2); g.fill(); }
    // notice
    bilingual(g, 'यहाँ पेशाब करना मना है', 'Do not urinate here', c, { x: tx + ts + 12 - c.x, y: 16, w: c.w - (tx + ts + 12 - c.x) - 22, h: c.h - 32 }, '#7a1a14', { maxHiPx: 70 });
    wear(g, c, 160, 11);
  }

  // ---- slogans: hand-painted letters on bare wall, whitewashed half over by someone else ----
  const slogan = (c, hi, en, fg, over, seed, symbol) => {
    g.save();
    const tmp = { x: c.x, y: c.y, w: c.w, h: c.h };
    bilingual(g, hi, en, tmp, { x: 150, y: 10, w: c.w - 170, h: c.h - 20 }, fg, { maxHiPx: 78 });
    // plain generic symbol (no party mark): a sun with rays, or a five-point star in a ring
    const sx = c.x + 72, sy = c.y + c.h / 2;
    g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 6;
    if (symbol === 'sun') {
      g.beginPath(); g.arc(sx, sy, 22, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(sx + Math.cos(a) * 32, sy + Math.sin(a) * 32); g.lineTo(sx + Math.cos(a) * 52, sy + Math.sin(a) * 52); g.stroke(); }
    } else {
      g.beginPath(); g.arc(sx, sy, 54, 0, Math.PI * 2); g.stroke();
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 34, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
      g.closePath(); g.fill();
    }
    // the paint-over: ragged brush strokes of limewash across a part of it, letters showing through at the edge
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = over;
    const x0 = c.x + (seed === 1 ? c.w * 0.5 : c.w * 0.34);
    for (let k = 0; k < 14; k++) {
      const y = c.y + k * (c.h / 13) - 4;
      const x = x0 + (rnd(seed * 10 + k) - 0.5) * 36;
      g.globalAlpha = 0.5 + rnd(seed * 50 + k) * 0.3; // limewash dries patchy, the old letters ghost through
      const run = c.x + c.w - x - 4 - rnd(seed * 70 + k) * 90;
      g.fillRect(x, y + rnd(seed * 90 + k) * 4, run, c.h / 13 + 5);
    }
    g.globalAlpha = 0.55;
    for (let k = 0; k < 8; k++) g.fillRect(x0 - 40 - rnd(seed + k) * 30, c.y + rnd(seed * 3 + k) * c.h, 60 + rnd(seed + k * 5) * 40, 6);
    g.restore();
    wear(g, c, 220, seed * 17);
  };
  slogan(CELLS.slogan1, 'विकास को वोट दें', 'Vote for Progress', '#8c1d18', '#e2dac3', 1, 'sun');
  slogan(CELLS.slogan2, 'हमारा नेता, हमारी शान', 'Our Leader, Our Pride', '#1f3f7a', '#d9d2bd', 2, 'star');

  // ---- chalk cricket score on a blackboard-painted patch ----
  {
    const c = CELLS.cricket;
    g.fillStyle = '#26302a'; g.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    g.strokeStyle = '#6a4a2a'; g.lineWidth = 6; g.strokeRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 12; // old rubbed-out smears
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(c.x + 30 + i * 140, c.y + 40 + i * 6); g.lineTo(c.x + 150 + i * 140, c.y + 90 + i * 10); g.stroke(); }
    bilingual(g, 'हमारी टीम 54/2', 'Our XI 54/2 after 6 overs', c, { x: 20, y: 14, w: c.w - 40, h: c.h - 28 }, '#f4f1e6', { maxHiPx: 84 });
    wear(g, c, 120, 31);
  }

  // ---- children's chalk drawings in coloured chalk on a lime-washed strip ----
  {
    const c = CELLS.kids;
    const ch = (col) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; };
    const ox = c.x, oy = c.y;
    ch('#d94a4a'); g.strokeRect(ox + 40, oy + 100, 90, 80); g.beginPath(); g.moveTo(ox + 30, oy + 100); g.lineTo(ox + 85, oy + 52); g.lineTo(ox + 140, oy + 100); g.stroke(); g.strokeRect(ox + 72, oy + 138, 26, 42); // house
    ch('#e8b020'); g.beginPath(); g.arc(ox + 210, oy + 56, 22, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g.beginPath(); g.moveTo(ox + 210 + Math.cos(a) * 30, oy + 56 + Math.sin(a) * 30); g.lineTo(ox + 210 + Math.cos(a) * 44, oy + 56 + Math.sin(a) * 44); g.stroke(); } // sun
    ch('#3f86c9'); // stick family: three figures
    for (let k = 0; k < 3; k++) {
      const fx = ox + 280 + k * 62, s = k === 1 ? 0.7 : 1;
      g.beginPath(); g.arc(fx, oy + 76 - 0, 13 * s, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(fx, oy + 76 + 13 * s); g.lineTo(fx, oy + 76 + 13 * s + 52 * s); g.moveTo(fx - 22 * s, oy + 76 + 32 * s); g.lineTo(fx + 22 * s, oy + 76 + 32 * s); g.moveTo(fx, oy + 76 + 13 * s + 52 * s); g.lineTo(fx - 16 * s, oy + 76 + 13 * s + 92 * s); g.moveTo(fx, oy + 76 + 13 * s + 52 * s); g.lineTo(fx + 16 * s, oy + 76 + 13 * s + 92 * s); g.stroke();
    }
    ch('#d94a8a'); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(ox + 520 + Math.cos(i * 1.256) * 20, oy + 80 + Math.sin(i * 1.256) * 20, 12, 0, Math.PI * 2); g.stroke(); } // flower
    ch('#3a9a4a'); g.beginPath(); g.moveTo(ox + 520, oy + 100); g.quadraticCurveTo(ox + 540, oy + 150, ox + 520, oy + 200); g.stroke(); g.beginPath(); g.ellipse(ox + 546, oy + 150, 16, 8, -0.5, 0, Math.PI * 2); g.stroke();
    ch('#e8e8e0'); // wobbly "A B C" and a hopscotch grid
    g.font = `700 54px ${HI_FAMILY}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('क ख ग', ox + 590, oy + 90);
    for (let i = 0; i < 4; i++) g.strokeRect(ox + 600 + (i % 2) * 44, oy + 110 + Math.floor(i / 2) * 44 + 40 * 0, 44, 44);
    ch('#e0872a'); g.beginPath(); g.moveTo(ox + 40, oy + 214); g.bezierCurveTo(ox + 200, oy + 190, ox + 360, oy + 232, ox + 560, oy + 208); g.stroke(); // ground line scribble
    wear(g, c, 160, 41);
  }

  // ---- To Let on a locked house: white board, red lettering, a hand-painted padlock ----
  {
    const c = CELLS.tolet;
    g.fillStyle = '#f1ede0'; roundRect(g, c.x + 3, c.y + 3, c.w - 6, c.h - 6, 10); g.fill();
    g.strokeStyle = '#a02a1e'; g.lineWidth = 5; roundRect(g, c.x + 10, c.y + 10, c.w - 20, c.h - 20, 8); g.stroke();
    bilingual(g, 'किराये के लिए', 'TO LET', c, { x: 20, y: 18, w: c.w - 150, h: c.h - 36 }, '#a02a1e', { maxHiPx: 74 });
    // padlock painted at the right
    const px = c.x + c.w - 80, py = c.y + c.h / 2 + 10;
    g.strokeStyle = '#444'; g.lineWidth = 9; g.beginPath(); g.arc(px, py - 18, 22, Math.PI, 0); g.stroke();
    g.fillStyle = '#6a6a66'; roundRect(g, px - 34, py - 18, 68, 56, 8); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(px, py + 6, 7, 0, Math.PI * 2); g.fill(); g.fillRect(px - 3, py + 8, 6, 16);
    wear(g, c, 120, 51);
  }

  // ---- shaadi card pasted on the gate: red card, gold border, a ganesh-free plain motif (kalash-less: just marigolds) ----
  {
    const c = CELLS.card;
    g.fillStyle = '#b3262e'; g.fillRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    g.strokeStyle = '#e6c25a'; g.lineWidth = 3; g.strokeRect(c.x + 10, c.y + 10, c.w - 20, c.h - 20);
    g.fillStyle = '#e6c25a';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(c.x + 24 + i * 22, c.y + 30, 7, 0, Math.PI * 2); g.fill(); } // marigold string
    bilingual(g, 'शुभ विवाह', 'Wedding', c, { x: 14, y: 54, w: c.w - 28, h: 70 }, '#f6e8b8', { maxHiPx: 40 });
    bilingual(g, 'रवि संग सुनीता', 'Ravi and Sunita', c, { x: 14, y: 130, w: c.w - 28, h: 80 }, '#f6e8b8', { maxHiPx: 34 });
    g.fillStyle = 'rgba(235,225,190,0.7)'; // tape at the corners
    g.fillRect(c.x, c.y, 26, 14); g.fillRect(c.x + c.w - 26, c.y, 26, 14);
    wear(g, c, 40, 61);
  }

  // ---- PCO STD ISD board: yellow with black, as the roadside booths had ----
  {
    const c = CELLS.pco;
    g.fillStyle = '#f2c230'; g.fillRect(c.x, c.y, c.w, c.h);
    g.strokeStyle = '#1c1c1c'; g.lineWidth = 8; g.strokeRect(c.x + 8, c.y + 8, c.w - 16, c.h - 16);
    bilingual(g, 'पी.सी.ओ.', 'PCO   STD   ISD', c, { x: 18, y: 18, w: c.w - 36, h: c.h - 36 }, '#1c1c1c', { maxHiPx: 64 });
    wear(g, c, 60, 71);
  }

  // ---- yesterday's newspaper, folded: masthead + columns ----
  {
    const c = CELLS.news;
    g.fillStyle = '#d8d2bc'; g.fillRect(c.x, c.y, c.w, c.h);
    g.fillStyle = '#2a2a2a';
    bilingual(g, 'दैनिक समाचार', 'Daily News', c, { x: 8, y: 4, w: c.w - 16, h: 44 }, '#1c1c1c', { maxHiPx: 26 });
    for (let col = 0; col < 3; col++) for (let r = 0; r < 12; r++) {
      g.fillStyle = 'rgba(40,40,40,0.55)'; g.fillRect(c.x + 8 + col * 60, c.y + 54 + r * 7, 46 - (rnd(col * 20 + r) * 12), 3);
    }
    g.fillStyle = 'rgba(70,70,70,0.45)'; g.fillRect(c.x + 8, c.y + 54, 56, 28); // photo block
  }

  // ---- kiosk shutter: rolled-steel slats, painted blue-grey, scuffed (alpha-opaque, shaded with the lit metal below) ----
  {
    const c = CELLS.shutter;
    g.fillStyle = '#6f7e8a'; g.fillRect(c.x, c.y, c.w, c.h);
    for (let y = 0; y < c.h; y += 14) {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(c.x, c.y + y, c.w, 3);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(c.x, c.y + y + 3, c.w, 2);
    }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${90 + rnd(i) * 60},${50 + rnd(i + 1) * 30},30,${0.12 + rnd(i + 2) * 0.2})`; g.fillRect(c.x + rnd(i + 3) * c.w, c.y + rnd(i + 4) * c.h, 6 + rnd(i + 5) * 30, 2 + rnd(i + 6) * 4); } // rust streaks
    g.fillStyle = '#2a2a2a'; g.fillRect(c.x + c.w / 2 - 40, c.y + c.h - 40, 80, 10); // pull handle
    g.fillStyle = '#6a6a66'; g.fillRect(c.x + c.w / 2 + 50, c.y + c.h - 30, 18, 24); // padlock
  }
  const d = CELLS.dark; g.fillStyle = '#7a7a76'; g.fillRect(d.x, d.y, d.w, d.h);
}

// ---------- geometry helpers ----------
function quadGeo(w, h, c, mirror = false) {
  const geo = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = uvOf(c);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  void mirror;
  return geo;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function placed(geo, x, y, z, ry, rx = 0) {
  return geo.applyMatrix4(_m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, 0)), new THREE.Vector3(1, 1, 1)));
}

/** The compound-wall run that starts at map point (ax, az) -> world; returns its geometry helpers. */
function findRun(wallName, ax, az) {
  const entry = MAP_COMPOUND_WALLS.find((w) => w.name === wallName);
  if (!entry) throw new Error(`wallWriting: no compound wall "${wallName}"`);
  for (const line of entry.lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      if (Math.abs(line[i][0] - ax) < 0.05 && Math.abs(line[i][1] - az) < 0.05) {
        const a = { x: line[i][0] + 600, z: line[i][1] }, b = { x: line[i + 1][0] + 600, z: line[i + 1][1] };
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        return { a, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, len };
      }
    }
  }
  throw new Error(`wallWriting: wall "${wallName}" has no run starting at ${ax},${az}`);
}

export function createWallWriting(scene) {
  // ---- atlas ----
  const canvas = document.createElement('canvas');
  canvas.width = AW; canvas.height = AH;
  const g = canvas.getContext('2d');
  paintAtlas(g);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const repaint = () => { paintAtlas(g); tex.needsUpdate = true; };
  Promise.all([document.fonts.load(hiFont(40), 'क'), document.fonts.load(enFont(40), 'H'), document.fonts.ready]).then(repaint, () => {});
  const decalMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.92, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  decalMat.name = 'wall_writing'; // elevated wall fixtures: exempt from the ground-contact check like signboards

  const decals = [];
  const sz = (c) => [c.w / PPM, c.h / PPM];

  /** A piece on both faces of a compound-wall run, `s` metres along it (centre), y centre `y`. */
  const onWall = (wall, ax, az, s, cell, y = 0.76, scale = 1) => {
    const r = findRun(wall, ax, az);
    const [w, h] = sz(CELLS[cell]);
    const cx = r.a.x + r.dx * s, cz = r.a.z + r.dz * s;
    for (const side of [1, -1]) {
      const nx = -r.dz * side, nz = r.dx * side, off = 0.12 + 0.012;
      decals.push(placed(quadGeo(w * scale, h * scale, CELLS[cell]), cx + nx * off, y, cz + nz * off, Math.atan2(nx, nz)));
    }
  };
  onWall('Tyre repair shop', 27.8, -106.8, 1.5, 'peshab', 0.76, 1);
  onWall('Truck weighbridge', 122.7, -100.7, 2.0, 'slogan1', 0.76, 1);
  onWall('Petrol pump', -42.2, -154.1, 6.0, 'slogan2', 0.76, 1);
  onWall('Tubewell and pump room', 128.3, 38.5, 2.0, 'cricket', 0.76, 1);
  onWall('Creche and preschool (anganwadi)', -23.6, 103.6, 2.0, 'kids', 0.72, 1);
  onWall('Sweet shop (halwai)', 40.3, 19.4, 1.75, 'card', 0.78, 1);
  onWall('General store', 24.1, 49, 1.75, 'tolet', 0.74, 1);

  // ---- newspaper on the open-air barber's tool box (src/lifeScenes.js: scene at chaupal local (-6.4, 6.8), yaw 2.4, box at (0.95, 0.85), top y 0.30) ----
  {
    const A = ANCHORS.yard_chaupal;
    const o = localPt('yard_chaupal', -6.4, 6.8);
    const th = (A.ry || 0) + 2.4;
    const lx = 0.95, lz = 0.85;
    const wx = o.x + lx * Math.cos(th) + lz * Math.sin(th), wz = o.z - lx * Math.sin(th) + lz * Math.cos(th);
    const geo = quadGeo(0.38, 0.28, CELLS.news);
    decals.push(placed(geo, wx, 0.318, wz, th + 0.4, -Math.PI / 2));
  }

  // ---- PCO kiosk, shutter down, just outside the bus stop's west wall end (front to the highway side, +z) ----
  const hard = []; // metal geometries (kiosk + cycle), each with position/normal/uv/color
  const colliders = [];
  const prep = (geo, rgb) => {
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.index) throw new Error('wallWriting: expected indexed geometry');
    const n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = rgb[0]; col[i * 3 + 1] = rgb[1]; col[i * 3 + 2] = rgb[2]; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  };
  const boxG = (w, h, d, x, y, z, ry, rgb, tile = 1.0) => {
    const m = texturedBox(w, h, d, 'metal', { tileSize: tile });
    return prep(placed(m.geometry, x, y, z, ry), rgb);
  };
  {
    const kx = 600 - 55.4, kz = -106.2, ky = 0; // kiosk centre; its back is to the wall end
    const W = 1.3, H = 2.2, D = 1.2;
    const col = [0.55, 0.62, 0.68];
    hard.push(boxG(0.06, H, D, kx - W / 2, H / 2, kz, 0, col)); // side walls
    hard.push(boxG(0.06, H, D, kx + W / 2, H / 2, kz, 0, col));
    hard.push(boxG(W, H, 0.06, kx, H / 2, kz - D / 2, 0, col)); // back
    hard.push(boxG(W + 0.2, 0.08, D + 0.25, kx, H + 0.04, kz + 0.06, 0, [0.42, 0.36, 0.32])); // flat roof lip
    hard.push(boxG(W, 0.12, 0.06, kx, H - 0.06, kz + D / 2 - 0.03, 0, col)); // shutter box above the opening
    hard.push(boxG(W, 0.9, 0.14, kx, 0.45, kz + D / 2 - 0.05, 0, [0.5, 0.56, 0.6])); // counter base under the opening
    // shutter (atlas, drawn pulled down over the opening) and the PCO board above it
    const sh = quadGeo(W - 0.08, H - 1.0, CELLS.shutter);
    decals.push(placed(sh, kx, 0.9 + (H - 1.0) / 2 - 0.2, kz + D / 2 + 0.03, 0));
    const [bw, bh] = [W - 0.1, (W - 0.1) * CELLS.pco.h / CELLS.pco.w];
    decals.push(placed(quadGeo(bw, bh, CELLS.pco), kx, H - 0.12 - bh / 2 + 0.02, kz + D / 2 + 0.035, 0));
    colliders.push({ minX: kx - W / 2 - 0.1, maxX: kx + W / 2 + 0.1, minZ: kz - D / 2 - 0.05, maxZ: kz + D / 2 + 0.15 });
  }

  // ---- child-seat cycle leaning on the school's outer south wall beside the gate (school anchor, wall at local z -12, gate pillars at x +-2.7) ----
  {
    const S = ANCHORS.school;
    const cx = S.x + 5.6, cz = S.z - 12 - 0.62;
    const tyre = [0.07, 0.07, 0.07], frame = [0.55, 0.12, 0.1], steel = [0.7, 0.72, 0.74], seat = [0.15, 0.35, 0.65];
    const R = 0.34;
    const torus = (x, y, z, r, tube, rgb) => {
      const t = new THREE.TorusGeometry(r, tube, 6, 24);
      const u = t.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 2, u.getY(i) * 0.4);
      return prep(placed(t, x, y, z, 0), rgb);
    };
    const rod = (x0, y0, x1, y1, th, rgb) => { // frame tube in the cycle's x-y plane at z = cz
      const len = Math.hypot(x1 - x0, y1 - y0);
      const m = texturedBox(len, th, th, 'metal', { tileSize: 1.0 });
      const gm = m.geometry;
      gm.applyMatrix4(_m.compose(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, cz), _q.setFromEuler(_e.set(0, 0, Math.atan2(y1 - y0, x1 - x0))), new THREE.Vector3(1, 1, 1)));
      return prep(gm, rgb);
    };
    // the cycle stands side-on to the wall (long axis along x); built in world axes directly, wheels in the x-y plane
    const rw = { x: cx - 0.52, y: R }, fw = { x: cx + 0.52, y: R };
    hard.push(torus(rw.x, rw.y, cz, R, 0.025, tyre), torus(fw.x, fw.y, cz, R, 0.025, tyre));
    hard.push(torus(rw.x, rw.y, cz, R - 0.03, 0.006, steel), torus(fw.x, fw.y, cz, R - 0.03, 0.006, steel)); // rims
    const bb = { x: cx - 0.06, y: 0.3 }, st = { x: cx - 0.2, y: 0.88 }, ht = { x: cx + 0.34, y: 0.86 };
    hard.push(rod(rw.x, rw.y, bb.x, bb.y, 0.025, frame), rod(bb.x, bb.y, st.x, st.y, 0.028, frame), rod(rw.x, rw.y, st.x, st.y, 0.022, frame));
    hard.push(rod(st.x, st.y, ht.x, ht.y, 0.03, frame), rod(bb.x, bb.y, ht.x, ht.y, 0.03, frame), rod(ht.x, ht.y, fw.x, fw.y, 0.026, steel));
    hard.push(boxG(0.26, 0.05, 0.14, st.x - 0.02, 0.93, cz, 0, [0.1, 0.1, 0.1])); // saddle
    hard.push(boxG(0.04, 0.04, 0.5, ht.x + 0.03, 0.97, cz, 0, steel)); // handlebar across z
    hard.push(boxG(0.34, 0.04, 0.2, rw.x + 0.08, 0.62, cz, 0, steel)); // carrier rack over the rear wheel
    // the child seat: a small bucket seat on the rack with a back and two foot rests
    hard.push(boxG(0.24, 0.05, 0.22, rw.x + 0.1, 0.68, cz, 0, seat));
    hard.push(boxG(0.05, 0.3, 0.22, rw.x - 0.03, 0.82, cz, 0, seat));
    hard.push(boxG(0.14, 0.03, 0.05, rw.x + 0.22, 0.45, cz + 0.17, 0, steel), boxG(0.14, 0.03, 0.05, rw.x + 0.22, 0.45, cz - 0.17, 0, steel));
    hard.push(boxG(0.03, 0.5, 0.03, cx - 0.2, 0.6, cz + 0.28, 0, steel)); // kickstand propped back
    colliders.push({ minX: cx - 0.95, maxX: cx + 0.95, minZ: cz - 0.3, maxZ: cz + 0.3 });
  }

  // ---- merge and add ----
  const root = new THREE.Group();
  root.name = 'wall_writing';
  const decalMesh = new THREE.Mesh(mergeGeometries(decals.map((d) => { for (const k of Object.keys(d.attributes)) if (!['position', 'normal', 'uv'].includes(k)) d.deleteAttribute(k); return d; })), decalMat);
  decalMesh.name = 'wall_writing_decals';
  decalMesh.renderOrder = 2;
  root.add(decalMesh);
  const metal = new THREE.Mesh(mergeGeometries(hard), texturedBox(1, 1, 1, 'metal', { tileSize: 1 }).material);
  metal.name = 'wall_writing_metal';
  metal.castShadow = true; metal.receiveShadow = true;
  metal.userData.colliderBoxes = colliders;
  root.add(metal);
  scene.add(root);
  return root;
}
