import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBovineGeometry, buildMonkeyMesh, createHideMaterial } from './animals.js';
import { getTiledMaterial } from './materials.js';
import { ANCHORS } from './anchors.js';
import { BLOB_DIPS, blobEdge, dipHeightRaw } from './dips.js';

/**
 * Extra animals from docs/VILLAGE_VOCABULARY.md section 3, built only from animal geometry that already exists in src/animals.js:
 *   wallowing buffaloes - three buffaloes lying in the pond, backs and humps above the water, slow breathing; a dhobi (capsule
 *                         placeholder, characters are parked) bent at a flat stone on the bank beating a bundle of wet cloth, more
 *                         wet bundles piled beside him. Shown only while the player is within 65 m of the pond (it is zone-streamed).
 *   monkeys             - four macaques sitting on the water tank (src/props.js createWaterTankProp): three on the tank top, one on
 *                         the slab ledge. Shown only while that streamed tank is in the scene.
 * NOT built, no animal model exists in public/assets or src (see docs/NEEDS_YOU.md): peacock, hens, goats on a wall.
 *
 * All soft: nothing is collidable. Pond buffaloes sit out in water the player cannot enter (src/dips.js blobSolids), the dhobi and
 * the monkeys are placeholders that move, like the other idle figures. Draw calls: pond 4 (buffalo, dhobi, stone+cloth merge,
 * one hide-free material each), tank 1. The pond and the tank are never on screen together at the hero zone.
 */

const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const POND = BLOB_DIPS.pond;
const TANK = { x: -22, z: 122 }; // src/main.js zoneManager 'water_tank'
const TANK_TOP = 12.7, TANK_LEDGE = 9.3;

