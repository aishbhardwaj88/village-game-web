# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run, real code change). CI check pending on this push.

## This run
- git fetch + checkout -B main origin/main: HEAD matched origin/main, no divergence.
- Map-position cleanup, continued: nudgeGalis() in layoutSnap.js mutated layout.roads
  (shift/narrow a gali) before snapLayout's 2nd round, but layout-pack.mjs always ships
  roads exactly as drawn (her 24-26 Nov rule: roads never move, buildings do) - so some
  houses scored "clear" against a gali that never shipped, then stayed on the real one.
  Made nudgeGalis report-only (no longer writes pts/width back).
- Repacked: 120 -> 117 failures. On-road 68 -> 44 (-24, real fixes now). Overlaps 25 ->
  46 (+21, house-vs-house back-wall only, 0.05-0.16 m, no named place) - pushing houses
  off the real gali lands them on the row behind. Net fewer, visible defect traded for a
  near-invisible one; flagged in NEEDS_YOU. missions-check 399/0/3 unchanged, Tier 1 clean.

## Current state
- Feature-complete against GAME_COMPLETE.md; map-position cleanup now at 117 failures
  (was 120), still has a real driver - pick up next run if time allows.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly done
  (dup fetch fixed, rest parked). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] parked.

## Next 5 items
1. Map-position cleanup: 117 failures (27 front-face, 44 on-road, 46 overlap) - per-item
   look next; `node tools/layout-tests.mjs --verbose`.
2. clipGalis() may have the same discard-leak nudgeGalis did (its trims never ship
   either) - not yet checked, needs its own careful look.
3. House atlas n/r + water-tank fix need real-browser confirmation - her own machine.
4. CC0 prop sourcing: proxy-403, not a code task until that changes.
5. Zone streaming pixel-rule: broad refactor, real regression risk, scoped only.

## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.

## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first.
- HEAD can show detached/stale vs origin/main - always `git fetch` fresh before judging.
- Headless chromium crashes ("Target crashed") - screenshot.js/world-validator.js/
  regression-check.js hit this; verify via code reading + Tier 1 (A7) instead.
- A full repack (`node tools/layout-pack.mjs`) now takes ~8.5 min - budget for it.
