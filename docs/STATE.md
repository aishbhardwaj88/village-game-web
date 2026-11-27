# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run). Real fix this run. LAST_FULL_PASS=3362c4f (unchanged).
## This run
- Fixed the parked-vehicle wall overlap for real, not guessed: a live Playwright
  probe (tmp/probe-vehicle-wall.mjs, vite preview + window.__dopahar.getStaticColliders())
  found the tractor/trolley were already clear (+0.44m/+5.55m) - 26 Nov's "-0.19m"
  tractor entry was stale. Only the cart (639.4,31.0) truly overlapped a hand-tagged
  wall box X[637.10,639.90] Z[27.14,29.58], by 0.276m.
- Fix: nearCart() z 31.0 -> 31.6 (src/missionsLayout.js). Re-probed after rebuild:
  clearance +0.324m, spawn-guard warning gone. Tier 1 verify all PASS.
- BACKLOG item closed, moved to docs/archive/backlog-done.md.
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
