import * as THREE from 'three';
import { loadLandMap } from './landLayout.js';
import { buildShops } from './shopsPlace.js';
import { frameHook } from './landInstancing.js';

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
  // one per-frame hook drives every layer's distance packing that is not tied to its own BatchedMesh
  const ups = Object.values(layers).map((l) => l.userData.update).filter(Boolean);
  group.add(frameHook((cam) => { for (const u of ups) u(cam); }));
  if (camera) for (const u of ups) u(camera);
  group.userData.landHeightAt = (x, z) => { let y = 0; for (const f of heightFns) y = Math.max(y, f(x, z)); return y; };
  group.userData.report = report;
  if (scene) scene.add(group);
  return { group, layers, report };
}

const MODULES = import.meta.glob(['./landTrees.js', './landFields.js', './landCanal.js', './landProps.js']);

// The game calls src/kit/landInit.js (a tiny lazy loader), never this file directly.
