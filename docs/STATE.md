# State - rewritten every run, max 40 lines
Last updated: 25 Nov (hourly loop). LOOKS LIST items 1-8 done or parked. Streaming/caching work continues below.
This run (25 Nov, hourly): fixed a real CLAUDE.md 5b rule-2 violation found by inspecting a screenshot -
src/props.js createWaterTankProp() (the village's tallest landmark, MAP.md) was pure flat vertex-colour
geometry, zero texture. Now textured via the shared material library by name (concrete/metal/wood), vertex
colour kept as a tint multiply, same pattern rooftops.js/newShops.js already use. Verified Tier 1, all PASS.

## Current state
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m. GATE3/GATE4 defer normal/roughness/ao maps
  until after Play (src/deferredMaps.js). Before Play ~10.7 MB. Left: the ring's models (house_compound,
  gher_yard, tv_house_v2, chaupal_v2, goods_yard - registered via zoneManager but swept into forceBuild
  because they sit within GATE_RADIUS=70m of spawn regardless of their own smaller buildRadius, see
  zoneManager.js setGate()). Already meshopt+WebP+quantized (checked today: 0.58-1.35 MB each, no easy
  further shrink without real detail loss). Shrinking the gate's reach risks visible pop-in (the exact
  thing anti-pop-in design prevents) - real regression risk, not attempted blind.
- 26 Nov SHOW CAP 265 m, shader warm-up inside the gate, wall murals sliced. 25 Nov WALL REPEAT + VARIETY
  done. GATE (25 Nov): honest Play gate, resumable downloader, SW cache-first.
- Item 2 (chauraha buildings): could NOT reproduce on the final map, NEEDS_YOU open.

## Next 5 items
1. House atlas n/r + today's water-tank fix both need real-browser eyeball confirmation; this container's
   Chromium is flaky reaching external hosts (works sometimes, hangs other times) - retry occasionally,
   don't chase every run (A7). Her own machine can confirm either any time.
2. Ring models before-Play weight (see above): no safe lever found without her say on gate-radius-vs-pop-in,
   or thinning detail. Parked, not NEEDS_YOU (not blocking).
3. Zone streaming pixel-rule (on-screen-size appear distance): broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind (shared across textures).
5. Sweep props.js/farmSites.js/roadEvents.js for other flat-vertex-colour-only meshes (no getTiledMaterial
   underneath), same rule as the water tank - pick off one or two next run, small diffs only.

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader falls back to whole-file restart.
LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out, known).

## Known about this container
- node_modules empty every fresh container; HEAD detached on a stale local main (fetch+checkout -B fixes it).
- screenshot.js: confirmed flaky again today (one clean run of 4 presets, one hang) - Chromium's own
  internal network pings (accounts.google.com, android.clients.google.com) get refused by the proxy and it
  doesn't always give up cleanly. Worth an occasional retry, not a per-run check.
- api.polyhaven.com / github.io blocked by the proxy.
