# S7 shops-land (agent notes)

Branch `s7-shops-land`. Everything here shows only with `?layout=new`; `?layout=old` is unchanged
(the one exception is noted under "Old canal").

## What is built (all from the approved map, 21 Nov)

| Layer | What | Count |
|---|---|---|
| Two-storey shop-houses | shop below, home above: raised otla with steps, rolling shutter (most rolled up, some down), stocked shelves and a counter inside, the first-floor slab running out over the otla as the balcony (iron railing or plastered parapet), balcony door with panelled leaves, window with grille, sill and shade, roof parapet, board on the slab edge | 44 |
| Single shops and shop-like buildings | one storey, one shutter per 3.4 m bay; dhaba / tea stalls open-fronted with tables, benches and a brick chulha; repair shops with workbench and tyres; bank, library, clinic, animal hospital, cooperative, wedding hall get a panelled door and windows instead of shutters | 68 |
| Kiosks | steel gumti with a prop-up flap and stocked shelf, or a wooden stall under a rusted sheet roof | 14 |
| Carts (thela) | plank bed on two spoked wheels, crates of produce or a cook-top, canopy | 35 |
| Open sheds | bus shelter, cycle stand, jaggery unit | 3 |
| Signboards | ONE atlas, Hindi bold on top + English below (the 25 Oct rule), 6 painted colour schemes | 154 boards, 136 painted cells |
| Trees | mango 179 (+ rows added in the sparse east orchard), guava 146, jamun 51, eucalyptus 119, neem 44, shisham 44, peepal 1 | 584 from the map |
| Fields | 42 crop patches painted on the ground (sugarcane, young wheat, mustard in flower, marigold, potato, chilli, brinjal, cauliflower, green fodder, paddy stubble), earth bunds round every field, real plants only in a band 1.5-14 m from a road | 42 + 4 orchard floors + 9 green strips |
| Canal | 690 m north-south at x 824: cement-lined, embanked, 6 m water, grassy bunds, kachcha bank track, 5 humped bridges with parapets and ramps, washing steps | 1 |
| Flag island | brick-faced round island with coping and grass bed, stepped pedestal, 9 m white pole, waving tiranga, village name stone "अमराई खेड़ा / Amrai Kheda". No peepal on the island. | 1 |
| Peepal chabutra | plastered round platform with a step by the chaupal (the big peepal stands on it) | 1 |
| Wells | brick parapet, cement coping and apron, dark water, pulley frame with rope and bucket on most | 13 |
| Hand pumps, haystacks and straw stacks, dung-cake stacks, washing lines | the game's own approved models | 21, 15, 14, 12 |

Materials: only the library sets (brick, plaster, concrete, painted wood, rusted steel, ground). No flat-colour
surfaces. Shutters and gumti sheet steel are painted steel (the concrete set under a paint tint, with the bottom slats
rusted through); roofs of stalls, carts and sheds are rusted corrugated sheet with real ribs.

## Screenshots (headless, docs/s7/shops-land/)

| File | What |
|---|---|
| square_eye.png | the bazaar street of two-storey shop-houses, eye height, flag at the end |
| square_above.png | the square and its arms from above |
| kiosks_eye.png | a shop-house, a gumti kiosk and carts round the square |
| smallshop_eye.png | small shops with their boards (dhaba, chemist, electrical repair) |
| flag_eye.png | the flag island and the name stone |
| orchard_eye.png / orchard_above.png | the south mango orchard and the eucalyptus row |
| orchard_east.png | the east mango orchard (sparse in the map, filled with rows) |
| field_eye.png / field_above.png | mustard in flower and marigold patches, plants by the track |
| cane_eye.png | sugarcane by a road |
| canal_eye.png / canal_above.png | the canal, green strip, tree line, bridge on the east road, washing steps |

Re-make them: `flock /tmp/s7-browser.lock node docs/s7/shops-land/shoot.mjs [view ...]` (starts its own Vite,
opens `docs/s7/shops-land/preview.html`, which uses the game's own renderer, sky, sun, fog, ground and grade; roads are
drawn there as plain strips only for context). The preview loads the Devanagari webfont from `tmp/fonts/` (OFL,
from the npm package @fontsource/noto-sans-devanagari; not committed); the game itself loads it from Google Fonts.

## Numbers (headless, 1280 x 720, measured layer by layer, main pass, shadows off as in the game)

Budget asked: all shops <= 25 draw calls, all trees <= 15, fields + canal <= 10.

| View | Shops calls / tris | Trees calls / tris | Fields calls / tris | Canal calls / tris | Props calls / tris |
|---|---|---|---|---|---|
| square_eye | 6 / 62k | 1 / 1k | 1 / 13k | 3 / 1.5k | 10 / 22k |
| square_above | 6 / 48k | 1 / 1.4k | 1 / 13k | 3 / 1.5k | 13 / 35k |
| kiosks_eye | 6 / 26k | 3 / 6k | 1 / 13k | 3 / 1.5k | 9 / 22k |
| canal_above | 6 / 4.5k | 3 / 8.5k | 3 / 27k | 3 / 1.5k | 13 / 57k |

- Shops never cost more than 6 draw calls (one BatchedMesh per material for every body, near and far, plus one mesh
  for every board). Three detail tiers per shop: full within 60 m, no stock on the shelves to 160 m, a plain block
  beyond (desktop/'full' preset; the 'light' web preset uses 35 / 100 m).
