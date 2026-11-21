import { getQualityName } from '../edition.js';

/**
 * Every quality knob of the house kit in ONE place (S7 selling rules: one codebase, 'light' web edition, 'full' desktop
 * edition). The preset name comes from src/edition.js (desktop 'full'; the web is 'full' too for now, ?quality=light to try).
 *
 * Costs measured on the real 492 houses (docs/s7/houses.md): the houses are always 1 draw call; triangles grow with nearDist
 * (55 m: 50-90k in a gali view). The atlas is 4 x 2 cells: 512 px cells = 2048 x 1024 x 3 maps (~33 MB GPU with mipmaps);
 * 1024 px cells would be ~134 MB GPU for little gain (the source scans are 1K), so both presets keep 512 until she asks.
 */
export const HOUSE_QUALITY = {
  light: { atlasCell: 512, anisotropy: 4, nearDist: 45, clutterDist: 30, farDist: 380, castShadow: true },
  full: { atlasCell: 512, anisotropy: 8, nearDist: 60, clutterDist: 45, farDist: 460, castShadow: true },
};
export function houseQuality() {
  let name = 'full';
  try { name = getQualityName(); } catch (e) { /* node tools: no edition */ }
  return HOUSE_QUALITY[name] || HOUSE_QUALITY.full;
}
