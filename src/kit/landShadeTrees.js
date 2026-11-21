/**
 * Shade trees for the map's "under a tree" spots (S7 fixes, ?layout=new only). Pure maths, run in Node, never in the game:
 *   node src/kit/landShadeTrees.js            plan + print the checks
 *   node src/kit/landShadeTrees.js --write    also write src/kit/landShadeTrees.json (what src/kit/landTrees.js reads)
 *
 * The approved map labels 12 spots as being under a tree ("Barber under a tree" x2, "Carrom under a tree", 9 "Resting
 * spot"s) but draws no tree within 17 m of any of them. Each gets ONE neem or peepal, the same species, look and distance
 * tiers as every other tree (src/kit/landTrees.js). The rule (docs/s7/fixes.md):
 *   1. The trunk stands on the SUN side of the spot (the game's afternoon sun: east-south-east, ~48 deg up), 1.6-2.9 m
 *      out (2.4 m preferred, never past the dense crown's edge), so the crown is over the seat and, where the ground
 *      allows, its shadow falls on it.
 *   2. The trunk stands clear of: the charpai / bench / chair / carrom seats (0.7 m from their footprint), roads and galis
 *      (1.2 m from the carriageway edge), every building, shop, house and placed map object (1.2 m; 2.5 m preferred, so the
 *      crown does not push into a wall), ponds, tanks, play and yard patches, the canal, and other trees (3 m).
 *   3. Neem by default; a peepal where it has room (no building or road within 5 m).
 * Nothing on the map moves: only the trees are added.
 */
import { boxCorners } from '../layout/layoutCore.js';
import { footprintItems } from '../layout/layoutSnap.js';
import { planMapObjects, designRing, rectRing, roadClearance } from './mapObjectsPlan.js';

const SPOT = /^new_(Resting spot|Barber under a tree|Carrom under a tree)$/;
const SUN_EL = 48 * Math.PI / 180; // src/atmosphere.js preset A; createSun puts the sun at (cos el, sin el, 0.4 cos el)
const SUN_H = (() => { const L = Math.hypot(1, 0.4); return [1 / L, 0.4 / L]; })(); // horizontal direction towards the sun
const OPEN_GROUND = /grazing|baagh|green|canal|orchard|field|road_roundabout/i;
const key = (o) => o.label.split('|')[0].trim();

export const SHADE = { neem: { d: 9, h: 10 }, peepal: { d: 11, h: 11 } }; // d = outer leaf-card box; the dense crown is ~0.65 of it

function inPoly(ring, x, z) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}
/** Signed distance from a point to a polygon ring: negative inside. */
export function ringDist(ring, x, z) {
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return inPoly(ring, x, z) ? -d : d;
}

/**
 * map: the packed layout (src/layout/mapData.json shape: places[], roads[], objects[]); houses: [{ ring }] of the houses
 * agent's final rectangles (src/kit/housesPlanData.json). Returns { trees: [...], spots: [...] }.
 */
