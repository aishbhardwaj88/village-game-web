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
- [ ] [PAUSED-MAP] Diegetic wayfinding (signs, notice board, milestones) and lane
      continuity - layout-dependent, wait for the new map.
- [ ] [ACTIVE] Architecture: every place as one self-contained unit (geometry, props,
      colliders, anchors, signage) with one anchor transform read from a single source -
      standing rule, survives any map move, keep applying to new/reworked places.
- [ ] [PAUSED-MAP] Far-eastern cluster road connection, new house row facing temple,
      MAP.md elevation checks - all position/layout calls, wait for the new map.
- [ ] [ACTIVE] Texture pipeline: verify UVs/tiling survive arch.py -> strip-textures.mjs
      -> stagingYard.js for any place reworked; re-tint from sampled Places V1 colours,
      not picked by eye.
- [ ] [PAUSED-MAP] NPC/animal path validation against walls, door-routing through
      openings - path geometry is layout-dependent, wait for the new map.
- [ ] [ACTIVE] CC0 prop sourcing before hand-building, for any place still using
      hand-built generic props (pumps, matkas, pots, stools, charpais, carts, buckets,
      crates, tools). Check source + budget before each swap.
- [ ] [PAUSED-MAP] Crop-plot specifics (which plot is which crop, growth-stage mix,
      density per plot) - plot positions are moving, wait for the new map. Crop mesh/
      texture quality itself (not position) stays [ACTIVE].
- [ ] [PAUSED-MAP] MAP.md coverage checklist items that are pure position/layout
      (lanes/kerbs/drains network, canal+bridge, background houses+boundary walls) -
      wait for the new map.
- [ ] [ACTIVE] M7 optional flavour NPC (baagh keeper) - revisit if draw-call headroom
      opens up; not required for done.
- [ ] [PAUSED-MAP] src/kit/landLayout.js loadLandMap() (24 Nov item 7 dup download):
      the dead always-false getLayout() attempt is removed (24 Nov) - this now just
      fetches the raw map once, same behaviour, less wasted work. The real win (serve
      mapData.json instead of re-fetching the raw file) stays unsafe: field-by-field
      check found the two files have really diverged (887/1643 objects have a packed
      `.rect` in mapData.json vs 0/1643 in the raw file; places carry an `adjust`
      nudge too, e.g. house ~6.3 m moved) - switching changes real positions for every
      consumer (shopsPlace.js, every o.rect reader), already proven once to sink 3
      house-batch meshes. Real layout/position work - wait for the new map, per 5a-MAP.
- [ ] [ACTIVE] Item 7 shader-warm-up/slot-release, measured 24 Nov (window.__loadMarks
      on built dist/): texWarmed stuck at 2 all run, modelsReleased fired at ~9.38s -
      right on main.js's 9000ms SAFETY timeout, so the real "slots loaded" signal never
      resolved organically here. Could be this headless/no-GPU container or a real
      stuck-slot bug - check on a real browser before acting either way.

GAME_COMPLETE.md is fully ticked and audit-confirmed; everything above is optional
future polish layered on a finished game. See docs/NEEDS_YOU.md for anything blocked on
her. See docs/efficiency.md / docs/STATE.md for the current ORDER-24NOV work, which
takes priority over this list until it is done or parked.
