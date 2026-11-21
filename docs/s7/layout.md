# Layout agent notes (S7 sprint, 21-28 Nov 2026)

Plain words first: this part of the sprint moves the village onto the map Aishwarya approved on 21 Nov.
Everything new sits behind `?layout=new` in the address. Without it (or with `?layout=old`) the game is exactly as today.

## API (for the houses and shops-land agents): import from `src/layout/layout.js`

```js
import { isNewLayout, getLayout, getPlace, getRoads, getObjects, getCanal,
         layoutTurnDeg, layoutYaw, movedWith, movedYaw } from './layout/layout.js';
```

| Call | Gives |
|---|---|
| `isNewLayout()` | `true` when the page runs the approved map (`?layout=new`). Default is old until the integrator flips `DEFAULT_LAYOUT` in `src/layout/layout.js`. Node tools: set `globalThis.__DOPAHAR_LAYOUT = 'new'` before importing. |
| `layoutMode()` | `'new'` or `'old'` |
| `getLayout()` | `{ places, list, roads, objects, canal }`, built once from `src/layout/mapData.json` |
| `getPlace(id)` | `{ id, name, hi, x, z, ry, front, frontYaw, offsetDeg, row, existing, minor, before }` |
| `getRoads()` | `[{ id, kind, width, name, pts: [[x, z], ...] }]`, kind = `highway`, `road`, `lane`, `back` (galis), `track` |
| `getObjects(kindOrPrefix)` | a kind (`'ground'`, `'solids'`, `'trees'`, `'crops'`) or a label prefix (`'new_house'`, `'new_sqx'`, `'new_sqh'`, `'new_kiosk'`, `'new_mango'`, `'new_guava'`, `'new_rowtree'`, `'new_field'`...) |
| `getCanal()` | `{ centre_x, width, bank, bank_track_x, green_strip }` |

Each object: `{ id, prefix, name, kind, label, color, y0, y1, y, h, cx, cz, ... }`
- trees: `cx, cz, r` (crown radius, the map's circle), `h` = height. No rings (they were circles).
- everything else: `rings` (world metres, as drawn).
- 4-corner footprints also carry `rect: { cx, cz, w, d, ry, front, frontMid }`: the footprint as an oriented box.
  `w` runs along the front edge, `d` is the depth, `ry` turns a model built "front = +z" onto it, so the front looks at
  its road. The front is the map's own front where a named place sits on the footprint (`place` = its id), otherwise the
  side towards the nearest road or gali. Houses: place each one with `position (rect.cx, 0, rect.cz)`, `rotation.y = rect.ry`,
  size `rect.w x rect.d`.
- `id` = `prefix#n` (n counts within the prefix, stable while the map file is unchanged).

Places: `x, z` = centre; `front` = the TRUE front (unit vector, already corrected in the export); `frontYaw = atan2(front.x, front.z)`;
`ry` = the yaw to give the model = `frontYaw + offsetDeg` (offset from `src/layout/frontOffsets.js`, non-zero only for the
few old models that were built facing another way). `row: true` marks the bazaar row (a row of units along local x).

Coordinates: metres, x east, z south. `rotation.y = ry` puts local +z on `(sin ry, cos ry)`.

### Helpers for anything placed by hand (identity under the old layout)

| Call | Use |
|---|---|
| `layoutTurnDeg(id, oldDeg)` | a place's map turn in degrees (rotation.y = -turn); replaces a hard-coded turn constant |
| `layoutYaw(id, oldYaw)` | a place's yaw in radians |
| `movedWith(id, x, z)` | a world point that belongs to place `id` (NPC spot, interaction point, door mark), carried round with the place |
| `movedYaw(id, yaw)` | a yaw that belongs to place `id`, turned with it |

`src/anchors.js` already takes the new positions: every `pt(id)`, `localPt(id, ...)` and `ANCHORS[id]` reader moves by itself.

## Files (all mine)
- `src/layout/layout.js` the loader and helpers above.
- `src/layout/layoutCore.js` pure maths (no three.js), shared by the game and the Node tools.
- `src/layout/frontOffsets.js` which old models face another way at yaw 0 (data, with the source of every number).
- `src/layout/mapData.json` the approved map, packed (406 KB instead of 649 KB: tree circles stored as centre + radius).
  Rebuild with `node tools/layout-pack.mjs` if the approved map changes.
- `src/layout/footprints.js` the size of every existing place (from its own model file where one exists).
- `src/layout/layoutSnap.js` the road snap and gali trim (run by the pack tool, never in the game).
- `src/layout/layout-wiring-entry.js` the run-time moves main.js cannot get from the anchors (one call, see below).
- `tools/layout-pack.mjs` rebuilds `mapData.json`; `tools/layout-tests.mjs` the tests; `tools/layout-smoke.mjs` the headless boot.
- Also changed: `src/anchors.js` (takes the new spots), `src/mapRoads.js` (new roads), `src/save.js` (version 2, safe start),
  and two marked lines in `src/main.js` (`// S7 WIRING (layout)`: one import, one call).

## Coordinate check (done 21 Nov, before relying on the map)
- The map's "before" spot of every existing place equals today's anchor in `src/anchors.js` within 0.6 m, all 64 anchors,
  except three labels (East gali, West gali: label points only) and the gurudwara (0.8 m: its anchor was nudged on 10 Nov).
- The map's "before" front, however, is NOT the true front for the 6 old models built facing another way (school, halwai,
  tea stall, general store, temple, mandi): it was worked out as if every model faced +z. The 10 Nov road-front audit and the
  build scripts give the real ones; that is what `frontOffsets.js` records.
