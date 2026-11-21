/**
 * The approved map's water, for the two drawn maps (S7 fixes, ?layout=new only): the corner minimap (src/minimap.js) and the
 * notebook map (src/freeRoam.js). Read from the layout loader's map (src/layout/layout.js getLayout(), already in the main
 * bundle), so nothing new is downloaded. Under ?layout=old nobody calls this.
 *   canal     { x, z0, z1, width }        the north-south canal (x 824, z -340..350, 6 m of water)
 *   bridge    { x, z }                    the canal bridge on the east road (the notebook's "Nahar and bridge" place)
 *   channels  [{ a: [x, z], b: [x, z], width }]   the 10 field channels (1 m)
 *   ponds     [{ name, ring }]            buffalo, cattle and clay pit pond water
 *   tanks     [{ name, ring, steps }]     the temple tank (water ring + its stepped rim)
 */
import { getLayout, getCanal } from '../layout/layout.js';

let cache = null;
const key = (o) => o.label.split('|')[0].trim();

export function newWaterShapes() {
  if (cache) return cache;
  const objs = getLayout().objects;
  const c = getCanal() || { centre_x: 824, width: 6 };
  const water = objs.find((o) => key(o) === 'canal_new' && /water/i.test(o.name) && o.rect);
  const len = water ? Math.max(water.rect.w, water.rect.d) : 690;
  const cz = water ? water.rect.cz : 5;
  const canal = { x: water ? water.rect.cx : c.centre_x, z0: cz - len / 2, z1: cz + len / 2, width: c.width || 6 };
  // the bridge the east road crosses (nearest the village's east-west road, z ~ 30); else the canal's middle
  const bridges = objs.filter((o) => key(o) === 'canal_new' && /bridge/i.test(o.name) && o.rect);
  bridges.sort((a, b) => Math.abs(a.rect.cz - 32) - Math.abs(b.rect.cz - 32));
  const bridge = bridges[0] ? { x: bridges[0].rect.cx, z: bridges[0].rect.cz } : { x: canal.x, z: 32 };
  const channels = [];
  for (const o of objs) {
    if (key(o) !== 'new_channel' || !o.rect) continue;
    const r = o.rect, long = r.w >= r.d, L = long ? r.w : r.d;
    // local x runs along w; rotation.y = ry puts local +x on (cos ry, -sin ry)
    const ux = long ? Math.cos(r.ry) : Math.sin(r.ry), uz = long ? -Math.sin(r.ry) : Math.cos(r.ry);
    channels.push({ a: [r.cx - ux * L / 2, r.cz - uz * L / 2], b: [r.cx + ux * L / 2, r.cz + uz * L / 2], width: Math.min(r.w, r.d) });
  }
  const ponds = [], tanks = [];
  for (const o of objs) {
    const k = key(o);
    if (/^new_(Buffalo|Cattle|Clay pit) pond$/.test(k) && !/bank/i.test(o.name) && o.rings?.[0]) ponds.push({ name: o.name, ring: o.rings[0] });
  }
  const tw = objs.find((o) => key(o) === 'new_temple_tank' && !/steps/i.test(o.name) && o.rings?.[0]);
  const ts = objs.find((o) => key(o) === 'new_temple_tank' && /steps/i.test(o.name) && o.rings?.[0]);
  if (tw) tanks.push({ name: tw.name, ring: tw.rings[0], steps: ts ? ts.rings[0] : null });
  cache = { canal, bridge, channels, ponds, tanks };
  return cache;
}
