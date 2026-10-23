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
- **Signboards (art director's call, 2026-10-23, supersedes the old rule).** Hindi
  stays on the TOP line for authenticity, but English is the DOMINANT line:
  - Hindi: top line, smaller, lighter weight, reads as painted texture.
  - English: second line, clearly larger and bolder than the Hindi, the line a
    player actually reads.
  - Both lines in the same dark paint colour (maroon, near-black, deep blue). Never
    grey or white English on a pale board; low contrast is why it was unreadable.
  - Test: at normal walking distance the English must be readable in a screenshot.
    If only the Hindi reads, the board has failed.

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
