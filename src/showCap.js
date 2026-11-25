// SHOW CAP (26 Nov, her goal: a light browser game). Nothing is drawn beyond SHOW_CAP metres from the player.
// FogExp2 leaves exp(-(d*density)^2) of an object: at 265 m, density 0.0052 leaves 15% (85% fogged), so the cut is invisible.
// The afternoon mood sways density +-6%, so the floor carries a small margin. Presets already above the floor are untouched.
export const SHOW_CAP = 265;
export const FOG_LEFT_AT_CAP = 0.15;
export const FOG_MIN_DENSITY = Math.ceil(Math.sqrt(-Math.log(FOG_LEFT_AT_CAP)) / SHOW_CAP / 0.96 * 1e4) / 1e4; // 0.0054
