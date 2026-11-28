# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 24). No code change (A5 exception: one log line).
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- Run 24 (28 Nov): CI green on c7e6391 (run 1490). No new commits from other
  workers since run 23. Did not re-derive LOOKS LIST/BACKLOG (24 identical
  flat runs today, A6). No notification (nothing new).
- Runs 20-23: all CI green, all flat no-op (list settled, BACKLOG blocked same
  reasons). Run 20 archived handoff.md's pre-25-Nov history; flagged the
  NEEDS_YOU stall once via PushNotification, not repeated since.
- NEEDS_YOU.md: all 66 lines still open, oldest since 25 Nov.
## Current state
- Feature-complete against GAME_COMPLETE.md. Nothing newly unblocked this run.
- Every [ACTIVE] BACKLOG item blocked, unchanged since run 3: lane continuity/live
  NPC-wall trace needs real browser (container limit, A7); CC0 sourcing blocked by
  proxy 403; M7 flavour NPC needs draw-call headroom (needs real browser); landLayout
  dedup needs shopsPlace.js (shops worker's file) or her OK; material library freeze
  is GATED-HER; no newly-reworked place for texture-pipeline rule to apply to.
## Next 5 items
1. Watch NEEDS_YOU for her answers (chauraha blockers, anganwadi wall, free-props,
   material board - 66 lines open).
2. If a place gets reworked: apply texture-pipeline verify + architecture rule.
3. Lane continuity/live NPC-path trace - try once if a real browser becomes
   available; don't loop on it meanwhile.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. loadLandMap() dup-download fix - needs shops worker or her OK (shopsPlace.js
   is out of this loop's scope otherwise).
## Known about this container
- node_modules missing fresh - `npm ci` first when a build is needed. Fresh checkout's
  local `main` can look diverged vs cached `origin/main` - stale remote-tracking ref,
  not real divergence: `git fetch origin --prune` then `git checkout -B main
  origin/main` (confirmed safe again this run). No `gh` CLI - use
  mcp__github__actions_list/get.
- `tools/load-time-test.mjs MARKS=1` + a one-off Playwright screenshot work here
  (full chrome, SwiftShader). `npm run build`'s browser steps (world-validator/
  regression-check/screenshot.js) are flakier.
- reference-from-unity/ not present; use docs/layout/approved-map-2026-11-25.json.
- CC0 proxy (polyhaven/ambientcg) still 403 as of 28 Nov (tested run 2, not
  retested since per "don't retest same day").
