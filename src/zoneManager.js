import * as THREE from 'three';
import { startStaticColliderRebuild, colliderRequests } from './collision.js';
import { modelLoads } from './loaders.js';
import { queueBusy, frameBudget } from './frameQueue.js';
import { placeBatchPending } from './placeBatch.js';
import { layoutMode } from './layout/layout.js';
import { getQuality } from './edition.js'; // S7 WIRING (desktop): zone distances from the quality preset

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
const _Q = getQuality() || {};
const ALWAYS_EXTRA = _Q.zoneAlwaysExtra ?? 70;
const SIGHT_EXTRA = _Q.zoneSightExtra ?? 230; // 170 -> 230 (9 Nov playtest S1): any zone ahead of the player is built at least 250 m out, 33 s ahead at the cycle's 7.5 m/s
const TEARDOWN_EXTRA = 200;
// Built early does not mean drawn early: a built zone is only DRAWN within buildRadius + VIS_EXTRA
// (draw-call ceiling 150); `detail` zones (doorstep props, rooftop clutter, lane vignettes, boundary
// walls, lamps: small things that are a few pixels at that range) keep their original radius. Built-but-hidden zones cost nothing per frame, so the reveal is a flip
// at fog distance, never a visible assembly or a frame hitch.
const VIS_EXTRA = _Q.zoneVisExtra ?? 80;
// 26 Nov: a `detail` zone used to be built at the very radius it was drawn from, so it assembled in front of the player. It is now
// built DETAIL_LEAD m before it is drawn (and torn down that much later); drawing keeps the radius the caller asked for.
const DETAIL_LEAD = 30;
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
// ---------------------------------------------------------------------------------------------
// S7 (perf): which layout is running, and how far the world reaches in it.
// ---------------------------------------------------------------------------------------------
/** 'new' or 'old': the one answer of the layout loader (src/layout/layout.js layoutMode: window.__dopaharLayout, else ?layout=,
 *  else its DEFAULT_LAYOUT), so flipping that one default flips the world bounds here too (S7 layout, 22 Nov). */
export function currentLayout() {
  return layoutMode();
}

/**
 * Where the player may go (minX..maxX, minZ..maxZ) and how far the drawn ground reaches (ground), in world metres
 * (x east, z south). old = today's numbers in src/main.js (GROUND_HALF_EXTENT 238, GROUND_HALF_X 880, GROUND_HALF_Z 280)
 * and src/scene.js (ground plane 1824 m square at the origin). new = the approved map (21 Nov): canal north-south at
 * x ~824, fields east of it to x ~1090, the field band z -345..350. The ground reaches past the furthest point the
 * player can stand by more than the camera's far plane (500 m), so the world's edge is never in view.
 */
