import * as THREE from 'three';
import { drawBilingual } from '../signPaint.js';

/**
 * Painted posters and murals for bare exterior walls (S7 sprint, signage agent; expanded by the wallposters agent, 22
 * Nov). Content rule (CLAUDE.md section 5b.2): a flat-coloured wall is an automatic fail; section 5a: murals and
 * painted signs are deliberate, never decoration to skip. The art director's direct feedback (22 Nov) was that a real
 * village papers every open wall with movie posters, slogans, wanted/missing notices, event posters and more, and that
 * road-facing walls specifically were not being used. This file paints a large shared set of designs across all of
 * those categories into ONE canvas atlas, then places them on walls, weighting road-facing walls far more heavily than
 * hidden ones (never religious, never political, per her strict orders).
 *
 * Two wall treatments (her follow-up note, 22 Nov): a real wall mixes hand-painted plaster with pasted paper. Every
 * design carries `treatment: 'painted' | 'pasted'` (civic slogans and the pure-graphic folk murals are 'painted' —
 * no paper rect, the border is the same ink colour as the lettering, a chalky desaturated overlay, a faint drip or
 * two, a hair of hand-painted skew, never a torn edge; movie posters, missing/lost notices, classifieds and event
 * posters are 'pasted' — a visible cream paper rectangle with a drop shadow, one lifted/curled corner, a per-design
 * rotation so they don't sit dead straight, an optional sun-faded tint (`faded`), and an optional second poster
 * peeking out from underneath (`layered`)). See `paintPaintedBoard` / `paintPastedBoard` below.
 *
 * Caller contract: pass a flat list of boxes. Two shapes are supported:
 *
 * A) a building footprint, one per building, shape { x, z, ry, w, d, seed, y?, kind?, door? }:
 *   x, z    world position of the footprint centre (metres)
 *   ry      yaw (radians) — SAME convention as housesKit/shopsKit: local +z is the building's FRONT
 *   w, d    footprint width (front-facing) and depth (metres)
 *   seed    any integer unique-ish per building (index is fine) — picks design + placement, never random per frame
 *   y       optional ground height at the building (metres); default 0
 *   kind    'shop' (front always kept clear for the shop's own sign board) or anything else/omitted ('house': front
 *           may carry a poster beside the door when `door` is given and the front faces a road)
 *   door    optional { x0, x1 }, the door opening in local wall-x metres (house only) — the two strips either side of
 *           it become front-wall candidates, never the strip the door itself occupies
 *
 * B) a long straight wall run (compound/boundary wall), shape { segment: true, x1, z1, x2, z2, side?, seed, density?, y? }:
 *   x1,z1 -> x2,z2  world endpoints of the run (metres)
 *   side            +1 or -1, which perpendicular side is "outward" (default +1) — get this from whichever side the
 *                   wall's own build code already treats as outward/road-facing
 *   density         multiplies how many posters are spaced along the run (default 1 = roughly one every ~1.9 m)
 *
 * opts: { offset=0.03 (m off the wall face), minClear=0.6 (m kept clear at a plain wall's ends), roads=null (an index
 * with .clearance(x,z) -> metres to the nearest road edge, e.g. makeRoadIndex() from landLayout.js — when given, a
 * wall whose outward face comes within `roadFaceDist` of a road/lane is weighted `roadBoost` times more heavily, which
 * is the fix for "why aren't road-facing walls being utilised"), roadFaceDist=7, roadBoost=3.5 }.
 *
 * Returns { mesh, stats } — mesh is null when nothing was placed (empty input). Add mesh straight into the caller's
 * scene group; it is ONE merged BufferGeometry + ONE material, so it costs exactly one draw call total, however many
 * buildings/segments use it.
 */

const CW = 384, CH = 560; // portrait poster cell, distinct from the 512x120 shop signboard cells
const COLS = 6; // grid is sized to DESIGNS.length below (ROWS computed), never shipped as a file — runtime canvas only

