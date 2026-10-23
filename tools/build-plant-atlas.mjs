// Builds the two alpha-cutout plant atlases from real ambientCG (CC0) leaf photo sets.
//   node tools/build-plant-atlas.mjs <dir with unzipped ambientCG sets, one folder per asset>
// Output: public/assets/plants/garden_atlas.webp and tree_atlas.webp (3x2 cells of 341).
// Leaves are cut out of the photo sheets (Color + Opacity) and arranged into sprigs; stems and
// the marigold/bougainvillea flower heads are the only drawn parts (no CC0 flower sheet exists).
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = process.argv[2] || 'tmp/atlas';
const OUT = 'public/assets/plants';
fs.mkdirSync(OUT, { recursive: true });

let seed = 20261023;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rr = (a, b) => a + rnd() * (b - a);

/** Cut every leaf out of one atlas set. `rot` turns each sprite so its tip points up (base at the bottom). */
async function loadSet(id, rot = 0, minArea = 1500) {
  const dir = path.join(SRC, id);
  const colPath = path.join(dir, `${id}_1K-PNG_Color.png`);
  const opaPath = path.join(dir, `${id}_1K-PNG_Opacity.png`);
  const { data: opa, info } = await sharp(opaPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const label = new Int32Array(W * H);
  const comps = [];
  const stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (opa[s] < 128 || label[s]) continue;
    const id2 = comps.length + 1;
    let sp = 0, area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    stack[sp++] = s; label[s] = id2;
    while (sp) {
      const p = stack[--sp]; area++;
      const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
        if (opa[q] >= 128 && !label[q]) { label[q] = id2; stack[sp++] = q; }
      }
    }
    comps.push({ id: id2, area, x0, y0, x1, y1 });
  }
  const color = await sharp(colPath).removeAlpha().raw().toBuffer();
  const sprites = [];
  for (const c of comps.filter((k) => k.area >= minArea)) {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
    const rgba = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sp = (c.y0 + y) * W + (c.x0 + x);
      const o = (y * w + x) * 4;
      rgba[o] = color[sp * 3]; rgba[o + 1] = color[sp * 3 + 1]; rgba[o + 2] = color[sp * 3 + 2];
      rgba[o + 3] = label[sp] === c.id ? opa[sp] : 0;
    }
    let img = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
    if (rot) img = img.rotate(rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
    sprites.push(await img.png().toBuffer());
  }
  console.log(id, sprites.length, 'sprites');
  return sprites;
}

/** Leaf = {set, tint:[bright,sat,hue]}; places sprite so its base sits on (ax, ay), pointing `ang` (rad, 0 = up, clockwise). */
async function leaf(list, sprites, ax, ay, ang, len, o = {}) {
  const spr = sprites[(rnd() * sprites.length) | 0];
  const m = await sharp(spr).metadata();
  const aspect = (o.stretch ?? 1);
  const h = Math.max(4, Math.round(len));
  const w = Math.max(3, Math.round((m.width / m.height) * len * aspect));
  const t = o.tint || [1, 1, 0];
  const b = t[0] * rr(0.85, 1.12);
  let p = sharp(spr).resize(w, h, { fit: 'fill' }).modulate({ brightness: b, saturation: t[1] * rr(0.9, 1.1), hue: Math.round(t[2] + rr(-6, 6)) });
  if (o.flip) p = p.flop();
  const deg = (ang * 180) / Math.PI;
  const buf = await p.rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const rm = await sharp(buf).metadata();
  const bx = -(h / 2) * Math.sin(ang), by = (h / 2) * Math.cos(ang);
  list.push({ input: buf, left: Math.round(ax - (rm.width / 2 + bx)), top: Math.round(ay - (rm.height / 2 + by)) });
}

const stem = (svg, x0, y0, x1, y1, w, col, bend = 0) => {
  svg.push(`<path d="M${x0},${y0} Q${(x0 + x1) / 2 + bend},${(y0 + y1) / 2} ${x1},${y1}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`);
};

