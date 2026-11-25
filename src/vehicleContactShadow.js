/**
 * Soft blob contact shadow under every vehicle (27 Nov, art director: vehicles read as floating).
 * Cause: the sun's real shadow is OFF unless ?shadows=follow / a quality tier turns it on (src/main.js FOLLOW_SUN_SHADOWS), and the only
 * contact shadows (src/contactShadows.js) cover just the 4 player vehicles, axis-aligned, at y 0.012 (below the 3 to 7 cm road surface).
 * So parked and roaming vehicles had NO grounding cue at all. This module gives each vehicle a dark soft ellipse under its footprint:
 * ONE shared texture, geometry and material; ONE InstancedMesh per set (1 draw call per set, depthWrite false, 1.5 cm above the surface).
 *   const set = createVehicleShadowSet(capacity);   // add set.mesh to the scene / a cluster group
 *   set.place(i, x, y, z, yaw, len, wid);            // yaw = heading (long axis along (sin yaw, cos yaw)); y = the SURFACE height under the vehicle
 *   set.hide(i);
 */
import * as THREE from 'three';

export const SHADOW_LIFT = 0.015; // m above the surface the vehicle stands on
let TEX = null, GEO = null, MAT = null;

function texture() {
  if (TEX) return TEX;
  const size = 128, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.5, 'rgba(0,0,0,0.42)'); g.addColorStop(0.8, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  TEX = new THREE.CanvasTexture(canvas); TEX.colorSpace = THREE.SRGBColorSpace;
  return TEX;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

/** capacity instances; all start hidden. `set.mesh` is the one InstancedMesh. */
export function createVehicleShadowSet(capacity, name = 'vehicle_contact_shadows') {
  if (!GEO) { GEO = new THREE.PlaneGeometry(1, 1); GEO.rotateX(-Math.PI / 2); }
  if (!MAT) MAT = new THREE.MeshBasicMaterial({ map: texture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false });
  const mesh = new THREE.InstancedMesh(GEO, MAT, Math.max(1, capacity));
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 1;
  for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, _zero);
  mesh.instanceMatrix.needsUpdate = true;
  return {
    mesh,
    place(i, x, y, z, yaw, len, wid) {
      _p.set(x, y + SHADOW_LIFT, z); _q.setFromAxisAngle(_up, yaw); _s.set(wid * 1.25, 1, len * 1.12); // plane x = width, plane z = length (heading axis)
      mesh.setMatrixAt(i, _m.compose(_p, _q, _s)); mesh.instanceMatrix.needsUpdate = true;
    },
    hide(i) { mesh.setMatrixAt(i, _zero); mesh.instanceMatrix.needsUpdate = true; },
  };
}

/**
 * Height of the surface a vehicle's tyres stand on at (x, z): the terrain height from `groundAt`, or the drawn road surface when higher.
 * The road mesh lies 2 to 7 cm above the terrain (src/roadNetwork.js out.y), and groundAt knows nothing about it, so vehicles on a road sank into it.
 */
export function vehicleSurfaceY(groundAt, x, z) {
  const g = groundAt ? groundAt(x, z) : 0;
  if (!ROAD && typeof window !== 'undefined' && !ROAD_LOADING) { // lazy: keeps this module free of the map JSON imports so node checks can load it
    ROAD_LOADING = true;
    Promise.all([import('./mapRoads.js'), import('./roadNetwork.js')]).then(([m, r]) => { ROAD = { net: m.mapRoadNetwork, sample: r.sampleSurface }; }).catch(() => {});
  }
  if (ROAD) { try { const s = ROAD.sample(ROAD.net(), x, z); if (s && s.a > 0.3 && s.y > g) return s.y; } catch (e) { /* terrain height */ } }
  return g;
}
let ROAD = null, ROAD_LOADING = false;
