// Node load of GLBs via gltf-transform (meshopt + webp ext). Usage: node tools/glb-load-check.mjs dir [name,...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const dir = process.argv[2] || 'public/assets/props_ph';
const only = process.argv[3] ? process.argv[3].split(',') : null;
let bad = 0, n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb') && (!only || only.includes(f.slice(0, -4))))) {
  n++;
  try { const d = await io.read(`${dir}/${f}`); let v = 0; for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) v += p.getAttribute('POSITION')?.getCount() || 0; if (!v) throw new Error('no vertices'); }
  catch (e) { bad++; console.log('FAIL', f, e.message); }
}
console.log(`${n} loaded, ${bad} failed`); process.exit(bad ? 1 : 0);
