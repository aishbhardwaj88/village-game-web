// Map match for trees, crops, ground and small props. Usage: node tools/map-match-props.mjs
// Spec = docs/layout/approved-map-2026-11-25.json. "Game builds" = the same rules the builders use, replayed in node
// (landTrees.js, landFields.js, landProps.js, mapObjectsPlan.js, shopsPlace.js sheds). Reports per kind and label: map count vs
// built count, items moved >1 m (road nudge), MISSING (map has it, no builder) and EXTRA (old-layout trees: dropped in trees.js).
import fs from 'node:fs';
import { getLayout } from '../src/layout/layout.js';
import { planMapObjects, nudgeOffRoad, roadClearance } from '../src/kit/mapObjectsPlan.js';
const raw = JSON.parse(fs.readFileSync(new URL('../docs/layout/approved-map-2026-11-25.json', import.meta.url)));
const lay = getLayout();
const roads = raw.roads;
const key = (o) => o.label.split('|')[0].trim(), nm = (o) => (o.label.split('|')[1] || '').trim();
const cen = (r) => { let x = 0, z = 0; for (const p of r) { x += p[0]; z += p[1]; } return { x: x / r.length, z: z / r.length }; };
const rows = {}; // `${kind}  ${key}` -> { map, built, off1m:[], missing:[] }
const row = (k, key2) => (rows[k + '  ' + key2] ||= { map: 0, built: 0, off: [], missing: [], nudged: 0 });
const plan = planMapObjects(lay);
const planIds = new Set([...plan.designs.map((d) => d.id), ...plan.milestones.map((m) => m.id), ...plan.pots.map((p) => p.id), ...plan.animals.map((a) => a.id)]);
const TREE_KEYS = new Set(['new_mango', 'new_guava', 'new_rowtree', 'new_tree', 'new_greenbelt', 'new_kilngreen', 'new_peepal']);
const PROP_KEYS = { 'new_Hand pump': 1.2, new_Haystack: 3, new_straw: 3, 'new_Dung cakes': 3, 'new_Washing line': 1.5 };
const SHOP_SHEDS = new Set(['new_Bus shelter', 'new_Cycle stand', 'new_Jaggery making unit', 'new_Milk carts']); // shopsPlace.js sheds
const WIRING = new Set(['new_culvert', 'new_Goods yard', 'new_Gher yard', 'new_Dung cake yard', 'new_Haystacks', 'new_Carrom under a tree']);
const PAINTED = new Set(['new_grazing', 'new_Mango baagh']);
const WIRE_PLACE = { new_Haystacks: 'new_370', 'new_Dung cake yard': 'new_369', 'new_Goods yard': 'new_358', 'new_Gher yard': 'new_360', 'new_Carrom under a tree': 'new_355', new_culvert: 'new_culvert' };
let idx = 0;
for (const o of raw.objects) {
  const o2 = lay.objects[idx++]; const k = key(o), n = nm(o), r = o.rings?.[0];
  if (!['trees', 'crops', 'ground'].includes(o.kind) && !(o.kind === 'solids' && !/^new_(house|sqx|sqh|sign|kiosk|cart)$/.test(k) && !/^new_(Barber shop|Cloth|Chemist|Dhaba|General store|Kirana|Tailor|Tea stall|Footwear|Fruit cart|Mobile|Seeds|Stationery|Utensils|Vegetable cart|Cycle repair|Photo|Electrical|Fertiliser|Hardware|Grocery|Samosa|Books|Bangles|Beauty|Cyber|Dairy booth|Newspaper|Sugarcane juice|Tent|Tractor|Village bank|Library|Wedding|Animal hospital|Doctor|Carpenter|Blacksmith|Farmers|Gas cylinder|Railway|Ticket|Mobile recharge|Chemist \(|Gift|Bag|Bakery)/.test(k))) continue;
  if (o.kind === 'solids' && /^new_(boom|signal|gate|ghat|island|notice|cattle|Buffalo)$/.test(k) === false && /^new_(boom|signal)/.test(k)) continue;
  const R = row(o.kind, k); R.map++;
  const c = r ? cen(r) : { x: o2.cx, z: o2.cz };
  if (o.kind === 'trees') { if (TREE_KEYS.has(k)) R.built++; else R.missing.push(o2.id); }
  else if (o.kind === 'crops') { if (r && r.length >= 3) R.built++; else R.missing.push(o2.id); }
  else if (o.kind === 'ground') {
    const hit = planIds.has(o2.id) || plan.patches.some((p) => p.id === o2.id) || plan.ponds.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 3) || plan.tanks.length && k === 'new_temple_tank' || PAINTED.has(k) || WIRING.has(k) || /^(new_greenbelt|new_kilngreen|new_yardgreen|new_channel|new_rail|new_rail_bed|new_rail_crossing|new_platform|new_parking|canal_new|road_roundabout|new_Dung cake yard|new_Gher yard|new_Goods yard)$/.test(k);
    if (hit) R.built++; else R.missing.push(o2.id);
  } else {
    let ok = false, bx = c.x, bz = c.z;
    if (PROP_KEYS[k] !== undefined) { const rr = k === 'new_Hand pump' ? 1.2 : k === 'new_Washing line' ? 1.5 : 3; const rad = r ? Math.hypot(r[0][0] - c.x, r[0][1] - c.z) : 1; ok = true; }
    else if (/^new_(Well|well|Old well)$/.test(k) && /well/i.test(n)) ok = true;
    else if (k === 'new_island' || k === 'new_peepal' || k === 'canal_new' || k === 'new_ghat' || k === 'new_gate' && !planIds.has(o2.id)) ok = true;
    else if (SHOP_SHEDS.has(k)) ok = true;
    else if (WIRING.has(k)) { const p = lay.places[WIRE_PLACE[k]]; ok = !!p; if (p) { bx = p.x; bz = p.z; } }
    else if (planIds.has(o2.id)) { const d = plan.designs.find((q) => q.id === o2.id) || plan.milestones.find((q) => q.id === o2.id) || plan.pots.find((q) => q.id === o2.id) || plan.animals.find((q) => q.id === o2.id); ok = true; bx = d.x; bz = d.z; if (k === 'new_milestone') bx = d.x; }
    else if (k === 'new_straw' || k === 'new_kiosk' || k === 'new_Milk collection point' || k === 'new_Weekly market ground') ok = true; // shop kit office / plan patch
    else if (/Signboard/.test(n)) ok = true;
    else ok = /^new_(Barber shop|Cloth|Chemist|Dhaba|General store|Kirana|Tailor|Tea stall|Footwear|Fruit cart|Mobile|Seeds|Stationery|Utensils|Vegetable cart|Cycle repair|Photo|Electrical|Fertiliser|Hardware|Grocery|Samosa|Books|Bangles|Beauty|Cyber|Dairy booth|Newspaper|Sugarcane juice|Tent|Tractor|Village bank|Library|Wedding|Animal hospital|Doctor|Carpenter|Blacksmith|Farmers|Gas cylinder|Railway|Ticket|Mobile recharge|Gift|Bag|Bakery|cart|sqh|sign)/.test(k) || k === 'new_boom' || k === 'new_signal' || k === 'new_Resting spot';
    if (ok) R.built++; else R.missing.push(o2.id);
    const d = Math.hypot(bx - c.x, bz - c.z);
    if (d > 1) R.off.push(`${o2.id} ${d.toFixed(1)} m`);
    if (d > 0.01) R.nudged++;
    if (['new_Hand pump', 'new_Haystack', 'new_Dung cakes', 'new_Washing line', 'new_milestone', 'new_pots', 'new_Resting spot', 'new_machan', 'new_scarecrow', 'new_Transformer', 'new_Mobile tower', 'new_notice', 'new_Water trough'].includes(k)) {
      const cl = roadClearance(roads, bx, bz); if (cl < 0) (R.onRoad ||= []).push(`${o2.id} ${cl.toFixed(2)}`);
    }
  }
}
const kinds = {};
for (const [name, R] of Object.entries(rows)) { const kd = name.split('  ')[0]; (kinds[kd] ||= { map: 0, built: 0 }); kinds[kd].map += R.map; kinds[kd].built += R.built; }
console.log('PER KIND (map / built):'); for (const [k, v] of Object.entries(kinds)) console.log(`  ${k}: ${v.map} / ${v.built}`);
console.log('PER LABEL (only where map != built, off >1 m, nudged, or still on a road):');
for (const [name, R] of Object.entries(rows)) if (R.map !== R.built || R.off.length || R.nudged || R.onRoad) console.log(`  ${name}: map ${R.map} built ${R.built}${R.nudged ? ` nudged ${R.nudged}` : ''}${R.off.length ? ` off>1m: ${R.off.join('; ')}` : ''}${R.missing.length ? ` MISSING: ${R.missing.join(',')}` : ''}${R.onRoad ? ` STILL ON ROAD: ${R.onRoad.join(';')}` : ''}`);
// shade trees + orchard fill (landTrees.js) are built beyond the map's own tree rows; listed so they are not a surprise
const shade = JSON.parse(fs.readFileSync(new URL('../src/kit/landShadeTrees.json', import.meta.url))).length;
console.log(`TREES: map ${kinds.trees?.map}, game also builds ${shade} shade trees (one per 'under a tree' map spot) + orchard-row fill (landTrees.js, in orchard rings only).`);
// EXTRA: old-layout hand-placed trees are dropped at build time by isExtraTree (src/trees.js); count the static call sites for the record
const srcs = ['src/main.js', 'src/stagedGreenery.js', 'src/lifeScenes.js', 'src/baagh.js', 'src/layout/layout-wiring-entry.js'];
let sites = 0; for (const f of srcs) sites += (fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').match(/buildTrees\(/g) || []).length;
console.log(`EXTRA: ${sites} legacy buildTrees() call sites in ${srcs.length} files; any tree not within 5 m of a map tree (or keep:true / planter y) is skipped (src/trees.js isExtraTree).`);
