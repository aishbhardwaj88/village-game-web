#!/usr/bin/env node
/**
 * Prop diet: the measured best pipeline for prop / vehicle GLBs (see the report of 24 Nov).
 * Reads <src>/<dir>/*.glb, writes <out>/<dir>/*.glb, never touches the source. Idempotent: same input gives the same
 * output, and feeding its own output back in changes nothing (textures already KTX2 are kept, meshes already under
 * budget are kept).
 *
 * Steps per file: bake skins to static -> flatten + join (one mesh per material) -> drop unused vertex data ->
 * simplify to a size-class triangle budget under a millimetre error limit -> size-class texture caps ->
 * KTX2 (UASTC for normal / roughness maps, ETC1S or UASTC for colour) -> quantize + meshopt.
 *
 * Usage: node tools/prop-diet.mjs [--src=public/assets] [--out=/tmp/propdiet/out]
 *   [--dirs=props_ph,props_free,vehicles_free] [--only=a,b] [--geom=class|off] [--err-mm=2] [--max-mm=3] [--lock-borders]
 *   [--force-budget] [--vehicle-geom] [--tex=webp|ktx2|keep] [--color=uastc|etc1s|auto] [--normal=..] [--orm=..] [--no-tex-class]
 *   [--drop-tangents] [--attr-w=1] [--uv-w=4] [--level=high|medium] [--pack] [--quiet]
 * Default textures are WebP (smallest download). --tex=ktx2 cuts graphics memory about 4x but triples the download.
 * KTX2 needs the `ktx` binary of KTX-Software 4.3+: on PATH, or KTX_BIN=/path/to/ktx. Without it --tex falls back to webp.
 */
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { dedup, flatten, join, prune, weld, simplify, dequantize, meshopt, getBounds, listTextureSlots, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

const arg = (k, d) => { const a = process.argv.find((x) => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.split('=').slice(1).join('=') : true) : d; };
const SRC = arg('src', 'public/assets'), OUT = arg('out', '/tmp/propdiet/out');
const DIRS = String(arg('dirs', 'props_ph,props_free,vehicles_free')).split(',');
const ONLY = arg('only', null) ? new Set(String(arg('only')).split(',')) : null;
const MAX_MM = +arg('max-mm', 3), ATTR_W = +arg('attr-w', 1), UV_W = +arg('uv-w', 4);
const GEOM = arg('geom', 'class'), ERR_MM = +arg('err-mm', 2), LOCK = !!arg('lock-borders', false), FORCE = !!arg('force-budget', false);
const VEH_GEOM = !!arg('vehicle-geom', false), COLOR = arg('color', 'uastc'), TEX_CLASS = !arg('no-tex-class', false);
const KEEP_TAN = !arg('drop-tangents', false), LEVEL = arg('level', 'high'), PACK = !!arg('pack', false), QUIET = !!arg('quiet', false);
let TEX = arg('tex', 'webp');
const TEXONLY = !!arg('tex-only', false); // textures only: no flatten/join/simplify, geometry and node tree untouched (vehicles)
const GATE = { color: +arg('gate-color', 40), normal: +arg('gate-normal', 40), orm: +arg('gate-orm', 38) };
const QL = arg('qlevel', '255'), ORM = arg('orm', 'uastc'), RDO = +arg('rdo', 1), NRM = arg('normal', 'uastc');
const CACHE = path.join(os.tmpdir(), 'propdiet-cache');

// ---- size classes (real size in the game, metres, longest side) ----
// triangles: the top of each band asked for; textures: about 2 texels per screen pixel at 2 m on a 1080p screen
export const triBudget = (m) => (m < 0.3 ? 300 : m < 0.6 ? 800 : m < 1.5 ? 2000 : 4000);
export const texCap = (m) => (m < 0.15 ? 128 : m < 0.4 ? 256 : 512);
export const sizeClass = (m) => (m < 0.3 ? 'tiny' : m < 0.6 ? 'small' : m < 1.5 ? 'mid' : 'large');

// ---- game sizes, read from the same tables the game places props with ----
function readSizes() {
  const s = {};
  const rd = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
  const src = rd('src/freeProps.js') + rd('src/pilotVehicles.js');
  for (const m of src.matchAll(/file: '(\w+)', dim: '(\w)', size: ([\d.]+)/g)) s[m[1]] = { dim: m[2], size: +m[3] };
  for (const m of src.matchAll(/\bo\('(\w+)', ([\d.]+)/g)) s[m[1]] = { dim: 'h', size: +m[2] };
  for (const m of src.matchAll(/file: '(\w+)', x: [\d.]+, z: [\d.]+, yaw: [\d.]+, length: ([\d.]+)/g)) s[m[1]] = { dim: 'l', size: +m[2] };
  return s;
}
const SIZES = readSizes();
// props whose simplified mesh passed the millimetre check but still showed in a 3 m render (texture slid): geometry left alone
const KEEP = (() => { try { return JSON.parse(fs.readFileSync(new URL('./prop-diet-keep.json', import.meta.url), 'utf8')); } catch { return {}; } })();
/** metres per model unit, the same maths as src/freeProps.js */
export function gameScale(name, dir, dim) {
  const v = SIZES[name];
  if (v) return v.size / (v.dim === 'h' ? dim[1] : Math.max(dim[0], dim[2]));
  return dir === 'props_ph' ? 1 : null; // Poly Haven models are real metres; unknown others: size unknown
}

function findKtx() {
  for (const c of [process.env.KTX_BIN, 'ktx', 'tmp/ktx/bin/ktx', '/tmp/propdiet/ktx/bin/ktx']) {
    if (!c) continue;
    try { execFileSync(c, ['--version'], { stdio: 'pipe', env: ktxEnv(c) }); return c; } catch { /* next */ }
  }
  return null;
}
function ktxEnv(bin) { const lib = path.resolve(path.dirname(bin), '../lib'); return { ...process.env, LD_LIBRARY_PATH: `${lib}:${process.env.LD_LIBRARY_PATH || ''}` }; }

// ---- step: bake skins (Poly Haven rigs for lids / drawers; the game never animates them) ----
function mul(m, v, w) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w, m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w, m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w]; }
function matMul(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
function bakeSkins(doc) {
  let n = 0;
  const root = doc.getRoot();
  for (const node of root.listNodes()) {
    const skin = node.getSkin(), mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const joints = skin.listJoints(), ibm = skin.getInverseBindMatrices();
    const jm = joints.map((j, i) => matMul(j.getWorldMatrix(), ibm ? ibm.getElement(i, []) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    const nm = mesh.clone(); node.setMesh(nm);
    for (const prim of nm.listPrimitives()) {
      const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
      if (!J || !W) continue;
      for (const sem of ['POSITION', 'NORMAL']) {
        const a = prim.getAttribute(sem); if (!a) continue;
        const b = a.clone(); const e = [], je = [], we = [];
        for (let i = 0; i < b.getCount(); i++) {
          b.getElement(i, e); J.getElement(i, je); W.getElement(i, we);
          const ws = we[0] + we[1] + we[2] + we[3] || 1; const o = [0, 0, 0];
          for (let k = 0; k < 4; k++) { if (!we[k]) continue; const t = mul(jm[je[k]], e, sem === 'POSITION' ? 1 : 0); for (let c = 0; c < 3; c++) o[c] += t[c] * we[k] / ws; }
          if (sem === 'NORMAL') { const l = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= l; o[1] /= l; o[2] /= l; }
          b.setElement(i, o);
        }
        prim.setAttribute(sem, b);
      }
      prim.setAttribute('JOINTS_0', null); prim.setAttribute('WEIGHTS_0', null);
    }
    node.setSkin(null).setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    for (const sc of root.listScenes()) { const p = node.getParentNode(); if (p) p.removeChild(node); sc.addChild(node); }
    n++;
  }
  for (const s of root.listSkins()) if (!s.listParents().some((p) => p.propertyType === 'Node')) s.dispose();
  return n;
}

// ---- step: drop vertex data the shader never needs ----
function dropAttributes(doc) {
  const dropped = {};
  const hit = (k) => { dropped[k] = (dropped[k] || 0) + 1; };
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    for (const sem of prim.listSemantics()) {
      const a = prim.getAttribute(sem);
      if (sem === 'TANGENT' && !KEEP_TAN) { prim.setAttribute(sem, null); hit(sem); } // three rebuilds the tangent frame per pixel
      else if (/^(JOINTS|WEIGHTS)_/.test(sem)) { prim.setAttribute(sem, null); hit(sem); }
      else if (sem.startsWith('COLOR_')) { // keep only if it really tints
        let flat = true; const e = [];
        for (let i = 0; i < a.getCount() && flat; i++) { a.getElement(i, e); if (e.some((v) => v < 0.995)) flat = false; }
        if (flat || sem !== 'COLOR_0') { prim.setAttribute(sem, null); hit(sem); }
      } else if (/^TEXCOORD_[1-9]/.test(sem)) {
        const idx = +sem.split('_')[1];
        const used = mat && mat.listTextureInfo ? false : false; // gltf-transform keeps texCoord on TextureInfo
        let need = false;
        if (mat) for (const ti of [mat.getBaseColorTextureInfo(), mat.getNormalTextureInfo(), mat.getOcclusionTextureInfo(), mat.getMetallicRoughnessTextureInfo(), mat.getEmissiveTextureInfo()]) if (ti && ti.getTexCoord() === idx) need = true;
        if (!need && !used) { prim.setAttribute(sem, null); hit(sem); }
      }
    }
  }
  return dropped;
}

const triCount = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; return t; };
const vertCount = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += p.getAttribute('POSITION').getCount(); return t; };
const primCount = (doc) => doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0);

