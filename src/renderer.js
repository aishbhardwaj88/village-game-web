import * as THREE from 'three';
import { buildContactShadows } from './contactShadows.js';
import { currentLayout, worldBounds } from './zoneManager.js';
import { getQuality } from './edition.js'; // S7 (desktop): distances and caps come from the quality preset

const QUALITY = getQuality();

const MAX_PIXEL_RATIO = QUALITY.pixelRatioMax; // S7: 'full' 2, 'light' 1.5 (was a fixed 1.5)
// Phone perf pass (queue item 5): touch devices cap lower — 1.5x on a high-DPI phone
// GPU is a lot more pixels to shade than the same ratio on a desktop dGPU. Recorded
// alongside the other mobile settings in docs/look-standard.md.
const MAX_PIXEL_RATIO_TOUCH = 1.0;

function maxPixelRatioFor(isTouch) {
  return isTouch ? MAX_PIXEL_RATIO_TOUCH : MAX_PIXEL_RATIO;
}

export function createRenderer(canvas, isTouch = false) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatioFor(isTouch)));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // Colour: the difference between real and flat.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // 1.0 blew the horizon/sun-glow out to flat clipped white in review screenshots.
  // 0.8 keeps the sky holding its blue/amber gradient and the sun glow bright without
  // clipping. See docs/look-standard.md / docs/parked.md.
  renderer.toneMappingExposure = 0.55;

  renderer.shadowMap.enabled = true;
  // three.js r186 removed PCFSoftShadowMap (silently falls back to PCFShadowMap with a
  // console warning) — use PCFShadowMap directly. See docs/parked.md.
  renderer.shadowMap.type = THREE.PCFShadowMap;

  return renderer;
}

export function resizeRendererToDisplaySize(renderer, camera, isTouch = false) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatioFor(isTouch)));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------------------------------------
// S7 perf (docs/s7/perf.md): distance shadows + the world growing east for ?layout=new.
// One init call from main.js (the `// S7 WIRING (perf)` block): initPerfS7({ scene, sun, player }).
// ---------------------------------------------------------------------------------------------

const SHADOW_RADIUS = QUALITY.shadowRadius; // S7: 'full' 120, 'light' 60. Metres: things further than this from the player stop casting real sun shadows
const CHAR_SHADOW_RADIUS = QUALITY.charShadowRadius; // S7: 'full' 30, 'light' 15. Characters further than this get a soft blob under the feet instead
const BLOB_MAX_DISTANCE = QUALITY.blobMaxDistance; // S7: 'full' 80, 'light' 50. Characters beyond this are hidden by the character tiers anyway
const BLOB_SLOTS = QUALITY.blobMaxDistance > 50 ? 64 : 40; // S7: more room for blobs when characters show further out
const RESCAN_MS = 2000; // full scene walk for new casters (zones stream in and out)
const TICK_MS = 250; // distance test on the cached list

const _v = new THREE.Vector3();
const _sph = new THREE.Sphere();

function shownInScene(o) {
  for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p.isScene) return true; }
  return false;
}

/**
 * Turns real sun shadows off for everything further than SHADOW_RADIUS from the player (each mesh or
 * InstancedMesh chunk keeps its own wish in userData.wantsShadow, so it comes back when the player nears),
 * and gives characters beyond CHAR_SHADOW_RADIUS a soft contact blob instead of a real shadow.
 * Runs itself from a zero-draw-call sentinel during rendering; does nothing while the sun casts no shadow.
 * `?shadowdist=0` turns it off (for before/after measurements).
 */
