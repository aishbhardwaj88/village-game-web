# State - rewritten every run, max 40 lines
Last updated: 25 Nov 17:1x UTC (scheduled run). HEAD ec1982a (concurrent chat session's
position/facing work (16:4x-16:53) then character work (Aunty) - neither touched by this run).
No code change this run - nothing unblocked, see below. LOOKS LIST 1-8 stay done/parked, still true.
Item 2 (chauraha road buildings) still waiting on her building names (NEEDS_YOU, asked twice, do not
ask again).

## This run
- layout-tests.mjs: 125 failures (front 25, on-road 71, overlap 29), down from 129 (25/72/32) -
  concurrent position session still progressing, not stalled. Left alone per STATE's own plan.
- All [ACTIVE] BACKLOG items checked: place-touching rules (none touched this run), CC0 proxy
  still 403 (not re-checked), item 7 shader-warm traced by code reading (texWarmed/modelsReleased/
  loaders.js) - needs real browser to go further, didn't guess-fix blind.
- check-budget: same known breaches as before, already in NEEDS_YOU. No TODO/FIXME in src/.

## Current state
- Game is feature-complete against GAME_COMPLETE.md; map-position cleanup (front/on-road/overlap) is
  the one large active thread, being driven by a concurrent chat session, not stalled.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] items stay parked.
- Free-props review row (100+ Poly Haven props staged) still unreviewed - NEEDS_YOU, ?at=606,33.

## Next 5 items
1. Re-run `node tools/layout-tests.mjs` next hourly fire; if front/on-road/overlap counts are flat or
   rising (not falling), the concurrent effort may have stalled - safe to pick up then.
2. House atlas n/r + water-tank fix need real-browser confirmation - her own machine can confirm.
3. Zone streaming pixel-rule: broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind.
5. CC0 prop sourcing: proxy-403 on polyhaven/ambientcg, not a code task until that changes.

## Blockers
- [PAUSED-MAP] BACKLOG items: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.

## Known about this container
- node_modules missing on fresh container - run `npm ci` first; HEAD detached on stale local main
  (fetch+checkout -B fixes it). Shallow clone (50-commit history, graft root db68c07).
- Headless chromium crashes ("Target crashed") on any real page.evaluate - screenshot.js/
  world-validator.js/regression-check.js all hit this. Verify via code reading + Tier 1 (A7).
- `node tools/layout-pack.mjs` (full repack) takes ~4.5 min, not "minutes-long" vaguely - budget for it.
