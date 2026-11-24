// One-shot vehicle decimation (meshopt simplify, UVs and silhouette kept via attribute remap).
// Usage: node tools/decimate-vehicles.mjs   (rewrites public/assets/vehicles_free in place; run once per source file)
// Ratios are per mesh (name match, first hit wins). Trailer pack is cut to ONE trailer (cables + other two dropped).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, dedup, meshopt, compactPrimitive, getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const R = {
  moped: [[/./, 0.139]], motorbike: [[/./, 0.22]], old_tractor: [[/./, 0.30]], bicycle: [[/./, 0.237]], thela_gadi: [[/./, 0.175]],
  tuk_tuk: [[/^Rin_Llanta/, 0.035], [/^Rin_Metal/, 0.035], [/./, 0.9]],
  trailer_pack: [[/./, 0.45]],
};
// 'Permissive' lets collapses cross UV/normal seams (plain simplify stalled at ~70% on these scans); positions are dequantized first.
function simp(prim, ratio) {
  const A = prim.getAttribute('POSITION'), n = A.getCount(), pos = new Float32Array(n * 3), t = [0, 0, 0];
  for (let i = 0; i < n; i++) { A.getElement(i, t); pos.set(t, i * 3); }
  const idx = prim.getIndices(), src = new Uint32Array(idx.getArray());
  const target = Math.max(3, Math.floor(ratio * src.length / 3) * 3);
  const [dst] = MeshoptSimplifier.simplify(src, pos, 3, target, 1, ['Permissive']);
  idx.setArray(dst);
  compactPrimitive(prim);
  const ix = prim.getIndices(); if (prim.getAttribute('POSITION').getCount() <= 65534) ix.setArray(new Uint16Array(ix.getArray()));
}
const tris = (doc) => doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
for (const [name, rules] of Object.entries(R)) {
  const p = `public/assets/vehicles_free/${name}.glb`;
  const doc = await io.read(p); const before = tris(doc);
  if (name === 'trailer_pack') {
    for (const n of doc.getRoot().listNodes()) if (!/^(wheels_M_wheel1_0|D46_body_M_D56c1_0)$/.test(n.getName()) && n.getMesh()) n.dispose();
    await doc.transform(prune());
  }
  await doc.transform(weld({}));
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const ratio = rules.find(([re]) => re.test(node.getName()))[1];
    for (const prim of mesh.listPrimitives()) simp(prim, ratio);
  }
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(p, doc);
  const b = getBounds(doc.getRoot().listScenes()[0]);
  console.log(name, 'tris', before, '->', Math.round(tris(doc)), 'materials', doc.getRoot().listMaterials().length, 'bytes', fs.statSync(p).size, 'bounds', b.min.map((x) => +x.toFixed(2)), b.max.map((x) => +x.toFixed(2)));
}
