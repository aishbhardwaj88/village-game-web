# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 20). Real code change this run.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- Fixed the 27 Nov ground-shader bug (BACKLOG): gZOn_g/gZR_g/gZN_g/gZDbg_g were
  declared only inside the zones:true GLSL block but read unconditionally by the
  grass-patch check, so the default ground (zones:false) never declared them -
  undeclared-identifier bug by static read. Hoisted the 4 declarations into the
  always-included common block (src/materials.js). Full `npm run build`: licence/
  dup-models/material-clone/place-visibility/vite build all green; world-validator
  still crashes on this container on an unrelated pre-existing issue (dialogue
  undefined, A7 container limit). One-off playwright check (not kept) found zero
  shader/console errors either way, fixed or not - couldn't force the original
  crash to reproduce here, but the bug and fix are unambiguous from the source.
  Full detail: docs/archive/backlog-done.md (27 Nov entry).
- Push pending this run; confirm CI green next run before trusting it further.
## Current state
- Feature-complete against GAME_COMPLETE.md. Remaining BACKLOG ACTIVE items: lane
  continuity, architecture standing rule, texture pipeline verify, NPC path
  validation, CC0 prop sourcing (403), MAP.md lanes/kerbs/drains look, M7 NPC,
  loadLandMap (shops-file-owner block) - all blocked (GATED-HER taste verdict,
  CC0 403, draw-call headroom, needs-real-browser, file-ownership).
## Next 5 items
1. Confirm CI green on this run's commit (gh Actions API) before anything else.
2. Lane continuity walk-test (needs a real browser - try once, don't loop on it).
3. NPC/animal path validation - same real-browser caveat as item 2.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. Watch NEEDS_YOU for her answer on gurudwara/anganwadi walls-on-road and the
   "Tea stall at the square" identity; act once she answers.
## Known about this container
- node_modules missing on fresh container - `npm ci` first (confirmed this run:
  partial node_modules existed with `three`/`postprocessing` missing even though
  the folder was present - don't trust the folder's existence alone, check those
  two packages or just always run npm ci). HEAD can show detached/stale - `git
  fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- A real in-browser check (screenshot/regression-check/world-validator) rarely
  finishes here (headless-shell crashes, chrome hangs on blocked outbound calls).
  Don't keep retrying same-day.
- reference-from-unity/ is not present in this container (her-machine only); use
  docs/layout/approved-map-2026-11-25.json as the locked map source.
- CC0 proxy (polyhaven.com, ambientcg.com) still 403 as of last test - don't
  re-test more than about once a day.
