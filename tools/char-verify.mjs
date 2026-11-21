#!/usr/bin/env node
/**
 * S7: numeric proof that the slim characters (tools/char-diet.mjs) move exactly like the originals.
 * Loads original and slim GLB with the game's own three.js GLTFLoader + MeshoptDecoder (textures stripped from the
 * JSON so no browser is needed; the binary data is untouched), then for every clip, at 12 moments through the clip:
 *   - world position of every bone (by name), original vs slim  -> max drift in mm
 *   - the fully skinned body's bounding box (every vertex, CPU skinning) -> max difference in mm
 * and for every face mesh: blink and smile at full strength, how many vertices move and how far (orig vs slim).
 *
 * Usage: node tools/char-verify.mjs [--orig public/assets/models] [--slim dist/assets/models] [--json out.json]
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRiggedGlb } from './char-diet.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const ORIG = resolve(ROOT, get('--orig', 'public/assets/models'));
const SLIM = resolve(ROOT, get('--slim', 'dist/assets/models'));

/** GLB -> ArrayBuffer with images/textures removed from the JSON (BIN chunk untouched). */
function noTextures(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  delete j.images; delete j.textures; delete j.samplers;
  for (const m of j.materials || []) {
    if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; }
    delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture;
  }
  j.extensionsUsed = (j.extensionsUsed || []).filter((e) => !/texture_webp|texture_basisu|texture_avif/i.test(e));
  j.extensionsRequired = (j.extensionsRequired || []).filter((e) => !/texture_webp|texture_basisu|texture_avif/i.test(e));
  let js = Buffer.from(JSON.stringify(j), 'utf8');
  const pad = (4 - (js.length % 4)) % 4;
  js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
  const rest = buf.subarray(20 + jsonLen);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + js.length + rest.length, 8);
  head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  const out = Buffer.concat([head, js, rest]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

async function load(file) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader.parseAsync(noTextures(readFileSync(file)), '');
}

function bones(root) { const m = new Map(); root.traverse((o) => { if (o.isBone) m.set(o.name, o); }); return m; }
function skinned(root) { const l = []; root.traverse((o) => { if (o.isSkinnedMesh) l.push(o); }); return l; }
function posedBox(root) {
  const b = new THREE.Box3();
  for (const m of skinned(root)) { m.computeBoundingBox(); b.union(m.boundingBox.clone().applyMatrix4(m.matrixWorld)); }
  return b;
}
function boxDiff(a, b) { return Math.max(...['x', 'y', 'z'].flatMap((k) => [Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k])])); }

/** For a morph by name on every face mesh: vertices that move > 0.1 mm, largest move, total move (metres). */
function morphStats(root, name) {
  let moved = 0, max = 0, sum = 0;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
  for (const m of skinned(root)) {
    const i = m.morphTargetDictionary && m.morphTargetDictionary[name];
    if (i === undefined) continue;
    const n = m.geometry.attributes.position.count;
    const idx = m.geometry.index ? new Set(m.geometry.index.array) : null; // only vertices a triangle uses
    m.morphTargetInfluences.fill(0);
    for (let v = 0; v < n; v++) {
      if (idx && !idx.has(v)) continue;
      m.morphTargetInfluences[i] = 0; m.getVertexPosition(v, p0);
      m.morphTargetInfluences[i] = 1; m.getVertexPosition(v, p1);
      const d = p0.distanceTo(p1);
      if (d > 1e-4) { moved++; sum += d; if (d > max) max = d; }
    }
    m.morphTargetInfluences.fill(0);
  }
  return { moved, max, sum };
}

