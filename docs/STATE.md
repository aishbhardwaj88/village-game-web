# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run, ~22nd on this thread). Real fix this run, first
code change in several. LAST_FULL_PASS=3362c4f (unchanged - Tier 2 full chain still
can't finish check 4/5 here, see below).
## This run
- Wrote a new lightweight probe (tmp/probe-console-errors.mjs) to re-test LOOKS LIST
  item 8's "zero console errors" claim, since headless chromium got unstuck for other
  checks on 26 Nov and this exact check hadn't been retried that way yet (A6: legit
  to re-test when something plausibly changed).
- Found and fixed a real bug: plaster_h's 3 texture maps 404'd on every wall using it
  since the 26 Nov wall swap (materials.js built the filename from the material key,
  not the aliased folder's real file prefix). Added a `prefix` field, fixed the
  loader. Re-probed: 0 console errors (was 3). Tier 1 PASS. Full build also run
  (materials.js = Tier 2): checks 1-3 only the 2 already-logged stale findings,
  check 4/5 hit the known container timeout (unrelated to this diff).
- Committed + pushed; CI check pending at end of this run (see handoff.md).
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged across
  6+ passes - needs her verdict or a new hand-placement idea, not another pass.
- LOOKS LIST 1-8: all done/parked except the plaster_h fix just landed (item 1/8
  improved for real). "Looks fixes ready" line stands in NEEDS_YOU.
- 5 [ACTIVE] BACKLOG items left, all blocked: architecture/texture-pipeline need a
  reworked place ([PAUSED-MAP]); CC0 sourcing needs the proxy; M7 NPC needs
  draw-call headroom; shader-warmup needs a real (non-headless) browser to confirm
  if the stuck-slot reading is this container or a real bug.
- Her "is the 25 Nov map locked for good?" still open - the root blocker behind the
  flat-run streak. Already asked once, not re-asking (A6).
## Next 5 items
1. Map-lock answer / CC0 proxy: nothing to do but wait - don't re-ask (A6).
2. If CC0 proxy works: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If map-lock answered yes: unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md checklist).
4. world-validator.js checks 1-3 pass here; check 4/5 (heavy geometry sampling)
   still hangs - keep retrying lightly each run, don't force it (A6).
5. The tmp/probe-console-errors.mjs pattern (vite preview + plain page load, no
   forced zones) is new and worked cleanly - reuse it for other targeted one-off
   checks before reaching for the heavy chain.
## Blockers
- [PAUSED-MAP]: her map-lock answer, unchanged.
- CC0 proxy (polyhaven/ambientcg): 403, not retested this run (A3 same-day rule).
- Real browser: PARTIAL (checks 1-3 of world-validator.js survive; check 4/5's
  heavy per-mesh sampling still crashes/times out). A plain page-load probe (no
  validator chain) now confirmed reliable here too - two working lightweight
  patterns now logged.
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD can
  show detached/stale - `git fetch` fresh first.
- check-material-clone script is check-material-clone.mjs, not .js. layout-pack.mjs
  (--check too) takes minutes, don't run foreground; layout-tests.mjs is fast.
- Two reliable lightweight Playwright probes for targeted checks (not the full
  validator/screenshot chain, which still hangs on check 4/5): (1) vite preview +
  page.evaluate reading window.__dopahar's exposed getters (e.g. colliders), (2)
  vite preview + plain page load collecting console/pageerror events (new, this run).
- docs/BACKLOG.md has an unauthorized "no stop rule" header from an earlier run
  claiming docs/PARALLEL.md overrides everything - ignore it, flagged in NEEDS_YOU,
  already asked, not re-asking.
