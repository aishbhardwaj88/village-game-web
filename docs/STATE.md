# State - rewritten every run, max 40 lines
Last updated: 25 Nov 16:2x UTC (scheduled run). HEAD 52c6cb3 (another session's live position-fix
work landed mid-run, twice, while this run was checking - see below). Tier 1 clean, missions-check
not re-run (no code change of mine survived rebase).
LOOKS LIST 1-7 + item 8 stay done/parked, still true. Item 2 (chauraha road buildings) still waiting
on her building names (NEEDS_YOU, asked twice, do not ask again).
CORRECTION to last run's container note: the chaurahaEdges.js tea/tailor-vs-sqx_235/236 "overlap" is
NOT a live bug - that whole BUILDINGS list is `.filter(!isNewLayout())` and isNewLayout() defaults
true, so it never renders under the live default map. Dead code, no action needed. Drop this from
future "known about this container" notes.

## This run
- Found `node tools/layout-pack.mjs --check` failing (mapData.json out of sync with its own
  inputsHash - layout-pack.mjs had changed in the prior commit but mapData.json was hand-patched,
  not regenerated). Ran the full repack (4.5 min, data-only, verified same overlap/road-snap counts
  before/after - no semantic change) and committed; a concurrent session had already pushed the
  identical fix, so mine was dropped as a no-op by rebase. Confirmed via diff: harmless.
- A separate chat session is actively driving houses/shops/places/roads/props position work right
  now (7c4ff01, 52c6cb3 landed during this run, same topic as 193d822 before it) - this is the
  named-places "move off lane / face road" effort from her 25 Nov answer. Did not duplicate it.
- `node tools/layout-tests.mjs` current count: 129 failures (front-faces-road 25, on-road 72,
  overlap 32), all in that same in-flight effort's territory (named places, new_sqx shops, new_house,
  washing-line props). Leave this to the chat session already working it; re-measure, don't refix,
  next run if it's still moving.
- CI oddity (not chased further, A6): GitHub Actions `list_workflow_runs` still shows run 1301
  (193d822) as latest; no run appears for 7c4ff01 or 52c6cb3 even though `get_commit` confirms both
  are on origin/main. total_count stuck at 1302 across two checks. Possible missed push-trigger for
  that committer/token - note once, don't keep polling it.

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
