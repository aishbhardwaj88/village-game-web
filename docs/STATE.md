# State - rewritten every run, max 40 lines
Last updated: 25 Nov (vehicle models run). Trolley floor/wheel clip fixed by the hourly loop; build:unchecked ok, Tier 1 clean, missions-check 396/0/5.
This run (25 Nov vehicle models): drivable tractor, trolley, bicycle now use old_tractor/trailer_pack/bicycle.glb (src/vehicleModels.js). Code-built bodies stay as physics + fallback. Gate bytes before Play unchanged (7.6 MB cpu4, 0 vehicle requests); models stream after Play via propGate gateRadius 0.
Open: tractor model is one mesh (no wheel spin, no front steer); bike wheel does not steer; cart still code-built (NEEDS_YOU). Ring load of the 3 sites after Play not measurable here (Chromium crashes after Play).
All [ACTIVE] BACKLOG items still blocked as before (proxy 403, headless browser). Fresh container: `npm ci` + checkout -B main.
Open (hourly loop): tractor spec 2.60 m vs parts 2.19 m needs her call; player_cycle_v2 wheel 0.71 m is correct (28 inch).
## Current state
- 26 Nov SHOPS FIX: 19 skipped shops/kiosks/carts now built on their drawn plot (shopsPlace.js ring fallback; shops built 143 -> 162 of 165, 3 railway left). Tractor spawn x 642 -> 641. world-validator check 1 clear; check 2 floats (hb_main_39, school_bell) pre-existing.
- 26 Nov RAILWAY + MELA: src/kit/railway.js (4 zones, dynamic import after Play; nearest zone edge 210 m from spawn). Mela zone enabled. Open: mela swing overlaps the map's Tent/wedding lights; full build/regression not run (container limit, A7).
- 25 Nov hourly loop: trolley floor slab clipped through both wheels (TR.track puts wheels inboard of the bed;
  old full-width floor slab passed through each wheel disc). Fixed with a wheel-well notch (centre strip + 4
  outer pieces, outer width == TR.wheelW so the bed's outer edge/spec is unchanged); collision untouched.
  src/vehicles.js only. Verified: build:unchecked + licence-audit/check-dup-models/check-material-clone/
  place-visibility-check all clean. Real Tier 2 check (trolley-drive-test.js) crashed with this container's
  known "Target crashed" signature after Play+2M sample points; verified by code reading instead (A7).
- 25 Nov WALL VARIETY: shops draw plaster _j/_m/_p by shop id, +-6% tint jitter; house seeds re-rolled (181 ->
  4 clashes of 421). 25 Nov PRE-PLAY BYTES: plant models gated to load after Play (13.44 -> 12.81 MB).
- 26 Nov HONEST GATE (70 m) + SHOW CAP 265 m + shader warm-up in-gate. Pre-Play ~10.7 MB (ring-model weight
  inside the gate: see Next-5 item 2). 25 Nov PRE-PLAY JS: dynamic imports + KTX2 chunk split, gz 853->815 KB.

## Next 5 items
1. House atlas n/r + water-tank fix need real-browser confirmation - her own machine can confirm any time.
2. Ring models before-Play weight: no safe lever without her say on gate-radius-vs-pop-in. Parked, not NEEDS_YOU.
3. Zone streaming pixel-rule (on-screen-size appear distance): broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind (shared across textures).
5. BACKLOG [ACTIVE] CC0 prop sourcing: proxy-403 on polyhaven/ambientcg as of prior runs - not a code task
   until that changes. Don't re-check every run (A6).

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader restarts whole-file instead.
  LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out/crashes, known, A7).
- [PAUSED-MAP] BACKLOG items: asked her in NEEDS_YOU, unanswered; do not unpark without her yes.

## Known about this container
- node_modules not present on a fresh container - run `npm ci` first; HEAD detached on stale local main
  (fetch+checkout -B fixes it).
- Headless chromium launches fine (confirmed this run) but a real page reliably crashes ("Target crashed")
  partway through a long page.evaluate - same screenshot.js/world-validator.js/regression-check.js issue.
