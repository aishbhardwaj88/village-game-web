# State - rewritten every run, max 40 lines

Last updated: 24 Nov (late). MAIN owns ORDER-24NOV's PUSH LIST solo now
(missions/load lanes paused 23:15 IST, no output in 3 MAIN runs, escalated).

## Current state
PUSH LIST 1+2 (M1-M8 + trolley/side-jobs, first new-map proof): ran
`tools/missions-check.mjs` (static, no browser) fresh - 358 PASS, 0 FAIL, 4
WARN (3 milk-aunty stops on a back-lane gali, 1 ambient temple-bell note,
both WARN by design), all 8 missions/10 side jobs/tractor+cart spawns.
Real-browser proof (missions-smoke.mjs) still blocked: built dist-smoke,
ran it, renderer crashed again even with characters 404'd out - same
container OOM as every prior entry, not this diff; didn't rerun (A7).
Fixed a real bug found reading the school code: school_bell (item 4) was
hardcoded y=0; build_school.py's verandah apron there is y=0.12 - the known
"~0.12 m float". Fixed in src/props.js. BELL_POSITION (collider/
interaction, XZ-only) untouched - purely visual. Tier 1 clean; missions-
check rerun after, same 358/0/4. distanceToCanalWater (item 4's other
glitch) already fixed 24 Nov (d39496b) - confirmed by reading, not retouched.

## Next 5 items
1. Item 5: texture double-fetch count needs a network log (browser-blocked)
   - find a static check next run.
2. Item 6 (B4): mapData.json (758 KB inlined) + approved-map json (664 KB
   fetched) ship the map twice - read both consumers' fields, then merge.
3. 4th MAIN run with no lanes/missions.md or lanes/load.md -> escalate harder.
4. Prep B7/C3 before/after shot pairs for her yes.
5. More PUSH LIST / BACKLOG.md work once the above PASS or are parked.

## Blockers
- Real in-browser proof: container OOM, confirmed again this run.
- B7/C3 need her yes on a before/after shot. Tripo CLOSED, B8/B7/B9 deferred.
LAST_FULL_PASS=82c337c (browser chain unreliable here).

## Known about this container
- node_modules empty every fresh container - `npm ci` once per run.
- HEAD starts detached on a stale local main - fetch+checkout -B fixes it.
- Browser checks crash/hang (confirmed again: dist-smoke + missions-smoke.mjs
  "page crashed" even with characters blocked). Use missions-check.mjs
  (static) for mission/job proof instead.
