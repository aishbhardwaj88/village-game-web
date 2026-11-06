import * as THREE from 'three';
import { texturedBox } from './materials.js';
import { mergeMeshList } from './mergeUtils.js';
import { buildTrees } from './trees.js';
import { ANCHORS, localPt } from './anchors.js';

/**
 * Small everyday SCENES (docs/PARALLEL.md section D): a carrom game, a man listening to a radio on a charpai, an open-air
 * barber. All hard-surface: boxes only, textured from the shared library ('wood', 'jute', 'metal'), merged to ONE mesh per
 * material across all three scenes (3 draw calls), plus ONE InstancedMesh of capsule placeholder people (same style as
 * src/bazaarLife.js). The barber has his own neem (src/trees.js) because the mirror hangs on a trunk.
 *
 * Where: the chaupal yard's bare earth patch (docs/PLACES "Peepal chaupal": 20 x 20 m, peepal + 8 m platform at the centre,
 * lanes meeting at the middle of the 4 sides) - so every scene sits in a CORNER of the patch, 6+ m from the platform and
 * 3+ m inside the patch edge. Positions are in the chaupal's own metres (front = +z) and follow ANCHORS.yard_chaupal.
 *
 * No colour is flat: tints are vertex-colour multipliers over real textures. No brands, no tobacco, no alcohol.
 */
const PEOPLE_RADIUS = 0.32;
const PEOPLE_HEIGHT = 1.7;
const TINTS_MEN = [0xb8b0a0, 0x8a9aa8, 0xa89070, 0x9a8a9a, 0x7a8a6a, 0xc0a890];

