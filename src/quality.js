/**
 * Pause menu quality setting (task 2) — three presets that actually change render
 * cost at runtime, not just a label: pixel ratio, shadow map resolution/distance, and
 * which post-processing effects run. High matches the pre-existing desktop/touch
 * defaults (src/renderer.js, src/scene.js) exactly, so picking High is a no-op vs the
 * old fixed behaviour.
 */
import { getQuality } from './edition.js'; // S7 (desktop)
import { setDynamicResCap } from './dynamicRes.js';
const STORAGE_KEY = 'dopahar_quality';

export const QUALITY_LEVELS = ['high', 'medium', 'low'];

const PRESETS = {
  high: {
    pixelRatioDesktop: 1.5,
    pixelRatioTouch: 1.0,
    shadowMapSize: 2048,
    shadowMapSizeTouch: 1024,
    shadowFarDesktop: 200,
    shadowFarTouch: 120,
    shadowExtentDesktop: 60,
    shadowExtentTouch: 38,
    bloom: true,
    grain: true,
  },
  medium: {
    pixelRatioDesktop: 1.1,
    pixelRatioTouch: 0.85,
    shadowMapSize: 1024,
    shadowMapSizeTouch: 768,
    shadowFarDesktop: 140,
    shadowFarTouch: 100,
    shadowExtentDesktop: 45,
    shadowExtentTouch: 32,
    bloom: false,
    grain: true,
  },
  low: {
    pixelRatioDesktop: 0.85,
    pixelRatioTouch: 0.65,
    shadowMapSize: 512,
    shadowMapSizeTouch: 512,
    shadowFarDesktop: 100,
    shadowFarTouch: 70,
    shadowExtentDesktop: 32,
    shadowExtentTouch: 24,
    bloom: false,
    grain: false,
  },
};

export function getPreset(level) {
  return withEditionCeiling(level, PRESETS[level] || PRESETS.medium); // S7 (desktop): edition ceiling, see the marked block at the end
}

/** Reads a previously-saved quality choice from localStorage, wrapped in try/catch —
 * private browsing / blocked storage must never break startup, just silently fall
 * back to `defaultLevel`. */
export function loadSavedQuality(defaultLevel) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PRESETS[saved]) return saved;
  } catch (e) {
    // storage blocked/unavailable — fall through to the default
  }
  return defaultLevel;
}

export function saveQuality(level) {
  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch (e) {
    // storage blocked/unavailable — quality still applies for this session, just won't persist
  }
}

/**
 * Applies a quality preset to everything adjustable without a reload: renderer pixel
 * ratio, and the sun's shadow map size/camera frustum (disposing the existing shadow
 * map so three.js regenerates it at the new size on the next render). Post-processing
 * (bloom/grain) can't be toggled on an existing EffectComposer in place — the caller
 * must rebuild the composer with the returned `{enableBloom, enableGrain}` flags (see
 * src/postfx.js createComposer, called again from main.js's setQuality()).
 */
export function applyQuality(level, { renderer, sun, isTouch }) {
  const p = getPreset(level);

  const pixelRatioCap = isTouch ? p.pixelRatioTouch : p.pixelRatioDesktop;
  if (!isTouch) setDynamicResCap(pixelRatioCap); // web edition: the adaptive resolution's ceiling follows the menu level (no-op unless adaptive)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));

  const mapSize = isTouch ? p.shadowMapSizeTouch : p.shadowMapSize;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = isTouch ? p.shadowFarTouch : p.shadowFarDesktop;
  const extent = isTouch ? p.shadowExtentTouch : p.shadowExtentDesktop;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.updateProjectionMatrix();
  if (sun.shadow.map) {
    sun.shadow.map.dispose();
    sun.shadow.map = null;
  }

  return { enableBloom: p.bloom, enableGrain: p.grain, pixelRatioCap };
}

const VOLUME_KEY = 'dopahar_volume';

/** Master volume 0..1, same try/catch-and-fall-back shape as the quality choice above. */
export function loadSavedVolume(defaultVolume = 1) {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
  } catch (e) {
    // storage blocked/unavailable — fall through to the default
  }
  return defaultVolume;
}

export function saveVolume(v) {
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch (e) {
    // storage blocked/unavailable — volume still applies for this session
  }
}

// ---------------------------------------------------------------------------------------------
// S7 ADDITION (desktop agent, 21 Nov): the quality preset (src/edition.js getQuality()) raises the
// ceiling of the pause menu's 'high' level. 'full' (the default everywhere for now, owner 21 Nov):
// 'high' becomes pixel ratio up to 2, a 4096 shadow map over a 120 m box. 'light' (stub for the
// later web edition) is a no-op: its numbers equal 'high' above (1.5, 2048, 60 m).
// 'medium' and 'low' stay as they are, so a player on a weak machine can still step down.
// Touch values are never raised.
// ---------------------------------------------------------------------------------------------
function withEditionCeiling(level, p) {
  if (level !== 'high') return p;
  let q;
  try { q = getQuality(); } catch (e) { return p; }
  if (!q || q.name === 'light') return p;
  // web (24 Nov): the numbers are the web edition's own, not a raise: 1.5 pixel ratio, 2048 map over a 50 m half-width box
  if (q.name === 'web') return { ...p, pixelRatioDesktop: q.pixelRatioMax, shadowMapSize: q.shadowMapSize, shadowFarDesktop: q.shadowFar, shadowExtentDesktop: q.shadowExtent };
  return {
    ...p,
    pixelRatioDesktop: Math.max(p.pixelRatioDesktop, q.pixelRatioMax),
    shadowMapSize: Math.max(p.shadowMapSize, q.shadowMapSize),
    shadowFarDesktop: Math.max(p.shadowFarDesktop, q.shadowFar),
    shadowExtentDesktop: Math.max(p.shadowExtentDesktop, q.shadowExtent),
  };
}
