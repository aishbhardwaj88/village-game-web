import * as THREE from 'three';
import { LAND_QUALITY } from './landQuality.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BatchKit, orientedBoxes } from './landInstancing.js';
import { shopHouse, shop, kiosk, cart, shed, farBlock } from './shopsKit.js';
import { SignAtlas, boardGeometry, signNameFor, SHAPES, CW, layoutFor } from './shopsSigns.js';
import { kitMaterials } from './landMaterials.js';
import { labelKey, labelName, ringRect, matchPlace, hash01, makeRoadIndex } from './landLayout.js';
import { PALETTE, WALL_TINT_STRENGTH } from '../village.js';
import { stockTradeOf, stallGoodsOf } from './shopsStock.js';
import { buildWallMuralsGen } from './wallMurals.js'; // S7 WIRING (integrator, signage)
import { runSync, sliceGen } from './lateBuild.js';
import SHOP_RECTS from '../layout/shopRects.json' with { type: 'json' }; // 25 Nov (her rule): every shop faces the road it fronts and stands 0 overlap off every band, made by tools/shop-rects-pack.mjs

/**
 * Places every new shop of the approved map (?layout=new): the ~44 two-storey shop-houses (new_sqx), the ~37 kiosks and
 * carts (new_kiosk, new_cart), the single shops and shop-like civic buildings (new_<Name>, 3.6 m blocks), and three open
 * sheds (bus shelter, cycle stand, jaggery unit). Fronts come from places[].front (the TRUE front), snapped onto the plot's
 * own edge so walls stay parallel to the drawn plot. Boards come from ONE atlas (src/kit/shopsSigns.js).
 *
 * Draw calls: one BatchedMesh per material (plaster, brick, concrete, wood, rust) for every body, near and far, + one merged
 * mesh for every board = 6. Near/far switch per shop at NEAR_M from the camera.
 */
const NEAR_M = LAND_QUALITY.shopNearM, MID_M = LAND_QUALITY.shopMidM; // full detail / no stock on the shelves / plain block
const WALLS = [PALETTE.cream, PALETTE.mustard, PALETTE.terracotta, PALETTE.teal, PALETTE.fadedBlue, PALETTE.schoolYellow, PALETTE.greyGreen, PALETTE.cream];
const paint = (hex) => new THREE.Color(1, 1, 1).lerp(new THREE.Color(hex), WALL_TINT_STRENGTH).getHex();

const NOT_SHOPS = new Set(['Hand pump', 'Well', 'Washing line', 'Dung cakes', 'Resting spot', 'Buffalo', 'Haystack', 'Old well', 'Transformer', 'Mobile tower', 'Water trough', 'Washing platform', 'Barber under a tree', 'Weekly market ground']);
const SHEDS = new Set(['Bus shelter', 'Cycle stand', 'Jaggery making unit', 'Milk carts']);

