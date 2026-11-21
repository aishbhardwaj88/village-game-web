#!/usr/bin/env node
/**
 * S7 (21 Nov): character "diet". Makes a slim copy of every rigged character GLB for the shipped game.
 *
 * Why: the Tripo characters in public/assets/models are 6-9 MB each (a 4096 JPEG skin + float geometry + float
 * animation). The game only ever needs a 1024 (2048 for the main family/hero cast) skin, quantized geometry and
 * compressed animation. The originals stay in git untouched (the Tripo session keeps pushing full-resolution
 * files to main); this script runs AFTER `vite build` and overwrites dist/assets/models/<name>.glb with the slim copy,
 * so the game loads the very same URL.
 *
 * What it keeps, always: the skin and every joint, every morph target (blink, smile), every animation clip,
 * every mesh (eye patches, lids, glasses), every material. Skinned geometry is never simplified.
 * What it changes: textures -> WebP, resized (1024, heroes 2048; textures already smaller keep their size),
 * duplicate animation time tracks shared, animation rotations stored as 16-bit (meshopt filter), geometry
 * quantized (KHR_mesh_quantization) and meshopt-compressed (EXT_meshopt_compression).
 * Every slim file is re-opened and checked against its original (joints, morph names, clip names + channel counts,
 * meshes, materials). If anything is missing, the ORIGINAL is shipped instead and the run prints a warning.
 *
 * Detection: any .glb whose JSON has a non-empty "skins" list. Only the JSON header is read for that, so
 * scanning the ~120 static models is instant.
 *
 * Cache: output is cached by sha256(input bytes + recipe) in node_modules/.cache/char-diet, so a second build
 * with unchanged characters takes well under a second.
 *
 * Usage:
 *   node tools/char-diet.mjs                       # public/assets/models -> dist/assets/models (post-build step)
 *   node tools/char-diet.mjs --out <dir>           # write slim copies elsewhere
 *   node tools/char-diet.mjs --only maa,dada       # just these
 *   node tools/char-diet.mjs --force               # ignore the cache
 *   node tools/char-diet.mjs --json <file>         # also write a size report
 *   node tools/char-diet.mjs --profile light       # web edition, later (same as CHAR_PROFILE=light)
 *
 * Profiles (22 Nov: one codebase, two editions; the owner builds the FULL game first, so full is the default):
 *   light (CHAR_PROFILE=light, the free web edition, later): skin 1024, heroes 2048, WebP. Budget 1.5 MB / heroes 2.5 MB.
 *   full  (default, the desktop edition):        skins untouched (original 4096 JPEG / PNG), only geometry and animation
 *                                          are meshopt-compressed (same check as light). No size budget.
 */
