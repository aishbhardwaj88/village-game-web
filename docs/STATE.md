# State - rewritten every run, max 40 lines
Last updated: 26 Nov (scheduled run). CI green on a310cbe; missions 399/0/3 (unchanged).
## This run
- Detached HEAD matched origin/main exactly; reattached with `checkout -B main
  origin/main`. node_modules missing, ran `npm ci`.
- Independently re-traced the 20 wedged overlaps (fresh `node tools/layout-tests.mjs`)
  before reading handoff, reached the same verdict as the immediately prior commit
  (c3b49c0): no unblocked code fix. Did not repack (would only reconfirm, A6). No
  code change - 2nd flat run in a row after that commit.
## Current state
- Feature-complete against GAME_COMPLETE.md; 75 layout-pack failures (27
  front-face, 28 on-road, 20 overlap) - all wedged (algorithm already tries,
  can't improve): 3 named-building-vs-house (named places are fixed-as-drawn,
  26 Nov code rule), 9 house-pairs at exactly 0.05 m (CATTLE AND DAIRY/OLD
  HAVELI row spacing, looks drawn-in), 5 washing-line/notice-board (sandwiched,
  no direction within 6 m clears them). Front-face 27: par~0 (correctly facing),
  gap-only - sets back from road as drawn, not a bug.
- mapObjectsCheck.js's 16 small-object overlaps (resting spots, milestone,
  tempo/play patches, pond-bank-vs-house): mapObjectsPlan.js's 26 Nov "exact map
  spot, no sliding" rule makes NUDGE empty - not fixable, logged to NEEDS_YOU.
- LOOKS LIST 1-8: 1/3/4/5/6/8 done and live; 2 unreproducible (NEEDS_YOU); 7
  partly done (dup fetch fixed, rest parked). "Looks fixes ready" line stands.
- Her "is the 25 Nov map locked for good?" (NEEDS_YOU) still open; [PAUSED-MAP].
## Next 5 items
1. The 20 wedged overlaps are now dead-ended twice (independently) - don't
   re-chase a 3rd time without new input (her verdict, a new playtest note, or
   a concurrent commit changing the map). Only a hand-logged per-item nudge
   or her "fine as drawn" call moves this further.
2. Front-face 27 unchanged across 3+ passes (par~0 = facing road, fail is gap
   only, as-drawn setbacks) - needs her look, not another algorithm param.
3. House atlas n/r + water-tank fix need real-browser confirmation - her machine.
4. CC0 prop sourcing: proxy-403, not a code task until that changes; zone
   streaming pixel-rule and the B2 vendor-chunk fix (efficiency-audit-24nov.md):
   both real but Tier-2-risk, need a working browser check first.
5. M7 optional flavour NPC (baagh keeper): revisit only if draw-call headroom
   is confirmed (needs real-browser measurement, not available here).
## Blockers
- [PAUSED-MAP]: her "map locked?" question unanswered; do not unpark without her yes.
- CC0 proxy (polyhaven/ambientcg): 403, re-confirmed 25 Nov. Do not re-check hourly.
## Known about this container
- node_modules missing on fresh container, every time - run `npm ci` first. HEAD
  can show detached/stale vs origin/main - always `git fetch` fresh first.
- Headless chromium crashes ("Target crashed") - verify via code reading + Tier 1.
- Full repack (`node tools/layout-pack.mjs`) now ~16 min - always background it;
  `layout-tests.mjs` is a separate, fast, non-browser static check (no repack
  needed to re-read current failure counts).
