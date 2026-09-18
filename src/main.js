import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog, GROUND_SIZE } from './scene.js';
import { createPlayer, ThirdPersonCamera, CAMERA_DISTANCE, CAMERA_HEIGHT, PLAYER_RADIUS } from './player.js';
import { InputController, isTouchDevice } from './controls.js';
import { createComposer, resizeComposer } from './postfx.js';
import { setupFpsCounter, setupStartOverlay, setupLoadingScreen, isDevMode } from './ui.js';
import { createSky, SKY_HORIZON_COLOR } from './sky.js';
import { buildHeroZone, HOUSE_CENTER, SCHOOL_CENTER } from './village.js';
import { buildField } from './field.js';
import { spawnVehicles } from './vehicles.js';
import { AudioEngine } from './audio.js';
import { buildBackgroundHouses } from './scenery.js';
import { resolveCollisions, vehicleFootprintBox } from './collision.js';
import { createNPC } from './npc.js';
import { createWaypointLoop, createStirLoop } from './npcRoutines.js';
import { findNearestInteraction, resolveLabel, MAA_POSITION, HALWAI_NPC_POSITION, BELL_POSITION, CHARPAI_POSITION } from './interactions.js';
import { surfaceAt } from './surfaces.js';
import { createBellProp } from './props.js';
import { createDaylineController, dayProgressForQuestStep } from './dayline.js';
import { buildTeaStall, buildGeneralStore, buildShopRoofs, buildShopWalls, buildShopCounters, TEA as TEA_DIMS, STORE as STORE_DIMS } from './shops.js';
import { buildSignboards } from './signboards.js';
import { Dialogue } from './dialogue.js';
import { createQuestState, QUEST_STEPS, OBJECTIVE_TEXT } from './quest.js';
import { createWaypointGlow, updateWaypoint } from './waypoint.js';
import { applyQuality, loadSavedQuality, saveQuality } from './quality.js';
import { setupPauseMenu } from './pause.js';

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

  // Pause menu quality setting (task 2) — default Medium on touch / High on desktop,
  // overridden by whatever was last saved. Applied immediately so the very first
  // frame already reflects it, not just future ones.
  let currentQuality = loadSavedQuality(touch ? 'medium' : 'high');
  let { enableBloom, enableGrain } = applyQuality(currentQuality, { renderer, sun, isTouch: touch });

  // Fill light for shadow-side surfaces: cool sky above, warm ground-bounce below.
  // Needed because scene.environmentIntensity is kept low (see scene.js) to tame the
  // HDRI's very hot sun disk in specular reflections — that also dims the HDRI's own
  // diffuse IBL fill, so this hemisphere light replaces it explicitly.
  scene.add(new THREE.HemisphereLight(0x6f96c2, 0x8a6a45, 0.9));

  const sky = createSky(sun.position);
  scene.add(sky);
  applyFog(scene, SKY_HORIZON_COLOR.getHex());

  // Day-end sequence (item 13, stretch) — warms/lowers the sun as the errand
  // progresses; updated once per frame further down, once `quest` exists.
  const updateDayline = createDaylineController(sun, sky, scene);

  // Load order (queue item 6): the hero zone (house/school/halwai/lane) and the
  // vehicles the player starts next to load eagerly — everything the loading screen
  // waits on. The field and background houses (visually distant, fog-hazed, not
  // needed for the errand) are built after the player has already started playing —
  // see loadDeferredContent() below, called from onStart.
  const heroZoneGroup = buildHeroZone(scene);

  // Two more Places V1 locations (item 9) on the lane between the house and the
  // school, with clearance either side (see docs/parked.md for the exact placement
  // reasoning — neither has a LAYOUT.md, dimensions/names read off the reference
  // orthographic images instead).
  const shopsGroup = new THREE.Group();
  shopsGroup.name = 'shops';
  const TEA_SHOP_POS = { x: -52, z: 78 };
  const TEA_SHOP_ROT = Math.PI / 2; // west of the lane, facing east
  const STORE_POS = { x: -38, z: 90 };
  const STORE_ROT = -Math.PI / 2; // east of the lane, facing west
  shopsGroup.add(buildTeaStall(TEA_SHOP_POS, TEA_SHOP_ROT));
  shopsGroup.add(buildGeneralStore(STORE_POS, STORE_ROT));
  shopsGroup.add(buildShopWalls(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT));
  shopsGroup.add(buildShopRoofs(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT));
  shopsGroup.add(buildShopCounters(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT));
  scene.add(shopsGroup);

  // Signboards (item 10) — not awaited inline (same reasoning as loadEnvironment
  // below: don't block the rest of scene setup on an async step); both boards share
  // one atlas texture/mesh, added once the canvas + font are ready.
  buildSignboards(
    {
      position: TEA_SHOP_POS,
      rotationY: TEA_SHOP_ROT,
      width: TEA_DIMS.w - 0.4,
      depth: TEA_DIMS.d,
      boardY: TEA_DIMS.postH + 0.35,
      hi: 'शर्मा चाय की दुकान',
      en: 'Sharma Tea Stall',
    },
    {
      position: STORE_POS,
      rotationY: STORE_ROT,
      width: STORE_DIMS.w - 0.6,
      depth: STORE_DIMS.d,
      boardY: STORE_DIMS.h - 0.1,
      hi: 'गुप्ता जनरल स्टोर',
      en: 'Gupta General Store',
    }
  )
    .then((mesh) => shopsGroup.add(mesh))
    .catch((err) => console.error('Failed to build signboards', err));

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

  // NPC life (item 8) — simple waypoint loops, no pathfinding. Maa wanders two spots
  // in the courtyard (one of them her interaction point); the halwai stirs in place
  // over the kadhai; a child walks the lane between the house and the school. The
  // child's middle waypoint is offset west of the halwai's own footprint on purpose —
  // a straight house-to-school line would clip straight through that building (see
  // docs/parked.md).
  const maaWalk = createWaypointLoop(maaNpc, [
    { x: MAA_POSITION.x, z: MAA_POSITION.z },
    { x: MAA_POSITION.x - 3, z: MAA_POSITION.z + 2 },
  ]);
  const halwaiStir = createStirLoop(halwaiNpc.userData.mesh);

  const childNpc = createNPC(0x6d8a9c, { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 9 }, 0, 'npc_child');
  scene.add(childNpc);
  const childWalk = createWaypointLoop(
    childNpc,
    [
      { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 9 },
      { x: -44, z: 55 }, // west of the halwai's footprint, not through it
      { x: SCHOOL_CENTER.x, z: SCHOOL_CENTER.z - 10 },
    ],
    { speed: 1.6, pauseSeconds: 3 }
  );

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
  const cameraObstacles = [heroZoneGroup, shopsGroup]; // backgroundHousesGroup pushed in once it streams in — see loadDeferredContent()
  camRig.setObstacles(cameraObstacles, player);
  camRig.update();

  const input = new InputController(canvas);

  let composer = createComposer(renderer, scene, camera, { enableBloom, enableGrain });

  const fps = setupFpsCounter();

  // HDRI lighting (IBL) loads async; scene renders as soon as ground/sun/sky are up.
  loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_1k.hdr').catch((err) =>
    console.error('Failed to load environment HDRI', err)
  );

  function onResize() {
    const preset = applyQuality(currentQuality, { renderer, sun, isTouch: touch }); // re-reads the pixel ratio cap; shadow map dispose here is a harmless no-op if size didn't change
    resizeRendererToDisplaySize(renderer, camera, preset.pixelRatioCap);
    resizeComposer(composer, window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /** Pause menu quality change (task 2) — applies instantly, no reload: pixel ratio
   * and the sun's shadow map/frustum change in place (applyQuality), but bloom/grain
   * live on the EffectComposer's single fixed EffectPass, which postprocessing has no
   * API to add/remove effects from in place — so this rebuilds the composer itself. */
  function setQuality(level) {
    currentQuality = level;
    saveQuality(level);
    const result = applyQuality(level, { renderer, sun, isTouch: touch });
    composer.dispose();
    composer = createComposer(renderer, scene, camera, { enableBloom: result.enableBloom, enableGrain: result.enableGrain });
    resizeRendererToDisplaySize(renderer, camera, result.pixelRatioCap);
    resizeComposer(composer, window.innerWidth, window.innerHeight);
  }

  canvas.addEventListener('click', () => {
    if (!paused) input.requestPointerLock?.();
  });

  // Streamed in after the player starts (queue item 6) — see the comment where
  // heroZoneGroup/vehicles are built above.
  let deferredContentLoaded = false;
  function loadDeferredContent() {
    if (deferredContentLoaded) return;
    deferredContentLoaded = true;
    buildField(scene);
    const backgroundHousesGroup = buildBackgroundHouses(scene);
    cameraObstacles.push(backgroundHousesGroup); // camRig already holds this array by reference
  }

  const audio = new AudioEngine();
  let started = false;
  setupStartOverlay({
    isTouch: touch,
    onStart: () => {
      started = true;
      audio.start(); // must happen inside this gesture handler to unlock on iOS/Safari
      if (!touch) input.requestPointerLock();
      loadDeferredContent();
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

  // Shared by the end card's "Play again" button and the pause menu's "Restart
  // errand" button (task 2).
  function restartErrand() {
    quest.step = QUEST_STEPS.NOT_STARTED;
    endCard.classList.remove('visible');
    updateObjective();
  }

  playAgainBtn.addEventListener('click', restartErrand);

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

  // Pause menu (task 2) — freezes the tick loop's game-logic block (see tick() below:
  // `if (started && !paused)`) but keeps rendering, so the world stays visible, just
  // still, behind the panel. Releases pointer lock while open (so the panel is
  // clickable) and re-requests it on resume, desktop only.
  let paused = false;
  const pauseMenu = setupPauseMenu({
    isTouch: touch,
    initialQuality: currentQuality,
    onOpen: () => {
      paused = true;
      if (!touch) document.exitPointerLock?.();
    },
    onResume: () => {
      paused = false;
      if (!touch && started) input.requestPointerLock();
    },
    onRestart: restartErrand,
    onQualityChange: setQuality,
    onShowCredits: () => {
      // Wired up once the credits screen exists — see src/credits.js.
    },
  });

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (started && paused) {
      // Drain any input that landed while paused so it doesn't fire the instant the
      // game resumes (e.g. an E press meant for the pause panel).
      input.consumeLookDelta();
      input.consumeInteract();
      input.consumeAttach();
    } else if (started) {
      input.update();
      const { yaw, pitch } = input.consumeLookDelta();
      camRig.addYawPitch(yaw, pitch);
      const interactPressed = input.consumeInteract();
      const attachPressed = input.consumeAttach();

      // NPC life (item 8) — runs regardless of dialogue/mount/sit state, same as the
      // ambient world around the player. MAA_POSITION is the same Vector3 object the
      // interaction point and waypoint system both hold a reference to, so syncing it
      // here makes "talk to Maa" and the waypoint arrow/glow follow her as she walks.
      maaWalk(dt);
      halwaiStir(dt);
      childWalk(dt);
      MAA_POSITION.copy(maaNpc.position);

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
        audio.setSurface(surfaceAt(player.position.x, player.position.z));

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
      updateDayline(dayProgressForQuestStep(quest.step, QUEST_STEPS), dt);
      // Distant radio fade (item 7) — uses whatever the player is actually "at"
      // (on foot, or the vehicle they're driving/sitting on), not the camera, so it
      // doesn't fade with a wide third-person zoom.
      const listenerPos = mountedVehicle ? mountedVehicle.group.position : player.position;
      audio.setListenerDistanceToRadio(listenerPos.distanceTo(HALWAI_NPC_POSITION));

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
      get composer() {
        return composer; // reassigned by setQuality() (task 2) — must read live, not a snapshot
      },
      input,
      audio,
      camera,
      player,
      camRig,
      vehicles,
      npcs: [maaNpc, halwaiNpc, childNpc],
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
      setQuality,
      getQuality: () => currentQuality,
      isPaused: () => paused,
      pauseMenu,
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
