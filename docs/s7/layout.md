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
- `tools/layout-tests.mjs` the front / road / ground / overlap test.
