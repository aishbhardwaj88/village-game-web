#!/usr/bin/env node
/**
 * Drops the embedded PBR texture copies from a staged place's GLB (tools/blender/make.sh does this for *_v2 and primary_school).
 * Every Kit material carries extras { dopahar_set, dopahar_repeat }; src/stagingYard.js re-applies the SHARED set
 * (public/assets/textures/<set>/) at that repeat, so the textures are downloaded once for the whole game, not once per model
 * (11 MB of duplicates pushed public/assets over the 40 MB budget). Materials without extras (decals) keep their own texture.
 * Usage: node tools/strip-textures.mjs <in.glb> <out.glb>
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [inp, out] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
let n = 0;
for (const m of doc.getRoot().listMaterials()) {
  const ex = m.getExtras() || {};
  if (!ex.dopahar_set) continue;
  m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null);
  n++;
}
await doc.transform(prune({ keepAttributes: true })); // the UVs must stay: the shared textures are applied in the game
await io.write(out, doc);
console.log(`stripped textures from ${n} materials -> ${out}`);
