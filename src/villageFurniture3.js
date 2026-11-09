import * as THREE from 'three';
import { ANCHORS } from './anchors.js';
import { colliderBoxFromTransform } from './collision.js';
import { registerInteraction } from './interactions.js';
import { Obj, Batch, spotMatrix, local, rnd } from './villageOddities.js';
import { drawBilingual, hiFont, enFont, HI_FAMILY, EN_FAMILY } from './signPaint.js';

/**
 * VILLAGE FURNITURE 3 (docs/VILLAGE_VOCABULARY.md sections 6, 9, 11): the hard-surface items still missing after
 * villageOddities / villageFixtures / villageFurniture / villageFurniture2 / wallWriting.
 *   bhootiya ghar - the ruined house the pond peepal (src/main.js trees_pond, pond anchor + (20, 12)) grows THROUGH: old brick
 *                   walls broken to a ragged top, lime plaster flaked off in patches, the west half of the kadi-and-mud roof
 *                   fallen in around the trunk (one beam hanging, one lying in the rubble), the east half still on, a door frame
 *                   with one sagging leaf and one leaf on the floor, a window with two bent bars, a rubble heap, loose bricks,
 *                   and kids' charcoal scrawl "भूत बंगला / Ghost house" by the door. The tree is the existing one; no new organic.
 *   panchayat notices - the panchayat's blank notice board (tools/blender/build_panchayat.py, cork x 3.2..5.0 on the room front)
 *                   gets real pasted notices (Hindi bold first, English second) and a painted header above it, plus a
 *                   "Read the notices" interaction (VOCABULARY s9). Shown only while the panchayat place itself is built.
 *   kiln smoke    - thin grey smoke from the bhatta chimney top (Places V1/bhatta/LAYOUT.md: "blackened top, thin grey smoke";
 *                   build_bhatta.py: chimney at site (-12, -19.5), 30.1 m), one point-sprite draw, animated in its shader.
 *                   Shown only while the bhatta place is built.
 * Skipped: banyan + swing, scarecrow, shrine under a tree, PDS queue, kites, the wire cluster on every pole (see villageFurniture*.js);
 *   people, plants and animals need CC0 models.
 * Materials: the frozen library sets only (brick, plaster, wood), tinted + weathered in vertex colour by villageOddities' Obj.
 * Draw cost: ruin 3 merged meshes + 1 scrawl decal; notices 1 decal; smoke 1 points draw. Each is local, so frustum culling
 * keeps them out of every view that does not look at them.
 */

export const FURNITURE3_SPOTS = {
  // ruin centre, pond frame: the peepal trunk (pond + (20, 12)) lands at ruin-local (-1.8, -0.3); the cattle track runs 0.8 m west
  ruin: { at: 'pond', lx: 21.8, lz: 12.3, yaw: 0 },
  notices: { at: 'yard_panchayat', lx: 0, lz: 0, yaw: 0 },
  smoke: { at: 'yard_bhatta', lx: -12, lz: -19.5, yaw: 0 },
};

// ---------------------------------------------------------------------------------------------------------------- decal atlas
const AW = 1024, AH = 1024;
const CELLS = {
  board: { x: 0, y: 0, w: 900, h: 600 }, // 1.8 x 1.2 m of cork: pasted notices
  header: { x: 0, y: 620, w: 900, h: 170 }, // 1.8 x 0.34 m painted on the wall above the board
  scrawl: { x: 0, y: 800, w: 640, h: 220 }, // 1.4 x 0.48 m charcoal on the ruin's front plaster
};
const uvOf = (c) => [c.x / AW, 1 - (c.y + c.h) / AH, (c.x + c.w) / AW, 1 - c.y / AH];

const NOTICES = [
  { hi: 'ग्राम सभा की बैठक', en: 'Gram Sabha meeting', hi2: 'शनिवार शाम 4 बजे, नीम के नीचे', en2: 'Saturday 4 pm, under the neem', w: 0.36, h: 0.44 },
  { hi: 'पल्स पोलियो', en: 'Polio drops', hi2: 'रविवार, स्कूल में, 5 साल तक', en2: 'Sunday at the school, under 5s', w: 0.32, h: 0.42, pink: true },
  { hi: 'राशन कार्ड सूची', en: 'Ration card list', list: true, w: 0.34, h: 0.5 },
  { hi: 'नाली सफाई', en: 'Drain cleaning', hi2: 'हर महीने की पहली तारीख', en2: 'First of every month', w: 0.3, h: 0.42 },
  { hi: 'बीज और खाद', en: 'Seed and fertiliser', hi2: 'सहकारी समिति, सोमवार से', en2: 'Co-op society, from Monday', w: 0.32, h: 0.44, yellow: true },
];
// where each sheet sits on the cork (metres from the board's left/top), its tilt, and its age; covers the model's five blank sheets
const SHEET_AT = [[0.08, -0.01, -0.02, 0.3], [0.6, 0.0, 0.025, 0.6], [1.1, 0.46, -0.015, 0.2], [0.12, 0.5, 0.02, 0.5], [0.62, 0.48, -0.025, 0.8]];
const PAPER = '#e6dcc4', PAPER_OLD = '#d9c9a2', INK = '#2c2a2e', PIN = ['#a8433a', '#3f5f8a', '#c9a23a'];