function hash(n, s = 0) {
  const v = Math.sin(n * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// ======================================================================================================
// ---- generic line-art icons, drawn in the design's fg colour on transparent ground ----
// ======================================================================================================
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
function iconFamily(g, cx, cy, s) {
  const fig = (x, r) => { g.beginPath(); g.arc(cx + x * s, cy - 0.28 * s, r * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(cx + x * s, cy - 0.1 * s); g.lineTo(cx + x * s - r * 1.6 * s, cy + 0.42 * s); g.lineTo(cx + x * s + r * 1.6 * s, cy + 0.42 * s); g.closePath(); g.fill(); };
  fig(-0.28, 0.1); fig(0, 0.13); fig(0.3, 0.08);
}
function iconNotice(g, cx, cy, s) {
  g.lineWidth = 0.04 * s; g.strokeRect(cx - 0.36 * s, cy - 0.44 * s, 0.72 * s, 0.84 * s);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - 0.24 * s, cy - 0.22 * s + i * 0.18 * s); g.lineTo(cx + 0.24 * s, cy - 0.22 * s + i * 0.18 * s); g.lineWidth = 0.025 * s; g.stroke(); }
}
function iconFlame(g, cx, cy, s, fg) {
  g.fillStyle = fg; g.beginPath();
  g.moveTo(cx, cy - 0.4 * s);
  g.quadraticCurveTo(cx + 0.3 * s, cy - 0.05 * s, cx + 0.12 * s, cy + 0.15 * s);
  g.quadraticCurveTo(cx + 0.25 * s, cy + 0.2 * s, cx, cy + 0.42 * s);
  g.quadraticCurveTo(cx - 0.25 * s, cy + 0.2 * s, cx - 0.12 * s, cy + 0.15 * s);
  g.quadraticCurveTo(cx - 0.3 * s, cy - 0.05 * s, cx, cy - 0.4 * s);
  g.closePath(); g.fill();
}
function iconNoBurn(g, cx, cy, s, fg) {
  iconFlame(g, cx, cy, s * 0.85, fg);
  g.strokeStyle = fg; g.lineWidth = 0.07 * s; g.beginPath(); g.moveTo(cx - 0.4 * s, cy + 0.42 * s); g.lineTo(cx + 0.4 * s, cy - 0.42 * s); g.stroke();
}
/** A generic farm-animal silhouette, differentiated only by horns/ears/tail so no one icon reads as a specific brand mascot. */
function iconAnimal(g, cx, cy, s, fg, type) {
  g.fillStyle = fg; g.strokeStyle = fg;
  g.save(); g.translate(cx, cy);
  g.beginPath(); g.ellipse(0, 0.05 * s, 0.42 * s, 0.22 * s, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-0.42 * s, -0.02 * s, 0.16 * s, 0.14 * s, 0, 0, Math.PI * 2); g.fill();
  g.lineWidth = 0.05 * s;
  for (const lx of [-0.22, -0.05, 0.15, 0.3]) { g.beginPath(); g.moveTo(lx * s, 0.2 * s); g.lineTo(lx * s, 0.42 * s); g.stroke(); }
  g.lineWidth = 0.035 * s;
  if (type === 'buffalo' || type === 'cow') {
    g.beginPath(); g.moveTo(-0.5 * s, -0.12 * s); g.lineTo(-0.6 * s, type === 'buffalo' ? -0.3 * s : -0.22 * s);
    g.moveTo(-0.36 * s, -0.14 * s); g.lineTo(-0.3 * s, type === 'buffalo' ? -0.32 * s : -0.24 * s); g.stroke();
    g.beginPath(); g.moveTo(0.42 * s, 0.05 * s); g.quadraticCurveTo(0.6 * s, 0.1 * s, 0.5 * s, 0.3 * s); g.stroke();
  } else if (type === 'goat') {
    g.beginPath(); g.moveTo(-0.46 * s, -0.1 * s); g.lineTo(-0.55 * s, -0.22 * s); g.moveTo(-0.4 * s, -0.12 * s); g.lineTo(-0.48 * s, -0.24 * s); g.stroke();
  } else if (type === 'dog') {
    g.beginPath(); g.ellipse(-0.5 * s, -0.08 * s, 0.07 * s, 0.12 * s, 0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(0.4 * s, 0); g.quadraticCurveTo(0.55 * s, -0.1 * s, 0.5 * s, -0.2 * s); g.stroke();
  }
  g.restore();
}
function iconBicycle(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.lineWidth = 0.035 * s;
  g.beginPath(); g.arc(cx - 0.28 * s, cy + 0.15 * s, 0.22 * s, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(cx + 0.28 * s, cy + 0.15 * s, 0.22 * s, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  g.moveTo(cx - 0.28 * s, cy + 0.15 * s); g.lineTo(cx - 0.05 * s, cy - 0.15 * s); g.lineTo(cx + 0.28 * s, cy + 0.15 * s);
  g.lineTo(cx + 0.05 * s, cy + 0.15 * s); g.lineTo(cx - 0.05 * s, cy - 0.15 * s); g.lineTo(cx + 0.1 * s, cy - 0.32 * s);
  g.stroke();
}
function iconSickle(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.lineWidth = 0.06 * s;
  g.beginPath(); g.arc(cx, cy, 0.3 * s, Math.PI * 0.15, Math.PI * 1.15); g.stroke();
  g.lineWidth = 0.08 * s; g.beginPath(); g.moveTo(cx + 0.28 * s, cy - 0.06 * s); g.lineTo(cx + 0.5 * s, cy + 0.16 * s); g.stroke();
}
function iconScissors(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.lineWidth = 0.05 * s;
  g.beginPath(); g.moveTo(cx - 0.05 * s, cy); g.lineTo(cx + 0.4 * s, cy - 0.3 * s); g.stroke();
  g.beginPath(); g.moveTo(cx - 0.05 * s, cy); g.lineTo(cx + 0.4 * s, cy + 0.3 * s); g.stroke();
  g.beginPath(); g.arc(cx - 0.25 * s, cy - 0.18 * s, 0.12 * s, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(cx - 0.25 * s, cy + 0.18 * s, 0.12 * s, 0, Math.PI * 2); g.stroke();
}
function iconBell(g, cx, cy, s, fg) {
  g.fillStyle = fg;
  g.beginPath(); g.moveTo(cx - 0.28 * s, cy + 0.22 * s);
  g.quadraticCurveTo(cx - 0.28 * s, cy - 0.3 * s, cx, cy - 0.32 * s);
  g.quadraticCurveTo(cx + 0.28 * s, cy - 0.3 * s, cx + 0.28 * s, cy + 0.22 * s);
  g.closePath(); g.fill();
  g.fillRect(cx - 0.34 * s, cy + 0.22 * s, 0.68 * s, 0.07 * s);
  g.beginPath(); g.arc(cx, cy + 0.35 * s, 0.06 * s, 0, Math.PI * 2); g.fill();
}
function iconWrench(g, cx, cy, s, fg) {
  g.save(); g.translate(cx, cy); g.rotate(-0.6); g.fillStyle = fg;
  g.fillRect(-0.08 * s, -0.4 * s, 0.16 * s, 0.68 * s);
  g.beginPath(); g.arc(0, -0.42 * s, 0.17 * s, Math.PI * 0.15, Math.PI * 0.85); g.arc(0, -0.42 * s, 0.08 * s, Math.PI * 0.85, Math.PI * 0.15, true); g.fill();
  g.restore();
}
function iconPhone(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.lineWidth = 0.045 * s;
  g.strokeRect(cx - 0.18 * s, cy - 0.35 * s, 0.36 * s, 0.7 * s);
  g.beginPath(); g.moveTo(cx - 0.1 * s, cy - 0.24 * s); g.lineTo(cx + 0.1 * s, cy - 0.24 * s); g.stroke();
  g.fillStyle = fg; g.beginPath(); g.arc(cx, cy + 0.26 * s, 0.03 * s, 0, Math.PI * 2); g.fill();
}
function iconStarburst(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 0.04 * s;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 0.12 * s, cy + Math.sin(a) * 0.12 * s); g.lineTo(cx + Math.cos(a) * 0.46 * s, cy + Math.sin(a) * 0.46 * s); g.stroke(); }
  g.beginPath(); g.arc(cx, cy, 0.14 * s, 0, Math.PI * 2); g.fill();
}
function iconNote(g, cx, cy, s, fg) {
  g.fillStyle = fg;
  g.beginPath(); g.ellipse(cx - 0.2 * s, cy + 0.3 * s, 0.1 * s, 0.07 * s, -0.3, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - 0.12 * s, cy - 0.35 * s, 0.05 * s, 0.62 * s);
  g.beginPath(); g.ellipse(cx + 0.2 * s, cy + 0.2 * s, 0.1 * s, 0.07 * s, -0.3, 0, Math.PI * 2); g.fill();
  g.fillRect(cx + 0.28 * s, cy - 0.45 * s, 0.05 * s, 0.62 * s);
  g.fillRect(cx - 0.12 * s, cy - 0.35 * s, 0.45 * s, 0.08 * s);
}
function iconTent(g, cx, cy, s, fg) {
  g.fillStyle = fg;
  g.beginPath(); g.moveTo(cx, cy - 0.42 * s); g.lineTo(cx + 0.4 * s, cy + 0.3 * s); g.lineTo(cx - 0.4 * s, cy + 0.3 * s); g.closePath(); g.fill();
  g.strokeStyle = '#eee'; g.lineWidth = 0.03 * s; g.beginPath(); g.moveTo(cx, cy - 0.42 * s); g.lineTo(cx, cy + 0.3 * s); g.stroke();
  g.strokeStyle = fg; g.beginPath(); g.moveTo(cx, cy - 0.5 * s); g.lineTo(cx, cy - 0.42 * s); g.stroke();
}
/** A wrestling ring with crossed gada (maces) — an akhada/kushti motif, no human figures. */
function iconRing(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 0.05 * s;
  g.beginPath(); g.arc(cx, cy, 0.36 * s, 0, Math.PI * 2); g.stroke();
  for (const rot of [0.35, -0.35 + Math.PI / 2]) { g.save(); g.translate(cx, cy); g.rotate(rot); g.fillRect(-0.04 * s, -0.3 * s, 0.08 * s, 0.6 * s); g.restore(); }
}
function iconBat(g, cx, cy, s, fg) {
  g.save(); g.translate(cx, cy); g.rotate(0.5); g.fillStyle = fg;
  g.beginPath(); g.moveTo(-0.07 * s, -0.42 * s); g.lineTo(0.07 * s, -0.42 * s); g.lineTo(0.1 * s, 0.15 * s);
  g.quadraticCurveTo(0.1 * s, 0.4 * s, 0, 0.42 * s); g.quadraticCurveTo(-0.1 * s, 0.4 * s, -0.1 * s, 0.15 * s); g.closePath(); g.fill();
  g.restore();
}
function iconCourt(g, cx, cy, s, fg) {
  g.strokeStyle = fg; g.lineWidth = 0.035 * s;
  g.strokeRect(cx - 0.42 * s, cy - 0.3 * s, 0.84 * s, 0.6 * s);
  for (const fx of [-0.14, 0.14]) { g.beginPath(); g.moveTo(cx + fx * s, cy - 0.3 * s); g.lineTo(cx + fx * s, cy + 0.3 * s); g.stroke(); }
}
/** A non-figurative mood glyph for the fictional movie posters: no faces or figures, just a graphic emblem. */
function iconMoodGlyph(g, cx, cy, s, fg, mood) {
  if (mood === 'action') { iconFlame(g, cx, cy, s, fg); return; }
  if (mood === 'romance') {
    g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, 0.36 * s, 0, Math.PI * 2); g.fill();
    g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx + 0.16 * s, cy - 0.08 * s, 0.3 * s, 0, Math.PI * 2); g.fill(); g.restore();
    return;
  }
  // drama/default: a cart wheel — a rural, era-safe emblem with no figure in it
  g.strokeStyle = fg; g.lineWidth = 0.035 * s;
  g.beginPath(); g.arc(cx, cy, 0.34 * s, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 0.34 * s, cy + Math.sin(a) * 0.34 * s); g.stroke(); }
}

