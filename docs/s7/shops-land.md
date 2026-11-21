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
| Trees | mango 179, guava 146, jamun 51, eucalyptus 119, neem 44, shisham 44, peepal 1 (+3 rows filled into orchard gaps) | 587 |
| Fields | 42 crop patches painted on the ground (sugarcane, young wheat, mustard in flower, marigold, potato, chilli, brinjal, cauliflower, green fodder, paddy stubble): soft rows along the field's long side, flower speckles for mustard / marigold / chilli / cauliflower, earth bunds round every field; real plants (the khet's own tufts and cane clumps) only in a band 1.5-14 m from a road | 42 + 4 orchard floors + 9 green strips |
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
| smallshop_eye.png | small shops with their boards (kirana, dhaba ...): stocked shelves, counter, sacks, benches, chulha |
| flag_eye.png | the flag island and the name stone |
| orchard_eye.png / orchard_above.png | the south mango orchard in rows |
| orchard_east.png | the east mango orchard and its tree row |
| peepal_eye.png | the chaupal peepal on its chabutra |
| flag_above.png | the flag island from above |
| canal_strip.png | the green strip and tree line between the houses and the canal |
| kiln_green.png | the green strip with two tree rows between the highway and the kiln |
| field_eye.png / field_above.png | mustard in flower and marigold patches, plants by the farm track |
| cane_eye.png | sugarcane by a road |
| canal_eye.png / canal_above.png | the canal, green strip, tree line, bridge on the east road, washing steps |

Re-make them: `flock /tmp/s7-browser.lock node docs/s7/shops-land/shoot.mjs [view ...]` (starts its own Vite,
opens `docs/s7/shops-land/preview.html`, which uses the game's own renderer, sky, sun, fog, ground and grade; roads are
drawn there as plain strips only for context). The preview loads the Devanagari webfont from `tmp/fonts/` (OFL,
from the npm package @fontsource/noto-sans-devanagari; not committed); the game itself loads it from Google Fonts.

## Numbers (headless, 1280 x 720, layer by layer, main pass, shadows off as in the game, 'full' preset)

Budget asked: all shops <= 25 draw calls, all trees <= 15, fields + canal <= 10.

| View | Shops calls / tris | Trees calls / tris | Fields calls / tris | Canal calls / tris | Props calls / tris |
|---|---|---|---|---|---|
| square_eye | 6 / 77k | 3 / 6k | 2 / 16k | 3 / 1.5k | 17 / 74k |
| square_above | 6 / 71k | 1 / 1.4k | 3 / 17k | 3 / 1.5k | 20 / 65k |
| smallshop_eye | 6 / 40k | 1 / 0.6k | 2 / 16k | 3 / 1.5k | 11 / 27k |
| orchard_eye | 1 / 2k | 3 / 152k | 3 / 18k | 3 / 1.5k | 4 / 5k |
| field_eye | 0 / 0 | 2 / 8k | 3 / 74k | 3 / 1.5k | 2 / 12k |
| canal_above | 6 / 15k | 3 / 13k | 4 / 144k | 3 / 1.5k | 14 / 60k |

(Props were measured at 140 m reach; it is now 100 m 'full' / 70 m 'light', and crop plants 80 / 60 m with a third of
them beyond 40 m, so the props and fields columns are lower than shown.)

- Shops: always 6 draw calls (one BatchedMesh per material for every body, near and far, plus one mesh for every
  board). Three detail tiers per shop: full within 60 m, no stock on the shelves to 160 m, a plain block beyond
  ('light' web preset: 35 / 100 m).
- Trees: at most 3 draw calls (bark, leaf cards, impostors), whatever the count. Full crown within 90 m, every second
  card (1.3x larger) to 170 m, two crossed baked sprites beyond ('light': 42 / 95 m). An orchard seen from inside costs
  ~150k triangles at 'full'; that is the number to watch (the 'light' preset roughly halves it).
- Fields + canal: 1 painted ground mesh + 2 plant meshes (tufts, cane) + 3 canal meshes = at most 6.
- Props: the shared chunked helper (src/kit/instancing.js): one draw per model part per 150 m chunk within reach,
  9-20 in the village (the models are the game's existing hand pumps, haystacks, gobar and laundry lines, 1-8k
  triangles each).
- In the real game (headless, touch-device mode, `?layout=new&proof=1`, player in the square, docs/s7/shops-land/game-smoke.mjs):
  the kit builds (all 5 layers), whole-frame draw calls 246 vs 202 with `?layout=old` at the same spot (the old village
  is still standing there until the layout and houses agents' work lands), console errors 10 vs 11, **new errors: 0**.
  (A desktop-size headless window crashes the GPU process for BOTH layouts on this machine; touch mode is what the
  load tests use too.)
- Preview runs: 0 console errors.
- Quality knobs are grouped in `src/kit/landQuality.js` (presets 'light' and 'full'; picked by src/edition.js
  getQualityName() once that is merged, else `?quality=`, else 'full').

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
- Orchards: every orchard's gaps are filled with rows of its species at 10.5 m, never within 8 m of a drawn tree or
  4 m of a road (the map's orchards turned out to be nearly full: 3 trees added in all).
- The family khet of the wheat errand (src/field.js) stays (gameplay); the painted fields leave a hole over it and
  place no plants there.
- "Guava / jamun" markers: 3 in 4 guava, 1 in 4 jamun. "Neem / sheesham" markers: half each.
- Not built (no owner in my brief; tell me if they are mine): mobile tower, transformer, barber under a tree,
  water trough, washing platform, pump rooms (tubewells), machans, scarecrows, clay pots, milestones, gate,
  notice board, buffaloes, culvert, water channels, ponds, cricket / kabaddi / parking / yard ground patches.

## Questions for her (looks)

- Crop plants by the roads reuse the old khet's code-built tufts and cane clumps (mustard now as yellow-tipped tufts, the
  khet's mustard cards read as little trees at eye height). If they read as plastic, a CC0 crop model is the fix.
- Shutters and gumti sheet steel are painted steel (the concrete photo set under a paint colour, bottom slats rusted).
- Shop walls take the palette tints at 30% (law), so most read as cream; tell me if the bazaar should be more colourful.

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
