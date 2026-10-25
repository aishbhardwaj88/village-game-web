# OVERNIGHT ORDER - 25 Oct 2026, 23:30 IST. Runs ~20 hours. Do not stop.

The art director has finished a full set of 2D reference drawings for the village and
is asleep. **Tonight's job is to build those places in 3D and put them in the game.**

## Read this first, then `Places V1/README.md`

`Places V1/` has one folder per place, 32 of them with a `LAYOUT.md`.

**`LAYOUT.md` IS THE SPEC. READ IT BEFORE YOU LOOK AT ANYTHING ELSE. It overrides the
images wherever they disagree.** It carries the sizes, her rules, and the known
mistakes in the images.

Then LOOK at the `MAIN_<place>_<view>.png` images with the Read tool. Actually look.
Do not build from the filename or from what is already in the game.

## Two failures from earlier tonight. Do not repeat them.

A gaushala was built and shipped wrong. The causes, both avoidable:

1. **`Places V1/gaushala/LAYOUT.md` was never opened.** The spec said a 4 x 3 m office,
   a 6 x 5 m straw store, 4 m deep sheds on BRICK pillars, and a compost pit with a
   round biogas dome. What got built had a 7.2 x 6.8 m office, a 15 m straw store,
   6.4 m sheds on timber posts, and no biogas dome at all.
2. **Texture repeat values were 4 to 11 times too high**, so every texture tiled to
   sub-pixel and averaged out to flat colour. `box_uv()` already gives UVs in METRES.
   The project's own working values live in `tools/blender/arch.py`:
   `brick 1.2, tin 0.8, plaster 0.5, terracotta 1.0, thatch 1.0, wood 1.0, metal 1.0,
   jute 2.6`. Use those. A repeat of 13.8 on a 36 m wall is 497 tiles. That is the bug.

A third, deeper one: the build hand-rolled its own geometry and materials instead of
using the project's existing pipeline.

## Use the existing pipeline. Do not hand-roll.

`tools/blender/arch.py` has `Kit` and `Box` and is what `build_school.py`,
`build_house.py` and the rest already use. It handles texture groups, vertex-colour
tinting, baked AO and draw-call grouping for you.

- `Kit(split_props=..., own=(...), tex_override=..., route=..., wood_slot=...)`
- `kit.add(kind, obj, color=None)` where kind is plaster / brick / tin / terracotta /
  thatch / wood / metal / jute / plinth / trim / paint / props
- `Box(name, x0, x1, z0, z1, h, t).fb() / .recess() / .through() / .solid()` for walls
  with real thickness and recessed openings
- `kit.finalize(out, tints, ...)` writes the `.glb`
- Read `build_school.py` end to end before your first build. It is the worked example.

**Colour comes from the `tints` dict in `finalize`, sampled from HER reference image,
not from whatever the texture set happens to average to.** Sample the actual colours
out of the reference before you build.

## The rules she gave, verbatim in effect

- **Proportions are hers and are not to be changed.** She spent a long time settling
  them. You may adjust a size only if it is genuinely wrong for the game, and only in
  scale, never in proportion. Say in the report what you changed and why.
- **Do not remove anything.** If the drawing has a painted cow on the milk booth wall,
  a mural, a notice, a taraju, a specific sign, build it. Those are deliberate.
- **Metre numbers, arrows and view labels in the images are drawing notes.** Never
  build them.
- **Images carry no lettering. You write all names and signboards**, Hindi bold and
  larger on top, English not bold and smaller below but comfortably legible (CLAUDE.md
  section 7). Invent every name. No real brands, no real village names.
- **Skip the khets and fields tonight**: sugarcane, mustard, paddy, mango_baagh. Skip
  organics generally: trees, plants, crops, flowers, cows and people. She builds those.
  Build the planters, platforms and troughs they sit in, and leave them empty.
- **Replace what is already in the game.** Primary school, gurukul and dairy have all
  been redrawn. The in-game versions are superseded.

## Build order

1. **Gaushala, rebuilt to `LAYOUT.md`.** The current `gaushala.glb` and
   `tools/blender/build_gaushala.py` are wrong: rebuild them properly with `Kit`,
   correct repeats, tints sampled from the reference, and every item in the spec
   including the compost pit and biogas dome. Keep the wiring in `src/farmSites.js`
   (it already loads `assets/models/gaushala.glb`), just fix the model and the
   collider boxes to match the corrected footprint.
2. **The three redrawn replacements**: `primary_school`, `gurukul`, `dudh_dairy`.
3. Then the rest, simplest first so the count climbs:
   `bus_adda`, `chaupal`, `volleyball`, `puncture`, `tubewell`, `paani_tanki`,
   `dharam_kanta`, `akhada`, `ration_shop`, `post_office`, `atta_chakki`,
   `petrol_pump`, `panchayat`, `tv_house`, `khalihan`, `canal`, `pond`,
   `khel_maidan`, `bhatta`, `houses_kit`.
4. `houses_kit` is 8 house types (A to H) for generating 100+ houses. Build the 8
   types as separate models and wire them so the existing background houses draw
   from them, instanced.

## Done means, for every single place

1. `LAYOUT.md` read, images looked at, every listed item present.
2. Built with `Kit`, correct texture repeats, tints sampled from the reference.
3. Model in the game, replacing the old one, with colliders matching the real
   footprint. Keep the old geometry as an invisible named group so collision and the
   world validator stay exact.
4. `npm run build` passes, including the world validator.
5. `node tools/screenshot.js` or an equivalent in-game capture, saved under
   `docs/shots/places-2026-10-26/<place>/`.
6. **You have LOOKED at that screenshot beside the reference image and named the
   specific differences in your report.** "Proof shots taken" is not looking. If you
   cannot name a difference, you have not looked.
7. Committed and pushed. Push works over SSH now.
8. One line at the top of `docs/handoff.md`: place, what you changed from the spec and
   why, which neighbours it now overlaps, screenshot path.

## Overlaps are expected and fine

Several of these are much bigger than what they replace. She is redoing the map later.
Place each at its existing anchor, let it overlap, and note the overlaps. **Do not
redesign the layout to make room.**

## When the places are done

Do not stop and do not wait for her. Go straight back to the paused work in
`docs/AUTOPILOT.md` and `docs/BACKLOG.md`, in this order:
1. Collision (`tools/collision-test.js`, the A0a items) - there is uncommitted
   collision work in the tree from the run before this one, finish it rather than
   discarding it.
2. Signboards to the 25 Oct final rule.
3. Then Tier 1, 2, 3 of the 25 Oct NEW DIRECTION in `docs/ART_REVIEW.md`.

## Never

- Never stop the loop or create `tmp/STOP`.
- Never skip `LAYOUT.md`.
- Never hand-roll geometry when `arch.py` covers it.
- Never report a place done on a screenshot you did not look at.
- Never remove a detail from her drawings because it is fiddly.
- Never spend money or credits.
