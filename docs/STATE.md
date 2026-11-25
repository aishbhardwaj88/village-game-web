# State - rewritten every run, max 40 lines
Last updated: 25 Nov 14:12 UTC (hourly loop, no code change, repo unchanged since prior run at 6301a7d).
Re-checked for unblocked work: LOOKS LIST 1-7 confirmed done/parked earlier today; item 2 (chauraha
road buildings) stays open in NEEDS_YOU pending her building names. BACKLOG [ACTIVE] items all still
blocked (CC0 proxy re-confirmed 403 on polyhaven+ambientcg this run; browser-based checks unreliable
here, A7). Her "is the 25 Nov map locked for good?" question (NEEDS_YOU) is still the key unblock -
once yes, the 23 overlaps/6 on-road/63 road-band-touch list from the prior run becomes real work.
Open: tractor model is one mesh (no wheel spin/steer); bike wheel does not steer; cart still code-built.
Fresh container this run: `npm ci` + fetch/checkout -B main (HEAD was detached, as usual, A per below).
## Current state
- 26 Nov SIGNS: 115 map new_sign boards built (src/kit/mapSigns.js, one import line in main.js). 2 draw calls, 4140 tris, 230 post colliders, builds after Play. Hindi lines are my translations (art director may edit HI table).
- 26 Nov SHOPS FIX: 19 skipped shops/kiosks/carts now built on their drawn plot (shopsPlace.js ring fallback; shops built 143 -> 162 of 165, 3 railway left). Tractor spawn x 642 -> 641. world-validator check 1 clear; check 2 floats (hb_main_39, school_bell) pre-existing.
- 26 Nov RAILWAY + MELA: src/kit/railway.js (4 zones, dynamic import after Play; nearest zone edge 210 m from spawn). Mela zone enabled. Open: mela swing overlaps the map's Tent/wedding lights; full build/regression not run (container limit, A7).
- 25 Nov hourly loop: trolley floor clip fixed (wheel-well notch, src/vehicles.js); Tier 1 clean; Tier 2 crashed (container), checked by reading.
- 25 Nov WALL VARIETY: shops draw plaster _j/_m/_p by shop id, +-6% tint jitter; house seeds re-rolled (181 ->
  4 clashes of 421). 25 Nov PRE-PLAY BYTES: plant models gated to load after Play (13.44 -> 12.81 MB).
- 26 Nov HONEST GATE: 70 m start area (now 40 m), maps deferred after Play; SHOW CAP 265 m; CLAUDE.md 5b sweep clean; pre-Play JS gz 815 KB (details: docs/archive/state-trimmed.md).

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
- 26 Nov RIDE BLOCKER: old-layout cycle repair shop (chaurahaEdges.js BUILDINGS, x 598.9-602.7, z -4.4..-1) stood on the new main road lane near z -5 and stopped the ride; removed by filter. Tea/tailor shops there still overlap map shops sqx_235/236 (off the lane, left).
