# Look standard

The exact values behind tonight's look, so every future building/scene follows the
same system instead of re-deriving it by eye. Source of truth is the code — this is a
snapshot; if a value below and the code disagree, the code is right and this file is
stale (update it in the same commit as any change).

## Renderer / colour pipeline (`src/renderer.js`) — law, from the original setup pass

| Setting | Value |
|---|---|
| `outputColorSpace` | `THREE.SRGBColorSpace` |
| `toneMapping` | `THREE.ACESFilmicToneMapping` |
| `toneMappingExposure` | `0.55` (dropped from `1.0` — the horizon/sun clipped to flat white at 1.0; see docs/parked.md) |
| Pixel ratio cap | `1.5` |
| Shadow map | `THREE.PCFShadowMap`, one 2048 map (`PCFSoftShadowMap` was removed in this three.js version — see docs/parked.md) |
| Albedo/colour textures | `colorSpace = THREE.SRGBColorSpace` |
| Normal/roughness/AO textures | linear (no colorSpace set) |

**No `ToneMappingEffect` in the post-processing composer** — the renderer's ACES pass
above is the only tone-mapping step. Running a second one in the `postprocessing`
composer double-compresses highlights and reads as washed-out grey. See docs/parked.md.

## Sun (`src/scene.js` `createSun()`)

| Setting | Value |
|---|---|
| Colour | `0xfff1d6` (warm, ~4500K) |
| Intensity | `3.2` |
| Elevation | `20°` |
| Shadow map size | `2048×2048` |
| Shadow camera extent | ±60m, near 1 / far 200 |

## Fill light (`src/main.js`)

`THREE.HemisphereLight(0x6f96c2 /* sky */, 0x8a6a45 /* warm ground bounce */, 0.9)`.
Needed because `scene.environmentIntensity` is kept low (below) — without this,
shadow-side surfaces read near-black. See docs/parked.md for why.

## Sky and fog (`src/sky.js`, `src/scene.js`)

| Setting | Value |
|---|---|
| Sky horizon colour | `0xf6dcae` (warm pale) |
| Sky zenith colour | `0x3f6fa3` (deeper blue) |
| Sky construction | Shader gradient dome, radius 400m, `smoothstep(-0.02, 0.22, dir.y)` between horizon/zenith (tightened from `-0.05, 0.45` — the sky now holds its zenith blue by ~13° of elevation instead of ~26°), plus a sun disc (`pow(sunDot, 800) * 2.2`) and a tight glow (`pow(sunDot, 24) * 0.3`), both tinted `0xfff1d6`, plus a screen-space hash dither (±1.5/255) to break up gradient banding |
| Fog | `THREE.FogExp2`, colour = sky horizon colour, density `0.0085` |
| HDRI | Poly Haven `camdeboo_road` 1K — **lighting/IBL only** (`scene.environment`), never `scene.background` (see docs/parked.md) |
| `scene.environmentIntensity` | `0.45` — tames the HDRI's very hot sun disk in specular reflections; see docs/parked.md before raising this |

## Dayline — one continuous afternoon across all three errands (`src/dayline.js`)

