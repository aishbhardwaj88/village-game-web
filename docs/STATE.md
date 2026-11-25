# State - rewritten every run, max 40 lines
Last updated: 25 Nov ~21:0x UTC (scheduled run). Temple/sabzi: already kept exactly as the map draws them (AS_DRAWN, front -z, ry -91 deg); no 152 deg turn exists, nothing to fix. Dirt tracks for moved places (mandi, mela, petrol, gaushala) skipped under the new layout (src/dirtTracks.js). Load size 10.7 MB: cuts are her call (NEEDS_YOU), untouched.
nothing unblocked this run. LOOKS LIST 1-8 stay done/parked, still true.
Item 2 (chauraha road buildings) still waiting on her building names (NEEDS_YOU, asked twice, do not
ask again).

## This run
- npm ci re-run (fresh container, node_modules missing - expected, see container note below). HEAD
  matched origin/main; no detach/merge issue this time.
- Tier 1 (build:unchecked + licence-audit + check-dup-models + check-material-clone +
  place-visibility-check): all clean. missions-check: 399 PASS, 0 FAIL, 3 WARN.
- layout-tests.mjs: 123 failures (front 27/on-road 70/overlap 26) - IDENTICAL to last run, and no
  position commit has landed since (git log checked). The concurrent position-fix effort now reads
  as stalled, not a one-off wobble. Still gated: 5a-MAP forbids touching overlaps/on-road/facing
  until the new map is confirmed locked, and her "is the map locked?" question is still open in
  NEEDS_YOU (asked already, not re-asking). Left untouched.
- LOOKS LIST 1-8 and all [ACTIVE] BACKLOG items re-confirmed done/parked/blocked (not re-audited
  beyond that, A6): CC0 proxy still 403, shader-warm needs real browser, no place being reworked
  (so the "architecture: self-contained place" and "texture pipeline" ACTIVE items have nothing to
  apply to this run - they're conditioned on a place being built/reworked).

## Current state
- Game is feature-complete against GAME_COMPLETE.md; map-position cleanup (front/on-road/overlap,
  123 failures, flat for 2+ runs now) has no active driver right now - watch next run for either a
  new position commit (resume tracking) or her map-lock answer (then it can be picked up).
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] items stay parked.
- Free-props review row (100+ Poly Haven props staged) still unreviewed - NEEDS_YOU, ?at=606,33.

## Next 5 items
1. Re-run `node tools/layout-tests.mjs` next hourly fire; if a position commit DID land meanwhile,
   resume tracking the concurrent effort; if still flat with no commits, that confirms stalled (still
   gated by 5a-MAP + the open map-lock question - do not fix positions without her yes on that).
2. House atlas n/r + water-tank fix need real-browser confirmation - her own machine can confirm.
3. Zone streaming pixel-rule: broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind.
5. CC0 prop sourcing: proxy-403 on polyhaven/ambientcg, not a code task until that changes.

## Blockers
- [PAUSED-MAP] BACKLOG items: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.

## Known about this container
- node_modules missing on fresh container, every time - always run `npm ci` first, don't trust a
  quick `ls node_modules | head` (piped through head it reports success even when ls itself failed).
  HEAD can be detached on a stale local main - fetch+checkout -B fixes it. Shallow clone (50-commit
  history, graft root db68c07).
- Headless chromium crashes ("Target crashed") on any real page.evaluate - screenshot.js/
  world-validator.js/regression-check.js all hit this. Verify via code reading + Tier 1 (A7).
- `node tools/layout-pack.mjs` (full repack) takes ~4.5 min, not "minutes-long" vaguely - budget for it.
