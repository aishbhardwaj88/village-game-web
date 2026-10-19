import * as THREE from 'three';
import { getActiveAtmosphere, DAYLINE_END } from './atmosphere.js';

/**
 * Day-end sequence (queue item 13, stretch goal): the light warms further and
 * lengthens (lower sun = longer shadows) as the errand progresses toward completion —
 * "dopahar" (afternoon) drifting toward evening, matching the errand's own "before
 * evening" line. Ties to quest progress, not a real clock, since there's no save
 * system and the whole errand is ~5 minutes.
 *
 * START is the active atmosphere preset (src/atmosphere.js) — whichever afternoon
 * treatment is live. END is expressed as a DELTA from START (not a hardcoded
 * absolute "evening" state), so this arc's shape (elevation drops ~11deg, colours
 * warm toward orange/deep blue) stays the same regardless of which preset is active.
 */
const activePreset = getActiveAtmosphere();
const START = {
  elevationDeg: activePreset.sunElevationDeg,
  sunColor: activePreset.sunColor.clone(),
  horizonColor: activePreset.skyHorizonColor.clone(),
  hazeColor: activePreset.skyHazeColor.clone(),
  zenithColor: activePreset.skyZenithColor.clone(),
  fogColor: activePreset.fogColor.clone(),
};
const END = {
  elevationDeg: START.elevationDeg + DAYLINE_END.elevationDeg,
  sunColor: DAYLINE_END.sunColor.clone(),
  horizonColor: DAYLINE_END.horizonColor.clone(),
  hazeColor: DAYLINE_END.hazeColor.clone(),
  zenithColor: DAYLINE_END.zenithColor.clone(),
  fogColor: DAYLINE_END.fogColor.clone(),
};

const _tmpColor = new THREE.Color();

/**
 * 0 at NOT_STARTED, 1 at ALL_COMPLETE — one continuous afternoon spanning all EIGHT
 * missions (docs/STORY.md), not just the first three. Each named step gets a fixed
 * point along the curve, in play order, spread roughly evenly across the full
 * mission list so no single mission spends a disproportionate share of the warmth
 * budget — "dopahar" drifting gradually toward evening by the M8 rooftop scene.
 */
const STEP_PROGRESS = {
  // M1
  not_started: 0,
  have_money: 0.04,
  have_jalebi: 0.08,
  complete: 0.11,
  // M2
  have_tiffin: 0.16,
  have_sister: 0.2,
  errand2_complete: 0.24,
  // M3
  loading_wheat: 0.31,
  wheat_delivered: 0.38,
  bought_goods: 0.42,
  errand3_complete: 0.46,
  // M4
  finding_postman: 0.52,
  have_letter: 0.56,
  errand4_complete: 0.59,
  // M5
  going_to_darzi: 0.63,
  have_kurta: 0.66,
  // M6
  kurta_stolen: 0.71,
  kurta_recovered: 0.74,
  errand6_complete: 0.77,
  // M7
  going_to_baagh: 0.82,
  knocking_mangoes: 0.87,
  mangoes_loaded: 0.91,
  errand7_complete: 0.94,
  // M8
  going_to_roof: 0.98,
  all_complete: 1,
};

export function dayProgressForQuestStep(step) {
  return STEP_PROGRESS[step] ?? 1;
}

/** Call once per frame with the target progress (0..1) and dt — smoothly damps
 * toward it (a hard snap would be jarring right as a dialogue line completes) and
 * updates the sun's position/colour, the sky shader's uniforms, and fog colour. */
export function createDaylineController(sun, sky, scene) {
  let current = 0;
  const sunDistance = sun.position.length() || 80;

  return function update(targetProgress, dt) {
    current = THREE.MathUtils.damp(current, targetProgress, 0.35, dt);

    const elevationDeg = THREE.MathUtils.lerp(START.elevationDeg, END.elevationDeg, current);
    const elevationRad = THREE.MathUtils.degToRad(elevationDeg);
    sun.position.set(Math.cos(elevationRad) * sunDistance, Math.sin(elevationRad) * sunDistance, Math.cos(elevationRad) * sunDistance * 0.4);

    _tmpColor.copy(START.sunColor).lerp(END.sunColor, current);
    sun.color.copy(_tmpColor);

    if (sky.material.uniforms) {
      sky.material.uniforms.sunDirection.value.copy(sun.position).normalize();
      sky.material.uniforms.sunColor.value.copy(_tmpColor);
      _tmpColor.copy(START.horizonColor).lerp(END.horizonColor, current);
      sky.material.uniforms.horizonColor.value.copy(_tmpColor);
      _tmpColor.copy(START.hazeColor).lerp(END.hazeColor, current);
      sky.material.uniforms.hazeColor.value.copy(_tmpColor);
      _tmpColor.copy(START.zenithColor).lerp(END.zenithColor, current);
      sky.material.uniforms.zenithColor.value.copy(_tmpColor);

      if (scene.fog) {
        _tmpColor.copy(START.fogColor).lerp(END.fogColor, current);
        scene.fog.color.copy(_tmpColor);
      }
    }
  };
}
