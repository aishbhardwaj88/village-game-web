#!/usr/bin/env node
// Re-runnable: slims the staged Sketchfab downloads in tmp/models-in into public/assets/props_new/.
// Per model: pick nodes -> bake world transforms -> scale to real size -> base at ground centre ->
// simplify to triangle budget -> 512 WebP textures -> meshopt. Skipped (foreign-looking) models are not touched.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, textureCompress, meshopt, prune, flatten, transformMesh, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const IN = 'tmp/models-in', OUT = 'public/assets/props_new';
fs.mkdirSync(OUT, { recursive: true });
// pick: array of mesh-node indices (order of appearance) or null = all. h = target height (m), w = target max width (m).
// tri = budget, err = simplifier error, leaf = keep alpha test.
const J = [
  { out: 'scarecrow', src: 'scarecrow', h: 1.85, tri: 1700 },
  { out: 'fence_section', src: 'fence_pack_-_low_poly_game_ready', pick: [0], s: 0.9, tri: 300 },
  { out: 'fence_gate', src: 'fence_pack_-_low_poly_game_ready', pick: [4], s: 0.9, tri: 300 },
  { out: 'flower_pot', src: 'flower_pot', h: 0.5, tri: 2000, leaf: true },
  { out: 'money_plant_pot', src: 'free_pothos_potted_plant_-_money_plant', h: 0.6, tri: 2800, err: 0.05, leaf: true },
  { out: 'jasmine_climber', src: 'jasmine', h: 2.2, tri: 2800, err: 0.5, leaf: true },
  { out: 'pot_plant_a', src: 'optimized_potted_plants', pick: [0], h: 0.7, tri: 400 },
  { out: 'pot_plant_b', src: 'optimized_potted_plants', pick: [3], h: 0.8, tri: 400 },
  { out: 'planter_long', src: 'optimized_potted_plants', pick: [6], h: 0.45, tri: 400 },
  { out: 'pot_plant_c', src: 'optimized_potted_plants', pick: [9], h: 0.6, tri: 400 },
  { out: 'pot_plant_d', src: 'optimized_potted_plants', pick: [12], h: 0.7, tri: 400 },
  { out: 'plant_in_pot', src: 'plant_in_pot', h: 0.8, tri: 1900, leaf: true },
  { out: 'potted_plant_1', src: 'potted_plant-1', h: 0.6, tri: 800, leaf: true },
  { out: 'potted_plant_2', src: 'potted_plant', h: 0.6, tri: 2800, err: 0.1, leaf: true },
  { out: 'potted_plant_med', src: 'potted_plant_mediterranean_med_leaf_low_poly', h: 0.9, tri: 600, leaf: true },
  { out: 'snail_vine_climber', src: 'snail_vine_-_free_download', h: 2.0, tri: 1900, leaf: true },
  { out: 'banana_plant', src: 'banana_plant', h: 3.0, tri: 2900, err: 0.3, leaf: true },
  { out: 'banana_tree', src: 'banana_tree_low_poly', h: 3.2, tri: 2900, err: 0.3, leaf: true },
  { out: 'cabbage', src: 'cabbage', w: 0.3, tri: 1400, err: 0.05 },
  { out: 'corn_a', src: 'corn_corn_corn', h: 2.2, tri: 1400, err: 0.3, leaf: true },
  { out: 'corn_b', src: 'maize_corn_plant', h: 2.3, tri: 1400, err: 0.3, leaf: true },
  { out: 'eggplant', src: 'eggplant_game_ready__2k_pbr', s: 0.85, tri: 1400, err: 0.05 },
  { out: 'mango_tree', src: 'mango_tree', h: 7.0, tri: 2950, sloppy: true, leaf: true },
  { out: 'mango_fruit', src: 'mango', w: 0.11, tri: 900, err: 0.05 },
  { out: 'radish_leaf', src: 'radish_leaf_01', w: 0.35, tri: 700, leaf: true },
  { out: 'tomato_plant', src: 'tomato_plant', h: 1.0, tri: 1400, err: 0.3, leaf: true },
  { out: 'watermelon_bush', src: 'watermelon_bush', w: 1.5, tri: 1400, err: 0.3, leaf: true },
  { out: 'wheat_row', src: 'wheat__free', h: 0.9, tri: 1450, err: 0.6, leaf: true },
  { out: "wheat_clump", src: "yard_wheat_clump", h: 0.9, tri: 720, leaf: true, tex: 256 },
];
// SKIPPED, not processed: barn, american_old_barn, house_farm_wooden_-_28mb (see docs/model-size-table-26nov.md)
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const tris = d => { let t = 0; for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; return Math.round(t); };
const only = process.argv[2];
const rows = [];
for (const j of J) {
  if (only && j.out !== only) continue;
  const d = await io.read(`${IN}/${j.src}.glb`);
  const scene = d.getRoot().listScenes()[0];
  const meshNodes = []; const walk = n => { if (n.getMesh()) meshNodes.push(n); n.listChildren().forEach(walk); }; scene.listChildren().forEach(walk);
  const before = getBounds(scene); const trisBefore = tris(d);
  const osz = before.max.map((v, i) => +(v - before.min[i]).toFixed(3));
  if (j.pick) meshNodes.forEach((n, i) => { if (!j.pick.includes(i)) n.setMesh(null); });
  await d.transform(prune());
  await d.transform(flatten());
  for (const n of scene.listChildren()) { const m = n.getMesh(); if (m) { transformMesh(m, n.getMatrix()); n.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); } }
  let b = getBounds(scene);
  const sz = b.max.map((v, i) => v - b.min[i]);
  const s = j.s ?? (j.h ? j.h / sz[1] : j.w / Math.max(sz[0], sz[2]));
  const cx = (b.max[0] + b.min[0]) / 2, cz = (b.max[2] + b.min[2]) / 2;
  const M = [s,0,0,0, 0,s,0,0, 0,0,s,0, -cx*s, -b.min[1]*s, -cz*s, 1];
  for (const m of d.getRoot().listMeshes()) transformMesh(m, M);
  for (const mat of d.getRoot().listMaterials()) {
    mat.setDoubleSided(true);
    if (mat.getAlphaMode() === 'BLEND') mat.setAlphaMode(j.leaf ? 'MASK' : 'OPAQUE');
    if (j.leaf && mat.getAlphaMode() === 'MASK' && !mat.getAlphaCutoff()) mat.setAlphaCutoff(0.5);
  }
  for (const m of d.getRoot().listMeshes()) { for (const p of m.listPrimitives()) p.listTargets().forEach(t => { p.removeTarget(t); t.dispose(); }); m.setWeights([]); }
  for (const a of d.getRoot().listAnimations()) a.dispose(); // static props only; wind sway is done in code
  await d.transform(dedup({ keepUniqueNames: true }), weld());
  if (j.sloppy) { // disconnected leaf cards: normal simplify cannot reduce them, sloppy (vertex-clustering) can
    const total = tris(d);
    for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
      const idx = p.getIndices(), pos = p.getAttribute('POSITION'); if (!idx || idx.getCount() < 15000) continue;
      const target = Math.max(60, Math.round(idx.getCount() / 3 / total * j.tri * 0.97)) * 3;
      const [ni] = MeshoptSimplifier.simplifySloppy(idx.getArray(), pos.getArray(), 3, null, target, 0.5);
      idx.setArray(new Uint32Array(ni));
    }
  }
  let cur = tris(d), ratio = Math.min(1, j.tri / cur), pass = 0;
  while (cur > j.tri && pass < 14) {
    await d.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, j.tri / cur * 0.97), error: j.err ?? 0.01 }));
    const n = tris(d); if (n >= cur) { j.err = (j.err ?? 0.01) * 3; } cur = n; pass++;
  }
  { const g = getBounds(scene); const dy = -g.min[1]; if (Math.abs(dy) > 1e-4) for (const m of d.getRoot().listMeshes()) transformMesh(m, [1,0,0,0,0,1,0,0,0,0,1,0,0,dy,0,1]); } // re-ground after simplify
  await d.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [j.tex || 512, j.tex || 512] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const file = `${OUT}/${j.out}.glb`;
  await io.write(file, d);
  const fb = getBounds(d.getRoot().listScenes()[0]);
  const fsz = fb.max.map((v, i) => +(v - fb.min[i]).toFixed(2));
  const meta = d.getRoot().getAsset().extras || {};
  const row = { out: j.out, src: j.src, orig: osz, final: fsz, scale: +s.toFixed(5), trisBefore, tris: tris(d), kb: Math.round(fs.statSync(file).size / 1024), minY: +fb.min[1].toFixed(3), author: (meta.author || '').replace(/ \(.*/, ''), url: meta.source || '', title: meta.title || '' };
  rows.push(row); console.log(JSON.stringify(row));
}
fs.writeFileSync('tmp/slim-new-props-rows.json', JSON.stringify(rows, null, 1));