export const WORLD_BOUNDS = {
  old: { minX: -238, maxX: 880, minZ: -280, maxZ: 280, ground: { minX: -912, maxX: 912, minZ: -912, maxZ: 912 } },
  new: { minX: -238, maxX: 1120, minZ: -380, maxZ: 380, canalX: 824, fieldsMaxX: 1090, fieldBandZ: [-345, 350], ground: { minX: -912, maxX: 1680, minZ: -912, maxZ: 912 } },
};
export function worldBounds(layout = currentLayout()) {
  return WORLD_BOUNDS[layout] || WORLD_BOUNDS.old;
}

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
    const wb = worldBounds();
    if (x < wb.ground.minX || x > wb.ground.maxX || z < wb.ground.minZ || z > wb.ground.maxZ) console.warn(`zoneManager: zone ${name} at (${Math.round(x)}, ${Math.round(z)}) is off the ground for layout=${currentLayout()}`);
    const lead = detail && visibleRadius == null ? DETAIL_LEAD : 0;
    zones.set(name, { name, detail, visibleRadius: visibleRadius ?? buildRadius + (detail ? 0 : VIS_EXTRA), x, z, buildRadius: buildRadius + lead, teardownRadius: teardownRadius + lead, ownRadius: buildRadius, build, group: null, active: false, onFrame: null, forceBuild: false });
  }

  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        // src/materials.js's getTiledMaterial() hands out the exact same cached Material object
        // (materialCache, keyed by name/repeat/tint) to every caller asking for that combo -
        // confirmed live across dozens of files (bazaar.js, shops.js, temple.js, props.js's
        // createStreetLamps/createWaterTankProp...) and, concretely, every lamp zone this module
        // itself registers (lamps_bazaar_*, lamps_temple_*, lamps_gali_*, lamps_<spur>) shares one
        // literal 'concrete' material and one literal lamp-tin material (props.js's module-level
        // `_lampTinMat` singleton) across the whole village. Disposing one zone's copy of a shared
        // material (dpTiledLibrary flag, set by getTiledMaterial) would silently break every OTHER
        // still-active or not-yet-built zone referencing that exact object: the renderer drops its
        // compiled GPU program for that material (WebGLRenderer's onMaterialDispose ->
        // deallocateMaterial) and has to recompile the shader the next time ANY of those other
        // meshes draws - a stutter on a random later frame, not at this teardown, so it would never
        // show up in a one-frame screenshot check. Geometry is never cached/shared this way (no
        // scene-wide geometry cache exists in src/), so it is always safe to dispose here.
        for (const m of mats) if (!m.userData?.dpTiledLibrary) m.dispose();
      }
    });
  }

  const frustum = new THREE.Frustum();
  const projView = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
  let lastX = null, lastZ = null, travelX = 0, travelZ = 0, age = 0;
  let colPending = false, colNextAt = 0, colStep = null;
  let unbuilt = 0; // wanted zones left for later frames by the build budget
  // 26 Nov: start-area gate (setGate), speed-based lead, holes (a zone inside its own radius that is not built yet) and the late pop-in counter.
  let gate = null, spd = 0, avgBuildMs = 10, playing = false;
  const pop = { latePop: 0, lastName: '' };
  if (typeof window !== 'undefined') window.__zonePop = pop;
  /** Every zone within `radius` of any of the points is built before the Play button unlocks (boosted budget until clearGate). */
  function setGate(pts, radius) {
    gate = { pts, radius };
    for (const z of zones.values()) if (!z.active && pts.some((p) => Math.hypot(z.x - p.x, z.z - p.z) <= radius)) z.forceBuild = true;
  }
  function gateDone() { if (!gate) return true; for (const z of zones.values()) if (z.forceBuild && (!z.active || z.job)) return false; return !queueBusy() && !placeBatchPending() && !colPending && !colStep && rebuildAt < 0 && lateRebuildAt < 0; } // not settled(): that counts far downloads, which keep streaming after Play
  function gateStatus() { let left = 0, job = 0, first = ''; for (const z of zones.values()) if (z.forceBuild) { if (!z.active) { left++; if (!first) first = z.name; } if (z.job) job++; } return { left, job, first, queue: queueBusy(), batch: placeBatchPending(), colPending, colStep: !!colStep, rebuildAt, lateRebuildAt }; }
  if (typeof window !== 'undefined') window.__gateStatus = gateStatus;
  function clearGate() { gate = null; playing = true; for (const z of zones.values()) z.forceBuild = false; }
  /** Zones that should already exist (inside their own build radius) and do not: the player outran the stream. */
  function holes(px, pz) { let n = 0; for (const z of zones.values()) if (!z.active && !z.detail && Math.hypot(z.x - px, z.z - pz) <= (z.ownRadius ?? z.buildRadius)) n++; return n; }
  let seenLoads = 0, rebuildAt = -1, lateRebuildAt = -1; // a .glb finished loading: rebuild colliders once its callback has put it in the scene

  /** Call once per frame with the player's x/z and (optionally) the camera. */
  const buildStats = { worstMs: 0, worstName: '', over16: [], count: 0 };
  if (typeof window !== 'undefined') window.__zoneBuildStats = buildStats;
  function finishBuild(zone, built, playerX, playerZ, ms) {
    buildStats.count++; avgBuildMs = avgBuildMs * 0.8 + Math.min(200, ms) * 0.2;
    if (playing && Math.hypot(zone.x - playerX, zone.z - playerZ) <= zone.visibleRadius && frustum.intersectsSphere(sphere.set(new THREE.Vector3(zone.x, 2, zone.z), Math.max(zone.buildRadius * 0.3, 8)))) { pop.latePop++; pop.lastName = zone.name; }
    if (ms > buildStats.worstMs) { buildStats.worstMs = ms; buildStats.worstName = zone.name; }
    if (ms > 16) buildStats.over16.push([zone.name, Math.round(ms)]);
    const isPlain = built.isObject3D;
    zone.group = isPlain ? built : built.group;
    zone.onFrame = isPlain ? null : built.onFrame || null;
    scene.add(zone.group);
    zone.group.visible = Math.hypot(zone.x - playerX, zone.z - playerZ) <= zone.visibleRadius;
    zone.group.userData.zoneHidden = !zone.group.visible;
    zone.active = true;
    if (hooks.onBuild) hooks.onBuild(zone.name, zone.group, playerX, playerZ);
  }

  function update(playerX, playerZ, dt = 0, camera = null) {
    age += dt;
    if (lastX !== null && dt > 0) {
      const vx = (playerX - lastX) / dt, vz = (playerZ - lastZ) / dt;
      const sp = Math.hypot(vx, vz);
      spd = spd * 0.9 + Math.min(sp, 20) * 0.1;
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
    // request distance = appear distance + speed x (time to build the queue): the faster the player and the longer the queue, the earlier
    const leadM = Math.min(220, spd * (4 + unbuilt * avgBuildMs / 1000));

    const wanted = [];
    let changed = false;
    for (const zone of zones.values()) {
      const dx = zone.x - playerX, dz = zone.z - playerZ;
      const d = Math.hypot(dx, dz);
      if (!zone.active) {
        if (gate && !zone.forceBuild) continue; // 26 Nov: behind the title only the start area builds (and downloads its models); the rest streams after Play
        let want = zone.forceBuild || d <= zone.buildRadius + leadM * 0.5 || d <= zone.buildRadius + ALWAYS_EXTRA;
        if (!want && d <= zone.buildRadius + SIGHT_EXTRA + leadM) {
          if (camera) {
            sphere.center.set(zone.x, 2, zone.z);
            sphere.radius = Math.max(zone.buildRadius * 0.6, 18) + 25; // margin: a turn of the head must not reveal an unbuilt zone
            want = frustum.intersectsSphere(sphere);
          }
          if (!want && heading > 0.3 && (dx * travelX + dz * travelZ) / (d || 1) > 0.35) want = true; // prefetch ahead
        }
        if (want) {
          // Build order: what the player is standing in or beside first, then whatever lies ahead of the heading, then the rest
          // (plain nearest-first built things behind the player before the road in front of the cycle).
          const ahead = heading > 0.3 ? (dx * travelX + dz * travelZ) / (d || 1) : 0;
          wanted.push([zone.forceBuild || d <= zone.buildRadius + 30 ? d - 1000 : d - 150 * Math.max(0, ahead), zone]);
        }
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
      const budget = gate ? 20 : frameBudget(); // behind the title the whole frame is ours
      const t0 = performance.now();
      for (const [, zone] of wanted) {
        unbuilt--;
        // A build may be a generator function's iterator (each `yield` a point where it can pause): it is stepped inside the frame
        // budget and finishes on later frames, so one big zone no longer lands as one long task (9 Nov playtest S1).
        if (!zone.job) {
          const b0 = performance.now();
          const r = zone.build();
          if (r && typeof r.next === 'function' && typeof r[Symbol.iterator] === 'function' && !r.isObject3D) zone.job = r;
          else { finishBuild(zone, r, playerX, playerZ, performance.now() - b0); changed = true; if (performance.now() - t0 > budget) break; continue; }
        }
        for (;;) {
          const s0 = performance.now();
          const step = zone.job.next();
          zone.jobMs = (zone.jobMs || 0) + (performance.now() - s0);
          if (step.done) { const job = zone.job; zone.job = null; finishBuild(zone, step.value, playerX, playerZ, zone.jobMs); zone.jobMs = 0; changed = true; break; }
          if (performance.now() - t0 > budget) break;
        }
        if (performance.now() - t0 > budget) break; // the rest build on the next frames, best first
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
    // Sliced (about 4 ms a frame) so a ride never takes the whole rebuild in one frame; a request that lands mid-run restarts it after.
    if (colStep) {
      if (colStep()) { colStep = null; colNextAt = performance.now() + 250; }
    } else if (colPending && performance.now() >= colNextAt) {
      colPending = false;
      colStep = startStaticColliderRebuild(scene, 4);
      if (colStep()) { colStep = null; colNextAt = performance.now() + 250; }
    }
  }

  /** Dev/test: what is still assembling around the player. All zeros = every wanted zone is built, no load is in flight, no
   *  queued build job, no group waiting to be batched and no collider rebuild pending: the view is in its settled state. */
  function status() {
    return { unbuilt, loads: loadsInFlight.n, queue: queueBusy() ? 1 : 0, batch: placeBatchPending(), colliders: colPending || colStep || rebuildAt >= 0 || lateRebuildAt >= 0 ? 1 : 0, modelLoads: modelLoads.count };
  }
  function settled() { const s = status(); return !s.unbuilt && !s.loads && !s.queue && !s.batch && !s.colliders; }

  return { register, update, zones, hooks, status, settled, setGate, gateDone, clearGate, holes };
}