/** bytes on the graphics card: uncompressed = 4 bytes a pixel; UASTC lands as BC7 / ASTC 4x4 = 1 byte; ETC1S as BC1 / ETC2 = 0.5 (1 with alpha); plus a third for mips */
export function gpuBytes(doc) {
  let b = 0;
  for (const t of doc.getRoot().listTextures()) {
    const s = t.getSize() || [0, 0]; let bpp = 4;
    if (t.getMimeType() === 'image/ktx2') { const img = t.getImage(); const model = img[12 + 4 * 11 + 4 * 0] !== undefined ? ktxInfo(img) : { uastc: true, alpha: false }; bpp = model.uastc ? 1 : model.alpha ? 1 : 0.5; }
    b += s[0] * s[1] * bpp * 4 / 3;
  }
  return b;
}
function ktxInfo(u8) { // KTX2 header: dfd offset at byte 48; colour model at dfd+4+12 (166 = UASTC, 163 = ETC1S)
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); const dfd = dv.getUint32(48, true);
  const model = dv.getUint8(dfd + 4 + 8); const nSamples = (dv.getUint16(dfd + 4 + 6, true) - 24) / 16;
  let alpha = false; for (let i = 0; i < nSamples; i++) { const ch = dv.getUint8(dfd + 4 + 24 + i * 16 + 3) & 0xf; if (model === 166 ? ch === 3 : ch === 15) alpha = true; }
  return { uastc: model === 166, alpha };
}

