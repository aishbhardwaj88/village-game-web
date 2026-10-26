# CLAUDE.md - Dopahar (web)

Standing instructions for Claude Code in this repo. Keep this file under 120 lines.

## 0. Read exactly these five files at the start of every session

1. This file
2. `docs/FINISH_LINE.md` - the only definition of done. Locked.
3. `docs/NEEDS_YOU.md` - questions waiting for Aishwarya
4. `docs/handoff.md` - top entry only, where the last run stopped
5. `docs/BACKLOG.md` - the story board, section A is the current work

**Read nothing else until a task needs it.** Read on demand, named here so you can find them:
`docs/WORLD.md` (what is built), `docs/STORY.md`, `docs/MISSIONS_PLAN.md`,
`docs/FEEDBACK.md`, `docs/look-standard.md`, `docs/asset-slots.md`, `docs/budgets.md`,
`docs/CREDITS.md`, `docs/collaboration_lessons.md`, `docs/parked.md`,
`reference-from-unity/docs/art-direction.md`, `reference-from-unity/MAP.md`,
the per-building checklists. `docs/archive/` is history, never read it.

## 1. What this is

**Dopahar** (village: Amrai Khera) - a free web build, three.js + Vite, vanilla JS, no
framework, deployed to GitHub Pages. `docs/WORLD.md` describes what currently exists.
`START_HERE.md` has the folder map. The Unity project (`../Village nostalgia`) is
archived - **never touch it.**

## 2. Never stop a cycle because you cannot publish

- A cycle that produces no game change is a FAILURE, not a normal outcome.
- If `git push` fails: commit locally, write one line in `docs/NEEDS_YOU.md`, and
  **keep building.** Never stop, never idle, never write a handoff-only cycle.
- Cycles 13-28 (Oct 22-23) were lost this way. Do not repeat it.
- If you genuinely cannot proceed on a task: mark it `- [!]` in `docs/BACKLOG.md` with
  a `BLOCKED:` note, write one plain line in `docs/NEEDS_YOU.md` ending
  `- status: open`, and take the next item. There is always other work.

## 3. Permissions and blockers - never wait

- Anything needing Aishwarya goes to `docs/NEEDS_YOU.md` in plain language, then you
  move to the next task immediately. Never block, never wait, never ask twice.
- `docs/NEEDS_YOU.md` is what the dashboard reads. One item per line, plain English,
  no jargon, no file paths unless she needs them.
- Never spend Tripo credits or any money. Characters are PARKED until Oct 26.
  Capsule placeholders stay. Do not generate, do not ask.

## 4. The map is law

- `reference-from-unity/MAP.md` and `WorldData/*.json` define the village. 1 unit = 1 m.
- **Never declare the game or a zone complete while MAP.md locations are unbuilt.**
  Compare against MAP.md before any completeness claim.
- If MAP.md gives no coordinate for something, say so in your report. Do not invent
  a layout silently.

## 5. Reference folders - read-only, never touched

`Places V1/`, `Characters V1/`, `Mood board/`, `reference-from-unity/` are gitignored.
**Never delete, move, or rename them.** Read freely; extract individual licensed assets
when a task calls for it.

## 5a. PLACES V1 IS THE SPEC. READ LAYOUT.md FIRST, ALWAYS.

`Places V1/<place>/LAYOUT.md` carries the art director's sizes, rules and the known
mistakes in her images. **It overrides the images wherever they disagree, and it is
read BEFORE any build or rework of that place.** A build that skipped it is wrong by
definition, whatever it looks like. (Real failure, 25 Oct: a gaushala shipped with a
4x oversized office, a 3x oversized straw store, timber posts instead of brick, and
no biogas dome, because LAYOUT.md was never opened.)

- Her proportions are not to be changed. Scale may be adjusted only if genuinely wrong
  for the game, never the proportions, and the change must be named in the report.
- Nothing in her drawings is decoration to be dropped: murals, painted signs, a
  taraju, a notice board are all deliberate. Build them.
- Metre numbers, arrows and view labels in the images are drawing notes, never built.
- Her images carry no lettering. Write all names and signboards yourself, per the
  signboard rule below.
- Build with `tools/blender/arch.py`'s `Kit` and `Box`, not hand-rolled geometry.
  `build_school.py` is the worked example. Texture repeats come from arch.py's own
  table (brick 1.2, tin 0.8, plaster 0.5, wood 1.0, metal 1.0): `box_uv()` already
  gives UVs in metres, so a larger repeat tiles to sub-pixel and averages to flat
  colour. Colour comes from `finalize`'s tints, sampled from her reference image.

