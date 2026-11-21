/**
 * Every quality knob of the house kit in ONE place (S7 selling rules: one codebase, a 'light' web edition and a 'full'
 * desktop edition). When src/edition.js lands, houseQuality() should read its getQuality() preset name; until then the
 * web ('light') values are used everywhere.
 */
export const HOUSE_QUALITY = {
  light: { atlasCell: 512, anisotropy: 8, nearDist: 55, clutterDist: 40, farDist: 420, castShadow: true },
  full: { atlasCell: 1024, anisotropy: 16, nearDist: 90, clutterDist: 70, farDist: 600, castShadow: true },
};
export function houseQuality() {
  const name = (typeof globalThis !== 'undefined' && globalThis.__dopaharQuality) || 'light'; // swap for edition.js getQuality()
  return HOUSE_QUALITY[name] || HOUSE_QUALITY.light;
}
