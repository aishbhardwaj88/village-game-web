/**
 * ONE table for vehicle size and facing (26 Nov, her order: right proportions, front = direction of travel).
 * len = real-world length in metres along the long axis. front = which model axis is the nose (from tools/vehicle-measure.mjs, src/vehicleSpec.json).
 * frontFix(file) = rotation about Y that turns the model's nose to +Z, which is heading yaw 0 (heading = (sin yaw, cos yaw)).
 * foot (optional) = tyre-contact height above the model's Box3.min.y as a fraction of its height (stray bits under the wheels: tanker 2%, motorbike 2.8%, moped 0.4%); see footOffsetY, tools/vehicle-ground-check.mjs.
 * Parked list (villageVehicles.js) and roaming traffic (roamingTraffic.js) both use it, so they cannot disagree.
 */
export const VEHICLE_FIT = {
  bicycle: { len: 1.7, front: '+x' }, motorbike: { len: 2.1, front: '+x', foot: 0.028 }, moped: { len: 2.0, front: '-z', foot: 0.004 },
  auto_rickshaw: { len: 2.6, front: '-z' }, tuk_tuk: { len: 2.7, front: '+z' },
  willys_jeep: { len: 3.4, front: '-z' }, old_tractor: { len: 3.5, front: '+z' }, trailer_pack: { len: 3.4, front: '+z' },
  mini_truck: { len: 4.2, front: '+z' }, thela_gadi: { len: 2.4, front: '+x' }, thela_b: { len: 2.2, front: '+z' }, water_tanker: { len: 5, front: '+z', foot: 0.02 },
};
const ROT = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 };
export const frontFix = (file) => ROT[(VEHICLE_FIT[file] || { front: '+z' }).front];
export const fitLen = (file, fallback) => (VEHICLE_FIT[file] ? VEHICLE_FIT[file].len : fallback);

/**
 * Model y offset so the TYRE CONTACT (not Box3.min.y, which includes kickstands, shadow planes and thin stray bits) sits on y = 0 after scaling by k.
 * `boxMinY` / `boxH` are the model's own Box3 min y and height in model units; `foot` (VEHICLE_FIT) = contact height above boxMinY as a fraction of boxH,
 * measured by tools/vehicle-ground-check.mjs --print.
 */
export const footOffsetY = (file, boxMinY, boxH, k) => -(boxMinY + ((VEHICLE_FIT[file] || {}).foot || 0) * boxH) * k;
