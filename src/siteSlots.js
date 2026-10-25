import * as THREE from 'three';
import { ANCHORS } from './anchors.js';

/**
 * Drop-in model slots for every zone-streamed place (gurukul, masjid, health centre, mandi, ...).
 *
 * The placeholder a zone builds (src/farmSites.js, merged code-built geometry) is the fallback. Drop
 * `public/assets/models/<zone name>.glb` in and the next time that zone streams in, the model replaces the
 * placeholder: uniformly scaled to fit the placeholder's own width x height x depth, grounded, centred on the
 * placeholder's footprint, and turned so the model's FRONT lands on the site's real front. No other edit.
 * The placeholder is only hidden, never removed: its collider boxes keep working, the bilingual signboard stays,
 * and if the file is missing or broken the placeholder simply stays.
 *
 * Model convention (same as every slot in docs/asset-slots.md): the front of the building faces -Z in the file.
 * `slotInfo(group)` is also what tools/site-slots-doc.mjs prints into docs/asset-slots.md, so the published
 * dimensions are always the real ones.
 */

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

/** True for a zone that stands at a registered place (src/anchors.js). Lane props, walls, banks and the highway strip are not drop-in buildings. */
export function isPlaceSite(zoneName, x, z) {
  if (zoneName === 'highway') return false; // a 250 m road strip, not a building
  return Object.values(ANCHORS).some((a) => Math.abs(a.x - x) < 0.01 && Math.abs(a.z - z) < 0.01);
}

/** Everything that is placeholder building (not the signboard overlay, not an already-loaded model). */
function placeholderMeshes(group) {
  const out = [];
  group.traverse((o) => {
    if (!o.isMesh || /_boards$/.test(o.name) || o.userData.siteSlotModel) return;
    let a = o;
    while (a) { if (a.userData && a.userData.siteSlotModel) return; a = a.parent; }
    out.push(o);
  });
  return out;
}

/** Front normal (x, z) of a site: its first door, else its first signboard, else +Z. */
function frontNormal(group) {
  const meta = group.userData.slotMeta || {};
  if (meta.front) return meta.front; // a site that is not built by finishSite() states its front itself
  const snap = (nx, nz) => (Math.abs(nx) > Math.abs(nz) ? [Math.sign(nx), 0] : [0, Math.sign(nz) || 1]);
  if (meta.doors && meta.doors.length) return snap(meta.doors[0].nx, meta.doors[0].nz);
  if (meta.boards && meta.boards.length) {
    const b = meta.boards[0];
    return snap(Math.sin(b.ry), Math.cos(b.ry));
  }
  return [0, 1];
}

/** { w, h, d, cx, cz, front: [nx, nz], doors } of a built site group, in metres, relative to the group's own origin. */
export function slotInfo(group) {
  const meshes = placeholderMeshes(group);
  _box.makeEmpty();
  group.updateWorldMatrix(true, true);
  for (const m of meshes) _box.expandByObject(m);
  if (_box.isEmpty()) return null;
  _box.getSize(_size);
  const gx = group.position.x, gz = group.position.z;
  const front = frontNormal(group);
  const meta = group.userData.slotMeta || {};
  // door offset along the front wall, + = to the right of someone standing outside facing the building
  const rx = front[1], rz = -front[0]; // right-hand direction of someone outside, looking against the front normal
  const cx = (_box.min.x + _box.max.x) / 2 - gx, cz = (_box.min.z + _box.max.z) / 2 - gz;
  const doors = (meta.doors || [])
    .filter((d) => Math.abs(d.nx * front[0] + d.nz * front[1]) > 0.7) // doors on the front wall only
    .map((d) => ({ offset: (d.x - cx) * rx + (d.z - cz) * rz, w: d.w, h: d.h }));
  return { w: _size.x, h: _size.y, d: _size.z, cx, cz, front, doors };
}

/**
 * Registers and resolves the slot for one freshly built zone group. `assetSlots` is the registry from
 * src/assetSlots.js. Fire-and-forget (never blocks the zone build).
 */
export function wireSiteSlot(assetSlots, zoneName, group) {
  if (!group || group.userData.ownSlot || !group.userData.slotMeta) return;
  if (!isPlaceSite(zoneName, group.position.x, group.position.z)) return; // only places, not lamps, lane props, walls or animals
  const info = slotInfo(group);
  if (!info || !(info.w > 0.5 && info.d > 0.5)) return;
  const hide = placeholderMeshes(group);
  const rotationY = Math.atan2(-info.front[0], -info.front[1]); // maps the model's -Z front onto the site's front normal
  assetSlots.register(zoneName, {
    dimensions: { w: info.w, h: info.h, d: info.d },
    placements: [{ container: group, position: new THREE.Vector3(info.cx, 0, info.cz), rotationY }],
    hide,
  });
  assetSlots.resolveOne(zoneName).then((r) => {
    if (r && r.replaced) {
      group.traverse((o) => { if (o.name === `${zoneName}_slot`) o.userData.siteSlotModel = true; });
    }
  });
}
