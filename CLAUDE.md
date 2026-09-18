# CLAUDE.md — Dopahar (web)

Standing instructions for Claude Code in this repo.

## 1. What this is

**Dopahar** (village: Amrai Khera) — a free web build of the village game, three.js +
Vite, vanilla JS, no framework. Runs from a link on phone and desktop browsers, deployed
to GitHub Pages. The Unity project (`../Village nostalgia`) is the future downloadable
version — **never touch it from here.** `START_HERE.md` has the folder map.

Current world: house/school/halwai hero zone + connecting lane (`src/village.js`),
a wheat/sabzi field with a dirt track loop (`src/field.js`), one vehicle controller with
four presets — walk/bike/tractor+trolley/bullock cart (`src/vehicles.js`), procedural
Web Audio (`src/audio.js`), a gradient sky + HDRI-for-lighting-only (`src/sky.js`,
`src/scene.js`). Coordinates match `reference-from-unity/MAP.md` /
`WorldData/*.json` (1 unit = 1 m).

## 2. Reference folders — read-only, never touched

`Places V1/`, `Characters V1/`, `Mood board/`, `reference-from-unity/` live in this
directory (gitignored — never staged, committed, imported into `public/`, or copied into
the build wholesale). **Never delete, move, or rename them.** Read from them freely;
extract individual licensed assets (e.g. one ambientCG texture zip) when a task calls for
it, same as any other CC0 source.

## 3. Look — from `reference-from-unity/docs/art-direction.md`

Full spec lives there; read it before any visual work. The load-bearing rules:

- **7.0 — target is REALISM ("GTA 6 is what you have to refer").** Grounded realism,
  mid-distance camera. Physically based rendering, real scanned CC0 textures, real
  light. Stylised is dead — do not propose it. Mesh detail is the *last* lever; lighting,
  post-processing, colour grade and photoscanned textures do the work first.
- **7.1b — ordinary and mixed, like Panchayat (Phulera).** Vary prosperity (some
  buildings two-storey and painted, some plain single-room) but never vary dignity —
  modest is swept, limewashed, cared-for, never broken, grimy, or crumbling. Worn-in is
  fine; falling apart is not. Test: would the family living there be happy to see their
  home shown this way, and would it look at home in Phulera?
- Camera stays mid-distance; faces are never a close-up subject.

## 4. Hard content rules (non-negotiable)

- No real brands, logos, or wordmarks — invent names/marks instead.
- No real village names anywhere (code, assets, filenames, commits, docs).
- No alcohol, tobacco, or intoxicants in any form, including background props.
- Era: nothing that would only exist after ~2015.
- Signboards bilingual: Devanagari larger, English beneath.

## 5. Renderer and colour — law, from step 3 of the initial build (do not change casually)

**`docs/look-standard.md` is the exact-values snapshot (sun, fog, post-processing,
texture tiling, palette) — read it before building any new scene content, and update it
in the same commit as any change to these systems.** The headline rules:

- `renderer.outputColorSpace = THREE.SRGBColorSpace`
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `toneMappingExposure = 1.0`
- Albedo/colour textures: `colorSpace = THREE.SRGBColorSpace`. Normal/roughness/AO stay
  linear (no colorSpace set).
- Pixel ratio capped at 1.5. Shadows on, one 2048 shadow map, `THREE.PCFShadowMap`
  (`PCFSoftShadowMap` was removed in this three.js version — see `docs/parked.md`).
- Post-processing (`postprocessing` npm package, one `EffectPass`): Vignette, Noise
  (subtle grain), a warm colour grade (Hue/Saturation + Brightness/Contrast), Bloom on
  non-touch devices only. **No `ToneMappingEffect` in the composer** — the renderer's
  ACES pass above is the single source of truth; duplicating it washes the image out
  (see `docs/parked.md`).
- Sky is a shader gradient dome (`src/sky.js`) — Amrai Khera is flat farmland, no
  hills/mountains in the visible background. The HDRI (Poly Haven `camdeboo_road`)
  feeds `scene.environment` (lighting/IBL) only, **never** `scene.background`.

## 6. Asset licence rule

CC0 first, CC BY second (credit in `docs/CREDITS.md`: name, source URL, licence,
author), NC never, unknown licence = not used. Poly Haven / ambientCG are the default
sources. Check an HDRI's contrast/tags before using it for a hero shot — "low contrast"
tagged HDRIs render pale; see `docs/parked.md` for a real example.

## 7. Budgets — `docs/budgets.md`, enforced by `tools/check-budget.js`

Run `npm run check-budget` before every commit that touches `public/assets`:
`public/assets/` total under 40 MB, any model under 5 MB, textures 1K max (512 for
props). Runtime targets (not hard-enforced, watch them in every screenshot run): under
400k triangles, under 150 draw calls.

Shrink new models with `node tools/shrink.js <in> <out.glb> [triangleBudget]` — dedup,
weld, simplify, resize to 1K + WebP, Meshopt-compress — before adding them to
`public/assets/models/`.

## 8. Screenshot before reporting

Run `node tools/screenshot.js` after any visual change. It starts the dev server,
loads the game headless, captures 3 preset camera angles into
`docs/shots/<timestamp>/`, and prints console errors + `renderer.info` stats. **Look at
the images. Fix anything black, flat, washed-out, or broken before reporting the work
as done** — don't rely on "it built" or "no console errors" alone.

## 9. Scratch/test scripts

Never `rm` a file you created for a one-off check (a throwaway Playwright script, a
test screenshot). Write it into `tmp/` (git-ignored) and leave it there — don't delete
it afterward.

## 10. Git

Commit on `main` with clear messages. **Never push** — the user pushes manually via
GitHub Desktop. Never touch `../Village nostalgia` or the reference folders (§2).

## 11. Report format — end every reply with this exact line

```
LINK: <url or 'not yet'>. YOU: <exactly what I must do, or 'nothing'>. NEXT: <what I will do next>.
```
