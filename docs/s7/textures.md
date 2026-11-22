# S7 textures agent (branch `s7-textures`)

Scope: the 4 materials docs/material-library.md records as still FAILED after the 28 Oct
board — **tin** (failed twice, "still flat"), **thatch** ("not at all clear"), **mud and
dung** ("too smooth and too uniform"), **jute** ("no weave"). Every other material named
in the original brief — terracotta tile, painted wood, rusted steel, packed earth — is
**APPROVED and FROZEN** per that same doc (28 Oct verdicts). Per CLAUDE.md 5a2 ("do not
re-tune them, do not re-review them, do not iterate them"), nothing here touches those
four; only the 4 still-failed ones were rebuilt.

**Status: first geometry pass, not yet shown to her.** Per CLAUDE.md 5a1, "anything about
how something looks goes to her, early, small, once" and "Claude does not reject work on
taste" — this is that one pass. Screenshot: `docs/s7/textures/board.png` (left to right:
tin, thatch, mud-and-dung, jute). Do not rework any of these a second time before she
sees this board.

## What changed and why (the diagnosis was already hers, 27/28 Oct)

All 4 previously read as "a flat colour texture stretched over a flat box with no
structure" because the structure that gives each material its identity was never
modelled. Each is now real geometry, not a flat face with a better texture:

- **Tin** (`buildTinRoofPanel`, `src/kit/materialsGeo.js`): a displaced plane whose
  corrugation pitch and amplitude are warped/jittered per rib (not a perfectly even
  "painted barcode"), with noise-driven dents/buckles along the sheet, vertex-colour rust
  bloom strongest at the bottom edge (and generally mottled, not a hard band), real
  fixing washers (small instanced cylinders) at the lap line, and 2+ sheets that
  genuinely step down and overlap (the shadow line is the step, not a texture trick).
  Sheen-along-the-ribs was already covered by the existing 'tin' shader family
  (`applySurfaceVariation`, `src/materials.js`) and still applies on top.
- **Thatch** (`buildThatchRoofPanel`): tapered straw-bundle instances laid in overlapping
  rows up the slope (each row covers the tie-line of the row below, as real thatching
  does), a tied ridge roll along the apex, plus a solid backing plane behind the bundles
  so there is never a see-through gap to whatever is behind the roof.
- **Mud and dung** (`buildMudDungWall`): the plaster face is a displaced plane (low-freq
  hand-smear waviness + fine trowel marks + horizontal stroke streaks baked into real
  vertex depth, not a normal map), plus a configurable count of raised, slightly domed
  dung-patty discs stuck near the base — their round, hand-shaped edge is real geometry.
- **Jute** (`buildJuteWeavePanel`): a small tileable woven patch — alternating over/under
  strands in both directions, built as real raised/sunk geometry, not a flat normal map —
  repeated across the panel. **Deliberately close-range only** (sack faces, rolled
  matting, grain-sack stacks): at awning/tarpaulin distance the weave is sub-pixel and
  would only spend triangles for nothing, so that use keeps the flat library `jute`
  material exactly as before.

## Library wiring (new, in `src/materials.js` — tagged `// S7 WIRING (textures)`)

- Added `SETS.thatch` and `SETS.dryearth` (the "mud" set) — same CC0 files already on
  disk (`public/assets/textures/thatch/`, `.../dryearth/`) and already in
  `docs/CREDITS.md`; no new files, 0 MB added. This closes the "add to SETS" note
  `housesMaterial.js` left about loading those raw itself. (`rust` was already added by
  the shops-land agent — left untouched.)
  `surfaceFamilyFor('dryearth')` → `'matte'`; both `thatch` and `dryearth` added to
  `MATTE_SETS` so `getTiledMaterial('thatch'|'dryearth', ...)` gets the existing
  matte shader variation (non-plastic roughness/mottling) automatically, same as every
  other matte set.
- All 4 geometry builders call `getTiledMaterial(...)` for their actual material (tin,
  thatch, dryearth, jute, metal for washers) — **no build script defines its own
  material values**, per CLAUDE.md 5a2.

## What the integrator / other agents need to do (I do not own these files)

