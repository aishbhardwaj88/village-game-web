# State - rewritten every run, max 40 lines
Last updated: 26 Nov (hourly loop). LOOKS LIST items 1-8 done or parked. Streaming/caching work continues below.
This run (26 Nov, hourly): no code change - next-item #5 sweep extended and closed clean (see below), every
other next-item still genuinely blocked, CC0-sourcing re-checked, still network-blocked. Docs-only (A5
exception). Fresh container needed `npm ci` (node_modules wasn't actually present) - done, all 4 instant
checks + build:unchecked re-verified clean on this checkout.

## Current state
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m. GATE3/GATE4 defer normal/roughness/ao maps
  until after Play (src/deferredMaps.js). Before Play ~10.7 MB. Left: the ring's models (house_compound,
  gher_yard, tv_house_v2, chaupal_v2, goods_yard - swept into forceBuild since they sit within the 70m gate
  radius regardless of their own smaller buildRadius, see zoneManager.js setGate()). Already meshopt+WebP+
  quantized (0.58-1.35 MB each, no easy further shrink). Shrinking the gate risks visible pop-in - real
  regression risk, not attempted blind.
- 26 Nov SHOW CAP 265 m, shader warm-up inside the gate, wall murals sliced. 25 Nov WALL REPEAT+VARIETY done.
  GATE (25 Nov): honest Play gate, resumable downloader, SW cache-first.
- Item 2 (chauraha buildings): could NOT reproduce on the final map, NEEDS_YOU open.
- CLAUDE.md 5b rule-2 sweep (flat vertex-colour, no texture underneath) extended past props/farmSites/
  roadEvents to chaurahaEdges/rideNooks/villageFurniture2/thelaSign.js: clean. The only bare
  `MeshStandardMaterial({roughness})` left (chaurahaEdges.js:427, rideNooks.js:400) is the intentional
  capsule ambient-life/people stand-in (characters parked per CLAUDE.md), not a rule-2 violation. Item 5 done.

## Next 5 items
1. House atlas n/r + water-tank fix need real-browser confirmation; retried screenshot.js this run (hung
   ~100s, same container block, A7) - don't rechase again soon. Her own machine can confirm any time.
2. Ring models before-Play weight: no safe lever without her say on gate-radius-vs-pop-in. Parked, not NEEDS_YOU.
3. Zone streaming pixel-rule (on-screen-size appear distance): broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind (shared across textures).
5. BACKLOG [ACTIVE] CC0 prop sourcing (matka/charpai/bicycle/cylinder): re-tried, api.polyhaven.com and
   ambientcg.com both still proxy-403 - not a code task until that changes or another source is found.

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader falls back to whole-file restart.
  LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out, known).

## Known about this container
- node_modules not present on a fresh container (confirmed again 26 Nov) - run `npm ci` before trusting any
  build/check output; HEAD detached on a stale local main (fetch+checkout -B fixes it).
- screenshot.js/world-validator.js: Chromium's internal pings (accounts.google.com etc.) get refused by the
  proxy and it hangs instead of giving up - confirmed again 26 Nov (100s). Occasional retry only, not per-run.
- api.polyhaven.com / ambientcg.com / github.io blocked by the proxy (403, confirmed again 26 Nov).
