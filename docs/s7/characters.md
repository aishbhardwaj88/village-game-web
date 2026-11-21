# Characters agent: packed characters, load after Play, distance tiers (S7, 21-22 Nov)

Branch `s7-characters`. Plain-words summary first, numbers below.

## What changed, in plain words

- **Your decision (22 Nov) is built in: full quality first.** By default the built game keeps every character's skin picture exactly as Tripo made it (4096, byte for byte), so faces lose nothing. The lighter web version is ready behind one switch for later.
- **Character files still ship about a third smaller**, with no visible change. The originals in `public/assets/models/` are not touched (the Tripo chat keeps adding them there). A step after the build makes a packed copy of each one, same name, inside the built game folder. The game loads exactly the same file names.
  - Nothing is cut: every bone, every animation, blink and smile, the eye patches, glasses and lids, every material, the skin pictures. The body shape is never simplified.
  - Only the shape and animation numbers are packed tighter (measured below: animation identical, body within 0.4 mm).
  - Each packed file is opened again and checked against the original. If anything is missing, the original ships instead and the build prints a warning.
  - New characters from the Tripo chat are packed automatically, with no work on its side. Any `.glb` with a skeleton counts as a character.
- **Characters no longer download before Play.** After Play the nearest ones load first, two at a time, within 90 m of the camera. Anyone further away loads when you come near. Until then the old simple figure stands in their place.
- **Distance tiers**, so 30-40 people never cost more than ~24:
  - within 40 m and on screen: fully animated, blinking and smiling, at most 24 at once (nearest first)
  - 40-80 m: animation moves 20 times a second instead of every frame; no blink or smile (not visible that far)
  - off screen: animation paused
  - beyond 80 m: hidden
  - these numbers live in ONE place, `getQuality()` in src/edition.js (desktop agent), keys charNear, charMaxFull, charFar, charMidHz, charLoadRadius
- **Web version (later, one switch):** skins 2048 for the main cast and 1024 for the rest, 12 animated within 25 m, hidden beyond 50 m. About 6x smaller files.

## Numbers

### File size per character

| Character | Original MB | Full quality (default) MB | Web version MB (skin size) |
|---|---|---|---|
| brother | 7.3 | 4.8 | 1.31 (2048) |
| dada | 8.1 | 5.7 | 1.26 (2048) |
| dadi | 7.0 | 4.9 | 1.22 (2048) |
| maa | 7.9 | 5.2 | 1.22 (2048) |
| parlour_didi | 8.5 | 4.8 | 1.08 (1024) |
| pitaji | 7.7 | 5.0 | 1.30 (2048) |
| postman | 7.5 | 4.8 | 1.16 (2048) |
| sarpanch | 7.6 | 4.9 | 1.14 (2048) |
| sister | 7.5 | 4.7 | 0.98 (1024) |
| teacher | 6.4 | 3.9 | 0.99 (2048) |
| **All 10** | **75.6** | **48.7** | **11.7** |

- Full quality: skins untouched, animation stored exactly, shading kept at full precision.
- Web version: every file under its budget (1.5 MB; main cast 2.5 MB).
- The packing takes ~0.7 s per character the first time (~7 s for 10, ~30 s for 40) and 0.2 s when nothing changed (it remembers finished files).

### The packed files move exactly like the originals (`node tools/char-verify.mjs`)

Measured on every clip, at 12 moments each, with the game's own three.js loader.

- **Full quality (default): bones differ by 0 mm in every clip of every character; body outline within 0.04-0.37 mm; blink and smile the same.** (docs/s7/characters/verify-full.json)
- Web version (table below, docs/s7/characters/verify-light.json):

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

Measured without a browser (`node tools/char-lod-bench.mjs`): the game's own animation code on the real character files, 600 frames, middle value. The browser runs on this shared machine were too starved to time anything (see Risks). Raw numbers: docs/s7/characters/lod-bench.jsonl.

| Scene | Tiers off | Tiers on | Tiers on + the small characterAnim change (Wiring needed 5) |
|---|---|---|---|
| ?gather=1: the 10 at the square, camera 6 m away | 0.52 ms | 0.46 ms | 0.51 ms |
| 40 people spread over the village (300 x 300 m), camera in the middle | 2.05 ms | 1.25 ms | 0.61 ms (light limits: 0.56 ms) |

- At the square everyone is near and on screen, so all stay fully animated: no saving there, and none expected.
- With 40 people around the village, the tiers cut the character cost by 40%, and by 70% with the characterAnim change. Of the 40 (full limits): 4-5 at reduced speed, 12 paused (behind the camera), 23-24 hidden (beyond 80 m).
- Differences under ~0.05 ms are noise (other agents share the 2 processor cores).
- Not in these numbers (drawing): hidden people are not drawn at all, no skinning and no shadow, about 4 draw calls saved per hidden person (about 90 in the 40-person scene).
- What is left (~0.5 ms for 40) is three.js updating the bone positions of everyone still in the scene graph; hidden people would have to be taken out of the scene to save that, which other code (lineup, missions) does not expect, so it is left alone.

## Screenshots (docs/s7/characters/)

SHOTS_LIST

## Edition switch (one switch for everything: `WEB_QUALITY` in src/edition.js)

