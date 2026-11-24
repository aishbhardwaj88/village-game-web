// Gentle vehicle decimation. Geometry from ORIGINAL glbs (dir arg 1), textures/materials kept from the CURRENT glbs in public/assets/vehicles_free.
// Method: meshopt simplifyWithAttributes (normals + UVs weighted), LockBorder, NO Permissive, low relative error. Budget is a ceiling, not a goal.
// Usage: node tools/decimate-vehicles-gentle.mjs <originalsDir> [name ...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt, getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [orig, ...only] = process.argv.slice(2);
// error = fraction of mesh extent; maxTris = ceiling for the whole vehicle
const CFG = JSON.parse(process.env.CFG || '{}');
const DEF = { old_tractor: { err: 0.005 }, bicycle: { err: 0.004 }, moped: { err: 0.002 }, motorbike: { err: 0.002 }, thela_gadi: { err: 0.002 } };
function simp(prim, err) {
  const A = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), U = prim.getAttribute('TEXCOORD_0'), n = A.getCount();
  const pos = new Float32Array(n * 3), att = new Float32Array(n * 5), t = [0, 0, 0];
  for (let i = 0; i < n; i++) { A.getElement(i, t); pos.set(t, i * 3); N.getElement(i, t); att.set(t, i * 5); U.getElement(i, t); att[i * 5 + 3] = t[0]; att[i * 5 + 4] = t[1]; }
  const src = new Uint32Array(prim.getIndices().getArray());
  const [dst, e] = MeshoptSimplifier.simplifyWithAttributes(src, pos, 3, att, 5, [0.5, 0.5, 0.5, 1, 1], null, 0, err, ['LockBorder']);
  return { dst, e };
}
for (const name of Object.keys(DEF)) {
  if (only.length && !only.includes(name)) continue;
  const cfg = { ...DEF[name], ...(CFG[name] || {}) };
  const p = `public/assets/vehicles_free/${name}.glb`;
  const cur = await io.read(p), src = await io.read(`${orig}/${name}.glb`);
  const prims = (d) => d.getRoot().listNodes().filter((n) => n.getMesh()).flatMap((n) => n.getMesh().listPrimitives());
  const cp = prims(cur), sp0 = prims(src);
  if (cp.length !== sp0.length) throw new Error(`${name}: primitive count differs ${cp.length} vs ${sp0.length}`);
  let before = 0, after = 0;
  sp0.forEach((sp, pi) => {
    {
      const tp = cp[pi]; if (tp.getMaterial()?.getName() !== sp.getMaterial()?.getName()) throw new Error('material mismatch ' + pi);
      const { dst } = simp(sp, cfg.err);
      before += sp.getIndices().getCount() / 3; after += dst.length / 3;
      // compact: keep only used vertices
      const used = new Map(), list = []; const idx = new Uint32Array(dst.length);
      for (let k = 0; k < dst.length; k++) { let v = used.get(dst[k]); if (v === undefined) { v = list.length; used.set(dst[k], v); list.push(dst[k]); } idx[k] = v; }
      for (const sem of tp.listSemantics()) tp.setAttribute(sem, null);
      for (const sem of sp.listSemantics()) {
        const a = sp.getAttribute(sem), Ctor = a.getArray().constructor, es = a.getElementSize();
        const out = new Float32Array(list.length * es), tmp = new Array(es).fill(0);
        for (let k = 0; k < list.length; k++) { a.getElement(list[k], tmp); out.set(tmp, k * es); }
        // dequantised float accessors in the current doc
        tp.setAttribute(sem, cur.createAccessor().setType(a.getType()).setArray(out).setBuffer(cur.getRoot().listBuffers()[0]));
      }
      tp.setIndices(cur.createAccessor().setType('SCALAR').setArray(list.length <= 65535 ? new Uint16Array(idx) : idx).setBuffer(cur.getRoot().listBuffers()[0]));
    }
  });
  await cur.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(p, cur);
  const b = getBounds(cur.getRoot().listScenes()[0]);
  console.log(name, 'err', cfg.err, 'tris', Math.round(before), '->', Math.round(after), 'bytes', fs.statSync(p).size, 'bounds', b.min.map((x) => +x.toFixed(3)), b.max.map((x) => +x.toFixed(3)));
}