/** Crops a composite list to a transparent cell-sized RGBA, stems (svg) underneath. */
async function cell(S, svg, leaves) {
  const base = sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const layers = [];
  if (svg.length) layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${svg.join('')}</svg>`), left: 0, top: 0 });
  layers.push(...leaves);
  // composite onto a larger transparent canvas so rotated leaves poking over the edge are clipped, not rejected
  const PAD = S;
  const big = await sharp({ create: { width: S * 3, height: S * 3, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((l) => ({ ...l, left: l.left + PAD, top: l.top + PAD }))).png().toBuffer();
  void base;
  return sharp(big).extract({ left: PAD, top: PAD, width: S, height: S }).png().toBuffer();
}

/** Pinnate sprig: a curved rachis from (bx,by) toward ang, leaflets in pairs along it. */
async function pinnate(S, svg, leaves, sprites, { bx, by, ang, len, n, leafLen, spread = 1.0, col = '#5a5a30', tint, w = 3, stretch = 1, tip = true }) {
  const ex = bx + Math.sin(ang) * len, ey = by - Math.cos(ang) * len;
  stem(svg, bx, by, ex, ey, w, col);
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const px = bx + (ex - bx) * t, py = by + (ey - by) * t;
    const ll = leafLen * (1 - t * 0.35) * rr(0.85, 1.1);
    for (const side of [-1, 1]) await leaf(leaves, sprites, px, py, ang + side * spread * rr(0.85, 1.15), ll, { tint, stretch });
  }
  if (tip) await leaf(leaves, sprites, ex, ey, ang, leafLen * 0.8, { tint, stretch });
}

/** Single leaves on short petioles fanning from a base (hearts, round leaves). */
async function fan(S, svg, leaves, sprites, { bx, by, count, reach, leafLen, tint, fanAng = 1.1, col = '#5a5a30', stretch = 1, yScatter = 0 }) {
  for (let i = 0; i < count; i++) {
    const a = (i / Math.max(1, count - 1) - 0.5) * 2 * fanAng + rr(-0.15, 0.15);
    const r = reach * rr(0.5, 1);
    const ex = bx + Math.sin(a) * r, ey = by - Math.cos(a) * r - rr(0, yScatter);
    stem(svg, bx, by, ex, ey, 2.5, col);
    await leaf(leaves, sprites, ex, ey, a + rr(-0.3, 0.3), leafLen * rr(0.8, 1.15), { tint, stretch });
  }
}

// A pompom flower head (marigold): many petals in rings, warm gradient, darker core.
function pompom(svg, cx, cy, r, c0, c1) {
  const id = `g${Math.floor(rnd() * 1e9)}`;
  svg.push(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c1}"/><stop offset="0.7" stop-color="${c0}"/><stop offset="1" stop-color="#7a3a08"/></radialGradient></defs>`);
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`);
  for (let ring = 0; ring < 3; ring++) {
    const rad = r * (0.95 - ring * 0.28), n = 14 - ring * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
      const px = cx + Math.cos(a) * rad * 0.8, py = cy + Math.sin(a) * rad * 0.8;
      svg.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(r * 0.26).toFixed(1)}" ry="${(r * 0.38).toFixed(1)}" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${rnd() < 0.5 ? c0 : c1}" opacity="0.75" stroke="#8a4a10" stroke-width="0.6" stroke-opacity="0.5"/>`);
    }
  }
}

