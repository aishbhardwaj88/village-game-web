# State - rewritten every run, max 40 lines
Last updated: 25 Nov (hourly loop). LOOKS LIST items 1-8 done or parked. Streaming/caching work continues below.
This run (25 Nov, hourly): licence-audit.mjs false-flagged public/sw-kill.js as unowned (builder record points
at src/swRegister.js, which never named "sw-kill" or its "service_worker" family). Added one comment line to
swRegister.js naming both; OWNER warnings 3 -> 2 (both left are pre-existing/out of scope: parlour_didi texture
[character] and the Tripo billing question [already closed in NEEDS_YOU]). Also asked her whether the 25 Nov
map is locked for good - several BACKLOG items are still [PAUSED-MAP] despite a map landing/being approved
25 Nov; nobody had asked. Fresh container needed `npm ci` + `git fetch/checkout -B main` (stale detached HEAD), routine.

## Current state
- 26 Nov HONEST GATE, start area only: GATE_RADIUS 160 -> 70 m. GATE3/GATE4 defer normal/roughness/ao maps
  until after Play. Before Play ~10.7 MB. Left: ring models swept into forceBuild inside the 70m gate radius
  regardless of their own smaller buildRadius (zoneManager.js setGate()). Already meshopt+WebP+quantized, no
  easy further shrink; shrinking the gate risks visible pop-in - real regression risk, not attempted blind.
- 26 Nov SHOW CAP 265 m, shader warm-up inside the gate, wall murals sliced. 25 Nov WALL REPEAT+VARIETY done.
  GATE (25 Nov): honest Play gate, resumable downloader, SW cache-first.
- Item 2 (chauraha buildings): could NOT reproduce on the final map, NEEDS_YOU open.
- CLAUDE.md 5b rule-2 sweep (flat vertex-colour, no texture): clean village-wide. Item 5 done.
- licence-audit.mjs: 490 shipped files, 0 UNKNOWN, 2 OWNER warnings left (both pre-existing, see above).

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
- Whether [PAUSED-MAP] BACKLOG items (wayfinding, far-east road, NPC paths, crop-plot) can resume now a map
  landed 25 Nov: asked her (NEEDS_YOU), not answered yet. Don't unpark them without her yes.

## Known about this container
- node_modules not present on a fresh container - run `npm ci` first; HEAD detached on a stale local main
  (fetch+checkout -B fixes it).
- screenshot.js/world-validator.js: proxy refuses Chromium's internal pings, hangs instead of giving up
  (confirmed prior runs, not re-checked this run per A6).
- api.polyhaven.com / ambientcg.com / github.io blocked by the proxy (403, confirmed prior runs).
