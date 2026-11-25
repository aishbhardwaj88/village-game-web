import * as THREE from 'three';
import { LAND_QUALITY } from './landQuality.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Parts, orientedBoxes } from './landInstancing.js';
import { createChunkedLOD } from './instancing.js';
import { landMaterial } from './landMaterials.js';
import { labelKey, labelName, ringCentre, ringRadius, ringRect, hash01 } from './landLayout.js';
import { addHandPumps } from '../handPumps.js';
import { addHaystacks } from '../haystacks.js';
import { addGobar } from '../gobar.js';
import { addLaundryLine } from '../laundryLine.js';
import { hiFont, enFont } from '../signPaint.js';
import { yieldToMain } from './lateBuild.js';

/**
 * Small things of the approved map (?layout=new):
 *   flag island   round brick-faced island with a flower bed, stepped pedestal, 9 m white steel pole, the tiranga, and the
 *                 village name stone (Hindi + English, cut and painted). NO peepal on the island (her call).
 *   peepal chabutra by the chaupal: round plastered platform with a step (the tree itself is in the tree layer).
 *   wells         round brick parapet with a cement coping and apron, dark water, a pulley frame on most.
 *   hand pumps, haystacks / straw stacks, dung-cake stacks, washing lines: the game's own approved Blender models
 *                 (src/handPumps.js, haystacks.js, gobar.js, laundryLine.js), merged per material for the whole village.
 * Masonry merges per library material (brick, plaster, concrete, wood, rust): 5 draw calls; flag + name stone share one
 * painted-cloth canvas: 1; the models: 2 each at most.
 */
const CEMENT = 0xd7d2c4;
const PROP_M = LAND_QUALITY.propM;

function flagAndStoneCanvas() {
  const W = 1024, H = 512, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const paint = () => {
    const g = cv.getContext('2d');
    // left half: the flag, 3:2, sun-faded cotton (never a clean print), with a woven texture
    const fw = 512, fh = 341;
    const bands = ['#e8863a', '#f1ece0', '#2f7a3a'];
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * fh) / 3, fw, fh / 3 + 1); });
    g.strokeStyle = '#1f2f80'; g.lineWidth = 4;
    const cx = fw / 2, cy = fh / 2, r = fh / 6 - 6;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineWidth = 1.6; g.stroke(); }
    g.fillStyle = '#1f2f80'; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    for (let y = 0; y < fh; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + 0.03 * ((y * 7) % 3)})`; g.fillRect(0, y, fw, 1); }
    for (let x = 0; x < fw; x += 3) { g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(x, 0, 1, fh); }
    // right half: the name stone face, sandstone grey-buff with chisel grain, letters cut dark
    const sx = 512;
    g.fillStyle = '#cfc2a6'; g.fillRect(sx, 0, 512, 256);
    for (let i = 0; i < 900; i++) { const x = sx + ((i * 97) % 512), y = (i * 53) % 256; g.fillStyle = i % 3 ? 'rgba(90,75,55,0.06)' : 'rgba(255,250,235,0.06)'; g.fillRect(x, y, 2 + (i % 5), 1 + (i % 3)); }
    g.strokeStyle = 'rgba(80,65,45,0.5)'; g.lineWidth = 4; g.strokeRect(sx + 14, 14, 484, 228);
    g.fillStyle = '#3a2a1c'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = hiFont(84); g.fillText('अमराई खेड़ा', sx + 256, 128);
    g.font = enFont(46); g.fillText('Amrai Kheda', sx + 256, 200);
    tex.needsUpdate = true;
  };
  paint();
  if (typeof document !== 'undefined' && document.fonts) document.fonts.load('700 40px "Noto Sans Devanagari"').then(paint, paint);
  return tex;
}

/** Flag cloth material: the canvas, both sides, a slow wave in the vertex shader (hoist edge pinned). */
function flagMaterial(tex) {
  const m = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.92 });
  m.name = 's7_flag_stone';
  const uT = { value: 0 };
  m.onBeforeRender = () => { uT.value = performance.now() / 1000; };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlagT = uT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aWave; uniform float uFlagT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (aWave > 0.0) { float ph = uFlagT * 3.1 - aWave * 5.0; transformed.z += sin(ph) * 0.16 * aWave + sin(ph * 1.7 + 1.3) * 0.05 * aWave; transformed.y -= aWave * aWave * 0.08; }`);
  };
  m.customProgramCacheKey = () => 's7_flag_v1';
  return m;
}

function disc(P, mat, x, y, z, r, seg, color) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    P.quad(mat, [x, y, z], [x + Math.sin(a1) * r, y, z + Math.cos(a1) * r], [x + Math.sin(a0) * r, y, z + Math.cos(a0) * r], [x, y, z], [[0, 0], [Math.sin(a1) * r, Math.cos(a1) * r], [Math.sin(a0) * r, Math.cos(a0) * r], [0, 0]], color);
  }
}