import { NodeIO, PropertyType, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, reorder, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Main family and the faces the camera gets close to: 2048 skin. Everybody else 1024.
// If a face looks soft at 1024 in the lineup proof, add the name here (docs/s7/characters.md).
export const HEROES = new Set(['brother', 'dada', 'dadi', 'maa', 'pitaji', 'postman', 'sarpanch', 'teacher']);
const BUDGET = { hero: 2.5 * 1024 * 1024, other: 1.5 * 1024 * 1024 };
export const PROFILES = {
  light: { textureSize: (name) => (HEROES.has(name) ? 2048 : 1024), budget: true, normalBits: 8 },
  // full: skin textures untouched (0), and smooth-skin shading kept exact: normals stored at 12 bits instead of 8
  full: { textureSize: () => 0, budget: false, normalBits: 12 },
};
// Bump when the recipe below changes, so cached slim files are rebuilt.
const RECIPE = 'char-diet-v3:webp88:q-scene:pos14:nrm8oct|12:uv12';
const WEBP_QUALITY = 88;

function args() {
  const a = process.argv.slice(2);
  const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  return {
    src: resolve(ROOT, get('--src', 'public/assets/models')),
    out: resolve(ROOT, get('--out', 'dist/assets/models')),
    only: get('--only', '') ? new Set(get('--only', '').split(',')) : null,
    force: a.includes('--force'),
    json: get('--json', null),
    quiet: a.includes('--quiet'),
    profile: get('--profile', process.env.CHAR_PROFILE || 'full'), // 22 Nov owner: full-quality game first; web 'light' later
  };
}

/** Reads only the GLB's JSON chunk (first few KB) and says whether it has a skin. */
export function isRiggedGlb(file) {
  const fd = openSync(file, 'r');
  try {
    const head = Buffer.alloc(20);
    if (readSync(fd, head, 0, 20, 0) < 20 || head.readUInt32LE(0) !== 0x46546c67) return false; // 'glTF'
    const len = head.readUInt32LE(12), type = head.readUInt32LE(16);
    if (type !== 0x4e4f534a) return false; // 'JSON'
    const json = Buffer.alloc(len);
    readSync(fd, json, 0, len, 20);
    const j = JSON.parse(json.toString('utf8'));
    return Array.isArray(j.skins) && j.skins.length > 0;
  } catch (e) {
    return false;
  } finally { closeSync(fd); }
}

/** What must survive the diet: compared before vs after. */
function fingerprint(doc) {
  const r = doc.getRoot();
  return {
    joints: r.listSkins().map((s) => s.listJoints().map((j) => j.getName()).join('|')).sort().join('#'),
    meshes: r.listMeshes().map((m) => `${m.getName()}:${m.listPrimitives().length}:${(m.getExtras()?.targetNames || []).join(',')}:${m.listPrimitives().map((p) => p.listTargets().length).join(',')}`).sort().join('#'),
    materials: r.listMaterials().map((m) => m.getName()).sort().join('|'),
    clips: r.listAnimations().map((a) => `${a.getName()}:${a.listChannels().length}`).sort().join('|'),
    nodes: r.listNodes().length,
    // triangles and USED vertices (reorder drops vertices no triangle refers to, which is lossless)
    tris: r.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()), 0), 0),
    verts: r.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices() ? new Set(p.getIndices().getArray()).size : p.getAttribute('POSITION').getCount()), 0), 0),
  };
}

async function slim(io, input, size, normalBits = 8) {
  const doc = await io.readBinary(new Uint8Array(input));
  const before = fingerprint(doc);
  await doc.transform(
    // animation: NO resample. Dropping "redundant" keys (tolerance 1e-4) moved finger tips and head tops 2-5 mm and made
    // the file no smaller (every clip then needs its own time track instead of one shared one). Measured 21 Nov.
    // share identical accessors (each clip repeats the same time track for every bone)
    dedup({ propertyTypes: [PropertyType.ACCESSOR], keepUniqueNames: true }),
    // skin: WebP, never bigger than `size`; small textures (eye patches, lid atlas) keep their own size.
    // size 0 (full profile): textures untouched.
    ...(size ? [textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: WEBP_QUALITY, effort: 90 })] : []),
    // geometry: vertex cache order + quantize. One quantization volume for the whole file so body, eyes and lids
    // keep sharing ONE skin (three.js then keeps a single skeleton per character).
    reorder({ encoder: MeshoptEncoder, target: 'size' }),
    quantize({
      quantizationVolume: 'scene',
      // 8-bit normals: the meshopt octahedral filter packs them (light). 12-bit: stored as 16-bit numbers (full).
      pattern: normalBits > 8 ? /^(POSITION|NORMAL|TEXCOORD|JOINTS|WEIGHTS|COLOR)(_\d+)?$/ : /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|COLOR)(_\d+)?$/,
      patternTargets: /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|COLOR|NORMAL|TANGENT)(_\d+)?$/,
      quantizePosition: 14, quantizeTexcoord: 12, quantizeNormal: normalBits, quantizeWeight: 8,
    }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true)
    .setEncoderOptions({ method: normalBits > 8 ? EXTMeshoptCompression.EncoderMethod.QUANTIZE : EXTMeshoptCompression.EncoderMethod.FILTER });
  const out = await io.writeBinary(doc);
  // re-open and compare
  const check = fingerprint(await io.readBinary(out));
  const problems = Object.keys(before).filter((k) => before[k] !== check[k]);
  return { out, before, problems };
}

