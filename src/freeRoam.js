/**
 * Free roam (docs/MISSIONS_PLAN.md sections 2 and 4): the notebook map (a kid's school-notebook page in the pause menu that fills
 * in as places and side jobs are discovered) and the little toast that announces a discovery. Side jobs themselves live in
 * src/sideJobs.js; this module owns "what has the player found" and how it is shown. Discovery state is `quest.discovered`
 * (persisted by src/save.js). Side jobs are NEVER shown as a quest list: the map only marks a job's place with a star once the
 * player has found it through a postcard, a poster or a sound.
 */

import { pt } from './anchors.js';
import { QUEST_STEPS as S, OBJECTIVE_TEXT } from './quest.js';
import { SPURS } from './eastRoad.js';
import { JOBS } from './jobs/data.js';

// World positions (1 unit = 1 m; +x east, +z south, so north is up on the map). Same numbers as the places' own source files.
export const PLACES = [
  { id: 'house', en: 'Our house', hi: 'हमारा घर', ...pt('house'), kind: 'house', radius: 22 },
  { id: 'school', en: 'Primary school', hi: 'प्राथमिक विद्यालय', ...pt('school'), kind: 'school', radius: 28 },
  { id: 'halwai', en: 'Halwai', hi: 'हलवाई', ...pt('halwai'), kind: 'shop', radius: 14 },
  { id: 'teastall', en: 'Tea stall', hi: 'चाय की दुकान', ...pt('teastall'), kind: 'shop', radius: 12 },
  { id: 'store', en: 'General store', hi: 'जनरल स्टोर', ...pt('store'), kind: 'shop', radius: 14 },
  { id: 'bazaar', en: 'Bazaar row', hi: 'बाज़ार', ...pt('bazaar'), kind: 'bazaar', radius: 26 },
  { id: 'chowk', en: 'Chowk and peepal board', hi: 'चौक', ...pt('chowk'), kind: 'tree', radius: 14 },
  { id: 'post', en: 'Post office', hi: 'डाकघर', ...pt('post'), kind: 'shop', radius: 12 },
  { id: 'ration', en: 'Ration shop', hi: 'राशन की दुकान', ...pt('ration'), kind: 'shop', radius: 12 },
  { id: 'chakki', en: 'Atta chakki', hi: 'आटा चक्की', ...pt('chakki'), kind: 'shop', radius: 12 },
  { id: 'temple', en: 'Village mandir', hi: 'गाँव का मंदिर', ...pt('temple'), kind: 'temple', radius: 22 },
  { id: 'baagh', en: 'Mango baagh', hi: 'आम का बाग', ...pt('baagh'), kind: 'tree', radius: 22 },
  { id: 'canal', en: 'Nahar and bridge', hi: 'नहर और पुल', ...pt('canal'), kind: 'bridge', radius: 16 },
  { id: 'field', en: 'Our khet', hi: 'हमारा खेत', ...pt('field'), kind: 'field', radius: 30 },
  { id: 'banta', en: 'Banta shop', hi: 'बंटा की दुकान', ...pt('banta'), kind: 'shop', radius: 12 },
  { id: 'chaat', en: 'Chaat thela', hi: 'चाट का ठेला', ...pt('chaat'), kind: 'shop', radius: 12 },
  { id: 'eastgali', en: 'East gali', hi: 'पूरब की गली', ...pt('eastgali'), kind: 'lane', radius: 26 },
  { id: 'westgali', en: 'West gali', hi: 'पश्चिम की गली', ...pt('westgali'), kind: 'lane', radius: 26 },
  // Streamed MAP.md sites (positions from src/farmSites.js / src/main.js); they ink in when the player walks near.
  { id: 'jalebi', en: 'Jalebi stall', hi: 'जलेबी', ...pt('jalebi'), kind: 'shop', radius: 12 },
  { id: 'dairy', en: 'Dudh dairy', hi: 'दूध डेयरी', ...pt('dairy'), kind: 'shop', radius: 14 },
  { id: 'khalihan', en: 'Khalihan', hi: 'खलिहान', ...pt('khalihan'), kind: 'field', radius: 18 },
  { id: 'tubewell', en: 'Tubewell', hi: 'ट्यूबवेल', ...pt('tubewell'), kind: 'bridge', radius: 14 },
  { id: 'gaushala', en: 'Gaushala', hi: 'गौशाला', ...pt('gaushala'), kind: 'house', radius: 20 },
  { id: 'pond', en: 'Pond', hi: 'तालाब', ...pt('pond'), kind: 'water', radius: 20 },
  { id: 'anganwadi', en: 'Anganwadi', hi: 'आँगनवाड़ी', ...pt('anganwadi'), kind: 'school', radius: 16 },
  { id: 'mela', en: 'Mela ground', hi: 'मेला मैदान', ...pt('mela'), kind: 'field', radius: 26 },
  { id: 'gurudwara', en: 'Gurudwara', hi: 'गुरुद्वारा', ...pt('gurudwara'), kind: 'temple', radius: 18 },
  { id: 'cane', en: 'Sugarcane', hi: 'गन्ना', ...pt('cane'), kind: 'field', radius: 28 },
  { id: 'tvhouse', en: 'TV house', hi: 'टीवी वाला घर', ...pt('tvhouse'), kind: 'house', radius: 14 },
  { id: 'health', en: 'Health centre', hi: 'स्वास्थ्य केंद्र', ...pt('health'), kind: 'house', radius: 16 },
  { id: 'chemist', en: 'Chemist', hi: 'दवाई की दुकान', ...pt('chemist'), kind: 'shop', radius: 12 },
  { id: 'manihari', en: 'Manihari', hi: 'मनिहारी', ...pt('manihari'), kind: 'shop', radius: 10 },
  { id: 'sabzi', en: 'Sabzi rehris', hi: 'सब्ज़ी के ठेले', ...pt('sabzi'), kind: 'shop', radius: 12 },
  { id: 'johad', en: 'Johad', hi: 'जोहड़', ...pt('johad'), kind: 'water', radius: 20 },
  { id: 'masjid', en: 'Masjid', hi: 'मस्जिद', ...pt('masjid'), kind: 'temple', radius: 18 },
  { id: 'jain', en: 'Jain mandir', hi: 'जैन मंदिर', ...pt('jain'), kind: 'temple', radius: 18 },
  { id: 'haveli', en: 'Old haveli', hi: 'पुरानी हवेली', ...pt('haveli'), kind: 'house', radius: 24 },
  { id: 'gurukul', en: 'Gurukul college', hi: 'गुरुकुल कॉलेज', ...pt('gurukul'), kind: 'school', radius: 24 },
  { id: 'maidan', en: 'Khel maidan', hi: 'खेल मैदान', ...pt('maidan'), kind: 'field', radius: 26 },
  { id: 'highway', en: 'Highway and bus adda', hi: 'हाईवे और बस अड्डा', ...pt('highway'), kind: 'bazaar', radius: 30 },
  { id: 'mandi', en: 'Mandi', hi: 'मंडी', ...pt('mandi'), kind: 'bazaar', radius: 26 },
];

