# State - rewritten every run, max 40 lines
Last updated: 26 Nov ~21:4x (scheduled run). CI green on 54601df (run 1419), confirmed
via Actions API, no local build needed. No code change this run. LAST_FULL_PASS=3362c4f.
## This run
- 15th flat run in a row. Per A6 and the project's "no repeat audits" rule, did not
  re-verify LOOKS LIST/BACKLOG items again (already reconfirmed blocked 14x). Only
  checked CI status (green) and BACKLOG.md's tag list (unchanged, 5 [ACTIVE] items,
  all still genuinely blocked per handoff history).
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures (27 front-face,
  28 on-road, 19 overlap) wedged across 6+ passes - needs her verdict or a new
  hand-placement idea, not another pass.
- LOOKS LIST 1-8: all done/parked. "Looks fixes ready" line stands in NEEDS_YOU.
- All 5 [ACTIVE] BACKLOG items blocked: architecture/texture-pipeline need a
  new/reworked place (none while [PAUSED-MAP] stands); CC0 sourcing needs the proxy
  fixed; M7 NPC and shader-warmup need draw-call headroom / a real browser.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU, with final-map.md context)
  still open; [PAUSED-MAP] stands until she answers - the root blocker behind the
  flat-run streak. Everything else is proxy- or browser-blocked.
## Next 5 items
1. Nothing unblocked without her map-lock answer, a working CC0 proxy, or a real
   browser. Don't re-ask these three next run (A6) - only act if one changes.
2. If CC0 proxy starts working: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If she answers "map locked": unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md position checklist).
4. If a real browser becomes available here: M7 draw-call headroom check, shader
   warm-up (item 7), Tier-2 regression-check, zone-streaming pixel-rule, B2 fix.
5. Architecture-as-unit / texture-pipeline rules: apply automatically whenever a
   place is next reworked (standing rule, not a task to chase now).
## Blockers
- [PAUSED-MAP]: her map-lock answer, unchanged.
- CC0 proxy (polyhaven/ambientcg): 403, unchanged.
- Real browser: unavailable in this container, unchanged.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD can
  show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed"). check-material-clone script is
  check-material-clone.mjs, not .js. layout-pack.mjs (full repack, even --check)
  takes minutes in this container - don't run it foreground; layout-tests.mjs is
  the fast checker.
