// Slim prop/vehicle GLBs: texture cap 512 (256 for props under 0.5 m), merge static meshes, share materials, keep WebP + meshopt.
// Usage: node tools/slim-props.mjs   (rewrites public/assets/props_ph, props_free, vehicles_free in place)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const src = fs.readFileSync('src/freeProps.js', 'utf8') + fs.readFileSync('src/pilotVehicles.js', 'utf8');
const size = {};
for (const m of src.matchAll(/file: '(\w+)', dim: '\w', size: ([\d.]+)/g)) size[m[1]] = +m[2];
for (const m of src.matchAll(/\bo\('(\w+)', ([\d.]+)/g)) size[m[1]] = +m[2];
for (const m of src.matchAll(/file: '(\w+)', x: [\d.]+, z: [\d.]+, yaw: [\d.]+, length: ([\d.]+)/g)) size[m[1]] = +m[2];
for (const d of ['props_ph', 'props_free', 'vehicles_free']) {
  for (const f of fs.readdirSync(`public/assets/${d}`).filter((f) => f.endsWith('.glb'))) {
    const p = `public/assets/${d}/${f}`, name = f.slice(0, -4);
    const cap = (size[name] ?? 1) < 0.5 ? 256 : 512;
    const doc = await io.read(p);
    await doc.transform(dedup(), flatten(), join({ keepNamed: false }), prune(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cap, cap], quality: 80 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(p, doc);
  }
}
