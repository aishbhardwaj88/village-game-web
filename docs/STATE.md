# State - rewritten every run, max 40 lines

Last updated: 24 Nov (late). Working the LOOKS LIST (her 24 Nov playtest notes,
items 1-7, priority order; she approved Claude chat acting for her 25 Nov).

## Current state
- Item 1 (wall variety): a concurrent run landed "5 plaster surfaces per house"
  the same hour (c9a5524) - not retouched.
- Item 2 (buildings in the chauraha road): could NOT reproduce - tools/
  layout-tests.mjs (926 footprints, on-road check) is a clean PASS, incl. THE
  SQUARE; no screenshot possible either. Logged to NEEDS_YOU - fixed already, or
  needs her exact names.
- Item 3 (haystacks shiny): FIXED (71f855f) - stagingYard.js addWeathering()
  floored thatch roughness at 0.5 under IBL; forced to 1.0 (matte), thatch only.
- Items 4/5 (pots/plants, street furniture): root cause found+fixed
  (87da25f/fbfc8a8) - scenery.js's only doorstep-prop system loops ROWS_DRAWN,
  empty under the live default layout=new, so all 492 new-map houses had ZERO
  pots/furniture. Added src/kit/newHouseProps.js off NEW_HOUSES, wired 2
  unused-but-licensed CC0 props into villageProps.js. No creepers (no real asset).
- Items 6/7 (cycle feel, load speed) not started this run.
- Every commit verified: build:unchecked + 4 Tier-1 checks + layout-tests.mjs +
  missions-check.mjs, all clean (358/0/4, same baseline).
- Container limit confirmed again: headless Chromium can't reach
  accounts.google.com (egress refusal) - no screenshot proof possible here.

## Next 5 items
1. Item 6: cycle feel (pickup/cruise/sprint speeds, pedalling, lean into turns).
2. Item 7 (= B4): load speed + double-fetch + map shipped twice (mapData.json +
   approved-map-2026-11-21.json) + shader warm-up; measure before/after.
3. Once 1-7 done/parked: one NEEDS_YOU "Looks fixes ready" line, ?at= per item.
4. Then PUSH LIST (M1-M8 + side jobs on the new map) still open underneath.

## Blockers
- No in-browser screenshot/proof possible here; item 2 needs her eye or names.
LAST_FULL_PASS=82c337c (browser chain unreliable here; code+Tier 1 used instead).

## Known about this container
- node_modules empty every fresh container (npm ci once/run); HEAD starts
  detached on a stale local main (fetch+checkout -B fixes it).
- Headless Chromium can never reach accounts.google.com here - screenshot.js/
  world-validator.js/regression-check.js hang or crash. Use static tools instead.
