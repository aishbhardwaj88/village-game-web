#!/usr/bin/env node
/**
 * Builds the game for the DESKTOP edition into <repo>/dist-desktop.
 *
 * Same code and same files as the web build, with two differences:
 *   1. VITE_DOPAHAR_BUILD=desktop is baked in (src/edition.js getBuildFlavour() reports 'original').
 *   2. The character slimming step (tools/char-diet.mjs, web only) is NOT run, so the full-resolution
 *      original character models from public/assets/models ship as they are.
 *
 * Usage (from anywhere): node desktop/scripts/build-game.mjs
 */
import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync, writeFileSync } from 'node:fs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(REPO, 'dist-desktop');

process.env.VITE_DOPAHAR_BUILD = 'desktop';
const t0 = Date.now();
await build({ root: REPO, configFile: resolve(REPO, 'vite.config.js'), logLevel: 'warn', build: { outDir: OUT, emptyOutDir: true } });

const walk = (d) => readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? walk(resolve(d, e.name)) : statSync(resolve(d, e.name)).size), 0);
const bytes = walk(OUT);
writeFileSync(resolve(OUT, 'dopahar-build.json'), JSON.stringify({ edition: 'desktop', characters: 'original', builtAt: new Date().toISOString(), bytes }, null, 2));
console.log(`desktop game build: ${OUT} (${(bytes / 1048576).toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)} s, characters: original (no char-diet)`);
