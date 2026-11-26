# State - rewritten every run, max 40 lines
Last updated: 26 Nov 18:4x (scheduled run). CI green on dc5b37a (run 1413) at start;
no code change this run. Missions 399/0/3 unchanged (not re-run, A6). LAST_FULL_PASS=3362c4f.
## This run
- 26 Nov 19:5x scheduled list run: CI green on e9d699f (run 1414). Temple/sabzi stay AS_DRAWN (her order 25 Nov, layout-tests ACCEPTED), moved-place coords already snapped, pre-Play 10.7 MB has no non-look cut (her call), land layers yield 8 ms. missions 399/0/3, build:unchecked + 4 checks clean. No code change, no agents.
- Fresh checkout matched origin/main (HEAD detached as always, reset), npm ci
  (node_modules missing again, as always). CI confirmed green via GitHub Actions API.
- Re-ran tools/layout-tests.mjs fresh (fast checker): still 74 failures (27 front-
  face, 28 on-road, 19 overlap), byte-identical to last log. Checked layoutSnap.js
  step 5 (added 3362c4f) against the remaining cases: they sit at the OVERLAP_TOL
  (0.05 m) boundary or have no clear 8-dir push inside 2 m - not re-running the
  search again without a new idea (A6).
- Found the Claude.ai project doc claude/final-map.md (25 Nov) already says the map
  is "Closed, do not change without her" - added as context to the open "is the map
  locked" NEEDS_YOU question, left status open (her call to unpark [PAUSED-MAP], not
  mine to infer).
- Did not recheck CC0 proxy (already 403 today, A3). No other worker commit landed
  since last fetch. 10th flat run on this thread. No code change. Agents used: none.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures (27 front-face,
  28 on-road, 19 overlap) - all three independently confirmed wedged across 6+
  passes; next move is her verdict (sub-0.05m house-pairs / 0.3m washing-lines fine
  as drawn?) or a fresh hand-placement idea, not another generic algorithm pass.
- mapObjectsCheck.js's 16 small-object overlaps: not fixable under the 26 Nov
  "exact map spot, no sliding" rule - logged to NEEDS_YOU.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU, map may
  have moved the buildings since her playtest); 7 partly done (dup fetch fixed, rest
  parked - map-shipped-twice needs the new map question answered, shader-warmup
  needs a real browser). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open, now with the
  final-map.md context added; [PAUSED-MAP] stands until she answers.
## Next 5 items
1. Remaining 19 overlaps / 27 front-face / 28 on-road: all wedged, need her verdict
   or a genuinely new hand-placement idea - not another generic search (A6).
2. House atlas n/r + water-tank fix, bicycle fast-ride test: need real-browser
   confirmation - her machine.
3. CC0 prop sourcing: proxy-403, rechecked 26 Nov, still blocked. Don't recheck
   again same-day.
4. Zone-streaming pixel-rule, B2 vendor-chunk fix: real but Tier-2-risk, need a
   working browser check first.
5. M7 optional flavour NPC, item-7 shader-warmup: revisit only with draw-call
   headroom / real-browser measurement, neither available here.
## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered (now with final-map.md
  context); do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 26 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD can
  show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed"). check-material-clone script is
  check-material-clone.mjs, not .js. layout-pack.mjs (full repack, even --check)
  takes minutes in this container - don't run it foreground; layout-tests.mjs is
  the fast checker.
