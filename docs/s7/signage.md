# Signage agent (s7-signage)

Owns: `src/kit/wallMurals.js` (new). Branch `s7-signage`, worktree only, never pushed.

## What this is

Bare back/side walls on houses and shops (`?layout=new`) are plain painted plaster
with nothing on them — CLAUDE.md section 5b.2 calls a flat-coloured wall an automatic
fail, and section 5a says murals/painted signs are deliberate, never decoration to
skip. `src/kit/wallMurals.js` paints a small shared set of posters and folk-art murals
and places them, sparsely and deterministically, on a subset of walls.

## What's in it

One runtime canvas atlas (1792 x 2560, never shipped as a file — same approach as
`shopsSigns.js`), 4 x 4 grid of 13 designs (portrait "poster" cells, distinct from the
512x120 shop-name boards):

**Text slogans** (Hindi bold/larger on top, English smaller below, same dark paint,
per CLAUDE.md section 7's signboard rule — reuses `signPaint.js`'s `drawBilingual`
exactly as the shop boards do):
- Keep the village clean (`अपना गांव साफ रखें`) — broom icon
- Get children vaccinated (`बच्चों को टीका लगवाएं`) — water-drop icon
- Water is life (`जल ही जीवन है`)
- Plant trees, save life (`पेड़ लगाओ, जीवन बचाओ`)
- Educate every daughter (`हर बेटी को शिक्षा दें`) — book icon
- Always go to school (`स्कूल जरूर जाएं`) — pencil icon
- Small family, happy family (`छोटा परिवार सुखी परिवार`) — generic family icon
- Literacy is strength (`साक्षरता ही शक्ति है`) — book icon

**Graphic folk-art murals** (no text, generic — not copying any one temple's or
artist's exact iconography):
- Devotional motif: abstract lotus petals, an "ॐ" glyph, a diya — no deity face
- Rangoli-style medallion with a dotted border
- Cow + peacock, simple folk silhouette
- A row of hand-prints (haathe)
- A painted almanac/panchang-style calendar grid

Content checked against every hard rule: no real brands/logos, no real village names,
no alcohol/tobacco, nothing post-~2015, no real political party referenced. "Beti
bachao" and "do boond zindagi ki" were deliberately reworded (generic phrasing, not
quoting the real government scheme/campaign names) per the brief's own caution.

## How placement works

`buildWallMurals(boxes, opts)` takes a flat array of `{ x, z, ry, w, d, seed }` (one
per building — same footprint shape `sliceRect`/`shopsPlace` already use) and returns
`{ mesh, stats }`:
- For each building, a deterministic hash (seeded, never `Math.random`) picks ONE of:
  back wall (46% chance), left side (22%), right side (22%), or no mural at all (10%
  — most walls stay bare, as asked). The front wall is never used (it carries the
  shop board / house entry).
- A short wall (< 1.9 m clear run) is skipped automatically — this already screens
  out kiosks and carts, which don't need a mural.
- Per instance: random design pick, random width 0.85-1.4 m (then capped to the wall),
  random jitter along the wall (kept clear of corners), a small random vertical sill
  (0.75-1.05 m), offset 3 cm off the wall face.
- Every building's mural is merged into ONE `BufferGeometry` + ONE shared
  `MeshStandardMaterial` (`material.name = 'signboard'`, matching the existing
  signboard convention) → **one extra draw call total**, however many murals exist,
  however many buildings are passed in.
- `stats.instances` lists every placement (`cx, cy, cz, nx, nz, width, height, design`)
  for the integrator's own smoke-test or debugging.

## Wiring needed (I do not own these files — please add)

**`src/kit/houses.js`**, inside `buildHouseBatch`:
1. Add `import { buildWallMurals } from './wallMurals.js';` to the top imports.
2. Right after `group.add(batch, colliders);`:
   ```js
   const muralBoxes = entries.map((e, i) => ({
     x: e.x, z: e.z, y: e.y || 0, ry: e.ry,
     w: e.w ?? e.cw * (e.sx || 1), d: e.d ?? e.cd * (e.sz || 1),
     seed: i,
   }));
   const { mesh: muralMesh, stats: muralStats } = buildWallMurals(muralBoxes);
   if (muralMesh) group.add(muralMesh);
   ```
