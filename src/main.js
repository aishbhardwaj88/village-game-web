import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog, GROUND_SIZE } from './scene.js';
import { createPlayer, ThirdPersonCamera, CAMERA_DISTANCE, CAMERA_HEIGHT, PLAYER_RADIUS, PLAYER_HEIGHT } from './player.js';
import { InputController, isTouchDevice } from './controls.js';
import { createComposer, resizeComposer } from './postfx.js';
import { setupFpsCounter, setupStartOverlay, setupLoadingScreen, isDevMode } from './ui.js';
import { createSky, SKY_HORIZON_COLOR } from './sky.js';
import { buildHeroZone, HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER, HOUSE_BLOCK, HOUSE_STAIRS, SCHOOL_ROOM } from './village.js';
import { BuildingKit } from './buildingKit.js';
import { mergeAcrossGroups } from './mergeUtils.js';
import { buildContactShadows } from './contactShadows.js';
import { createAssetSlotRegistry } from './assetSlots.js';
import { buildField, FIELD_CENTER, FIELD_SIZE, TRACK_CORNERS } from './field.js';
import { buildDust } from './dust.js';
import { spawnVehicles, TROLLEY_COLLISION_RADIUS } from './vehicles.js';
import { resolveMove, resolveTowedMove } from './movement.js';
import { AudioEngine } from './audio.js';
import { buildBackgroundHouses } from './scenery.js';
import {
  buildTemple,
  buildFlowerStall,
  buildTempleLane,
  TEMPLE_POS,
  PLINTH as TEMPLE_PLINTH,
  PEEPAL_PLATFORM_POS,
  PEEPAL_PLATFORM_RADIUS,
  FLOWER_STALL_POS,
} from './temple.js';
import { vehicleFootprintBox, initStaticColliders } from './collision.js';
import {
  buildBazaarRow,
  buildBazaarCountersAndShutters,
  buildBazaarSignboards,
  buildBazaarInteriors,
  buildTeaStallChowk,
  buildTeaStallChowkSign,
  buildChowkPlaza,
  buildBazaarLane,
  BAZAAR_UNITS,
  bazaarUnitCx,
  BAZAAR_FRONT_Z,
  BAZAAR_ROW_CZ,
  CHOWK_TEA_POS,
} from './bazaar.js';
import { createNPC } from './npc.js';
import { createWaypointLoop, createStirLoop, createFollowRoutine } from './npcRoutines.js';
import {
  findNearestInteraction,
  resolveLabel,
  MAA_POSITION,
  HALWAI_NPC_POSITION,
  BELL_POSITION,
  CHARPAI_POSITION,
  TEACHER_POSITION,
  SISTER_SCHOOL_POSITION,
  INTERACTION_POINTS,
  registerShopBuy,
  registerSabziWeighing,
  registerBangleTryOn,
} from './interactions.js';
import { buildSackPile, createSackCarrier, PITAJI_POSITION, SACK_PILE_POSITION, KIRANA_POSITION } from './wheatErrand.js';
import { surfaceAt } from './surfaces.js';
import { createBellProp } from './props.js';
import { createBazaarLife } from './bazaarLife.js';
import { createDaylineController, dayProgressForQuestStep } from './dayline.js';
import { buildTeaStall, buildGeneralStore, buildGeneralStoreGoods, buildShopRoofs, buildShopWalls, buildShopCounters, TEA as TEA_DIMS, STORE as STORE_DIMS } from './shops.js';
import { buildSignboards } from './signboards.js';
import { Dialogue } from './dialogue.js';
import { createQuestState, QUEST_STEPS, OBJECTIVE_TEXT } from './quest.js';
import { createWaypointGlow, updateWaypoint } from './waypoint.js';
import { applyQuality, loadSavedQuality, saveQuality } from './quality.js';
import { loadSavedGame, saveGame } from './save.js';
import { setupPauseMenu } from './pause.js';
import { setupCredits } from './credits.js';

