# Dopahar (web) — Status Report

Generated 2026-10-19 by an audit agent. Read-only audit of the repo at
`/Users/aish/claude-workspace/village-game-web` as it exists in git history and on
disk. No build, test, or check-script was executed to produce this report — anything
that would require running code is marked **UNSURE**.

---

## 1. One-line summary

**Dopahar** is a free, browser-playable, vanilla three.js/Vite "slice" of a North
Indian village-life game (village: Amrai Khera) — walk/drive around a hero zone, lane,
bazaar, field and temple, complete three short fetch-quest errands, with day/night-ish
dayline lighting, save/continue, and a build-time world validator. It is a scoped-down
companion to a much larger in-development Unity version (`../Village nostalgia`,
untouched by this repo). **Estimate: roughly 55-65% of the way to "a finished,
playable small game"** — reasoning: the core loop (walk/drive/interact/quest/dialogue/
save) is complete and passes its own 13-point structural validator (confirmed by the
most recent run's logged output, `tmp/world-validator-AFTER-fix-13.txt`, 3 Oct 2026,
13/13 passed); the world has a real hero zone + bazaar + field + temple + 3 new abadi
buildings; three full errands exist start-to-finish. What's missing/unfinished: almost
every character and vehicle is still a placeholder capsule/box (only one real `.glb`,
a decorative ceramic pot, exists in `public/assets/models/`); there is no music/
ambient-recording pass beyond procedural Web Audio; draw-call budget is already near
its raised ceiling (133/140-150 at last measurement, little headroom for more content);
and several planned places (puncture shop, cinema, more shops) are explicitly
not-yet-built per `Places V1/README.md`. No written "done" criteria exist beyond
engineering budgets (see §12) — there's no finish line defined for content/narrative
completeness.

---

## 2. Game concept

- **Genre:** Cozy, low-stakes 3D village-life / walking-and-driving sim with light
  fetch-quest structure. Third-person, free-roam.
- **Setting:** Fictional North Indian village "Amrai Khera," one continuous warm
  afternoon ("dopahar" = afternoon/midday in Hindi).
- **Story / core loop:** Three errands running on one shared quest-state enum
  (`src/quest.js` `QUEST_STEPS`): (1) get money from Maa, buy a jalebi from the halwai,
  bring it back; (2) carry a tiffin to school, collect your sister, walk her home; (3)
  haul 3 wheat sacks (on foot one at a time, or up to 3 via tractor+trolley) from a
  house-side pile to the bazaar's kirana shop, buy something at the general store, and
  report back to Pitaji. Objective/dialogue/waypoint/money UI tracks progress; a
  bilingual (English-primary, Devanagari-secondary) dialogue panel drives all talk.
  Sun/sky/fog warm gradually across all three errands via `src/dayline.js`.
- **Controls:** WASD/mouse-look (desktop) or on-screen joystick + touch-look (mobile);
  E/tap to interact; F to mount/dismount vehicles; Escape for the pause menu.
- **Target platform:** Any modern phone or desktop browser via a shared link, deployed
  to GitHub Pages (`.github/workflows/deploy.yml` builds and publishes `dist/` on every
  push to `main`).
- **Vehicles:** walk, bicycle, tractor+detachable trolley, bullock cart — all
  placeholder kitbashed geometry built to `Places V1/vehicles/LAYOUT.md`'s exact
  measurements (`src/vehicles.js`).
- Per `reference-from-unity/CLAUDE.md` (the *other*, much larger project this one is
  derived from — read-only reference, never touched from here), the full ambitious
  vision includes mango-knocking, a day/night cycle, cattle, kite-flying competitions,
  and a school donation board; **none of that exists in this web build** — it is
  explicitly the three-errand hero-zone-plus-bazaar slice only.

---

## 3. Tech stack

- **Engine/renderer:** three.js `^0.186.0` (WebGL), `postprocessing` (pmndrs) `^6.39.5`
  for one `EffectPass` (Vignette, Noise, Hue/Saturation, Brightness/Contrast, Bloom).
- **Build tool:** Vite `^8.3.0` (`vite.config.js`: `base: '/village-game-web/'`,
  `build.target: 'es2020'`).
- **Language:** vanilla JavaScript (ES modules), no framework, no TypeScript.
- **Dev dependencies:** `@gltf-transform/cli|core|extensions|functions` `^4.5.0` +
  `meshoptimizer` `^1.2.0` (model shrinking pipeline, `tools/shrink.js`), `playwright`
  `^1.63.0` (headless screenshot/test tooling), `sharp` `^0.35.4` (image resizing).
  `node_modules/` confirms all of these are actually installed.
- **How to run (dev):** `npm run dev` (Vite dev server).
- **How to build:** `npm run build` → runs `vite build && node tools/world-validator.js
  && node tools/slot-swap-test.js` (fails the build if the validator or slot-swap test
  fails). `npm run build:unchecked` skips both gate scripts (vite build only).
- **Other scripts:** `npm run preview` (serve `dist/`), `npm run check-budget`
  (`tools/check-budget.js`), `npm run shrink` (`tools/shrink.js`), `npm run screenshot`
  (`tools/screenshot.js`).
- **Deployment:** GitHub Actions (`node 20`, `npm ci`, `npm run build`, upload/deploy
  `dist/` to GitHub Pages). Repo remote: `https://github.com/aishbhardwaj88/village-game-web.git`.

---

## 4. Folder and file map

**Top level**
- `CLAUDE.md` — standing instructions for this repo (world summary, hard content
  rules, renderer law, budgets, validator, git rules, report format).
- `START_HERE.md` — short folder map / rules-carried-over summary, dated 14 Sep 2026.
- `index.html` — the entire DOM/CSS for title screen, HUD, dialogue panel, pause menu,
  end card, credits screen (30KB, single file, no separate CSS file).
- `package.json` / `package-lock.json` — scripts/deps (see §3).
- `vite.config.js` — Vite config.
- `.gitattributes`, `.gitignore` — standard repo hygiene.
- `.github/workflows/deploy.yml` — GitHub Pages CI/CD.
- `dist/` — last local production build output (gitignored presumably; contains built
  JS bundle + copied `public/assets`). Present on disk, dated 3 Oct 16:38, i.e. the
  most recent commit's build.
