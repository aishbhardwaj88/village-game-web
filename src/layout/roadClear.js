/**
 * 26 Nov: HER RULE, NO OBJECT ON A ROAD (roads are only for vehicles). Shared test for the old-layout builders that still place
 * props at hard-coded coordinates under the approved map. Under ?layout=old everything stays as before (always "clear").
 *   onNewRoad(x, z, r)   true when a footprint of radius r at (x, z) touches a map road band (highway, road, lane, back, track)
 *   keepOffRoad(list, xf, zf, rf)  filter: drops list items on a road under the new layout only
 */
import { isNewLayout, getRoads } from './layout.js';
import { nearestRoad } from './layoutCore.js';

export function onNewRoad(x, z, r = 1) {
  if (!isNewLayout()) return false;
  const n = nearestRoad(getRoads(), x, z);
  return !!n && n.edge < r;
}
export function keepOffRoad(list, pick = (i) => [i.x, i.z, 1.2]) {
  if (!isNewLayout()) return list;
  return list.filter((i) => { const [x, z, r] = pick(i); return !onNewRoad(x, z, r); });
}
