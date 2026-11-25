// Vehicle bake: repacks vehicles_free/*.glb into 3 shared texture pages + one shared material per family,
// bakes a paint mask into the alpha channel, and writes a ~600 tri far LOD GLB.
// Run: node tools/vehicle-bake.mjs      Output: public/assets/vehicles_baked/ (inputs are never touched)
//
// Output files: <model>.glb (meshopt, NO embedded texture, page referenced by URI), family_a.webp,
//   family_b.webp, family_c.webp (1024x1024, RGBA), far_all.glb (every vehicle as a root node named after
//   the model, ~600 tris each, same pages), paint.json (which models have a mask).
// Families: A two-wheelers, B three-wheelers/carts/trucks, C heavy. One material per family (names
//   veh_family_a/b/c), roughness/normal/metal maps dropped (rough 0.85, metal 0.05 constants).
//   Glass (blend) materials stay as one untextured material per family: veh_glass_<a|b|c>.
//
// PAINT MASK (models listed in paint.json): the paint area is baked to NEUTRAL GREY (luma*0.5, so
// tint*2 reproduces today's luma*tint look) and alpha = 255 on body paint, 0 elsewhere. Page alpha is
// real (webp with exact alpha), the material stays OPAQUE, alphaTest OFF, alpha only drives the tint.
// A shader (onBeforeCompile on MeshStandardMaterial, after #include <map_fragment>) would do:
//   vec4 texel = texture2D(map, vMapUv);                       // map decoded as sRGB, alpha unpremultiplied
//   diffuseColor.rgb *= mix(texel.rgb, texel.rgb * uTint * 2.0, texel.a);   // = colour = mix(rgb, rgb*tint*2, a)
//   (do not use texel.a for opacity; GLTFLoader gives the page with premultiplyAlpha false.)
// Per-colour variants then only need one material clone with a different uTint, no canvas per colour.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { dequantize, flatten, join, joinPrimitives, meshopt, simplify, weld, prune, mergeDocuments } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const ROOT = new URL('..', import.meta.url).pathname;
const IN = ROOT + 'public/assets/vehicles_free/', OUT = ROOT + 'public/assets/vehicles_baked/', TMP = ROOT + 'tmp/';
const PAGE = 1024, GUT = 4, SW = 16, SWROW = 1024 - SW; // swatch strip at the bottom of each page
const FAMILIES = {
  family_a: { models: ['bicycle', 'motorbike', 'moped'], mult: { bicycle: 1.5, motorbike: 1.5, moped: 1.5 } },
  family_b: { models: ['auto_rickshaw', 'tuk_tuk', 'thela_gadi', 'thela_b', 'mini_truck'], mult: { auto_rickshaw: 1.3, tuk_tuk: 1, thela_gadi: 1, thela_b: 1.2, mini_truck: 1.3 } },
  family_c: { models: ['old_tractor', 'trailer_pack', 'water_tanker', 'willys_jeep'], mult: { old_tractor: 4, trailer_pack: 1.2, water_tanker: 1.5, willys_jeep: 3 } },
};
// which materials are recolourable body paint (grey mode = whole texture; paint mode = hue-picked pixels)
const MASK = {
  old_tractor: { mode: 'paint', material: 'old_tractor_body' }, bicycle: { mode: 'grey', material: 'frame' },
  moped: { mode: 'grey', material: 'moped_body' }, trailer_pack: { mode: 'grey', material: 'farm_trailer_body' },
  thela_gadi: { mode: 'grey', material: 'lambert1' }, thela_b: { mode: 'grey', material: ['Material', 'Material_2'] },
};
const FAR_TRIS = 600;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const triCount = (doc) => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0), 0);
const matCountOf = {}, trisBefore = {}, sizeBefore = {};

