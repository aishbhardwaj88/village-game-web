# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 19). No code change.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- Scheduled run 19 (28 Nov): CI green on 17087da (run 1485), missions 399/0/3; list items (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB and land layers her call) unchanged. Prior: run 18, CI green on 88cd3b3. NEEDS_YOU.md still unanswered since
  25 Nov. Per A6/project rule (no repeat audits), did not re-derive LOOKS LIST/BACKLOG again -
  identical to runs 3-17 today (18 flat runs). No code change.
## Current state
- Feature-complete against GAME_COMPLETE.md. Nothing newly unblocked this run.
- Why every [ACTIVE] BACKLOG item is still blocked (unchanged from runs 3-13):
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
  2, not retested since per "don't retest same day").
