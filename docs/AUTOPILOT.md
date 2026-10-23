# Autopilot run (Dopahar) - unattended, nobody is watching

You are one run of a repeating loop. Do a solid batch of work (1 to 2 hours), commit,
push if you can, then stop cleanly. The next run starts fresh.

## The rule that overrides everything else

**A cycle that produces no change to the game is a failure.**

- Never stop because `git push` fails. Commit locally, write one line in
  `docs/NEEDS_YOU.md`, keep building.
- Never stop because you are waiting on Aishwarya. Mark the item `- [!]` with a
  `BLOCKED:` note in `docs/BACKLOG.md`, write one plain line in `docs/NEEDS_YOU.md`
  ending `- status: open`, and take the next item immediately.
- At the start of each run, any `- [!]` item whose `docs/NEEDS_YOU.md` line now reads
  `- status: done` goes back to `- [ ]` and is eligible again.
- Never write a handoff-only cycle. Cycles 13 to 28 were lost that way. If you find
  yourself about to write "no live-game change", pick the next unticked
  `docs/FINISH_LINE.md` item instead and build it.

## Read first (only these)

- `CLAUDE.md`
- `docs/FINISH_LINE.md` - the definition of done
- `docs/NEEDS_YOU.md` - what is already queued for her
- `docs/handoff.md` - top entry only
- `docs/FEEDBACK.md` - her latest feedback, newest first, top priority

Anything else only when the current task needs it.

## Characters are parked until 26 Oct 2026

- Capsule placeholders stay. **Do not generate any Tripo model. Do not spend credits.
  Do not ask about characters.**
- `inbox/` will be empty. That is expected. Do not treat it as a blocker.
- Build everything that is not a character.

## Before the loop, every run

- If `git status` shows uncommitted changes to `CLAUDE.md` or anything in `docs/`,
  commit them first with a clear message. They are the art director's instructions.
- `git push origin main` now works over SSH. If a push fails, commit locally, note it
  once in `docs/NEEDS_YOU.md`, and **keep building.**
- Any `- [!]` item in `docs/BACKLOG.md` whose `docs/NEEDS_YOU.md` line reads
  `- status: done` goes back to `- [ ]`.

## The loop

1. Read `docs/FEEDBACK.md` and `docs/ART_REVIEW.md`. Rework any FAIL, then any FIX.
2. Pick the top unticked item in `docs/BACKLOG.md` section A. Skip any `- [!]` item.
3. Build it.
4. Verify: `npm run build` (runs the world validator), `npm run check-budget`,
   `node tools/regression-check.js` if movement code was touched.
5. `node tools/screenshot.js`, then **look at the images** against
   `reference-from-unity/docs/art-direction.md`. Fix anything smeared, flat, black or
   toy-like before moving on.
6. Commit. Push if possible.
7. Tick the box with the screenshot path as proof. Never reword the item.
8. Update `docs/handoff.md` (one entry, at the top) and `docs/status.json`.
9. Next item. Repeat until the batch is done.

## Priorities while characters are parked

In this order, unless `docs/FEEDBACK.md` says otherwise:

### The 20-hour plan (art director, 2026-10-23 night). Work in THIS order.

**Rule above all others: the art director's feedback generalises.** She reviewed about
7 of the 42 places. Every verdict in `docs/ART_REVIEW.md` applies to ALL 42 places and
every object in them, without waiting for a per-place review. Do not ask, do not
narrow the scope to the place that was screenshotted.

1. **A0 collision.** People, animals and vehicles must stop passing through walls,
   buildings and trees; buildings entered only through doors. Verify across a
   multi-minute continuous run, not one screenshot.
2. **The water bug**, then the greenery-scatter audit (plants in drains, canal, pond,
   johad, troughs, tanks, rooftops). Report every bad placement found.
3. **A-2 "Visit place" menu**, then **A-2b Tasks list and corner minimap**. These
   unblock the art director's daily review, so they pay for themselves immediately.
4. **A-2c navigation**: ungate the notebook map to all 42 places, build the diegetic
   signage, make the lanes lead somewhere, and deliver the findability audit list.
5. **A-1 movable units** audit and the handoff note. The art director rearranges the
   layout tomorrow and needs to know which places have coordinates baked in. This
   must be written before she starts.
6. **A1a2 asset sourcing, trees and plants first.** This is the biggest visual lever
   in the game. Real CC0 tree and plant models where they exist; alpha-cutout photo
   textures where they do not; never solid-colour leaf geometry. Then the generic
   props: hand pump, pots, stools, chairs, carts, vessels, crates, baskets.
7. **A1b/A1b0/A1b1 interiors and props across ALL 42 places**, per CLAUDE.md section
   5b. Shops, houses, ration shop, dak ghar, atta chakki, school, temple, everything.
8. **A1c farmland** variety and density; **A1d** code-primitive structures converted
   to Blender, doors and windows everywhere; **A1e** street lamps; **A1f** layout
   fixes and the new house row; **A1g** carrom; **A1h** laundry.
9. Then the rest of section A as listed.

Finish an item properly before starting the next. A half-done item helps nobody.
If an item blocks, mark it `- [!]`, write the plain-language line in
`docs/NEEDS_YOU.md`, and move to the next. Never idle.

## Never

- Never declare the game complete. When every box is ticked, run the final gate and
  report the full failure list.
- Never spend money or credits.
- Never delete anything.
- Never edit `docs/FINISH_LINE.md` or a verdict in `docs/ART_REVIEW.md`.
- Never run `git` commands that rewrite history.

## End of run

End with: boxes ticked x of y, what changed in the game this cycle, anything new in
`docs/NEEDS_YOU.md` (one plain line each), and the CLAUDE.md report line.

## Token discipline (tech lead's rules, follow exactly)

- Read only the four session files. Never read `docs/archive/`, never read a doc the
  current task does not need, never re-read a file you have already read this run.
- Do not re-summarise the repo, re-explain the plan, or restate CLAUDE.md back.
- Do not run broad searches across the repo for context you already have in WORLD.md.
- One screenshot run per task, not per edit.
- Batch related work: do all wall textures in one task, not one commit per wall.
- Keep your end-of-run report to the required lines. No long prose.
- If a run is going nowhere after two attempts at the same item, mark it `- [!]` with
  the reason and move on. Do not keep retrying.
