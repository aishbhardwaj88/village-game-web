// Lists materials of each recolourable vehicle model so the body paint can be identified.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const dir = new URL('../public/assets/vehicles_free/', import.meta.url).pathname;
const files = process.argv.slice(2).length ? process.argv.slice(2)
  : ['old_tractor', 'bicycle', 'motorbike', 'moped', 'trailer_pack', 'thela_gadi'];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
await MeshoptDecoder.ready;
for (const f of files) {
  const doc = await io.read(dir + f + '.glb');
  const tris = new Map(); let total = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    const idx = p.getIndices(); const n = (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    tris.set(p.getMaterial(), (tris.get(p.getMaterial()) || 0) + n); total += n;
  }
  console.log(`\n== ${f} (${total} tris)`);
  for (const m of doc.getRoot().listMaterials()) {
    const t = m.getBaseColorTexture();
    const sz = t ? t.getSize() : null;
    const c = m.getBaseColorFactor().map(v => +v.toFixed(2)).join(',');
    console.log(`${m.getName().padEnd(24)} color[${c}] tex=${t ? 'yes ' + (sz || []).join('x') : 'no'} ` +
      `metal=${m.getMetallicFactor().toFixed(2)} rough=${m.getRoughnessFactor().toFixed(2)} share=${(100 * (tris.get(m) || 0) / (total || 1)).toFixed(1)}%`);
  }
}
