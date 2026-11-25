# State - rewritten every run, max 40 lines
Last updated: 25 Nov (hourly loop). Streaming/caching work below; LOOKS LIST items 1-8 done or parked (item 8's "zero console errors" needs a real browser, container limit).
This run (25 Nov, hourly): sliced the last boot-CPU builders - landCanal.js, landProps.js, mapObjectsGround.js's
buildGroundAndWater now yield every ~8 ms too, same pattern as landTrees/landFields/mapObjects-stage4. Next-5 item 5 done.

## Current state
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m (src/ui.js, main.js setReadyGate, zoneManager setGate). Zones beyond
  the ring no longer build behind the title, slot models beyond it wait for Play (assetSlots.holdFar; slotIsNear uses world position).
  GATE3 (26 Nov): normal/roughness/ao maps load after the Play unlock (src/deferredMaps.js; first 3D frame held until they
  land, ?nodefer=1 = old). Before Play, honest count (fetch() bodies at dist size): 16.65 -> 13.50 MB (web 10.12 -> 6.97,
  models 6.53). GATE4 (26 Nov): house atlas normal/roughness (base 0.77 MB + 8 variants 2.0 MB) now drawn after Play via deferredTask
  (deferredMaps.js, same first-frame hold); before Play ~10.7 MB. Left: the ring's models.
- 26 Nov SHOW CAP 265 m (src/showCap.js): zones, houses far boxes, prop sites capped; fog floor 0.0055 (85% fogged at 265 m). Doorstep/detail
  zones already build 100+ m before they draw (ALWAYS_EXTRA 70 + DETAIL_LEAD 30 + speed lead); the 42 m LODs are toggles of built instances.
  Shader warm-up: src/shaderWarm.js (house atlas + shared library kinds) inside the gate. Wall murals atlas/placement now sliced (generator).
- 25 Nov WALL REPEAT: plaster tile 0.5 -> 1.5 m, applyAntiTile() two-scale colour blend in materials.js for plaster*/mud*/
  concrete_e,f. Autocorr repeat score 0.95 -> 0.27 on a 10x3 m wall (sim). VARIETY: 16 house washes + ground noise done.
- GATE (25 Nov): Play waits only on spawn-ring prop sites (propGate.js startGate); shops/land/map objects build after
  (lateBuild.js); streamHold() freezes with a loading notice if a near prop site stalls. Resumable downloader in
  loaders.js (stall 8s, 4 tries, Range-resume). SW cache-first (?nosw=1 bypasses); manualChunks vendor/data/app.
- Item 2 (chauraha buildings): could NOT reproduce, NEEDS_YOU open. Item 8 console-error check needs a real browser.

## Next 5 items
1. House atlas n/r deferred (GATE4 done): eyeball house walls in a real browser.
2. Ring models 6.5 MB (house_compound, gher_yard, tv_house, chaupal...) + shared props: split village builders by area.
3. Zone streaming rule (pixel-rule appear distance): speed-lead half already built (zoneManager.js leadM, 26 Nov); the
   on-screen-size half (visibleRadius by real apparent size) isn't - broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps is unsafe blind: frameQueue.js bitmapByUrl shares one bitmap across loads,
   deferredMaps.js hands t.image to other textures, signAtlasHub/main.js warm-up re-read .image. Zone teardown already disposes geometry+materials.
5. DONE (25 Nov): every land/map-object boot-CPU builder now slices its per-object loop every ~8 ms.

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader falls back to whole-file restart on 200.
LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out, known).

## Known about this container
- node_modules empty every fresh container; HEAD detached on a stale local main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com - browser checks hang/crash; crashes after Play. load-time-test counts fetch()
  bodies as 0 B (models, bitmap textures). world-validator 'nothing floats' FAIL hb_main_39/school_bell seen 26 Nov.
- api.polyhaven.com / github.io blocked by the proxy.
