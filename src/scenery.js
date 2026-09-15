import * as THREE from 'three';
import { texturedBox } from './materials.js';

// Item 10 — background houses beyond the fog line, so the village doesn't end
// abruptly. Lane trees were removed — see docs/parked.md: no suitable CC0 canopy-
// cluster cutout texture was found for a proper cross-plane billboard tree (ambientCG's
// "LeafSet"/"Foliage" atlases are individual leaves and grass blades, not a dense
// canopy silhouette), and the faceted icosahedron placeholder read as a toy prop.

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
