# State - rewritten every run, max 40 lines
Last updated: 25 Nov ~23:1x UTC (scheduled run). LOOKS LIST items 1/3/4/5 confirmed done in
live code. Item 6 (cycle) confirmed NOT a regression: 25/32 km/h is her own 25 Nov in-game
verdict overriding the 24 Nov 20/27 ask (see src/main.js:260-261 comment) - do not "fix" it
back to 20/27. Item 2 (chauraha buildings) and the rest of item 7 stay open, genuinely blocked
(her building names; map-lock question; no working browser in this container).
No code change this run (5th run in a row with this same settled result, repo byte-identical
to the last run) - not re-auditing further per A6; next real trigger is either her answer in
NEEDS_YOU or a new playtest note, or a concurrent session landing a new commit.

## This run
- 25 Nov ~23:xx scheduled run: CI green on c0873b7 (run 1370). missions-check 0 fail (399 pass, 3 warn). build:unchecked ok.
- Temple/sabzi front: packed mapData already has temple front -z (frontYaw 3.12) and sabzi as drawn (AS_DRAWN in layoutSnap.js); the 152 deg turn is not in current data, nothing to fix.
- Moved-place coords: anchors.js/mapPlan.js hold old base coords that placeMoves/layout override; not re-audited (A6).
- Load size before Play (10.7 MB) cuts need her call (NEEDS_YOU, already open); no browser here to measure.

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