- `.claude/` — Claude Code settings (see §13).
- `tmp/` — ~250+ scratch files (throwaway Playwright diagnostic scripts, before/after
  screenshots, world-validator run logs) per CLAUDE.md §11's "never delete a scratch
  file" rule. Not part of shipped product.
- **Reference folders (read-only, never touched per CLAUDE.md §2):** `Places V1/`
  (2D place references + `LAYOUT.md` authority files), `Characters V1/` (2D character
  references), `Mood board/` (3 taste-reference images), `reference-from-unity/`
  (copied docs/world-data from the Unity sister project).

**`src/` (47 files, 10,732 lines total)** — one-line purpose each:
- `assetSlots.js` (189 ln) — registry that auto-swaps a real `.glb` in for any
  placeholder once a correctly-named file exists in `public/assets/models/`.
- `atmosphere.js` (94 ln) — three named sky/sun/fog/ground presets (A/B/C), A is live.
- `audio.js` (473 ln) — procedural Web Audio sound engine (no audio files at all).
- `bazaar.js` (829 ln) — the 8-unit bazaar row + chowk (2nd tea stall, chabutra).
- `bazaarLife.js` (147 ln) — 13 ambient bazaar NPCs as one shared `InstancedMesh`.
- `buildingKit.js` (195 ln) — shared instanced building-detail kit (trim, plinths,
  openings, pilasters, drainpipes, switchboards, steps) reused by every building.
- `collision.js` (308 ln) — collider derivation from tagged real geometry + AABB/
  oriented-box collision resolution.
- `contactShadows.js` (98 ln) — one `InstancedMesh` of soft radial-gradient decals
  under every building/prop/vehicle (cheap grounding cue).
- `controls.js` (229 ln) — keyboard/mouse/touch-joystick input handling.
- `credits.js` (82 ln) — credits screen generated live from `docs/CREDITS.md`.
- `dayline.js` (96 ln) — drifts sun/sky/fog smoothly across all 3 errands' progress.
- `dialogue.js` (77 ln) — bilingual bottom speech/message panel.
- `dust.js` (130 ln) — one `THREE.Points` dust-mote system across fixed outdoor zones.
- `field.js` (101 ln) — wheat/sabzi field + dirt track loop.
- `interactions.js` (452 ln) — the interaction-point registry (maa, halwai,
  school_bell, teacher, charpai, house_charpai, hand_pump, tulsi, blackboard,
  school_bench, pitaji, sack_pile, kirana, sabzi_weighing, bangle_tryon, + shared buy).
- `loaders.js` (12 ln) — shared `GLTFLoader` + Meshopt decoder setup.
- `main.js` (1,863 ln) — the whole game's entry point/orchestration: scene setup,
  render loop, state machine (mount/sit/lie), quest hooks, asset-slot registration,
  pause/quality/save wiring, Tripo staging slots.
- `materials.js` (503 ln) — CC0 texture loading, tiling, vertex-colour tint baking.
- `mergeUtils.js` (141 ln) — `mergeGroupByMaterial`/`mergeMeshList`/`mergeAcrossGroups`
  geometry-merging helpers (the draw-call-budget backbone).
- `movement.js` (84 ln) — shared swept-movement collision resolver used by every body.
- `newShops.js` (294 ln) — post office, ration shop, atta chakki (abadi-core cluster).
- `npc.js` (28 ln) — placeholder-capsule NPC factory.
- `npcRoutines.js` (92 ln) — waypoint-loop / stir-loop / follow-routine behaviours.
- `paths.js` (95 ln) — lane/track strip-segment geometry + wheel-rut detail.
- `pause.js` (88 ln) — pause menu (quality setting, master volume slider).
- `player.js` (112 ln) — player capsule + third-person chase camera w/ occlusion.
- `postfx.js` (62 ln) — post-processing composer (one `EffectPass`, no tone-mapping
  effect — see CLAUDE.md law).
