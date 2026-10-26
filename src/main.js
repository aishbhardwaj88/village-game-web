import * as THREE from 'three';
import { createRenderer, resizeRendererToDisplaySize } from './renderer.js';
import { createScene, createGround, createSun, loadEnvironment, applyFog, GROUND_SIZE } from './scene.js';
import { createPlayer, ThirdPersonCamera, CAMERA_DISTANCE, CAMERA_HEIGHT, PLAYER_RADIUS, PLAYER_HEIGHT } from './player.js';
import { InputController, isTouchDevice } from './controls.js';
import { createComposer, resizeComposer } from './postfx.js';
import { setupFpsCounter, setupStartOverlay, setupLoadingScreen, markOpeningViewLoaded, isDevMode } from './ui.js';
import { createSky, updateSky } from './sky.js';
import { getActiveAtmosphere } from './atmosphere.js';
import { buildHeroZone, HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER, HOUSE_BLOCK, HOUSE_STAIRS, HOUSE_ROOF_Y, SCHOOL_ROOM, HOUSE_HAND_PUMP_POSITION, PALETTE, darken } from './village.js';
import { BuildingKit } from './buildingKit.js';
import { createWayfinding } from './wayfinding.js';
import { milestoneSites, createMilestone } from './milestones.js';
import { roadLegs, spurLegs, roadAt } from './eastRoad.js';
import { propCells, createPropCell } from './villageProps.js';
import { roofCells, createRoofCell } from './rooftops.js';
import { mergeAcrossGroups, mergeGroupByMaterial } from './mergeUtils.js';
import { buildContactShadows } from './contactShadows.js';
import { createAssetSlotRegistry } from './assetSlots.js';
import { buildField, FIELD_CENTER, FIELD_SIZE, TRACK_CORNERS } from './field.js';
import { buildCanal, distanceToCanalWater } from './canal.js';
import { buildVegetation, lanesideClusters, buildGardenPlants, GARDEN_KIND } from './vegetation.js';
import { buildTrees } from './trees.js';
import { BAAGH_POSITION, MANGO_TREE_PLACEMENTS, MANGO_KNOCK_POSITIONS } from './baagh.js';
import { buildDust } from './dust.js';
import { spawnVehicles, buildBikeGroup, updateWheel, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH } from './vehicles.js';
import { WALKABLE_RECTS } from './walkable.js';
import { pt } from './anchors.js';
import { wireSiteSlot, slotInfo, isPlaceSite } from './siteSlots.js';
import { resolveMove, resolveOrientedMove, resolveTowedMove, positionBlocked } from './movement.js';
import { AudioEngine } from './audio.js';
import { buildBackgroundHouses, abadiGardenPlants, abadiSmokeSources, abadiPropSites, abadiRoofSites } from './scenery.js';
import {
  buildTemple,
  buildTempleProps,
  buildFlowerStall,
  buildTempleLane,
  TEMPLE_POS,
  PLINTH as TEMPLE_PLINTH,
  PEEPAL_PLATFORM_POS,
  PEEPAL_PLATFORM_RADIUS,
  FLOWER_STALL_POS,
  TEMPLE_LANE_START,
  TEMPLE_LANE_BEND,
  TEMPLE_LANE_ARRIVE,
  TEMPLE_LANE_WIDTH,
} from './temple.js';
import { vehicleFootprintBox, vehicleSolidBoxes, orientedFootprintBox, orientedBoxClearance, orientedBoxWorstClearance, initStaticColliders, requestColliderRebuild, setStaticColliders, AUTO_BODY_RADIUS, lastCarves, colliderStats, minSignedDistanceToColliders, STATIC_COLLIDERS, orientedBoxOverlapsAnyBox, resolveOrientedCollisions } from './collision.js';
import {
  buildBazaarRow,
  buildBazaarCountersAndShutters,
  buildBazaarSignboards,
  buildBazaarInteriors,
  buildBazaarKiranaGoods,
  buildTeaStallChowk,
  buildChowkPlaza,
  buildBazaarLane,
  BAZAAR_UNITS,
  bazaarUnitCx,
  BAZAAR_FRONT_Z,
  BAZAAR_ROW_CZ,
  CHOWK_TEA_POS,
  CHOWK_TEA_ROT,
  CHOWK_CENTER,
  BAZAAR_LANE_START,
  BAZAAR_LANE_BEND,
  BAZAAR_LANE_ARRIVE,
  BAZAAR_LANE_ROW_WIDTH,
  BAZAAR_ROW_FRONTAGE_START,
  BAZAAR_WEST_X,
  BAZAAR_EAST_X,
} from './bazaar.js';
import { createNPC } from './npc.js';
import { createMonkeyNPC, createCattleHerd, createDogPack, ANIMAL_MESHES } from './animals.js';
import { createZoneManager } from './zoneManager.js';
import { BUILDING_ROUTES } from './doorRouting.js';
import { createWaypointLoop, createStirLoop, createFollowRoutine, createWaypointRun, ROUTES as NPC_ROUTES } from './npcRoutines.js';
import { CHARACTER_BUILDERS, createHumanoidAnimator } from './characters.js';

// Finish-line Step 2 — a code-built stylised character (src/characters.js) in
// place of a flat capsule, for the four named NPCs the art director asked for
// first (Maa, Dada, postman, halwai). Keeps the exact same contract
// createNPC()'s capsule already had — a named Group with `.userData.mesh` set
// to the one real visible mesh (so the existing asset-slot hide-list
// (assetSlots.register below) and src/npcRoutines.js's waypoint/follow
// rotation keep working completely unchanged — those only ever touch
// `npcGroup.position`/`.rotation.y`, never caring what's inside. The returned
// `animate(dt, isMoving)` is new — call it once per frame (main.js's render
// loop below) to drive the character's own idle-breathing/walk-cycle rock.
function buildCharacterNpc(key, position, rotationY, name) {
  const { root, bodyPivot } = CHARACTER_BUILDERS[key]();
  root.name = name;
  root.position.set(position.x, 0, position.z);
  root.rotation.y = rotationY;
  root.userData.mesh = bodyPivot.children[0]; // the one merged draw call
  return { root, animate: createHumanoidAnimator(bodyPivot) };
}
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
  registerDarziKurta,
  linkPostmanPosition,
  linkMonkeyPosition,
  registerMangoKnock,
  registerRoofEnding,
} from './interactions.js';
import { buildSackPile, createSackCarrier, PITAJI_POSITION, SACK_PILE_POSITION, KIRANA_POSITION } from './wheatErrand.js';
import { surfaceAt } from './surfaces.js';
import { registerStagingYard } from './stagingYard.js';
import { createPond, createTubewell, createTeaStallHaystacks, createSugarcaneBelt, createJohad, createKhalihan, createAnganwadi, createDudhDairy, createHealthSubCentre, createChemist, createMasjid, createGurudwara, createTvHouse, createManihari, createSabziRehris, createJainMandir, createHighwayCluster, createJalebiStall, createBantaShop, createChaatThela, createMelaGround, createKhelMaidan, createGurukul, createMandi, createCanalBankRoad, createEastRoadLeg, createBoundaryWall, createOldHaveli, createGaushala, createCarromScene, createLaneLaundry, createLaneWaterCorner } from './farmSites.js';
import { createBellProp, createFlagpoleProp, createDonationBoard, createStreetLamps, createWaterTankProp } from './props.js';
import { createBazaarLife } from './bazaarLife.js';
import { createDaylineController, dayProgressForQuestStep } from './dayline.js';
import { buildTeaStall, buildGeneralStore, buildGeneralStoreGoods, buildShopRoofs, buildShopWalls, buildShopCounters, TEA as TEA_DIMS, STORE as STORE_DIMS } from './shops.js';
import { buildPostOffice, buildRationShop, buildAttaChakki, buildNewShopWalls, buildNewShopRoofs, buildNewShopProps, buildNewShopSignboards, RATION_SHOP } from './newShops.js';
import { placeBoardsMesh } from './placeBoards.js';
import { setPlantFocus } from './realPlants.js';
import { generalStoreGoods, rationGoods, halwaiGoods, teaStallGoods, mergeGoodsMeshes } from './shopGoods.js';
import { buildSignboards } from './signboards.js';
import { createSteam } from './steam.js';
import { createHalwaiFire } from './halwaiFire.js';
import { updateWater } from './water.js';
import { Dialogue } from './dialogue.js';
import { createQuestState, QUEST_STEPS, OBJECTIVE_TEXT } from './quest.js';
import { createWaypointGlow, updateWaypoint } from './waypoint.js';
import { applyQuality, loadSavedQuality, saveQuality, loadSavedVolume, saveVolume } from './quality.js';
import { loadSavedGame, saveGame } from './save.js';
import { setupPauseMenu } from './pause.js';
import { setupCredits } from './credits.js';
import { setupControlsHelp } from './controlsHelp.js';
import { createFreeRoam, LANES as MAP_LANES, PLACES } from './freeRoam.js';
import { createMinimap } from './minimap.js';
import { createSideJobs } from './sideJobs.js';
import { createAmbientLife } from './ambient.js';

