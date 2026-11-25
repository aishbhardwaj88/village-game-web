# State - rewritten every run, max 40 lines

Last updated: 25 Nov (hourly loop). Streaming/caching work below; LOOKS LIST items 1-8 done or parked (item 8's "zero console errors" needs a real browser, container limit).

## Current state
- 26 Nov HONEST GATE: Play unlocks only when the start area (160 m ring) is downloaded, built, uploaded, compiled (src/ui.js, main.js setReadyGate, zoneManager setGate). No timers. World builds at boot behind the title. Far zones stream ahead of the player; hold + notice if outrun. Debug panel (?debug=1) shows zone late pop-ins and shader programs. regression-check now waits for the real ready state.
- 25 Nov VARIETY: houses (16 washes, housesMaterial.js) and ground (dryearth+lane by area noise) done.
- GATE (25 Nov, gate agent): Play already waits only for the spawn-ring prop sites (src/propGate.js startGate); shops/land/
  map objects build after the gate (lateBuild.js). NEW: streamHold() freezes the world with the "Loading the next part of
  the village" notice when a prop site within 45 m is not ready (8 s give-up per episode). Resumable model downloader in
  src/loaders.js (stall 8 s, 4 tries, Range resume in 256 KB pieces, plain request first so SW/HTTP cache still work).
  SW: page cache-first + background refresh (?nosw=1 bypasses); hash table is its own file assets/table-<hash>.js (window.
  __ASSET_H__/__GZ_MODELS__); manualChunks vendor (three) / data (mapData.json) / app.
- Measured (4G + 4x CPU, tools/load-time-test.mjs): Play ready ~11.3-14.2 s, 6.8 MB by then (5.7 MB = 68 shared-material
  webp textures, 0.8 MB js). Main sync build is 2.2 s to 9.8 s of that (CPU-bound, ~1.9 s at x1). Target 4 MB / 3 s NOT met.
- Item 2 (chauraha road buildings): could NOT reproduce - NEEDS_YOU, open. Item 8 console-error check needs a real browser.

## Next 5 items
1. Real gate: build only the start area before Play (hero zone/bazaar/temples are still built eagerly in main()); needs
   her laptop (?debug=1) to measure, headless crashes after Play here.
2. Texture bytes before Play: 68 shared webp (grass/thatch/plaster_h normals 0.3-0.4 MB each); only defer with her OK (look).
3. Zone streaming rule (pixel-rule appear distance): the speed-lead half (request = appear + speed x load time) is already
   built (zoneManager.js leadM, 26 Nov); the on-screen-size half (visibleRadius set by actual apparent size, not a fixed
   metre value per zone type) is not - broad refactor touching every zone registration site, real regression risk, do
   only as a scoped follow-up, not blind.
4. Memory hygiene: close decoded ImageBitmaps after GPU upload (needs a shared-texture check first); audio-by-nearness is
   already substantially built (audio.js setListenerDistanceToRadio/Water/Cattle, setPlaceAmbience) - re-check only if she
   flags a specific place that still sounds flat.
5. Doorstep plants at 42 m / zone detail radius pop-in, house atlas shader warm-up.

## Blockers
- Range support of the live host could not be curl-checked (agent proxy blocks github.io); GitHub Pages normally answers
  206. The downloader falls back to a whole-file restart if it gets 200.
LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out, known).

## Known about this container
- node_modules empty every fresh container; HEAD detached on a stale local main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com - hangs/crashes browser-based checks; crashes after Play.
- api.polyhaven.com and github.io blocked by the proxy.
