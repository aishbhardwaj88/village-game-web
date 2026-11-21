// Houses kit preview (S7 sprint, houses agent). Dev only, not in the build: the game's own renderer, sky, sun, HDRI, fog and
// post-processing around the house kit, for the review shots in docs/s7/houses/*.png (shot by docs/s7/houses/shoot.mjs).
//   ?mode=design&d=A[&w=6.5&dd=8&mirror=1]   one design
//   ?mode=gali&view=eye|above                two facing rows across a 4 m gali (plus the back-to-back rows behind)
//   &shadows=1                               sun shadows on (the game ships with them off; ?shadows=follow in the game)
import * as THREE from 'three';
import { createRenderer } from '../../../src/renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog } from '../../../src/scene.js';
import { createSky } from '../../../src/sky.js';
import { createComposer } from '../../../src/postfx.js';
import { getActiveAtmosphere } from '../../../src/atmosphere.js';
import { buildStripSegment } from '../../../src/paths.js';
import { houseMaterialReady } from '../../../src/kit/housesMaterial.js';
import { buildHouseBatch, WASHES } from '../../../src/kit/houses.js';
import { DESIGN_INFO } from '../../../src/kit/housesKit.js';

const qs = new URLSearchParams(location.search);
const mode = qs.get('mode') || 'design';
const shadows = qs.get('shadows') === '1';
const W = window.innerWidth, H = window.innerHeight;

const canvas = document.getElementById('scene');
const renderer = createRenderer(canvas, false);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = shadows;
const scene = createScene();
const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500);
const atmosphere = getActiveAtmosphere();
const ground = createGround({ grassTint: 0x7b8a4a, grassCoverage: 0.7 });
scene.add(ground);
const sun = createSun(false, atmosphere);
sun.castShadow = shadows;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x6f96c2, 0x8a6a45, 0.9));
const bounce = new THREE.DirectionalLight(0xffe2b8, 0.55);
bounce.position.set(-20, 14, -60);
scene.add(bounce);
scene.add(createSky(sun.position, atmosphere));
applyFog(scene, atmosphere);
const composer = createComposer(renderer, scene, camera, { enableBloom: true, enableGrain: true });

const h = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const entries = [];
let look = null;
if (mode === 'design') {
  const d = qs.get('d') || 'A';
  const w = +(qs.get('w') || 6.5), dd = +(qs.get('dd') || 8);
  entries.push({ i: 1, x: 0, z: 0, ry: 0, design: d, mirror: qs.get('mirror') === '1', cw: w, cd: dd, sx: 1, sz: 1, wash: +(qs.get('wash') || 1), seed: 0.37, kachcha: DESIGN_INFO[d].kachcha, w, d: dd });
  scene.add(buildStripSegment(new THREE.Vector3(-14, 0, dd / 2 + 2), new THREE.Vector3(14, 0, dd / 2 + 2), 4, { seed: 3, tint: 0xb9a37c }));
  const tall = DESIGN_INFO[d].storeys > 1;
  look = { pos: [w * 0.85, tall ? 2.4 : 1.75, dd / 2 + (tall ? 10.5 : 7.8)], target: [0, tall ? 3.4 : 2.0, 0] };
} else {
  // two facing rows across a 4 m gali (z -2..2), and the rows behind them back to back, with the next galis beyond
  const order = ['A', 'C', 'B', 'E', 'A', 'D', 'F', 'C', 'A', 'B', 'G', 'H', 'E', 'D', 'A', 'C', 'F', 'B'];
  const rows = [{ z: -2, front: 1 }, { z: 2, front: -1 }, { z: -18, front: -1 }, { z: 18, front: 1 }];
  let n = 0;
  rows.forEach((r, ri) => {
    let x = -34 + (ri % 2) * 1.7;
    let k = ri * 5;
    while (x < 30) {
      const w = [6.5, 5.5, 7.5, 6.5, 5.5][(k * 3 + ri) % 5], dd = 8;
      const design = order[(k + ri * 7) % order.length];
      const cz = r.z + (r.front > 0 ? -dd / 2 : dd / 2);
      const e = { i: ++n, x: x + w / 2, z: cz, ry: r.front > 0 ? 0 : Math.PI, design, mirror: h(n * 3) < 0.5, cw: w, cd: dd, sx: 1, sz: 1, wash: Math.floor(h(n * 7.7) * WASHES.length), seed: h(n * 1.3), kachcha: DESIGN_INFO[design].kachcha, w, d: dd };
      const prev = entries[entries.length - 1];
      if (prev && prev.wash === e.wash) e.wash = (e.wash + 3) % WASHES.length;
      entries.push(e);
      x += w; k++;
    }
  });
  for (const z of [0, -20, 20]) scene.add(buildStripSegment(new THREE.Vector3(-40, 0, z), new THREE.Vector3(36, 0, z), 4, { seed: 5 + z, tint: 0xb9a37c }));
  look = qs.get('view') === 'above' ? { pos: [-26, 30, 34], target: [2, 0, -2] } : { pos: [-20, 1.6, 0.6], target: [12, 2.3, -0.4] };
}

const built = buildHouseBatch(entries, { withFar: mode === 'gali', clutterDist: 60, nearDist: qs.get('view') === 'above' ? 200 : 45 });
scene.add(built.group);
camera.position.set(...look.pos);
camera.lookAt(new THREE.Vector3(...look.target));
built.update(camera.position.x, camera.position.z, true);
if (shadows) { sun.position.add(new THREE.Vector3(...look.target)); sun.target.position.set(...look.target); }

Promise.all([houseMaterialReady(), loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_512.hdr')]).then(() => {
  let frames = 0;
  const tick = () => {
    composer.render();
    if (++frames === 4) {
      renderer.info.autoReset = false;
      renderer.info.reset();
      renderer.render(scene, camera);
      window.__houseStats = { ...built.stats, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      composer.render();
      window.__ready = true;
    }
    if (frames < 6) requestAnimationFrame(tick);
  };
  tick();
});
