# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run, real code change). CI check pending on this push.

## This run
- git fetch + checkout -B main origin/main: HEAD matched origin/main, no divergence.
- node_modules was missing (container quirk, see below) - ran `npm ci` before any build check.
- Map-position cleanup, continued: clipGalis() in layoutSnap.js had the same discard-leak
  nudgeGalis had (fixed last run) - it mutated layout.roads with a lane-end trim, but
  tools/layout-pack.mjs always ships roads exactly as drawn, so the trim never shipped; it
  only misled the snapLayout round that ran after it into scoring a building "clear" of a
  cut gali-cap that was about to be thrown away. Made clipGalis report-only (same pattern).
- Repacked: 117 -> 116 failures. On-road 44 -> 43 (one real fix). Front-face and overlap
  categories unchanged (27, 46). missions-check 399/0/3 unchanged, Tier 1 clean. Flagged in
  NEEDS_YOU (FYI only, nothing needed from her).

## Current state
- Feature-complete against GAME_COMPLETE.md; map-position cleanup now at 116 failures
  (was 123 three runs ago), still has a real driver - pick up next run if time allows.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly done
  (dup fetch fixed, rest parked). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] parked.

## Next 5 items
1. Map-position cleanup: 116 failures (27 front-face, 43 on-road, 46 overlap) - per-item
   look next; `node tools/layout-tests.mjs --verbose`.
2. The 46 overlaps are mostly house-vs-house back-wall touches (0.05-0.16 m) from the
   nudgeGalis/clipGalis fixes pushing houses off real galis onto the row behind - look at
   whether MAX_BACK or the overlap-undo tolerance in layoutSnap.js can resolve these without
   re-introducing on-road failures.
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
- A full repack (`node tools/layout-pack.mjs`) now takes ~9-10 min (ran in background
  this run while Tier 1 checks ran in foreground) - budget for it, consider backgrounding it.
