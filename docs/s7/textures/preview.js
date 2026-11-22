import * as THREE from 'three';
import { createRenderer } from '/src/renderer.js';
import { createScene, createGround, createSun, loadEnvironment } from '/src/scene.js';
import { getActiveAtmosphere } from '/src/atmosphere.js';
import { buildTinRoofPanel, buildThatchRoofPanel, buildMudDungWall, buildJuteWeavePanel } from '/src/kit/materialsGeo.js';

/**
 * Stand-alone board for the 4 geometry-based material fixes (S7 textures agent). Not part of
 * the game build. window.__ready resolves once built; window.__snap()/window.__dbg mirror the
 * other S7 preview pages (docs/s7/shops-land/preview.html) for shoot.mjs to drive.
 */
async function run() {
  const canvas = document.getElementById('scene');
  const renderer = createRenderer(canvas, false);
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const scene = createScene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.1, 8.5);
  camera.lookAt(0, 1.3, 0);
  const env = loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_512.hdr').catch((e) => console.error('env', e));
  renderer.toneMappingExposure = 0.85; // QA board only — brighter than the game's 0.55 so the structure reads clearly in a screenshot

  const ground = createGround({ grassTint: 0x7b8a4a, grassCoverage: 0.3 });
  scene.add(ground);
  const sun = createSun(false, getActiveAtmosphere());
  scene.add(sun, sun.target, new THREE.HemisphereLight(0x6f96c2, 0x8a6a45, 1.1));
  scene.add(new THREE.DirectionalLight(0xfff2de, 0.4).translateX(-10).translateY(6).translateZ(4));

  const tin = buildTinRoofPanel(2.0, 1.6, { seed: 1 });
  tin.rotation.x = -0.35; // roughly a roof pitch, viewed from below-ish
  tin.position.set(-3.3, 1.7, 0);
  scene.add(tin);

  const thatch = buildThatchRoofPanel(1.8, 1.6, { seed: 2 });
  thatch.rotation.x = -0.35;
  thatch.position.set(-1.1, 1.7, 0);
  scene.add(thatch);

  const mud = buildMudDungWall(1.6, 1.6, { seed: 3, pattyCount: 2 });
  mud.position.set(1.1, 1.0, 0);
  scene.add(mud);

  const jute = buildJuteWeavePanel(1.0, 1.4, { seed: 4 });
  jute.position.set(3.0, 1.0, 0.3);
  scene.add(jute);

  await env;
  window.__dbg = { camera, scene, renderer };
  window.__snap = () => renderer.render(scene, camera);
  renderer.render(scene, camera);
  window.__ready = true;
}
run().catch((e) => { window.__error = String(e && e.stack || e); console.error(e); });
