#!/usr/bin/env node
/**
 * SUPERSEDED, 23 Nov, same night it was written - use tools/char-diet.mjs instead.
 * That tool already does this (texture resize + meshopt-compress), already runs
 * automatically in the web build, never simplifies the mesh at all (this one does,
 * unnecessarily), and verifies itself against the original. Characters are still
 * large on disk because src/edition.js's WEB_QUALITY is 'full' (the owner's own
 * 21 Nov call, full quality first) - not because char-diet.mjs is missing or broken.
 * See docs/NEEDS_YOU.md's correction note, same date, for the full story.
 *
 * Kept rather than deleted (standing rule: never rm). Left otherwise unchanged below
 * as a record of the dead end - do not run this against any shipped character file.
 *
 * Character-safe shrink: resize texture + simplify mesh + meshopt-compress,
 * WITHOUT tools/shrink.js's prune() step - which silently drops the skin and
 * animations from a rigged character (found 23 Nov while checking why the 10
 * hero characters are each 6.5-8.7 MB against their 2.5 MB budget; shrink.js
 * is the right tool for static props/buildings, wrong one for anything with
 * a skeleton).
 *
 * Tested on brother.glb: 7.69 MB -> 0.74 MB, skin (1) and all 8 animation
 * clips confirmed still present in the written file by re-reading it back.
 * NOT yet run on any shipped character model - simplifying a character's
 * mesh by ~70% is a real visual change (how it looks, not just file size),
 * so it waits for the art director's eye on one result first. See
 * docs/NEEDS_YOU.md, 23 Nov entry.
 *
 * Usage: node tools/shrink-character.js <input.glb> <output.glb> [ratio=0.3] [textureDim=1024]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { resolve } from 'node:path';

async function main() {
  const [inputArg, outputArg, ratioArg, dimArg] = process.argv.slice(2);
  if (!inputArg || !outputArg) {
    console.error('Usage: node tools/shrink-character.js <input.glb> <output.glb> [ratio=0.3] [textureDim=1024]');
    process.exit(1);
  }
  const ratio = ratioArg ? parseFloat(ratioArg) : 0.3;
  const dim = dimArg ? parseInt(dimArg, 10) : 1024;

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  await MeshoptSimplifier.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const document = await io.read(resolve(inputArg));
  const root = document.getRoot();
  const skinsBefore = root.listSkins().length;
  const animsBefore = root.listAnimations().length;
  const trisBefore = countTriangles(document);

  await document.transform(dedup(), weld());
  await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }));
  await document.transform(textureCompress({ encoder: sharp, resize: [dim, dim], targetFormat: 'webp' }));
  await document.transform(meshopt({ encoder: MeshoptEncoder }));

  await io.write(resolve(outputArg), document);

  // Re-read the written file rather than trusting the in-memory document - this is the
  // check that caught shrink.js's skin-dropping bug in the first place.
  const checkIo = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const written = await checkIo.read(resolve(outputArg));
  const skinsAfter = written.getRoot().listSkins().length;
  const animsAfter = written.getRoot().listAnimations().length;

  console.log(`triangles: ${trisBefore} -> ${countTriangles(document)}`);
  console.log(`skins: ${skinsBefore} -> ${skinsAfter}${skinsAfter < skinsBefore ? '  *** SKIN LOST, DO NOT USE THIS OUTPUT ***' : ''}`);
  console.log(`animations: ${animsBefore} -> ${animsAfter}${animsAfter < animsBefore ? '  *** ANIMATIONS LOST, DO NOT USE THIS OUTPUT ***' : ''}`);
}

function countTriangles(document) {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      total += indices ? indices.getCount() / 3 : (prim.getAttribute('POSITION')?.getCount() || 0) / 3;
    }
  }
  return Math.round(total);
}

main();
