/**
 * 26 Nov (honest gate): runs `fn` right after boot, inside the loading gate, tracked (src/kit/lateBuild.js track): Play unlocks only
 * once it (and the downloads it starts) are done, so the late surface variants (house atlas cells 8..15, shop brick_b / concrete_f)
 * are on the walls BEFORE the player sees them. Was: after the Play button, which swapped looks in front of the player.
 */
import { track } from './kit/lateBuild.js';
export function afterReady(fn) {
  if (typeof window === 'undefined') return;
  track(new Promise((r) => setTimeout(() => { try { Promise.resolve(fn()).then(r, r); } catch (e) { r(); } }, 0)));
}
