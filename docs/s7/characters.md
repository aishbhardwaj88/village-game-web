# Characters agent: slim characters, load after Play, distance tiers (S7, 21-22 Nov)

Branch `s7-characters`. Plain-words summary first, numbers below.

## What changed, in plain words

- **Every character file now ships about 6x smaller** in the built game. The originals in `public/assets/models/` are not touched (the Tripo chat keeps adding them there at full size). A step after the build makes a slim copy of each one, under the same name, inside the built game folder. The game loads exactly the same file names.
  - Nothing is cut: every bone, every animation, blink and smile, the eye patches, glasses and lids, every material. The body shape is never simplified.
  - What is smaller: the skin picture (4096 wide becomes 2048 for the main cast, 1024 for the others, in the smaller WebP format), and the shape and animation numbers are packed tighter.
  - Each slim file is opened again and checked against the original. If anything is missing, the original ships instead and the build prints a warning.
  - New characters from the Tripo chat are slimmed automatically, with no work on its side. Any `.glb` with a skeleton counts as a character.
- **Characters no longer download before Play.** After Play the nearest ones load first, two at a time, and only those within 55 m of the camera. Anyone further away loads when you come near. Until then the old simple figure stands in their place.
- **Distance tiers**, so 30-40 people never cost more than ~12:
  - within 25 m and on screen: fully animated, blinking and smiling, at most 12 at once (nearest first)
  - 25-50 m: animation moves 12 times a second instead of every frame; no blink or smile (not visible that far)
  - off screen: animation paused
  - beyond 50 m: hidden
- **Two editions from one codebase.** The web edition uses the slim files above. The paid desktop edition can keep the original 4096 skins and see more people animated further away (see "Desktop edition switch").

## Numbers

### File size per character (light = web edition, full = desktop edition)

| Character | Main cast (2048 skin) | Original MB | Web edition MB | Desktop edition MB |
|---|---|---|---|---|
| brother | yes | 7.3 | 1.31 | 4.2 |
| dada | yes | 8.1 | 1.26 | 5.3 |
| dadi | yes | 7.0 | 1.22 | 4.5 |
| maa | yes | 7.9 | 1.22 | 4.7 |
| parlour_didi | no (1024) | 8.5 | 1.08 | 4.2 |
| pitaji | yes | 7.7 | 1.30 | 4.6 |
| postman | yes | 7.5 | 1.16 | 4.4 |
| sarpanch | yes | 7.6 | 1.14 | 4.4 |
| sister | no (1024) | 7.5 | 0.98 | 4.3 |
| teacher | yes | 6.4 | 0.99 | 3.5 |
| **All 10** | | **75.6** | **11.7** | **44.0** |

- Every web file is under its budget (1.5 MB; main cast 2.5 MB). Even the main cast at 2048 stays under 1.5 MB.
- The slim step takes ~1.2 s per character the first time (~12 s for 10, ~50 s for 40) and 0.1 s when nothing changed (it remembers finished files).

### The slim files move exactly like the originals (`node tools/char-verify.mjs`)

Measured on every clip, at 12 moments each, with the game's own three.js loader:

| Character | Clips | Bones | Bones differ by | Body outline differs by | Blink |
|---|---|---|---|---|---|
| brother | 8: idle, walk, run, gesture_jumps, punch, laugh, dance, sneaky | 65 | 0.25 mm | 0.26 mm | same |
| dada | 4: idle, walk, gesture_nod, back | 65 | 0.25 mm | 0.27 mm | same |
| dadi | 4: idle, walk, gesture_bless, nod | 65 | 0.25 mm | 0.26 mm | same |
| maa | 7: idle, walk, gesture_nod, pallu, call, bless, wipe | 65 | 0.26 mm | 0.36 mm | same |
| parlour_didi | 10: idle, walk, gesture_hair, pose, nails, hmph, earring, plait, shoulderlook, crossarms | 65 | 0.31 mm | 0.27 mm | same |
| pitaji | 4: idle, walk, gesture_nod, point | 65 | 0.25 mm | 0.21 mm | same |
| postman | 4: idle, walk, gesture_scratch, proudwave | 65 | 0.26 mm | 0.27 mm | same |
| sarpanch | 6: idle, walk, gesture_nod, twirl, raisehand, watch | 65 | 0.14 mm | 0.24 mm | same |
| sister | 7: idle, walk, run, gesture_twirl, skip, clap, shywave | 65 | 0.35 mm | 0.23 mm | same |
| teacher | 5: idle, walk, gesture_nod, greet, listen | 65 | 0.25 mm | 0.23 mm | same |

- "Same" blink: the same eyelid points move the same distance (within 0.03 mm). Smile likewise.
- A quarter of a millimetre on a 1.7 m person is far below one screen pixel.
- One thing tried and dropped: removing "unneeded" animation keys moved finger tips and the top of the head by 2-5 mm and did not make the files smaller, so it is off.

### In the browser (production build, before vs after)

PROOF_RESULTS

