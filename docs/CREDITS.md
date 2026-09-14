# Asset credits

Every third-party asset in this repo, logged as it's added. Licence rule: CC0 first,
CC BY second (credited here), NC never, unknown licence = not used.

| Asset | Source | Licence | Author | Notes |
|---|---|---|---|---|
| Ground109 (dirt ground texture: color, normal, roughness, AO) | [ambientCG](https://ambientcg.com/view?id=Ground109) | CC0 | ambientCG | Already present in `reference-from-unity/ambientcg/`; resized 2K→1K JPG into `public/assets/textures/ground/`. |
| Camdeboo Road (1K HDRI) | [Poly Haven](https://polyhaven.com/a/camdeboo_road) | CC0 | Poly Haven | Downloaded via `dl.polyhaven.org`, used as sky + IBL environment. Swapped in for `rural_evening_road` (tagged "low contrast", rendered pale/washed) — see `docs/parked.md`. |
| Ceramic Pot (model) | [Poly Haven](https://polyhaven.com/a/ceramic_pot) | CC0 | Poly Haven | Downloaded at 1K glTF, run through `tools/shrink.js` (dedup/weld/simplify/WebP/Meshopt) to `public/assets/models/ceramic_pot.glb`. Test piece for the pipeline — removed from the live scene 2026-09-15, file + credit kept. |
| PaintedPlaster017 (wall texture) | [ambientCG](https://ambientcg.com/view?id=PaintedPlaster017) | CC0 | ambientCG | Already present in `reference-from-unity/ambientcg/`; resized 2K→1K into `public/assets/textures/plaster/`. Walls: house, school, halwai. |
| Concrete048 (roof/floor texture) | [ambientCG](https://ambientcg.com/view?id=Concrete048) | CC0 | ambientCG | Resized 2K→1K into `public/assets/textures/concrete/`. Flat roofs, courtyard/yard floors. |
| Planks023A (wood texture) | [ambientCG](https://ambientcg.com/view?id=Planks023A) | CC0 | ambientCG | Resized 2K→1K into `public/assets/textures/wood/`. Doors, shutters. |
| Metal009 (metal texture) | [ambientCG](https://ambientcg.com/view?id=Metal009) | CC0 | ambientCG | Resized 2K→512 into `public/assets/textures/metal/`. School gate. |
| GlazedTerracotta001 (terracotta texture) | [ambientCG](https://ambientcg.com/view?id=GlazedTerracotta001) | CC0 | ambientCG | Resized 2K→512 into `public/assets/textures/terracotta/`. School accent band. |
| Grass001 (crop texture) | [ambientCG](https://ambientcg.com/view?id=Grass001) | CC0 | ambientCG | Downloaded fresh via `ambientcg.com/get?file=...`, resized 1K→512 into `public/assets/textures/crop/`. Tinted for the field's instanced wheat/sabzi crop rows. |
