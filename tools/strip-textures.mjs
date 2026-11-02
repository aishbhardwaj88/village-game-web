#!/usr/bin/env node
/**
 * Drops the embedded PBR texture copies from a GLB so the shared library set (public/assets/textures/<set>/) is downloaded once
 * for the whole game, not once per model (11 MB of duplicates pushed public/assets over budget).
 *
 * Default mode (tools/blender/make.sh does this for *_v2 and primary_school): every Kit material carries extras
 * { dopahar_set, dopahar_repeat }; src/stagingYard.js swapShared() replaces the material with the shared, weathered one.
 *
 * --relink mode (the older models: gaushala, temple, house_compound, abadi rows...): the material is KEPT exactly as exported;
 * only its color / normal / metal-roughness maps are removed, and extras.dopahar_relink records which library set they were
 * plus every texture-info detail (uv set, KHR_texture_transform, sampler, normal scale). src/sharedTextures.js (a GLTFLoader
 * plugin, so every load site gets it) puts the shared maps back on load, so the model renders as before.
 * A map is only stripped when its name is <set>_<kind>, the library file exists and the decoded pixels match it
 * (mean abs difference under 6/255 on the channels the shader reads); anything else (decals, scans) keeps its own texture.
 * The metal-roughness map's blue (metalness) channel is folded into metallicFactor, since the shared roughness map is greyscale.
 *
 * Usage: node tools/strip-textures.mjs [--relink] <in.glb> <out.glb>
 */
import fs from 'fs';
import crypto from 'crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const args = process.argv.slice(2);
const relink = args[0] === '--relink';
const [inp, out] = relink ? args.slice(1) : args;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
let n = 0;

if (!relink) {
  for (const m of doc.getRoot().listMaterials()) {
    const ex = m.getExtras() || {};
    if (!ex.dopahar_set) continue;
    m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null);
    n++;
  }
} else {
  const sharp = (await import('sharp')).default;
  const raw = async (src) => (await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
  const verdicts = new Map();   // texture image hash + kind -> { ok, set, blue }
  async function check(tex, kind) {
    const mm = tex && /^([a-z]+)_(color|normal|roughness)$/.exec(tex.getName() || '');
    if (!mm || mm[2] !== kind) return null;
    const file = `public/assets/textures/${mm[1]}/${mm[1]}_${kind}.webp`;
    if (!fs.existsSync(file)) return null;
    const key = crypto.createHash('md5').update(tex.getImage()).digest('hex') + kind;
    if (verdicts.has(key)) return verdicts.get(key);
    const a = await raw(Buffer.from(tex.getImage())), b = await raw(file);
    let v = { ok: false, set: mm[1] };
    if (a.info.width === b.info.width && a.info.height === b.info.height) {
      const chans = kind === 'roughness' ? [1] : [0, 1, 2];
      let s = 0, bmin = 255, bmax = 0, bsum = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        for (const c of chans) s += Math.abs(a.data[i + c] - b.data[i + c]);
        const bl = a.data[i + 2]; bsum += bl; if (bl < bmin) bmin = bl; if (bl > bmax) bmax = bl;
      }
      const px = a.data.length / 4, mean = s / (px * chans.length);
      // the blue (metalness) channel of the exported map is near-white noise, the shared map is greyscale: fold its mean into metallicFactor
      v = { ok: mean < 6 && (kind !== 'roughness' || bmax - bmin <= 64), set: mm[1], blue: bsum / px / 255, mean };
      console.log(`  ${tex.getName()}: mean abs diff ${mean.toFixed(2)}/255 -> ${v.ok ? 'shared' : 'KEEP'}`);
    }
    verdicts.set(key, v);
    return v;
  }
  const infoOf = (ti) => {
    const tr = ti.getExtension('KHR_texture_transform');
    const r = { uv: ti.getTexCoord(), ws: ti.getWrapS(), wt: ti.getWrapT(), mag: ti.getMagFilter(), min: ti.getMinFilter() };
    if (tr) { r.s = tr.getScale(); r.o = tr.getOffset(); r.r = tr.getRotation(); if (tr.getTexCoord() != null) r.uv = tr.getTexCoord(); }
    return r;
  };
  for (const m of doc.getRoot().listMaterials()) {
    const c = await check(m.getBaseColorTexture(), 'color');
    const nn = await check(m.getNormalTexture(), 'normal');
    const mr = await check(m.getMetallicRoughnessTexture(), 'roughness');
    const sets = [c, nn, mr].filter(Boolean).map((v) => v.set);
    if (!sets.length || new Set(sets).size > 1 || [c, nn, mr].some((v) => v && !v.ok)) continue;
    const rl = { set: sets[0] };
    if (c) { rl.c = infoOf(m.getBaseColorTextureInfo()); m.setBaseColorTexture(null); }
    if (nn) { rl.n = infoOf(m.getNormalTextureInfo()); rl.ns = m.getNormalScale(); m.setNormalTexture(null); }
    if (mr) { rl.mr = infoOf(m.getMetallicRoughnessTextureInfo()); m.setMetallicFactor(m.getMetallicFactor() * mr.blue); m.setMetallicRoughnessTexture(null); }
    m.setExtras({ ...(m.getExtras() || {}), dopahar_relink: rl });
    n++;
  }
}
await doc.transform(prune({ keepAttributes: true })); // the UVs must stay: the shared textures are applied in the game
// re-encode with the same meshopt filters tools/shrink.js used (level 'high'), else the rewrite grows the geometry buffers
const mo = doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === 'EXT_meshopt_compression');
if (mo) mo.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(out, doc);
console.log(`stripped textures from ${n} materials -> ${out}`);