### Character CPU per frame (tiers on vs off)

LOD_RESULTS

## Screenshots (docs/s7/characters/)

SHOTS_LIST

## Desktop edition switch

- Slimming: `CHAR_PROFILE=full node tools/char-diet.mjs` (or `--profile full`). Keeps the original skins, only packs shape and animation (44 MB for the 10 instead of 75.6). Default is `light` (web).
- Tiers: one table, `LOD_PROFILES` in `src/characterLOD.js`.
  - light: fully animated within 25 m, max 12; reduced 25-50 m; hidden beyond 50 m; load within 55 m
  - full: fully animated within 40 m, max 24; reduced 40-90 m (20 times a second); hidden beyond 90 m; load within 95 m
  - main.js passes the edition: `initCharacterLOD({ camera, assetSlots, profile })`. For testing, `?charprofile=full` in the address.

## Tripo characters: file and first commit (for the licence check)

| File (public/assets/models/) | First commit | Last changed |
|---|---|---|
| brother.glb | 2026-11-17 (d805420) | 2026-11-21 (a3d2850) |
| dada.glb | 2026-11-17 (d805420) | 2026-11-20 (0424548) |
| dadi.glb | 2026-11-17 (d805420) | 2026-11-20 (0424548) |
| maa.glb | 2026-11-17 (d805420) | 2026-11-21 (a3d2850) |
| parlour_didi.glb | 2026-11-17 (d805420) | 2026-11-21 (a3d2850) |
| pitaji.glb | 2026-11-17 (d805420) | 2026-11-21 (a3d2850) |
| postman.glb | 2026-11-17 (d805420) | 2026-11-20 (0424548) |
| sarpanch.glb | 2026-11-17 (d805420) | 2026-11-21 (a3d2850) |
| sister.glb | 2026-11-17 (d805420) | 2026-11-21 (a3d2850) |
| teacher.glb | 2026-11-20 (de1b634) | 2026-11-21 (a3d2850) |

Command for later ones: `git log --diff-filter=A --follow --format='%ad %h' --date=short -- public/assets/models/<name>.glb | tail -1`

## Wiring needed (integrator)

1. **package.json scripts** (the slim step runs right after `vite build`, BEFORE the budget check, so the check sees the slim files):
   - `"build:unchecked": "vite build && node tools/char-diet.mjs && node tools/check-budget.js"` (perf branch currently has `vite build && node tools/check-budget.js`)
   - `"build"`: insert ` && node tools/char-diet.mjs` right after `vite build` (before world-validator / check-budget)
   - desktop build: `CHAR_PROFILE=full node tools/char-diet.mjs` after its `vite build` (or `node tools/char-diet.mjs --profile full`)
   - optional: `"char-diet": "node tools/char-diet.mjs"`, `"char-verify": "node tools/char-verify.mjs"`
   - No new packages: `@gltf-transform/*`, `meshoptimizer`, `sharp` are already devDependencies.
2. **Budget check (perf agent)**: the per-character limit (1.5 MB / 2.5 MB) must be measured on `dist/assets/models/` after the slim step, not on `public/`. The originals in `public/` stay 6-9 MB each.
3. **Edition**: when `src/edition.js` exists, change the one init line in my main.js block to `initCharacterLOD({ camera, assetSlots, profile: getQuality() })` (plus its import; `getQuality()` must return `'light'` or `'full'`).
4. deploy.yml: nothing required (the slim step takes ~12 s now, ~50 s at 40 characters, well inside 15 min). Optional speed-up: cache `node_modules/.cache/char-diet` between runs.

## Risks and notes

- **public/ budget**: the originals stay in git at 6-9 MB each. At 30-40 characters that is 200-300 MB in `public/`, far over the 90 MB "whole public/" budget, even though players only download the slim copies. Needs a decision: either count characters from `dist/` for that budget, or keep the originals outside `public/` (the Tripo chat would then push somewhere else).
- **Dev server** (`npm run dev`) still serves the full-size originals; only built games are slim.
- A new character wired by some other route than gather / NPC slots / side-job `<key>#<n>` slots must have its file name added to `CHARACTER_FILES` in `src/characterLOD.js`, or it still loads at boot (it still gets slimmed and tiered).
- Every character shares the same 65-bone skeleton naming (mixamorig*), so clips and bone lookups match across the cast; no mismatches found. Clip sets differ per person on purpose (e.g. only kids have `run`).
- Characters the camera has not come near stay as the old simple figures; on a phone, walking fast into a crowd, there can be a moment of the simple figure before the real one appears (nearest load first keeps this short).
- Off-screen characters keep their pose frozen; one walking behind you slides with a still pose for a moment if you spin round fast (the frustum margin is 1 m around the body).
- This machine has ~6-8 GB shared by all agents; the headless game runs (software graphics) were killed for memory many times. Proof runs used `--lean` (only the cast's models load; buildings keep stand-ins) and ran one at a time under `flock /tmp/s7-browser.lock`.
