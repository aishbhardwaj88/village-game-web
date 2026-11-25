/**
 * GROUND ZONES (ORDER-26NOV, ground part). One zone id per ground position; the ground shader (src/materials.js,
 * applyGroundNoiseDetail with `zones: true`) reads them from a low-res map and picks the ground textures from them.
 *
 * Three things live here:
 *  1. LAYERS  - the 16 texture sets (10 ground + 6 flooring) packed into the texture arrays, with their real tile size in metres.
 *  2. ZONES   - the zone ids: which layer shows (a), which layer creeps in over it (aux, patchy: dust, algae rim, ruts), flooring or not.
 *  3. zoneAt(x, z) - the FIRST DRAFT rule set that tools/zone-map-bake.mjs turns into public/assets/textures_mix/ground_zones/zonemap.png.
 *     The PNG is the data she paints over; the rules only give a starting point. Nothing at runtime calls zoneAt.
 *
 * Map image: ZONE_MAP.size x ZONE_MAP.size texels, ZONE_MAP.cell metres per texel, top-left texel = (x0, z0), row index grows with z.
 *  R = zone id            (this texel's zone)
 *  G = neighbour zone id  (the nearest texel with a different zone; = R when none within 16 m)
 *  B = distance to that border in 1/16 m (0..255 = 0..16 m)   -- drives the soft edge, the dust / mud creep over flooring
 * No alpha channel on purpose: an alpha channel can be premultiplied by the browser and would corrupt R and G.
 *
 * Rule priority (first hit wins): flooring spots, water, rail, highway shoulder, canal bank, tracks and yards, empty plots,
 * lane / road verges, farm plots, near-house dust, open land.
 */
import { ANCHORS } from './anchors.js';
import { getRoads, getObjects } from './layout/layout.js';
import { CHAURAHA } from './mapPlan.js';

/** Texture sets, array layer = index. `m` = metres one texture tile covers (bricks 10x20 cm, pavers 20x10 cm, slabs 40x80 cm read from the scans). */
export const LAYERS = [
  { name: 'grass_ground', m: 3.0 }, // 0
  { name: 'dirt_floor', m: 3.0 }, // 1
  { name: 'forest_ground_05', m: 3.0 }, // 2
  { name: 'brown_mud_02', m: 3.0 }, // 3
  { name: 'aerial_mud_1', m: 3.0 }, // 4
  { name: 'mud_cracked_dry_03', m: 3.0 }, // 5
  { name: 'ganges_river_pebbles', m: 2.2 }, // 6
  { name: 'gravelly_sand', m: 2.5 }, // 7
  { name: 'grass_path_3', m: 3.0 }, // 8
  { name: 'red_dirt_mud_01', m: 3.0 }, // 9
  { name: 'concrete_tiles_02', m: 2.4 }, // 10 slabs 40 x 80 cm
  { name: 'concrete_pavers', m: 1.4 }, // 11 pavers 20 x 10 cm
  { name: 'patterned_brick_floor_02', m: 2.0 }, // 12 bricks 10 x 20 cm
  { name: 'short_bricks_floor', m: 2.0 }, // 13 bricks 10 x 20 cm
  { name: 'brick_pavement_03', m: 1.6 }, // 14 pavers 20 x 10 cm
  { name: 'patterned_concrete_pavers', m: 3.8 }, // 15 pavers 20 x 10 cm in 80 cm slabs
];
export const LAYER_INDEX = Object.fromEntries(LAYERS.map((l, i) => [l.name, i]));
const L = LAYER_INDEX;