// ---- 1. load every model, decode base colour textures, build slots ----
const models = {};
for (const fam of Object.keys(FAMILIES)) for (const name of FAMILIES[fam].models) {
  const doc = await io.read(IN + name + '.glb');
  await doc.transform(dequantize());
  sizeBefore[name] = fs.statSync(IN + name + '.glb').size;
  matCountOf[name] = doc.getRoot().listMaterials().length; trisBefore[name] = triCount(doc);
  const slots = new Map(); // key -> slot
  const primSlot = new Map();
  const triShare = new Map(); const total = trisBefore[name];
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    let key, kind = 'tex';
    if (mat && mat.getAlphaMode() !== 'OPAQUE') { primSlot.set(prim, { glass: true, mat }); continue; }
    const tex = mat && mat.getBaseColorTexture();
    const f = mat ? mat.getBaseColorFactor() : [0.7, 0.7, 0.7, 1];
    const isMask = !!MASK[name] && [].concat(MASK[name].material).includes(mat && mat.getName());
    if (tex) key = 'T' + Buffer.from(tex.getImage()).subarray(0, 4096).toString('base64').slice(0, 64) + tex.getImage().length + (isMask ? 'M' : '') + (isMask ? '' : f.slice(0, 3).map(v => v.toFixed(2)).join());
    else { kind = 'solid'; key = 'S' + f.slice(0, 3).map(v => v.toFixed(3)).join(); }
    let slot = slots.get(key);
    if (!slot) { slot = { key, kind, tex, f, isMask, name, mat, tris: 0, fam }; slots.set(key, slot); }
    slot.tris += prim.getIndices().getCount() / 3; primSlot.set(prim, slot);
  }
  models[name] = { name, fam, doc, slots, primSlot, total };
}

