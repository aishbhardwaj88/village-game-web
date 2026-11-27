# State - rewritten every run, max 40 lines
Last updated: 27 Nov (scheduled run 15). No code change, doc correction only.
LAST_FULL_PASS=3362c4f (unchanged, no Tier 1/2 diff this run).
## This run
- Fresh look at the 2 remaining un-archived ACTIVE BACKLOG items the map-lock unparked
  (run 10): "crop-plot specifics" and "far-east road connection" (wayfinding signage
  was already confirmed built in an earlier run). Checked by code, both done:
  - Crop-plot specifics: src/layout/mapData.json's `new_field` objects each carry the
    map's own crop `name` (57 plots, all 10 landFields.js CROPS types represented);
    density/growth-stage variety is already procedural per-field in landFields.js
    build(). Archived to docs/archive/backlog-done.md, removed from BACKLOG.md.
  - Far-east road connection: src/eastRoad.js's own comment says this was retired
    3 Nov ("the map's own roads now reach every place it served"); confirmed still
    true under the 25 Nov map because wayfinding.js's signposts place real boards for
    that exact cluster (cross_east, ring_east), which only succeeds on real road
    geometry. Archived the road-connection half; kept "new house row facing temple"
    + "MAP.md elevation checks" open (not re-verified).
  - BACKLOG.md's wayfinding line split too: signage confirmed-done note added, "lane
    continuity" (kerbs/drains/lamps/street-life walk-test) kept open, unverified.
- BACKLOG.md now 75 lines (cap 80).
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