/** id -> { name, a: layer, aux: layer creeping in (-1 none), amt: aux coverage 0..1, floor: 1 = paved, dbg: flat debug colour }. Ids are what the map stores; keep them stable. */
export const ZONES = [
  { id: 0, name: 'open land', a: L.grass_ground, aux: L.dirt_floor, amt: 0.28, floor: 0, dbg: 0x4caf50 },
  { id: 1, name: 'village edge', a: L.grass_ground, aux: L.dirt_floor, amt: 0.6, floor: 0, dbg: 0x9ccc65 },
  { id: 2, name: 'highway shoulder', a: L.gravelly_sand, aux: L.dirt_floor, amt: 0.45, floor: 0, dbg: 0xffeb3b },
  { id: 3, name: 'lane, dark mud', a: L.forest_ground_05, aux: L.dirt_floor, amt: 0.15, floor: 0, dbg: 0x6d4c41 },
  { id: 4, name: 'lane, light dirt', a: L.dirt_floor, aux: L.forest_ground_05, amt: 0.15, floor: 0, dbg: 0xd7b98e },
  { id: 5, name: 'main road verge', a: L.dirt_floor, aux: L.forest_ground_05, amt: 0.25, floor: 0, dbg: 0xff9800 },
  { id: 6, name: 'wet mud (ponds, canal, pumps)', a: L.brown_mud_02, aux: L.grass_path_3, amt: 0.55, floor: 0, dbg: 0x1976d2 },
  { id: 7, name: 'churned mud (cattle, tractor)', a: L.aerial_mud_1, aux: L.brown_mud_02, amt: 0.3, floor: 0, dbg: 0x8e24aa },
  { id: 8, name: 'dry bed, empty plot', a: L.mud_cracked_dry_03, aux: L.dirt_floor, amt: 0.2, floor: 0, dbg: 0xe91e63 },
  { id: 9, name: 'canal bank', a: L.ganges_river_pebbles, aux: L.grass_path_3, amt: 0.3, floor: 0, dbg: 0x00bcd4 },
  { id: 10, name: 'railway gravel', a: L.gravelly_sand, aux: L.ganges_river_pebbles, amt: 0.35, floor: 0, dbg: 0x607d8b },
  { id: 11, name: 'farm plot, red soil', a: L.red_dirt_mud_01, aux: L.dirt_floor, amt: 0.2, floor: 0, dbg: 0xd84315 },
  { id: 12, name: 'panchayat forecourt', a: L.concrete_tiles_02, aux: L.dirt_floor, amt: 0.12, floor: 1, dbg: 0xf5f5f5 },
  { id: 13, name: 'chowk and tree / temple square', a: L.concrete_pavers, aux: L.dirt_floor, amt: 0.12, floor: 1, dbg: 0xbdbdbd },
  { id: 14, name: 'school yard and gate', a: L.patterned_brick_floor_02, aux: L.dirt_floor, amt: 0.12, floor: 1, dbg: 0xffcc80 },
  { id: 15, name: 'temple and mosque approach', a: L.short_bricks_floor, aux: L.dirt_floor, amt: 0.12, floor: 1, dbg: 0xff7043 },
  { id: 16, name: 'bus stop and platform', a: L.brick_pavement_03, aux: L.dirt_floor, amt: 0.12, floor: 1, dbg: 0x7e57c2 },
  { id: 17, name: 'market lane', a: L.patterned_concrete_pavers, aux: L.dirt_floor, amt: 0.15, floor: 1, dbg: 0xfdd835 },
];
export const ZONE_ID = Object.fromEntries(ZONES.map((z) => [z.name, z.id]));
export const ZONE_MAX = 24; // shader table size (uniform array length)

/** The map image: 1 m per texel over the village. Covers x 140..1164, z -512..512 (roads span x 150..1050, z -340..350). */
export const ZONE_MAP = { size: 1024, cell: 1, x0: 140, z0: -512, url: 'assets/textures_mix/ground_zones/zonemap.png' };

// ------------------------------------------------------------------------------------------------ the first-draft rules
const Z = { open: 0, edge: 1, shoulder: 2, laneDark: 3, laneLight: 4, verge: 5, wet: 6, churn: 7, dry: 8, bank: 9, rail: 10, red: 11, forecourt: 12, chowk: 13, school: 14, approach: 15, bus: 16, market: 17 };
const CELL = 32;
let SHAPES = null; // grid: key -> shape[] (insertion order = priority)

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); };
function inRing(ring, x, z) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > z) !== (ring[j][1] > z) && x < (ring[j][0] - ring[i][0]) * (z - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) ins = !ins;
  return ins;
}
function segDist2(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
  const qx = a[0] + t * dx - x, qz = a[1] + t * dz - z;
  return qx * qx + qz * qz;
}

