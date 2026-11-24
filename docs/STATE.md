# State - rewritten every run, max 40 lines

Last updated: 24 Nov (late). Working the LOOKS LIST (her 24 Nov playtest notes,
items 1-7, priority order; she approved Claude chat acting for her 25 Nov).

## Current state
- Item 1 (wall variety): a concurrent run landed it, 2 rounds this hour - not retouched.
- Item 2 (buildings in the chauraha road): could NOT reproduce - tools/
  layout-tests.mjs (926 footprints, on-road check) is a clean PASS, incl. THE
  SQUARE; no screenshot possible either. Logged to NEEDS_YOU: fixed already, or
  needs her exact names.
- Item 3 (haystacks shiny): FIXED (71f855f) - thatch roughness forced to 1.0.
- Items 4/5 (pots/plants, street furniture): root cause found+fixed
  (87da25f/fbfc8a8) - the only doorstep-prop system loops ROWS_DRAWN, empty
  under layout=new, so all 492 new-map houses had ZERO pots/furniture. Added
  src/kit/newHouseProps.js off NEW_HOUSES; no creepers (no real asset exists).
- Item 6 (cycle feels like a motorcycle): FIXED (e704e6e) - split one 27 km/h/
  ~1s CYCLE_TOP_SPEED into 20 km/h cruise (~3s pickup) + Shift-sprint at 27.
  Pedalling/lean animation was already built (src/playerCycle.js), untouched.
- Item 7 (load speed, map shipped twice) not started this run.
- Every commit verified: build:unchecked/full build + Tier-1 checks +
  layout-tests.mjs + missions-check.mjs, all clean (358/0/4, same baseline);
  headless Chromium still can't reach accounts.google.com here (egress
  refusal) - no screenshot proof possible in this container.

## Next 5 items
1. Item 7 (= B4): field/crop load speed, texture double-fetch, map shipped
   twice (mapData.json + approved-map-2026-11-21.json), shader warm-up -
   measure requests/MB/seconds before Play, before and after.
2. Once 1-7 done/parked: one NEEDS_YOU "Looks fixes ready" line, ?at= per item.
3. Then PUSH LIST (M1-M8 + side jobs on the new map) still open underneath.

## Blockers
- No in-browser screenshot/proof possible here; item 2 needs her eye or names.
LAST_FULL_PASS=82c337c (browser chain unreliable here; code+Tier 1 used instead).

## Known about this container
- node_modules empty every fresh container (npm ci once/run); HEAD starts
  detached on a stale local main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com here - screenshot.js/world-
  validator.js/regression-check.js's browser steps hang/crash. Static tools only.
