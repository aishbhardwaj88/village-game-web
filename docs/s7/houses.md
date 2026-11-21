# Houses (S7 sprint, houses agent)

Branch `s7-houses`, worktree `/home/claude/wt/houses`. Everything new is behind `?layout=new`; `?layout=old` (and no flag) is unchanged.

## What was built

**A house kit of 8 designs**, all real geometry (parapets, chajjas, steps, sills, grilles, door panels, stairs, rafters, tiles are shapes, not paint):

| | Design | What makes it |
|---|---|---|
| A | Single storey, limewashed | door and windows under thin concrete chajjas, otla with two steps, stepped parapet, black tank on a steel stand, meter box and wire |
| B | Two storeys, stacked | first-floor slab runs out as a balcony with a steel railing, stair room (mumty) on the roof with the black tank on top |
| C | Exposed brick | old lime whitewash in big ragged patches over the brick, rusted tin-sheet verandah on two steel posts, brick otla |
| D | Two storeys, upper in bare brick | plastered ground floor, upper floor added later in brick, bare concrete lintels, column stubs with rusted rebar, tin shed on the roof |
| E | Outside stair | concrete stair along the front up to the roof with a plastered side wall, honeycomb (jali) brick parapet |
| F | Walled angan | front courtyard behind a plastered boundary wall with pillars and a painted steel gate |
| G | Mud house, tile roof | mud plaster on a brick plinth, country-tile roof (each course a real lapped row of half-round tiles), rafters under the eave, plank door, niche |
| H | Mud house, flat roof | mud walls, beam ends (kadi) out of the front wall, low rounded mud parapet, wooden ladder to the roof |

- Storeys are **stacked** (each storey is its own band with its own openings and slab edge), never stretched.
- **One texture atlas, 0 MB added**: it is put together in the browser from the approved texture sets the game already ships (brick, plaster, concrete, wood, rusted steel, terracotta, dry earth). Wall colours come from a palette per house: off-white, pale yellow, pale blue, pink, faded green, cream, bare cement, peach. Door and window paint is picked per house (green, blue, brown, maroon, grey, ochre...).
- Wear is drawn in world space, so no two walls match: faded patches, damp stains, rain streaks under the parapet, dust splash at the bottom, darker bottom metre, per-brick tone, whitewash patches.
- **Front clutter only on fronts**: charpai stood against the wall, gas cylinder, black bicycle, tulsi chaura (planter), clay matkas on a stand, steel bucket and patla. 1 to 3 per house, never in front of the door.
- Kachcha (mud) houses go on the outer edge: a 'Mud house' footprint whose back looks onto open ground is mud about half the time (elsewhere 6%).
- Neighbours never share both design and colour; doors swap sides (mirror) per house.

## The new-map houses (?layout=new)

- **492 footprints** from the approved map (`new_house` objects). Front = the side that walks straight out onto a road or gali before meeting another house; a corner house faces the same way as its row. Each house is then turned parallel to that road (62 turned, a few made up to 20% smaller to fit) and trimmed off any road it touched.
- Built on the ground height of the game (flat 0 except pond/johad/canal dips): nothing floats or sinks.
- **Drawn as ONE batch** (a three.js BatchedMesh): every house, far box and clutter piece is one instance; the batch skips each instance that is off screen (and off the shadow box). Near detail within 60 m, a simple box with the same atlas beyond (concrete roof, coping, black tank, dark window shapes), nothing past 460 m; clutter within 45 m (desktop/full preset; light preset 45 / 380 / 30 m).
- **Colliders**: simple boxes per house (a turned house is sliced into a few boxes so the corners are right), added the way the game does it (`userData.colliderBoxes`), rebuilt once when the houses stand.
- Old houses removed under `?layout=new` only: the abadi rows (scenery.js) with their collider shells, garden plants, doorstep props, roof fittings and chulha smoke, and the kit gap houses (villageHouses.js).

## Checks (node src/kit/housesCheck.js, on the game's own map data src/layout/mapData.json after merging main)

