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
export function createComposer(renderer, scene, camera, { enableBloom }) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const effects = [
    new HueSaturationEffect({ hue: 0.0, saturation: 0.08 }),
    new BrightnessContrastEffect({ brightness: 0.02, contrast: 0.06 }),
    new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true }),
    new VignetteEffect({ offset: 0.35, darkness: 0.5 }),
  ];
  // Subtle film grain: dial the overlay noise down via opacity-like blend intensity.
  effects[2].blendMode.opacity.value = 0.06;

  if (enableBloom) {
    effects.unshift(
      new BloomEffect({
        intensity: 0.6,
        luminanceThreshold: 0.8,
        luminanceSmoothing: 0.2,
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
