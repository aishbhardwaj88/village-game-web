# State - rewritten every run, max 40 lines
Last updated: 26 Nov ~22:xx (scheduled run). Docs-only. LAST_FULL_PASS=3362c4f (unchanged).
## This run
- Re-tested the 3 standing blockers (not a repeat-log trust): container's browser
  support changed. CC0 proxy still 403. Map-lock still unanswered (project doc
  checked too, unchanged wording).
- Real finding: `node tools/world-validator.js` now gets PAST checks 1-3 here, a
  first (previously 0/300s). Found one real bug: parked tractor/cart overlap a wall
  (logged in BACKLOG, not nudged blind - stale comment trail there). Still crashes
  at check 4/5 (heavy geometry sampling, browser dies mid-sample). school_bell
  "float" is NOT a bug - src/props.js already documents its 0.12m verandah floor.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged across
  6+ passes - needs her verdict or a new hand-placement idea, not another pass.
- LOOKS LIST 1-8: all done/parked. "Looks fixes ready" line stands in NEEDS_YOU.
- 6 [ACTIVE] BACKLOG items, all blocked: architecture/texture-pipeline need a
  reworked place ([PAUSED-MAP]); CC0 sourcing needs the proxy; M7 NPC needs
  draw-call headroom; shader-warmup + new vehicle-overlap item need the browser to
  survive past check 3 (see container note).
- Her "is the 25 Nov map locked for good?" still open - the root blocker behind the
  flat-run streak.
## Next 5 items
1. Map-lock answer / CC0 proxy: nothing to do but wait - don't re-ask (A6).
2. If CC0 proxy works: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If map-lock answered yes: unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md checklist).
4. Find the tractor/cart's actual overlapping wall (colliders have no name - needs
   a different approach) and fix for real, not another guess.
5. Retry world-validator check 4/5 each run now that 1-3 pass; if it survives, M7
   headroom and shader-warmup (item 7) become answerable.
## Blockers
- [PAUSED-MAP]: her map-lock answer, unchanged.
- CC0 proxy (polyhaven/ambientcg): 403, re-tested 26 Nov, unchanged.
- Real browser: PARTIAL now (see container note), no longer flat "unavailable".
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD can
  show detached/stale - `git fetch` fresh first.
- check-material-clone script is check-material-clone.mjs, not .js. layout-pack.mjs
  (--check too) takes minutes, don't run foreground; layout-tests.mjs is fast.
- 26 Nov: headless chromium no longer flat "Target crashed" - world-validator ran
  past checks 1-3 (a first), crashing at check 4/5's heavy per-mesh sampling (likely
  memory). Two bare-bones probes still timed out ~45s - real but flaky, don't assume
  fully broken OR fixed.
