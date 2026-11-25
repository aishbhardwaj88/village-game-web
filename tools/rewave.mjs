#!/usr/bin/env node
/** Replace the squat wave of an already finished character GLB with the standing wave (tools/standwave.mjs). node tools/rewave.mjs <in.glb> <out.glb> */
import { meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { load } from './tvaunty-rig.mjs';
import { fixWave } from './standwave.mjs';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';
const [i, o] = process.argv.slice(2);
const { io, doc } = await load(resolve(i));
fixWave(doc);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(o), doc);
console.log(`${o}: ${(statSync(resolve(o)).size / 1e6).toFixed(2)} MB; clips ${doc.getRoot().listAnimations().map((a) => a.getName()).join(',')}`);
