import * as THREE from 'three';
import { initStaticColliders, colliderRequests } from './collision.js';
import { modelLoads } from './loaders.js';
import { queueBusy, frameBudget } from './frameQueue.js';
import { placeBatchPending } from './placeBatch.js';

// In-flight loads (glb, textures, files) through three's default manager. Its counters are private and ui.js owns its
// callbacks, so the item hooks are wrapped (counting only, behaviour unchanged).
const loadsInFlight = { n: 0 };
{
  const m = THREE.DefaultLoadingManager;
  const start = m.itemStart.bind(m), end = m.itemEnd.bind(m), err = m.itemError.bind(m);
  m.itemStart = (url) => { loadsInFlight.n++; start(url); };
  m.itemEnd = (url) => { loadsInFlight.n = Math.max(0, loadsInFlight.n - 1); end(url); };
  m.itemError = (url) => { err(url); }; // three calls itemEnd after itemError itself
}

// Anti-pop-in (FEEDBACK 24 Oct item 0b): a zone must exist BEFORE it enters the line of
// sight, not when the player is on top of it. Fog hides things beyond ~250 m, so:
//  - ALWAYS_EXTRA: every zone within buildRadius + this is built, whichever way the camera faces
//  - SIGHT_EXTRA: a zone within buildRadius + this is built when it is in (or just outside) the
//    camera frustum, or lies ahead of the direction of travel (prefetch)
// Builds are time-sliced so a crossing never freezes the frame; teardown only happens well
// beyond the sight radius. Frustum culling keeps draw calls to what is actually in view.
const ALWAYS_EXTRA = 70;
const SIGHT_EXTRA = 170;
const TEARDOWN_EXTRA = 200;
// Built early does not mean drawn early: a built zone is only DRAWN within buildRadius + VIS_EXTRA
// (draw-call ceiling 150); `detail` zones (doorstep props, rooftop clutter, lane vignettes, boundary
// walls, lamps: small things that are a few pixels at that range) keep their original radius. Built-but-hidden zones cost nothing per frame, so the reveal is a flip
// at fog distance, never a visible assembly or a frame hitch.
const VIS_EXTRA = 80;
// Build budget per frame: frameBudget() (src/frameQueue.js, ~4 ms, up to 8 ms on a slow frame), nearest zone first, always at
// least one zone a frame. The old 45 ms warm-up budget chained several 40-190 ms builds into one frame right after Play
// (load-play, 9 Nov: 0.5-1.8 s tasks); the surroundings now assemble one zone a frame, which is still well ahead of sight.

/**
 * Zone streaming (CLAUDE.md: "zone streaming plus distance and frustum culling...
 * instance every repeated thing... merge static geometry per zone" — the art
 * director's answer to the draw-call ceiling, 2026-10-20). The existing hero zone/
 * bazaar/field are built eagerly at startup and stay eagerly built — they're small,
 * already tested, and migrating already-working geometry carries real regression
 * risk for no real benefit (their combined cost already fits the budget). This is
 * for NEW content going forward: register a zone once, and its `build()` only runs
 * the first time the player comes within `buildRadius` of it; it's torn down again
 * (geometry disposed, removed from the scene) once the player goes `teardownRadius`
 * away, so a world with many zones never has more than a few loaded at once
 * regardless of total size.
 *
 * Frustum culling needs no extra code here — every THREE.Object3D defaults to
 * `frustumCulled = true` already, so content outside the camera's own view is
 * skipped by the renderer automatically once it exists in the scene; this module's
 * job is purely distance-based existence (built at all, or not).
 *
 * STATIC_COLLIDERS (src/collision.js) is rebuilt by a full scene walk, not
 * incrementally, so re-running initStaticColliders(scene) after any zone change is
 * always correct and cheap enough to do on every (infrequent) activate/deactivate —
 * no separate collider bookkeeping needed per zone.
 */
