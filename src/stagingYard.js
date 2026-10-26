import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { requestColliderRebuild } from './collision.js';
import { placeBoardsMesh } from './placeBoards.js';
import { ANCHORS, pt } from './anchors.js';
import { STAGED_PLACES, stagingPos } from './stagedPlaces.js';
import { addPlaceGreenery } from './stagedGreenery.js';
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
  if (set === 'plaster' || set === 'brick' || set === 'wood' || set === 'thatch' || set === 'tin') addWeathering(m, set);
  sharedMats.set(key, m);
  return m;
}

/**
 * Flat paint reads as CG: break it up in WORLD space (so every wall of every place differs from its neighbour, no extra textures,
 * no extra draw calls). Low-frequency mottling (about +-14% value, a little hue drift), a damp/dust band over the bottom 0.7 m
 * and faint rain-streak columns under the eaves. Brick gets the mottling only so single bricks keep reading.
 */
function addWeathering(m, set) {
  const mottle = set === 'brick' ? 0.10 : set === 'thatch' ? 0.12 : 0.16;
  const grime = set === 'brick' ? 0.15 : 0.32;
  const streak = set === 'plaster' ? 0.10 : 0.0;
  const boost = set === 'plaster' ? 1.4 : set === 'brick' ? 1.3 : set === 'tin' ? 1.9 : set === 'wood' ? 2.6 : 1.0;   // the scan's albedo averages ~0.5 linear, so a 'white' tint rendered grey; this lets the tint BE the wall colour
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWxyz;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp_ = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp_ = instanceMatrix * wp_;
        #endif
        vWxyz = (modelMatrix * wp_).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWxyz;
        float wh_(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float wn_(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(wh_(i), wh_(i + vec3(1,0,0)), f.x), mix(wh_(i + vec3(0,1,0)), wh_(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(wh_(i + vec3(0,0,1)), wh_(i + vec3(1,0,1)), f.x), mix(wh_(i + vec3(0,1,1)), wh_(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          diffuseColor.rgb *= ${set === 'thatch' ? 'vec3(4.6, 3.5, 1.6)' : boost.toFixed(2)};   // thatch scan is a neutral dark grey: warm it to straw
          ${set === 'brick' ? 'diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 0.8);   // her brick is paler and patchier than the scan tint' : ''}
          ${set === 'brick' ? `
          {   // per-brick variation: the scan is one even red. 14 courses and ~4.8 bricks per course per tile; cells are only roughly brick-aligned (lengths vary), which reads as patchy fired clay
            vec2 bt_ = vMapUv * vec2(4.8, 14.0);
            float row_ = floor(bt_.y);
            vec2 cell_ = vec2(floor(bt_.x + wh_(vec3(row_, 3.0, 1.0)) * 4.8), row_);
            float r1_ = wh_(vec3(cell_, 7.0)), r2_ = wh_(vec3(cell_, 13.0));
            diffuseColor.rgb *= 0.80 + 0.36 * r1_;                                   // lighter / darker bricks
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.55, 0.52), step(0.93, r2_) * 0.8);   // the odd overburnt dark brick
            diffuseColor.rgb *= vec3(1.0 + (r2_ - 0.5) * 0.14, 1.0, 1.0 - (r2_ - 0.5) * 0.12);   // hue drift orange to brown
          }` : ''}
          float n1 = wn_(vWxyz * 0.55) * 0.6 + wn_(vWxyz * 2.1) * 0.4;
          diffuseColor.rgb *= 1.0 + (n1 - 0.5) * ${(mottle * 4).toFixed(3)};
          diffuseColor.r *= 1.0 + (wn_(vWxyz * 0.3 + 7.0) - 0.5) * 0.06;
          float low = 1.0 - smoothstep(0.0, 0.7, vWxyz.y);
          diffuseColor.rgb *= 1.0 - low * ${grime.toFixed(3)} * (0.5 + 0.5 * wn_(vWxyz * 1.7 + 3.0));
          {   // splashed-up dust: ragged top edge (0.25-1.1 m), brown-grey, desaturates and dulls fresh plinth paint
            float edge_ = 0.25 + 0.85 * wn_(vec3(vWxyz.x * 1.6 + vWxyz.z * 1.6, 0.0, 9.0));
            float dust_ = (1.0 - smoothstep(edge_ * 0.55, edge_, vWxyz.y)) * ${set === 'brick' ? '0.35' : '0.62'};
            vec3 dc_ = vec3(dot(diffuseColor.rgb, vec3(0.333))) * vec3(0.86, 0.72, 0.55);
            diffuseColor.rgb = mix(diffuseColor.rgb, dc_, dust_);
          }
          float col = wn_(vec3(vWxyz.x * 6.0 + vWxyz.z * 6.0, 0.0, 1.0)) * smoothstep(0.0, 2.5, vWxyz.y);
          diffuseColor.rgb *= 1.0 - ${streak.toFixed(3)} * col * col * wn_(vec3(vWxyz.x + vWxyz.z, vWxyz.y * 0.4, 5.0));
          ${set === 'plaster' ? `
          float st_ = smoothstep(0.58, 0.8, wn_(vWxyz * vec3(0.9, 0.5, 0.9) + 11.0));   // damp/soot stain patches
          diffuseColor.rgb *= 1.0 - 0.30 * st_;
          float pe_ = smoothstep(0.66, 0.85, wn_(vWxyz * vec3(2.4, 2.4, 2.4) + 23.0));  // paint worn through to a duller patch
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.9, 0.84, 0.74), 0.55 * pe_);
          float hi_ = smoothstep(2.2, 4.0, vWxyz.y);   // sun-bleached near the top
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.333))) * 1.08, 0.25 * hi_);` : ''}
          ${set === 'tin' ? `
          diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.333))), diffuseColor.rgb, 0.5);   // pale weathered whitish-grey
          float ru_ = smoothstep(0.6, 0.85, wn_(vWxyz * vec3(1.3, 1.3, 1.3) + 5.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.0, 0.8, 0.62), 0.5 * ru_);   // rust bleed` : ''}
        }`);
  };
  m.customProgramCacheKey = () => 'weather_' + set;
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
      requestColliderRebuild();
    }).catch((err) => console.warn('house kit did not load', err));
    return group;
  }
  addPlaceGreenery(group, def, STAGED_PLACES.indexOf(def) + 1);
  getGLTFLoader().loadAsync(`assets/models/${def.model}.glb`).then((gltf) => {
    const m = gltf.scene;
    m.name = def.zone + '_model';
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; swapShared(o); } });
    group.add(m);
    requestColliderRebuild(); // the model lands after its load was counted: have the zone manager rebuild colliders now, not at the next load
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
