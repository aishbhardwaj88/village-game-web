# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run). CI check pending for this run's commit; missions 399/0/3 (unchanged).
## This run
- Detached HEAD matched origin/main exactly; reattached with `checkout -B main
  origin/main`. node_modules missing, ran `npm ci`.
- No safe code change found (see Next item 1 below - all three overlap-fixing
  avenues dead-end without her OK or cross worker-ownership lines). Instead:
  ran `src/kit/mapObjectsCheck.js` (existing tool, not reported this cycle) and
  logged its 16 house-overlap findings to NEEDS_YOU. Archived docs/handoff.md's
  overdue 22 Nov block (A3, was 9+ days late) to docs/archive/handoff-history.md.
## Current state
- Feature-complete against GAME_COMPLETE.md; 75 layout-pack failures (27
  front-face, 28 on-road, 20 overlap) - all wedged (algorithm already tries,
  can't improve): 3 named-building-vs-house, 9 house-pairs at exactly 0.05 m
  (CATTLE AND DAIRY/OLD HAVELI row spacing, looks drawn-in), 5 washing-line/
  notice-board (sandwiched, no direction within 6 m clears them).
- Separately, `mapObjectsCheck.js` found 16 small objects (resting spots,
  milestone, tempo/play patches, 4 pond-bank-vs-house) overlapping houses -
  NOT fixable by nudging: `mapObjectsPlan.js` has her 26 Nov rule baked in
  ("props stand at their exact map spot, nothing is slid off a road", NUDGE
  set empty). Logged to NEEDS_YOU, not acted on.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7
  partly done (dup fetch fixed, rest parked). "Looks fixes ready" line stands.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP].
## Next 5 items
1. The 20 wedged overlaps: a hand-authored per-item nudge is NOT a free pick
   any more for the mapObjectsPlan.js-placed ones (her no-sliding rule) - only
   the layoutSnap.js/layout-pack ones (named-building/house-pair/washing-line)
   are still fair game for that, if she doesn't just say "fine as drawn".
2. Front-face 27 unchanged across 3 passes (par~0 = facing road, fail is gap
   only) - needs a per-building look, not another algorithm param.
3. House atlas n/r + water-tank fix need real-browser confirmation - her machine.
4. CC0 prop sourcing: proxy-403, not a code task until that changes; zone
   streaming pixel-rule and the B2 vendor-chunk fix (efficiency-audit-24nov.md):
   both real but Tier-2-risk, need a working browser check first.
## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD
  can show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed") - verify via code reading + Tier 1.
- Full repack (`node tools/layout-pack.mjs`) now ~16 min - always background it.
  check-dup-models / place-visibility-check are .js; licence-audit and
  check-material-clone are .mjs (licence-audit.js does not exist - don't guess it).