// ---- step: textures ----
async function dietTextures(doc, cap, ktx, stats) {
  const root = doc.getRoot();
  for (const tex of root.listTextures()) {
    const img = tex.getImage(); if (!img) continue;
    const mime = tex.getMimeType();
    if (mime === 'image/ktx2') continue; // already done: idempotent
    const slots = listTextureSlots(tex);
    const isColor = slots.some((s) => /baseColor|emissive|sheenColor|specularColor|diffuse/i.test(s));
    const needAlpha = slots.some((s) => /baseColor/i.test(s)) && tex.listParents().some((p) => p.propertyType === 'Material' && p.getAlphaMode() !== 'OPAQUE');
    const [w, h] = tex.getSize() || [0, 0]; if (!w) continue;
    const k = Math.min(1, cap / Math.max(w, h));
    const nw = Math.max(4, Math.round(w * k / 4) * 4), nh = Math.max(4, Math.round(h * k / 4) * 4);
    const isNormal = slots.some((x) => /normal/i.test(x));
    const mode = TEX !== 'ktx2' || !ktx ? 'webp' : ((isColor ? COLOR : isNormal ? NRM : ORM) === 'uastc' ? 'uastc' : 'etc1s');
    if (mode === 'webp' && k === 1 && mime === 'image/webp') continue; // nothing to gain from re-encoding
    if (TEX === 'keep' && k === 1) continue;
    const kind = isColor ? 'color' : isNormal ? 'normal' : 'orm';
    const want = isColor ? COLOR : isNormal ? NRM : ORM; // 'uastc' | 'etc1s' | 'auto'
    const key = crypto.createHash('sha1').update(img).update(`${nw}x${nh}:${mode}:${want}:${isColor}:${needAlpha}:${RDO}:${QL}:${GATE[kind]}:v4`).digest('hex');
    const cf = path.join(CACHE, key);
    let out, used = mode;
    if (fs.existsSync(cf)) { out = fs.readFileSync(cf); used = fs.readFileSync(`${cf}.mode`, 'utf8'); }
    else {
      let s = sharp(img).resize(nw, nh, { fit: 'fill', kernel: 'lanczos3' });
      s = needAlpha ? s.ensureAlpha() : s.removeAlpha();
      if (mode === 'webp') out = await s.webp({ quality: 80, alphaQuality: 90, effort: 6 }).toBuffer();
      else {
        const png = `${cf}.png`, k2 = `${cf}.ktx2`;
        await s.toColourspace('srgb').png({ compressionLevel: 1 }).toFile(png);
        const fmt = `R8G8B8${needAlpha ? 'A8' : ''}_${isColor ? 'SRGB' : 'UNORM'}`;
        const encode = (m) => {
          const enc = m === 'etc1s' ? ['--encode', 'basis-lz', '--clevel', '4', '--qlevel', String(QL)]
            : ['--encode', 'uastc', '--uastc-quality', '3', '--uastc-rdo', '--uastc-rdo-l', String((isColor ? 1.5 : 1.0) * RDO), '--zstd', '20'];
          execFileSync(ktx, ['create', '--format', fmt, '--assign-tf', isColor ? 'srgb' : 'linear', '--generate-mipmap', ...enc, png, k2], { stdio: 'pipe', env: ktxEnv(ktx) });
          return fs.readFileSync(k2);
        };
        if (want === 'auto') {
          // quality gate: take the small ETC1S encode only if it decodes close enough to the source, else UASTC
          out = encode('etc1s'); used = 'etc1s';
          const back = `${cf}.back.png`;
          execFileSync(ktx, ['extract', '--transcode', 'rgba8', '--level', '0', k2, back], { stdio: 'pipe', env: ktxEnv(ktx) });
          const a = await sharp(png).removeAlpha().raw().toBuffer(), b = await sharp(back).removeAlpha().raw().toBuffer();
          let se = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; se += d * d; }
          const psnr = se ? 10 * Math.log10(255 * 255 / (se / a.length)) : 99;
          fs.unlinkSync(back);
          if (psnr < GATE[kind]) { out = encode('uastc'); used = 'uastc'; }
          used += `:${psnr.toFixed(1)}`;
        } else out = encode(mode);
        fs.unlinkSync(png); fs.unlinkSync(k2);
      }
      fs.writeFileSync(cf, out); fs.writeFileSync(`${cf}.mode`, used);
    }
    (stats.texModes = stats.texModes || []).push(`${kind}:${nw}:${used}:${(out.length / 1024).toFixed(0)}k`);
    tex.setImage(new Uint8Array(out)).setMimeType(mode === 'webp' ? 'image/webp' : 'image/ktx2');
    stats.tex = (stats.tex || 0) + 1;
  }
  if (root.listTextures().some((t) => t.getMimeType() === 'image/ktx2')) doc.createExtension(KHRTextureBasisu).setRequired(true);
  for (const e of root.listExtensionsUsed()) if (e.extensionName === 'EXT_texture_webp' && !root.listTextures().some((t) => t.getMimeType() === 'image/webp')) e.dispose();
}

