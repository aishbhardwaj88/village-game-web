#!/usr/bin/env node
/**
 * PARALLEL.md A: no place may be invisible from the nearest road. Static scan of every zoneManager.register in
 * src/main.js with a literal visibleRadius: a place must draw from at least MIN_VIS m (roads are within ~15 m of
 * every place, so this is "visible from the road"). Fails the build otherwise.
 */
import fs from 'fs';
const MIN_VIS = 60;
const src = fs.readFileSync('src/main.js', 'utf8');
const bad = [];
let total = 0;
for (const m of src.matchAll(/register\('([A-Za-z_0-9]+)',\s*\{\s*visibleRadius:\s*(\d+)\b/g)) {
  total++;
  if (Number(m[2]) < MIN_VIS) bad.push(`${m[1]} (${m[2]} m)`);
}
if (bad.length) { console.log(`FAIL  place visibility — drawn from less than ${MIN_VIS} m: ${bad.join(', ')}`); process.exit(1); }
console.log(`PASS  place visibility — ${total} literal-radius places all draw from ${MIN_VIS} m or more`);