const GROUND_HALF_EXTENT = GROUND_SIZE / 2 - 2; // keep the player a couple metres inside the ground
const GROUND_HALF_X = 880; // the staging yard (src/stagingYard.js) lies east of the village; the drawn ground reaches x 912
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

  // Item 3a (real playtest report — "the village reads as desert", flat grey
  // gravel in every direction) — patchy dry-grass tint across the open ground
  // plus a darker damp patch around the hand pump (src/village.js's
  // HOUSE_HAND_PUMP_POSITION), both shader-only (no new geometry/texture asset,
  // no new draw call — see applyGroundNoiseDetail in src/materials.js).
  // Step E (2026-10-20, art director: "the village still reads as a desert...
  // ground tone warmer and less grey") — a real green patch tint (PALETTE.
  // grassGreen) instead of the deliberately-dry greyGreen this started with, at
  // higher coverage so it actually reads from a normal play distance.
  const ground = createGround({
    grassTint: 0x7b8a4a,
    grassCoverage: 0.7,
    dampSpots: [{ x: HOUSE_HAND_PUMP_POSITION.x, z: HOUSE_HAND_PUMP_POSITION.z, radius: 2.2, tint: darken(0xffffff, 0.75) }],
  });
  scene.add(ground);

  const atmosphere = getActiveAtmosphere();
  const sun = createSun(touch, atmosphere);
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
  // Art review 1 (bazaar row): the sun sits on the +x/+z side, so every -z-facing front (the whole bazaar row, shop
  // counters under the awning) was in flat shadow and read as a dark grey block. A weak warm bounce from the -z side, no
  // shadows, no draw call, lifts those faces without touching the sun's shadows.
  const bounceFill = new THREE.DirectionalLight(0xffe2b8, 0.55);
  bounceFill.position.set(-20, 14, -60);
  scene.add(bounceFill);

  const sky = createSky(sun.position, atmosphere);
  scene.add(sky);
  applyFog(scene, atmosphere);

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

  // docs/MISSIONS_PLAN.md item 5 / MAP.md: "Donation board on the school's outer
  // wall... Visible, readable, and it updates." Mounted on the one walkable
  // classroom's real west (exterior) wall — SCHOOL_ROOM's own door is on the east
  // side (SCHOOL_ROOM_DOOR_X), so the west face is unambiguously outer. Async (see
  // createDonationBoard's own doc comment) — same .then()/.catch() pattern
  // src/bazaar.js's buildBazaarSignboards() already uses.
  createDonationBoard({ x: SCHOOL_ROOM.cx - SCHOOL_ROOM.w / 2 - 0.18, y: 2.2, z: SCHOOL_ROOM.cz }, -Math.PI / 2)
    .then((board) => heroZoneGroup.add(board))
    .catch((err) => console.error('Failed to build the donation board', err));

  // A-2c diegetic wayfinding: direction signposts at lane junctions + the chowk notice board (src/wayfinding.js; labels come from PLACES).
  createWayfinding()
    .then((wf) => { scene.add(wf); initStaticColliders(scene); })
    .catch((err) => console.error('Failed to build the wayfinding signs', err));

  // Places V1 locations (item 9) on the lanes near the hero zone — neither has a
  // LAYOUT.md, dimensions/names read off the reference orthographic images instead
  // (see docs/parked.md). The tea stall stays on the house-school lane where item 9
  // put it; the general store moved (headroom-pass item 3, docs/parked.md) onto the
  // lane between the hero zone and the bazaar (buildBazaarLane()'s own BEND
  // waypoint, src/bazaar.js), east of it, facing the lane.
  const shopsGroup = new THREE.Group();
  shopsGroup.name = 'shops';
  const TEA_SHOP_POS = pt('teastall');
  const TEA_SHOP_ROT = Math.PI / 2; // west of the lane, facing east
  const STORE_POS = pt('store');
  const STORE_ROT = -Math.PI / 2; // east of the hero-zone-to-bazaar lane, facing west
  // steam over the tea stall's kettle + big pot (art review 1). Model-local (x, wz) -> world via the stall's yaw (PI/2: x' = wz, z' = -x).
  const teaSteam = createSteam([{ x: TEA_SHOP_POS.x + 0.7, y: 1.3, z: TEA_SHOP_POS.z + 0.3 }, { x: TEA_SHOP_POS.x + 0.76, y: 1.5, z: TEA_SHOP_POS.z + 0.97 }]);
  scene.add(teaSteam.points);
  // live fire under the halwai's two kadhais (bhatti centres from tools/blender/build_halwai.py: x = centre - 2.25 + 0.495, z = +-1.15, rim y ~1.45)
  const halwaiFire = createHalwaiFire([-1.15, 1.15].map((dz) => ({ x: HALWAI_CENTER.x - 1.755, y: 1.45, z: HALWAI_CENTER.z + dz })));
  scene.add(halwaiFire.points);
  // Blender tea stall + general store (2026-10-21, docs/tea-stall-checklist.md / docs/general-store-checklist.md):
  // the code-built walls/roofs/counters/posts/goods are now the INVISIBLE collision backing in 'tea_old' + 'store_old'
  // ('tea_old' / 'store_old', kept un-merged by the village-wide merge, hidden by the slots below); tools/blender/build_tea_stall.py and
  // build_general_store.py draw what you see. The code signboards (src/signboards.js) stay.
  const teaOld = new THREE.Group();
  teaOld.name = 'tea_old';
  teaOld.add(buildTeaStall(TEA_SHOP_POS, TEA_SHOP_ROT));
  teaOld.add(buildShopWalls(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT, 'tea'));
  teaOld.add(buildShopRoofs(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT, 'tea'));
  teaOld.add(buildShopCounters(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT, 'tea'));
  shopsGroup.add(teaOld);
  const storeOld = new THREE.Group();
  storeOld.name = 'store_old';
  storeOld.add(buildGeneralStore(STORE_POS, STORE_ROT));
  storeOld.add(buildShopWalls(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT, 'store'));
  storeOld.add(buildShopRoofs(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT, 'store'));
  storeOld.add(buildShopCounters(TEA_SHOP_POS, TEA_SHOP_ROT, STORE_POS, STORE_ROT, 'store'));
  storeOld.add(buildGeneralStoreGoods(STORE_POS, STORE_ROT));
  shopsGroup.add(storeOld);

  // Item 4 ("keep building the village") — 3 more abadi-core locations from
  // MAP.md's "Places inside the abadi" list: post office, ration shop, atta
  // chakki. Placed on open ground just west of the bazaar lane's own
  // START->BEND run (src/bazaar.js's BAZAAR_LANE_BEND {-58,22} /
  // BAZAAR_LANE_ARRIVE {-58,8}, lane width 6, west edge at x=-61), all facing
  // east (+X) toward it — a small new cluster distinct from the general-
  // store/tea-stall pair further north and the bazaar row further
  // west/south. No walkable interior (none feeds a quest).
  //
  // Bugfix (world-validator check 1/7): originally x=-65 — "4m clear of the
  // lane's own west edge" was the only clearance actually checked at the
  // time (via spawn-check.js/collider-audit.js, neither of which looks at
  // NPCs). These 3 buildings are rotated 90 degrees to face the lane, which
  // SWAPS which local dimension extends along world X — each building's
  // real local `d` (depth, ~3m) becomes its world-X extent, not `w`. At
  // x=-65 that put ration_shop's own east wall past BAZAAR_EAST_X=-64,
  // overlapping unit 8's shopkeeper. First fix moved it to x=-70 — but that
  // was STILL within the bazaar row's own x-span (BAZAAR_WEST_X=-100 to
  // BAZAAR_EAST_X=-64) and every one of the row's 8 shopkeepers stands at
  // the SAME z (BAZAAR_FRONT_Z+SHOPKEEPER_DEPTH=14.5, src/bazaarLife.js),
  // spaced only 4.5m apart in x (bazaarUnitCx) — a 3m-wide wall collider
  // anywhere in that x-range clips some unit's shopkeeper, just not
  // necessarily the same one (confirmed: x=-70's ration_shop collider,
  // [-71.5,-68.5]x[12.2,15.8], now clipped unit 6 at (-70.75,14.5) instead
  // of unit 7 — a different NPC, same bug class). The real fix is to get
  // the whole cluster OUT of the row's x-span and its z-band entirely, not
  // nudge within it: moved south along the bazaar approach lane corridor
  // (still facing +x toward it), to an area verified clear by direct
  // minDistanceToColliders probing with the real building half-extents
  // (tmp/scan-newshops-area.mjs + tmp/verify-newshops-reloc2.mjs) — 3.4m+
  // clearance at every one of the 3 new centres.
  const POST_OFFICE_POS = pt('post');
  const RATION_SHOP_POS = pt('ration');
  const ATTA_CHAKKI_POS = pt('chakki');
  const NEW_SHOPS_ROT = Math.PI / 2; // faces +X, toward the bazaar lane
  shopsGroup.add(buildPostOffice(POST_OFFICE_POS, NEW_SHOPS_ROT));
  shopsGroup.add(buildRationShop(RATION_SHOP_POS, NEW_SHOPS_ROT));
  shopsGroup.add(buildAttaChakki(ATTA_CHAKKI_POS, NEW_SHOPS_ROT));
  // Blender post office / ration shop / atta chakki (2026-10-21, docs/new-shops-checklist.md): the code shells are the
  // INVISIBLE collision backing in 'new_shops_old'; one exact slot (anchored at the ration shop, rotated like them) draws all three.
  const newShopsOld = new THREE.Group();
  newShopsOld.name = 'new_shops_old';
  newShopsOld.add(buildNewShopWalls(POST_OFFICE_POS, NEW_SHOPS_ROT, RATION_SHOP_POS, NEW_SHOPS_ROT, ATTA_CHAKKI_POS, NEW_SHOPS_ROT));
  newShopsOld.add(buildNewShopRoofs(POST_OFFICE_POS, NEW_SHOPS_ROT, RATION_SHOP_POS, NEW_SHOPS_ROT, ATTA_CHAKKI_POS, NEW_SHOPS_ROT));
  newShopsOld.add(buildNewShopProps(POST_OFFICE_POS, NEW_SHOPS_ROT, RATION_SHOP_POS, NEW_SHOPS_ROT, ATTA_CHAKKI_POS, NEW_SHOPS_ROT));
  shopsGroup.add(newShopsOld);
  buildNewShopSignboards(POST_OFFICE_POS, NEW_SHOPS_ROT, RATION_SHOP_POS, NEW_SHOPS_ROT, ATTA_CHAKKI_POS, NEW_SHOPS_ROT)
    .then((mesh) => shopsGroup.add(mesh))
    .catch((err) => console.error('Failed to build new-shop signboards', err));
  scene.add(shopsGroup);
  // Postmaster behind the counter window (capsule stand-in until the 3D people arrive; local +z = world +x here)
  const postmasterNpc = createNPC(0x6a7a8a, { x: POST_OFFICE_POS.x + 0.7, z: POST_OFFICE_POS.z }, NEW_SHOPS_ROT, 'npc_postmaster');
  // Indoor capsule: its shadow pass costs a draw call the bazaar view (at the 150 ceiling) cannot spare; the interior is shaded anyway.
  postmasterNpc.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(postmasterNpc);
  // Miller beside the flour mill in the atta chakki (capsule stand-in until the 3D people arrive)
  const millerNpc = createNPC(0x8a7a5a, { x: ATTA_CHAKKI_POS.x + 0.5, z: ATTA_CHAKKI_POS.z + 0.9 }, NEW_SHOPS_ROT, 'npc_miller');
  millerNpc.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(millerNpc);

  // Petrol pump attendant beside the east pump island (capsule stand-in until the 3D people arrive)
  scene.add(createNPC(0x4a6a8a, { x: 189.4, z: 6.4 }, Math.PI / 2, 'npc_pump_attendant'));

  // Shop interactions (this task) — the shared "buy", at each shop's own open
  // counter side. The general store's is also errand 3's purchase step (see
  // src/interactions.js's registerShopBuy doc comment).
  registerShopBuy('general_store', new THREE.Vector3(STORE_POS.x - 2.5, 0, STORE_POS.z));
  registerShopBuy('tea_stall', new THREE.Vector3(TEA_SHOP_POS.x + 2.5, 0, TEA_SHOP_POS.z));
  // NEW_SHOPS_ROT = +PI/2 faces +X (forward=(-sin(yaw),0,-cos(yaw)), this
  // game's convention — see tools/trolley-drive-test.js's own derivation),
  // opposite of STORE_ROT's -X, so the interaction point sits on the +X side
  // here, not -X like the general store's.
  registerShopBuy('post_office', new THREE.Vector3(POST_OFFICE_POS.x + 2.5, 0, POST_OFFICE_POS.z));
  registerShopBuy('ration_shop', new THREE.Vector3(RATION_SHOP_POS.x + 2.5, 0, RATION_SHOP_POS.z));

  // Signboards (item 10) — not awaited inline (same reasoning as loadEnvironment
  // below: don't block the rest of scene setup on an async step); both boards share
  // one atlas texture/mesh, added once the canvas + font are ready.
  buildSignboards(
    {
      position: TEA_SHOP_POS,
      rotationY: TEA_SHOP_ROT,
      width: TEA_DIMS.w - 0.4,
      depth: TEA_DIMS.d,
      // Bugfix (docs/FINISH_LINE.md Step B, real in-game third-person chase
      // camera, not a close-up — tools/signboard-8m-check.mjs): the flat roof
      // (buildShopRoofs, centred at postH+0.06=2.66, 0.12 thick, so its top
      // sits at ~2.72) overhangs 0.35m past the kiosk's own front edge on
      // every side, well past where the old boardY(postH+0.35=2.95, bottom
      // edge 2.70) put the sign — from the real camera's realistic upward
      // viewing angle at 8m, that nearer, slightly-lower roof edge occluded
      // the sign's own lower (English) line almost entirely, leaving only a
      // sliver of the Devanagari line above it legible. +0.65 instead of
      // +0.35 clears the roof top with real margin (bottom edge ~3.0, 0.3m
      // above the roof) — confirmed by re-running the same real-camera check.
      boardY: 3.0, // stands on the Blender stall's sloped tin roof front (roof top there ~2.6): bottom edge 2.75 clears it, no support frame
      hi: 'शर्मा चाय की दुकान',
      en: 'Sharma Tea Stall',
    },
    {
      position: STORE_POS,
      rotationY: STORE_ROT,
      width: STORE_DIMS.w - 0.6,
      depth: STORE_DIMS.d,
      boardY: STORE_DIMS.h - 0.48, // art review 1: the Blender tin roof slopes through the old y=3.1 board; 2.72 sits just under the roof lip, fully visible
      hi: 'गुप्ता जनरल स्टोर',
      en: 'Gupta General Store',
    }
  )
    .then((mesh) => shopsGroup.add(mesh))
    .catch((err) => console.error('Failed to build signboards', err));

  // Gupta General Store stock: real-shaped printed goods, one merged mesh (src/shopGoods.js), replaces the Blender box packets.
  // The tea stall's stock is folded into the same mesh (same atlas material) so it costs no extra draw call.
  shopsGroup.add(mergeGoodsMeshes([
    generalStoreGoods(new THREE.Matrix4().makeRotationY(STORE_ROT).setPosition(STORE_POS.x, 0, STORE_POS.z)),
    teaStallGoods(new THREE.Matrix4().makeRotationY(TEA_SHOP_ROT).setPosition(TEA_SHOP_POS.x, 0, TEA_SHOP_POS.z)),
    rationGoods(new THREE.Matrix4().makeRotationY(NEW_SHOPS_ROT).setPosition(RATION_SHOP_POS.x, 0, RATION_SHOP_POS.z), RATION_SHOP.w, RATION_SHOP.d, RATION_SHOP.counterTopY),
  ], 'general_store_stock'));
  shopsGroup.add(halwaiGoods(new THREE.Matrix4().setPosition(HALWAI_CENTER.x, 0, HALWAI_CENTER.z)));

  // Halwai fascia board (FEEDBACK 24 Oct item 1: the stall had none). Bilingual, English dominant, on the front fascia.
  {
    // The school gate board shares this mesh (same atlas/material): one draw call for both, the hero view is at the 150 ceiling.
    const halwaiBoard = placeBoardsMesh([
      { id: 'halwai', x: HALWAI_CENTER.x, y: 3.55, z: HALWAI_CENTER.z + 3.1, w: 3.6 },
      { id: 'school', x: SCHOOL_CENTER.x, y: 3.05, z: SCHOOL_CENTER.z - 12, ry: Math.PI, w: 4.2 }, // over the school's south gate, faces the lane
    ], 'halwai_board');
    shopsGroup.add(halwaiBoard);
  }

  // Bazaar row (new request) — Places V1/bazaar_row/LAYOUT.md is the authority; see
  // src/bazaar.js for the full build. Real gameplay content (not distant scenery), so
  // built eagerly with the rest of the hero zone, not deferred like the field/
  // background houses.
  const bazaarGroup = buildBazaarRow(buildingKit);
  scene.add(bazaarGroup);
  bazaarGroup.add(buildBazaarCountersAndShutters());
  bazaarGroup.add(buildBazaarInteriors());
  bazaarGroup.add(buildBazaarKiranaGoods());

  // Chowk (item 4) — the second tea stall (Places V1/tea_stall_chowk/), a chabutra,
  // benches, a few plastic chairs, east of the bazaar row with open ground left
  // around it for future content.
  bazaarGroup.add(buildTeaStallChowk());
  bazaarGroup.add(buildChowkPlaza());

  // Item 5 — the lane extension itself (a bumpy, curved strip, never a straight
  // ribbon), connecting the existing hero-zone lane to the bazaar/chowk.
  bazaarGroup.add(buildBazaarLane());
  // Item 2a (draw-call budget) — the chowk tea stall's sign now shares the bazaar's
  // own signboard atlas/mesh (one draw call instead of two); see buildBazaarSignboards().
  buildBazaarSignboards()
    .then((mesh) => bazaarGroup.add(mesh))
    .catch((err) => console.error('Failed to build bazaar signboards', err));

  // Shop interactions (this task) — one shared "buy" at every bazaar counter except
  // kirana (has its own dedicated wheat-errand interaction, src/interactions.js),
  // sabzi/bangle (their own signature interactions), and tailor (M5's kurta pickup,
  // docs/STORY.md). Position: same "just outside the counter" distance kirana's own
  // point uses.
  let DARZI_POSITION = null;
  BAZAAR_UNITS.forEach((unit, idx) => {
    const pos = new THREE.Vector3(bazaarUnitCx(idx), 0, BAZAAR_FRONT_Z - 1.5);
    if (unit.trade === 'kirana') return;
    if (unit.trade === 'sabzi') registerSabziWeighing(pos);
    else if (unit.trade === 'bangle') registerBangleTryOn(pos);
    else if (unit.trade === 'tailor') {
      DARZI_POSITION = pos;
      registerDarziKurta(pos);
    } else registerShopBuy(unit.trade, pos);
  });

  // NPC life in the bazaar (this task's item 2) — one shared InstancedMesh, see
  // src/bazaarLife.js.
  const bazaarLife = createBazaarLife({ getExtraBoxes: () => otherVehicleBoxes(null) });
  scene.add(bazaarLife.mesh);

  // Item 2 (new request) — village mandir + flower stall, east of the hero zone and
  // north of the field/track, reachable by a lane spur (item 4). See src/temple.js
  // for the full build and docs/parked.md for the placement reasoning.
  const templeGroup = new THREE.Group();
  templeGroup.name = 'temple_area';
  templeGroup.add(buildTemple(buildingKit));
  templeGroup.add(buildTempleProps());
  templeGroup.add(buildFlowerStall());
  templeGroup.add(buildTempleLane());
  scene.add(templeGroup);

  // First flush of the shared kit — makes hero zone + bazaar trim/plinth/etc visible
  // right away (including behind the title screen, before Play is clicked). A second
  // flush happens in loadDeferredContent() once the background houses have added
  // their own pieces to the same kit.
  buildingKit.finalize(scene);

  // Bugfix (real playtest bug — the trolley spawned inside the general store with
  // zero player input): spawnVehicles() below needs real, current static colliders
  // to place the trolley safely, but initStaticColliders() used to run much later
  // (inside loadDeferredContent(), after background houses/field load) — so
  // STATIC_COLLIDERS was still empty at spawn time and any collision check there
  // was a silent no-op. Every building that matters for vehicle spawn placement
  // (hero zone, shops incl. the general store, bazaar, temple) is already built
  // and tagged by this point, so build the collider list now; loadDeferredContent()
  // still rebuilds it again once background houses/field are added, picking up
  // the complete final set for real gameplay.
  initStaticColliders(scene);

  const vehicles = spawnVehicles(scene);

  // Item 3 (real playtest bug — the trolley spawned inside the general store
  // with zero player input, never caught because every existing test only
  // ever checked position after a teleport, never the real spawn path) — a
  // loud, ONE-TIME startup assertion, separate from devCheckPenetration()'s
  // ongoing per-frame guard (which starts later, inside the tick loop, long
  // after this moment). Runs right here, the instant every vehicle's spawn
  // position is final and STATIC_COLLIDERS is known — before a single frame of
  // gameplay, before the title screen is even interactive. console.error (not
  // .warn): a vehicle spawning inside a building is a shipped bug, not a
  // transient physics graze. Checks each vehicle's own real oriented footprint
  // (actual body half-extents/yaw, not an approximating circle) and the
  // trolley's real bed footprint.
  if (isDevMode()) {
    for (const v of vehicles) {
      const p = v.preset;
      const hit = orientedBoxOverlapsAnyBox(v.group.position, v.group.rotation.y, p.body.w / 2, p.body.d / 2, STATIC_COLLIDERS);
      if (hit) {
        console.error(
          `[spawn guard] ${v.group.name} spawned overlapping a static collider: pos=(${v.group.position.x.toFixed(2)},${v.group.position.z.toFixed(2)}) box=X[${hit.minX.toFixed(2)},${hit.maxX.toFixed(2)}] Z[${hit.minZ.toFixed(2)},${hit.maxZ.toFixed(2)}]`
        );
      }
      if (v.trolley) {
        const t = v.trolley;
        const thit = orientedBoxOverlapsAnyBox(t.group.position, t.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH, STATIC_COLLIDERS);
        if (thit) {
          console.error(
            `[spawn guard] trolley spawned overlapping a static collider: pos=(${t.group.position.x.toFixed(2)},${t.group.position.z.toFixed(2)}) box=X[${thit.minX.toFixed(2)},${thit.maxX.toFixed(2)}] Z[${thit.minZ.toFixed(2)},${thit.maxZ.toFixed(2)}]`
          );
        }
      } else if (v.preset.kind === 'tractor') {
        console.error('[spawn guard] tractor spawned without a trolley attached — the trolley spawn position must be blocked (see Vehicle.attachTrolley()).');
      }
    }
  }

  const player = createPlayer();
  // Opening spawn + camera facing — chosen (not the original (-48,25) facing north,
  // which pointed the chase camera straight at the house block's solid, gapless
  // south wall from 7m away, filling most of the opening frame with one flat
  // surface) by comparing real untouched-camera screenshots of several candidates
  // — see docs/shots/opening/ for the before/after and the two runners-up.
  // House/lane/every building stayed exactly where they are; only the spawn point
  // and the camera's own initial yaw moved.
  const OPENING_SPAWN = { x: -60, z: 20 };
  const OPENING_YAW = 2.9;
  player.position.set(OPENING_SPAWN.x, 0, OPENING_SPAWN.z);
  scene.add(player);

  // Errand NPCs (item 1/3 brief) — positioned to match the interaction points
  // in src/interactions.js. Maa/halwai are now the real code-built characters
  // (docs/FINISH_LINE.md Step 2, src/characters.js) — a capsule no longer.
  const maaBuilt = buildCharacterNpc('maa', MAA_POSITION, 0, 'npc_maa');
  const maaNpc = maaBuilt.root;
  scene.add(maaNpc);
  const maaAnim = { root: maaNpc, animate: maaBuilt.animate, prev: maaNpc.position.clone() };
  const halwaiBuilt = buildCharacterNpc('halwai', HALWAI_NPC_POSITION, Math.PI / 2, 'npc_halwai');
  const halwaiNpc = halwaiBuilt.root;
  scene.add(halwaiNpc);
  // Dada — stationary in the courtyard near Maa, per docs/FINISH_LINE.md's
  // People section ("Maa and Dada at the house"). A few metres clear of her
  // own 2-point waypoint loop (below) and of the house wall.
  const DADA_POSITION = { x: MAA_POSITION.x + 3, z: MAA_POSITION.z };
  const dadaBuilt = buildCharacterNpc('dada', DADA_POSITION, -Math.PI / 2, 'npc_dada');
  const dadaNpc = dadaBuilt.root;
  scene.add(dadaNpc);
  const dadaAnim = { root: dadaNpc, animate: dadaBuilt.animate, prev: dadaNpc.position.clone() };

  // Third errand (this task) — Pitaji, stationary near the tractor/sack pile, and
  // the sack pile itself (folds into the hero zone's own vertex-coloured 'wood'
  // family, so it costs nothing extra — see src/wheatErrand.js).
  const pitajiNpc = createNPC(0x4a5a3a, PITAJI_POSITION, Math.PI, 'npc_pitaji');
  scene.add(pitajiNpc);

  // M8 (docs/STORY.md) — Dadi. Not in STORY.md's own written dialogue (the ending
  // scene's lines are Dada/Maa/sister/Pitaji only), but docs/FINISH_LINE.md's People
  // and Story sections both separately require her presence ("Mission cast present
  // in person: ... Dadi", "the whole family including Dada and Dadi together on the
  // roof") — so she's there, silently, same tier as the other plain-capsule NPCs
  // (child/teacher/sister/pitaji), not a new built character (the TRIPO people
  // decision was "no more code people", not "no more NPCs of any kind").
  const dadiNpc = createNPC(0x8a5a6e, { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z }, 0, 'npc_dadi');
  dadiNpc.visible = false;
  scene.add(dadiNpc);
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
  ], { getExtraBoxes: () => otherVehicleBoxes(null) });
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
    { speed: 1.6, pauseSeconds: 3, getExtraBoxes: () => otherVehicleBoxes(null) }
  );

  // Optional interaction props (item 5) — not part of the errand.
  const bellProp = createBellProp(BELL_POSITION);
  scene.add(bellProp);

  // reference-from-unity/MAP.md: "Flagpole flying the Indian national flag, at the
  // main chowk near the school/panchayat cluster... scenery only... no gameplay
  // attached." Open yard ground, south-central (clear of both classroom blocks and
  // the bell at SCHOOL_CENTER.x-5,110 — src/village.js's school_compound yard
  // spans x:[-65,-35] z:[94,118]).
  scene.add(createFlagpoleProp({ x: SCHOOL_CENTER.x, z: SCHOOL_CENTER.z - 8 }));


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
  // Side job 9 (ration run): Maa walks with the player instead of her usual loop while this flag is set (src/jobs/ration.js).
  let maaFollowing = false;
  const maaFollow = createFollowRoutine(maaNpc, () => (mountedVehicle ? mountedVehicle.group.position : player.position), { stopDistance: 2.4, speed: 2.2, getExtraBoxes: () => otherVehicleBoxes(null), buildings: BUILDING_ROUTES });
  const sisterFollow = createFollowRoutine(sisterNpc, () => (mountedVehicle ? mountedVehicle.group.position : player.position), { stopDistance: 2, getExtraBoxes: () => otherVehicleBoxes(null), buildings: BUILDING_ROUTES });

  // M4 (docs/STORY.md) — the postman, cycling the same proven-clear hero-zone lane
  // corridor the child already walks (HOUSE_CENTER's courtyard out to the point just
  // west of the halwai's footprint — see childWalk's own doc comment above for why
  // that particular midpoint is safe). A real code-built character (src/characters.js)
  // on foot, not an actual rigged bicycle — the "cycle round" is flavour text, not a
  // new vehicle-NPC rendering system.
  const postmanBuilt = buildCharacterNpc('postman', { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 9 }, 0, 'npc_postman');
  const postmanNpc = postmanBuilt.root;
  scene.add(postmanNpc);
  const postmanAnim = { root: postmanNpc, animate: postmanBuilt.animate, prev: postmanNpc.position.clone() };
  const postmanWalk = createWaypointLoop(
    postmanNpc,
    [
      { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 9 },
      { x: -44, z: 55 },
    ],
    { speed: 1.5, pauseSeconds: 2, getExtraBoxes: () => otherVehicleBoxes(null) }
  );
  linkPostmanPosition(postmanNpc.position);

  // M6 (docs/STORY.md) — the monkey. Spawns out of the way (near the darzi, where
  // M5/M6 actually happen) and stays invisible/inert until the snatch trigger below
  // moves and shows it right next to the player. Its chase route stays on the
  // bazaar's own front lane (BAZAAR_FRONT_Z - 1.5) and the open chowk plaza east of
  // it — both already proven clear (every bazaar shop counter interaction sits on
  // that same line; the chowk is explicitly open ground, src/bazaar.js).
  // docs/FINISH_LINE.md Animals line — a real monkey shape (src/animals.js), not a
  // tinted/scaled humanoid capsule. Built at its own correct real-world size, so no
  // external scale hack is needed.
  const monkeyNpc = createMonkeyNPC({ x: bazaarUnitCx(3), z: BAZAAR_FRONT_Z - 1.5 }, 0, 'npc_monkey');
  monkeyNpc.visible = false;
  scene.add(monkeyNpc);
  linkMonkeyPosition(monkeyNpc.position);
  let monkeyChaseUpdate = null;

  // The chase route as data so the build-time path check (validator check 9) sees it
  // too: registered once at setup with a placeholder start, created for real on the snatch.
  function monkeyChaseWaypoints(startX, startZ) {
    const roofY = BAZAAR_UNITS[3].wallHeight + 0.12;
    const roofY5 = BAZAAR_UNITS[5].wallHeight + 0.12; // unit 5's own slab is 0.35 m lower; the old shared height left the monkey hovering
    return [
      { x: startX, z: startZ, y: 0 },
      { x: bazaarUnitCx(3), z: BAZAAR_ROW_CZ, y: roofY }, // up onto the darzi's own roof
      { x: bazaarUnitCx(5), z: BAZAAR_ROW_CZ, y: roofY5 }, // across the rooftops, east
      { x: bazaarUnitCx(6), z: BAZAAR_FRONT_Z - 3, y: 0 }, // back down to the lane (3 m out: the shopfront props stand 1-2 m from the front)
      { x: BAZAAR_EAST_X + 3, z: BAZAAR_FRONT_Z - 4, y: 0 },
    ];
  }
  NPC_ROUTES.push({ kind: 'run', name: 'npc_monkey_chase', waypoints: monkeyChaseWaypoints(bazaarUnitCx(3), BAZAAR_FRONT_Z - 1.5), radius: 0.3 });

  function startMonkeyChase() {
    monkeyNpc.position.set(player.position.x, 0, player.position.z);
    monkeyNpc.visible = true;
    // docs/STORY.md M6: "scampers off across rooftops and lanes... follow through
    // 2-3 waypoints (rooftop, lane, back down)". Unit 3 is the darzi (tailor) — the
    // same unit M5/M6 already happen at — so the climb starts right at the scene of
    // the snatch: up onto that unit's own real roof slab (src/bazaar.js's
    // wallHeight + the 0.12m slab thickness), east along the roofline, back down to
    // the front lane, then on to the existing chowk recovery point.
    monkeyChaseUpdate = createWaypointRun(
      monkeyNpc,
      monkeyChaseWaypoints(player.position.x, player.position.z),
      { speed: 2.4, pauseSeconds: 0.4, getExtraBoxes: () => otherVehicleBoxes(null) }
    );
    quest.step = QUEST_STEPS.KURTA_STOLEN;
    updateObjective();
    dialogue.say([{ hi: 'बंदर कुर्ता लेकर भाग गया!', en: 'A monkey snatched the kurta!' }]);
  }

  // M8 — the roof ending (docs/STORY.md). Registered at the stairs' own landing
  // (HOUSE_STAIRS.x, not the roof footprint's geometric centre): collision in this
  // game is 2D (x/z only, no height-awareness — confirmed by grep, and the same
  // reason the roof parapet has no railing collision, CLAUDE.md/parked.md's own
  // documented, accepted limitation), so the house's real west wall still blocks
  // horizontal movement onto the rest of the roof slab even once elevated — the
  // landing directly above the stairs is the only part of "the roof" actually
  // walkable right now. Unreachable on foot at ground level at this x/z (solid
  // wall/stair structure there), so only ever in range once the player has
  // actually climbed the real stairs.
  registerRoofEnding(new THREE.Vector3(HOUSE_STAIRS.x, 0, (HOUSE_STAIRS.zStart + HOUSE_STAIRS.zEnd) / 2));

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
  camRig.yaw = OPENING_YAW; // see OPENING_SPAWN above — the camera's default yaw (Math.PI in the constructor) is what pointed the opening frame at the house's blind wall
  // Buildings the camera should never clip through (item 1) — raycast against the
  // actual visual meshes (walls, roofs, pilasters), not the simplified collision
  // boxes below, since those also occlude the camera even where they don't block
  // movement (e.g. a roof overhang).
  const distGated = []; // merged shop-stock cells hidden beyond their gate range (triangle budget)
  const cameraObstacles = [heroZoneGroup, shopsGroup, bazaarGroup, templeGroup]; // backgroundHousesGroup pushed in once it streams in — see loadDeferredContent()
  camRig.setObstacles(cameraObstacles, player);
  camRig.update();

  const input = new InputController(canvas);

  let composer = createComposer(renderer, scene, camera, { enableBloom, enableGrain });

  const fps = setupFpsCounter();

  // HDRI lighting (IBL) loads async; scene renders as soon as ground/sun/sky are up.
  loadEnvironment(renderer, scene, 'assets/hdri/camdeboo_road_512.hdr').catch((err) =>
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
        hide: [bullocksStaticGroup, cart.legMesh],
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
    // Blender halwai rebuild (2026-10-21, docs/halwai-checklist.md) — exact slot at HALWAI_CENTER; the
    // old code-built walls/roof/platform/cabinet/chairs are the (hidden) collision backing.
    assetSlots.register('halwai_compound', {
      exact: true,
      hide: [halwaiShopGroup],
      placements: [{ container: scene, position: new THREE.Vector3(HALWAI_CENTER.x, 0, HALWAI_CENTER.z), rotationY: 0 }],
    });
  }
  {
    // Blender house rebuild (2026-10-21, docs/house-checklist.md) — the whole visible house
    // compound (two-storey shell, balcony, roof terrace, courtyard floor + rangoli, gate,
    // shed, jhoola, planter...) comes from tools/blender/build_house.py's house_compound.glb,
    // authored in world offsets from HOUSE_CENTER and placed EXACTLY (no fit-scaling).
    // src/village.js keeps the old walls/roof/floor/yard solids as invisible, locally-merged
    // 'house_shell_old' / 'house_yard_old' groups so collision + the world validator stay exact.
    const hideOld = ['house_shell_old', 'house_yard_old', 'school_old', 'tea_old', 'store_old', 'bazaar_row_old', 'bazaar_shopfronts', 'bazaar_interiors', 'tea_stall_chowk', 'chowk_plaza', 'temple_old', 'flower_stall', 'new_shops_old', 'bg_houses_old'].map((n) => scene.getObjectByName(n)).filter(Boolean);
    assetSlots.register('house_compound', {
      exact: true,
      maskMaterials: ['hb_rangoli'],
      noShadowMaterials: ['hb_floor', 'hb_rangoli'],
      hide: hideOld,
      placements: [{ container: scene, position: new THREE.Vector3(HOUSE_CENTER.x, 0, HOUSE_CENTER.z), rotationY: 0 }],
    });
  }
  {
    // Blender bazaar row (2026-10-21, docs/bazaar-row-checklist.md): exact slot at the row centre (-82, 15);
    // the code row/shopfronts/interiors are the hidden collision backing.
    const bazaarOld = ['bazaar_row_old', 'bazaar_shopfronts', 'bazaar_interiors', 'tea_stall_chowk', 'chowk_plaza', 'temple_old', 'flower_stall', 'new_shops_old', 'bg_houses_old'].map((n) => scene.getObjectByName(n)).filter(Boolean);
    assetSlots.register('bazaar_row', {
      exact: true,
      hide: bazaarOld,
      placements: [{ container: scene, position: new THREE.Vector3(pt('bazaar').x, 0, pt('bazaar').z), rotationY: 0 }],
    });
  }
  {
    // Blender chowk (2026-10-21, docs/chowk-checklist.md): the second tea stall (exact slot at CHOWK_TEA_POS, same
    // rotation as its code group) and the plaza dressing (exact slot at CHOWK_CENTER); code versions stay hidden.
    const chowkTeaOld = scene.getObjectByName('tea_stall_chowk');
    const chowkPlazaOld = scene.getObjectByName('chowk_plaza');
    assetSlots.register('tea_stall_chowk', {
      exact: true,
      hide: chowkTeaOld ? [chowkTeaOld] : [],
      placements: [{ container: scene, position: new THREE.Vector3(CHOWK_TEA_POS.x, 0, CHOWK_TEA_POS.z), rotationY: CHOWK_TEA_ROT }],
    });
    assetSlots.register('chowk_plaza', {
      exact: true,
      hide: chowkPlazaOld ? [chowkPlazaOld] : [],
      placements: [{ container: scene, position: new THREE.Vector3(CHOWK_CENTER.x, 0, CHOWK_CENTER.z), rotationY: 0 }],
    });
  }
  {
    // Blender temple + flower stall (2026-10-21, docs/temple-checklist.md): exact slots at TEMPLE_POS / FLOWER_STALL_POS.
    const templeOld = scene.getObjectByName('temple_old');
    const flowerOld = scene.getObjectByName('flower_stall');
    assetSlots.register('temple', {
      exact: true,
      hide: templeOld ? [templeOld] : [],
      placements: [{ container: scene, position: new THREE.Vector3(TEMPLE_POS.x, 0, TEMPLE_POS.z), rotationY: 0 }],
    });
    assetSlots.register('flower_stall', {
      exact: true,
      hide: flowerOld ? [flowerOld] : [],
      placements: [{ container: scene, position: new THREE.Vector3(FLOWER_STALL_POS.x, 0, FLOWER_STALL_POS.z), rotationY: 0 }],
    });
  }
  // Roadside petrol pump (Blender, 2026-10-24): exact slot at the old pump site, highway cluster (205,40) + (-19,-35).
  assetSlots.register('petrol_pump', {
    exact: true,
    placements: [{ container: scene, position: new THREE.Vector3(pt('highway').x - 19, 0, pt('highway').z - 35), rotationY: 0 }],
  });
  // Dharam kanta weighbridge (Blender, 2026-10-24): exact slot at highway cluster (205,40) + (-11,52).
  assetSlots.register('dharam_kanta', {
    exact: true,
    placements: [{ container: scene, position: new THREE.Vector3(pt('highway').x - 11, 0, pt('highway').z + 52), rotationY: 0 }],
  });
  assetSlots.register('new_shops', {
    exact: true,
    hide: [scene.getObjectByName('new_shops_old')].filter(Boolean),
    placements: [{ container: scene, position: new THREE.Vector3(RATION_SHOP_POS.x, 0, RATION_SHOP_POS.z), rotationY: NEW_SHOPS_ROT }],
  });
  {
    const teaOldGroup = scene.getObjectByName('tea_old');
    const storeOldGroup = scene.getObjectByName('store_old');
    assetSlots.register('tea_stall', {
      exact: true,
      hide: teaOldGroup ? [teaOldGroup] : [],
      placements: [{ container: scene, position: new THREE.Vector3(TEA_SHOP_POS.x, 0, TEA_SHOP_POS.z), rotationY: TEA_SHOP_ROT }],
    });
    assetSlots.register('general_store', {
      exact: true,
      hide: storeOldGroup ? [storeOldGroup] : [],
      placements: [{ container: scene, position: new THREE.Vector3(STORE_POS.x, 0, STORE_POS.z), rotationY: STORE_ROT }],
    });
  }
  {
    // Blender school rebuild (2026-10-21, docs/school-checklist.md) — exact slot at SCHOOL_CENTER, the
    // old walls/roofs/yard/pillar+wall solids are the hidden 'school_old' group (src/village.js).
    const schoolOld = scene.getObjectByName('school_old');
    assetSlots.register('school_compound', {
      exact: true,
      noShadowMaterials: ['hb_decal'],
      hide: schoolOld ? [schoolOld] : [],
      placements: [{ container: scene, position: new THREE.Vector3(SCHOOL_CENTER.x, 0, SCHOOL_CENTER.z), rotationY: 0 }],
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
    ['dada', dadaNpc],
    ['postman', postmanNpc],
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
  // tiny props: no shadow pass (each cast mesh costs a second draw call, the bazaar view sits at the 150 ceiling)
  for (const grp of [houseCharpaiGroup, houseHandPumpGroup]) grp.traverse((o) => { if (o.isMesh) o.castShadow = false; });
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
  // 2026-10-21: dev-mode only — in normal play this stray clay pot sat in the middle of the
  // rebuilt house courtyard (and cost 2 draw calls) for no gameplay reason.
  if (isDevMode()) {
    const testPotPlaceholder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    testPotPlaceholder.position.set(HOUSE_CENTER.x + 3, 0.2, HOUSE_CENTER.z + 2);
    testPotPlaceholder.castShadow = true;
    scene.add(testPotPlaceholder);
    assetSlots.register('ceramic_pot', {
      dimensions: { w: 0.5, h: 0.6, d: 0.5 },
      hide: [testPotPlaceholder],
      placements: [{ container: scene, position: testPotPlaceholder.position.clone(), rotationY: 0 }],
    });
  }

  // TEMPORARY Tripo-day staging slots (October look-and-feel judgement task) — 6
  // brand-new test slots, none of which replace any real gameplay object (unlike
  // "tractor"/"halwai_kiosk"/etc above): a standalone lineup south of the chowk,
  // open ground verified clear of every real collider (tmp/verify-staging-
  // positions.mjs), purely so all 6 incoming Tripo models can be judged side by
  // side at real scale. Same pattern as the ceramic_pot test slot above — simple
  // code-built placeholder boxes (matte, correct documented size/facing — see
  // docs/asset-slots.md), each labelled with a floating text sprite so a
  // screenshot reads without guessing coordinates. Safe to remove once the real
  // decision is made and the actual slots (whatever they turn out to be named)
  // are wired at their real in-game positions instead.
  //
  // Bugfix (docs/FINISH_LINE.md's "no debug text/staging boxes visible in any
  // normal player view, dev only behind ?dev=1" — a real, previously-unmet
  // requirement found by reading this code, not a screenshot: no real .glb
  // exists yet for any of these 6 names, so every one of these judgement boxes
  // and their floating name-sprite labels was visible to every real player,
  // unconditionally, every session). Gated behind isDevMode() below — still
  // fully there for a real `?dev=1` side-by-side judgement session, never
  // shown otherwise.
  function makeTripoStagingSlots() {
    function makeLabelSprite(text) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
      sprite.scale.set(2, 0.5, 1);
      return sprite;
    }
    const TRIPO_STAGING_Z = 0;
    const TRIPO_STAGING_SLOTS = [
      { name: 'tripo_bush', x: -65, dims: { w: 1.0, h: 0.9, d: 1.0 }, color: 0x4a7c4a, rotationY: 0 },
      { name: 'tripo_tree_neem', x: -58, dims: { w: 3.0, h: 4.5, d: 3.0 }, color: 0x3f6b3f, rotationY: 0 },
      { name: 'tripo_tree_peepal', x: -51, dims: { w: 3.5, h: 5.5, d: 3.5 }, color: 0x356135, rotationY: 0 },
      { name: 'tripo_mother', x: -44, dims: { w: 0.66, h: 1.65, d: 0.66 }, color: 0xc98ea0, rotationY: 0 }, // faces -Z, engine's person-forward convention
      { name: 'tripo_tractor', x: -37, dims: { w: 1.9, h: 2.6, d: 3.5 }, color: 0xb23a2e, rotationY: 0 }, // faces -Z, nose forward (src/vehicles.js noseZ=-1.75)
      // rotationY=0, open face -Z — same universal front convention as every other
      // staging slot here (NOT the real in-game halwai_kiosk slot's own -X/rotationY=PI/2
      // convention, which matches that building's own real, already-built geometry;
      // this standalone judgement box has no such constraint, so it keeps the simpler
      // convention rather than mixing two different axis-swap rules in one test lineup).
      { name: 'tripo_halwai_kiosk', x: -30, dims: { w: 5.5, h: 3.5, d: 4.5 }, color: 0xd8b36a, rotationY: 0 },
      // Added per the art director's Tripo-trees answer (2026-10-20, no Sketchfab
      // account — trees come from Tripo via these judgement slots instead): a 7th
      // slot for the mango tree (M7's baagh, src/baagh.js), sized to roughly match
      // src/trees.js's buildMangoTree() (~3.6-4.1m tall, rounder/lower canopy than
      // the neem/peepal above).
      { name: 'tripo_tree_mango', x: -23, dims: { w: 3.2, h: 4.2, d: 3.2 }, color: 0x4a7a3a, rotationY: 0 },
    ];
    for (const s of TRIPO_STAGING_SLOTS) {
      const placeholder = new THREE.Mesh(new THREE.BoxGeometry(s.dims.w, s.dims.h, s.dims.d), new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.85 }));
      placeholder.position.set(s.x, s.dims.h / 2, TRIPO_STAGING_Z);
      placeholder.rotation.y = s.rotationY;
      // No shadow casting here deliberately (draw-call headroom pass, BACKLOG item 1):
      // this is a temporary side-by-side judgement lineup for comparing real Tripo
      // downloads against their placeholder, not real scenery — each shadow-casting
      // mesh costs a second (depth-only) draw call, and these 6 boxes don't need one.
      placeholder.castShadow = false;
      placeholder.receiveShadow = true;
      placeholder.name = `${s.name}_placeholder`;
      const label = makeLabelSprite(s.name);
      label.position.set(0, s.dims.h / 2 + 0.5, 0); // local to placeholder — box top + 0.5m
      placeholder.add(label);
      scene.add(placeholder);
      assetSlots.register(s.name, {
        dimensions: s.dims,
        hide: [placeholder],
        placements: [{ container: scene, position: new THREE.Vector3(s.x, 0, TRIPO_STAGING_Z), rotationY: s.rotationY }],
      });
    }
  }
  if (isDevMode()) makeTripoStagingSlots();

  // Play unlocks once the models around the opening spawn are in (first view never pops); the far ones keep
  // streaming behind the title screen and the first minute of play (tools/load-time-test.mjs holds the number).
  const slotLoads = assetSlots.resolveAllNearFirst({ x: OPENING_SPAWN.x, z: OPENING_SPAWN.z, radius: 150 });
  slotLoads.near.then(() => markOpeningViewLoaded());
  slotLoads.all.then((results) => {
    if (isDevMode()) console.log('[assetSlots] resolved:', results.map((r) => r.value || r.reason));
    // Draw-call budget: fold each CLUSTER of Blender buildings into one mesh per material (src/assetSlots.js
    // mergeSlotModels; exact because every Blender building shares the same CC0 sets with tints in vertex colours).
    // Clusters, not the whole village, so frustum culling still drops far clusters: `?nomerge=1` to compare.
    if (!new URLSearchParams(window.location.search).has('nomerge')) {
      // Tight clusters only: the sun's shadow pass draws a whole merged mesh whenever any part is inside the
      // +-60 m shadow box, so a mesh spanning half the village would double its full triangle count.
      assetSlots.mergeSlotModels(['house_compound', 'general_store'], 'blender_house_row', scene);
      assetSlots.mergeSlotModels(['halwai_compound', 'tea_stall', 'school_compound'], 'blender_halwai_row', scene);
      assetSlots.mergeSlotModels(['bazaar_row', 'tea_stall_chowk', 'chowk_plaza', 'new_shops'], 'blender_bazaar', scene);
    }
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
  let buildingFootprints = []; // tools/collider-audit.js / tools/trolley-drive-test.js — see loadDeferredContent()
  let preMergeColliderCount = 0; // item 1d — see loadDeferredContent()
  const ambientLife = createAmbientLife(abadiSmokeSources());
  scene.add(ambientLife.group);
  let bgHousesGroup = null; // src/scenery.js — abadi rows, distance-culled per area each frame
  let fieldCane = null;
  let fieldSarson = null;
  let zoneManager; // src/zoneManager.js — registered once field/background content exists, see loadDeferredContent()
  function loadDeferredContent() {
    if (deferredContentLoaded) return;
    deferredContentLoaded = true;
    const fieldGroup = buildField(scene);
    fieldCane = fieldGroup.getObjectByName('field_cane');
    fieldSarson = fieldGroup.getObjectByName('field_sarson');

    // Wave 4 item 1 — the nahar (canal), MAP.md: "between the village and the
    // family's own fields... a crossing". Standalone (not folded into any of the
    // 5 merge-root groups above) since it's not a building and already merges its
    // own ~4 draw calls locally (src/canal.js) — scene.traverse() for colliders
    // still finds it regardless of where it's parented.
    scene.add(buildCanal());

    // Item 3c (real playtest report — "the village reads as desert", "a village
    // called Amrai Khera has no plants in it") — 3 simple placeholder tree
    // species (src/trees.js), code-built, no new asset. Placements use real,
    // already-defined position constants (never invented coordinates): the
    // peepal goes exactly where the temple chabutra's own platform was already
    // built to hold a tree through (PEEPAL_PLATFORM_POS — see docs/parked.md's
    // "Bazaar item 4" entry, built without one for lack of a licensed model);
    // neem trees sit clear of the house/school compound walls (wallH=1.6
    // courtyard walls at HOUSE_CENTER.x +/- 9, school similarly — offset well
    // past that); babool trees sit just outside the field track loop's own
    // corners (TRACK_CORNERS), offset outward from FIELD_CENTER.
    templeGroup.add(buildTrees([{ kind: 'peepal', x: PEEPAL_PLATFORM_POS.x, z: PEEPAL_PLATFORM_POS.z, rotationY: 0.4, seed: 5 }]));
    // Step E (2026-10-20, art director — "the village still reads as a
    // desert... instanced trees in clusters along lanes, around houses and the
    // chowk") — several more neem trees in real clusters (2-3 trees close
    // together, not single sentinels), still folding into the same shared
    // tree_foliage draw call regardless of count. Real anchor points: the house/
    // school courtyard edges (as before, now with a companion tree each), the
    // halwai's own lane frontage, and the bazaar chowk (CHOWK_CENTER).
    heroZoneGroup.add(
      buildTrees([
        { kind: 'neem', x: HOUSE_CENTER.x - 13, z: HOUSE_CENTER.z - 4, rotationY: 1.1, seed: 11 },
        // the courtyard tree in its raised brick planter (docs/house-checklist.md item 7); planter top is y=0.55
        { kind: 'neem', x: HOUSE_CENTER.x + 7, z: HOUSE_CENTER.z + 3.4, y: 0.5, scale: 0.5, rotationY: 0.7, seed: 17 },
        // the school yard's neem in its raised brick ring (docs/school-checklist.md item 17); ring top y=0.26
        { kind: 'neem', x: SCHOOL_CENTER.x - 4.5, z: SCHOOL_CENTER.z - 6.2, y: 0.26, scale: 0.7, rotationY: 1.9, seed: 23 },
        { kind: 'neem', x: HOUSE_CENTER.x - 10.5, z: HOUSE_CENTER.z - 6.5, rotationY: 2.6, seed: 13 },
        // the school yard's big shade tree with the tyre swing + stuck kite (tools/blender/build_school.py hangs them at this spot)
        { kind: 'neem', x: SCHOOL_CENTER.x + 6.2, z: SCHOOL_CENTER.z - 1.0, scale: 1.35, rotationY: 0.3, seed: 31 },
        // a row of tall eucalyptus behind the school building (reference: slim pale-barked trees along the back wall)
        ...[-14, -9.5, -5, 4.5, 9, 13.5].map((dx, i) => ({ kind: 'eucalyptus', x: SCHOOL_CENTER.x + dx, z: SCHOOL_CENTER.z + 14.5 + (i % 2) * 1.2, rotationY: i, seed: 40 + i })),
        { kind: 'neem', x: SCHOOL_CENTER.x - 10, z: SCHOOL_CENTER.z + 16, rotationY: 2.3, seed: 12 }, // behind the main block (these two used to stand INSIDE the wings, poking through the roofs)
        { kind: 'neem', x: SCHOOL_CENTER.x + 6, z: SCHOOL_CENTER.z + 17, rotationY: 0.5, seed: 14 },
        { kind: 'neem', x: HALWAI_CENTER.x + 3, z: HALWAI_CENTER.z - 5, rotationY: 1.8, seed: 15 },
      ])
    );
    bazaarGroup.add(
      buildTrees([
        { kind: 'neem', x: CHOWK_CENTER.x - 6, z: CHOWK_CENTER.z + 5, rotationY: 0.9, seed: 16 },
        { kind: 'neem', x: CHOWK_CENTER.x + 7, z: CHOWK_CENTER.z + 4, rotationY: 2.1, seed: 17 },
      ])
    );
    // Track-corner babools stay in the merged field group (streaming them pushed the hero zone view over 150 calls).
    fieldGroup.add(buildTrees([
        { kind: 'babool', x: TRACK_CORNERS[3].x - 4, z: TRACK_CORNERS[3].z - 4, rotationY: 0.7, seed: 21 }, // SW corner
        { kind: 'babool', x: TRACK_CORNERS[3].x - 7, z: TRACK_CORNERS[3].z - 2, rotationY: 1.3, seed: 24 },
        { kind: 'babool', x: TRACK_CORNERS[1].x + 4, z: TRACK_CORNERS[1].z + 4, rotationY: 2.9, seed: 22 }, // NE corner
        { kind: 'babool', x: TRACK_CORNERS[2].x + 4, z: TRACK_CORNERS[2].z - 4, rotationY: 1.6, seed: 23 }, // SE corner — NOT the NW corner (TRACK_CORNERS[0], {-40,25}), which sits only ~5m from the relocated tractor spawn (-45,26, item 1) and put a tree awkwardly right behind the parked tractor
        { kind: 'babool', x: TRACK_CORNERS[2].x + 6, z: TRACK_CORNERS[2].z - 1, rotationY: 0.2, seed: 25 },
      ]));
    // The mango baagh is zone-streamed (trees_baagh, below) so its tree LODs are not folded away by the static merge.
    MANGO_KNOCK_POSITIONS.forEach((pos, i) => registerMangoKnock(String(i), pos));

    // Item 3b — low vegetation (grass tufts + scrub bushes), instanced (one
    // draw call per kind regardless of instance count — src/vegetation.js),
    // clustered (never an even scatter) along both edges of every real lane
    // segment the village actually has (same start/end/width those lanes are
    // built from, src/paths.js's buildStripSegment — never invented
    // coordinates) plus a few clusters against real building wall bases.
    // Step E (2026-10-20, art director — "grass and low shrubs at wall bases and
    // field edges", denser coverage) — same lane segments as before at higher
    // density (shorter everyMetres, more per cluster), plus many more wall-base
    // anchors: every side of the house/school courtyards, the halwai, both ends
    // of the bazaar row, the chowk/chabutra, and the temple's remaining sides.
    const vegAnchors = [
      ...lanesideClusters(HOUSE_CENTER, HALWAI_CENTER, 6, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(HALWAI_CENTER, SCHOOL_CENTER, 6, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(BAZAAR_LANE_START, BAZAAR_LANE_BEND, BAZAAR_LANE_ROW_WIDTH, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(BAZAAR_LANE_BEND, BAZAAR_LANE_ARRIVE, BAZAAR_LANE_ROW_WIDTH, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(BAZAAR_LANE_ARRIVE, BAZAAR_ROW_FRONTAGE_START, BAZAAR_LANE_ROW_WIDTH, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(TEMPLE_LANE_START, TEMPLE_LANE_BEND, TEMPLE_LANE_WIDTH, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(TEMPLE_LANE_BEND, TEMPLE_LANE_ARRIVE, TEMPLE_LANE_WIDTH, { everyMetres: 5, count: 6 }),
      ...lanesideClusters(TRACK_CORNERS[0], TRACK_CORNERS[1], 5, { everyMetres: 14, margin: 2 }),
      ...lanesideClusters(TRACK_CORNERS[2], TRACK_CORNERS[3], 5, { everyMetres: 14, margin: 2 }),
      // Wall-base clusters at real building perimeters.
      { x: HOUSE_CENTER.x - 9.6, z: HOUSE_CENTER.z - 2, radius: 1.6, count: 7 },
      { x: HOUSE_CENTER.x + 9.6, z: HOUSE_CENTER.z + 2, radius: 1.6, count: 7 },
      { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z - 8, radius: 1.8, count: 6 },
      { x: SCHOOL_CENTER.x - 15, z: SCHOOL_CENTER.z, radius: 1.8, count: 6 },
      { x: SCHOOL_CENTER.x + 15, z: SCHOOL_CENTER.z + 5, radius: 1.8, count: 6 },
      { x: HALWAI_CENTER.x - 4, z: HALWAI_CENTER.z + 3, radius: 1.5, count: 5 },
      { x: BAZAAR_WEST_X - 1, z: BAZAAR_ROW_CZ, radius: 1.8, count: 8 },
      { x: BAZAAR_WEST_X - 1, z: BAZAAR_ROW_CZ + 10, radius: 1.6, count: 6 },
      { x: CHOWK_CENTER.x, z: CHOWK_CENTER.z - 6, radius: 1.8, count: 6 },
      { x: CHOWK_CENTER.x - 8, z: CHOWK_CENTER.z, radius: 1.6, count: 5 },
      { x: TEMPLE_POS.x + 9, z: TEMPLE_POS.z - 2, radius: 1.6, count: 6 },
      { x: TEMPLE_POS.x - 9, z: TEMPLE_POS.z + 3, radius: 1.6, count: 5 },
      { x: TEMPLE_POS.x, z: TEMPLE_POS.z + 9, radius: 1.6, count: 5 },
    ];
    const scrubAnchors = [
      ...lanesideClusters(TRACK_CORNERS[1], TRACK_CORNERS[2], 5, { everyMetres: 12, margin: 2.2, count: 4 }),
      ...lanesideClusters(TRACK_CORNERS[3], TRACK_CORNERS[0], 5, { everyMetres: 12, margin: 2.2, count: 4 }),
      ...lanesideClusters(TRACK_CORNERS[0], TRACK_CORNERS[1], 5, { everyMetres: 16, margin: 3.2, count: 3 }),
      ...lanesideClusters(TRACK_CORNERS[2], TRACK_CORNERS[3], 5, { everyMetres: 16, margin: 3.2, count: 3 }),
      { x: HOUSE_CENTER.x - 9.6, z: HOUSE_CENTER.z + 4, radius: 1.3, count: 4 },
      { x: BAZAAR_EAST_X + 1.5, z: BAZAAR_ROW_CZ, radius: 1.5, count: 5 },
      { x: SCHOOL_CENTER.x - 15, z: SCHOOL_CENTER.z + 8, radius: 1.5, count: 4 },
    ];
    scene.add(buildVegetation(vegAnchors, scrubAnchors));
    // Abadi house fronts: creepers, tulsi, marigold, banana (own mesh, only drawn when the abadi is in view).
    scene.add(buildGardenPlants(abadiGardenPlants()));

    // Step E — "a few flowering plants (marigold, bougainvillea on walls)".
    // Marigold at the temple and its own flower stall (the single most obvious
    // real-world place marigolds would actually be), bougainvillea along the
    // chowk/chabutra's seating wall. Kept away from the hero zone on purpose —
    // CLAUDE.md's draw-call note asks for the hero zone's count to come DOWN,
    // not up, and this is a genuinely new InstancedMesh (one more draw call
    // wherever it's in view) rather than folding into an existing bucket.
    scene.add(
      buildGardenPlants([
        // Marigold beds at the flower stall and temple front.
        ...[-1.6, -0.5, 0.6, 1.7].map((dx) => ({ x: FLOWER_STALL_POS.x + dx, z: FLOWER_STALL_POS.z + 1.8, kind: GARDEN_KIND.MARIGOLD })),
        ...[-3, -1.5, 1.5, 3].map((dx) => ({ x: TEMPLE_POS.x + dx, z: TEMPLE_POS.z - 6, kind: GARDEN_KIND.MARIGOLD })),
        // Tulsi near the temple steps and the house courtyard corner.
        { x: TEMPLE_POS.x + 4.5, z: TEMPLE_POS.z - 5.5, kind: GARDEN_KIND.TULSI },
        { x: TEMPLE_POS.x - 4.5, z: TEMPLE_POS.z - 5.5, kind: GARDEN_KIND.TULSI },
        { x: HOUSE_CENTER.x - 9.6, z: HOUSE_CENTER.z + 6.5, kind: GARDEN_KIND.TULSI },
        // Banana clumps: behind the house, by the temple and at the chowk.
        { x: HOUSE_CENTER.x - 11, z: HOUSE_CENTER.z + 8, kind: GARDEN_KIND.BANANA },
        { x: HOUSE_CENTER.x - 13, z: HOUSE_CENTER.z + 6, kind: GARDEN_KIND.BANANA, scale: 0.85 },
        { x: TEMPLE_POS.x - 10, z: TEMPLE_POS.z - 4, kind: GARDEN_KIND.BANANA },
        { x: CHOWK_CENTER.x + 9, z: CHOWK_CENTER.z - 6, kind: GARDEN_KIND.BANANA, scale: 0.9 },
        // Bougainvillea along the chowk seating wall and tea stall.
        { x: CHOWK_CENTER.x + 3, z: CHOWK_CENTER.z - 4, kind: GARDEN_KIND.BOUGAINVILLEA },
        { x: CHOWK_CENTER.x - 3, z: CHOWK_CENTER.z - 4, kind: GARDEN_KIND.BOUGAINVILLEA },
        { x: CHOWK_CENTER.x, z: CHOWK_CENTER.z - 4.3, kind: GARDEN_KIND.BOUGAINVILLEA, scale: 0.8 },
        { x: CHOWK_TEA_POS.x + 2, z: CHOWK_TEA_POS.z + 3, kind: GARDEN_KIND.BOUGAINVILLEA },
        // Wall creepers (money plant) climbing the bazaar row's back wall and east end.
        ...[0.5, 2.5, 4.5, 6.5].map((u, i) => ({ x: -100 + 4.5 * u + (i % 2) * 0.6, z: BAZAAR_ROW_CZ + 2.75, kind: GARDEN_KIND.CREEPER, scale: 1.1 + (i % 3) * 0.15 })),
        { x: BAZAAR_EAST_X + 0.15, z: BAZAAR_ROW_CZ + 1, kind: GARDEN_KIND.CREEPER, scale: 1.1 },
        { x: BAZAAR_EAST_X + 0.15, z: BAZAAR_ROW_CZ - 1.2, kind: GARDEN_KIND.CREEPER, scale: 0.9 },
        // Post office / ration shop / atta chakki (face +x, 3 m deep): creepers on the side walls
        // and back, tulsi + marigold in the gaps between the fronts, banana behind.
        { x: POST_OFFICE_POS.x + 0.6, z: POST_OFFICE_POS.z - 1.7, kind: GARDEN_KIND.CREEPER, scale: 1.0 },
        { x: RATION_SHOP_POS.x - 1.6, z: RATION_SHOP_POS.z + 1.9, kind: GARDEN_KIND.CREEPER, scale: 1.1 },
        { x: ATTA_CHAKKI_POS.x - 0.4, z: ATTA_CHAKKI_POS.z + 1.55, kind: GARDEN_KIND.CREEPER, scale: 0.9 },
        { x: POST_OFFICE_POS.x + 2.0, z: POST_OFFICE_POS.z + 2.6, kind: GARDEN_KIND.TULSI },
        { x: RATION_SHOP_POS.x + 2.0, z: RATION_SHOP_POS.z + 2.7, kind: GARDEN_KIND.TULSI, scale: 0.9 },
        ...[-0.5, 0.5].map((dz) => ({ x: ATTA_CHAKKI_POS.x + 2.4, z: ATTA_CHAKKI_POS.z + 2.4 + dz, kind: GARDEN_KIND.MARIGOLD })),
        { x: POST_OFFICE_POS.x - 4.2, z: POST_OFFICE_POS.z - 1, kind: GARDEN_KIND.BANANA },
        { x: ATTA_CHAKKI_POS.x - 4.4, z: ATTA_CHAKKI_POS.z + 1, kind: GARDEN_KIND.BANANA, scale: 0.9 },
        // School compound (south wall at z-12 from centre, 4.8 m gate gap): creepers on the wall's
        // street side, marigold + tulsi flanking the gate, banana at the corners.
        ...[-13, -9.5, -6, 6, 9.5, 13].map((dx, i) => ({ x: SCHOOL_CENTER.x + dx, z: SCHOOL_CENTER.z - 12.3, kind: GARDEN_KIND.CREEPER, scale: 0.6 + (i % 3) * 0.08 })),
        ...[-4.2, -3.6, 3.6, 4.2].map((dx) => ({ x: SCHOOL_CENTER.x + dx, z: SCHOOL_CENTER.z - 11.2, kind: GARDEN_KIND.MARIGOLD })),
        // The two flower beds along the main verandah (tools/blender/build_school.py flower_bed, z +1.4..+2.6, x -8.6..-1 and 1..8.6):
        // real scanned gazania, one plant per ~0.9 m, jittered and scaled.
        ...[[-8.0, -1.6], [1.6, 8.0]].flatMap(([x0, x1], b) => Array.from({ length: 8 }, (_, i) => ({
          x: SCHOOL_CENTER.x + x0 + ((x1 - x0) * (i + 0.5)) / 8 + Math.sin(i * 12.9 + b) * 0.15,
          z: SCHOOL_CENTER.z + 2.0 + Math.sin(i * 7.7 + b * 3) * 0.28,
          y: 0.2, kind: GARDEN_KIND.MARIGOLD, scale: 1.1 + 0.3 * Math.abs(Math.sin(i * 3.1 + b)),
        }))),
        { x: SCHOOL_CENTER.x - 3.4, z: SCHOOL_CENTER.z - 13.2, kind: GARDEN_KIND.TULSI, scale: 0.9 },
        { x: SCHOOL_CENTER.x + 3.4, z: SCHOOL_CENTER.z - 13.2, kind: GARDEN_KIND.TULSI, scale: 0.9 },
        { x: SCHOOL_CENTER.x - 16.5, z: SCHOOL_CENTER.z - 12.8, kind: GARDEN_KIND.BANANA },
        { x: SCHOOL_CENTER.x + 16.5, z: SCHOOL_CENTER.z - 12.8, kind: GARDEN_KIND.BANANA, scale: 0.9 },
      ])
    );

    const backgroundHousesGroup = buildBackgroundHouses(scene, buildingKit);
    bgHousesGroup = backgroundHousesGroup;
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
    // tools/collider-audit.js / tools/trolley-drive-test.js — snapshot each
    // building's real world-space footprint from its own geometry, one bbox
    // per direct named child of each static root, WHILE those children still
    // hold their own meshes (the merge below strips every mesh out of them,
    // leaving empty named Groups that would give Box3.setFromObject nothing to
    // measure). Never hand-typed: reads the same live geometry the merge is
    // about to fold away.
    buildingFootprints = [];
    for (const root of [heroZoneGroup, shopsGroup, bazaarGroup, templeGroup, backgroundHousesGroup]) {
      for (const child of root.children) {
        if (!child.name) continue;
        const box = new THREE.Box3().setFromObject(child, true);
        if (isFinite(box.min.x)) {
          buildingFootprints.push({
            name: child.name,
            root: root.name,
            minX: box.min.x,
            maxX: box.max.x,
            minZ: box.min.z,
            maxZ: box.max.z,
          });
        } else {
          // No mesh geometry directly under this child (e.g. buildTeaStall()/
          // buildGeneralStore()'s own small named group is just a position
          // anchor — the real wall meshes it stands at were added to a shared
          // sibling like `shop_walls`). Still worth a 1m marker footprint
          // around its real world position so tools/trolley-drive-test.js has
          // a real, geometry-derived approach target for it.
          child.updateWorldMatrix(true, false);
          const p = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
          if (isFinite(p.x)) {
            buildingFootprints.push({ name: child.name, root: root.name, minX: p.x - 1, maxX: p.x + 1, minZ: p.z - 1, maxZ: p.z + 1 });
          }
        }
      }
    }

    // Item 1d — count every collider box tagged on a source mesh BEFORE the
    // merge below folds it away, so it can be compared against
    // STATIC_COLLIDERS.length after initStaticColliders() runs (see
    // getStaticColliders()). Same two tag conventions mergeUtils.js's
    // collectColliderBoxes() reads: a live `userData.collider === true` leaf
    // (1 box, computed here) or an already-collected `userData.colliderBoxes`
    // array from an earlier per-building merge pass (its own length).
    preMergeColliderCount = 0;
    for (const root of [heroZoneGroup, shopsGroup, bazaarGroup, templeGroup, backgroundHousesGroup, fieldGroup]) {
      root.traverse((obj) => {
        if (obj.userData.collider === true) preMergeColliderCount += 1;
        if (Array.isArray(obj.userData.colliderBoxes)) preMergeColliderCount += obj.userData.colliderBoxes.length;
      });
    }

    const villageStaticGroup = new THREE.Group();
    villageStaticGroup.name = 'village_static_merged';
    scene.add(villageStaticGroup);
    mergeAcrossGroups([heroZoneGroup, shopsGroup, bazaarGroup, templeGroup, backgroundHousesGroup, fieldGroup], villageStaticGroup, {
      skipNames: ['halwai_shop', 'charpai', 'hand_pump', 'pump_water', 'tulsi_water', 'house_shell_old', 'house_yard_old', 'school_old', 'tea_old', 'store_old', 'bazaar_row_old', 'bazaar_shopfronts', 'bazaar_interiors', 'tea_stall_chowk', 'chowk_plaza', 'temple_old', 'flower_stall', 'new_shops_old', 'bg_houses_old'],
    });
    cameraObstacles.push(villageStaticGroup);
    villageStaticGroup.traverse((o) => { if (o.userData.distGate) distGated.push(o); });

    // Structural fix (playtest) — derive every static collider from the real,
    // now-fully-built scene graph, once, here (after the merges above, which
    // themselves preserve each source wall/counter's real collider — see
    // src/mergeUtils.js). Nothing in this codebase hand-types a collider box
    // matched to a building's coordinates anymore; if a building moves, this
    // picks up the new position automatically because it reads the same mesh.
    initStaticColliders(scene);

    // Zone streaming (src/zoneManager.js, CLAUDE.md's draw-call-budget plan) — the
    // first real zone-streamed content: a stationary cattle herd + a few street
    // dogs (docs/FINISH_LINE.md's Animals line), built only while the player is
    // actually near the field, torn down again once they leave. Placed in the open
    // margin between the crop rows and the dirt track's north side (src/field.js —
    // crops span roughly x:[-33,73] z:[-58,18], the track's own north edge sits at
    // z=25), clear of both. Decorative/static only this pass (no roaming, no
    // vehicle-blocking collision) — a real moving herd is a bigger feature than
    // this pass's "recognisable, present in the world" bar.
    zoneManager = createZoneManager(scene);
    // Every streamed place has a drop-in model slot: public/assets/models/<zone name>.glb replaces its placeholder (src/siteSlots.js).
    zoneManager.hooks.onBuild = (name, group) => wireSiteSlot(assetSlots, name, group);
    // Big far landmarks are drawn from much further out (they stand in open ground, well past the hero-zone cameras); small detail zones keep their own radius (src/zoneManager.js).
    const LANDMARK_VIS = 215;
    // A1 props: street lamps along the bazaar and temple lanes, streamed per lane
    // segment (the hero zone sits at the 150 draw-call ceiling, so lamps only
    // exist once the player is within ~8 m of that stretch of lane).
    for (const [name, from, to, width, lampType] of [
      ['lamps_bazaar_a', BAZAAR_LANE_BEND, { x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_ROW_WIDTH, 'solar'], // the x=-58 leg south of the bend; drawn bend->south so the lamp lands on the west verge, not inside the house compound
      ['lamps_bazaar_b', BAZAAR_LANE_BEND, BAZAAR_LANE_ARRIVE, BAZAAR_LANE_ROW_WIDTH, 'solar'], // newer panchayat solar LEDs
      ['lamps_temple_a', TEMPLE_LANE_START, TEMPLE_LANE_BEND, TEMPLE_LANE_WIDTH, 'rcc'],
      ['lamps_temple_b', TEMPLE_LANE_BEND, TEMPLE_LANE_ARRIVE, TEMPLE_LANE_WIDTH, 'rcc'],
    ]) {
      zoneManager.register(name, {
        detail: true,
        x: (from.x + to.x) / 2,
        z: (from.z + to.z) / 2,
        buildRadius: 8 + Math.hypot(to.x - from.x, to.z - from.z) / 2,
        teardownRadius: 9 + Math.hypot(to.x - from.x, to.z - from.z) / 2,
        build: () => createStreetLamps([{ from, to, width }], { type: lampType, everyMetres: lampType === 'rcc' ? 14 : 22 }),
      });
    }
    // Solar LEDs along the abadi galis (east, west, south), in chunks of at most 36 m so each streams only when the player is near that stretch.
    for (const [id, a, b, width] of [['e1', { x: -37, z: 76 }, { x: 36, z: 76 }, 4], ['e2', { x: -6, z: 76 }, { x: -6, z: 130 }, 3.5], ['w1', { x: -84, z: 21 }, { x: -84, z: 104 }, 4], ['s1', { x: -100, z: 140 }, { x: -38, z: 140 }, 4], ['h1', { x: -45, z: 50 }, { x: -45, z: 93 }, 9]]) {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 36);
      for (let i = 0; i < n; i++) {
        const from = { x: a.x + (b.x - a.x) * (i / n), z: a.z + (b.z - a.z) * (i / n) };
        const to = { x: a.x + (b.x - a.x) * ((i + 1) / n), z: a.z + (b.z - a.z) * ((i + 1) / n) };
        const half = Math.hypot(to.x - from.x, to.z - from.z) / 2;
        zoneManager.register(`lamps_gali_${id}_${i}`, {
          detail: true,
          x: (from.x + to.x) / 2,
          z: (from.z + to.z) / 2,
          buildRadius: 8 + half,
          teardownRadius: 9 + half,
          build: () => createStreetLamps([{ from, to, width }], { type: 'solar', everyMetres: 18 }),
        });
      }
    }
    // Solar LEDs along the longer east-road spurs (the short ones, under 28 m, are one lamp's reach from the road). Same per-leg streaming as the galis.
    for (const leg of spurLegs()) {
      if (leg.len < 28) continue;
      const half = leg.len / 2;
      zoneManager.register(`lamps_${leg.id}`, {
        detail: true,
        x: (leg.a.x + leg.b.x) / 2,
        z: (leg.a.z + leg.b.z) / 2,
        buildRadius: 8 + half,
        teardownRadius: 9 + half,
        build: () => createStreetLamps([{ from: leg.a, to: leg.b, width: leg.w }], { type: 'solar', everyMetres: 24 }),
      });
    }
    // MAP.md landmarks: paani ki tanki + bijli transformer (tallest structure; radius capped at 90 m because the hero zone sits at exactly 150 draw calls and the
    // validator camera camera at (-48,30) is 96 m away; widen once hero-zone calls drop). MAP.md gives no coordinate: open ground just north-east of the school yard. Streamed
    // because the hero zone sits at the draw-call ceiling.
    zoneManager.register('water_tank', {
      x: -22,
      z: 122,
      buildRadius: 90,
      teardownRadius: 110,
      detail: true, // hero zone sits at the draw-call ceiling; see the note above
      build: () => createWaterTankProp({ x: -22, z: 122 }),
    });
    // MAP.md farm and water sites (no coordinates in MAP.md; open ground picked, see src/farmSites.js).
    zoneManager.register('pond', { ...pt('pond'), buildRadius: 55, teardownRadius: 70, build: () => createPond(pt('pond')) });
    // Two buffalo cooling off at the pond's muddy bank (one InstancedMesh, streamed with the pond).
    zoneManager.register('pond_buffalo', {
      detail: true, x: pt('pond').x, z: pt('pond').z, buildRadius: 55, teardownRadius: 70,
      build: () => {
        const group = new THREE.Group();
        group.name = 'zone_pond_buffalo';
        const herd = createCattleHerd([
          { x: pt('pond').x + 11.2, z: pt('pond').z + 2.5, rotationY: 1.2, buffalo: true },
          { x: pt('pond').x + 9.6, z: pt('pond').z + 7.0, rotationY: 2.3, buffalo: true },
        ]);
        group.add(herd.mesh);
        return { group, onFrame: (dt) => herd.update(dt) };
      },
    });
    zoneManager.register('tea_haystacks', { visibleRadius: 45, x: -58, z: 76, buildRadius: 30, teardownRadius: 40, build: () => createTeaStallHaystacks({ x: -58, z: 76 }) });
    zoneManager.register('tubewell', { detail: true, ...pt('tubewell'), buildRadius: 30, teardownRadius: 40, build: () => createTubewell(pt('tubewell')) });
    zoneManager.register('johad', { ...pt('johad'), buildRadius: 45, teardownRadius: 60, build: () => createJohad(pt('johad')) });
    zoneManager.register('khalihan', { detail: true, ...pt('khalihan'), buildRadius: 28, teardownRadius: 40, build: () => createKhalihan(pt('khalihan')) });
    zoneManager.register('anganwadi', { visibleRadius: 90, ...pt('anganwadi'), buildRadius: 40, teardownRadius: 52, build: () => createAnganwadi(pt('anganwadi')) });
    zoneManager.register('dudh_dairy', { ...pt('dairy'), buildRadius: 40, teardownRadius: 52, build: () => createDudhDairy(pt('dairy')) });
    // MAP.md abadi places with no coordinates; open ground at the village edge. Faith buildings are peripheral scenery only, no gameplay.
    zoneManager.register('health_subcentre', { ...pt('health'), buildRadius: 40, teardownRadius: 52, build: () => createHealthSubCentre(pt('health')) });
    zoneManager.register('chemist', { ...pt('chemist'), buildRadius: 40, teardownRadius: 52, build: () => createChemist(pt('chemist')) });
    zoneManager.register('masjid', { visibleRadius: LANDMARK_VIS, ...pt('masjid'), buildRadius: 45, teardownRadius: 58, build: () => createMasjid(pt('masjid')) });
    zoneManager.register('gurudwara', { ...pt('gurudwara'), buildRadius: 45, teardownRadius: 58, build: () => createGurudwara(pt('gurudwara')) });
    // More MAP.md abadi/edge places, no coordinates given; open ground picked. Highway is the east edge (x 205), the modern boundary.
    zoneManager.register('tv_house', { ...pt('tvhouse'), buildRadius: 40, teardownRadius: 52, build: () => createTvHouse(pt('tvhouse')) });
    zoneManager.register('manihari', { ...pt('manihari'), buildRadius: 35, teardownRadius: 48, build: () => createManihari(pt('manihari')) });
    zoneManager.register('sabzi_rehris', { ...pt('sabzi'), buildRadius: 38, teardownRadius: 50, build: () => createSabziRehris(pt('sabzi')) });
    zoneManager.register('jain_mandir', { visibleRadius: LANDMARK_VIS, ...pt('jain'), buildRadius: 45, teardownRadius: 58, build: () => createJainMandir(pt('jain')) });
    // Real CC0 doorstep props (stools, buckets, baskets, pots...) at the abadi rows, streamed per 36 m cell (src/villageProps.js).
    for (const cell of propCells(abadiPropSites())) zoneManager.register(cell.id, { detail: true, x: cell.x, z: cell.z, buildRadius: 42, teardownRadius: 55, build: () => createPropCell(cell) });
    // Rooftop clutter (tanks, antennas, dishes, solar panels, brick stacks) on the abadi roofs, streamed per 36 m cell (src/rooftops.js).
    for (const cell of roofCells(abadiRoofSites())) zoneManager.register(cell.id, { detail: true, x: cell.x, z: cell.z, buildRadius: 30, teardownRadius: 40, build: () => createRoofCell(cell) });
    // A-2c milestone stones on the east approach (src/milestones.js; positions and distances derived from PLACES).
    for (const site of milestoneSites()) zoneManager.register(site.id, { detail: true, x: site.x, z: site.z, buildRadius: 60, teardownRadius: 75, build: () => createMilestone(site) });
    // East road (src/eastRoad.js): the east gali carried on to the highway, one streamed zone per leg: earth bed, edging, drain, solar lamps and neem shade.
    for (const leg of [...roadLegs(), ...spurLegs()]) {
      const mx = (leg.a.x + leg.b.x) / 2, mz = (leg.a.z + leg.b.z) / 2, half = leg.len / 2;
      zoneManager.register(leg.id, {
        detail: true, x: mx, z: mz, buildRadius: (leg.bare ? 16 : leg.w ? 24 : 45) + half, teardownRadius: (leg.bare ? 28 : leg.w ? 36 : 58) + half, // bare spurs are plain earth: built late so they cost no draw calls in the bazaar view
        build: () => {
          const g = new THREE.Group(); // lamps and trees are built in world coordinates, so they sit beside the (turned) leg, not inside it
          g.name = leg.id + '_zone';
          g.add(createEastRoadLeg(leg));
          if (!leg.bare) g.add(createStreetLamps([{ from: leg.a, to: leg.b, width: leg.w || 5 }], { type: 'solar', everyMetres: leg.w ? 45 : 28 }));
          const ux = (leg.b.x - leg.a.x) / leg.len, uz = (leg.b.z - leg.a.z) / leg.len, trees = [];
          for (let k = 0; k < Math.floor(leg.len / 22); k++) {
            const t = (k + 0.5 + ((leg.i + k) % 2) * 0.2) * 22, side = (leg.i + k) % 3 === 0 ? 1 : -1, off = (leg.w ? 5 : 8) + ((leg.i * 5 + k * 3) % 5);
            trees.push({ kind: ['neem', 'neem', 'babool', 'peepal'][(leg.i + k) % 4], x: leg.a.x + ux * t - uz * off * side, z: leg.a.z + uz * t + ux * off * side, seed: 60 + leg.i * 7 + k, rotationY: (leg.i + k) * 1.3 });
          }
          if (trees.length && !leg.bare) g.add(buildTrees(trees));
          return g;
        },
      });
    }
    // Street life on the east road: villagers (capsule placeholders until the 29 Oct models) walking its south edge, each pacing one stretch.
    for (const [id, s0, s1, tint, speed] of [['east_road_walkers_a', 18, 95, 0x8a5a44, 1.1], ['east_road_walkers_b', 105, 175, 0x5f7f6a, 1.3]]) {
      const p0 = roadAt((s0 + s1) / 2);
      zoneManager.register(id, {
        detail: true, x: p0.x, z: p0.z, buildRadius: 55, teardownRadius: 70,
        build: () => {
          const group = new THREE.Group();
          group.name = 'zone_' + id;
          const edge = (s) => { const r = roadAt(s); return { x: r.x - r.uz * 1.6, z: r.z + r.ux * 1.6 }; };
          const a = edge(s0), b = edge(s1);
          const npc = createNPC(tint, a, Math.PI / 2, 'npc_' + id);
          group.add(npc);
          const walk = createWaypointLoop(npc, [a, edge((s0 + s1) / 2), b, edge((s0 + s1) / 2)], { speed, pauseSeconds: 4 });
          return { group, onFrame: (dt) => walk(dt) };
        },
      });
    }
    // A cyclist (placeholder rider on a real bicycle model) rides the north edge of the east road, end to end and back.
    {
      const s0 = 30, s1 = 170, p0 = roadAt((s0 + s1) / 2);
      zoneManager.register('east_road_cyclist', {
        detail: true, x: p0.x, z: p0.z, buildRadius: 75, teardownRadius: 90,
        build: () => {
          const group = new THREE.Group();
          group.name = 'zone_east_road_cyclist';
          const edge = (s) => { const r = roadAt(s); return { x: r.x + r.uz * 1.6, z: r.z - r.ux * 1.6 }; };
          const a = edge(s0), b = edge(s1);
          const rider = createNPC(0x4a5f86, a, 0, 'npc_east_road_cyclist');
          const bike = buildBikeGroup();
          bike.group.rotation.y = Math.PI; // bike front is -Z, routines face +Z
          rider.add(bike.group);
          group.add(rider);
          const ride = createWaypointLoop(rider, (() => {
            const out = []; for (let s = s0; s <= s1; s += 10) out.push(edge(s)); // follow the road's bends, not a straight chord
            return out.concat(out.slice(1, -1).reverse());
          })(), { speed: 3.2, pauseSeconds: 3 });
          const last = new THREE.Vector3().copy(rider.position);
          return { group, onFrame: (dt) => {
            ride(dt);
            const moved = rider.position.distanceTo(last); last.copy(rider.position);
            const v = dt > 0 ? moved / dt : 0;
            updateWheel(bike.frontWheel, { linearSpeed: v, radius: 0.34, dt });
            updateWheel(bike.rearWheel, { linearSpeed: v, radius: 0.34, dt });
          } };
        },
      });
    }
    zoneManager.register('highway', { visibleRadius: LANDMARK_VIS, ...pt('highway'), buildRadius: 95, teardownRadius: 110, build: () => createHighwayCluster(pt('highway')) });
    // MAP.md: jalebi + samosa stall (bazaar lane), mela ground (SW), gurukul and khel maidan (SE). No coordinates given; open ground picked.
    // A1g: ONE carrom scene in the common area at the chowk (east of the tea stall, in front of the bazaar), not in any lane or vehicle route.
    zoneManager.register('carrom_scene', { detail: true, x: -46, z: 5.5, buildRadius: 22, teardownRadius: 30, build: () => createCarromScene({ x: -46, z: 5.5 }, 'carrom_scene', 0.3) });
    // Laundry corners also stand at the lane edge, on the non-drain side, so the lane stays clear for carts and cattle.
    for (const [id, x, z, ry] of [['lane_laundry_e1', 3, 78.55, 0.04], ['lane_laundry_w1', -86.55, 74, Math.PI / 2 + 0.06], ['lane_laundry_s1', -58, 142.55, -0.05], ['lane_laundry_e2', -3.5, 104, Math.PI / 2 + 0.05], ['lane_laundry_w2', -72, 18.5, 0.04]]) {
      zoneManager.register(id, { detail: true, x, z, buildRadius: 32, teardownRadius: 44, build: () => createLaneLaundry({ x, z }, id, ry) });
    }
    // Water corners stand at the lane edge on the side away from the open drain (kerb + 0.6 m), spout facing the lane.
    for (const [id, x, z, ry] of [['lane_water_e1', 16, 78.6, Math.PI + 0.05], ['lane_water_w1', -86.6, 90, Math.PI / 2 + 0.08], ['lane_water_s1', -44, 142.6, Math.PI - 0.06], ['lane_water_e2', -3.6, 122, -Math.PI / 2 + 0.07], ['lane_water_w2', -65.5, 18.6, 0.05]]) {
      zoneManager.register(id, { detail: true, x, z, buildRadius: 32, teardownRadius: 44, build: () => createLaneWaterCorner({ x, z }, id, ry) });
    }
    // Cattle resting in the abadi lanes (MAP.md street life), one InstancedMesh each, streamed with the lane games.
    const LANE_SITE_CENTRES = [[-12, 75.7], [-82.8, 58], [-74, 141.2], [-4.9, 90], [-79, 22.6], [3, 78.55], [-86.55, 74], [-58, 142.55], [-3.5, 104], [-72, 18.5], [16, 78.6], [-86.6, 90], [-44, 142.6], [-3.6, 122], [-65.5, 18.6]];
    for (const [id, x, z, ry] of [['lane_cattle_e1', -12, 84, 1.5], ['lane_cattle_w1', -82.8, 70, 0.3], ['lane_cattle_s1', -62, 141.2, 1.7], ['lane_cattle_e2', -4.9, 113, 0.3], ['lane_cattle_w2', -58, 24, 0.2]]) {
      zoneManager.register(id, {
        detail: true, x, z, buildRadius: 32, teardownRadius: 44,
        build: () => {
          const group = new THREE.Group();
          group.name = 'zone_' + id;
          // Each animal takes the first offset that clears the real colliders (a fixed offset put three
          // buffalo inside lane walls, found by the dev guard); no clear spot means that animal is left out.
          // Other lane sites (games, laundry, water) stream in separately, so their colliders may not exist yet: keep clear of their centres too.
          const spot = (offsets, radius) => {
            for (const [dx, dz] of offsets) {
              const px = x + dx, pz = z + dz;
              if (LANE_SITE_CENTRES.some((c) => Math.hypot(c[0] - px, c[1] - pz) < 5)) continue;
              if (minSignedDistanceToColliders({ x: px, z: pz }, radius, STATIC_COLLIDERS) >= 0.1) return { x: px, z: pz };
            }
            return null;
          };
          const cow = spot([[0, 0], [0, -2], [0, 2]], 0.9);
          const buffalo = spot([[3.2, 1.4], [-3.2, 1.4], [3.2, -1.4], [-3.2, -1.4], [0, 3.4], [0, -3.4]], 0.9);
          const dog = spot([[-2.5, -1.2], [2.5, -1.2], [-2.5, 1.2], [2.5, 1.2]], 0.4);
          const cattle = createCattleHerd([cow && { ...cow, rotationY: ry }, buffalo && { ...buffalo, rotationY: ry + 0.5, buffalo: true }].filter(Boolean));
          const dogs = createDogPack([dog && { ...dog, rotationY: ry + 2.2 }].filter(Boolean));
          group.add(cattle.mesh, dogs.mesh);
          return { group, onFrame: (dt) => { cattle.update(dt); dogs.update(dt); } };
        },
      });
    }
    zoneManager.register('jalebi_stall', { ...pt('jalebi'), buildRadius: 35, teardownRadius: 48, build: () => createJalebiStall(pt('jalebi')) });
    zoneManager.register('banta_shop', { visibleRadius: 14, ...pt('banta'), buildRadius: 30, teardownRadius: 42, build: () => createBantaShop(pt('banta')) });
    zoneManager.register('chaat_thela', { visibleRadius: 14, ...pt('chaat'), buildRadius: 30, teardownRadius: 42, build: () => createChaatThela(pt('chaat')) });
    zoneManager.register('mela_ground', { ...pt('mela'), buildRadius: 65, teardownRadius: 80, build: () => createMelaGround(pt('mela')) });
    zoneManager.register('gurukul', { visibleRadius: LANDMARK_VIS, ...pt('gurukul'), buildRadius: 55, teardownRadius: 70, build: () => createGurukul(pt('gurukul')) });
    // STAGING YARD (src/stagingYard.js, table in src/stagedPlaces.js): newly built places wait on their own pads east of the mandi until the map is laid out.
    registerStagingYard(zoneManager, LANDMARK_VIS);
    zoneManager.register('khel_maidan', { visibleRadius: LANDMARK_VIS, ...pt('maidan'), buildRadius: 55, teardownRadius: 70, build: () => createKhelMaidan(pt('maidan')) });
    // MAP.md: mandi, the town market past the highway (paved, warehouse scale). No coordinates given; east of the highway at x 226.
    zoneManager.register('mandi', { visibleRadius: LANDMARK_VIS, ...pt('mandi'), buildRadius: 70, teardownRadius: 85, build: () => createMandi(pt('mandi')) });
    // MAP.md: kachcha bank roads along the canal, field side (south bank), x -42..42 around (-8,27.6).
    zoneManager.register('canal_bank_road', { detail: true, x: -8, z: 27.6, buildRadius: 28, teardownRadius: 38, build: () => createCanalBankRoad({ x: -8, z: 27.6 }) });
    // MAP.md: the village-side (north) bank road, z 38.8, just past the 1.2 m bank on the abadi side of the water.
    zoneManager.register('canal_bank_road_n', { detail: true, x: -8, z: 38.8, buildRadius: 28, teardownRadius: 38, build: () => createCanalBankRoad({ x: -8, z: 38.8 }, 'canal_bank_road_n') });
    // MAP.md organic village edge: low compound walls closing the abadi's west, south and east sides, gaps where lanes leave.
    zoneManager.register('edge_wall_w', { detail: true, x: -101, z: 66, buildRadius: 55, teardownRadius: 68, build: () => createBoundaryWall({ x: -101, z: 66 }, 'edge_wall_w', [{ a: { x: -101, z: 34 }, b: { x: -101, z: 100 } }], [{ x: -101, z: 62, w: 3.5 }]) });
    zoneManager.register('edge_wall_s', { detail: true, x: -70, z: 157, buildRadius: 55, teardownRadius: 68, build: () => createBoundaryWall({ x: -70, z: 157 }, 'edge_wall_s', [{ a: { x: -104, z: 157 }, b: { x: -38, z: 157 } }], [{ x: -72, z: 157, w: 4 }]) });
    zoneManager.register('edge_wall_e', { detail: true, x: 46, z: 78, buildRadius: 50, teardownRadius: 62, build: () => createBoundaryWall({ x: 46, z: 78 }, 'edge_wall_e', [{ a: { x: 46, z: 58 }, b: { x: 46, z: 100 } }], [{ x: 46, z: 76, w: 4 }]) });
    // Continuations of the edge wall: south-centre (stops at the sugarcane belt, x 0), west lower half (gap where lane S1 leaves), east lower half (stops at the cane belt, z 135).
    zoneManager.register('edge_wall_s2', { detail: true, x: -19, z: 157, buildRadius: 40, teardownRadius: 52, build: () => createBoundaryWall({ x: -19, z: 157 }, 'edge_wall_s2', [{ a: { x: -38, z: 157 }, b: { x: 0, z: 157 } }], [{ x: -6, z: 157, w: 4 }]) });
    zoneManager.register('edge_wall_w2', { detail: true, x: -101, z: 128, buildRadius: 45, teardownRadius: 58, build: () => createBoundaryWall({ x: -101, z: 128 }, 'edge_wall_w2', [{ a: { x: -101, z: 100 }, b: { x: -101, z: 157 } }], [{ x: -101, z: 140, w: 4.5 }]) });
    zoneManager.register('edge_wall_e2', { detail: true, x: 46, z: 118, buildRadius: 35, teardownRadius: 48, build: () => createBoundaryWall({ x: 46, z: 118 }, 'edge_wall_e2', [{ a: { x: 46, z: 100 }, b: { x: 46, z: 135 } }]) });
    zoneManager.register('edge_wall_e0', { detail: true, x: 46, z: 40, buildRadius: 35, teardownRadius: 48, build: () => createBoundaryWall({ x: 46, z: 40 }, 'edge_wall_e0', [{ a: { x: 46, z: 21 }, b: { x: 46, z: 58 } }]) });
    zoneManager.register('edge_wall_e3', { detail: true, x: 46, z: 146, buildRadius: 30, teardownRadius: 42, build: () => createBoundaryWall({ x: 46, z: 146 }, 'edge_wall_e3', [{ a: { x: 46, z: 135 }, b: { x: 46, z: 157 } }]) });
    zoneManager.register('edge_wall_w0', { detail: true, x: -101, z: 27, buildRadius: 30, teardownRadius: 42, build: () => createBoundaryWall({ x: -101, z: 27 }, 'edge_wall_w0', [{ a: { x: -101, z: 21 }, b: { x: -101, z: 34 } }]) });
    zoneManager.register('edge_wall_n0', { detail: true, x: -80, z: 21, buildRadius: 40, teardownRadius: 52, build: () => createBoundaryWall({ x: -80, z: 21 }, 'edge_wall_n0', [{ a: { x: -101, z: 21 }, b: { x: -58, z: 21 } }], [{ x: -88, z: 21, w: 3.5 }]) });
    // MAP.md: old haveli (east, quiet) and gaushala (village edge). No coordinates given; open ground picked.
    zoneManager.register('old_haveli', { visibleRadius: LANDMARK_VIS, ...pt('haveli'), buildRadius: 50, teardownRadius: 65, build: () => createOldHaveli(pt('haveli')) });
    zoneManager.register('gaushala', { ...pt('gaushala'), buildRadius: 40, teardownRadius: 52, build: () => createGaushala(pt('gaushala')) });
    // Neighbour's small orchard (MAP.md): 2 mango trees at the northern edge of the sugarcane belt.
    zoneManager.register('neighbour_orchard', { visibleRadius: 110, x: 20, z: 128, buildRadius: 60, teardownRadius: 75, build: () => { const g = buildTrees([
      { kind: 'mango', x: 12, z: 127, seed: 11, scale: 0.85 },
      { kind: 'mango', x: 27, z: 129, seed: 12, scale: 0.8, rotationY: 1.2 },
    ]); mergeGroupByMaterial(g); return g; } });
    // Outskirts shade trees (A3 "reads green"): small streamed clusters by the village-edge sites.
    // Unmerged, so the per-tree distance LOD works. No coordinates in MAP.md; open ground picked.
    zoneManager.register('trees_baagh', { x: BAAGH_POSITION.x, z: BAAGH_POSITION.z, buildRadius: 26, teardownRadius: 36, build: () => { const g = buildTrees(MANGO_TREE_PLACEMENTS); mergeGroupByMaterial(g); return g; } }); // merged: 2 draw calls, the hero-zone budget has no room for per-tree LODs
    const outskirtTrees = (name, x, z, trees) => zoneManager.register(name, { x, z, buildRadius: 70, teardownRadius: 85, build: () => buildTrees(trees) });
    { const A = pt('pond'); outskirtTrees('trees_pond', A.x, A.z, [
      { kind: 'neem', x: A.x + -18, z: A.z + -10, seed: 21 }, { kind: 'peepal', x: A.x + 20, z: A.z + 12, seed: 22, rotationY: 0.8 }, { kind: 'babool', x: A.x + -16, z: A.z + 14, seed: 23 },
    ]); }
    { const A = pt('johad'); outskirtTrees('trees_johad', A.x, A.z, [
      { kind: 'babool', x: A.x + -16, z: A.z + -9, seed: 24 }, { kind: 'neem', x: A.x + 18, z: A.z + 13, seed: 25, rotationY: 2.0 }, { kind: 'babool', x: A.x + -14, z: A.z + 15, seed: 26, rotationY: 1.0 },
    ]); }
    { const A = pt('haveli'); outskirtTrees('trees_haveli', A.x, A.z, [
      { kind: 'peepal', x: A.x + -18, z: A.z + 12, seed: 27 }, { kind: 'neem', x: A.x + 20, z: A.z + -16, seed: 28, rotationY: 0.5 },
    ]); }
    { const A = pt('gaushala'); outskirtTrees('trees_gaushala', A.x, A.z, [
      { kind: 'neem', x: A.x + 19, z: A.z + -15, seed: 29 }, { kind: 'peepal', x: A.x + -21, z: A.z + 15, seed: 30, rotationY: 1.4 },
    ]); }
    zoneManager.register('sugarcane_belt', { visibleRadius: 120, x: 20, z: 152, buildRadius: 70, teardownRadius: 85, build: () => createSugarcaneBelt({ x0: 0, z0: 135, width: 42, depth: 34 }) });
    zoneManager.register('field_animals', {
      detail: true,
      x: FIELD_CENTER.x,
      z: 21,
      buildRadius: 45,
      build: () => {
        const group = new THREE.Group();
        group.name = 'zone_field_animals';
        const cattle = createCattleHerd([
          { x: -5, z: 20, rotationY: 0.3 },
          { x: 3, z: 22, rotationY: -0.6 },
          { x: 12, z: 19.5, rotationY: 1.2, buffalo: true },
          { x: 20, z: 21.5, rotationY: -1.0 },
          { x: 28, z: 20, rotationY: 0.5, buffalo: true },
          { x: 36, z: 22, rotationY: -0.2 },
        ]);
        const dogs = createDogPack([
          { x: 8, z: 19, rotationY: 1.8 },
          { x: 24, z: 22.5, rotationY: -1.4 },
        ]);
        group.add(cattle.mesh, dogs.mesh);
        return {
          group,
          onFrame: (dt) => {
            cattle.update(dt);
            dogs.update(dt);
          },
        };
      },
    });
  }

  const audio = new AudioEngine();
  let started = false;
  const savedGame = loadSavedGame(); // item 7 — read once, before the title screen decides Play-vs-Continue
  setupStartOverlay({
    isTouch: touch,
    hasSave: !!savedGame,
    storyDone: !!(savedGame && (savedGame.roam?.storyDone || savedGame.questStep === 'all_complete' || savedGame.questStep === 'free_roam')),
    onStart: (isContinue) => {
      started = true;
      minimap.setActive(true);
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
  // Free roam (docs/MISSIONS_PLAN.md): the part of the quest state that survives the story and is saved with it.
  const roamSnapshot = () => ({ storyDone: quest.storyDone, pocket: quest.pocket, discovered: quest.discovered, jobsDone: quest.jobsDone, marbles: quest.marbles, kites: quest.kites, mangoVarieties: quest.mangoVarieties, records: quest.records });
  const freeRoam = createFreeRoam({
    quest,
    getPlayerPos: () => (mountedVehicle ? mountedVehicle.group.position : player.position),
    onChange: () => {
      if (started) saveGame({ questStep: quest.step, quality: currentQuality, roam: roamSnapshot() });
    },
    onVisit: (place) => {
      const ok = visitPlace(place);
      if (ok) pauseMenu.close();
      return ok;
    },
    onPinTask: (p) => { pinnedTask = p ? { x: p.x, z: p.z } : null; },
    // Tasks list: jump forward to a later mission by landing on the hub step just before it (the same clean
    // "talk to X" states Continue restores), with carried counters reset so nothing on screen contradicts the state.
    onSetMission: (hubStep) => {
      if (quest.step === QUEST_STEPS.KURTA_STOLEN) return false; // monkey chase in progress
      quest.step = hubStep;
      quest.sacksCollected = 0;
      quest.sacksDelivered = 0;
      quest.money = 0;
      quest.mangoesCollected = 0;
      sisterFollowing = false;
      pinnedTask = null;
      updateObjective();
      return true;
    },
  });
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
  const endRoamBtn = document.getElementById('end-roam-btn');

  function updateObjective() {
    const entry = OBJECTIVE_TEXT[quest.step];
    const text = typeof entry === 'function' ? entry(quest) : entry;
    objectiveHiEl.textContent = text.hi;
    objectiveEnEl.textContent = text.en;
    objectivePanel.classList.toggle('visible', quest.step !== QUEST_STEPS.ALL_COMPLETE);
    // Third errand — money is shown only while it's actually relevant (from Pitaji's
    // offer through the final end card), per this task's own instruction.
    const moneyVisible = [QUEST_STEPS.LOADING_WHEAT, QUEST_STEPS.WHEAT_DELIVERED, QUEST_STEPS.BOUGHT_GOODS].includes(quest.step);
    const pocketVisible = quest.step === QUEST_STEPS.FREE_ROAM;
    moneyPanel.classList.toggle('visible', moneyVisible || pocketVisible);
    if (moneyVisible) {
      moneyEnEl.textContent = `Money: ₹${quest.money}`;
      moneyHiEl.textContent = `पैसे: ₹${quest.money}`;
    } else if (pocketVisible) {
      moneyEnEl.textContent = `Pocket money: ₹${quest.pocket}`;
      moneyHiEl.textContent = `जेब खर्च: ₹${quest.pocket}`;
    }
    // Item 7 (save/continue) — every quest-step change (interactions.js's
    // onObjectiveChange) and both reset paths below call this, so a save is always in
    // sync with real progress without a separate save-trigger call anywhere else.
    // Gated on `started`: this function also runs once during initial setup, before
    // the title screen's Play/Continue choice is even made — saving there would
    // silently overwrite a real save with NOT_STARTED on every page load.
    if (started) saveGame({ questStep: quest.step, quality: currentQuality, roam: roamSnapshot() });
  }
  updateObjective();

  // Continue (item 7) — restores quest.step only; world/NPC positions reset to their
  // normal spawn, same as a fresh game (see docs/parked.md for why). The one exception
  // is the sister: HAVE_SISTER means she should already be following, so she's placed
  // beside the player's own spawn point rather than left waiting at the school.
  function continueFromSave(saved) {
    if (!saved || !Object.values(QUEST_STEPS).includes(saved.questStep)) return;
    quest.step = saved.questStep;
    const roam = saved.roam || {};
    quest.storyDone = !!roam.storyDone || quest.step === QUEST_STEPS.ALL_COMPLETE || quest.step === QUEST_STEPS.FREE_ROAM;
    quest.pocket = roam.pocket || 0;
    quest.discovered = Array.isArray(roam.discovered) ? roam.discovered : [];
    quest.jobsDone = roam.jobsDone || {};
    quest.marbles = roam.marbles || 0;
    quest.kites = roam.kites || 0;
    quest.mangoVarieties = Array.isArray(roam.mangoVarieties) ? roam.mangoVarieties : [];
    quest.records = roam.records || {};
    if (quest.storyDone) {
      startFreeRoam(); // "Continue roaming" — the village is open, no main objective
      return;
    }
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
    if ([QUEST_STEPS.FINDING_POSTMAN, QUEST_STEPS.HAVE_LETTER].includes(quest.step)) {
      quest.step = QUEST_STEPS.ERRAND3_COMPLETE;
    }
    if ([QUEST_STEPS.GOING_TO_DARZI, QUEST_STEPS.HAVE_KURTA, QUEST_STEPS.KURTA_STOLEN, QUEST_STEPS.KURTA_RECOVERED].includes(quest.step)) {
      quest.step = QUEST_STEPS.ERRAND4_COMPLETE;
    }
    if ([QUEST_STEPS.GOING_TO_BAAGH, QUEST_STEPS.KNOCKING_MANGOES, QUEST_STEPS.MANGOES_LOADED].includes(quest.step)) {
      quest.step = QUEST_STEPS.ERRAND6_COMPLETE;
    }
    if (quest.step === QUEST_STEPS.GOING_TO_ROOF) {
      quest.step = QUEST_STEPS.ERRAND7_COMPLETE;
    }
    quest.sacksCollected = 0;
    quest.sacksDelivered = 0;
    quest.money = 0;
    quest.mangoesCollected = 0;
    updateObjective();
  }

  // Task 4/this task — errand 1 and errand 2's own completions aren't the end of the
  // game any more (the next errand unlocks from talking to Maa/Pitaji again), so
  // those cards show only "Continue" (dismiss, keep playing); only the truly final
  // card (all three errands done) offers Play again + Credits — see src/quest.js's
  // QUEST_STEPS doc comment.
  const MID_END_CARD_TEXT = {
    [QUEST_STEPS.ERRAND2_COMPLETE]: { en: 'Both errands are done. The afternoon is yours.', hi: 'दोनों काम हो गए। बाकी दोपहर तुम्हारी है।' },
    [QUEST_STEPS.ERRAND3_COMPLETE]: { en: "Enough for Dada's gift. One more thing to do.", hi: 'दादा के तोहफे के लिए काफी हो गया। एक काम और बाकी है।' },
    [QUEST_STEPS.ERRAND4_COMPLETE]: { en: "Bua's letter is home safe.", hi: 'बुआ की चिट्ठी घर पहुँच गई।' },
    [QUEST_STEPS.ERRAND6_COMPLETE]: { en: 'The kurta made it home — monkey and all.', hi: 'कुर्ता घर पहुँच गया — बंदर के साथ भी।' },
    [QUEST_STEPS.ERRAND7_COMPLETE]: { en: 'The trolley is full of mangoes.', hi: 'ट्रॉली आमों से भर गई।' },
  };

  // Side jobs (docs/MISSIONS_PLAN.md section 3) — built lazily, once, when free roam first starts.
  let sideJobs = null;
  let modalFrozen = false;
  function setFrozen(frozen) {
    modalFrozen = frozen;
    paused = frozen || pauseMenu.isOpen();
    if (frozen) {
      if (!touch) document.exitPointerLock?.();
    } else if (!paused && !touch && started) {
      input.requestPointerLock();
    }
  }
  function ensureSideJobs() {
    if (sideJobs) return;
    sideJobs = createSideJobs({
      scene,
      quest,
      dialogue,
      audio,
      freeRoam,
      getPlayerPos: () => (mountedVehicle ? mountedVehicle.group.position : player.position),
      playerGroup: player,
      buildNpc: (role, pos, rot, name) => buildCharacterNpc(role, pos, rot, name),
      setFrozen,
      refreshHud: updateObjective,
      save: () => saveGame({ questStep: quest.step, quality: currentQuality, roam: roamSnapshot() }),
      vehicles,
      sackCarrier,
      hooks: interactionCtx.hooks,
      setMaaFollowing: (on) => {
        maaFollowing = on;
      },
      npcs: { maa: maaNpc, dadi: dadiNpc, postman: postmanNpc, halwai: halwaiNpc, pitaji: pitajiNpc, teacher: teacherNpc, child: childNpc, sister: sisterNpc },
      getMounted: () => mountedVehicle,
      otherVehicleBoxes,
      waypointLoop: createWaypointLoop,
      setJobWaypoint: (v) => {
        jobWaypoint = v;
      },
      followRoutine: createFollowRoutine,
      rebuildColliders: () => initStaticColliders(scene),
      getTrolley: () => {
        const owner = vehicles.find((v) => v.trolley);
        return (owner && owner.trolley) || looseTrolley || null;
      },
    });
  }

  // After the credits (docs/MISSIONS_PLAN.md section 2): the player wakes back in the village, no main objective, side jobs open.
  function startFreeRoam() {
    quest.step = QUEST_STEPS.FREE_ROAM;
    quest.storyDone = true;
    endingSceneActive = false; // the roof tableau is over: NPC routines run again
    endCard.classList.remove('visible');
    dadaNpc.position.set(DADA_POSITION.x, 0, DADA_POSITION.z);
    dadaNpc.rotation.y = -Math.PI / 2;
    dadiNpc.visible = false;
    sisterFollowing = false;
    sisterNpc.position.copy(SISTER_SCHOOL_POSITION);
    player.position.set(HOUSE_CENTER.x + 1.5, 0, HOUSE_CENTER.z + 4.5);
    ensureSideJobs(); // the ten side jobs, built the first time free roam starts (zero cost during the story)
    updateObjective();
    freeRoam.toast('The afternoon is yours. Look around the village.', 'दोपहर तुम्हारी है। गाँव में घूमो।', 5200);
  }

  function showEndCard(step) {
    const isFinal = step === QUEST_STEPS.ALL_COMPLETE;
    if (isFinal) quest.storyDone = true; // saved by updateObjective/onChange: the title offers "Continue roaming" even if the tab closes at the credits
    if (isFinal) {
      endEnEl.textContent = 'All eight errands are done. Happy birthday, Dada.';
      endHiEl.textContent = 'आठों काम हो गए। जन्मदिन मुबारक हो, दादा।';
    } else if (MID_END_CARD_TEXT[step]) {
      endEnEl.textContent = MID_END_CARD_TEXT[step].en;
      endHiEl.textContent = MID_END_CARD_TEXT[step].hi;
    } else {
      endEnEl.textContent = 'The jalebi made it home.';
      endHiEl.textContent = 'जलेबी घर पहुँच गई!';
    }
    endContinueBtn.style.display = isFinal ? 'none' : 'flex';
    endRoamBtn.style.display = isFinal ? 'flex' : 'none';
    playAgainBtn.style.display = isFinal ? 'flex' : 'none';
    endCreditsBtn.style.display = isFinal ? 'flex' : 'none';
    endCard.classList.add('visible');
    objectivePanel.classList.remove('visible');
  }

  // Free-roam side jobs can point the waypoint arrow at their current stop (src/jobs/milk.js etc.); null = none.
  let jobWaypoint = null;
  // Side job picked in the Tasks list (free roam): arrow and minimap star point at its place until the player arrives.
  let pinnedTask = null;
  function currentWaypointTarget() {
    if (jobWaypoint && quest.step === QUEST_STEPS.FREE_ROAM) return jobWaypoint;
    if (pinnedTask) {
      const pp = mountedVehicle ? mountedVehicle.group.position : player.position;
      if (quest.step !== QUEST_STEPS.FREE_ROAM || Math.hypot(pp.x - pinnedTask.x, pp.z - pinnedTask.z) < 6) pinnedTask = null;
      else return pinnedTask;
    }
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
    if (quest.step === QUEST_STEPS.ERRAND3_COMPLETE) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.FINDING_POSTMAN) return postmanNpc.position;
    if (quest.step === QUEST_STEPS.HAVE_LETTER) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.ERRAND4_COMPLETE) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.GOING_TO_DARZI) return DARZI_POSITION;
    if (quest.step === QUEST_STEPS.HAVE_KURTA) return MAA_POSITION;
    if (quest.step === QUEST_STEPS.KURTA_STOLEN) return monkeyNpc.position;
    if (quest.step === QUEST_STEPS.KURTA_RECOVERED) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.ERRAND6_COMPLETE) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.GOING_TO_BAAGH) return BAAGH_POSITION;
    if (quest.step === QUEST_STEPS.KNOCKING_MANGOES) return BAAGH_POSITION;
    if (quest.step === QUEST_STEPS.MANGOES_LOADED) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.ERRAND7_COMPLETE) return PITAJI_POSITION;
    if (quest.step === QUEST_STEPS.GOING_TO_ROOF) return HOUSE_CENTER;
    return null; // ALL_COMPLETE — all eight errands done, nowhere to point
  }

  // Shared by the end card's "Play again" button and the pause menu's "Restart
  // errand" button (task 2) — resets both errands at once (one continuous quest.step,
  // see src/quest.js), including the sister's following state/position (task 4).
  function restartErrand() {
    quest.step = QUEST_STEPS.NOT_STARTED;
    endingSceneActive = false;
    dadaNpc.position.set(DADA_POSITION.x, 0, DADA_POSITION.z);
    dadiNpc.visible = false;
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
  endRoamBtn.addEventListener('click', startFreeRoam);

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

  // Controls help — same reachable-from-title-and-pause requirement as the credits
  // screen, same two-trigger/one-overlay shape.
  const controlsHelp = setupControlsHelp();
  function showControlsHelp() {
    controlsHelp.open();
  }
  document.getElementById('start-controls-btn').addEventListener('pointerdown', showControlsHelp);
  // Title-screen Settings (quality + volume): the quality buttons inside it are wired by setupPauseMenu like the pause ones.
  const settingsOverlay = document.getElementById('settings-overlay');
  document.getElementById('start-settings-btn').addEventListener('pointerdown', () => settingsOverlay.classList.add('visible'));
  document.getElementById('settings-close-btn').addEventListener('pointerdown', () => settingsOverlay.classList.remove('visible'));

  // Shared context passed to every interaction point's label()/available()/onInteract().
  const interactionCtx = {
    audio,
    dialogue,
    quest,
    hooks: {}, // free-roam side jobs plug in here (src/sideJobs.js)
    onObjectiveChange: updateObjective,
    onErrandComplete: showEndCard,
    onSisterCollected: () => {
      sisterFollowing = true;
    },
    onPumpWater: () => flashWaterMesh(pumpWaterMesh),
    onWaterTulsi: () => flashWaterMesh(tulsiWaterMesh),
    onKurtaRecovered: () => {
      monkeyNpc.visible = false;
      monkeyChaseUpdate = null;
    },
    // M8 (docs/STORY.md) — called the moment the player reaches the roof, before the
    // closing dialogue plays, so the family is already gathered when it starts.
    // Freezes every ambient NPC routine (see endingSceneActive below) and moves the
    // already-built family NPCs onto the real roof deck (HOUSE_BLOCK's own footprint,
    // HOUSE_ROOF_Y) — nothing new built, the game is ending, their normal routines
    // no longer matter.
    onReachRoofEnding: () => {
      endingSceneActive = true;
      dadaNpc.position.set(HOUSE_CENTER.x, HOUSE_ROOF_Y, HOUSE_BLOCK.cz - 1);
      dadaNpc.rotation.y = Math.PI * 0.75;
      maaNpc.position.set(HOUSE_CENTER.x - 1.5, HOUSE_ROOF_Y, HOUSE_BLOCK.cz + 0.5);
      maaNpc.rotation.y = Math.PI * 0.6;
      pitajiNpc.position.set(HOUSE_CENTER.x + 1.5, HOUSE_ROOF_Y, HOUSE_BLOCK.cz - 0.5);
      pitajiNpc.rotation.y = Math.PI * 1.1;
      sisterNpc.position.set(HOUSE_CENTER.x + 1, HOUSE_ROOF_Y, HOUSE_BLOCK.cz - 2.5);
      sisterNpc.rotation.y = Math.PI * 1.3;
      dadiNpc.position.set(HOUSE_CENTER.x - 1, HOUSE_ROOF_Y, HOUSE_BLOCK.cz - 2);
      dadiNpc.rotation.y = Math.PI * 0.9;
      dadiNpc.visible = true;
    },
    tractor: tractorForShadows, // third errand — isTrolleyNearby() reads this live, see src/wheatErrand.js
    sackCarrier,
  };

  // Bugfix (real playtest bug, reproduced with real keyboard input — player walked
  // straight through the trolley, and the trolley drove through buildings): this
  // used to only ever push `vehicleFootprintBox(v)` for v in the `vehicles` array
  // (bike/tractor/cart) — the trolley is tracked separately (tractor.trolley /
  // looseTrolley below, never a member of `vehicles`), so it had NO box here at
  // all, for ANY caller (the player's own resolveMove, every other vehicle's,
  // and — see src/npcRoutines.js's getExtraBoxes — every NPC's). Nothing in the
  // game could ever have detected a collision with it, attached or detached,
  // regardless of how solid its own wall-vs-trolley resolve (resolveTowedMove,
  // below) already was. Now always includes the trolley's real oriented
  // footprint (orientedFootprintBox — exact, not vehicleFootprintBox's
  // circumscribed-circle approximation), excluded only for the one tractor
  // currently towing it (so its own tow-resolve isn't handed a box of itself).
  function otherVehicleBoxes(excludeVehicle) {
    const boxes = [];
    for (const v of vehicles) {
      if (v !== excludeVehicle) boxes.push(...vehicleSolidBoxes(v));
    }
    const owningTractor = vehicles.find((v) => v.trolley);
    const trolley = (owningTractor && owningTractor.trolley) || looseTrolley;
    if (trolley && excludeVehicle !== owningTractor) {
      boxes.push(orientedFootprintBox(trolley.group.position.x, trolley.group.position.z, trolley.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH));
    }
    return boxes;
  }

  // Bike: a circle. Bullock cart: its whole assembly (platform + bullocks) as an oriented rect about the assembly
  // centre, so the bullocks stop at walls too, and re-resolved after the move because turning swings the nose.
  function moveSmallVehicle(vehicle, dx, dz) {
    const p = vehicle.preset;
    if (!p.assembly) {
      resolveMove(vehicle.group.position, dx, dz, Math.hypot(p.body.w, p.body.d) / 2, otherVehicleBoxes(vehicle));
      return;
    }
    const yaw = vehicle.group.rotation.y;
    const ox = p.assembly.cz * Math.sin(yaw), oz = p.assembly.cz * Math.cos(yaw);
    const centre = { x: vehicle.group.position.x + ox, z: vehicle.group.position.z + oz };
    const boxes = otherVehicleBoxes(vehicle);
    resolveOrientedMove(centre, yaw, dx, dz, p.assembly.hw, p.assembly.hd, boxes);
    resolveOrientedCollisions(centre, yaw, p.assembly.hw, p.assembly.hd, boxes);
    vehicle.group.position.x = centre.x - ox;
    vehicle.group.position.z = centre.z - oz;
  }

  // The ONE on-foot movement step: the real per-frame loop and tools/collision-test.js
  // (via window.__dopahar.stepPlayerMove) both call this, so the test drives the code that ships.
  function movePlayerBy(dx, dz) {
    resolveMove(player.position, dx, dz, PLAYER_COLLISION_RADIUS, otherVehicleBoxes(null));
    player.position.x = THREE.MathUtils.clamp(player.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_X);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
    player.position.y = groundHeightAt(player.position.x, player.position.z, player.position.y);
  }

  // Item 4 (real playtest regression) — a permanent dev-mode guard, not a one-off
  // test: every frame, checks whether any vehicle, the trolley, or the player is
  // actually overlapping a real wall (STATIC_COLLIDERS, derived from real wall
  // geometry — see src/collision.js) and logs it, with position/yaw and the
  // offending box, instead of this only being caught by a human noticing a
  // screenshot. resolveMove()/resolveCollisions() are supposed to make this
  // impossible; if this ever fires, that guarantee has broken again. Dev-mode
  // only (isDevMode()) — cheap SAT checks against ~59 boxes, not something to run
  // for every real player.
  function devCheckPenetration() {
    for (const v of vehicles) {
      const p = v.preset;
      let hit;
      if (p.kind === 'tractor') {
        hit = orientedBoxOverlapsAnyBox(v.group.position, v.group.rotation.y, p.body.w / 2, p.body.d / 2, STATIC_COLLIDERS);
        if (hit) console.warn(`[collision guard] ${v.group.name} overlaps a wall: pos=(${v.group.position.x.toFixed(2)},${v.group.position.z.toFixed(2)}) yaw=${v.group.rotation.y.toFixed(2)} box=X[${hit.minX.toFixed(2)},${hit.maxX.toFixed(2)}] Z[${hit.minZ.toFixed(2)},${hit.maxZ.toFixed(2)}]`);
        if (v.trolley && v.trolley.attached) {
          const t = v.trolley;
          const thit = orientedBoxOverlapsAnyBox(t.group.position, t.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH, STATIC_COLLIDERS);
          if (thit) console.warn(`[collision guard] trolley overlaps a wall: pos=(${t.group.position.x.toFixed(2)},${t.group.position.z.toFixed(2)}) yaw=${t.group.rotation.y.toFixed(2)} box=X[${thit.minX.toFixed(2)},${thit.maxX.toFixed(2)}] Z[${thit.minZ.toFixed(2)},${thit.maxZ.toFixed(2)}]`);
        }
      } else {
        const radius = Math.hypot(p.body.w, p.body.d) / 2;
        hit = orientedBoxOverlapsAnyBox(v.group.position, 0, radius, radius, STATIC_COLLIDERS); // circle ~= axis-aligned square of the same radius, close enough for a diagnostic
        if (hit) console.warn(`[collision guard] ${v.group.name} overlaps a wall: pos=(${v.group.position.x.toFixed(2)},${v.group.position.z.toFixed(2)}) box=X[${hit.minX.toFixed(2)},${hit.maxX.toFixed(2)}] Z[${hit.minZ.toFixed(2)},${hit.maxZ.toFixed(2)}]`);
      }
    }
    if (looseTrolley) {
      const hit = orientedBoxOverlapsAnyBox(looseTrolley.group.position, looseTrolley.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH, STATIC_COLLIDERS);
      if (hit) console.warn(`[collision guard] detached trolley overlaps a wall: pos=(${looseTrolley.group.position.x.toFixed(2)},${looseTrolley.group.position.z.toFixed(2)}) box=X[${hit.minX.toFixed(2)},${hit.maxX.toFixed(2)}] Z[${hit.minZ.toFixed(2)},${hit.maxZ.toFixed(2)}]`);
    }
    const playerHit = orientedBoxOverlapsAnyBox(player.position, 0, PLAYER_COLLISION_RADIUS, PLAYER_COLLISION_RADIUS, STATIC_COLLIDERS);
    if (playerHit) console.warn(`[collision guard] player overlaps a wall: pos=(${player.position.x.toFixed(2)},${player.position.z.toFixed(2)}) box=X[${playerHit.minX.toFixed(2)},${playerHit.maxX.toFixed(2)}] Z[${playerHit.minZ.toFixed(2)},${playerHit.maxZ.toFixed(2)}]`);

    // World-validator check 1's live counterpart — named NPCs and the
    // bazaar_life instanced villagers were the only "no wall overlap" gap
    // this per-frame guard had (it only ever covered vehicles/trolley/
    // player): a real NPC-overlapping-a-wall bug (a bazaar shopkeeper inside
    // a relocated building's collider) shipped once and was only caught by
    // tools/world-validator.js, not by playing the game with devtools open.
    // Same radii as that check (src/npc.js's NPC_HEIGHT/2 doesn't apply
    // here; these are the same real-world NPC footprint radii), console.warn
    // only — cheap circle-vs-box distance checks, not a frame-budget
    // concern at this NPC/instance count.
    for (const npc of [maaNpc, halwaiNpc, dadaNpc, childNpc, teacherNpc, sisterNpc, pitajiNpc, postmanNpc]) {
      const clearance = minSignedDistanceToColliders({ x: npc.position.x, z: npc.position.z }, 0.33, STATIC_COLLIDERS);
      if (clearance < 0) console.warn(`[collision guard] ${npc.name} overlaps a wall: pos=(${npc.position.x.toFixed(2)},${npc.position.z.toFixed(2)}) clearance=${clearance.toFixed(2)}`);
    }
    // Animals are stationary herds/packs (no routines), so a placement inside a wall or trunk is the
    // only way one can penetrate. Only meshes still attached to the scene (zone built) are checked.
    const nonAnimalColliders = STATIC_COLLIDERS.filter((b) => !b.animalBox); // an animal's own box is not a wall
    for (const a of ANIMAL_MESHES) {
      if (!a.mesh.parent) continue;
      a.placements.forEach((pl, i) => {
        const clearance = minSignedDistanceToColliders({ x: pl.x, z: pl.z }, a.radius, nonAnimalColliders);
        if (clearance < 0) console.warn(`[collision guard] ${a.mesh.name}[${i}] overlaps a wall: pos=(${pl.x.toFixed(2)},${pl.z.toFixed(2)}) clearance=${clearance.toFixed(2)}`);
      });
    }
    const _m = new THREE.Matrix4();
    for (let i = 0; i < bazaarLife.mesh.count; i++) {
      bazaarLife.mesh.getMatrixAt(i, _m);
      const x = _m.elements[12], z = _m.elements[14];
      const clearance = minSignedDistanceToColliders({ x, z }, 0.32, STATIC_COLLIDERS);
      if (clearance < 0) console.warn(`[collision guard] bazaar_life[${i}] overlaps a wall: pos=(${x.toFixed(2)},${z.toFixed(2)}) clearance=${clearance.toFixed(2)}`);
    }
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

  // "Visit place" (pause menu): stand the player on open ground a few metres from `place`, facing it. Candidate spots are
  // tried on rings around the place, nearest and most-southern first (the camera's usual approach side); a spot is kept only
  // if the body fits there and a straight line from it to the place's edge is free of walls.
  function visitPlace(place) {
    const clearLine = (ax, az, bx, bz) => {
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (positionBlocked({ x: ax + (bx - ax) * t, z: az + (bz - az) * t }, 0.35, [])) return false;
      }
      return true;
    };
    let best = null;
    for (let r = Math.max(8, place.radius * 0.55); r <= place.radius * 1.6 && !best; r += 3) {
      for (let k = 0; k < 24; k++) {
        const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12); // start due south (+z), alternate sides
        const x = place.x + Math.cos(a) * r, z = place.z + Math.sin(a) * r;
        if (x < -GROUND_HALF_EXTENT || x > GROUND_HALF_X || Math.abs(z) > GROUND_HALF_EXTENT) continue;
        if (positionBlocked({ x, z }, PLAYER_COLLISION_RADIUS + 0.4, otherVehicleBoxes(null))) continue;
        if (!clearLine(x, z, place.x + (x - place.x) * 0.25, place.z + (z - place.z) * 0.25)) continue;
        best = { x, z };
        break;
      }
    }
    if (!best) return false;
    if (mountedVehicle) dismount();
    player.position.set(best.x, 0, best.z);
    player.position.y = groundHeightAt(best.x, best.z, 0);
    camRig.yaw = Math.atan2(best.x - place.x, best.z - place.z); // camera behind the player, looking at the place
    if (camRig.update) camRig.update();
    return true;
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
  let endingSceneActive = false; // M8 — true once the player reaches the roof; freezes every ambient NPC routine so the staged family tableau below isn't immediately undone by their normal waypoint loops

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
  const _mmDir = new THREE.Vector3();
  const minimap = createMinimap({
    getPlayerPos: () => (mountedVehicle ? mountedVehicle.group.position : player.position),
    getCameraDir: () => camera.getWorldDirection(_mmDir),
    getObjective: () => currentWaypointTarget() || null,
    lanes: MAP_LANES,
    onOpen: () => freeRoam.openNotebook(),
  });
  const syncMinimapBtn = () => {
    const b = document.getElementById('pause-minimap-btn');
    if (b) b.innerHTML = minimap.isHidden() ? '<span class="btn-en">Minimap: off</span><span class="btn-hi">छोटा नक्शा: बंद</span>' : '<span class="btn-en">Minimap: on</span><span class="btn-hi">छोटा नक्शा: चालू</span>';
  };
  syncMinimapBtn();
  audio.setMasterVolume(loadSavedVolume(1));
  const pauseMenu = setupPauseMenu({
    onToggleMinimap: () => { minimap.setHidden(!minimap.isHidden()); syncMinimapBtn(); },
    isTouch: touch,
    initialQuality: currentQuality,
    initialVolume: loadSavedVolume(1),
    onOpen: () => {
      paused = true;
      if (!touch) document.exitPointerLock?.();
    },
    onResume: () => {
      paused = false;
      freeRoam.closeVisit();
      freeRoam.closeTasks();
      if (!touch && started) input.requestPointerLock();
    },
    onRestart: restartErrand,
    onQualityChange: setQuality,
    onVolumeChange: (v) => { audio.setMasterVolume(v); saveVolume(v); },
    onShowCredits: showCredits,
    onShowControls: showControlsHelp,
    onShowNotebook: () => freeRoam.openNotebook(),
    onShowVisit: () => freeRoam.openVisit(),
    onShowTasks: () => freeRoam.openTasks(),
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyN' || !started || e.repeat) return;
    if (freeRoam.isOpen()) freeRoam.closeNotebook();
    else {
      if (!pauseMenu.isOpen()) pauseMenu.open();
      freeRoam.openNotebook();
    }
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
      // M8 — frozen once the roof ending starts (onReachRoofEnding above has already
      // moved these NPCs onto the roof; their normal loops would otherwise walk them
      // straight back to their usual ground-level spots on the very next frame).
      if (!endingSceneActive) {
        if (maaFollowing) maaFollow(dt);
        else maaWalk(dt);
        halwaiStir(dt); // halwai's own idle animation (src/main.js) — not animate(), see buildCharacterNpc's doc comment
        childWalk(dt);
        postmanWalk(dt);
        if (sisterFollowing) sisterFollow(dt);
      }
      MAA_POSITION.copy(maaNpc.position);
      bazaarLife.update(dt);

      // Idle-breathing/walk-cycle rock (src/characters.js) for the three
      // characters that actually move or stand around (halwai's own
      // createStirLoop above already animates him) — "moving" is just "did
      // this NPC's own position change noticeably since last frame", so this
      // needs no extra plumbing into the waypoint/stationary logic above.
      for (const c of [maaAnim, postmanAnim, dadaAnim]) {
        const moved = c.prev.distanceTo(c.root.position) > 0.002;
        c.prev.copy(c.root.position);
        c.animate(dt, moved);
      }

      // M6 (docs/STORY.md) — the monkey ambush triggers itself, not an interaction
      // point: once the player has walked far enough from the darzi carrying the
      // kurta, it snatches it. A simple distance check, not a trigger volume system —
      // consistent with how little else in this codebase needs one.
      if (quest.step === QUEST_STEPS.HAVE_KURTA && DARZI_POSITION) {
        const d = Math.hypot(player.position.x - DARZI_POSITION.x, player.position.z - DARZI_POSITION.z);
        if (d > 8) startMonkeyChase();
      }
      if (monkeyChaseUpdate) monkeyChaseUpdate(dt);

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
        //
        // Bugfix (defect 2 of the real playtest regression, screenshot evidence):
        // a circle can't correctly represent the tractor's own rectangular body
        // either — the tractor is now resolved as a true oriented box, at its real
        // half-extents and current yaw, exactly like the trolley below (see
        // src/collision.js). Bike/cart stay circles (their own report didn't flag
        // them and neither produced a reproducible failure — see
        // tools/trolley-corner-test.js), but with the circumscribing half-diagonal
        // radius (Math.hypot, not the old Math.max) so their own corners are never
        // outside their own collision circle either.
        if (p.kind === 'tractor') {
          resolveOrientedMove(vehicle.group.position, vehicle.group.rotation.y, vehicle.pendingDx, vehicle.pendingDz, p.body.w / 2, p.body.d / 2, otherVehicleBoxes(vehicle));
        } else {
          moveSmallVehicle(vehicle, vehicle.pendingDx, vehicle.pendingDz);
        }
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
          // Bugfix (defect 2): resolved as the trolley's real oriented bed
          // footprint (half-extents, at its current yaw), not a circle.
          const { shortfallX, shortfallZ } = resolveTowedMove(trolley.group.position, trolley.group.rotation.y, target, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH, otherVehicleBoxes(vehicle));
          if (Math.abs(shortfallX) > 1e-4 || Math.abs(shortfallZ) > 1e-4) {
            vehicle.group.position.x -= shortfallX;
            vehicle.group.position.z -= shortfallZ;
            // Bugfix (defect 3 of the real playtest regression): this used to
            // write the tractor's position directly and never resolve it —
            // pulling the tractor back by the trolley's shortfall can itself
            // walk the tractor into a wall or another vehicle behind it, with
            // nothing to catch that. Route it through the same oriented
            // resolver every other write to this position goes through.
            resolveOrientedCollisions(vehicle.group.position, vehicle.group.rotation.y, p.body.w / 2, p.body.d / 2, otherVehicleBoxes(vehicle));
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
              // attachTrolley() now refuses (returns false) if the trolley's
              // computed rest position is blocked, rather than placing it there —
              // only clear looseTrolley / count this as attached on success, so a
              // blocked attach leaves the trolley exactly where it was and the
              // prompt still showing, instead of silently doing nothing while the
              // UI acts like it worked.
              if (attachPressed && vehicle.attachTrolley(candidateTrolley)) {
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
        movePlayerBy(moveDir.x * MOVE_SPEED * dt, moveDir.z * MOVE_SPEED * dt);
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

      if (isDevMode()) devCheckPenetration();

      camRig.update();
      audio.update(dt);
      dust.update(dt, now / 1000);
      updateSky(sky, now / 1000, camera);
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
      audio.setListenerDistanceToWater(distanceToCanalWater(listenerPos.x, listenerPos.z));
      zoneManager.update(listenerPos.x, listenerPos.z, dt, camera);
      if (fieldSarson) fieldSarson.visible = Math.hypot(listenerPos.x - FIELD_CENTER.x, listenerPos.z - FIELD_CENTER.z) < 95;
      if (fieldCane) fieldCane.visible = Math.hypot(listenerPos.x - FIELD_CENTER.x, listenerPos.z - FIELD_CENTER.z) < 95; // cane blocks only draw near the khet (draw-call ceiling elsewhere)
      setPlantFocus(listenerPos.x, listenerPos.z);
      if (bgHousesGroup) bgHousesGroup.userData.updateVisibility(listenerPos.x, listenerPos.z);
      freeRoam.update(dt);
      minimap.update(dt);
      ambientLife.update(dt, listenerPos.x, listenerPos.z);
      if (sideJobs) sideJobs.update(dt);
      // steam is one extra draw call: only shown/updated near the stall (also keeps the hero-zone budget at its ceiling-safe level)
      teaSteam.points.visible = Math.abs(listenerPos.x - TEA_SHOP_POS.x) < 28 && Math.abs(listenerPos.z - TEA_SHOP_POS.z) < 28;
      if (teaSteam.points.visible) teaSteam.update(dt);
      halwaiFire.points.visible = Math.abs(listenerPos.x - HALWAI_CENTER.x) < 30 && Math.abs(listenerPos.z - HALWAI_CENTER.z) < 30;
      if (halwaiFire.points.visible) halwaiFire.update(dt);
      updateWater(performance.now() / 1000);
      for (const m of distGated) { const g = m.userData.distGate; const v = Math.hypot(camera.position.x - g.x, camera.position.z - g.z) < g.r + g.range; if (v !== m.visible) { m.visible = v; requestColliderRebuild(); } } // stock cells carry derived colliders only while drawn

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

  // `?proof=1` exposes the same scripted-positioning hook as `?dev=1` but turns on NONE of
  // dev mode's visible extras (no fps counter, no staging boxes, no penetration logging) —
  // the render is exactly what a normal player sees; it exists only so proof screenshots
  // (docs/shots/compare/*) can stand at a chosen spot without walking there.
  if (isDevMode() || new URLSearchParams(window.location.search).has('proof')) {
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
      npcs: [maaNpc, halwaiNpc, dadaNpc, childNpc, teacherNpc, sisterNpc, pitajiNpc, postmanNpc, monkeyNpc, dadiNpc],
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
      setSisterFollowing: (on) => { sisterFollowing = on; },
      dialogue,
      quest,
      QUEST_STEPS,
      freeRoam,
      startFreeRoam,
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
      Raycaster: THREE.Raycaster,
      get zoneManager() { return zoneManager; },
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
      // Free photo camera for docs/shots/compare/* (same angle as a Places V1 reference render):
      // player hidden, camera rig frozen until unfreezeCamera().
      photoCamera: ({ pos, target, fov = camera.fov }) => {
        camera.position.set(pos[0], pos[1], pos[2]);
        camera.fov = fov;
        camera.lookAt(target[0], target[1], target[2]);
        camera.updateProjectionMatrix();
        player.visible = false;
        if (!camRig._frameObjectOrigUpdate) camRig._frameObjectOrigUpdate = camRig.update.bind(camRig);
        camRig.update = () => {};
      },
      unfreezeCamera: () => {
        if (camRig._frameObjectOrigUpdate) camRig.update = camRig._frameObjectOrigUpdate;
        player.visible = true;
      },
      // Item 1e — same as frameObject() above, but unions several named
      // objects' boxes first (e.g. the tractor AND the trolley, two separate
      // top-level objects with no shared parent to frame as one) so both are
      // guaranteed fully in shot together.
      frameObjects: (names, { angleDeg = 0, elevationDeg = 12, fill = 0.7 } = {}) => {
        const box = new THREE.Box3();
        let any = false;
        for (const name of names) {
          scene.traverse((o) => {
            if (o.name !== name) return;
            const b = new THREE.Box3().setFromObject(o, true);
            if (isFinite(b.min.x)) {
              box.union(b);
              any = true;
            }
          });
        }
        if (!any) return { found: false };
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
        return { found: true, center: { x: center.x, y: center.y, z: center.z }, size: { x: size.x, y: size.y, z: size.z }, distance: dist };
      },
      // Item 4 acceptance measurement — "report the minimum distance between
      // each collider pair; any negative value is a failure."
      npcRoutes: NPC_ROUTES,
      minDistanceToColliders: (pos, radius, skipDerived = false) => minSignedDistanceToColliders(pos, radius, skipDerived ? STATIC_COLLIDERS.filter((b) => !b.auto) : STATIC_COLLIDERS),
      staticColliderCount: () => STATIC_COLLIDERS.length,
      // tools/collider-audit.js — the raw box list, for auditing coverage against
      // real visual geometry (not just re-checking the boxes against themselves).
      getStaticColliders: () => STATIC_COLLIDERS.map((b) => ({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, auto: !!b.auto, src: b.src })),
      // tools/trolley-corner-test.js / tools/trolley-drive-test.js — the exact
      // half-extents the collision resolver protects for the trolley (the real
      // 3.5 x 2.0 BED, same definition the bug report's own fix formula used —
      // hypot(bedLen,bedW)/2 — not the whole visual group, which also includes a
      // thin steel drawbar/hitch-eye projecting 1.2m past the bed's front edge
      // and is not part of this fix's scope). Exposed so test ground truth can't
      // silently drift from what the resolver actually promises.
      getTrolleyHalfExtents: () => ({ halfW: TROLLEY_HALF_WIDTH, halfD: TROLLEY_HALF_LENGTH }),
      // tools/regression-check.js — real-keyboard-input trolley collision tests
      // (added after the real playtest bug where the trolley had NO box at all
      // in otherVehicleBoxes(), so nothing — player, NPCs, or any other
      // vehicle — could ever detect colliding with it). These read the exact
      // same ground truth the live resolver itself uses (the trolley/looseTrolley
      // reference, TROLLEY_HALF_WIDTH/LENGTH, orientedFootprintBox,
      // orientedBoxOverlapsAnyBox, STATIC_COLLIDERS) rather than re-deriving
      // anything that could silently drift from what the game actually does.
      currentTrolley: () => {
        const owningTractor = vehicles.find((v) => v.trolley);
        const trolley = (owningTractor && owningTractor.trolley) || looseTrolley;
        if (!trolley) return null;
        return { x: trolley.group.position.x, z: trolley.group.position.z, yaw: trolley.group.rotation.y, attached: trolley.attached };
      },
      // Depth-based (not a strict boolean — see orientedBoxWorstClearance()'s
      // own doc comment for why a strict "any overlap" boolean flags ordinary
      // resting/grazing contact as a false positive, the first version of
      // this tried and caught by tools/regression-check.js's own test).
      trolleyWallClearance: () => {
        const owningTractor = vehicles.find((v) => v.trolley);
        const trolley = (owningTractor && owningTractor.trolley) || looseTrolley;
        if (!trolley) return Infinity;
        return orientedBoxWorstClearance(trolley.group.position.x, trolley.group.position.z, trolley.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH, STATIC_COLLIDERS);
      },
      playerDistanceToTrolley: () => {
        const owningTractor = vehicles.find((v) => v.trolley);
        const trolley = (owningTractor && owningTractor.trolley) || looseTrolley;
        if (!trolley) return Infinity;
        const box = orientedFootprintBox(trolley.group.position.x, trolley.group.position.z, trolley.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH);
        return minSignedDistanceToColliders(player.position, PLAYER_COLLISION_RADIUS, [box]);
      },
      // Signed clearance between ANOTHER vehicle's real oriented body (e.g. the
      // tractor once it no longer owns this trolley, after a real detach) and
      // the trolley's real footprint right now — exact, using the tractor's
      // own real p.body.w/2, p.body.d/2 half-extents, the same ones
      // resolveOrientedMove() itself resolves against (see the mountedVehicle
      // branch above). Negative = penetrating by that depth, positive = clear
      // by that margin — same convention as playerDistanceToTrolley()/
      // minSignedDistanceToColliders(), so a test can apply the same small
      // tolerance (an iterative push-out resolver only ever converges to
      // approximately, not exactly, zero clearance — a strict boolean overlap
      // test flags normal resting contact as a false "penetration").
      vehicleClearanceToTrolley: (kind) => {
        const v = vehicles.find((v) => v.preset.kind === kind);
        if (!v) return Infinity;
        const owningTractor = vehicles.find((v) => v.trolley);
        const trolley = (owningTractor && owningTractor.trolley) || looseTrolley;
        if (!trolley) return Infinity;
        const box = orientedFootprintBox(trolley.group.position.x, trolley.group.position.z, trolley.group.rotation.y, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH);
        return orientedBoxClearance(v.group.position.x, v.group.position.z, v.group.rotation.y, v.preset.body.w / 2, v.preset.body.d / 2, box);
      },
      // tools/collider-audit.js / tools/trolley-drive-test.js — real per-building
      // footprints captured from geometry just before the static merge (see
      // loadDeferredContent()).
      getBuildingFootprints: () => buildingFootprints,
      getPreMergeColliderCount: () => preMergeColliderCount,
      // tools/trolley-drive-test.js — places a vehicle (and, for a tractor with an
      // attached trolley, snaps the trolley back to its rest position behind it)
      // without needing a real mount/drive-there flow.
      teleportVehicle: (kind, x, z, yaw = 0) => {
        const v = vehicles.find((v) => v.preset.kind === kind);
        if (!v) return false;
        v.group.position.set(x, 0, z);
        v.group.rotation.y = yaw;
        v.speed = 0;
        if (v.trolley) return v.attachTrolley(v.trolley); // false = the trolley's rest spot is blocked, so it was NOT snapped behind the tractor
        return true;
      },
      // tools/trolley-drive-test.js — a deterministic, fixed-dt single step of
      // EXACTLY the tractor+trolley physics the real per-frame loop above runs
      // (mountedVehicle branch, lines ~1080-1142): vehicle.update() ->
      // resolveMove() -> trolley.updateYawHinge()/hitchTargetPosition() ->
      // resolveTowedMove() -> shortfall-pulls-tractor-back. Calls the same
      // movement.js/vehicles.js functions untouched, just without the
      // mount/UI/audio/attach-prompt bookkeeping around them, so the test can
      // step frame-by-frame with a fixed dt instead of depending on real
      // wall-clock frame pacing.
      stepTractorTrolleyPhysics: (dt = 1 / 60, throttleZ = -1, steerX = 0) => {
        const vehicle = vehicles.find((v) => v.preset.kind === 'tractor');
        if (!vehicle) return null;
        vehicle.update(dt, { moveZ: throttleZ, moveX: steerX });
        const p = vehicle.preset;
        // Mirrors the real loop's tractor-resolution exactly (see the
        // mountedVehicle branch above) — oriented box, not a circle.
        resolveOrientedMove(vehicle.group.position, vehicle.group.rotation.y, vehicle.pendingDx, vehicle.pendingDz, p.body.w / 2, p.body.d / 2, otherVehicleBoxes(vehicle));
        vehicle.group.position.x = THREE.MathUtils.clamp(vehicle.group.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        vehicle.group.position.z = THREE.MathUtils.clamp(vehicle.group.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        if (vehicle.trolley && vehicle.trolley.attached) {
          const trolley = vehicle.trolley;
          const trolleyPrevX = trolley.group.position.x;
          const trolleyPrevZ = trolley.group.position.z;
          trolley.updateYawHinge(dt, vehicle);
          const target = trolley.hitchTargetPosition(vehicle);
          const { shortfallX, shortfallZ } = resolveTowedMove(trolley.group.position, trolley.group.rotation.y, target, TROLLEY_HALF_WIDTH, TROLLEY_HALF_LENGTH, otherVehicleBoxes(vehicle));
          if (Math.abs(shortfallX) > 1e-4 || Math.abs(shortfallZ) > 1e-4) {
            vehicle.group.position.x -= shortfallX;
            vehicle.group.position.z -= shortfallZ;
            resolveOrientedCollisions(vehicle.group.position, vehicle.group.rotation.y, p.body.w / 2, p.body.d / 2, otherVehicleBoxes(vehicle));
            vehicle.speed = 0;
          }
          trolley.finishMoveStep(dt, trolleyPrevX, trolleyPrevZ);
        }
        return { x: vehicle.group.position.x, z: vehicle.group.position.z, speed: vehicle.speed };
      },
      // tools/world-validator.js (check 6 — reachability) — a deterministic,
      // fixed-dt single step of the on-foot player's REAL movement resolver
      // (resolveMove -> clamp -> groundHeightAt, exactly the `else` branch of
      // the real per-frame input handler above, minus UI/audio bookkeeping —
      // same pattern as stepTractorTrolleyPhysics). Takes a world-space
      // direction directly (not camera-relative input), since the caller
      // computes "which way is the target" itself each step — local Vector3s,
      // not the shared module-level forward/right/moveDir the real per-frame
      // loop also uses, so this can't race with a real rAF tick running
      // concurrently (harmless either way since no real key is held during a
      // validator run, but cheap to keep fully isolated).
      stepPlayerMove: (dt, dirX, dirZ) => {
        const len = Math.hypot(dirX, dirZ);
        const nx = len > 1e-6 ? dirX / len : 0;
        const nz = len > 1e-6 ? dirZ / len : 0;
        movePlayerBy(nx * MOVE_SPEED * dt, nz * MOVE_SPEED * dt);
        return { x: player.position.x, z: player.position.z };
      },
      // tools/collision-test.js — what the collision test needs beyond the hooks above.
      playerRadius: PLAYER_COLLISION_RADIUS,
      siteSlotInfo: slotInfo,
      isPlaceSite,
      places: PLACES,
      assetSlotTable: () => Array.from(assetSlots.slots.values()).map((s) => ({ name: s.name, dimensions: s.dimensions, exact: s.exact })),
      autoBodyRadius: AUTO_BODY_RADIUS,
      colliderStats,
      getWalkableAreas: () => [...lastCarves, ...WALKABLE_RECTS],
      groundHalfExtent: GROUND_HALF_EXTENT,
      isBlockedAt: (x, z, r) => positionBlocked({ x, z }, r, otherVehicleBoxes(null)),
      rebuildColliders: () => initStaticColliders(scene),
      setStaticColliders: (boxes) => setStaticColliders(boxes),
      resolveMove: (pos, dx, dz, radius) => resolveMove(pos, dx, dz, radius, otherVehicleBoxes(null)),
      getDynamicBoxes: () => otherVehicleBoxes(null),
      getVehicleSolids: () => vehicles.map((v) => ({ kind: v.preset.kind, boxes: vehicleSolidBoxes(v), assembly: v.preset.assembly || null })),
      getVehicleFootprints: () => vehicles.map((v) => ({ kind: v.preset.kind, x: v.group.position.x, z: v.group.position.z, yaw: v.group.rotation.y, halfW: v.preset.body.w / 2, halfD: v.preset.body.d / 2 })),
      // Bike/cart step, mirroring the mounted-vehicle branch of the real loop (circle resolve, speed zeroed on a block).
      stepVehicle: (kind, dt = 1 / 60, throttleZ = -1, steerX = 0) => {
        if (kind === 'tractor') return window.__dopahar.stepTractorTrolleyPhysics(dt, throttleZ, steerX);
        const vehicle = vehicles.find((v) => v.preset.kind === kind);
        if (!vehicle) return null;
        vehicle.update(dt, { moveZ: throttleZ, moveX: steerX });
        moveSmallVehicle(vehicle, vehicle.pendingDx, vehicle.pendingDz);
        vehicle.group.position.x = THREE.MathUtils.clamp(vehicle.group.position.x, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        vehicle.group.position.z = THREE.MathUtils.clamp(vehicle.group.position.z, -GROUND_HALF_EXTENT, GROUND_HALF_EXTENT);
        return { x: vehicle.group.position.x, z: vehicle.group.position.z, speed: vehicle.speed, yaw: vehicle.group.rotation.y };
      },
    };
  }
}

main();
