# S7 perf agent notes

## For the kit agents: the chunked instancing helper (src/kit/instancing.js)

Ready to use now. Tested by `node tools/perf-instancing-test.mjs` (headless browser, all checks pass).

**Why use it**
- One InstancedMesh for 400 houses across the whole map = 1 draw call, but it can never be skipped, even when it is behind you, and its shadow pass draws all 400.
- This helper splits your items into 100 m map squares (chunks): one draw call per square that has items, and squares behind the camera or outside the sun's shadow box are skipped for free.

**Plain instances**

```js
import { createChunkedInstances } from './kit/instancing.js';

const group = createChunkedInstances({
  geometry, material,          // shared; you own them (dispose is yours)
  items: [{ x, z, y, ry, sx, sy, sz, color }],
  chunkSize: 100,              // metres, default 100
  castShadow: false,           // default false: say true only for things whose shadow matters (walls, roofs, trees)
  receiveShadow: true,         // default true
  name: 'houses_walls',
  heightAt: (x, z) => 0,       // optional: used when an item has no y
});
scene.add(group);
```

- items: `x`, `z` world metres (x east, z south); `y` optional (else `heightAt(x,z)`, else 0); `ry` yaw in radians; `sx/sy/sz` default 1; `color` optional (hex number, `'#rrggbb'`, or THREE.Color; multiplies `material.color`, items without a colour in a coloured chunk are white). Optional `rx`, `rz` also work.
- Returns a THREE.Group, one InstancedMesh per occupied chunk, each with its own bounding sphere and box, `frustumCulled = true`.
- `group.userData.chunks` = `[{ key, cx, cz, count, mesh, center, radius, minX, maxX, minZ, maxZ }]`
- `group.userData.count` = total items. `group.userData.dispose()` removes the chunk meshes (not your geometry/material).

**Near / far swap per chunk (LOD)**

```js
import { createChunkedLOD } from './kit/instancing.js';

const group = createChunkedLOD({
  near: { geometry: detailedGeo, material },
  far:  { geometry: simpleGeo, material: simpleMat },   // or far: null to hide beyond the distance
  items, chunkSize: 100,
  switchDistance: 120,         // metres from the camera to the chunk's nearest edge
  castShadow: true,            // near meshes; far meshes use farCastShadow (default false)
  name: 'trees',
});
scene.add(group);
```

- No wiring needed: it re-checks itself during rendering, at most every 200 ms (a hidden zero-cost helper; measured 0 extra draw calls).
- 10% margin so a chunk on the border does not flicker between near and far.
- `group.userData.update(camera, true)` forces a re-check (e.g. after a teleport).

**Rules of thumb**
- Do not run the old merge passes (`mergeGroupByMaterial`, `batchStaticGroup`) over these groups; they are already batched.
- Colliders: the existing collider builder reads InstancedMesh instances (src/autoColliders.js), so nothing extra, but keep `userData.collider` conventions of your kit.
- Every chunk mesh carries `userData.chunked = true` and `userData.wantsShadow`, so the perf distance-shadow switch can turn chunk shadows off far from the player.
- Measured: 2000 items over 1 km x 700 m build in about 13-22 ms into 80 chunks.

## Budget gate (tools/check-budget.js)

**What it checks (on the built game in dist/, so slimmed characters count and the big originals in public/ do not)**
- Whole shipped game <= 90 MB
- Each character model (any model with a skeleton) <= 1.5 MB; the 10 named cast (parlour_didi, sister, maa, pitaji, dada, dadi, brother, sarpanch, postman, teacher) <= 2.5 MB
- Any other single model <= 5 MB; loose texture files <= 1024 px (props 512 px)
- Advisory only, never fails: textures inside models over 1024 / 512 (props) / 2048 (characters) px
- From the last perf ride (docs/s7/perf/latest.json): before-Play MB, Play ready, village ready, draw calls, triangles, GPU texture memory, frame times. Enforced in strict mode only when the ride is at most 3 days old; frame times are never judged from a software-GL machine.

**How to run**
- `npm run budget` : report only, never stops anything (also runs at the end of every `npm run build:unchecked`)
- `npm run budget:strict` : stops with an error on any breach
- `npm run budget -- --all` : also lists every advisory note

