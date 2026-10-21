import * as THREE from 'three';
import { texturedThickBox, texturedWallBox } from './materials.js';
import { PALETTE, WALL_TINT_STRENGTH } from './village.js';
import { mergeGroupByMaterial } from './mergeUtils.js';
import { getGLTFLoader } from './loaders.js';

// Background houses beyond the hero zone, so the village doesn't end abruptly (docs/bg-houses-checklist.md).
// 2026-10-21: four hand-modelled Blender variants (tools/blender/build_bg_houses.py) — A single-room flat roof,
// B two-storey painted, C tin roof inside a yard wall, D mud-plaster house with a red clay tile roof — drawn as
// InstancedMeshes (one draw per material per variant, however many placements). Collision + the world validator's
// real-geometry backing stay as a hidden, locally-merged group of plain boxes ('bg_houses_old').

// Footprint boxes in the variant's LOCAL frame (front = +z), matching the Blender scripts.
const VARIANTS = {
  a: { file: 'bg_house_a.glb', boxes: [{ x0: -2.75, x1: 2.75, z0: -2.5, z1: 2.5, h: 3.6 }] },
  b: { file: 'bg_house_b.glb', boxes: [{ x0: -3, x1: 3, z0: -3, z1: 3, h: 6.6 }] },
  c: {
    file: 'bg_house_c.glb',
    boxes: [
      { x0: -2.25, x1: 2.25, z0: -4, z1: 0, h: 3.2 }, // the house
      { x0: -4, x1: 4, z0: -4, z1: -3.8, h: 1.2 }, { x0: -4, x1: -3.8, z0: -4, z1: 4, h: 1.2 }, { x0: 3.8, x1: 4, z0: -4, z1: 4, h: 1.2 }, // yard walls (back, west, east)
      { x0: -4, x1: -1.2, z0: 3.8, z1: 4, h: 1.2 }, { x0: 1.2, x1: 4, z0: 3.8, z1: 4, h: 1.2 }, // front, either side of the gate
    ],
  },
  d: { file: 'bg_house_d.glb', boxes: [{ x0: -2.5, x1: 2.5, z0: -2.25, z1: 2.25, h: 2.9 }] },
};

// Clear of every lane/route (tools/world-validator.js chains), the field and the canal. yaw in quarter turns.
const PLACEMENTS = [
  { v: 'd', x: -115, z: 15, q: 1 },
  { v: 'c', x: 25, z: 128, q: 2 },
  { v: 'b', x: -95, z: 165, q: 2 },
  { v: 'a', x: -118, z: 38, q: 1 },
  { v: 'a', x: -85, z: 62, q: 1 },
  { v: 'a', x: -22, z: 102, q: 3 },
  { v: 'a', x: -20, z: 132, q: 2 },
  { v: 'a', x: -75, z: 142, q: 2 },
  { v: 'b', x: -62, z: 152, q: 2 },
  { v: 'b', x: 12, z: 108, q: 3 },
  { v: 'c', x: -112, z: 66, q: 1 },
  { v: 'c', x: 32, z: 84, q: 3 },
  { v: 'd', x: -100, z: 98, q: 1 },
  { v: 'd', x: -18, z: 78, q: 3 },
];

function worldBox(p, b) {
  const th = (p.q * Math.PI) / 2;
  const c = Math.round(Math.cos(th)), s = Math.round(Math.sin(th));
  const pts = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]].map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);
  return { minX: Math.min(...pts.map((q) => q[0])), maxX: Math.max(...pts.map((q) => q[0])), minZ: Math.min(...pts.map((q) => q[1])), maxZ: Math.max(...pts.map((q) => q[1])), h: b.h };
}

export function buildBackgroundHouses(scene, kit) {
  const group = new THREE.Group();
  group.name = 'background_houses';

  // Hidden collision/validator backing: one plaster box per footprint box.
  const old = new THREE.Group();
  old.name = 'bg_houses_old';
  old.visible = false;
  PLACEMENTS.forEach((p) => {
    for (const b of VARIANTS[p.v].boxes) {
      const w = worldBox(p, b);
      const mesh = texturedWallBox(w.maxX - w.minX, w.h, w.maxZ - w.minZ, 'plaster', { tint: PALETTE.cream, tileSize: 2, tintStrength: WALL_TINT_STRENGTH, seed: p.x * 3.1 + p.z * 1.7 });
      mesh.position.set((w.minX + w.maxX) / 2, w.h / 2, (w.minZ + w.maxZ) / 2);
      old.add(mesh);
    }
  });
  mergeGroupByMaterial(old);
  group.add(old);

  // The visible houses: one InstancedMesh per mesh of each variant's glb, per map region (so frustum culling can drop
  // a whole far region instead of every instance always being drawn).
  const loader = getGLTFLoader();
  const region = (p) => `${p.x < -70 ? 'W' : 'E'}${p.z < 100 ? 'N' : 'S'}`;
  for (const [key, def] of Object.entries(VARIANTS)) {
    const mine = PLACEMENTS.filter((p) => p.v === key);
    if (!mine.length) continue;
    loader.load(`assets/models/${def.file}`, (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const regions = [...new Set(mine.map(region))];
      for (const reg of regions) {
        const list = mine.filter((p) => region(p) === reg);
        gltf.scene.traverse((m) => {
          if (!m.isMesh) return;
          const inst = new THREE.InstancedMesh(m.geometry, m.material, list.length);
          const tmp = new THREE.Matrix4();
          const col = new THREE.Color();
          list.forEach((p, i) => {
            tmp.makeRotationY((p.q * Math.PI) / 2).setPosition(p.x, 0, p.z);
            inst.setMatrixAt(i, tmp.multiply(m.matrixWorld.clone()));
            const v = 0.95 + 0.05 * (((i * 7919 + key.charCodeAt(0) + reg.charCodeAt(0)) % 100) / 100);
            inst.setColorAt(i, col.setRGB(v, v * (0.97 + 0.03 * ((i * 13) % 3)), v * 0.97));
          });
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          inst.computeBoundingSphere();
          inst.castShadow = false; // distant scenery, beyond the useful shadow range
          inst.receiveShadow = true;
          inst.userData.mergedStatic = true; // whole-object grounding check: roofs of these are elevated by design
          inst.name = `bg_house_${key}_${reg}_${m.name || 'mesh'}`;
          group.add(inst);
        });
      }
    });
  }

  scene.add(group);
  return group;
}
