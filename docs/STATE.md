# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 3). No code change: CI green on 0eb4155 (run 1469), missions 399/0/3, Tier 1 chain fresh-run clean (only pre-existing known budget/character overages already in NEEDS_YOU).
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI confirmed green on 0eb4155 (run 1469) via Actions API.
- Re-checked the LOOKS LIST (1-8) against current code, not a blind re-audit:
  1/3/4/5/6 confirmed done (cycle physics now pedal/sprint-based, no CYCLE_ACCEL
  left); 2 moot (25 Nov map removed chauraha blockers, her answer still open); 7
  settled (map/textures no longer double-shipped, shader warm-up already gated);
  8 settled (missions 399/0/3).
- Ran Tier 1 fresh (build:unchecked + licence-audit + check-dup-models +
  check-material-clone + place-visibility-check): all PASS, only known pre-
  reported budget/character overages (same figures as NEEDS_YOU, not new).
- BACKLOG's 7 ACTIVE items all still blocked (her-call/real-browser/CC0-403/
  rework-only/out-of-scope). No new unblocked item found.
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
