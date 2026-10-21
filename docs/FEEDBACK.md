# Feedback - newest first. Autopilot: work these first, mark each "DONE <date>: <commit>".

## 21 Oct 2026 (user, via art director) - TEXTURES AND MATERIALS FOR EVERYTHING (top priority with trees)
- The user means EVERY surface, not only grass and plants: houses, kachcha mud houses/jhopdis, shops, school, walls, roofs, lanes, canal, fields, animals, vehicles, props.
- Method for buildings (Blender): real CC0 PBR texture sets (Poly Haven / ambientCG, 1K WebP), proper UVs, a shared trim sheet for frames/plinths/bands, baked AO, per-wall colour variation, soft dirt at the base, sun-faded paint, subtle stains and decals near doors/drains. Cared-for, lived-in, never broken or poor.
- Surface types to cover: lime-washed plaster (blue-grey, cream, pink, mint), cement plaster, painted wood (doors, shutters), corrugated tin, terracotta tiles, exposed-but-neat brick only on boundary walls and planters, mud-and-cow-dung plaster with thatch roofs for kachcha houses and cattle sheds (neat, cared-for), stone/cement floors, packed-earth lanes with tyre ruts, kerbs and drains.
- Add a few kachcha houses/jhopdis at the village edge and near the fields: mud walls, thatch roof, swept courtyard, charpai, chulha, cattle. Dignified, never poverty-porn.
- Animals: replace the blocky code cows/buffalo/dogs/goats with real-looking models. Add them to the Tripo batch from Characters V1/animals references (cow, buffalo, bulls, dog, goat, hen, monkey); until then, smooth shapes with real hide/fur colour and texture.
- Vehicles and props: real paint, rubber, rust-free metal, wood grain, rope, cloth.
- Check: a screenshot of any lane must read like a real North Indian village photo at game distance.

## 21 Oct 2026 (art director) - TREES AND PLANTS PLAN (biggest visual fix, do first)
- Current trees and plants look bad. Rebuild all vegetation in Blender (installed, headless):
  - Species: neem, peepal, mango, babool, eucalyptus, banana clumps, plus shrubs, tulsi, marigold beds, bougainvillea, creepers, grass tufts, crops (wheat, sugarcane, sabzi rows).
  - Method: real branching trunks (Blender Sapling Tree Gen extension or your own curve-based generator), leaves as alpha-cut leaf cards using CC0 leaf textures (e.g. ShareTextures leaf collection; check every licence is CC0, credit in docs/CREDITS.md; never Poliigon/NC). Poly Haven CC0 plant models may be decimated and reused.
  - Game-ready: 3 LODs per tree + a billboard impostor for distance, instanced, gentle wind sway in the shader, soft baked AO.
  - Colours: natural dusty olive and deep neem greens with variation, never lime.
  - Test: a screenshot of the main lane should read like a real North Indian village, not a toy.

## 21 Oct 2026 (art director)
- Greens read lime/cartoon: shift grass and tree greens toward natural dusty olive and deep neem green, with variation.
- Walls read flat: add soft colour variation, light AO and gentle weathering (cared-for, never broken) on every Blender building.
- Lanes feel empty: add villagers walking, kids playing, cycles, cattle resting, chulha smoke, birds.
- Abadi houses: add balconies with carved wood, potted plants, creepers and roof clutter like Characters V1/buildings/house_1.png.
