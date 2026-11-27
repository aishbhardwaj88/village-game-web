# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 19). No code change this run.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI green on f4a2ce2 (run 1459). missions-check 399 PASS/0 FAIL/3 WARN.
- List re-checked: temple/sabzi fronts settled (as drawn), moved-place coords handled by layoutSnap/placeMoves, pre-Play 10.7 MB = her call (NEEDS_YOU), land-layer yields 8 ms. Nothing new unblocked.
- tools/layout-tests.mjs reports 74 fails (front/on-road/overlap); map is being uprooted, so not chased.
## Current state
- Feature-complete against GAME_COMPLETE.md. Remaining BACKLOG ACTIVE items: lane
  continuity, architecture standing rule, texture pipeline verify, NPC path
  validation, CC0 prop sourcing (403), MAP.md lanes/kerbs/drains look, M7 NPC,
  loadLandMap (shops-file-owner block) - all blocked (GATED-HER taste verdict,
  CC0 403, draw-call headroom, needs-real-browser, file-ownership).
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
- CC0 proxy (polyhaven.com, ambientcg.com) still 403 as of this run - don't re-test
  more than about once a day.
