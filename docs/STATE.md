# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 9). No code change; CI green on 68627f4, missions 399/0/3.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI confirmed green on 68627f4 (run 1475, success) via Actions API.
- Checked docs/NEEDS_YOU.md top entries: no new answer from her since 25 Nov (same long
  open list, nothing new).
- Per A6/project rule (never invent audits or tidying to fill a run), did not re-run
  the LOOKS LIST / BACKLOG re-derivation again - identical result logged on runs 3-8
  today already. Did not retest the CC0 proxy again today either (same policy).
  All 7 ACTIVE BACKLOG items still blocked for the same reasons
  (her-call/real-browser/CC0-403/out-of-scope/no-reworked-place-to-apply-to).
  9 runs flat today - next real driver is an answer from her in NEEDS_YOU.md.
## Current state
- Feature-complete against GAME_COMPLETE.md. Nothing newly unblocked this run.
- Why every [ACTIVE] BACKLOG item is still blocked (unchanged from runs 3-8):
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
