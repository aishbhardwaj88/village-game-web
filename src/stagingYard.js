import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { placeBoardsMesh } from './placeBoards.js';
import { ANCHORS } from './anchors.js';

/**
 * The STAGING YARD (art director, 25 Oct 2026): she is going to rearrange the map herself, so every newly built place
 * from `Places V1/` stands on its own pad in empty ground east of the mandi. Grid origin (320, -160), 80 m spacing,
 * 6 columns per row: place n is at x = 320 + 80 * (n % 6), z = -160 + 80 * floor(n / 6). The old in-game version of a
 * replaced place stays where it was; nothing here overlaps anything.
 *
 * Each place is ONE Blender model (tools/blender/build_<place>.py -> public/assets/models/<place>.glb) in site-local
 * metres with the front toward +z. Collision is derived from the visible model (src/autoColliders.js), nothing is
 * hand-boxed, so doors, windows and gaps are exactly what you see.
 */
export const STAGING = { x0: 320, z0: -160, step: 80, cols: 6 };

/** Grid position of staging slot n. */
export function stagingPos(n) {
  return { x: STAGING.x0 + STAGING.step * (n % STAGING.cols), z: STAGING.z0 + STAGING.step * Math.floor(n / STAGING.cols) };
}

/** Anchor ids of the staged places, in slot order (the ANCHORS table carries their coordinates). */
export const STAGED = ['yard_school', 'yard_gurukul', 'yard_dairy'];

/**
 * A staged place: a flat dirt pad, the Blender model, and its bilingual boards.
 * `boards`: [{ id, x, y, z, w, ry }] in site-local metres (ids from src/placeBoards.js PLACE_BOARDS).
 */
export function createStagedPlace(name, anchorId, model, { boards = [], pad = [60, 50] } = {}) {
  const a = ANCHORS[anchorId];
  const group = new THREE.Group();
  group.name = name;
  group.position.set(a.x, 0, a.z);
  if (boards.length) group.add(placeBoardsMesh(boards, name + '_boards'));
  getGLTFLoader().loadAsync(`assets/models/${model}.glb`).then((gltf) => {
    const m = gltf.scene;
    m.name = name + '_model';
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(m);
  }).catch((err) => console.warn(`${model}.glb did not load`, err));
  return group;
}

/** The dirt track that links the staged places' gates: one long strip along the front of the row plus a short spur to each gate. */
export function createStagingTrack() {
  const geos = [];
  const x0 = STAGING.x0 - 30, x1 = STAGING.x0 + STAGING.step * (STAGED.length - 1) + 30;
  const zt = STAGING.z0 + 25 + 6; // 6 m in front of the gates
  const strip = (cx, cz, w, d) => geos.push(new THREE.BoxGeometry(w, 0.06, d).translate(cx, 0.03, cz));
  strip((x0 + x1) / 2, zt, x1 - x0, 4);
  for (let i = 0; i < STAGED.length; i++) strip(STAGING.x0 + STAGING.step * i, STAGING.z0 + 25 + 3, 4, 6);
  const g = geos.length > 1 ? mergeBoxes(geos) : geos[0];
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a7e58, roughness: 1 });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'staging_track/dirt';
  mesh.receiveShadow = true;
  return mesh;
}

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeBoxes(list) {
  return mergeGeometries(list.map((g) => { g.deleteAttribute('uv'); return g; }));
}
