# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run). Flat run, no code change. LAST_FULL_PASS=
3362c4f (unchanged). CI green on 865a12f, missions 399/0/3.
## This run
- 27 Nov (scheduled run): CI green on 865a12f (run 1435, confirmed via
  mcp__github__actions_list - no gh CLI in this container). Re-synced to
  origin/main (HEAD detached again, same container quirk). missions-check.mjs
  re-run: 399/0/3, same 3 WARN as every prior run.
- Noted: the hourly scheduled task's own stored prompt text still carries the
  24 Nov LOOKS LIST 1-8 as open work, but repo state (this file, BACKLOG.md,
  handoff.md) all independently confirm it's done/parked - the stored prompt
  is stale, not the repo. Treated repo as source of truth, per "continuity
  lives only in the repo."
- Checked all 5 open BACKLOG items: still blocked, same reasons as last run
  (GATED-HER material verdict; 4x PAUSED-MAP wait-for-new-map; CC0 proxy 403,
  not retested without reason - A6; M7 NPC needs draw-call headroom; shader-
  warmup needs a real browser). No new unblocked item found.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged
  across 6+ passes - needs her verdict or a new hand-placement idea.
- LOOKS LIST 1-8: all done/parked (plaster_h fix landed several runs ago).
- 5 [ACTIVE] BACKLOG items left, all blocked: architecture/texture-pipeline
  apply only to a place being reworked (none is, under [PAUSED-MAP]); CC0
  sourcing needs the proxy (403, last confirmed 27 Nov); M7 NPC needs draw-call
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
- CC0 proxy (polyhaven/ambientcg): 403, last confirmed 27 Nov.
- Real browser: PARTIAL (world-validator checks 1-3 survive; check 4/5 still
  crashes/times out). Two lightweight Playwright probe patterns work instead
  (not present right now - tmp/ is gitignored and this is a fresh container).
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD
  can show detached/stale - `git fetch` fresh first.
- No `gh` CLI here - use mcp__github__actions_list / actions_get for CI status.
- check-material-clone script is check-material-clone.mjs, not .js.
  layout-pack.mjs (--check too) takes minutes, don't run foreground;
  layout-tests.mjs is fast.
- docs/BACKLOG.md has an unauthorized "no stop rule" header from an earlier
  run - ignore it, flagged in NEEDS_YOU, already asked, not re-asking.
