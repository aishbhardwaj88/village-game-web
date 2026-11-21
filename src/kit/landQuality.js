/**
 * Shops-land detail knobs in one place, so the paid desktop edition ('full') can raise them and the web edition ('light')
 * can keep them modest from ONE codebase. If src/edition.js exists (desktop agent) its getQualityName() picks the preset
 * ('full' everywhere for now, owner 21 Nov); until it is merged, ?quality=full|light or 'light'. Distances are metres from the camera.
 */
const editionMods = import.meta.glob('../edition.js', { eager: true });

const PRESETS = {
  light: { shopNearM: 35, shopMidM: 100, treeNearM: 42, treeMidM: 95, treeVariants: 3, propM: 90, plantM: 70 },
  full: { shopNearM: 60, shopMidM: 160, treeNearM: 70, treeMidM: 150, treeVariants: 4, propM: 140, plantM: 110 },
};

function pick() {
  try {
    const mod = editionMods['../edition.js'];
    const name = mod && typeof mod.getQualityName === 'function' ? mod.getQualityName() : null;
    if (name && PRESETS[name]) return { name, ...PRESETS[name] };
  } catch (e) { /* fall through */ }
  const url = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quality') : null;
  if (url && PRESETS[url]) return { name: url, ...PRESETS[url] };
  return { name: 'light', ...PRESETS.light };
}

export const LAND_QUALITY = pick();
