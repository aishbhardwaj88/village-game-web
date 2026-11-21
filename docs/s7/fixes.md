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
- Cost: 12 more trees in the same 3 batches: 0 new draw calls; about 3-6k triangles per near tree.
- Questions for her (looks): are the shade trees the right size? Should resting spot 7 keep its peepal?
