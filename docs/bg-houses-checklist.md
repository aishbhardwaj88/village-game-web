# Background houses / abadi checklist (dense instanced rows)

ART_REVIEW review 3: FAIL on lonely single houses. Rebuilt 2026-10-21 as **22 continuous rows of attached houses** along 5 lanes
(`tools/blender/build_abadi.py`, `tools/blender/make_abadi.sh` -> `public/assets/models/abadi_row_{a,b,c}.glb` +
`src/abadiBoxes.json`), modelled from `Characters V1/buildings/house_1.png` (front elevation + 3/4: jharokha balconies, wooden chajja
over the plank door, louvred shutters, parapet roofs with tank/charpai, marigold pots, ochre plinth), `house_2/3.png` (limewash colour
range, charpais, creepers) and `Places V1/house/STYLE_ONLY_other_family_duplex.png`. Placement + lane network: `src/scenery.js`
(east abadi lanes E1/E2, west W1/W2, south S1; houses face the lane from both sides, drain + kerb along the lane edge).
Instanced (InstancedMesh per mesh per row model per area), `castShadow` off, whole areas hidden beyond 105 m of the player each frame
(`userData.updateVisibility`). Collision + validator backing = a hidden hollow 4-slab shell per row (`bg_houses_old`).

| # | Element | Status | Proof |
|---|---|---|---|
| 1 | Row A: 4 attached houses, mixed 1/2 storey, jharokha balcony bays, chajja doors, louvred shutters, flat parapet roofs, tanks, charpais, clotheslines, marigold pots | [x] | tmp/abadi-shots/lane_level.png, aerial.png |
| 2 | Row B: 4 single-storey houses incl. a corrugated-tin verandah roof and a red clay-tile roof, bench, pots | [x] | tmp/abadi-shots/aerial.png |
| 3 | Row C: mixed 2/1 storey + a cattle baada (low walls, tin roof, cow, manger, hay) + hand pump on a platform | [x] | tmp/abadi-shots/aerial.png |
| 4 | Dense layout: shared walls, continuous rows, dirt lanes between, drain along the lane, rows on both sides | [x] | tmp/abadi-shots/lane_level.png |
| 5 | Palette variety (cream, limewash blue, pink, mint, ochre, peach) with ochre / blue-grey / terracotta plinth bands; per-instance tint | [x] | tmp/abadi-shots/aerial.png |
| 6 | Cared-for, never broken (7.1b) | [x] | tmp/abadi-shots/front_elev.png |
| 7 | LOD / budget: instanced, shadow-free, per-area distance culling; triangles measured per view in the compare shots | [x] | docs/status.json |
| 8 | Not yet: roof trees/greenery on terraces, creepers, kids/carrom in lanes, a TV antenna on some roofs, small shop fronts in rows | [ ] | |
