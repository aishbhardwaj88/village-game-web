# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 2). No code change: CI green on 8bee722 (run 1468), missions 399/0/3, list items still settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB and land layers her call).
verification instead: closed 2 open BACKLOG questions with fresh measurement.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI confirmed green on 021f5a7 (run 1467) via Actions API.
- Ran `tools/roaming-check.mjs` for the first time ever: 0 FAILs, 5230 lane samples
  across 12 roads/3913 m, all on-band and left-of-travel, 24 road ends all
  joins/turn-rounds. Closes the roads/lanes half of "NPC/animal path validation";
  door-routing math half already covered (check-door-routes, 0 gaps, every commit).
  Remaining gap: live wall-mesh trace, needs real browser.
- Ran `tools/load-time-test.mjs MARKS=1` twice (lightweight script, not the hanging
  full chain) against a fresh build:unchecked dist: texWarmed=92 both runs (not
  stuck at 2), modelsReleased fired organically ~12.4-12.9s (not the 9000ms safety
  timeout). RESOLVES the 24 Nov "stuck-slot bug or container artifact?" question -
  was a measurement artifact, moved to archive. Play-ready under throttled-4G+4xCPU
  (33s) is the same pre-existing load-weight issue already in NEEDS_YOU (her call).
- Retested CC0 proxy: still 403, new day, one test taken, don't retest again today.
  No new NEEDS_YOU answers since run 16.
## Current state
- Feature-complete against GAME_COMPLETE.md. Remaining BACKLOG ACTIVE: lane
  continuity, architecture rule, texture pipeline verify, NPC path (live-trace
  half only), CC0 sourcing (403), M7 NPC, loadLandMap (shops-file-owner block).
## Next 5 items
1. Watch NEEDS_YOU for her answers (anganwadi wall, "Tea stall at square", etc).
2. If a place gets reworked: apply texture-pipeline verify + architecture rule.
3. Lane continuity / live NPC-path trace - try once if a real browser becomes
   available; don't loop on it meanwhile.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. loadLandMap() dup-download fix - needs shops worker or her OK (shopsPlace.js is
   out of this loop's scope otherwise).
## Known about this container
- node_modules missing fresh - `npm ci` first. HEAD can show detached/stale -
  `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- `tools/load-time-test.mjs MARKS=1` + a one-off Playwright screenshot script DO
  work here (full chrome, SwiftShader). `npm run build`'s own browser steps
  (world-validator/regression-check/screenshot.js's heavier chain) are flakier -
  don't conflate the two.
- reference-from-unity/ not present; use docs/layout/approved-map-2026-11-25.json.
- CC0 proxy (polyhaven/ambientcg/api.polyhaven) still 403 as of 28 Nov.
