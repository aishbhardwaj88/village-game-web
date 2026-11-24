# State - rewritten every run, max 40 lines

Last updated: 24 Nov (40). LOOKS LIST items 1-7 all done or correctly parked.
Item 8 (PUSH LIST) is next up.

## Current state
- Items 1, 3, 4, 5, 6: done (entries 24-38). Item 2 (chauraha road buildings):
  could NOT reproduce - NEEDS_YOU, open.
- Item 7 "textures fetched twice": fixed (entry 39), 182req/19.6MB/41dup/
  ~11.2s -> 117req/11.6MB/0dup/~8.8s.
- Item 7 "map shipped twice": PAUSED-MAP (entry 40) - real data divergence
  (mapData.json's objects/places carry packed footprints + position nudges
  the raw file lacks; using them moves things village-wide, already proven
  to sink 3 house-batch meshes once - real layout work, waits for 5a-MAP).
  Shipped the safe half: landLayout.js's dead always-false getLayout()
  attempt removed (plain single fetch now, same output, less wasted work).
- Item 7 "shader warm-up" (texWarmed stuck at 2): read the code (main.js's
  one-upload-per-frame design is deliberate), found no bug vs. a likely
  headless-container timing artifact - needs a real browser, not re-chased.
- Pruned 5 stale [ACTIVE] BACKLOG items (already shipped, evidence in
  docs/archive/backlog-done.md): street lamps, laundry, CC0 plants, collider
  coverage (0 gaps), ration/post-office/atta-chakki/school interiors.
- Verified: build:unchecked clean; licence-audit 0 UNKNOWN; dup-models/
  material-clone/place-visibility-check all PASS. Tier 1 only.

## Next 5 items
1. Write the NEEDS_YOU "Looks fixes ready" line (?at= per item) if not
   already there, then move to item 8 (PUSH LIST).
2. Item 8: missions M1-M8 + 10 side jobs re-proven on new map, zero console
   errors, canal distance. missions-check.mjs last clean (358/0/4 WARN,
   entry 38) - rerun only if something nearby changed (A6).
3. BACKLOG's remaining [ACTIVE] items (architecture-as-one-unit, texture
   pipeline, CC0 prop sourcing) - pick up when touching a place.

## Blockers
- Item 2 needs her eye or exact building names - logged, open.
- No in-browser PLAY screenshot here (egress block); title screenshot +
  Playwright/CDP network capture used instead.
LAST_FULL_PASS=82c337c (browser chain unreliable past world-validator; not
re-attempted, no browser-relevant code touched this run).

## Known about this container
- node_modules empty every fresh container; HEAD detached on a stale local
  main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com; greenery-audit.mjs crashed this
  run ("Page crashed") - same known browser-step flakiness.
