# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run). Flat run, nothing newly unblocked. LAST_FULL_PASS=3362c4f (unchanged).
## This run
- Checked all 5 [ACTIVE] BACKLOG items and LOOKS LIST 1-8: nothing newly unblocked.
  2 ACTIVE items are standing rules with no new/reworked place to apply to right now.
- Retried world-validator check 4/5 per last run's suggestion: checks 1-3 still run
  clean (same known stale false positives - tractor/school_bell, already resolved),
  check 4/5 heavy geometry sampling still hangs past 200s. Container limit unchanged.
- CC0 proxy (polyhaven/ambientcg) re-tested: still 403, unchanged.
- No code change this run.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged across
  6+ passes - needs her verdict or a new hand-placement idea, not another pass.
- LOOKS LIST 1-8: all done/parked. "Looks fixes ready" line stands in NEEDS_YOU.
- 5 [ACTIVE] BACKLOG items left, all blocked: architecture/texture-pipeline need a
  reworked place ([PAUSED-MAP]); CC0 sourcing needs the proxy; M7 NPC needs
  draw-call headroom; shader-warmup needs a real (non-headless) browser to confirm
  if the stuck-slot reading is this container or a real bug.
- Her "is the 25 Nov map locked for good?" still open - the root blocker behind the
  flat-run streak before this one.
## Next 5 items
1. Map-lock answer / CC0 proxy: nothing to do but wait - don't re-ask (A6).
2. If CC0 proxy works: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If map-lock answered yes: unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md checklist).
4. world-validator.js checks 1-3 now pass here (confirmed again this run via the
   lighter probe) - worth retrying check 4/5 (heavy geometry sampling) each run to
   see if it ever survives; if it does, M7 headroom and shader-warmup (item 7)
   become answerable without a real browser.
5. Architecture/texture-pipeline standing rules: keep applying to any new/reworked
   place, nothing to do until one exists.
## Blockers
- [PAUSED-MAP]: her map-lock answer, unchanged.
- CC0 proxy (polyhaven/ambientcg): 403, last re-tested 26 Nov, unchanged.
- Real browser: PARTIAL (checks 1-3 of world-validator.js survive; check 4/5's
  heavy per-mesh sampling still crashes). Lightweight direct-query probes (no full
  validator chain) work fine here - use that pattern for targeted bug confirmation.
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD can
  show detached/stale - `git fetch` fresh first.
- check-material-clone script is check-material-clone.mjs, not .js. layout-pack.mjs
  (--check too) takes minutes, don't run foreground; layout-tests.mjs is fast.
- A narrow Playwright probe (vite preview + page.evaluate reading
  window.__dopahar's exposed getters, no full validator/screenshot chain) is
  reliable here even though the full chain isn't - prefer it for one-off checks.
