# State - rewritten every run, max 40 lines

Last updated: 25 Nov (hourly loop). Streaming/caching work below; LOOKS LIST items 1-8 done or parked (item 8's "zero console errors" needs a real browser, container limit).
This run: re-verified LOOKS LIST/BACKLOG [ACTIVE], nothing further shippable without her input or a real browser (see
Next 5). Found + filed one real gap: the 24 Nov Poly Haven free-props review row (100+ CC0 props, CREDITS.md props_ph)
was built for her verdict but never flagged - NEEDS_YOU now has it (?at=606,33). Don't place from that row until she
answers (5a1, taste is hers).

## Current state
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m (src/ui.js, main.js setReadyGate, zoneManager setGate). Zones beyond
  the ring no longer build behind the title, slot models beyond it wait for Play (assetSlots.holdFar; slotIsNear uses world position).
  GATE3 (26 Nov): normal/roughness/ao maps load after the Play unlock (src/deferredMaps.js; first 3D frame held until they
  land, ?nodefer=1 = old). Before Play, honest count (fetch() bodies at dist size): 16.65 -> 13.50 MB (web 10.12 -> 6.97,
  models 6.53). GATE4 (26 Nov): house atlas normal/roughness (base 0.77 MB + 8 variants 2.0 MB) now drawn after Play via deferredTask
  (deferredMaps.js, same first-frame hold); before Play ~10.7 MB. Left: the ring's models.
- 25 Nov WALL REPEAT: plaster tile 0.5 -> 1.5 m, applyAntiTile() two-scale colour blend in materials.js for plaster*/mud*/
  concrete_e,f. Autocorr repeat score 0.95 -> 0.27 on a 10x3 m wall (sim). VARIETY: 16 house washes + ground noise done.
- GATE (25 Nov): Play waits only on spawn-ring prop sites (propGate.js startGate); shops/land/map objects build after
  (lateBuild.js); streamHold() freezes with a loading notice if a near prop site stalls. Resumable downloader in
  loaders.js (stall 8s, 4 tries, Range-resume). SW cache-first (?nosw=1 bypasses); manualChunks vendor/data/app.
- Measured pre-GATE3 (4G, 4x CPU): Play ~11-14 s; main sync build 2.2-9.8 s of it (CPU-bound). Target 4 MB / 3 s NOT met.
- Item 2 (chauraha buildings): could NOT reproduce, NEEDS_YOU open. Item 8 console-error check needs a real browser.

## Next 5 items
1. (done GATE4) house atlas n/r deferred. Check in a real browser: house walls look same at first frame.
2. Ring models 6.5 MB (house_compound, gher_yard, tv_house, chaupal...) + shared props: split village builders by area.
3. Zone streaming rule (pixel-rule appear distance): speed-lead half already built (zoneManager.js leadM, 26 Nov); the
   on-screen-size half (visibleRadius by real apparent size) isn't - broad refactor, real regression risk, scoped only.
4. Memory hygiene: close decoded ImageBitmaps after GPU upload - needs a shared-texture check first (textures/materials
   are shared across objects; closing blind could break a second user of the same bitmap - not done blind, per A6/A7).
5. Doorstep plants at 42 m / zone detail radius pop-in, house atlas shader warm-up.

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader falls back to whole-file restart on 200.
LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out, known).

## Known about this container
- node_modules empty every fresh container; HEAD detached on a stale local main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com - browser checks hang/crash; crashes after Play. load-time-test counts fetch()
  bodies as 0 B (models, bitmap textures). world-validator 'nothing floats' FAIL hb_main_39/school_bell seen 26 Nov.
- api.polyhaven.com / github.io blocked by the proxy.