// ---- 2. layout per family (weighted slicing treemap), render pages ----
function layout(items, x, y, w, h, out) {
  if (items.length === 1) { out.set(items[0], { x, y, w, h }); return; }
  const tot = items.reduce((s, i) => s + i.weight, 0); let acc = 0, k = 0;
  while (k < items.length - 1 && acc + items[k].weight / 2 < tot / 2) { acc += items[k].weight; k++; }
  k = Math.max(1, k);
  const a = items.slice(0, k), b = items.slice(k), fa = a.reduce((s, i) => s + i.weight, 0) / tot;
  if (w >= h) { const wa = Math.round(w * fa); layout(a, x, y, wa, h, out); layout(b, x + wa, y, w - wa, h, out); }
  else { const ha = Math.round(h * fa); layout(a, x, y, w, ha, out); layout(b, x, y + ha, w, h - ha, out); }
}
const pageInfo = {}, rects = new Map(), report = { overlap: 0 };
for (const [fam, cfg] of Object.entries(FAMILIES)) {
  const items = [], solids = [];
  for (const name of cfg.models) for (const s of models[name].slots.values()) {
    if (s.kind === 'solid') { solids.push(s); continue; }
    s.weight = cfg.mult[name] * (0.4 + 4 * s.tris / models[name].total) * (s.isMask ? 1.3 : 1);
    items.push(s);
  }
  items.sort((a, b) => b.weight - a.weight);
  layout(items, 0, 0, PAGE, SWROW, rects);
  // decode + place
  const comps = [], plain = Buffer.alloc(PAGE * PAGE * 4);
  for (let i = 0; i < PAGE * PAGE; i++) { plain[i * 4] = plain[i * 4 + 1] = plain[i * 4 + 2] = 128; plain[i * 4 + 3] = 0; }
  const used = [];
  for (const s of items) {
    const c = rects.get(s);
    const { data, info } = await sharp(Buffer.from(s.tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = new Uint8ClampedArray(data), n = info.width * info.height;
    if (s.isMask) {
      const cfgm = MASK[s.name];
      let sum = 0, cnt = 0;
      for (let i = 0; i < n; i++) {
        const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255, luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let paint = true, grey = luma * 0.5;
        if (cfgm.mode === 'paint') { // same rule as src/vehicleVariants.js paintTexture
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn; paint = false;
          if (!(mx < 0.12 || dl / (mx || 1) < 0.28)) {
            let h = dl === 0 ? 0 : mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h *= 60;
            if (h >= 340 || h <= 30) paint = true;
          }
          grey = Math.min(1.6, luma / 0.38) * 0.5;
        }
        if (paint) { const v = Math.round(grey * 255); px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255; cnt++; }
        else px[i * 4 + 3] = 0;
      }
      s.maskPct = +(100 * cnt / n).toFixed(1);
    } else if (s.name !== 'old_tractor') { // bake colour factor (tractor's 0.22 factor deliberately NOT baked, see report)
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) px[i * 4 + k] *= s.f[k];
      for (let i = 0; i < n; i++) px[i * 4 + 3] = 255;
    } else for (let i = 0; i < n; i++) px[i * 4 + 3] = 255;
    const iw = c.w - 2 * GUT, ih = c.h - 2 * GUT, sc = Math.min(iw / info.width, ih / info.height);
    const w = Math.max(8, Math.floor(info.width * sc)), h = Math.max(8, Math.floor(info.height * sc));
    // resize RGB and alpha separately: sharp premultiplies RGBA on resize, which would zero RGB under alpha 0
    const rgb = Buffer.alloc(n * 3), al = Buffer.alloc(n);
    for (let i = 0; i < n; i++) { rgb[i * 3] = px[i * 4]; rgb[i * 3 + 1] = px[i * 4 + 1]; rgb[i * 3 + 2] = px[i * 4 + 2]; al[i] = px[i * 4 + 3]; }
    const ext = { top: GUT, bottom: GUT, left: GUT, right: GUT, extendWith: 'copy' };
    const rr = await sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } }).resize(w, h, { kernel: 'lanczos3' }).extend(ext).raw().toBuffer();
    const aa = await sharp(al, { raw: { width: info.width, height: info.height, channels: 1 } }).resize(w, h, { kernel: 'nearest' }).extend(ext).raw().toBuffer();
    const resized = { data: Buffer.alloc((w + 2 * GUT) * (h + 2 * GUT) * 4) };
    for (let i = 0; i < aa.length; i++) { resized.data[i * 4] = rr[i * 3]; resized.data[i * 4 + 1] = rr[i * 3 + 1]; resized.data[i * 4 + 2] = rr[i * 3 + 2]; resized.data[i * 4 + 3] = aa[i]; }
    const cw = w + 2 * GUT; // manual blit: sharp composite would zero the RGB under alpha 0
    for (let yy = 0; yy < h + 2 * GUT; yy++) resized.data.copy(plain, ((c.y + yy) * PAGE + c.x) * 4, yy * cw * 4, (yy + 1) * cw * 4);
    s.uv = { ox: (c.x + GUT) / PAGE, oy: (c.y + GUT) / PAGE, sx: w / PAGE, sy: h / PAGE };
    used.push({ s, x: c.x, y: c.y, w: w + 2 * GUT, h: h + 2 * GUT });
  }
  // overlap check
  for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) {
    const a = used[i], b = used[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) report.overlap++;
  }
  // swatches
  solids.forEach((s, i) => {
    const x = i * SW, y = SWROW;
    for (let yy = 0; yy < SW; yy++) for (let xx = 0; xx < SW; xx++) { const o = ((y + yy) * PAGE + x + xx) * 4; plain[o] = Math.round(s.f[0] * 255); plain[o + 1] = Math.round(s.f[1] * 255); plain[o + 2] = Math.round(s.f[2] * 255); plain[o + 3] = 255; }
    s.uv = { ox: (x + SW / 2) / PAGE, oy: (y + SW / 2) / PAGE, sx: 0, sy: 0 };
  });
  const png = await sharp(plain, { raw: { width: PAGE, height: PAGE, channels: 4 } }).png().toBuffer();
  await sharp(png).webp({ quality: 82, alphaQuality: 100, exact: true, effort: 5 }).toFile(OUT + fam + '.webp');
  // debug sheets: colour on checker, and alpha mask
  const raw = await sharp(png).raw().toBuffer(); const m = Buffer.alloc(PAGE * PAGE * 3), cb = Buffer.alloc(PAGE * PAGE * 3);
  for (let i = 0; i < PAGE * PAGE; i++) { m[i * 3] = m[i * 3 + 1] = m[i * 3 + 2] = raw[i * 4 + 3]; for (let k = 0; k < 3; k++) cb[i * 3 + k] = raw[i * 4 + k]; }
  await sharp(cb, { raw: { width: PAGE, height: PAGE, channels: 3 } }).resize(768).png().toFile(TMP + fam + '_sheet.png');
  await sharp(m, { raw: { width: PAGE, height: PAGE, channels: 3 } }).resize(512).png().toFile(TMP + fam + '_mask.png');
  pageInfo[fam] = { bytes: fs.statSync(OUT + fam + '.webp').size, data: fs.readFileSync(OUT + fam + '.webp') };
}