- **Desktop app:** ships the untouched original character files (desktop/scripts/build-game.mjs never runs the packing step). Tiers use the `full` preset.
- **Web build today:** `WEB_QUALITY = 'full'`, so `node tools/char-diet.mjs` packs with the full profile (skins byte for byte, 76.0 -> 48.9 MB for the 10) and the tiers use `full`.
- **Web build later:** change `WEB_QUALITY` to `'light'` in src/edition.js. The packing step follows it on its own (1024/2048 WebP skins, 11.8 MB for the 10) and the tiers switch to the light limits. Nothing else to change.
- Overrides for testing: `CHAR_PROFILE=light|full node tools/char-diet.mjs` (or `--profile`); `?quality=light` in the address (edition.js); `?charlod=0` turns the tiers off.

| Preset | Fully animated | Max at once | Reduced (steps/s) | Hidden beyond | Loads within |
|---|---|---|---|---|---|
| full (in use) | 40 m | 24 | 40-80 m (20) | 80 m | 90 m |
| light (later) | 25 m | 12 | 25-50 m (12) | 50 m | 55 m |

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

1. **package.json scripts** (the packing step runs right after `vite build`, BEFORE the budget check, so the check sees the packed files):
   - `"build:unchecked": "vite build && node tools/char-diet.mjs && node tools/check-budget.js"` (perf branch currently has `vite build && node tools/check-budget.js`)
   - `"build"`: insert ` && node tools/char-diet.mjs` right after `vite build` (before world-validator / check-budget)
   - web build only; it follows `WEB_QUALITY` by itself. The desktop build does not run it (it ships the originals).
   - optional: `"char-diet": "node tools/char-diet.mjs"`, `"char-verify": "node tools/char-verify.mjs"`
   - No new packages: `@gltf-transform/*`, `meshoptimizer`, `sharp` are already devDependencies.
2. **Budget check (perf agent)**: the per-character limit (1.5 MB / 2.5 MB) is a web-version budget: measure it on `dist/assets/models/` after `CHAR_PROFILE=light` packing, not on `public/`, and not on the full build (full characters are 4-6 MB each on purpose).
3. **Edition**: done. src/characterLOD.js reads `getQuality()` itself (merged main with src/edition.js); my main.js block is unchanged.
4. deploy.yml: nothing required (the packing step takes ~7-12 s now, under a minute at 40 characters, well inside 15 min). Optional speed-up: cache `node_modules/.cache/char-diet` between runs.
5. **src/characterAnim.js** (no owner in the sprint list; three small lines, measured above): skip people the tiers have paused or hidden, and skip the neck fix and the face when nothing moved:
   - in `updateCharacterAnims`, first lines inside `for (const a of animators) {`:
     ```js
     const lod = a.root.userData.charLOD; // S7 tiers (src/characterLOD.js): off screen or far = nothing to see, skip it all
     if (lod && lod.tier >= 2) { a.first = true; continue; }
     ```
   - `if (a.neck && a.head) straightenNeck(a);` becomes `if (a.neck && a.head && (!lod || lod.stepped)) straightenNeck(a);`
   - `if (a.face.length) {` becomes `if (a.face.length && (!lod || lod.tier === 0)) {`
   - That is the whole change. `node tools/char-lod-bench.mjs --anim <changed file>` measures it.
6. Characters load after Play is already wired through my main.js block (assetSlots.register is wrapped there); nothing else to change.

## Risks and notes

- **Graphics memory with full skins (decision for her, with numbers).** A 4096 skin takes about 85 MB on the graphics card (a 2048 one about 21 MB, 1024 about 5 MB). 24 people near you at full quality = about 2 GB of graphics memory for skins alone, 40 people met in one session = about 3.4 GB (people are loaded when you come near and are not unloaded). The sprint budget is 400 MB for all textures. Fine on a gaming PC, too much for a typical laptop or Mac with shared memory. Ways out, cheapest first: (a) skins at 2048 for the desktop too (most of the face detail stays: the face is a small part of the skin picture, so this needs her eye on a close-up); (b) GPU-compressed skins (KTX2/Basis, free tools, 4096 kept at about a quarter of the memory; needs the free KTX-Software tool installed on the build machine, not present here); (c) unload people who have been far away for a while (code work in src/characterLOD.js).
- **The same person loaded twice is two copies.** In ?gather=1 Maa exists as the gather actor and as the village NPC: two downloads (the second from the browser cache) and two copies of her skin in graphics memory. Only the gather review scene does this today.

- **public/ budget**: the originals stay in git at 6-9 MB each. At 30-40 characters that is 200-300 MB in `public/`, far over the 90 MB "whole public/" budget, even though players only download the packed copies. Needs a decision: either count characters from `dist/` for that budget, or keep the originals outside `public/` (the Tripo chat would then push somewhere else).
- **Dev server** (`npm run dev`) still serves the full-size originals; only built games are packed.
- A new character wired by some other route than gather / NPC slots / side-job `<key>#<n>` slots must have its file name added to `CHARACTER_FILES` in `src/characterLOD.js`, or it still loads at boot (it still gets packed and tiered).
- Every character shares the same 65-bone skeleton naming (mixamorig*), so clips and bone lookups match across the cast; no mismatches found. Clip sets differ per person on purpose (e.g. only kids have `run`).
- Characters the camera has not come near stay as the old simple figures; on a phone, walking fast into a crowd, there can be a moment of the simple figure before the real one appears (nearest load first keeps this short).
- Off-screen characters keep their pose frozen; one walking behind you slides with a still pose for a moment if you spin round fast (the frustum margin is 1 m around the body).
- This machine has ~6-8 GB shared by all agents; the headless game runs (software graphics) were killed for memory many times. Proof runs used `--lean` (only the cast's models load; buildings keep stand-ins) and ran one at a time under `flock /tmp/s7-browser.lock`.
