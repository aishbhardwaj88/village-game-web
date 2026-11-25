# State - rewritten every run, max 40 lines

Last updated: 25 Nov (41). LOOKS LIST items 1-7 all done or correctly parked, and
her NEEDS_YOU "Looks fixes ready" line is now sent (wasn't before this run). Item 8
(PUSH LIST) checked: its measurable parts are done, the one open sub-item is
container-blocked, not a real gap.

## Current state
- 25 Nov VARIETY: houses (16 washes, per-house rotation/wear/material tint, housesMaterial.js) and ground (dryearth+lane mixed by area noise, materials.js) done, 0 KB added, same shader programs. Sheet docs/review/variety-sheet.png awaits her yes (frozen once approved). Not browser-verified (container crash).
- Items 1, 3, 4, 5, 6: done (entries 24-38). Item 1 double-checked this run by
  reading code, not just trusting the old note: src/kit/housesMaterial.js is the
  live new-map house kit's own material (WALL_VARIANTS/EXTRA_VARIANTS, per-house
  seed), confirmed wired to the real ?layout=new houses, not a dead/old path.
- Item 2 (chauraha road buildings): could NOT reproduce - NEEDS_YOU, open.
- Item 7: "textures fetched twice" fixed (entry 39); "map shipped twice" and
  "shader warm-up" stay PAUSED-MAP / needs-real-browser (entry 39/40).
- Item 8 (PUSH LIST): missions-check last clean 358/0/4 WARN (entry 38, all 8
  missions + 10 side jobs + tractor/trolley/cart spawns); school_bell float and
  distanceToCanalWater both fixed (entry 38). Only "zero console errors" (world-
  validator/regression-check pass) stays unticked in FINISH_LINE.md - blocked by
  the container's Chromium-hangs-on-accounts.google.com issue, logged repeatedly,
  not a code gap. Don't re-attempt this blind; needs a real browser to clear.
- BACKLOG [ACTIVE] items checked this run, nothing safely actionable: CC0 prop
  sourcing (matka/charpai/cylinder/bicycle in housesClutter.js, already textured
  via the shared CELL atlas, not flat colour) needs a Poly Haven lookup -
  api.polyhaven.com gave connection-reset from this container this run, retry
  next time network differs. M7 NPC is out of scope (no characters this run).

## Next 5 items
1. If she's reacted to the "Looks fixes ready" line, address any FIX notes first.
2. Retry the Poly Haven API lookup for matka/charpai/cylinder/bicycle CC0 models
   when network allows; only swap in a real scan if one is genuinely better than
   the existing textured-atlas hand-built version, not reflexively.
3. Item 8's console-error check: try again only once a real (non-headless-shell)
   browser path works in this container, or she confirms it live herself.
4. Shader-warm-up (texWarmed stuck at 2): same, needs a real browser.
5. Architecture-as-one-unit / texture-pipeline verify: apply whenever a place is
   next built or reworked, not a standalone task right now.

## Blockers
- Item 2 needs her eye or exact building names - logged, open.
- No in-browser PLAY screenshot here (egress block); title screenshot +
  Playwright/CDP network capture used instead when it's needed at all.
LAST_FULL_PASS=82c337c (unchanged - browser chain unreliable past world-validator,
not re-attempted this run, no browser-relevant code touched).

## Known about this container
- node_modules empty every fresh container; HEAD detached on a stale local
  main (fetch+checkout -B fixes it).
- Chromium can't reach accounts.google.com - hangs/crashes any browser-based
  check (world-validator, regression-check, screenshot, greenery-audit).
- New this run: api.polyhaven.com also gave a connection reset via curl -
  same proxy/egress restriction, not just dl.polyhaven.org as noted before.