// ---- 3. rewrite each model: remap UVs, one shared material, join primitives ----
const outsideStats = {};
function bake(m) {
  const { doc, name, fam } = m;
  const root = doc.getRoot();
  const tex = doc.createTexture(fam).setImage(pageInfo[fam].data).setMimeType('image/webp').setURI(fam + '.webp');
  const mat = doc.createMaterial('veh_' + fam).setBaseColorTexture(tex).setRoughnessFactor(0.85).setMetallicFactor(0.05);
  let glass = null; let out = 0, vcount = 0;
  for (const mesh of root.listMeshes()) {
    const newPrims = [];
    for (const prim of mesh.listPrimitives()) {
      const s = m.primSlot.get(prim);
      for (const sem of prim.listSemantics()) if (!['POSITION', 'NORMAL', 'TEXCOORD_0'].includes(sem)) prim.setAttribute(sem, null);
      if (s.glass) {
        if (!glass) glass = doc.createMaterial('veh_glass_' + fam.slice(-1)).setBaseColorFactor(s.mat.getBaseColorFactor().map((v, i) => i === 3 ? Math.min(v, 0.4) : v)).setAlphaMode('BLEND').setRoughnessFactor(0.1).setMetallicFactor(0);
        prim.setMaterial(glass); newPrims.push(prim); continue;
      }
      let uv = prim.getAttribute('TEXCOORD_0');
      if (!uv) { uv = doc.createAccessor().setType('VEC2').setArray(new Float32Array(prim.getAttribute('POSITION').getCount() * 2)); prim.setAttribute('TEXCOORD_0', uv); }
      const arr = uv.getArray(), n = uv.getCount(), o = s.uv;
      const f32 = new Float32Array(n * 2);
      let ku = 0, kv = 0; // wrapped (repeat) UVs that fit in one tile: shift the primitive by whole tiles
      if (s.kind === 'tex') {
        let a = [9e9, 9e9, -9e9, -9e9];
        for (let i = 0; i < n; i++) { const e = uv.getElement(i, [0, 0]); a = [Math.min(a[0], e[0]), Math.min(a[1], e[1]), Math.max(a[2], e[0]), Math.max(a[3], e[1])]; }
        const fu = Math.floor(a[0] + 1e-4), fv = Math.floor(a[1] + 1e-4);
        if (a[2] - fu <= 1.001) ku = fu; if (a[3] - fv <= 1.001) kv = fv;
      }
      for (let i = 0; i < n; i++) {
        let u = uv.getElement(i, [0, 0])[0] - ku, v = uv.getElement(i, [0, 0])[1] - kv;
        vcount++;
        if (s.kind === 'tex') {
          if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) out++;
          u = Math.min(1, Math.max(0, u)); v = Math.min(1, Math.max(0, v));
          f32[i * 2] = o.ox + u * o.sx; f32[i * 2 + 1] = o.oy + v * o.sy;
        } else { f32[i * 2] = o.ox; f32[i * 2 + 1] = o.oy; }
      }
      uv.setArray(f32);
      prim.setMaterial(mat); newPrims.push(prim);
    }
    // join all primitives sharing a material
    const byMat = new Map();
    for (const p of newPrims) { const k = p.getMaterial(); (byMat.get(k) || byMat.set(k, []).get(k)).push(p); }
    for (const p of mesh.listPrimitives()) mesh.removePrimitive(p);
    for (const [, ps] of byMat) mesh.addPrimitive(ps.length > 1 ? joinPrimitives(ps) : ps[0]);
  }
  outsideStats[name] = vcount ? +(100 * out / vcount).toFixed(1) : 0;
  const ext = doc.createExtension(EXTTextureWebP).setRequired(true);
  return doc;
}
async function writeGlb(doc, file) {
  await doc.transform(prune({ keepLeaves: false }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const { json, resources } = await io.writeJSON(doc);
  const bufUri = json.buffers[0].uri; let bin = Buffer.from(resources[bufUri]);
  delete json.buffers[0].uri; json.buffers[0].byteLength = bin.length;
  // images referenced by URI keep their uri; drop any bufferView-embedded images (none expected)
  const pad = (b, ch) => { const r = (4 - (b.length % 4)) % 4; return r ? Buffer.concat([b, Buffer.alloc(r, ch)]) : b; };
  let js = pad(Buffer.from(JSON.stringify(json)), 0x20); bin = pad(bin, 0);
  const head = Buffer.alloc(12); head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.write('JSON', 4);
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(bin.length, 0); c2.write('BIN\0', 4);
  fs.writeFileSync(file, Buffer.concat([head, c1, js, c2, bin]));
  return json;
}
const sizeAfter = {}, trisAfter = {}, primsAfter = {};
for (const m of Object.values(models)) {
  bake(m);
  trisAfter[m.name] = triCount(m.doc); primsAfter[m.name] = m.doc.getRoot().listMeshes().reduce((s, x) => s + x.listPrimitives().length, 0);
}
for (const m of Object.values(models)) {
  await m.doc.transform(flatten(), join({ keepMeshes: false, keepNamed: false })); // one mesh, one primitive per material
  primsAfter[m.name] = m.doc.getRoot().listMeshes().reduce((s, x) => s + x.listPrimitives().length, 0);
  await writeGlb(m.doc, OUT + m.name + '.glb');
  sizeAfter[m.name] = fs.statSync(OUT + m.name + '.glb').size;
}

// ---- 4. far LOD: per model, world-space merge of opaque prims, position-weld, meshopt simplify to ~600 tris ----
// UVs are taken from one wedge per welded position (smear across UV seams is invisible at far distance);
// normals are recomputed smooth. Glass is dropped from the far mesh.
const farDoc = new Document(); const farScene = farDoc.createScene('far');
const farBuf = farDoc.createBuffer();
const farTris = {}; const farMat = {}, farTex = {};
for (const fam of Object.keys(FAMILIES)) {
  farTex[fam] = farDoc.createTexture(fam).setImage(pageInfo[fam].data).setMimeType('image/webp').setURI(fam + '.webp');
  farMat[fam] = farDoc.createMaterial('veh_' + fam).setBaseColorTexture(farTex[fam]).setRoughnessFactor(0.85).setMetallicFactor(0.05);
}
farDoc.createExtension(EXTTextureWebP).setRequired(true);
for (const m of Object.values(models)) {
  const d = await io.read(OUT + m.name + '.glb'); await d.transform(dequantize());
  const pos = [], uvs = [], idx = []; const map = new Map();
  for (const node of d.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      if (p.getMaterial().getAlphaMode() !== 'OPAQUE') continue;
      const P = p.getAttribute('POSITION'), U = p.getAttribute('TEXCOORD_0'), I = p.getIndices();
      const remap = new Uint32Array(P.getCount());
      for (let i = 0; i < P.getCount(); i++) {
        const [x, y, z] = P.getElement(i, [0, 0, 0]);
        const wx = M[0] * x + M[4] * y + M[8] * z + M[12], wy = M[1] * x + M[5] * y + M[9] * z + M[13], wz = M[2] * x + M[6] * y + M[10] * z + M[14];
        const k = Math.round(wx * 2e4) + ',' + Math.round(wy * 2e4) + ',' + Math.round(wz * 2e4);
        let id = map.get(k);
        if (id === undefined) { id = pos.length / 3; map.set(k, id); pos.push(wx, wy, wz); const e = U ? U.getElement(i, [0, 0]) : [0, 0]; uvs.push(e[0], e[1]); }
        remap[i] = id;
      }
      for (let i = 0; i < I.getCount(); i++) idx.push(remap[I.getScalar(i)]);
    }
  }
  const positions = new Float32Array(pos);
  let ind = new Uint32Array(idx);
  const [simp] = MeshoptSimplifier.simplify(ind, positions, 3, FAR_TRIS * 3, 0.3, []);
  const [rm, nu] = MeshoptSimplifier.compactMesh(simp);
  const P2 = new Float32Array(nu * 3), U2 = new Float32Array(nu * 2), N2 = new Float32Array(nu * 3);
  for (let i = 0; i < rm.length; i++) if (rm[i] !== 0xffffffff) { const o = rm[i]; P2.set(positions.subarray(i * 3, i * 3 + 3), o * 3); U2.set(uvs.slice(i * 2, i * 2 + 2), o * 2); }
  for (let t = 0; t < simp.length; t += 3) {
    const a = simp[t] * 3, b = simp[t + 1] * 3, c = simp[t + 2] * 3;
    const e1 = [P2[b] - P2[a], P2[b + 1] - P2[a + 1], P2[b + 2] - P2[a + 2]], e2 = [P2[c] - P2[a], P2[c + 1] - P2[a + 1], P2[c + 2] - P2[a + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const v of [a, b, c]) { N2[v] += nx; N2[v + 1] += ny; N2[v + 2] += nz; }
  }
  for (let i = 0; i < nu; i++) { const l = Math.hypot(N2[i * 3], N2[i * 3 + 1], N2[i * 3 + 2]) || 1; N2[i * 3] /= l; N2[i * 3 + 1] /= l; N2[i * 3 + 2] /= l; }
  const acc = (arr, type) => farDoc.createAccessor().setType(type).setArray(arr).setBuffer(farBuf);
  const prim = farDoc.createPrimitive().setAttribute('POSITION', acc(P2, 'VEC3')).setAttribute('NORMAL', acc(N2, 'VEC3')).setAttribute('TEXCOORD_0', acc(U2, 'VEC2'))
    .setIndices(acc(simp, 'SCALAR')).setMaterial(farMat[m.fam]);
  const node = farDoc.createNode(m.name).setMesh(farDoc.createMesh(m.name).addPrimitive(prim));
  farScene.addChild(node); farTris[m.name] = simp.length / 3;
}
farDoc.getRoot().setDefaultScene(farScene);
await writeGlb(farDoc, OUT + 'far_all.glb');

// ---- 5. paint.json + report ----
const masked = {};
for (const [name, c] of Object.entries(MASK)) masked[name] = { page: models[name].fam, mode: c.mode, material: c.material };
fs.writeFileSync(OUT + 'paint.json', JSON.stringify({ pages: Object.keys(FAMILIES).map(f => f + '.webp'), maskInAlpha: true, shader: 'mix(rgb, rgb*tint*2, a)', masked }) + '\n');
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const pagesBytes = Object.values(pageInfo).reduce((s, p) => s + p.bytes, 0);
console.log('sizeBefore', sum(sizeBefore), 'models after', sum(sizeAfter), 'pages', pagesBytes, 'far_all', fs.statSync(OUT + 'far_all.glb').size);
console.log('materials before', sum(matCountOf), 'tris before', sum(trisBefore), 'after', sum(trisAfter), 'far', farTris, sum(farTris));
console.log('prims after (draw calls)', primsAfter, sum(primsAfter), 'uv outside% per model', outsideStats, 'overlaps', report.overlap);
console.log('mask %', Object.values(models).flatMap(m => [...m.slots.values()].filter(s => s.isMask).map(s => m.name + ':' + s.maskPct)));