/** world position inside / on the pond from polar (a, u): u = 1 is the waterline */
function pondPoint(a, u) {
  const r = POND.R * blobEdge(a, POND.seed) * u;
  return { x: POND.x + r * Math.cos(a), z: POND.z - r * Math.sin(a) };
}
function whiten(geo, c) {
  const col = new THREE.Color(c), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
function bare(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
function metreUV(geo, tile = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const place = (mesh, i, x, y, z, rx, ry, rz, sx, sy, sz) => {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
};

function dhobiGeometry() {
  const body = whiten(new THREE.CapsuleGeometry(0.22, 0.85, 4, 8), 0xffffff); body.translate(0, 0.62, 0);
  const arm = whiten(new THREE.CapsuleGeometry(0.06, 0.5, 3, 6), 0xffffff); arm.rotateX(Math.PI / 2 - 0.3); arm.translate(0, 1.05, 0.38);
  const bundle = whiten(new THREE.BoxGeometry(0.42, 0.14, 0.3), 0xe8e2d4); bundle.translate(0, 0.92, 0.72);
  return mergeGeometries([body, arm, bundle].map(bare));
}

export function createAnimalsExtra(scene) {
  const group = new THREE.Group();
  group.name = 'animals_extra';
  scene.add(group);
  const info = { drawCalls: 0, pond: null, tank: null };
  if (typeof window !== 'undefined') window.__animalsExtra = info;

  // ---------------------------------------------------------------- pond
  const pondGroup = new THREE.Group(); pondGroup.name = 'animals_extra_pond'; pondGroup.visible = false; group.add(pondGroup);
  const hideMat = createHideMaterial(0xffffff);
  const WATER = POND.water; // -0.5
  const wallow = [
    { a: 0.5, u: 0.5, ry: 2.0, tint: 0x3a3a38, s: [1.12, 1.1, 1.22] },
    { a: 1.3, u: 0.62, ry: 0.4, tint: 0x2a2a28, s: [1.06, 1.12, 1.16] },
    { a: -0.4, u: 0.38, ry: 4.4, tint: 0x4a4440, s: [1.0, 1.04, 1.1] },
  ].map((w, i) => ({ ...pondPoint(w.a, w.u), ...w, ph: i * 2.1 }));
  const buff = new THREE.InstancedMesh(buildBovineGeometry({ legs: false, udder: false }), hideMat, wallow.length);
  buff.name = 'animals_extra_wallow_buffalo';
  wallow.forEach((w, i) => buff.setColorAt(i, _c.setHex(w.tint)));
  pondGroup.add(buff);

  // dhobi on the bank, facing the water, and his stone
  const da = 2.5, dB = pondPoint(da, 1.1), dW = pondPoint(da, 0.97);
  const dY = dipHeightRaw(dB.x, dB.z), sY = Math.max(dipHeightRaw(dW.x, dW.z), WATER + 0.02);
  const face = Math.atan2(dW.x - dB.x, dW.z - dB.z);
  const dhobi = new THREE.InstancedMesh(dhobiGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: true }), 1);
  dhobi.name = 'animals_extra_dhobi'; dhobi.setColorAt(0, _c.setHex(0xcfc4a8));
  pondGroup.add(dhobi);

  const stone = [];
  const add = (g, x, y, z, ry, rx, rz, tint) => {
    const q = bare(g); q.applyMatrix4(_m.makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')).setPosition(x, y, z));
    whiten(metreUV(q), tint); stone.push(q);
  };
  // the washing stone, tilted down to the water, plus a second smaller one; wet bundles piled on the bank beside him
  add(new THREE.BoxGeometry(0.95, 0.16, 0.6), dW.x, sY + 0.02, dW.z, face, -0.12, 0.03, 0x8e8a80);
  add(new THREE.BoxGeometry(0.6, 0.12, 0.45), dW.x + Math.cos(face) * 0.9, sY + 0.02, dW.z - Math.sin(face) * 0.9, face + 0.5, -0.1, 0, 0x7e7a70);
  const side = new THREE.Vector3(Math.cos(face), 0, -Math.sin(face));
  [[1.0, 0.1, 0xe6dfcf, 1.0], [1.3, -0.25, 0xc9b99a, 0.8], [1.15, 0.45, 0xd9cfc0, 0.9]].forEach(([k, off, tint, sc], i) => {
    const bx = dB.x + side.x * k + Math.sin(face) * off, bz = dB.z + side.z * k + Math.cos(face) * off;
    const g = new THREE.SphereGeometry(0.22 * sc, 10, 6); g.scale(1.3, 0.55, 1);
    add(g, bx, dipHeightRaw(bx, bz) + 0.08, bz, rnd(i + 3) * 6, 0, 0, tint);
  });
  const cloth = new THREE.Mesh(mergeGeometries(stone), getTiledMaterial('tarpaulin', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
  cloth.name = 'animals_extra_dhobi_stone_cloth'; cloth.castShadow = true; cloth.receiveShadow = true;
  pondGroup.add(cloth);
  for (const m of [buff, dhobi, cloth]) { m.userData.noAutoCollider = true; m.frustumCulled = false; }
  buff.castShadow = dhobi.castShadow = true;
  if (buff.instanceColor) buff.instanceColor.needsUpdate = true;
  if (dhobi.instanceColor) dhobi.instanceColor.needsUpdate = true;
  info.pond = { buffaloes: wallow.length, dhobi: { x: +dB.x.toFixed(1), z: +dB.z.toFixed(1) } };

  // ---------------------------------------------------------------- monkeys on the water tank
  const tankGroup = new THREE.Group(); tankGroup.name = 'animals_extra_tank'; tankGroup.visible = false; group.add(tankGroup);
  const mk = buildMonkeyMesh();
  const sits = [
    { r: 1.9, th: 0.6, y: TANK_TOP, s: 1.2 }, { r: 2.2, th: 2.4, y: TANK_TOP, s: 1.05 }, { r: 1.7, th: 4.0, y: TANK_TOP, s: 1.15 },
    { r: 2.9, th: Math.PI * 1.25, y: TANK_LEDGE, s: 1.1 }, // the slab corner that sticks out past the tank wall
  ].map((p, i) => ({ x: TANK.x + Math.cos(p.th) * p.r, z: TANK.z + Math.sin(p.th) * p.r, y: p.y, s: p.s, ry: p.th + Math.PI / 2 + (rnd(i + 9) - 0.5) * 1.2, ph: i * 1.7 }));
  const monkeys = new THREE.InstancedMesh(mk.geometry, mk.material, sits.length);
  monkeys.name = 'animals_extra_monkeys'; monkeys.castShadow = false; monkeys.frustumCulled = false; monkeys.userData.noAutoCollider = true;
  tankGroup.add(monkeys);
  info.tank = { monkeys: sits.length };
  info.drawCalls = 5;

  // ---------------------------------------------------------------- per frame
  let player = null, t = 0, last = 0, check = 0;
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0); last = now; t += dt; check -= dt;
    if (check <= 0) {
      check = 0.5;
      player = player || scene.getObjectByName('player');
      const px = player ? player.position.x : 1e9, pz = player ? player.position.z : 1e9;
      pondGroup.visible = Math.hypot(px - POND.x, pz - POND.z) < 65;
      tankGroup.visible = !!scene.getObjectByName('water_tank_prop') && Math.hypot(px - TANK.x, pz - TANK.z) < 90;
    }
    if (pondGroup.visible) {
      wallow.forEach((w, i) => {
        const breath = Math.sin(t * 0.7 + w.ph) * 0.012;
        place(buff, i, w.x, WATER - 0.82 + breath, w.z, 0, w.ry + Math.sin(t * 0.15 + w.ph) * 0.05, 0, w.s[0], w.s[1] * (1 + breath * 0.5), w.s[2]);
      });
      buff.instanceMatrix.needsUpdate = true;
      // beat, lift, beat: a slow stroke of about 1.4 s with a pause between every few
      const cyc = t % 6, beating = cyc < 4.2, stroke = beating ? Math.max(0, Math.sin(cyc * Math.PI / 0.7)) : 0;
      place(dhobi, 0, dB.x, dY, dB.z, 0.45 + 0.3 * (1 - stroke) + (beating ? 0 : 0.05 * Math.sin(t)), face, 0, 1, 0.82, 1);
      dhobi.instanceMatrix.needsUpdate = true;
    }
    if (tankGroup.visible) {
      sits.forEach((m, i) => {
        const scratch = Math.max(0, Math.sin(t * 0.8 + m.ph)) ** 6; // an occasional shift of the head and shoulders
        place(monkeys, i, m.x, m.y, m.z, 0, m.ry + scratch * 0.25, 0, m.s, m.s * (1 + 0.04 * scratch), m.s);
      });
      monkeys.instanceMatrix.needsUpdate = true;
    }
  };
  return { group };
}
