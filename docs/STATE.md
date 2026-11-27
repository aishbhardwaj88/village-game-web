# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 16). Real code change this run.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- Fixed src/mapCompoundWalls.js: 24 roadside compound walls were still at their 1-Nov
  positions, never carried when their places moved in the 25 Nov rebuild (drift
  7-150 m vs docs/layout/approved-map-2026-11-25.json). Re-anchored 21 via the map's
  own rotate-about-place-then-translate recipe; removed "Small shrine" (7 Nov
  no-shrines order); left "Tea stall at the square" (no confident match - filed).
- Side effect filed in NEEDS_YOU.md: gurudwara's/anganwadi's re-anchored walls now
  land on the new road network and get dropped by the on-road filter - no wall
  right now, needs her call.
- Archived "far-eastern cluster new house row + MAP.md elevation" BACKLOG line:
  code-verified (housesPlanData.json/houses.js already use the locked map's
  position/ry; elevation follows terrain at runtime) - no code gap, taste call only.
- Verified: Tier 1 (licence-audit, check-dup-models, check-material-clone,
  place-visibility-check) + build:unchecked pass. world-validator crashed with an
  unrelated TypeError, matches the documented container limit (A7), not chased.
## Current state
- Feature-complete against GAME_COMPLETE.md. Remaining BACKLOG ACTIVE items: lane
  continuity, architecture standing rule, texture pipeline verify, NPC path
  validation, CC0 prop sourcing (403), MAP.md lanes/kerbs/drains look, M7 NPC,
  loadLandMap (shops-file-owner block) - all blocked same as last run (GATED-HER
  taste verdict, CC0 403, draw-call headroom, needs-real-browser, file-ownership).
## Next 5 items
1. Lane continuity walk-test (needs a real browser - try once, don't loop on it).
2. NPC/animal path validation - same real-browser caveat as item 1.
3. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
4. If the shops worker can coordinate: loadLandMap() reconciliation.
5. Watch NEEDS_YOU for her answer on gurudwara/anganwadi walls-on-road and the
   "Tea stall at the square" identity; act once she answers.
## Known about this container
- node_modules missing on fresh container - `npm ci` first. HEAD can show detached/
  stale - `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- A real in-browser check (screenshot/regression-check/world-validator) rarely
  finishes here (headless-shell crashes, chrome hangs on blocked outbound calls).
  Don't keep retrying same-day.
- reference-from-unity/ is not present in this container (her-machine only); use
  docs/layout/approved-map-2026-11-25.json as the locked map source.