// ======================================================================================================
// ---- pure-graphic folk-art murals (no text; generic, not any one temple's or artist's exact iconography) ----
// NOTE: no religious iconography here, ever (owner's order, 22 Nov, strict). The former 'devotional' design
// (lotus + om + diya) is removed on purpose, not pending review. Do not re-add any religious motif.
// ======================================================================================================
function muralRangoli(g, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.34;
  g.lineWidth = r * 0.05;
  for (let ring = 1; ring <= 3; ring++) { g.beginPath(); g.arc(cx, cy, (r * ring) / 3, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.33, cy + Math.sin(a) * r * 0.33); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
    g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.09, 0, Math.PI * 2); g.fill();
  }
  const n = 7;
  for (let i = 0; i < n; i++) { const px = x + w * ((i + 0.5) / n); g.beginPath(); g.arc(px, y + h * 0.06, w * 0.03, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(px, y + h * 0.94, w * 0.03, 0, Math.PI * 2); g.stroke(); }
}
function muralCowPeacock(g, x, y, w, h, fg) {
  const cx = x + w / 2, cy = y + h * 0.55, s = Math.min(w, h) * 0.5;
  g.fillStyle = fg;
  g.save(); g.translate(cx - s * 0.18, cy + s * 0.05);
  g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-s * 0.4, -s * 0.08, s * 0.16, s * 0.14, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-s * 0.48, -s * 0.2); g.lineTo(-s * 0.56, -s * 0.34); g.moveTo(-s * 0.36, -s * 0.22); g.lineTo(-s * 0.3, -s * 0.36); g.lineWidth = s * 0.035; g.strokeStyle = fg; g.stroke();
  g.beginPath(); g.moveTo(s * 0.4, 0); g.quadraticCurveTo(s * 0.6, s * 0.1, s * 0.5, s * 0.3); g.lineWidth = s * 0.03; g.stroke();
  g.restore();
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
    g.beginPath(); g.ellipse(0, s * 0.12, s * 0.34, s * 0.46, 0, 0, Math.PI * 2); g.fill();
    for (let f = -2; f <= 2; f++) { g.beginPath(); g.ellipse(f * s * 0.17, -s * 0.42 - Math.abs(f) * s * 0.05, s * 0.09, s * 0.3, 0, 0, Math.PI * 2); g.fill(); }
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

/** A tiny deterministic 0-1 hash of a string (per-design jitter: skew, drips, faded/layered variants). */
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000;
}

/**
 * Paints the icon/tagline/bilingual-caption content of one text-bearing cell into the rect (x, y, w, h) — shared by
 * both wall treatments below. All these boards get the section-7 treatment for their main line: Hindi bold/larger on
 * top, English smaller beneath, same dark colour. A colourful `wash` (movie/event) sits UNDER a near-opaque pale
 * panel behind that caption so the rule's legibility test ("read at walking distance") holds whatever the poster's
 * printed colour is. An optional `sub` is a decorative Hindi-only flourish (tagline, release timing, or a plain-
 * language contact/detail line) — real boards mix a bold bilingual headline with smaller single-language annotations.
 */