export function tradeOf(name) {
  const n = name.toLowerCase();
  if (!/chemist \(health|repair|workshop|tractor|tent|puncture/.test(n) || /watch|electrical/.test(n)) { const st = stockTradeOf(name); if (st) return st; }
  if (/bank|library|clinic|hospital|cooperative|community hall|collection point|chemist \(health/.test(n)) return 'office';
  if (/dhaba|tea stall|samosa|snacks|lassi|tea and/.test(n)) return 'dhaba';
  if (/repair|workshop|blacksmith|carpenter|tractor|tent/.test(n)) return 'workshop';
  if (/kirana|grocery|general store|ration|spices|dry fruits|pickles/.test(n)) return 'kirana';
  if (/sweet|mithai|namkeen|bakery|rewari/.test(n)) return 'sweets';
  if (/cloth|saree|readymade|tailor|uniform/.test(n)) return 'cloth';
  if (/seed|fertiliser|godown/.test(n)) return 'seeds';
  return 'general';
}

/** The final rect of one shop object: { cx, cz, w, d, ry, front } from src/layout/shopRects.json (same key layout.js uses), or null. */
const shopRectOf = (o) => SHOP_RECTS.rects[`${o.label}@${o.rings[0][0][0]},${o.rings[0][0][1]}`] || null;

export function buildShops(map, opts = {}) { return runSync(buildShopsGen(map, opts)); }
/** Same build, time-sliced (boot-CPU pass, 25 Nov): `ms` of work per turn, then back to the main thread. Identical output. */
export function buildShopsAsync(map, opts = {}, ms = 4) { return sliceGen(buildShopsGen(map, opts), ms); }
function* buildShopsGen(map, { camera = null } = {}) {
  const places = map.places;
  const roads = makeRoadIndex(map.roads);
  const kit = new BatchKit('s7_shops');
  const atlas = new SignAtlas();
  const boards = [];
  const muralBoxes = [];
  const colliders = [];
  const lod = []; // { x, z, near, far }
  const report = { shopHouses: 0, shopkeeperHomes: 0, shops: 0, kiosks: 0, carts: 0, sheds: 0, skipped: [], onRoad: [], backToRoad: [], skewed: [] };
  const designSigns = new Map();

  const put = (type, key, build, rect, opts, i) => {
    (report.rects ||= []).push({ name: opts.signName || key, type, x: rect.x, z: rect.z, ry: rect.ry, w: rect.width, d: rect.depth }); // the rect each design is placed on (tools/map-match-shops.mjs --game reads this)
    const near = key, mid = key + '|lite';
    if (!kit.designs.has(near)) {
      const d = build(false);
      kit.design(near, () => d.geo); designSigns.set(near, d.sign);
      kit.design(mid, () => build(true).geo);
    }
    const H = opts.H || 3.6, storeys = type === 'shopHouse' ? 2 : 1;
    const farKey = `far|${rect.width.toFixed(1)}|${rect.depth.toFixed(1)}|${H}|${storeys}`;
    const big = type === 'shopHouse' || type === 'shop';
    if (big) kit.design(farKey, () => farBlock({ W: rect.width, D: rect.depth, H, storeys }).geo);
    // 25 Nov wall variety: each shop gets its own wall tint (+-6% brightness on top of the palette pick) and one of 4 approved plaster
    // surfaces (plaster, plaster_j, plaster_m, plaster_p: same library names the houses use), both fixed by the shop's own id
    const jit = 0.94 + hash01(i, 15) * 0.12;
    const colors = { plaster: new THREE.Color(paint(WALLS[Math.floor(hash01(i, 3) * WALLS.length)])).multiplyScalar(jit).getHex() };
    const pvu = hash01(i, 16), pv = pvu < 0.34 ? null : pvu < 0.56 ? 'plaster_j' : pvu < 0.78 ? 'plaster_m' : 'plaster_p';
    const remap = pv ? { plaster: pv } : null;
    const nearId = kit.add(near, { x: rect.x, z: rect.z, ry: rect.ry, colors, remap });
    const midId = kit.add(mid, { x: rect.x, z: rect.z, ry: rect.ry, colors, visible: false, remap });
    const farId = big ? kit.add(farKey, { x: rect.x, z: rect.z, ry: rect.ry, colors, visible: false, remap }) : -1;
    lod.push({ x: rect.x, z: rect.z, ids: [nearId, midId, farId], tier: 0 });
    // signboard: a real shape (own row height, see shopsSigns.js SHAPES), not one box repainted 14 ways (her 22 Nov
    // note: "some boards are thin, some thick, some have more height, some less, text left, right or centred").
    const s = designSigns.get(near);
    if (s && opts.signName) {
      const schemeIdx = Math.floor(hash01(i, 9) * 14); // 14 paint schemes
      const shapeIdx = Math.floor(hash01(i, 10) * SHAPES.length);
      const cell = atlas.cell(opts.signName, schemeIdx, shapeIdx, layoutFor(i));
      if (cell) {
        const aspect = CW / SHAPES[shapeIdx].ch;
        let h = Math.min(s.h * 1.7, Math.max(s.h * 0.55, s.w / aspect));
        let w = h * aspect;
        if (w > s.w) { w = s.w; h = w / aspect; } // never wider than the facade's own budget
        const depth = 0.03 + hash01(i, 12) * 0.045; // thin painted tin to a thicker wood plank
        const m = new THREE.Matrix4().makeRotationY(rect.ry).setPosition(rect.x, 0, rect.z).multiply(new THREE.Matrix4().makeTranslation(s.x, s.y + h / 2, s.z));
        boards.push(boardGeometry(atlas, cell, w, h, m, depth));
      }
    }
    // checks: nothing on a road, front faces a road
    const c = Math.cos(rect.ry), sn = Math.sin(rect.ry);
    const toW = (lx, lz) => [rect.x + lx * c + lz * sn, rect.z - lx * sn + lz * c];
    let worst = 99;
    for (const [lx, lz] of [[-rect.width / 2, -rect.depth / 2], [rect.width / 2, -rect.depth / 2], [rect.width / 2, rect.depth / 2], [-rect.width / 2, rect.depth / 2], [0, 0]]) worst = Math.min(worst, roads.clearance(...toW(lx, lz)));
    if (worst < -0.05) report.onRoad.push(`${opts.signName || key} at ${rect.x.toFixed(1)},${rect.z.toFixed(1)} (${worst.toFixed(2)} m into a road)`);
    const front = roads.clearance(...toW(0, rect.depth / 2 + 3)), back = roads.clearance(...toW(0, -rect.depth / 2 - 3));
    if (front > back + 0.5 && front > 4) report.backToRoad.push(`${opts.signName || key} at ${rect.x.toFixed(1)},${rect.z.toFixed(1)} (front ${front.toFixed(1)} m from a road, back ${back.toFixed(1)} m)`);
    if (rect.skewDeg > 3) report.skewed.push(`${opts.signName || key} plot edge is ${rect.skewDeg.toFixed(1)} deg off its front`);
    colliders.push(...orientedBoxes(rect.x, rect.z, rect.ry, opts.colW ?? rect.width, opts.colD ?? rect.depth));
    // posters only on real walls (24 Nov): shop-houses and single shops, never kiosks, carts or sheds, and never on the open otla in front
    if (type === 'shopHouse' || type === 'shop') muralBoxes.push({ x: rect.x, z: rect.z, ry: rect.ry, w: rect.width, d: rect.depth, seed: i, kind: 'shop', zFront: rect.depth / 2 - Math.min(type === 'shopHouse' ? 1.1 : 1.0, rect.depth * (type === 'shopHouse' ? 0.16 : 0.18)) - 0.12 });
  };

  let i = 0;
  for (const o of map.objects) {
    yield; // slice point: one map object per step
    if (o.kind !== 'solids' || !o.rings?.[0] || o.rings[0].length !== 4) continue;
    const key = labelKey(o), name = labelName(o);
    if (!key.startsWith('new_')) continue;
    if (key === 'new_sqh') {
      // S7 fixes: the shopkeeper's home and godown (7 x 4.4 m, two storeys): no named place, so it stands on the layout's
      // corrected footprint (o.rect, front towards its gali). Godown shutter down below with the family's door beside it,
      // home above. No board (a godown carries none; question for her in docs/s7/fixes.md).
      const r = shopRectOf(o) || o.rect;
      let rect = r ? { x: r.cx, z: r.cz, width: r.w, depth: r.d, front: r.front, ry: r.ry, skewDeg: 0 } : null;
      if (!rect) { // raw export (preview pages): the drawn plot, fronted on whichever side is nearest a road or gali
        let best = null;
        for (const f of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const rr = ringRect(o.rings[0], f);
          const cl = roads.clearance(rr.x + rr.front[0] * (rr.depth / 2 + 3), rr.z + rr.front[1] * (rr.depth / 2 + 3));
          if (!best || cl < best.cl) best = { cl, rr };
        }
        rect = best.rr;
      }
      const W = Math.round(rect.width * 10) / 10, D = Math.round(rect.depth * 10) / 10, H = o.y1 || 6.5;
      const k = 9001; // own seed: leaves every other shop's colour and variant exactly as before
      const balcony = hash01(k, 2) < 0.55 ? 'rail' : 'parapet';
      put('shopHouse', `sqh|${W}|${D}|${H}|${balcony}`, (lite) => shopHouse({ W, D, H, shutterDown: true, balcony, trade: 'seeds', seed: 17, lite, homeDoor: true }), rect, { H, signName: null }, k);
      report.shopkeeperHomes++;
      continue;
    }
    const isSqx = key === 'new_sqx', isKiosk = key === 'new_kiosk' || key === 'new_cart';
    const isSingle = /^new_[A-Z]/.test(key) && !NOT_SHOPS.has(name);
    if (!isSqx && !isKiosk && !isSingle) continue;
    const c0 = { x: o.rings[0].reduce((a, p) => a + p[0], 0) / 4, z: o.rings[0].reduce((a, p) => a + p[1], 0) / 4 };
    let place = matchPlace(places, isSqx ? name.replace(/ \(2-storey\)$/, '') : name, c0.x, c0.z);
    if (!place && (isSqx || isKiosk)) {
      // 26 Nov: 19 shops, kiosks and carts have their drawn plot more than 6 m from their own place marker (the marker was moved, the
      // plot was not; some markers now sit on top of another shop). The drawn plot is the footprint, so it stands where it is drawn and
      // its front is the plot edge that faces the nearest road (the same way the shopkeeper's homes find theirs), never moved.
      const rg = o.rings[0], ee = [[rg[1][0] - rg[0][0], rg[1][1] - rg[0][1]], [rg[2][0] - rg[1][0], rg[2][1] - rg[1][1]]];
      let best = null;
      for (const e of ee) {
        const L = Math.hypot(e[0], e[1]) || 1;
        for (const sg of [1, -1]) {
          const f = [sg * e[0] / L, sg * e[1] / L], rr = ringRect(rg, f);
          const cl = roads.clearance(c0.x + f[0] * (rr.depth / 2 + 3), c0.z + f[1] * (rr.depth / 2 + 3));
          if (!best || cl < best.cl) best = { cl, f };
        }
      }
      place = { name, x: c0.x, z: c0.z, front: best.f, fallback: true };
      report.matchedByRing = (report.matchedByRing || 0) + 1;
      (report.matchedByRingList ||= []).push(o.label);
    }
    if (!place) { report.skipped.push(`${o.label}: no place with a front`); continue; }
    // The layout agent's corrected footprint (squared to its road, off roads and galis) wins over the drawn ring (S7 WIRING, 21 Nov).
    const sr = shopRectOf(o) || o.rect; // the road-facing, off-the-bands rect (shopRects.json) wins over the drawn ring
    const rect = sr ? { x: sr.cx, z: sr.cz, width: sr.w, depth: sr.d, front: sr.front, ry: sr.ry, skewDeg: 0 } : ringRect(o.rings[0], place.front);
    const W = Math.round(rect.width * 10) / 10, D = Math.round(rect.depth * 10) / 10, v = i % 3;
    i++;
    if (isSqx) {
      const shutterDown = hash01(i, 1) < 0.18, balcony = hash01(i, 2) < 0.55 ? 'rail' : 'parapet', trade = tradeOf(name);
      const H = o.y1 || 7;
      put('shopHouse', `sqx|${W}|${D}|${H}|${shutterDown ? 1 : 0}|${balcony}|${trade}|${v}`, (lite) => shopHouse({ W, D, H, shutterDown, balcony, trade, seed: v * 7 + 3, lite }), rect, { H, signName: name }, i);
      report.shopHouses++;
    } else if (isKiosk) {
      const isCart = /cart$/i.test(name) || key === 'new_cart';
      if (isCart) {
        const food = /dosa|momos|tikki|corn|bhutta|chai|golgappa|chana/i.test(name);
        // a cart stands with its long side to the road: its own size, not the whole marker
        const gd = stallGoodsOf(name);
        put('cart', `cart|${food ? 1 : 0}|${v}|${gd}`, (lite) => cart({ W: 2.4, D: 1.6, seed: v + 1, food, lite, goods: gd }), { ...rect, width: Math.max(rect.width, 2.2), depth: Math.max(rect.depth, 1.4) }, { signName: name, colW: 2.3, colD: 1.4 }, i);
        report.carts++;
      } else {
        const kind = hash01(i, 4) < 0.5 ? 'gumti' : 'stall';
        const gd = stallGoodsOf(name);
        put('kiosk', `kiosk|${kind}|${Math.min(W, 3.2)}|${Math.min(D, 3.2)}|${v}|${gd}`, (lite) => kiosk({ W: Math.min(W, 3.2), D: Math.min(D, 3.2), kind, seed: v + 2, lite, goods: gd }), rect, { signName: name, colW: Math.min(W - 0.2, 2.8), colD: Math.min(D - 0.3, 2.0) }, i);
        report.kiosks++;
      }
    } else if (SHEDS.has(name)) {
      if (name === 'Milk carts') {
        put('cart', `cart|0|${v}`, (lite) => cart({ W: 2.4, D: 1.6, seed: v + 1, lite }), rect, { signName: name, colW: 2.3, colD: 1.4 }, i);
        report.carts++;
      } else {
        put('shed', `shed|${W}|${D}|${name === 'Jaggery making unit' ? 1 : 0}`, (lite) => shed({ W, D, H: 3.0, brickBack: name === 'Jaggery making unit', lite }), rect, { signName: name === 'Cycle stand' ? null : name, H: 3 }, i);
        report.sheds++;
      }
    } else if (name === 'Newspaper stand' || name === 'Sugarcane juice cart' || /cart$/.test(name)) {
      put('cart', `cart|0|${v}`, (lite) => cart({ W: 2.4, D: 1.6, seed: v + 5, lite }), rect, { signName: name, colW: 2.3, colD: 1.4 }, i);
      report.carts++;
    } else {
      const trade = tradeOf(name);
      const front = trade === 'office' ? 'office' : trade === 'dhaba' ? 'open' : 'shutter';
      const shutterDown = front === 'shutter' && (/godown/i.test(name) || hash01(i, 5) < 0.12);
      const H = o.y1 || 3.6;
      put('shop', `shop|${W}|${D}|${H}|${front}|${shutterDown ? 1 : 0}|${trade}|${v}`, (lite) => shop({ W, D, H, front, shutterDown, trade, seed: v * 5 + 1, lite }), rect, { H, signName: name }, i);
      report.shops++;
    }
  }

  yield;
  const group = new THREE.Group();
  group.name = 's7_shops';
  const mats = kitMaterials(['plaster', 'plaster_j', 'plaster_m', 'plaster_p', 'brick', 'brick_b', 'concrete', 'concrete_f', 'wood', 'rust']);
  const bodies = kit.finalize(mats);
  group.add(bodies);

  yield;
  atlas.ready();
  yield;
  let signs = null;
  if (boards.length) {
    signs = new THREE.Mesh(mergeGeometries(boards), atlas.material);
    signs.name = 's7_shop_signs';
    signs.userData.noAutoCollider = true;
    signs.receiveShadow = true;
    group.add(signs);
  }
  // S7 WIRING (integrator, signage): bare back/side walls get a painted mural/slogan poster, one per shop at most.
  yield;
  const { mesh: muralMesh, stats: muralStats } = yield* buildWallMuralsGen(muralBoxes, { roads }); // S7 WIRING (integrator, wallposters): road-facing boost
  if (muralMesh) group.add(muralMesh);
  report.murals = muralStats;
  // colliders ride on the concrete batch (a mesh, so the collider walk reads them); it never derives its own
  const holder = kit.batches.get('concrete')?.bm || bodies.children[0];
  if (holder) holder.userData.colliderBoxes = colliders;

  // distance LOD: near design within NEAR_M of the camera, the block beyond (checked when the camera moves 6 m)
  let lx = 1e9, lz = 1e9;
  const update = (cam) => {
    if (!cam) return;
    const p = cam.position;
    if (Math.abs(p.x - lx) + Math.abs(p.z - lz) < 6) return;
    lx = p.x; lz = p.z;
    for (const e of lod) {
      const d2 = (e.x - p.x) ** 2 + (e.z - p.z) ** 2;
      let tier = d2 < NEAR_M * NEAR_M ? 0 : d2 < MID_M * MID_M || e.ids[2] < 0 ? 1 : 2;
      if (tier === e.tier) continue;
      e.tier = tier;
      e.ids.forEach((id, k) => { if (id >= 0) kit.setVisible(id, k === tier); });
    }
  };
  for (const b of kit.batches.values()) {
    const orig = b.bm.onBeforeRender.bind(b.bm);
    b.bm.onBeforeRender = (renderer, scene, cam, geo, mat, grp) => { update(cam); orig(renderer, scene, cam, geo, mat, grp); };
  }
  if (camera) update(camera);

  group.userData.atlas = atlas;
  report.boards = boards.length;
  report.signCells = atlas.bins.reduce((n, bin) => n + bin.length, 0);
  report.kit = kit.stats();
  group.userData.report = report;
  group.userData.update = update;
  return group;
}
