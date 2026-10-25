/**
 * Greenery for the staging-yard places (art director 26 Oct: her drawings show grass, bushes, flowers and trees; the staged places were bare dirt).
 * Only real CC0 scans (plants3d/*: grass tufts, shrub, gazania) via addPlantInstances and the village's existing tree set via buildTrees;
 * nothing is hand-built. Positions are in the place's own metres (front = +z), taken from each place's LAYOUT.md.
 * `half` = [halfWidth, halfDepth] of the ground the place stands on; with `tufts` set, grass clumps and shrubs fill a ragged band round its edge. `trees` are the trees her drawing names, `beds` are gazania beds beside a named wall.
 */
import * as THREE from 'three';
import { addPlantInstances } from './realPlants.js';
import { buildTrees } from './trees.js';

const GREEN = {
  yard_school: { half: [34, 24], trees: [{ kind: 'neem', x: -24, z: 16, scale: 0.9 }, { kind: 'peepal', x: 26, z: 14, scale: 0.9 }] },
  yard_gurukul: { half: [30, 22], trees: [{ kind: 'neem', x: 0, z: 2, scale: 1 }, { kind: 'neem', x: -16, z: 14, scale: 0.7 }, { kind: 'neem', x: 16, z: 14, scale: 0.7 }] },
  yard_dairy: { half: [12, 10], trees: [] },
  yard_bus_adda: { half: [11, 9], trees: [{ kind: 'peepal', x: 7.5, z: -5.5, scale: 0.55 }] },
  yard_chaupal: { half: [14, 14], trees: [{ kind: 'peepal', x: 0, z: 0, scale: 1 }] },
  yard_volleyball: { half: [15, 11], trees: [] },
  yard_puncture: { half: [8, 6], trees: [] },
  yard_tubewell: { half: [6, 5], tufts: true, trees: [{ kind: 'neem', x: 4.6, z: -3.2, scale: 0.55 }] },
  yard_paani_tanki: { half: [16, 14], trees: [] },
  yard_ration: { half: [10, 8], trees: [] },
  yard_post: { half: [10, 8], trees: [] },
  yard_chakki: { half: [10, 8], trees: [] },
  yard_petrol: { half: [22, 16], trees: [], beds: [{ x: 9, z: 7, n: 8 }] },
  yard_panchayat: { half: [16, 20], trees: [{ kind: 'neem', x: 0, z: 8, scale: 0.8 }] },
  yard_tvhouse: { half: [11, 10], trees: [] },
  yard_bhatta: { half: [34, 30], trees: [] },
  yard_khel: { half: [30, 24], trees: [] },
  yard_khalihan: { half: [17, 14], trees: [] },
  yard_dharam_kanta: { half: [13, 9], trees: [] },
  yard_akhada: { half: [11, 11], trees: [{ kind: 'neem', x: -8, z: -8, scale: 0.7 }] },
};

function rng(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

export function addPlaceGreenery(group, def, seed) {
  const g = GREEN[def.id];
  if (!g) return;
  const rnd = rng(seed + 7);
  // addPlantInstances measures distance to the player in WORLD metres, so the plants live in a child group undone back to the world origin
  const ax = group.position.x, az = group.position.z;
  const pg = new THREE.Group();
  pg.name = def.zone + '_plants';
  pg.position.set(-ax, 0, -az);
  group.add(pg);
  const W = (a) => a.map((p) => ({ ...p, x: p.x + ax, z: p.z + az }));
  const [hw, hd] = g.half;
  // ragged band round the edge of the ground: tufts denser at the corners, a few shrubs, gazania only where a bed is named
  const edge = () => {
    const side = rnd();
    const t = rnd() * 2 - 1, o = (0.98 + rnd() * 0.28);
    if (side < 0.3) return { x: t * hw, z: -hd * o };
    if (side < 0.55) return { x: t * hw, z: hd * o };
    if (side < 0.78) return { x: -hw * o, z: t * hd };
    return { x: hw * o, z: t * hd };
  };
  // clumps of 4-5 tufts, so the edge reads as grass tussocks like her drawings and not as scattered single weeds
  const clumps = Math.round(Math.min(40, 8 + (hw + hd) * 0.8));
  const tufts = [];
  for (let c = 0; c < clumps; c++) {
    const p = edge();
    for (let k = 0; k < 3; k++) tufts.push({ x: p.x + (rnd() - 0.5) * 0.9, z: p.z + (rnd() - 0.5) * 0.9, scale: 0.9 + rnd() * 0.7 });
  }
  const shrubs = Array.from({ length: Math.max(3, Math.round(clumps / 3)) }, () => ({ ...edge(), scale: 0.8 + rnd() * 0.7 }));
  // edge tussocks only where her LAYOUT says so (tubewell: 'packed-earth patch with grass tufts'); elsewhere they floated on open grass
  if (g.tufts) addPlantInstances(pg, 'grass_medium_02', 0.5, W(tufts), { seed, tint: 0.08, radius: 70 });
  if (g.tufts) addPlantInstances(pg, 'shrub_01', 0.55, W(shrubs), { seed: seed + 1, radius: 70 });
  if (g.beds?.length) {
    const beds = g.beds.flatMap((b) => Array.from({ length: b.n }, (_, i) => ({ x: b.x + (rnd() - 0.5) * 3, z: b.z + (rnd() - 0.5) * 1.2, scale: 0.9 + rnd() * 0.4 })));
    addPlantInstances(pg, 'flower_gazania', 0.4, W(beds), { seed: seed + 2, tint: 0.2, radius: 70 });
  }
  if (g.trees.length) group.add(buildTrees(g.trees.map((t, i) => ({ ...t, seed: seed + i, rotationY: rnd() * 6 }))));
}
