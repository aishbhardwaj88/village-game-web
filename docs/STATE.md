# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 7). Flat run, no code change. LAST_FULL_PASS=
3362c4f (unchanged). CI green on a5b6945 (run 1444), missions 399/0/3.
Temple/sabzi AS_DRAWN (front -z), moved-place coords, pre-Play size, land layers: all already settled/her call (handoff 26 Nov).
## This run
- CI confirmed green on a5b6945 (run 1444) via Actions API. Re-synced (HEAD
  detached, container quirk); npm ci (node_modules missing).
- LOOKS LIST 1-8 and all 5 ACTIVE BACKLOG items unchanged, same blockers as
  last run. Per A6 + efficiency-rules.md, did not re-run already-logged
  checks (CC0 proxy, map-lock) with no new reason to expect a different
  result.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures wedged
  across 6+ passes - needs her verdict or a new hand-placement idea.
- LOOKS LIST 1-8: all done/parked.
- 5 [ACTIVE] BACKLOG items left, all blocked: architecture/texture-pipeline
  apply only to a place being reworked (none is, [PAUSED-MAP]); CC0 sourcing
  needs the proxy (403, last confirmed 27 Nov); M7 NPC needs draw-call
  headroom; shader-warmup needs a real (non-headless) browser.
- Her "is the 25 Nov map locked for good?" still open - root blocker behind
  the flat-run streak. Already asked once, not re-asking (A6).
## Next 5 items
1. Map-lock / CC0 proxy: nothing to do but wait - don't re-ask (A6).
2. If CC0 proxy works: resume prop sourcing (matka/charpai/cylinder/bicycle).
3. If map-lock answered yes: unpark PAUSED-MAP items (wayfinding, far-eastern
   cluster, NPC path validation, crop-plot specifics, MAP.md checklist).
4. If she says yes to opening railway station/hall walls: cut real door/
   window openings in src/kit/railway.js wallRun(), then furniture.
5. world-validator.js checks 1-3 pass here; check 4/5 (heavy geometry
   sampling) still hangs - keep retrying lightly, don't force it.
## Blockers
- [PAUSED-MAP] her map-lock answer, unchanged. CC0 proxy 403 (27 Nov).
  Real browser: PARTIAL (world-validator checks 1-3 survive; 4/5 fail).
## Known about this container
- node_modules missing on fresh container, every time - `npm ci` first. HEAD
  can show detached/stale - `git fetch` fresh first.
- No `gh` CLI here - use mcp__github__actions_list / actions_get for CI status.
- check-material-clone script is check-material-clone.mjs, not .js.
- docs/handoff.md is 2196 lines, A3's archive move isn't happening - not urgent (read by grep only), flagging for spare cycles.
