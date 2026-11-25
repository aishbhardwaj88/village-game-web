# State - rewritten every run, max 40 lines
Last updated: 25 Nov ~19:4x UTC (scheduled run). HEAD 016660e, CI green. No code change; list items settled.
f12d868+80115da - not touched by this run; CI green on it).
No code change this run - nothing unblocked, see below. LOOKS LIST 1-8 stay done/parked, still true.
Item 2 (chauraha road buildings) still waiting on her building names (NEEDS_YOU, asked twice, do not
ask again).

## This run
- npm ci re-run (fresh container had no node_modules at all, not just detached HEAD - earlier runs'
  "exists" check was a false read, see container note below). HEAD matched origin/main already,
  reattached local main cleanly. CI green at 80115da (wall posters, deploy run 1348 success).
- layout-tests.mjs: 123 failures (front 27 / on-road 70 / overlap 26) vs last measured 122 - flat,
  not falling. Last commit touching position files (cdd0d46) was ~49 min before this run; the two
  commits since are wall-posters work, unrelated. Ambiguous signal (one-off from 122), and the
  "map locked?" NEEDS_YOU question is still unanswered, so left alone per CLAUDE.md 5a-MAP rather
  than acting on STATE's own prior "safe to pick up" note - that note is now superseded.
- LOOKS LIST 1-8 and all [ACTIVE] BACKLOG items re-confirmed done/parked/blocked (not re-audited
  beyond that, A6): CC0 proxy still 403, shader-warm needs real browser, no place being reworked.

## Current state
- Game is feature-complete against GAME_COMPLETE.md; map-position cleanup (front/on-road/overlap,
  123 failures) has no confirmed active driver right now (last touch ~49 min ago) - watch next run,
  do not pick up yet (5a-MAP + her map-lock question still open).
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] items stay parked.
- Free-props review row (100+ Poly Haven props staged) still unreviewed - NEEDS_YOU, ?at=606,33.

## Next 5 items
1. Re-run `node tools/layout-tests.mjs` next hourly fire; if still flat/rising AND no position
   commits landed meanwhile, treat the concurrent effort as stalled and reconsider (still gated by
   5a-MAP + the open map-lock question - do not fix positions without her yes on that).
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