export function createShadowDistanceManager({ scene, sun, player, radius = SHADOW_RADIUS, charRadius = CHAR_SHADOW_RADIUS }) {
  const casters = []; // { o, char }
  const known = new WeakSet();
  const chars = new Map(); // character root -> skinned meshes
  let lastScan = -Infinity, lastTick = -Infinity, wasOn = false;
  const blobs = buildContactShadows([], BLOB_SLOTS);
  blobs.mesh.name = 'perf_character_blobs';
  blobs.mesh.userData.noCollide = true;
  scene.add(blobs.mesh);
  const blobEntries = Array.from({ length: BLOB_SLOTS }, () => ({ x: 0, z: -9999, radiusX: 0, radiusZ: 0 }));
  const stats = { casters: 0, castingNow: 0, characters: 0, blobs: 0, lastTickMs: 0 };

  function scan() {
    scene.traverse((o) => {
      if (known.has(o)) return;
      if (o.isSkinnedMesh) {
        known.add(o);
        const root = o.parent || o;
        if (!chars.has(root)) chars.set(root, []);
        chars.get(root).push(o);
        if (o.userData.wantsShadow === undefined) o.userData.wantsShadow = o.castShadow;
        casters.push({ o, char: true });
      } else if ((o.isMesh || o.isInstancedMesh) && (o.castShadow || o.userData.wantsShadow)) {
        known.add(o);
        if (o.userData.wantsShadow === undefined) o.userData.wantsShadow = o.castShadow;
        casters.push({ o, char: false });
      }
    });
  }

  function tick() {
    const t0 = performance.now();
    const px = player.position.x, pz = player.position.z;
    let casting = 0;
    for (let i = casters.length - 1; i >= 0; i--) {
      const c = casters[i], o = c.o;
      if (!o.parent) { casters.splice(i, 1); known.delete(o); continue; } // torn down with its zone
      if (!o.userData.wantsShadow) { if (o.castShadow) o.castShadow = false; continue; }
      let near;
      if (c.char) {
        o.getWorldPosition(_v);
        near = Math.hypot(_v.x - px, _v.z - pz) <= charRadius;
      } else {
        const bs = o.isInstancedMesh ? (o.boundingSphere || (o.computeBoundingSphere(), o.boundingSphere)) : (o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere));
        _sph.copy(bs).applyMatrix4(o.matrixWorld);
        near = Math.hypot(_sph.center.x - px, _sph.center.z - pz) - _sph.radius <= radius;
      }
      if (o.castShadow !== near) o.castShadow = near;
      if (near) casting++;
    }
    // blobs for characters between charRadius and BLOB_MAX_DISTANCE that are actually shown
    let n = 0;
    for (const [root, meshes] of chars) {
      if (!meshes.some((m) => m.parent)) { chars.delete(root); continue; }
      if (n >= BLOB_SLOTS || !shownInScene(root)) continue;
      root.getWorldPosition(_v);
      const d = Math.hypot(_v.x - px, _v.z - pz);
      if (d <= charRadius || d > BLOB_MAX_DISTANCE) continue;
      const e = blobEntries[n++];
      e.x = _v.x; e.z = _v.z; e.radiusX = 0.42; e.radiusZ = 0.42;
    }
    for (let i = n; i < BLOB_SLOTS; i++) { const e = blobEntries[i]; e.x = 0; e.z = -9999; e.radiusX = 0; e.radiusZ = 0; }
    blobs.update(blobEntries);
    stats.casters = casters.length; stats.castingNow = casting; stats.characters = chars.size; stats.blobs = n;
    stats.lastTickMs = +(performance.now() - t0).toFixed(2);
  }

  function restoreAll() {
    for (const c of casters) if (c.o.userData.wantsShadow) c.o.castShadow = true;
    for (const e of blobEntries) { e.x = 0; e.z = -9999; e.radiusX = 0; e.radiusZ = 0; }
    blobs.update(blobEntries);
  }

  const enabled = typeof location === 'undefined' || new URLSearchParams(location.search).get('shadowdist') !== '0';
  function update(force = false) {
    if (!enabled) return;
    const on = !!(sun && sun.castShadow);
    if (!on) { if (wasOn) { restoreAll(); wasOn = false; } return; }
    wasOn = true;
    const now = performance.now();
    if (force || now - lastScan > RESCAN_MS) { lastScan = now; scan(); }
    if (force || now - lastTick > TICK_MS) { lastTick = now; tick(); }
  }

  const sentinel = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0, colorWrite: false, depthWrite: false, depthTest: false }));
  sentinel.name = 'perf_shadow_distance_sentinel';
  sentinel.frustumCulled = false;
  sentinel.raycast = () => {};
  sentinel.userData.noCollide = true;
  sentinel.onBeforeRender = () => update();
  scene.add(sentinel);

  return { update, stats, enabled };
}

/**
 * ?layout=new grows the world east (canal at x ~824, fields to x ~1090, field band z -345..350): the one
 * ground plane is re-cut to cover worldBounds().ground with the same texture scale and the same texture
 * position as today, so the village ground looks identical and nothing at the east edge shows the world's end.
 * ?layout=old: untouched.
 */
export function extendGroundForLayout(scene, layout = currentLayout()) {
  if (layout !== 'new') return null;
  const ground = scene.getObjectByName('ground');
  if (!ground || !ground.geometry || !ground.geometry.parameters) return null;
  const old = ground.geometry.parameters; // PlaneGeometry(drawn, drawn)
  const W0 = old.width, H0 = old.height;
  const g = worldBounds('new').ground;
  // Plane local x = world x, local y = -world z (the plane is turned -90 deg about x).
  const w = g.maxX - g.minX, h = g.maxZ - g.minZ;
  const geo = new THREE.PlaneGeometry(w, h, 1, 1);
  geo.translate((g.minX + g.maxX) / 2, -(g.minZ + g.maxZ) / 2, 0);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W0 / 2) / W0, (pos.getY(i) + H0 / 2) / H0); // the old plane's own uv formula, extended
  for (const name of Object.keys(ground.geometry.attributes)) {
    if (name.startsWith('uv') && name !== 'uv') geo.setAttribute(name, uv.clone());
  }
  geo.computeBoundingSphere();
  ground.geometry.dispose();
  ground.geometry = geo;
  ground.userData.layoutExtended = true;
  return ground;
}

/** The one call main.js makes (S7 WIRING (perf) block). Returns { shadows } for dev tools. */
export function initPerfS7({ scene, sun, player }) {
  extendGroundForLayout(scene);
  const shadows = createShadowDistanceManager({ scene, sun, player });
  if (typeof window !== 'undefined') window.__perfS7 = { shadows: shadows.stats, layout: currentLayout(), bounds: worldBounds() };
  return { shadows };
}
