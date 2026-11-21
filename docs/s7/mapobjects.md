# S7 map objects (agent notes)

Branch `s7-mapobjects`. Everything here shows only with `?layout=new`. With `?layout=old` (or no flag) the game is
unchanged: the hook returns at once and nothing is downloaded (the layer is its own 45 KB chunk, `mapObjects-*.js`).

## What is built (from the approved map, 21 Nov)

| Thing | How | Count |
|---|---|---|
| Tubewell pump rooms | brick room on a plinth, cement-plastered lower metre, steel door in a real opening (frame, ribs, hinges, lock, step), grilled window with frame, sill and sunshade, RCC roof slab, meter box with the service wire to an RCC pole, 4" outlet pipe with flange and bend pouring into a brick hauz with a weir into the channel, upturned bucket, folded sack | 11 |
| Field channels | earth bunds both sides, wet mud bed, water ribbon; each starts at its pump room's hauz | 10 |
| Mobile tower | 30 m lattice (4 legs, 10 X-braced panels), platform, 3 antenna sectors, 2 dishes, cable ladder, lamp, lightning rod; concrete pad, RCC posts with barbed wire, mesh gate, equipment cabinet | 1 |
| Transformer | plinth and step, tank with fins and drum, HT / LT bushings, fuse box, earth strip, angle-iron fence, plain red danger plate (no lettering), RCC pole with crossarm, insulators and drop wires | 1 |
| Welcome gate | two plastered pillars on brick plinths with stepped caps, RCC beam; painted board on both faces: towards the highway "अमराई खेड़ा में आपका स्वागत है / Welcome to Amrai Kheda", towards the village "धन्यवाद, फिर पधारें / Thank you, visit again" (Hindi bold on top, English below) | 1 |
| Notice board | steel posts in footings, wooden frame, tin hood; header "ग्राम पंचायत सूचना पट्ट / Gram Panchayat notice board", pinned papers | 1 |
| Milestones | the game's own milestone models (3 variants), facing along their road, lean and size varied | 10 |
| Water trough | cement naand with green water line, chipped rim, water, tethering peg with rope, spilled chopped straw | 1 |
| Machans | 4 bamboo poles lashed with jute, slatted floor at 2.1 m, hand rail, X braces, thatch roof, ladder, a sack to sit on | 8 |
| Scarecrows | bamboo cross, upturned matka head with limewash face, straw hat, kurta, dhoti, a red rag | 8 |
| Potter's yard | red clay-stained ground, the 41 pots of the map as the game's own matka / surahi models plus little groups of kulhads drying, a potter's wheel with clay, patla and water pot, a brick kiln (avaa) with ash cap and sooted mouth, a clay heap and sack | 1 yard, 41 pot spots |
| Ponds | buffalo pond, cattle pond, clay pit pond: raised earth bund, wet inner slope, mud bed, water | 3 |
| Temple tank | stepped kund: brick wall with sandstone coping, 3 steps down each side, corner posts, steps up on the front, water | 1 (the map's 2 objects are its steps and its water) |
| Buffaloes | the game's own instanced herd model (src/animals.js), buffalo size and colour, slow idle sway | 4 (3 "Buffalo" + the one in the gher yard) |
| Resting spots | charpai (rope weave, some with a folded sheet) or a cement bench | 9 (3 charpais, 6 benches) |
| Washing platform | raised cement slab with curbs, drain spout, two slanting washing stones on bricks, standpipe with tap, bucket, mug, wet dhoti | 1 |
| Barber under a tree | wooden chair with towel, mirror on a post, stool with tin box and bowl, bucket | 2 |
| Ground patches | cricket pitch (with stumps and lime creases), kabaddi court (lime lines, dhurries), tractor and bullock-cart parking (ruts), truck parking (murram, ruts), washerman's drying ground (14 cloths spread on the grass), kids' play patches (hopscotch, brick wicket), kids' play corner (hopscotch, swing), 4 house plots (brick corner pillars), potter's yard, tempo stand, sugarcane buying centre (taraju weighing frame, 3 cane heaps), weekly market ground | 17 patches |

## Not built by me, and why

- Bus shelter, cycle stand: shops-land builds them (open sheds).
- Old well and all wells: shops-land.
- Grazing ground, mango baagh: shops-land paints them green.
- Culvert, goods yard, gher yard, dung-cake yard, haystacks yard, carrom: the layout wiring moves the game's own models onto those spots (I did not paint patches under them, so nothing fights their own floors).
- **Shopkeeper's home and godown** (`new_sqh`, 7 x 4.4 m, two storeys, at 587, -12.6): nobody builds it. It is a building, not a small object: left for shops-land.

## Numbers

Headless preview (`docs/s7/mapobjects/preview.html`, the game's own renderer, sky, fog and grade), main pass, this layer alone:

| View | Draw calls | Triangles |
|---|---|---|
| tubewell | 12 | 11k |
| cattle pond | 14 | 31k |
| buffalo pond | 11 | 8k |
| temple tank | 10 | 11k |
| cricket | 13 | 25k |
| kabaddi | 13 | 24k |
| machan + scarecrow | 7 | 8k |
| notice board | 13 | 19k |
| tower + transformer | 15 | 29k |
| gate | 14 | 24k |
| potter's yard | 13 | **92k** (81k of it the pots) |
| washing platform + barber | 13 | 21k |

- Draw calls: at most 15 in any view (budget 20). One BatchedMesh per library set for everything built (9 sets),
  one for the pot and milestone models, ground 1, water 1, painted boards 1, buffaloes 1. Each object is culled on its
  own and hidden past its reach (small props 120 m on 'full', 84 m on 'light'; tower 2.5 km, gate 700 m, tubewells
  450 m).
- Triangles if everything were drawn at once: built objects 34k, pots and milestones 120k, ground 4k, water 3k,
  buffaloes 8k. The pots are the game's existing approved models (1.6-2.4k triangles each); standing in the potter's
  yard costs 81k for them. That is the number to watch; a lighter pot model would be the fix.
- Colliders: 550 boxes (every room, tower compound, transformer, pillar, trough, charpai, bench, pot, milestone, machan
  leg; the water of the ponds and the tank is solid, like the canal).
- Downloads: no new files. The layer is code (45 KB chunk); textures are the library sets already in the game; the
  pot and milestone models were already shipped.
- Game boot (headless, `?layout=new&proof=1`, player at the gate): the layer builds, 550 colliders, 0 console errors
  apart from the character-file 404s that both layouts show (12 under old, 14 under new; the preview, which loads every
  file this layer uses, has 0 errors). `?layout=old`: layer not built.
- Preview runs: 0 console errors.

## Checks (`node src/kit/mapObjectsCheck.js`)

- Overlaps with houses (the houses agent's final rectangles): **0**.
- Overlaps with shops, kiosks, carts and other map solids: **0**.
- On a road (listed, not moved; the map is law):
  - milestone (450.0, 1.5): 0.93 m into gali_n21
  - tempo and auto stand patch (534.4, -115.5): 1.49 m under the highway (the road is drawn over it)
  - weekly market ground (762.4, 39.8): 1.66 m under gali_n28
  - kids' play patch (640.6, -51.0): 1.47 m under gali_n38
  - house plots (550.1, -60.5) and (699.5, 61.0): 1.05 and 1.11 m under galis n34 and n33
  - cattle pond bank (470.7, -49.4): 1.79 m into gali_n17; buffalo pond bank (749.3, 102.4): 1.90 m into gali_n29. The
    bund flattens to nothing where it meets the gali, so nothing stands up out of the road.
- No channel crosses a road.
- Every resting spot and both barbers' corners say "under a tree", but the map has no tree within 17 m of any of them
  (most 50-120 m). I did not add trees (that is the tree layer's job).

## Decisions I made (one line each)

- The ground cannot be dug, so ponds and the tank are built up: an earth bund 0.42 m high round water 0.11 m above the
  ground; the tank wall 0.66 m with three steps down inside.
- Each tubewell's outlet and hauz face its channel; the door is on whichever side is nearer the map's front.
- Milestones face along their road towards the traffic on their own side (same rule as src/milestones.js).
- A third of the resting spots are cement benches, the rest charpais.
- About one pot spot in four is a group of kulhads instead of one big pot; most pots fired red, some still drying.
- Gate: the welcome face looks at the highway; the other face says "thank you, visit again". Village name spelt
  "Amrai Kheda" to match the flag island's name stone.
- The 11th tubewell (850, -60) has no channel on the map: it gets its hauz and outlet but no channel.

## Wiring needed (for the integrator)

1. Done in my branch: `src/main.js` has one import line and one call, both marked `S7 WIRING (mapobjects)`, next to
   shops-land's. The call sets `window.__s7mapobjHeight` and asks for a collider rebuild.
2. Walk height on the pond bunds, the tank's wall and steps, the washing platform: in `main.js groundHeightAt`, change
   the last line to
   `return Math.max(dipHeightAt(wx, wz), window.__s7land ? window.__s7land(wx, wz) : 0, window.__s7mapobjHeight ? window.__s7mapobjHeight(wx, wz) : 0);`
3. **shops-land builds the weekly market ground as a shop**: `src/kit/shopsPlace.js` treats `new_Weekly market ground`
   (28 x 18 m, 0.1 m high) as a single shop and builds a 0.1 m tall shop block over it. Add `'Weekly market ground'` to
   its `NOT_SHOPS` set; my layer paints the ground there.
4. Minimap / free-roam do not show the new ponds, tank and channels yet (positions are in `planMapObjects()`).
5. Nothing else: no shared file is changed.

## Files

- `src/kit/mapObjectsInit.js` the tiny lazy hook the game calls
- `src/kit/mapObjects.js` the layer: batches, models, buffaloes, colliders, walk heights, distance hiding
- `src/kit/mapObjectsPlan.js` where everything goes (pure maths, shared with the check)
- `src/kit/mapObjectsKit.js` the 26 designs
- `src/kit/mapObjectsGround.js` painted ground, bunds, banks, water
- `src/kit/mapObjectsSigns.js` the gate and notice board paint (one canvas)
- `src/kit/mapObjectsCheck.js` node check (overlaps with houses, shops, roads)
- `src/kit/mapObjectsPreview.js`, `docs/s7/mapobjects/preview.html`, `shoot.mjs`, `game-smoke.mjs`
- Remake the pictures: `flock /tmp/s7-browser.lock node docs/s7/mapobjects/shoot.mjs [view ...] [--ctx=fields]`
  (the preview reads the Devanagari webfont from `tmp/fonts/`, OFL, `npm pack @fontsource/noto-sans-devanagari`).

## Licences

All geometry and both painted boards are made by us in code. Textures are the existing library sets (Poly Haven /
ambientCG CC0, already credited). Models reused: the game's own pots, milestones and herd. No new third-party file, so
nothing new for CREDITS.md or tools/licence-records.json. No brands, no shrines, nothing after 2015.

## Looks to ask her (one message, with the pictures in docs/s7/mapobjects/)

1. Tubewell (tubewell.jpg): bare brick with a cement-plastered lower metre and a blue-green steel door. Right?
2. Ponds (ponds.jpg, buffalo_pond.jpg): since the ground is flat, the water sits inside a low earth bund. Does it read
   as a village pond, or should the bund be lower / grassier?
3. Temple tank (temple_tank.jpg): brick outside, sandstone coping and steps. Right material?
4. Gate (gate.jpg): cream board with maroon letters on a plain cement beam. Colours, and is the English big enough?
5. Notice board (notice.jpg): green board, pale header. OK?
6. Potter's yard (potter.jpg): the pots are the game's own models; are they too big for a potter's stock?
7. Mobile tower and transformer (tower.jpg, transformer.jpg, tower_transformer.jpg): galvanised grey lattice, grey tank.
8. Resting spots (rest.jpg): cement benches vs charpais mix, and should each get a tree?
9. Cricket / kabaddi (cricket.jpg, kabaddi.jpg): bare earth with lime lines.