- In the running game (headless boot, `tools/layout-smoke.mjs`, 21 Nov 17:50): under `?layout=old` the anganwadi, gurudwara,
  old haveli, post office and health centre are drawn exactly at the map's "before" spot and yaw (0.0 m, 0.0 deg off); under
  `?layout=new` the same five are drawn exactly at their new anchors (gurudwara (443.9, 95.5) yaw 2.6, haveli (657.6, -36.7)
  yaw 85.3, health centre (588.0, 57.7) turned 11.2 by my wiring).
- Conclusion: x east, z south, metres, yaw = three.js rotation.y with front = (sin ry, cos ry). Same frame as the game.

## Two things in the approved map I corrected (and why)
1. **Untouched places.** The map's own note says the school, the anganwadi, the gurukul and the sports grounds stay exactly as
   they are. For those (and 20 small props) the export's front is exactly reversed although nothing moved: the export's
   front flip landed on places nobody turned. They keep today's position AND today's turn (`untouched` in the data).
2. **The brick kiln** was moved but not turned, so its front looked into the fields, away from the highway and its own green
   strip. It is turned round to face the highway (`adjust.flipped`). Every other moved place keeps the front she drew.

## The road snap (her rule: every building faces its road, edges parallel, nothing on a road)
The map is a drawing, so `tools/layout-pack.mjs` nudges each building as little as possible: turned up to 15 deg to run
parallel to the road in front, moved forward up to 6 m (7.5 m for an existing place) to a 2 m gap, or stepped back off a road
it stands on. Any nudge that would make it overlap something is undone. Result: **107 footprints nudged** (24 existing places,
39 new named buildings, 44 houses); largest move 6.3 m (our house, towards the ring road), largest turn 12.7 deg.
**21 gali ends trimmed** (0.25 to 7.25 m) where the 4 m lane ran into the wall of the building it leads to.
Every nudge is in the data (`place.adjust`, `object.adjust`, `getLayout().nudges`, `getLayout().galiClips`).

## What moved, district by district (old spot -> new spot, turn in degrees)
All of these move by themselves through `src/anchors.js` under `?layout=new` (anything reading `pt()`, `localPt()` or
`ANCHORS` follows). "Wiring" = also needs a line outside my files (listed further down).

