import * as THREE from 'three';

/**
 * Three named light/sky/air/ground treatments for Dopahar's "hot, hazy, slightly
 * bleached, warm not golden" North Indian mid-to-late-afternoon look — the thing a
 * real screenshot (docs/shots/opening/candidate_b.png) showed was missing: a flat
 * two-stop sky gradient, a low (20°, near-sunset) sun, a uniform fog wash that pastes
 * distant buildings onto the horizon instead of letting them sit back in haze, and a
 * flat ground tone.
 *
 * Each preset drives: src/scene.js's createSun()/applyFog(), src/sky.js's
 * createSky() (now a 3-stop gradient + a slow dust/haze drift, not a 2-stop blend),
 * and a ground large-scale tone-contrast multiplier (src/materials.js's
 * applyGroundNoiseDetail, which already had patch variation — this only makes it
 * read, rather than adding a new mechanism). `dayline.js`'s existing "warms toward
 * evening as the errands progress" arc is kept, now offset from whichever preset is
 * live instead of a hardcoded absolute END.
 */

const PALETTE_HEX = [0xe8dcc4, 0xdcc488, 0xc98e72, 0x8fafa6, 0xa8bccb, 0xefdca8, 0xbcbfa8, 0x8a6a4a]; // the fixed building palette — referenced here only as a guard comment, never sampled from

export const ATMOSPHERE_PRESETS = {
  // A — "Balanced afternoon": the straightforward reading of the brief. High sun,
  // short hard shadows, warm-white light (not orange), moderate haze.
  A: {
    label: 'Balanced afternoon',
    sunElevationDeg: 48,
    sunColor: new THREE.Color(0xfff2db),
    sunIntensity: 3.3,
    skyHorizonColor: new THREE.Color(0xf2d9ab), // warm pale, bleached — less saturated than the old sunset-leaning 0xf6dcae
    skyHazeColor: new THREE.Color(0xdcd0ba), // NEW mid-sky band — the hazy bleached layer the brief asks for
    skyZenithColor: new THREE.Color(0x3d6ea3), // real depth of blue overhead
    dustStrength: 0.05,
    dustColor: new THREE.Color(0xf4e8cf),
    fogColor: new THREE.Color(0xe6d5ad),
    fogDensity: 0.0052,
    groundContrastMultiplier: 1.35,
  },
  // B — "Heat haze": leans harder into the dust/heat side of the brief — hazier air,
  // a slightly lower, warmer sun, a more bleached/desaturated upper sky (heavy haze
  // scatters blue out of the zenith too, not just near the horizon).
  B: {
    label: 'Heat haze',
    sunElevationDeg: 42,
    sunColor: new THREE.Color(0xffecc4),
    sunIntensity: 3.1,
    skyHorizonColor: new THREE.Color(0xf0d19e),
    skyHazeColor: new THREE.Color(0xe2cfac),
    skyZenithColor: new THREE.Color(0x5a85ad), // lighter, hazier blue — more scatter, less saturated than A/C
    dustStrength: 0.09,
    dustColor: new THREE.Color(0xf2e4c6),
    fogColor: new THREE.Color(0xe9d6a8),
    fogDensity: 0.0068,
    groundContrastMultiplier: 1.25,
  },
  // C — "Clear high sun": the coolest/clearest of the three — crisper blue overhead,
  // less haze, the highest sun (shortest, hardest shadows), a cleaner, less dusty air.
  C: {
    label: 'Clear high sun',
    sunElevationDeg: 55,
    sunColor: new THREE.Color(0xfff0d2),
    sunIntensity: 3.4,
    skyHorizonColor: new THREE.Color(0xf4ddb2),
    skyHazeColor: new THREE.Color(0xd8cbae),
    skyZenithColor: new THREE.Color(0x2f5f93), // deepest, clearest blue of the three
    dustStrength: 0.035,
    dustColor: new THREE.Color(0xf6ecd8),
    fogColor: new THREE.Color(0xe2cf9f),
    fogDensity: 0.0044,
    groundContrastMultiplier: 1.3,
  },
};

// The live treatment — change this one line to switch which preset the whole game
// uses (sun/sky/fog/ground). See docs/look-standard.md for why this one was picked.
export const ACTIVE_ATMOSPHERE = 'A';

export function getActiveAtmosphere() {
  return ATMOSPHERE_PRESETS[ACTIVE_ATMOSPHERE];
}

// dayline.js's end-of-day state: elevationDeg is a DELTA applied to whichever
// preset is live (so the sun always drops the same ~11deg toward evening,
// regardless of which afternoon treatment it started from); the colours are
// absolute end-of-day targets, unchanged from the original design — the warm
// evening look itself doesn't depend on which daytime preset is active.
export const DAYLINE_END = {
  elevationDeg: -11,
  sunColor: new THREE.Color(0xffb877),
  horizonColor: new THREE.Color(0xe8935a),
  hazeColor: new THREE.Color(0xd9915f),
  zenithColor: new THREE.Color(0x2a3f66),
  fogColor: new THREE.Color(0xe09a66),
};
