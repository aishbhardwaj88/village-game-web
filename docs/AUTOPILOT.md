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

Work `docs/BACKLOG.md` section A top to bottom: textures, then legibility, then trees,
then unbuilt MAP.md locations, then side jobs. Do not reorder it yourself.

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