Sun/sky/fog drift smoothly from the values above (bright mid-afternoon, the game's
default state at `NOT_STARTED`) toward a low golden-hour look by `ALL_COMPLETE` (end
of the third errand) — `THREE.MathUtils.damp(current, targetProgress, 0.35, dt)`
toward a target set by `dayProgressForQuestStep(quest.step)`'s fixed 0-1 point per
named quest step (front-loaded less within each errand, evenly spread across all
three — see the function's own doc comment). Never reaches full darkness — the end
state is still a lit, warm-blue-zenith sky, not night.

| | Start (`NOT_STARTED`, progress 0) | End (`ALL_COMPLETE`, progress 1) |
|---|---|---|
| Sun elevation | `20°` (law, matches `createSun()` above) | `9°` — lower, longer shadows |
| Sun colour | `0xfff1d6` (matches the sky shader's own sun tint) | `0xffb877` — warmer, more orange |
| Sky horizon colour | `0xf6dcae` | `0xe8935a` |
| Sky zenith colour | `0x3f6fa3` | `0x2a3f66` — deeper, still clearly blue, never black |
| Fog colour | = sky horizon colour (`0xf6dcae`) | = sky horizon colour (`0xe8935a`) |

## Post-processing (`src/postfx.js`, pmndrs `postprocessing`, one `EffectPass`)

| Effect | Settings |
|---|---|
| Hue/Saturation | hue `0.0`, saturation `+0.08` |
| Brightness/Contrast | brightness `+0.02`, contrast `+0.06` |
| Noise (grain) | `BlendFunction.OVERLAY`, premultiplied, opacity `0.06` |
| Vignette | offset `0.35`, darkness `0.5` |
| Bloom | non-touch devices only; intensity `0.3`, luminance threshold `0.92`, smoothing `0.15`, mipmap blur on — soft warmth on real highlights, not a haze (dropped from `0.6`/`0.8`; see docs/parked.md) |

## Texture sources and tiling (`src/materials.js`)

All CC0, ambientCG unless noted (full credits: `docs/CREDITS.md`).

| Set | Source | Resized to | Used for |
|---|---|---|---|
| `ground` | Ground109 | 1024 | Main open ground, field base |
| `lane` | Ground102 (smoother, "compressed/stamped" dirt) | 1024 | Lane + field track — deliberately a different texture from `ground`, not just a different tint, so they read as a different surface (see docs/parked.md) |
| `plaster` | PaintedPlaster017 | 1024 | Walls (house, school, halwai) |
| `concrete` | Concrete048 | 1024 | Roofs, courtyard/yard floors |
| `wood` | Planks023A | 1024 | Doors, halwai display cabinet, chairs |
| `metal` | Metal009 | 512 | School gate |
| `terracotta` | GlazedTerracotta001 | 512 | Reserved, not yet placed |
| `crop` | Grass001 | 512 | Instanced field crop rows |

`getTiledMaterial(name, {repeatX, repeatY, tint})` tiles at real-world scale — repeat =
surface metres / `tileSize` metres-per-tile. `texturedBox`/`texturedWall` default
`tileSize` is 1.5m unless overridden per call (walls use 1.5–2m depending on the
building). Ground/lane/track/field use a fixed 5m/tile via their own explicit repeat
math. **Thin (<0.5m) walls must use `texturedWall` (a plane), never `texturedBox`** —
see docs/parked.md for the rendering bug this avoids.

## Palette — LAW, fixed values (`src/village.js` `PALETTE`, 2026-09-15)

These eight hex values are the only building/wall colours in the village. No per-call
tuning "by feel" — pick from this list, or a `darken()` (×0.72) of one of these values
for a band/plinth. **Nothing in the village may be more saturated or darker than this
list.**

| Name | Hex | Use |
|---|---|---|
| Cream plaster | `#E8DCC4` | Spare / background houses |
| Pale mustard | `#DCC488` | House walls |
| Muted terracotta | `#C98E72` | Halwai walls, background houses |
| Pale teal | `#8FAFA6` | Background houses |
| Faded blue | `#A8BCCB` | Background houses |
| School pale yellow | `#EFDCA8` | School walls |
| Grey-green | `#BCBFA8` | Spare / background houses |
| Wood trim | `#8A6A4A` | Doors, window/door frames, lintels, cabinet |

**Application rules (law):**
- Tint strength is capped at **30%** (`WALL_TINT_STRENGTH` in `src/village.js`,
  `tintStrength` param on `getTiledMaterial`/`texturedBox`/`texturedWall` in
  `src/materials.js`): the material colour is `white.lerp(paletteHex, 0.3)`, never the
  raw hex applied as a full multiply — this is what keeps the plaster texture's own
  grain and colour visible instead of the wall reading as a flat painted cut-out.
- **Bands and plinths use a deeper shade of the same hue as their wall** (`darken()`,
  ×0.72) — never a different, more saturated colour. A school gets a darker
  pale-yellow band, not a blue one.
- Wood trim (`#8A6A4A`) and neutral concrete (`0xd7d2c4`, already paler/less saturated
  than every palette value, unchanged) are applied at full strength — they're small
  trim/structural elements, not the "cardboard wall" problem this palette fixes.
- Small non-architectural props (e.g. the halwai's red/green plastic chairs, per
  `Places V1/halwai/LAYOUT.md`) are outside this palette — clothing/small objects are
  where brightness belongs (art-direction 7.3), architecture is not.

Non-architectural terrain tints (lane/track/field/ground) are unaffected by this law —
they were tuned and validated separately:

| Colour | Hex | Use |
|---|---|---|
| Golden field soil | `0xc9a24f` | Field ground tint |
| Lane/track dirt | `0xb7a179` (lane), `0xa88a5e` (track) | `src/paths.js` |

**Rule for every future building:** intact, sun-faded, never cracked/exposed-brick/
damaged (art-direction 7.1b). Vary prosperity via *which* of these materials/tints a
building gets and how much detail it carries — not via wear/damage.

## Building geometry detail — law (`src/village.js`, `src/buildingKit.js`, 2026-09-15)

Every building gets, at minimum:

| Element | Spec | How |
|---|---|---|
| Wall thickness | `WALL_THICKNESS = 0.22`m (200-250mm) | Expressed as the recess depth at openings and the width of corner pilasters — buildings stay solid-box masses (not hollow shells); see docs/parked.md for why |
| Plinth | 0.3m base course, ~0.05m proud, deeper neutral cement tone (`0x8f8878`), never the wall's own hue | `BuildingKit.addPlinthRing()` / `addPlinthSegment()` — one shared instanced mesh |
| Roof overhang | 0.3m beyond the wall (within the 0.25-0.4m spec), visible edge | `texturedThickBox` (per-face UV tiling — see below), parapet where the reference shows one (house; school gets a lighter overhang lip) |
| Openings | Recessed reveal (dark, at `wallThickness` depth) + frame jambs + lintel bar, door leaf for doors | `BuildingKit.addOpening()` — reveal/trim are shared instanced meshes |
| Corner pilasters | Proud vertical strip at each corner, full wall height, wood-trim coloured (shared with frame/lintel bars) | `BuildingKit.addCornerPilasters()` |
| Small props | 2-3 per building: drainpipe, switchboard box, door step | `BuildingKit.addDrainpipe/addSwitchboard/addStep()` — each its own shared instanced mesh |
| Wall height variation | Not perfectly flat across a compound | School's 3 wings: 3.4/3.6/3.7m. House 6m, halwai 3.5m (per `Places V1/halwai/LAYOUT.md` — not varied, it's a documented exact spec). Background houses: 4/4.5/5m |

**`texturedThickBox`** (`src/materials.js`) replaces `texturedBox` for any box where one
dimension (thickness) is much smaller than the other two — roof slabs, parapets, real-
thickness walls. It bakes the correct tile count into each face's own UVs instead of
one blanket repeat for the whole box, which is what the old approach got wrong: thin
end-cap faces got the same repeat as the big faces, sampling the texture at extreme
magnification (the "flat black lane" and "blown-out wall" bugs — see docs/parked.md).
Use `texturedThickBox` for any new thin-dimension box; keep `texturedBox` for masses
where every dimension is comparable.

**`BuildingKit`** (`src/buildingKit.js`) holds the reusable instanced pieces — reused
"everywhere" per the brief: one `InstancedMesh` per piece type (trim bars, plinth
segments, reveals, drainpipes, switchboards, steps), shared across every building that
uses it, so triangle/draw-call cost stays flat regardless of how much detail is added.
Create one `BuildingKit` per group of buildings that should share it (the hero zone;
background houses use their own smaller one), call its `add*` methods while building
each structure, then `finalize(group)` once at the end.

## Mobile/touch settings (queue item 5 — phone performance pass; superseded by task 2's
quality setting)

