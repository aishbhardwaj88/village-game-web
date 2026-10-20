import { initStaticColliders } from './collision.js';

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

  /**
   * `build()` returns a THREE.Group (or Object3D) to add to the scene — called at
   * most once per activation. `buildRadius` activates the zone; `teardownRadius`
   * (defaults to 1.5x buildRadius, a hysteresis gap so straddling the boundary
   * doesn't thrash build/dispose every frame) deactivates it again.
   */
  function register(name, { x, z, buildRadius, teardownRadius = buildRadius * 1.5, build }) {
    zones.set(name, { x, z, buildRadius, teardownRadius, build, group: null, active: false });
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

  /** Call once per frame (or every few frames — zone crossings are infrequent and
   * the distance check itself is trivial) with the player's current x/z. */
  function update(playerX, playerZ) {
    let changed = false;
    for (const zone of zones.values()) {
      const d = Math.hypot(playerX - zone.x, playerZ - zone.z);
      if (!zone.active && d <= zone.buildRadius) {
        zone.group = zone.build();
        scene.add(zone.group);
        zone.active = true;
        changed = true;
      } else if (zone.active && d > zone.teardownRadius) {
        scene.remove(zone.group);
        disposeObject(zone.group);
        zone.group = null;
        zone.active = false;
        changed = true;
      }
    }
    if (changed) initStaticColliders(scene); // cheap full-scene rebuild, see doc comment above
  }

  return { register, update, zones };
}