function paperGrain(g, x, y, w, h, base, age, seed) {
  g.fillStyle = base; g.fillRect(x, y, w, h);
  for (let i = 0; i < w * h / 60; i++) {
    const a = rnd(seed + i * 2), b = rnd(seed + i * 2 + 1);
    g.fillStyle = `rgba(${a < 0.5 ? '120,100,70' : '255,250,235'},${0.04 + 0.05 * rnd(seed + i * 5)})`;
    g.fillRect(x + a * w, y + b * h, 2 + rnd(seed + i) * 3, 1 + rnd(seed + i + 9) * 2);
  }
  // sun yellowing and a damp tide mark from the bottom
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, `rgba(150,110,50,${0.08 + 0.18 * age})`); gr.addColorStop(0.5, 'rgba(150,110,50,0)'); gr.addColorStop(1, `rgba(110,85,50,${0.1 + 0.2 * age})`);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}

function paintNotice(g, n, px, py, pw, ph, age, seed) {
  paperGrain(g, px, py, pw, ph, n.pink ? '#e8c9bd' : n.yellow ? '#e3d39a' : age > 0.5 ? PAPER_OLD : PAPER, age, seed);
  g.save(); g.globalAlpha = 0.9 - 0.25 * age;
  // a printed rule under the heading
  drawBilingual(g, n.hi, n.en, { x: px + pw / 2, y: py + ph * 0.05, w: pw * 0.9, h: ph * 0.3, fg: INK });
  g.fillStyle = INK; g.fillRect(px + pw * 0.08, py + ph * 0.37, pw * 0.84, Math.max(1.5, ph * 0.006));
  if (n.list) {
    // a typed list: a column of numbers and grey name lines too small to read, a stamp at the foot
    g.font = `500 ${Math.round(ph * 0.04)}px ${EN_FAMILY}`; g.textAlign = 'left';
    for (let r = 0; r < 11; r++) {
      const yy = py + ph * (0.43 + r * 0.045);
      g.fillText(String(r + 1), px + pw * 0.08, yy + ph * 0.03);
      g.fillStyle = 'rgba(44,42,46,0.55)'; g.fillRect(px + pw * 0.2, yy + ph * 0.012, pw * (0.35 + 0.3 * rnd(seed + r)), ph * 0.014);
      g.fillRect(px + pw * 0.72, yy + ph * 0.012, pw * 0.16, ph * 0.014); g.fillStyle = INK;
    }
  } else {
    drawBilingual(g, n.hi2, n.en2, { x: px + pw / 2, y: py + ph * 0.42, w: pw * 0.86, h: ph * 0.3, fg: INK, maxHiPx: ph * 0.11 });
    for (let r = 0; r < 3; r++) { g.fillStyle = 'rgba(44,42,46,0.35)'; g.fillRect(px + pw * 0.12, py + ph * (0.78 + r * 0.05), pw * (0.5 + 0.25 * rnd(seed + r * 3)), ph * 0.012); }
  }
  // the round office stamp and a signature
  g.strokeStyle = 'rgba(70,60,140,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.arc(px + pw * 0.8, py + ph * 0.88, ph * 0.06, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(px + pw * 0.8, py + ph * 0.88, ph * 0.04, 0, Math.PI * 2); g.stroke();
  g.restore();
  // creases and a torn corner (destination-out), pins
  g.strokeStyle = 'rgba(90,70,40,0.18)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(px, py + ph * 0.5); g.lineTo(px + pw, py + ph * (0.48 + 0.04 * rnd(seed))); g.stroke();
  g.beginPath(); g.moveTo(px + pw * 0.5, py); g.lineTo(px + pw * (0.47 + 0.06 * rnd(seed + 1)), py + ph); g.stroke();
  g.save(); g.globalCompositeOperation = 'destination-out';
  const tc = Math.floor(rnd(seed + 7) * 4), tx = tc % 2 ? px + pw : px, ty = tc > 1 ? py + ph : py, s = (0.06 + 0.08 * age) * pw;
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + (tc % 2 ? -s : s), ty); g.lineTo(tx + (tc % 2 ? -s * 0.4 : s * 0.4), ty + (tc > 1 ? -s * 0.7 : s * 0.7)); g.lineTo(tx, ty + (tc > 1 ? -s : s)); g.closePath(); g.fill();
  g.restore();
  for (const [fx, fy] of [[0.5, 0.03], [0.06, 0.04], [0.94, 0.05]].slice(0, 1 + Math.floor(rnd(seed + 3) * 3))) {
    g.fillStyle = 'rgba(40,30,20,0.35)'; g.beginPath(); g.arc(px + pw * fx + 2, py + ph * fy + 3, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = PIN[Math.floor(rnd(seed + fx * 10) * 3)]; g.beginPath(); g.arc(px + pw * fx, py + ph * fy, 6, 0, Math.PI * 2); g.fill();
  }
}

