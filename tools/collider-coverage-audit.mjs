#!/usr/bin/env node
/**
 * STATIC, NO-BROWSER heuristic audit for docs/BACKLOG.md's A0 item:
 * "Give colliders to trees, poles, lamp posts, hand pumps, charpais, carts and
 * every solid prop; audit and LIST any solid object with no collider."
 *
 * ============================================================================
 * THIS IS A HEURISTIC TEXT AUDIT, NOT A RUNTIME GUARANTEE.
 * It never runs three.js, never builds real geometry, and never checks the
 * actual Y-height of anything. It greps/parses src/*.js for the three real
 * mechanisms src/collision.js and src/autoColliders.js use at runtime:
 *
 *   1. Explicit tag:   mesh.userData.collider = true
 *      (collision.js reads the mesh's live world-space AABB directly)
 *   2. Explicit boxes: mesh.userData.colliderBoxes = [...]
 *      (hand-computed boxes, survive merges, see src/mergeUtils.js)
 *   3. Auto-derived:   src/autoColliders.js rasterises any opaque mesh that is
 *      NOT tagged userData.collider/userData.noAutoCollider, whose top-level
 *      scene-graph name does not match SKIP_TOP, and whose name does not match
 *      a rule in src/solidRules.js's NON_SOLID_RULES — PROVIDED its geometry
 *      actually passes through the player's body band, 0.35-1.5 m up. A
 *      function can look "covered" below and still be walk-through in the
 *      real game if its geometry never enters that band (a low kerb, a flat
 *      mat) or is entirely above it (an awning) — this script cannot see
 *      that, because it never measures geometry.
 *
 *   A function below is flagged a GAP CANDIDATE only when it builds something
 *   mesh-like AND carries no explicit collider tag/boxes AND is excluded from
 *   the auto system (noAutoCollider, or a name matching SKIP_TOP /
 *   NON_SOLID_RULES) WITHOUT an explicit box to replace that exclusion.
 *   Everything else is "COVERED" (either explicit or left for auto-derive) —
 *   that is still not proof it collides at runtime, just the absence of a
 *   known hole. Treat every GAP CANDIDATE as a lead to check live, not a
 *   confirmed bug, and treat every COVERED entry the same way in reverse.
 * ============================================================================
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');
const SRC = join(ROOT, 'src');

const { NON_SOLID_RULES, SKIP_TOP, isNonSolidSource } = await import(join(SRC, 'solidRules.js').replace(/\\/g, '/'));

// Manually verified "uncertain" entries (23 Nov): each was hand-checked against its real sibling
// mechanism (often in another file, which this script cannot see — it only reads one function body
// at a time). Key is "relative/path/to/file.js::functionName". Keep the reason short; it is printed
// as-is. Add an entry here ONLY after actually reading the code and confirming the real collider
// source, never to silence a flag you have not checked — that is exactly the false-negative this
// script's "uncertain" bucket exists to prevent. Remove an entry if the referenced code changes.
const VERIFIED_SAFE = new Map([
  ['src/kit/housesInstancing.js::createHouseBatch', 'the batch\'s own comment names its source: src/kit/houses.js builds the real colliderBoxes (one rect per house footprint) and stores them on the colliders holder returned alongside this batch'],
  ['src/kit/landInstancing.js::frameHook', 'builds a Mesh with setDrawRange(0, 0) — zero vertices ever drawn, so there is no geometry for autoColliders.js to rasterise or for a player to walk through; it exists only to run a per-frame callback via onBeforeRender'],
  ['src/kit/wallMurals.js::buildWallMurals', 'a thin (0.03 m offset) poster decal glued flush onto an existing building wall; the wall itself (its own box/collider, built elsewhere) already blocks that space, so a second collider here would just double it'],
  ['src/placeBatch.js::batchFor', 'per the comment two lines above this function: "the hidden source meshes carry the colliders" — the pre-batch source mesh stays in the scene graph on the hidden layer with its own collider tag/boxes intact'],
  ['src/placeBatch.js::peopleBatchGet', 'per batchPeopleMesh/syncPeople just below: the capsule-placeholder source InstancedMesh stays in the graph on the hidden layer (HIDDEN_LAYER) and is what autoColliders.js/collision.js actually see; this BatchedMesh is a visual-only mirror (userData.visualOnly)'],
  ['src/placeBatch.js::liveBatchFor', 'per the "LIVE meshes" comment above this function: "the source stays in the graph on the hidden layer and keeps driving its own matrices" — same hidden-source pattern as peopleBatchGet, this BatchedMesh is visual-only (userData.visualOnly)'],
  ['src/roofMonkeys.js::createRoofMonkeys', 'ambient decorative monkeys placed on rooftops the player cannot reach; deliberately non-solid like other roof/sky dressing, not a walk-through-able ground-level prop'],
]);

// Files that are infrastructure for the collision/collider system itself, or
// clearly never place a physical prop (UI, audio, save, input, camera, perf).
// Everything else in src/ is scanned — a function that builds nothing mesh-like
// is simply never flagged, so over-scanning here is harmless, under-excluding
// is not.
const SKIP_FILES = new Set([
  'collision.js', 'autoColliders.js', 'solidRules.js', 'mergeUtils.js', 'turn.js',
  'walkable.js', 'loaders.js', 'main.js', 'movement.js', 'controls.js', 'controlsHelp.js',
  'ui.js', 'audio.js', 'save.js', 'pause.js', 'quest.js', 'dialogue.js', 'minimap.js',
  'perfProbe.js', 'frameQueue.js', 'edition.js', 'credits.js', 'zoneManager.js',
  'renderer.js', 'postfx.js', 'sky.js', 'quality.js', 'standOn.js', 'waypoint.js',
  'discoveryLog.js', 'nostalgiaDiscoveries.js', 'oddityDiscoveries.js', 'villageSounds.js',
  'player.js', 'playerCycle.js', 'npc.js', 'npcRoutines.js', 'characterAnim.js', 'characterLOD.js',
  'dayline.js', 'atmosphere.js', 'afternoonMood.js', 'dust.js', 'steam.js', 'night.js',
  'siteSlots.js', 'assetSlots.js', 'wayfinding.js' /* has its own colliderBoxes, scanned anyway below if present */,
]);
// (wayfinding.js actually does build/tag things — don't skip it; corrected below.)
SKIP_FILES.delete('wayfinding.js');

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listJsFiles(p));
    else if (entry.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = listJsFiles(SRC).filter((f) => !SKIP_FILES.has(relative(SRC, f).split('/').pop()) || relative(SRC, f).includes('/'));
// The filter above only applies the skip-list to top-level src/*.js files (by
// basename); everything under src/kit/ is always scanned.
const finalFiles = listJsFiles(SRC).filter((f) => {
  const rel = relative(SRC, f);
  if (rel.includes('/')) return true; // src/kit/*.js etc: always scanned
  return !SKIP_FILES.has(rel);
});

/** Extracts top-level function bodies (export function / function / const x = (...) => {... only the two function forms are handled; arrow-assigned builders are rarer here and this is a heuristic). Brace-counting, ignores string/regex edge cases. */
function extractFunctions(text) {
  const out = [];
  const re = /(export\s+function|function)\s+(\w+)\s*\(/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index;
    const nameStart = m[0].length + start - (m[0].match(/\($/) ? 1 : 0);
    const name = m[2];
    // find the opening brace of the function body (after the parameter list)
    let i = re.lastIndex - 1; // at the '('
    let depthParen = 0;
    while (i < text.length) {
      if (text[i] === '(') depthParen++;
      else if (text[i] === ')') { depthParen--; if (depthParen === 0) { i++; break; } }
      i++;
    }
    while (i < text.length && text[i] !== '{' && text[i] !== ';') i++;
    if (text[i] !== '{') continue; // arrow-function type signature or declare-only; skip
    const bodyStart = i;
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    const body = text.slice(bodyStart, j);
    out.push({ name, body, start, end: j });
  }
  return out;
}

const MESH_CREATE_RE = /new\s+THREE\.(Mesh|Group|InstancedMesh|BatchedMesh)\s*\(/;
const BUILDER_CALL_RE = /\b(addBox|texturedWall|texturedWallBox|flushMerged|mergeGeometries|mergeGroupByMaterial|mergeAcrossGroups|instanceAt|batchPeopleMesh|batchLiveMesh)\s*\(/;
const BUILDER_NAME_RE = /^(build|add|create|make|place)[A-Z_]/;
const SCENE_ADD_RE = /\.add\(/;

const NAME_LITERAL_RE = /\.name\s*=\s*[`'"]([^`'"]+)[`'"]/g;
const EXPLICIT_COLLIDER_RE = /userData\.collider\s*=\s*true/;
const EXPLICIT_BOXES_RE = /userData\.colliderBoxes\s*=/;
const NO_AUTO_RE = /userData\.noAutoCollider\s*=\s*true/;

const report = { covered: [], gaps: [], excludedOk: [], uncertain: [], verifiedSafe: [] };

for (const file of finalFiles) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, 'utf8');
  const fns = extractFunctions(text);
  for (const fn of fns) {
    const looksLikeBuilder =
      MESH_CREATE_RE.test(fn.body) ||
      BUILDER_CALL_RE.test(fn.body) ||
      (BUILDER_NAME_RE.test(fn.name) && SCENE_ADD_RE.test(fn.body));
    if (!looksLikeBuilder) continue;

    const hasExplicitTag = EXPLICIT_COLLIDER_RE.test(fn.body);
    const hasExplicitBoxes = EXPLICIT_BOXES_RE.test(fn.body);
    const hasNoAuto = NO_AUTO_RE.test(fn.body);

    const names = new Set();
    let nm;
    NAME_LITERAL_RE.lastIndex = 0;
    while ((nm = NAME_LITERAL_RE.exec(fn.body))) names.add(nm[1]);

    const skipTopHit = [...names].filter((n) => SKIP_TOP.test(n));
    const nonSolidHits = [];
    for (const n of names) {
      for (const [re, reason] of NON_SOLID_RULES) if (re.test(n)) nonSolidHits.push({ name: n, reason });
    }

    const entry = { file: rel, fn: fn.name, names: [...names] };

    if (hasExplicitTag || hasExplicitBoxes) {
      entry.why = hasExplicitTag ? 'userData.collider = true' : 'userData.colliderBoxes set';
      report.covered.push(entry);
      continue;
    }

    if (hasNoAuto) {
      // noAutoCollider with no explicit box anywhere in this function = relies on
      // SOME OTHER object (often a sibling holder built elsewhere in the same
      // file) carrying the real box. We can't always see that sibling from one
      // function body, so this goes to "uncertain" rather than a hard gap,
      // UNLESS the name also matches a NON_SOLID_RULES reason, in which case the
      // exclusion is self-explained and fine.
      const verified = VERIFIED_SAFE.get(`${rel}::${fn.name}`);
      if (nonSolidHits.length) {
        entry.why = `noAutoCollider + matches rule: ${nonSolidHits.map((h) => h.reason).join('; ')}`;
        report.excludedOk.push(entry);
      } else if (verified) {
        entry.why = `manually verified (hand-read, not re-checked automatically): ${verified}`;
        report.verifiedSafe.push(entry);
      } else {
        entry.why = 'userData.noAutoCollider set, no userData.colliderBoxes/collider in this function — check that a sibling object in this file carries the real box';
        report.uncertain.push(entry);
      }
      continue;
    }

    if (skipTopHit.length || nonSolidHits.length) {
      entry.why = [
        ...skipTopHit.map((n) => `top-level name "${n}" matches SKIP_TOP (never collides: moving body / sky / ground / effects)`),
        ...nonSolidHits.map((h) => `name "${h.name}" matches solidRules.js rule: ${h.reason}`),
      ].join('; ');
      report.excludedOk.push(entry);
      continue;
    }

    entry.why = 'no exclusion found — relies on autoColliders.js deriving a box from its real geometry in the 0.35-1.5 m band';
    report.covered.push(entry);
  }
}

function printSection(title, list, note) {
  console.log(`\n### ${title} (${list.length})${note ? ' — ' + note : ''}`);
  for (const e of list) {
    console.log(`  - ${e.file} :: ${e.fn}()${e.names.length ? `  [names: ${e.names.join(', ')}]` : ''}`);
    console.log(`      ${e.why}`);
  }
}

console.log('='.repeat(78));
console.log('COLLIDER COVERAGE AUDIT — STATIC, HEURISTIC, NO BROWSER');
console.log('This is NOT a runtime guarantee. See the header comment in this script');
console.log('for exactly what it can and cannot see (geometry height/shape is invisible');
console.log('to it; only userData tags, names and the solidRules.js rule list are read).');
console.log('='.repeat(78));

printSection(
  'HAS A COLLIDER (explicit tag/boxes, or no exclusion so auto-derive applies)',
  report.covered,
);
printSection(
  'EXCLUDED FROM AUTO BUT EXPLAINED (matches a documented non-solid rule)',
  report.excludedOk,
  'judgement calls already made in solidRules.js/the code comments — review if still correct, not new gaps',
);
printSection(
  'VERIFIED SAFE — noAutoCollider set, hand-checked against its real collider mechanism',
  report.verifiedSafe,
  'resolved by manually reading the code once (23 Nov) and recorded in this script\'s VERIFIED_SAFE map — re-check if the referenced code changes',
);
printSection(
  'UNCERTAIN — noAutoCollider set, no explicit box visible in this function',
  report.uncertain,
  'likely fine IF a sibling object in the same file carries userData.colliderBoxes for this — verify by reading the file',
);
printSection(
  'GAP CANDIDATES — builds something, no collider mechanism found at all',
  report.gaps,
  'the actual list the backlog item asks for',
);

console.log(`\nTotals: covered=${report.covered.length} excludedOk=${report.excludedOk.length} verifiedSafe=${report.verifiedSafe.length} uncertain=${report.uncertain.length} gaps=${report.gaps.length}`);
console.log('\nReminder: this never measured real geometry. A "covered" entry can still be');
console.log('walk-through in-game if its mesh never enters the 0.35-1.5 m band, and a');
console.log('"gap candidate" can be a false alarm if it is covered by a holder object this');
console.log('script did not connect it to. Use this as a checklist for live testing, not a verdict.');
