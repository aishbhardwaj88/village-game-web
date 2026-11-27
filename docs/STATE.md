# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 16). No code change.
LAST_FULL_PASS=3362c4f (unchanged, no Tier 1/2 diff this run).
## This run
- CI green on b3f4434 (run 1455). missions-check 399 pass / 0 fail / 3 warn.
- Temple front checked: map front [0.017,-1] (faces -z); packed ry -1.5878 (-91 deg) already turns the west-facing temple to -z. No 152 deg turn in the packed data; AS_DRAWN keeps it. Nothing to fix.
- Moved places (mandi, mela, tanki, bhatta, wedding, railway): grep finds no hard-coded coords; all use pt()/ANCHORS.
- Load size 10.7 MB: only a look call (NEEDS_YOU line 93), left open. Not touched.
## Current state
- Feature-complete against GAME_COMPLETE.md. Remaining BACKLOG ACTIVE items are mostly
  narrower now: lane-continuity walk-test, far-east house-row/elevation, architecture
  standing-rule (ongoing), texture-pipeline verify, NPC path validation, CC0 prop
  sourcing (403), MAP.md coverage checklist, M7 NPC, loadLandMap (shops-file-owner
  block), shader-warmup (needs real browser).
- Remaining blockers: material-library taste verdict (GATED-HER), CC0 proxy 403,
  M7 NPC draw-call headroom, shader-warmup + dev-mode shader bug (need a real
  browser), loadLandMap() (file-ownership block, needs the shops worker).
## Next 5 items
1. Lane continuity walk-test (needs a real browser - try once, don't loop on it).
2. Far-east "new house row facing temple" + MAP.md elevation checks - unverified,
   worth a fresh code-level look next run (positions only, read mapData.json).
3. NPC/animal path validation - same real-browser caveat as item 1.
4. If CC0 proxy ever returns non-403: resume prop sourcing (matka/charpai/cylinder).
5. If the shops worker can coordinate: loadLandMap() reconciliation.
## Known about this container
- node_modules missing on fresh container - `npm ci` first. HEAD can show detached/
  stale - `git fetch` fresh first. No `gh` CLI - use mcp__github__actions_list/get.
- check-material-clone script is check-material-clone.mjs, not .js.
- tools/findability-audit.mjs is broken against current freeRoam.js (regex no longer
  matches PLACES export) - not fixed this run, out of scope (A6: no new validators).
- A real in-browser check (screenshot/regression-check/world-validator step 4-5)
  does not reliably finish here: headless-shell crashes, full chrome hangs on
  blocked outbound network calls. Don't keep retrying either path same-day.