function paintAtlas(g) {
  g.clearRect(0, 0, AW, AH);
  const B = CELLS.board, ppm = B.w / 1.8;
  // old torn scraps of earlier notices left on the cork under the new ones
  for (let i = 0; i < 9; i++) {
    const x = B.x + rnd(i * 3 + 400) * (B.w - 90), y = B.y + rnd(i * 3 + 401) * (B.h - 70), w = 30 + rnd(i * 3 + 402) * 70, h = 20 + rnd(i + 410) * 60;
    paperGrain(g, x, y, w, h, '#cfbf98', 0.9, i * 31);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w * 0.6, y + h); g.lineTo(x + w, y + h); g.fill(); g.restore();
  }
  NOTICES.forEach((n, i) => {
    const [mx, my, tilt, age] = SHEET_AT[i];
    const pw = n.w * ppm, ph = n.h * ppm, cx = B.x + mx * ppm + pw / 2, cy = B.y + my * ppm + ph / 2;
    g.save(); g.translate(cx, cy); g.rotate(tilt);
    // the cast shadow of the paper on the cork
    g.fillStyle = 'rgba(30,20,10,0.28)'; g.fillRect(-pw / 2 + 4, -ph / 2 + 5, pw, ph);
    paintNotice(g, n, -pw / 2, -ph / 2, pw, ph, age, 50 + i * 17);
    g.restore();
  });
  // header painted straight on the lime wall: dark paint, hand-lettered, a little faded at the edges
  const H = CELLS.header;
  g.save(); g.globalAlpha = 0.88;
  drawBilingual(g, 'ग्राम पंचायत सूचना पट', 'Gram Panchayat Notice Board', { x: H.x + H.w / 2, y: H.y + 6, w: H.w * 0.92, h: H.h - 12, fg: '#2e2a2c' });
  g.restore();
  // charcoal scrawl on the ruin: a kid's hand, uneven, a crude ghost drawn beside it
  const S = CELLS.scrawl;
  g.save(); g.globalAlpha = 0.72; g.fillStyle = '#2a2624'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.translate(S.x + 24, S.y + 98); g.rotate(-0.05);
  g.font = hiFont(78); g.fillText('भूत बंगला', 0, 0);
  g.rotate(0.07); g.font = enFont(52); g.fillText('GHOST HOUSE', 6, 70);
  g.restore();
  g.save(); g.globalAlpha = 0.65; g.strokeStyle = '#2a2624'; g.lineWidth = 6; g.lineCap = 'round';
  const gx = S.x + 520, gy = S.y + 40;
  g.beginPath(); g.moveTo(gx - 40, gy + 150); g.lineTo(gx - 40, gy + 50); g.quadraticCurveTo(gx - 40, gy, gx, gy); g.quadraticCurveTo(gx + 40, gy, gx + 40, gy + 50);
  g.lineTo(gx + 40, gy + 150); g.lineTo(gx + 20, gy + 130); g.lineTo(gx, gy + 150); g.lineTo(gx - 20, gy + 130); g.closePath(); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.arc(gx - 14, gy + 50, 5, 0, 7); g.stroke(); g.beginPath(); g.arc(gx + 14, gy + 50, 5, 0, 7); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(gx, gy + 85, 10, 0, 7); g.stroke();
  g.restore();
  // charcoal is patchy: rub some of it out
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) { g.globalAlpha = 0.2 + 0.4 * rnd(i + 900); g.fillRect(S.x + rnd(i * 2 + 901) * S.w, S.y + rnd(i * 2 + 902) * S.h, 3 + rnd(i) * 7, 2 + rnd(i + 3) * 4); }
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.15 + 0.3 * rnd(i + 1300); g.fillRect(H.x + rnd(i * 2 + 1301) * H.w, H.y + rnd(i * 2 + 1302) * H.h, 2 + rnd(i) * 6, 2 + rnd(i + 5) * 3); }
  g.restore();
}

/** A decal quad in `cell`, w x h metres, centred at the matrix origin, facing +z. */
function decalGeo(cell, w, h, m) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = uvOf(cell), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  return g.applyMatrix4(m);
}

// ---------------------------------------------------------------------------------------------------------------- the ruin
const BRICK = 0x926250, BRICK_D = 0x7c5444, LIME = 0xc8bea6, MUD = 0x7f6c55, KADI = 0x5e4a36, ROT = 0x6e5c48, RUSTY = 0x5a3a28;

