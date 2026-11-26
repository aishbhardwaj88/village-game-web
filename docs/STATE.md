# State - rewritten every run, max 40 lines
Last updated: 26 Nov 18:1x (scheduled run). CI green on 3362c4f (run 1405) at start;
no code change this run. Missions 399/0/3 unchanged (not re-run, A6 - no diff that
would move it since last confirmed). LAST_FULL_PASS=3362c4f.
## This run
- Fresh checkout matched origin/main (HEAD detached as always, reset), npm ci
  (node_modules missing again, as always). CI confirmed green via GitHub Actions API.
- Rechecked CC0 proxy (polyhaven/ambientcg): still 403, unchanged since 25 Nov.
- No new answer from her in NEEDS_YOU/BACKLOG. No new/reworked place for the
  architecture/texture-pipeline ACTIVE rules to apply to. check-budget.js perf data
  5 days stale; real-browser ride still unavailable here.
- Another worker pushed c8774ce (character work, not in scope) after this run's
  fetch - not rebased onto, since no local commit needed it this run.
- 9th flat run on this thread. No code change. Agents used: none.
## Current state
- Feature-complete against GAME_COMPLETE.md; 74 layout-pack failures (27 front-face,
  28 on-road, 19 overlap) - all three categories independently confirmed wedged
  across 5+ passes; next move is her verdict (sub-0.3m fine as drawn?) or a hand
  placement, not another algorithm pass.
- mapObjectsCheck.js's 16 small-object overlaps: not fixable under the 26 Nov
  "exact map spot, no sliding" rule - logged to NEEDS_YOU.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU, map may
  have moved the buildings since her playtest); 7 partly done (dup fetch fixed, rest
  parked - map-shipped-twice needs the new map question answered, shader-warmup
  needs a real browser). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP].
## Next 5 items
1. Remaining 19 overlaps / 27 front-face / 28 on-road: all wedged, need her verdict
   or a hand placement - not another generic search (A6).
2. House atlas n/r + water-tank fix, bicycle fast-ride test: need real-browser
   confirmation - her machine.
3. CC0 prop sourcing: proxy-403, rechecked 26 Nov, still blocked. Don't recheck
   again same-day.
4. Zone-streaming pixel-rule, B2 vendor-chunk fix: real but Tier-2-risk, need a
   working browser check first.
5. M7 optional flavour NPC, item-7 shader-warmup: revisit only with draw-call
   headroom / real-browser measurement, neither available here.
## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 26 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD can
  show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed"). check-material-clone script is
  check-material-clone.mjs, not .js.
- Full repack (`node tools/layout-pack.mjs`) ~16 min - always background it.