- Trees never cost more than 3 (bark, leaf cards, impostors), whatever the count. Full crown within 70 m, every third
  card to 150 m, two crossed baked sprites beyond ('light': 42 / 95 m).
- Fields + canal: 1 painted ground mesh + up to 3 plant meshes (tufts, cane, mustard) + 3 canal meshes = at most 7.
- Props: the shared chunked helper (src/kit/instancing.js), drawn within 140 m only ('light': 90 m).
- Console errors in the preview runs: 0.
- Quality knobs are grouped in `src/kit/landQuality.js` (presets 'light' and 'full', picked by src/edition.js
  getQualityName() once that is merged, or `?quality=`).

## Checks

- Nothing floating or sunk: the game ground is flat (y 0) outside the old dips; every shop, kiosk, cart, well, island
  and stack stands on y 0; fields lie 1.6 cm above the ground (under the roads), the canal water and bunds are built up
  from y 0, never dug.
- Fronts: every shop's front is the place's TRUE front from the export, snapped onto its plot's own edge so the walls
  stay parallel to the plot. Front-faces-a-road check: 0 shops have their back to a road.
- Two carts' plots are drawn 10 and 22 degrees off their front (Kulfi cart, Snacks cart): the cart follows the front.
- **On a road (needs the layout agent):** 7 plots overlap a road edge by these amounts: Cycle and puncture repair
  (594.4, -27.4) 0.77 m; Utensils (594.4, -22.9) 0.87 m; Optician (570.6, -3.0) 1.53 m; Jeweller (575.1, -3.0)
  1.51 m; Stationery and xerox (544.5, -4.5) 0.24 m; General store (507.2, 50.6) 0.17 m; Tailor (712.8, -73.1)
  0.58 m. I did not move them (the map is law); either the road edge or the plot moves.
- Colliders: every shop, kiosk, cart, well, stack, pump, island and platform is a box (turned shops: 1 m cells);
  the canal water is solid except at the bridges; bridge parapets are solid.
- Coordinates: checked against the running game: house 652.1,40.2 / school 556.5,108.5 / halwai 637.4,21.4 /
  temple 695.7,-78.3 all equal anchors.js + MAP_SHIFT (600, 0).

## Decisions I made (one line each)

- Ground cannot be dug, so the canal is embanked and lined (lip 0.55 m, water 0.2 m, bridges 0.8 m humps).
- The east mango orchard is drawn with only 12 trees on 3,600 m2; I filled it with rows at the spacing of the other
  orchards (10.5 m), clear of the drawn trees and roads. The other three orchards are full in the map and untouched.
- The family khet of the wheat errand (src/field.js) stays (gameplay); the painted fields leave a hole over it and
  place no plants there.
- "Guava / jamun" markers: 3 in 4 guava, 1 in 4 jamun. "Neem / sheesham" markers: half each.
- Not built (no owner in my brief; tell me if they are mine): mobile tower, transformer, barber under a tree,
  water trough, washing platform, pump rooms (tubewells), machans, scarecrows, clay pots, milestones, gate,
  notice board, buffaloes, culvert, water channels, ponds, cricket / kabaddi / parking / yard ground patches.

## Old canal

The old east-west canal (src/canal.js, x 758-786, z 34) would stand in the new weekly market ground and across the east
road, so under `?layout=new` `buildCanal()` returns an empty group (no trench, no dip). `?layout=old` is unchanged.
Its water sound (main.js distanceToCanalWater) and its minimap / free-roam line still point at the old place under
`?layout=new` (see Wiring needed).

## Wiring needed (for the integrator)

1. Done in my branch: `src/main.js` S7 WIRING (shops-land) block: one import of `src/kit/landInit.js` (a tiny lazy
   loader: the kit and the map export load as their own chunk, only under `?layout=new`) and one call after the sky:
   `initShopsLand(scene, { camera }).then((land) => { if (land) requestColliderRebuild(); });`
2. Walk height on bridges, ramps, canal bunds, the flag island and the peepal chabutra: `land.group.userData.landHeightAt(x, z)`.
   In `main.js groundHeightAt`, replace the last line `return dipHeightAt(wx, wz);` with
   `return Math.max(dipHeightAt(wx, wz), window.__s7land ? window.__s7land(wx, wz) : 0);` and in the wiring call set
   `window.__s7land = land.group.userData.landHeightAt`. (Until then the player walks through the 0.8 m bridge humps.)
3. `src/materials.js` SETS: add `rust: { base: 'assets/textures/rust/', maps: ['color', 'normal', 'roughness'] }`
   (the texture is already in public/; rusted steel is approved). Then `src/kit/landMaterials.js` can use
   `getTiledMaterial('rust')` instead of assembling it.
4. Under `?layout=new`: point the canal water sound (`distanceToCanalWater` in main.js), the minimap canal line
   (minimap.js) and free-roam (freeRoam.js) at the new canal: x 824, z -340..350, half width 3.
5. `src/kit/instancing.js` is a verbatim copy of the perf agent's file (as asked); take perf's version on merge.
6. The layout agent's roads should sit at y >= 0.02 so the painted fields (y 0.016) stay under them. My canal bank
   track is drawn at y 0.012 under the layout's `canal_bank_road`.

## Licences

All geometry, the sign atlas, the flag and name-stone canvas are made by us in code. Textures are the existing library
sets (ambientCG / Poly Haven CC0, already in docs/CREDITS.md). The models reused (hand pumps, haystacks, gobar, laundry
line) are our own Blender builds. No brands on any board. No new third-party files.
