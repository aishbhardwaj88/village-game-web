import * as THREE from 'three';

/**
 * Day-end sequence (queue item 13, stretch goal): the light warms further and
 * lengthens (lower sun = longer shadows) as the errand progresses toward completion —
 * "dopahar" (afternoon) drifting toward evening, matching the errand's own "before
 * evening" line. Ties to quest progress, not a real clock, since there's no save
 * system and the whole errand is ~5 minutes.
 */
const START = {
  elevationDeg: 20,
  sunColor: new THREE.Color(0xfff1d6),
  horizonColor: new THREE.Color(0xf6dcae),
  zenithColor: new THREE.Color(0x3f6fa3),
};
const END = {
  elevationDeg: 9, // lower sun — longer shadows, warmer grazing light
  sunColor: new THREE.Color(0xffb877),
  horizonColor: new THREE.Color(0xe8935a),
  zenithColor: new THREE.Color(0x2a3f66),
};

const _tmpColor = new THREE.Color();

/**
 * 0 at NOT_STARTED, 1 at ALL_COMPLETE — one continuous afternoon spanning all three
 * errands (time/light task), not just the first. Each named step gets a fixed point
 * along the curve, in play order; the values are front-loaded less within each
 * errand (most of that errand's own warmth lands in its second half) but the *rate*
 * across errands is otherwise even — three errands of roughly similar length should
 * warm the sky by roughly a third each, not have errand 1 alone spend the whole
 * budget the way the original 2-step curve did.
 */
const STEP_PROGRESS = {
  not_started: 0,
  have_money: 0.08,
  have_jalebi: 0.15,
  complete: 0.22,
  have_tiffin: 0.32,
  have_sister: 0.42,
  errand2_complete: 0.52,
  loading_wheat: 0.68,
  wheat_delivered: 0.85,
  bought_goods: 0.93,
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
      const horizonNow = _tmpColor.clone();
      _tmpColor.copy(START.zenithColor).lerp(END.zenithColor, current);
      sky.material.uniforms.zenithColor.value.copy(_tmpColor);

      if (scene.fog) scene.fog.color.copy(horizonNow);
    }
  };
}