function well(P, x, z, r, seed, tall = false) {
  const h = 0.9;
  P.cyl('concrete', x, 0, z, r + 0.6, r + 0.6, 0.08, { seg: 20, color: CEMENT }); // apron
  P.cyl('brick', x, 0.08, z, r, r, h - 0.08, { seg: 20, cap: false, color: 0xe6d8c8 });
  // coping ring: flat annulus of cement on top
  for (let i = 0; i < 20; i++) {
    const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2, ro = r + 0.04, ri = r - 0.34;
    const p = (a, rr) => [x + Math.sin(a) * rr, h + 0.06, z + Math.cos(a) * rr];
    P.quad('concrete', p(a0, ri), p(a0, ro), p(a1, ro), p(a1, ri), [[0, 0], [0.4, 0], [0.4, 0.3], [0, 0.3]], CEMENT);
  }
  disc(P, 'concrete', x, 0.12, z, r - 0.3, 20, 0x1e2420); // dark water far below reads as a near-black disc
  // inner face must face inward: re-add with reversed winding by a thin offset ring of quads
  for (let i = 0; i < 20; i++) {
    const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2, rr = r - 0.31;
    const p = (a, y) => [x + Math.sin(a) * rr, y, z + Math.cos(a) * rr];
    P.quad('brick', p(a1, 0.12), p(a0, 0.12), p(a0, h), p(a1, h), [[0, 0.1], [0.4, 0.1], [0.4, h / 1.2], [0, h / 1.2]], 0x6a5c50);
  }
  if (hash01(seed, 3) < 0.7 || tall) {
    // pulley frame: two brick pillars, an iron cross bar, a wheel, a rope and a bucket
    const ph = tall ? 2.6 : 2.0, ry = hash01(seed, 5) * Math.PI;
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const k of [-1, 1]) P.box('brick', x + k * (r + 0.1) * c, ph / 2, z - k * (r + 0.1) * s, 0.35, ph, 0.35, { ry, color: 0xe6d8c8 });
    const bar = new THREE.Matrix4().makeRotationY(ry).setPosition(x, ph - 0.15, z);
    P.box('rust', 0, 0, 0, (r + 0.1) * 2, 0.07, 0.07, { matrix: bar, color: 0x6a6866 });
    P.cyl('rust', 0, -0.03, 0, 0.18, 0.18, 0.06, { seg: 10, color: 0x5a5856, matrix: new THREE.Matrix4().makeRotationY(ry).setPosition(x, ph - 0.15, z).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)) });
    P.box('wood', 0, -0.9, 0.15, 0.015, 1.5, 0.015, { matrix: bar, color: 0xa08a5a });
    P.cyl('rust', x + 0.15 * s, 1.0, z + 0.15 * c, 0.16, 0.13, 0.28, { seg: 10, color: 0x9a9690 });
  }
}

