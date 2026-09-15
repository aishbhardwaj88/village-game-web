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
| Sky construction | Shader gradient dome, radius 400m, `smoothstep(-0.05, 0.45, dir.y)` between horizon/zenith, plus a sun disc (`pow(sunDot, 800) * 2.2`) and a tight glow (`pow(sunDot, 24) * 0.3`), both tinted `0xfff1d6` |
| Fog | `THREE.FogExp2`, colour = sky horizon colour, density `0.0085` |
| HDRI | Poly Haven `camdeboo_road` 1K — **lighting/IBL only** (`scene.environment`), never `scene.background` (see docs/parked.md) |
| `scene.environmentIntensity` | `0.45` — tames the HDRI's very hot sun disk in specular reflections; see docs/parked.md before raising this |

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
| `ground` | Ground109 | 1024 | Main ground, lane, track, field base |
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

## Palette (hex, as used in `src/village.js` / `src/field.js`)

| Colour | Hex | Use |
|---|---|---|
| Sun-faded cream plaster | `0xe8d9b0` | House + halwai walls |
| Pale blue-white plaster | `0xdce8ef` | School walls (MAP.md "blue-and-white") |
| Painted accent band | `0x3d6fa3` | School base band |
| Wood | `0x8a6238` | Doors, cabinet |
| Neutral concrete | `0xd7d2c4` | Roofs, floors, parapets |
| Warm cement/brick plinth | `0xb08a5c` | Halwai kadhai platform |
| Golden field soil | `0xc9a24f` | Field ground tint |
| Lane/track dirt | `0xb7a179` (lane), `0xa88a5e` (track) | `src/paths.js` |

**Rule for every future building:** intact, sun-faded, never cracked/exposed-brick/
damaged (art-direction 7.1b). Vary prosperity via *which* of these materials/tints a
building gets and how much detail it carries — not via wear/damage.

## Budgets (enforced — see `docs/budgets.md`, `tools/check-budget.js`)

`public/assets/` under 40MB, any model under 5MB, textures 1K max (512 for small
props). Runtime targets (`tools/screenshot.js` prints `renderer.info`): under 400k
triangles, under 150 draw calls. As of the last item completed tonight: **24.5k
triangles, 86 draw calls** — comfortably inside budget; instance any future repeated
geometry (trees, fence posts, more crop rows) the way `src/field.js` does its crop rows.
