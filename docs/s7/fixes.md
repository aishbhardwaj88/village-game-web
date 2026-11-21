# S7 fixes (agent notes)

Branch `s7-fixes`. Everything here shows only with `?layout=new`; `?layout=old` is unchanged.
Pictures: `docs/s7/fixes/` (remake: `flock /tmp/s7-browser.lock node docs/s7/fixes/shoot.mjs [view ...]`).

## 1. Shopkeeper's home and godown (`new_sqh`) - done

- Built by the shops-land kit (`src/kit/shopsPlace.js` + `shopHouse()` in `src/kit/shopsKit.js`), on the layout's
  corrected footprint `o.rect`: centre (587.2, -12.6), 7 x 4.4 m, 6.5 m tall, front facing south onto gali n41
  (front edge 5.8 m from the gali; nothing on a road).
- Two storeys: the godown below behind a rolling shutter (down), the family's own panelled door beside it (new
  `homeDoor` option of `shopHouse`, off for every other shop, so the 44 shop-houses are unchanged), the home above with
  its balcony door, grilled window, sunshade and balcony parapet. Same 5 library materials, same batches: 0 new draw calls.
- Wall colour and balcony come from their own seed, so no other shop's colour or variant moved.
- On a preview page that reads the raw export (no `o.rect`), it falls back to the drawn plot fronted on the side
  nearest a road (same answer: south).
- Pictures: `shopkeeper_home.jpg` (from the gali), `shopkeeper_home_above.jpg`, `sqh_top.jpg` (straight down).
- Question for her (look): no signboard on it (godowns usually carry none). Should it have one?

## 2. Trees for the "under a tree" spots - done

The map calls 12 spots "under a tree" (2 barbers, the carrom, 9 resting spots) but drew no tree within 17 m of any of
them. Each now has one shade tree, drawn by the shops-land tree layer (`src/kit/landTrees.js`): same species (neem,
peepal), same leaves, same three distance tiers, same 3 draw calls, trunk collider and canopy entry as every other tree.

**The rule** (planned once in Node by `src/kit/landShadeTrees.js`, result in `src/kit/landShadeTrees.json`, 1 KB):
1. One tree per spot. The trunk stands on the **sun side** of the seat (the game's afternoon sun comes from the
   east-south-east, about 48 degrees up), **1.6 to 2.9 m** from the seat's centre, 2.4 m preferred. That puts the dense
   part of the crown over the seat, and where the ground allows, its shadow on the seat too.
2. The trunk stays clear of: the charpai, bench or barber's chair (0.7 m from its footprint; the carrom's table and four
   seats count as a 3 m circle), any road or gali (1.2 m from the edge), every building, shop and house (2 m, 3 m
   preferred so the crown does not push into a wall), every placed map object (0.8 m), ponds, the temple tank,
   play / yard / parking patches, orchards, the canal (9 m), and other trees (3 m).
3. **Neem** by default; a **peepal** where it has room (no building or road within 5 m): 1 of the 12.
4. Shade trees are a little bigger than the map's own village trees (crown box 9 m neem, 11 m peepal) because the map's
   village neem markers are 3.2 m and would not cover a charpai.
5. Re-plan after any map change: `node src/kit/landShadeTrees.js --write` (prints each tree and its checks).

| Spot | Tree | Trunk from seat | Nearest building | Road edge |
|---|---|---|---|---|
| Carrom (571.2, -10.3) | neem | 2.2 m | 2.0 m | 3.1 m |
| Barber 1 (503.0, 8.1) | neem | 2.4 m | 10.9 m | 1.4 m |
| Barber 2 (627.3, 49.7) | neem | 2.8 m | 2.9 m | 3.9 m |
| Resting 1 (479.8, 56.6) | neem | 2.8 m | 3.0 m | 2.5 m |
| Resting 2 (691.0, -19.2) | neem | 2.4 m | 4.0 m | 1.2 m |
| Resting 3 (485.9, -17.9) | neem | 1.6 m | 2.9 m | 10.2 m |
| Resting 4 (684.8, 56.0) | neem | 2.0 m | 3.1 m | 1.2 m |
| Resting 5 (795.4, 49.6) | neem | 2.8 m | 4.3 m | 10.8 m |
| Resting 6 (698.7, -2.0) | neem | 1.6 m | 2.4 m | 1.2 m |
| Resting 7 (682.0, 105.7) | peepal | 2.8 m | 8.0 m | 22.6 m |
| Resting 8 (703.1, -24.0) | neem | 2.8 m | 2.8 m | 4.0 m |
| Resting 9 (457.5, 49.6) | neem | 2.8 m | 2.7 m | 1.3 m |