/** One wall run along x (axis 'x', at z = fixed) or along z, built as 0.4 m columns with a broken top; openings are [a, b, sill, lintel]. */
function wallRun(o, axis, fixed, a, b, topAt, openings, seed, plasterSide) {
  const T = 0.3, step = 0.4, n = Math.round((b - a) / step);
  for (let i = 0; i < n; i++) {
    const s0 = a + i * step, sc = s0 + step / 2, k = seed + i * 7;
    let top = topAt(sc, i);
    const pieces = [];
    const op = openings.find(([p, q]) => sc > p && sc < q);
    if (!op) pieces.push([0, top]);
    else { if (op[2] > 0.05) pieces.push([0, op[2]]); if (top > op[3] + 0.15) pieces.push([op[3], top]); }
    for (const [y0, y1] of pieces) {
      const tint = new THREE.Color(rnd(k) < 0.5 ? BRICK : BRICK_D).multiplyScalar(0.86 + rnd(k + 1) * 0.22);
      const cx = axis === 'x' ? sc : fixed, cz = axis === 'x' ? fixed : sc;
      o.box('brick', axis === 'x' ? step + 0.002 : T, y1 - y0, axis === 'x' ? T : step + 0.002, cx, (y0 + y1) / 2, cz, tint, 0, 0, 0, { dirt: 0.45, dirtH: 0.7, dust: 0.25 });
      // the old lime plaster coat: still on most of the wall as 0.2 m strips whose top and bottom edges break independently,
      // eaten away low down by damp, gone where the top broke, with holes knocked through to the brick here and there
      for (const side of [-1, 1]) {
        if (rnd(k + side * 3 + 11) < (side === plasterSide ? 0.12 : 0.3)) continue; // a fully bare column
        for (let h2 = 0; h2 < 2; h2++) {
          const kk = k + h2 * 101 + side * 17;
          const p0 = y0 + (y0 < 0.1 ? 0.22 + rnd(kk + 5) * 0.4 : 0.03 + rnd(kk + 5) * 0.08);
          const p1 = y1 - 0.06 - rnd(kk + 6) * 0.45;
          if (p1 - p0 < 0.2) continue;
          const runs = rnd(kk + 7) < 0.3 ? (() => { const gy = p0 + 0.15 + rnd(kk + 8) * (p1 - p0 - 0.3), gh = 0.15 + rnd(kk + 9) * 0.35; return [[p0, gy], [gy + gh, p1]]; })() : [[p0, p1]];
          const off = (T / 2 + 0.012) * side, along = (h2 - 0.5) * step / 2;
          for (const [q0, q1] of runs) {
            if (q1 - q0 < 0.08) continue;
            const lt = new THREE.Color(LIME).multiplyScalar(0.8 + rnd(kk + 10) * 0.14);
            o.box('plaster', axis === 'x' ? step / 2 + 0.003 : 0.024, q1 - q0, axis === 'x' ? 0.024 : step / 2 + 0.003,
              cx + (axis === 'x' ? along : off), (q0 + q1) / 2, cz + (axis === 'x' ? off : along), lt, 0, 0, 0,
              { dirt: 0.55, dirtH: 1.0, dust: 0.04, streak: 0.12, streakFrom: 0, streakTop: q1 });
          }
        }
      }
    }
    // loose bricks still sitting on the broken top, stepped back like real collapse
    if (!op || top > op[3] + 0.15) {
      const nb = Math.floor(rnd(k + 13) * 3);
      for (let j = 0; j < nb; j++) {
        const along = (rnd(k + 20 + j) - 0.5) * step * 0.7, across = (rnd(k + 30 + j) - 0.5) * 0.14;
        const bx = axis === 'x' ? sc + along : fixed + across, bz = axis === 'x' ? fixed + across : sc + along;
        const turn = rnd(k + 40 + j) < 0.5 ? 0 : Math.PI / 2;
        o.box('brick', 0.22, 0.072, 0.105, bx, top + 0.036 + j * 0.073, bz, new THREE.Color(BRICK).multiplyScalar(0.8 + rnd(k + 50 + j) * 0.25), 0, turn + (rnd(k + 60 + j) - 0.5) * 0.3, (rnd(k + 70 + j) - 0.5) * 0.12, { dirt: 0.1, dust: 0.35 });
      }
    }
  }
}

function brick(o, x, y, z, k, tilt = 1) {
  o.box('brick', 0.22, 0.072, 0.105, x, y, z, new THREE.Color(rnd(k) < 0.7 ? BRICK : 0x9a7a62).multiplyScalar(0.75 + rnd(k + 1) * 0.3),
    (rnd(k + 2) - 0.5) * 0.9 * tilt, rnd(k + 3) * Math.PI, (rnd(k + 4) - 0.5) * 0.9 * tilt, { dirt: 0.2, dust: 0.35 });
}

/** A low earth-and-plaster rubble heap: a squashed, lumpy hemisphere. */
function heap(o, x, z, rx, rz, h, seed) {
  const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)), lump = 1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 7 - seed * 2);
    p.setXYZ(i, p.getX(i) * rx * lump, Math.max(0, p.getY(i)) * h * (0.85 + 0.3 * rnd(seed + i)), p.getZ(i) * rz * lump);
  }
  g.computeVertexNormals();
  o.add('plaster', g, local(x, -0.02, z), new THREE.Color(MUD).multiplyScalar(0.9), { dirt: 0.3, dust: 0.2 });
}