## 5a2. MATERIALS ARE A SHARED LIBRARY. REVIEW IS A SUBAGENT.

- **A place build may never define its own material values.** Materials live in one
  approved library and are used by name. Re-deciding brick per place is what caused
  two full texture FAIL rounds on 25-26 Oct, discovered only after 20 places existed.
  If a place needs a material the library lacks, add it to the library, re-review the
  material board, then use it.
- **`.claude/agents/art-reviewer.md` judges every render before it is called done.**
  It is read-only and never built the thing, which is the point. A place is not done
  until it returns PASS; its FAIL list is the rework list. Never grade your own work.

## 5b. THE STANDING GOAL (art director, 2026-10-23) - applies to every place, always

**Maximum realism, without hurting load time or framerate.** Both halves are the
goal; neither excuses the other.

This applies to EVERY location in the village without needing a separate review note:
ration shop, post office (dak ghar), atta chakki, school, temple, tubewell, every
shop, every house, every farm, every prop. Do not wait to be told place by place.

**The realism rules, in order:**
1. **Search CC0 sources before building anything.** Poly Haven, ambientCG, Poly Pizza.
   Hand-build only what genuinely has no free asset, and say so in the report.
2. **No solid-colour geometry anywhere.** Every surface carries a real texture with
   normal and roughness maps. A flat-coloured object is an automatic fail, whatever
   it is: a leaf, a packet, a door, a pole, a cloth, a sweet.
3. **Every interior is furnished like a working place**, not an empty box with a
   counter: the specific tools of that trade, stock, seating, lighting, wiring,
   signage, clutter and signs of daily use.
4. **Variation everywhere.** Per-instance scale, rotation, tint and wear. Two
   identical adjacent objects is a fail.
5. **Openings are real.** Every door gets a frame, panels, handle, hinges and a
   recess; every window a frame, iron grille, sill and recess.

**The performance rules, which are not optional:**
- `public/assets/` stays under 40 MB; textures 1K, 512 for props; WebP.
- Instance every repeated object. Merge static geometry per unit.
- Zone-stream interiors and distant content; distance LOD on vegetation and crowds.
- The title screen must appear before assets finish loading.
- **If realism cannot fit the budget, report the number. Never silently thin the
  detail, and never silently blow the budget.** That trade-off is the art director's
  call, not yours.

## 6. Look - target is realism

Full spec: `reference-from-unity/docs/art-direction.md`. Read before any visual work.

- **Grounded realism, GTA 6 as the reference.** Physically based rendering, real
  scanned CC0 textures, real light. Stylised is dead - do not propose it.
  Lighting, post-processing, colour grade and photoscanned textures do the work
  before mesh detail.
- **Ordinary and mixed, like Panchayat (Phulera).** Vary prosperity, never vary
  dignity. Modest is swept, limewashed, cared-for. Worn-in yes, falling apart no.
  Test: would the family living there be happy to see their home shown this way?
- Camera stays mid-distance. Faces are never a close-up subject.

## 7. Hard content rules (non-negotiable)

- No real brands, logos or wordmarks. No real village names anywhere.
- No alcohol, tobacco or intoxicants, including background props.
- Era: nothing that would only exist after ~2015.
- Zero tasks at any of the four faith buildings. No stealing. Nothing dangerous.
- **Language order, do not reverse.** English primary and larger, Hindi beneath and
  smaller, everywhere in the UI.
