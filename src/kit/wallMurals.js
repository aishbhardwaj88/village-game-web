import * as THREE from 'three';
import { drawBilingual } from '../signPaint.js';

/**
 * Painted posters and murals for bare exterior walls (S7 sprint, signage agent). Content rule (CLAUDE.md section 5b.2):
 * a flat-coloured wall is an automatic fail; section 5a: murals and painted signs are deliberate, never decoration to
 * skip. This paints a small shared set of designs (government-style welfare/hygiene slogans, bilingual per the section 7
 * signboard rule, plus generic folk-art wall murals) into ONE canvas atlas, then places them on a sparse, deterministic
 * subset of back/side walls of houses and shops under `?layout=new`.
 *
 * Caller contract: pass a flat list of wall "boxes", one per building, shape { x, z, ry, w, d, seed }:
 *   x, z   world position of the footprint centre (metres)
 *   ry     yaw (radians) — SAME convention as housesKit/shopsKit: local +z is the building's FRONT
 *   w, d   footprint width (front-facing) and depth (metres)
 *   seed   any integer unique-ish per building (index is fine) — picks design + placement, never random per frame
 * Returns { mesh, stats } — mesh is null when nothing was placed (empty input). Add mesh straight into the caller's
 * scene group; it is ONE merged BufferGeometry + ONE material, so it costs exactly one draw call total, however many
 * buildings use it.
 */

const CW = 448, CH = 640; // portrait poster cell, distinct from the 512x120 shop signboard cells
const COLS = 4, ROWS = 4, W = CW * COLS, H = CH * ROWS; // 1792 x 2560, runtime canvas only — never shipped as a file