const files = readdirSync(ORIG).filter((f) => f.endsWith('.glb')).map((f) => join(ORIG, f)).filter(isRiggedGlb);
const results = [];
let fail = 0;
for (const f of files) {
  const name = basename(f, '.glb');
  const s = join(SLIM, `${name}.glb`);
  if (!existsSync(s)) { console.log(`${name}: no slim copy at ${s}`); fail++; continue; }
  const [go, gs] = [await load(f), await load(s)];
  const [ro, rs] = [go.scene, gs.scene];
  const height = posedBox(ro).getSize(new THREE.Vector3()).y;
  const scale = 1 / height; // the game scales every character to its own height; report drift at real size (1.0 = per metre of height)
  const clipsO = go.animations.map((c) => c.name), clipsS = gs.animations.map((c) => c.name);
  const sameClips = clipsO.join('|') === clipsS.join('|');
  const bo = bones(ro), bs = bones(rs);
  const sameBones = bo.size === bs.size && [...bo.keys()].every((k) => bs.has(k));
  const mo = new THREE.AnimationMixer(ro), ms = new THREE.AnimationMixer(rs);
  let boneDrift = 0, skinDrift = 0, worst = '';
  const pa = new THREE.Vector3(), pb = new THREE.Vector3();
  for (const clip of go.animations) {
    const cs = gs.animations.find((c) => c.name === clip.name);
    if (!cs) continue;
    mo.stopAllAction(); ms.stopAllAction();
    mo.clipAction(clip).play(); ms.clipAction(cs).play();
    for (let k = 0; k < 12; k++) {
      const t = (clip.duration * k) / 12;
      mo.setTime(t); ms.setTime(t);
      ro.updateMatrixWorld(true); rs.updateMatrixWorld(true);
      for (const [n, b] of bo) { const b2 = bs.get(n); if (!b2) continue; const d = b.getWorldPosition(pa).distanceTo(b2.getWorldPosition(pb)) * scale; if (d > boneDrift) { boneDrift = d; worst = `${n}@${clip.name}`; } }
      if (k % 4 === 0) skinDrift = Math.max(skinDrift, boxDiff(posedBox(ro), posedBox(rs)) * scale);
    }
  }
  mo.stopAllAction(); ms.stopAllAction(); ro.updateMatrixWorld(true); rs.updateMatrixWorld(true);
  const blink = [morphStats(ro, 'blink'), morphStats(rs, 'blink')];
  const smile = [morphStats(ro, 'smile'), morphStats(rs, 'smile')];
  const r = {
    name, height: +height.toFixed(3), clips: clipsS, sameClips, bones: bs.size, sameBones,
    boneDriftMm: +(boneDrift * 1000).toFixed(2), worstBone: worst, skinBoxDriftMm: +(skinDrift * 1000).toFixed(2),
    blink: { origVerts: blink[0].moved, slimVerts: blink[1].moved, origMaxMm: +(blink[0].max * scale * 1000).toFixed(2), slimMaxMm: +(blink[1].max * scale * 1000).toFixed(2) },
    smile: { origVerts: smile[0].moved, slimVerts: smile[1].moved, origMaxMm: +(smile[0].max * scale * 1000).toFixed(2), slimMaxMm: +(smile[1].max * scale * 1000).toFixed(2) },
  };
  // pass: same clips + bones, bones within 2 mm per metre of height, body box within 5 mm, blink moves ~the same verts
  const ok = sameClips && sameBones && r.boneDriftMm < 2 && r.skinBoxDriftMm < 5 && blink[1].moved > 0.9 * blink[0].moved && Math.abs(r.blink.slimMaxMm - r.blink.origMaxMm) < 1;
  r.ok = ok; if (!ok) fail++;
  results.push(r);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(14)} clips ${clipsS.length} [${clipsS.join(', ')}] bones ${bs.size}  bone drift ${r.boneDriftMm} mm (${worst})  body ${r.skinBoxDriftMm} mm  blink ${r.blink.origVerts}->${r.blink.slimVerts} verts, ${r.blink.origMaxMm}->${r.blink.slimMaxMm} mm  smile ${r.smile.origVerts}->${r.smile.slimVerts}`);
}
if (get('--json', null)) writeFileSync(resolve(ROOT, get('--json')), JSON.stringify(results, null, 2));
console.log(fail ? `char-verify: ${fail} problem(s)` : `char-verify: all ${results.length} characters match`);
process.exit(fail ? 1 : 0);
