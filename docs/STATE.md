# State - rewritten every run, max 40 lines

Last updated: 24 Nov, MAIN lane run (entry 36), second run of the 3-lane push.

## Current state
Past GAME_COMPLETE (all 8 missions built, verified). 24-hour push (her order, 24
Nov evening): no-characters-complete by Wed 25 Nov 20:00 IST, 3 hourly lanes.
MAIN owns rulebook/integration/STATE.md/char slot (Part C). docs/lanes/ still
doesn't exist - MISSIONS/LOAD haven't logged yet, nothing to integrate this run
either. Part A (efficiency.md A1-A11) and Part C (C1/C2) both confirmed done,
nothing new needed there this run. Verified main is healthy: fresh `npm ci`
(node_modules starts empty every container), `npm run build:unchecked` clean,
same pre-existing budget breaches as entry 35 (characters over 2.5MB/20k tris at
WEB_QUALITY='full', her 21 Nov call, WARN only), all 4 instant checks PASS. Took
2 BACKLOG items no lane owns: pond lotus (searched CC0 again, none found, closed
pads-only-final) and halwai flame/heat (soot+steam already existed, added a real
flicker PointLight per bhatti since the fire cast no light before - see
src/halwaiFire.js's own comment for why heat-haze/refraction was left out).

## Next 5 items
1. Integrate docs/lanes/missions.md + load.md once they exist (next MAIN run).
2. Prep B7/C3 before/after screenshot pairs for her yes (don't ship without it).
3. Real game work from BACKLOG.md once lanes are parked or producing (grep it).
4. B8/B7/B9 are explicitly "after the push" per the 24-hour-push order - do not
   start them before ORDER-24NOV reads DONE.
5. If docs/lanes/ still doesn't exist next run too, check whether MISSIONS/LOAD
   are actually firing (not MAIN's call to fix, just worth noting in NEEDS_YOU).

## Blockers
- B7 (KTX2) and C3 (character quality) need her yes on a before/after shot first.
- Tripo plan question CLOSED (NEEDS_YOU.md), licence-audit.mjs's own WARN-only
  note is separate, expected, left as-is every run.

LAST_FULL_PASS=82c337c (baseline for git diff; browser chain unreliable here, not
a confirmed-green browser pass). Runs since: unknown (see below).

## Known about this container
- node_modules starts empty every fresh container - `npm ci` once per run. The
  earlier `ls node_modules | head -1 && echo PRESENT || echo MISSING` check in an
  older firing's setup step is a false positive (head always exits 0) - always
  just run `npm ci` if build:unchecked reports "vite: not found".
- Blender absent. Places V1/ absent (gitignored, reference-only).
- HEAD starts detached on a stale local main - `git fetch origin main && git
  checkout -B main origin/main` fixes it, don't investigate further.
- Browser checks slow/unreliable: `npm run build`'s world-validator didn't finish
  in 300s (24 Nov); `screenshot.js` ran 238s then crashed. Not your diff's fault
  unless it plausibly touches what's checked - efficiency.md A7.
- chromium needs the full `chrome` binary (fixed).
