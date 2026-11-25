# State - rewritten every run, max 40 lines
Last updated: 25 Nov 10:13 UTC (hourly loop). LOOKS LIST items 1-8 done or parked. Streaming/caching continues below.
This run (25 Nov, hourly): no code change. Did NOT re-test the proxy/browser blockers again (confirmed last
run already, A6 - no repeat audits). Checked a fresh angle instead: build_*.py builder scripts' arch.py use
(CLAUDE.md 5a) - 61/67 use arch.py Kit/Box, 6 don't, but retrofitting old shipped builders isn't a live
rework trigger (item 28 fires on new/reworked places only) and the game is audit-confirmed complete (BACKLOG
line 64) - optional polish, not real/safe work blind. Checked [!] material-board: docs/shots/ is gitignored
by design, no board.png persists here - expected (known screenshot limit), not new. Fresh container: `npm ci`
+ checkout -B main, routine.

## Current state
- 25 Nov PRE-PLAY BYTES: plant models (flower_gazania 396 KB, shrub_01 246 KB) have no copy within 70 m of the spawn, so
  they now load after Play (realPlants.js setPlantGate, wired in main.js). Measured before Play 13.44 -> 12.81 MB. gurukul/bazaar/school were already after Play.
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m. GATE3/GATE4 defer normal/roughness/ao maps
  until after Play. Before Play ~10.7 MB. Left: ring models swept into forceBuild inside the 70m gate radius
  regardless of their own smaller buildRadius (zoneManager.js setGate()). Already meshopt+WebP+quantized, no
  easy further shrink; shrinking the gate risks visible pop-in - real regression risk, not attempted blind.
- 26 Nov SHOW CAP 265 m, shader warm-up inside the gate, wall murals sliced. 25 Nov WALL REPEAT+VARIETY and
- CLAUDE.md 5b sweep clean village-wide, Item 5 done. licence-audit: 490 files, 0 UNKNOWN, 2 pre-existing OWNER warnings.

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
