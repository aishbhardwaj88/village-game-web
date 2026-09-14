#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getImageSize } from './image-size.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASSETS_DIR = join(ROOT, 'public', 'assets');

const TOTAL_BUDGET_BYTES = 40 * 1024 * 1024;
const MODEL_BUDGET_BYTES = 5 * 1024 * 1024;
const TEXTURE_MAX_DIM = 1024;
const PROP_TEXTURE_MAX_DIM = 512;

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MODEL_EXTS = new Set(['.glb', '.gltf']);

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function main() {
  let files;
  try {
    files = walk(ASSETS_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No public/assets directory yet — nothing to check.');
      return;
    }
    throw err;
  }

  const failures = [];
  let totalBytes = 0;

  for (const file of files) {
    const size = statSync(file).size;
    totalBytes += size;
    const ext = extname(file).toLowerCase();
    const rel = relative(ROOT, file);

    if (MODEL_EXTS.has(ext) && size > MODEL_BUDGET_BYTES) {
      failures.push(`MODEL TOO LARGE: ${rel} is ${formatMB(size)} (limit ${formatMB(MODEL_BUDGET_BYTES)})`);
    }

    if (IMAGE_EXTS.has(ext)) {
      const dims = getImageSize(file);
      if (dims) {
        const isProp = rel.split('/').includes('props');
        const maxDim = isProp ? PROP_TEXTURE_MAX_DIM : TEXTURE_MAX_DIM;
        if (dims.width > maxDim || dims.height > maxDim) {
          failures.push(
            `TEXTURE TOO LARGE: ${rel} is ${dims.width}x${dims.height} (limit ${maxDim}x${maxDim}${isProp ? ', prop' : ''})`
          );
        }
      }
    }
  }

  console.log(`public/assets total: ${formatMB(totalBytes)} (limit ${formatMB(TOTAL_BUDGET_BYTES)})`);
  if (totalBytes > TOTAL_BUDGET_BYTES) {
    failures.push(`TOTAL ASSETS TOO LARGE: ${formatMB(totalBytes)} exceeds ${formatMB(TOTAL_BUDGET_BYTES)}`);
  }

  if (failures.length > 0) {
    console.error('\nBUDGET CHECK FAILED:\n');
    for (const f of failures) console.error(' - ' + f);
    console.error('');
    process.exit(1);
  }

  console.log('Budget check passed.');
}

main();
