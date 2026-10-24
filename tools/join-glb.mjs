#!/usr/bin/env node
/** Merges every mesh that shares a material into one (flatten + join): one draw call per material per model. Usage: node tools/join-glb.mjs <in.glb> [out.glb] (default: in place) */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, join, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [inp, out = inp] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
await doc.transform(flatten(), join(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
const meshes = doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0);
console.log(out, 'primitives:', meshes, 'materials:', doc.getRoot().listMaterials().length);