- **Signboards (art director's FINAL call, 2026-10-25, REVERSES the 23 Oct rule).**
  On every painted board in the world:
  - **Line 1: Hindi (Devanagari), BOLD, larger, dominant.** The Devanagari is what
    makes the place read as UP, the way a Japanese game leads in Japanese.
  - **Line 2: English, not bold, smaller, but still comfortably legible at normal
    walking distance.** Never shrink it to a token; most players cannot read Hindi.
    English cap height roughly 60-70% of the Hindi, never below 55%, then judged by
    eye in a screenshot.
  - Both lines the same dark paint colour. No pale grey English on a pale board.
  - Fail test: if the English cannot be read at walking distance, the board failed.
  - Do not flip this back to the 23 Oct version. UI text elsewhere keeps the
    English-first rule above; this is painted world signage only.

## 8. Renderer and colour - law, see `docs/look-standard.md` for exact values

- `outputColorSpace = SRGBColorSpace`; `toneMapping = ACESFilmicToneMapping`,
  exposure 1.0.
- Albedo textures sRGB. Normal/roughness/AO stay linear.
- Pixel ratio capped 1.5. One 2048 shadow map, `PCFShadowMap`.
- One `EffectPass`: vignette, subtle noise, warm grade, bloom on non-touch only.
  **No `ToneMappingEffect` in the composer** - it washes the image out.
- Sky is a shader gradient dome. Amrai Khera is flat farmland, no hills.
  The HDRI feeds `scene.environment` only, **never** `scene.background`.

## 9. Assets, licences, budgets

- CC0 first, CC BY second (credit in `docs/CREDITS.md`), NC never, unknown never.
  Poly Haven and ambientCG are the default sources.
- `public/assets/` under 40 MB, any model under 5 MB, textures 1K max (512 props).
  Runtime: under 400k triangles, under 150 draw calls (aim 120 per zone).
- Shrink every new model: `node tools/shrink.js <in> <out.glb> [triangleBudget]`.
- Run `npm run check-budget` before every commit touching `public/assets`.

### Choosing textures (tech lead's call, 2026-10-23)

- **Poly Haven first.** Its sets are photoscanned and include real normal, roughness
  and displacement maps. ambientCG second. Kenney only for UI, never for surfaces.
- **Always download the highest resolution available, then downscale to 1K yourself.**
  A 1K downscale of a 4K scan looks far better than a native 1K file.
- A set is only usable if it has a normal map AND a roughness map. Colour-only
  textures read as flat paint and must not be used on any surface.
- Prefer one shared trim sheet for frames, plinths and bands over per-object textures:
  better quality per megabyte and fewer draw calls.
- Vary tiling scale per surface so repetition is not visible at playing distance.
  Check this in the screenshot, not in theory.

### Loading time (hard rules, this is a browser game)

- Total `public/assets/` stays under 40 MB. Non-negotiable.
- Textures: 1K maximum, 512 for props, WebP. Compress the five largest textures to
  KTX2 if the total creeps over budget.
- **Nothing in the opening frame may wait on a download.** The title screen must appear
  before assets finish loading.
- Reuse materials across objects. One plaster material for every wall, one tile
  material for every roof. Never a unique texture set per building.
- Instance everything repeated: trees, crops, background houses, props, animals.
- If a quality improvement pushes the budget over, the fix is better reuse, not a
  smaller texture. Report it rather than silently dropping resolution.

### Realism comes in this order, do not skip ahead

1. Lighting and HDRI environment
2. Material response: correct normal and roughness maps
3. Texture resolution where the camera actually gets close
4. Mesh detail, last

A scene with great lighting and plain geometry reads as real. A detailed mesh with flat
textures reads as a toy. Spend effort in that order.

## 10. Verify before reporting - all three, every time

1. `node tools/screenshot.js`, then **look at the images.** Fix anything black, flat,
   washed-out, smeared or broken before reporting done. "It built" is not evidence.
2. `npm run build && node tools/regression-check.js` before any commit touching
   `src/vehicles.js`, `src/main.js`, `src/collision.js` or anything driving movement.
   Never patch on top of a regression. Never re-save the baseline over a real one.
3. `tools/world-validator.js` runs inside `npm run build`. Every new building, prop,
   vehicle or model must pass it. A new asset that breaks a check is not finished.
   Never silently loosen a check to make a problem disappear.

**One screenshot of one moment proves nothing about anything that changes over time**
(accumulating rotation, a follow spring, a collision response). Check across a real
span of play.

## 11. You may not grade your own work

- `docs/FINISH_LINE.md` is written by the art director. **You may tick a box only with
  a named screenshot as proof. Never reword, downgrade or cut an item.**
- If an item is impossible, write the question in `docs/NEEDS_YOU.md` and continue.
- `docs/ART_REVIEW.md` holds the art director's PASS/FIX/FAIL verdicts. Read it every
  cycle, rework FAIL then FIX first, append "Reworked" lines, **never edit a verdict.**

## 12. Scratch files and git

- Never `rm` anything. One-off scripts go in `tmp/` (gitignored) and stay there.
- Commit on `main` with clear messages, push after every visible improvement (hourly
  at least), then confirm the GitHub Actions run goes green for that commit.
- Never touch `../Village nostalgia` or the reference folders.

## 13. End every reply with this exact line

```
LINK: <url or 'not yet'>. YOU: <exactly what I must do, or 'nothing'>. NEXT: <what I will do next>.
```
