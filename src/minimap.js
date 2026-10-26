/**
 * Corner minimap (A-2b): a torn corner of the same notebook page the full map uses (src/freeRoam.js). North is up, a ~110 m
 * window follows the player. Shows landmark icons from PLACES, the lanes, a red arrow for the player (pointing where the camera
 * looks) and a ringed star on the current objective (off-window objectives clamp to the edge). Tap/click opens the full map.
 * Redrawn ~8 times a second, only while visible. Hidden state persists in localStorage.
 */

import { PLACES } from './freeRoam.js';

const HIDE_KEY = 'dopahar.minimapHidden';
const SPAN = 110; // metres across the window on foot
const SPAN_FAST = 220; // widened window while moving at vehicle speed, so the road ahead shows
const INK = '#2b3a67';

/** Small solid glyph per place kind - readable at ~6 px, unlike the full map's line icons. */
function glyph(ctx, kind, x, y) {
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  switch (kind) {
    case 'house': case 'school': case 'shop': case 'bazaar':
      ctx.fillRect(x - 3, y - 2, 6, 5);
      ctx.fillStyle = '#d0541c';
      ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x, y - 6); ctx.lineTo(x + 4, y - 2); ctx.fill();
      break;
    case 'temple':
      ctx.beginPath(); ctx.moveTo(x - 4, y + 3); ctx.lineTo(x, y - 6); ctx.lineTo(x + 4, y + 3); ctx.fill();
      break;
    case 'tree':
      ctx.fillStyle = '#2f7a34';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      break;
    case 'water':
      ctx.fillStyle = '#2d7f8d';
      ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0, 0, 7); ctx.fill();
      break;
    case 'field':
      ctx.strokeStyle = '#b58a2c';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x - 5, y + i * 3); ctx.lineTo(x + 5, y + i * 3); ctx.stroke(); }
      break;
    case 'bridge':
      ctx.fillStyle = '#2d7f8d';
      ctx.fillRect(x - 5, y - 1.5, 10, 3);
      break;
    default: // lane
      ctx.fillStyle = '#8a6a4a';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
  }
}

/**
 * @param {{getPlayerPos: () => {x:number,z:number}, getCameraDir: () => {x:number,z:number}, getObjective: () => ({x:number,z:number}|null),
 *          lanes: number[][][], onOpen: () => void}} opts
 */
export function createMinimap({ getPlayerPos, getCameraDir, getObjective, lanes, onOpen }) {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return { update() {}, setHidden() {}, isHidden: () => true, setActive() {} };
  const wrap = document.getElementById('minimap-wrap');
  const ctx = canvas.getContext('2d');
  const S = 168; // backing-store size; CSS scales it down on phones
  canvas.width = S;
  canvas.height = S;
  let span = SPAN; // eases between SPAN and SPAN_FAST with the player's speed
  let k = S / span;
  let last = null; // previous drawn position, for speed
  let lastT = 0;

  let hidden = false;
  try { hidden = localStorage.getItem(HIDE_KEY) === '1'; } catch { /* private mode */ }
  let active = false; // shown only once the game has started
  let sinceDraw = 1;

  function apply() {
    wrap.style.display = active && !hidden ? 'block' : 'none';
  }
  function setHidden(h) {
    hidden = h;
    try { localStorage.setItem(HIDE_KEY, h ? '1' : '0'); } catch { /* ignore */ }
    apply();
    sinceDraw = 1;
  }
  function setActive(a) {
    active = a;
    apply();
  }
  wrap.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen?.();
  });

  function draw() {
    const p = getPlayerPos();
    const now = performance.now();
    if (last && now > lastT) {
      const v = Math.hypot(p.x - last.x, p.z - last.z) / ((now - lastT) / 1000);
      const want = v > 7 ? SPAN_FAST : SPAN; // running is ~5 m/s, vehicles faster
      span += (want - span) * 0.12;
      k = S / span;
    }
    last = { x: p.x, z: p.z };
    lastT = now;
    const wx = (x) => S / 2 + (x - p.x) * k;
    const wy = (z) => S / 2 + (z - p.z) * k;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#f7f0dc';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(88,130,190,0.25)';
    ctx.lineWidth = 1;
    for (let y = 14; y < S; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(110,90,70,0.45)';
    ctx.lineWidth = 4;
    for (const lane of lanes) {
      ctx.beginPath();
      lane.forEach(([x, z], i) => (i ? ctx.lineTo(wx(x), wy(z)) : ctx.moveTo(wx(x), wy(z))));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(45,127,141,0.8)'; // canal, north of the village
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(wx(-50), wy(33)); ctx.lineTo(wx(34), wy(33)); ctx.stroke();
    ctx.font = '700 9px "Segoe Print","Comic Sans MS",cursive,sans-serif';
    ctx.textAlign = 'center';
    for (const pl of PLACES) {
      const x = wx(pl.x), y = wy(pl.z);
      if (x < -8 || y < -8 || x > S + 8 || y > S + 8) continue;
      glyph(ctx, pl.kind, x, y);
    }
    // objective: ringed star, clamped to the edge when outside the window
    const o = getObjective();
    if (o) {
      let ox = wx(o.x), oy = wy(o.z);
      const m = 11;
      const off = ox < m || oy < m || ox > S - m || oy > S - m;
      ox = Math.min(S - m, Math.max(m, ox));
      oy = Math.min(S - m, Math.max(m, oy));
      if (off) {
        // off-window: a small pointer toward the objective (shipped-game convention)
        const a = Math.atan2(o.z - p.z, o.x - p.x);
        ctx.save();
        ctx.translate(ox + Math.cos(a) * 0, oy + Math.sin(a) * 0);
        ctx.rotate(a);
        ctx.fillStyle = '#8a5a00';
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(9, -4); ctx.lineTo(9, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#e0a21b';
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 3.5 : 8;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // distance in metres, so a far objective still says how far
      const dist = Math.round(Math.hypot(o.x - p.x, o.z - p.z));
      ctx.fillStyle = INK;
      ctx.font = '700 9px "Segoe Print","Comic Sans MS",cursive,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dist + ' m', Math.min(S - 14, Math.max(14, ox)), oy < S / 2 ? oy + 19 : oy - 12);
    }
    // player arrow at the centre, pointing where the camera looks
    const d = getCameraDir();
    const ang = Math.atan2(d.z, d.x);
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(ang);
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#fff8e6';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, 6); ctx.lineTo(-3, 0); ctx.lineTo(-6, -6); ctx.closePath();
    ctx.stroke(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.font = '700 11px "Segoe Print","Comic Sans MS",cursive,sans-serif';
    ctx.fillText('N', S / 2, 12);
  }

  function update(dt) {
    if (!active || hidden) return;
    sinceDraw += dt;
    if (sinceDraw < 0.12) return;
    sinceDraw = 0;
    draw();
  }

  return { update, setHidden, isHidden: () => hidden, setActive };
}