| Check | Result |
|---|---|
| houses | 492 |
| on a road | **0** |
| overlapping another house | **0** |
| overlapping another map object (incl. every shops-land shop, kiosk, cart, well, pump, haystack) | **0** |
| a tree trunk inside or within 0.3 m of a house (587 trees: map trees + shops-land orchard rows) | **0** |
| a map place inside a house | **0** |
| front not parallel to its road (> 3 deg) | **2**: #76 (19 deg) and #84 (27 deg) on the bending tractor route; turning them would hit their neighbours. Drawn that way on the map. |
| no road in front | **3**: #305 (501, -17), #472 and #473 (684, -63 / -58): enclosed plots; they face the nearest road. |

## Numbers

Measured headless (SwiftShader) with all 492 houses built exactly as the game builds them (`docs/s7/houses/preview.html?mode=village`), renderer.info with the houses shown minus hidden, same camera:

| View | Houses draw calls | Houses triangles | Near-detail houses | Far boxes |
|---|---|---|---|---|
| gali, eye height (west mohalla) | **1** | 90k | 61 | 431 |
| gali, 45 m above | **1** | 51k | 33 | 459 |
| east block gali, eye height | **1** | ~55k | 55 | 437 |

- Draw calls: the whole village of houses is **1 draw call** in the main pass (+1 in the shadow pass when shadows are on). Target was <= 30.
- Triangles on screen from houses: 50k to 90k (budget for everything is 450k). A near house is ~1,800 triangles on average (A 1,350, B 3,000, C 2,000, D 2,500, E 1,600, F 1,500, G 3,300, H 550); a far box ~95.
- Memory: 115 shapes (8 designs x 6 footprint sizes x mirrored doors, far boxes, clutter), 281k vertices, **9 MB** of geometry (28 bytes a vertex). Textures: **0 MB added** (the atlas is made in the browser from the existing sets: 2048 x 1024 x 3 maps).
- Download added under `?layout=new`: the plan file, 26 KB. Nothing is downloaded under `?layout=old`.
- Build time after Play (node, this loaded box): planning is precomputed; making the shapes ~0.7-2 s, spread over frames in 8 ms slices so no frame stalls.
- Colliders: 3,948 boxes for 492 houses.

## Screenshots

- `docs/s7/houses/design_A.png` ... `design_H.png`: each design alone, game lighting (sky, sun, HDRI, fog, colour grade), sun shadows off as in the game.
- `docs/s7/houses/gali_eye.png`: two facing rows across a 4 m gali, from eye height (1.6 m).
- `docs/s7/houses/gali_above.png`: the same gali and the back-to-back rows behind, from above.
- `docs/s7/houses/gali_eye_shadows.png`: eye height with sun shadows on (`?shadows=follow` in the game).
- `docs/s7/houses/village_gali_eye.png`, `village_gali_above.png`, `village_east_block.png`: the REAL map houses (all 492, fronts, LOD and clutter as in the game) in a west mohalla gali, from above, and an east gali.
- Remake them: `flock /tmp/s7-browser.lock node docs/s7/houses/shoot.mjs` (page: `docs/s7/houses/preview.html`).

## Files

- `src/kit/housesKit.js` the 8 designs; `src/kit/housesGeom.js` geometry builder; `src/kit/housesClutter.js` front clutter
- `src/kit/housesMaterial.js` the atlas and the one shared material
- `src/kit/houses.js` designs per house, the batch, LOD, colliders, game entry `initNewMapHouses`
- `src/kit/housesPlan.js` fronts and road alignment; `src/kit/housesPlanData.json` the result (26 KB, made by `node src/kit/housesCheck.js --write-plan`)
- `src/kit/housesLayout.js` map adapter (`isNewLayout`, map reader); `src/kit/housesInstancing.js` the batch helper
- `src/kit/instancing.js` copied unchanged from s7-perf (not used by the houses: one batch is fewer draw calls than per-chunk instancing for 8 designs x 6 sizes)

## Wiring needed