export async function dietDocument(doc, name, dir, ktx) {
  const st = { name, dir };
  st.tris0 = triCount(doc); st.prims0 = primCount(doc); st.gpu0 = gpuBytes(doc); st.verts0 = vertCount(doc);
  if (TEXONLY) {
    const b0 = getBounds(doc.getRoot().listScenes()[0]); const d0 = b0.max.map((v, i) => v - b0.min[i]); const k0 = gameScale(name, dir, d0);
    st.sizeM = k0 ? Math.max(...d0) * k0 : null; st.cls = st.sizeM ? sizeClass(st.sizeM) : 'unknown';
    await dietTextures(doc, TEX_CLASS && st.sizeM ? texCap(st.sizeM) : 512, ktx, st);
    // geometry accessors are left exactly as they are (no dequantize / re-quantize: tiled UVs would shift); the writer re-packs them
    st.tris1 = st.tris0; st.prims1 = st.prims0; st.gpu1 = gpuBytes(doc); st.verts1 = st.verts0;
    return st;
  }
  st.skins = bakeSkins(doc);
  await doc.transform(unpartition(), flatten(), prune({ keepLeaves: false }));
  st.dropped = dropAttributes(doc);
  await doc.transform(dedup(), join({ keepNamed: false }), prune());
  const b = getBounds(doc.getRoot().listScenes()[0]); const dim = b.max.map((v, i) => v - b.min[i]);
  const k = gameScale(name, dir, dim);
  st.sizeM = k ? Math.max(...dim) * k : null; st.cls = st.sizeM ? sizeClass(st.sizeM) : 'unknown';
  // simplify: stop at the budget or at the error limit, whichever comes first
  const geomOn = GEOM === 'class' && st.sizeM && (dir !== 'vehicles_free' || VEH_GEOM) && !(KEEP.geometry || []).includes(name) && !doc.getRoot().getExtras().propDiet;
  st.budget = st.sizeM ? triBudget(st.sizeM) : null;
  if (geomOn && st.tris0 > st.budget * 1.05) {
    await doc.transform(weld());
    const ratio = st.budget / triCount(doc);
    for (const mesh of doc.getRoot().listMeshes()) {
      const ws = (mesh.listParents().find((p) => p.propertyType === 'Node')?.getWorldScale()[0] ?? 1) * k; // metres per mesh unit
      for (const prim of mesh.listPrimitives()) {
        const mat = prim.getMaterial(); const cut = mat && mat.getAlphaMode() !== 'OPAQUE';
        const pos = prim.getAttribute('POSITION'); const mn = pos.getMin([]), mx = pos.getMax([]);
        const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * ws || 1;
        const orig = { idx: prim.getIndices(), attrs: Object.fromEntries(prim.listSemantics().map((sm) => [sm, prim.getAttribute(sm)])) };
        // the simplifier's own error misses thin parts shrinking along their length (rods, stems, handles), so measure
        // the real surface distance after each try and tighten until it is under the limit; give up = keep the original
        let ok = FORCE; let e = ERR_MM;
        for (let tries = 0; tries < (FORCE ? 1 : 4); tries++, e /= 2) {
          if (!simplifyPrim(prim, ratio, FORCE ? 1 : Math.min(1, (e / 1000) / ext), LOCK || cut)) { ok = true; break; }
          if (FORCE) break;
          const dmm = surfaceDistance(orig, prim) * ws * 1000;
          if (dmm <= MAX_MM) { ok = true; st.devMm = Math.max(st.devMm || 0, dmm); break; }
          prim.setIndices(orig.idx); for (const sm of prim.listSemantics()) prim.setAttribute(sm, orig.attrs[sm]);
        }
        if (!ok) { prim.setIndices(orig.idx); for (const sm of prim.listSemantics()) prim.setAttribute(sm, orig.attrs[sm]); st.kept = (st.kept || 0) + 1; }
      }
    }
    await doc.transform(prune());
  }
  if (TEX !== 'keep' || TEX_CLASS) await dietTextures(doc, TEX_CLASS && st.sizeM ? texCap(st.sizeM) : 512, ktx, st);
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: LEVEL }));
  doc.getRoot().setExtras({ ...doc.getRoot().getExtras(), propDiet: 1 }); // marks the file as done: a second pass never simplifies again
  st.tris1 = triCount(doc); st.prims1 = primCount(doc); st.gpu1 = gpuBytes(doc); st.verts1 = vertCount(doc);
  return st;
}

