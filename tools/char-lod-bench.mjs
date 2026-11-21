#!/usr/bin/env node
/**
 * S7: CPU cost of the characters per frame, tiers on vs off, without a browser (the shared machine kills headless game
 * runs for memory). Uses the game's own src/characterAnim.js (idle/walk/gesture blending, neck fix, blink/smile) and
 * src/characterLOD.js on the real packed GLBs (dist/assets/models, textures stripped), and times one frame the way the
 * game does it: updateCharacterAnims(dt) + the tier pass + scene.updateMatrixWorld() (what three.js does before drawing).
 *
 * Scenes: "gather" = the 10-person cast at the square, camera 6 m away (?gather=1);
 *         "village40" = 40 characters (4 of each file) spread over 300 x 300 m, a quarter of them walking, camera in the middle.
 * Run once per setting (the tier hook is global): node tools/char-lod-bench.mjs [--scene gather|village40] [--off] [--profile full|light] [--anim tmp/characterAnim.patched.js]
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { noTextures } from './char-verify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const OFF = a.includes('--off');
const PROFILE = get('--profile', 'full'); // a quality preset name from src/edition.js
const DIR = resolve(ROOT, get('--dir', 'dist/assets/models'));

let rafFn = null;
globalThis.requestAnimationFrame = (f) => { rafFn = f; };
globalThis.window = { location: { search: OFF ? '?charlod=0' : '' } };
// --anim <file>: try a changed characterAnim.js (e.g. the 'Wiring needed' version) without touching src/
const { attachCharacterAnim, updateCharacterAnims } = await import(get('--anim', null) ? resolve(ROOT, get('--anim')) : '../src/characterAnim.js');
const { initCharacterLOD } = await import('../src/characterLOD.js');

const FILES = ['maa', 'dadi', 'pitaji', 'sarpanch', 'dada', 'postman', 'sister', 'brother', 'teacher', 'parlour_didi'];
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const src = {};
for (const f of FILES) src[f] = await loader.parseAsync(noTextures(readFileSync(`${DIR}/${f}.glb`)), '');

function bench(label, layout, camPos) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 500);
  camera.position.set(...camPos); camera.lookAt(camPos[0], 1, camPos[2] - 10); scene.add(camera);
  const walkers = [];
  for (const [f, x, z, walking] of layout) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const m = skClone(src[f].scene); g.add(m);
    attachCharacterAnim(m, src[f].animations, g, f === 'parlour_didi' ? 'didi' : f);
    if (walking) walkers.push({ g, dir: Math.random() * Math.PI * 2 });
  }
  scene.updateMatrixWorld(true);
  initCharacterLOD({ camera, quality: PROFILE }); // once per process; later scenes reuse it with the new camera below
  const dt = 1 / 60, N = 600;
  const part = { anim: [], tiers: [], matrices: [] };
  const step = (rec) => {
    for (const w of walkers) { w.g.position.x += Math.cos(w.dir) * 1.1 * dt; w.g.position.z += Math.sin(w.dir) * 1.1 * dt; w.g.rotation.y = Math.PI / 2 - w.dir; }
    const t0 = performance.now();
    updateCharacterAnims(dt);
    const t1 = performance.now();
    if (rafFn) rafFn(performance.now());
    const t2 = performance.now();
    scene.updateMatrixWorld();
    const t3 = performance.now();
    if (rec) { part.anim.push(t1 - t0); part.tiers.push(t2 - t1); part.matrices.push(t3 - t2); }
  };
  for (let i = 0; i < 120; i++) step(); // warm up (tiers settle, JIT)
  const t = [];
  for (let i = 0; i < N; i++) { const t0 = performance.now(); step(true); t.push(performance.now() - t0); }
  t.sort((p, q) => p - q);
  const mean = t.reduce((s, v) => s + v, 0) / N;
  const med = (l) => +l.sort((p, q) => p - q)[Math.floor(l.length / 2)].toFixed(3);
  const tiers = globalThis.window.__charLOD ? { ...globalThis.window.__charLOD.stats } : null;
  const r = { label, anim: get('--anim', 'src/characterAnim.js'), characters: layout.length, tiersOn: !OFF, profile: PROFILE, medianMs: med(t.slice()), meanMs: +mean.toFixed(3), parts: { animMs: med(part.anim), tiersMs: med(part.tiers), matricesMs: med(part.matrices) }, p95Ms: +t[Math.floor(N * 0.95)].toFixed(3), tiers: tiers && { full: tiers.full, mid: tiers.mid, paused: tiers.paused, hidden: tiers.hidden } };
  console.log(JSON.stringify(r));
  return scene;
}

const scenario = get('--scene', 'gather');
if (scenario === 'gather') {
  // the cast in small groups round a 10 m square, camera 6 m back (like ?gather=1)
  const layout = FILES.map((f, i) => [f, (i % 5) * 1.6 - 3.2, -Math.floor(i / 5) * 1.6, f === 'postman' || f === 'sister' || f === 'brother']);
  bench('gather (10 at the square)', layout, [0, 1.7, 6]);
} else {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const layout = [];
  for (let i = 0; i < 40; i++) layout.push([FILES[i % 10], (rnd() - 0.5) * 300, (rnd() - 0.5) * 300, i % 4 === 0]);
  bench('village40 (40 over 300 x 300 m)', layout, [0, 1.7, 0]);
}