1. **main.js** (done in my branch, marked `// S7 WIRING (houses)`): one import line and one call `initNewMapHouses(scene)` right after `createVillageHouses(scene)`. It does nothing unless `?layout=new`.
2. **Layout**: done. The on/off switch is the layout module's `isNewLayout()`; the house plan is made from `src/layout/mapData.json`. If house footprints or galis change there, run `node src/kit/housesCheck.js --write-plan` and commit `src/kit/housesPlanData.json`.
3. **Milk round** (`src/jobs/milk.js`) still uses the old abadi doorsteps (`abadiDoorstep`), which stand in empty ground under `?layout=new`. New doorsteps: `NEW_HOUSES[i].door` (x, z) from `src/kit/houses.js`.
4. **Roof monkeys** (`src/roofMonkeys.js`) read `ROOF_TANK_TOPS` from villageHouses.js (empty under `?layout=new`); the new tanks are `NEW_HOUSE_TANK_TOPS` in `src/kit/houses.js` (same fields).
5. **Camera**: the new houses are not in `cameraObstacles` (raycasting the batch every frame is costly). If the camera clips into walls in galis, push `window.__newHouses.group` into `cameraObstacles` or give the camera the collider boxes.
6. **Tulsi plant** on the chaura: the game has no real tulsi model (vegetation.js draws none), so the chaura shows bare soil. If a real model arrives, chaura tops are clutter items of kind `tulsi` (house-local, see `clutterFor`).
7. The 'Mud house' label is on 400 of the 492 footprints (all the new mohallas), not just the outer edge; I treated it as "may be mud" and kept mud to backs-on-open-ground. Decision for Aishwarya if she wants more or fewer mud houses.

## Game boot (headless, after merging main with shops-land)

- The layout agent's smoke (`tools/layout-smoke.mjs`) on my merged build, `?layout=new`: **PASS**, 0 new console errors (only the skipped character files 404), the 5 probed places drawn exactly at their anchors.
- Later boots on this shared box crashed the browser's renderer about a minute after Play, also with the houses switched off (`?nohouses=1`) and under `?layout=old`, so it is the box, not the houses. The draw-call and triangle numbers above come from the preview page, which uses the game's own renderer, lighting and the real 492-house build.

## Merge with main (21 Nov evening)

- Merged origin/main and the integrator's main (8c8b77c, shops-land). One conflict in main.js (two wiring imports side by side), kept both.
- The repo is shallow at d9374e4, so `git merge origin/main` says "unrelated histories"; I merged with the sprint base b5bd781 as the merge base (git merge-tree). Clean.

## Selling rules and editions

- Licences: the kit adds **no third-party file**. Geometry is self-built; the atlas is composed at runtime from texture sets already in the game and already credited (Poly Haven / ambientCG, CC0). Nothing new for CREDITS.md.
- Quality knobs are in one place, `src/kit/housesQuality.js`, and follow `getQualityName()` from `src/edition.js`: near-detail distance (light 45 / full 60 m), clutter distance (30 / 45 m), far cut-off (380 / 460 m), anisotropy (4 / 8). Atlas cells stay 512 px in both (~33 MB GPU; 1024 px would be ~134 MB for little gain since the scans are 1K).

## Found while checking (for the integrator)

- **shops-land trees under the real game**: `src/kit/landTrees.js` reads tree markers from `o.rings`, but the layout module's map data (`getLayout().objects`, which `loadLandMap()` prefers) gives trees as `cx, cz, r` with no rings. So in the game only the orchard fill rows would draw, none of the 584 map trees. Their preview reads the raw export (with rings), so it looks right there. One-line fix on their side: use `o.cx/o.cz/o.r` when there are no rings.
- **2 houses not parallel to their road** (#76, #84, on the bends of the east tractor route) and **3 enclosed plots** with no road in front; listed above. They face their nearest road.

## Looks to ask her (one message, with the pictures)

1. The 8 designs (`design_A.png` ... `design_H.png`): keep all 8? Any to drop?
2. Whitewash patches on brick (design C): too strong or right?
3. Mud houses (G, H): colour and how many (now about 1 in 7 houses, at the outer edges).
4. Door and window paint colours (green, blue, brown, maroon, grey, ochre): OK?
5. The tulsi chaura is empty (there is no real tulsi plant model): keep empty, or drop the chaura?