function drawContent(g, d, x, y, w, h) {
  if (d.wash) {
    const grd = g.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, d.wash[0]); grd.addColorStop(1, d.wash[1]);
    g.fillStyle = grd; g.globalAlpha = 0.88; g.fillRect(x + w * 0.03, y + h * 0.03, w * 0.94, h * 0.94); g.globalAlpha = 1;
    g.strokeStyle = d.border; g.lineWidth = w * 0.009; g.strokeRect(x + w * 0.05, y + h * 0.05, w * 0.9, h * 0.9); // inner rule, posters only
  }
  const big = d.kind === 'movie' || d.kind === 'event';
  if (d.icon) { g.fillStyle = d.fg; g.strokeStyle = d.fg; d.icon(g, x + w / 2, y + h * (d.kind === 'missing' ? 0.3 : 0.24), w * (big ? 0.34 : 0.28)); }
  const capY = y + h * (d.sub ? 0.56 : 0.52), capH = h * (d.sub ? 0.4 : 0.44);
  if (big) { g.fillStyle = 'rgba(250,245,230,0.94)'; g.fillRect(x + w * 0.04, capY - h * 0.06, w * 0.92, capH + h * 0.1); }
  if (d.sub) {
    g.fillStyle = d.fg; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let subPx = Math.round(w * 0.082);
    g.font = `700 ${subPx}px "Noto Sans Devanagari", sans-serif`;
    while (g.measureText(d.sub).width > w * 0.9 && subPx > 12) { subPx -= 2; g.font = `700 ${subPx}px "Noto Sans Devanagari", sans-serif`; }
    g.fillText(d.sub, x + w / 2, y + h * (big ? 0.46 : 0.44));
  }
  drawBilingual(g, d.hi, d.en, { x: x + w / 2, y: capY, w: w * 0.88, h: capH, fg: d.fg, fillFraction: 0.92 });
}

/**
 * Treatment 1/2 (art director, 22 Nov): hand-painted directly on the wall plaster. Civic/government slogans and the
 * pure-graphic folk murals use this. No separate paper rectangle, no drop shadow — the border is the same colour as
 * the lettering (paint, not a frame), with a slightly uneven double stroke, a chalky desaturating overlay, one or two
 * faint paint drips below the border, and a very slight hand-painted skew of the whole sign. Never a torn edge: it's
 * paint, not paper.
 */
function paintPaintedBoard(g, d, x, y, w, h) {
  g.fillStyle = 'rgba(205,198,182,0.10)'; g.fillRect(x + 8, y + 8, w - 16, h - 16); // chalky, slightly desaturated old wall-paint feel
  g.strokeStyle = d.fg; g.lineWidth = w * 0.013; g.strokeRect(x + 14, y + 14, w - 28, h - 28); // integrated border: same colour as the lettering
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = w * 0.005; g.strokeRect(x + 17, y + 17, w - 34, h - 34); // faint second pass = brush unevenness
  for (let i = 0; i < 2; i++) {
    if (hashStr(d.id + i) > 0.55) continue; // not every sign drips
    const dx = x + w * (0.25 + 0.5 * hashStr(d.id + i + 'x')), dh = h * (0.05 + 0.1 * hashStr(d.id + i + 'h'));
    const grd = g.createLinearGradient(dx, y + 22, dx, y + 22 + dh);
    grd.addColorStop(0, d.fg); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.strokeStyle = grd; g.lineWidth = w * 0.006; g.beginPath(); g.moveTo(dx, y + 22); g.lineTo(dx, y + 22 + dh); g.stroke();
  }
  const angle = (hashStr(d.id + 'r') - 0.5) * 0.035; // a hair off true, like a sign painter's hand, never enough to read as crooked
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(angle); g.translate(-(x + w / 2), -(y + h / 2));
  drawContent(g, d, x, y, w, h);
  g.restore();
}

/**
 * Treatment 2/2 (art director, 22 Nov): a printed/xeroxed paper poster glued onto the wall. Movie posters, missing/
 * lost-animal notices, help-wanted/classifieds and the event posters all use this. A visible paper rectangle in a
 * cream/off-white tone distinct from the wall colour behind it, a drop shadow so it reads as stuck-on rather than
 * painted-on, one lifted/curled corner, a slight per-design rotation so posters don't all sit dead straight, an
 * optional sun-faded/yellowed variant (`d.faded`), and an optional second poster peeking out from underneath
 * (`d.layered`) for the papered-in-layers look of a real wall.
 */
function paintPastedBoard(g, d, x, y, w, h) {
  const pad = w * 0.07;
  const angle = (hashStr(d.id + 'r') - 0.5) * 0.09; // up to ~5 deg, per design (every instance of this design shares it)
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(angle); g.translate(-(x + w / 2), -(y + h / 2));
  if (d.layered) {
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(-angle * 1.8 - 0.12); g.translate(-(x + w / 2), -(y + h / 2));
    g.fillStyle = 'rgba(224,214,188,0.92)'; g.fillRect(x + pad * 0.5, y + pad * 1.3, w - pad, h - pad * 2.2); // an older poster peeking out behind
    g.restore();
  }
  const px0 = x + pad, py0 = y + pad * 0.85, pw = w - 2 * pad, ph = h - 1.7 * pad;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = w * 0.025; g.shadowOffsetX = w * 0.012; g.shadowOffsetY = h * 0.01;
  g.fillStyle = d.faded ? '#e7d9ac' : '#f3ead2';
  g.fillRect(px0, py0, pw, ph);
  g.restore();
  if (d.faded) { g.fillStyle = 'rgba(130,95,35,0.14)'; g.fillRect(px0, py0, pw, ph); } // sun-yellowed overlay
  g.strokeStyle = 'rgba(35,25,10,0.35)'; g.lineWidth = w * 0.005; g.strokeRect(px0, py0, pw, ph);
  const cs = w * 0.1; // one lifted/curled corner, top-right
  g.beginPath(); g.moveTo(px0 + pw - cs, py0); g.lineTo(px0 + pw, py0); g.lineTo(px0 + pw, py0 + cs); g.closePath();
  g.fillStyle = d.faded ? '#d9c89a' : '#fbf4de'; g.fill();
  g.strokeStyle = 'rgba(120,95,55,0.4)'; g.lineWidth = w * 0.004; g.stroke();
  drawContent(g, d, px0, py0, pw, ph);
  g.restore();
}

/** Each design: id, kind, scheme colours, hi/en (the compliant bilingual headline), optional sub (Hindi-only flourish),
 *  icon(ctx,cx,cy,scale) or draw(ctx,x,y,w,h,fg) for the pure-graphic kind. */