/** meshopt simplify on one welded primitive, all vertex data carried along, unused vertices dropped */
function simplifyPrim(prim, ratio, error, lockBorder) {
  const idxA = prim.getIndices(); const pos = prim.getAttribute('POSITION');
  if (!idxA || prim.getMode() !== 4) return false;
  const indices = new Uint32Array(idxA.getArray()); const positions = new Float32Array(pos.getArray());
  const target = Math.max(12, Math.floor(indices.length * ratio / 3) * 3);
  if (target >= indices.length) return false;
  // attribute-aware: normals and UVs take part in the error, so shading and texture placement survive, not only the outline
  const nor = prim.getAttribute('NORMAL'), uv = prim.getAttribute('TEXCOORD_0'); const nv = pos.getCount();
  let dst;
  if (ATTR_W > 0 && nor && uv) {
    const at = new Float32Array(nv * 5); const na = nor.getArray(), ua = uv.getArray();
    for (let i = 0; i < nv; i++) { at[i * 5] = na[i * 3]; at[i * 5 + 1] = na[i * 3 + 1]; at[i * 5 + 2] = na[i * 3 + 2]; at[i * 5 + 3] = ua[i * 2]; at[i * 5 + 4] = ua[i * 2 + 1]; }
    [dst] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, at, 5, [ATTR_W, ATTR_W, ATTR_W, UV_W, UV_W], null, target, error, lockBorder ? ['LockBorder'] : []);
  } else [dst] = MeshoptSimplifier.simplify(indices, positions, 3, target, error, lockBorder ? ['LockBorder'] : []);
  if (dst.length >= indices.length) return false;
  const remap = new Int32Array(pos.getCount()).fill(-1); let n = 0;
  for (let i = 0; i < dst.length; i++) { if (remap[dst[i]] < 0) remap[dst[i]] = n++; dst[i] = remap[dst[i]]; }
  for (const sem of prim.listSemantics()) {
    const a = prim.getAttribute(sem); const sz = a.getElementSize(); const srcArr = a.getArray(); const out = new srcArr.constructor(n * sz);
    for (let i = 0; i < remap.length; i++) if (remap[i] >= 0) for (let c = 0; c < sz; c++) out[remap[i] * sz + c] = srcArr[i * sz + c];
    prim.setAttribute(sem, a.clone().setArray(out));
  }
  prim.setIndices(idxA.clone().setArray(n > 65535 ? dst : new Uint16Array(dst)));
  return true;
}

