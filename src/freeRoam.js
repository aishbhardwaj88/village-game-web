/**
 * Free roam (docs/MISSIONS_PLAN.md sections 2 and 4): the notebook map (a kid's school-notebook page in the pause menu that fills
 * in as places and side jobs are discovered) and the little toast that announces a discovery. Side jobs themselves live in
 * src/sideJobs.js; this module owns "what has the player found" and how it is shown. Discovery state is `quest.discovered`
 * (persisted by src/save.js). Side jobs are NEVER shown as a quest list: the map only marks a job's place with a star once the
 * player has found it through a postcard, a poster or a sound.
 */

// World positions (1 unit = 1 m; +x east, +z south, so north is up on the map). Same numbers as the places' own source files.
export const PLACES = [
  { id: 'house', en: 'Our house', hi: 'हमारा घर', x: -48, z: 39, kind: 'house', radius: 22 },
  { id: 'school', en: 'Primary school', hi: 'प्राथमिक विद्यालय', x: -50, z: 106, kind: 'school', radius: 28 },
  { id: 'halwai', en: 'Halwai', hi: 'हलवाई', x: -40, z: 62, kind: 'shop', radius: 14 },
  { id: 'teastall', en: 'Tea stall', hi: 'चाय की दुकान', x: -52, z: 78, kind: 'shop', radius: 12 },
  { id: 'store', en: 'General store', hi: 'जनरल स्टोर', x: -52, z: 20, kind: 'shop', radius: 14 },
  { id: 'bazaar', en: 'Bazaar row', hi: 'बाज़ार', x: -82, z: 15, kind: 'bazaar', radius: 26 },
  { id: 'chowk', en: 'Chowk and peepal board', hi: 'चौक', x: -54, z: 13, kind: 'tree', radius: 14 },
  { id: 'post', en: 'Post office', hi: 'डाकघर', x: -68, z: 26, kind: 'shop', radius: 12 },
  { id: 'ration', en: 'Ration shop', hi: 'राशन की दुकान', x: -68, z: 31, kind: 'shop', radius: 12 },
  { id: 'chakki', en: 'Atta chakki', hi: 'आटा चक्की', x: -68, z: 36, kind: 'shop', radius: 12 },
  { id: 'temple', en: 'Village mandir', hi: 'गाँव का मंदिर', x: 8, z: 52, kind: 'temple', radius: 22 },
  { id: 'baagh', en: 'Mango baagh', hi: 'आम का बाग', x: -15, z: 10, kind: 'tree', radius: 22 },
  { id: 'canal', en: 'Nahar and bridge', hi: 'नहर और पुल', x: -15, z: 33, kind: 'bridge', radius: 16 },
  { id: 'field', en: 'Our khet', hi: 'हमारा खेत', x: 20, z: -20, kind: 'field', radius: 30 },
  { id: 'eastgali', en: 'East gali', hi: 'पूरब की गली', x: -5, z: 90, kind: 'lane', radius: 26 },
  { id: 'westgali', en: 'West gali', hi: 'पश्चिम की गली', x: -84, z: 72, kind: 'lane', radius: 26 },
];

// Faint pencil lanes so the page has structure before anything is inked (same centre-lines as src/scenery.js and the hero lanes).
const LANES = [
  [[-48, 46], [-45, 46], [-45, 107]], // hero lane south from the house
  [[-48, 46], [-58, 47], [-58, 8]], // bazaar lane
  [[-44, 50.5], [-12, 55], [2, 51]], // temple lane
  [[-37, 76], [36, 76]], [[-6, 76], [-6, 130]], // east gali
  [[-84, 21], [-84, 104]], [[-84, 21], [-61, 21]], // west gali
  [[-100, 140], [-38, 140]], // south gali
];
const BOUNDS = { x0: -125, x1: 62, z0: -45, z1: 175 };

const extraMarkers = []; // side jobs register their map star here: { id, en, hi, x, z }
export function registerJobMarker(marker) {
  extraMarkers.push(marker);
}

export function createFreeRoam({ quest, getPlayerPos, onChange }) {
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
  const W = 600, H = 700;
  canvas.width = W;
  canvas.height = H;
  const PAD = 46;
  const sx = (x) => PAD + ((x - BOUNDS.x0) / (BOUNDS.x1 - BOUNDS.x0)) * (W - PAD * 2);
  const sy = (z) => 118 + ((z - BOUNDS.z0) / (BOUNDS.z1 - BOUNDS.z0)) * (H - 118 - 70);

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
    ctx.font = '600 15px "Segoe Print","Bradley Hand","Comic Sans MS","Noto Sans",cursive,sans-serif';
    ctx.fillText(en, x, y);
    ctx.fillStyle = '#4a5a8a';
    ctx.font = '600 11px "Noto Sans Devanagari",sans-serif';
    ctx.fillText(hi, x, y + 13);
  }

  function drawNotebook() {
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
    for (let x = -28; x <= 0; x += 2) wave.push([sx(x), sy(33) + Math.sin(x * 0.9) * 1.5]);
    pencil(ctx, wave, 'rgba(45,127,141,0.8)', 3);
    // discovered places
    for (const p of PLACES) {
      if (!isDiscovered(p.id)) continue;
      icon(ctx, p.kind, sx(p.x), sy(p.z));
      label(ctx, p.en, p.hi, sx(p.x), sy(p.z) + 26);
    }
    // side-job stars
    for (const m of extraMarkers) {
      if (!isDiscovered(m.id)) continue;
      icon(ctx, 'star', sx(m.x), sy(m.z));
      label(ctx, m.en, m.hi, sx(m.x), sy(m.z) + 24);
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
  }

  let open = false;
  function openNotebook() {
    open = true;
    drawNotebook();
    overlay.classList.add('visible');
  }
  function closeNotebook() {
    open = false;
    overlay.classList.remove('visible');
  }
  closeBtn?.addEventListener('pointerdown', closeNotebook);

  return { isDiscovered, discover, toast, update, openNotebook, closeNotebook, isOpen: () => open, drawNotebook };
}
