# PARALLEL BUILD ORDER - 28 Oct. Run builders CONCURRENTLY, not one at a time.

29-32 hours of serial work does not fit before her evening deadline. These items are
independent, so build them in parallel with the `asset-builder` subagent.

## How to run it
- Spawn **3 to 4 `asset-builder` subagents at a time**, each with ONE family below.
  (More than 4 thrashes the Mac: Blender is CPU-bound.)
- Each owns only its own `build_<family>.py`, its own `.glb`, its own shots folder.
- **You (the main session) do all the git work.** Builders never run git.
- As each returns: review its report, run `npm run build`, commit that family, push,
  then spawn the next builder into the free slot.
- Keep all slots busy. An idle slot is the whole point of this being wasted.

## Wave 1 - materials still failing (blocks nothing else, highest value)
1. `terracotta` - real overlapping Mangalore tiles as geometry, height/rotation
   jitter, moss in the channels, a few cracked and a few paler replacement tiles.
2. `painted_wood` - real plank separation with gaps and shadow lines, grain along the
   plank, paint worn through to bare wood at edges and around fixings, per-plank
   colour variation.
3. `rusted_steel` - pitting, flaking scale with raised edges, downward streaks, bare
   metal where handled.
4. `rough_surfaces` - thatch, mud-and-dung, jute, packed earth, one script, four panels.

## Wave 2 - shared props, reused village-wide
5. `pots` - matka, ghada, surahi, kulhad. Clay grain, wet rings, chipped rims.
6. `handpumps` - 3 varieties (India Mark II on a plinth with soak drain, older short
   cast-iron, one with a cracked plinth and puddle). Cast-iron pitting, rust at
   joints, worn handle paint, damp patch and algae at the base.
7. `taps` - 3 varieties (wall tap over a cement trough, standpipe on a plinth, small
   pyaau-style stand). Lime scale at the spout.
8. `streetlamps` - 2 types (RCC concrete pole with tube fitting; panchayat solar with
   tilted panel, battery box, LED head). **The down-cable on each pole and sagging
   wires between poles matter more than the head.** Concrete stains, rust at joints,
   slight lean, pasted bills or painted numbers on some.
9. `lanterns` - day props only, night behaviour is deferred to v2.
10. `milestones` - yellow rounded top, white body, faded and weathered, no lettering.
11. `haystacks` - 3 variants (tall conical, low wide heap, half-used with a cut face).
    Shaggy silhouette broken with alpha-cutout straw cards, strong per-stack colour
    variation. NOT a smooth dome.
12. `gobar` - flat wall-stuck discs with visible hand prints, and the conical bitauda
    with a straw cap. Matte, near roughness 1.0, straw fibres in the texture.

## Wave 3 - main session does these itself, they touch src/
- Wire `laundry_line.glb` in, instanced, re-tinted per instance, sway in a vertex shader.
- Gaushala to 75% (scale the compound, not the contents). Update its LAYOUT.md and colliders.
- Primary school to 60-65%, shrinking the open verandah. Add slides, a painted stapu
  court, dustbins, more cycles in mixed adult/child sizes. Close every classroom door
  except the front one.
- Bus adda: remove the tyre, loose bricks, the khatiya on the chabutra, the pyaau pots.
- Flag texture redrawn at 1024 with a crisp 24-spoke chakra.
- Place each finished asset family into the village, instanced.

## Rules
- **Never work anything layout-related.** The map is being uprooted.
- **Night view is deferred to v2.** Do not build it.
- Report to her when all three waves are done, not before.
