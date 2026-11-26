# Wall texture swap, 26 Nov (Poly Haven CC0, her 4 chosen sets)

- white_stucco_02 -> house atlas cell 0 (replaces bumpy cream plaster); CELL_REPEAT[0] = 1/1.8, CELL_NORMAL[0] 2.2 -> 0.9, CELL_BOOST kept.
- white_stucco_02 -> library name `plaster_h` retargeted (MIX_GROUPS.plaster), so worn_cracked_plaster never loads; old files stay on disk, unused.
- painted_worn_brick -> house WALL_VARIANTS cell 10 (replaces plaster_p on houses): 1 in 5 plaster houses, 1.8 m tile.
- whitewashed_brick -> house cell 3 (brickWash), 2.0 m tile (repeat 0.5); old lime-patch shader and per-brick tint switched off for cell 3.
- brown_brick_02 -> house EXTRA_VARIANTS cell 15 (replaces mud_c): 30% of brick (cell 2) walls, brick_b cut 45% -> 30%, 1.0 m tile (uv x 0.8333); mud walls now dryearth / mud_b 50:50.
- Atlas stays 16 cells, same request count; plaster_g (patterned_clay_plaster) is not in the house atlas, left in MIX_GROUPS for non-house surfaces.
- Not touched: shops still use library `plaster` and plaster_p by name (shopsPlace.js, landMaterials.js).
