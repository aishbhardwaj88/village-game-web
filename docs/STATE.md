# State - rewritten every run, max 40 lines
Last updated: 25 Nov 11:50 UTC (13:45 deadline run). Actions green on a3714fe; missions-check 396/0/5; build:unchecked ok.
This run (25 Nov vehicles check): built sizes match LAYOUT.md except bike height (1.24 -> 1.10 m, fixed). Open: tractor 2.19 m tall vs spec 2.60 (spec contradicts its own parts), trolley wheels pass through floor, player_cycle_v2 wheel 0.71 m vs 0.60.
pre-Play JS cut), already deployed green. All [ACTIVE] BACKLOG items still blocked the same way (proxy 403,
headless browser) - not re-tested this run, per A6. Fresh container: `npm ci` + checkout -B main.

## Current state
- 26 Nov SHOPS FIX: 19 skipped shops/kiosks/carts now built on their drawn plot (shopsPlace.js ring fallback; shops built 143 -> 162 of 165, 3 railway left). Tractor spawn x 642 -> 641 (hardware shop now stands beside it). Old canal bank strips removed from main.js. world-validator check 1 clear; check 2 floats (hb_main_39, school_bell) is pre-existing.
- 25 Nov WALL VARIETY (materials only): shops draw plaster as plaster/_j/_m/_p by shop id (BatchKit remap, +-6% tint jitter); house seeds re-rolled so pakka neighbours differ in plaster surface (181 -> 4 clashes of 421). No new texture requests before Play.
- 26 Nov RAILWAY + MELA: src/kit/railway.js (4 zones, new layout, dynamic import from main.js after the zones, nothing before Play; nearest zone edge 210 m from spawn). Mela zone enabled in the final map (one condition). Open: mela swing overlaps the map's Tent and wedding lights; full build/regression not run (container limit, A7).
- 25 Nov PRE-PLAY BYTES: plant models (flower_gazania 396 KB, shrub_01 246 KB) have no copy within 70 m of the spawn, so
  they now load after Play (realPlants.js setPlantGate, wired in main.js). Measured before Play 13.44 -> 12.81 MB. gurukul/bazaar/school were already after Play.
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m. GATE3/GATE4 defer normal/roughness/ao maps
  until after Play. Before Play ~10.7 MB. Left: ring models swept into forceBuild inside the 70m gate radius
  regardless of their own smaller buildRadius (zoneManager.js setGate()). Already meshopt+WebP+quantized, no
  easy further shrink; shrinking the gate risks visible pop-in - real regression risk, not attempted blind.
- 26 Nov SHOW CAP 265 m, shader warm-up inside the gate, wall murals sliced. 25 Nov WALL REPEAT+VARIETY and
- CLAUDE.md 5b sweep clean village-wide, Item 5 done. licence-audit: 490 files, 0 UNKNOWN, 2 pre-existing OWNER warnings.

- 25 Nov PRE-PLAY JS: storyBeats+sideJobs now dynamic imports (start at gate end), zstddec/ktx-parse moved from vendor to the KTX2 chunk, KTX2 starts after gateEnd. JS before Play gz 853 -> 815 KB, raw ~3.03 -> 2.92 MB. data chunk (mapData 656 KB raw/115 gz) stays: layout needs it to build the world.

## Next 5 items
1. House atlas n/r + water-tank fix need real-browser confirmation - her own machine can confirm any time.
2. Ring models before-Play weight: no safe lever without her say on gate-radius-vs-pop-in. Parked, not NEEDS_YOU.
3. Zone streaming pixel-rule (on-screen-size appear distance): broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind (shared across textures).
5. BACKLOG [ACTIVE] CC0 prop sourcing (matka/charpai/bicycle/cylinder): proxy-403 on polyhaven/ambientcg as of
   prior runs - not a code task until that changes. Don't re-check every run (A6).

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader restarts whole-file instead.
  LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out, known).

- [PAUSED-MAP] BACKLOG items: asked her in NEEDS_YOU, unanswered; do not unpark without her yes.

## Known about this container
- node_modules not present on a fresh container - run `npm ci` first; HEAD detached on a stale local main
  (fetch+checkout -B fixes it).
- screenshot.js/world-validator.js: proxy refuses Chromium's internal pings, hangs instead of giving up; and
  api.polyhaven.com / ambientcg.com / github.io blocked by the proxy (403) - both confirmed prior runs, not
  re-checked this run per A6.