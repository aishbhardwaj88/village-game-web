#!/usr/bin/env node
/**
 * Regression guard for the clone-drops-shader-hook bug (found and fixed 23 Nov 2026,
 * docs/handoff.md "found and fixed: `.clone()` on a tiled material silently drops its
 * roughness-floor/mottling hook"): THREE's Material.copy() (which .clone() calls
 * internally) has a fixed field list with no onBeforeCompile/customProgramCacheKey entry,
 * so a plain `.clone()` on a material returned by materials.js's getTiledMaterial() (or
 * stagingYard.js's sharedSetMaterial()) silently drops whatever per-family roughness-floor/
 * mottling/weathering shader hook it carries, while userData (deep-cloned via JSON) survives
 * — the clone LOOKS protected and renders unprotected. The real sites this hit:
 * src/roadNetwork.js's shared lane material (every road/lane in the village), src/farmSites.js's
 * vcMat() (most site-prop meshes), src/props.js's lampTinMaterial() base — all fixed to route
 * through materials.js's cloneTiledMaterial() (or, for lampTinMaterial, a manual
 * hasOwnProperty-guarded hand clone that composes the previous hook instead of overwriting it).
 *
 * This is a static source scan, not a real parser: for every `const/let X = getTiledMaterial(...)`
 * or `= sharedSetMaterial(...)` assignment, it tracks curly-brace balance forward from that line
 * (relative to the assignment line's own nesting depth) to find the enclosing block, and flags any
 * plain `X.clone()` inside that block that is not already wrapped in `cloneTiledMaterial(X)`.
 * It does not trace values across function calls/returns or follow a variable passed in as a
 * parameter (e.g. lampTinMaterial(base) above is a deliberate, hand-verified exception, not
 * something this script can see) — it catches the exact same-function pattern that caused the
 * real bug, not every possible variant. Treat a clean run as "no NEW instance of this bug class
 * in the common case", not a full proof.
 */
import fs from 'fs';

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
const files = walk(process.argv[2] || 'src').filter((f) => f.endsWith('.js'));

const ASSIGN_RE = /^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:getTiledMaterial|sharedSetMaterial)\s*\(/;

let violations = 0;
let tracked = 0;

// Strip comments before scanning, line-number-preserving (block comments become blank lines,
// line comments are truncated at `//`), so a comment that merely DISCUSSES a clone call — every
// fix this script guards left one explaining what used to be wrong — is never mistaken for code.
// Naive (doesn't know about strings/regex literals containing `//` or `/*`), but this codebase's
// own call sites never do that around a material clone, so it's safe enough for this heuristic.
function stripComments(text) {
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return noBlocks.split('\n').map((line) => {
    const idx = line.indexOf('//');
    return idx === -1 ? line : line.slice(0, idx);
  }).join('\n');
}

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const text = stripComments(raw);
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const m = ASSIGN_RE.exec(lines[i]);
    if (!m) continue;
    const name = m[1];
    tracked++;

    // Walk forward from the assignment line, tracking brace balance relative to this line's
    // own nesting depth (0 = still inside the same block the assignment lives in). The first
    // line that would take the balance negative is the enclosing block's own closing brace —
    // stop there; anything with the same variable name past that point is a different scope
    // (e.g. a same-named local in a later, unrelated function) and must not be checked.
    let depth = 0;
    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      // Check for an unwrapped clone before updating depth with this line's own braces, so the
      // assignment's own line (which may open/close a `{ ... }` options object) is still in-scope.
      const cloneRe = new RegExp(`(?<![\\w.$])${name}\\s*\\.\\s*clone\\s*\\(\\s*\\)`);
      const wrappedRe = new RegExp(`cloneTiledMaterial\\s*\\(\\s*${name}\\s*\\)`);
      if (cloneRe.test(line) && !wrappedRe.test(line)) {
        console.log(`FAIL  ${file}:${j + 1} — \`${name}.clone()\` on a getTiledMaterial()/sharedSetMaterial() result (assigned ${file}:${i + 1}); use cloneTiledMaterial(${name}) instead, or it silently drops the family's shader hook`);
        violations++;
      }
      for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth--; }
      if (depth < 0) break; // left the enclosing block
    }
  }
}

console.log(violations
  ? `${violations} unsafe material clone(s) found (${tracked} getTiledMaterial()/sharedSetMaterial() assignments scanned)`
  : `PASS  no unsafe .clone() on a tiled/shared material (${tracked} getTiledMaterial()/sharedSetMaterial() assignments scanned, 0 unwrapped clones)`);
process.exit(violations ? 1 : 0);
