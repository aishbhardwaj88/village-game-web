#!/usr/bin/env node
// Halve a Radiance .hdr (box filter in linear float) and write it RLE-compressed.
// usage: node tools/hdr-downscale.mjs in.hdr out.hdr [factor=2]
import fs from 'node:fs';
const [inp, out, f0] = process.argv.slice(2);
const F = Number(f0 || 2);
const b = fs.readFileSync(inp);
let p = 0;
const line = () => { let s = ''; while (b[p] !== 10) s += String.fromCharCode(b[p++]); p++; return s; };
let l; let w = 0, h = 0;
while ((l = line()) !== '') { /* header */ }
const m = line().match(/-Y (\d+) \+X (\d+)/); h = +m[1]; w = +m[2];
const px = new Float32Array(w * h * 3);
for (let y = 0; y < h; y++) {
  const row = new Uint8Array(w * 4);
  if (b[p] !== 2 || b[p + 1] !== 2) throw new Error('only new-style RLE supported');
  p += 4;
  for (let c = 0; c < 4; c++) {
    let x = 0;
    while (x < w) {
      let n = b[p++];
      if (n > 128) { n -= 128; const v = b[p++]; while (n--) row[4 * x++ + c] = v; }
      else while (n--) row[4 * x++ + c] = b[p++];
    }
  }
  for (let x = 0; x < w; x++) {
    const e = row[4 * x + 3]; const s = e ? Math.pow(2, e - 136) : 0;
    for (let c = 0; c < 3; c++) px[(y * w + x) * 3 + c] = row[4 * x + c] * s;
  }
}
const W = w / F | 0, H = h / F | 0;
const o = Buffer.alloc(0);
const chunks = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`)];
for (let y = 0; y < H; y++) {
  const rgbe = new Uint8Array(W * 4);
  for (let x = 0; x < W; x++) {
    const a = [0, 0, 0];
    for (let dy = 0; dy < F; dy++) for (let dx = 0; dx < F; dx++) for (let c = 0; c < 3; c++) a[c] += px[((y * F + dy) * w + x * F + dx) * 3 + c] / (F * F);
    const mx = Math.max(a[0], a[1], a[2]);
    if (mx < 1e-32) continue;
    const e = Math.ceil(Math.log2(mx) + 1e-9); const sc = 256 / Math.pow(2, e) ;
    const ee = Math.floor(Math.log2(mx)) + 1; const k = 256 / Math.pow(2, ee);
    for (let c = 0; c < 3; c++) rgbe[4 * x + c] = Math.min(255, Math.floor(a[c] * k));
    rgbe[4 * x + 3] = ee + 128;
  }
  const r = [2, 2, W >> 8, W & 255];
  for (let c = 0; c < 4; c++) {
    let x = 0;
    while (x < W) {
      let run = 1; while (x + run < W && run < 127 && rgbe[4 * (x + run) + c] === rgbe[4 * x + c]) run++;
      if (run >= 4) { r.push(128 + run, rgbe[4 * x + c]); x += run; }
      else { let n = 1; while (x + n < W && n < 128 && !(x + n + 3 < W && rgbe[4*(x+n)+c]===rgbe[4*(x+n+1)+c] && rgbe[4*(x+n)+c]===rgbe[4*(x+n+2)+c] && rgbe[4*(x+n)+c]===rgbe[4*(x+n+3)+c])) n++; r.push(n); for (let i = 0; i < n; i++) r.push(rgbe[4 * (x + i) + c]); x += n; }
    }
  }
  chunks.push(Buffer.from(r));
}
fs.writeFileSync(out, Buffer.concat(chunks));
console.log(`${w}x${h} -> ${W}x${H}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