const GROUND_HALF_EXTENT = GROUND_SIZE / 2 - 2; // keep the player a couple metres inside the ground
const MOVE_SPEED = 4.2; // m/s, walking pace
const PLAYER_COLLISION_RADIUS = PLAYER_RADIUS + 0.1;
const SIT_CAMERA_DISTANCE = 3.2; // "camera settles" (item 5) — tighter than the normal walking distance
const SIT_CAMERA_HEIGHT = 1.3;
const LIE_CAMERA_DISTANCE = 2.6; // lying on the charpai (new-queue item 5) — lower and closer than sitting
const LIE_CAMERA_HEIGHT = 0.55;

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
  // Mobile pass (task 3) — a couple of CSS rules (dialogue panel position, see
  // index.html) need to know this too, and CSS can't read isTouchDevice() itself.
  document.body.classList.toggle('touch-device', touch);

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
  // One shared BuildingKit for the whole village (headroom pass, docs/parked.md) —
  // every building's trim/plinth/reveal/drainpipe/switchboard/step instances live in
  // the same 6 InstancedMeshes regardless of which building added them, instead of
  // each building group paying for its own copy of all 6. finalize()'d below, once
  // after the eager buildings (so hero zone + bazaar detail is visible immediately,
  // even before Play is clicked) and again after the deferred background houses.
  const buildingKit = new BuildingKit(400);

  const {
    group: heroZoneGroup,
    charpaiGroup: houseCharpaiGroup,
    handPumpGroup: houseHandPumpGroup,
    pumpWaterMesh,
    tulsiWaterMesh,
  } = buildHeroZone(scene, buildingKit);

  // Places V1 locations (item 9) on the lanes near the hero zone — neither has a
  // LAYOUT.md, dimensions/names read off the reference orthographic images instead
  // (see docs/parked.md). The tea stall stays on the house-school lane where item 9
  // put it; the general store moved (headroom-pass item 3, docs/parked.md) onto the
  // lane between the hero zone and the bazaar (buildBazaarLane()'s own BEND
  // waypoint, src/bazaar.js), east of it, facing the lane.
  const shopsGroup = new THREE.Group();
  shopsGroup.name = 'shops';
  const TEA_SHOP_POS = { x: -52, z: 78 };
  const TEA_SHOP_ROT = Math.PI / 2; // west of the lane, facing east
  const STORE_POS = { x: -52, z: 20 };
  const STORE_ROT = -Math.PI / 2; // east of the hero-zone-to-bazaar lane, facing west
  shopsGroup.add(buildTeaStall(TEA_SHOP_POS, TEA_SHOP_ROT));
  shopsGroup.add(buildGeneralStore(STORE_POS, STORE_ROT));
  shopsGroup.add(buildShopWalls(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT));
  shopsGroup.add(buildShopRoofs(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT));
  shopsGroup.add(buildShopCounters(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT));
  shopsGroup.add(buildGeneralStoreGoods(STORE_POS, STORE_ROT));
  scene.add(shopsGroup);

  // Shop interactions (this task) — the shared "buy", at each shop's own open
  // counter side. The general store's is also errand 3's purchase step (see
  // src/interactions.js's registerShopBuy doc comment).
  registerShopBuy('general_store', new THREE.Vector3(STORE_POS.x - 2.5, 0, STORE_POS.z));
  registerShopBuy('tea_stall', new THREE.Vector3(TEA_SHOP_POS.x + 2.5, 0, TEA_SHOP_POS.z));

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

  // Bazaar row (new request) — Places V1/bazaar_row/LAYOUT.md is the authority; see
  // src/bazaar.js for the full build. Real gameplay content (not distant scenery), so
  // built eagerly with the rest of the hero zone, not deferred like the field/
  // background houses.
  const bazaarGroup = buildBazaarRow(buildingKit);
  scene.add(bazaarGroup);
  bazaarGroup.add(buildBazaarCountersAndShutters());
  bazaarGroup.add(buildBazaarInteriors());

  // Chowk (item 4) — the second tea stall (Places V1/tea_stall_chowk/), a chabutra,
  // benches, a few plastic chairs, east of the bazaar row with open ground left
  // around it for future content.
  bazaarGroup.add(buildTeaStallChowk());
  bazaarGroup.add(buildChowkPlaza());

  // Item 5 — the lane extension itself (a bumpy, curved strip, never a straight
  // ribbon), connecting the existing hero-zone lane to the bazaar/chowk.
  bazaarGroup.add(buildBazaarLane());
  buildTeaStallChowkSign()
    .then((mesh) => bazaarGroup.add(mesh))
    .catch((err) => console.error('Failed to build chowk tea stall sign', err));
  buildBazaarSignboards()
    .then((mesh) => bazaarGroup.add(mesh))
    .catch((err) => console.error('Failed to build bazaar signboards', err));

  // Shop interactions (this task) — one shared "buy" at every bazaar counter except
  // kirana (has its own dedicated wheat-errand interaction, src/interactions.js) and
  // sabzi/bangle (their own signature interactions instead, right below). Position:
  // same "just outside the counter" distance kirana's own point uses.
  BAZAAR_UNITS.forEach((unit, idx) => {
    const pos = new THREE.Vector3(bazaarUnitCx(idx), 0, BAZAAR_FRONT_Z - 1.5);
    if (unit.trade === 'kirana') return;
    if (unit.trade === 'sabzi') registerSabziWeighing(pos);
    else if (unit.trade === 'bangle') registerBangleTryOn(pos);
    else registerShopBuy(unit.trade, pos);
  });

  // NPC life in the bazaar (this task's item 2) — one shared InstancedMesh, see
  // src/bazaarLife.js.
  const bazaarLife = createBazaarLife();
  scene.add(bazaarLife.mesh);

  // Item 2 (new request) — village mandir + flower stall, east of the hero zone and
  // north of the field/track, reachable by a lane spur (item 4). See src/temple.js
  // for the full build and docs/parked.md for the placement reasoning.
  const templeGroup = new THREE.Group();
  templeGroup.name = 'temple_area';
  templeGroup.add(buildTemple(buildingKit));
  templeGroup.add(buildFlowerStall());
  templeGroup.add(buildTempleLane());
  scene.add(templeGroup);

  // First flush of the shared kit — makes hero zone + bazaar trim/plinth/etc visible
  // right away (including behind the title screen, before Play is clicked). A second
  // flush happens in loadDeferredContent() once the background houses have added
  // their own pieces to the same kit.
  buildingKit.finalize(scene);

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

  // Third errand (this task) — Pitaji, stationary near the tractor/sack pile, and
  // the sack pile itself (folds into the hero zone's own vertex-coloured 'wood'
  // family, so it costs nothing extra — see src/wheatErrand.js).
  const pitajiNpc = createNPC(0x4a5a3a, PITAJI_POSITION, Math.PI, 'npc_pitaji');
  scene.add(pitajiNpc);
  const sackCarrier = createSackCarrier(player);
  heroZoneGroup.add(buildSackPile());

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

  // Second errand (task 4) — the teacher (a fixed interaction point, like maaNpc/
  // halwaiNpc above) and the sister (starts stationary at the school; once collected
  // via the bell or the teacher, createFollowRoutine below walks her toward whichever
  // of the player/mounted vehicle is "them" right now, stopping 2m short, pushed back
  // out of walls the same way the player is — see src/npcRoutines.js).
  const teacherNpc = createNPC(0x5a4a6e, TEACHER_POSITION, Math.PI, 'npc_teacher');
  scene.add(teacherNpc);
  const sisterNpc = createNPC(0xc98ea0, SISTER_SCHOOL_POSITION, 0, 'npc_sister');
  scene.add(sisterNpc);
  let sisterFollowing = false;
  const sisterFollow = createFollowRoutine(sisterNpc, () => (mountedVehicle ? mountedVehicle.group.position : player.position), { stopDistance: 2 });

  // Waypoint (item 4) — repositioned each frame to the current objective's target.
  const waypointGlow = createWaypointGlow();
  scene.add(waypointGlow);
  const waypointArrowEl = document.getElementById('waypoint-arrow');
  const waypointArrowShapeEl = document.getElementById('waypoint-arrow-shape');

  // Bugfix 4/4 — procedural trees (src/trees.js) removed entirely. The brief called
  // for replacing them with real CC0/CC BY models; after an exhaustive search (see
  // docs/parked.md for the full list of what was checked and why each candidate was
  // rejected) no suitable model could actually be obtained, so per the brief's own
  // fallback ("remove trees from the scene entirely rather than shipping ones that
  // look wrong") the whole feature is gone rather than kept in its rejected state.

  // Dust motes (task queue item 6) — one Points draw call, confined to outdoor
  // "zones" (lane, track loop, field, open courtyards) so interiors stay dust-free
  // without a runtime indoor/outdoor check. See src/dust.js for the shape/PRNG detail.
  const dust = buildDust([
    { a: HOUSE_CENTER, b: HALWAI_CENTER, halfWidth: 4, count: 70 },
    { a: HALWAI_CENTER, b: SCHOOL_CENTER, halfWidth: 4, count: 70 },
    ...TRACK_CORNERS.map((corner, i) => ({ a: corner, b: TRACK_CORNERS[(i + 1) % TRACK_CORNERS.length], halfWidth: 3.5, count: 45 })),
    { cx: FIELD_CENTER.x, cz: FIELD_CENTER.z, halfW: FIELD_SIZE.x / 2 - 5, halfD: FIELD_SIZE.z / 2 - 5, count: 110, maxY: 1.1 },
    { cx: HOUSE_CENTER.x, cz: HOUSE_CENTER.z + 6, halfW: 3, halfD: 2, count: 18 }, // house courtyard, open to sky
    { cx: HALWAI_CENTER.x + 2, cz: HALWAI_CENTER.z + 3, halfW: 3, halfD: 3, count: 18 }, // halwai's open frontage, not its own footprint
  ]);
  scene.add(dust.points);

  // Bugfix 3/4 — contact shadows: a cheap, omnidirectional "touching the ground" cue
  // under every building/prop (static) and vehicle (updated each frame below), on top
  // of the sun's own real shadow. See src/contactShadows.js's doc comment for the full
  // diagnosis of why the real shadow alone wasn't enough at a low, close camera angle.
  // Background houses aren't included (distant scenery, not something the player gets
  // close/low to — see docs/parked.md).
  const HALWAI_FOOTPRINT = { w: 4.5, d: 5.5 }; // src/village.js buildHalwai's own dimensions
  const contactShadows = buildContactShadows(
    [
      { x: HOUSE_BLOCK.cx, z: HOUSE_BLOCK.cz, radiusX: HOUSE_BLOCK.w / 2 + 0.4, radiusZ: HOUSE_BLOCK.d / 2 + 0.4 },
      { x: HALWAI_CENTER.x, z: HALWAI_CENTER.z, radiusX: HALWAI_FOOTPRINT.w / 2 + 0.4, radiusZ: HALWAI_FOOTPRINT.d / 2 + 0.4 },
      { x: SCHOOL_CENTER.x, z: SCHOOL_CENTER.z + 9, radiusX: 12.4, radiusZ: 3.4 }, // school back block
      { x: SCHOOL_CENTER.x + 12, z: SCHOOL_CENTER.z, radiusX: 3.4, radiusZ: 9.4 }, // school east wing
      { x: SCHOOL_ROOM.cx, z: SCHOOL_ROOM.cz, radiusX: SCHOOL_ROOM.w / 2 + 0.4, radiusZ: SCHOOL_ROOM.d / 2 + 0.4 }, // school west wing (classroom)
      { x: TEA_SHOP_POS.x, z: TEA_SHOP_POS.z, radiusX: TEA_DIMS.w / 2 + 0.4, radiusZ: TEA_DIMS.d / 2 + 0.4 },
      { x: STORE_POS.x, z: STORE_POS.z, radiusX: STORE_DIMS.w / 2 + 0.4, radiusZ: STORE_DIMS.d / 2 + 0.4 },
      { x: BELL_POSITION.x, z: BELL_POSITION.z, radiusX: 0.6, radiusZ: 0.6 },
      // Item 2/6 (temple + flower stall) — one shadow for the whole raised plinth
      // (shrine + porch sit on it), one for the peepal chabutra, one for the stall.
      { x: TEMPLE_POS.x, z: TEMPLE_POS.z, radiusX: TEMPLE_PLINTH.w / 2 + 0.4, radiusZ: TEMPLE_PLINTH.d / 2 + 0.4 },
      { x: PEEPAL_PLATFORM_POS.x, z: PEEPAL_PLATFORM_POS.z, radiusX: PEEPAL_PLATFORM_RADIUS + 0.3, radiusZ: PEEPAL_PLATFORM_RADIUS + 0.3 },
      { x: FLOWER_STALL_POS.x, z: FLOWER_STALL_POS.z, radiusX: 1.5, radiusZ: 1.3 },
    ],
    4 // dynamic slots: bike, tractor, cart, trolley — set each frame below
  );
  scene.add(contactShadows.mesh);
  // The trolley spawns already attached to the tractor (src/vehicles.js
  // spawnVehicles()) — grab a stable reference here, before any player detach action
  // can null out tractorForShadows.trolley, so the shadow always has a live vehicle to
  // read .group.position from regardless of attach state.
  const tractorForShadows = vehicles.find((v) => v.preset.kind === 'tractor');
  const trolleyForShadows = tractorForShadows.trolley;

  const camRig = new ThirdPersonCamera(camera, player);
  // Buildings the camera should never clip through (item 1) — raycast against the
  // actual visual meshes (walls, roofs, pilasters), not the simplified collision
  // boxes below, since those also occlude the camera even where they don't block
  // movement (e.g. a roof overhang).
  const cameraObstacles = [heroZoneGroup, shopsGroup, bazaarGroup, templeGroup]; // backgroundHousesGroup pushed in once it streams in — see loadDeferredContent()
  camRig.setObstacles(cameraObstacles, player);
  camRig.update();

  const input = new InputController(canvas);

  let composer = createComposer(renderer, scene, camera, { enableBloom, enableGrain });

  const fps = setupFpsCounter();

  // HDRI lighting (IBL) loads async; scene renders as soon as ground/sun/sky are up.
  loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_1k.hdr').catch((err) =>
    console.error('Failed to load environment HDRI', err)
  );

  // Asset slots (queue item 1) — every registration below just reads each object's
  // already-public handles (vehicle.group/.bodyPivot/.wheels/etc, all exposed since
  // items 1-3 of the earlier queue); src/vehicles.js itself is untouched, per this
  // queue's "do not rebuild vehicle geometry" instruction. Fire-and-forget, same
  // reasoning as loadEnvironment above — a slow/missing model never blocks startup.
  // See src/assetSlots.js and docs/asset-slots.md.
  const assetSlots = createAssetSlotRegistry();
  {
    const tractor = vehicles.find((v) => v.preset.kind === 'tractor');
    const cart = vehicles.find((v) => v.preset.kind === 'cart');
    const bike = vehicles.find((v) => v.preset.kind === 'bike');
    const trolley = tractor.trolley;

    assetSlots.register('tractor', {
      dimensions: tractor.preset.body,
      hide: [tractor.bodyPivot, ...tractor.rearWheels, ...tractor.frontWheels],
      placements: [{ container: tractor.group, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
    });
    assetSlots.register('trolley', {
      dimensions: { w: 2.0, h: 1.5, d: 3.5 }, // src/vehicles.js TR.bedW/bedLen + wallH+floorY
      hide: trolley.group.children.filter((c) => !trolley.wheels.includes(c)),
      placements: [{ container: trolley.group, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
    });
    assetSlots.register('cart', {
      dimensions: cart.preset.body,
      hide: [cart.bodyPivot, ...cart.wheels],
      placements: [{ container: cart.group, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
    });
    {
      // Both bullocks share one model — src/vehicles.js merges their static (non-leg)
      // geometry into one draw call (task 2 of the earlier queue), so the "everything
      // but bodyPivot/wheels" trick used above finds that merged mesh here too.
      const knownCartChildren = [cart.bodyPivot, ...cart.wheels];
      const bullocksStaticGroup = cart.group.children.find((c) => !knownCartChildren.includes(c));
      const bullockOffsets = [-0.42, 0.42]; // src/vehicles.js buildCartGroup's `side * 0.42`
      assetSlots.register('bullock', {
        dimensions: { w: 0.6, h: 1.6, d: 2.2 }, // body + head/neck + legs, src/vehicles.js BULLOCK_* consts
        hide: [bullocksStaticGroup, ...cart.bullocks[0].userData.legs, ...cart.bullocks[1].userData.legs],
        placements: bullockOffsets.map((x) => ({ container: cart.group, position: new THREE.Vector3(x, 0, 0), rotationY: 0 })),
      });
    }
    assetSlots.register('bike', {
      dimensions: bike.preset.body,
      hide: [bike.bodyPivot, bike.frontWheel, bike.rearWheel],
      placements: [{ container: bike.group, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
    });
  }
  {
    const halwaiShopGroup = heroZoneGroup.children.find((c) => c.name === 'halwai_shop');
    assetSlots.register('halwai_kiosk', {
      dimensions: { w: 5.5, h: 3.5, d: 4.5 }, // src/village.js buildHalwai's width/height/depth
      hide: halwaiShopGroup.children.slice(),
      placements: [{ container: halwaiShopGroup, position: new THREE.Vector3(HALWAI_CENTER.x, 0, HALWAI_CENTER.z), rotationY: 0 }],
    });
  }
  const PERSON_DIMENSIONS = { w: PLAYER_RADIUS * 2, h: PLAYER_HEIGHT, d: PLAYER_RADIUS * 2 };
  assetSlots.register('player', {
    dimensions: PERSON_DIMENSIONS,
    hide: [player.children[0]], // the capsule mesh — keep the group itself (camera rig target, position driver)
    placements: [{ container: player, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
  });
  for (const [name, npc] of [
    ['maa', maaNpc],
    ['halwai', halwaiNpc],
    ['teacher', teacherNpc],
    ['sister', sisterNpc],
    ['pitaji', pitajiNpc],
  ]) {
    assetSlots.register(name, {
      dimensions: PERSON_DIMENSIONS,
      hide: [npc.userData.mesh],
      placements: [{ container: npc, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
    });
  }
  // charpai/hand_pump (queue item 3 builds these — see src/village.js
  // buildHouseInteriorProps, which keeps each in its own small Group for exactly
  // this reason: independently hideable once a real model exists).
  assetSlots.register('charpai', {
    dimensions: { w: 0.9, h: 0.5, d: 1.9 },
    hide: houseCharpaiGroup.children.slice(),
    placements: [{ container: houseCharpaiGroup, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
  });
  assetSlots.register('hand_pump', {
    dimensions: { w: 0.5, h: 1.4, d: 0.5 },
    hide: houseHandPumpGroup.children.slice(),
    placements: [{ container: houseHandPumpGroup, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }],
  });

  // TEMPORARY end-to-end test slot (queue item 1's required test) — named
  // "ceramic_pot" to match the model that already exists at
  // public/assets/models/ceramic_pot.glb (used elsewhere for the halwai's own pots,
  // loaded directly rather than through this system — unrelated, just the same
  // source file), so detection finds it immediately without adding a new file. A
  // bright, obviously-fake magenta box stands in for "the placeholder" here — proves
  // detect -> load -> scale -> ground -> place -> hide-the-placeholder end to end.
  // Safe to remove once a real slot needs testing instead; costs one draw call.
  const testPotPlaceholder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
  testPotPlaceholder.position.set(HOUSE_CENTER.x + 3, 0.2, HOUSE_CENTER.z + 2);
  testPotPlaceholder.castShadow = true;
  scene.add(testPotPlaceholder);
  assetSlots.register('ceramic_pot', {
    dimensions: { w: 0.5, h: 0.6, d: 0.5 },
    hide: [testPotPlaceholder],
    placements: [{ container: scene, position: testPotPlaceholder.position.clone(), rotationY: 0 }],
  });

  assetSlots.resolveAll().then((results) => {
    if (isDevMode()) console.log('[assetSlots] resolved:', results.map((r) => r.value || r.reason));
  });

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
    const fieldGroup = buildField(scene);
    const backgroundHousesGroup = buildBackgroundHouses(scene, buildingKit);
    cameraObstacles.push(backgroundHousesGroup); // camRig already holds this array by reference
    buildingKit.finalize(scene); // flush the background houses' plinth/pilaster instances too

    // Headroom pass (docs/parked.md) — one village-wide merge across every static
    // building group now that everything (hero zone, shops, bazaar/chowk,
    // background houses, field) is in the scene, folding same-material meshes
    // together regardless of which building added them (texturedWallBox/
    // texturedThickBox/etc already share one cached Material per texture family +
    // tiling + roughness across the whole village, so this is safe — see
    // src/mergeUtils.js). Scoped to exactly these 5 static roots, never `scene`
    // itself — scene also holds the player, vehicles and NPCs, and merging an
    // animated mesh detaches it from the group that moves it every frame.
    // Skipped subtrees are every asset slot (assetSlots.js) whose `hide` list, or
    // whose interaction code, holds a direct reference to a specific mesh captured
    // before this merge runs: `halwai_shop` (whole-building slot), `charpai` and
    // `hand_pump` (house interior prop slots), `pump_water`/`tulsi_water` (the
    // pump/tulsi interaction's flashed water meshes) — folding any of these into a
    // merged mesh would make that captured reference stale.
    //
    // Merged output goes into its own group (not loose into `scene`) and that group
    // is pushed into `cameraObstacles` — the 5 source groups are what the camera rig
    // was colliding against for occlusion, and this merge empties them of everything
    // except the skipped subtrees, so without this the camera would start clipping
    // through every merged wall/roof.
    const villageStaticGroup = new THREE.Group();
    villageStaticGroup.name = 'village_static_merged';
    scene.add(villageStaticGroup);
    mergeAcrossGroups([heroZoneGroup, shopsGroup, bazaarGroup, templeGroup, backgroundHousesGroup, fieldGroup], villageStaticGroup, {
      skipNames: ['halwai_shop', 'charpai', 'hand_pump', 'pump_water', 'tulsi_water'],
    });
    cameraObstacles.push(villageStaticGroup);

    // Structural fix (playtest) — derive every static collider from the real,
    // now-fully-built scene graph, once, here (after the merges above, which
    // themselves preserve each source wall/counter's real collider — see
    // src/mergeUtils.js). Nothing in this codebase hand-types a collider box
    // matched to a building's coordinates anymore; if a building moves, this
    // picks up the new position automatically because it reads the same mesh.
    initStaticColliders(scene);
  }

  const audio = new AudioEngine();
  let started = false;
  const savedGame = loadSavedGame(); // item 7 — read once, before the title screen decides Play-vs-Continue
  setupStartOverlay({
    isTouch: touch,
    hasSave: !!savedGame,
    onStart: (isContinue) => {
      started = true;
      audio.start(); // must happen inside this gesture handler to unlock on iOS/Safari
      if (!touch) input.requestPointerLock();
      loadDeferredContent();

      if (isContinue) {
        // Continue (item 7) — resumes quest progress, skips the new-player tutorial.
        continueFromSave(savedGame);
        return;
      }

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

  // Bugfix 2/4 — trolley attach/detach's own prompt (index.html #attach-hint), fully
  // separate from the mount/dismount one above: different DOM element, different key
  // badge (F, not E), different InputController flag (consumeAttach(), not
  // consumeInteract()). Shown only on the frames attaching/detaching is actually
  // possible, same shape as setInteractPrompt/hideInteractPrompt but no pulse.
  const attachHint = document.getElementById('attach-hint');
  const attachHiEl = document.getElementById('attach-hi');
  const attachEnEl = document.getElementById('attach-en');

  function setAttachPrompt(hi, en) {
    attachHiEl.textContent = hi;
    attachEnEl.textContent = en;
    attachHint.classList.add('visible');
  }

  function hideAttachPrompt() {
    attachHint.classList.remove('visible');
  }

  let mountedVehicle = null;

  const dialogue = new Dialogue();

  // The errand (item 3) — one small in-memory state object, no save system.
  const quest = createQuestState();
  const objectivePanel = document.getElementById('objective-panel');
  const objectiveHiEl = document.getElementById('objective-hi');
  const objectiveEnEl = document.getElementById('objective-en');
  const moneyPanel = document.getElementById('money-panel');
  const moneyEnEl = document.getElementById('money-en');
  const moneyHiEl = document.getElementById('money-hi');
  const endCard = document.getElementById('end-card');
  const endEnEl = document.getElementById('end-en');
  const endHiEl = document.getElementById('end-hi');
  const endContinueBtn = document.getElementById('end-continue-btn');
  const playAgainBtn = document.getElementById('play-again-btn');
  const endCreditsBtn = document.getElementById('end-credits-btn');

  function updateObjective() {
    const entry = OBJECTIVE_TEXT[quest.step];
    const text = typeof entry === 'function' ? entry(quest) : entry;
    objectiveHiEl.textContent = text.hi;
    objectiveEnEl.textContent = text.en;
    objectivePanel.classList.toggle('visible', quest.step !== QUEST_STEPS.ALL_COMPLETE);
    // Third errand — money is shown only while it's actually relevant (from Pitaji's
    // offer through the final end card), per this task's own instruction.
    const moneyVisible = [QUEST_STEPS.LOADING_WHEAT, QUEST_STEPS.WHEAT_DELIVERED, QUEST_STEPS.BOUGHT_GOODS].includes(quest.step);
    moneyPanel.classList.toggle('visible', moneyVisible);
    if (moneyVisible) {
      moneyEnEl.textContent = `Money: ₹${quest.money}`;
      moneyHiEl.textContent = `पैसे: ₹${quest.money}`;
    }
    // Item 7 (save/continue) — every quest-step change (interactions.js's
    // onObjectiveChange) and both reset paths below call this, so a save is always in
    // sync with real progress without a separate save-trigger call anywhere else.
    // Gated on `started`: this function also runs once during initial setup, before
    // the title screen's Play/Continue choice is even made — saving there would
    // silently overwrite a real save with NOT_STARTED on every page load.
    if (started) saveGame({ questStep: quest.step, quality: currentQuality });
  }
  updateObjective();

  // Continue (item 7) — restores quest.step only; world/NPC positions reset to their
  // normal spawn, same as a fresh game (see docs/parked.md for why). The one exception
  // is the sister: HAVE_SISTER means she should already be following, so she's placed
  // beside the player's own spawn point rather than left waiting at the school.
  function continueFromSave(saved) {
    if (!saved || !Object.values(QUEST_STEPS).includes(saved.questStep)) return;
    quest.step = saved.questStep;
    if (quest.step === QUEST_STEPS.HAVE_SISTER) {
      sisterFollowing = true;
      sisterNpc.position.set(-48, 0, 23);
      sisterNpc.rotation.y = 0;
    }
    // Third errand — carried-sack meshes and the exact sack/money counts aren't part
    // of the save (same simplification as every other mid-errand position reset on
    // Continue, see the doc comment above this function's own earlier callers): if
    // resuming mid-errand-3, restart it cleanly from Pitaji's offer rather than
    // resuming with a count nothing on screen backs up.
    if ([QUEST_STEPS.LOADING_WHEAT, QUEST_STEPS.WHEAT_DELIVERED, QUEST_STEPS.BOUGHT_GOODS].includes(quest.step)) {
      quest.step = QUEST_STEPS.ERRAND2_COMPLETE;
    }
    quest.sacksCollected = 0;
    quest.sacksDelivered = 0;
    quest.money = 0;
    updateObjective();
  }

  // Task 4/this task — errand 1 and errand 2's own completions aren't the end of the
  // game any more (the next errand unlocks from talking to Maa/Pitaji again), so
  // those cards show only "Continue" (dismiss, keep playing); only the truly final
  // card (all three errands done) offers Play again + Credits — see src/quest.js's
  // QUEST_STEPS doc comment.
  function showEndCard(step) {
    const isFinal = step === QUEST_STEPS.ALL_COMPLETE;
    if (isFinal) {
      endEnEl.textContent = 'All three errands are done. The afternoon is yours.';
      endHiEl.textContent = 'तीनों काम हो गए। बाकी दोपहर तुम्हारी है।';
    } else if (step === QUEST_STEPS.ERRAND2_COMPLETE) {
      endEnEl.textContent = 'Both errands are done. The afternoon is yours.';
      endHiEl.textContent = 'दोनों काम हो गए। बाकी दोपहर तुम्हारी है।';
    } else {
      endEnEl.textContent = 'The jalebi made it home.';
      endHiEl.textContent = 'जलेबी घर पहुँच गई!';
    }
    endContinueBtn.style.display = isFinal ? 'none' : 'flex';
    playAgainBtn.style.display = isFinal ? 'flex' : 'none';
    endCreditsBtn.style.display = isFinal ? 'flex' : 'none';
    endCard.classList.add('visible');
    objectivePanel.classList.remove('visible');
  }

  function currentWaypointTarget() {
    if (quest.step === QUEST_STEPS.NOT_STARTED) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_MONEY) return HALWAI_NPC_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_JALEBI) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.COMPLETE) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_TIFFIN) return TEACHER_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_SISTER) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.ERRAND2_COMPLETE) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.LOADING_WHEAT) return quest.sacksCollected > quest.sacksDelivered ? KIRANA_POSITION : SACK_PILE_POSITION;
    if (quest.step === QUEST_STEPS.WHEAT_DELIVERED) return STORE_POS;
    if (quest.step === QUEST_STEPS.BOUGHT_GOODS) return PITAJI_POSITION;
    return null; // ALL_COMPLETE — all three errands done, nowhere to point
  }

  // Shared by the end card's "Play again" button and the pause menu's "Restart
  // errand" button (task 2) — resets both errands at once (one continuous quest.step,
  // see src/quest.js), including the sister's following state/position (task 4).
  function restartErrand() {
    quest.step = QUEST_STEPS.NOT_STARTED;
    endCard.classList.remove('visible');
    sisterFollowing = false;
    sisterNpc.position.copy(SISTER_SCHOOL_POSITION);
    sisterNpc.rotation.y = 0;
    quest.sacksCollected = 0;
    quest.sacksDelivered = 0;
    quest.money = 0;
    sackCarrier.clearAll();
    updateObjective();
  }

  endContinueBtn.addEventListener('click', () => {
    endCard.classList.remove('visible');
    updateObjective();
  });
  playAgainBtn.addEventListener('click', restartErrand);

  // Credits (task 5) — reachable from the pause menu and shown after the final end
  // card. Doesn't need its own pause bookkeeping: opened from the pause menu, the
  // game is already frozen (paused === true); opened from the end card, the world
  // is already hidden behind it — either way credits.js's own overlay just needs to
  // render on top (index.html gives it the highest z-index of the three).
  const credits = setupCredits();
  function showCredits() {
    credits.open();
  }
  endCreditsBtn.addEventListener('click', showCredits);

  // Shared context passed to every interaction point's label()/available()/onInteract().
  const interactionCtx = {
    audio,
    dialogue,
    quest,
    onObjectiveChange: updateObjective,
    onErrandComplete: showEndCard,
    onSisterCollected: () => {
      sisterFollowing = true;
    },
    onPumpWater: () => flashWaterMesh(pumpWaterMesh),
    onWaterTulsi: () => flashWaterMesh(tulsiWaterMesh),
    tractor: tractorForShadows, // third errand — isTrolleyNearby() reads this live, see src/wheatErrand.js
    sackCarrier,
  };

  function otherVehicleBoxes(excludeVehicle) {
    const boxes = [];
    for (const v of vehicles) {
      if (v !== excludeVehicle) boxes.push(vehicleFootprintBox(v));
    }
    return boxes;
  }

  // Item 3 (house interior) — the only place the player's Y ever changes: the game
  // otherwise has no vertical movement/gravity at all (every other surface is y=0).
  // The staircase ramps smoothly from ground to roof height by Z position; the roof
  // itself only "catches" the player if they're already most of the way up (arrived
  // via the stairs) — without that check, just walking around *underneath* the roof,
  // inside the ground-floor rooms (same X/Z footprint, different Y), would wrongly
  // teleport them up to it.
  function groundHeightAt(x, z, currentY) {
    const s = HOUSE_STAIRS;
    const halfW = s.width / 2;
    const zMin = Math.min(s.zStart, s.zEnd);
    const zMax = Math.max(s.zStart, s.zEnd);
    if (x > s.x - halfW && x < s.x + halfW && z >= zMin && z <= zMax) {
      const t = (s.zStart - z) / (s.zStart - s.zEnd);
      return THREE.MathUtils.clamp(t, 0, 1) * s.yTop;
    }
    const roofHalfW = HOUSE_BLOCK.w / 2 + 0.3;
    const roofHalfD = HOUSE_BLOCK.d / 2 + 0.3;
    // West edge extended to include the staircase's own top landing (s.x sits
    // outside the roof's own footprint, west of the wall it climbs) — without this,
    // stepping off the top step landed just outside "on the roof" and fell straight
    // back to y=0 (found by actually walking the stairs end to end, not by
    // inspection — see docs/parked.md).
    const roofMinX = Math.min(HOUSE_BLOCK.cx - roofHalfW, s.x - halfW);
    const onRoofFootprint = x > roofMinX && x < HOUSE_BLOCK.cx + roofHalfW && z > HOUSE_BLOCK.cz - roofHalfD && z < HOUSE_BLOCK.cz + roofHalfD;
    if (onRoofFootprint && currentY > s.yTop * 0.5) return s.yTop;
    return 0;
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

  // Lying on the charpai (item 5 of the current queue) — same "camera settles,
  // ambience rises, same key stands back up" pattern as sitting above, just a lower
  // camera (lying down, not sitting up). Mutually exclusive with `sitting` — the
  // interaction system only offers one prompt at a time per position anyway.
  let lying = false;

  function lieDown() {
    lying = true;
    interactionCtx.lying = true;
    camRig.distance = LIE_CAMERA_DISTANCE;
    camRig.height = LIE_CAMERA_HEIGHT;
    audio.setSitting(true);
  }

  function standUpFromLying() {
    lying = false;
    interactionCtx.lying = false;
    camRig.distance = CAMERA_DISTANCE;
    camRig.height = CAMERA_HEIGHT;
    audio.setSitting(false);
  }

  interactionCtx.onLieDown = lieDown;

  // Pump water / water the tulsi (item 5) — the "simple water effect" is a small
  // pre-built mesh (src/village.js buildHouseInteriorProps), hidden by default and
  // flashed visible briefly here; the sound is the actual effect, this is just a
  // visual accent for it.
  function flashWaterMesh(mesh) {
    if (!mesh) return;
    mesh.visible = true;
    setTimeout(() => {
      mesh.visible = false;
    }, 1200);
  }

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
    onVolumeChange: (v) => audio.setMasterVolume(v),
    onShowCredits: showCredits,
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
      if (sisterFollowing) sisterFollow(dt);
      MAA_POSITION.copy(maaNpc.position);
      bazaarLife.update(dt);

      // Item 8 (audio mix pass) — the whole mix ducks under the dialogue panel,
      // same as it would duck under actual voice lines if there were any.
      audio.setDialogueOpen(dialogue.isOpen);

      // Bugfix 2/4 — default the attach/detach prompt to hidden every frame; only the
      // mounted-tractor branch below re-shows it, on the specific frames it applies.
      // Simpler and more robust than remembering to hide it in every other branch
      // (dialogue/sitting/lying/walking) whenever mountedVehicle stops being a tractor.
      hideAttachPrompt();

      if (dialogue.isOpen) {
        // Dialogue pauses movement/interaction entirely — it advances only on
        // click/tap/Space (handled inside Dialogue itself), not E.
        hideInteractPrompt();
      } else if (sitting) {
        setInteractPrompt('खड़े हो जाएं', 'Stand up');
        if (interactPressed) standUp();
      } else if (lying) {
        setInteractPrompt('खड़े हो जाएं', 'Stand up');
        if (interactPressed) standUpFromLying();
      } else if (mountedVehicle) {
        // Bugfix 2/4 — a stable snapshot for this whole frame: `dismount()` below
        // sets the outer `mountedVehicle` to null, and it must run LAST in this
        // branch (E is unconditional now, see below) — reading the outer variable
        // again after that point would throw. Every read in this branch uses
        // `vehicle`, never `mountedVehicle`, until the final dismount() call.
        const vehicle = mountedVehicle;
        vehicle.update(dt, input); // proposes vehicle.pendingDx/pendingDz — does not move it (see vehicles.js)
        const p = vehicle.preset;
        const vehicleRadius = Math.max(p.body.w, p.body.d) / 2;
        // Playtest bug 5: a vehicle blocked by a wall kept its internal `speed`
        // slowly damping toward 0 over several more seconds (this project's vehicles
        // accelerate/decelerate deliberately slowly) even though resolveCollisions
        // was pinning its position at the wall the whole time — the still-large
        // deceleration kept the tractor's brake-dip body pitch (kind === 'tractor'
        // branch below) clamped near its max for that entire tail, sinking its nose
        // corner below ground. A real vehicle stops on contact, not several seconds
        // later, so zero `speed` immediately when collision actually had to correct
        // the position (a no-op graze under 1cm is not treated as a stop).
        const preCollisionX = vehicle.group.position.x;
        const preCollisionZ = vehicle.group.position.z;
        // Structural fix (playtest, item 2) — the one swept movement resolver
        // every moving body in this game goes through now, instead of writing
        // the full delta directly and separately resolving only the endpoint
        // (which a fast-moving vehicle could tunnel a thin wall between, in one
        // frame).
        resolveMove(vehicle.group.position, vehicle.pendingDx, vehicle.pendingDz, vehicleRadius, otherVehicleBoxes(vehicle));
        vehicle.group.position.x = THREE.MathUtils.clamp(vehicle.group.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        vehicle.group.position.z = THREE.MathUtils.clamp(vehicle.group.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        const collisionCorrection = Math.hypot(vehicle.group.position.x - preCollisionX, vehicle.group.position.z - preCollisionZ);
        const properlyBlocked = Math.hypot(vehicle.pendingDx, vehicle.pendingDz) - collisionCorrection > 0.01;
        if (properlyBlocked) {
          vehicle.speed = 0;
          // Zeroing speed alone still leaves this frame's brake-dip body pitch/roll
          // (computed inside vehicle.update() above, before this correction was
          // known) damping back to level over the next several frames — while the
          // player holds the throttle into the wall, speed keeps re-ramping up from
          // 0 and getting rezeroed every frame, so the dip never gets a chance to
          // relax. A vehicle pinned against a wall should read as stopped, not mid-
          // dive, so snap the body level immediately instead of waiting for it.
          if (vehicle.bodyPivot) {
            vehicle.bodyPivot.rotation.x = 0;
            vehicle.bodyPivot.rotation.z = 0;
          }
        }
        audio.setVehicle(vehicle.preset.kind, vehicle.speed / vehicle.preset.maxSpeed);

        // Structural fix (playtest, item 2) — the towed trolley's own position:
        // computed and resolved AFTER the tractor above, so it always rigidly
        // targets the tractor's real (already-resolved) hitch point, never a
        // stale pre-collision one. If the trolley is blocked short of that
        // target, the shortfall is subtracted from the TRACTOR's position too —
        // "when the trolley is blocked, the tractor is blocked with it" — instead
        // of the trolley silently breaking its rigid link to slide along a wall
        // on its own while the tractor keeps driving.
        if (p.kind === 'tractor' && vehicle.trolley && vehicle.trolley.attached) {
          const trolley = vehicle.trolley;
          const trolleyPrevX = trolley.group.position.x;
          const trolleyPrevZ = trolley.group.position.z;
          trolley.updateYawHinge(dt, vehicle);
          const target = trolley.hitchTargetPosition(vehicle);
          const { shortfallX, shortfallZ } = resolveTowedMove(trolley.group.position, target, TROLLEY_COLLISION_RADIUS, otherVehicleBoxes(vehicle));
          if (Math.abs(shortfallX) > 1e-4 || Math.abs(shortfallZ) > 1e-4) {
            vehicle.group.position.x -= shortfallX;
            vehicle.group.position.z -= shortfallZ;
            vehicle.speed = 0;
          }
          trolley.finishMoveStep(dt, trolleyPrevX, trolleyPrevZ);
        }

        // Trolley attach/detach (bugfix 2/4) — entirely separate from mount/dismount
        // below: its own key (F desktop / #attach-hint's own tap target on touch,
        // both via consumeAttach()), its own prompt (setAttachPrompt/hideAttachPrompt),
        // shown only on the frames it's actually possible. The two used to share E/one
        // prompt, which is what let mounting (or a held E's native key-repeat)
        // interfere with attaching/detaching.
        if (p.kind === 'tractor') {
          const candidateTrolley = vehicle.trolley || looseTrolley;
          if (!vehicle.trolley && candidateTrolley) {
            const hitchDist = vehicle.hitchWorldPoint.distanceTo(candidateTrolley.hitchWorldPoint);
            const eligible = vehicle.speed < -0.05 && hitchDist < p.attachRadius;
            if (eligible) {
              setAttachPrompt('ट्रॉली जोड़ें', 'Attach trolley');
              if (attachPressed) {
                vehicle.attachTrolley(candidateTrolley);
                looseTrolley = null;
              }
            } else {
              hideAttachPrompt();
            }
          } else if (vehicle.trolley) {
            setAttachPrompt('ट्रॉली अलग करें', 'Detach trolley');
            if (attachPressed) {
              looseTrolley = vehicle.detachTrolley();
            }
          } else {
            hideAttachPrompt();
          }
        } else {
          hideAttachPrompt();
        }

        // E is ALWAYS just mount/dismount now, unconditionally — must run last in
        // this branch (see the note where `vehicle` is captured, above).
        setInteractPrompt('उतर जाएं', 'Dismount');
        if (interactPressed) dismount();
      } else {
        forward.set(-Math.sin(camRig.yaw), 0, -Math.cos(camRig.yaw));
        right.set(Math.cos(camRig.yaw), 0, -Math.sin(camRig.yaw));

        moveDir.set(0, 0, 0);
        moveDir.addScaledVector(forward, -input.moveZ);
        moveDir.addScaledVector(right, input.moveX);
        if (moveDir.lengthSq() > 1) moveDir.normalize();

        // Structural fix (playtest, item 2) — swept resolveMove(), same as every
        // other moving body, instead of moving the full step then resolving only
        // the endpoint.
        resolveMove(player.position, moveDir.x * MOVE_SPEED * dt, moveDir.z * MOVE_SPEED * dt, PLAYER_COLLISION_RADIUS, otherVehicleBoxes(null));
        player.position.x = THREE.MathUtils.clamp(player.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        player.position.y = groundHeightAt(player.position.x, player.position.z, player.position.y);
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
      dust.update(dt, now / 1000);
      contactShadows.update([
        ...vehicles.map((v) => ({ x: v.group.position.x, z: v.group.position.z, radiusX: v.preset.body.w / 2 + 0.3, radiusZ: v.preset.body.d / 2 + 0.3 })),
        { x: trolleyForShadows.group.position.x, z: trolleyForShadows.group.position.z, radiusX: 1.2, radiusZ: 1.8 },
      ]);
      updateDayline(dayProgressForQuestStep(quest.step), dt);
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
      npcs: [maaNpc, halwaiNpc, childNpc, teacherNpc, sisterNpc, pitajiNpc],
      props: [bellProp],
      interactions: {
        MAA_POSITION,
        HALWAI_NPC_POSITION,
        BELL_POSITION,
        CHARPAI_POSITION,
        TEACHER_POSITION,
        SISTER_SCHOOL_POSITION,
        INTERACTION_POINTS,
        PITAJI_POSITION,
        SACK_PILE_POSITION,
        KIRANA_POSITION,
      },
      sackCarrier,
      interactionCtx,
      isSisterFollowing: () => sisterFollowing,
      dialogue,
      quest,
      QUEST_STEPS,
      mount,
      dismount,
      sitDown,
      standUp,
      lieDown,
      standUpFromLying,
      isSitting: () => sitting,
      isLying: () => lying,
      pumpWaterMesh,
      tulsiWaterMesh,
      setQuality,
      getQuality: () => currentQuality,
      isPaused: () => paused,
      pauseMenu,
      Box3: THREE.Box3,
      Matrix4: THREE.Matrix4,
      Vector3: THREE.Vector3,
      // For scripted feature screenshots (tools/screenshot.js) — teleport near an
      // interaction point and trigger it without needing to actually walk there.
      teleportPlayer: (x, z) => player.position.set(x, 0, z),
      interact: () => {
        if (mountedVehicle) return;
        const nearestPoint = findNearestInteraction(player.position, interactionCtx);
        if (nearestPoint) nearestPoint.onInteract(interactionCtx);
      },
      // Structural fix 3/3 (playtest) — a real "framed screenshot" capture mode.
      // Every prior acceptance screenshot this session used the player's own
      // third-person rig, which chases the player and was repeatedly unusable
      // as evidence (the player's own capsule filling the frame, a random part
      // of a vehicle in extreme close-up, the target object off-screen or tiny
      // in the distance). frameObject(name, opts) finds a named object anywhere
      // in the scene, computes its real world bounding box, and points the RAW
      // camera at its centre from a chosen angle/elevation at a distance
      // computed to fill most of the frame — bypassing camRig (frozen via
      // camRig.update = () => {} so the game's own per-frame render loop can't
      // overwrite this positioning before the screenshot is taken) and hiding
      // the player capsule entirely. unfreezeCamera() restores normal play.
      frameObject: (name, { angleDeg = 0, elevationDeg = 12, fill = 0.7 } = {}) => {
        let target = null;
        scene.traverse((o) => {
          if (o.name === name) target = o;
        });
        if (!target) return { found: false };
        const box = new THREE.Box3().setFromObject(target, true);
        if (!isFinite(box.min.x)) return { found: false };
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.length() / 2, 0.05);
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const dist = radius / fill / Math.tan(vFov / 2);
        const angleRad = THREE.MathUtils.degToRad(angleDeg);
        const elevRad = THREE.MathUtils.degToRad(elevationDeg);
        camera.position.set(
          center.x + dist * Math.sin(angleRad) * Math.cos(elevRad),
          center.y + dist * Math.sin(elevRad),
          center.z + dist * Math.cos(angleRad) * Math.cos(elevRad)
        );
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        player.visible = false;
        if (!camRig._frameObjectOrigUpdate) camRig._frameObjectOrigUpdate = camRig.update.bind(camRig);
        camRig.update = () => {};
        return {
          found: true,
          center: { x: center.x, y: center.y, z: center.z },
          size: { x: size.x, y: size.y, z: size.z },
          distance: dist,
        };
      },
      unfreezeCamera: () => {
        if (camRig._frameObjectOrigUpdate) camRig.update = camRig._frameObjectOrigUpdate;
        player.visible = true;
      },
    };
  }
}

main();
