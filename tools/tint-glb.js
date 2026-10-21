#!/usr/bin/env node
/**
 * Bakes per-material colour tints into a .glb as glTF baseColorFactor (three.js multiplies it with
 * the base-colour texture + vertex colour). Blender's glTF exporter cannot carry a Mix(Multiply)
 * tint node, so the Blender build scripts write a {materialName: "#rrggbb"} JSON (sRGB, as picked
 * by eye) and this applies it. Usage: node tools/tint-glb.js <in.glb> <tints.json> <out.glb>
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [inp, tintsPath, out] = process.argv.slice(2);
const tints = JSON.parse(readFileSync(resolve(tintsPath), 'utf8'));
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(resolve(inp));
for (const mat of doc.getRoot().listMaterials()) {
  const hex = tints[mat.getName()];
  if (!hex) continue;
  const n = parseInt(hex.replace('#', ''), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => srgbToLinear(v / 255));
  mat.setBaseColorFactor([...rgb, mat.getBaseColorFactor()[3]]);
  console.log(`tinted ${mat.getName()} ${hex}`);
}
await io.write(resolve(out), doc);
