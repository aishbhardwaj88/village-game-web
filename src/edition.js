/**
 * S7 (desktop agent, 21 Nov): which EDITION of Dopahar is running, and the quality preset that goes with it.
 *
 * Two editions, ONE codebase (docs/s7/SPRINT.md "Selling rules"):
 *   web      free, in the browser, 'light' quality LATER (stub today; the web runs 'full' until she approves the village)
 *   desktop  paid, Mac + Windows app (desktop/ folder, Electron), 'full' quality
 *
 * How the edition is decided, first match wins:
 *   1. ?edition=desktop | ?edition=web in the address (testing only)
 *   2. window.dopaharDesktop.edition === 'desktop' (set by the desktop app's preload script, desktop/preload.cjs)
 *   3. 'web'
 *
 * The quality preset: desktop is always 'full'. The web is ALSO 'full' for now (owner's decision 21 Nov: full quality first,
 * the light web edition later; see WEB_QUALITY). ?quality=light | ?quality=full in the address overrides, for testing.
 *
 * Every other system reads distances and limits through ONE function, getQuality(), and never checks the edition
 * itself. The keys are documented on PRESETS below and in docs/s7/desktop.md ("Quality keys").
 */

export const EDITIONS = ['web', 'desktop'];

/**
 * Quality presets. Units: metres, pixels, counts. `full` is the one in use. `light` is a STUB for the later
 * free web edition: same keys, filled with today's web values (docs/s7/SPRINT.md "Budgets"), to be tuned later.
 * Keys (who reads them, see docs/s7/desktop.md "Wiring needed"):
 *   charTextures       'slim' = the build ran tools/char-diet.mjs (1024 px skins, 2048 for heroes);
 *                      'original' = the character files are the untouched originals (4096 px skins). Build-time fact,
 *                      reported here so a test can check it; the runtime cannot change it.
 *   charNear           characters fully animated (every frame, blink + smile) within this distance   (src/characterLOD.js LOD.NEAR)
 *   charMaxFull        at most this many fully animated at once, nearest first                       (LOD.MAX_FULL)
 *   charFar            characters hidden and paused beyond this distance                               (LOD.FAR)
 *   charMidHz          animation steps per second between charNear and charFar                         (LOD.MID_HZ)
 *   charLoadRadius     a character's model is fetched when the player comes this close                (LOD.LOAD_RADIUS)
 *   shadowRadius       things further than this from the player stop casting real sun shadows         (src/renderer.js SHADOW_RADIUS)
 *   charShadowRadius   characters further than this get a soft blob instead of a real shadow          (CHAR_SHADOW_RADIUS)
 *   blobMaxDistance    no blob beyond this (the character is hidden anyway)                            (BLOB_MAX_DISTANCE)
 *   shadowMapSize      sun shadow map, pixels per side, for the pause menu's 'high' level              (src/quality.js)
 *   shadowExtent       half-width of the sun's shadow box in metres at 'high'                          (src/quality.js)
 *   shadowFar          depth of the sun's shadow box in metres at 'high'                               (src/quality.js)
 *   pixelRatioMax      highest render resolution multiplier on a desktop/laptop screen at 'high'       (src/quality.js)
 *   zoneAlwaysExtra    zones within buildRadius + this are built whichever way the camera faces        (src/zoneManager.js ALWAYS_EXTRA)
 *   zoneSightExtra     zones within buildRadius + this are built when in view or ahead                 (SIGHT_EXTRA)
 *   zoneVisExtra       a built zone is drawn within buildRadius + this                                 (VIS_EXTRA)
 *   shadowMinCasterM   a mesh whose longest side is under this many metres casts no sun shadow (0 = no limit)   (src/renderer.js)
 *   adaptiveRes        true = pixel ratio steps down to 1.0 when frames run slow, and back up slowly         (src/dynamicRes.js)
 *   canvasAA           WebGL canvas antialias flag (the composer draws the scene, so it only matters with ?off=post) (src/renderer.js)
 *   sunShadows         true = real sun shadows on by default (today web needs ?shadows=follow)        (src/main.js FOLLOW_SUN_SHADOWS)
 */
