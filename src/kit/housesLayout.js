/**
 * Tiny adapter between the houses kit and the map (S7 sprint). The LAYOUT agent is building src/layout/layout.js
 * (getObjects('new_house'), isNewLayout()); until it lands this reads the approved map JSON directly. Swap the two
 * functions below for the layout module's when it exists; nothing else in the houses code reads the map.
 *
 * The JSON is loaded with a dynamic import, so it is a separate chunk fetched only under ?layout=new.
 */

/** True when the page runs the 21 Nov map (?layout=new). */
export function isNewLayout() {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('layout') === 'new';
}

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
