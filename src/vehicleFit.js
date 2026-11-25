/**
 * ONE table for vehicle size and facing (26 Nov, her order: right proportions, front = direction of travel).
 * len = real-world length in metres along the long axis. front = which model axis is the nose (from tools/vehicle-measure.mjs, src/vehicleSpec.json).
 * frontFix(file) = rotation about Y that turns the model's nose to +Z, which is heading yaw 0 (heading = (sin yaw, cos yaw)).
 * Parked list (villageVehicles.js) and roaming traffic (roamingTraffic.js) both use it, so they cannot disagree.
 */
export const VEHICLE_FIT = {
  bicycle: { len: 1.75, front: '+x' }, motorbike: { len: 2.1, front: '+x' }, moped: { len: 1.8, front: '-z' },
  auto_rickshaw: { len: 2.6, front: '-z' }, tuk_tuk: { len: 2.7, front: '+z' },
  willys_jeep: { len: 3.4, front: '-z' }, old_tractor: { len: 3.5, front: '+z' }, trailer_pack: { len: 3.4, front: '+z' },
  mini_truck: { len: 4.2, front: '+z' }, thela_gadi: { len: 2.4, front: '+x' }, thela_b: { len: 2.2, front: '+z' }, water_tanker: { len: 5, front: '+z' },
};
const ROT = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 };
export const frontFix = (file) => ROT[(VEHICLE_FIT[file] || { front: '+z' }).front];
export const fitLen = (file, fallback) => (VEHICLE_FIT[file] ? VEHICLE_FIT[file].len : fallback);
