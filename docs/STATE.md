# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 4). Temple/sabzi fronts verified vs map, no code change.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI green on f7c06d6 (run 1470). missions 399/0/3; build:unchecked OK (npm ci was needed).
- Temple/sabzi front: NO CHANGE. Packed frontYaw matches approved map (temple 179 deg = faces -z; the 152/-92 deg is the model ry in placeMoves, not the front). Both are AS_DRAWN accepted exceptions (her 25 Nov order). Only 'new_*' and zone points differ from map fronts.
- Hard-coded old coords of moved places (mandi, khalihan, mela, paani_tanki, bhatta, temple): none in src. Only anchors.js sabzi (old-layout base, remapped by placeMoves; leave).
- Load: load-time-test measured 3.61 MB transferred at Play ready (0.14 MB at title); NEEDS_YOU's 10.7 MB uses a different count. Remaining cuts are look calls (start area/building shapes), so not done.
- tools/layout-tests.mjs: 74 FAIL (27 front, 28 on-road, 19 overlap), not in CI/package.json, layout is being uprooted: noted, not fixed.
- Not done: unsliced land-layer builds.
## Current state
- Feature-complete against GAME_COMPLETE.md. Nothing newly unblocked this run.
## Next 5 items
1. Watch NEEDS_YOU for her answers (chauraha blockers, anganwadi wall, free-props
   review row, material board - many open).
2. If a place gets reworked: apply texture-pipeline verify + architecture rule.
3. Lane continuity / live NPC-path trace - try once if a real browser becomes
   available; don't loop on it meanwhile.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. loadLandMap() dup-download fix - needs shops worker or her OK (shopsPlace.js is
   out of this loop's scope otherwise).
## Known about this container
- node_modules missing fresh - `npm ci` first. A fresh checkout's local `main` ref
  can look stale/diverged vs a cached `origin/main` - that's a stale remote-
  tracking ref, not real divergence: `git fetch origin --prune` first, then
  `git checkout -B main origin/main` (confirmed safe this run). No `gh` CLI -
  use mcp__github__actions_list/get.
- `tools/load-time-test.mjs MARKS=1` + a one-off Playwright screenshot script DO
  work here (full chrome, SwiftShader). `npm run build`'s own browser steps
  (world-validator/regression-check/screenshot.js's heavier chain) are flakier.
- reference-from-unity/ not present; use docs/layout/approved-map-2026-11-25.json.
- CC0 proxy (polyhaven/ambientcg/api.polyhaven) still 403 as of 28 Nov (tested run
  2, not retested this run per "don't retest same day").
