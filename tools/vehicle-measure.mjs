// Measures every .glb in public/assets/vehicles_free (world-space bbox after node transforms).
// Writes tmp/vehicle-dump/<name>.json (per-node bboxes + sampled points for plotting).
// Front/longAxis decisions live in FRONT_OVERRIDES below (from evidence); dims are always recomputed.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';
const dir = 'public/assets/vehicles_free';
const out = 'tmp/vehicle-dump';
fs.mkdirSync(out, { recursive: true });
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
function mul(a, b) { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return r; }
// Front decisions, from rendered top/side plots (tmp/veh_*.png, via tmp/plot.py) + node names.
const DECISIONS = {
  auto_rickshaw: ['-z', 'high', 'Slanted windscreen and narrow single-wheel nose at -z; wide twin rear wheels/body at +z'],
  bicycle: ['+x', 'high', 'Handlebar/fork rises at x~-80..0 with front wheel centre x~0; saddle (rama_low_seater) and gear/chain ring at x~-400..-300, rear wheel x~-570. Units are mm-like (902 long), origin near front axle'],
  mini_truck: ['+z', 'high', 'Tall cab with raked windscreen occupies z 2.5..11 (+z); flat load bed at -z. Cab-over mini truck'],
  moped: ['-z', 'high', 'Handlebar (y~800, x +-500) sits above small front wheel at z~-500 with raked fork; engine/seat and bigger rear wheel at +z. Units mm-like, centre not at ground (minY -435)'],
  motorbike: ['+x', 'high', 'Raked fork + handlebar/headlamp cluster at x~0.7..1.0 above front wheel x=1.0; chain/sprocket disc and rear wheel at x~-0.55'],
  old_tractor: ['+z', 'high', 'Small front wheels (r~2) near z~+7, huge rear wheels (r~4.5) at z~-5.5; exhaust stack at z~+3 ahead of centre'],
  thela_b: ['+z', 'low', 'Four-legged stall with roof canopy, no handles or wheels; near-symmetric. Canopy overhangs marginally more at +z (6.6 vs 6.2). Front is a guess'],
  thela_gadi: ['+x', 'low', 'Tea-stall cart on four wheels (x -4.7/+4.9, z -3.7/+4.0); no handle geometry found, near-symmetric. Canopy poles overhang more at +x (8.5 vs -7.7). Front is a guess'],
  trailer_pack: ['+z', 'high', 'Tandem axles at z -1.3/+1.3, body to z 2.0, then drawbar/hitch tongue extends to z 4.07; no extension at -z'],
  tuk_tuk: ['+z', 'high', 'Single front wheel at x=0, z~+1.2 (top view); two rear wheels at x +-0.55, z~-1.0; windscreen glass at z~+1.0'],
  water_tanker: ['+z', 'low', 'Actually a rotationally symmetric elevated water tower (ring of legs, tank at y 19-25, roof to y 37); no real front. Ladder/box protrusion at +z only; long axis is meaningless (17.2 x 18.0)'],
  willys_jeep: ['-z', 'high', 'HeadLights and Side Headlights nodes at z -4.2..-3.5; long bonnet to windscreen (FrontGlass) at z -1; Seats and SpareTyre at +z (tailgate)']
};
const specPath = 'src/vehicleSpec.json';
const prev = fs.existsSync(specPath) ? JSON.parse(fs.readFileSync(specPath, 'utf8')) : {};
const spec = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
  const name = f.replace('.glb', '');
  let doc;
  try { doc = await io.read(path.join(dir, f)); } catch (e) { console.log(name, 'ERR', e.message); continue; }
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  const nodes = [];
  const pts = [];
  for (const scene of doc.getRoot().listScenes()) {
    const walk = (node) => {
      const m = node.getWorldMatrix();
      const mesh = node.getMesh();
      if (mesh) {
        const nmin = [1e9, 1e9, 1e9], nmax = [-1e9, -1e9, -1e9];
        for (const prim of mesh.listPrimitives()) {
          const pos = prim.getAttribute('POSITION'); if (!pos) continue;
          const a = [0, 0, 0];
          const step = Math.max(1, Math.floor(pos.getCount() / 5000));
          for (let i = 0; i < pos.getCount(); i++) {
            pos.getElement(i, a);
            const x = m[0] * a[0] + m[4] * a[1] + m[8] * a[2] + m[12];
            const y = m[1] * a[0] + m[5] * a[1] + m[9] * a[2] + m[13];
            const z = m[2] * a[0] + m[6] * a[1] + m[10] * a[2] + m[14];
            const v = [x, y, z];
            for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[k]); max[k] = Math.max(max[k], v[k]); nmin[k] = Math.min(nmin[k], v[k]); nmax[k] = Math.max(nmax[k], v[k]); }
            if (i % step === 0) pts.push([+x.toFixed(3), +y.toFixed(3), +z.toFixed(3), nodes.length]);
          }
          // dense surface samples on triangles (for plotting only)
          const idx = prim.getIndices();
          const tc = idx ? idx.getCount() / 3 : pos.getCount() / 3;
          const ns = Math.min(6000, tc * 3);
          const A = [0, 0, 0], B = [0, 0, 0], C = [0, 0, 0];
          for (let s = 0; s < ns; s++) {
            const t = Math.floor(((s * 7919) % tc));
            const ia = idx ? idx.getScalar(t * 3) : t * 3, ib = idx ? idx.getScalar(t * 3 + 1) : t * 3 + 1, ic = idx ? idx.getScalar(t * 3 + 2) : t * 3 + 2;
            pos.getElement(ia, A); pos.getElement(ib, B); pos.getElement(ic, C);
            let u = Math.random(), w = Math.random(); if (u + w > 1) { u = 1 - u; w = 1 - w; }
            const q = [0, 1, 2].map(k => A[k] + u * (B[k] - A[k]) + w * (C[k] - A[k]));
            pts.push([+(m[0] * q[0] + m[4] * q[1] + m[8] * q[2] + m[12]).toFixed(3), +(m[1] * q[0] + m[5] * q[1] + m[9] * q[2] + m[13]).toFixed(3), +(m[2] * q[0] + m[6] * q[1] + m[10] * q[2] + m[14]).toFixed(3), nodes.length]);
          }
        }
        nodes.push({ node: node.getName(), mesh: mesh.getName(), min: nmin.map(n => +n.toFixed(3)), max: nmax.map(n => +n.toFixed(3)) });
      }
      node.listChildren().forEach(walk);
    };
    scene.listChildren().forEach(walk);
  }
  const dims = [0, 1, 2].map(k => +(max[k] - min[k]).toFixed(3));
  const longAxis = dims[0] > dims[2] ? 'x' : 'z';
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ min, max, dims, nodes, pts }));
  const p = prev[name] || {};
  spec[name] = { dims, longAxis, front: (DECISIONS[name] || ['?'])[0], confidence: (DECISIONS[name] || [0, 'low'])[1], evidence: (DECISIONS[name] || [0, 0, 'unreviewed'])[2] };
  console.log(name, dims.join(' x '), 'long', longAxis, 'nodes', nodes.length);
}
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
