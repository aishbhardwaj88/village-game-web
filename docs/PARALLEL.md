# HER CALL, 31 Oct: DO NOT CHECK ALL 22 PLACES. Check 5.

She challenged the cost and she is right. Checking every place against its LAYOUT.md is
insurance, not value, and most places have no complaint against them.

**Check ONLY these 5, the ones she has actually flagged:**
primary school, gaushala, bus adda, petrol pump, bazaar row.

The other 17 wait until after the new map lands. Do not touch them.

(LAYOUT.md is a place's OWN internal spec, compound size, rooms, verandah. It is not the
village map, so this work does survive the map change. But only where she has a complaint.)

---

# ANSWER TO THE THING THAT PARKED YOU, 31 Oct.

You stopped saying wiring approved materials "means rebuilding place models that the map
change will replace". That is wrong. **The map change moves places, it does not rebuild
them.** A building keeps its model and its materials when its position changes. So:

**WIRE THE FOUR APPROVED MATERIALS INTO THE PLACES NOW**: terracotta, painted wood,
rusted steel, packed earth. That work survives the map change completely.

Do not wire tin, thatch, mud and dung or jute yet, those four are with her.
Then do the rest of the list below. Read docs/CLAIMED.md first so you do not build what
the cloud machine is already building.

---

# RESUMED 31 Oct. Her four materials are rebuilt and with her. Do NOT rebuild them.

tin, thatch, mud and dung, jute were rebuilt as modelled geometry on 28 Oct and the new
board is with her. They are AWAITING HER VERDICT, not awaiting work. Do not touch any
material until she answers. Frozen and approved: terracotta, painted wood, rusted steel,
packed earth.

## THE MAP IS FROZEN. This is the hard rule for this whole stretch.
She has drawn a new village plan and is still revising it. Until she hands over the
final map, do NO work on: lanes, roads, kerbs, drains, positions, spacing, overlap
fixes, wayfinding, terrain or zone boundaries. Anything you move now gets moved again.

## What to work instead, in this order
1. Wire the four rebuilt material samples (`samples/materials/*.glb`) into the places
   that use them, within budget, so she can walk up to them rather than judging a board.
2. The place-level notes she gave on 27 Oct that are NOT layout:
   - primary school: slides, a painted stapu court, dustbins, earthen pots, cycles in
     mixed adult and child sizes, classroom doors closed except the front one
   - bus adda: remove the stray tyre, the loose bricks, the khatiya on the chabutra and
     the pyaau pots
   - flag texture redrawn at 1024 with a crisp 24-spoke chakra
3. Check each of the 22 places against its own `Places V1/<name>/LAYOUT.md` and fix
   anything that does not match. Report mismatches, do not move anything.

Never wait on her. If something needs her eye, one line in docs/NEEDS_YOU.md, then carry
on. A run that makes no game change is a failed run.

---



# HER EVENING IS BOOKED FOR THIS. 28 Oct, ~21:30 IST. Have it ready.

She cleared tonight to evaluate the game. A 21-hour stall already cost her today. The
target below is small on purpose, because something she can actually judge at 21:30
beats a long list that is half finished.

## Ready by 21:30 IST tonight, in this order

1. **A material board she can actually judge.** The v11 shot is unusable: dusk light,
   camera far back, panels in shadow. Rebuild the shot, not the materials: all 8 panels
   (tin, terracotta, painted wood, rusted steel, thatch, mud and dung, packed earth,
   jute) flat-lit, square to camera, close enough to fill the frame, on one image, each
   labelled. Put it at `docs/shots/material-board/FOR-HER/board.png` and write ONE line
   in `docs/NEEDS_YOU.md`. Then keep going; do not wait for her answer.
2. **Four asset families placed in the village**, instanced, where she will walk past
   them: pots, hand pumps, taps, street lamps. Built models already exist or are close.
   Placing them is what makes them judgeable.
3. **Everything else in the waves below**, without stopping.

Tell her at 21:30 what is ready. That message is the only one she wants tonight.

---

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
