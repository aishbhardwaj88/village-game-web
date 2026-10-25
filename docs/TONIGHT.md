# TONIGHT'S JOB - 25 Oct 2026, 21:30 IST. THIS IS THE ONLY THING THAT MATTERS.

**Pause everything else.** Not collision, not signboards, not the backlog. All of it
waits. The art director needs to know TONIGHT whether her Gemini reference pipeline
works, because she is spending her time drawing the remaining places and does not
want to invest further until one is proven in the game.

## THE GAUSHALA MODEL IS ALREADY BUILT. Your job is to WIRE IT IN.

`public/assets/models/gaushala.glb` exists, built in Blender from her reference by
the art director's side. `tools/blender/build_gaushala.py` is the source script if
you need to adjust it (re-run with `blender -b --python tools/blender/build_gaushala.py`).

- 36 m x 28 m walled compound, built to the drawn dimensions.
- 4,732 triangles, 1.2 MB, textures embedded (brick with normal map, tin with normal
  map, concrete, wood, plaster).
- Contains: brick perimeter walls with coping, front dwarf wall with iron railing,
  twin gate between brick piers, blank signboard panel above the gate, cattle shed
  with sloped tin roof on timber posts, concrete feed trough with fodder, straw
  bedding, hay store with sloped tin roof and three haystacks, plastered office with
  recessed door and two grilled windows, round brick tree planter, concrete water
  trough with water and a standpipe tap, chaff cutter, wheelbarrow, dung-cake heaps,
  buckets.
- The tree itself is NOT in the model (she builds organics herself) - the planter is
  there for a tree to sit in.

### Wiring task
`createGaushala` in `src/farmSites.js` is zone-streamed via
`zoneManager.register('gaushala', ...)` in `src/main.js` (anchor -125, -35), so the
normal `assetSlots.register` pattern used for `house_compound` and `halwai_compound`
does not apply directly. Wire it whichever way fits that streaming pattern:
- Load `gaushala.glb` when the gaushala zone builds, placed at the zone anchor.
- Keep the existing code-built geometry as an invisible named group so colliders and
  the world validator stay exact, same approach as `house_shell_old`.
- The model is authored in world offsets about its own centre, Y up, front facing
  +Z. Place it EXACTLY, no fit-scaling.
- The signboard panel above the gate is blank on purpose: paint the existing
  `gaushala` board onto it through the normal board system.

### Then the post office
Only after the gaushala is in the game and screenshotted. Build it in Blender from
`Places V1/post_office/MAIN_post_office_front_isometric.png`, `MAIN_post_office_sides.png`
and `MAIN_post_office_back_top.png`. **LOOK AT THOSE IMAGES with the Read tool first.**
Follow the same rules as below.

## Her answers to the build questions, 25 Oct

- **Build to the dimensions drawn on the reference.** The gaushala is 36 m x 28 m.
  Build it at that size. Do not shrink it to fit what is in the game today.
- **Layout collisions do not matter tonight.** She is unhappy with the current map and
  will hand over a new one. Place the new build at its existing anchor, let it
  overlap neighbours if it must, and note which neighbours it now intersects in
  `docs/handoff.md`. Do not redesign the layout to make room.
- **The dimensions are approximate but she approved them**, so honour them. You are
  lead engineer: you may scale sensibly where something is clearly wrong, but keep
  changes small and say in the report exactly what you changed and why.
- **Build it as drawn.** She likes her Gemini output and wants it reproduced
  faithfully, with good textures and a realistic look. This is not loose art
  direction, it is the design.
- **The dimension annotations are reference only.** The "36 m" lines, arrows, labels
  and the "FRONT VIEW" text must NOT appear in the game. Model the building, not the
  drawing.

## Copyright: light differentiation only. Lead engineer's call.

She asked for tweaks so a famous game cannot be challenged. The honest assessment:
she is not shipping the images, she is hand-building 3D models from them, and generic
village architecture (brick wall, tin roof, cattle shed) carries very thin protection.
Heavy tweaking would damage a design she likes for almost no benefit. So:
- **Invent all signage text, names and marks yourself.** Never copy lettering from
  the reference. Existing no-real-brands and no-real-village-names rules still apply.
- Vary small things as you build: bay counts, gate pattern, window placement, exact
  colours, prop arrangement. Natural variation, not redesign.
- Do NOT change the footprint, massing, roof form or overall character. That is what
  she approved.
- Note in the commit message that the model was hand-built from a dimensioned
  reference.

## Quality bar

CLAUDE.md section 5b still applies in full:
- Blender, not code primitives. Real bevels, wall thickness, recessed openings.
- Real CC0 PBR textures. **No solid-colour geometry anywhere.**
- Real doors and windows: frames, panels, grilles, sills, recesses.
- Source CC0 models for props (troughs, hay, buckets, carts, gates) before building.
- **Organic things are never code-built.** Trees, plants, cattle: source a model or
  leave them out and note it. She builds plants herself now.
- Shrink with tools/shrink.js, stay inside the asset and draw-call budgets.

## Done means

1. The model is in the game, visible at its place, replacing the old one.
2. `npm run build` passes including the world validator.
3. Screenshots from the player camera at normal eye height, in the real game, not a
   test scene: a front approach shot, a three-quarter shot and one interior or
   courtyard shot. Save them under `docs/shots/gemini-build-2026-10-25/`.
4. **You have LOOKED at those screenshots** and compared them against the reference.
   Name the specific ways the build differs from the drawing in your report. If you
   cannot name any difference, you have not looked properly.
5. Committed and pushed.
6. A short entry at the top of `docs/handoff.md`: what you built, what you changed
   and why, which neighbours it now overlaps, and the screenshot paths.

## After both are done

Go back to the normal priority order in `docs/AUTOPILOT.md`: collision first.
Do not start anything else before these are finished.
