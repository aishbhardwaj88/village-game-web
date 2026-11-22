# S7 textures-wiring agent (branch `s7-textures-wiring`)

Scope: wire the teammate's real-geometry materials (`src/kit/materialsGeo.js`, written
for `docs/s7/textures.md`) into actual buildings, without blowing the draw-call or
triangle budget. Only `buildTinRoofPanel` was in scope (the only one with named call
sites in the brief). Thatch, mud-and-dung and jute are not wired anywhere yet — no
candidate call sites were named for them, so none were invented.

## What's wired

**`src/chaurahaEdges.js` only** — the 10 fixed buildings ringing the chauraha (the
central square): 7 open shops (tea, tailor, cycle, kirana x2, bangle, cloth) and 3
houses, listed once in `BUILDINGS` (never a loop). Both `box('tin', ...)` call sites
(shop roof, house verandah roof) now call a new `tinRoof(...)` helper that builds a
real `buildTinRoofPanel` group instead of a flat textured box, bakes in the same
frame transform `box()`/`tyre()` already use, and adds the group straight to `root`
(not through the per-material `mergeGeometries()` path — a multi-mesh group with
ribs, vertex-colour rust and instanced washers can't be flattened into that merge).

**Why this file, and only this file:** it's the hero, closest-camera site in the
village — every building faces the 12 m-radius square the player walks through
constantly, per the file's own doc comment ("the square is ringed by fronts"). It's
also a small, *fixed* count (10), not a loop, so the cost is knowable and bounded —
exactly the "reserve for hero/close-camera buildings first" split `docs/s7/textures.md`
itself recommends.

## What's deliberately left flat, and why

- **`src/gullyLife.js`** (lines 147, 179) — two lanes off the square, a scene placed
  roughly every 8 m (`STEP = 8`). Walked the loop: `nst = floor((laneLen - 4) / 8)` is
  about 5 and 4 stops per lane, and only `tea`/`kirana`/`cycle` scenes carry a tin
  roof, so the real count here is only ~5, not "50+". It's still left flat because
  (a) all flat 'tin' geometry in this file is already merged into **one** draw call via
  `mergeGeometries(by.get('tin'))` at the end of `build()` — swapping any of these to
  real geometry groups would each need their own mesh(es) outside that merge, trading
  1 shared draw call for several per-roof ones, for roofs seen at lane-walking
  distance, not close-camera hero distance; and (b) the chauraha wiring alone already
  uses the pass's whole "hero" budget for this sprint cleanly. Not touched.
- **`src/mainRoadFrontage.js`** (line 190) and **`src/armFrontage.js`** (line 190/194)
  — both walk all 4 chauraha arms out to 150 m, filling a shop or house roughly every
  few metres along the first ~75 m nearest the square on both sides of the road. This
  is the "50+ repeated instances along a road, at travel distance" case the brief
  itself says to leave flat (or swap a small fixed subset). Both files already merge
  every flat-tin box into one shared draw call per file via the same `by`-map +
  `mergeGeometries()` pattern as `gullyLife.js` — real panels here would multiply
  draw calls by the actual (unbounded, site-search-dependent) count of shops placed,
  which isn't known until the site search runs at play time. Left flat, none swapped.

## Library change (shared, used by every caller of `buildTinRoofPanel`)

`src/kit/materialsGeo.js`'s `buildTinRoofPanel` built one `THREE.Mesh` per sheet (2-3
per panel) plus one washer `InstancedMesh`. All sheets of one panel already share a
single cached material (`getTiledMaterial` caches by its exact param key), so they
were merged into **one** mesh per panel instead (`mergeGeometries`, cloning the cached
per-sheet geometry before baking in its position so the geometry cache other callers
share stays untouched). This cuts draw calls per panel from `sheets + 1` to `2` (one
merged-sheets mesh + one washer instanced mesh), with no visual change — same ribs,
dents, rust, overlap step, washers. This benefits every future caller of
`buildTinRoofPanel`, not just this wiring.

## Numbers

