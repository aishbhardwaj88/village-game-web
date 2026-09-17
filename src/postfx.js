import {
  EffectComposer,
  RenderPass,
  EffectPass,
  VignetteEffect,
  NoiseEffect,
  HueSaturationEffect,
  BrightnessContrastEffect,
  BloomEffect,
  BlendFunction,
} from 'postprocessing';

/**
 * Wires the pmndrs "postprocessing" EffectComposer for grade/vignette/grain/bloom only.
 * Tone mapping itself stays on the renderer (ACESFilmicToneMapping, set in renderer.js —
 * step 3's "law"), so it is NOT duplicated here with a ToneMappingEffect: the
 * postprocessing package's own ACES curve uses a different middle-grey/white-point
 * calibration than three.js's, and running both in sequence double-compresses highlights
 * and reads as washed-out grey rather than a saturated golden-hour image. See docs/parked.md.
 */
export function createComposer(renderer, scene, camera, { enableBloom, enableGrain = true }) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const effects = [
    new HueSaturationEffect({ hue: 0.0, saturation: 0.08 }),
    new BrightnessContrastEffect({ brightness: 0.02, contrast: 0.06 }),
    new VignetteEffect({ offset: 0.35, darkness: 0.5 }),
  ];

  if (enableGrain) {
    // Subtle film grain: dial the overlay noise down via opacity-like blend intensity.
    // Skipped on touch (queue item 5) — a full-screen per-pixel noise pass is real
    // fragment-shader cost on a phone GPU for an effect that barely reads at phone
    // viewing distance/size anyway.
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    grain.blendMode.opacity.value = 0.06;
    effects.push(grain);
  }

  if (enableBloom) {
    // Soft warmth on genuinely bright things (sun glow, practicals), not a haze over
    // the whole frame — intensity/threshold both pulled back from the first pass,
    // which read as blown-out fog rather than bloom. See docs/parked.md.
    effects.unshift(
      new BloomEffect({
        intensity: 0.3,
        luminanceThreshold: 0.92,
        luminanceSmoothing: 0.15,
        mipmapBlur: true,
      })
    );
  }

  composer.addPass(new EffectPass(camera, ...effects));

  return composer;
}

export function resizeComposer(composer, width, height) {
  composer.setSize(width, height);
}
