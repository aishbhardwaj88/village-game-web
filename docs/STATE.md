# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run, real code change). CI check pending on this push.

## This run
- git fetch + checkout -B main origin/main: HEAD matched origin/main, no divergence.
- Picked up the stalled map-position cleanup (123 failures, flat 7+ runs, no active
  driver): layoutSnap.js's snap search ran only 2 passes; raised to 4. Pure algorithm
  change, no hand-edited coordinates. Repacked mapData.json: 123 -> 120 failures (3
  houses' on-road depth fixed, 1 overlap resolved as a side effect), verified by diff
  of the full --verbose failure list: only already-moving houses nudged further, zero
  new failures anywhere. missions-check unchanged (399/0/3). Tier 1 clean (build:
  unchecked, licence-audit, check-dup-models, check-material-clone, place-visibility).
- Committed (code: layoutSnap.js + mapData.json). Still 120 failures open - this is
  one algorithmic pass, not a fix for the rest; see Next items.

## Current state
- Game is feature-complete against GAME_COMPLETE.md; map-position cleanup now at 120
  failures (was 123, see above) - has a driver again, pick up next run if time allows.
- LOOKS LIST 1-8 (24 Nov playtest): 1/3/4/5/6 done and live; 2 (chauraha buildings) could
  not be reproduced, logged to NEEDS_YOU with her exact names needed; 7 partly done
  (dup fetch fixed, map-shipped-twice/shader-warm-up parked, PAUSED-MAP/no browser); 8
  (missions/bell/canal) done per STATE history. "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] items stay parked.
- Free-props review row (100+ Poly Haven props staged) still unreviewed - NEEDS_YOU, ?at=606,33.

## Next 5 items
1. Map-position cleanup: 120 failures left (27 front-face, 68 on-road, 25 overlap, see
   `node tools/layout-tests.mjs --verbose`). Remaining ones are harder than a parameter
   tweak (named places set back from any road, genuine house-pair overlaps) - need a
   per-item look, not another blanket pass. Real work, pick up when time allows.
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
  fresh before judging divergence.
- Headless chromium crashes ("Target crashed") on any real page.evaluate - screenshot.js/
  world-validator.js/regression-check.js all hit this. Verify via code reading + Tier 1 (A7).
- `node tools/layout-pack.mjs` full repack now takes ~10 min (was ~4.5 min before this run's
  4-pass change) - budget for it, don't assume the old number.
- docs/handoff.md has grown to ~1,900 lines (A3 wants >3-day entries archived) - not touching
  it this run, note-tidying isn't in-scope game work, but it's worth one real cycle sometime.