const DESIGNS = [
  // ---- civic / welfare slogans (quiet, pale board, matches the original 8) ----
  { id: 'clean', kind: 'civic', treatment: 'painted', bg: '#eef3ea', border: '#2c4a2a', fg: '#1f3a22', hi: 'अपना गांव साफ रखें', en: 'Keep the village clean', icon: (g, cx, cy, s) => iconBroom(g, cx, cy, s) },
  { id: 'vaccinate', kind: 'civic', treatment: 'painted', bg: '#eaf2f6', border: '#1c3e5e', fg: '#163150', hi: 'बच्चों को टीका लगवाएं', en: 'Get children vaccinated', icon: (g, cx, cy, s) => iconDrop(g, cx, cy, s) },
  { id: 'water', kind: 'civic', treatment: 'painted', bg: '#e3f0f3', border: '#0f4c5c', fg: '#0d3e4a', hi: 'जल ही जीवन है', en: 'Water is life', icon: (g, cx, cy, s) => iconDrop(g, cx, cy, s) },
  { id: 'trees', kind: 'civic', treatment: 'painted', bg: '#edf2e2', border: '#355e20', fg: '#2a4a1a', hi: 'पेड़ लगाओ, जीवन बचाओ', en: 'Plant trees, save life', icon: (g, cx, cy, s) => iconTree(g, cx, cy, s) },
  // reworded 22 Nov to the real, well-known public-service phrasing (ubiquitous civic slogan, not a brand/logo) per the owner's call
  { id: 'girled', kind: 'civic', treatment: 'painted', bg: '#f5ecec', border: '#6e2038', fg: '#5a1a2c', hi: 'बेटी बचाओ, बेटी पढ़ाओ', en: 'Save the daughter, educate the daughter', icon: (g, cx, cy, s) => iconBook(g, cx, cy, s) },
  { id: 'school', kind: 'civic', treatment: 'painted', bg: '#fbf3df', border: '#8a5a12', fg: '#6e4610', hi: 'स्कूल जरूर जाएं', en: 'Always go to school', icon: (g, cx, cy, s) => iconPencil(g, cx, cy, s) },
  { id: 'family', kind: 'civic', treatment: 'painted', bg: '#eef0f6', border: '#293a6e', fg: '#202f58', hi: 'छोटा परिवार सुखी परिवार', en: 'Small family, happy family', icon: (g, cx, cy, s) => iconFamily(g, cx, cy, s) },
  { id: 'literacy', kind: 'civic', treatment: 'painted', bg: '#f4eee0', border: '#6e4a18', fg: '#5a3c12', hi: 'साक्षरता ही शक्ति है', en: 'Literacy is strength', icon: (g, cx, cy, s) => iconBook(g, cx, cy, s) },
  { id: 'gramSabha', kind: 'civic', treatment: 'painted', bg: '#eef0e6', border: '#4a5a2a', fg: '#3a4a20', hi: 'ग्राम सभा की बैठक', en: 'Village council meeting', icon: (g, cx, cy, s) => iconNotice(g, cx, cy, s) },
  { id: 'stubble', kind: 'civic', treatment: 'painted', bg: '#f6ece0', border: '#8a3a12', fg: '#6e2e10', hi: 'पराली न जलाएं', en: "Don't burn crop stubble", icon: (g, cx, cy, s, fg) => iconNoBurn(g, cx, cy, s, fg) },

  // ---- fictional movie posters: typographic, no faces/figures, invented titles only ----
  { id: 'filmVillageLove', kind: 'movie', treatment: 'pasted', bg: '#caa24a', border: '#5a2c10', fg: '#3a2412', wash: ['#e8b23a', '#7a3a16'], mood: 'drama', hi: 'मेरा गांव मेरी जान', en: 'My village, my life', sub: 'इस दिवाली', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'drama') },
  { id: 'filmBadla', kind: 'movie', treatment: 'pasted', layered: true, bg: '#6b0f12', border: '#3a0608', fg: '#2a1012', wash: ['#6b0f12', '#1a0608'], mood: 'action', hi: 'बदला', en: 'The revenge', sub: 'जल्द आ रही है', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'action') },
  { id: 'filmChandni', kind: 'movie', treatment: 'pasted', bg: '#243a6e', border: '#182850', fg: '#1a2440', wash: ['#243a6e', '#0a1430'], mood: 'romance', hi: 'चांदनी रात', en: 'Moonlit night', sub: 'इस होली', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'romance') },
  { id: 'filmSarpanch', kind: 'movie', treatment: 'pasted', bg: '#5a4a2a', border: '#3a2e14', fg: '#2a2010', wash: ['#5a4a2a', '#2a2010'], mood: 'drama', hi: 'सरपंच', en: 'The headman', sub: 'सिनेमाघरों में', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'drama') },
  { id: 'filmDoEkad', kind: 'movie', treatment: 'pasted', faded: true, bg: '#7a5a1a', border: '#4a3a10', fg: '#3a2a0a', wash: ['#7a5a1a', '#3a2a0a'], mood: 'drama', hi: 'दो एकड़ ज़मीन', en: 'Two acres of land', sub: 'इस सीज़न', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'drama') },
  { id: 'filmAandhi', kind: 'movie', treatment: 'pasted', bg: '#4a4a52', border: '#2a2a32', fg: '#20202a', wash: ['#4a4a52', '#1a1a20'], mood: 'action', hi: 'आंधी और तूफान', en: 'Storm and whirlwind', sub: 'जल्द', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'action') },
  { id: 'filmMela', kind: 'movie', treatment: 'pasted', bg: '#a8305a', border: '#5a1838', fg: '#3a1020', wash: ['#a8305a', '#4a1030'], mood: 'romance', hi: 'मेले का प्यार', en: 'Love at the fair', sub: 'इस दिवाली', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'romance') },
  { id: 'filmKasam', kind: 'movie', treatment: 'pasted', faded: true, bg: '#2a4a3a', border: '#1a3226', fg: '#152820', wash: ['#2a4a3a', '#102018'], mood: 'drama', hi: 'कसम', en: 'The vow', sub: 'अगले हफ्ते', icon: (g, cx, cy, s, fg) => iconMoodGlyph(g, cx, cy, s, fg, 'drama') },

  // ---- missing/lost notices: invented generic owner reference, never a real phone number ----
  { id: 'missBuffalo', kind: 'missing', treatment: 'pasted', layered: true, bg: '#f3ecd8', border: '#1a1a1a', fg: '#1a1a1a', hi: 'लापता भैंस', en: 'Missing buffalo', sub: 'सरपंच के घर संपर्क करें', icon: (g, cx, cy, s, fg) => iconAnimal(g, cx, cy, s, fg, 'buffalo') },
  { id: 'missGoat', kind: 'missing', treatment: 'pasted', bg: '#f3ecd8', border: '#1a1a1a', fg: '#1a1a1a', hi: 'लापता बकरी', en: 'Missing goat', sub: 'सरपंच के घर संपर्क करें', icon: (g, cx, cy, s, fg) => iconAnimal(g, cx, cy, s, fg, 'goat') },
  { id: 'missDog', kind: 'missing', treatment: 'pasted', faded: true, bg: '#f3ecd8', border: '#1a1a1a', fg: '#1a1a1a', hi: 'लापता कुत्ता', en: 'Missing dog', sub: 'सरपंच के घर संपर्क करें', icon: (g, cx, cy, s, fg) => iconAnimal(g, cx, cy, s, fg, 'dog') },
  { id: 'missCycle', kind: 'missing', treatment: 'pasted', faded: true, bg: '#f3ecd8', border: '#1a1a1a', fg: '#1a1a1a', hi: 'साइकिल खो गई', en: 'Bicycle lost', sub: 'सरपंच के घर संपर्क करें', icon: (g, cx, cy, s, fg) => iconBicycle(g, cx, cy, s, fg) },

  // ---- classifieds / help-wanted: generic, no real business brand names, no real phone numbers ----
  { id: 'jobLabour', kind: 'classified', treatment: 'pasted', bg: '#eef0e4', border: '#3a3a2a', fg: '#2a2a1c', hi: 'खेत मजदूर चाहिए', en: 'Field labourers needed', sub: 'फसल कटाई के लिए', icon: (g, cx, cy, s, fg) => iconSickle(g, cx, cy, s, fg) },
  { id: 'jobTailor', kind: 'classified', treatment: 'pasted', faded: true, bg: '#eef0e4', border: '#3a3a2a', fg: '#2a2a1c', hi: 'दर्जी की जरूरत', en: 'Tailor wanted', sub: 'गांव में पूछें', icon: (g, cx, cy, s, fg) => iconScissors(g, cx, cy, s, fg) },
  { id: 'jobShop', kind: 'classified', treatment: 'pasted', bg: '#eef0e4', border: '#3a3a2a', fg: '#2a2a1c', hi: 'दुकान सहायक चाहिए', en: 'Shop assistant wanted', sub: 'गांव में पूछें', icon: (g, cx, cy, s, fg) => iconBell(g, cx, cy, s, fg) },
  { id: 'tuition', kind: 'classified', treatment: 'pasted', bg: '#eef0e4', border: '#3a3a2a', fg: '#2a2a1c', hi: 'ट्यूशन पढ़ाई जाती है', en: 'Tuition classes offered', sub: 'सभी विषय', icon: (g, cx, cy, s) => iconBook(g, cx, cy, s) },
  { id: 'repair', kind: 'classified', treatment: 'pasted', bg: '#eef0e4', border: '#3a3a2a', fg: '#2a2a1c', hi: 'साइकिल व ट्रैक्टर मरम्मत', en: 'Cycle and tractor repair', sub: 'यहीं होता है', icon: (g, cx, cy, s, fg) => iconWrench(g, cx, cy, s, fg) },
  { id: 'recharge', kind: 'classified', treatment: 'pasted', bg: '#eef0e4', border: '#3a3a2a', fg: '#2a2a1c', hi: 'मोबाइल रिचार्ज यहां होता है', en: 'Mobile recharge here', sub: 'गांव में पूछें', icon: (g, cx, cy, s, fg) => iconPhone(g, cx, cy, s, fg) },

  // ---- upcoming event posters: bold and festive, distinct from the quieter civic slogans ----
  { id: 'eventMela', kind: 'event', treatment: 'pasted', bg: '#d9842a', border: '#5a2008', fg: '#3a1c08', wash: ['#d9842a', '#7a2a12'], hi: 'गांव का मेला', en: 'Village fair', sub: 'जल्द आ रहा है', icon: (g, cx, cy, s, fg) => iconStarburst(g, cx, cy, s, fg) },
  { id: 'eventMagic', kind: 'event', treatment: 'pasted', bg: '#3a1a5a', border: '#24103a', fg: '#1c0c30', wash: ['#3a1a5a', '#120828'], hi: 'जादू का खेल', en: 'Magic show', sub: 'इस हफ्ते', icon: (g, cx, cy, s, fg) => iconStarburst(g, cx, cy, s, fg) },
  { id: 'eventOrchestra', kind: 'event', treatment: 'pasted', bg: '#145a4a', border: '#0e3a30', fg: '#0c2a22', wash: ['#145a4a', '#0a241e'], hi: 'ऑर्केस्ट्रा और डीजे रात', en: 'Orchestra and DJ night', sub: 'जल्द आ रहा है', icon: (g, cx, cy, s, fg) => iconNote(g, cx, cy, s, fg) },
  { id: 'eventCircus', kind: 'event', treatment: 'pasted', layered: true, bg: '#b5202a', border: '#5a1012', fg: '#3a0c0e', wash: ['#b5202a', '#e0c020'], hi: 'सर्कस आ रहा है', en: 'Circus is coming', sub: 'जल्द', icon: (g, cx, cy, s, fg) => iconTent(g, cx, cy, s, fg) },
  { id: 'eventKushti', kind: 'event', treatment: 'pasted', faded: true, bg: '#7a5a2a', border: '#3a2a10', fg: '#2a1c0a', wash: ['#7a5a2a', '#2a1c0a'], hi: 'कुश्ती दंगल', en: 'Wrestling tournament', sub: 'जल्द आ रहा है', icon: (g, cx, cy, s, fg) => iconRing(g, cx, cy, s, fg) },
  { id: 'eventCricket', kind: 'event', treatment: 'pasted', bg: '#1a5a2a', border: '#123a1a', fg: '#0e2a14', wash: ['#1a5a2a', '#0a2a12'], hi: 'क्रिकेट टूर्नामेंट', en: 'Cricket tournament', sub: 'जल्द आ रहा है', icon: (g, cx, cy, s, fg) => iconBat(g, cx, cy, s, fg) },
  { id: 'eventKabaddi', kind: 'event', treatment: 'pasted', bg: '#8a3a0a', border: '#4a1e08', fg: '#3a1604', wash: ['#8a3a0a', '#3a1604'], hi: 'कबड्डी टूर्नामेंट', en: 'Kabaddi tournament', sub: 'जल्द आ रहा है', icon: (g, cx, cy, s, fg) => iconCourt(g, cx, cy, s, fg) },
  { id: 'eventSchool', kind: 'event', treatment: 'pasted', bg: '#2a4a7a', border: '#1a3050', fg: '#152840', wash: ['#2a4a7a', '#102038'], hi: 'स्कूल का वार्षिक उत्सव', en: 'School annual function', sub: 'सबका स्वागत है', icon: (g, cx, cy, s, fg) => iconBell(g, cx, cy, s, fg) },
  { id: 'eventBlood', kind: 'event', treatment: 'pasted', bg: '#8a0e18', border: '#4a0a10', fg: '#3a0608', wash: ['#8a0e18', '#2a0408'], hi: 'रक्तदान शिविर', en: 'Blood donation camp', sub: 'सबका स्वागत है', icon: (g, cx, cy, s) => iconDrop(g, cx, cy, s) },

  // ---- pure-graphic folk-art murals (no text, generic, kept from the original four) ----
  { id: 'rangoli', kind: 'graphic', treatment: 'painted', bg: '#fbeedd', border: '#a5401c', fg: '#a5401c', draw: (g, x, y, w, h, fg) => { g.strokeStyle = fg; g.fillStyle = fg; muralRangoli(g, x, y, w, h); } },
  { id: 'cowpeacock', kind: 'graphic', treatment: 'painted', bg: '#eef2e4', border: '#2c4a2a', fg: '#243a1e', draw: muralCowPeacock },
  { id: 'handprints', kind: 'graphic', treatment: 'painted', bg: '#f1e6d6', border: '#7a2a1a', fg: '#8a2c18', draw: muralHandprints },
  { id: 'almanac', kind: 'graphic', treatment: 'painted', bg: '#f3ecd6', border: '#5a3c12', fg: '#4a3010', draw: muralAlmanac },
];

