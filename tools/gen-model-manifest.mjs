#!/usr/bin/env node
// Writes public/assets/models/manifest.json: a flat sorted list of every <name>.glb that
// actually exists in public/assets/models/ right now (no extension, just the slot name).
//
// Why: src/assetSlots.js's urlExists() used to send a live HEAD request for every
// registered slot (80+ named slots, plus one per zone-streamed place via
// src/siteSlots.js's wireSiteSlot()) just to find out whether a model file exists, every
// single page load. Most slots have no file yet, so most of those HEAD requests 404 (the
// 24 Nov efficiency audit's B3 finding: 33 failed requests for 11 slot models that don't
// exist, each slot checked more than once). This manifest turns all of that into one JSON
// fetch, checked in-memory from then on — zero requests for a slot that isn't in the list.
//
// Wired into `npm run build`/`build:unchecked` (package.json) so a production build never
// drifts from the real files on disk, and into `vite.config.js`'s own dev-server plugin (see
// genModelManifestPlugin below) so dropping a new slot .glb in during dev — docs/asset-slots.md's
// whole "drop the file, reload" workflow — regenerates it automatically, no manual step.
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const MODELS_DIR = join(ROOT, 'public/assets/models');
export const MANIFEST_PATH = join(MODELS_DIR, 'manifest.json');

/** Rewrites manifest.json if the on-disk .glb list changed. Returns the model count. */
export function genModelManifest({ log = () => {} } = {}) {
  const names = readdirSync(MODELS_DIR)
    .filter((f) => f.endsWith('.glb'))
    .map((f) => f.slice(0, -4))
    .sort();
  const next = JSON.stringify(names);
  const prev = existsSync(MANIFEST_PATH) ? readFileSync(MANIFEST_PATH, 'utf8') : null;
  if (prev === next) {
    log(`manifest.json unchanged (${names.length} models)`);
  } else {
    writeFileSync(MANIFEST_PATH, next);
    log(`wrote manifest.json: ${names.length} models`);
  }
  return names.length;
}

// Only run as the CLI entry point — not when vite.config.js imports genModelManifest().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  genModelManifest({ log: console.log });
}
