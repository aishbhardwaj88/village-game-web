import * as THREE from 'three';
import { createWaterMaterial, channelWaterGeometry } from './water.js';
import { texturedThickBox } from './materials.js';
import { mergeGroupByMaterial } from './mergeUtils.js';

/**
 * The map's field channel (docs/layout/village-plan-positions-2026-11-01.json water.field_channel):
 * a shallow irrigation cut running roughly north-south through the east fields, under the second culvert.
 * Flat water strip plus low kachcha lips; nothing here is solid, so it never closes a route (the culvert
 * is the crossing on the map, and the feeder canal keeps its own banks).
 */
const WIDTH = 2.4;

export function buildFieldChannel(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  const group = new THREE.Group();
  group.name = 'field_channel';
  group.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  group.rotation.y = -Math.atan2(dz, dx); // local +x runs along the channel

  const water = new THREE.Mesh(channelWaterGeometry(len, WIDTH, 0.05, 4), createWaterMaterial({ shallow: 0x7a7a4c, deep: 0x44502f, scale: 1.1, opacity: 0.95 }));
  water.name = 'field_channel_water';
  water.receiveShadow = true;
  group.add(water);

  for (const side of [-1, 1]) {
    const lip = texturedThickBox(len, 0.22, 0.7, 'ground', { tint: 0x8a7248, tileSize: 2, tintStrength: 0.5, collider: false });
    lip.position.set(0, 0.11, side * (WIDTH / 2 + 0.3));
    lip.name = 'field_channel_lip';
    lip.castShadow = false;
    group.add(lip);
  }
  mergeGroupByMaterial(group);
  return group;
}
