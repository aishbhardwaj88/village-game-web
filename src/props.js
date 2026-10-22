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

/**
 * docs/MISSIONS_PLAN.md item 5 / reference-from-unity/MAP.md: "Donation board on
 * the school's outer wall, showing real money raised for UP village primary
 * schools. Visible, readable, and it updates." — "A painted board... 'Every rupee
 * goes to village schools' (English + Hindi beneath) and an amount read from a
 * small JSON file (public/data/donations.json, starts at 0). Scenery only, never a
 * store." English-first here (not src/signboards.js's Devanagari-first exception —
 * that rule is specifically for shop signboards painted in-world, CLAUDE.md
 * section 4; this is an informational notice, so the general English-primary rule
 * applies). Async (loads a font + fetches the JSON) — same pattern
 * src/bazaar.js's buildBazaarSignboards() already uses; caller does
 * `createDonationBoard(...).then((board) => group.add(board))`.
 */
export async function createDonationBoard(position, rotationY = 0) {
  await document.fonts.load('700 40px "Noto Sans Devanagari"');
  await document.fonts.ready;

  let rupees = 0;
  try {
    const res = await fetch('data/donations.json');
    const data = await res.json();
    rupees = Number(data.rupees) || 0;
  } catch {
    // Scenery only — if the fetch fails for any reason, the board still reads
    // correctly with the starting amount rather than not appearing at all.
  }

  const W = 900;
  const H = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe0';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2f5a3a';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1f3a28';
  ctx.font = '700 52px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText('Every rupee goes to', W / 2, 110);
  ctx.fillText('village schools', W / 2, 172);
  ctx.font = '600 38px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('हर रुपया गाँव के स्कूलों के लिए', W / 2, 240);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, 280);
  ctx.lineTo(W * 0.85, 280);
  ctx.stroke();
  ctx.fillStyle = '#8a2e2e';
  ctx.font = '700 64px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(`₹${rupees.toLocaleString('en-IN')} raised`, W / 2, 380);
  ctx.fillStyle = '#4a4238';
  ctx.font = '500 30px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText('for UP village primary schools', W / 2, 440);
  ctx.font = '500 26px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('उत्तर प्रदेश के ग्रामीण प्राथमिक विद्यालयों के लिए', W / 2, 478);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
  // Same name every other wall-mounted signboard material in this codebase uses
  // (src/bazaar.js/signboards.js/newShops.js) — purely a label src/mergeUtils.js
  // bakes into the merged mesh's name (grouping itself is by material object
  // identity, not this string, so this never merges with a DIFFERENT signboard's
  // own distinct material/texture); tools/world-validator.js's "nothing floats"
  // check specifically excludes anything named 'signboard*' as a correctly-
  // elevated wall fixture, not a floating-object bug.
  material.name = 'signboard';
  const boardW = 3.0;
  const boardH = (boardW * H) / W;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, 0.05), material);
  mesh.name = 'donation_board';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Deliberately unnamed group — a sign bolted to an existing wall, not a second
  // independent building; main.js's buildingFootprints computation already skips
  // any unnamed direct child of a root group (see its own `if (!child.name)
  // continue`), which is exactly the behaviour this needs (tools/world-
  // validator.js's check 7 would otherwise misread it as two buildings
  // coinciding — the board necessarily sits inside the wall's own footprint).
  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(position.x, position.y, position.z);
  group.rotation.y = rotationY;
  return group;
}

/**
 * Street lamps (A1 props): grey concrete/iron poles with a short bracket arm and a
 * dull sodium-style lamp head, one merged vertex-coloured mesh (one draw call) for
 * every lamp. Placed on alternating sides along real lane segments, set just
 * outside the lane edge. Scenery only; lamps are unlit by design (daytime game).
 * `segments`: [{ from:{x,z}, to:{x,z}, width }].
 */
export function createStreetLamps(segments, { everyMetres = 22 } = {}) {
  // One merged mesh per segment (one draw call each, but frustum culling can drop
  // a far lane's lamps instead of one map-wide bounding sphere always passing).
  const group = new THREE.Group();
  group.name = 'street_lamps';
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.15 });
  let geos = [];
  const POLE = 0x7d7a72;
  const HEAD = 0xb9b4a4;
  const GLASS = 0xe9dca6;
  let n = 0;
  for (const { from, to, width } of segments) {
    geos = [];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz; // lane normal
    const nz = ux;
    const count = Math.max(1, Math.floor(len / everyMetres));
    for (let i = 0; i < count; i++) {
      const t = ((i + 0.5) / count) * len;
      const side = n++ % 2 === 0 ? 1 : -1;
      const off = width / 2 + 0.7;
      const x = from.x + ux * t + nx * off * side;
      const z = from.z + uz * t + nz * off * side;
      const rotY = Math.atan2(-nx * side, -nz * side); // arm reaches back over the lane
      const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
      const add = (g, local, color) => {
        g.applyMatrix4(new THREE.Matrix4().setPosition(local[0], local[1], local[2]));
        g.applyMatrix4(m);
        geos.push(bakeColor(g, color));
      };
      const h = 5.2;
      add(new THREE.CylinderGeometry(0.07, 0.11, h, 8), [0, h / 2, 0], POLE);
      add(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 8), [0, 0.12, 0], POLE);
      add(new THREE.BoxGeometry(0.07, 0.07, 1.1), [0, h - 0.1, 0.5], POLE);
      add(new THREE.CylinderGeometry(0.1, 0.26, 0.22, 8), [0, h - 0.1, 1.0], HEAD);
      add(new THREE.SphereGeometry(0.13, 8, 6), [0, h - 0.26, 1.0], GLASS);
    }
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
