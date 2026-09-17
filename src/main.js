import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog, GROUND_SIZE } from './scene.js';
import { createPlayer, ThirdPersonCamera, CAMERA_DISTANCE, CAMERA_HEIGHT, PLAYER_RADIUS } from './player.js';
import { InputController, isTouchDevice } from './controls.js';
import { createComposer, resizeComposer } from './postfx.js';
import { setupFpsCounter, setupStartOverlay, setupLoadingScreen, isDevMode } from './ui.js';
import { createSky, SKY_HORIZON_COLOR } from './sky.js';
import { buildHeroZone } from './village.js';
import { buildField } from './field.js';
import { spawnVehicles } from './vehicles.js';
import { AudioEngine } from './audio.js';
import { buildBackgroundHouses } from './scenery.js';
import { resolveCollisions, vehicleFootprintBox } from './collision.js';
import { createNPC } from './npc.js';
import { findNearestInteraction, resolveLabel, MAA_POSITION, HALWAI_NPC_POSITION, BELL_POSITION, CHARPAI_POSITION } from './interactions.js';
import { createBellProp } from './props.js';
import { Dialogue } from './dialogue.js';
import { createQuestState, QUEST_STEPS, OBJECTIVE_TEXT } from './quest.js';
import { createWaypointGlow, updateWaypoint } from './waypoint.js';

const GROUND_HALF_EXTENT = GROUND_SIZE / 2 - 2; // keep the player a couple metres inside the ground
const MOVE_SPEED = 4.2; // m/s, walking pace
const PLAYER_COLLISION_RADIUS = PLAYER_RADIUS + 0.1;
const SIT_CAMERA_DISTANCE = 3.2; // "camera settles" (item 5) — tighter than the normal walking distance
const SIT_CAMERA_HEIGHT = 1.3;

// Hindi names for the mount/dismount prompt (item 2) — vehicle presets only carry an
// English label (src/vehicles.js), used for both the UI and internal preset lookups.
const VEHICLE_LABEL_HI = {
  Tractor: 'ट्रैक्टर',
  Bicycle: 'साइकिल',
  'Bullock cart': 'बैलगाड़ी',
};

