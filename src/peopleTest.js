import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, applyFog, loadEnvironment } from './scene.js';
import { createSky, updateSky } from './sky.js';
import { createComposer } from './postfx.js';
import { getActiveAtmosphere } from './atmosphere.js';
import { CHARACTER_BUILDERS, createHumanoidAnimator } from './characters.js';
import { isTouchDevice } from './controls.js';

/**
 * docs/FINISH_LINE.md Step 2 — a standalone test page (not linked from the
 * game) putting all 4 new code-built characters side by side on real village
 * ground, in the same afternoon light the game itself uses (same renderer
 * colour pipeline, sun/sky/fog preset, HDRI), so they can be judged against
 * Characters V1's reference art before any gets placed in the world.
 */

const canvas = document.getElementById('scene');
const isTouch = isTouchDevice();
const renderer = createRenderer(canvas, isTouch);

const scene = createScene();
const preset = getActiveAtmosphere();

const sun = createSun(isTouch, preset);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const sky = createSky(sun.position, preset);
scene.add(sky);
applyFog(scene, preset);

const ground = createGround();
scene.add(ground);

loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_1k.hdr').catch((err) => console.error('HDRI failed to load', err));

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 500);
const composer = createComposer(renderer, scene, camera, { enableBloom: !isTouch, enableGrain: true });

const CHARACTERS = [
  { key: 'maa', nameEn: 'Maa', nameHi: 'माँ' },
  { key: 'dada', nameEn: 'Dada', nameHi: 'दादा' },
  { key: 'postman', nameEn: 'Postman', nameHi: 'डाकिया' },
  { key: 'halwai', nameEn: 'Halwai', nameHi: 'हलवाई' },
];
const SPACING = 2.6;
const lineup = [];
const labelsEl = document.getElementById('labels');

CHARACTERS.forEach((c, i) => {
  const { root, bodyPivot } = CHARACTER_BUILDERS[c.key]();
  const x = (i - (CHARACTERS.length - 1) / 2) * SPACING;
  root.position.set(x, 0, 0);
  // Every build*() function places front-facing detail (face, pallu, mustache,
  // bag strap) at local +Z — so, unlike src/vehicles.js's "front = -Z"
  // convention, these characters already face +Z at rotation.y=0, matching
  // the camera's starting position on the +Z axis below with no extra turn.
  scene.add(root);

  const animate = createHumanoidAnimator(bodyPivot);
  const label = document.createElement('div');
  label.className = 'label';
  label.innerHTML = `<div class="en">${c.nameEn}</div><div class="hi">${c.nameHi}</div>`;
  labelsEl.appendChild(label);

  lineup.push({ root, animate, label, headPos: new THREE.Vector3(x, 1.65, 0) });
});

camera.position.set(0, 1.5, 7.5);
camera.lookAt(0, 1.0, 0);

let walking = false;
document.getElementById('toggle-btn').addEventListener('click', () => {
  walking = !walking;
});

resizeRendererToDisplaySize(renderer, camera, isTouch);
window.addEventListener('resize', () => resizeRendererToDisplaySize(renderer, camera, isTouch));

const clock = new THREE.Clock();
const _projected = new THREE.Vector3();

function updateLabels() {
  for (const entry of lineup) {
    _projected.copy(entry.headPos).project(camera);
    const x = (_projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (_projected.y * 0.5 + 0.5)) * window.innerHeight;
    entry.label.style.left = `${x}px`;
    entry.label.style.top = `${y}px`;
  }
}

let orbitAngle = 0;
let paused = false; // tmp/*.mjs diagnostics: freeze the orbit to point the camera manually
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateSky(sky, elapsed);

  if (!paused) {
    // Slow camera orbit around the whole lineup — shows front, 3/4 and back
    // naturally without needing to spin each character independently.
    orbitAngle += dt * 0.12;
    const radius = 8;
    camera.position.set(Math.sin(orbitAngle) * radius, 1.55, Math.cos(orbitAngle) * radius);
    camera.lookAt(0, 1.0, 0);
  }

  for (const entry of lineup) entry.animate(dt, walking);
  updateLabels();

  composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// tools/screenshot.js / a fresh Playwright check can read this to confirm the
// page actually finished setting up (same `window.__dopahar`-style pattern
// the main game exposes for scripted verification).
window.__peopleTest = {
  scene,
  camera,
  renderer,
  setWalking: (v) => {
    walking = !!v;
  },
  setOrbitAngle: (a) => {
    orbitAngle = a;
  },
  setPaused: (v) => {
    paused = !!v;
  },
  characters: lineup,
};