function buildRuin(o) {
  const W = 6, D = 4.8, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2, H = 2.75;
  const jag = (s, i, seed, lo, hi) => lo + (hi - lo) * (0.55 + 0.45 * Math.sin(s * 2.3 + seed)) * (0.7 + 0.3 * rnd(seed + i));
  // plinth: a low brick base, mostly buried, its edge crumbled
  o.box('brick', W + 0.2, 0.2, D + 0.2, 0, 0.06, 0, new THREE.Color(BRICK_D).multiplyScalar(0.85), 0, 0, 0, { dirt: 0.7, dirtH: 0.3 });
  // a mud floor inside, dusty, littered
  o.box('plaster', W - 0.6, 0.04, D - 0.6, 0, 0.17, 0, MUD, 0, 0, 0, { dirt: 0.3, dust: 0.5 });
  // NORTH (back): broken low near the tree, holds the roof at the east end
  wallRun(o, 'x', Z0 + 0.15, X0, X1, (s, i) => (s < 0.2 ? jag(s, i, 3, 1.2, 2.1) : H + (rnd(i + 3) - 0.5) * 0.05), [], 101, -1);
  // SOUTH: a window with bent bars, the south-west corner collapsed in a slope
  wallRun(o, 'x', Z1 - 0.15, X0, X1, (s, i) => (s < -1.6 ? 0.5 + (s - X0) * 0.9 + rnd(i + 9) * 0.2 : s < 0.2 ? jag(s, i, 5, 1.9, 2.5) : H), [[0.6, 1.8, 0.95, 2.05]], 211, 1);
  // EAST: intact to the roof, a remnant of the parapet
  wallRun(o, 'z', X1 - 0.15, Z0 + 0.3, Z1 - 0.3, (s, i) => H + (i % 3 === 0 ? 0.25 : 0.32) - rnd(i + 21) * 0.1, [], 307, 1);
  // WEST (front, faces the cattle track): door near the south end, the north half cracked and jagged under the tree
  wallRun(o, 'z', X0 + 0.15, Z0 + 0.3, Z1 - 0.3, (s, i) => (s < 0.4 ? jag(s, i, 7, 1.7, 2.4) : H - 0.1 - rnd(i + 31) * 0.25), [[0.55, 1.65, 0, 2.1]], 401, -1);
  // a big crack down the west face: a thin dark wedge of missing bricks
  for (let j = 0; j < 9; j++) o.box('brick', 0.32, 0.075, 0.12, X0 + 0.15, 0.6 + j * 0.16, 0.12 + Math.sin(j * 1.7) * 0.06 + j * 0.02, 0x4a3426, 0, 0, 0, { dirt: 0 });
  // the one big plaster panel left on the front, where the kids wrote on it
  o.box('plaster', 0.024, 0.95, 1.7, X0 - 0.02, 1.3, -1.05, new THREE.Color(LIME).multiplyScalar(0.9), 0, 0, 0, { dirt: 0.4, dirtH: 0.9, dust: 0.05, streak: 0.3, streakFrom: 0.8, streakTop: 1.8 });
  // DOOR: wooden frame (chaukhat) in the west wall, a lintel beam, one leaf sagging off a hinge, the other on the floor
  const DZ0 = 0.55, DZ1 = 1.65;
  for (const z of [DZ0 + 0.05, DZ1 - 0.05]) o.box('wood', 0.16, 2.08, 0.1, X0 + 0.15, 0.17 + 1.04, z, KADI, 0, 0, 0, { dirt: 0.5, dust: 0.1 });
  o.box('wood', 0.3, 0.16, 1.5, X0 + 0.15, 2.18, (DZ0 + DZ1) / 2, KADI, 0, 0, 0, { dirt: 0.2, dust: 0.3 });
  const leaf = (x, y, z, ry, rx, rz, seed) => {
    const m = local(x, y, z, rx, ry, rz);
    for (let p = 0; p < 4; p++) {
      if (seed === 2 && p === 3) continue; // a plank missing on the fallen leaf
      const g = new THREE.BoxGeometry(0.03, 1.9 - (p === 0 && seed === 1 ? 0.25 : 0), 0.112);
      o.add('wood', g, m.clone().multiply(local(0, -(p === 0 && seed === 1 ? 0.125 : 0), -0.18 + p * 0.12)), new THREE.Color(ROT).multiplyScalar(0.85 + rnd(seed * 9 + p) * 0.25), { dirt: 0.4, dust: 0.15 });
    }
    for (const yy of [-0.65, 0, 0.65]) o.add('wood', new THREE.BoxGeometry(0.04, 0.1, 0.46), m.clone().multiply(local(0.03, yy, 0)), ROT, { dirt: 0.3 });
    for (const yy of [-0.6, 0.6]) o.add('wood', new THREE.BoxGeometry(0.012, 0.035, 0.3), m.clone().multiply(local(0.055, yy, -0.12)), RUSTY, { dirt: 0 }); // iron hinge straps
  };
  leaf(X0 + 0.54, 1.15, 0.54, -1.2, 0, 0.06, 1); // swung in, dropped off its top pin, leaning
  leaf(-1.65, 0.24, 1.75, 0.35, 0, Math.PI / 2 - 0.08, 2); // flat on the floor, propped on rubble at one end
  // WINDOW in the south wall: wooden frame, two iron bars left and bent, one missing stub
  o.box('wood', 1.2, 0.08, 0.2, 1.2, 0.95, Z1 - 0.15, KADI, 0, 0, 0, { dirt: 0.3 });
  o.box('wood', 1.2, 0.1, 0.2, 1.2, 2.05, Z1 - 0.15, KADI, 0, 0, 0, { dirt: 0.2 });
  o.rod('wood', 0.011, [0.95, 0.99, Z1 - 0.15], [1.0, 2.0, Z1 - 0.15], RUSTY, 5, { dirt: 0 });
  o.rod('wood', 0.011, [1.3, 0.99, Z1 - 0.15], [1.42, 1.55, Z1 - 0.09], RUSTY, 5, { dirt: 0 });
  o.rod('wood', 0.011, [1.42, 1.55, Z1 - 0.09], [1.36, 2.0, Z1 - 0.15], RUSTY, 5, { dirt: 0 });
  o.rod('wood', 0.011, [1.6, 2.0, Z1 - 0.15], [1.62, 1.82, Z1 - 0.15], RUSTY, 5, { dirt: 0 });
  // ROOF, east half still on: kadi beams north-south on the north and south walls, planks, a ragged mud slab with a broken west edge
  for (const [bx, k] of [[0.55, 0], [1.3, 1], [2.05, 2], [2.75, 3]]) o.box('wood', 0.13, 0.15, D - 0.1, bx, H + 0.075, 0, new THREE.Color(KADI).multiplyScalar(0.85 + rnd(k + 70) * 0.2), 0, 0, (rnd(k) - 0.5) * 0.03, { dirt: 0, dust: 0.2 });
  for (let p = 0; p < 13; p++) {
    const z = Z0 + 0.3 + p * 0.33, west = 0.35 + rnd(p + 80) * 0.7;
    o.box('wood', X1 - 0.1 - west, 0.03, 0.3, (west + X1 - 0.1) / 2, H + 0.165, z, new THREE.Color(ROT).multiplyScalar(0.8 + rnd(p + 90) * 0.3), 0, 0, 0, { dirt: 0, dust: 0.1 });
  }
  for (let p = 0; p < 7; p++) {
    const z0 = Z0 + 0.05 + p * 0.68, west = 0.9 + rnd(p + 100) * 0.7;
    o.box('plaster', X1 + 0.05 - west, 0.13 + rnd(p + 110) * 0.04, 0.7, (west + X1 + 0.05) / 2, H + 0.245, z0 + 0.34, new THREE.Color(MUD).multiplyScalar(0.85 + rnd(p + 120) * 0.2), (rnd(p + 130) - 0.5) * 0.04, 0, (rnd(p + 140) - 0.5) * 0.05,
      { dirt: 0.15, dust: 0.3, streak: 0.2, streakFrom: H, streakTop: H + 0.3 });
  }
  // the west half fell in: one beam still hooked on the south wall with its other end on the floor, one lying across the rubble
  o.rod('wood', 0.075, [-0.4, 2.35, Z1 - 0.3], [-0.9, 0.25, -0.9], KADI, 7, { dirt: 0.35, dust: 0.3 });
  o.rod('wood', 0.07, [-2.5, 0.28, 1.95], [-0.2, 0.55, 1.3], new THREE.Color(KADI).multiplyScalar(0.8), 7, { dirt: 0.4, dust: 0.4 });
  o.rod('wood', 0.06, [0.4, 2.2, Z0 + 0.25], [0.15, 1.5, -1.3], KADI, 7, { dirt: 0.2 }); // a snapped beam end hanging from the north wall
  // RUBBLE: the fallen roof as a heap of earth and plaster lumps, bricks spilt over it and out of the collapsed corner
  heap(o, -0.4, 1.25, 1.0, 0.8, 0.45, 3);
  heap(o, -2.5, 2.4, 0.9, 0.7, 0.35, 7); // spill outside the collapsed south-west corner
  heap(o, 1.6, -0.9, 0.6, 0.5, 0.18, 11);
  for (let i = 0; i < 26; i++) {
    const a = rnd(i + 200) * Math.PI * 2, r = rnd(i + 201) * 0.9;
    brick(o, -0.4 + Math.cos(a) * r, 0.2 + 0.3 * (1 - r) + rnd(i + 202) * 0.05, 1.25 + Math.sin(a) * r * 0.8, i * 13 + 5);
  }
  for (let i = 0; i < 16; i++) brick(o, -2.6 + rnd(i + 300) * 1.4, 0.06 + rnd(i + 301) * 0.2, 2.1 + rnd(i + 302) * 1.0, i * 11 + 300);
  for (let i = 0; i < 8; i++) brick(o, X0 - 0.3 - rnd(i + 400) * 0.35, 0.05, -1.8 + rnd(i + 401) * 1.9, i * 7 + 400, 0.4); // under the cracked front
  // chunks of the old mud roof slab, broken and tilted on the heap
  for (let i = 0; i < 5; i++) o.box('plaster', 0.3 + rnd(i + 500) * 0.35, 0.1, 0.25 + rnd(i + 501) * 0.3, -1.0 + rnd(i + 502) * 1.4, 0.35 + rnd(i + 503) * 0.2, 0.7 + rnd(i + 504) * 1.0, MUD,
    (rnd(i + 505) - 0.5) * 0.7, rnd(i + 506) * 3, (rnd(i + 507) - 0.5) * 0.7, { dirt: 0.2, dust: 0.4 });
  // a cracked clay chulha still in the east corner where the kitchen was, soot on the wall above it
  o.box('plaster', 0.6, 0.28, 0.45, 2.3, 0.31, 1.7, 0x8a6c50, 0, 0.1, 0, { dirt: 0.5 });
  o.box('plaster', 0.5, 1.1, 0.02, 2.3, 1.0, Z1 - 0.315, 0x3a3430, 0, 0, 0, { dirt: 0 });
  // walls only are solid: the door is open and the inside under the tree is walkable
  return {
    walls: [
      { w: W, d: 0.32, x: 0, z: Z0 + 0.15 }, { w: W - 1.6, d: 0.32, x: 0.8, z: Z1 - 0.15 }, { w: 0.32, d: D - 0.6, x: X1 - 0.15, z: 0 },
      { w: 0.32, d: DZ0 - (Z0 + 0.3), x: X0 + 0.15, z: (Z0 + 0.3 + DZ0) / 2 }, { w: 0.32, d: Z1 - 0.3 - DZ1, x: X0 + 0.15, z: (DZ1 + Z1 - 0.3) / 2 },
    ],
    scrawl: { x: X0 - 0.036, y: 1.32, z: -1.05 },
  };
}

