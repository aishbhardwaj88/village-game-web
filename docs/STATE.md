# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run). CI check pending for this run's commit; missions 399/0/3 (unchanged).
## This run
- Detached HEAD matched origin/main exactly; reattached with `checkout -B main
  origin/main`. node_modules missing, ran `npm ci`.
- Tree-trunk overlaps (4 left, flagged last run as "not layoutSnap.js's job"): found
  they ARE fixable there - src/layout/layoutSnap.js now has `nudgeTreeTrunks()`,
  run after the road snap settles solids' final positions, pushing any tree whose
  centre lands inside a building clear of it (8 directions, 0.1 m steps, same pattern
  as the stray-prop push). Wired into tools/layout-pack.mjs's pack().
- Repacked (~16 min, backgrounded): 79 -> 75 failures (overlap 24 -> 20: mango #164 +
  kilngreen #29/30/32 all cleared). Tier 1 clean (build:unchecked, licence-audit
  (correct name is licence-audit.mjs, not .js), check-dup-models, check-material-
  clone, place-visibility-check all exit 0) + missions-check 399/0/3 unchanged.
## Current state
- Feature-complete against GAME_COMPLETE.md; 75 failures (27 front-face, 28 on-road,
  20 overlap) - remaining overlaps are the hard ones: 3 named-building-vs-house (depth
  0.08-0.62, wedged - algorithm already tries and can't improve), 9 house-pairs at
  exactly 0.05 (CATTLE AND DAIRY/OLD HAVELI, looks like a systematic row-spacing
  artifact in her drawing itself), 5 washing-line/notice-board (sandwiched, no
  direction within 6 m clears them).
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly
  done (dup fetch fixed, rest parked). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] parked.
- docs/handoff.md ~1960+ lines, past its 3-day archive rule (A3) - flagged for a spare
  run to move pre-24-Nov entries to docs/archive/handoff-history.md.
## Next 5 items
1. Remaining 20 overlaps are each genuinely wedged (algorithm search already covers
   them) - a real fix now means either a hand-authored per-item nudge (logged, like
   housesMoves.json) or her call that a 0.05-0.3 m touch is fine as drawn. Candidate:
   ask her once in NEEDS_YOU rather than another algorithm pass.
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
  check-dup-models / place-visibility-check are .js; licence-audit and
  check-material-clone are .mjs (licence-audit.js does not exist - don't guess it).
