# State - rewritten every run, max 40 lines
Last updated: 28 Nov (scheduled run 7). No code change; CI green on c33685d, missions 399/0/3.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI confirmed green on c33685d (run 1473, success) via Actions API.
- npm ci (node_modules was missing fresh again) then missions-check.mjs re-run clean: 399/0/3,
  same 3 pre-logged WARNs (temple_bell ambient, 2 milk-stop back-of-gali spots).
- Checked docs/NEEDS_YOU.md top entries: no new answer from her since 25 Nov (the unauthorized
  BACKLOG.md header question is still the newest, still open).
- Per A6, did not re-run the full LOOKS LIST / BACKLOG re-derivation again - identical result
  logged on runs 3, 4, 5, 6 today already. All 7 ACTIVE BACKLOG items still blocked for the
  same reasons (her-call/real-browser/CC0-403/out-of-scope/no-reworked-place-to-apply-to).
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