| District | Places |
|---|---|
| Untouched | school, anganwadi, gurukul (+ its v2 yard), khel maidan, volleyball, akhada, gilli: no change |
| The square | halwai (29 m, turn 49, wiring: village.js), tea stall (31 m, -138), banta (42 m, -149), TV house (87 m onto the old chowk tea stall spot; wiring: drop the chowk tea stall) |
| Bazaar street | bazaar row (96 m, -110, wiring: bazaar.js), ration (47 m, 121), atta chakki (87 m, 121), manihari (standalone again, built by my wiring), bus adda (40 m), puncture (78 m), brick kiln (325 m, faces the highway) |
| Highway strip | general store (162 m, 75), temple (91 m, -91, wiring: temple.js), chemist (standalone again, built by my wiring), mandi (76 m), paani tanki (117 m, 38), dharam kanta (88 m), khalihan (72 m), our khet (16 m south) |
| Civic and health | post office (9 m), health centre (138 m, turned by my wiring), chaupal (80 m), panchayat (18 m) |
| Old haveli | haveli (19 m, 93), East gali label |
| West mohalla | pond (43 m), gurudwara (61 m, -86), West gali label |
| Cattle and dairy | dairy (66 m, -104), gaushala (21 m, 173), masjid (63 m, turned by my wiring), petrol pump (80 m, now on the north side of the highway, faces it) |
| Fair and tubewell | tubewell (30 m), mela ground (135 m), johad (37 m), Jain mandir (64 m, turned by my wiring) |
| Homes | our house (7 m, turn 90, faces the ring road; wiring: village.js), chaat (44 m), jalebi (18 m), sabzi (32 m) |
| Small props | 51 ride-nook / long-walk / field spots moved onto the new farm loop, 20 kept, the rest dropped (not on the map) |

Also moved by `layout-wiring-entry.js` (they are old models the map re-places under new names): goods yard, gher yard,
haystacks, dung-cake yard, carrom, culvert, wheat field gate. Dropped under `?layout=new`: the old north-south highway strip
(it lay on the new canal green), old lane laundry corners, the four walled plots round the old haveli spot, the 1 Nov
roadside compound walls. Roads: the whole network is the approved map's (68 lines, galis 4 m, inner lanes 3.5 m, west edge
lane, canal bank track), the roundabout ring as today; the old kachcha tracks, field loop and temple stub are not drawn.

## Save (src/save.js)
- Version 2, and the save remembers which layout it was made in. A save without a version (all saves until today) or from
  the other layout keeps its story progress and pocket money, never a position (saves held no position until now anyway).
- `safeSpawn(pos)`: under `?layout=new` a start point inside or touching a building moves to the nearest clear point on a
  road or lane. The game's start (604, 27) is already clear; my wiring checks the player again after the zones are registered.

## Test numbers (21 Nov, `node tools/layout-tests.mjs`, after the snap)
176 named buildings, 492 houses, 926 footprints checked. 32 failures left (from 120 before the snap and the two corrections).

| District | named | front fails | on a road | floating/sunk | overlaps |
|---|---|---|---|---|---|
| The square | 36 | 3 | 0 | 0 | 0 |
| Bazaar street | 27 | 2 | 0 | 0 | 0 |
| Civic and health | 26 | 6 | 0 | 0 | 1 |
| Highway strip | 17 | 3 | 1 | 0 | 0 |
| Homes | 35 | 9 | 1 | 0 | 0 |
| Cattle and dairy | 13 | 1 | 2 | 0 | 0 |
| Fair and tubewell | 14 | 1 | 0 | 1 | 0 |
| Old haveli | 4 | 0 | 1 | 0 | 1 |
| West mohalla | 3 | 0 | 0 | 0 | 0 |
| Schools and sports (untouched) | 1 | 1 | 0 | 0 | 0 |

Headless boot (`tools/layout-smoke.mjs`, both layouts, Play pressed, character models skipped for memory): old boots in 85 s
with 330 streamed zones, new in 91 s with 236 (the dropped old-spot zones), **zero errors under `?layout=new` that `?layout=old`
does not also show** (the only red lines on both are 404s for the skipped character models and model-slot probes). Note: this
shared machine crashes the 3D page whenever several agents run browsers at once; run it under `flock /tmp/s7-browser.lock`.
`tools/collision-test.js` and `tools/regression-check.js` were not run: each is a long full-world browser run this machine
could not hold today; they test `?layout=old`, which my changes leave byte-for-byte the same in behaviour.

Houses facing a road or gali within 3 m and 3 deg: 449 of 492 (reported, not failed: each house's front is the side nearest
its gali by construction). Coordinate check: pass. Map pack fresh: pass.

What is left, in plain words (each needs her eye or a small build decision, not a silent move):
- **Rows of shops on a bend** (2-storey shops by the main road's bend south of the square, and three on the curving west arm
  of the cross road; 3.7 to 12 deg off): turning one shop of a touching row makes it overlap its neighbour, so the snap left
  them. Fix by turning each row as one piece when the shops-land agent builds them.
