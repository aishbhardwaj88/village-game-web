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

## Baseline ("before"), 21 Nov, main b5bd781, ?layout=old

**Where measured**
- This cloud machine: no GPU (software drawing), 2 CPUs, 6 GB memory shared with 4 other agents. Slow network imitation: 20 Mbit/s, 40 ms, empty cache, 960x540 window.
- Full 90 s rides could NOT finish here: the game is killed for memory 20 to 150 s after Play every time (12 attempts), even without the 10 characters. Sampled at the moment of death: page 1.6 GB, browser 1.3 GB, graphics 0.65 GB, still rising. A phone has far less than this, so the memory after Play is itself a risk worth a look on the Mac (Chrome: Window > Task Manager).
- So the "before" below = load numbers measured today + the drawing numbers from the last full record (10 Nov). The real ride baseline is one command on the MacBook (`npm run perf:ride:mac`, see Perf ride).

**Load (measured today)**

| | Budget | old layout | new layout (same as old today) |
|---|---|---|---|
| Play ready (no characters) | 4 s | 7.1 s, OVER | 7.2 s, OVER |
| Downloaded before Play (no characters) | 8 MB | 11.4 MB, OVER (11 to 16 MB over 9 tries) | 13.0 MB, OVER |
| With the 10 characters: asked for before Play | | 60 MB (52 MB of it characters) | |
| With the 10 characters: Play ready | 4 s | 12 s and 40 s in two tries | |

- The 10 character models (52 MB, 4K textures) are requested at boot, before Play (src/main.js registerCharacterSlot calls assetSlots.resolveOne straight away), and share the line with the models Play waits for. Slimming them (characters agent) and loading them only after Play are the two biggest load wins.
- Some files are fetched twice before Play (grass, ground, thatch textures: once by the index.html preload, once by the game); the second copy comes from the browser cache, counted once.

**Files (measured today, built game)**
- Shipped game 120.4 MB (budget 90); characters 6.4 to 8.5 MB each (budget 2.5 named cast, 1.5 others).

**Drawing and frames (last full record, 10 Nov, same kind of machine)**
- Hero zone: 147 draw calls, 394k triangles (budgets 150 / 450k: just inside).
- Worst game-logic frame on the 91 s ride: 32 ms (budget: none over 50; p95 12 ms not measurable without a GPU).
- Sun shadows are off by default today, so those 147 calls have no shadow pass.

Files: docs/s7/perf/baseline-2026-11-21.json (+ .md), copied to latest.json so the gate reads it.

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

## Shadows before/after

- Tool ready: `SKIP_BUILD=1 node tools/perf-shadow-check.mjs` (same views, sun shadows on, distance manager off then on; writes docs/s7/perf/shadows.json).
- Not measured yet: on this machine the page dies for memory before the first frame after Play (3 tries). To be run on the Mac, or here when the other agents are idle. Expected effect: the shadow pass only draws casters within 60 m instead of everything inside the sun's 120 x 200 m shadow box, and characters past 15 m drop out of the shadow pass entirely.

## Wiring needed (for the integrator)

1. **main.js, already done in this branch** (one import + one call, marked `S7 WIRING (perf)`): `import { initPerfS7 } from './renderer.js';` and `initPerfS7({ scene, sun, player });` right after `const player = createPlayer();`.
2. **main.js, player limits for the new layout** (lines ~220-222). Replace:

```
const GROUND_HALF_EXTENT = GROUND_SIZE / 2 - 2;
const GROUND_HALF_Z = GROUND_HALF_EXTENT + 42;
const GROUND_HALF_X = 880;
```

with:

```
import { worldBounds } from './zoneManager.js'; // (with the other imports)
const WORLD = worldBounds(); // old: x -238..880, z +-280 (unchanged); new: x -238..1120, z +-380
const GROUND_HALF_EXTENT = -WORLD.minX;
const GROUND_HALF_Z = WORLD.maxZ;
const GROUND_HALF_X = WORLD.maxX;
```

   Without this the player cannot ride past x 880 or beyond z +-280 in the new layout (the canal at 824 and the fields to 1090 are out of reach). `worldBounds()` reads `window.__dopaharLayout` if the layout loader sets it before main.js runs, else `?layout=`.
3. **package.json, build order**: `build:unchecked` is now `vite build && node tools/check-budget.js`. If the characters agent adds a slimming step to the build, it must run BEFORE `check-budget.js` (the gate measures dist/ after slimming).
4. **deploy.yml, Tue 24 Nov**: change the line marked `# S7-STRICT-FLIP` from `npm run budget` to `npm run budget:strict`.
5. **For the characters agent / owner of main.js**: load the character models after Play (or by distance), not at boot. Today they are 52 MB asked for before Play.
6. **For shops-land**: if canal.js exports `CANAL_PATH = [[x, z], ...]` the minimap draws that line in the new layout instead of the straight default at x 824.

## Commits on s7-perf
- chunked instancing helper + test + API notes
- budget gate (warn in build, strict ready)
- perf ride, distance shadows, world bounds + ground growth east, minimap canal, main.js wiring block
- ride hardening (load numbers kept when the page dies), notes, baseline