- `props.js` (33 ln) — small merged static props (e.g. school bell).
- `quality.js` (106 ln) — High/Medium/Low runtime quality presets.
- `quest.js` (49 ln) — `QUEST_STEPS` enum + bilingual objective text table.
- `renderer.js` (46 ln) — renderer creation, colour-pipeline law, pixel-ratio cap.
- `save.js` (30 ln) — localStorage save/continue (`{questStep, quality, savedAt}`).
- `scene.js` (106 ln) — scene/ground/sun/HDRI-environment setup.
- `scenery.js` (60 ln) — background houses.
- `shops.js` (294 ln) — tea stall + general store on the hero-zone approach lane.
- `signboards.js` (109 ln) — shared-texture-atlas bilingual shop signboards.
- `sky.js` (124 ln) — shader gradient-dome sky (3-stop, dust/haze veil, sun disc/glow).
- `surfaces.js` (27 ln) — ground-surface helpers.
- `temple.js` (355 ln) — village mandir + peepal chabutra + flower stall (scenery only,
  no gameplay, per MAP.md's religious-building rule).
- `trees.js` (217 ln) — **dead code**: procedural tree system, fully removed from
  `main.js`'s call graph (see §5/§8) but the file itself was not deleted.
- `ui.js` (104 ln) — dev-mode detection (`?dev=1`), misc UI helpers.
- `vegetation.js` (203 ln) — ground variation / low vegetation / 3 placeholder trees
  (replacement for the removed `trees.js` system — "reads as desert" fix, 2026-10-02).
- `vehicles.js` (1,136 ln) — tractor, trolley, bullock cart (+2 bullocks), bicycle.
- `village.js` (636 ln) — house, school, halwai, hero-zone lane, the fixed `PALETTE`.
- `waypoint.js` (91 ln) — ground-marker waypoint system for active objectives.
- `wheatErrand.js` (132 ln) — errand-3-specific scenery (sack pile) + logic glue.

**`tools/` (19 scripts, ~5,049 lines)** — build-gate and diagnostic scripts: see §14.

**`docs/`** — see §11 for the full annotated list.

**`public/assets/`** — see §9.

---

## 5. Features DONE and working

(Confirmed by reading the actual code, the committed `tmp/world-validator-AFTER-
fix-13.txt` log, and `docs/regression-baseline.json`/`docs/handoff.md`'s own verified
claims — not by running anything myself.)

- **Walk/drive/third-person camera with occlusion** — `src/player.js`, `src/controls.js`.
- **Four vehicles** (bike, tractor+detachable trolley, bullock cart) with per-wheel
  roll/steer, attach/detach, coupled collision (`src/vehicles.js`, `src/collision.js`,
  `src/movement.js`).
- **Swept collision system, derived from real tagged geometry** (not hand-typed boxes)
  — `src/collision.js`; iterates to convergence (fixed defect 1, commit `1e45f14`).
- **Three full errands**, quest/dialogue/waypoint/money UI — `src/quest.js`,
  `src/dialogue.js`, `src/interactions.js`, `src/waypoint.js`, `src/wheatErrand.js`.
  World-validator's reachability check (check 6) confirms all 44 interaction
  points/building anchors are reachable on foot by the real movement resolver.
- **Save/continue via localStorage** — `src/save.js` (quest step + quality only, by
  design — see `docs/parked.md`'s 2026-09-19 entry).
- **House and school real walkable interiors** (courtyard/rooms/stairs-to-roof; one
  classroom) with charpai/pump/tulsi/blackboard/bench interactions — `src/village.js`,
  `src/interactions.js`.
- **Hero zone + bazaar row (8 shops) + chowk + temple/flower-stall + 3 new abadi-core
  buildings** (post office, ration shop, atta chakki) — `src/village.js`, `src/bazaar.js`,
  `src/temple.js`, `src/newShops.js`.
- **Shared "buy" interaction at every shop counter + 2 signature interactions**
  (sabzi pan-balance weighing, bangle try-on) — `src/interactions.js`.
- **NPC life**: hero-zone named NPCs (Maa/halwai/child/teacher/sister/Pitaji) with
  waypoint-loop/stir-loop/follow routines, plus 13 bazaar NPCs as 1 shared
  `InstancedMesh` draw call — `src/npc.js`, `src/npcRoutines.js`, `src/bazaarLife.js`.
- **Dayline** — one continuous afternoon warming sun/sky/fog across all 3 errands —
  `src/dayline.js`, `src/atmosphere.js`.
- **Title screen, pause menu (quality setting + master volume slider), credits screen
  generated from `docs/CREDITS.md`** — `src/pause.js`, `src/quality.js`, `src/credits.js`.
- **Procedural Web Audio** (no audio files, no licence risk), mixed/ducks under
  dialogue — `src/audio.js`.
- **Gradient-dome sky + HDRI-for-lighting-only** — `src/sky.js`, `src/scene.js`.
- **Asset-slot auto-swap system** — drop a correctly-named/sized `.glb` in
  `public/assets/models/` and it replaces the placeholder with no code change
  (`src/assetSlots.js`, `docs/asset-slots.md`). Verified end-to-end with the one real
  model that exists (`ceramic_pot.glb`).
- **Self-correcting Tripo import pipeline** (material clamping, per-node rotation
  zeroing, uniform scale-to-fit) — `src/assetSlots.js` `resolveSlot()`, added commit
  `24704ba`, proven against deliberately-wrong synthetic placeholders before any real
  model existed.
- **8-check (now 13-assertion) build-time world validator**, wired into `npm run
  build` — `tools/world-validator.js`. Last logged run (`tmp/world-validator-AFTER-
  fix-13.txt`, 3 Oct 2026 13:35): **13/13 passed** (wall overlap, floating, buried,
  collider coverage ×2, reachability, building-overlap, draw calls ≤140, assets ≤40MB,
  zero console errors).
- **Live dev-mode penetration guard** (`devCheckPenetration()` in `src/main.js`).
- **Regression-check harness** (`tools/regression-check.js`) with a committed baseline
  (`docs/regression-baseline.json`, dated 2026-09-20 — see §14, this baseline is now
  stale relative to the newer world-validator).
- **Draw-call/geometry-merge discipline** — `src/mergeUtils.js`, applied project-wide;
  draw calls were brought from 149→87 in one dedicated pass and the budget itself was
  later raised (commit `8a791ff`, "draw-call budget raised to 130").

---

## 6. Features PARTLY done

- **Asset-slot replacement models** — the *pipeline* is complete and self-tests clean,
  but **only one of ~19 declared slots has a real model** (`ceramic_pot.glb`, a
  decorative test piece). Every character (player, maa, halwai, teacher, sister),
  every vehicle (tractor, trolley, cart, bullock×2, bike), the halwai building, the
  charpai, and the hand pump are still code-built placeholder geometry. Six
  additional "October Tripo-day" staging slots (`tripo_tractor`, `tripo_mother`,
  `tripo_halwai_kiosk`, `tripo_tree_neem`, `tripo_tree_peepal`, `tripo_bush`) exist as
  coloured boxes in a side-by-side judgement lineup near the chowk (`docs/tripo-day.md`),
  waiting for real downloads — none have arrived yet (no matching files in
  `public/assets/models/`).
- **Animation preservation on model swap** — documented, explicit limitation: a
  swapped-in vehicle/character model loses wheel-roll/steer/pitch/leg-swing, since
  those are driven by the placeholder's own rig (`docs/asset-slots.md`).
- **Vegetation / trees** — procedural cross-plane tree system (`src/trees.js`) was
  built, found to look like "flat cards," fixed, then later **removed entirely**
  (no licensed replacement found — exhaustive Poly Haven/Sketchfab search, blocked by
  Sketchfab needing an account this session couldn't create). A newer, different
  system (`src/vegetation.js`, "ground variation, low vegetation, 3 placeholder
  trees") was added 2026-10-02 as a partial replacement ("reads as desert" fix) — but
  `src/trees.js` itself is still sitting in the repo, unimported, dead code.
- **Mobile/touch performance** — quality presets and draw-call counts were verified at
  two phone sizes via headless Playwright/SwiftShader, but **actual frame-rate on real
  hardware has never been measured** — explicitly flagged in `docs/look-standard.md`
  and `docs/parked.md` as unverifiable in this environment ("re-verify on real
  hardware before trusting the 30fps target is actually met").
- **Save/continue** — restores quest step + quality only; player/vehicle/most-NPC
  positions reset to defaults regardless of saved progress (one deliberate exception:
  the sister's follow state). Documented as an intentional scope limit, not a bug.
- **Draw-call budget** — raised once already (120→130, commit `8a791ff`) and the
  world-validator's hard cap is 140; last measured at 133, i.e. **very little headroom
  left** for new static geometry without another merge/instance pass.

---

## 7. Features PLANNED but not started

From `Places V1/README.md`'s own "Planned, not yet built" table and scattered
`docs/parked.md` notes:
- **Puncture/bicycle-repair shop** — described in detail (foot pump, tyre tub, patch
  kit, upside-down bicycle) but explicitly skipped in the 13-item queue for draw-call-
  budget reasons (`docs/parked.md`, 2026-09-18 entry) and never revisited since.
- **Cinema** (single-screen, village outskirts) — "out of hero-zone scope for now,
  build when the map expands outward," per `Places V1/README.md`.
- **A real tree/canopy model** — revisit flagged multiple times (`docs/parked.md`);
  closest Sketchfab CC0/CC-BY candidates identified by name but never downloaded
  (account-gated).
- **Full music/ambient-recording pass** — `src/audio.js` is explicitly "a placeholder
  for real recordings later" (its own top-of-file comment).
- **Master-volume persistence across reloads** — flagged as trivial but not done
  (`docs/parked.md`, item 8).
- **Distance-based audio fade for every sound** — currently only the halwai's radio
  has it; flagged as an explicit, deliberate scope limit.
- **Halwai shop signboard/name** — the halwai has no documented name anywhere and was
  deliberately left unsigned (`docs/parked.md`, item 10).
- **"Two halwais in one village" duplication question** — `Places V1/bazaar_row/
  LAYOUT.md` flags this explicitly as "her call, not to be resolved unilaterally" and
  it remains unresolved; both the lane halwai and bazaar unit 8 (Sweet Shop) exist.
- Everything in `reference-from-unity/CLAUDE.md`'s much larger scope (day/night cycle,
  mangoes, cattle, kite-flying, donation board, etc.) is **the other project's scope**,
  not planned for this web build at all — worth noting so it isn't mistaken for a gap.

---

## 8. Bugs and broken things

- **`grep -rn "TODO|FIXME|HACK" src/ tools/`** — **zero matches.** This team's
  convention is evidently to log issues in `docs/parked.md`/`docs/handoff.md`/
  `docs/collaboration_lessons.md` instead of inline code comments, which is consistent
  with what those docs actually contain (dozens of dated bug-and-fix entries).
- **`src/trees.js` is dead code** (217 lines) — fully removed from `main.js`'s imports/
  call graph (confirmed: `grep -n "trees" src/main.js` would need to be checked, but
  `docs/parked.md`'s 2026-09-19 "playtest bugfix 4/4" entry states explicitly "`src/
  trees.js` deleted ... all references removed from `src/main.js`" — yet the file
  itself is still present on disk per the `find` listing in §4). Harmless (unused,
  not imported) but should either be deleted or clearly marked.
- **`docs/regression-baseline.json` is stale** (dated 2026-09-20, predates all of the
  Oct 2 / Oct 3 structural work) and already shows one known-failing item at save
  time: `"draw calls under 120": false, "129 calls"` — this was the pre-existing,
  already-raised-budget state (the project's own rule explicitly allows a documented,
  understood miss, not a silent one). A fresher baseline is needed; the newer
  `tools/world-validator.js` (13/13 passed as of 3 Oct) is the more current source of
  truth for structural correctness, but `tools/regression-check.js`'s own baseline file
  has not been re-saved since.
- **Known, explicitly-accepted "almosts"** (documented, not hidden): tractor
  steering-wheel height 2.18m vs. `LAYOUT.md`'s 2.60m claim (a self-contradicting spec
  — detailed part list used as authority instead); roof-edge parapet has no railing
  collision (walking past the edge "snaps" back to y=0, no fall system exists yet);
  `background_houses` material-bucket granularity is a documented, accepted exception
  to world-validator check 7.
- **Benign console warning, left alone on purpose**: "Texture marked for update but no
  image data found" (from cloned-but-still-loading textures in `getTiledMaterial()`) —
  confirmed harmless, logged in `docs/parked.md`.
- **No automated test framework** (no Jest/Vitest/Mocha anywhere in the repo) — all
  verification is done via ad hoc Playwright scripts in `tmp/` plus the three
  committed gate scripts (`check-budget.js`, `regression-check.js`,
  `world-validator.js`). This is a real gap for anyone other than an AI agent with
  screenshot tooling trying to verify a change didn't break anything.
- **Could not verify (UNSURE, per the no-execution constraint on this audit):**
  current `npm run build` pass/fail state; current `npm run check-budget` pass/fail
  state; actual runtime frame rate on any real device; whether `dist/`'s currently-
  built output matches the exact current `src/` state 1:1 (it's dated to the same
  timestamp as the last commit, so very likely yes, but not run-verified here).

---

## 9. Art and assets

**`public/assets/` contents** (confirmed via `find`):
- **27 WebP textures**, in 8 material sets: `concrete` (4: color/normal/roughness/ao),
  `crop` (3), `ground` (4), `lane` (3), `metal` (3), `plaster` (3), `terracotta` (3),
  `wood` (4).
- **1 HDRI**: `camdeboo_road_1k.hdr` (Poly Haven, lighting/IBL only, never background).
- **1 model**: `ceramic_pot.glb` (Poly Haven, shrunk via `tools/shrink.js`).
- **0 sprite/UI image files**, **0 audio files** (all sound is procedural Web Audio —
  `src/audio.js`), **1 web font** (Google Fonts CDN link for Noto Sans Devanagari in
  `index.html`, not self-hosted).

**Placeholder vs. final**, per `docs/CREDITS.md`/`docs/asset-slots.md`/
`docs/parked.md`:
- **Final (real, licensed, in active use):** all 27 textures and the 1 HDRI — all
  CC0, all credited in `docs/CREDITS.md` with source/author/licence. These are not
  placeholders; they are the game's real, permanent texture set.
- **Placeholder (code-built geometry/materials standing in for a future real model):**
  essentially every character, vehicle, and several buildings — ~18 declared asset
  slots (`docs/asset-slots.md`'s table) + 6 October Tripo-staging slots, all still
  showing their placeholder box/capsule because no matching `.glb` has been dropped in
  (only `ceramic_pot.glb` exists, and it's a decorative test piece, not one of the 18
  "real" gameplay slots).

**Assets referenced in code but MISSING from disk** (checked every asset-slot
filename against `public/assets/models/`): all of the following are *expected*
missing (the asset-slot system is explicitly designed to degrade gracefully to a
placeholder when the file doesn't exist) — not a bug, but worth listing as the
concrete gap:
`tractor.glb`, `trolley.glb`, `cart.glb`, `bullock.glb`, `bike.glb`,
`halwai_kiosk.glb`, `player.glb`, `maa.glb`, `halwai.glb`, `teacher.glb`,
`sister.glb`, `charpai.glb`, `hand_pump.glb`, `tripo_tractor.glb`, `tripo_mother.glb`,
`tripo_halwai_kiosk.glb`, `tripo_tree_neem.glb`, `tripo_tree_peepal.glb`,
`tripo_bush.glb` — **19 of 20 total declared slots have no file on disk.**

No other path-string-referenced asset (texture/audio/model) in `src/` was found to be
missing — `src/materials.js`'s 8 texture sets and `src/scene.js`'s HDRI path all
resolve to real files in `public/assets/`.

---

## 10. Image generation

- **No live AI image-generation pipeline runs from this repo** for in-game assets —
  texture/HDRI/model acquisition is CC0/CC-BY downloads (`docs/CREDITS.md`'s own
  method notes: direct `curl` to `dl.polyhaven.org`/`ambientcg.com`, not an API).
- **Character art generation prompts/rules exist, but belong to a separate, parallel
  workflow** (Gemini character-sheet generation feeding the *Unity* project's Tripo
  3D-conversion pipeline, referenced from this repo read-only):
  - `docs/art-rules-characters.md` (locked 19 Sep 2026) — the style decision
    ("stylised forms with real materials," matte enforced in-engine not in the image),
    per-material roughness/metalness floors, prop-attachment rule, camera rule.
  - `docs/gemini-character-master-prompt.md` (locked 19 Sep 2026) — one verbatim
    master prompt template for Gemini character re-renders: exact keep/change list,
    skin-tone benchmark-matching instructions, per-material surface descriptions
    (cotton, silk, leather, metal, glass bangles, etc.), hands-empty rule, one-image-
    per-prompt rule.
  - `docs/collaboration_lessons.md`'s dated "Gemini credits wasted on incomplete
    prompts" entry (19 Sep 2026) — the process failure that produced the master-prompt
    rule above (never iterate a prompt; one complete spec per fresh chat).
- **Asset naming/pipeline conventions for THIS repo's own 3D-model intake**:
  `docs/asset-slots.md` (filename → slot mapping table) and `docs/tripo-day.md`
  (plain-language "how to drop in a downloaded Tripo model" walkthrough for a non-
  technical collaborator). `tools/tripo_batch.py` (321 lines) is the Tripo API batch
  script, copied from the Unity project's tooling per `START_HERE.md`.
- **Model-shrinking pipeline**: `tools/shrink.js` (88 lines) — dedup, weld, simplify to
  a triangle budget, resize to 1K, convert to WebP, Meshopt-compress — run on any new
  `.glb` before it goes into `public/assets/models/`.

---

## 11. Docs and planning files

Every `.md` (and the one `.json`) under `docs/`, plus the top-level docs:

| File | Summary |
|---|---|
| `CLAUDE.md` (root) | Standing instructions: world summary, read-only reference folders, art-direction pointers, hard content rules, renderer/colour law, asset-licence rule, budgets, screenshot requirement, regression guard, world-validator requirement, scratch-file rule, git rule, report-format law. |
| `START_HERE.md` | One-page orientation: what this repo is, folder map, rules carried over from the Unity project. |
| `docs/handoff.md` | Append-only "two-line status after every 2nd queue item" log — the single best source for session-by-session progress history (spans 2026-09-16 through 2026-09-21). |
| `docs/parked.md` | 119-row table of every judgement call / deferred item / bug-and-fix made without asking, 2026-09-14 through 2026-09-21 — the richest single document in the repo for understanding *why* anything is the way it is. |
| `docs/look-standard.md` | Exact-values snapshot of the renderer/colour pipeline, atmosphere presets, sun/sky/fog/dayline values, post-processing settings, texture sources/tiling, the fixed building palette, and the draw-call/triangle budget history. |
| `docs/CREDITS.md` | Every third-party asset (7 textures + 1 HDRI + 1 model), each with source/licence/author/notes. |
| `docs/budgets.md` | The asset-size/texture-dimension/triangle/draw-call budget table enforced by `tools/check-budget.js`. |
| `docs/asset-slots.md` | Plain-language guide to the asset-slot auto-swap system: slot table, orientation/material/scale rules, how it works internally. |
| `docs/tripo-day.md` | Non-technical walkthrough for dropping 6 specific Tripo-downloaded models into the game. |
| `docs/collaboration_lessons.md` | Process-mistake log (16 dated engineering rows + 1 longer "Gemini credits wasted" narrative entry) — portable lessons, not a task log. |
| `docs/art-rules-characters.md` | Character-art style decision + in-engine material-clamping rules. |
| `docs/gemini-character-master-prompt.md` | Verbatim Gemini prompt template + per-material surface spec for character re-renders. |
| `docs/regression-baseline.json` | Machine-generated baseline (dated 2026-09-20) for `tools/regression-check.js` — 15 named checks, one still a documented miss (draw calls). **Stale** relative to the newer `world-validator.js`. |
| `docs/shots/` | Dozens of dated subfolders of committed screenshot evidence from past sessions' verification passes. |

No separate roadmap/goal file (no `ROADMAP.md`, no `TODO.md`) exists in this repo —
planning lives inside `docs/handoff.md` (next-step pointers) and `docs/parked.md`
(deferred items), both informal logs rather than a forward-looking plan document.

**`reference-from-unity/` (read-only, belongs to the other project, listed for
context only):** `CLAUDE.md` (that project's own, much longer standing-instructions
file — Unity-specific, non-profit/zero-budget constraints, full content/tone rules,
milestone ladder M0-M5), `CONTEXT.md`, `ASSETS.md`, `MAP.md`, `CHARACTER_BIBLE.md`,
`docs/art-direction.md` (the realism/7.1b look spec this web repo's CLAUDE.md §3
quotes from), plus `WorldData/*.json` and two `.xlsx` backlog/locations files.

---

## 12. Is there a written definition of "game complete"?

**NONE**, in the sense of a content/narrative finish line. There is no document that
says "the game is done when X, Y, Z exist." What exists instead are **engineering
quality gates**, which are necessary-but-not-sufficient:
- `docs/budgets.md` / `tools/check-budget.js`: asset-size ceilings.
- `tools/world-validator.js`: 8 structural soundness checks (no wall overlap, nothing
  floats/buried, full collider coverage, reachability, no building overlap, draw-call/
  asset ceilings) — passing this proves the world is *structurally sound*, not that
  the *game* is finished.
- `tools/regression-check.js`: a named list of behavioural assertions (can walk, can
  drive each vehicle, can reach each landmark, all errands completable, no console
  errors) against a saved baseline — proves *nothing regressed*, not that nothing
  remains to build.
- `CLAUDE.md §13`'s report-format line and `docs/handoff.md`'s "Next:" pointers are
  the closest thing to a working definition of "done for this session," but they are
  scoped per-task, never per-game.
- `Places V1/README.md`'s "Planned, not yet built" table (puncture shop, cinema) is the
  closest thing to an explicit scope boundary, but it's a place list, not a completion
  definition for the whole game.

---

## 13. Claude Code setup

**`.claude/settings.json`** (committed, project-level):
- `permissions.allow`: `Bash`, `Read`, `Edit`, `Write`, `WebSearch`, `WebFetch`, `Glob`,
  `Grep`, `Task`, `NotebookEdit`, `TodoWrite`, plus explicit `Bash(rm *)` and
  `Bash(rm -f *)` (file deletion IS pre-approved at the project level, contrary to
  what one might assume from CLAUDE.md's "never rm a scratch file" convention — that's
  a style rule, not a permission restriction).
- `permissions.deny`: a long, specific blocklist — `sudo`, `rm -rf`/`rm -r`/`rmdir`,
  `git reset --hard`, `git clean`, `git checkout -- *`, `git restore *`, `git push*`,
  `git branch -D *`, `git remote add/set-url`, `gh *`, moving files out of
  `~/Documents`/`~/Desktop`, `npm publish`, `brew`, global pip/npm installs, reading
  `.env`/`~/.ssh`/`~/.aws`/Keychains/Cookies/Documents/Desktop/Downloads/Pictures,
  editing `~/Library`/`/Applications`/`../Village nostalgia`, `defaults write`,
  `osascript`, opening Safari/Chrome via `open -a`, `killall`, `launchctl`.
- `permissions.blockReadsOutsideWorkingDirectories: false` — reads outside the repo
  are NOT blocked by default (the explicit `Read(...)` denies above are the actual
  guardrail for sensitive paths).
- **`.claude/settings.local.json`** (local, not meant to be universally shared):
  additionally allows `git add *`, `npm run *`, and one specific script
  (`node tmp/check-staging-no-files.mjs`).
- **No hooks, no custom slash commands, no agents, no skills, no MCP servers are
  configured for this project specifically** (`.claude/` contains only the two
  settings files — confirmed via `find .claude -maxdepth 4 -type f`). Any
  skills/agents available in a session come from the user's global/account-level
  configuration, not this repo.
- **What would cause Claude to stop and ask permission often, given these rules:**
  anything matching the deny list above (especially `git push`, `gh`, destructive git,
  `sudo`, `.env`/SSH reads) will always prompt regardless of auto-mode; routine file
  edits, commits (not pushes), `npm run` scripts, and reads inside the project should
  not prompt. There is a separate, much more elaborate permission/escalation protocol
  documented in `reference-from-unity/CLAUDE.md` §2b (the Unity project's own rules,
  e.g. a formal "DECISION NEEDED" stop-and-ask template) — that protocol is **not**
  this repo's own law, just inherited context from the sibling project; this repo's
  own `CLAUDE.md` has no equivalent explicit escalation template.

---

## 14. Tests and checks

- **`tools/check-budget.js`** (89 lines) — enforces `docs/budgets.md`'s asset-size/
  texture-dimension ceilings. Run via `npm run check-budget`. **Pass/fail state:
  UNSURE** (not executed for this audit); the repo's own docs state current assets are
  well under budget (4.72MB of 40MB as of the last recorded measurement, 2026-09-21),
  and no texture/model has been added since per `docs/CREDITS.md`'s last-updated date,
  so it is very likely passing, but not confirmed by actually running it.
- **`tools/regression-check.js`** (443 lines) — loads the built game headless
  (Playwright), asserts a named list of behavioural checks (prompt badge renders,
  grounding, draw-calls/triangles/assets, all-3-errands-completable, can walk/drive
  each vehicle, can reach bazaar/temple/school/field, no console errors), diffs
  against `docs/regression-baseline.json`. Run via `npm run build && node tools/
  regression-check.js`. **Baseline is stale** (dated 2026-09-20, predates the Oct 2-3
  structural work) and already shows one known/accepted miss at save time (draw calls
  129 vs. then-120 ceiling). **Current pass/fail state: UNSURE** — not executed.
- **`tools/world-validator.js`** (851 lines) — the newer, more comprehensive 8-check
  (13-assertion) structural gate, wired directly into `npm run build`. **Last known
  result (from committed/logged output, not re-run by this audit):
  `tmp/world-validator-AFTER-fix-13.txt`, dated 3 Oct 2026 13:35 — 13/13 passed**,
  including draw calls 133 (≤140 cap) and assets 4.72MB (≤40MB cap).
- **`tools/slot-swap-test.js`** (266 lines) — also wired into `npm run build` (runs
  after the world validator); verifies the asset-slot swap mechanism itself.
  **Pass/fail state: UNSURE** (not executed).
- **No conventional unit/integration test framework** (no Jest/Vitest/Mocha config,
  no `test/` or `__tests__/` directory) — all verification is either one of the three
  gate scripts above, `node tools/screenshot.js` (600 lines, visual-regression-by-eye
  tool, prints `renderer.info` stats and console errors), or one-off scratch
  Playwright scripts in `tmp/` (dozens, never reused as a suite).
- **How to run each** (describe only, not executed here): `npm run check-budget`;
  `npm run build` (runs world-validator + slot-swap-test automatically) or `npm run
  build:unchecked` then `node tools/world-validator.js`/`node tools/regression-
  check.js` individually; `node tools/screenshot.js` for the required-before-every-
  visual-change screenshot pass (CLAUDE.md §8).

---

## 15. Git status

- **Current branch:** `main`.
- **Total commits:** **127** (`git rev-list --count HEAD`).
- **Uncommitted changes:** none to tracked files; one untracked path:
  `.claude/worktrees/` (an empty/local worktree-management directory, not part of the
  project's source).
- **Local vs. remote:** branch is **4 commits ahead of `origin/main`**, nothing pushed
  (consistent with CLAUDE.md §12's "never push — the user pushes manually").
- **Remote:** `origin` → `https://github.com/aishbhardwaj88/village-game-web.git`
  (fetch and push both point here).
- **Last 20 commits** (hash, date, message):
  1. `fae3162` 2026-10-03 — Replace generic engine sky/light/air/ground with a real afternoon atmosphere
  2. `504a814` 2026-10-03 — Fix opening-frame spawn: house's blind wall filled the first frame
  3. `24704ba` 2026-10-03 — Self-correcting Tripo import pipeline + 6 October staging slots
  4. `8237582` 2026-10-03 — World validator: 8-check build gate, wired into npm run build
  5. `ecad24b` 2026-10-02 — Item 4: 3 new abadi-core locations — post office, ration shop, atta chakki
  6. `2fd7f2c` 2026-10-02 — Item 3: ground variation, low vegetation, 3 placeholder trees — "reads as desert"
  7. `b2088e3` 2026-10-02 — Item 2: fix illegible signboards — missing anisotropic filtering
  8. `8a791ff` 2026-10-02 — Item 1 wrap-up: collaboration lesson (1f) + draw-call budget raised to 130
  9. `b5041a6` 2026-10-02 — Fix real spawn bug: trolley spawned inside the general store, zero input needed
  10. `409ef1c` 2026-10-02 — Item 4: permanent dev-mode penetration guard + reproduction/verification tooling
  11. `3f97ce1` 2026-10-02 — Fix defects 2 and 3: trolley/tractor circle shape, and unresolved direct writes
  12. `1e45f14` 2026-10-02 — Fix defect 1: resolveCollisions() was a single pass, not iterated to convergence
  13. `34b6454` 2026-09-24 — Item 2: signboard atlas consolidation, shopfront depth; diagnose signboards (no repro)
  14. `917e384` 2026-09-24 — Item 1: fix real collider-coverage gap (temple boundary walls), add coverage-audit tooling
  15. `0f33db4` 2026-09-21 — docs: final handoff entry for the 10-item structural task
  16. `1ad4f76` 2026-09-21 — docs: final regression baseline after items 1-9
  17. `0b349b2` 2026-09-21 — Item 9 verified: full sweep, no real bugs found
  18. `d783b3e` 2026-09-21 — docs: handoff entry for items 5-8
  19. `af7cfc3` 2026-09-21 — Item 8 verified: measured all four vehicles against LAYOUT.md, fixed one real miss
  20. `c80f0f6` 2026-09-21 — docs: handoff entry for items 3-4
- **Commit cadence by day** (from full `git log`, 127 commits): 2026-09-14: 6,
  2026-09-15: 14, 2026-09-16: 8, 2026-09-18: 27, 2026-09-19: 25, 2026-09-20: 11,
  2026-09-21: 22, 2026-09-24: 2, 2026-10-02: 8, 2026-10-03: 4. Note a gap between
  2026-09-24 and 2026-10-02 (no commits for ~8 days).
- **First commits** (oldest): `Initial commit` → `Scaffold Dopahar web: three.js +
  Vite, golden-hour ground, controls, pipeline` → Items 1-6 of an early queue
  (hero zone, field/track, vehicle controller, audio, loading screen) — all
  2026-09-14/15.

---

## 16. Recent work

Based on git log + file modification times (`tmp/` diagnostic scripts and
`tmp/world-validator-AFTER-fix-*.txt` are all dated 3 Oct, matching the last commit
day):

- **3 Oct 2026 (most recent session, 4 commits):** Built `tools/world-validator.js`
  (8-check/13-assertion build gate) and wired it into `npm run build`; fixed two real
  bugs it immediately found (a bazaar shopkeeper overlapping a shop cluster's wall;
  two school-interior interaction points). Built the Tripo-import self-correction
  logic (per-node rotation zeroing, material clamping) and proved it against
  deliberately-wrong synthetic placeholders before adding 6 real staging slots near
  the chowk. Fixed a real first-frame spawn bug (player faced a blind solid wall 7m
  away at spawn) using 3 captured camera-angle candidates as evidence. Replaced the
  sky/sun/fog/ground presets with a deliberately tuned "real afternoon atmosphere"
  (3 named presets, A live) after a screenshot showed the previous look reading as a
  generic engine default.
- **2 Oct 2026 (8 commits):** A cluster of real collision/spawn bug fixes (trolley
  spawning inside the general store's wall on load — found via `collaboration_
  lessons.md`'s own new lesson about "tests that teleport before checking anything
  prove nothing about spawn state"), a dev-mode live penetration guard, signboard
  anisotropic-filtering fix, 3 new abadi-core buildings (post office/ration shop/atta
  chakki), ground variation + low vegetation (partial tree-removal mitigation), and
  the draw-call budget raised 120→130.
- **24 Sep 2026 (2 commits):** signboard atlas consolidation, a real collider-coverage
  gap fix (temple boundary walls were invisible-but-colliding, or vice versa).
- **21 Sep 2026 (22 commits, the "10-item structural rework" task):** auto-derived
  colliders from tagged real geometry (replacing all hand-typed collision boxes), a
  shared swept movement resolver for every body, tractor-trolley coupling, framed
  screenshot capture mode, full vehicle-proportion verification against `LAYOUT.md`
  (one real bug fixed: bike width), full sweep playtest (zero new bugs).
- **18-20 Sep 2026 (63 commits across 3 days):** the single largest burst — second and
  third errands, bazaar row + chowk + temple + flower stall + general-store
  relocation, bazaar NPC life, shop interactions, dayline across all errands, save/
  continue, audio mix pass, 4 playtest bugfixes (bike direction, double-bound keys,
  contact-shadow grounding cue, tree removal), draw-call reduction pass (149→87).
- Overall shape: **this project is built almost entirely in large, autonomous,
  numbered-queue sessions** (documented explicitly in `docs/parked.md`/`docs/
  handoff.md` as "unattended" or "20-hour unattended run" operating modes), each one
  self-verifying via screenshots/scripted Playwright tests and logging its own
  judgement calls rather than asking mid-session.

---

## 17. Biggest risks and blockers to finishing the game

1. **Draw-call budget has almost no headroom left** (133/140 at last measurement,
   after already raising the ceiling once from 120→130/140). Any further static
   content (more shops, the puncture shop, a cinema, more background houses) will very
   likely require another dedicated merge/instance pass before it can be added safely
   — this has already happened twice (149→87, then a later 117→90 pass) and is a
   recurring, structural cost center, not a one-time fix.
2. **Almost every character and vehicle is still a placeholder** (19 of 20 asset
   slots unfilled). The game's actual visual identity — the thing that would make it
   look like a finished game rather than a collision-tested greybox — depends on a
   Tripo/Gemini art pipeline that lives mostly in the *other* (Unity) project and has
   only been partially ported here (the import/clamping logic exists and is proven;
   the actual finished models do not exist yet).
3. **No licensed tree/foliage solution** — explicitly unresolved after an exhaustive,
   honest search (Poly Haven too heavy, Sketchfab account-gated). The partial
   `src/vegetation.js` mitigation ("reads as desert" fix) is a stopgap, not a resolved
   art-direction requirement (the mood board and art-direction docs clearly expect a
   lived-in, vegetated village, not bare desert).
4. **No real test suite** — verification entirely depends on the three gate scripts
   plus ad hoc Playwright scripts that are never consolidated into a reusable suite.
   A future contributor (human or AI) without access to this session's accumulated
   `tmp/` scripts has to re-derive a lot of verification method from scratch, and the
   regression-baseline JSON is already stale.
5. **No real-hardware performance verification, ever** — every mobile/perf claim in
   the docs is self-flagged as measured only in headless SwiftShader, which the docs
   themselves say "cannot produce a meaningful 30fps number either way."
6. **No content "definition of done"** — without a finish line for places/errands/
   NPCs, the project could keep adding small locations indefinitely (as it has been)
   without ever being declared feature-complete; the only hard stops are engineering
   budgets, not design ones.
7. **Sound is still 100% procedural/synthesized**, explicitly labeled a placeholder
   for real recordings — a real audio pass (or an explicit decision to ship
   procedural audio permanently) is still open.
8. **The two-halwai duplication and several placement judgement calls remain
   explicitly unresolved**, flagged in the docs as "her call" — small, but they are
   real open design questions sitting in the backlog rather than the code.

---

## 18. Recommended next 10 tasks, in priority order

1. **Re-run and re-save a fresh `regression-check.js` baseline** (and confirm `npm run
   build`, `npm run check-budget` currently pass) — the committed baseline is 2 weeks
   stale relative to the newer, more thorough `world-validator.js`; this is cheap and
   removes the single biggest "is the current state actually healthy" unknown this
   audit had to mark UNSURE.
2. **Do a dedicated draw-call headroom pass** (apply the same `mergeGroupByMaterial`/
   instancing discipline that brought it from 149→87 and 117→90 before) *before*
   adding any more static content — the budget has been tight-then-raised twice
   already; getting real margin back now is cheaper than doing it under pressure a
   third time.
3. **Get at least the highest-visibility real models in** (player, tractor, halwai
   kiosk, mother) via the already-proven Tripo pipeline — the asset-slot system and
   import-correction logic are done and tested; what's missing is just the actual
   model files. This is the single highest-leverage item for "looking like a finished
   game" rather than a greybox.
4. **Resolve or formally park the tree/foliage gap** — either get Sketchfab access
   (one-time account creation, explicitly the only blocker) to retrieve one of the
   already-identified suitable CC0/CC-BY candidates, or make `src/vegetation.js`'s
   current stopgap the deliberate permanent art direction and say so in
   `docs/look-standard.md` so it stops being an open question.
5. **Delete or clearly quarantine `src/trees.js`** — it's dead code that contradicts
   its own removal story (docs say it was deleted; the file is still on disk,
   unimported). Either remove it or add a one-line header noting it's retained for
   reference, to avoid a future session wasting time re-investigating it.
6. **Measure real-device performance at least once** — a real phone/laptop pass (even
   a single manual check) would retire the "unmeasurable here" caveat that's been
   carried in the docs since the first mobile-perf pass.
7. **Get real recorded/curated audio for at least ambient sound** (replacing or
   supplementing the procedural placeholder), since `src/audio.js` itself frames this
   as not-yet-done.
8. **Resolve the two open design questions flagged "her call"** — the two-halwai
   duplication and the mandir's exact placement rationale — small decisions that are
   blocking nothing technically but are explicitly waiting on a human call.
9. **Build the puncture-repair shop** (fully speced in `Places V1/README.md`, only
   skipped for draw-call-budget reasons) once task 2's headroom pass creates margin —
   it's the next item already queued and described in detail, not a new design task.
10. **Write a short, explicit content "definition of done"** (which places/errands/
    NPCs must exist, and in what visual-fidelity state, for this to be called a
    finished game) — right now the only completion gates are engineering budgets;
    without a content finish line, the project risks the same "keeps growing without
    a stopping point" pattern visible across the 127 commits so far.