export async function build(map) {
  const P = new Parts({ brick: 1.2, plaster: 1.5, concrete: 1.0, wood: 1.0, rust: 1.0 });
  const group = new THREE.Group();
  group.name = 's7_props';
  const colliders = [];
  const report = { flagIsland: false, peepalPlatform: false, wells: 0, pumps: 0, washingLines: 0, haystacks: 0, dungStacks: 0 };
  const pumps = [], hay = [], gobar = [], lines = [];
  const flagGeos = [];
  const tex = flagAndStoneCanvas();
  const heightPads = [];

  let sliceT = performance.now(); // 26 Nov: 1600+ map objects scanned in one task; yield to the main thread every ~8 ms
  for (const o of map.objects) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    const key = labelKey(o), name = labelName(o), ring = o.rings?.[0];
    if (!ring || o.kind !== 'solids') continue;
    const c = ringCentre(ring), r = ringRadius(ring);
    if (key === 'new_island') {
      if (name.startsWith('Raised platform')) {
        // island: brick-faced drum, cement coping, earth bed with grass (painted by the bed colour), kerb stones
        P.cyl('brick', c.x, 0, c.z, r, r, 0.55, { seg: 40, cap: false, color: 0xe6d8c8 });
        for (let i = 0; i < 40; i++) {
          const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2;
          const p = (a, rr, y) => [c.x + Math.sin(a) * rr, y, c.z + Math.cos(a) * rr];
          P.quad('concrete', p(a0, r - 0.3, 0.6), p(a0, r + 0.05, 0.6), p(a1, r + 0.05, 0.6), p(a1, r - 0.3, 0.6), [[0, 0], [0.35, 0], [0.35, 0.3], [0, 0.3]], CEMENT);
          P.quad('concrete', p(a0, r + 0.05, 0.55), p(a1, r + 0.05, 0.55), p(a1, r + 0.05, 0.6), p(a0, r + 0.05, 0.6), [[0, 0], [0.3, 0], [0.3, 0.05], [0, 0.05]], CEMENT);
        }
        disc(P, 'concrete', c.x, 0.57, c.z, r - 0.28, 40, 0x6a7a3a); // grassed bed inside the coping
        colliders.push(...orientedBoxes(c.x, c.z, 0, r * 1.7, r * 1.7));
        heightPads.push({ x: c.x, z: c.z, r, y: 0.6 });
        report.flagIsland = true;
      } else if (name === 'Flag pedestal') {
        for (let k = 0; k < 3; k++) { const rr = r - k * 0.3, y0 = 0.6 + k * 0.2; P.box('plaster', c.x, y0 + 0.1, c.z, rr * 1.6, 0.2, rr * 1.6, { color: k === 2 ? 0xf2eee4 : 0xe8e2d4 }); }
      } else if (name.startsWith('Flag pole')) {
        P.cyl('plaster', c.x, 1.2, c.z, 0.07, 0.045, (o.y1 || 9) - 1.2, { seg: 10, color: 0xf4f2ec });
        P.cyl('rust', c.x, (o.y1 || 9), c.z, 0.08, 0.0, 0.12, { seg: 8, color: 0xc9a84a }); // finial
        // the flag: 2.4 x 1.6 m, hoisted at the top, subdivided so it can wave
        const fw = 2.4, fh = 1.6, top = (o.y1 || 9) - 0.25;
        const g = new THREE.PlaneGeometry(fw, fh, 12, 4).translate(fw / 2 + 0.06, top - fh / 2, 0);
        const uv = g.attributes.uv, p = g.attributes.position, wave = new Float32Array(p.count);
        for (let i = 0; i < uv.count; i++) { uv.setXY(i, uv.getX(i) * 0.5, 1 - (1 - uv.getY(i)) * (341 / 512)); wave[i] = (p.getX(i) - 0.06) / fw; }
        g.setAttribute('aWave', new THREE.BufferAttribute(wave, 1));
        g.rotateY(-0.35).translate(c.x, 0, c.z);
        flagGeos.push(g);
      } else if (name.startsWith('Village name stone')) {
        const rect = ringRect(ring, [0, 1]);
        const sw = rect.width, sd = Math.max(0.3, rect.depth), sh = (o.y1 || 1.8) - 0.6;
        // plinth on the island, then the stone slab with the cut face toward the approach (+z, toward the bazaar)
        P.box('concrete', c.x, 0.6 + 0.1, c.z, sw + 0.3, 0.2, sd + 0.3, { color: OLD() });
        P.box('concrete', c.x, 0.8 + sh / 2, c.z, sw, sh, sd, { color: 0xd8ccb2 });
        const face = new THREE.PlaneGeometry(sw - 0.06, sh - 0.08);
        const uv = face.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + uv.getX(i) * 0.5, 0.5 + uv.getY(i) * 0.5);
        face.setAttribute('aWave', new THREE.BufferAttribute(new Float32Array(uv.count), 1));
        face.translate(c.x, 0.8 + sh / 2, c.z + sd / 2 + 0.006);
        flagGeos.push(face);
      }
    } else if (key === 'new_peepal' && name.startsWith('Raised platform')) {
      // chabutra: plastered round platform, a step all round, cement top
      P.cyl('brick', c.x, 0, c.z, r + 0.35, r + 0.35, 0.22, { seg: 28, color: 0xe6d8c8 }); // exposed brick step
      P.cyl('plaster', c.x, 0.22, c.z, r, r, 0.38, { seg: 28, color: 0xece4d4 });
      P.cyl('concrete', c.x, 0.6, c.z, r + 0.04, r + 0.04, 0.04, { seg: 28, color: CEMENT });
      colliders.push(...orientedBoxes(c.x, c.z, 0, r * 1.5, r * 1.5));
      heightPads.push({ x: c.x, z: c.z, r: r + 0.35, y: 0.62 });
      report.peepalPlatform = true;
    } else if ((key === 'new_Well' || key === 'new_well' || key === 'new_Old well') && /well/i.test(name)) {
      well(P, c.x, c.z, Math.min(r, 1.6), c.x + c.z, key === 'new_Old well');
      colliders.push(...orientedBoxes(c.x, c.z, 0, r * 1.7, r * 1.7));
      report.wells++;
    } else if (key === 'new_Hand pump') {
      pumps.push({ type: ['mark2', 'old', 'mark2', 'cracked'][Math.floor(hash01(c.x, c.z) * 4)], x: c.x, y: 0, z: c.z, ry: hash01(c.z, c.x) * Math.PI * 2, s: 1 });
      colliders.push(...orientedBoxes(c.x, c.z, 0, 0.7, 0.7));
      report.pumps++;
    } else if (key === 'new_Washing line') {
      const rect = ringRect(ring);
      const dir = [-rect.front[1], rect.front[0]]; // along the long side
      lines.push({ x: c.x, z: c.z, ry: Math.atan2(-dir[1], dir[0]), seed: Math.floor(hash01(c.x, c.z) * 97) });
      report.washingLines++;
    } else if (key === 'new_Haystack' || (key === 'new_straw' && name !== 'Dung cake stack')) {
      const s = (r * 2) / 4.2;
      hay.push({ type: name === 'Straw store' ? 'half' : hash01(c.x, c.z) < 0.5 ? 'cone' : 'heap', x: c.x, y: 0, z: c.z, ry: hash01(c.z, 1) * 6.28, s, tint: null });
      colliders.push(...orientedBoxes(c.x, c.z, 0, r * 1.5, r * 1.5));
      report.haystacks++;
    } else if (key === 'new_Dung cakes' || (key === 'new_straw' && name === 'Dung cake stack')) {
      gobar.push({ type: hash01(c.x, c.z) < 0.5 ? 'stack' : 'stack_b', x: c.x, y: 0, z: c.z, ry: hash01(c.z, 2) * 6.28, s: (r * 2) / 2.6 });
      colliders.push(...orientedBoxes(c.x, c.z, 0, r * 1.3, r * 1.3));
      report.dungStacks++;
    }
  }

  const parts = P.build();
  for (const mat in parts) {
    const m = new THREE.Mesh(parts[mat], landMaterial(mat));
    m.name = `s7_props_${mat}`;
    m.receiveShadow = true;
    m.userData.noAutoCollider = true;
    group.add(m);
  }
  if (flagGeos.length) {
    const fm = new THREE.Mesh(mergeGeometries(flagGeos.map((g) => { g.deleteAttribute('normal'); g.computeVertexNormals(); return g; })), flagMaterial(tex));
    fm.name = 's7_flag_and_stone';
    fm.userData.noAutoCollider = true;
    group.add(fm);
  }
  const holder = group.children.find((c) => c.isMesh);
  if (holder) holder.userData.colliderBoxes = colliders;

  // the approved Blender models: each type is built once at the origin through its own module, then instanced per material
  // and drawn only within PROP_M of the camera (the models carry 3-7k triangles each: merging all of them cost 240k)
  const instance = async (name, build, items) => {
    const tmp = new THREE.Group();
    await build(tmp);
    const parts = [];
    tmp.traverse((m) => { if (m.isMesh) parts.push(m); });
    for (const part of parts) {
      const lod = createChunkedLOD({
        near: { geometry: part.geometry, material: part.material }, far: null,
        items: items.map((it) => ({ x: it.x, z: it.z, y: it.y || 0, ry: it.ry || 0, sx: it.s || 1, sy: it.s || 1, sz: it.s || 1 })),
        chunkSize: 150, switchDistance: PROP_M, castShadow: false, name: `${name}_${part.material.name || 'part'}`,
      });
      lod.traverse((o) => { if (o.isMesh) o.userData.noAutoCollider = true; }); // explicit boxes below
      group.add(lod);
    }
  };
  const byType = (list) => { const m = new Map(); for (const it of list) { if (!m.has(it.type)) m.set(it.type, []); m.get(it.type).push(it); } return m; };
  const loads = [];
  for (const [type, items] of byType(pumps)) loads.push(instance(`s7_pump_${type}`, (g) => addHandPumps(g, [{ type, x: 0, y: 0, z: 0 }]), items));
  for (const [type, items] of byType(hay)) loads.push(instance(`s7_hay_${type}`, (g) => addHaystacks(g, [{ type, x: 0, y: 0, z: 0 }]), items));
  for (const [type, items] of byType(gobar)) loads.push(instance(`s7_gobar_${type}`, (g) => addGobar(g, [{ type, x: 0, y: 0, z: 0 }]), items));
  for (const v of [0, 1]) { const items = lines.filter((_, i) => i % 2 === v); if (items.length) loads.push(instance(`s7_line_${v}`, (g) => addLaundryLine(g, { x: 0, z: 0, ry: 0, seed: 11 + v * 37 }), items)); }
  await Promise.all(loads);
  group.traverse((o) => { if (o.isMesh) o.userData.noAutoCollider = true; });

  group.userData.heightAt = (x, z) => { for (const p of heightPads) if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return p.y; return 0; };
  group.userData.report = report;
  return group;
}

function OLD() { return 0xb5ae9e; }