export function planShadeTrees(map, { houses = [] } = {}) {
  const roads = map.roads;
  const places = {};
  for (const p of map.places) places[p.id] = p;
  const layout = { places, list: map.places, objects: map.objects };
  const items = footprintItems(layout);
  const mo = planMapObjects(map);

  const spots = [];
  for (const o of map.objects) {
    if (!SPOT.test(key(o)) || !o.rect) continue;
    const r = o.rect, k = key(o);
    // the furniture on the spot: the map objects layer's own design ring (charpai / bench 2 x 1, barber corner 1.4 x 1.4);
    // the carrom table with its four seats is a 3 m circle
    const d = mo.designs.find((x) => x.id === o.id);
    const ring = k === 'new_Carrom under a tree' ? null : d ? designRing(d) : rectRing(r.cx, r.cz, r.ry, r.w, r.d);
    spots.push({ id: o.id, name: o.name, x: r.cx, z: r.cz, ring, radius: ring ? 0 : 1.5 });
  }

  // hard obstacles (trunk at least `m` m outside) and soft ones (prefer `soft` m)
  const solids = [];
  const spotIds = new Set(spots.map((s) => s.id));
  for (const it of items) {
    if (it.obj && spotIds.has(it.obj.id)) continue;
    if (it.kind === 'place' && it.open) continue;
    if (it.crossing) {
      // ground patches (play patch, market ground, yards, parking ...): never plant a trunk on one; open ground is fine
      if (OPEN_GROUND.test(it.name || '') || OPEN_GROUND.test(it.obj?.label || '')) continue;
      solids.push({ ring: it.corners, m: 0.3, soft: 0.3, what: it.name || it.id });
      continue;
    }
    solids.push({ ring: it.corners, m: 2.0, soft: 3.0, what: it.name || it.id });
  }
  for (const h of houses) solids.push({ ring: h.ring, m: 2.0, soft: 3.0, what: 'house' });
  for (const dz of mo.designs) if (!spotIds.has(dz.id)) solids.push({ ring: designRing(dz), m: 0.8, soft: 1.5, what: dz.kind });
  for (const p of mo.ponds) solids.push({ ring: p.bank || p.water, m: 0.8, soft: 1.5, what: 'pond ' + p.kind });
  for (const t of mo.tanks) solids.push({ ring: rectRing(t.x, t.z, t.ry, t.outer, t.outer), m: 1.0, soft: 2, what: 'temple tank' });
  for (const m of mo.milestones) solids.push({ ring: rectRing(m.x, m.z, m.ry, 0.6, 0.4), m: 0.6, soft: 0.6, what: 'milestone' });
  for (const p of mo.pots) solids.push({ ring: rectRing(p.x, p.z, 0, p.r * 2, p.r * 2), m: 0.6, soft: 0.6, what: 'pot' });
  for (const p of mo.patches) if (!OPEN_GROUND.test(p.kind || '')) solids.push({ ring: p.ring, m: 0.3, soft: 0.3, what: 'patch ' + p.kind });
  const orchards = map.objects.filter((o) => key(o) === 'new_orchard' && o.rings?.[0]).map((o) => o.rings[0]);
  const trees = map.objects.filter((o) => o.kind === 'trees').map((o) => [o.cx, o.cz]);

  const planted = [];
  const out = [];
  const near = (x, z, R) => solids.filter((s) => s.ring.some(([px, pz]) => Math.abs(px - x) < R && Math.abs(pz - z) < R) || inPoly(s.ring, x, z));
  for (const sp of spots) {
    const local = near(sp.x, sp.z, 40);
    const test = (x, z) => {
      if (roadClearance(roads, x, z) < 1.2) return null;
      if (Math.abs(x - 824) < 9) return null; // the canal and its bunds
      if (orchards.some((r) => inPoly(r, x, z))) return null; // orchard rows are filled at game time
      if (trees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 3) || planted.some((t) => Math.hypot(t.x - x, t.z - z) < 4)) return null;
      const own = sp.ring ? ringDist(sp.ring, x, z) : Math.hypot(x - sp.x, z - sp.z) - sp.radius;
      if (own < 0.7) return null;
      let softPen = 0, minB = 99;
      for (const s of local) {
        const d = ringDist(s.ring, x, z);
        if (d < s.m) return null;
        if (d < s.soft) softPen += s.soft - d;
        if (s.m >= 2) minB = Math.min(minB, d);
      }
      return { softPen, minB, road: roadClearance(roads, x, z) };
    };
    let best = null;
    for (let dist = 1.6; dist <= 4.4; dist += 0.2) {
      for (let a = 0; a < 72; a++) {
        const ang = (a / 72) * Math.PI * 2;
        const ux = Math.cos(ang), uz = Math.sin(ang);
        const x = sp.x + ux * dist, z = sp.z + uz * dist;
        const t = test(x, z);
        if (!t) continue;
        // where the crown's shadow lands (crown centre ~0.6 of the height, sun at SUN_EL), and how far that is from the seat
        const shadowOff = (0.6 * SHADE.neem.h) / Math.tan(SUN_EL);
        const sx = x - SUN_H[0] * shadowOff, sz = z - SUN_H[1] * shadowOff;
        const shadowMiss = Math.hypot(sx - sp.x, sz - sp.z);
        const overhead = dist; // crown over the seat when dist < crown radius
        const r = SHADE.neem.d * 0.65 / 2; // dense crown radius
        if (overhead > r) continue;
        const score = Math.max(0, shadowMiss - r * 0.8) * 3 + Math.abs(dist - 2.4) * 0.8 + t.softPen * 2 + Math.max(0, 2 - t.road) * 0.5;
        if (!best || score < best.score) best = { x, z, dist, shadowMiss, score, ...t };
      }
    }
    if (!best) { out.push({ spot: sp, tree: null }); continue; }
    const kind = best.minB > 5 && best.road > 5 ? 'peepal' : 'neem';
    const tree = { x: +best.x.toFixed(2), z: +best.z.toFixed(2), kind, d: SHADE[kind].d, h: SHADE[kind].h, for: sp.id };
    planted.push(tree);
    out.push({ spot: sp, tree, dist: best.dist, shadowMiss: best.shadowMiss, minBuilding: best.minB, road: best.road });
  }
  return { trees: planted, spots: out };
}

// ------------------------------------------------------------------------------------------------------------ node CLI
if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const fs = await import('node:fs');
  const map = JSON.parse(fs.readFileSync(new URL('../layout/mapData.json', import.meta.url)));
  const hp = JSON.parse(fs.readFileSync(new URL('./housesPlanData.json', import.meta.url)));
  const houses = hp.rows.map((r) => { const o = Object.fromEntries(hp.fields.map((f, i) => [f, r[i]])); return { ring: boxCorners(o.x, o.z, o.w, o.d, o.ry) }; });
  const res = planShadeTrees(map, { houses });
  for (const s of res.spots) {
    if (!s.tree) { console.log(`NO TREE  ${s.spot.id} (${s.spot.x.toFixed(1)}, ${s.spot.z.toFixed(1)}): no clear spot within 4.4 m`); continue; }
    console.log(`${s.tree.kind.padEnd(6)} for ${s.spot.id.padEnd(28)} spot (${s.spot.x.toFixed(1)}, ${s.spot.z.toFixed(1)}) trunk (${s.tree.x}, ${s.tree.z}) ${s.dist.toFixed(1)} m out, crown shadow ${s.shadowMiss.toFixed(1)} m off the seat, nearest building ${s.minBuilding.toFixed(1)} m, road ${s.road.toFixed(1)} m`);
  }
  console.log(`${res.trees.length} of ${res.spots.length} spots get a tree`);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(new URL('./landShadeTrees.json', import.meta.url), JSON.stringify(res.trees) + '\n');
    console.log('wrote src/kit/landShadeTrees.json');
  }
}
