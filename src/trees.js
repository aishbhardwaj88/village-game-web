import * as THREE from 'three';

/**
 * Village trees (neem, peepal, babool, mango, eucalyptus) - procedural, no model download.
 *
 * Each tree is a real branching structure: a curved, root-flared trunk, primary branches
 * that fork into twigs, and at every twig tip a cluster of alpha-cut leaf-sprig cards
 * (one shared species atlas, so every tree in the world is exactly two draw calls once
 * merged: bark + leaves). Card shading normals point outward from the crown, so the crown
 * lights like one soft volume instead of a pile of flat cards. Colours are dusty olive and
 * deep neem greens, never lime (art direction).
 *
 * Replaced the old smooth-blob canopies (art director: "toy-like"). Heights stay in the
 * same range as before so placements, colliders and the mango-knock mission are unchanged.
 */

const BARK_COLOR = 0x3b2b22;
const BARK_COLOR_LIGHT = 0x4a3a2e;
const BARK_PALE = 0xb9b3a2; // eucalyptus

// Deterministic tiny PRNG so repeated builds produce the same tree at the same seed.
function mulberry32(seed) {
  let a = seed * 2654435761 + 0x6d2b79f5;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------
// Leaf-sprig atlas: 4 x 2 cells of 256 px, one cell per species, transparent background.
// ---------------------------------------------------------------------------------
const ATLAS_COLS = 4;
const ATLAS_ROWS = 2;
const CELL = 256;
const SPECIES_CELL = { neem: 0, peepal: 1, mango: 2, babool: 3, eucalyptus: 4 };

function leafShape(g, kind, len, wid, light, dark) {
  const grad = g.createLinearGradient(0, -wid, 0, wid);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);
  g.fillStyle = grad;
  g.beginPath();
  if (kind === 'heart') {
    // peepal: broad rounded base, long drip tip
    g.moveTo(0, 0);
    g.bezierCurveTo(-wid * 0.2, -wid * 1.15, len * 0.45, -wid * 1.2, len * 0.62, -wid * 0.45);
    g.quadraticCurveTo(len * 0.85, -wid * 0.1, len, 0);
    g.quadraticCurveTo(len * 0.85, wid * 0.1, len * 0.62, wid * 0.45);
    g.bezierCurveTo(len * 0.45, wid * 1.2, -wid * 0.2, wid * 1.15, 0, 0);
  } else if (kind === 'sickle') {
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -wid * 1.3, len, wid * 0.8);
    g.quadraticCurveTo(len * 0.5, wid * 0.5, 0, 0);
  } else {
    // lanceolate
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.42, -wid * 1.1, len, 0);
    g.quadraticCurveTo(len * 0.42, wid * 1.1, 0, 0);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(190,205,150,0.55)';
  g.lineWidth = Math.max(1, wid * 0.14);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(len * 0.92, 0);
  g.stroke();
}

function drawLeaf(g, x, y, ang, kind, len, wid, light, dark) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  leafShape(g, kind, len, wid, light, dark);
  g.restore();
}

function drawStem(g, x0, y0, x1, y1, w, color) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1);
  g.stroke();
}