function hash(n, s = 0) {
  const v = Math.sin(n * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// ---- generic line-art icons, drawn in the design's fg colour on transparent ground ----
function iconBroom(g, cx, cy, s) {
  g.beginPath(); g.moveTo(cx - 0.1 * s, cy - 0.7 * s); g.lineTo(cx + 0.25 * s, cy + 0.15 * s); g.lineWidth = 0.05 * s; g.stroke();
  g.beginPath();
  for (let i = -3; i <= 3; i++) { g.moveTo(cx + 0.25 * s, cy + 0.15 * s); g.lineTo(cx + 0.25 * s + i * 0.08 * s, cy + 0.6 * s); }
  g.lineWidth = 0.035 * s; g.stroke();
}
function iconDrop(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy - 0.5 * s);
  g.bezierCurveTo(cx + 0.38 * s, cy + 0.05 * s, cx + 0.3 * s, cy + 0.5 * s, cx, cy + 0.5 * s);
  g.bezierCurveTo(cx - 0.3 * s, cy + 0.5 * s, cx - 0.38 * s, cy + 0.05 * s, cx, cy - 0.5 * s);
  g.closePath(); g.fill();
}
function iconTree(g, cx, cy, s) {
  g.fillRect(cx - 0.06 * s, cy + 0.1 * s, 0.12 * s, 0.45 * s);
  g.beginPath(); g.arc(cx, cy - 0.15 * s, 0.4 * s, 0, Math.PI * 2); g.fill();
}
function iconBook(g, cx, cy, s) {
  g.beginPath(); g.moveTo(cx, cy - 0.3 * s); g.lineTo(cx - 0.45 * s, cy - 0.42 * s); g.lineTo(cx - 0.45 * s, cy + 0.32 * s); g.lineTo(cx, cy + 0.44 * s);
  g.lineTo(cx + 0.45 * s, cy + 0.32 * s); g.lineTo(cx + 0.45 * s, cy - 0.42 * s); g.closePath(); g.lineWidth = 0.045 * s; g.stroke();
  g.beginPath(); g.moveTo(cx, cy - 0.3 * s); g.lineTo(cx, cy + 0.44 * s); g.stroke();
}
function iconPencil(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.rotate(-0.5);
  g.fillRect(-0.12 * s, -0.5 * s, 0.24 * s, 0.85 * s);
  g.beginPath(); g.moveTo(-0.12 * s, -0.5 * s); g.lineTo(0, -0.68 * s); g.lineTo(0.12 * s, -0.5 * s); g.closePath(); g.fill();
  g.restore();
}
function iconFamily(g, cx, cy, s, fg) {
  const fig = (x, r) => { g.beginPath(); g.arc(cx + x * s, cy - 0.28 * s, r * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(cx + x * s, cy - 0.1 * s); g.lineTo(cx + x * s - r * 1.6 * s, cy + 0.42 * s); g.lineTo(cx + x * s + r * 1.6 * s, cy + 0.42 * s); g.closePath(); g.fill(); };
  fig(-0.28, 0.1); fig(0, 0.13); fig(0.3, 0.08);
}

// ---- pure-graphic folk-art murals (no text; generic, not any one temple's or artist's exact iconography) ----
// NOTE: no religious iconography here, ever (owner's order, 22 Nov, strict). The former 'devotional' design
// (lotus + om + diya) is removed on purpose, not pending review. Do not re-add any religious motif.
function muralRangoli(g, x, y, w, h, fg) {
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.34;
  g.strokeStyle = fg; g.lineWidth = r * 0.05;
  for (let ring = 1; ring <= 3; ring++) { g.beginPath(); g.arc(cx, cy, (r * ring) / 3, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.33, cy + Math.sin(a) * r * 0.33); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
    g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.09, 0, Math.PI * 2); g.fill();
  }
  // simple border, same motif repeated along the edge
  const n = 7;
  for (let i = 0; i < n; i++) { const px = x + w * ((i + 0.5) / n); g.beginPath(); g.arc(px, y + h * 0.06, w * 0.03, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(px, y + h * 0.94, w * 0.03, 0, Math.PI * 2); g.stroke(); }
}
function muralCowPeacock(g, x, y, w, h, fg) {
  const cx = x + w / 2, cy = y + h * 0.55, s = Math.min(w, h) * 0.5;
  g.fillStyle = fg;
  // cow: a simple folk-style silhouette, body + head + horns + tail, no detail that reads as a specific icon
  g.save(); g.translate(cx - s * 0.18, cy + s * 0.05);
  g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-s * 0.4, -s * 0.08, s * 0.16, s * 0.14, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-s * 0.48, -s * 0.2); g.lineTo(-s * 0.56, -s * 0.34); g.moveTo(-s * 0.36, -s * 0.22); g.lineTo(-s * 0.3, -s * 0.36); g.lineWidth = s * 0.035; g.strokeStyle = fg; g.stroke();
  g.beginPath(); g.moveTo(s * 0.4, 0); g.quadraticCurveTo(s * 0.6, s * 0.1, s * 0.5, s * 0.3); g.lineWidth = s * 0.03; g.stroke();
  g.restore();
  // peacock: body, raised neck, a fanned tail of simple feather-eye dots
  g.save(); g.translate(cx + s * 0.32, cy - s * 0.18);
  for (let i = -4; i <= 4; i++) { const a = (i / 4) * 0.9; g.beginPath(); g.ellipse(Math.sin(a) * s * 0.5, -Math.abs(Math.cos(a)) * s * 0.3 + s * 0.18, s * 0.07, s * 0.16, a, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(Math.sin(a) * s * 0.5, -Math.abs(Math.cos(a)) * s * 0.3 + s * 0.02, s * 0.025, 0, Math.PI * 2); g.fillStyle = '#eee'; g.fill(); g.fillStyle = fg; }
  g.beginPath(); g.ellipse(0, s * 0.12, s * 0.16, s * 0.22, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(0, -s * 0.18, s * 0.09, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(0, -s * 0.27); g.lineTo(s * 0.02, -s * 0.36); g.lineWidth = s * 0.025; g.stroke();
  g.restore();
}
function muralHandprints(g, x, y, w, h, fg) {
  g.fillStyle = fg;
  const n = 5, s = w * 0.15;
  for (let i = 0; i < n; i++) {
    const cx = x + w * ((i + 0.5) / n), cy = y + h * 0.5 + (i % 2 ? s * 0.12 : -s * 0.08);
    g.save(); g.translate(cx, cy); g.rotate((i - (n - 1) / 2) * 0.12);
    g.beginPath(); g.ellipse(0, s * 0.12, s * 0.34, s * 0.46, 0, 0, Math.PI * 2); g.fill(); // palm
    for (let f = -2; f <= 2; f++) { // five fingers
      g.beginPath(); g.ellipse(f * s * 0.17, -s * 0.42 - Math.abs(f) * s * 0.05, s * 0.09, s * 0.3, 0, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
}
function muralAlmanac(g, x, y, w, h, fg) {
  const m = w * 0.08;
  g.strokeStyle = fg; g.lineWidth = w * 0.012; g.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m);
  const cols = 5, rows = 6, gx = (w - 2 * m) / cols, gy = (h - 2 * m) * 0.78 / rows, top = y + m + (h - 2 * m) * 0.22;
  g.beginPath(); g.moveTo(x + m, top); g.lineTo(x + w - m, top); g.stroke();
  for (let c = 1; c < cols; c++) { g.beginPath(); g.moveTo(x + m + c * gx, top); g.lineTo(x + m + c * gx, y + h - m); g.stroke(); }
  for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(x + m, top + r * gy); g.lineTo(x + w - m, top + r * gy); g.stroke(); }
  g.fillStyle = fg; g.font = `bold ${Math.round(gy * 0.4)}px "Noto Sans Devanagari", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const n = r * cols + c + 1; if (n > 30) continue; g.fillText(String(n), x + m + (c + 0.5) * gx, top + (r + 0.5) * gy); }
  g.font = `bold ${Math.round((h - 2 * m) * 0.14)}px "Noto Sans Devanagari", sans-serif`; g.fillText('पंचांग', x + w / 2, y + m + (h - 2 * m) * 0.1);
}

/** Each design: id, kind, scheme colours, and a paint(ctx, x, y, w, h) that fills exactly that cell rect. */
const DESIGNS = [
  { id: 'clean', kind: 'text', bg: '#eef3ea', border: '#2c4a2a', fg: '#1f3a22', hi: 'अपना गांव साफ रखें', en: 'Keep the village clean', icon: iconBroom },
  { id: 'vaccinate', kind: 'text', bg: '#eaf2f6', border: '#1c3e5e', fg: '#163150', hi: 'बच्चों को टीका लगवाएं', en: 'Get children vaccinated', icon: iconDrop },
  { id: 'water', kind: 'text', bg: '#e3f0f3', border: '#0f4c5c', fg: '#0d3e4a', hi: 'जल ही जीवन है', en: 'Water is life', icon: iconDrop },
  { id: 'trees', kind: 'text', bg: '#edf2e2', border: '#355e20', fg: '#2a4a1a', hi: 'पेड़ लगाओ, जीवन बचाओ', en: 'Plant trees, save life', icon: iconTree },
  { id: 'girled', kind: 'text', bg: '#f5ecec', border: '#6e2038', fg: '#5a1a2c', hi: 'हर बेटी को शिक्षा दें', en: 'Educate every daughter', icon: iconBook },
  { id: 'school', kind: 'text', bg: '#fbf3df', border: '#8a5a12', fg: '#6e4610', hi: 'स्कूल जरूर जाएं', en: 'Always go to school', icon: iconPencil },
  { id: 'family', kind: 'text', bg: '#eef0f6', border: '#293a6e', fg: '#202f58', hi: 'छोटा परिवार सुखी परिवार', en: 'Small family, happy family', icon: (g, cx, cy, s, fg) => iconFamily(g, cx, cy, s, fg) },
  { id: 'literacy', kind: 'text', bg: '#f4eee0', border: '#6e4a18', fg: '#5a3c12', hi: 'साक्षरता ही शक्ति है', en: 'Literacy is strength', icon: iconBook },
  { id: 'rangoli', kind: 'graphic', bg: '#fbeedd', border: '#a5401c', fg: '#a5401c', draw: muralRangoli },
  { id: 'cowpeacock', kind: 'graphic', bg: '#eef2e4', border: '#2c4a2a', fg: '#243a1e', draw: muralCowPeacock },
  { id: 'handprints', kind: 'graphic', bg: '#f1e6d6', border: '#7a2a1a', fg: '#8a2c18', draw: muralHandprints },
  { id: 'almanac', kind: 'graphic', bg: '#f3ecd6', border: '#5a3c12', fg: '#4a3010', draw: muralAlmanac },
];

let atlasCache = null;
function buildAtlas() {
  if (atlasCache) return atlasCache;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = '#8a7a66'; g.fillRect(0, 0, W, H);
  const rects = [];
  DESIGNS.forEach((d, i) => {
    const col = i % COLS, row = Math.floor(i / COLS), x = col * CW, y = row * CH;
    rects.push({ id: d.id, x0: x + 3, y0: y + 3, x1: x + CW - 3, y1: y + CH - 3 });
    g.fillStyle = d.bg; g.fillRect(x, y, CW, CH);
    // weathering: soft uneven patches + a grimy bottom edge, same recipe as the shop-sign atlas
    for (let k = 0; k < 6; k++) {
      const r = 60 + ((k * 41 + i * 17) % 90), px = x + ((k * 97 + i * 31) % CW), py = y + ((k * 53 + i * 7) % CH);
      const rg = g.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, k % 2 ? 'rgba(255,250,235,0.08)' : 'rgba(90,70,45,0.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(x, y, CW, CH);
    }
    g.strokeStyle = d.border; g.lineWidth = 8; g.strokeRect(x + 8, y + 8, CW - 16, CH - 16);
    if (d.kind === 'text') {
      const iconS = CW * 0.3;
      drawBilingual(g, d.hi, d.en, { x: x + CW / 2, y: y + CH * 0.52, w: CW - 60, h: CH * 0.42, fg: d.fg, fillFraction: 0.95 });
      g.strokeStyle = d.fg; g.fillStyle = d.fg;
      d.icon(g, x + CW / 2, y + CH * 0.24, iconS, d.fg);
    } else {
      d.draw(g, x + 16, y + 16, CW - 32, CH - 32, d.fg);
    }
    const grd = g.createLinearGradient(0, y + CH - 30, 0, y + CH);
    grd.addColorStop(0, 'rgba(50,38,26,0)'); grd.addColorStop(1, 'rgba(50,38,26,0.18)');
    g.fillStyle = grd; g.fillRect(x, y + CH - 30, CW, 30);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // DoubleSide: belt-and-braces against a winding slip on a mirrored building — the explicit outward normal we pass
  // per quad still governs lighting either way, so this only guards visibility, never shading.
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
  material.name = 'signboard';
  atlasCache = { canvas, texture, material, rects, ready: repaintWhenFontReady(canvas, g) };
  return atlasCache;
}
function repaintWhenFontReady(canvas, g) {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return Promise.all([document.fonts.load('700 40px "Noto Sans Devanagari"'), document.fonts.ready]).then(() => {
    // the atlas is small and built once; a full repaint on font-ready is cheap and keeps the Hindi glyphs correct
    atlasCache.texture.needsUpdate = true;
  }, () => {});
}

/** A flat quad facing `normal` (unit, horizontal), centred at `center`, `w` wide along `tangent` (unit, horizontal), `h` tall. */
function addQuad(pos, nor, uv, idx, center, tangent, normal, w, h, uvRect) {
  const base = pos.length / 3;
  const hw = w / 2, hh = h / 2;
  const corners = [
    [center[0] - tangent[0] * hw, center[1] - hh, center[2] - tangent[2] * hw],
    [center[0] + tangent[0] * hw, center[1] - hh, center[2] + tangent[2] * hw],
    [center[0] + tangent[0] * hw, center[1] + hh, center[2] + tangent[2] * hw],
    [center[0] - tangent[0] * hw, center[1] + hh, center[2] - tangent[2] * hw],
  ];
  const [u0, v0, u1, v1] = uvRect;
  const uvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  corners.forEach((p, k) => { pos.push(p[0], p[1], p[2]); nor.push(normal[0], normal[1] || 0, normal[2]); uv.push(uvs[k][0], uvs[k][1]); });
  // winding: cross(tangent, up) = -normal (since normal = up x tangent for our wall convention), so the CCW-from-normal
  // face needs the reverse triangle order from the naive (0,1,2)/(0,2,3) — verified against the back-wall normal below.
  idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
}

/**
 * Builds the merged mural mesh for a list of building boxes. See the file header for the box shape and the contract.
 * opts: { offset=0.03 (m off the wall face), minClear=0.6 (m kept clear at each wall end) }.
 */
export function buildWallMurals(boxes, opts = {}) {
  const offset = opts.offset ?? 0.03, minClear = opts.minClear ?? 0.6;
  const atlas = buildAtlas();
  const pos = [], nor = [], uv = [], idx = [];
  const instances = []; // debug/report use: one row per placed mural { cx, cy, cz, nx, nz, width, height, design }
  let placed = 0, skippedShort = 0;
  for (const b of boxes) {
    const { x, z, ry, w, d } = b;
    if (!(w > 0) || !(d > 0)) continue;
    const seed = b.seed ?? (x * 7 + z * 13);
    const c = Math.cos(ry), s = Math.sin(ry);
    // candidate walls: back (local -z, length w), left (local -x, length d), right (local +x, length d). Front (+z) is skipped: it carries the entry/shop board.
    const walls = [
      { lx: 0, lz: -d / 2, nlx: 0, nlz: -1, tlx: 1, tlz: 0, len: w, pr: 0.46 },
      { lx: -w / 2, lz: 0, nlx: -1, nlz: 0, tlx: 0, tlz: 1, len: d, pr: 0.22 },
      { lx: w / 2, lz: 0, nlx: 1, nlz: 0, tlx: 0, tlz: 1, len: d, pr: 0.22 },
    ];
    let chosen = null, roll = hash(seed, 1);
    let acc = 0;
    for (let i = 0; i < walls.length; i++) { const wl = walls[i]; if (roll < acc + wl.pr) { chosen = wl; break; } acc += wl.pr; }
    if (!chosen) continue; // the remaining probability mass = "no mural on this building" (not every wall gets one)
    if (chosen.len < minClear * 2 + 0.7) { skippedShort++; continue; }

    const design = DESIGNS[Math.floor(hash(seed, 2) * DESIGNS.length) % DESIGNS.length];
    const rect = atlas.rects.find((r) => r.id === design.id);
    const aspect = CH / CW;
    let width = 0.85 + hash(seed, 3) * 0.55; // 0.85 - 1.4 m wide
    width = Math.min(width, chosen.len - minClear * 2);
    if (width < 0.6) { skippedShort++; continue; }
    const height = width * aspect;

    // world centre of the wall's own centre line, then jitter along the wall (tangent), inset so the poster never crosses a corner
    const wx = x + chosen.lx * c + chosen.lz * s, wz = z - chosen.lx * s + chosen.lz * c;
    const tWx = chosen.tlx * c + chosen.tlz * s, tWz = -chosen.tlx * s + chosen.tlz * c; // world tangent (unit, since local tangent is unit)
    const nWx = chosen.nlx * c + chosen.nlz * s, nWz = -chosen.nlx * s + chosen.nlz * c; // world outward normal (unit)
    const maxJitter = Math.max(0, chosen.len / 2 - minClear - width / 2);
    const jitter = (hash(seed, 4) * 2 - 1) * maxJitter;
    const cx = wx + tWx * jitter + nWx * offset, cz = wz + tWz * jitter + nWz * offset;
    const baseY = (b.y || 0) + 0.75 + hash(seed, 5) * 0.3; // sill well clear of the plinth, varies a little building to building
    const uvRect = [rect.x0 / W, 1 - rect.y1 / H, rect.x1 / W, 1 - rect.y0 / H];
    addQuad(pos, nor, uv, idx, [cx, baseY + height / 2, cz], [tWx, 0, tWz], [nWx, 0, nWz], width, height, uvRect);
    instances.push({ cx, cy: baseY + height / 2, cz, nx: nWx, nz: nWz, width, height, design: design.id });
    placed++;
  }
  let mesh = null;
  if (placed) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    mesh = new THREE.Mesh(g, atlas.material);
    mesh.name = 's7_wall_murals';
    mesh.userData.noAutoCollider = true;
    mesh.receiveShadow = true;
  }
  return { mesh, stats: { candidates: boxes.length, placed, skippedShort, designs: DESIGNS.length, instances } };
}

export const MURAL_DESIGN_IDS = DESIGNS.map((d) => d.id);