export function createZoneManager(scene) {
  const zones = new Map();
  const hooks = { onBuild: null, onShow: null }; // dev/test: onBuild(name, group, playerX, playerZ) after each zone is added

  /**
   * `build()` returns a THREE.Group (or Object3D) to add to the scene, OR
   * `{ group, onFrame(dt) }` when the zone's content needs a per-frame update
   * (e.g. a slow grazing/idle sway on an InstancedMesh herd) — called at most once
   * per activation. `buildRadius` activates the zone; `teardownRadius` (defaults to
   * 1.5x buildRadius, a hysteresis gap so straddling the boundary doesn't thrash
   * build/dispose every frame) deactivates it again.
   */
  function register(name, { x, z, buildRadius, teardownRadius = buildRadius * 1.5, build, detail = false, visibleRadius }) {
    zones.set(name, { name, detail, visibleRadius: visibleRadius ?? buildRadius + (detail ? 0 : VIS_EXTRA), x, z, buildRadius, teardownRadius, build, group: null, active: false, onFrame: null });
  }

  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
  }

  const frustum = new THREE.Frustum();
  const projView = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
  let lastX = null, lastZ = null, travelX = 0, travelZ = 0, age = 0;
  let colPending = false, colNextAt = 0;
  let unbuilt = 0; // wanted zones left for later frames by the build budget
  let seenLoads = 0, rebuildAt = -1, lateRebuildAt = -1; // a .glb finished loading: rebuild colliders once its callback has put it in the scene

  /** Call once per frame with the player's x/z and (optionally) the camera. */
  function update(playerX, playerZ, dt = 0, camera = null) {
    age += dt;
    if (lastX !== null && dt > 0) {
      const vx = (playerX - lastX) / dt, vz = (playerZ - lastZ) / dt;
      const sp = Math.hypot(vx, vz);
      if (sp > 0.3) { // smoothed heading, kept when standing still
        travelX = travelX * 0.9 + (vx / sp) * 0.1;
        travelZ = travelZ * 0.9 + (vz / sp) * 0.1;
      }
    }
    lastX = playerX; lastZ = playerZ;
    if (camera) {
      camera.updateMatrixWorld();
      projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projView);
    }
    const heading = Math.hypot(travelX, travelZ);

    const wanted = [];
    let changed = false;
    for (const zone of zones.values()) {
      const dx = zone.x - playerX, dz = zone.z - playerZ;
      const d = Math.hypot(dx, dz);
      if (!zone.active) {
        let want = d <= zone.buildRadius || d <= zone.buildRadius + ALWAYS_EXTRA;
        if (!want && d <= zone.buildRadius + SIGHT_EXTRA) {
          if (camera) {
            sphere.center.set(zone.x, 2, zone.z);
            sphere.radius = Math.max(zone.buildRadius * 0.6, 18) + 25; // margin: a turn of the head must not reveal an unbuilt zone
            want = frustum.intersectsSphere(sphere);
          }
          if (!want && heading > 0.3 && (dx * travelX + dz * travelZ) / (d || 1) > 0.35) want = true; // prefetch ahead
        }
        if (want) wanted.push([d, zone]);
      } else if (d > Math.max(zone.teardownRadius, zone.buildRadius + SIGHT_EXTRA + 30, TEARDOWN_EXTRA)) {
        scene.remove(zone.group);
        disposeObject(zone.group);
        zone.group = null;
        zone.onFrame = null;
        zone.active = false;
        changed = true;
      } else {
        const showAt = zone.visibleRadius;
        const shown = zone.group.visible;
        if (shown && d > showAt + 1.5) { zone.group.visible = false; zone.group.userData.zoneHidden = true; changed = true; if (hooks.onShow) hooks.onShow(zone.name, false, d, zone.group); }
        else if (!shown && d <= showAt) { zone.group.visible = true; zone.group.userData.zoneHidden = false; changed = true; if (hooks.onShow) hooks.onShow(zone.name, true, d, zone.group); }
        if (zone.onFrame && zone.group.visible) zone.onFrame(dt);
      }
    }
    unbuilt = wanted.length;
    if (wanted.length) {
      wanted.sort((a, b) => a[0] - b[0]);
      const budget = frameBudget();
      const t0 = performance.now();
      for (const [, zone] of wanted) {
        unbuilt--;
        const built = zone.build();
        const isPlain = built.isObject3D;
        zone.group = isPlain ? built : built.group;
        zone.onFrame = isPlain ? null : built.onFrame || null;
        scene.add(zone.group);
        zone.group.visible = Math.hypot(zone.x - playerX, zone.z - playerZ) <= zone.visibleRadius;
        zone.group.userData.zoneHidden = !zone.group.visible;
        zone.active = true;
        changed = true;
        if (hooks.onBuild) hooks.onBuild(zone.name, zone.group, playerX, playerZ);
        if (performance.now() - t0 > budget) break; // the rest build on the next frames, nearest first
      }
    }
    const loadSig = modelLoads.count + colliderRequests.n;
    if (loadSig !== seenLoads) { seenLoads = loadSig; rebuildAt = performance.now() + 250; lateRebuildAt = performance.now() + 1500; } // wall clock: dt is clamped on slow frames, so age runs slow
    if (rebuildAt >= 0 && performance.now() >= rebuildAt) { rebuildAt = -1; changed = true; }
    // second pass for a slow swap-in (texture decode, chained loads) that lands after the 250 ms one
    if (lateRebuildAt >= 0 && performance.now() >= lateRebuildAt) { lateRebuildAt = -1; changed = true; }
    // Full-scene rebuild (1.3 s+ on a slow phone, and it ran every frame of the warm-up while zones assembled). Coalesced:
    // never more often than ~5x its own last cost, so builds + render keep getting frames; a pending request always lands.
    if (changed) colPending = true;
    if (colPending) {
      const nowMs = performance.now();
      if (nowMs >= colNextAt) {
        colPending = false;
        initStaticColliders(scene);
        const end = performance.now();
        colNextAt = end + Math.min(2500, (end - nowMs) * 4);
      }
    }
  }

  /** Dev/test: what is still assembling around the player. All zeros = every wanted zone is built, no load is in flight, no
   *  queued build job, no group waiting to be batched and no collider rebuild pending: the view is in its settled state. */
  function status() {
    return { unbuilt, loads: loadsInFlight.n, queue: queueBusy() ? 1 : 0, batch: placeBatchPending(), colliders: colPending || rebuildAt >= 0 || lateRebuildAt >= 0 ? 1 : 0, modelLoads: modelLoads.count };
  }
  function settled() { const s = status(); return !s.unbuilt && !s.loads && !s.queue && !s.batch && !s.colliders; }

  return { register, update, zones, hooks, status, settled };
}
