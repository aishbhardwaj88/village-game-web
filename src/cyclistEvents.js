import * as THREE from 'three';
import { buildDogGeometry, createHideMaterial } from './animals.js';
import { getTiledMaterial } from './materials.js';
import { mapRoadLines } from './mapRoads.js';
import { batchLateGroup } from './placeBatch.js';
import { settlingReleased } from './standOn.js';

/**
 * More things that happen to the cyclist (docs/VILLAGE_VOCABULARY.md section 8):
 *   speed breakers - unmarked-ish raised concrete strips across the main road; riding over one gives the bicycle a small
 *                    jolt (the bike and rider hop and settle). On foot you step over them. Pure visual, no collider.
 *   dog            - a pariah dog loafing by the council lane. Ride past it twice (come within 6 m, go beyond 14 m, twice)
 *                    and it gets up and trots after you, keeping a few metres behind, until you leave it more than 70 m
 *                    behind or it has followed for 45 s, then it trots home and lies down again.
 *
 * Sites hang off the real road centrelines (src/mapRoads.js) by road name + segment + fraction, so a map change moves them.
 * Draw calls (2): one concrete strip merge (library 'concrete', vertex colour bands) + one dog InstancedMesh (shared
 * animals.js hide material). Driven from the scene's render callback, chained, so main.js needs only the one call.
 */

const BREAKERS = [
  { road: 'main_road', seg: 1, t: 0.4 },
  { road: 'main_road', seg: 5, t: 0.6 },
  { road: 'highway', seg: 2, t: 0.5 },
];
const DOG_HOME = { road: 'Council lane', seg: 0, t: 0.5, lat: 2.4 };

function roadFrame(name, seg, t) {
  const line = mapRoadLines().find((l) => l.id === name || l.id.endsWith(`_${name}`));
  if (!line) return null;
  const s = Math.min(seg, line.pts.length - 2);
  const [ax, az] = line.pts[s], [bx, bz] = line.pts[s + 1];
  const L = Math.hypot(bx - ax, bz - az) || 1;
  const dx = (bx - ax) / L, dz = (bz - az) / L;
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx, dz, nx: -dz, nz: dx, hw: line.w / 2 };
}

function paint(geo, color) {
  const col = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

/** a low rounded hump across the road: 0.45 m wide, 8 cm high, faded black and white bands along its length */
function breakerGeometry(site, hw, index) {
  const len = hw * 2 - 0.4, bands = Math.max(6, Math.round(len / 0.5));
  const parts = [];
  for (let i = 0; i < bands; i++) {
    const w = len / bands;
    const g = new THREE.CylinderGeometry(0.2, 0.26, 0.085, 8, 1, false, 0, Math.PI * 2).toNonIndexed();
    g.scale(1, 1, 1);
    // flatten the round cylinder into a hump 0.5 wide by band width: scale x/z, cylinder axis up
    g.scale(0.9, 1, w / 0.45);
    g.translate(0, 0.042, -len / 2 + w * (i + 0.5));
    const wear = 0.9 + 0.1 * Math.sin(index * 5.1 + i * 2.3);
    paint(g, new THREE.Color(i % 2 ? 0x8a8780 : 0x24231f).multiplyScalar(wear));
    parts.push(g);
  }
  let pos = 0;
  for (const g of parts) pos += g.attributes.position.count;
  const merged = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv', 'color']) {
    const arr = new Float32Array(pos * (k === 'uv' ? 2 : 3));
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    merged.setAttribute(k, new THREE.BufferAttribute(arr, k === 'uv' ? 2 : 3));
  }
  // rotate so the strip runs across the road: local z is the strip's length; the road normal is (nx, nz)
  merged.rotateY(Math.atan2(site.nx, site.nz));
  merged.translate(site.x, 0, site.z);
  return merged;
}