const ROWS = Math.ceil(DESIGNS.length / COLS);
const W = CW * COLS, H = CH * ROWS; // runtime canvas only — never shipped as a file, so it doesn't count against public/ or the 1K texture budgets

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
    if (d.kind === 'graphic') {
      g.strokeStyle = d.border; g.lineWidth = 8; g.strokeRect(x + 8, y + 8, CW - 16, CH - 16); // painted mural frame
      d.draw(g, x + 16, y + 16, CW - 32, CH - 32, d.fg);
    } else if (d.treatment === 'painted') paintPaintedBoard(g, d, x, y, CW, CH);
    else paintPastedBoard(g, d, x, y, CW, CH); // 'pasted' — each owns its own border/paper rect, no generic frame here
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
  // 24 Nov fix (posters upside down): the corners are now derived from the OUTWARD NORMAL alone. A viewer standing in front of
  // the wall has right = up x normal, whatever sign the caller's tangent happens to have (the left wall, front strips and
  // segment runs passed a tangent pointing the other way, which rotated the poster 180 degrees). The UV rect's top edge
  // (v1) goes to the top corners, so text reads upright and unmirrored.
  const base = pos.length / 3;
  const hw = w / 2, hh = h / 2;
  const rx = normal[2], rz = -normal[0], rl = Math.hypot(rx, rz) || 1, Rx = rx / rl, Rz = rz / rl;
  const corners = [
    [center[0] - Rx * hw, center[1] - hh, center[2] - Rz * hw], // bottom-left as seen from the front
    [center[0] + Rx * hw, center[1] - hh, center[2] + Rz * hw], // bottom-right
    [center[0] + Rx * hw, center[1] + hh, center[2] + Rz * hw], // top-right
    [center[0] - Rx * hw, center[1] + hh, center[2] - Rz * hw], // top-left
  ];
  const [u0, v0, u1, v1] = uvRect; // v0 = bottom of the picture, v1 = top (canvas texture, flipY)
  const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  corners.forEach((p, k) => { pos.push(p[0], p[1], p[2]); nor.push(normal[0], normal[1] || 0, normal[2]); uv.push(uvs[k][0], uvs[k][1]); });
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3); // counter-clockwise seen from the front
}

