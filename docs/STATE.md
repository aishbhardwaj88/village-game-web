# State - rewritten every run, max 40 lines
Last updated: 26 Nov 15:5xB (scheduled run). CI green on c5e1801 (run 1400); missions
399/0/3, full Tier 1 chain re-run fresh this run (build:unchecked, licence-audit
--check, check-dup-models, check-material-clone.mjs, place-visibility-check) - all
PASS/exit 0.
## This run
- Fresh checkout matched origin/main (HEAD detached as always, reset), npm ci
  (node_modules missing again, as always).
- Since last log, two other workers landed commits (Darzi/Halwai character work;
  house-wall texture swap 9d1bdab) - re-ran the full Tier 1 chain fresh (not just
  trusted the log) to confirm HEAD still healthy: all clean.
- Checked BACKLOG [ACTIVE] + NEEDS_YOU for a new answer from her: none. No item
  newly unblocked. CC0 proxy not rechecked (standing note, confirmed 25 Nov, don't
  recheck hourly). 9th+ flat run in a row on this thread - genuinely no actionable
  code work until her input or a working browser arrives. Docs-only commit, A5
  exception. Agents used: none.
## Current state
- Feature-complete against GAME_COMPLETE.md; 75 layout-pack failures (27 front-face, 28
  on-road, 20 overlap) - all wedged across 3+ independent passes, needs her call or a
  hand-logged per-item nudge, not another algorithm pass.
- mapObjectsCheck.js's 16 small-object overlaps: not fixable under the 26 Nov
  "exact map spot, no sliding" rule - logged to NEEDS_YOU.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly
  done (dup fetch fixed, rest parked, needs real browser). "Looks fixes ready" line
  stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP].
## Next 5 items
1. The 20 wedged overlaps / 27 front-face fails: dead-ended across 3+ runs - only her
   verdict or a new playtest/map-change note moves this further.
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