const SPRIGS = {
  // neem: pinnate compound leaves, many small serrated leaflets, deep green
  neem(g, r) {
    for (let c = 0; c < 3; c++) {
      const ang = -Math.PI / 2 + (c - 1) * 0.7;
      const sx = 128, sy = 244;
      const L = 150 + r() * 25;
      const ex = sx + Math.cos(ang) * L, ey = sy + Math.sin(ang) * L;
      drawStem(g, sx, sy, ex, ey, 3, '#4a5a2a');
      for (let i = 1; i <= 7; i++) {
        const t = i / 8;
        const px = sx + (ex - sx) * t, py = sy + (ey - sy) * t;
        for (const side of [-1, 1]) {
          drawLeaf(g, px, py, ang + side * (1.0 - t * 0.3) + (r() - 0.5) * 0.2, 'lance', 36 - t * 10, 8.5 - t * 2, '#5f8038', '#2f4d22');
        }
      }
      drawLeaf(g, ex, ey, ang, 'lance', 30, 7.5, '#5f8038', '#2f4d22');
    }
  },
  // peepal: heart-shaped leaves with drip tips on slender petioles
  peepal(g, r) {
    drawStem(g, 128, 248, 128, 40, 3.5, '#5a4a30');
    for (let i = 0; i < 9; i++) {
      const t = 0.12 + i * 0.1;
      const py = 248 - t * 208;
      for (const side of [-1, 1]) {
        if (i % 2 === (side > 0 ? 0 : 1) || i > 6) {
          const a = side > 0 ? -0.35 + (r() - 0.5) * 0.3 : Math.PI + 0.35 + (r() - 0.5) * 0.3;
          drawLeaf(g, 128, py, a - (side > 0 ? 0.25 : -0.25) - t * 0.2 * side, 'heart', 78 - t * 20, 30 - t * 6, '#79a04a', '#3e6a30');
        }
      }
    }
    drawLeaf(g, 128, 40, -Math.PI / 2, 'heart', 62, 26, '#79a04a', '#3e6a30');
  },
  // mango: long lanceolate, glossy dark, drooping in whorls
  mango(g, r) {
    drawStem(g, 128, 248, 132, 50, 4, '#4a3b25');
    for (let i = 0; i < 5; i++) {
      const py = 238 - i * 42;
      const n = 2 + (i % 2);
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (k - (n - 1) / 2) * 1.15 + (r() - 0.5) * 0.3;
        drawLeaf(g, 128 + (r() - 0.5) * 4, py, a + (a > -Math.PI / 2 ? 0.55 : -0.55) * 0.5 - Math.PI / 2 + Math.PI / 2, 'lance', 100 - i * 8, 21, '#4a7a38', '#243f22');
      }
    }
    drawLeaf(g, 132, 50, -Math.PI / 2, 'lance', 70, 16, '#4a7a38', '#243f22');
  },
  // babool: feathery bipinnate, tiny leaflets, dusty olive
  babool(g, r) {
    for (let c = 0; c < 4; c++) {
      const ang = -Math.PI / 2 + (c - 1.5) * 0.55;
      const sx = 128, sy = 246;
      const L = 150 + r() * 30;
      const ex = sx + Math.cos(ang) * L, ey = sy + Math.sin(ang) * L;
      drawStem(g, sx, sy, ex, ey, 2, '#6b6a3a');
      for (let i = 1; i <= 14; i++) {
        const t = i / 15;
        const px = sx + (ex - sx) * t, py = sy + (ey - sy) * t;
        for (const side of [-1, 1]) {
          drawLeaf(g, px, py, ang + side * 1.25, 'lance', 22, 4.2, '#9aa456', '#5d6e32');
        }
      }
    }
  },
  // eucalyptus: long narrow sickle leaves hanging from a twig (stem at the TOP of the cell)
  eucalyptus(g, r) {
    drawStem(g, 128, 14, 128, 120, 3, '#6f6a55');
    for (let i = 0; i < 9; i++) {
      const py = 20 + i * 12;
      const side = i % 2 ? 1 : -1;
      drawLeaf(g, 128, py, Math.PI / 2 + side * (0.35 + r() * 0.3), 'sickle', 130 - i * 6, 11, '#86a384', '#4c6a50');
    }
    drawLeaf(g, 128, 120, Math.PI / 2, 'sickle', 100, 9, '#86a384', '#4c6a50');
  },
};