/** two-sided surface distance in mesh units: every vertex and triangle centre of each mesh against the other's triangles */
function surfaceDistance(orig, prim) {
  const A = { p: orig.attrs.POSITION.getArray(), i: orig.idx.getArray() }, B = { p: prim.getAttribute('POSITION').getArray(), i: prim.getIndices().getArray() };
  return Math.max(oneSided(A, B), oneSided(B, A));
}
function oneSided(S, T) {
  const tp = T.p, ti = T.i, nt = ti.length / 3;
  let mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
  for (let i = 0; i < ti.length; i++) for (let c = 0; c < 3; c++) { const v = tp[ti[i] * 3 + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
  const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1; const N = Math.max(4, Math.min(48, Math.round(Math.cbrt(nt) * 1.5))); const cs = ext / N;
  const cell = (v, c) => Math.max(0, Math.min(N - 1, Math.floor((v - mn[c]) / cs)));
  const grid = new Map();
  for (let t = 0; t < nt; t++) {
    const lo = [1e30, 1e30, 1e30], hi = [-1e30, -1e30, -1e30];
    for (let j = 0; j < 3; j++) for (let c = 0; c < 3; c++) { const v = tp[ti[t * 3 + j] * 3 + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
    for (let x = cell(lo[0], 0); x <= cell(hi[0], 0); x++) for (let y = cell(lo[1], 1); y <= cell(hi[1], 1); y++) for (let z = cell(lo[2], 2); z <= cell(hi[2], 2); z++) { const key = (x * N + y) * N + z; let l = grid.get(key); if (!l) grid.set(key, l = []); l.push(t); }
  }
  const d2tri = (px, py, pz, t) => { // closest point on triangle (Ericson)
    const a = ti[t * 3] * 3, b = ti[t * 3 + 1] * 3, c = ti[t * 3 + 2] * 3;
    const ax = tp[a], ay = tp[a + 1], az = tp[a + 2], abx = tp[b] - ax, aby = tp[b + 1] - ay, abz = tp[b + 2] - az, acx = tp[c] - ax, acy = tp[c + 1] - ay, acz = tp[c + 2] - az;
    const apx = px - ax, apy = py - ay, apz = pz - az; const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    let u, v;
    if (d1 <= 0 && d2 <= 0) { u = 0; v = 0; } else {
      const bpx = apx - abx, bpy = apy - aby, bpz = apz - abz; const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
      if (d3 >= 0 && d4 <= d3) { u = 1; v = 0; } else {
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) { u = d1 / (d1 - d3); v = 0; } else {
          const cpx = apx - acx, cpy = apy - acy, cpz = apz - acz; const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
          if (d6 >= 0 && d5 <= d6) { u = 0; v = 1; } else {
            const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) { u = 0; v = d2 / (d2 - d6); } else {
              const va = d3 * d6 - d5 * d4;
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { v = (d4 - d3) / ((d4 - d3) + (d5 - d6)); u = 1 - v; } else { const den = 1 / (va + vb + vc); u = vb * den; v = vc * den; }
            }
          }
        }
      }
    }
    const qx = apx - (abx * u + acx * v), qy = apy - (aby * u + acy * v), qz = apz - (abz * u + acz * v); return qx * qx + qy * qy + qz * qz;
  };
  const nearest = (px, py, pz) => {
    const cx = cell(px, 0), cy = cell(py, 1), cz = cell(pz, 2); let best = Infinity;
    for (let r = 0; r <= N; r++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(N - 1, cx + r); x++) for (let y = Math.max(0, cy - r); y <= Math.min(N - 1, cy + r); y++) for (let z = Math.max(0, cz - r); z <= Math.min(N - 1, cz + r); z++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy), Math.abs(z - cz)) !== r) continue;
        const l = grid.get((x * N + y) * N + z); if (!l) continue;
        for (const t of l) { const d = d2tri(px, py, pz, t); if (d < best) best = d; }
      }
      if (best < Infinity && Math.sqrt(best) <= r * cs) break; // nothing in a farther shell can be closer
    }
    return best;
  };
  let worst = 0; const sp = S.p, si = S.i;
  for (let t = 0; t < si.length; t += 3) {
    const a = si[t] * 3, b = si[t + 1] * 3, c = si[t + 2] * 3;
    for (const o of [a, b, c]) { const d = nearest(sp[o], sp[o + 1], sp[o + 2]); if (d > worst) worst = d; }
    const d = nearest((sp[a] + sp[b] + sp[c]) / 3, (sp[a + 1] + sp[b + 1] + sp[c + 1]) / 3, (sp[a + 2] + sp[b + 2] + sp[c + 2]) / 3); if (d > worst) worst = d;
  }
  return Math.sqrt(worst);
}