// A bougainvillea bract cluster: three papery heart-ish bracts, veined, with a tiny pale true flower.
function bract(svg, cx, cy, r, col, dark) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rnd() * 0.6;
    const px = cx + Math.cos(a) * r * 0.45, py = cy + Math.sin(a) * r * 0.45;
    const deg = ((a * 180) / Math.PI).toFixed(0);
    svg.push(`<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${deg})"><path d="M0,0 C${r * 0.5},${-r * 0.7} ${r * 1.3},${-r * 0.35} ${r * 1.05},${r * 0.05} C${r * 1.25},${r * 0.5} ${r * 0.4},${r * 0.75} 0,0Z" fill="${col}" stroke="${dark}" stroke-width="0.8" stroke-opacity="0.6"/><path d="M0,0 L${r * 0.95},0 M${r * 0.3},0 L${r * 0.7},${-r * 0.3} M${r * 0.3},0 L${r * 0.7},${r * 0.3}" stroke="${dark}" stroke-width="0.7" stroke-opacity="0.45" fill="none"/></g>`);
  }
  svg.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="#f2ecd0"/>`);
}

// ------------------------------------------------------------------------------------------------
const sets = {
  neemLeaf: await loadSet('LeafSet022', 0),
  heart: await loadSet('LeafSet004', 0),
  moneyHeart: await loadSet('LeafSet023', -90),
  mango: await loadSet('LeafSet003', 0),
  sprig: await loadSet('LeafSet002', 0, 3000),
  round: await loadSet('LeafSet024', 0),
  lobed: await loadSet('LeafSet025', 0),
  banana: await loadSet('Foliage005', -90, 20000),
  blade: await loadSet('Foliage008', -90, 3000),
};

const DUSTY = [0.78, 0.7, 6]; // dusty olive: darker, less saturated, nudged away from lime
const DEEP = [0.62, 0.8, 8]; // deep neem green

// ---------- garden atlas (5 x 512) ----------
async function gardenCell(kind) {
  const S = 512, svg = [], leaves = [];
  if (kind === 0) { // marigold bed
    for (let i = 0; i < 9; i++) await fan(S, svg, leaves, sets.lobed, { bx: 256 + rr(-90, 90), by: 500, count: 1, reach: rr(60, 130), leafLen: rr(110, 170), tint: [0.75, 0.75, 6], fanAng: 0.6 });
    for (let i = 0; i < 26; i++) {
      const x = 256 + rr(-210, 210), y = 500 - rr(110, 230) * (1 - Math.abs(x - 256) / 330);
      stem(svg, 256 + (x - 256) * 0.5, 495, x, y + 16, 3, '#3d4a22');
    }
    for (let i = 0; i < 26; i++) {
      const x = 256 + rr(-210, 210), y = 500 - rr(110, 230) * (1 - Math.abs(x - 256) / 330);
      pompom(svg, x, y, rr(20, 30), rnd() < 0.55 ? '#e07b12' : '#eab320', rnd() < 0.5 ? '#f6c040' : '#f09a26');
    }
    // overlay a few more leaves above the stems for depth
    for (let i = 0; i < 8; i++) await leaf(leaves, sets.lobed, 256 + rr(-170, 170), 500, rr(-0.9, 0.9), rr(90, 130), { tint: [0.7, 0.75, 6] });
  } else if (kind === 1) { // banana clump: broad arching fronds + pale midribs
    svg.push('<rect x="226" y="300" width="60" height="212" rx="14" fill="#6b7a3e"/><rect x="226" y="300" width="60" height="212" rx="14" fill="none" stroke="#3f4a24" stroke-width="3"/>');
    for (let i = 0; i < 7; i++) {
      const a = -1.15 + (i / 6) * 2.3 + rr(-0.12, 0.12);
      await leaf(leaves, sets.mango, 256, 320, a, rr(330, 400), { tint: [0.95, 1.5, 4], stretch: 0.8 });
    }
    for (let i = 0; i < 7; i++) {
      const a = -1.15 + (i / 6) * 2.3;
      svg.push(`<path d="M256,320 L${(256 + Math.sin(a) * 300).toFixed(0)},${(320 - Math.cos(a) * 300).toFixed(0)}" stroke="#b7c27a" stroke-width="3" opacity="0.7"/>`);
    }
  } else if (kind === 2) { // tulsi: compact dense bush of small round leaves + purple flower spikes
    for (let i = 0; i < 12; i++) stem(svg, 256, 500, 256 + rr(-150, 150), 500 - rr(140, 330), 3, '#5b4a3a');
    for (let i = 0; i < 16; i++) {
      const x = 256 + rr(-60, 60);
      svg.push(`<rect x="${x.toFixed(0)}" y="${(60 + rr(0, 60)).toFixed(0)}" width="4" height="${(40 + rr(0, 30)).toFixed(0)}" fill="#8f7aae"/>`);
    }
    for (let i = 0; i < 90; i++) {
      const y = 480 - Math.pow(rnd(), 0.8) * 330, half = 60 + (480 - y) * 0.38;
      await leaf(leaves, sets.round, 256 + rr(-half, half), y, rr(-1.3, 1.3) + (rnd() < 0.5 ? Math.PI : 0), rr(46, 70), { tint: rnd() < 0.5 ? DEEP : DUSTY });
    }
  } else if (kind === 3) { // bougainvillea: dense small leaves with magenta bract clusters
    for (let i = 0; i < 70; i++) {
      const y = 490 - rnd() * 440;
      await leaf(leaves, sets.round, 256 + rr(-215, 215), y, rr(-3.14, 3.14), rr(38, 60), { tint: rnd() < 0.6 ? DEEP : DUSTY });
    }
    for (let i = 0; i < 46; i++) bract(svg, 256 + rr(-215, 215), 490 - rnd() * 430, rr(15, 24), rnd() < 0.72 ? '#b51f6c' : '#d9468e', '#6a0f3e');
  } else { // creeper (money plant): hanging vines with heart-shaped leaves, rooted at the base
    for (let i = 0; i < 10; i++) {
      let x = 256 + rr(-190, 190), y = 505;
      const pts = [[x, y]];
      while (y > 30 + rr(0, 70)) { x += rr(-14, 14); y -= 22; pts.push([x, y]); }
      svg.push(`<path d="M${pts.map((p) => p.join(',')).join(' L')}" stroke="#4a5a2a" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    }
    for (let i = 0; i < 150; i++) {
      const y = 495 - Math.pow(rnd(), 1.3) * 450;
      await leaf(leaves, sets.moneyHeart, 256 + rr(-210, 210), y, rr(-2.6, 2.6) + Math.PI, rr(48, 72), { tint: rnd() < 0.4 ? [0.85, 0.85, 4] : DUSTY });
    }
  }
  return cell(S, svg, leaves);
}