- All 12 have the crown over the seat. The crown's **ground shadow** lands on the seat only when sun shadows are on, and
  even then misses the seat at the carrom, barber 1 and resting 2, 3, 4, 6 and 8: their sun side is blocked by a wall
  or a road within 2 m. Their crown is still overhead.
- Pictures: `barber_tree.jpg`, `rest_tree.jpg` (a bench, from eye height), `rest_peepal.jpg`, `rest_top.jpg` (straight down).
- Cost: 12 more trees in the same 3 batches: 0 new draw calls; a near neem is 2,060 triangles, a near peepal 2,382 (fewer at the thinned and impostor tiers).
- Questions for her (looks): are the shade trees the right size? Should resting spot 7 keep its peepal?

## 3. Minimap and free-roam water - done

- New `src/kit/waterMap.js` reads the approved map's water from the layout loader (already in the game's main file, so
  nothing new downloads): the canal (x 824, z -340..350, 6 m), the canal bridge on the east road (824, 32.5), the 10 field
  channels, the buffalo, cattle and clay pit ponds, and the temple tank (water and its stepped rim).
- **Minimap** (`src/minimap.js`), under `?layout=new` only: the canal is drawn at its real width (6 m, at least 3 px),
  plus the channels as thin blue lines, the ponds and the tank as blue shapes (the tank's stepped rim in earth colour).
  The old village's pond and johad keep their place icons as before. `?layout=old`: exactly today's single canal line.
- **Notebook map** (`src/freeRoam.js`), under `?layout=new` only: the old east-west wavy canal is replaced by the new
  north-south canal (kept below the heading and inside the page), with the channels, ponds and tank inked in. The
  "Nahar and bridge" place (its icon, label and tap-to-travel) moves from the old canal spot (771, 33.8), which is now the
  weekly market ground, to the new canal's bridge on the east road (824, 32.5). `?layout=old`: unchanged.
- Checked in the real game (headless, `docs/s7/fixes/game-smoke.mjs`, player at (790, 75)): `minimap-new.jpg` (canal
  band and the buffalo pond), `notebook-new.jpg` (whole page), `minimap-old.jpg` / `notebook-old.jpg` (unchanged).
- Not done (main.js, integrator): the canal **water sound** still measures from the old canal under new
  (`distanceToCanalWater` in main.js; sound is off until ?sound=1). See "Wiring left".

## 4. Pot triangles (potter's yard) - done, with one honest limit

- `src/kit/mapObjects.js`: the pot and milestone batch now has a distance stand-in per instance. Each pot model gets a
  **lathe stand-in built from its own outline** (widest radius per height band, the rim turning in at the mouth), same
  material, same colour, same batch, so **0 new draw calls** and no new files. Pots: 9 bands x 8 sides = 192 triangles;
  kulhads 5 x 6 = 108 (the full models are 1.6-2.4k).
- Pots switch to the stand-in **beyond 25 m**; the little kulhad cups beyond **12 m** (my call: a 10 cm cup is a few
  pixels at 12 m). Milestones are unchanged.
- Numbers (the map objects preview, the game's renderer, the pots + milestones layer alone, main pass, 1280 x 720):

| View | Before | After |
|---|---|---|
| inside the yard (the map objects agent's `potter` view, 7-20 m from every pot) | 81.1k | 73.2k |
| from the lane, 30 m | 85.4k | 17.6k |
| 45 m | 85.4k | 15.4k |
| 70 m | 77.8k | 16.4k |

  (The ~16k left at distance is mostly the 10 milestones, which are not pots.)
- **The limit:** every one of the 41 pot spots is within 20 m of the yard view, so a 25 m switch cannot lower the 81k
  there; only the kulhads switch. For information: switching every pot at 12 m would make that view **31.9k**. The real fix
  inside the yard is a lighter pot model (the source models are 1.6-2.4k triangles each). Decision for the integrator /
  her: keep 25 m, or go to 12 m.
- Pictures: `pots_full_close.jpg` vs `pots_standin_close.jpg` (every pot forced to its stand-in, same camera: the outlines
  hold; the texture grain is a little coarser), `potter_lod.jpg` (as shipped, inside the yard), `potter_lane_30m.jpg`.
- Remake the numbers: `flock /tmp/s7-browser.lock node docs/s7/fixes/pots-measure.mjs` (`pots-measure.json`).
  In the game, `__s7mapobjects`'s group has `userData.setPotLod(on, metres)` for comparing.

## 5. The extra 404s under new - explained (nothing broken; no change made)

Found with `docs/s7/fixes/game-smoke.mjs` (headless, every failed request logged with its URL and the moment it happened;
results in `smoke-old*.json` / `smoke-new*.json`).

- **Every 404 in both layouts is a model-slot probe**, not a broken file: when a place's zone streams in, the game asks
  (a HEAD request) whether a drop-in model `assets/models/<place>.glb` exists (`src/siteSlots.js` + `src/assetSlots.js`,
  docs/asset-slots.md). For most places none exists yet, so the answer is 404 and the game keeps its own built place. The
  browser prints each 404 as a red line, which is why they look like errors. There are **0 other console errors** in
  either layout.
- Title screen and the first seconds after Play: the same 9-10 probes in both (tractor, trolley, cart, bullock, bike,
  player, monkey, charpai, hand pump, cow, halwai). Player at (790, 75) for 15 s: **11 vs 11**.
- Player at the gate (612, -128) for 60 s, the map objects agent's spot: **old 20, new 25**.
  - Only under new: `chemist.glb`, `manihari.glb` (**always**: on the approved map the chemist and the manihari stand on
    their own again, built by the layout wiring, so each is a place with its own slot; under old they are folded into the
    bazaar row and never probe). This is the steady "+2".
  - Also only in this new run: `mela_ground.glb`, `anganwadi.glb`, `gurudwara.glb`, `jain_mandir.glb`; only in the old
    run: `masjid.glb`. These depend on which zones happen to stream in near the player in that minute (the places
    stand elsewhere under new), not on the layout being wrong.
- Why not "fixed": silencing them means giving the game a list of the model files that exist so it never asks for a
  missing one. That changes `?layout=old` too (fewer requests), so it is the integrator's call: e.g. the build writes
  `assets/models/index.json` and `urlExists()` in src/assetSlots.js checks that list first. Listed under "Wiring left".

## 6. Map objects reaching into roads - done (roads and houses untouched)

All in the map objects plan (`src/kit/mapObjectsPlan.js`), so the game and its check (`node src/kit/mapObjectsCheck.js`)
see the same shapes. **Check result: on a road 8 -> 0**; overlaps with houses 0, with other solids 0 (unchanged).

- **Painted patches**: any side that reaches into a road steps back to the road edge (+5 cm); what stands on the patch
  (plot corner pillars, hopscotch, brick wicket) is placed after the trim, so it moves in with the edge.
  Tempo and auto stand: 1.89 m off its highway side (now 10.1 x 5.0 m). Weekly market ground: 1.92 m (28 x 16.1 m).
  Kids' play patch 2: 3.15 m over two sides (7.0 x 6.85 m). House plot 1 and 4: 1.94 m each. Kids' play patch 3 also
  gave up 0.17 m (it touched a gali by less than the check's 5 cm).
- **Milestone** (450.0, 1.5): stepped 0.99 m sideways onto the verge of gali n21 (now 0.36 m clear of the edge, still
  facing along its road). Milestone 10 moved 2 cm for the same reason.
- **Pond banks** (cattle pond, buffalo pond): not just the bank, the **water** too reached into the galis (0.5 and
  0.3 m), and four galis end at the cattle pond. The rule I used: along each direction from the pond's centre, the bank
  ends at the road edge and the water stops a 0.6 m earth lip short of it, eased over the neighbouring ~30 degrees so the
  bank recedes in a soft curve where a lane meets it (a square notch looked like a cog). The rest of each pond keeps its
  drawn size. The bund, mud bed, water, walk height and the water's collision all follow the same shape. Largest pull-back
  of the bank: 3.6 m (cattle pond, where its lanes end) and 3.7 m (buffalo pond, where gali n29 ends at it).
- Pictures: `pond_cattle_top.jpg`, `pond_cattle_eye.jpg`, `pond_buffalo_top.jpg`, `play_patch_top.jpg`, `milestone_eye.jpg`.
- Question for her (look): the cattle pond now has soft bays where its four lanes arrive. Keep, or should the lanes stop
  short of the pond instead (that would move roads, so it is the layout agent's job)?
