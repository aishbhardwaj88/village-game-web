#!/usr/bin/env node
// 27 Nov: set every default morph weight to 0 (face_keys.py used to export smile=1 as the rest weight). usage: node tools/zero-morph-weights.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const d = await io.read(process.argv[2]); let n = 0;
for (const m of d.getRoot().listMeshes()) { const w = m.getWeights(); if (w.some((x) => x)) n++; m.setWeights(w.map(() => 0)); }
for (const nd of d.getRoot().listNodes()) { const w = nd.getWeights(); if (w && w.length) nd.setWeights(w.map(() => 0)); }
await io.write(process.argv[3], d); console.log(`zeroed default weights on ${n} meshes`);
