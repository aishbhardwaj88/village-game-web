# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 24). Real code change: fixed the on-road wall-drop
filter (trims to clear stretch) + a live boot-crash in src/wallWriting.js (7 stale
wall-decal coords since the 27 Nov wall re-anchor, one threw uncaught right after
wallWriting and halted main.js's boot - likely why the game hung at "Loading 0%").
Verified live (console error gone, game boots and renders).
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- Fixed src/mapCompoundWalls.js: trims each wall run to its clear-of-road stretch
  instead of dropping the whole run - restores hidden pieces on 7 walls (Bus stop,
  Old mansion, Village TV house, Tubewell, Jain temple, Jalebi stall, 1/4 of
  gurudwara's); anganwadi's wall measured fully inside the road on all 4 stretches,
  confirmed nothing to restore, her call stands (NEEDS_YOU updated with the numbers).
- Found + fixed src/wallWriting.js's 7 stale wall-decal coordinates (verifying the
  above live surfaced an uncaught exception that was silently halting boot since
  commit 5a23bce). Re-derived correct coords from old/new point-index correspondence.
- Tier 1 pass (build:unchecked, licence-audit, check-dup-models, check-material-clone,
  place-visibility-check) + missions-check 399/0/3, unaffected. Pushed, confirm CI.
## Current state
- Feature-complete against GAME_COMPLETE.md. Remaining BACKLOG ACTIVE items: lane
  continuity, architecture rule, texture pipeline verify, NPC path validation, CC0
  prop sourcing (403), M7 NPC, loadLandMap (shops-file-owner block) - all blocked
  (GATED-HER taste, CC0 403, draw-call headroom, needs-real-browser, file-ownership).
## Next 5 items
1. Confirm CI green on this run's commit (gh Actions API) before anything else.
2. Lane continuity walk-test (needs a real browser - try once, don't loop on it).
3. NPC/animal path validation - same real-browser caveat as item 2.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. Watch NEEDS_YOU for her answer on anganwadi wall/"Tea stall at the square" id.
## Known about this container
- node_modules missing on fresh container - `npm ci` first (don't trust the folder's
  mere existence, check `three`/`postprocessing` are really there). HEAD can show
  detached/stale - `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- A one-off Playwright screenshot script DOES work here (full chrome binary, click
  #play-btn not text=Play - 2 matches, wait ~9s then ~15s more, run from repo dir).
  `npm run build`'s own browser steps are a separate, flakier story, don't conflate.
- reference-from-unity/ is not present in this container (her-machine only); use
  docs/layout/approved-map-2026-11-25.json as the locked map source.
- CC0 proxy (polyhaven.com, ambientcg.com) still 403 as of last test - don't
  re-test more than about once a day.
