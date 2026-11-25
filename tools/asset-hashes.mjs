#!/usr/bin/env node
/**
 * Content hashes for every raw file in public/assets and public/fonts (25 Nov caching plan, task A).
 * sha1, first 8 hex chars, keyed by the path under public/ ("assets/textures/brick/brick_color.webp").
 * Used by vite.config.js (define __ASSET_H__ + ?v= on the index.html preloads) and by src/assetUrl.js ver().
 * Two builds with one texture changed give exactly one changed ?v=, and a deploy that changes nothing voids no cache.
 *
 * Characters (any .glb with a skin) are rewritten by tools/char-diet.mjs AFTER the build, so their hash also
 * covers the diet recipe version and profile: change the recipe and the characters get a new URL.
 *
 *   node tools/asset-hashes.mjs          # prints the map as JSON
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const SKIP_DIRS = new Set(['textures_candidates']); // never loaded by the game
const SKIP_FILES = new Set(['manifest.json']); // regenerated, fetched without ?v=

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, out); } else if (!SKIP_FILES.has(name)) out.push(p);
  }
  return out;
}

/** The char-diet recipe + profile, read from source so this file never drifts from it. */
function dietSalt() {
  let recipe = 'char-diet-unknown';
  try { recipe = /const RECIPE = '([^']+)'/.exec(readFileSync(join(ROOT, 'tools/char-diet.mjs'), 'utf8'))[1]; } catch { /* keep default */ }
  let profile = process.env.CHAR_PROFILE || '';
  if (!profile) { try { profile = /WEB_QUALITY\s*=\s*'(\w+)'/.exec(readFileSync(join(ROOT, 'src/edition.js'), 'utf8'))[1]; } catch { profile = 'full'; } }
  return `${recipe}|${profile}`;
}

function hasSkin(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return false;
  const jsonLen = buf.readUInt32LE(12);
  try { const j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')); return Array.isArray(j.skins) && j.skins.length > 0; } catch { return false; }
}

export function computeAssetHashes() {
  const salt = dietSalt();
  const map = {};
  const files = [];
  for (const top of ['assets', 'fonts']) { try { walk(join(PUBLIC, top), files); } catch { /* folder missing */ } }
  files.sort();
  for (const f of files) {
    const buf = readFileSync(f);
    const h = createHash('sha1').update(buf);
    if (f.endsWith('.glb') && hasSkin(buf)) h.update(salt);
    map[relative(PUBLIC, f).split(sep).join('/')] = h.digest('hex').slice(0, 8);
  }
  return map;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = computeAssetHashes();
  process.stdout.write(JSON.stringify(m, null, 1) + '\n');
  console.error(`${Object.keys(m).length} files hashed`);
}
