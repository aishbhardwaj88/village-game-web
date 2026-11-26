# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run, real code change). CI check pending on this push.

## This run
- Detached HEAD matched origin/main exactly (0 divergence); reattached with
  `checkout -B main origin/main`. node_modules missing, ran `npm ci`.
- Map-position cleanup, continued: added finer candidate steps (0.05/0.1/0.15/0.2 m) to
  layoutSnap.js's snap search (was min 0.25 m) - the residual 0.05-0.16 m house overlaps
  flagged last run were exactly this granularity gap.
- Repacked (~16 min, backgrounded): 116 -> 81 failures. On-road 43->28, overlap 46->26,
  front-face unchanged 27. Tier 1 clean (build:unchecked, licence-audit, check-dup-models,
  check-material-clone, place-visibility-check).

## Current state
- Feature-complete against GAME_COMPLETE.md; map-position cleanup now at 81 failures
  (was 123 five runs ago), still has a real driver - pick up next run if time allows.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7 partly done
  (dup fetch fixed, rest parked). "Looks fixes ready" line stands in NEEDS_YOU.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP] parked.

## Next 5 items
1. Map-position cleanup: 81 failures (27 front-face, 28 on-road, 26 overlap) - per-item
   look next, granularity is tapped out; `node tools/layout-tests.mjs --verbose`.
2. Front-face 27 unchanged across both granularity/pass tweaks - likely needs an actual
   per-building look (gap/par numbers in the verbose log), not another algorithm param.
3. House atlas n/r + water-tank fix need real-browser confirmation - her own machine.
4. CC0 prop sourcing: proxy-403, not a code task until that changes.
5. Zone streaming pixel-rule: broad refactor, real regression risk, scoped only.

## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.

## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first.
- HEAD can show detached/stale vs origin/main - always `git fetch` fresh before judging.
- Headless chromium crashes ("Target crashed") - screenshot.js/world-validator.js/
  regression-check.js hit this; verify via code reading + Tier 1 (A7) instead.
- Full repack (`node tools/layout-pack.mjs`) now ~16 min (was ~9-10) - always background it.
- check-dup-models and place-visibility-check are .js not .mjs - `ls tools/` if unsure.
