# CLAUDE.md — Dopahar (web)

Standing instructions for Claude Code in this repo.

## 1. What this is

**Dopahar** (village: Amrai Khera) — a free web build of the village game, three.js +
Vite, vanilla JS, no framework. Runs from a link on phone and desktop browsers, deployed
to GitHub Pages. The Unity project (`../Village nostalgia`) is the future downloadable
version — **never touch it from here.** `START_HERE.md` has the folder map.

Current world: a hero zone (house/school/halwai/tea-stall — `src/village.js`,
`src/shops.js`) connected by lane to a bazaar row of 8 trade-specific shops + a chowk
(second tea stall, chabutra) + a village mandir/flower stall (`src/bazaar.js`,
`src/temple.js`) and a general store on the bazaar approach lane (`src/shops.js`); a handful of
procedural code-built trees (peepal/neem/babool, `src/trees.js`, re-added 2026-10-02
after no licensed replacement could be retrieved — see `docs/parked.md`) plus low
vegetation/ground variation (`src/vegetation.js`). A wheat/sabzi field with a dirt
track loop and fine dust motes
(`src/field.js`, `src/dust.js`); vehicles kitbashed to `Places V1/vehicles/LAYOUT.md`'s
exact measurements — walk/bike/tractor+detachable-trolley/bullock cart
(`src/vehicles.js`). The house and school each have one real walkable interior
(courtyard/rooms/stairs-to-roof; one classroom) with their own interactions (lie on the
charpai, pump water, water the tulsi, write on the blackboard, sit on a bench —
`src/interactions.js`); a `src/assetSlots.js` registry auto-loads a real `.glb` in
place of any placeholder, named per-object, once one exists (`docs/asset-slots.md`).
**Eight missions** — one continuous story, Dada's 75th birthday afternoon
(`docs/STORY.md`): M1 bring jalebi home; M2 take a tiffin to school and bring your
sister home; M3 load wheat sacks (one at a time on foot, up to 3 via the trolley) to
the kirana shop, buy something at the general store, report to Pitaji
(`src/wheatErrand.js`); M4 find the postman on his lane/bazaar cycle route for Bua's
letter; M5 collect Dada's kurta from the bazaar's darzi (tailor) unit; M6 a monkey
snatches it, a distance-triggered chase along the bazaar frontage/chowk recovers it
(`src/npcRoutines.js`'s `createWaypointRun`); M7 drive the tractor+trolley to the
mango baagh east of the field (`src/baagh.js`), knock mangoes from 3 marked trees
(a 4th tree species, `src/trees.js`'s `buildMangoTree`); M8 a staged rooftop-landing
ending scene, Dada's birthday, into the credits. All eight share one objective/
dialogue/waypoint/money UI (`src/quest.js`, `src/dialogue.js`, `src/interactions.js`,
`src/waypoint.js`) that save/continue via localStorage (`src/save.js`); a shared "buy"
interaction at every shop counter plus two signature ones (sabzi pan-balance weighing,
bangle try-on). NPCs with simple waypoint-loop/follow/one-shot-run routines
(`src/npcRoutines.js`) — the hero zone's Maa/halwai/child/teacher/sister/Pitaji, the
postman and the (usually hidden) monkey, plus the bazaar's 8 shopkeepers + 4 villagers
+ 1 seated as one shared `InstancedMesh` (`src/bazaarLife.js`). One continuous
afternoon (`src/dayline.js`) warms sun/sky/fog gradually across all eight missions,
start/end values in `docs/look-standard.md`. A title screen, pause menu with a live
quality setting and a master volume slider (`src/pause.js`, `src/quality.js`), and a
credits screen generated from `docs/CREDITS.md` (`src/credits.js`), procedural Web
Audio (`src/audio.js`, mixed/balanced, ducks under dialogue), a gradient sky +
HDRI-for-lighting-only (`src/sky.js`, `src/scene.js`). Coordinates match
`reference-from-unity/MAP.md` / `WorldData/*.json` (1 unit = 1 m) where MAP.md gives
one (bazaar/temple placements read off orthos or picked on open ground instead — see
`docs/parked.md`). **Draw-call budget: hard ceiling raised 140→150 (2026-10-20,
art director's call) to match `docs/budgets.md`'s own documented runtime target —
still enforced per-zone by `tools/world-validator.js`'s check 8a (one fixed camera
per built zone, add a new one in the same commit as any new zone), aim 120 per zone,
150 is the hard fail. 150 is not the real fix for the full MAP.md world, though: zone
streaming (only build/show zones near the player) plus distance/frustum culling and
instancing every repeated thing (animals, trees, crops, background houses, props via
`InstancedMesh`) is the actual plan for Step D's zone-by-zone build-out — see
`docs/look-standard.md`'s Budgets section and `src/mergeUtils.js` before adding new
static geometry; merge same-material meshes rather than one mesh per part, and
instance repeated NPCs/props (`src/bazaarLife.js` is the reference pattern).**

**Art pivot (2026-10-21, art director's call): code-built primitive geometry
(boxes/cylinders) for buildings reads as toys, not real structures. Tripo now makes
ONLY people, vehicles, and trees. Every building, shop, wall, road, canal/bridge, and
prop is modelled by hand in Blender instead** — `tools/blender/` (headless, installed
to `~/Applications/Blender.app`, no sudo, run via `blender -b --python <script>.py`),
one parametric Python script per asset built from `Places V1/*/LAYOUT.md`/`SCALE.md`
numbers and reference photos: real bevels, wall thickness, roof overhang, chajjas,
parapets, recessed doors/windows, CC0 PBR textures, baked vertex-colour AO, exported
`.glb` and run through `tools/shrink.js`. The OLD code-built geometry for a converted
building is kept as an invisible, un-merged, named sub-group (`<name>_old`, built via
`mergeGroupByMaterial` locally then added to the global merge's `skipNames` in
`main.js` — see `src/village.js`'s `buildHouse()` for the reference pattern) so the
world validator/collisions stay exactly as before and the piece stays independently
hideable once its real model loads through the same asset-slot system Tripo models
use. First one done: the house shell (`tools/blender/build_house.py`,
`public/assets/models/house_shell.glb`) — walls/door/roof/parapet/trim/chajja
confirmed working in-game; decorative windows were built, confirmed correct in the
exported file, but don't render in three.js for an unresolved reason and were cut for
v1 (see `docs/parked.md`). Remaining build order: school, halwai, tea stall, general
store, bazaar row (8 shops), temple complex, post office, ration shop, atta chakki,
background houses, boundary walls, lanes/kerbs/drains, canal+bridge, then props.

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
- **Language order — law, do not reverse.** English is primary, Hindi secondary,
  everywhere in the UI: objective text, interaction prompts, dialogue panel, end card,
  loading screen. English on top in the larger size, Devanagari beneath in the
  smaller size. **Signboards painted in the world are the one exception** — those stay
  Devanagari-first (larger) with English beneath, because that's how real village shop
  boards read (`src/signboards.js`, deliberately not touched by this rule).

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

## 9. Regression guard — permanent, added 2026-09-21 after a real regression

A round of playtest-bug fixes (commit 87e53bf, "vehicles sink into the ground")
looked correct in scripted screenshots but broke the tractor/trolley in real,
continuous play — a wheel-rotation "fix" that was mathematically identical to
the bug it claimed to fix, verified only by taking a single screenshot rather
than by checking the thing that actually varies over time (accumulated spin).
**One passing screenshot of one moment is not enough evidence for anything
that changes over time or distance** (rotation that accumulates, a follow
spring, a collision response) — check it across a real span of play, not one
frame.

`tools/regression-check.js` exists so this can't happen silently again. Before
any commit that touches `src/vehicles.js`, `src/main.js`, `src/collision.js`,
or anything else driving movement/physics: run
`npm run build && node tools/regression-check.js` and treat any item that was
passing in `docs/regression-baseline.json` and now fails as a regression that
must be fixed before moving on to anything else — never patch on top of a
regression, and never re-save the baseline over a real regression just to make
the script pass. Only pass `--save-baseline` after you've personally looked at
a screenshot confirming the new behaviour is actually correct.

## 10. World validator — permanent, added 2026-10-03

`tools/world-validator.js` runs the UNTOUCHED village (load, click Play, advance the
one blocking intro line, teleport/drive nothing) through 8 structural checks, and is
wired into `npm run build` (`vite build && node tools/world-validator.js` —
`npm run build:unchecked` skips it, for internal tooling only): no vehicle/trolley/NPC/
player overlaps a wall; nothing floats; nothing is buried; every wall has collider
coverage; every collider corresponds to real, visible geometry; every interaction
point and building entrance is reachable on foot by the real movement resolver (not a
straight line); no two buildings overlap; draw calls ≤140 and assets ≤40MB. It exits
non-zero on any failure, which fails `npm run build`. A lighter live version of check 1
(no vehicle/NPC/player overlaps a wall) also runs every frame in dev mode
(`devCheckPenetration()` in `src/main.js`) and logs to the browser console — the other
7 checks only run at build time.

**Every future building, prop, vehicle, or imported model must pass this validator.**
A new asset that breaks a check is not finished — fix it (or, if the check's own
definition is wrong for a documented reason, say so in your report and fix the check,
never silently loosen it to make a real problem disappear). `background_houses`
material-bucket granularity is a known, documented exception to check 7 (see the
check's own source comments) — it is not a precedent for excluding anything else.

## 11. Scratch/test scripts

Never `rm` a file you created for a one-off check (a throwaway Playwright script, a
test screenshot). Write it into `tmp/` (git-ignored) and leave it there — don't delete
it afterward.

## 12. Git

Commit on `main` with clear messages and `git push origin main` after every visible improvement (at least hourly), then check the
GitHub Actions run goes green (ship mode, 2026-10-21). Never touch `../Village nostalgia` or the reference folders (§2).

## 13. Report format — end every reply with this exact line

```
LINK: <url or 'not yet'>. YOU: <exactly what I must do, or 'nothing'>. NEXT: <what I will do next>.
```
