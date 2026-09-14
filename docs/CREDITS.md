# Asset credits

Every third-party asset in this repo, logged as it's added. Licence rule: CC0 first,
CC BY second (credited here), NC never, unknown licence = not used.

| Asset | Source | Licence | Author | Notes |
|---|---|---|---|---|
| Ground109 (dirt ground texture: color, normal, roughness, AO) | [ambientCG](https://ambientcg.com/view?id=Ground109) | CC0 | ambientCG | Already present in `reference-from-unity/ambientcg/`; resized 2K→1K JPG into `public/assets/textures/ground/`. |
| Camdeboo Road (1K HDRI) | [Poly Haven](https://polyhaven.com/a/camdeboo_road) | CC0 | Poly Haven | Downloaded via `dl.polyhaven.org`, used as sky + IBL environment. Swapped in for `rural_evening_road` (tagged "low contrast", rendered pale/washed) — see `docs/parked.md`. |
| Ceramic Pot (model) | [Poly Haven](https://polyhaven.com/a/ceramic_pot) | CC0 | Poly Haven | Downloaded at 1K glTF, run through `tools/shrink.js` (dedup/weld/simplify/WebP/Meshopt) to `public/assets/models/ceramic_pot.glb`. First test piece for the asset pipeline. |