function build() {
  const grid = new Map();
  const put = (s) => {
    for (let cx = Math.floor(s.x0 / CELL); cx <= Math.floor(s.x1 / CELL); cx++) for (let cz = Math.floor(s.z0 / CELL); cz <= Math.floor(s.z1 / CELL); cz++) {
      const k = cx * 100003 + cz; (grid.get(k) || grid.set(k, []).get(k)).push(s);
    }
  };
  const poly = (zone, ring, pad = 0) => { const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]); put({ zone, ring, pad, x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, z0: Math.min(...zs) - pad, z1: Math.max(...zs) + pad }); };
  const circle = (zone, x, z, r) => put({ zone, cx: x, cz: z, r, x0: x - r, x1: x + r, z0: z - r, z1: z + r });
  const band = (zone, x0, x1, z0, z1) => put({ zone, x0, x1, z0, z1 }); // axis-aligned box
  const seg = (zone, a, b, hw) => put({ zone, a, b, hw, x0: Math.min(a[0], b[0]) - hw, x1: Math.max(a[0], b[0]) + hw, z0: Math.min(a[1], b[1]) - hw, z1: Math.max(a[1], b[1]) + hw });
  const line = (zone, pts, hw) => { for (let i = 1; i < pts.length; i++) seg(zone, pts[i - 1], pts[i], hw); };
  // a rectangle in a place's own frame (local +z = its front, rotated by the anchor's ry), as a turned box
  const local = (zone, id, lx0, lx1, lz0, lz1) => {
    const a = ANCHORS[id]; if (!a) return;
    const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
    const W = (lx, lz) => [a.x + lx * c + lz * s, a.z - lx * s + lz * c];
    const ring = [W(lx0, lz0), W(lx1, lz0), W(lx1, lz1), W(lx0, lz1)];
    poly(zone, ring);
  };

  // 1. flooring spots (anchor frames: local +z = the place's front). Sizes are first-draft guesses, to be repainted.
  local(Z.forecourt, 'yard_panchayat', -9, 9, -4, 15); // forecourt in front of the panchayat building
  circle(Z.chowk, CHAURAHA.x, CHAURAHA.z, CHAURAHA.islandR + 1.5); // the peepal island and its platform
  if (ANCHORS.chowk) circle(Z.chowk, ANCHORS.chowk.x, ANCHORS.chowk.z, 9);
  if (ANCHORS.yard_chaupal) circle(Z.chowk, ANCHORS.yard_chaupal.x, ANCHORS.yard_chaupal.z, 9); // the tree square
  if (ANCHORS.temple) circle(Z.chowk, ANCHORS.temple.x, ANCHORS.temple.z, 9); // temple square
  local(Z.approach, 'temple', -3.5, 3.5, 8, 30); // temple approach
  local(Z.approach, 'masjid', -3.5, 3.5, 8, 26); // mosque approach
  local(Z.school, 'school', -17, 17, -6, 20); // school yard and gate
  local(Z.school, 'yard_gurukul', -12, 12, -4, 14);
  local(Z.bus, 'yard_bus_adda', -11, 11, -8, 9); // bus stop
  for (const o of getObjects('new_Tempo and auto stand')) for (const r of o.rings || []) poly(Z.bus, r);
  for (const o of getObjects('new_platform')) for (const r of o.rings || []) poly(Z.bus, r); // station platform
  if (ANCHORS.bazaar) band(Z.market, ANCHORS.bazaar.x - 38, ANCHORS.bazaar.x + 38, ANCHORS.bazaar.z - 11, ANCHORS.bazaar.z - 3.5); // the lane in front of the bazaar row

  // 2. water: ponds, tanks, canal channels, pumps and taps. The clay pit pond is read as a dried bed.
  for (const o of getObjects('ground')) {
    if (/Clay pit pond/.test(o.name)) { for (const r of o.rings || []) poly(Z.dry, r, 1); continue; }
    if (/pond|temple_tank|Temple pond|^new_channel|Water channel/i.test(o.prefix + ' ' + o.name) && !/canal bank/i.test(o.name)) for (const r of o.rings || []) poly(Z.wet, r, 1.5);
  }
  for (const id of ['johad', 'pond']) if (ANCHORS[id]) circle(Z.wet, ANCHORS[id].x, ANCHORS[id].z, 12);
  if (ANCHORS.tubewell) circle(Z.wet, ANCHORS.tubewell.x, ANCHORS.tubewell.z, 3.5);
  for (const o of getObjects('solids')) if (/Hand pump|^new_Well|^new_well|^new_tubewell/.test(o.prefix)) circle(Z.wet, o.cx ?? 0, o.cz ?? 0, 2.2);

  // 3. railway bed and station: gravel
  for (const o of getObjects('new_rail_bed')) for (const r of o.rings || []) poly(Z.rail, r, 3);

  // 4. highway shoulders (gravelly sand + dust), canal banks (pebbles)
  const roads = getRoads();
  for (const r of roads) if (r.kind === 'highway') line(Z.shoulder, r.pts, r.width / 2 + 6);
  band(Z.bank, 818, 834, -512, 512);
  for (const r of roads) if (/canal_bank/.test(r.id)) line(Z.bank, r.pts, r.width / 2 + 1.5);

  // 5. cattle paths and tractor tracks: churned mud with ruts; yards and empty plots
  for (const r of roads) if (r.kind === 'track' || /tractor|cattle/i.test(r.name || '')) line(Z.churn, r.pts, r.width / 2 + 1.5);
  for (const o of getObjects('ground')) {
    if (/Dung cake yard|Gher yard|Goods yard|Truck parking|Tractor and bullock cart parking/.test(o.name)) for (const r of o.rings || []) poly(Z.churn, r);
    else if (/House plot|Washerman|Kids play patch|Kids' play corner|Kabaddi/.test(o.name)) for (const r of o.rings || []) poly(Z.dry, r);
  }

  // 6. verges: main roads (dirt), lanes (dark or light mud, 50/50 by the lane's own id, so each lane stays one colour)
  for (const r of roads) {
    if (r.kind === 'road') line(Z.verge, r.pts, r.width / 2 + 3);
    else if (r.kind === 'lane' || r.kind === 'back' || r.kind === 'path') line((hash(String(r.id)) & 1) ? Z.laneDark : Z.laneLight, r.pts, r.width / 2 + 1.5);
  }

  // 7. farm plots: every third non-sugarcane field is red soil (sugarcane fields are left to their own code)
  for (const o of getObjects('crops')) if (o.name !== 'Sugarcane' && hash(o.id) % 3 === 0) for (const r of o.rings || []) poly(Z.red, r);

  // 8. dust around houses
  for (const o of getObjects('new_house')) if (o.cx != null) circle(Z.edge, o.cx, o.cz, 14);
  return grid;
}

/** First-draft zone id at world (x, z). */
export function zoneAt(x, z) {
  if (!SHAPES) SHAPES = build();
  const arr = SHAPES.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
  if (arr) {
    for (const s of arr) {
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      if (s.ring) { if (inRing(s.ring, x, z) || (s.pad && s.ring.some((p, i) => segDist2(x, z, s.ring[(i + s.ring.length - 1) % s.ring.length], p) < s.pad * s.pad))) return s.zone; }
      else if (s.a) { if (segDist2(x, z, s.a, s.b) <= s.hw * s.hw) return s.zone; }
      else if (s.r != null) { if ((x - s.cx) ** 2 + (z - s.cz) ** 2 <= s.r * s.r) return s.zone; }
      else return s.zone; // axis-aligned box
    }
  }
  return Z.open;
}
