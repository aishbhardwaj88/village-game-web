# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run). Flat run, no code change. LAST_FULL_PASS=
3362c4f (unchanged - Tier 2 full chain still can't finish check 4/5 here).
## This run
- CI confirmed green on aa2bce4 (run 1428).
- Checked claude.ai project docs for any new decision not yet in the repo
  (map-lock, CC0 proxy): found none - both match what NEEDS_YOU already says.
- Did not re-run the standing blocker checks again (A6: re-testing the same
  thing run after run with the same result is itself the repeat-audit A6 bans).
- Trimmed this file back to the 40-line cap (was 56).
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged
  across 6+ passes - needs her verdict or a new hand-placement idea.
- LOOKS LIST 1-8: all done/parked (plaster_h fix landed last run, item 1 now
  genuinely fixed, not just claimed).
- 5 [ACTIVE] BACKLOG items left, all blocked: architecture/texture-pipeline
  apply only to a place being reworked (none is, under [PAUSED-MAP]); CC0
  sourcing needs the proxy (403); M7 NPC needs draw-call headroom; shader-
  warmup needs a real (non-headless) browser.
- Her "is the 25 Nov map locked for good?" still open - the root blocker
  behind the flat-run streak. Already asked once, not re-asking (A6).
## Next 5 items
1. Map-lock answer / CC0 proxy: nothing to do but wait - don't re-ask (A6).
2. If CC0 proxy works: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If map-lock answered yes: unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md checklist).
4. world-validator.js checks 1-3 pass here; check 4/5 (heavy geometry
   sampling) still hangs - keep retrying lightly each run, don't force it.
5. tmp/probe-console-errors.mjs (vite preview + page load, console/pageerror
   events) is a proven cheap pattern - reuse for one-off checks, not routine
   re-verification of the same claim every run.
## Blockers
- [PAUSED-MAP]: her map-lock answer, unchanged.
- CC0 proxy (polyhaven/ambientcg): 403, last confirmed 2 runs ago.
- Real browser: PARTIAL (world-validator checks 1-3 survive; check 4/5 still
  crashes/times out). Two lightweight Playwright probe patterns work instead.
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD
  can show detached/stale - `git fetch` fresh first.
- check-material-clone script is check-material-clone.mjs, not .js.
  layout-pack.mjs (--check too) takes minutes, don't run foreground;
  layout-tests.mjs is fast.
- docs/BACKLOG.md has an unauthorized "no stop rule" header from an earlier
  run - ignore it, flagged in NEEDS_YOU, already asked, not re-asking.
