import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const SRC = '/mnt/user-data/uploads/inbox/Wall posters/cutouts/';
const OUT = 'public/assets/posters/wall/';
const PS = 1024, G = 4;
const rows = fs.readFileSync(SRC + 'cutout-index.md', 'utf8').split('\n').filter(l => /^\| \d+_.*\.webp/.test(l));
let items = [];
for (const l of rows) {
  const c = l.split('|').map(s => s.trim());
  const file = c[1];
  if (file.startsWith('10_')) continue;
  const id = file.replace(/\.webp$/, '').split('_').pop();
  const [w, h] = c[5].split('x').map(s => parseFloat(s));
  const ppm = h < 0.5 ? 520 : 300;
  items.push({ id, file, kind: c[2], treatment: c[3].startsWith('pasted') ? 'pasted' : 'painted', neon: /neon/.test(c[3]), w, h, pw: Math.round(w * ppm), ph: Math.round(h * ppm) });
}
items.sort((a, b) => b.ph - a.ph || b.pw - a.pw);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function shadowBuf() {
  const n = 64, b = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const px = Math.abs(x + 0.5 - n / 2) - (n / 2 - 22), py = Math.abs(y + 0.5 - n / 2) - (n / 2 - 22);
    const d = Math.hypot(Math.max(px, 0), Math.max(py, 0)) + Math.min(Math.max(px, py), 0) - 12 + 12;
    const a = 0.55 * (1 - sm(0, 22, d));
    b[(y * n + x) * 4 + 3] = Math.round(a * 255);
  }
  return sharp(b, { raw: { width: n, height: n, channels: 4 } }).png().toBuffer();
}
function streakBuf() {
  const w = 32, h = 128, b = Buffer.alloc(w * h * 4);
  let s = 12345; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const cols = [];
  for (let x = 0; x < w; x++) cols.push(r() < 0.35 ? 0.4 + 0.6 * r() : 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = cols[x] * (1 - y / h) ** 1.5 * 0.8;
    const i = (y * w + x) * 4; b[i] = 70; b[i + 1] = 45; b[i + 2] = 28; b[i + 3] = Math.round(a * 255);
  }
  return sharp(b, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
const shadow = await shadowBuf(), streak = await streakBuf();
const pages = []; let remaining = items.slice();
while (remaining.length) {
  const shelves = []; const placed = []; const left = [];
  const tryPlace = (it) => {
    for (const s of shelves) if (it.ph <= s.h && s.x + it.pw <= PS) { const p = { it, x: s.x, y: s.y }; s.x += it.pw + G; return p; }
    const y = shelves.length ? shelves.at(-1).y + shelves.at(-1).h + G : 0;
    if (y + it.ph > PS) return null;
    const s = { y, h: it.ph, x: it.pw + G }; shelves.push(s); return { it, x: 0, y };
  };
  let extras = null;
  for (const it of remaining) {
    const p = tryPlace(it);
    if (p) placed.push(p); else left.push(it);
    if (!extras && shelves.length) {
      const s = shelves[0];
      if (s.x + 32 + G + 64 <= PS) {
        extras = { streak: [s.x, s.y], shadow: [s.x + 32 + G, s.y] };
        s.x += 32 + G + 64 + G;
      }
    }
  }
  if (!extras) throw new Error('no room for extras');
  pages.push({ placed, extras }); remaining = left;
}
const atlas = { pages: [], cells: {} };
let total = 0;
for (let pi = 0; pi < pages.length; pi++) {
  const { placed, extras } = pages[pi];
  const comps = [];
  const uv = (x, y, w, h) => [(x + .5) / PS, 1 - (y + h - .5) / PS, (x + w - .5) / PS, 1 - (y + .5) / PS];
  for (const { it, x, y } of placed) {
    const buf = await sharp(SRC + it.file).ensureAlpha().resize(it.pw, it.ph, { fit: 'fill' }).png().toBuffer();
    comps.push({ input: buf, left: x, top: y });
    atlas.cells[it.id] = { page: pi, uv: uv(x, y, it.pw, it.ph), w: it.w, h: it.h, kind: it.kind, treatment: it.treatment, neon: it.neon };
  }
  comps.push({ input: shadow, left: extras.shadow[0], top: extras.shadow[1] });
  comps.push({ input: streak, left: extras.streak[0], top: extras.streak[1] });
  const file = `page${pi}.webp`;
  await sharp({ create: { width: PS, height: PS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).webp({ quality: 80, alpha: 80 }).toFile(OUT + file);
  total += fs.statSync(OUT + file).size;
  atlas.pages.push({ file, w: PS, h: PS, shadow: uv(extras.shadow[0], extras.shadow[1], 64, 64), streak: uv(extras.streak[0], extras.streak[1], 32, 128) });
}
fs.writeFileSync('src/kit/wallPosterAtlas.json', JSON.stringify(atlas));
console.log('pages', pages.length, 'KB', Math.round(total / 1024), 'cells', Object.keys(atlas.cells).length);