async function main() {
  setupLoadingScreen(); // before any texture/model/HDRI load below — see ui.js

  // Phone perf pass (queue item 5) — needed up front since it gates renderer pixel
  // ratio and shadow map settings at creation time, not just post-processing later.
  const touch = isTouchDevice();

  const canvas = document.getElementById('scene');
  const renderer = createRenderer(canvas, touch);

  const scene = createScene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

  const ground = createGround();
  scene.add(ground);

  const sun = createSun(touch);
  scene.add(sun);
  // Fill light for shadow-side surfaces: cool sky above, warm ground-bounce below.
  // Needed because scene.environmentIntensity is kept low (see scene.js) to tame the
  // HDRI's very hot sun disk in specular reflections — that also dims the HDRI's own
  // diffuse IBL fill, so this hemisphere light replaces it explicitly.
  scene.add(new THREE.HemisphereLight(0x6f96c2, 0x8a6a45, 0.9));

  const sky = createSky(sun.position);
  scene.add(sky);
  applyFog(scene, SKY_HORIZON_COLOR.getHex());

  const heroZoneGroup = buildHeroZone(scene);
  buildField(scene);
  const backgroundHousesGroup = buildBackgroundHouses(scene);
  const vehicles = spawnVehicles(scene);

  const player = createPlayer();
  player.position.set(-48, 0, 25); // spawn just south of the house compound, facing it
  scene.add(player);

  // Errand NPCs (item 1/3 brief) — placeholder capsules, same construction as the
  // player, positioned to match the interaction points in src/interactions.js.
  const maaNpc = createNPC(0xa3453a, MAA_POSITION, 0, 'npc_maa');
  scene.add(maaNpc);
  const halwaiNpc = createNPC(0xd8c9a0, HALWAI_NPC_POSITION, Math.PI / 2, 'npc_halwai');
  scene.add(halwaiNpc);

  // Optional interaction props (item 5) — not part of the errand.
  const bellProp = createBellProp(BELL_POSITION);
  scene.add(bellProp);

  // Waypoint (item 4) — repositioned each frame to the current objective's target.
  const waypointGlow = createWaypointGlow();
  scene.add(waypointGlow);
  const waypointArrowEl = document.getElementById('waypoint-arrow');
  const waypointArrowShapeEl = document.getElementById('waypoint-arrow-shape');

  const camRig = new ThirdPersonCamera(camera, player);
  // Buildings the camera should never clip through (item 1) — raycast against the
  // actual visual meshes (walls, roofs, pilasters), not the simplified collision
  // boxes below, since those also occlude the camera even where they don't block
  // movement (e.g. a roof overhang).
  const cameraObstacles = [heroZoneGroup, backgroundHousesGroup];
  camRig.setObstacles(cameraObstacles, player);
  camRig.update();

  const input = new InputController(canvas);

  const enableBloom = !touch;
  const enableGrain = !touch;
  const composer = createComposer(renderer, scene, camera, { enableBloom, enableGrain });

  const fps = setupFpsCounter();

  // HDRI lighting (IBL) loads async; scene renders as soon as ground/sun/sky are up.
  loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_1k.hdr').catch((err) =>
    console.error('Failed to load environment HDRI', err)
  );

  function onResize() {
    resizeRendererToDisplaySize(renderer, camera, touch);
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
      // One-time tutorial (item 2) — how to move and how to interact, dismissed by
      // the very next key or tap rather than needing a deliberate click on the panel.
      // Deferred a beat: the pointerdown that just started the game would otherwise
      // still be bubbling to window when dialogue.say() runs, and Dialogue's own
      // any-tap-dismiss listener (also on window) would catch that same event and
      // close the tutorial in the same frame it opened.
      setTimeout(() => {
        dialogue.say(
          [
            {
              hi: touch
                ? 'जॉयस्टिक से चलें। किसी के पास जाकर नीचे का बटन दबाएं।'
                : 'WASD या तीर कुंजियों से चलें। किसी के पास जाकर E दबाएं।',
              en: touch ? 'Move with the joystick. Tap the button below when close to someone.' : 'Move with WASD or arrow keys. Press E when close to someone.',
            },
          ],
          null,
          { anyKey: true }
        );
      }, 400);
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

  // Interaction prompt (item 2) — key badge + bilingual label, centre-lower, pulses
  // once each time it transitions from hidden to visible.
  const interactHint = document.getElementById('interact-hint');
  const interactHiEl = document.getElementById('interact-hi');
  const interactEnEl = document.getElementById('interact-en');
  let interactPromptVisible = false;

  function setInteractPrompt(hi, en) {
    interactHiEl.textContent = hi;
    interactEnEl.textContent = en;
    if (!interactPromptVisible) {
      interactHint.classList.remove('pulse');
      void interactHint.offsetWidth; // force reflow so the animation can restart
      interactHint.classList.add('pulse');
    }
    interactPromptVisible = true;
    interactHint.classList.add('visible');
  }

  function hideInteractPrompt() {
    interactPromptVisible = false;
    interactHint.classList.remove('visible', 'pulse');
  }

  let mountedVehicle = null;

  const dialogue = new Dialogue();

  // The errand (item 3) — one small in-memory state object, no save system.
  const quest = createQuestState();
  const objectivePanel = document.getElementById('objective-panel');
  const objectiveHiEl = document.getElementById('objective-hi');
  const objectiveEnEl = document.getElementById('objective-en');
  const endCard = document.getElementById('end-card');
  const playAgainBtn = document.getElementById('play-again-btn');

  function updateObjective() {
    const text = OBJECTIVE_TEXT[quest.step];
    objectiveHiEl.textContent = text.hi;
    objectiveEnEl.textContent = text.en;
    objectivePanel.classList.toggle('visible', quest.step !== QUEST_STEPS.COMPLETE);
  }
  updateObjective();

  function showEndCard() {
    endCard.classList.add('visible');
    objectivePanel.classList.remove('visible');
  }

  function currentWaypointTarget() {
    if (quest.step === QUEST_STEPS.NOT_STARTED) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_MONEY) return HALWAI_NPC_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_JALEBI) return MAA_POSITION;
    return null; // COMPLETE — errand done, nowhere to point
  }

  playAgainBtn.addEventListener('click', () => {
    quest.step = QUEST_STEPS.NOT_STARTED;
    endCard.classList.remove('visible');
    updateObjective();
  });

  // Shared context passed to every interaction point's label()/available()/onInteract().
  const interactionCtx = {
    audio,
    dialogue,
    quest,
    onObjectiveChange: updateObjective,
    onErrandComplete: showEndCard,
  };

  function otherVehicleBoxes(excludeVehicle) {
    const boxes = [];
    for (const v of vehicles) {
      if (v !== excludeVehicle) boxes.push(vehicleFootprintBox(v));
    }
    return boxes;
  }

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
    const excludeRoots = vehicle.trolley ? [vehicle.group, vehicle.trolley.group] : [vehicle.group];
    camRig.setObstacles(cameraObstacles, excludeRoots);
  }

  // A trolley detached from the tractor (item 2) stays in the scene, standing where
  // it was left — this is the only reference main.js keeps to it once it's no longer
  // reachable via mountedVehicle.trolley.
  let looseTrolley = null;

  function dismount() {
    const v = mountedVehicle;
    const besideOffset = new THREE.Vector3(v.preset.body.w / 2 + 1.3, 0, 0);
    besideOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), v.group.rotation.y);
    player.position.copy(v.group.position).add(besideOffset);
    player.visible = true;
    camRig.target = player;
    camRig.distance = CAMERA_DISTANCE;
    camRig.height = CAMERA_HEIGHT;
    camRig.setObstacles(cameraObstacles, player);
    mountedVehicle = null;
    audio.setVehicle(null, 0);
  }

  // Sitting (item 5) — camera settles in tighter, ambience rises; same E key stands
  // back up (see the dedicated tick() branch below, mirroring mount/dismount).
  let sitting = false;

  function sitDown() {
    sitting = true;
    interactionCtx.sitting = true;
    camRig.distance = SIT_CAMERA_DISTANCE;
    camRig.height = SIT_CAMERA_HEIGHT;
    audio.setSitting(true);
  }

  function standUp() {
    sitting = false;
    interactionCtx.sitting = false;
    camRig.distance = CAMERA_DISTANCE;
    camRig.height = CAMERA_HEIGHT;
    audio.setSitting(false);
  }

  interactionCtx.onSitDown = sitDown;

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (started) {
      input.update();
      const { yaw, pitch } = input.consumeLookDelta();
      camRig.addYawPitch(yaw, pitch);
      const interactPressed = input.consumeInteract();
      const attachPressed = input.consumeAttach();

      if (dialogue.isOpen) {
        // Dialogue pauses movement/interaction entirely — it advances only on
        // click/tap/Space (handled inside Dialogue itself), not E.
        hideInteractPrompt();
      } else if (sitting) {
        setInteractPrompt('खड़े हो जाएं', 'Stand up');
        if (interactPressed) standUp();
      } else if (mountedVehicle) {
        mountedVehicle.update(dt, input);
        mountedVehicle.group.position.x = THREE.MathUtils.clamp(mountedVehicle.group.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        mountedVehicle.group.position.z = THREE.MathUtils.clamp(mountedVehicle.group.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        const p = mountedVehicle.preset;
        const vehicleRadius = Math.max(p.body.w, p.body.d) / 2;
        resolveCollisions(mountedVehicle.group.position, vehicleRadius, otherVehicleBoxes(mountedVehicle));
        audio.setVehicle(mountedVehicle.preset.kind, mountedVehicle.speed / mountedVehicle.preset.maxSpeed);

        // Trolley attach/detach (item 2) — F on desktop, the shared tap target on
        // touch when that's the prompt showing; E always dismounts on desktop
        // regardless (kept independent so getting off the tractor never needs a
        // detour through the trolley prompt).
        const candidateTrolley = mountedVehicle.trolley || looseTrolley;
        if (p.kind === 'tractor' && !mountedVehicle.trolley && candidateTrolley) {
          const hitchDist = mountedVehicle.hitchWorldPoint.distanceTo(candidateTrolley.hitchWorldPoint);
          const eligible = mountedVehicle.speed < -0.05 && hitchDist < p.attachRadius;
          if (eligible) {
            setInteractPrompt('ट्रॉली जोड़ें', 'Attach trolley');
            if (touch ? interactPressed : attachPressed) {
              mountedVehicle.attachTrolley(candidateTrolley);
              looseTrolley = null;
            }
          } else {
            setInteractPrompt('उतर जाएं', 'Dismount');
            if (interactPressed) dismount();
          }
        } else if (p.kind === 'tractor' && mountedVehicle.trolley) {
          setInteractPrompt('ट्रॉली अलग करें', 'Detach trolley');
          if (touch ? interactPressed : attachPressed) {
            looseTrolley = mountedVehicle.detachTrolley();
          } else if (!touch && interactPressed) {
            dismount();
          }
        } else {
          setInteractPrompt('उतर जाएं', 'Dismount');
          if (interactPressed) dismount();
        }
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
        resolveCollisions(player.position, PLAYER_COLLISION_RADIUS, otherVehicleBoxes(null));
        audio.setWalking(moveDir.lengthSq() > 0.01, moveDir.length());

        const nearby = nearestMountable();
        if (nearby) {
          const hi = VEHICLE_LABEL_HI[nearby.preset.label] || nearby.preset.label;
          setInteractPrompt(`${hi} पर बैठें`, `Mount ${nearby.preset.label}`);
          if (interactPressed) mount(nearby);
        } else {
          // Interaction points (item 1) — foot only, checked here since this branch
          // only runs when the player isn't mounted. Mounting takes priority above;
          // in practice the two never overlap (vehicles and interaction points are
          // placed apart from each other).
          const nearestPoint = findNearestInteraction(player.position, interactionCtx);
          if (nearestPoint) {
            const label = resolveLabel(nearestPoint, interactionCtx);
            setInteractPrompt(label.hi, label.en);
            if (interactPressed) nearestPoint.onInteract(interactionCtx);
          } else {
            hideInteractPrompt();
          }
        }
      }

      camRig.update();
      audio.update(dt);

      camera.updateMatrixWorld(); // fresh matrixWorldInverse for this frame's projection below
      updateWaypoint({
        glowMesh: waypointGlow,
        arrowEl: waypointArrowEl,
        arrowShapeEl: waypointArrowShapeEl,
        camera,
        targetPos: currentWaypointTarget(),
        time: now / 1000,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    renderer.info.reset();
    composer.render();
    fps.update(now);
  }
  requestAnimationFrame(tick);

  if (isDevMode()) {
    // mount/dismount exposed for scripted collision testing (tools/*, throwaway test
    // scripts) — real player/E-key flow works too, this just avoids needing the
    // player to walk into mount range for every test case.
    // Only the two THREE classes the grounding-check tool needs, not the whole
    // namespace — assigning `THREE` itself here stops the bundler from tree-shaking
    // any unused three.js code for every visitor, not just dev-mode ones (confirmed:
    // +164KB raw / +46KB gzipped). Property access on two named classes doesn't have
    // that effect.
    window.__dopahar = {
      scene,
      renderer,
      composer,
      input,
      camera,
      player,
      camRig,
      vehicles,
      npcs: [maaNpc, halwaiNpc],
      props: [bellProp],
      interactions: { MAA_POSITION, HALWAI_NPC_POSITION, BELL_POSITION, CHARPAI_POSITION },
      dialogue,
      quest,
      QUEST_STEPS,
      mount,
      dismount,
      sitDown,
      standUp,
      isSitting: () => sitting,
      Box3: THREE.Box3,
      Matrix4: THREE.Matrix4,
      // For scripted feature screenshots (tools/screenshot.js) — teleport near an
      // interaction point and trigger it without needing to actually walk there.
      teleportPlayer: (x, z) => player.position.set(x, 0, z),
      interact: () => {
        if (mountedVehicle) return;
        const nearestPoint = findNearestInteraction(player.position, interactionCtx);
        if (nearestPoint) nearestPoint.onInteract(interactionCtx);
      },
    };
  }
}

main();
