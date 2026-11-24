# State - rewritten every run, max 40 lines

Last updated: 24 Nov, run that created docs/efficiency.md (ORDER-24NOV Part A).

## Current state
Game is past GAME_COMPLETE (all 8 missions built, verified). Current work is
ORDER-24NOV: cut load time, build time, loop token spend (her 24 Nov approval,
full order in project doc claude/efficiency-audit-24nov.md). Part A done (entry
32). B1/B3/B5 done (entries 25-31). B2 DONE (entry 33). B6 EXHAUSTED per entries
28-31 (only real over-specific-cache-key instance already fixed, 0 further
programs to merge today; renderer.compileAsync behind the title screen already
wired in main.js/ui.js's readyGate, predates this order) - don't re-investigate,
that's an audit (A6). B4 parked (map being uprooted, 5a-MAP). Remaining for
"ORDER-24NOV: DONE": B8, C1, C2 (C3/B7 are gated on her yes, prep only). Still open.

## Next 5 items
1. B8: spawn-zone-only loading before Play; target 8 MB/60 requests/<4s (baseline
   214 req, 20.3 MB, 21.7s).
2. C1: character budget tool + check-budget enforcement (1.5 MB/20k tris/one 2048
   or 1024 texture/shared clips).
3. C2: character load-by-distance (no downloads before Play, 8 loaded max, unload
   past 80m).
4. Prep B7/C3 before/after screenshot pairs for her yes (don't roll out without it).
5. Real game work from docs/BACKLOG.md once the above has a parked line or is done
   (grep BACKLOG.md, don't read it whole).

## Blockers
- B7 (KTX2) and C3 (character quality trial) need her yes on a before/after shot
  before any rollout - prep the pair, don't ship.
- Tripo plan question (10 characters, CC BY vs private) open in NEEDS_YOU.md.

LAST_FULL_PASS=82c337c (HEAD at this run's start - baseline for git diff; full
browser build chain is unreliable here, see below, so this is not a confirmed-green
browser pass)
Runs since full pass: unknown (browser checks unreliable here, see below)

## Known about this container
- node_modules starts empty every fresh container - `npm ci` needed once per run.
- Blender absent. Places V1/ absent (gitignored, reference-only).
- HEAD starts detached on a stale local main - `git fetch origin main && git
  checkout -B main origin/main` fixes it, one line, don't investigate further.
- Browser checks are slow/unreliable: `npm run build`'s world-validator step did
  not finish in 300s (24 Nov); `screenshot.js` ran 238s then crashed. Not your
  diff's fault unless it plausibly touches what's checked - see efficiency.md A7.
- chromium needs the full `chrome` binary, not `chrome-headless-shell` (already
  fixed in tooling, entry 23 Nov).
