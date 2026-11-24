// Strip glass transmission (forces a 2nd full-scene render in three.js) and fix double-sided blend materials.
// Usage: node tools/fix-glass-alpha.mjs [--check]   (all GLBs in props_ph, props_free, vehicles_free; idempotent)
// glass (name has "glass"): alpha blend, opacity 0.35, roughness 0.1, single sided (three sets depthWrite false for BLEND).
// other transmission materials (brass etc): opaque. Blend+double-sided: real texture alpha -> MASK 0.5, else OPAQUE.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { prune } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const check = process.argv.includes('--check');
const DROP = ['KHR_materials_transmission', 'KHR_materials_volume', 'KHR_materials_ior', 'KHR_materials_specular'];
let trans = 0, blendDS = 0, changed = 0, files = 0;
for (const d of ['props_ph', 'props_free', 'vehicles_free']) {
  for (const f of fs.readdirSync(`public/assets/${d}`).filter((f) => f.endsWith('.glb'))) {
    const p = `public/assets/${d}/${f}`;
    const doc = await io.read(p); files++;
    let dirty = false;
    for (const m of doc.getRoot().listMaterials()) {
      const hasT = DROP.some((e) => m.listExtensions().some((x) => x.extensionName === e));
      const bds = m.getAlphaMode() === 'BLEND' && m.getDoubleSided();
      if (check) { if (m.getExtension('KHR_materials_transmission')) trans++; if (bds) blendDS++; continue; }
      const glass = /glass/i.test(m.getName());
      if (glass) {
        const bc = m.getBaseColorFactor(); bc[3] = Math.min(bc[3], 0.35); m.setBaseColorFactor(bc);
        m.setAlphaMode('BLEND').setDoubleSided(false).setRoughnessFactor(0.1).setMetallicFactor(Math.min(m.getMetallicFactor(), 0.1));
        dirty = true;
      } else if (bds) {
        const t = m.getBaseColorTexture(); let real = false;
        if (t) { const { data } = await sharp(Buffer.from(t.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); let lo = 0; for (let i = 3; i < data.length; i += 4) if (data[i] < 128) lo++; real = lo / (data.length / 4) > 0.01; }
        if (real) m.setAlphaMode('MASK').setAlphaCutoff(0.5); else { m.setAlphaMode('OPAQUE'); const bc = m.getBaseColorFactor(); bc[3] = 1; m.setBaseColorFactor(bc); m.setDoubleSided(false); }
        dirty = true;
      } else if (m.getAlphaMode() === 'OPAQUE' && m.getBaseColorFactor()[3] < 1 && !glass) { /* opaque ignores alpha */ }
      if (hasT) { for (const e of m.listExtensions()) if (DROP.includes(e.extensionName)) m.setExtension(e.extensionName, null); dirty = true; }
    }
    if (check) continue;
    if (dirty) { await doc.transform(prune()); await io.write(p, doc); changed++; }
  }
}
if (check) { console.log({ files, transmission: trans, blendDoubleSided: blendDS }); process.exit(trans || blendDS ? 1 : 0); }
console.log({ files, changed });
