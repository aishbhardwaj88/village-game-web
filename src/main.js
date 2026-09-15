import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog, GROUND_SIZE } from './scene.js';
import { createPlayer, ThirdPersonCamera, CAMERA_DISTANCE, CAMERA_HEIGHT } from './player.js';
import { InputController, isTouchDevice } from './controls.js';
import { createComposer, resizeComposer } from './postfx.js';
import { setupFpsCounter, setupStartOverlay, setupLoadingScreen, isDevMode } from './ui.js';
import { createSky, SKY_HORIZON_COLOR } from './sky.js';
import { buildHeroZone } from './village.js';
import { buildField } from './field.js';
import { spawnVehicles } from './vehicles.js';
import { AudioEngine } from './audio.js';
import { buildBackgroundHouses, buildLaneTrees } from './scenery.js';

const GROUND_HALF_EXTENT = GROUND_SIZE / 2 - 2; // keep the player a couple metres inside the ground
const MOVE_SPEED = 4.2; // m/s, walking pace

async function main() {
  setupLoadingScreen(); // before any texture/model/HDRI load below — see ui.js

  const canvas = document.getElementById('scene');
  const renderer = createRenderer(canvas);

  const scene = createScene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

  const ground = createGround();
  scene.add(ground);

  const sun = createSun();
  scene.add(sun);
  // Fill light for shadow-side surfaces: cool sky above, warm ground-bounce below.
  // Needed because scene.environmentIntensity is kept low (see scene.js) to tame the
  // HDRI's very hot sun disk in specular reflections — that also dims the HDRI's own
  // diffuse IBL fill, so this hemisphere light replaces it explicitly.
  scene.add(new THREE.HemisphereLight(0x6f96c2, 0x8a6a45, 0.9));

  const sky = createSky(sun.position);
  scene.add(sky);
  applyFog(scene, SKY_HORIZON_COLOR.getHex());

  buildHeroZone(scene);
  buildField(scene);
  buildBackgroundHouses(scene);
  buildLaneTrees(scene);
  const vehicles = spawnVehicles(scene);

  const player = createPlayer();
  player.position.set(-48, 0, 25); // spawn just south of the house compound, facing it
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

  const audio = new AudioEngine();
  let started = false;
  setupStartOverlay({
    isTouch: touch,
    onStart: () => {
      started = true;
      audio.start(); // must happen inside this gesture handler to unlock on iOS/Safari
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

  const interactHint = document.getElementById('interact-hint');
  let mountedVehicle = null;

  function nearestMountable() {
    let nearest = null;
    let nearestDist = Infinity;
    for (const v of vehicles) {
      const d = player.position.distanceTo(v.position);
      if (d < v.preset.mountRadius && d < nearestDist) {
        nearest = v;
        nearestDist = d;
      }
    }
    return nearest;
  }

  function mount(vehicle) {
    mountedVehicle = vehicle;
    player.visible = false;
    camRig.target = vehicle.group;
    camRig.distance = vehicle.preset.cameraDistance;
    camRig.height = vehicle.preset.cameraHeight;
  }

  function dismount() {
    const v = mountedVehicle;
    const besideOffset = new THREE.Vector3(v.preset.body.w / 2 + 1.3, 0, 0);
    besideOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), v.group.rotation.y);
    player.position.copy(v.group.position).add(besideOffset);
    player.visible = true;
    camRig.target = player;
    camRig.distance = CAMERA_DISTANCE;
    camRig.height = CAMERA_HEIGHT;
    mountedVehicle = null;
    audio.setVehicle(null, 0);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (started) {
      input.update();
      const { yaw, pitch } = input.consumeLookDelta();
      camRig.addYawPitch(yaw, pitch);
      const interactPressed = input.consumeInteract();

      if (mountedVehicle) {
        mountedVehicle.update(dt, input);
        mountedVehicle.group.position.x = THREE.MathUtils.clamp(mountedVehicle.group.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        mountedVehicle.group.position.z = THREE.MathUtils.clamp(mountedVehicle.group.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        audio.setVehicle(mountedVehicle.preset.kind, mountedVehicle.speed / mountedVehicle.preset.maxSpeed);

        interactHint.textContent = touch ? 'Tap to dismount' : 'Press E to dismount';
        interactHint.classList.add('visible');
        if (interactPressed) dismount();
      } else {
        forward.set(-Math.sin(camRig.yaw), 0, -Math.cos(camRig.yaw));
        right.set(Math.cos(camRig.yaw), 0, -Math.sin(camRig.yaw));

        moveDir.set(0, 0, 0);
        moveDir.addScaledVector(forward, -input.moveZ);
        moveDir.addScaledVector(right, input.moveX);
        if (moveDir.lengthSq() > 1) moveDir.normalize();

        player.position.addScaledVector(moveDir, MOVE_SPEED * dt);
        player.position.x = THREE.MathUtils.clamp(player.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        audio.setWalking(moveDir.lengthSq() > 0.01, moveDir.length());

        const nearby = nearestMountable();
        if (nearby) {
          interactHint.textContent = touch ? `Tap to mount ${nearby.preset.label}` : `Press E to mount ${nearby.preset.label}`;
          interactHint.classList.add('visible');
          if (interactPressed) mount(nearby);
        } else {
          interactHint.classList.remove('visible');
        }
      }

      camRig.update();
      audio.update(dt);
    }

    renderer.info.reset();
    composer.render();
    fps.update(now);
  }
  requestAnimationFrame(tick);

  if (isDevMode()) {
    window.__dopahar = { scene, renderer, composer, camera, player, camRig, vehicles };
  }
}

main();
