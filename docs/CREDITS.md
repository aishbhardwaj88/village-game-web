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
| thatch_roof_angled (thatch/straw PBR) | [Poly Haven](https://polyhaven.com/a/thatch_roof_angled) | CC0 | Poly Haven | Downloaded at 4K, downscaled to 1K WebP into `public/assets/textures/thatch/`; baked into kachcha_homestead.glb (thatch roofs, haystack) via tools/blender/build_kachcha.py. |

- ambientCG Rust007, Fabric030, Ground054 (CC0), 512 px WebP in public/assets/textures/{rust,burlap,dryearth}/ (material board, 27 Oct 2026)

## Sound recordings (10 Nov 2026), public/assets/audio/*.m4a
All CC0 1.0 from OpenGameArt.org, trimmed, mono-mixed, low-passed, loudnorm-ed with ffmpeg and encoded 96k AAC. Licence read from each page's licence badge.

| File(s) | Source URL | Author | Licence |
|---|---|---|---|
| bed_village.m4a (village bed, loop) | https://opengameart.org/content/amb-morning-sounds-perfect-loop | Kresiek The Furry | CC0 |
| bed_wind.m4a (field wind, 40 s slice looped with crossfade) | https://opengameart.org/content/park-ambiences (park_ambience_wind) | Thimras | CC0 |
| bed_water.m4a (pond / johad / canal, 30 s slice looped) | https://opengameart.org/content/park-ambiences (park_ambience_river) | Thimras | CC0 |
| bed_bazaar.m4a (bazaar, shop murmur, 24 s looped, low-passed 3.2 kHz) | https://opengameart.org/content/crowd-shoutingspeaking-ambience | StarNinjas | CC0 |
| bed_children.m4a (school, 6 s looped) | https://opengameart.org/content/children-voices | Yaroslav_Novikov | CC0 |
| shot_birds1-3.m4a (three 5 s cuts) | https://opengameart.org/content/ambient-bird-sounds | isaiah658 | CC0 |
| shot_crow.m4a | https://opengameart.org/content/crow-caw | zeroisnotnull | CC0 |
| cycle_bell.m4a, cycle_spokes.m4a | https://opengameart.org/content/bicycle-sounds (rotating_bicycle_bell, bicycle_spokes) | AntumDeluge | CC0 |

Skipped for licence: dog_barking_mono (page also lists OGA-BY 3.0).

### A-gaps sound pass (10 Nov 2026), public/assets/audio/*.m4a
All CC0 1.0 from freesound.org (licence read from each sound page: creativecommons.org/publicdomain/zero/1.0). Freesound HQ previews, sliced, mono, filtered, loops crossfaded, loudnorm-ed with ffmpeg, 96k AAC. Script: tmp/sndscripts/make_gaps.py.

| File(s) | Source URL | Author | Licence |
|---|---|---|---|
| bed_children.m4a (school, 31 s loop, replaces the 6 s one; LP 5 kHz) | https://freesound.org/people/myserval/sounds/274988/ | myserval | CC0 |
| bed_cattle.m4a (gaushala / dairy cowbells, 20 s loop, LP 3.5 kHz) | https://freesound.org/people/Astounded/sounds/517468/ | Astounded | CC0 |
| shot_moo1.m4a, shot_moo2.m4a (two moos) | https://freesound.org/people/JosephSardin/sounds/177253/ | JosephSardin | CC0 |
| shot_koel.m4a (Asian koel, two calls, LP 7 kHz) | https://freesound.org/people/ramblinglibrarian/sounds/460466/ | ramblinglibrarian | CC0 |
| shot_cooker.m4a (pressure-cooker whistle, LP 4.5 kHz) | https://freesound.org/people/Jibanshil/sounds/536520/ | Jibanshil | CC0 |
| cycle_chain.m4a (pedalling chain whirr, 4.2 s loop) | https://freesound.org/people/AngryAdam/sounds/130367/ | AngryAdam | CC0 |
| cycle_freewheel.m4a (freewheel ticks, 4 s loop) | https://freesound.org/people/donkpow/sounds/156996/ | donkpow | CC0 |
| cycle_crunch.m4a (tyre on dirt road, 6 s loop) | https://freesound.org/people/SpliceSound/sounds/218301/ | SpliceSound | CC0 |
