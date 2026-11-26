# State - rewritten every run, max 40 lines
Last updated: 26 Nov 20:5x (scheduled run). CI green on d85831c (run 1417), confirmed
via Actions API, no local build needed. No code change this run. LAST_FULL_PASS=3362c4f.
## This run
- 13th flat run on this thread: re-synced to origin/main (HEAD detached as always,
  reset), npm ci (node_modules missing again, as always). CI confirmed green via
  GitHub Actions API without a local build.
- Re-checked every open BACKLOG [ACTIVE] item for a genuinely new angle (A6, not a
  re-verify): architecture-as-unit and texture-pipeline items still only apply to a
  reworked place - none is being reworked while [PAUSED-MAP] stands. M7 NPC needs
  draw-call headroom this container can't measure. Item 7 shader-warm-up needs a
  real browser. CC0 proxy still 403 (not re-checked twice same day per note).
- Ran check-budget: still using a stale perf-ride (21 Nov, flagged "older than 3
  days: reported only", not a fresh measurement) - 13.01 MB/7.2s before Play, same
  ballpark as the 10.7 MB already in NEEDS_YOU, nothing new to report her way.
  public/assets du -sh = 186 MB total, but CLAUDE.md's cap on that total was already
  relaxed 27 Oct in favour of before-Play size, which is the real open item.
- LOOKS LIST 1-8: all confirmed done/parked by many prior independent entries
  (grepped handoff.md/NEEDS_YOU.md, did not re-run checks - A6). No new unblocked
  item found anywhere.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures (27 front-face,
  28 on-road, 19 overlap) - all three independently confirmed wedged across 6+
  passes; next move is her verdict or a fresh hand-placement idea, not another pass.
- mapObjectsCheck.js's 16 small-object overlaps: not fixable under the 26 Nov
  "exact map spot, no sliding" rule - logged to NEEDS_YOU.
- LOOKS LIST 1-8: all done/parked (see "This run" above). "Looks fixes ready" line
  stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open, with final-map.md
  context added 26 Nov; [PAUSED-MAP] stands until she answers.
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
  context); do not unpark without her yes. Every [ACTIVE]/[PAUSED-MAP] BACKLOG item
  is now blocked on either this, the CC0 proxy, or a real browser - 13 flat runs.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 26 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD can
  show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed"). check-material-clone script is
  check-material-clone.mjs, not .js. layout-pack.mjs (full repack, even --check)
  takes minutes in this container - don't run it foreground; layout-tests.mjs is
  the fast checker.