**Deploy**
- .github/workflows/deploy.yml now runs `npm run budget` after the build (report only).
- Tue 24 Nov: the integrator changes the line marked `# S7-STRICT-FLIP` to `npm run budget:strict`. From then a breach stops the deploy.

**Status on 21 Nov (main, b5bd781): 11 breaches, would FAIL strict**
- Shipped game 120.4 MB (limit 90)
- All 10 characters 6.4 to 8.5 MB each (hero limit 2.5); each still carries a 4096 px texture
- 33 advisory notes: the 10 characters' 4K textures, 23 Poly Haven props with 1K textures inside props/

## Perf ride (tools/perf-ride.mjs)

- One command here: `npm run perf:ride` (builds, serves the build, rides 90 s at cycle speed through bazaar, chowk, school, west gali, east gali, haveli, health centre, sabzi, canal, for `?layout=old` and `?layout=new`).
- Writes docs/s7/perf/latest.json (all numbers, one sample per second) and docs/s7/perf/latest.md (plain words).
- **On the MacBook (real GPU, visible window, Chrome then Safari's engine), one command:**

```
npm run perf:ride:mac
```

- Needs once on the Mac: `npx playwright install webkit` (Safari's engine for Playwright; free). Add `CHANNEL=chrome` in front to use the installed Google Chrome instead of Playwright's Chromium.
- Options (put in front of the command): `SKIP_BUILD=1`, `LAYOUTS=new`, `SECS=60`, `NET=none` (no slow-network imitation), `QUERY=shadows=follow` (sun shadows on), `NOCHARS=1` (skip the 10 big character models on a low-memory machine), `TAG="after shadows"`.
- Route note: the rider is moved along straight lines between the places (it measures streaming and drawing, not steering), with the camera behind the rider looking down the road.
- Known limit here: this cloud machine has no GPU (software drawing) and shares 6 GB of memory with the other agents, so frame times here are not real and full rides with all 10 characters are killed for memory. The Mac run is the real number.

## Shadows by distance (src/renderer.js createShadowDistanceManager)

- Real sun shadows only within 60 m of the player: every mesh (and every chunk of the instancing helper) keeps its wish in `userData.wantsShadow`; beyond 60 m it stops casting, and starts again when the player comes back. Checked 4 times a second on a cached list (full rescan every 2 s for zones that stream in), so it costs well under 1 ms.
- Characters beyond 15 m stop casting a real shadow and get a soft round blob under the feet instead (one extra draw call for all of them, same blob look as src/contactShadows.js), up to 50 m (the character tiers hide them beyond).
- Runs by itself during rendering (a zero-cost helper object in the scene, like the LOD helper). Does nothing while the sun casts no shadow.
- Today the sun's shadows are OFF unless the page has `?shadows=follow` (src/main.js, "art director's trade-off", because shadows added 20 to 85 draw calls per view on 3 Nov). This manager is what makes turning them on affordable; the switch itself stays her call.
- `?shadowdist=0` turns the manager off, for before/after measurements.

## World growing east (?layout=new only)

- src/zoneManager.js `currentLayout()` and `worldBounds()`: one place for "how far the world reaches".
  - old (unchanged): player x -238..880, z -280..280; ground plane x/z -912..912.
  - new: player x -238..1120, z -380..380 (canal x ~824, fields to x ~1090, field band z -345..350); ground x -912..1680, z -912..912 (always more than the 500 m camera reach past where the player can stand, so the world's edge never shows).
- src/renderer.js `extendGroundForLayout()`: re-cuts the one ground plane to the new size with the same texture scale and position, so the village ground looks identical. Still one draw call. The ground's look is computed from world position, so nothing else changes.
- Height: the ground height function is flat (0) everywhere except the pond/johad/canal banks (src/dips.js), so it already covers the east; the new canal's banks belong to the canal owner.
- Sun shadow box follows the player (when shadows are on), so it already works in the east. Camera reach 500 m and the fog are unchanged: the fog hides everything well before 500 m (density 0.0044 to 0.0068 means less than 1% visible at 500 m).
- Minimap (src/minimap.js): the canal line is drawn north-south at x 824 along the field band under ?layout=new (or canal.js's own `CANAL_PATH` if it starts exporting one); old layout unchanged.
- zoneManager warns in the console if a zone is registered off the ground for the running layout.