- **Kiosks behind their carts** (5 kiosks 4 m back from the inner lane, carts in front of them): drawn that way on purpose.
- **Bangles shop, Kites/Gift/Grocery shops, a tea stall, the cloth shop**: 20-25 deg off or 5-8 m back as drawn.
- **Paani tanki** sits diagonally (27 deg) at the outer lane corner, as drawn. **Brick kiln** is 18 m back from the highway
  behind its own green strip, as drawn. **Gaushala** 4 deg off the cross road (turning it would hit the dairy).
- **On a road**: the dairy's and the haveli's backs touch the gali behind them by 1-1.6 m (their models are bigger than her
  outline); the petrol pump's forecourt apron reaches 2.8 m into the highway (built that way: the apron meets the road); the
  paani tanki corner 0.2 m into a gali; one house 0.2 m into the outer lane.
- **Floating/sunk**: the mela ground's far corner reaches the johad's bank (0.9 m dip under one corner).
- **Overlaps**: post office and chaupal yards share 1.1 m of edge; two mud houses by the haveli overlap 0.5 m as drawn.

## Wiring needed (for the integrator; files I do not own)
Each line keeps `?layout=old` exactly as today (`layoutTurnDeg(id, old)` returns `old` under the old layout).

1. **src/village.js** (our house and the halwai still turn by their old constants; everything built from them, NPC spots and
   doors included, follows once the constant does):
   ```js
   import { layoutTurnDeg } from './layout/layout.js';
   export const SCHOOL_TURN_DEG = layoutTurnDeg('school', 11.2); // untouched: stays 11.2
   export const HOUSE_TURN_DEG = layoutTurnDeg('house', 5);
   export const HALWAI_TURN_DEG = layoutTurnDeg('halwai', 95);
   ```
2. **src/bazaar.js**: `import { layoutTurnDeg, isNewLayout } from './layout/layout.js';` then
   `export const BAZAAR_TURN_DEG = layoutTurnDeg('bazaar', 4.8);`
3. **src/temple.js**: `import { layoutTurnDeg } from './layout/layout.js';` then
   `export const TEMPLE_TURN_DEG = layoutTurnDeg('temple', 1.5);`
4. **The chowk tea stall** is not on the approved map and the TV house now stands on its spot. Under `?layout=new` do not build it:
   - src/main.js line ~606: `if (!isNewLayout()) bazaarGroup.add(buildTeaStallChowk());`
   - src/main.js line ~1119: register the `tea_stall_chowk` slot only `if (!isNewLayout())`
   - src/bazaarLife.js line 53: leave out the chowk tea drinkers' pair `if (isNewLayout())`.
5. **src/jobs/stalls.js** (banta buy point is an unturned offset; the banta now faces the roundabout):
   `pos: localPt('banta', -0.2, 0)`, `buyAt: localPt('banta', 1.6, 0.4)` (localPt from src/anchors.js turns with the place).
   Same pattern anywhere else that writes `pt('<place>').x + n`: use `localPt` or `movedWith` (src/layout/layout.js).
6. **src/wayfinding.js**: the 8 signposts stand at fixed offsets beside the old road arms. Under `?layout=new` skip any post
   for which `inBuilding(x, z)` (src/save.js) is true, or re-seat it 5 m off the nearest road with `getRoads()`.
7. **Road-side life that seeds itself along roads** (src/mainRoadFrontage.js, src/armFrontage.js, src/gullyLife.js): they read
   the new roads automatically (allRoadLines) but only keep clear of the carriageway; add `&& !inBuilding(x, z)` (src/save.js)
   to their spot checks so nothing seeds inside the new houses and shops.
8. **Perf branch**: zoneManager.js `currentLayout()` should return `layoutMode()` from src/layout/layout.js, so one switch
   (`DEFAULT_LAYOUT`) flips everything. My loader already honours the same `window.__dopaharLayout` override.
9. **To flip the default** when every district is signed off: `DEFAULT_LAYOUT = 'new'` in src/layout/layout.js.

## How to run the checks
- `node tools/layout-tests.mjs` (add `--verbose`, `--district "bazaar"`); exit 1 on any failure.
- `node tools/layout-pack.mjs` after any change to the approved map or to footprints / snap rules (the tests check it is fresh).
- `npx vite build --outDir dist-smoke && flock /tmp/s7-browser.lock node tools/layout-smoke.mjs --no-force`
  (character models are skipped to fit this shared machine's memory; `--pre-play` = title screen only).
