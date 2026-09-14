#!/usr/bin/env node
/**
 * Asset shrink pipeline: dedup + weld -> simplify to a triangle budget -> resize
 * textures to 1K + convert to WebP -> Meshopt-compress the geometry.
 *
 * Usage: node tools/shrink.js <input.gltf|.glb> <output.glb> [triangleBudget]
 *   triangleBudget defaults to 20000.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, textureCompress, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { resolve } from 'node:path';

const TEXTURE_MAX_DIM = 1024;

async function main() {
  const [inputArg, outputArg, budgetArg] = process.argv.slice(2);
  if (!inputArg || !outputArg) {
    console.error('Usage: node tools/shrink.js <input.gltf|.glb> <output.glb> [triangleBudget=20000]');
    process.exit(1);
  }

  const input = resolve(inputArg);
  const output = resolve(outputArg);
  const triangleBudget = budgetArg ? parseInt(budgetArg, 10) : 20000;

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  await MeshoptSimplifier.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const document = await io.read(input);

  console.log(`Loaded ${input}`);
  const triCountBefore = countTriangles(document);
  logStats(document, 'before');

  // simplify() only takes a vertex ratio, so derive it from the triangle budget.
  const ratio = triCountBefore > 0 ? Math.min(1, triangleBudget / triCountBefore) : 1;

  await document.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [TEXTURE_MAX_DIM, TEXTURE_MAX_DIM],
    }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'high' })
  );

  logStats(document, 'after');

  await io.write(output, document);
  console.log(`Wrote ${output}`);
}

function countTriangles(document) {
  const root = document.getRoot();
  let triCount = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const positions = prim.getAttribute('POSITION');
      const count = indices ? indices.getCount() : positions ? positions.getCount() : 0;
      triCount += Math.floor(count / 3);
    }
  }
  return triCount;
}

function logStats(document, label) {
  const root = document.getRoot();
  console.log(
    `[${label}] triangles=${countTriangles(document)} textures=${root.listTextures().length} materials=${root.listMaterials().length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
