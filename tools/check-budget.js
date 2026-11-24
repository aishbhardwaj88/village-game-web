#!/usr/bin/env node
/**
 * S7 budget gate (docs/s7/SPRINT.md "Budgets"). Measures the BUILT game in dist/, so the
 * slimmed characters the build writes count, and the big originals left in public/ do not.
 *
 *   node tools/check-budget.js            WARN mode: prints every breach, always exits 0
 *   node tools/check-budget.js --strict   STRICT mode: exits 1 on any breach (deploy uses this from Tue 24 Nov)
 *   options: --dist <dir> (default dist), --json (machine-readable summary on the last line)
 *   npm run budget / npm run budget:strict
 *
 * File budgets (checked here, from dist/):
 *   - whole shipped game (dist/) <= 90 MB
 *   - each character GLB (any GLB with a skin) <= 1.5 MB; heroes (the 10 named cast) <= 2.5 MB; <= 20,000
 *     triangles each (prep for the character slot, ORDER-24NOV Part C - no character shipped yet)
 *   - any other single model <= 5 MB (docs/budgets.md)
 *   - texture files <= 1024 px, props/ <= 512 px (docs/budgets.md)
 *   - advisory only (never fails): images inside GLBs over 1024 / 512 (props) / 2048 (characters) px
 * Runtime budgets (read from the last perf ride, docs/s7/perf/latest.json, written by
 * tools/perf-ride.mjs; reported, and in STRICT mode enforced when the ride is <= 3 days old):
 *   - before Play <= 8 MB downloaded; Play ready <= 4 s; village <= 2 s after Play
 *   - <= 150 draw calls main pass (<= 250 with shadows); <= 450k triangles; <= 400 MB GPU textures
 *   - frame p95 <= 12 ms, none > 50 ms
 * The runtime numbers need a real GPU to mean anything for frame times, so CI never runs the
 * ride itself; the ride is run on a machine with a GPU and its JSON committed.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, extname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const STRICT = args.includes('--strict') || process.env.BUDGET_STRICT === '1';
const JSON_OUT = args.includes('--json');
const distArg = args.indexOf('--dist');
const DIST = join(ROOT, distArg >= 0 ? args[distArg + 1] : 'dist');
const RIDE_JSON = join(ROOT, 'docs', 's7', 'perf', 'latest.json');

const MB = 1024 * 1024;
export const BUDGET = {
  distTotalMB: 90,
  characterMB: 1.5,
  heroMB: 2.5,
  modelMB: 5,
  textureMax: 1024,
  propTextureMax: 512,
  characterTextureMax: 2048,
  characterTris: 20000,
  beforePlayMB: 8,
  playReadyMs: 4000,
  villageAfterPlayMs: 2000,
  drawCalls: 150,
  drawCallsWithShadows: 250,
  triangles: 450000,
  gpuTextureMB: 400,
  frameP95Ms: 12,
  frameMaxMs: 50,
  rideMaxAgeDays: 3,
};
// The named cast (src/main.js PLAY_FILES). Everyone else with a skin is a background villager.
export const HEROES = new Set(['parlour_didi', 'sister', 'maa', 'pitaji', 'dada', 'dadi', 'brother', 'sarpanch', 'postman', 'teacher']);

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}

const mb = (b) => (b / MB).toFixed(2) + ' MB';

/** width/height of a PNG, JPEG or WebP held in a buffer. */
export function imageSize(buf) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const m = buf[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: buf.readUInt16BE(o + 7), height: buf.readUInt16BE(o + 5) };
      o += 2 + buf.readUInt16BE(o + 2);
    }
    return null;
  }
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const f = buf.toString('ascii', 12, 16);
    if (f === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (f === 'VP8L') { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
    if (f === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  return null;
}

/** Reads a .glb: is it skinned (a character) and the sizes of its embedded images. */
export function inspectGlb(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) return { skinned: false, images: [] };
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const binStart = 20 + jsonLen + 8;
  const images = [];
  for (const img of json.images || []) {
    if (img.bufferView === undefined) continue;
    const bv = json.bufferViews[img.bufferView];
    const start = binStart + (bv.byteOffset || 0);
    const dims = imageSize(buf.subarray(start, start + Math.min(bv.byteLength, 65536)));
    if (dims) images.push({ ...dims, bytes: bv.byteLength, mime: img.mimeType });
  }
  const skinned = Array.isArray(json.skins) && json.skins.length > 0;
  // Triangle count (C1, ORDER-24NOV Part C): same count char-diet.mjs computes - indices count if
  // indexed, else POSITION accessor count. accessors[].count is a plain JSON field, no buffer read needed.
  let tris;
  if (skinned) {
    let verts = 0;
    for (const mesh of json.meshes || []) {
      for (const prim of mesh.primitives || []) {
        if (prim.mode !== undefined && prim.mode !== 4) continue; // 4 = TRIANGLES (the glTF default); skip lines/points/strips/fans
        const acc = prim.indices !== undefined ? json.accessors[prim.indices] : json.accessors[prim.attributes?.POSITION];
        if (acc) verts += acc.count;
      }
    }
    tris = Math.round(verts / 3); // one triangle per 3 indices/verts in a TRIANGLES-mode primitive
  }
  return { skinned, images, tris };
}

function checkFiles() {
  const breaches = [];
  const facts = {};
  if (!existsSync(DIST)) {
    breaches.push({ what: 'dist', msg: `no ${relative(ROOT, DIST)}/ folder: run the build first (npm run build:unchecked)` });
    return { breaches, facts };
  }
  const files = walk(DIST);
  let total = 0;
  const characters = [];
  for (const file of files) {
    const size = statSync(file).size;
    total += size;
    const ext = extname(file).toLowerCase();
    const rel = relative(DIST, file);
    const isProp = rel.split(/[\\/]/).includes('props');
    if (ext === '.glb') {
      let info;
      try { info = inspectGlb(file); } catch (e) { breaches.push({ what: 'model', msg: `${rel}: cannot read (${e.message})` }); continue; }
      const name = basename(file, '.glb');
      if (info.skinned) {
        const hero = HEROES.has(name);
        const limit = (hero ? BUDGET.heroMB : BUDGET.characterMB) * MB;
        const trisOk = !Number.isFinite(info.tris) || info.tris <= BUDGET.characterTris;
        characters.push({ name, mb: +(size / MB).toFixed(2), tris: info.tris, hero, ok: size <= limit && trisOk });
        if (size > limit) breaches.push({ what: 'character', msg: `character ${name}${hero ? ' (hero)' : ''} is ${mb(size)}, limit ${hero ? BUDGET.heroMB : BUDGET.characterMB} MB` });
        if (!trisOk) breaches.push({ what: 'character', msg: `character ${name}${hero ? ' (hero)' : ''} is ${info.tris} triangles, limit ${BUDGET.characterTris}` });
      } else if (size > BUDGET.modelMB * MB) {
        breaches.push({ what: 'model', msg: `model ${rel} is ${mb(size)}, limit ${BUDGET.modelMB} MB` });
      }
      const maxDim = info.skinned ? BUDGET.characterTextureMax : (isProp ? BUDGET.propTextureMax : BUDGET.textureMax);
      const big = info.images.filter((i) => i.width > maxDim || i.height > maxDim);
      // Advisory only: images inside GLBs are not a sprint budget line (the GLB size budget covers them).
      if (big.length) breaches.push({ what: 'texture', advisory: true, msg: `${rel} has ${big.length} texture(s) over ${maxDim} px (largest ${Math.max(...big.map((i) => i.width))}x${Math.max(...big.map((i) => i.height))})` });
    } else if (IMAGE_EXTS.has(ext)) {
      const dims = imageSize(readFileSync(file));
      const maxDim = isProp ? BUDGET.propTextureMax : BUDGET.textureMax;
      if (dims && (dims.width > maxDim || dims.height > maxDim)) breaches.push({ what: 'texture', msg: `${rel} is ${dims.width}x${dims.height}, limit ${maxDim} px` });
    }
  }
  facts.distMB = +(total / MB).toFixed(1);
  facts.characters = characters;
  if (total > BUDGET.distTotalMB * MB) breaches.push({ what: 'total', msg: `whole game is ${mb(total)}, limit ${BUDGET.distTotalMB} MB` });
  return { breaches, facts };
}

function checkRide() {
  const breaches = [];
  if (!existsSync(RIDE_JSON)) return { breaches, note: 'no perf ride yet (node tools/perf-ride.mjs writes docs/s7/perf/latest.json)', stale: true };
  const ride = JSON.parse(readFileSync(RIDE_JSON, 'utf8'));
  const ageDays = (Date.now() - Date.parse(ride.date)) / 86400000;
  const stale = !(ageDays <= BUDGET.rideMaxAgeDays);
  const note = `perf ride of ${ride.date} on ${ride.machine || 'unknown machine'} (${ride.gpu || 'gpu unknown'})${stale ? ', older than 3 days: reported only' : ''}`;
  for (const run of ride.runs || []) {
    const tag = `[${run.layout}]`;
    const r = run.summary || {};
    const over = (val, lim, msg) => { if (Number.isFinite(val) && val > lim) breaches.push({ what: 'runtime', msg: `${tag} ${msg}` }); };
    over(r.beforePlayMB, BUDGET.beforePlayMB, `downloaded before Play ${r.beforePlayMB} MB, limit ${BUDGET.beforePlayMB} MB`);
    over(r.playReadyMs, BUDGET.playReadyMs, `Play ready at ${(r.playReadyMs / 1000).toFixed(1)} s, limit 4 s`);
    over(r.villageAfterPlayMs, BUDGET.villageAfterPlayMs, `village ready ${(r.villageAfterPlayMs / 1000).toFixed(1)} s after Play, limit 2 s`);
    over(r.drawCallsMax, BUDGET.drawCallsWithShadows, `draw calls (main + shadows) peak ${r.drawCallsMax}, limit ${BUDGET.drawCallsWithShadows}`);
    over(r.mainPassCallsMax, BUDGET.drawCalls, `draw calls (main pass) peak ${r.mainPassCallsMax}, limit ${BUDGET.drawCalls}`);
    over(r.trianglesMax, BUDGET.triangles, `triangles peak ${r.trianglesMax}, limit ${BUDGET.triangles}`);
    over(r.gpuTextureMB, BUDGET.gpuTextureMB, `GPU texture memory ${r.gpuTextureMB} MB, limit ${BUDGET.gpuTextureMB} MB`);
    if (!ride.softwareGL) {
      over(r.frameP95, BUDGET.frameP95Ms, `frame p95 ${r.frameP95} ms, limit ${BUDGET.frameP95Ms} ms`);
      over(r.frameMax, BUDGET.frameMaxMs, `worst frame ${r.frameMax} ms, limit ${BUDGET.frameMaxMs} ms`);
    }
  }
  return { breaches, note, stale };
}

function main() {
  const files = checkFiles();
  const ride = checkRide();
  const enforcedRide = STRICT && !ride.stale ? ride.breaches : [];
  const failing = [...files.breaches, ...enforcedRide].filter((b) => !b.advisory);

  console.log(`Budget check (${STRICT ? 'STRICT: breaches fail the build' : 'WARN: breaches are reported, build continues'})`);
  if (files.facts.distMB !== undefined) console.log(`  shipped game: ${files.facts.distMB} MB (limit ${BUDGET.distTotalMB} MB)`);
  if (files.facts.characters?.length) {
    const c = files.facts.characters;
    console.log(`  characters: ${c.length}, ${c.filter((x) => x.ok).length} within budget; sizes ${c.map((x) => `${x.name} ${x.mb}MB/${x.tris}tris`).join(', ')}`);
  }
  console.log(`  runtime: ${ride.note}`);
  const all = [...files.breaches, ...ride.breaches];
  const hard = all.filter((b) => !b.advisory);
  const advice = all.filter((b) => b.advisory);
  if (hard.length) {
    console.log(`\n  ${hard.length} budget breach(es):`);
    for (const b of hard) console.log(`   - ${b.msg}`);
  } else console.log('  all budgets met');
  if (advice.length) {
    console.log(`\n  ${advice.length} advisory note(s) (never fail the build):`);
    const shown = args.includes('--all') ? advice : advice.slice(0, 4);
    for (const b of shown) console.log(`   - ${b.msg}`);
    if (shown.length < advice.length) console.log(`   ... ${advice.length - shown.length} more (npm run budget -- --all)`);
  }
  if (JSON_OUT) console.log(JSON.stringify({ strict: STRICT, facts: files.facts, breaches: all.map((b) => b.msg), failing: failing.length }));
  if (STRICT && failing.length) {
    console.error(`\nBUDGET GATE FAILED (${failing.length}). Fix the asset, do not raise the limit.`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
