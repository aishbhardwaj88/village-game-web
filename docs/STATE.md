# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 18). No code change this run.
LAST_FULL_PASS=3362c4f (Tier 2 browser step crashed, container limit, not a new pass).
## This run
- CI confirmed green on 8cba6db (run 1458) via Actions API.
- Checked the full LOOKS LIST (prompt's items 1-8) against code, not just tags:
  1/3/4/5/6 already done and reported to her (NEEDS_YOU "Looks fixes ready");
  2 (chauraha road-blocking buildings) moot - old map's blockers no longer exist
  since the 25 Nov map, already filed asking her to name any new one; 7 partly
  done (texture double-fetch fixed), map-shipped-twice/shader-warmup parked
  (needs real browser / waits on map, both already filed); 8 (missions+bell+
  canal) confirmed settled, re-ran missions-check.mjs: 399 PASS/0 FAIL/3 WARN,
  same as every recent run.
- Retested the CC0 proxy (polyhaven.com, ambientcg.com): still 403, unchanged.
- No new unblocked BACKLOG work found: all 9 ACTIVE items blocked same as last
  run (GATED-HER taste verdict, CC0 403, needs-real-browser, file-ownership,
  draw-call headroom). No new answers in NEEDS_YOU.md since run 16.
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
