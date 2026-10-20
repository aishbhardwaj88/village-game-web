import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mergeGroupByMaterial } from './mergeUtils.js';

/** School bell (item 5): a post, a short arm, and a small hanging bell — enough to
 * read as "the thing you ring," not a modelled asset. */
export function createBellProp(position) {
  const group = new THREE.Group();
  group.name = 'school_bell';

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6), postMat);
  post.position.y = 1.0;
  post.castShadow = true;
  group.add(post);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), postMat);
  arm.position.set(0.22, 1.95, 0);
  arm.castShadow = true;
  group.add(arm);

  const bellMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.22, 8, 1, true), bellMat);
  bell.position.set(0.42, 1.75, 0);
  bell.castShadow = true;
  group.add(bell);

  // Task 2 (draw-call budget) — post + arm already share postMat, so this folds
  // them into one draw call (bell keeps its own metal material).
  mergeGroupByMaterial(group);

  group.position.set(position.x, 0, position.z);
  return group;
}

function bakeColor(geometry, color) {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function part(geometry, matrix, color) {
  geometry.applyMatrix4(matrix);
  return bakeColor(geometry, color);
}

const POLE_GREY = 0xd4d2c8;
const SAFFRON = 0xe8821e;
const WHITE = 0xf4f2ea;
const GREEN = 0x0b7a3e;
const CHAKRA_NAVY = 0x16215c;

/**
 * reference-from-unity/MAP.md: "Flagpole flying the Indian national flag, at the
 * main chowk near the school/panchayat cluster — a common real feature of village
 * squares. Scenery only, same treatment as the religious buildings (no gameplay
 * attached). No statue alongside it." Built (not modelled) at a fixed size, one
 * merged mesh — pole + flag + chakra all baked into one vertex-coloured geometry,
 * one draw call total.
 */
export function createFlagpoleProp(position) {
  const geos = [];
  const poleHeight = 6.0;
  geos.push(part(new THREE.CylinderGeometry(0.035, 0.05, poleHeight, 8), new THREE.Matrix4().setPosition(0, poleHeight / 2, 0), POLE_GREY));
  // Small finial ball at the very top.
  geos.push(part(new THREE.SphereGeometry(0.07, 8, 6), new THREE.Matrix4().setPosition(0, poleHeight, 0), POLE_GREY));

  // Flag — 3 horizontal stripes, flown to one side of the pole, a fixed-out static
  // flag (no cloth simulation) rather than hanging limp against the pole.
  const flagY = poleHeight - 0.9;
  const flagW = 1.3; // extends in +X from the pole
  const stripeH = 0.24;
  const flagCx = 0.08 + flagW / 2;
  geos.push(part(new THREE.BoxGeometry(flagW, stripeH, 0.015), new THREE.Matrix4().setPosition(flagCx, flagY + stripeH, 0), SAFFRON));
  geos.push(part(new THREE.BoxGeometry(flagW, stripeH, 0.015), new THREE.Matrix4().setPosition(flagCx, flagY, 0), WHITE));
  geos.push(part(new THREE.BoxGeometry(flagW, stripeH, 0.015), new THREE.Matrix4().setPosition(flagCx, flagY - stripeH, 0), GREEN));
  // Chakra — simplified as a flat ring at the centre of the white stripe (a full
  // 24-spoke wheel is finer detail than this low-poly style resolves at a
  // distance; the ring alone already reads as "a mark on the white band", which is
  // the recognisable cue, not a literal reproduction).
  geos.push(part(new THREE.TorusGeometry(0.075, 0.015, 6, 16), new THREE.Matrix4().setPosition(flagCx, flagY, 0.01), CHAKRA_NAVY));

  const merged = mergeGeometries(geos);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = 'flagpole';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'flagpole_prop';
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  // A thin real collider (a flagpole is a real, if minor, physical obstacle) —
  // same userData.collider convention src/collision.js's buildCollidersFromScene()
  // reads from any tagged mesh, not just walls.
  const colliderGeo = new THREE.Mesh(new THREE.BoxGeometry(0.15, poleHeight, 0.15));
  colliderGeo.position.set(0, poleHeight / 2, 0); // local to `group`, which already carries the world x/z offset below — do not add it again here
  colliderGeo.userData.collider = true;
  colliderGeo.visible = false;
  group.add(colliderGeo);

  return group;
}