**None of this is wired into any real building yet** — it's a library addition, used so
far only by the QA board. Call sites that currently do `texturedBox(w, h, d, 'tin', ...)`
or similar flat boxes for a roof, a thatch roof, a mud wall or a jute surface are
candidates to swap for the new builders; I did not touch any of them (houses, shops-land,
scenery files are owned by other agents this sprint). Known flat-tin roof call sites to
consider (found by `grep -rn "'tin'" src`, not exhaustive): `src/gullyLife.js:147,179`,
`src/mainRoadFrontage.js:190`, `src/armFrontage.js:190` (roof slabs — straightforward
swap, each already has a width/length and a position/pitch), `src/bazaar.js:240`
(awning — stays flat/cloth-like, not a roof, probably skip), `src/chaurahaEdges.js:188,283`
(small roof caps — may be too small for a full panel; judge per-site). Mud plaster:
`src/kit/housesMaterial.js`'s atlas cell 7 ("mud plaster") is flat-shaded today — the
houses agent may want `buildMudDungWall`-style displacement for close-up houses, but the
house atlas is a different (merged, one-draw-call) system, so this needs the houses
agent's own judgement, not a direct swap.

Each builder returns a `THREE.Group` sized in real metres, positioned/rotated by the
caller the same way a `texturedBox` mesh would be — see the doc comments in
`src/kit/materialsGeo.js` for each function's options (`seed` for per-instance variation,
`tint`, etc.).

## Triangle cost (measured on the QA board, SwiftShader, `renderer.info`)

- One tin panel (2.0 x 1.6 m, 1 sheet-lap) ≈ 1.1k triangles + a handful of washer
  instances (shared geometry, ~24 verts each, effectively free past the first).
- One thatch panel (1.8 x 1.6 m) ≈ 2.6k triangles (bundle instances dominate) + backing
  (32 tris) + ridge (16 tris). Budget-sensitive if used on every roof in the village —
  reserve for hero/close-camera buildings first, flat 'thatch' texture elsewhere, same
  split logic as jute.
- One mud wall (1.6 x 1.6 m) ≈ 450 triangles (6x6 grid) + 2 patties (20 tris each).
- One jute panel (1.0 x 1.4 m) ≈ 2.4k triangles (56 tiles x ~14 strand-boxes each) — this
  is why it's scoped to close-range sack/mat use, not large cloth areas.

## Verify

- `npm run build:unchecked` passes. Pre-existing budget breaches reported (characters
  over 2.5 MB hero limit, whole game 95.3 MB) are the characters agent's numbers, not
  touched by this branch — no new budget breach from this work (no new files under
  `public/assets`).
- QA board: `flock /tmp/s7-browser.lock node docs/s7/textures/shoot.mjs` → rebuilds
  `docs/s7/textures/board.png` (own harness, `docs/s7/textures/preview.html` +
  `preview.js`, same pattern as `docs/s7/shops-land/preview.html`; not part of the game
  build, `?layout` doesn't apply). I looked at the image: all 4 panels show real raised/
  recessed structure (ribs, bundle rows, plaster bumps + patties, a visible weave grid) —
  none reads as a flat colour smear anymore. Exposure in that harness is boosted
  (`toneMappingExposure = 0.85`, vs the game's 0.55) purely so the QA screenshot reads
  clearly; nothing in the real game's renderer/post-processing was touched.
- No licence/CREDITS changes needed: no new third-party files, all 3 texture sets used
  (tin, thatch, dryearth, jute, metal) already existed on disk and in
  `docs/CREDITS.md`/`tools/licence-records.json` before this branch.

## Open question for her (docs/NEEDS_YOU.md territory, not blocking)

Thatch is the weakest of the 4 on this first pass — the bundle rows read clearly as
raised structure (no longer "not at all clear" per the 28 Oct note) but are visually
denser/spikier than a real thatch roof's soft, blended look. Per "never iterate a look
more than once before showing her," I'm sending this pass as-is rather than guessing
again; her call on whether it's close enough or needs a second (bundle-softening) round
belongs in the normal material-board approval flow, not a second unsupervised attempt.
