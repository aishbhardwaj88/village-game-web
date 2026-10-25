import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { placeBoardsMesh } from './placeBoards.js';
import { ANCHORS, pt } from './anchors.js';
import { STAGED_PLACES, stagingPos } from './stagedPlaces.js';
import { loadKitModels, placeKitHouses, KIT_TYPES } from './houseKit.js';

/**
 * The STAGING YARD (art director, 25 Oct 2026): she is going to rearrange the map herself, so every newly built place
 * from `Places V1/` stands on its own pad in empty ground east of the mandi. Grid origin (320, -160), 80 m spacing,
 * 6 columns per row: place n is at x = 320 + 80 * (n % 6), z = -160 + 80 * floor(n / 6). The old in-game version of a
 * replaced place stays where it was; nothing here overlaps anything. The table of places is src/stagedPlaces.js.
 *
 * Each place is ONE Blender model (tools/blender/build_<place>.py -> public/assets/models/<model>.glb) in site-local
 * metres with the front toward +z. Collision is derived from the visible model (src/autoColliders.js), nothing is
 * hand-boxed, so doors, windows and gaps are exactly what you see.
 */
const texLoader = new THREE.TextureLoader();
const rawTex = new Map();
const sharedMats = new Map();
function setTexture(set, kind) {
  const url = `assets/textures/${set}/${set}_${kind}.webp`;
  let t = rawTex.get(url);
  if (!t) { t = texLoader.load(url); if (kind === 'color') t.colorSpace = THREE.SRGBColorSpace; rawTex.set(url, t); }
  return t;
}
/**
 * Staged models ship WITHOUT texture copies (tools/strip-textures.mjs): each material's extras name its CC0 set and repeat, and the
 * shared maps from public/assets/textures/<set>/ are applied here. One material per (set, repeat) for the whole yard; vertex colours carry
 * the tint + baked AO exactly as in the Blender export.
 */
function sharedSetMaterial(set, repeat, src) {
  const key = set + '|' + repeat;
  let m = sharedMats.get(key);
  if (m) return m;
  const mk = (kind) => { const t = setTexture(set, kind).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t; };
  m = new THREE.MeshStandardMaterial({ map: mk('color'), normalMap: mk('normal'), roughnessMap: mk('roughness'), roughness: 1, metalness: set === 'metal' ? 0.6 : 0, vertexColors: true });
  m.name = src.name;
  sharedMats.set(key, m);
  return m;
}

function swapShared(o) {
  const ud = o.material && o.material.userData;
  if (ud && ud.dopahar_set) {
    const keepName = o.material.name;
    o.material = sharedSetMaterial(ud.dopahar_set, ud.dopahar_repeat || 1, o.material);
    o.material.name = keepName;
  }
}

function createStagedPlace(def) {
  const a = ANCHORS[def.id];
  const group = new THREE.Group();
  group.name = def.zone;
  group.position.set(a.x, 0, a.z);
  if (def.boards.length) group.add(placeBoardsMesh(def.boards, def.zone + '_boards'));
  if (def.custom === 'houseKit') {
    // the 8 house types, instanced: row 1 = each type once (wall to wall), row 2 across a 12 m lane facing back with different widths + tints
    loadKitModels().then((models) => {
      for (const m of Object.values(models)) m.traverse((o) => { if (o.isMesh) swapShared(o); });
      const types = Object.keys(KIT_TYPES);
      const row = (z, ry, order, widths, tints) => {
        let total = 0;
        const items = order.map((t, i) => { const w = KIT_TYPES[t].hw * 2 * widths[i]; total += w + 0.5; return { t, w, i }; });
        let x = -total / 2;
        return items.map(({ t, w, i }) => { x += w / 2; const p = { type: t, x: ry ? -x : x, z, ry, sx: widths[i], tint: tints[i] }; x += w / 2 + 0.5; return p; });
      };
      const P = [0xf4c7c3, 0xf2c9a0, 0xc7e6d2, 0xf1e6b8, 0xf6e7a0, 0xc4d5ea, 0xf4c7c3, 0xf2c9a0];
      const placements = [
        ...row(-12, 0, types, [1, 1, 1, 1, 1, 1, 1, 1], P),
        ...row(12, Math.PI, ['c', 'd', 'b', 'e', 'a', 'f', 'd'], [1.1, 0.92, 1.12, 0.9, 1.15, 0.95, 1.05], [P[3], P[2], P[0], P[5], P[1], P[4], P[6]]),
      ];
      placeKitHouses(group, models, placements);
    }).catch((err) => console.warn('house kit did not load', err));
    return group;
  }
  getGLTFLoader().loadAsync(`assets/models/${def.model}.glb`).then((gltf) => {
    const m = gltf.scene;
    m.name = def.zone + '_model';
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; swapShared(o); } });
    group.add(m);
  }).catch((err) => console.warn(`${def.model}.glb did not load`, err));
  return group;
}

/** The dirt track linking the staged places' gates: a strip along the front of each row plus a short spur to each gate. */
function createStagingTrack() {
  const geos = [];
  const strip = (cx, cz, w, d) => geos.push(new THREE.BoxGeometry(w, 0.06, d).translate(cx, 0.03, cz).toNonIndexed());
  const rows = new Map();
  STAGED_PLACES.forEach((p, n) => { const q = stagingPos(n); const r = rows.get(q.z) || []; r.push([q.x, p.front ?? 25]); rows.set(q.z, r); });
  for (const [z, xs] of rows) {
    const x0 = Math.min(...xs.map((v) => v[0])) - 30, x1 = Math.max(...xs.map((v) => v[0])) + 30;
    strip((x0 + x1) / 2, z + 31, x1 - x0, 4);
    for (const [x, f] of xs) strip(x, z + (f + 31) / 2, 4, 31 - f);
  }
  for (const g of geos) g.deleteAttribute('uv');
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color: 0x9a7e58, roughness: 1 }));
  mesh.name = 'staging_track/dirt';
  mesh.receiveShadow = true;
  return mesh;
}

/** Registers the track and every staged place with the zone manager. */
export function registerStagingYard(zoneManager, visibleRadius) {
  const first = pt(STAGED_PLACES[0].id);
  zoneManager.register('staging_track', { x: first.x + 200, z: first.z + 30, buildRadius: 260, teardownRadius: 300, build: () => { const g = new THREE.Group(); g.name = 'staging_track'; g.add(createStagingTrack()); return g; } });
  for (const def of STAGED_PLACES) {
    zoneManager.register(def.zone, { visibleRadius, ...pt(def.id), buildRadius: def.build, teardownRadius: def.build * 1.25, build: () => createStagedPlace(def) });
  }
}
