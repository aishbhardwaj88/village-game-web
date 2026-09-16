import * as THREE from 'three';
import { texturedThickBox, texturedWallBox } from './materials.js';
import { PALETTE, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { BuildingKit } from './buildingKit.js';

// Item 10 — background houses beyond the fog line, so the village doesn't end
// abruptly. Lane trees were removed — see docs/parked.md: no suitable CC0 canopy-
// cluster cutout texture was found for a proper cross-plane billboard tree (ambientCG's
// "LeafSet"/"Foliage" atlases are individual leaves and grass blades, not a dense
// canopy silhouette), and the faceted icosahedron placeholder read as a toy prop.

// Fixed palette (law, see docs/look-standard.md), each a different colour.
const HOUSE_TINTS = [PALETTE.terracotta, PALETTE.teal, PALETTE.fadedBlue];

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

  const kit = new BuildingKit(60);

  placements.forEach((p, i) => {
    // Grouped per house (not added loose into `group`) so a whole-object grounding
    // check (tools/screenshot.js) sees one "placed object" whose lowest point is the
    // block's base — not the roof, checked in isolation, several metres up.
    const houseGroup = new THREE.Group();
    houseGroup.name = `background_house_${i}`;

    const tint = HOUSE_TINTS[i % HOUSE_TINTS.length];
    const block = texturedWallBox(p.w, p.h, p.d, 'plaster', { tint, tileSize: 2, tintStrength: WALL_TINT_STRENGTH, seed: p.x * 3.1 + p.z * 1.7 });
    block.position.set(p.x, p.h / 2, p.z);
    houseGroup.add(block);

    const roof = texturedThickBox(p.w + 0.3, 0.25, p.d + 0.3, 'concrete', { tint: 0xd7d2c4 });
    roof.position.set(p.x, p.h + 0.125, p.z);
    houseGroup.add(roof);

    group.add(houseGroup);

    kit.addPlinthRing(p.x, p.z, p.w, p.d, WALL_THICKNESS);
    kit.addCornerPilasters(p.x, p.z, p.w, p.d, p.h, WALL_THICKNESS);
  });

  kit.finalize(group);
  scene.add(group);
  return group;
}
