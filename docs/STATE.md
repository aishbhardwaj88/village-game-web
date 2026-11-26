# State - rewritten every run, max 40 lines
Last updated: 26 Nov 17:3x (scheduled run). CI green on f9c3742 (run 1402) at start; this
run's own commit not yet CI-checked at write time. Missions 399/0/3, full Tier 1 chain
fresh this run (build:unchecked, licence-audit --check, check-dup-models, check-material-
clone.mjs, place-visibility-check) - all PASS/exit 0.
## This run
- Fresh checkout matched origin/main (HEAD detached as always, reset), npm ci (node_modules
  missing again, as always).
- Real code change: layoutSnap.js step 5 (house vs house/named-building sliver overlaps
  neither side's own candidate search ever tries to clear). Repacked (~16 min,
  backgrounded): layout-tests.mjs 75 -> 74 failures (overlap 20 -> 19, house#229/#246
  cleared). Verified byte-identical front-face/on-road lists before/after via mapData.json
  swap, not just re-run counts. Full details in handoff.md. Agents used: none.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures (27 front-face, 28
  on-road, 19 overlap) - remaining ones wedged across 4+ independent passes incl. this
  run's step 5, needs her call or a hand-logged per-item nudge, not another algorithm pass.
- mapObjectsCheck.js's 16 small-object overlaps: not fixable under the 26 Nov
  "exact map spot, no sliding" rule - logged to NEEDS_YOU.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly
  done (dup fetch fixed, rest parked, needs real browser). "Looks fixes ready" line
  stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP].
## Next 5 items
1. Remaining 19 overlaps (3 named-vs-house, 9 house-pairs at 0.05 m, 7 washing-line/
   notice-board): step 5 (this run) tried all, none movable further - only her verdict or
   a hand placement moves this further now.
2. House atlas n/r + water-tank fix, bicycle fast-ride test: need real-browser
   confirmation - her machine.
3. CC0 prop sourcing: proxy-403, not a code task until that changes.
4. Zone-streaming pixel-rule, B2 vendor-chunk fix: real but Tier-2-risk, need a
   working browser check first.
5. M7 optional flavour NPC, item-7 shader-warmup: revisit only with draw-call
   headroom / real-browser measurement, neither available here.
## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD can
  show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed"). check-material-clone script is
  check-material-clone.mjs, not .js.
- Full repack (`node tools/layout-pack.mjs`) ~16 min - always background it.
