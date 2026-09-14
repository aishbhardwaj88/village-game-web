import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog, GROUND_SIZE } from './scene.js';
import { createPlayer, ThirdPersonCamera } from './player.js';
import { InputController, isTouchDevice } from './controls.js';
import { createComposer, resizeComposer } from './postfx.js';
import { setupFpsCounter, setupStartOverlay, isDevMode } from './ui.js';
import { createSky, SKY_HORIZON_COLOR } from './sky.js';

const GROUND_HALF_EXTENT = GROUND_SIZE / 2 - 2; // keep the player a couple metres inside the ground
const MOVE_SPEED = 4.2; // m/s, walking pace

async function main() {
  const canvas = document.getElementById('scene');
  const renderer = createRenderer(canvas);

  const scene = createScene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

  const ground = createGround();
  scene.add(ground);

  const sun = createSun();
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x445577, 0.15));

  const sky = createSky(sun.position);
  scene.add(sky);
  applyFog(scene, SKY_HORIZON_COLOR.getHex());

  const player = createPlayer();
  scene.add(player);

  const camRig = new ThirdPersonCamera(camera, player);
  camRig.update();

  const touch = isTouchDevice();
  const input = new InputController(canvas);

  const enableBloom = !touch;
  const composer = createComposer(renderer, scene, camera, { enableBloom });

  const fps = setupFpsCounter();

  // HDRI lighting (IBL) loads async; scene renders as soon as ground/sun/sky are up.
  loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_1k.hdr').catch((err) =>
    console.error('Failed to load environment HDRI', err)
  );

  function onResize() {
    resizeRendererToDisplaySize(renderer, camera);
    resizeComposer(composer, window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);
  onResize();

  canvas.addEventListener('click', () => input.requestPointerLock?.());

  let started = false;
  setupStartOverlay({
    isTouch: touch,
    onStart: () => {
      started = true;
      if (!touch) input.requestPointerLock();
    },
  });

  // renderer.info is reset on every internal renderer.render() call; the composer
  // makes several per frame (RenderPass, EffectPass), so auto-reset would leave only
  // the last pass's (a full-screen triangle) stats. Reset once per frame ourselves.
  renderer.info.autoReset = false;

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const moveDir = new THREE.Vector3();
  let lastTime = performance.now();

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (started) {
      input.update();
      const { yaw, pitch } = input.consumeLookDelta();
      camRig.addYawPitch(yaw, pitch);

      forward.set(-Math.sin(camRig.yaw), 0, -Math.cos(camRig.yaw));
      right.set(Math.cos(camRig.yaw), 0, -Math.sin(camRig.yaw));

      moveDir.set(0, 0, 0);
      moveDir.addScaledVector(forward, -input.moveZ);
      moveDir.addScaledVector(right, input.moveX);
      if (moveDir.lengthSq() > 1) moveDir.normalize();

      player.position.addScaledVector(moveDir, MOVE_SPEED * dt);
      player.position.x = THREE.MathUtils.clamp(player.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);

      camRig.update();
    }

    renderer.info.reset();
    composer.render();
    fps.update(now);
  }
  requestAnimationFrame(tick);

  if (isDevMode()) {
    window.__dopahar = { scene, renderer, composer, camera, player, camRig };
  }
}

main();
