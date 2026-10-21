#!/usr/bin/env node
/**
 * Builds docs/shots/compare/<asset>.png — Places V1 reference LEFT, in-game NORMAL-mode render RIGHT.
 * Usage: node tools/compare-shot.mjs <asset> <reference.png> '<main cam json>' ['<[extra close-up shots json]>']
 *  main cam json:   {"pos":[x,y,z],"target":[x,y,z],"fov":28}
 *  extra shots json: [{"name":"gate","cam":{...}}, ...]  -> docs/shots/compare/<asset>/<name>.png (single render each)
 * Rendering goes through tools/proof-shot.mjs (?proof=1: positioning hook only, no dev visuals).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const [asset, refPath, mainCam, extra] = process.argv.slice(2);
const root = resolve(new URL('..', import.meta.url).pathname);
const outDir = resolve(root, 'docs/shots/compare');
const tmpDir = resolve(root, 'tmp/compare-' + asset);
mkdirSync(outDir, { recursive: true });
const shots = [{ name: 'main', cam: JSON.parse(mainCam) }, ...(extra ? JSON.parse(extra) : [])];
execFileSync('node', [resolve(root, 'tools/proof-shot.mjs'), tmpDir, JSON.stringify(shots)], { stdio: 'inherit' });

const H = 800;
const NO_REF = refPath === '-' || refPath.startsWith('none:');
const ref = NO_REF
  ? await sharp(Buffer.from(`<svg width="700" height="${H}"><rect width="700" height="${H}" fill="#3a3a3a"/><text x="350" y="${H / 2 - 20}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="26" fill="#ddd">No Places V1 reference exists</text><text x="350" y="${H / 2 + 20}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="20" fill="#aaa">${(refPath.startsWith('none:') ? refPath.slice(5) : 'built from MAP.md + the project brief').replace(/&/g, '&amp;')}</text></svg>`)).png().toBuffer()
  : await sharp(resolve(refPath)).resize({ height: H }).png().toBuffer();
const game = await sharp(resolve(tmpDir, 'main.png')).resize({ height: H }).png().toBuffer();
const rm = await sharp(ref).metadata();
const gm = await sharp(game).metadata();
const gap = 12;
const label = (t, w) => Buffer.from(`<svg width="${w}" height="34"><rect width="${w}" height="34" fill="#000" fill-opacity="0.55"/><text x="12" y="23" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="#fff">${t}</text></svg>`);
await sharp({ create: { width: rm.width + gap + gm.width, height: H, channels: 3, background: '#202020' } })
  .composite([
    { input: ref, left: 0, top: 0 }, { input: game, left: rm.width + gap, top: 0 },
    { input: label('Places V1 reference', rm.width), left: 0, top: 0 },
    { input: label('In-game, normal mode', gm.width), left: rm.width + gap, top: 0 },
  ]).png().toFile(resolve(outDir, `${asset}.png`));
console.log('wrote', resolve(outDir, `${asset}.png`));
if (extra) {
  mkdirSync(resolve(outDir, asset), { recursive: true });
  for (const s of JSON.parse(extra)) copyFileSync(resolve(tmpDir, `${s.name}.png`), resolve(outDir, asset, `${s.name}.png`));
  console.log('close-ups in', resolve(outDir, asset));
}
