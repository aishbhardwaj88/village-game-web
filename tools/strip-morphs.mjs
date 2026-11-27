#!/usr/bin/env node
// 27 Nov: remove EVERY morph target (blink / smile from face_keys.py) from a finished character so the face is exactly Tripo's.
// Why: the blink key (built from estimated eye coordinates) pulls Tripo's lids down over the painted eyes, so rest + animated eyes look half closed.
// usage: node tools/strip-morphs.mjs in.glb out.glb   (runs AFTER finish-<name>.mjs, which still reads the keys to find the eye points for glasses)
import { MeshoptEncoder } from 'meshoptimizer';
import { meshopt } from '@gltf-transform/functions';
import { load } from './tvaunty-rig.mjs';
const { io, doc } = await load(process.argv[2]); let n = 0;
for (const m of doc.getRoot().listMeshes()) {
  for (const p of m.listPrimitives()) for (const t of p.listTargets()) { p.removeTarget(t); t.dispose(); n++; }
  m.setWeights([]); const ex = m.getExtras(); if (ex && ex.targetNames) { delete ex.targetNames; m.setExtras(ex); }
}
for (const nd of doc.getRoot().listNodes()) if (nd.getWeights && nd.getWeights().length) nd.setWeights([]);
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(process.argv[3], doc); console.log(`removed ${n} morph targets`);