function makeLeafAtlas() {
  const c = document.createElement('canvas');
  c.width = CELL * ATLAS_COLS;
  c.height = CELL * ATLAS_ROWS;
  const g = c.getContext('2d');
  for (const [name, idx] of Object.entries(SPECIES_CELL)) {
    g.save();
    g.translate((idx % ATLAS_COLS) * CELL, Math.floor(idx / ATLAS_COLS) * CELL);
    g.beginPath();
    g.rect(0, 0, CELL, CELL);
    g.clip();
    SPRIGS[name](g, mulberry32(77 + idx));
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// One shared MeshStandardMaterial per kind, module-level singletons: mergeGroupByMaterial
// (src/mergeUtils.js) buckets by material identity, so every tree merges into 2 draw calls.
const TREE_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
TREE_MATERIAL.name = 'tree_foliage';

let LEAF_MATERIAL = null;
function leafMaterial() {
  if (!LEAF_MATERIAL) {
    LEAF_MATERIAL = new THREE.MeshStandardMaterial({ map: makeLeafAtlas(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    LEAF_MATERIAL.name = 'tree_leaf_cards';
    // Gentle wind sway: crown moves more with height and a per-position phase, so
    // neighbouring trees do not move in lockstep. Vertex-only, no extra draw calls.
    const uTime = { value: 0 };
    LEAF_MATERIAL.onBeforeRender = () => { uTime.value = performance.now() / 1000; };
    LEAF_MATERIAL.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        float windPhase = position.x * 0.35 + position.z * 0.27;
        float windAmt = clamp(position.y * 0.012, 0.0, 0.12);
        transformed.x += sin(uWindTime * 1.3 + windPhase) * windAmt;
        transformed.z += sin(uWindTime * 1.0 + windPhase * 1.7 + 1.3) * windAmt * 0.7;`);
    };
  }
  return LEAF_MATERIAL;
}

// ---------------------------------------------------------------------------------
// Branch geometry
// ---------------------------------------------------------------------------------
const _up = new THREE.Vector3(0, 1, 0);

function randomUnit(r) {
  const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(a), z, s * Math.sin(a));
}

/** Tapered tube along `pts` with per-point radii; smooth radial normals, flat bark colour + streaks. */
function tube(out, pts, radii, color, sides = 6, flare = 0) {
  const rings = [];
  const prevN = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const tan = new THREE.Vector3().subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
    let n = new THREE.Vector3().crossVectors(tan, Math.abs(tan.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : _up).normalize();
    if (i > 0 && n.dot(prevN) < 0) n.negate();
    prevN.copy(n);
    const b = new THREE.Vector3().crossVectors(tan, n).normalize();
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const dir = n.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
      // root flare: wobble the base ring radius per side so the foot spreads into the ground
      const f = i === 0 && flare ? 1 + flare * (0.6 + 0.8 * Math.abs(Math.sin(a * 2.5 + pts[0].x * 9))) : 1;
      ring.push({ p: pts[i].clone().addScaledVector(dir, radii[i] * f), n: dir });
    }
    rings.push(ring);
  }
  const c = new THREE.Color(color);
  const col = new THREE.Color();
  const push = (v, shade) => {
    out.pos.push(v.p.x, v.p.y, v.p.z);
    out.nor.push(v.n.x, v.n.y, v.n.z);
    col.copy(c).multiplyScalar(shade);
    out.col.push(col.r, col.g, col.b);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const shadeBase = 0.82 + 0.26 * ((i * 7 + sides) % 5) / 5;
    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      const sh = shadeBase * (0.85 + 0.3 * ((s * 3 + i) % 4) / 4); // vertical bark streaks
      const a = rings[i][s], b = rings[i][s2], c2 = rings[i + 1][s2], d = rings[i + 1][s];
      push(a, sh); push(d, sh); push(b, sh);
      push(b, sh); push(d, sh); push(c2, sh);
    }
  }
}

function rotateToward(dir, r, spread, upBias) {
  // tilt `dir` away from itself by `spread` radians in a random azimuth, then bias upward
  const side = new THREE.Vector3().crossVectors(dir, randomUnit(r)).normalize();
  const out = dir.clone().applyAxisAngle(side, spread * (0.75 + 0.5 * r()));
  out.y += upBias;
  return out.normalize();
}

function buildSpeciesTree(spec, seed, name) {
  const rand = mulberry32(seed);
  const H = spec.height * (0.93 + 0.14 * rand());
  const bark = { pos: [], nor: [], col: [] };
  const tips = []; // leaf cluster centres
  const lean = new THREE.Vector3((rand() - 0.5) * spec.lean, 0, (rand() - 0.5) * spec.lean);

  // trunk: gently bent path
  const trunkH = H * spec.trunkFrac;
  const tp = [];
  const tr = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    tp.push(new THREE.Vector3(
      lean.x * t * trunkH + Math.sin(t * 3.1 + seed) * 0.05 * trunkH * 0.3,
      -0.02 + t * trunkH,
      lean.z * t * trunkH + Math.cos(t * 2.7 + seed) * 0.05 * trunkH * 0.3
    ));
    tr.push(spec.trunkR * (1 - t * (1 - spec.topTaper)) * (i === 0 ? 1.0 : 1));
  }
  tube(bark, tp, tr, spec.bark, 8, 0.35);

  const crown = new THREE.Vector3(tp[N].x, H * spec.crownY, tp[N].z);

  const grow = (start, dir, len, r0, depth) => {
    const segs = depth === 0 ? 4 : 3;
    const pts = [start.clone()];
    const rad = [r0];
    const d = dir.clone();
    for (let i = 1; i <= segs; i++) {
      d.add(randomUnit(rand).multiplyScalar(0.28)).normalize();
      d.y += spec.droop * (depth + 1) * -0.06 + (spec.upBias || 0) * 0.04;
      d.normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, len / segs));
      rad.push(r0 * (1 - i / segs * 0.7));
    }
    tube(bark, pts, rad, depth === 0 ? spec.barkBranch : spec.barkBranch, 5);
    const tip = pts[pts.length - 1];
    if (depth < spec.depth) {
      const kids = depth === 0 ? spec.secondary : 2;
      for (let k = 0; k < kids; k++) {
        const ti = 1 + Math.floor(rand() * segs);
        const from = pts[Math.min(ti, segs)];
        const cd = rotateToward(d, rand, spec.fork, spec.upBias || 0.05);
        grow(from, cd, len * (0.55 + 0.2 * rand()), rad[Math.min(ti, segs)] * 0.72, depth + 1);
      }
      if (depth > 0 || spec.tipAtPrimary) tips.push(tip.clone());
    } else {
      tips.push(tip.clone());
      tips.push(pts[2].clone());
    }
  };

  const primary = spec.primary;
  for (let i = 0; i < primary; i++) {
    const t = spec.branchFrom + (spec.branchTo - spec.branchFrom) * (primary === 1 ? 0 : i / (primary - 1));
    const idx = Math.min(N - 1, Math.round(t * N));
    const start = tp[idx].clone();
    const az = (i / primary) * Math.PI * 2 + rand() * 0.8;
    const out = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const dir = out.multiplyScalar(Math.sin(spec.spread)).add(new THREE.Vector3(0, Math.cos(spec.spread), 0)).normalize();
    grow(start, dir, spec.branchLen * (0.8 + 0.4 * rand()), tr[idx] * spec.branchR, 0);
  }
  // central leader tip so the crown is filled on top
  if (spec.leaderCluster) tips.push(new THREE.Vector3(tp[N].x, H * 0.97, tp[N].z));

  // leaf cards
  const P = [], U = [], C = [], NR = [], I = [];
  const cell = SPECIES_CELL[spec.species];
  const u0 = (cell % ATLAS_COLS) / ATLAS_COLS, v0 = 1 - (Math.floor(cell / ATLAS_COLS) + 1) / ATLAS_ROWS;
  const du = 1 / ATLAS_COLS, dv = 1 / ATLAS_ROWS;
  const col = new THREE.Color();
  let q = 0;
  for (const tip of tips) {
    for (let k = 0; k < spec.cards; k++) {
      const c = tip.clone().add(randomUnit(rand).multiplyScalar(spec.clusterR * (0.3 + 0.7 * rand())));
      c.y = Math.max(c.y, 1.1);
      const outward = new THREE.Vector3().subVectors(c, crown);
      outward.y *= spec.crownFlat;
      if (outward.lengthSq() < 1e-4) outward.set(0, 1, 0);
      outward.normalize();
      const size = spec.cardSize * (0.8 + 0.5 * rand());
      let ax, ay, ng;
      if (spec.hang) {
        ng = outward.clone(); ng.y = 0; if (ng.lengthSq() < 1e-3) ng.set(1, 0, 0); ng.normalize();
        ax = new THREE.Vector3().crossVectors(_up, ng).normalize();
        ay = _up.clone();
        // random yaw so hanging sprigs face all ways
        const yaw = (rand() - 0.5) * 1.6;
        ax.applyAxisAngle(_up, yaw);
      } else {
        ng = outward.clone().multiplyScalar(0.8).add(randomUnit(rand).multiplyScalar(0.8)).normalize();
        const t1 = new THREE.Vector3().crossVectors(ng, _up);
        if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
        t1.normalize();
        const t2 = new THREE.Vector3().crossVectors(ng, t1).normalize();
        const roll = rand() * Math.PI * 2, cr = Math.cos(roll), sr = Math.sin(roll);
        ax = t1.clone().multiplyScalar(cr).addScaledVector(t2, sr);
        ay = t2.clone().multiplyScalar(cr).addScaledVector(t1, -sr);
      }
      const shade = new THREE.Vector3(outward.x * 0.9, outward.y * 0.9 + 0.35, outward.z * 0.9).normalize();
      const hFrac = Math.min(1, Math.max(0, (c.y - H * 0.3) / (H * 0.8)));
      const bright = (0.72 + 0.4 * hFrac) * (0.88 + 0.24 * rand());
      col.setRGB(spec.tint[0] * bright, spec.tint[1] * bright, spec.tint[2] * bright);
      for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        // sprig stem sits at the bottom of the cell, so anchor the card's bottom edge on the tip
        const vy = spec.hang ? v : v + 1;
        P.push(c.x + (ax.x * u + ay.x * vy) * size * 0.5, c.y + (ax.y * u + ay.y * vy) * size * 0.5, c.z + (ax.z * u + ay.z * vy) * size * 0.5);
        U.push(u0 + du * (0.01 + 0.98 * (u + 1) / 2), v0 + dv * (0.01 + 0.98 * (v + 1) / 2));
        C.push(col.r, col.g, col.b);
        NR.push(shade.x, shade.y, shade.z);
      }
      I.push(q, q + 1, q + 2, q, q + 2, q + 3);
      q += 4;
    }
  }

  for (let i = 1; i < bark.pos.length; i += 3) if (bark.pos[i] < -0.02) bark.pos[i] = -0.02; // flare/lean must not dip under the ground
  const trunkGeo = new THREE.BufferGeometry();
  trunkGeo.setAttribute('position', new THREE.Float32BufferAttribute(bark.pos, 3));
  trunkGeo.setAttribute('normal', new THREE.Float32BufferAttribute(bark.nor, 3));
  trunkGeo.setAttribute('color', new THREE.Float32BufferAttribute(bark.col, 3));
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  leafGeo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  leafGeo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  leafGeo.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3));
  leafGeo.setIndex(I);

  const group = new THREE.Group();
  group.name = name;
  const trunk = new THREE.Mesh(trunkGeo, TREE_MATERIAL);
  trunk.name = `${name}_mesh`;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  const leaves = new THREE.Mesh(leafGeo, leafMaterial());
  leaves.name = 'tree_leaf_cards';
  leaves.castShadow = false; // canopy cards are ~half the shadow-pass triangles; trunks still cast
  leaves.receiveShadow = true;
  group.add(trunk, leaves);

  // Distance LODs: mid keeps the trunk with every other leaf card (no shadow casting);
  // far drops the trunk mesh and keeps a third of the cards, so a far tree costs one draw call.
  const thin = (step) => {
    const idx = [];
    for (let c = 0; c * 6 < I.length; c += step) for (let k = 0; k < 6; k++) idx.push(I[c * 6 + k]);
    const g = new THREE.BufferGeometry();
    for (const a of ['position', 'uv', 'color', 'normal']) g.setAttribute(a, leafGeo.getAttribute(a));
    g.setIndex(idx);
    return g;
  };
  const midLeaves = new THREE.Mesh(thin(2), leaves.material);
  midLeaves.name = 'tree_leaf_cards';
  midLeaves.receiveShadow = true;
  const farLeaves = new THREE.Mesh(thin(3), leaves.material);
  farLeaves.name = 'tree_leaf_cards';
  const midTrunk = new THREE.Mesh(trunkGeo, TREE_MATERIAL);
  midTrunk.name = `${name}_mesh`;
  const mid = new THREE.Group();
  mid.add(midTrunk, midLeaves);
  const lod = new THREE.LOD();
  lod.name = name;
  lod.addLevel(group, 0);
  lod.addLevel(mid, 55);
  lod.addLevel(farLeaves, 120);
  return lod;
}

const D = Math.PI / 180;
const SPECS = {
  // tall dense dome, small pinnate leaflets, deep neem green
  neem: {
    species: 'neem', height: 5.2, trunkFrac: 0.42, trunkR: 0.24, topTaper: 0.55, lean: 0.25, bark: BARK_COLOR, barkBranch: BARK_COLOR,
    crownY: 0.72, crownFlat: 1.0, primary: 6, branchFrom: 0.55, branchTo: 1.0, spread: 52 * D, branchLen: 2.5, branchR: 0.5, secondary: 3, depth: 1,
    fork: 38 * D, droop: 0.4, upBias: 0.1, cards: 16, clusterR: 0.85, cardSize: 1.35, tint: [0.86, 0.98, 0.78], leaderCluster: true,
  },
  // broad spreading shade tree, heart leaves
  peepal: {
    species: 'peepal', height: 5.6, trunkFrac: 0.4, trunkR: 0.32, topTaper: 0.5, lean: 0.3, bark: BARK_COLOR_LIGHT, barkBranch: BARK_COLOR_LIGHT,
    crownY: 0.7, crownFlat: 0.55, primary: 7, branchFrom: 0.5, branchTo: 1.0, spread: 66 * D, branchLen: 3.0, branchR: 0.5, secondary: 3, depth: 1,
    fork: 40 * D, droop: 0.5, upBias: 0.04, cards: 16, clusterR: 0.8, cardSize: 1.0, tint: [0.92, 1.0, 0.82], leaderCluster: true,
  },
  // short gnarled umbrella, feathery olive leaves, sparse
  babool: {
    species: 'babool', height: 3.1, trunkFrac: 0.55, trunkR: 0.12, topTaper: 0.6, lean: 0.9, bark: BARK_COLOR, barkBranch: BARK_COLOR,
    crownY: 0.82, crownFlat: 0.4, primary: 5, branchFrom: 0.7, branchTo: 1.0, spread: 74 * D, branchLen: 1.5, branchR: 0.55, secondary: 2, depth: 1,
    fork: 40 * D, droop: 0.3, upBias: 0.0, cards: 8, clusterR: 0.6, cardSize: 1.05, tint: [0.98, 1.0, 0.86], leaderCluster: false,
  },
  // dense round orchard tree, long dark leaves
  mango: {
    species: 'mango', height: 3.9, trunkFrac: 0.42, trunkR: 0.22, topTaper: 0.55, lean: 0.2, bark: BARK_COLOR, barkBranch: BARK_COLOR,
    crownY: 0.7, crownFlat: 0.9, primary: 6, branchFrom: 0.5, branchTo: 1.0, spread: 50 * D, branchLen: 2.1, branchR: 0.5, secondary: 3, depth: 1,
    fork: 38 * D, droop: 0.5, upBias: 0.08, cards: 15, clusterR: 0.75, cardSize: 1.1, tint: [0.8, 0.92, 0.74], leaderCluster: true,
  },
  // tall slim pale trunk, narrow drooping crown of long narrow leaves
  eucalyptus: {
    species: 'eucalyptus', height: 9.0, trunkFrac: 0.82, trunkR: 0.14, topTaper: 0.35, lean: 0.35, bark: BARK_PALE, barkBranch: BARK_PALE,
    crownY: 0.78, crownFlat: 1.4, primary: 8, branchFrom: 0.55, branchTo: 1.0, spread: 32 * D, branchLen: 2.0, branchR: 0.4, secondary: 2, depth: 1,
    fork: 30 * D, droop: 0.9, upBias: 0.15, cards: 8, clusterR: 0.6, cardSize: 1.5, tint: [0.9, 0.98, 0.9], hang: true, leaderCluster: true,
  },
};

export const buildNeemTree = (seed = 0) => buildSpeciesTree(SPECS.neem, seed, 'tree_neem');
export const buildPeepalTree = (seed = 1) => buildSpeciesTree(SPECS.peepal, seed, 'tree_peepal');
export const buildBaboolTree = (seed = 2) => buildSpeciesTree(SPECS.babool, seed, 'tree_babool');
export const buildMangoTree = (seed = 3) => buildSpeciesTree(SPECS.mango, seed, 'tree_mango');
export const buildEucalyptusTree = (seed = 4) => buildSpeciesTree(SPECS.eucalyptus, seed, 'tree_eucalyptus');

const BUILDERS = { neem: buildNeemTree, peepal: buildPeepalTree, babool: buildBaboolTree, mango: buildMangoTree, eucalyptus: buildEucalyptusTree };

/** Places trees - `placements`: [{ kind, x, z, y?, scale?, rotationY?, seed }]. Shared singleton
 * materials, so main.js's three calls still merge into the same two draw calls. */
export function buildTrees(placements) {
  const group = new THREE.Group();
  group.name = 'trees';
  for (const p of placements) {
    const builder = BUILDERS[p.kind];
    if (!builder) continue;
    const tree = builder(p.seed ?? 0);
    tree.position.set(p.x, p.y ?? 0, p.z);
    tree.rotation.y = p.rotationY || 0;
    if (p.scale) tree.scale.setScalar(p.scale); // e.g. the small neem in the house courtyard's brick planter
    group.add(tree);
  }
  return group;
}