const PRESETS = {
  // STUB (owner 21 Nov): kept for the later web edition; today's web numbers, not tuned. Not used unless ?quality=light.
  light: Object.freeze({
    name: 'light',
    charTextures: 'slim',
    charNear: 25,
    charMaxFull: 12,
    charFar: 50,
    charMidHz: 12,
    charLoadRadius: 55,
    shadowRadius: 60,
    charShadowRadius: 15,
    blobMaxDistance: 50,
    shadowMapSize: 2048,
    shadowExtent: 60,
    shadowFar: 200,
    pixelRatioMax: 1.5,
    zoneAlwaysExtra: 70,
    zoneSightExtra: 230,
    zoneVisExtra: 80,
    sunShadows: false,
    shadowMinCasterM: 0,
    adaptiveRes: false,
    canvasAA: true,
  }),
  full: Object.freeze({
    name: 'full',
    charTextures: 'original',
    charNear: 40,
    charMaxFull: 24,
    charFar: 80,
    charMidHz: 20,
    charLoadRadius: 90,
    shadowRadius: 120,
    charShadowRadius: 30,
    blobMaxDistance: 80,
    shadowMapSize: 4096,
    // 4096 px over a 120 m half-width box = the same sharpness per metre as web's 2048 px over 60 m
    shadowExtent: 120,
    shadowFar: 320,
    pixelRatioMax: 2,
    zoneAlwaysExtra: 110,
    zoneSightExtra: 300,
    zoneVisExtra: 130,
    // Real sun shadows: the biggest visual gain of the full edition. She left it to us (22 Nov: premium look first), so ON.
    sunShadows: true, // her call 22 Nov: "if it makes the game look better, add it": on Mac it grounds every shop, cart and person; render cost 3.5 -> 3.7 ms
    shadowMinCasterM: 0,
    adaptiveRes: false,
    canvasAA: true,
  }),
  // WEB (24 Nov, art director: lighter, but no visible quality drop; compare with ?quality=full). Same as 'full' except:
  //  - pixel ratio 1.0, climbing to 1.5 only when frames are fast (src/dynamicRes.js); ?pr=1.5 forces a ratio
  //  - sun shadow 2048 px over a 50 m half-width box = 0.049 m per texel (full: 4096 over 120 m = 0.059 m per texel), casters within 50 m (full 120 m)
  //  - nothing under 1.0 m casts a shadow
  //  - canvas antialias off: the scene is drawn into the composer's own buffer, so the canvas MSAA never touched it
  //  - background houses stop at 420 m (full 460 m), where the fog has hidden them (fog left at 420 m: 0.85%)
  web: Object.freeze({
    name: 'web',
    charTextures: 'original',
    charNear: 40,
    charMaxFull: 24,
    charFar: 80,
    charMidHz: 20,
    charLoadRadius: 90,
    shadowRadius: 50,
    charShadowRadius: 30,
    blobMaxDistance: 80,
    shadowMapSize: 2048,
    shadowExtent: 50,
    shadowFar: 200,
    pixelRatioMax: 1.5, // 25 Nov: was 1.0. Measured live on a 2x screen (1320x1336 css): p50 frame 31.2 ms at 1.0 vs 32.4 ms at 1.5, p95 40.9 both; faces were blurry at 1.0
    pixelRatioUpMax: 1.5, // adaptive resolution may climb to this when frames are fast (src/dynamicRes.js)
    zoneAlwaysExtra: 110,
    zoneSightExtra: 300,
    zoneVisExtra: 130,
    sunShadows: true,
    shadowMinCasterM: 1.0,
    adaptiveRes: true,
    canvasAA: false,
  }),
};

export const QUALITY_NAMES = Object.keys(PRESETS);

function param(name) {
  try {
    return new URLSearchParams(globalThis.location?.search || '').get(name);
  } catch (e) {
    return null;
  }
}

/** 'desktop' inside the desktop app, else 'web'. `?edition=` overrides, for testing. */
export function getEdition() {
  const forced = param('edition');
  if (forced && EDITIONS.includes(forced)) return forced;
  const flag = globalThis.window?.dopaharDesktop;
  if (flag && flag.edition === 'desktop') return 'desktop';
  return 'web';
}

/** Version of the desktop app (from its preload), or null on the web. */
export function getDesktopVersion() {
  const flag = globalThis.window?.dopaharDesktop;
  return flag && typeof flag.version === 'string' ? flag.version : null;
}

/**
 * Owner's decision (21 Nov, via the integrator): the FULL-quality desktop edition comes first, so 'full' is the default
 * EVERYWHERE, the web included. The 'light' preset is a stub (same keys, today's web values) to be tuned once she has
 * approved the village. When the light web edition is switched on, change this ONE line to 'light'.
 */
export const WEB_QUALITY = 'web';

/** Name of the preset in force: always 'full' on desktop; WEB_QUALITY ('web') on the web. `?quality=web|light|full` overrides, for testing. */
export function getQualityName() {
  const forced = param('quality');
  if (forced && PRESETS[forced]) return forced;
  return getEdition() === 'desktop' ? 'full' : WEB_QUALITY;
}

/** The frozen preset object every system reads (see the keys above). */
export function getQuality() {
  return PRESETS[getQualityName()];
}

/** For tests and tools: any preset by name. */
export function getQualityPreset(name) {
  return PRESETS[name] || null;
}

/**
 * Which character files this BUILD shipped: 'slim' (web build, char-diet ran) or 'original' (desktop build).
 * Set at build time by vite.config.js (VITE_DOPAHAR_BUILD, see docs/s7/desktop.md "Wiring needed"); 'unknown' in dev.
 */
export function getBuildFlavour() {
  try {
    const v = import.meta.env?.VITE_DOPAHAR_BUILD;
    return v === 'desktop' ? 'original' : v === 'web' ? 'slim' : 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Called once from main.js (S7 WIRING (desktop) block). Publishes what is running on window.__dopaharEdition for tests
 * and the in-game version line, and tags <html> with the edition so CSS can tell them apart if ever needed.
 * Never throws: a failure here must not stop the game.
 */
export function initEdition() {
  try {
    const info = {
      edition: getEdition(),
      quality: getQualityName(),
      preset: getQuality(),
      desktopVersion: getDesktopVersion(),
      build: getBuildFlavour(),
    };
    if (typeof window !== 'undefined') window.__dopaharEdition = info;
    if (typeof document !== 'undefined') document.documentElement.dataset.quality = info.quality;
    if (typeof document !== 'undefined') document.documentElement.dataset.edition = info.edition;
    return info;
  } catch (e) {
    return { edition: 'web', quality: 'light', preset: PRESETS.light, desktopVersion: null, build: 'unknown' };
  }
}
