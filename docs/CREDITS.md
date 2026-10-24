# Asset credits

Every third-party asset in this repo, logged as it's added. Licence rule: CC0 first,
CC BY second (credited here), NC never, unknown licence = not used.

**2026-09-18:** every texture below was re-encoded JPG→WebP in place (same source
image, same licence/author, just a smaller file — 6.67MB→3.05MB total, 54% smaller;
queue item 6) — the `public/assets/textures/*/*.jpg` paths in the notes column are now
`.webp`.

| Asset | Source | Licence | Author | Notes |
|---|---|---|---|---|
| Ground109 (dirt ground texture: color, normal, roughness, AO) | [ambientCG](https://ambientcg.com/view?id=Ground109) | CC0 | ambientCG | Already present in `reference-from-unity/ambientcg/`; resized 2K→1K JPG into `public/assets/textures/ground/`. |
| Camdeboo Road (1K HDRI) | [Poly Haven](https://polyhaven.com/a/camdeboo_road) | CC0 | Poly Haven | Downloaded via `dl.polyhaven.org`, used as sky + IBL environment. Swapped in for `rural_evening_road` (tagged "low contrast", rendered pale/washed) — see `docs/parked.md`. |
| Ceramic Pot (model) | [Poly Haven](https://polyhaven.com/a/ceramic_pot) | CC0 | Poly Haven | Downloaded at 1K glTF, run through `tools/shrink.js` (dedup/weld/simplify/WebP/Meshopt) to `public/assets/models/ceramic_pot.glb`. Removed from the live scene 2026-09-15; back in as of 2026-09-19 as the `src/assetSlots.js` asset-slot system's end-to-end test piece (a temporary `ceramic_pot` slot, house courtyard) — see `docs/asset-slots.md`. |
| PaintedPlaster017 (wall texture) | [ambientCG](https://ambientcg.com/view?id=PaintedPlaster017) | CC0 | ambientCG | Already present in `reference-from-unity/ambientcg/`; resized 2K→1K into `public/assets/textures/plaster/`. Walls: house, school, halwai. |
| Concrete048 (roof/floor texture) | [ambientCG](https://ambientcg.com/view?id=Concrete048) | CC0 | ambientCG | Resized 2K→1K into `public/assets/textures/concrete/`. Flat roofs, courtyard/yard floors. |
| Planks023A (wood texture) | [ambientCG](https://ambientcg.com/view?id=Planks023A) | CC0 | ambientCG | Resized 2K→1K into `public/assets/textures/wood/`. Doors, shutters. |
| Metal009 (metal texture) | [ambientCG](https://ambientcg.com/view?id=Metal009) | CC0 | ambientCG | Resized 2K→512 into `public/assets/textures/metal/`. School gate. |
| GlazedTerracotta001 (terracotta texture) | [ambientCG](https://ambientcg.com/view?id=GlazedTerracotta001) | CC0 | ambientCG | Resized 2K→512 into `public/assets/textures/terracotta/`. School accent band. |
| Grass001 (crop texture) | [ambientCG](https://ambientcg.com/view?id=Grass001) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 1K→512 into `public/assets/textures/crop/`. Tinted for the field's instanced wheat/sabzi crop rows. |
| Ground102 (compacted dirt texture) | [ambientCG](https://ambientcg.com/view?id=Ground102) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 1K into `public/assets/textures/lane/`. A smoother, "compressed/stamped" dirt distinct from Ground109 — used for the lane and field track so they read as a different surface from the open ground, not just a different tint of the same one. |
| CorrugatedSteel005 (tin roofing texture) | [ambientCG](https://ambientcg.com/view?id=CorrugatedSteel005) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 1K into `public/assets/textures/tin/`. Clean bare galvanized steel (no rust tag) — docs/FINISH_LINE.md Step C's "cared-for, never damaged" bar. Roof life props (water tanks sit on this), some roof panels. |
| Bricks051 (brick texture) | [ambientCG](https://ambientcg.com/view?id=Bricks051) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 1K into `public/assets/textures/brick/`. Tagged "modern" (crisp mortar lines, no damage/old/dirty tags) — picked specifically over several "old"/"damaged" alternatives per the same cared-for bar. Intact brick wherever the village calls for it. |
| Fabric061 (jute/sacking texture) | [ambientCG](https://ambientcg.com/view?id=Fabric061) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 512 (prop-scale) into `public/assets/textures/jute/`. A coarse basket-weave canvas, tinted brown for jute sacking (wheat/grain sacks). |
| Fabric066 (tarpaulin/canvas texture) | [ambientCG](https://ambientcg.com/view?id=Fabric066) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 512 (prop-scale) into `public/assets/textures/tarpaulin/`. A finer woven canvas, tinted per use for market-stall awning cloth. |
| aerial_grass_rock (photoscanned grass, colour 4K downscaled to 1K WebP) | [Poly Haven](https://polyhaven.com/a/aerial_grass_rock) | CC0 | Poly Haven | Ground grass-patch albedo in `public/assets/textures/grass/` (src/materials.js applyGroundNoiseDetail). |

| Doorstep props: wooden_bucket_01/02, wicker_basket_01/02, planter_pot_clay, brass_pot_01, jug_01, metal_jug, wooden_stool_01, painted_wooden_stool, wooden_crate_01/02, old_tyre, ceramic_vase_01, plastic_monobloc_chair_01, painted_wooden_bench | [Poly Haven](https://polyhaven.com/models) (by asset name) | CC0 | Poly Haven | 1K glTF via api.polyhaven.com, shrunk with tools/shrink.js to `public/assets/props/`, instanced by src/villageProps.js. |

- Plant/tree leaf atlases (public/assets/plants/*.webp): leaves cut from ambientCG CC0 sets LeafSet002, 003, 004, 022, 023, 024, 025 and Foliage008, arranged by tools/build-plant-atlas.mjs. Stems and the marigold/bougainvillea flower heads are drawn (no CC0 flower sheet exists on ambientCG).
| Carrom scene props: round_wooden_table_01, wooden_stool_02, painted_wooden_chair_01 | [Poly Haven](https://polyhaven.com/models) (by asset name) | CC0 | Poly Haven | 1K glTF via api.polyhaven.com, shrunk with tools/shrink.js to `public/assets/props/`, merged and instanced in `createCarromScene` (src/farmSites.js). |
| Plants (24 Oct 2026): Flower Gazania (`flower_gazania`), Grass Medium 02 (`grass_medium_02`), Shrub 01 (`shrub_01`), Celandine 01, Shrub 04, Potted Plant 01/02/04 | [Poly Haven](https://polyhaven.com/models) (by asset name; authors James Ray Cock, Rico Cilliers, Jenelle van Heerden) | CC0 | Poly Haven | 1K glTF via api.polyhaven.com (tools/fetch-polyhaven-model.mjs), shrunk with tools/shrink.js to `public/assets/plants3d/` (+ potted plants in `public/assets/props/`), instanced by src/realPlants.js and src/villageProps.js. |