export function createCyclistEvents(scene, { getPlayer, isOnCycle }) {
  const group = new THREE.Group(); group.name = 'cyclist_events';
  scene.add(group);
  batchLateGroup(group, group.name); // code-built tiled meshes join the shared per-material batches (src/placeBatch.js)
  const info = { breakers: 0, jolts: 0, dogState: 'sleep', passes: 0 };
  if (typeof window !== 'undefined') window.__cyclistEvents = info;

  let built = false, frames = 0, last = 0, elapsed = 0;
  const sites = [];
  let dogMesh = null, holder = null;
  const dog = { x: 0, z: 0, hx: 0, hz: 0, yaw: 0, state: 'sleep', near: false, passes: 0, followT: 0 };
  let jolt = { t: 99, amp: 0 };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

  function build() {
    const geos = [];
    BREAKERS.forEach((b, i) => {
      const f = roadFrame(b.road, b.seg, b.t);
      if (!f) return;
      geos.push(breakerGeometry(f, f.hw, i));
      sites.push({ x: f.x, z: f.z, dx: f.dx, dz: f.dz, nx: f.nx, nz: f.nz, hw: f.hw, prev: null });
    });
    info.breakers = sites.length;
    if (geos.length) {
      let total = 0;
      for (const g of geos) total += g.attributes.position.count;
      const merged = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv', 'color']) {
        const arr = new Float32Array(total * (k === 'uv' ? 2 : 3));
        let o = 0;
        for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
        merged.setAttribute(k, new THREE.BufferAttribute(arr, k === 'uv' ? 2 : 3));
      }
      const mesh = new THREE.Mesh(merged, getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      mesh.name = 'speed_breakers'; mesh.receiveShadow = true; mesh.castShadow = false;
      group.add(mesh);
    }
    const hf = roadFrame(DOG_HOME.road, DOG_HOME.seg, DOG_HOME.t);
    if (hf) {
      dog.hx = dog.x = hf.x + hf.nx * DOG_HOME.lat; dog.hz = dog.z = hf.z + hf.nz * DOG_HOME.lat;
      dog.yaw = Math.atan2(hf.dx, hf.dz);
      dogMesh = new THREE.InstancedMesh(buildDogGeometry(), createHideMaterial(0xffffff), 1);
      dogMesh.name = 'cyclist_events_dog';
      dogMesh.setColorAt(0, _c.setHex(0xb08a5c));
      dogMesh.frustumCulled = false;
      group.add(dogMesh);
    }
  }

  function stepJolt(dt, player) {
    if (!holder) holder = player.getObjectByName('player_cycle');
    if (!holder) return;
    jolt.t += dt;
    holder.position.y = jolt.t < 1.2 ? jolt.amp * Math.abs(Math.sin(jolt.t * 15)) * Math.exp(-jolt.t * 4.5) : 0;
  }

  function animate(dt) {
    elapsed += dt;
    const player = getPlayer();
    if (!player) return;
    const px = player.position.x, pz = player.position.z, riding = isOnCycle();
    stepJolt(dt, player);
    if (riding) {
      for (const s of sites) {
        const rx = px - s.x, rz = pz - s.z;
        const along = rx * s.dx + rz * s.dz, lat = rx * s.nx + rz * s.nz;
        if (Math.abs(lat) < s.hw && Math.abs(along) < 4) {
          if (s.prev !== null && Math.sign(s.prev) !== Math.sign(along) && Math.abs(along) < 1.5) {
            jolt = { t: 0, amp: 0.1 }; info.jolts++;
          }
          s.prev = along;
        } else s.prev = null;
      }
    }

    if (!dogMesh) return;
    const dHome = Math.hypot(px - dog.hx, pz - dog.hz), dPlayer = Math.hypot(px - dog.x, pz - dog.z);
    let moving = false;
    if (dog.state === 'sleep') {
      if (riding) {
        if (dHome < 6 && !dog.near) { dog.near = true; }
        else if (dHome > 14 && dog.near) { dog.near = false; dog.passes++; info.passes = dog.passes; if (dog.passes >= 2) { dog.state = 'follow'; dog.followT = 0; } }
      }
    } else if (dog.state === 'follow') {
      dog.followT += dt;
      if (dPlayer > 70 || dog.followT > 45) { dog.state = 'home'; }
      else if (dPlayer > 3.2) {
        const sp = Math.min(dPlayer > 12 ? 7.5 : 5.0, dPlayer * 2), nx = (px - dog.x) / dPlayer, nz = (pz - dog.z) / dPlayer;
        dog.x += nx * sp * dt; dog.z += nz * sp * dt; dog.yaw = Math.atan2(nx, nz); moving = true;
      }
    } else if (dog.state === 'home') {
      const d = Math.hypot(dog.hx - dog.x, dog.hz - dog.z);
      if (d < 0.4) { dog.state = 'sleep'; dog.passes = 0; dog.near = false; }
      else { const nx = (dog.hx - dog.x) / d, nz = (dog.hz - dog.z) / d; dog.x += nx * 3.5 * dt; dog.z += nz * 3.5 * dt; dog.yaw = Math.atan2(nx, nz); moving = true; }
    }
    info.dogState = dog.state;
    const trot = moving ? Math.abs(Math.sin(elapsed * 13)) * 0.05 : 0;
    const lie = dog.state === 'sleep' ? 0.55 : 1; // curled and low when asleep
    _e.set(0, dog.yaw, moving ? Math.sin(elapsed * 13) * 0.05 : 0); _q.setFromEuler(_e);
    _p.set(dog.x, trot, dog.z); _s.set(1, lie + (1 - lie) * 0, 1);
    dogMesh.setMatrixAt(0, _m.compose(_p, _q, _s));
    dogMesh.instanceMatrix.needsUpdate = true;
  }

  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    if (settlingReleased()) frames++; // load time: lazy builds wait for the opening view (docs/perf-2026-11-08.md)
    if (!built && frames > 40) { built = true; build(); }
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0); last = now;
    if (built) animate(dt);
  };
  return { group };
}
