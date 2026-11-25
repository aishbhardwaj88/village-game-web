# State - rewritten every run, max 40 lines
Last updated: 25 Nov 15:55 UTC (scheduled run). HEAD 54a491b, CI green, missions-check 0 fail, Tier 1 clean. No code change.
tweak at 14:45, Tier 1 re-checked clean, CI green run 45637514739). No code change this run.
LOOKS LIST 1-7 + item 8 (missions/bell/canal) stay done/parked - confirmed clean across 3+ runs now,
stop re-verifying these every hour (A6) unless a future diff touches them. Item 2 (chauraha road
buildings) is the only open LOOKS LIST line, waiting on her building names (NEEDS_YOU, asked twice).
BACKLOG [ACTIVE] all conditional/blocked: architecture + texture-pipeline rules apply only when a place
is reworked (none in flight); CC0 prop sourcing still 403 through the proxy (re-confirmed again this
run - DO NOT re-check next run, nothing suggests it changed); M7 flavour NPC optional; shader warm-up
needs a real browser (container can't).
school_bell float: confirmed again by code read, not a bug - props.js VERANDAH_APRON_Y=0.12 matches the
school's own built apron height. Stop listing it as an open float.

## Current state
- Game is effectively feature-complete against GAME_COMPLETE.md; everything left in BACKLOG is optional
  polish or blocked on her (taste calls in NEEDS_YOU, CLAUDE.md 5a1) or on the container's broken
  headless-browser checks (A7, Tier 2 crashes on any real page.evaluate).
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) is still the one open question that would unblock
  the whole [PAUSED-MAP] backlog group (wayfinding, far-eastern cluster, crop-plot specifics, NPC paths).
- Free-props review row (100+ Poly Haven props staged, never shown to her) is still unreviewed - NEEDS_YOU,
  ?at=606,33.

## Next 5 items (unchanged from last run, still accurate)
1. House atlas n/r + water-tank fix need real-browser confirmation - her own machine can confirm any time.
2. Ring models before-Play weight: no safe lever without her say on gate-radius-vs-pop-in. Parked.
3. Zone streaming pixel-rule (on-screen-size appear distance): broad refactor, real regression risk, scoped only.
4. Memory hygiene (parked, NEEDS_YOU): closing decoded ImageBitmaps unsafe blind (shared across textures).
5. BACKLOG [ACTIVE] CC0 prop sourcing: proxy-403 on polyhaven/ambientcg, not a code task until that changes.

## Blockers
- Range support of the live host unverified (proxy blocks github.io); downloader restarts whole-file instead.
  LAST_FULL_PASS=82c337c (browser chain unreliable here; regression-check times out/crashes, known, A7).
- [PAUSED-MAP] BACKLOG items: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov 15:15 run. Do not re-check hourly - only
  re-check if a future run has a specific reason to think it changed.

## Known about this container
- node_modules not present on a fresh container - run `npm ci` first; HEAD detached on stale local main
  (fetch+checkout -B fixes it). This checkout is a shallow clone (50-commit history, graft root db68c07).
- Headless chromium launches fine but a real page reliably crashes ("Target crashed") partway through a
  long page.evaluate - screenshot.js/world-validator.js/regression-check.js all hit this. Verify risky
  diffs by code reading + Tier 1 instead (A7); her own machine is the real check for anything visual/feel.
- 26 Nov RIDE BLOCKER: old-layout cycle repair shop (chaurahaEdges.js, x 598.9-602.7, z -4.4..-1) stood on
  the new main road lane; removed by filter. Tea/tailor shops there still overlap map shops sqx_235/236
  (off the lane, left).