// ---------------------------------------------------------------------------------------------------------------- kiln smoke
function kilnSmoke(world) {
  const N = 46, seed = new Float32Array(N), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) seed[i] = i / N + rnd(i + 700) * 0.02;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const top = new THREE.Vector3(0, 30.3, 0).applyMatrix4(world);
  g.boundingSphere = new THREE.Sphere(top.clone().add(new THREE.Vector3(9, 7, 0)), 26);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uTop: { value: top }, uCol: { value: new THREE.Color(0x8e8b86) }, ...THREE.UniformsLib.fog },
    vertexShader: `
      attribute float aSeed; uniform float uTime, uScale; uniform vec3 uTop; varying float vA; varying float vL;
      #include <fog_pars_vertex>
      float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
      void main() {
        float life = fract(uTime * 0.035 + aSeed);
        float s = aSeed * 91.0;
        // rises fast out of the stack, bends over in the breeze (to +x, slightly +z), spreads and thins
        vec3 p = uTop + vec3(life * life * 22.0 + (h(s) - 0.5) * 1.6 * life, life * 9.0 + sqrt(life) * 3.0, life * 5.0 + (h(s + 1.0) - 0.5) * 3.0 * life);
        p.x += sin(uTime * 0.4 + s) * 0.6 * life; p.y += sin(uTime * 0.3 + s * 2.0) * 0.5 * life;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        float size = 1.6 + life * 8.5;
        vA = smoothstep(0.0, 0.06, life) * pow(1.0 - life, 1.6) * (0.34 + 0.14 * h(s + 2.0));
        vL = life;
        gl_PointSize = min(size * uScale / max(1.0, -mvPosition.z), 320.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uCol; varying float vA; varying float vL;
      #include <fog_pars_fragment>
      void main() {
        vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0;
        float wisp = 0.75 + 0.25 * sin(q.x * 9.0 + q.y * 7.0 + vL * 20.0);
        float a = exp(-d * d * 3.5) * (1.0 - smoothstep(0.85, 1.0, d)) * vA * wisp;
        if (a < 0.004) discard;
        // darker, sooty right at the stack mouth, paling to haze grey as it thins
        gl_FragColor = vec4(mix(uCol * 0.55, uCol * 1.12, smoothstep(0.0, 0.35, vL)), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  mat.onBeforeRender = (renderer, scene, camera) => {
    mat.uniforms.uTime.value = performance.now() / 1000;
    mat.uniforms.uScale.value = renderer.domElement.height * 0.5 / Math.tan(THREE.MathUtils.degToRad((camera.fov || 60) / 2));
  };
  const pts = new THREE.Points(g, mat);
  pts.name = 'kiln_smoke';
  pts.renderOrder = 2;
  return pts;
}

// ---------------------------------------------------------------------------------------------------------------- create
/** Is the staged place group `name` in the scene and drawn? (its zone builds and tears it down) */
function placeShown(scene, name, cache) {
  let o = cache[name];
  if (!o || !o.parent) { o = scene.getObjectByName(name); cache[name] = o || null; }
  if (!o) return false;
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

export function createVillageFurniture3(scene) {
  const group = new THREE.Group(); group.name = 'village_furniture3';
  const report = [];

  // the shared decal atlas (canvas), repainted once the Devanagari font is in
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
  const g2 = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const repaint = () => { paintAtlas(g2); tex.needsUpdate = true; };
  repaint();
  Promise.all([document.fonts.load(hiFont(40), 'क'), document.fonts.load(enFont(40), 'H'), document.fonts.ready]).then(repaint, () => {});
  const decalMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.92, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  decalMat.name = 'wall_writing'; // wall-hung decals (ruin scrawl, notices): elevated fixtures like src/wallWriting.js's; unnamed they merged into a 'merged_N' bucket the ground-contact check read as floating at 1.08 m

  // 1. bhootiya ghar
  const rw = ANCHORS.pond && spotMatrix(FURNITURE3_SPOTS.ruin);
  if (rw) {
    const batch = new Batch();
    const o = new Obj(batch, rw, 83, { dirt: 0.35, dust: 0.15 });
    const fp = buildRuin(o);
    const meshes = batch.flush(group, 'ruin_');
    const cols = fp.walls.map((b) => colliderBoxFromTransform(b.w, b.d, rw.clone().multiply(new THREE.Matrix4().makeTranslation(b.x, 0, b.z))));
    (meshes.brick || Object.values(meshes)[0]).userData.colliderBoxes = cols;
    const s = fp.scrawl;
    const scrawl = new THREE.Mesh(decalGeo(CELLS.scrawl, 1.4, 0.48, rw.clone().multiply(local(s.x, s.y, s.z, 0, -Math.PI / 2, 0))), decalMat);
    scrawl.name = 'ruin_scrawl_decal'; scrawl.receiveShadow = true;
    group.add(scrawl);
    const p = new THREE.Vector3().setFromMatrixPosition(rw);
    report.push({ kind: 'bhootiya_ghar', x: +p.x.toFixed(2), z: +p.z.toFixed(2), tris: Math.round(o.tris), colliders: cols.length });
  }

  // 2. panchayat notices (the board is on the room front wall, FZ = -3, plinth 0.6, cork x 3.2..5.0, y 1.8..3.0)
  const pw = ANCHORS.yard_panchayat && spotMatrix(FURNITURE3_SPOTS.notices);
  let notices = null;
  if (pw) {
    const board = decalGeo(CELLS.board, 1.8, 1.2, pw.clone().multiply(local(4.1, 2.4, -2.928)));
    const header = decalGeo(CELLS.header, 1.8, 0.34, pw.clone().multiply(local(4.1, 3.24, -2.988)));
    const geo = board; // merge the two quads into one draw
    const merged = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) {
      const a = board.attributes[k], b = header.attributes[k];
      const arr = new Float32Array(a.array.length + b.array.length); arr.set(a.array); arr.set(b.array, a.array.length);
      merged.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
    }
    const ia = Array.from(board.index.array), ib = Array.from(header.index.array).map((v) => v + board.attributes.position.count);
    merged.setIndex([...ia, ...ib]);
    geo.dispose();
    notices = new THREE.Mesh(merged, decalMat);
    notices.name = 'panchayat_notices_decal'; notices.receiveShadow = true;
    group.add(notices);
    // Stand point on the open ground just in front of the plinth (plinth edge local z +0.3, solid to ~+0.45 in the body band):
    // the verandah itself is solid to the 2D resolver, so the old point (local z -1.4, on the verandah) sat 1.9 m inside the
    // building's collider and the validator's walk could never stand within reach (9 Nov, check 6). 4 m from the board.
    const at = new THREE.Vector3(4.1, 0, 1.2).applyMatrix4(pw);
    let n = 0;
    registerInteraction({
      id: 'panchayat_notices', position: new THREE.Vector3(at.x, 0, at.z), radius: 2.6,
      label: { hi: 'पंचायत की सूचनाएँ पढ़ें', en: 'Read the panchayat notices' },
      available: () => !!notices.visible,
      onInteract: (ctx) => {
        const x = NOTICES[n++ % NOTICES.length];
        const hi = x.list ? `${x.hi}: नाम और कार्ड नंबर की लंबी सूची, नीचे प्रधान जी की मुहर।` : `${x.hi}: ${x.hi2}।`;
        const en = x.list ? `${x.en}: a long typed list of names and card numbers, the pradhan's stamp at the foot.` : `${x.en}: ${x.en2}.`;
        ctx.dialogue?.say([{ en, hi }]);
      },
    });
    const p = new THREE.Vector3(4.1, 0, -2.93).applyMatrix4(pw);
    report.push({ kind: 'panchayat_notices', x: +p.x.toFixed(2), z: +p.z.toFixed(2), tris: 4 });
  }

  // 3. kiln smoke
  const sw = ANCHORS.yard_bhatta && spotMatrix(FURNITURE3_SPOTS.smoke);
  let smoke = null;
  if (sw) {
    smoke = kilnSmoke(sw);
    group.add(smoke);
    const p = new THREE.Vector3().setFromMatrixPosition(sw);
    report.push({ kind: 'kiln_smoke', x: +p.x.toFixed(2), z: +p.z.toFixed(2), points: 46 });
  }

  // the notices and the smoke belong to streamed places: show them only while that place is built and drawn
  const cache = {};
  const sync = () => {
    if (notices) notices.visible = placeShown(scene, 'panchayat_v2', cache);
    if (smoke) smoke.visible = placeShown(scene, 'bhatta_v2', cache);
  };
  if (notices) notices.visible = false;
  if (smoke) smoke.visible = false;
  setInterval(sync, 1000);

  scene.add(group);
  if (typeof window !== 'undefined') window.__furniture3 = { items: report, meshes: group.children.length };
  return { group };
}