function pickDesign(seed) { return DESIGNS[Math.floor(hash(seed, 2) * DESIGNS.length) % DESIGNS.length]; }

/**
 * Builds the merged mural mesh for a list of building boxes / wall segments. See the file header for the two
 * supported box shapes and the full opts contract.
 */
export function buildWallMurals(boxes, opts = {}) {
  const offset = opts.offset ?? 0.03, minClear = opts.minClear ?? 0.6;
  const roads = opts.roads ?? null, roadFaceDist = opts.roadFaceDist ?? 7, roadBoost = opts.roadBoost ?? 3.5;
  const atlas = buildAtlas();
  const pos = [], nor = [], uv = [], idx = [];
  const instances = []; // debug/report use: one row per placed mural { cx, cy, cz, nx, nz, width, height, design }
  let placed = 0, skippedShort = 0, skippedDoor = 0, roadFacingPlaced = 0;

  const addPoster = (seed, cx, cy, cz, tWx, tWz, nWx, nWz, maxLen) => {
    const design = pickDesign(seed);
    const rect = atlas.rects.find((r) => r.id === design.id);
    const aspect = CH / CW;
    let width = 0.85 + hash(seed, 3) * 0.55; // 0.85 - 1.4 m wide
    width = Math.min(width, maxLen);
    if (width < 0.6) return false;
    const height = width * aspect;
    const uvRect = [rect.x0 / W, 1 - rect.y1 / H, rect.x1 / W, 1 - rect.y0 / H];
    // eye height: the poster's centre sits at ~1.5 m above the wall's own base (cy = that base), never lower than 0.65 m (clear of the plinth)
    const bottom = Math.max(0.65, 1.5 + (hash(seed, 5) - 0.5) * 0.2 - height / 2), cyy = cy + bottom;
    addQuad(pos, nor, uv, idx, [cx, cyy + height / 2, cz], [tWx, 0, tWz], [nWx, 0, nWz], width, height, uvRect);
    instances.push({ cx, cy: cyy + height / 2, cz, nx: nWx, nz: nWz, width, height, design: design.id });
    placed++;
    return true;
  };

  for (const b of boxes) {
    if (b.segment) {
      // a long straight compound/boundary wall: space several posters along it directly in world coords (real
      // roadside compound walls get layered with posters, the classic "so many walls go unused" surface).
      const { x1, z1, x2, z2, side = 1, density = 1, y: segY = 0 } = b;
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
      if (!(len > 1.5)) continue;
      const tx = dx / len, tz = dz / len, nx = -tz * side, nz = tx * side;
      const roadFacing = !roads || roads.clearance(x1 + (dx / 2) + nx * 2.5, z1 + (dz / 2) + nz * 2.5) <= roadFaceDist;
      const slots = Math.max(1, Math.round((len / 1.9) * density * (roadFacing ? 1 : 0.4)));
      for (let k = 0; k < slots; k++) {
        const t = (k + 0.5) / slots;
        const segSeed = (b.seed ?? 0) * 97 + k * 13 + 1;
        const cx0 = x1 + dx * t + nx * offset, cz0 = z1 + dz * t + nz * offset;
        const maxLen = Math.max(0.6, Math.min(1.5, len / slots - 0.15));
        if (addPoster(segSeed, cx0, segY, cz0, tx, tz, nx, nz, maxLen) && roadFacing) roadFacingPlaced++;
      }
      continue;
    }

    const { x, z, ry, w, d } = b;
    if (!(w > 0) || !(d > 0)) continue;
    const seed = b.seed ?? (x * 7 + z * 13);
    const c = Math.cos(ry), s = Math.sin(ry);
    const isShop = b.kind === 'shop';
    const wallEnd = b.zFront ?? d / 2; // local z where the side walls end (a shop's open otla has no wall)

    // candidate walls in local coords: back (-z), left (-x), right (+x) for every building; front (+z) only for a
    // house with a known door, as the strip(s) beside the door — a shop's front always keeps its own sign board clear.
    const walls = [
      { key: 'back', lx: 0, lz: -d / 2, nlx: 0, nlz: -1, tlx: 1, tlz: 0, len: w, base: 0.46 },
      { key: 'left', lx: -w / 2, lz: (-d / 2 + wallEnd) / 2, nlx: -1, nlz: 0, tlx: 0, tlz: 1, len: wallEnd + d / 2, base: 0.22 },
      { key: 'right', lx: w / 2, lz: (-d / 2 + wallEnd) / 2, nlx: 1, nlz: 0, tlx: 0, tlz: 1, len: wallEnd + d / 2, base: 0.22 },
    ];
    if (false && !isShop && b.door) { // 24 Nov: front walls carry the door and windows, so no poster ever goes there
      const hw = w / 2, leftLen = b.door.x0 + hw, rightLen = hw - b.door.x1;
      if (leftLen > 0.6 + minClear) walls.push({ key: 'frontL', lx: (-hw + b.door.x0) / 2, lz: d / 2, nlx: 0, nlz: 1, tlx: 1, tlz: 0, len: leftLen, base: 0.05 });
      if (rightLen > 0.6 + minClear) walls.push({ key: 'frontR', lx: (b.door.x1 + hw) / 2, lz: d / 2, nlx: 0, nlz: 1, tlx: 1, tlz: 0, len: rightLen, base: 0.05 });
    }

    // road-facing test: sample a point a couple of metres beyond each wall's own outward face. This is the fix for
    // "why aren't road-facing walls being utilised" — a wall that actually faces a road/lane gets `roadBoost` times
    // its base weight, so a building beside a road now very likely papers THAT wall rather than a random one.
    for (const wl of walls) {
      wl.roadFacing = false;
      if (roads) {
        const wx = x + wl.lx * c + wl.lz * s, wz = z - wl.lx * s + wl.lz * c;
        const nWx = wl.nlx * c + wl.nlz * s, nWz = -wl.nlx * s + wl.nlz * c;
        wl.roadFacing = roads.clearance(wx + nWx * 2.5, wz + nWz * 2.5) <= roadFaceDist;
      }
      wl.weight = wl.roadFacing ? wl.base * roadBoost : wl.base;
    }
    let total = walls.reduce((a, wl) => a + wl.weight, 0);
    const cap = 0.95;
    if (total > cap) { const k2 = cap / total; walls.forEach((wl) => (wl.weight *= k2)); total = cap; }

    let chosen = null, roll = hash(seed, 1), acc = 0;
    for (const wl of walls) { if (roll < acc + wl.weight) { chosen = wl; break; } acc += wl.weight; }
    if (!chosen) continue; // the remaining probability mass = "no mural on this building" — real walls stay bare too
    const isFrontSlot = chosen.key === 'frontL' || chosen.key === 'frontR';
    if (!isFrontSlot && chosen.len < minClear * 2 + 0.7) { skippedShort++; continue; }
    if (isFrontSlot && chosen.len < 0.6 + minClear) { skippedDoor++; continue; }

    const wx = x + chosen.lx * c + chosen.lz * s, wz = z - chosen.lx * s + chosen.lz * c;
    const tWx = chosen.tlx * c + chosen.tlz * s, tWz = -chosen.tlx * s + chosen.tlz * c;
    const nWx = chosen.nlx * c + chosen.nlz * s, nWz = -chosen.nlx * s + chosen.nlz * c;
    const clearHalf = isFrontSlot ? Math.min(minClear, chosen.len * 0.2) : minClear;
    const maxJitter = Math.max(0, chosen.len / 2 - clearHalf - 0.2);
    const jitter = (hash(seed, 4) * 2 - 1) * maxJitter;
    const cx = wx + tWx * jitter + nWx * offset, cz = wz + tWz * jitter + nWz * offset;
    const baseY = b.y || 0; // the wall's own base; addPoster puts the poster at eye height above it

    // never wedged in the gap between two buildings: nothing else may stand within 1.1 m in front of the poster
    const blocked = boxes.some((o) => {
      if (o === b || o.segment) return false;
      const oc = Math.cos(o.ry), os = Math.sin(o.ry);
      return [0.35, 0.8, 1.1].some((k) => { const dx = cx + nWx * k - o.x, dz = cz + nWz * k - o.z; return Math.abs(dx * oc - dz * os) <= o.w / 2 + 0.05 && Math.abs(dx * os + dz * oc) <= o.d / 2 + 0.05; });
    });
    if (blocked) { skippedShort++; continue; }
    if (addPoster(seed, cx, baseY, cz, tWx, tWz, nWx, nWz, chosen.len - clearHalf * 2)) {
      if (chosen.roadFacing) roadFacingPlaced++;
    } else skippedShort++;
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
  return { mesh, stats: { candidates: boxes.length, placed, skippedShort, skippedDoor, roadFacingPlaced, designs: DESIGNS.length, instances } };
}

export const MURAL_DESIGN_IDS = DESIGNS.map((d) => d.id);
