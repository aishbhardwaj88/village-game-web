#!/usr/bin/env node
// Fails the build if an X_v2.glb and X.glb both exist and src/ still references the old X (3 Nov duplicate-pump bug).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const models = new Set(readdirSync(join(ROOT, 'public/assets/models')).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const src = walk(join(ROOT, 'src')).filter((f) => f.endsWith('.js')).map((f) => [f, readFileSync(f, 'utf8')]);
let bad = 0;
for (const m of models) {
  if (!m.endsWith('_v2') || !models.has(m.slice(0, -3))) continue;
  const old = m.slice(0, -3);
  const re = new RegExp(`['"\`/]${old}(\\.glb)?['"\`]`);
  for (const [f, t] of src) if (re.test(t)) { console.log(`FAIL  old model "${old}" still referenced in ${f} (use ${m})`); bad++; }
}
console.log(bad ? `${bad} duplicate-model reference(s)` : 'PASS  no old model referenced beside its _v2');
process.exit(bad ? 1 : 0);
