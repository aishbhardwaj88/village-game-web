# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run). CI check pending for this run's commit; missions 399/0/3 (unchanged).
## This run
- Detached HEAD matched origin/main exactly; reattached with `checkout -B main
  origin/main`. node_modules missing, ran `npm ci`.
- Map-position cleanup: step 2's cart-clearing only fires for a cart in the way of a
  NAMED building's own candidate move, so a prop overlapping a building that never
  itself moved was never pushed. Added layoutSnap.js step 4: push any stray prop
  (washing line, notice board) clear in 8 directions when it still overlaps something.
- Repacked (~16 min, backgrounded): 81 -> 79 failures (overlap 26 -> 24: washing line
  #4/#7 cleared; 4 more + 1 notice board stayed, sandwiched). Tier 1 clean.
## Current state
- Feature-complete against GAME_COMPLETE.md; 79 failures (27 front-face, 28 on-road,
  24 overlap) - all three now need a per-item look, not another algorithm pass (snap
  granularity 24+26 Nov, stray-prop push this run - both tapped out).
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly
  done (dup fetch fixed, rest parked). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] parked.
- docs/handoff.md ~1960 lines, past its 3-day archive rule (A3) - flagged for a spare
  run to move pre-24-Nov entries to docs/archive/handoff-history.md.
## Next 5 items
1. Overlap per-item look (24 left): school/temple/gurudwara vs a house (3), 9 house-
   pairs at exactly 0.05 (CATTLE/DAIRY + OLD HAVELI, looks systematic), washing line
   #1/#12/#3/#10 + notice #1 (sandwiched), 4 tree-trunks (mango #164, kilngreen
   #29/30/32 - src/trees.js, not layoutSnap.js).
2. Front-face 27 unchanged across 3 passes (par~0 = facing road, fail is gap only) -
   needs a per-building look, not another algorithm param.
3. House atlas n/r + water-tank fix need real-browser confirmation - her machine.
4. CC0 prop sourcing: proxy-403, not a code task until that changes; zone streaming
   pixel-rule: broad refactor, real regression risk, scoped only.
## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD can
  show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed") - verify via code reading + Tier 1.
- Full repack (`node tools/layout-pack.mjs`) now ~16 min - always background it.
  check-dup-models / place-visibility-check are .js, not .mjs.
