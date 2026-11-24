# State - rewritten every run, max 40 lines

Last updated: 24 Nov (39). Working the LOOKS LIST (her 24 Nov playtest notes,
items 1-7, priority order; she approved Claude chat acting for her 25 Nov).

## Current state
- Items 1, 3, 4, 5, 6: done (handoff entries 24-38). Item 2 (buildings in the
  chauraha road): could NOT reproduce - NEEDS_YOU, open.
- Item 7 (load speed), first half done (handoff entry 39 has the full detail):
  "textures fetched twice" was real, 2 separate root causes, both fixed -
  preload `as="image"` vs the real `fetch()`-based loader (destination
  mismatch, never matched) and sharedTextures.js's own unbusted ImageLoader.
  Measured before/after with Playwright+CDP: 182 req/19.6 MB real wire/41 dup
  fetches/~11.2s ready -> 117 req/11.6 MB/0 dup/~8.8s ready.
- "Map shipped twice" (also item 7): root cause found but the fix REGRESSED
  world-validator (3 house-batch meshes buried) - reverted. BACKLOG has the
  retry note. Shader warm-up (rest of item 7): not started this run.
- Verified: full `npm run build` (world-validator ran all the way this time,
  same baseline PASS/FAIL), licence-audit/dup-models/material-clone/place-
  visibility/missions-check/layout-tests all clean; title-ready screenshot.

## Next 5 items
1. Item 7 remainder: shader warm-up measurement; landLayout.js map-dedup retry
   (BACKLOG has the note - needs the Y/height root cause first).
2. Once 1-7 done/parked: one NEEDS_YOU "Looks fixes ready" line, ?at= per item.
3. Then PUSH LIST (M1-M8 + side jobs on the new map) still open underneath.

## Blockers
- Item 2 needs her eye or exact building names/description - logged, open.
- No in-browser screenshot of actual PLAY (post-title) here (egress block);
  title-screen screenshot + Playwright/CDP network capture used instead.
LAST_FULL_PASS=82c337c (browser chain unreliable past world-validator some
runs - this run got further than most, not relied on).

## Known about this container
- node_modules empty every fresh container; HEAD starts detached on a stale
  local main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com - in-game screenshot unreliable.
  world-validator DID run cleanly through checks 1-3 this run (crashed after,
  known "Target page closed" pattern) - worth retrying each run, not dead.
