// Runs tools/load-time-test.mjs N times (default 3) and prints the median Play-ready time.
// The software-GL test swings ~5 s run to run; a single run cannot prove a load-time change.
// Usage: node tools/load-time-median.mjs [N]
import { spawnSync } from 'node:child_process';
const n = Number(process.argv[2] || 3);
const ready = [];
for (let i = 0; i < n; i++) {
  const r = spawnSync('node', ['tools/load-time-test.mjs'], { encoding: 'utf8' });
  const m = /Play ready:\s+(\d+) ms/.exec(r.stdout || '');
  if (m) ready.push(Number(m[1]));
  console.log(`run ${i + 1}: ${m ? m[1] + ' ms' : 'no reading'}`);
}
if (!ready.length) { console.log('MEDIAN: no readings'); process.exit(1); }
ready.sort((a, b) => a - b);
console.log(`MEDIAN Play ready: ${ready[Math.floor(ready.length / 2)]} ms (min ${ready[0]}, max ${ready[ready.length - 1]}, n=${ready.length})`);
