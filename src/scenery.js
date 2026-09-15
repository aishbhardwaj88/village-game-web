import * as THREE from 'three';
import { texturedBox, getTiledMaterial } from './materials.js';
import { HOUSE_CENTER, HALWAI_CENTER, SCHOOL_CENTER } from './village.js';

// Item 10 — background houses beyond the fog line (so the village doesn't end
// abruptly) and simple instanced trees along the lane. Both optional/time-permitting;
// kept deliberately simple relative to the hero zone.

// Same mid-tone/saturated-tint logic as src/village.js — the plaster texture itself is
// pale, so these multiply down to sun-faded rather than reading as grey. Each a
// different colour, per docs/look-standard.md's palette.
const HOUSE_TINTS = [0xb8652e /* terracotta */, 0x6fa89c /* pale teal */, 0x4a7ba8 /* faded blue */];

/** A handful of simple flat-roofed boxes scattered past the hero zone, at a distance
 * fog (density 0.0085) mostly hazes over — same texture set as the hero zone, just
 * different tints, so it reads as "more village" rather than a different place. */
export function buildBackgroundHouses(scene) {
  const group = new THREE.Group();
  group.name = 'background_houses';

  const placements = [
    { x: -115, z: 15, w: 9, d: 7, h: 4.5 },
    { x: 25, z: 128, w: 8, d: 8, h: 4 },
    { x: -95, z: 165, w: 10, d: 7, h: 5 },
  ];

  placements.forEach((p, i) => {
    const tint = HOUSE_TINTS[i % HOUSE_TINTS.length];
    const block = texturedBox(p.w, p.h, p.d, 'plaster', { tint, tileSize: 2 });
    block.position.set(p.x, p.h / 2, p.z);
    group.add(block);

    const roof = texturedBox(p.w + 0.3, 0.25, p.d + 0.3, 'concrete', { tint: 0xd7d2c4 });
    roof.position.set(p.x, p.h + 0.125, p.z);
    group.add(roof);
  });

  scene.add(group);
  return group;
}

const TREE_TRUNK_MAT = new THREE.MeshStandardMaterial({ color: 0x5c4326, roughness: 0.95 });

function treePositionsAlongLane() {
  const segments = [
    [HOUSE_CENTER, HALWAI_CENTER],
    [HALWAI_CENTER, SCHOOL_CENTER],
  ];
  const positions = [];
  for (const [start, end] of segments) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const nx = -dz / length; // perpendicular to the lane, for the roadside offset
    const nz = dx / length;
    const spacing = 7;
    const count = Math.floor(length / spacing);
    for (let i = 1; i < count; i++) {
      const t = i / count;
      const px = start.x + dx * t;
      const pz = start.z + dz * t;
      const side = i % 2 === 0 ? 1 : -1;
      const offset = 4.5 + Math.random() * 1.5;
      positions.push({ x: px + nx * offset * side, z: pz + nz * offset * side });
    }
  }
  return positions;
}

/** Simple two-part instanced trees (trunk + canopy) along the lane, one draw call
 * each regardless of tree count. */
export function buildLaneTrees(scene) {
  const positions = treePositionsAlongLane();
  const group = new THREE.Group();
  group.name = 'lane_trees';

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.2, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, TREE_TRUNK_MAT, positions.length);
  trunks.castShadow = true;

  const canopyGeo = new THREE.IcosahedronGeometry(1.4, 0);
  const canopyMat = getTiledMaterial('crop', { repeatX: 1, repeatY: 1, tint: 0x4f7a3d, roughness: 1 });
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, positions.length);
  canopies.castShadow = true;

  const dummy = new THREE.Object3D();
  positions.forEach((p, i) => {
    const scale = 0.85 + Math.random() * 0.4;
    dummy.position.set(p.x, 1.1 * scale, p.z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, 2.4 * scale, p.z);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;

  group.add(trunks, canopies);
  scene.add(group);
  return group;
}
