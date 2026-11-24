# Efficiency rulebook for the hourly build loop

Created 24 Nov under ORDER-24NOV (her yes given in Claude chat, full order in the
project doc `claude/efficiency-audit-24nov.md`). Replaces CLAUDE.md section 0 (reading
list) and section 10 (which checks run when). Everything else in CLAUDE.md still
stands. Keep this file under 70 lines - edit it in place, do not grow a second doc.

## A1. Mandatory reading, every run
Only: CLAUDE.md, this file, docs/STATE.md - nothing else before work starts.
Measured 24 Nov: old set was ~190 KB/~47k tokens (BACKLOG ~100K, 3 handoff entries
~27K, CLAUDE.md 18K, NEEDS_YOU 16K, FINISH_LINE 12K); new set is under 25 KB. Read
BACKLOG/NEEDS_YOU/handoff/anything else only by grep or line range, on demand.

## A2. docs/STATE.md
Rewritten every run: current state, next 5 items, blockers, LAST_FULL_PASS=<hash>,
runs since full pass, "known about this container". Max 40 lines. Don't re-check a
fact it already lists unless something fails because of it.

## A3/A4. BACKLOG.md and handoff.md
BACKLOG.md: open items only, max 80 lines; done/stale/superseded move to
docs/archive/backlog-done.md (append, never delete). handoff.md: one entry per run,
max 8 lines; entries older than 3 days move to docs/archive/ (append, never delete).

## A5. No notes-only commits
Docs ride inside the code commit that made them true. Exception: a run with no code
change commits its one log line alone.

## A6. Effort goes to the game
No new validator/guard/audit/calibration script unless the same real bug escaped
twice. No audit runs, no re-verifying already-logged work, no end-to-end reads
hunting for bugs - read code to change it, not to inspect it.

## A7. Verification tiers (measured 24 Nov, fresh container)
Decide from `git diff --name-only` against LAST_FULL_PASS + working tree.
- Tier 0, docs only: no build.
- Tier 1, low risk (data/texture/one place/builder file/UI text): `npm run
  build:unchecked` + licence-audit --check + check-dup-models + check-material-clone
  + place-visibility-check. Measured: ~8s total. Cheap, reliable, run every time.
- Tier 2, risky (movement/collision/vehicles/materials.js/mergeUtils.js/loaders/
  main.js boot/package.json/vite config/>8 files): full `npm run build` +
  regression-check.js.
- Full chain also every 6th run regardless of tier.
- **Known container limit**: Tier 2's browser-based steps (world-validator.js inside
  `npm run build`, regression-check.js, screenshot.js) are unreliable here. Measured
  24 Nov: `npm run build` did not finish in 300s (stuck sampling solid geometry);
  `screenshot.js` ran 238s then crashed ("Target crashed"). This is the container,
  not your diff - confirmed by entries 29-31 and by this measurement. When a Tier 2
  browser check hangs or crashes on a diff that doesn't plausibly touch what it
  checks, don't re-run it or chase the container bug (that's an audit, see A6):
  verify by code reading + Tier 1 instead, note the limitation once in the commit's
  handoff line, and move on. If it DOES look related to your change, that's a real
  signal - don't wave it away.
- A failing check is never loosened or skipped to get a commit through.

## A8. Quiet commands
Redirect every build/check to tmp/check.log, print the exit code, tail -40 on
failure. Screenshots only for a visual change, to tmp/, max 2 read per run; commit
one only when it's proof she needs.

## A9. Source reading
Never read more than 150 lines of a file at once - grep first. When you touch a
block of main.js, move that block into its own module in the same commit.

## A10. Batching and budget
Up to 4 small same-area items per commit, one verification. Tier 2: one per commit.
Stop starting new items at 40 minutes into the run.

## A11. One rulebook
CLAUDE.md 0/10, AUTOPILOT.md, START_HERE.md point here, not their own lists. Done.

ORDER-24NOV: IN PROGRESS - Part A done 24 Nov, see docs/STATE.md for B/C status.
