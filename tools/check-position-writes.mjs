#!/usr/bin/env node
/**
 * STATIC, NO-BROWSER check for docs/BACKLOG.md's A0 item: "Route every NPC and
 * animal through the same collision resolver the player uses; no routine sets
 * position directly without a collision check."
 *
 * This item has been re-verified by hand, from scratch, in three separate build
 * cycles in a row (docs/handoff.md 23 Nov entries 16/17, 24 Nov entry 18) because
 * the screenshot/world-validator render pipeline is broken in this container and
 * each one re-ran the same `grep -rnE '\.(x|z)\s*\+=|\.position\.(x|z)\s*='`
 * command by hand to look for a new offender. This script is that grep, kept as a
 * real tool instead of a re-typed command, with the reasoning for every existing
 * hit recorded once instead of re-derived every cycle. Run it any time; it needs
 * nothing but Node, so unlike world-validator.js/collision-test.js it never OOMs
 * here.
 *
 * ============================================================================
 * THIS IS A HEURISTIC TEXT SCAN, NOT A RUNTIME GUARANTEE.
 * It never runs three.js, never drives the real resolver, and never measures a
 * real wall. A hit is auto-cleared only when a resolveMove/resolveOrientedMove/
 * resolveOrientedCollisions/resolveCollisions call sits within a few lines of it
 * in the same file (the same per-frame step almost certainly already resolved
 * the body before or after this line touches its coordinates directly - e.g.
 * converting a resolved oriented-box centre back to the group's own anchor, or
 * clamping an already-resolved position to the world edge), or when it sits
 * inside a GLSL template-literal shader string (vertex displacement, never a
 * real position write). Everything else must be in the EXEMPT table below, with
 * a reason a human or agent actually read the code and confirmed - never add an
 * entry there just to silence a hit. A hit in neither category is a GAP
 * CANDIDATE: a lead to read and fix (route it through the resolver, or add it to
 * EXEMPT with the reason), never a confirmed bug by itself.
 * ============================================================================
 *
 * Usage: node tools/check-position-writes.mjs   (exits 1 on any GAP CANDIDATE)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');
const SRC = join(ROOT, 'src');

// The resolvers themselves never appear in their own report (every hit in these two files
// IS the collision system, not a caller of it).
const SKIP_FILES = new Set(['movement.js', 'collision.js']);

// Hand-verified (reasoning written once, here, after actually reading the surrounding code -
// see this script's own header). Re-check the listed lines if the referenced code changes;
// a line-number drift alone is not a reason to doubt the entry, re-read it to be sure.
const EXEMPT = [
  {
    file: 'npcRoutines.js', match: /npcGroup\.position\.(x|z) \+=/,
    reason: "createWaypointRun's own documented rooftop-chase leg (M6 monkey): gated by " +
      '`(target.y ?? 0) > 0.5 || npcGroup.position.y > 0.5`, with a doc comment right above the ' +
      'function explaining collision is 2D/ground-plane only and an elevated leg deliberately ' +
      'walks over the walls beneath it, same as every other NPC leg once back at ground level.',
  },
  {
    file: 'roadEvents.js', match: /player\.position\.(x|z) = nx/,
    reason: 'the road-crossing goat herd nudging a too-close player sideways (not the player\'s own ' +
      'movement): guarded by `clearAt(nx, nz, 0.45)` (checks the destination circle against ' +
      'staticBoxesNear, the same static-collider source resolveMove uses) immediately before the write, ' +
      'by `player.parent === scene` (skips this entirely while mounted on a vehicle, where the player ' +
      'group is reparented), and by a push capped at ~0.22 m (`(0.62 - d) * 0.35` at d -> 0) - too small ' +
      'to tunnel any wall even without the swept-substep check resolveMove uses for continuous movement.',
  },
  {
    file: 'waypoint.js', match: /glowMesh\.position\.(x|z) =/,
    reason: 'the objective waypoint glow (mesh name "waypoint_glow", in world-validator.js\'s own ' +
      'non-solid EXCLUDE set) - a ground decal that follows the current objective point, never a body ' +
      'anyone can walk into.',
  },
  {
    file: 'main.js', match: /\.position\.(x|z) = THREE\.MathUtils\.clamp\(/,
    reason: 'a world-edge boundary clamp (keep the player/vehicle inside GROUND_HALF_EXTENT/GROUND_HALF_Z), ' +
      "applied every time right after the real resolver already ran earlier in the same step function " +
      '(movePlayerBy/stepCycle call resolveMove/resolveOrientedMove inline; stepTractorTrolleyPhysics and ' +
      'the stepVehicle() dev hook call it through moveSmallVehicle(), which itself calls resolveMove/' +
      'resolveOrientedMove/resolveOrientedCollisions - see that function a few lines above - so the text-only ' +
      "nearby-call check above can't always see it) - this is about staying on the map, never about a wall.",
  },
  {
    file: 'kit/housesPlan.js', match: /r\.x \+= \(dx \/ dist\)/,
    reason: 'a build-time layout solver (push overlapping house footprints apart while generating the house-kit ' +
      'plan), not a runtime scene body: it mutates a plain `{x, z, corners}` record in an array, long before ' +
      'any of it becomes a THREE object, and explicitly gives up and reports `solidOverlap` rather than let a ' +
      'house move into a road/another house (see the surrounding `hitsAnotherHouse`/`hitsRoad` checks) - there ' +
      'is no live body here for a player/vehicle/NPC to ever interact with mid-nudge.',
  },
];

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

const RESOLVER_CALL = /resolveMove\(|resolveOrientedMove\(|resolveOrientedCollisions\(|resolveCollisions\(/;
const HIT_PATTERN = /\.(x|z)\s*\+=|\.position\.(x|z)\s*=/;

const files = listJsFiles(SRC).filter((f) => !SKIP_FILES.has(relative(SRC, f)));

const autoSafe = [];
const exempt = [];
const gaps = [];

for (const file of files) {
  const rel = relative(SRC, file);
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  // Track whether each line sits inside a template literal (`...`), so GLSL shader strings (vertex
  // displacement written as real-looking JS, e.g. `transformed.x += ...`) don't get flagged as a real
  // position write. Heuristic: count un-escaped backticks seen so far; odd = inside one. Good enough
  // for this codebase's shader strings, which are always a single `` `...` `` block per material.
  let inTemplate = false;
  const insideTemplateAt = new Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    insideTemplateAt[i] = inTemplate;
    const backticks = (lines[i].match(/`/g) || []).length;
    if (backticks % 2 === 1) inTemplate = !inTemplate;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!HIT_PATTERN.test(line)) continue;
    if (insideTemplateAt[i]) { autoSafe.push({ rel, n: i + 1, line: line.trim(), why: 'inside a GLSL template-literal shader string' }); continue; }

    const windowStart = Math.max(0, i - 6), windowEnd = Math.min(lines.length, i + 7);
    const nearby = lines.slice(windowStart, windowEnd).join('\n');
    if (RESOLVER_CALL.test(nearby)) { autoSafe.push({ rel, n: i + 1, line: line.trim(), why: 'a resolveMove/resolveOrientedMove/resolveOrientedCollisions/resolveCollisions call sits within 6 lines' }); continue; }

    const ex = EXEMPT.find((e) => e.file === rel && e.match.test(line));
    if (ex) { exempt.push({ rel, n: i + 1, line: line.trim(), reason: ex.reason }); continue; }

    gaps.push({ rel, n: i + 1, line: line.trim() });
  }
}

console.log(`check-position-writes: ${files.length} files scanned, ${autoSafe.length} auto-cleared (resolver nearby / shader string), ${exempt.length} hand-exempted, ${gaps.length} gap candidate(s)\n`);

if (exempt.length) {
  console.log('### HAND-EXEMPTED (reason verified by reading the code - re-check if the referenced code changes)');
  for (const e of exempt) console.log(`  - src/${e.rel}:${e.n}  ${e.line}\n      ${e.reason}`);
  console.log('');
}

if (gaps.length) {
  console.log('### GAP CANDIDATES - a routine may be writing position with no collision check at all');
  for (const g of gaps) console.log(`  - src/${g.rel}:${g.n}  ${g.line}`);
  console.log('\nTreat each as a lead to read, not a confirmed bug: route it through resolveMove/resolveOrientedCollisions if it really is an unchecked per-frame write, or add it to this script\'s EXEMPT table with the reason once confirmed safe (e.g. a one-time position.set placement, a build-time layout solver on plain data, not a live scene body).');
} else {
  console.log('No gap candidates: every direct .x/.z/.position write in src/ (outside movement.js/collision.js) is either next to a real resolver call, inside a shader string, or in the hand-verified EXEMPT table above.');
}

process.exit(gaps.length ? 1 : 0);
