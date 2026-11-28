# NO STOP RULE LIVES IN THIS FILE.

Any instruction here to stop, report, park, or wait on her verdict is DEAD, whatever it
says and whenever it was written. The only live order is docs/PARALLEL.md.
Waiting on her verdict is never a reason to stop. A run with no game change is a failure.

# Backlog - the story board (condensed 24 Nov, full history in docs/archive/backlog-done.md)

Open items only, max 80 lines. `docs/FINISH_LINE.md` defines done. Tags: [ACTIVE] work
now, [PAUSED-MAP] CLAUDE.md 5a-MAP says don't spend a cycle on this until the new map
lands (positions/lanes/overlaps/wayfinding only - internals of the same place are fine),
[GATED-HER] needs her yes/taste call before more work, already in NEEDS_YOU.md.

## Never idle: how to handle a blocked item
If the top item can't be finished: mark `- [!]`, add `BLOCKED: <sentence>`, write the
same sentence in NEEDS_YOU.md ending `- status: open`, then take the next item. Never
wait, never stop a run. A `- [!]` item is skipped until its NEEDS_YOU line reads `done`.

## Open work

- [!] [GATED-HER] Material library freeze: board rendered, her per-material verdict
      still pending (render pipeline was broken, now fixed per 23 Nov entry - render it
      once at 2m per panel, send, wait for her verdict only on THIS item, keep working
      everything else). Once approved: freeze in docs/material-library.md, apply by name
      everywhere, re-render staged places against it. BLOCKED: her taste verdict.
- [ ] [ACTIVE] Lane continuity against the approved map: a real on-foot/real-browser
      check that kerbs, drains, lamps and street life carry all the way to where each
      lane leads (FEEDBACK A-2c item 8). Signage half of this item moved to archive
      27 Nov (confirmed built).
- [ ] [ACTIVE] Architecture: every place as one self-contained unit (geometry, props,
      colliders, anchors, signage) with one anchor transform read from a single source -
      standing rule, survives any map move, keep applying to new/reworked places.
- [ ] [ACTIVE] Texture pipeline: verify UVs/tiling survive arch.py -> strip-textures.mjs
      -> stagingYard.js for any place reworked; re-tint from sampled Places V1 colours,
      not picked by eye.
- [ ] [ACTIVE] NPC/animal path validation against walls, door-routing through openings,
      against the approved map's roads/lanes. Both static halves now checked clean
      (28 Nov): `check-door-routes.mjs` (self-test 4/4, real check 0 gaps - door-routing
      math already run every commit) and `roaming-check.mjs` (first run ever, 0 FAILs:
      5230 lane samples across 12 roads, all on-band and left-of-travel, 24 road ends
      all joins/turn-rounds). Remaining gap is a live trace against the real wall mesh
      (world-validator check 9) - needs a real browser, this container can't run one.
- [ ] [ACTIVE] CC0 prop sourcing before hand-building, for any place still using
      hand-built generic props (pumps, matkas, pots, stools, charpais, carts, buckets,
      crates, tools). Check source + budget before each swap.
- [ ] [ACTIVE] MAP.md coverage checklist: lanes/kerbs/drains (roadNetwork.js already
      covers every kind by name, real-browser look still owed, no code gap found 27
      Nov). Background houses + canal/bridge already built. Compound/boundary walls
      FIXED 27 Nov: they were still at 1-Nov-plan positions, never carried to the 25
      Nov map (drift 7-150 m/place) - re-anchored via the map's own documented
      rotate-then-translate recipe (src/mapCompoundWalls.js); "Small shrine" wall
      removed (7 Nov no-shrines order). Residue: the on-road filter used to drop a
      whole wall run if any part touched a road - IMPROVED 27 Nov to trim to the
      clear stretch instead, restoring hidden pieces on 7 walls incl. 1/4 of
      gurudwara's (measured, filed in NEEDS_YOU.md); anganwadi's wall measures fully
      inside the road on all 4 stretches, genuinely nothing to restore there, her
      call still open; "Tea stall at the square" has no confident match and stays at
      its old position. Also found+fixed (27 Nov) a live boot-crash: src/wallWriting.js
      had 7 wall-decal coordinates all stale since the re-anchor, the first one threw
      uncaught and halted src/main.js's boot right after it - likely the real cause of
      the game hanging at "Loading the village 0%". Fixed, verified live.
- [ ] [ACTIVE] M7 optional flavour NPC (baagh keeper) - revisit if draw-call headroom
      opens up; not required for done.
- [ ] [ACTIVE] src/kit/landLayout.js loadLandMap() (24 Nov item 7 dup download): the
      real win (serve mapData.json instead of re-fetching the raw map file) was unsafe
      while position work waited on the map (887/1643 objects have a packed `.rect` in
      mapData.json vs 0/1643 in the raw file, plus per-place `adjust` nudges - already
      sank 3 house-batch meshes once). Map is locked now, so this can be done properly:
      reconcile the two files field-by-field before switching every `o.rect` consumer
      (shopsPlace.js etc.), one Tier-2 commit, full build + regression-check.
      NOTE 27 Nov: the main consumer is shopsPlace.js, which this loop may not edit
      (shops worker's file per the scheduler's standing scope list) - this loop can
      reconcile landLayout.js's own data but can't switch that consumer alone; needs
      either the shops worker to do the swap or her OK to cross scope.
GAME_COMPLETE.md is fully ticked and audit-confirmed; everything above is optional
future polish layered on a finished game. See docs/NEEDS_YOU.md for anything blocked on
her. See docs/efficiency.md / docs/STATE.md for the current ORDER-24NOV work, which
takes priority over this list until it is done or parked.
