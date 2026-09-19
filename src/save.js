/**
 * Save/continue (queue item 7) — one small localStorage object: quest progress plus
 * the chosen quality setting (quality itself already persists separately via
 * src/quality.js's own key; kept here too so a save is a complete, self-contained
 * snapshot of "what session are we resuming"). No world/NPC-position state — see
 * docs/parked.md for what "Continue" does and doesn't restore.
 */
const STORAGE_KEY = 'dopahar_save';

/** Try/catch wrapped — private browsing / blocked storage must never break startup,
 * just behave as if there were no save. */
export function loadSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.questStep !== 'string') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function saveGame({ questStep, quality }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ questStep, quality, savedAt: Date.now() }));
  } catch (e) {
    // storage blocked/unavailable — session continues, just won't persist
  }
}
