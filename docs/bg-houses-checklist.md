# Background houses checklist (instanced variants)

No Places V1 reference exists (the house/other_family_duplex image is STYLE_ONLY and the brief asks for "ordinary and mixed, like Panchayat").
Four Blender variants (`tools/blender/build_bg_houses.py`, `make_bg_houses.sh`) instanced by `src/scenery.js` (14 placements, one InstancedMesh per
mesh per map region, castShadow off, hidden `bg_houses_old` boxes carry the collision + validator backing). Compare image: `docs/shots/compare/bg-houses.png`.

| # | Element | Status | Proof |
|---|---|---|---|
| 1 | A: single-room flat-roof house (5.5 x 5), cream, ochre skirt, panel door, barred windows, parapet, roof tank, step, pots | [x] | compare/bg-houses/variant_a_flat_roof.png |
| 2 | B: two-storey painted house (6 x 6), pastel teal, first-floor balcony with railing, shuttered windows, two roof tanks | [x] | compare/bg-houses/variant_b_two_storey.png |
| 3 | C: tin-roofed house inside a 1.2 m yard wall with a gate, verandah posts, charpai, haystack | [x] | compare/bg-houses/variant_c_tin_roof_yard.png |
| 4 | D: mud-plaster house with a red clay tile roof, verandah posts, plank door, shuttered window, bench, matka | [x] | compare/bg-houses/variant_d_clay_tile.png |
| 5 | Prosperity varies (some two-storey and painted, some plain) but every house is swept, limewashed, cared-for | [x] | compare/bg-houses.png |
| 6 | Per-instance colour variation; placements clear of every validated route, the field and the canal | [x] | compare/bg-houses.png |
