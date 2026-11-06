/**
 * What the player can walk through, as ONE list shared by the game (src/autoColliders.js) and
 * tools/collision-test.js. Everything visible and opaque in the player's body band (knee to chest)
 * is solid unless it matches a rule here. Add a rule only for something deliberately walkable, and
 * say why: an entry is a promise that the player may pass through that thing.
 *
 * Each rule is tested against `topLevelGroup/meshName/materialName`.
 */
export const NON_SOLID_RULES = [
  // Crops, grass, flowers, foliage, leaves: walkable by the brief ("field crops/grass are not solid").
  [/crop_rows|field_cane|\/cane$|plant_|\/grass|tuft|reed|flower|foliage|canopy|\/leaf|sugarcane_belt|bush|hedge/i, 'plants are walkable'],
  // Hanging cloth, bunting, garlands: soft and overhead-ish, never a wall.
  [/laundry|cloth|bunting|garland|flag/i, 'soft hanging cloth'],
  // Ground-shaped surfaces that happen to rise through the body band: banks, mounds, ramps, tracks, water.
  [/\/ground$|\/dirt$|\/earth$|\/mud$|\/sand$|water|ripple|canal_bank_road|\/kerb|\/drain|stepping|\/path/i, 'walkable ground surface'],
  // Everyday-scene people (capsule placeholders that sit, crouch, hop and roll a tyre), the tyre, rangoli, game decals, TV screen and
  // mosquito net (src/lifeScenes2.js): they move or lie flat, so they are soft like the village's other idle figures.
  [/life_scenes_2\/(life_scenes_2_people|tyre|game_decals|rangoli|tv_screen|net_cloth)/, 'moving or flat everyday-scene figures'],
  // Dev-only staging boxes (hidden outside ?dev=1).
  [/^tripo_[a-z_]+_placeholder\//, 'dev-only staging boxes'],
  // Animals carry their own boxes (src/animals.js), the herds' meshes are not walls.
  [/cattle_herd|dog_pack|^zone_lane_cattle|^zone_dogs|road_events\/road_events_(goats|goatherd|bovine|dogs|wood)/, 'animals have explicit boxes; goats and herder are soft by design; pegs and ropes are ankle-thin (src/roadEvents.js)'],
  // The abadi rows are instanced and distance-culled; their footprints come from src/abadiBoxes.json.
  [/^background_houses\/abadi_row_/, 'abadi rows: footprints from abadiBoxes.json'],
];

/** Top-level scene groups that are never static scenery: bodies that move, sky and ground, effects. */
export const SKIP_TOP = /^(npc_|vehicle_|player|trolley|sky|ground$|ambient_life|waypoint|dust|contact|tea_steam|halwai_fire|school_bell|bazaar_life|zone_east_road|zone_.*(walkers|cyclist|villagers|people|kids|crowd))/;

export function isNonSolidSource(src) {
  for (const [re] of NON_SOLID_RULES) if (re.test(src)) return true;
  return false;
}