`src/renderer.js`'s `MAX_PIXEL_RATIO`/`MAX_PIXEL_RATIO_TOUCH` and `src/scene.js`'s
`createSun(isTouch)` still set the very first frame's values (before the pause menu's
Quality setting, `src/quality.js`, applies over them a moment later), but the live
control is now the three named presets (High/Medium/Low) — see `src/quality.js`
`PRESETS` for the exact numbers. High matches the old fixed desktop defaults exactly;
default is Medium on touch / High on desktop, or whatever was last saved to
`localStorage`. Quality changes pixel ratio, shadow map size/distance, and bloom/grain
instantly, no reload (`src/main.js` `setQuality()`).

Verified (headless SwiftShader, `?dev=1`, a 390×844 3x-DPR phone viewport +
`hasTouch`/`isMobile` emulation): `renderer.getPixelRatio()` reads back `1` (not the
device's real `3`), the sun's `shadow.mapSize.width` reads back the preset's value, no
console errors walking/driving. **Caveat**: headless SwiftShader is software-rendered
and reports ~7-23 fps regardless of scene complexity (measured 20-23fps at both 390×844
and 360×800 during task 3's mobile pass) — it cannot produce a meaningful "30fps on
phone" number either way. These settings are the standard, well-understood high-impact
levers (fewer shaded pixels via pixel ratio, smaller/tighter shadow pass, fewer full-
screen post-effect passes) rather than a number measured on real hardware; re-verify on
an actual phone before relying on any fps target being met.

**Re-verified after the third errand + bazaar NPC life** (performance/mobile task,
same method, both required sizes — 390×844 and 360×800, both 3x-DPR, `hasTouch`/
`isMobile`): quality still auto-selects `medium` on touch, shadow map still reads back
`768` (the medium-touch preset), zero console errors on either size. Draw calls: 59 at
390×844, 57 at 360×800 (both well under the 120 target — lower than the ~94 desktop
number, since the mobile camera's default framing happens to have less of the scene in
frustum). Since neither draw calls nor the (unmeasurable-here) frame rate showed any
sign of trouble, no new reduction lever (shadow distance/texture size/NPC count) was
added — the existing quality presets already had enough headroom for everything this
task added. Re-verify on real hardware if a future addition pushes draw calls much
closer to 120 on touch specifically.

**Task 3 (mobile pass) fixes**, all verified via Playwright touch emulation at both
390×844 and 360×800 (`tmp/mobile_pass.mjs`):
- The dialogue panel (near-full-width, bottom:20px) overlapped the joystick on touch —
  movement was already disabled while dialogue is open, but the panel still visually
  covered it. Raised above the joystick's top edge on touch only (`body.touch-device
  #dialogue-panel`, the class is set once in `main.js` since CSS can't call
  `isTouchDevice()` itself).
- The interaction prompt's key badge hard-coded "E" in `index.html` regardless of
  device — on touch it now reads "TAP" (`src/controls.js` `_setupInteractButton()`).
- Bright-light contrast: `#objective-panel`/`#interact-hint` background opacity raised
  (0.5→0.68, 0.74→0.86), a subtle text-shadow added to their text, and the joystick's
  base/knob opacity raised (0.12/0.35→0.2/0.5) — all were legible but marginal against
  a bright sky/wall behind them.
- "Interaction button never overlapping the mount button": both are the same single
  `#interact-hint` element (mount/dismount/talk/etc. all reuse one prompt, shown
  contextually, never two at once by construction) — nothing to fix, confirmed via the
  `nearestMountable()`-before-`findNearestInteraction()` priority in `main.js`.
- No accidental scroll/zoom: already correct before this pass (`touch-action: none` +
  `overflow: hidden` on `html body`, `user-scalable=no` in the viewport meta tag) —
  confirmed with a scripted `window.scrollTo()` + `visualViewport.scale` check, both
  unchanged after the attempt.

## Budgets (enforced — see `docs/budgets.md`, `tools/check-budget.js`)

`public/assets/` under 40MB, any model under 5MB, textures 1K max (512 for small
props) — all textures are WebP as of the 13-item queue's item 6 (JPG→WebP, 54%
smaller; see `docs/CREDITS.md`). Runtime targets (`tools/screenshot.js` prints
`renderer.info`): under 400k triangles, under 150 draw calls.

