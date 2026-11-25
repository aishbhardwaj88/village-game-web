# State - rewritten every run, max 40 lines
Last updated: 25 Nov ~22:xx UTC (scheduled run). Fixed: 2 old-layout highway milestones (796.6,-18/82) stood ~100 m off the new highway (z~-122); now skipped under new layout, km stones cover it. Temple/sabzi already AS_DRAWN (see 4dec916). Missions 0 fail, Tier 1 green. Load 10.7 MB cuts still her call.
again this run (3rd run in a row with the same clean result) - not re-auditing further per A6.
No code change this run.

## This run
- Repo-state false alarm: stale cached origin/main made HEAD look divergent (shallow clone,
  merge-base failed). Fresh `git fetch` showed origin/main already at HEAD's tip (1873264) -
  no real divergence. `checkout -B main origin/main` clean, no data lost.
- CI green on 1873264 (run 1363).
- LOOKS LIST 1-8 and BACKLOG [ACTIVE] items: nothing changed since 4dec916's note - no new
  playtest input, no new NEEDS_YOU answer, no place being built/reworked for the ACTIVE items
  to apply to. Did not re-run layout-tests/missions-check (identical input, no new trigger -
  A6/efficiency-rules "no repeat audits").

## Current state
- Game is feature-complete against GAME_COMPLETE.md; map-position cleanup (front/on-road/overlap,
  123 failures, flat for 3+ runs now) has no active driver - watch for either a new position
  commit (resume tracking) or her map-lock answer (then pick up).
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] items stay parked.
- Free-props review row (100+ Poly Haven props staged) still unreviewed - NEEDS_YOU, ?at=606,33.

## Next 5 items
1. Re-run `node tools/layout-tests.mjs` only once a position commit lands or her map-lock answer
   arrives - until then it's a repeat audit, skip it.
2. House atlas n/r + water-tank fix need real-browser confirmation - her own machine can confirm.
3. Zone streaming pixel-rule: broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind.
5. CC0 prop sourcing: proxy-403 on polyhaven/ambientcg, not a code task until that changes.

## Blockers
- [PAUSED-MAP] BACKLOG items: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.

## Known about this container
- node_modules missing on fresh container, every time - always run `npm ci` first.
- HEAD can show detached/divergent from a STALE cached origin/main ref - always `git fetch`
  fresh before judging divergence (25 Nov 21:1x: false alarm, merge-base fails on stale ref but
  resolves clean once fetched). Shallow clone (50-commit history, graft root db68c07).
- Headless chromium crashes ("Target crashed") on any real page.evaluate - screenshot.js/
  world-validator.js/regression-check.js all hit this. Verify via code reading + Tier 1 (A7).
- `node tools/layout-pack.mjs` (full repack) takes ~4.5 min, not "minutes-long" vaguely - budget.