**Triangles** (measured per-panel costs from `docs/s7/textures.md`, scaled to this
file's actual panel sizes — the corrugated-sheet triangle count is
`cols * rows * 2` per sheet, `cols = max(12, round(width * 24))`,
`rows = max(6, round(sheetLength * 2.4))`, from `buildCorrugatedSheetGeometry`):
- Before: 10 flat tin boxes x 12 triangles (a `BoxGeometry`) = **120 triangles**, 1
  shared draw call (the file's merged 'tin' mesh — which no longer exists, since both
  call sites were swapped).
- After: 7 shop roofs (~4.0-4.5 m x ~3.7-3.9 m, 2 sheets each) at roughly 2.0-2.5k
  triangles each, + 3 house roofs (~5.7-6.1 m x ~6.1-6.3 m, 3 sheets each) at roughly
  4.5-5.5k triangles each ≈ **~30,000 triangles added** across the 10 hero buildings.
  Washer instances are a handful of shared ~24-vert cylinders each, effectively free.
- Against the sprint's own ceiling (450k triangles, `docs/budgets.md`/`SPRINT.md`),
  +30k at one hero site is a small fraction and should be well inside budget, but see
  "Not verified live" below — this is a calculation, not a measurement.

**Draw calls:**
- Before: these 10 roofs cost 0 *extra* draw calls (folded into the file's one shared
  'tin' merged mesh).
- After: 10 panels x 2 draw calls (1 merged-sheets mesh + 1 washer instanced mesh) =
  **+20 draw calls**, all in one file, all at one site. Against the 150 (main pass) /
  250 (with shadows) ceiling this is a real cost, not a rounding error — flagged here
  explicitly for the perf agent to confirm against a working live render, since (see
  below) this branch could not get one.

## Not verified live — environment, not this change

`npm run build:unchecked` passes clean, 0 new errors, same pre-existing breaches as
the baseline (characters, whole-game MB, before-Play MB/time — all unrelated to this
file, unchanged by it).

The in-game screenshot/render pass itself could not be completed: every attempt
(`node tools/screenshot.js`, and a leaner one-off `tmp/shoot-chauraha-roofs.mjs` that
skips the 10 character GLBs and uses a 960x600 viewport) either hit `page.screenshot:
Target crashed`, a timeout waiting for the page to settle, or a GPU stall warning
followed by a crash on this shared 2-CPU, no-GPU (SwiftShader) box — across 6
attempts in two different scripts. This is the same failure mode already on record
*before* this branch touched anything: the committed baseline
`docs/s7/perf/latest.json` ("baseline: main ... before any S7 change") shows both of
its runs marked `"crashed": "page.evaluate: Target crashed"`, and
`docs/s7/houses.md` independently notes "later boots on this shared box crashed the
browser's renderer... so it is the box, not the houses." I could not get a clean
render to confirm the roofs visually (no floating/oversized/poking-through geometry)
or to read live `renderer.info` triangle/draw-call numbers, so the numbers above are
a calculation from the measured per-panel costs in `docs/s7/textures.md`, not a
measurement. **This needs a retry on a working box before being called proven** —
flagging it rather than guessing it's fine, per CLAUDE.md 2/3.

## Recommendation for whoever retries the render

1. `flock /tmp/s7-browser.lock node tools/screenshot.js` (or the lighter
   `tmp/shoot-chauraha-roofs.mjs` left in this worktree, gitignored) on a less
   contended box.
2. Look at the chauraha south row (kirana shop + house, `x~591-597, z~41-42`) and the
   north row (tea/tailor/cycle, `x~592-601, z~-2.6`) up close — these have the new
   roofs.
3. Read `renderer.info.render.triangles` / `.calls` before/after against this
   document's estimates; if draw calls are tight elsewhere, the +20 here is the first
   place to look.

## Files touched

- `src/chaurahaEdges.js` — `tinRoof()` helper, two call sites swapped, `heroRoofs`
  array added to `root` after the merge loop.
- `src/kit/materialsGeo.js` — `buildTinRoofPanel` now merges its sheet meshes into one
  draw call (shared improvement, not chauraha-specific).
- `tmp/shoot-chauraha-roofs.mjs` — one-off render script (gitignored, not committed).