**Draw-call reduction pass (2026-09-18, "task 2")**: the 13-item queue left the scene
at 149/150 with no margin for anything new. `src/mergeUtils.js` now provides two
general-purpose helpers — `mergeGroupByMaterial(group)` (merges every mesh descendant
of a group that already shares one Material into a single Mesh per material, replacing
them as new children of that group) and `mergeMeshList(meshes, name)` (same, for a flat
array of already-positioned meshes, e.g. several `buildStripSegment()` results) — both
baking each source mesh's `matrixWorld`/`matrix` into the merged geometry via
`Matrix4.applyMatrix4()` + `BufferGeometryUtils.mergeGeometries()`, the same pattern
`src/shops.js` already used. What made this apply almost everywhere: `src/materials.js`'s
`texturedBox`/`texturedThickBox`/`texturedWall`/`texturedWallBox` (and the new
`texturedFloor`) now bake **tint into a per-vertex `color` attribute** instead of the
material's own `.color`, and always request their material at a fixed `repeat=1×1` (the
real per-object repeat is baked into the UV instead) — so two objects that used to need
their own Material purely because of a different tint or size (a mustard wall vs a
terracotta wall, a 3m roof vs a 30m floor) now share ONE cached Material and can be
merged. `src/vehicles.js` mirrors this with its own `paint(roughness, metalness)` +
`pbox`/`pmesh` helpers (vehicles have no textures, just flat colours, so the "material
family" is the (roughness, metalness) pair, not a texture-set name) — every vehicle's
non-animated body parts (everything except wheels, which roll/steer independently and
can never merge) are merged per vehicle at build time. Bullocks are the one cross-object
merge: both bullocks' bodies (never animate) merge into one mesh across both animals,
while each leg (which does animate — see `_updateBullockLegs`) stays its own mesh.
Village buildings, background houses, the lane/field-track, and the school bell all use
`mergeGroupByMaterial`/`mergeMeshList` the same way — see each file for specifics.
Result: **~18.6k triangles, 87/150 draw calls, 4.72MB assets** (was 149/150) — verified
pixel-identical before/after via `tools/screenshot.js` + custom bird's-eye comparison
shots (see `docs/parked.md`), and every wheel-roll/steer/body-pitch/bullock-leg/trolley-
attach animation re-verified working after the restructure.

**Any future new geometry should default to this pattern** (bake tint/repeat into the
geometry, share one Material per real distinction, merge via `src/mergeUtils.js`), not
one mesh per part — or reuse an existing shared `BuildingKit`/instanced mesh rather than
creating a new one. `tools/screenshot.js`'s grounding check skips any mesh flagged
`userData.mergedStatic` (set by `mergeGroupByMaterial`) the same way it already skipped
`shop_roofs`/`trim`/`plinth`/etc — a merged mesh folds sub-components of one or more
objects together and is never a single "placed object" of its own.

**2026-09-19 (10-item queue) result: 111/150 draw calls, ~25.8k triangles, 4.72MB
assets** (procedural additions below have no asset-size cost). Two new rendering
techniques added this session, neither a change to the renderer/colour law above:

- **Procedural trees (`src/trees.js`)** — a canvas-generated soft-blob leaf-cluster
  alpha texture (no download), 3 intersecting cross-planes per canopy (6 single-sided
  planes, `side: THREE.FrontSide`, not `DoubleSide`), instanced per species (neem/
  peepal/mango). The canopy reads as a flat card unless each vertex's normal is
  overwritten to point away from the canopy's own centre (`applySphericalNormals()`)
  — real per-plane-flat lighting under directional sun is the actual cause, not
  z-fighting or a `DoubleSide` normal flip (both were tried and disproven first, see
  `docs/parked.md`). One InstancedMesh pair (trunk, leaves) per species.
- **Dust motes (`src/dust.js`)** — one `THREE.Points` object, canvas-generated soft-dot
  texture, `NormalBlending`, `depthWrite: false`, low opacity (0.3). Positions are
  fixed at build time across a handful of outdoor "zones" (rectangle or line-segment
  shaped) rather than following the camera/player — see `docs/parked.md` for why.
