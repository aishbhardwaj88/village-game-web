# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 6). No code change; CI green on 22e9fb6, map-match-places 46/0 flagged, missions 399/0/3.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI confirmed green on 91ab1d7 (run 1471, success) via Actions API. No build run (Tier 0: docs
  only, no diff) - node_modules was missing fresh, not installed since no code change needed it.
- LOOKS LIST 1-8 and all BACKLOG [ACTIVE] items re-confirmed done/parked/blocked, same reasons as
  the last several runs (see below). No new answers in docs/NEEDS_YOU.md. No new angle found.
## Current state
- Feature-complete against GAME_COMPLETE.md. Nothing newly unblocked this run.
- Why every [ACTIVE] BACKLOG item is still blocked (checked again this run, not just repeated):
  lane continuity + live NPC/wall trace (world-validator check 9) need a real browser - confirmed
  container limit (A7); CC0 prop sourcing blocked by proxy 403 (not retested today, A6); M7 flavour
  NPC needs draw-call headroom, unmeasurable without a real browser; landLayout.js dedup's last
  half needs shopsPlace.js, out of this loop's scope (shops worker) or her OK to cross it; material
  library freeze is GATED-HER (taste verdict pending); architecture/texture-pipeline standing rules
  have no newly-reworked place to apply to this run.
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
- node_modules missing fresh - `npm ci` first when a build is actually needed. A fresh checkout's
  local `main` ref can look stale/diverged vs a cached `origin/main` - that's a stale remote-
  tracking ref, not real divergence: `git fetch origin --prune` first, then
  `git checkout -B main origin/main` (confirmed safe again this run). No `gh` CLI -
  use mcp__github__actions_list/get.
- `tools/load-time-test.mjs MARKS=1` + a one-off Playwright screenshot script DO
  work here (full chrome, SwiftShader). `npm run build`'s own browser steps
  (world-validator/regression-check/screenshot.js's heavier chain) are flakier.
- reference-from-unity/ not present; use docs/layout/approved-map-2026-11-25.json.
- CC0 proxy (polyhaven/ambientcg/api.polyhaven) still 403 as of 28 Nov (tested run
  2, not retested this run per "don't retest same day").
