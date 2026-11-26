# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run, 8th flat). HEAD f73d680, CI green (run 1376).

## This run
- git fetch + checkout -B main origin/main: HEAD matched origin/main exactly, no
  divergence, nothing lost.
- CI green on f73d680 (run 1376, success). No new commit from any other worker since
  the last run. docs/NEEDS_YOU.md unchanged (60+ open lines, none marked done by her).
- No code change. Per A6, not re-auditing LOOKS LIST or BACKLOG an 8th time with no
  new input (no new commit, no new her-answer) - only re-confirmed CI and scanned for
  new commits/answers, found none.

## Current state
- Game is feature-complete against GAME_COMPLETE.md; map-position cleanup (front/on-road/
  overlap, 123 failures, flat for 7+ runs now) has no active driver - watch for either a
  new position commit (resume tracking) or her map-lock answer (then pick up).
- LOOKS LIST 1-8 (24 Nov playtest): 1/3/4/5/6 done and live; 2 (chauraha buildings) could
  not be reproduced, logged to NEEDS_YOU with her exact names needed; 7 partly done
  (dup fetch fixed, map-shipped-twice/shader-warm-up parked, PAUSED-MAP/no browser); 8
  (missions/bell/canal) done per STATE history. "Looks fixes ready" line stands in NEEDS_YOU.
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
  fresh before judging divergence.
- Headless chromium crashes ("Target crashed") on any real page.evaluate - screenshot.js/
  world-validator.js/regression-check.js all hit this. Verify via code reading + Tier 1 (A7).
- `node tools/layout-pack.mjs` (full repack) takes ~4.5 min, not "minutes-long" vaguely - budget.
- docs/handoff.md has grown to ~1,900 lines (A3 wants >3-day entries archived) - not touching
  it this run, note-tidying isn't in-scope game work, but it's worth one real cycle sometime.
