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

/** 0 at NOT_STARTED, 1 at COMPLETE — front-loaded less, so most of the warmth lands
 * in the second half of the errand rather than spreading evenly across all 3 steps. */
export function dayProgressForQuestStep(step, QUEST_STEPS) {
  if (step === QUEST_STEPS.NOT_STARTED) return 0;
  if (step === QUEST_STEPS.HAVE_MONEY) return 0.4;
  if (step === QUEST_STEPS.HAVE_JALEBI) return 0.7;
  return 1; // COMPLETE
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
