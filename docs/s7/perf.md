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
