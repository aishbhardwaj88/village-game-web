/**
 * Tiny adapter between the houses kit and the map (S7 sprint). The on/off switch is the layout agent's isNewLayout()
 * (src/layout/layout.js). The house plan itself is precomputed from the game's map data by
 * `node src/kit/housesCheck.js --write-plan` (src/kit/housesPlanData.json); loadHouseMap is kept for tools.
 *
 * The JSON is loaded with a dynamic import, so it is a separate chunk fetched only under ?layout=new.
 */

/** True when the page runs the 21 Nov map: the layout agent's switch (?layout=new now, the default once the integrator flips it). */
export { isNewLayout } from '../layout/layout.js';

/** { houses: [{ ring, mud }], roads: [{ id, width, pts }], solids: [{ label, ring }] } from the approved map. */
export async function loadHouseMap() {
  const mod = await import('../../docs/layout/approved-map-2026-11-21.json');
  return houseMapFrom(mod.default || mod);
}

/** Same, from an already parsed map object (node tools pass the JSON in). */
export function houseMapFrom(map) {
  const houses = [];
  const solids = [];
  for (const o of map.objects) {
    if (!o.rings || !o.rings.length) continue;
    if (o.label.startsWith('new_house')) houses.push({ ring: o.rings[0], mud: /Mud house/.test(o.label) });
    else if (o.kind === 'solids') solids.push({ label: o.label, ring: o.rings[0] });
  }
  const roads = map.roads.map((r) => ({ id: r.id, kind: r.kind, width: r.width, pts: r.pts }));
  return { houses, roads, solids };
}