3. A few lines further down, right after `const stats = { ... };` is built (just
   before `return { group, batch, update, colliderBoxes, stats, houses: entries };`):
   ```js
   stats.murals = muralStats;
   ```

**`src/kit/shopsPlace.js`**:
1. Near the top, alongside `const boards = [];`, add `const muralBoxes = [];`.
2. Inside `put()`, right after the `colliders.push(...)` line, add:
   ```js
   muralBoxes.push({ x: rect.x, z: rect.z, ry: rect.ry, w: opts.colW ?? rect.width, d: opts.colD ?? rect.depth, seed: i });
   ```
3. Near the bottom, right after the shop-sign `boards` merge block (after
   `group.add(signs);` / before the `holder` collider-ride line), add:
   ```js
   const { mesh: muralMesh, stats: muralStats } = buildWallMurals(muralBoxes);
   if (muralMesh) group.add(muralMesh);
   report.murals = muralStats;
   ```
4. Add `import { buildWallMurals } from './wallMurals.js';` to the top imports.

No other shared file needs touching; `wallMurals.js` has no dependency on
`housesKit.js`/`shopsKit.js` internals, only on the plain footprint numbers both
already compute.

## Verify done

- `npm run build:unchecked` passes (ran it on this branch with the new file present
  but unwired — clean build, no new errors; the pre-existing 15 budget breaches in
  the output are all from characters/other agents' work, unrelated to this file).
- Rendered the atlas and a placed mural in an isolated three.js page (not the full
  game, since this file isn't wired into main.js yet): `docs/s7/signage/preview.png`.
  Confirmed: Hindi bold and larger, English smaller and legible underneath, both the
  same dark paint colour (section 7's fail test passes by eye); a close-up on one
  placed instance shows the poster sitting flush on a side wall, facing outward,
  right height off the ground, not floating or sunk.
- Script used (kept in `tmp/`, gitignored): `tmp/signage-shot.mjs` +
  `tmp/signage-test.html`. Rerun with
  `flock /tmp/s7-browser.lock node tmp/signage-shot.mjs` (uses its own Vite on
  port 5461) if the integrator wants to re-check after wiring it in.
- Not yet checked in the real running game (no wiring = nothing to see there yet).
  Once the integrator wires it in, a real in-game screenshot of a lane with a couple
  of bare walls now carrying posters would be the final proof — flagging this rather
  than guessing it looks right in-game.

## Look questions for the owner (one message, not iterating)

1. **Tone of the slogans** — I used generic/reworded versions of real-world village
   wall messages (cleanliness, water, trees, vaccination, girls' education, small
   family) rather than quoting exact government campaign taglines, per the brief's
   own caution about not referencing real schemes. Happy with this generic phrasing,
   or did you want the actual well-known taglines (e.g. the real "beti bachao beti
   padhao" wording) even though they name a real scheme?
2. **Poster density** — right now about 35-40% of back/side walls get one mural
   (back wall most likely, sides less so), one per building max. Want this denser,
   sparser, or is it right?
3. **The devotional motif** — a generic lotus + "ॐ" + diya, deliberately not modelled
   on any specific temple's or deity's exact iconography. Want this dropped
   altogether (to stay furthest from any religious-sensitivity risk), or is the
   generic version fine?

## Budget

Atlas is a runtime canvas (never written to `public/assets/`), so it doesn't count
against the 56 MB / 512px-prop texture budgets. Geometry cost is negligible (a
handful of triangles per instance, one shared material, one draw call total). No new
third-party font or asset pulled in (reuses the already-licensed Noto Sans Devanagari
webfont and the existing `signPaint.js`/`signAtlasHub.js`-style canvas approach), so
no new `tools/licence-records.json` / `docs/CREDITS.md` rows are needed.
