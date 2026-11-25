/**
 * Doorstep sites for the new-map houses (492, S7 sprint, src/kit/houses.js NEW_HOUSES), her 24 Nov playtest notes
 * (items 4 and 5). The old doorstep-prop system (scenery.js abadiPropSites/abadiGardenPlants) only covers the
 * retired abadi rows and is empty under the live default ?layout=new (scenery.js ROWS_DRAWN = isNewLayout() ? [] :
 * PLACEMENTS) - so every new-map house currently gets none of it. These two functions are the same site-generation
 * pattern, keyed to NEW_HOUSES instead, which is only populated once createNewMapHouses's own async build resolves
 * (call these from that ready promise, not at module load - NEW_HOUSES is empty before then).
 */
import { NEW_HOUSES, NEW_HOUSE_ROADS } from './houses.js';

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** A point `lx` along the house's front wall, `lz` out from its centre (house local metres) -> world {x, z}. */
function frontPoint(h, lx, lz) {
  const s = Math.sin(h.ry), c = Math.cos(h.ry);
  return { x: h.x + lx * c + lz * s, z: h.z - lx * s + lz * c };
}

/**
 * Item 4: "Houses need flower pots, plants and climbers: pots on doorsteps and parapets, tulsi, creepers on walls."
 * Climbers/creepers are left out on purpose - src/vegetation.js's buildGardenPlants only draws a kind once a real
 * scanned model backs it (her 24 Oct call: "an unconvincing plant is worse than none"), and there is no real
 * creeper/vine asset in public/assets/props or props_ph. Pots are: potted_plant_01/02/04, planter_pot_clay are real
 * CC0 scans (docs/CREDITS.md), already used elsewhere in the game. Most houses get one pot, some two, some none -
 * a village street, not a plant nursery row.
 */
export function newHousePlantSites() {
  const out = [];
  const roads = NEW_HOUSE_ROADS.idx;
  NEW_HOUSES.forEach((h, i) => {
    if (h.noStrip || h.dx0 == null) return;
    const r = (k) => hash(i * 7.1 + k * 3.7 + 1000);
    const n = r(0) < 0.2 ? 0 : r(0) < 0.7 ? 1 : 2;
    // flank the door: one pot at each side of the opening, 0.35 m out from the jamb, on the ground at the step edge
    // (0.3 m beyond the step, so 0.5-1.2 m off the wall face and never in open grass)
    const lz = h.fz + Math.min(1.2, Math.max(0.5, h.stepD + 0.3)) - 0.0;
    const sides = r(2) < 0.5 ? [h.dx0 - 0.3, h.dx1 + 0.3] : [h.dx1 + 0.3, h.dx0 - 0.3];
    for (let k = 0; k < n; k++) {
      const p = frontPoint(h, sides[k], lz);
      if (roads && roads.clearance(p.x, p.z) < 1.0) continue; // road rule: never within 1 m of a road band
      out.push({ ...p, yaw: h.ry + (r(7 + k) - 0.5) * 0.6, pick: i * 13 + k * 7 });
    }
  });
  return out;
}

/**
 * Item 5: "Street life: carts, tables, chairs, charpais, benches outside houses and in corners, so the village is
 * not lifeless." Carts are shop-kit territory (src/bazaar.js, not touched here); this covers the furniture half with
 * villageProps.js's existing stool/bucket/basket/crate/table/chair/bench/tyre pool, "outside every few houses" -
 * about 2 in 5, not every one (housesClutter.js's own charpai/matka/bucket/cylinder/bicycle pool already covers the
 * first few metres right against the wall; this sits a bit further out, in front of or beside that).
 */
export function newHouseFurnitureSites() {
  const out = [];
  NEW_HOUSES.forEach((h, i) => {
    const r = (k) => hash(i * 11.3 + k * 5.1 + 5000);
    if (r(0) > 0.4) return;
    const half = Math.max(0.6, h.w / 2 - 0.5);
    const lx = (r(1) - 0.5) * 2 * half;
    const p = frontPoint(h, lx, h.d / 2 + 0.95);
    if (NEW_HOUSE_ROADS.idx && NEW_HOUSE_ROADS.idx.clearance(p.x, p.z) < 1.0) return; // road rule: no object on or within 1 m of a road band
    out.push({ ...p, yaw: h.ry + (r(2) - 0.5) * 0.4, pick: i * 17 + 9000 });
  });
  return out;
}