// scene origins in the chaupal's own metres, and which way each scene faces (radians about Y, added to the anchor's ry)
export const LIFE_SCENES = {
  carrom: { lx: -6.2, lz: -6.0, yaw: 0.35 },
  radio: { lx: 3.4, lz: -6.6, yaw: -0.2 },
  barber: { lx: -6.4, lz: 6.8, yaw: 2.4 },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function createLifeScenes(scene) {
  const A = ANCHORS.yard_chaupal;
  const rand = rng(77);
  const parts = { wood: [], jute: [], metal: [] }; // pre-merge meshes, world-space
  const people = []; // {x,z,y,ry,sx,sy,tint}

  const sceneMat = new THREE.Matrix4();
  const _p = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();

  let curYaw = 0;
  function begin(def) {
    curYaw = def.yaw;
    const o = localPt('yard_chaupal', def.lx, def.lz);
    _q.setFromEuler(_e.set(0, (A.ry || 0) + def.yaw, 0));
    sceneMat.compose(new THREE.Vector3(o.x, 0, o.z), _q, new THREE.Vector3(1, 1, 1));
    return o;
  }
  /** A textured box in scene-local metres (centre x,y,z; yaw ry) added to the merge list of its material. */
  function box(mat, w, h, d, x, y, z, ry = 0, tint = null, tileSize = 1.0) {
    const m = texturedBox(w, h, d, mat, { tileSize, tint, tintStrength: 0.55 });
    m.geometry.applyMatrix4(_p.compose(new THREE.Vector3(x, y, z), _q.clone().setFromEuler(_e.set(0, ry, 0)), new THREE.Vector3(1, 1, 1)).premultiply(sceneMat));
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
    parts[mat].push(m);
  }
  /** A person in scene-local metres; seated people are squashed shorter and a touch wider. */
  function person(x, z, faceRy, seated, tint) {
    const v = new THREE.Vector3(x, 0, z).applyMatrix4(sceneMat);
    const sy = seated ? 0.6 + rand() * 0.05 : 0.95 + rand() * 0.1;
    people.push({ x: v.x, z: v.z, ry: (A.ry || 0) + curYaw + faceRy, sy, sx: seated ? 1.15 : 1, tint: tint ?? TINTS_MEN[Math.floor(rand() * TINTS_MEN.length)] });
  }
  const t = (lo, hi) => lo + rand() * (hi - lo);

  // ---------- (1) carrom ----------
  {
    const def = LIFE_SCENES.carrom;
    begin(def);
    box('jute', 2.7, 0.03, 2.7, 0, 0.015, 0, 0.2, 0xd8c8a8, 1.0); // the mat they sit on
    // low stool carrying the board: four legs + top
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, 0.3, 0.07, sx * 0.34, 0.18, sz * 0.34, 0, 0x9a7a58);
    box('wood', 0.85, 0.05, 0.85, 0, 0.355, 0, 0, 0xa58a68);
    // the board: ply playing surface (pale) inside four rails, dark pockets in the corners
    box('wood', 0.74, 0.03, 0.74, 0, 0.39, 0, 0, 0xe0c898);
    for (const s of [-1, 1]) {
      box('wood', 0.84, 0.05, 0.05, 0, 0.405, s * 0.395, 0, 0x6a4a30);
      box('wood', 0.05, 0.05, 0.74, s * 0.395, 0.405, 0, 0, 0x6a4a30);
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, 0.012, 0.07, sx * 0.34, 0.41, sz * 0.34, 0, 0x2a1c12);
    // a small stack of coins/strikers as a few tiny pale discs-as-boxes
    for (let i = 0; i < 5; i++) box('wood', 0.03, 0.012, 0.03, t(-0.12, 0.12), 0.41, t(-0.12, 0.12), rand() * 3, i % 2 ? 0xf0e0c0 : 0x3a2a20);
    // four men round the board, each facing the centre (+z local is their front)
    const men = [[0, 1.25, Math.PI], [0, -1.25, 0], [1.25, 0, -Math.PI / 2], [-1.25, 0.1, Math.PI / 2]];
    for (const [x, z, face] of men) person(x + t(-0.1, 0.1), z + t(-0.1, 0.1), face + t(-0.25, 0.25), true);
    // a small wooden tin-box of spare coins and a folded gamchha-cloth seat beside
    box('wood', 0.28, 0.18, 0.2, 1.6, 0.09, -1.0, 0.5, 0x8a6a48);
    box('jute', 0.4, 0.04, 0.3, -1.55, 0.02, 1.0, 0.8, 0xc8b898);
  }

  // ---------- (2) radio on a charpai ----------
  {
    const def = LIFE_SCENES.radio;
    begin(def);
    const L = 1.9, W = 0.95, H = 0.4;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, H, 0.07, sx * (L / 2 - 0.04), H / 2, sz * (W / 2 - 0.04), 0, 0x7a5a3c);
    for (const s of [-1, 1]) {
      box('wood', L, 0.06, 0.06, 0, H, s * (W / 2 - 0.04), 0, 0x8a6a48);
      box('wood', 0.06, 0.06, W, s * (L / 2 - 0.04), H, 0, 0, 0x8a6a48);
    }
    box('jute', L - 0.14, 0.025, W - 0.14, 0, H + 0.005, 0, 0, 0xc4a878, 0.8); // the woven rope bed
    box('jute', 0.55, 0.07, 0.8, -0.65, H + 0.05, 0, 0, 0x8a4a4a, 0.8); // folded blanket as a pillow roll
    // the radio at the head end: wooden cabinet, metal speaker grille, dial strip, telescopic aerial
    box('wood', 0.3, 0.19, 0.11, -0.62, H + 0.16, -0.1, 0.05, 0x3a2a20);
    box('metal', 0.15, 0.13, 0.012, -0.69, H + 0.16, -0.045, 0.05, 0x8a8a84);
    box('metal', 0.1, 0.03, 0.012, -0.53, H + 0.2, -0.045, 0.05, 0xb8b0a0);
    box('metal', 0.012, 0.36, 0.012, -0.5, H + 0.35, -0.14, 0, 0xa0a0a0);
    // one man sits on the edge listening (no phone: it's a radio), a pair of chappals under the bed
    person(0.25, W / 2 + 0.12, Math.PI + 0.2, true);
    box('wood', 0.1, 0.02, 0.26, 0.55, 0.01, W / 2 + 0.3, 0.3, 0x5a4030);
    box('wood', 0.1, 0.02, 0.26, 0.7, 0.01, W / 2 + 0.28, -0.1, 0x5a4030);
  }

  // ---------- (3) barber under his own neem ----------
  let barberTree = null;
  {
    const def = LIFE_SCENES.barber;
    const o = begin(def);
    barberTree = buildTrees([{ kind: 'neem', x: o.x, z: o.z, seed: 31, rotationY: 0.6 }]);
    // trunk at scene origin; the barber's chair stands 1.6 m out in local +z so the mirror (on the trunk) faces it
    box('wood', 0.5, 0.03, 0.5, 0, 0.415, 1.6, 0, 0x9a7a54); // seat plank
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.05, 0.4, 0.05, sx * 0.21, 0.2, 1.6 + sz * 0.21, 0, 0x7a5a3c);
    box('wood', 0.5, 0.45, 0.04, 0, 0.67, 1.6 + 0.23, 0, 0x8a6a48); // back rest
    box('wood', 0.5, 0.04, 0.3, 0, 0.12, 1.6 - 0.45, 0, 0x7a5a3c); // foot rest
    // mirror hung on the trunk: wooden frame + a pale metal sheet in it, a nail-hung strop of jute beside it
    box('wood', 0.46, 0.6, 0.03, 0, 1.45, 0.34, 0, 0x6a4a30);
    box('metal', 0.38, 0.52, 0.01, 0, 1.45, 0.36, 0, 0xcfd8dc, 0.4);
    box('jute', 0.05, 0.4, 0.012, 0.36, 1.25, 0.31, 0.15, 0x6a4a30, 0.4);
    // barber's low stool / box with his tools, and a bucket-sized crate
    box('wood', 0.4, 0.3, 0.3, 0.95, 0.15, 0.85, 0.4, 0x8a6a48);
    box('metal', 0.12, 0.02, 0.05, 0.9, 0.31, 0.85, 0.7, 0xb8b8b0, 0.3); // scissors laid flat
    box('metal', 0.07, 0.02, 0.06, 1.05, 0.31, 0.8, 0.2, 0xb8b8b0, 0.3); // razor handle
    box('jute', 1.2, 0.025, 1.0, 0.0, 0.0125, 1.9, 0.2, 0xb8a888, 1.0); // sacking laid down for hair-clippings
    person(0, 1.6 + 0.02, Math.PI, true, 0x9a8f80); // customer in the chair, facing the mirror (-z)
    person(0.35, 2.45, Math.PI, false, 0xc4bca8); // barber standing behind the chair, a pace to the side
  }

  // ---------- merge: one mesh per material across all scenes ----------
  const root = new THREE.Group();
  root.name = 'life_scenes';
  for (const [mat, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const merged = mergeMeshList(list, `life_scenes_${mat}`);
    merged.castShadow = true;
    merged.receiveShadow = true;
    root.add(merged);
  }
  if (barberTree) root.add(barberTree);

  // ---------- people: ONE instanced capsule mesh (same style as src/bazaarLife.js) ----------
  const geometry = new THREE.CapsuleGeometry(PEOPLE_RADIUS, PEOPLE_HEIGHT - PEOPLE_RADIUS * 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const mesh = new THREE.InstancedMesh(geometry, material, people.length);
  mesh.name = 'ambient_life_scenes_people';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const c = new THREE.Color();
  people.forEach((p, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0));
    mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(p.x, (PEOPLE_HEIGHT * p.sy) / 2, p.z), q, new THREE.Vector3(p.sx, p.sy, p.sx)));
    mesh.setColorAt(i, c.setHex(p.tint));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(root);
  scene.add(mesh); // top-level name starts 'ambient_life' so the auto-collider pass skips the placeholder people (src/solidRules.js SKIP_TOP)
  return { root, people: mesh };
}
