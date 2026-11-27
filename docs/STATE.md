# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run). Flat run, no code change. LAST_FULL_PASS=
3362c4f (unchanged). CI green on af49fe5, missions 399/0/3.
## This run
- Re-synced to origin/main (HEAD had gone detached again, same container quirk).
- CC0 proxy (polyhaven) re-tested once: still 403. Unchanged, not re-testing again
  next run without reason (A6).
- Tier-1 checks run clean (licence-audit, check-dup-models, check-material-clone,
  place-visibility-check): all PASS, no regression to fix.
- Investigated the open "furnish railway station/waiting hall interior" NEEDS_YOU
  item (real candidate, looked unblocked). Finding: every door/window on those two
  buildings (src/kit/railway.js wallRun()) is a solid closed panel - doors are a
  closed slab, windows back onto an opaque "dark room" panel, nothing is a real
  opening. Furnishing the inside would add geometry nobody can ever see, so this
  is not free work, it is a real budget trade-off (open the walls up, then
  furnish) - correctly hers to call, not mine to decide. Sharpened the NEEDS_YOU
  line to say this plainly instead of just "furnish them later?". No code change.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged
  across 6+ passes - needs her verdict or a new hand-placement idea.
- LOOKS LIST 1-8: all done/parked (plaster_h fix landed two runs ago).
- 5 [ACTIVE] BACKLOG items left, all blocked: architecture/texture-pipeline
  apply only to a place being reworked (none is, under [PAUSED-MAP]); CC0
  sourcing needs the proxy (403, just reconfirmed); M7 NPC needs draw-call
  headroom (needs a real browser to measure); shader-warmup needs a real
  (non-headless) browser.
- Her "is the 25 Nov map locked for good?" still open - the root blocker
  behind the flat-run streak. Already asked once, not re-asking (A6).
## Next 5 items
1. Map-lock answer / CC0 proxy: nothing to do but wait - don't re-ask (A6).
2. If CC0 proxy works: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If map-lock answered yes: unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md checklist).
4. If she says yes to opening the railway station/hall walls: cut real door/
   window openings in src/kit/railway.js wallRun(), then add bench/counter/
   lamp furniture (same P.box() system already used for the exterior).
5. world-validator.js checks 1-3 pass here; check 4/5 (heavy geometry
   sampling) still hangs - keep retrying lightly each run, don't force it.
## Blockers
- [PAUSED-MAP]: her map-lock answer, unchanged.
- CC0 proxy (polyhaven/ambientcg): 403, reconfirmed this run.
- Real browser: PARTIAL (world-validator checks 1-3 survive; check 4/5 still
  crashes/times out). Two lightweight Playwright probe patterns work instead
  (not present right now - tmp/ is gitignored and this is a fresh container).
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD
  can show detached/stale - `git fetch` fresh first.
- check-material-clone script is check-material-clone.mjs, not .js.
  layout-pack.mjs (--check too) takes minutes, don't run foreground;
  layout-tests.mjs is fast.
- docs/BACKLOG.md has an unauthorized "no stop rule" header from an earlier
  run - ignore it, flagged in NEEDS_YOU, already asked, not re-asking.
