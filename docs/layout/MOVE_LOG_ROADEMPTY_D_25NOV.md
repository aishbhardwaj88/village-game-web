# Road empty, fixer D (25 Nov)
Method: tmp/roadempty/own_runtime.mjs (band = mapData flat caps, plus 1.4 x wander amp drawn apron) on my modules; tmp/roadempty/fix_try.mjs (shift search up to 6 m).

## Done (my files)
- src/villageFixtures.js: new+old house pair (anchor banta, local -17.4,0.2) stood 1.2 m inside the drawn edge of inner_loop (623.8,-2.1). No shift up to 6 m clears it (best -0.57 m). REMOVED, const `REMOVED_ON_ROAD.newOldPair = true` (set false to restore). No mission or collider reads it.

## Checked, nothing on road
- wallWriting.js: 0 hits. The wall cards at (640,19) and (624,49) the audit lists as wall_writing_32 were already removed (comments in file). wallStories.js has no mesh. mainRoadFrontage.js builds nothing on the new layout. chaurahaEdges.js: BUILDINGS and corner groups are off on the new layout.

## Left alone
- chaurahaIsland (roundabout island at 602.9,19.9): audit counts it as not on road.
- Agent E's six items (sweet shop, CD shop, bookstall, old milk centre, Jhoola, Bhootiya ruin): untouched.

## Not my files (report only)
- Tarpaulin stall (716,20): not in villageFixtures or chaurahaEdges. Candidates mainRoadLife.js (stall with tarpaulin shade, ~l.207) or armFrontage.js.
- Wood and jute stall (495,3), outer lane west (503,-3) wall_writing_35: villageFurniture.js / villageFurniture3.js (ruin brick).
- Wall murals s7 (691,-109), (464,-65): s7 shops/houses, kit mapObjects. Hand pumps (648,-62), (553,-83), buffaloes (650,53), milestones 2 and 3 (758,116 / 803,117): kit/mapObjects*.js. Temple hb_props (683,-87): blender temple.
