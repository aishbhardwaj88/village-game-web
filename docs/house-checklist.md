# House checklist — Places V1/house/MAIN_house_courtyard_cutaway.png

Rule (art director, 2026-10-21): a Blender asset is only done when
`docs/shots/compare/<asset>.png` exists (Places V1 reference LEFT, in-game NORMAL-mode render RIGHT,
same angle) and is shown on the dashboard. Tick an item only with that shot (or a named close-up in
`docs/shots/compare/house/`). Judged on normal-mode renders only (no `?dev=1`; `?proof=1` only
positions the camera, it turns on none of dev mode's visible extras).

Built by `tools/blender/build_house.py` (run `tools/blender/make_house.sh`), authored in world offsets
from HOUSE_CENTER (-48, 39), placed with an exact asset slot (`house_compound`, `src/main.js`).
Old code-built walls/roof/yard stay as invisible hidden groups (`house_shell_old`, `house_yard_old`) so
collision and `tools/world-validator.js` stay exact.

Compare image: `docs/shots/compare/house.png`

| # | Element | Status | Proof |
|---|---------|--------|-------|
| 1 | Two storeys plus a roof terrace, not one block | [x] | compare/house.png |
| 2 | Open-to-sky courtyard, smooth blue-grey floor, rangoli in the centre | [x] | compare/house/courtyard_rangoli.png |
| 3 | Upper-floor balcony around the courtyard, dark carved wooden railing | [x] | compare/house.png |
| 4 | Pale blue-grey limewash walls, darker plinth band, string-course between floors | [x] | compare/house.png |
| 5 | Dark wood double doors + frames on both floors, louvred window shutters, small square wall vents | [x] | compare/house/facade_doors.png |
| 6 | Dark wooden entrance gate in the boundary wall, potted plants beside it | [x] | compare/house/gate.png |
| 7 | Hand pump on a square platform, tree in a raised brick planter, wooden jhoola on a frame — platform, brick planter and jhoola done; the planter's tree is still the code-built low-poly neem stand-in (trees come from Tripo) | [~] | compare/house/yard_east.png |
| 8 | Side cattle-shed lean-to, sloped wood roof, a cow | [x] | compare/house/yard_east.png |
| 9 | Roof terrace: mumty with door, black tank, TV antenna, two charpais, potted marigolds, a kite | [x] | compare/house/roof.png |
| 10 | Upstairs kitchen corner: chulha, steel utensils on wall shelves (scenery) | [x] | compare/house/kitchen_alcove.png |
| 11 | Potted plants along edges, creeper vine, small bell, framed pictures by doors | [x] | compare/house/facade_doors.png |
| 12 | Real thickness + bevels on every wall/slab/step/frame/railing; baked AO; matte CC0 textures with colour variation; cared-for, never cracked | [x] | compare/house.png |

## Gameplay kept working (must stay true)
- Front-room charpai (lie down), hand pump (pump water), tulsi (water it), stairs to the roof: code-built
  interaction objects unchanged, still at their `src/village.js` positions.
- Colliders: unchanged for the block/east+west yard walls; NEW solids (south wall + 2.6 m gate gap, two
  north returns, cattle shed, jhoola frame, planter) are hidden code boxes in `house_yard_old`.
- World validator 15/15; hero zone draw calls under the 150 ceiling.

## Known limits (not hidden)
- The upper floor and the roof terrace are scenery: collision in this game is 2D, the house's walls still
  block walking onto the roof deck beyond the stair landing (pre-existing, see `docs/parked.md`).
- Gate leaves are modelled swung back flat against the wall (the gap must stay walkable).
