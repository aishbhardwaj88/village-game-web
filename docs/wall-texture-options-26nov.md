# Wall texture options, 26 Nov (Poly Haven, CC0)

All 8 confirmed via files API: 1K jpg diffuse, nor_gl (OpenGL normal) and rough present. Sizes from the API `dimensions` field (mm). Not downloaded, nothing wired. Colour is judged from tags only (sandbox could not open images): check each thumb before use.

Thumb URL pattern: `https://cdn.polyhaven.com/asset_img/thumbs/<id>.png?width=512`. Page: `https://polyhaven.com/a/<id>`.

Existing slots: MIX_GROUPS.plaster = plaster + plaster_b..i (all taken). `WALL_VARIANTS` cells in `src/kit/housesMaterial.js` = plaster_j, plaster_m, plaster_p, concrete_e; `EXTRA_VARIANTS` = brick_b, concrete_f, mud_b, mud_c. Free names: plaster_k, plaster_l, plaster_n, plaster_o (add to `src/materials.js` first, then to the variant arrays). Brick options fit the `brick` / `brick_b` cell (CELL_REPEAT 1.2) or a new brick_c.

| # | id | Name | Look | Tile (m) | Maps | Suits | Slot |
|---|----|------|------|----------|------|-------|------|
| 1 | white_stucco_02 | White Stucco 02 | Pale rendered lime/skim coat, fine coarse grain, clean | 1.8 | diff, nor_gl, rough | Rich pucca (limewash, tint per house) | replace plaster_j (or new plaster_k) |
| 2 | plastered_wall_02 | Plastered Wall 02 | Flat cement plaster, slightly discoloured, rough, weathered | 2.23 | diff, nor_gl, rough | Middle (cement render) | plaster_l |
| 3 | concrete_wall_004 | Concrete Wall 004 | Painted, flat, dry, lightly stained, plain | 2.0 | diff, nor_gl, rough | Middle (painted cement) | plaster_m (swap) or plaster_n |
| 4 | painted_worn_brick | Painted Worn Brick | Yellow/ochre paint over brick, worn, dirty | 1.8 | diff, nor_gl, rough | Middle / poor (ochre painted) | plaster_o |
| 5 | whitewashed_brick | Whitewashed Brick | White limewash over old brick, aged, distressed | 2.0 | diff, nor_gl, rough | Poor brick (limewashed) | brickWash cell / new brick_c |
| 6 | painted_brick | Painted Brick | Painted brick, rustic, worn, rough | 1.8 | diff, nor_gl, rough | Middle / poor | brickWash cell alt |
| 7 | brown_brick_02 | Brown Brick 02 | Sandy yellow-brown brick, rough | 1.0 | diff, nor_gl, rough | Brick (sandy, kiln brick) | brick_b |
| 8 | red_bricks_04 | Red Bricks 04 | Clean red baked brick, textured, uneven | 2.5 | diff, nor_gl, rough | Brick (plain red) | brick (cell 2) alt |

Checks before wiring: measure normal std-dev (the earlier beige_wall_001 flat-normal fail), and check the colour for dark or grim tone.

Honourable mentions: red_brick (1.4 m), brick_wall_001 (3 m, plain baked red), rough_plaster_03 (1.5 m, tagged weathered, check cracks), plastered_wall (2 m, tagged chipped, check).

Skipped (dark/cracked/mossy/grey): grey_plaster*, worn_*_plaster*, concrete_wall_007/008, preconcrete_wall_001, red/blue_plaster_weathered, mossy_brick, dark_brick_wall.
