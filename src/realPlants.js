/**
 * Real CC0 plant scans (Poly Haven, shrunk by tools/shrink.js into public/assets/plants3d, credits in docs/CREDITS.md) drawn as
 * InstancedMeshes. Replaces the old alpha-card garden/grass/scrub shapes (FEEDBACK 24 Oct item 2: "poorly cut 2D image",
 * "use good quality plants and pots everywhere, or do not use them at all"). One InstancedMesh per scan part, so a model costs
 * one draw call per call-site however many copies it has. Loading is async: the returned group fills in when the model arrives.
 */
import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';

const cache = new Map(); // file -> Promise<[{ geometry, material, matrix, height }]>
function loadParts(file, height) {
  if (!cache.has(file)) {
    cache.set(file, getGLTFLoader().loadAsync(`assets/plants3d/${file}.glb`).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const k = height / Math.max(0.01, box.max.y - box.min.y);
      const c = box.getCenter(new THREE.Vector3());
      const fit = new THREE.Matrix4().makeScale(k, k, k).setPosition(-c.x * k, -box.min.y * k, -c.z * k);
      const parts = [];
      gltf.scene.traverse((m) => {
        if (!m.isMesh) return;
        const material = m.material.clone(); // plants are two-sided alpha cutouts; keep the scan's own maps
        material.side = THREE.DoubleSide;
        if (material.alphaTest === 0 && material.transparent) { material.alphaTest = 0.5; material.transparent = false; material.depthWrite = true; }
        parts.push({ geometry: m.geometry, material, matrix: new THREE.Matrix4().multiplyMatrices(fit, m.matrixWorld) });
      });
      return parts;
    }));
  }
  return cache.get(file);
}

const sets = new Set(); // every live distance-limited plant set
let focusX = 1e9, focusZ = 1e9;
/** Call every frame with the player/vehicle position: plant sets re-sort so only copies within their radius are drawn. */
export function getPlantFocus() { return [focusX, focusZ]; }
export function setPlantFocus(x, z) {
  focusX = x; focusZ = z;
  for (const set of sets) set.refresh();
}

/**
 * Adds instanced copies of `file` to `group`.
 * items: [{ x, z, y?, scale?, yaw? }]; `height` is the real-world height (m) of an unscaled copy; `tint` 0..1 per-instance
 * brightness variation range (default 0.18); `seed` makes the per-instance variation deterministic.
 * `radius`: (density thins past 55% and 80% of it) only copies within this many metres of the player are drawn (the 400k triangle budget cannot carry every scanned
 * plant in the village; a tuft 60 m away is a few pixels). The set re-sorts itself when the player has moved 5 m.
 */
export function addPlantInstances(group, file, height, items, { tint = 0.18, seed = 1, castShadow = false, radius = 45 } = {}) {
  if (!items.length) return group;
  loadParts(file, height).then((parts) => {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const rolls = items.map(() => [rnd(), rnd(), rnd(), rnd()]);
    const insts = parts.map((part) => {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, items.length);
      inst.castShadow = castShadow;
      inst.receiveShadow = true;
      inst.name = `plant_${file}`;
      inst.userData.mergedStatic = true;
      inst.frustumCulled = false; // bounding sphere would go stale as the drawn subset changes; the set hides itself when empty
      group.add(inst);
      return inst;
    });
    // per-item matrices and colours for each part, computed once
    const mats = parts.map((part) => items.map((it, i) => {
      const [r0, r1, r2, r3] = rolls[i];
      const k = (it.scale ?? 1) * (0.8 + r0 * 0.45);
      e.set((r1 - 0.5) * 0.08, it.yaw ?? r2 * Math.PI * 2, (r3 - 0.5) * 0.08);
      q.setFromEuler(e);
      sc.set(k, k * (0.92 + r1 * 0.2), k);
      return m4.compose(v.set(it.x, it.y ?? 0, it.z), q, sc).multiply(part.matrix).clone();
    }));
    const cols = items.map((it, i) => { const [, r1, r2, r3] = rolls[i]; const t = 1 - tint * r2; return new THREE.Color(t, t * (0.97 + r3 * 0.05), t * 0.95); });
    const r2lim = radius * radius, r2mid = r2lim * 0.3, r2far = r2lim * 0.64;
    let lastX = 1e9, lastZ = 1e9;
    const set = {
      refresh(force = false) {
        if (!insts[0].parent) { sets.delete(set); return; }
        if (!force && Math.hypot(focusX - lastX, focusZ - lastZ) < 5) return;
        lastX = focusX; lastZ = focusZ;
        const near = [];
        for (let i = 0; i < items.length; i++) {
          const d2 = (items[i].x - focusX) ** 2 + (items[i].z - focusZ) ** 2;
          // density LOD: past 55% of the radius only every other copy (a stable pick per item) is drawn, past 80% only one in four
          if (d2 > r2lim) continue;
          if (d2 > r2mid && rolls[i][3] >= (d2 > r2far ? 0.25 : 0.5)) continue;
          near.push(i);
        }
        insts.forEach((inst, pi) => {
          near.forEach((i, slot) => { inst.setMatrixAt(slot, mats[pi][i]); inst.setColorAt(slot, cols[i]); });
          inst.count = near.length;
          inst.visible = near.length > 0;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        });
      },
    };
    sets.add(set);
    set.refresh(true);
  }).catch((err) => console.warn('plant model failed', file, err));
  return group;
}
