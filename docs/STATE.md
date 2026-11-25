# State - rewritten every run, max 40 lines
Last updated: 25 Nov 18:1x UTC (scheduled run). HEAD b67dddc (concurrent chat session's "Roads empty"
series A-H1 + dog/goat-herd wall-collision fix, through 18:0x - not touched by this run).
No code change this run - nothing unblocked, see below. LOOKS LIST 1-8 stay done/parked, still true.
Item 2 (chauraha road buildings) still waiting on her building names (NEEDS_YOU, asked twice, do not
ask again).

## This run
- Fresh container: npm ci run, HEAD was detached-but-equal to origin/main (confirmed via
  merge-base before re-attaching local main - no commits lost). CI green at b67dddc.
- layout-tests.mjs: 122 failures, down from 125 then 129 - concurrent position session still
  progressing, not stalled. Left alone per STATE's own plan + 5a-MAP.
- LOOKS LIST 1-8 and all [ACTIVE] BACKLOG items re-confirmed done/parked/blocked (not re-audited
  beyond that, A6): CC0 proxy still 403, shader-warm needs real browser, no place being reworked.
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
