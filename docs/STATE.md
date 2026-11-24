# State - rewritten every run, max 40 lines

Last updated: 24 Nov, MAIN lane run (entry 35), first run under the 3-lane push.

## Current state
Past GAME_COMPLETE (all 8 missions built, verified). 24-hour push (her order, 24
Nov evening): no-characters-complete by Wed 25 Nov 20:00 IST, 3 hourly lanes.
MAIN owns rulebook/integration/STATE.md/char slot (Part C). docs/lanes/ doesn't
exist yet - MISSIONS/LOAD haven't logged, nothing to integrate this run. Part A
done (32, 34). C1 DONE this run - check-budget.js now enforces 20k tris/
character (already had 1.5/2.5 MB size cap). C2 reviewed: already built (S7, 21
Nov) - characterLOD.js defers every character past Play, nearest-first, tiers by
distance (40/80m, 24 full-anim cap). Differs from the order's literal "8
loaded/unload past 80m" (tiers HIDE not free past FAR, cap FULL not total
loaded). Left as-is - proven/tuned, only ~9 NPCs exist, no real pressure yet.

## Next 5 items
1. B8: spawn-zone-only loading before Play; target 8 MB/60 req/<4s (baseline 214
   req, 20.3 MB, 21.7s). No lane owns it yet.
2. Integrate docs/lanes/missions.md + load.md once they exist (next MAIN run).
3. Prep B7/C3 before/after screenshot pairs for her yes (don't ship without it).
4. Real game work from BACKLOG.md once B8/lanes are parked or done (grep it).

## Blockers
- B7 (KTX2) and C3 (character quality) need her yes on a before/after shot first.
- Tripo plan question CLOSED this run per her standing order (NEEDS_YOU.md
  updated); licence-audit.mjs's own WARN-only note is separate, left as-is.

LAST_FULL_PASS=82c337c (baseline for git diff; browser chain unreliable here, not
a confirmed-green browser pass). Runs since: unknown (see below).

## Known about this container
- node_modules starts empty every fresh container - `npm ci` once per run.
- Blender absent. Places V1/ absent (gitignored, reference-only).
- HEAD starts detached on a stale local main - `git fetch origin main && git
  checkout -B main origin/main` fixes it, don't investigate further.
- Browser checks slow/unreliable: `npm run build`'s world-validator didn't finish
  in 300s (24 Nov); `screenshot.js` ran 238s then crashed. Not your diff's fault
  unless it plausibly touches what's checked - efficiency.md A7.
- chromium needs the full `chrome` binary (fixed).
