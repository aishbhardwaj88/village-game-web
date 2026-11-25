// Vehicle ground-contact check (27 Nov). Reads every GLB in public/assets/vehicles_free with ALL vertices (world space), finds the TRUE
// tyre/foot contact height (lowest horizontal slab that spans >= 30% of the long axis, so kickstands, shadow planes and thin stray bits
// below the wheels are ignored), then replays the placement used by villageVehicles.js / roamingTraffic.js / vehicleModels.js
// (src/vehicleFit.js footOffsetY) and prints: model lowest contact y after placement vs ground y. FAIL when |diff| > 3 cm.
// Usage: node tools/vehicle-ground-check.mjs          check, exit 1 on any FAIL
//        node tools/vehicle-ground-check.mjs --print  also print the measured foot fractions to paste into VEHICLE_FIT
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VEHICLE_FIT, footOffsetY } from '../src/vehicleFit.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/assets/vehicles_free');
const TOL = 0.03, SLAB = 0.004, SPAN = 0.30;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

function vertices(doc) {
  const out = [];
  const walk = (node) => {
    const m = node.getWorldMatrix(), mesh = node.getMesh();
    if (mesh) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const a = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, a);
        out.push([m[0] * a[0] + m[4] * a[1] + m[8] * a[2] + m[12], m[1] * a[0] + m[5] * a[1] + m[9] * a[2] + m[13], m[2] * a[0] + m[6] * a[1] + m[10] * a[2] + m[14]]);
      }
    }
    node.listChildren().forEach(walk);
  };
  for (const s of doc.getRoot().listScenes()) s.listChildren().forEach(walk);
  return out;
}

/** { min, H, contact, size:[x,y,z] } : contact = lower edge of the lowest slab whose vertices span >= SPAN of the long axis. */
export function measure(V) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const v of V) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); }
  const size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], H = size[1], ax = size[0] >= size[2] ? 0 : 2, L = size[ax];
  const n = Math.ceil(1 / SLAB) + 1, lo = new Array(n).fill(1e9), hi = new Array(n).fill(-1e9), cnt = new Array(n).fill(0);
  for (const v of V) { const s = Math.min(n - 1, Math.floor((v[1] - mn[1]) / H / SLAB)); lo[s] = Math.min(lo[s], v[ax]); hi[s] = Math.max(hi[s], v[ax]); cnt[s]++; }
  // a slab counts when its own vertices span enough of the long axis (two tyre bottoms, not one stray tip)
  for (let s = 0; s < n; s++) {
    if (cnt[s] >= 3 && (hi[s] - lo[s]) / L >= SPAN) return { min: mn[1], H, contact: mn[1] + s * SLAB * H, size };
  }
  return { min: mn[1], H, contact: mn[1], size };
}

let fail = 0;
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.glb')).sort()) {
  const name = f.replace('.glb', ''), fit = VEHICLE_FIT[name];
  if (!fit) { console.log(name.padEnd(14), 'no VEHICLE_FIT entry (unused model)'); continue; }
  const r = measure(vertices(await io.read(path.join(dir, f))));
  const k = fit.len / Math.max(r.size[0], r.size[2]); // same scale rule as the placement code (box x/z)
  const foot = (r.contact - r.min) / r.H;
  const yPos = footOffsetY(name, r.min, r.H, k); // what the game adds to the model's y
  const contactWorld = r.contact * k + yPos; // lowest tyre contact after placement, ground = 0
  const naive = (r.contact - r.min) * k; // what the old Box3.min.y placement left floating
  const bad = Math.abs(contactWorld) > TOL;
  if (bad) fail++;
  rows.push({ name, foot });
  console.log(name.padEnd(14), `old float ${(naive * 100).toFixed(1).padStart(6)} cm`, ` table foot ${(fit.foot ?? 0).toFixed(4)} measured ${foot.toFixed(4)}`, ` contact after placement ${(contactWorld * 100).toFixed(1)} cm vs ground 0`, bad ? 'FAIL' : 'ok');
}
if (process.argv.includes('--print')) console.log(rows.map((r) => `${r.name}: ${r.foot.toFixed(4)}`).join(', '));
console.log(`FAIL count: ${fail}`);
process.exit(fail ? 1 : 0);