// ---------- tree atlas (4 x 2, 384 cells) ----------
const TS = 384;
async function treeCell(name) {
  const svg = [], leaves = [];
  const bx = TS / 2, by = TS * 0.96;
  if (name === 'neem') {
    for (let c = 0; c < 3; c++) await pinnate(TS, svg, leaves, sets.neemLeaf, { bx, by, ang: (c - 1) * 0.7, len: rr(210, 240), n: 7, leafLen: 56, spread: 1.05, col: '#4d5a2c', tint: DEEP });
  } else if (name === 'peepal') {
    for (let c = 0; c < 4; c++) {
      const ang = (c - 1.5) * 0.4;
      const ex = bx + Math.sin(ang) * 215, ey = by - Math.cos(ang) * 215;
      stem(svg, bx, by, ex, ey, 3, '#5b4d33');
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        for (const s of [-1, 1]) await leaf(leaves, sets.heart, bx + (ex - bx) * t, by + (ey - by) * t, ang + s * 0.85, 84 - t * 22, { tint: DUSTY });
      }
      await leaf(leaves, sets.heart, ex, ey, ang, 80, { tint: DUSTY });
    }
  } else if (name === 'mango') {
    for (let i = 0; i < 5; i++) {
      const py = by - i * 58, n = 2 + (i % 2);
      stem(svg, bx, by - i * 56 + 20, bx, py - 20, 3, '#4a3b25');
      for (let k = 0; k < n; k++) await leaf(leaves, sets.mango, bx + rr(-4, 4), py, (k - (n - 1) / 2) * 1.1 + rr(-0.25, 0.25), 150 - i * 12, { tint: [0.6, 0.8, 4], stretch: 0.62 });
    }
    await leaf(leaves, sets.mango, bx, by - 5 * 56, 0, 100, { tint: [0.6, 0.8, 4], stretch: 0.62 });
  } else if (name === 'babool') {
    for (let c = 0; c < 4; c++) await pinnate(TS, svg, leaves, sets.sprig, { bx, by, ang: (c - 1.5) * 0.5, len: rr(200, 250), n: 5, leafLen: 70, spread: 1.15, col: '#6b6a3a', tint: [0.62, 0.8, 10], w: 2.5 });
  } else { // eucalyptus: stem at the TOP, long narrow leaves hanging
    stem(svg, TS / 2, 20, TS / 2, 190, 4, '#6f6a55');
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1, py = 28 + i * 18;
      await leaf(leaves, sets.blade, TS / 2, py, Math.PI + side * (0.3 + rr(0, 0.35)), 190 - i * 8, { tint: [0.95, 0.5, 40], stretch: 0.9 });
    }
  }
  return cell(TS, svg, leaves);
}

const AS = 341; // final cell size: 3 x 2 cells keeps each atlas inside the 1024 px texture budget
async function writeAtlas(file, cells) {
  const comps = [];
  for (let i = 0; i < cells.length; i++) comps.push({ input: await sharp(cells[i]).resize(AS, AS).png().toBuffer(), left: (i % 3) * AS, top: Math.floor(i / 3) * AS });
  await sharp({ create: { width: 3 * AS, height: 2 * AS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).webp({ quality: 85, alphaQuality: 90 }).toFile(file);
  console.log('wrote', file, fs.statSync(file).size);
}

await writeAtlas(`${OUT}/garden_atlas.webp`, await Promise.all([0, 1, 2, 3, 4].map(() => null)).then(async () => {
  const out = [];
  for (let k = 0; k < 5; k++) out.push(await gardenCell(k));
  return out;
}));

const treeNames = ['neem', 'peepal', 'mango', 'babool', 'eucalyptus'];
const tcells = [];
for (const n of treeNames) tcells.push(await treeCell(n));
while (tcells.length < 8) tcells.push(await sharp({ create: { width: TS, height: TS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer());
await writeAtlas(`${OUT}/tree_atlas.webp`, tcells);
