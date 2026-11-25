/**
 * 25 Nov: character-only light. The village's scene.environment (camdeboo HDRI at 0.45, ACES, exposure 0.55) leaves Tripo
 * faces muddy. Rigged characters get their OWN environment map instead: a neutral studio room (RoomEnvironment, PMREM),
 * generated once and shared by every character material, with its own intensity. scene.environment, exposure and tone mapping
 * are untouched, so the village, buildings and ground look exactly as before. No per-frame cost (night.js calls
 * followSceneEnv() only when its mix changes, to dim the faces with the village at night).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const CHAR_ENV_INTENSITY = 1.0; // tuned 25 Nov against the compare scene's Studio light
const DAY_SCENE_ENV = 0.45; // scene.environmentIntensity by day (src/scene.js)
let renderer = null, env = null, scale = 1;
const mats = new Set();

function build() {
  if (env || !renderer) return;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  env = pmrem.fromScene(room, 0.04).texture;
  room.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();
  for (const m of mats) set(m);
}
function set(m) { m.envMap = env; m.envMapIntensity = CHAR_ENV_INTENSITY * scale; m.needsUpdate = true; }

export function setCharLightRenderer(r) { renderer = r; if (mats.size) build(); }
/** give one character material the shared studio environment (waits for the renderer if it is not there yet) */
export function applyCharLight(m) {
  if (!m || !m.isMeshStandardMaterial) return;
  mats.add(m);
  if (env) set(m); else build();
}
/** night: dim the character light with the village's own environment intensity */
export function followSceneEnv(sceneEnvIntensity) {
  const k = sceneEnvIntensity / DAY_SCENE_ENV;
  if (Math.abs(k - scale) < 1e-4) return; // night.js may call every frame: nothing to do while the mix is steady
  scale = k;
  if (env) for (const m of mats) m.envMapIntensity = CHAR_ENV_INTENSITY * scale;
}
