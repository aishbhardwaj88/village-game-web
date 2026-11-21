import * as THREE from 'three';
import { loadLandMap, isNewLayoutParam } from './landLayout.js';
import { buildShops } from './shopsPlace.js';

/**
 * Shops-land entry point (?layout=new only). One call builds every layer this agent owns from the approved map and adds
 * it to the scene under one group 's7_shops_land':
 *   shops   two-storey shop-houses, single shops, kiosks, carts, sheds + their boards  (src/kit/shopsPlace.js)
 *   trees   neem, shisham, peepal, mango, guava, eucalyptus with near / thinned / impostor LOD (src/kit/landTrees.js)
 *   fields  painted crop patches, green strips, kiln green, crop clumps near roads       (src/kit/landFields.js)
 *   canal   water, lined banks, bridges, ghat                                           (src/kit/landCanal.js)
 *   props   flag island, peepal platform, wells, hand pumps, washing lines, haystacks,
 *           dung cakes, straw stacks                                                    (src/kit/landProps.js)
 * Returns { group, layers: { name: Object3D }, report }. The group's userData.landHeightAt(x, z) gives the walk height
 * on the bridges, canal banks and platforms (Wiring needed: fold it into main.js groundHeightAt).
 */
export async function buildShopsLand(scene, { map = null, camera = null, only = null } = {}) {
  map = map || (await loadLandMap());
  const group = new THREE.Group();
  group.name = 's7_shops_land';
  const layers = {}, report = {};
  const want = (n) => !only || only.split(',').includes(n);
  const add = (name, obj) => { if (!obj) return; obj.name = obj.name || name; layers[name] = obj; group.add(obj); if (obj.userData.report) report[name] = obj.userData.report; };

  if (want('shops')) add('shops', buildShops(map, { camera }));
  const heightFns = [];
  for (const [name, path] of [['trees', './landTrees.js'], ['fields', './landFields.js'], ['canal', './landCanal.js'], ['props', './landProps.js']]) {
    if (!want(name) || !MODULES[path]) continue;
    const mod = await MODULES[path]();
    const obj = await mod.build(map, { camera });
    add(name, obj);
    if (obj?.userData.heightAt) heightFns.push(obj.userData.heightAt);
  }
  group.userData.landHeightAt = (x, z) => { let y = 0; for (const f of heightFns) y = Math.max(y, f(x, z)); return y; };
  group.userData.report = report;
  if (scene) scene.add(group);
  return { group, layers, report };
}

const MODULES = import.meta.glob(['./landTrees.js', './landFields.js', './landCanal.js', './landProps.js']);

/** Game hook: builds only under ?layout=new; resolves to null otherwise. */
export function initShopsLand(scene, opts = {}) {
  if (!isNewLayoutParam()) return Promise.resolve(null);
  return buildShopsLand(scene, opts).catch((e) => { console.warn('shops-land did not build', e); return null; });
}