async function main() {
  await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  fs.mkdirSync(CACHE, { recursive: true });
  const ktx = TEX === 'ktx2' ? findKtx() : null;
  if (TEX === 'ktx2' && !ktx) { console.warn('prop-diet: no ktx binary found (set KTX_BIN). Falling back to WebP textures.'); TEX = 'webp'; }
  const rows = []; const packs = {};
  for (const d of DIRS) {
    if (!fs.existsSync(`${SRC}/${d}`)) continue;
    fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
    for (const f of fs.readdirSync(`${SRC}/${d}`).filter((x) => x.endsWith('.glb')).sort()) {
      const name = f.slice(0, -4); if (ONLY && !ONLY.has(name)) continue;
      const doc = await io.read(`${SRC}/${d}/${f}`); doc.setLogger(new Logger(Logger.Verbosity.WARN));
      const st = await dietDocument(doc, name, d, ktx);
      const bin = await io.writeBinary(doc);
      fs.writeFileSync(`${OUT}/${d}/${f}`, bin);
      st.kb0 = fs.statSync(`${SRC}/${d}/${f}`).size / 1024; st.kb1 = bin.byteLength / 1024;
      rows.push(st);
      if (PACK) { doc.getRoot().listScenes()[0].listChildren().forEach((n) => n.setName(n.getName() || name)); (packs[d] = packs[d] || []).push({ name, doc }); }
    }
  }
  if (PACK) {
    fs.mkdirSync(`${OUT}/packs`, { recursive: true });
    for (const [d, list] of Object.entries(packs)) {
      // one file per folder: every prop becomes one named top-level node, picked out by name at load time
      const io2 = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
      const target = await io2.readBinary(await io.writeBinary(list[0].doc));
      const wrap = (docx, nm) => { const r = docx.getRoot(); const sc = r.listScenes()[0]; const holder = docx.createNode(nm); for (const c of sc.listChildren()) { sc.removeChild(c); holder.addChild(c); } sc.addChild(holder); return holder; };
      wrap(target, list[0].name);
      const tScene = target.getRoot().listScenes()[0];
      for (const { name, doc } of list.slice(1)) {
        const tmp = await io2.readBinary(await io.writeBinary(doc)); wrap(tmp, name);
        mergeDocuments(target, tmp);
        const scenes = target.getRoot().listScenes();
        for (const sc of scenes.slice(1)) { for (const c of sc.listChildren()) { sc.removeChild(c); tScene.addChild(c); } sc.dispose(); }
      }
      await target.transform(unpartition(), dedup(), prune({ keepLeaves: false }), meshopt({ encoder: MeshoptEncoder, level: LEVEL }));
      fs.writeFileSync(`${OUT}/packs/${d}.glb`, await io2.writeBinary(target));
    }
  }
  // ---- summary ----
  const sum = (k, r = rows) => r.reduce((a, x) => a + (x[k] || 0), 0);
  const line = (label, r) => `${label.padEnd(15)} ${String(r.length).padStart(4)}  ${(sum('kb0', r) / 1024).toFixed(2).padStart(6)} -> ${(sum('kb1', r) / 1024).toFixed(2).padStart(5)} MB   ${String(sum('tris0', r)).padStart(7)} -> ${String(sum('tris1', r)).padStart(7)} tris   ${(sum('gpu0', r) / 1048576).toFixed(1).padStart(6)} -> ${(sum('gpu1', r) / 1048576).toFixed(1).padStart(5)} GPU MB   ${String(sum('prims0', r)).padStart(4)} -> ${String(sum('prims1', r)).padStart(4)} draws`;
  if (!QUIET) for (const r of rows) console.log(`${r.dir.padEnd(13)} ${r.name.padEnd(30)} ${r.cls.padEnd(7)} ${(r.sizeM ?? 0).toFixed(2).padStart(5)}m  ${String(r.tris0).padStart(6)}->${String(r.tris1).padStart(6)} tri  ${r.kb0.toFixed(0).padStart(4)}->${r.kb1.toFixed(0).padStart(4)} KB  ${(r.gpu0 / 1048576).toFixed(2).padStart(5)}->${(r.gpu1 / 1048576).toFixed(2).padStart(5)} MB  ${r.prims0}->${r.prims1} draws${r.skins ? '  skin baked' : ''}`);
  console.log('\n' + 'folder'.padEnd(15) + ' files  disk                 triangles                  texture memory            draw calls');
  for (const d of DIRS) console.log(line(d, rows.filter((r) => r.dir === d)));
  console.log(line('TOTAL', rows));
  console.log(`requests: ${rows.length} files${PACK ? ` -> ${Object.keys(packs).length} packs (${Object.keys(packs).map((d) => `${d} ${(fs.statSync(`${OUT}/packs/${d}.glb`).size / 1048576).toFixed(2)} MB`).join(', ')})` : ''}   textures: ${TEX}${TEX === 'ktx2' ? ` (colour ${COLOR})` : ''}   geometry: ${GEOM}, limit ${FORCE ? 'none' : ERR_MM + ' mm'}${LOCK ? ', borders locked' : ''}`);
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ opts: { GEOM, ERR_MM, LOCK, FORCE, TEX, COLOR, TEX_CLASS, LEVEL }, rows }, null, 1));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main().catch((e) => { console.error(e); process.exit(1); });