async function main() {
  const o = args();
  const profile = PROFILES[o.profile];
  if (!profile) throw new Error(`unknown profile "${o.profile}" (light or full)`);
  await MeshoptEncoder.ready; await MeshoptDecoder.ready;
  const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.ERROR)).registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const cacheDir = join(ROOT, 'node_modules', '.cache', 'char-diet');
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(o.out, { recursive: true });

  const files = readdirSync(o.src).filter((f) => f.endsWith('.glb')).sort()
    .filter((f) => !o.only || o.only.has(basename(f, '.glb')))
    .map((f) => join(o.src, f)).filter(isRiggedGlb);
  const t0 = Date.now();
  const report = [];
  let warnings = 0;
  for (const file of files) {
    const name = basename(file, '.glb');
    const hero = HEROES.has(name);
    const size = profile.textureSize(name);
    const input = readFileSync(file);
    const hash = createHash('sha256').update(RECIPE).update(o.profile).update(String(size)).update(input).digest('hex').slice(0, 16);
    const cached = join(cacheDir, `${name}-${hash}.glb`);
    const dest = join(o.out, `${name}.glb`);
    const t1 = Date.now();
    let status = 'cached';
    if (o.force || !existsSync(cached)) {
      try {
        const { out, problems } = await slim(io, input, size, profile.normalBits);
        if (problems.length) {
          console.warn(`char-diet: WARNING ${name}: slim copy lost [${problems.join(', ')}], shipping the ORIGINAL instead`);
          warnings++; status = 'original (check failed)';
          writeFileSync(cached, input);
        } else if (out.byteLength >= input.length) {
          status = 'original (slim was not smaller)';
          writeFileSync(cached, input);
        } else {
          status = 'slimmed';
          writeFileSync(cached, out);
        }
      } catch (err) {
        console.warn(`char-diet: WARNING ${name}: ${err.message}; shipping the ORIGINAL instead`);
        warnings++; status = 'original (error)';
        copyFileSync(file, dest);
        report.push({ name, hero, texture: size, before: input.length, after: input.length, status, ms: Date.now() - t1 });
        continue;
      }
    }
    copyFileSync(cached, dest);
    const after = statSync(dest).size;
    const budget = hero ? BUDGET.hero : BUDGET.other;
    if (profile.budget && after > budget) { console.warn(`char-diet: WARNING ${name} is ${(after / 1048576).toFixed(2)} MB, over its ${(budget / 1048576).toFixed(1)} MB budget`); warnings++; }
    report.push({ name, hero, texture: size, before: input.length, after, status, ms: Date.now() - t1 });
    if (!o.quiet) console.log(`char-diet: ${name.padEnd(16)} ${(input.length / 1048576).toFixed(2).padStart(5)} MB -> ${(after / 1048576).toFixed(2).padStart(5)} MB  (${size ? `${size}px` : 'original skin'}, ${status}, ${Date.now() - t1} ms)`);
  }
  const tb = report.reduce((s, r) => s + r.before, 0), ta = report.reduce((s, r) => s + r.after, 0);
  console.log(`char-diet [${o.profile}]: ${report.length} characters, ${(tb / 1048576).toFixed(1)} MB -> ${(ta / 1048576).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)} s${warnings ? `, ${warnings} warning(s)` : ''}`);
  if (o.json) writeFileSync(resolve(ROOT, o.json), JSON.stringify({ recipe: RECIPE, profile: o.profile, report, totalBefore: tb, totalAfter: ta }, null, 2));
}

// Never break the build: dist already holds the full-size originals, so the game still works if this step fails.
main().catch((e) => { console.error('char-diet: WARNING, step failed, the full-size characters ship instead:', e); });
