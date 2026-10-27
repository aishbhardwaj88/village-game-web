import * as THREE from 'three';

/**
 * Night state (J0, 27 Oct). A single 0..1 `mix` blended over whatever the day line left
 * in the sun, sky, fog and fill lights this frame, so it composes with the afternoon
 * arc instead of replacing it. Moon = the same directional light at low intensity and a
 * cool colour (one shadow map, no extra light). Stars and the moon disc are in the sky
 * shader (uniform nightMix). No per-lamp lights anywhere: lit windows and lamps read
 * `night.mix` and drive emissive materials (see registerGlow).
 */
const NIGHT = {
  moonColor: new THREE.Color(0x9fb4e0),
  moonIntensity: 0.55,
  moonDir: new THREE.Vector3(-0.45, 0.62, 0.35).normalize(),
  hemiSky: new THREE.Color(0x1b2a4d),
  hemiGround: new THREE.Color(0x0e121c),
  hemiIntensity: 0.42,
  bounceIntensity: 0.04,
  envIntensity: 0.09,
  horizon: new THREE.Color(0x1a2640),
  haze: new THREE.Color(0x101a32),
  zenith: new THREE.Color(0x040916),
  fog: new THREE.Color(0x0c1527),
};

const _c = new THREE.Color();
const _v = new THREE.Vector3();

export function createNightController({ sun, sky, scene, hemi, bounceFill, audio }) {
  const base = {
    hemiSky: hemi.color.clone(),
    hemiGround: hemi.groundColor.clone(),
    hemiIntensity: hemi.intensity,
    bounceIntensity: bounceFill.intensity,
    sunIntensity: sun.intensity,
    envIntensity: scene.environmentIntensity,
  };
  let target = 0;
  const glows = []; // { material, day, night } emissive intensity pairs, driven by mix
  const api = {
    mix: 0,
    isNight: () => target === 1,
    set(on) { target = on ? 1 : 0; },
    toggle() { target = target ? 0 : 1; },
    /** Make a material light up at night: emissiveIntensity eases from `day` to `night`. */
    registerGlow(material, day, night) { glows.push({ material, day, night }); },
    update(dt) {
      if (api.mix === target && target === 0) return;
      api.mix = THREE.MathUtils.damp(api.mix, target, 1.4, dt);
      if (Math.abs(api.mix - target) < 0.002) api.mix = target;
      const m = api.mix;
      const u = sky.material.uniforms;
      u.nightMix.value = m;

      // The day line has just written the sun/sky/fog for this frame; blend toward night.
      _v.copy(sun.position).normalize().lerp(NIGHT.moonDir, m).normalize().multiplyScalar(sun.position.length());
      sun.position.copy(_v);
      sun.color.lerp(NIGHT.moonColor, m);
      sun.intensity = THREE.MathUtils.lerp(base.sunIntensity, NIGHT.moonIntensity, m);
      u.sunDirection.value.copy(sun.position).normalize();
      u.sunColor.value.lerp(NIGHT.moonColor, m);
      u.horizonColor.value.lerp(NIGHT.horizon, m);
      u.hazeColor.value.lerp(NIGHT.haze, m);
      u.zenithColor.value.lerp(NIGHT.zenith, m);
      if (scene.fog) scene.fog.color.lerp(NIGHT.fog, m);

      hemi.color.copy(base.hemiSky).lerp(NIGHT.hemiSky, m);
      hemi.groundColor.copy(base.hemiGround).lerp(NIGHT.hemiGround, m);
      hemi.intensity = THREE.MathUtils.lerp(base.hemiIntensity, NIGHT.hemiIntensity, m);
      bounceFill.intensity = THREE.MathUtils.lerp(base.bounceIntensity, NIGHT.bounceIntensity, m);
      scene.environmentIntensity = THREE.MathUtils.lerp(base.envIntensity, NIGHT.envIntensity, m);

      for (const g of glows) g.material.emissiveIntensity = THREE.MathUtils.lerp(g.day, g.night, m);
      audio?.setNight?.(m);
    },
  };
  return api;
}
