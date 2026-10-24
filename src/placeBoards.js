import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';

/**
 * Bilingual signboards for every shop / place that has no Blender board of its own (FEEDBACK 24 Oct
 * item 1, signage audit of all 42 places). Same rule as every board: Hindi top line, small and light;
 * English second line, bigger and bolder; one dark paint colour. One shared atlas + one material for
 * all of them (so a site's boards merge into a single mesh), painted as soon as fonts load.
 * Faith buildings carry no commercial board (docs LAYOUT rule); they are named by the milestone and
 * direction signs instead.
 */
const MAROON = '#6e1a12';
const NAVY = '#14306e';
const GREEN = '#173f20';
const INK = '#1b1612';
export const PLACE_BOARDS = [
  { id: 'halwai', hi: 'हलवाई', en: 'Halwai - Sweets', fg: MAROON },
  { id: 'jalebi', hi: 'जलेबी और समोसा', en: 'Jalebi & Samosa', fg: MAROON },
  { id: 'dairy', hi: 'दूध डेयरी', en: 'Dudh Dairy', fg: NAVY },
  { id: 'anganwadi', hi: 'आँगनवाड़ी केंद्र', en: 'Anganwadi Centre', fg: MAROON },
  { id: 'health', hi: 'स्वास्थ्य उप-केंद्र', en: 'Health Sub-Centre', fg: GREEN },
  { id: 'chemist', hi: 'दवाई की दुकान', en: 'Chemist', fg: GREEN },
  { id: 'manihari', hi: 'मनिहारी - चूड़ियाँ', en: 'Manihari - Bangles', fg: MAROON },
  { id: 'sabzi', hi: 'ताज़ी सब्ज़ी', en: 'Fresh Sabzi', fg: GREEN },
  { id: 'gaushala', hi: 'गौशाला', en: 'Gaushala', fg: INK },
  { id: 'gurukul', hi: 'गुरुकुल कॉलेज', en: 'Gurukul College', fg: NAVY },
  { id: 'haveli', hi: 'पुरानी हवेली', en: 'Old Haveli', fg: INK },
  { id: 'dhaba', hi: 'ढाबा', en: 'Highway Dhaba', fg: MAROON },
  { id: 'godown', hi: 'मंडी गोदाम', en: 'Mandi Godown', fg: INK },
  { id: 'mandi', hi: 'मंडी', en: 'Mandi', fg: MAROON },
  { id: 'petrol', hi: 'पेट्रोल पंप', en: 'Petrol Pump', fg: MAROON },
  { id: 'kanta', hi: 'धर्म काँटा', en: 'Dharam Kanta', fg: NAVY },
  { id: 'busadda', hi: 'बस अड्डा', en: 'Bus Adda', fg: NAVY },
  { id: 'mela', hi: 'मेला मैदान', en: 'Mela Ground', fg: MAROON },
  { id: 'maidan', hi: 'खेल मैदान', en: 'Khel Maidan', fg: NAVY },
];
const ROW = new Map(PLACE_BOARDS.map((b, i) => [b.id, i]));
const CELL_W = 640, CELL_H = 145; // 4.4:1, same ratio as every other board

let shared = null;
function atlas() {
  if (!shared) {
    const a = createWideSignAtlas(PLACE_BOARDS, { cellW: CELL_W, cellH: CELL_H });
    const material = new THREE.MeshStandardMaterial({ map: a.texture, roughness: 0.85 });
    material.name = 'signboard'; // wall/roof-mounted fixture: validator check 2 exempts this name
    shared = { ...a, material };
  }
  return shared;
}

/**
 * Geometry of one board (+Z face carries the text, a thin wooden-looking frame is the box itself).
 * `b`: { id, x, y, z, ry = 0, w = 3 } in the caller's local space.
 */
export function placeBoardGeometry({ id, x, y, z, ry = 0, w = 3 }) {
  const { rows } = atlas();
  const h = (w * CELL_H) / CELL_W;
  const geo = new THREE.BoxGeometry(w, h, 0.06);
  mapFrontFaceToRow(geo, ROW.get(id), rows);
  geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
  return geo;
}

/** One merged mesh (one draw call) for a site's boards. */
export function placeBoardsMesh(boards, name = 'place_boards') {
  const mesh = new THREE.Mesh(mergeGeometries(boards.map(placeBoardGeometry)), atlas().material);
  mesh.name = name;
  mesh.castShadow = false;
  return mesh;
}