// Faint pencil lanes so the page has structure before anything is inked (same centre-lines as src/scenery.js and the hero lanes).
export const LANES = [
  ...SPURS.map((sp) => sp.pts), // spurs off the east road to the far-east places
  [[-48, 46], [-45, 46], [-45, 93]], // hero lane south from the house, ends at the school south gate (z 93, village.js SCHOOL_GATE_LANE_END)
  [[-48, 46], [-58, 47], [-58, 8]], // bazaar lane
  [[-44, 50.5], [-12, 55], [2, 51]], // temple lane
  [[-37, 76], [36, 76]], [[-6, 76], [-6, 130]], // east gali
  [[-84, 21], [-84, 104]], [[-84, 21], [-61, 21]], // west gali
  [[-100, 140], [-38, 140]], // south gali
  [[-45, 76], [-37, 76]], // closes the gap between the hero lane and the east gali (src/scenery.js E0)
  [[-38, 140], [-6, 140]], // joins the south gali to the east gali's south end (src/scenery.js S2)
  [[36, 76], [60, 69], [90, 68.5], [103, 66], [116, 58], [135.3, 52.3], [174.7, 45.3], [194.4, 41.8]], // east road to the highway (src/eastRoad.js ROAD_PTS)
];
const BOUNDS = { x0: -145, x1: 245, z0: -55, z1: 190 };

