# Who is building what, 31 Oct. Check this BEFORE starting anything.

Two machines are working: the autopilot loop on her Mac, and Claude on a cloud machine.
Do not build anything claimed by the other, you will collide and waste a run.

## Claude (cloud machine) owns these. LOOP: DO NOT TOUCH.
- `src/props.js` flagTexture (DONE, 31 Oct)
- `tools/blender/build_school_props.py` and `school_props*.glb` (slides, stapu court,
  dustbins, school earthen pots)

## The loop owns everything else, in this order
1. Wire `samples/materials/*.glb` into the places that use them, within budget
2. Bus adda cleanup: remove the stray tyre, loose bricks, the khatiya on the chabutra,
   the pyaau pots
3. Primary school: cycles in mixed adult and child sizes, classroom doors closed except
   the front one (NOT the slides/stapu/dustbins, those are Claude's)
4. Check each of the 22 places against its own `Places V1/<name>/LAYOUT.md`, report
   mismatches, move nothing

## Frozen, nobody touches
- The map: lanes, roads, positions, spacing, terrain, zone boundaries
- Materials: all 8 are with her for verdict