const extraMarkers = []; // side jobs register their map star here: { id, en, hi, x, z }
export function registerJobMarker(marker) {
  extraMarkers.push(marker);
}

export function createFreeRoam({ quest, getPlayerPos, onChange, onVisit, onPinTask, onSetMission }) {
  const overlay = document.getElementById('notebook-overlay');
  const canvas = document.getElementById('notebook-canvas');
  const closeBtn = document.getElementById('notebook-close-btn');
  const toastEl = document.getElementById('toast');
  const toastEn = document.getElementById('toast-en');
  const toastHi = document.getElementById('toast-hi');
  let toastTimer = 0;

  function isDiscovered(id) {
    return quest.discovered.includes(id);
  }

  function toast(en, hi, ms = 3600) {
    if (!toastEl) return;
    toastEn.textContent = en;
    toastHi.textContent = hi;
    toastEl.classList.add('visible');
    toastTimer = ms / 1000;
  }

  /** Marks `id` as found; returns true the first time. `label` {en, hi} = what to announce (omit for a silent discovery). */
  function discover(id, label) {
    if (isDiscovered(id)) return false;
    quest.discovered.push(id);
    if (label) toast(`New in your notebook: ${label.en}`, `नोटबुक में नया: ${label.hi}`);
    onChange?.();
    return true;
  }

  let sinceCheck = 0;
  /** Call every frame: fades the toast out and, twice a second, discovers any place the player is standing near. */
  function update(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove('visible');
    }
    sinceCheck += dt;
    if (sinceCheck < 0.5) return;
    sinceCheck = 0;
    const p = getPlayerPos();
    for (const place of PLACES) {
      if (!isDiscovered(place.id) && Math.hypot(p.x - place.x, p.z - place.z) < place.radius) {
        discover(place.id, quest.storyDone ? { en: place.en, hi: place.hi } : null); // during the story it fills in silently
      }
    }
  }

  // ------------------------------------------------------------------ the notebook page
  const W = 960, H = 640;
  canvas.width = W;
  canvas.height = H;
  const PAD = 46;
  const sx = (x) => PAD + ((x - BOUNDS.x0) / (BOUNDS.x1 - BOUNDS.x0)) * (W - PAD * 2);
  const sy = (z) => 100 + ((z - BOUNDS.z0) / (BOUNDS.z1 - BOUNDS.z0)) * (H - 100 - 56);

  function pencil(ctx, pts, colour, width) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  function icon(ctx, kind, x, y) {
    const ink = '#2b3a67';
    ctx.fillStyle = 'rgba(255,255,255,0.0)';
    switch (kind) {
      case 'house':
        pencil(ctx, [[x - 11, y + 8], [x - 11, y - 6], [x + 11, y - 6], [x + 11, y + 8], [x - 11, y + 8]], ink, 2);
        pencil(ctx, [[x - 13, y - 6], [x + 13, y - 6]], ink, 3);
        pencil(ctx, [[x - 3, y + 8], [x - 3, y + 1], [x + 3, y + 1], [x + 3, y + 8]], ink, 2);
        break;
      case 'school':
        pencil(ctx, [[x - 18, y + 8], [x - 18, y - 4], [x + 18, y - 4], [x + 18, y + 8], [x - 18, y + 8]], ink, 2);
        pencil(ctx, [[x, y - 4], [x, y - 16]], ink, 2);
        pencil(ctx, [[x, y - 16], [x + 9, y - 13], [x, y - 10]], '#d0541c', 2);
        break;
      case 'bazaar':
        for (let i = 0; i < 4; i++) pencil(ctx, [[x - 20 + i * 10, y + 8], [x - 20 + i * 10, y - 3], [x - 10 + i * 10, y - 3], [x - 10 + i * 10, y + 8]], ink, 2);
        pencil(ctx, [[x - 22, y - 5], [x + 22, y - 5]], '#d0541c', 3);
        break;
      case 'shop':
        pencil(ctx, [[x - 8, y + 7], [x - 8, y - 3], [x + 8, y - 3], [x + 8, y + 7], [x - 8, y + 7]], ink, 2);
        pencil(ctx, [[x - 10, y - 3], [x - 6, y - 8], [x + 6, y - 8], [x + 10, y - 3]], '#d0541c', 2);
        break;
      case 'tree':
        pencil(ctx, [[x, y + 9], [x, y - 1]], '#6b4a2a', 3);
        ctx.strokeStyle = '#2f7a34';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y - 7, 9, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'temple':
        pencil(ctx, [[x - 10, y + 8], [x - 10, y - 2], [x + 10, y - 2], [x + 10, y + 8]], ink, 2);
        pencil(ctx, [[x - 8, y - 2], [x - 5, y - 8], [x, y - 14], [x + 5, y - 8], [x + 8, y - 2]], ink, 2);
        break;
      case 'bridge':
        pencil(ctx, [[x - 14, y - 4], [x + 14, y - 4]], '#2d7f8d', 2);
        pencil(ctx, [[x - 14, y + 5], [x + 14, y + 5]], '#2d7f8d', 2);
        pencil(ctx, [[x - 6, y - 8], [x - 6, y + 9]], ink, 3);
        pencil(ctx, [[x + 6, y - 8], [x + 6, y + 9]], ink, 3);
        break;
      case 'field':
        for (let i = -2; i <= 2; i++) pencil(ctx, [[x - 18, y + i * 5], [x + 18, y + i * 5 - 2]], '#b58a2c', 2);
        break;
      case 'water':
        pencil(ctx, [[x - 14, y - 3], [x - 7, y - 6], [x, y - 3], [x + 7, y - 6], [x + 14, y - 3]], '#2d7f8d', 2);
        pencil(ctx, [[x - 14, y + 4], [x - 7, y + 1], [x, y + 4], [x + 7, y + 1], [x + 14, y + 4]], '#2d7f8d', 2);
        break;
      case 'lane':
        pencil(ctx, [[x - 12, y + 6], [x - 3, y - 2], [x + 4, y + 2], [x + 12, y - 6]], '#8a6a4a', 2);
        break;
      case 'star':
        ctx.fillStyle = '#e0a21b';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 4.5 : 11;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#8a5a00';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      default:
        break;
    }
  }

  function label(ctx, en, hi, x, y) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1d2a55';
    ctx.font = `600 15px "Segoe Print","Bradley Hand","Comic Sans MS","Noto Sans",cursive,sans-serif`;
    ctx.fillText(en, x, y);
    ctx.fillStyle = '#4a5a8a';
    ctx.font = `600 11px "Noto Sans Devanagari",sans-serif`;
    ctx.fillText(hi, x, y + 13);
  }

  // Click-to-travel (BACKLOG A-2a): every place drawn on the page is a hit target, built from the same PLACES data the page
  // is drawn from, so a new or moved place is clickable with no edit here. Press shows the name, release on the same place
  // travels there through onVisit (main.js visitPlace, the one travel function the Visit-place list uses too).
  let mapHits = []; // { x, y, place } in canvas pixels, rebuilt on every draw
  let hoverHit = null;
  let pressedHit = null;
  let mapArmed = null; // place id tapped once mid-mission
  let mapWarn = '';
  const HIT_CSS_PX = 44; // a finger needs a 44 px target

  function drawNotebook() {
    mapHits = [];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f7f0dc';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(88,130,190,0.28)';
    ctx.lineWidth = 1;
    for (let y = 100; y < H; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,70,70,0.45)';
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, H);
    ctx.stroke();
    // heading
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d2a55';
    ctx.font = '700 28px "Segoe Print","Bradley Hand","Comic Sans MS",cursive,sans-serif';
    ctx.fillText('My map of Amrai Khera', 48, 50);
    ctx.fillStyle = '#4a5a8a';
    ctx.font = '600 14px "Noto Sans Devanagari",sans-serif';
    ctx.fillText('अमराई खेड़ा का मेरा नक्शा', 48, 74);
    // faint lanes
    for (const lane of LANES) pencil(ctx, lane.map(([x, z]) => [sx(x), sy(z)]), 'rgba(110,90,70,0.32)', 5);
    // the canal, drawn as a wavy blue line in the north
    const wave = [];
    for (let x = -50; x <= 34; x += 2) wave.push([sx(x), sy(33) + Math.sin(x * 0.9) * 1.5]);
    pencil(ctx, wave, 'rgba(45,127,141,0.8)', 3);
    // discovered places
    const labelled = []; // label anchors already inked; a label that would overprint one of them is skipped (icon only)
    const clear = (x, y) => labelled.every(([lx, ly]) => Math.abs(lx - x) > 96 || Math.abs(ly - y) > 40);
    for (const p of PLACES) {
      // Nothing is hidden (art director 2026-10-23): every place is on the page from the first load; a small tick marks visited ones.
      const x = sx(p.x), y = sy(p.z);
      mapHits.push({ x, y, place: p });
      icon(ctx, p.kind, x, y);
      if (isDiscovered(p.id)) pencil(ctx, [[x + 12, y - 12], [x + 15, y - 8], [x + 21, y - 17]], '#2f7a34', 2.5);
      if (clear(x, y)) {
        label(ctx, p.en, p.hi, x, y + 26);
        labelled.push([x, y]);
      }
    }
    // side-job stars
    for (const m of extraMarkers) {
      if (!isDiscovered(m.id)) continue;
      icon(ctx, 'star', sx(m.x), sy(m.z));
      label(ctx, m.en, m.hi, sx(m.x), sy(m.z) + 24);
      mapHits.push({ x: sx(m.x), y: sy(m.z), place: { ...m, radius: 10 } });
    }
    // you are here
    const p = getPlayerPos();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3.5;
    const px = sx(p.x), py = sy(p.z);
    ctx.beginPath();
    ctx.moveTo(px - 7, py - 7);
    ctx.lineTo(px + 7, py + 7);
    ctx.moveTo(px + 7, py - 7);
    ctx.lineTo(px - 7, py + 7);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.font = '700 12px "Segoe Print","Comic Sans MS",cursive,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('you', px + 10, py - 6);
    // pouch (bottom margin)
    ctx.fillStyle = '#1d2a55';
    ctx.font = '600 14px "Segoe Print","Comic Sans MS",cursive,sans-serif';
    ctx.textAlign = 'left';
    const bits = [`Pocket money: Rs ${quest.pocket}`];
    if (quest.marbles) bits.push(`Marbles: ${quest.marbles}`);
    if (quest.kites) bits.push(`Kites: ${quest.kites}`);
    if (quest.mangoVarieties?.length) bits.push(`Mangoes tasted: ${quest.mangoVarieties.length}/6`);
    ctx.fillText(bits.join('   '), 48, H - 24);
    ctx.fillStyle = '#4a5a8a';
    ctx.font = '600 11px "Noto Sans Devanagari",sans-serif';
    ctx.fillText(`जेब खर्च: ₹${quest.pocket}`, 48, H - 8);
    // the place under the pointer: a ring and its name, so you know what a click will do
    const hot = pressedHit || hoverHit;
    if (hot) {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(hot.x, hot.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const en = hot.place.en, hi = hot.place.hi;
      ctx.font = '700 18px "Segoe Print","Bradley Hand","Comic Sans MS",cursive,sans-serif';
      const w = Math.max(ctx.measureText(en).width, 120) + 28;
      const bx = Math.min(Math.max(hot.x - w / 2, 8), W - w - 8);
      const by = hot.y - 82 < 8 ? hot.y + 34 : hot.y - 82;
      ctx.fillStyle = 'rgba(255,252,240,0.96)';
      ctx.strokeStyle = '#1d2a55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, w, 50, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d2a55';
      ctx.textAlign = 'center';
      ctx.fillText(en, bx + w / 2, by + 22);
      ctx.fillStyle = '#4a5a8a';
      ctx.font = '600 14px "Noto Sans Devanagari",sans-serif';
      ctx.fillText(hi, bx + w / 2, by + 42);
    }
    if (mapWarn) {
      ctx.font = '700 15px "Segoe Print","Comic Sans MS",cursive,sans-serif';
      ctx.textAlign = 'center';
      const w = Math.min(W - 40, ctx.measureText(mapWarn).width + 30);
      ctx.fillStyle = 'rgba(255,244,214,0.97)';
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2, H - 76, w, 34, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8a1f12';
      ctx.fillText(mapWarn, W / 2, H - 54);
    }
  }

  /** The place whose icon is within a 44 CSS px target of the pointer, or null (empty page does nothing). */
  function hitAt(e) {
    const rect = canvas.getBoundingClientRect();
    const kx = W / canvas.clientWidth;
    const ky = H / canvas.clientHeight;
    const cx = (e.clientX - rect.left - canvas.clientLeft) * kx;
    const cy = (e.clientY - rect.top - canvas.clientTop) * ky;
    const r = (HIT_CSS_PX / 2) * Math.max(kx, ky);
    let best = null;
    let bestD = Infinity;
    for (const h of mapHits) {
      const d = Math.hypot(h.x - cx, h.y - cy);
      if (d <= r && d < bestD) { best = h; bestD = d; }
    }
    return best;
  }
  function travelTo(place) {
    if (midMission() && mapArmed !== place.id) {
      mapArmed = place.id;
      mapWarn = `You are mid-errand. Click ${place.en} again to go there anyway; your errand keeps its place.`;
      drawNotebook();
      return;
    }
    if (onVisit?.(place)) {
      mapArmed = null;
      mapWarn = '';
      closeNotebook();
    } else {
      mapWarn = 'Could not find a clear spot there.';
      drawNotebook();
    }
  }
  canvas.addEventListener('pointermove', (e) => {
    if (!open) return;
    const h = hitAt(e);
    canvas.style.cursor = h ? 'pointer' : 'default';
    if ((h && h.place.id) !== (hoverHit && hoverHit.place.id)) { hoverHit = h; drawNotebook(); }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!open || (!hoverHit && !pressedHit)) return;
    hoverHit = null;
    pressedHit = null;
    drawNotebook();
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!open) return;
    e.preventDefault();
    pressedHit = hitAt(e);
    hoverHit = pressedHit;
    drawNotebook();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!open) return;
    const down = pressedHit;
    pressedHit = null;
    const h = hitAt(e);
    if (down && h && h.place.id === down.place.id) travelTo(h.place);
    else drawNotebook();
  });

  let open = false;
  function openNotebook() {
    open = true;
    hoverHit = null;
    pressedHit = null;
    mapArmed = null;
    mapWarn = '';
    drawNotebook();
    overlay.classList.add('visible');
  }
  function closeNotebook() {
    open = false;
    overlay.classList.remove('visible');
  }
  closeBtn?.addEventListener('pointerdown', closeNotebook);

  // ------------------------------------------------------------------ "Visit place" list (art director 2026-10-23)
  // Built from PLACES + the side-job markers, so a new or moved place appears here with no edit to this list. Every place is
  // listed (discovered or not) - it is a review/jump menu, not a map.
  const visitOverlay = document.getElementById('visit-overlay');
  const visitList = document.getElementById('visit-list');
  const visitWarn = document.getElementById('visit-warn');
  let visitOpen = false;
  let armed = null; // place id the player has tapped once while a mission is in progress
  function midMission() {
    return !quest.storyDone && quest.step !== 'not_started';
  }
  function openVisit() {
    armed = null;
    visitWarn.textContent = '';
    visitList.textContent = '';
    for (const p of PLACES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="v-en"></span><span class="v-hi"></span>`;
      b.querySelector('.v-en').textContent = p.en;
      b.querySelector('.v-hi').textContent = p.hi;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (midMission() && armed !== p.id) {
          armed = p.id;
          visitWarn.textContent = `You are mid-errand. Tap ${p.en} again to go there anyway - your errand keeps its place. / फिर से टैप करें।`;
          return;
        }
        if (onVisit?.(p)) closeVisit();
        else visitWarn.textContent = 'Could not find a clear spot there.';
      });
      visitList.appendChild(b);
    }
    visitOpen = true;
    visitOverlay.classList.add('visible');
  }
  function closeVisit() {
    visitOpen = false;
    visitOverlay.classList.remove('visible');
  }
  document.getElementById('visit-close-btn')?.addEventListener('pointerdown', closeVisit);

  // ------------------------------------------------------------------ "Tasks" list (art director 2026-10-23)
  // Story missions in order with their state, then the 10 side jobs. Switching is guarded: a mission can only be picked while it
  // is the current one (its objective and waypoint are already live); later ones can be skipped to, earlier ones can be replayed (story still running).
  // Side jobs only exist in free roam (docs/MISSIONS_PLAN.md), so before that they are listed as locked; in free roam picking one
  // walks the player to the job's place.
  const MISSIONS = [
    { en: 'Jalebi for Maa', hi: 'माँ के लिए जलेबी', steps: [S.NOT_STARTED, S.HAVE_MONEY, S.HAVE_JALEBI, S.COMPLETE] },
    { en: 'Tiffin to school, bring sister home', hi: 'स्कूल में टिफिन, बहन को घर लाओ', hub: S.COMPLETE, steps: [S.HAVE_TIFFIN, S.HAVE_SISTER, S.ERRAND2_COMPLETE] },
    { en: 'Wheat sacks to the kirana', hi: 'गेहूं की बोरियाँ किराना पर', hub: S.ERRAND2_COMPLETE, steps: [S.LOADING_WHEAT, S.WHEAT_DELIVERED, S.BOUGHT_GOODS, S.ERRAND3_COMPLETE] },
    { en: "Find the postman, Bua's letter", hi: 'डाकिया और बुआ की चिट्ठी', hub: S.ERRAND3_COMPLETE, steps: [S.FINDING_POSTMAN, S.HAVE_LETTER, S.ERRAND4_COMPLETE] },
    { en: "Dada's kurta from the darzi", hi: 'दादा का कुर्ता दर्जी से', hub: S.ERRAND4_COMPLETE, steps: [S.GOING_TO_DARZI, S.HAVE_KURTA] },
    { en: 'The monkey and the kurta', hi: 'बंदर और कुर्ता', steps: [S.KURTA_STOLEN, S.KURTA_RECOVERED, S.ERRAND6_COMPLETE] },
    { en: 'Mango baagh run', hi: 'आम के बाग की सैर', hub: S.ERRAND6_COMPLETE, steps: [S.GOING_TO_BAAGH, S.KNOCKING_MANGOES, S.MANGOES_LOADED, S.ERRAND7_COMPLETE] },
    { en: 'Sunset on the roof', hi: 'छत पर सूर्यास्त', hub: S.ERRAND7_COMPLETE, steps: [S.GOING_TO_ROOF, S.ALL_COMPLETE] },
  ];
  function missionIndex() {
    if (quest.storyDone || quest.step === S.FREE_ROAM) return MISSIONS.length;
    return MISSIONS.findIndex((m) => m.steps.includes(quest.step));
  }
  const tasksOverlay = document.getElementById('tasks-overlay');
  const tasksList = document.getElementById('tasks-list');
  const tasksNote = document.getElementById('tasks-note');
  let tasksOpen = false;
  function taskRow(en, hi, state, sub, onTap) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `t-${state}`;
    b.innerHTML = '<span class="v-en"></span><span class="v-hi"></span><span class="t-state"></span>';
    b.querySelector('.v-en').textContent = en;
    b.querySelector('.v-hi').textContent = hi;
    b.querySelector('.t-state').textContent = sub;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onTap();
    });
    tasksList.appendChild(b);
  }
  function openTasks() {
    tasksNote.textContent = '';
    tasksList.textContent = '';
    const cur = missionIndex();
    MISSIONS.forEach((m, i) => {
      if (i < cur) {
        // Out-of-order switching: a finished mission can be replayed from its hub step while the story is still running
        // (after the story ends the saved state is free roam, so replay stays off there).
        const replayStep = i === 0 ? S.NOT_STARTED : m.hub;
        if (replayStep && onSetMission && !quest.storyDone)
          taskRow(`${i + 1}. ${m.en}`, m.hi, 'done', 'Done - tap to play it again', () => {
            if (onSetMission(replayStep)) {
              onPinTask?.(null);
              closeTasks();
            } else tasksNote.textContent = 'Finish the chase first. / पहले पीछा पूरा करो।';
          });
        else taskRow(`${i + 1}. ${m.en}`, m.hi, 'done', 'Done / पूरा', () => (tasksNote.textContent = 'Already done. / पहले ही पूरा हो चुका।'));
      }
      else if (i === cur) {
        const o = OBJECTIVE_TEXT[quest.step];
        const obj = typeof o === 'function' ? o(quest) : o;
        taskRow(`${i + 1}. ${m.en}`, m.hi, 'current', `Now: ${obj.en}`, () => {
          onPinTask?.(null); // picking the live mission hands the waypoint back to its objective
          closeTasks();
        });
      } else if (m.hub && onSetMission) {
        taskRow(`${i + 1}. ${m.en}`, m.hi, 'locked', 'Skip ahead - tap to start this one', () => {
          if (onSetMission(m.hub)) {
            onPinTask?.(null);
            closeTasks();
          } else tasksNote.textContent = 'Finish the chase first. / पहले पीछा पूरा करो।';
        });
      } else taskRow(`${i + 1}. ${m.en}`, m.hi, 'locked', `Locked - finish mission ${cur + 1} first`, () => (tasksNote.textContent = `Finish "${MISSIONS[cur]?.en}" first. / पहले पिछला काम पूरा करो।`));
    });
    const roam = quest.storyDone || quest.step === S.FREE_ROAM;
    for (const [id, j] of Object.entries(JOBS).sort((a, b) => a[1].n - b[1].n)) {
      const n = quest.jobsDone?.[id] || 0;
      if (!roam) taskRow(j.en, j.hi, 'locked', 'Side job - opens after the story', () => (tasksNote.textContent = 'Side jobs open once the story is finished. / कहानी के बाद खुलेंगे।'));
      else
        taskRow(j.en, j.hi, n ? 'done' : 'current', n ? `Done x${n} - tap to go there` : 'Tap to walk there', () => {
          onPinTask?.({ x: j.x, z: j.z });
          if (onVisit?.({ id: `job_${id}`, en: j.en, hi: j.hi, x: j.x, z: j.z })) closeTasks();
          else tasksNote.textContent = 'Could not find a clear spot there.';
        });
    }
    // Free roam stays its own entry: never a mission, never locked once the story is done.
    taskRow('Continue roaming', 'घूमते रहो', roam ? 'current' : 'locked', roam ? 'No task - just wander' : 'Opens after the story', () => {
      if (!roam) tasksNote.textContent = 'Free roam opens once the story is finished. / कहानी के बाद खुलेगा।';
      else {
        onPinTask?.(null);
        closeTasks();
      }
    });
    tasksOpen = true;
    tasksOverlay.classList.add('visible');
  }
  function closeTasks() {
    tasksOpen = false;
    tasksOverlay.classList.remove('visible');
  }
  document.getElementById('tasks-close-btn')?.addEventListener('pointerdown', closeTasks);

  return { isDiscovered, discover, toast, update, openNotebook, closeNotebook, isOpen: () => open, drawNotebook, mapHits: () => mapHits.map((h) => ({ id: h.place.id, en: h.place.en, x: h.x, y: h.y })), openVisit, closeVisit, isVisitOpen: () => visitOpen, openTasks, closeTasks, isTasksOpen: () => tasksOpen };
}
