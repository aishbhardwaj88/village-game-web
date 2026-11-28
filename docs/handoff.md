# Handoff log - one entry per run, max 8 lines, newest on top.
# Entries older than 3 days live in docs/archive/handoff-history.md (moved 24 Nov to handoff-pre-22nov.md, moved 26 Nov: the 22 Nov block, moved 28 Nov: the Nov 7-24 block, file had grown to 2403 lines/37 stale entries).
# 28 Nov scheduled run (20): docs-only, real housekeeping (A5 exception)
- CI confirmed green on d2921f6 (run 1486) before starting. handoff.md had drifted to 2403
  lines / entries back to 7 Nov despite the A3/A4 rule (archive anything older than 3 days) -
  split it: kept Nov 25-28 (62 blocks, 958 lines), moved Nov 7-24 (37 blocks, 1443 lines) to
  docs/archive/handoff-history.md verbatim, append-only (git diff confirms 1443 removed/1444
  added - the +1 is one new section marker, nothing lost). This is bookkeeping per an existing
  rule, not an audit (A6).
- Checked for a real unblocking signal first (not a repeat LOOKS LIST/BACKLOG re-derivation,
  already settled runs 3-19): NEEDS_YOU.md still has all 66 lines open, oldest since 25 Nov (3
  days); `git log` shows no non-loop commits since. All 7 ACTIVE BACKLOG items unchanged
  (her-call/real-browser/CC0-403/out-of-scope). Nothing newly unblocked.
- Pushed a notification about the 3-day stall + 66-item backlog (first one this loop has sent
  for it) rather than silently repeating run 21.

# 28 Nov scheduled run (18): no code change, nothing new unblocked
- CI confirmed green on 88cd3b3 (run 1484, success, Actions API). Re-synced HEAD (detached again,
  same container quirk - fetch + checkout -B main origin/main, safe per STATE.md). NEEDS_YOU.md
  still unanswered since 25 Nov (same long open list). Per A6/project rule (no repeat audits,
  measure first then propose), did not re-derive the LOOKS LIST or BACKLOG again - identical
  result logged on runs 3-17 today (LOOKS LIST 1-8 all settled; all 7 ACTIVE BACKLOG items
  genuinely blocked: her-call/real-browser/CC0-403/out-of-scope). 18 runs flat today; next real
  driver is an answer from her, not another pass of this loop.

# 28 Nov scheduled run (14): no code change, nothing new unblocked
- Re-synced HEAD (detached again, known container quirk - fetch + checkout -B main origin/main).
  NEEDS_YOU.md checked: no new answer since 25 Nov (same open list, incl. run 10's chauraha
  question). All 7 ACTIVE BACKLOG items re-checked against the same blockers as runs 3-13 today
  (her-call/real-browser/CC0-403/out-of-scope/no-reworked-place-to-apply-to) - unchanged. Per A6/
  project rule (no repeat audits, measure first then propose), did not re-derive the LOOKS LIST or
  retest CI/CC0 proxy again - identical result logged 13 times already today. 13 runs flat; next
  real driver is an answer from her in NEEDS_YOU.md, not another pass of this loop.

# 28 Nov scheduled run (5): no code change, nothing new unblocked
- CI confirmed green on 91ab1d7 (run 1471, success, Actions API). Re-synced HEAD (detached again,
  known container quirk - git fetch + checkout -B main origin/main, safe per STATE.md note).
- LOOKS LIST 1-8 and all BACKLOG [ACTIVE] items re-confirmed done/parked/blocked, same documented
  reasons as last several runs: CC0 proxy 403 (not retested today, A6); world-validator check 9 and
  M7's draw-call headroom need a real browser (confirmed container limit, A7); landLayout.js dedup's
  remaining half needs the shops worker or her OK (cross-scope); material board GATED-HER; lane/NPC
  live-trace needs real browser. No new answers in docs/NEEDS_YOU.md. Per A6, not re-running the
  checks a further time - no code change this run.

# 27 Nov scheduled run 24: real code change, found+fixed a live boot-crash bug
- LOOKS LIST/BACKLOG re-confirmed same state as recent entries; picked NEEDS_YOU's gurudwara/anganwadi
  wall item. src/mapCompoundWalls.js: trim each wall run to its clear stretch instead of dropping the
  WHOLE run on any road touch - restores hidden pieces on 6 other walls + 1/4 of gurudwara's; anganwadi
  measured fully inside the new road band on all 4 segments (-0.04 to -1.96 m), confirmed no fix possible.
- While verifying live (not assumed): src/wallWriting.js's 7 wall-decal coordinates were ALL stale
  pre-re-anchor positions since commit 5a23bce (walls moved 7-150 m) - the first one threw uncaught
  ("findRun...has no run"), aborting src/main.js boot right after wallWriting, almost certainly why the
  game hangs at "Loading the village 0%". Re-derived all 7 from old/new point-index correspondence, fixed;
  anganwadi decal switched to the existing graceful onWallOffRoad. Verified live: error gone, game boots.
- Tier 1 pass + missions-check 399/0/3 unaffected. Pushing, will confirm CI green.

# 27 Nov scheduled run 22: flat, CI green, nothing new unblocked
- Re-synced to origin/main (HEAD detached again, container quirk); npm ci (node_modules
  missing, fresh container). CI confirmed green on c107d11 (run 1463) via Actions API.
- Re-ran tools/missions-check.mjs (cheap, no browser): 399 PASS, 0 FAIL, 3 WARN -
  unchanged, no regression since last run.
- LOOKS LIST 1-8 and all 7 ACTIVE BACKLOG items re-confirmed done/parked/blocked, same
  reasons as prior runs (GATED-HER material verdict; CC0 proxy 403 re-tested earlier
  today per 0eb8d27, not re-testing twice in one day per A6; real-browser-only checks;
  shops-file-ownership cross-scope block on loadLandMap). No new answers in NEEDS_YOU.md
  since last run. Per A6/project rule, not re-auditing further with no new input. No
  code change.

# 27 Nov scheduled run: LOOKS LIST checked against code + haystack matte fix
- LOOKS LIST checked against real code, not the repeated "unchanged" note: items 1, 4, 5
  already built (code comments cite these exact playtest notes); item 6 superseded by her
  25 Nov 25/32 km/h order; item 7's map-shipped-twice already fixed 25 Nov. Item 2 stays
  GATED-HER (no road-overlapping footprint in the data, matches existing NEEDS_YOU line;
  tried a playwright screenshot to find the buildings myself, browser hung on blocked
  network calls - A7 container limit, not chased further).
- Real fix: haystacks shared the 'thatch' library material with real roofs, so couldn't
  flatten it in place. src/haystacks.js now clones it (cloneTiledMaterial, keeps the
  weathering hook) with roughness 1 + envMapIntensity 0 - one extra Material, same draw
  calls. Also pointed tools/shotlib.mjs at the full-chromium binary (screenshot.js already
  does, documented fix).
- Tier 1 checks pass incl. check-material-clone's clone-safety scan on the new clone.
- Per A6: did not re-ping the CC0 proxy or re-read final-map.md - the immediately
  prior run did exactly that (same result, <1h ago); repeating it now is the
  re-audit A6 forbids.
- Traced item 8 instead (new angle, not previously laid out in one place): missions
  399/0/3 (passing), console errors 0 (27 Nov plaster_h fix, still in this HEAD),
  school bell "float" confirmed not-a-bug 26 Nov, canal distance is a MAP.md
  position item - [PAUSED-MAP] per 5a-MAP, same as the other 4 ACTIVE BACKLOG
  blockers. All of LOOKS LIST item 8 is therefore settled or correctly parked.
- No new unblocked item found. No code change, no agents.

# 27 Nov scheduled run 3: flat, CI green on 9d1b314 (run 1440), no code change
- Re-synced to origin/main (HEAD detached again, same container quirk), npm ci skipped
  (node_modules present). Re-confirmed CC0 proxy still 403 (polyhaven+ambientcg, same
  allowlist refusal, not transient) - the real blocker behind every [ACTIVE] item.
- All 5 open BACKLOG items re-checked, still blocked, same reasons as runs 1-2.
- No unblocked work found; did not re-run the LOOKS LIST (already done/parked per
  STATE.md - stored scheduled-task prompt text is stale, repo is source of truth).

# 27 Nov scheduled run 2: flat, CI green, scheduled-task prompt's LOOKS LIST already done
- Re-synced to origin/main (HEAD detached again, same container quirk), npm ci fresh.
- CI confirmed green on 865a12f (run 1435) via Actions API (no gh CLI in this
  container - used mcp__github__actions_list instead).
- The hourly scheduled task's own stored prompt still carries the 24 Nov LOOKS LIST
  1-8 as if open; STATE.md/BACKLOG.md/handoff.md all agree it's done/parked
  (confirmed, not just trusted) - the stored prompt text is stale, repo state wins.
- missions-check.mjs re-run: 399/0/3, same 3 WARN (gali_n38/n39 back positions,
  [PAUSED-MAP]) as every prior run - nothing new.
- All 5 open BACKLOG items still blocked, same reasons as last 6+ runs (material
  verdict GATED-HER; 4x PAUSED-MAP map-lock; CC0 proxy 403; M7/shader-warmup need
  real browser). No new angle, no code change, no agents.

# 27 Nov scheduled run: no code change, one real finding, nothing newly unblocked
- CC0 proxy re-tested once (polyhaven): still 403, unchanged.
- Tier-1 checks (licence/dup-models/material-clone/place-visibility) all PASS,
  nothing broken to fix.
- Looked hard at "furnish the railway station/waiting hall interior" (NEEDS_YOU):
  found every door/window there is a solid closed panel (src/kit/railway.js
  wallRun()), so the inside is never actually visible - furnishing it now would be
  invisible geometry. Sharpened the NEEDS_YOU line into the real question (open
  the walls up first, yes/no) instead of leaving it as a vague "furnish later?".
- No commit needed beyond this log + STATE.md (docs only, no code change).

# 27 Nov scheduled run: no code change, nothing newly unblocked
- LOOKS LIST 1-8 confirmed already done/parked (STATE.md), "Looks fixes ready" line
  already in NEEDS_YOU. All 5 [ACTIVE] BACKLOG items checked: 2 are standing rules
  with no new/reworked place to apply to; CC0 proxy re-tested, still 403 (unchanged);
  M7/shader-warmup still need draw-call headroom / a real browser.
- Retried `npm run build`'s check 4/5 (STATE.md's suggestion, container may have
  improved): checks 1-3 ran fine again (same stale tractor/school_bell false
  positives as last run, already resolved - real cart fix stands), check 4/5's heavy
  geometry sampling still hangs past 200s. No change from prior finding.
- No commit (no code or doc content changed beyond this log + STATE.md).

# 26 Nov ~18:1x scheduled run: no code change, 9th flat run on this thread
- Fresh checkout matched origin/main exactly (HEAD detached/stale as always, reset),
  npm ci (node_modules missing again). CI confirmed green on 3362c4f (run 1405) via
  the GitHub Actions API directly.
- Rechecked the CC0 proxy (polyhaven.com, ambientcg.com): both still 403 via the
  agent-proxy, unchanged since 25 Nov.
- BACKLOG [ACTIVE]/NEEDS_YOU: no new answer from her; front-face(27)/on-road(28)/
  remaining-19-overlap are already confirmed wedged over several runs (not re-run
  again, A6); no new/reworked place for the architecture/texture-pipeline rules to
  apply to; check-budget.js's perf data is 5 days stale, real-browser ride still
  unavailable here, so no new M7/shader-warmup measurement to act on.
- Another worker pushed c8774ce (character work, not my scope) after my fetch -
  next run should rebase past it. No item unblocked. No code change. Agents: none.

# 26 Nov scheduled run: real code change, one wedged overlap actually cleared
- Added layoutSnap.js step 5 (same 8-dir/off-road pattern as the stray-prop/tree-trunk
  pushes): a house that never itself tried a move (fine except the sliver it shares with a
  neighbour, or that neighbour is a fixed named building) is now pushed clear, up to 2 m.
- Repacked (~16 min, backgrounded): 75 -> 74 failures (overlap 20 -> 19: house#229/#246
  cleared). Verified clean: swapped old/new mapData.json through layout-tests.mjs --verbose
  - front-face (27) and on-road (28) lists byte-identical, only that one pair left the
  overlap list. Tier 1 chain all exit 0; missions-check 399/0/3 unchanged.
- Remaining 19 overlaps (3 named-vs-house, 9 house-pairs at 0.05 m, 7 washing-line/notice-
  board) genuinely sandwiched - step 5 tried all, no direction clears them. Next move is
  hers (sub-0.3 m fine as drawn?) or a hand placement, not another generic search. No
  agents used.

# 26 Nov scheduled run: no code change, 4th flat run in a row - nothing newly unblocked
- Fresh checkout matched origin/main exactly (no divergence, no other worker commit since
  26243f6). npm ci (node_modules missing on this container, as always). CI confirmed green
  on 26243f6 (run 1389) via the GitHub API directly (not gh).
- Re-ran missions-check.mjs (399 PASS/0 FAIL/3 WARN, same 3 known-by-design warns) and
  layout-tests.mjs (75 failures, same 20 wedged overlaps as the last 2 runs - no new
  avenue, confirmed again that the 3 named-vs-house and house-pair/washing-line items need
  her OK, not another algorithm pass, per the prior run's note).
- Checked BACKLOG.md/NEEDS_YOU.md for anything newly unblocked (CC0 proxy, browser checks,
  map-lock answer): nothing changed. Every open BACKLOG item is still [PAUSED-MAP],
  [GATED-HER], or needs a real browser/CC0 access this container lacks. Agents used: none.

# 26 Nov scheduled run: overlap dead-ends mapped, no safe code change; handoff archived
- Chased the remaining 20 layout-pack overlaps further: confirmed via `src/kit/mapObjectsPlan.js`'s
  own code that props it places (resting spots, buffalo, milestones, pond banks) carry a 26 Nov
  rule - "exact map spot, nothing is slid off a road" (NUDGE set is empty) - so the hand-logged-nudge
  idea floated last run doesn't apply there without her OK; hand pump sits in shops-land
  (src/kit/shopsPlace.js, another worker's file). Ran the existing (unreported this cycle)
  `src/kit/mapObjectsCheck.js` and logged its 16 house-overlap findings to NEEDS_YOU instead of
  moving anything. No safe unblocked code change found this run (A6: not forcing one).
- Did overdue housekeeping instead (A3): docs/handoff.md's 22 Nov block (7 entries, was 9+ days
  overdue) moved to docs/archive/handoff-history.md; header note fixed. missions-check 399/0/3
  unchanged (re-read, not rerun - no code touched). Agents used: none.

# 26 Nov scheduled run: clipGalis had the same discard-leak as nudgeGalis, fixed
- Same shape as the previous run's nudgeGalis bug: clipGalis() trimmed a dead-end lane's
  cap in layout.roads to clear a building, but layout-pack.mjs always ships roads exactly
  as drawn, so the trim never reached the shipped map - it only misled the snap round after
  it into scoring a building clear of a cut that was about to be thrown away. Made it
  report-only. Repacked: 117 -> 116 failures (on-road 44 -> 43). missions-check 399/0/3
  unchanged, Tier 1 clean (build:unchecked, licence-audit, check-dup-models,
  check-material-clone, place-visibility-check). Agents used: none.

# 26 Nov scheduled run: gali-position bug fixed, map-position cleanup continued
- Root cause found: nudgeGalis() in layoutSnap.js mutated layout.roads (shift/narrow a gali)
  before snapLayout's 2nd round, but tools/layout-pack.mjs always SHIPS roads exactly as drawn
  (her 24-26 Nov rule: roads never move, buildings do) - so some houses scored "clear" against
  a gali that would never ship, then stayed on the real, unshifted one once exported. Made
  nudgeGalis report-only (no longer writes pts/width back); it still reports for docs/s7.
- Repacked mapData.json: 120 -> 117 failures. On-road 68 -> 44 (-24, the visible "building on
  a road" bug, now real fixes). Overlaps 25 -> 46 (+21, all house-vs-house back-wall touches
  0.05-0.16 m, none involve a named place) - houses pushed further off the real gali now meet
  the row behind. Net fewer failures, worse category traded for a near-invisible one; trade-off
  flagged in NEEDS_YOU. missions-check 399/0/3 unchanged, Tier 1 clean. Agents used: none.

# 26 Nov scheduled run - no code change, repo unchanged since f9616e6
- git fetch + checkout -B main origin/main: HEAD matched origin/main exactly, no
  divergence, no local commits lost. CI green on f9616e6 (run 1377, success).
- 9th run in a row flat: no new commit from any other worker, no new her answer in
  NEEDS_YOU (map-lock, material-board verdict, chauraha building names all still open).
  Per A6, not re-auditing LOOKS LIST/BACKLOG a further time with no new input.
- Every open BACKLOG item stays [PAUSED-MAP], [GATED-HER], or needs a real browser/CC0
  access this container lacks. Nothing newly unblocked. No code change.

# 26 Nov ~01:xx UTC scheduled run: no code change, 3rd run running flat on same state
- Repo fetched clean, HEAD still b3696a3 (no concurrent commit landed since last run). CI
  confirmed green (run 1373, success) via actions API, not re-run.
- BACKLOG open items unchanged: all [PAUSED-MAP]/[GATED-HER], or [ACTIVE] items (M7 NPC
  draw-call headroom, item-7 shader warm-up) that need a real browser this container
  cannot run (confirmed container limit, docs/efficiency.md A7/STATE.md) - not re-measuring,
  per A6 and the project's "no repeat audits" rule.
- NEEDS_YOU 88 lines, all still open, none newly answered since last check.
- Per A6 not re-auditing the LOOKS LIST a further time with no new input. Next real driver:
  her answer in NEEDS_YOU, a new playtest note, or a concurrent session's commit.

# 25 Nov ~21:1x UTC scheduled run: no code change, nothing unblocked
- Repo-state false alarm: stale cached origin/main ref made HEAD look like unrelated history
  (shallow clone, merge-base failed); fresh `git fetch` showed origin/main already AT HEAD's tip
  (1873264) - no real divergence, nothing lost. checkout -B main origin/main clean.
- CI green on 1873264 (run 1363, Deploy to GitHub Pages, success).
- LOOKS LIST 1-8 re-confirmed done/parked, same as last 2 runs - not re-auditing further per A6
  (no repeat audits). BACKLOG [ACTIVE] has nothing to apply to; map-lock question still open.

# 25 Nov ~20:1x UTC scheduled run: no code change, nothing unblocked
- HEAD 7d84414 (agents-list handoff, not touched here), CI green (run 1358, deploy success). npm ci
  clean, node_modules was missing on this fresh container (expected per known container note).
- Tier 1 clean: build:unchecked + licence-audit + check-dup-models + check-material-clone +
  place-visibility-check all pass; budget breaches shown are known/parked (characters, game MB, load s).
- missions-check: 399 PASS, 0 FAIL, 3 WARN - item 8 (missions/bell/canal) stays confirmed done.
- layout-tests.mjs: 123 failures (front 27/on-road 70/overlap 26), IDENTICAL to the prior run (not a
  one-off) and no position commit landed since - the concurrent position-fix effort now looks stalled.
  Still gated by 5a-MAP + her open "is the map locked?" question (NEEDS_YOU, asked twice already,
  not asking again) - not touched, per BACKLOG's "note an overlap in handoff.md, never fix it".
- LOOKS LIST 1-8 and all BACKLOG [ACTIVE] items reconfirmed done/parked/blocked (CC0 proxy 403,
  shader-warm needs a real browser, no place mid-rework for the architecture/texture-pipeline items).

# 25 Nov (hourly loop, 18:1x UTC) - no code change, concurrent session progressing, nothing unblocked
- Fresh container: node_modules missing (`npm ci` run), HEAD was detached but equal to origin/main
  (b67dddc) - confirmed with `merge-base --is-ancestor` before re-attaching local `main`, no commits lost.
- Re-ran `node tools/layout-tests.mjs`: 122 failures (down from 125, 129 before) - the concurrent
  position/facing session (commits through b67dddc, "Roads empty" series + dog/goat wall-collision
  fixes) is still making real progress, not stalled; left alone per 5a-MAP and prior runs' own plan.
- LOOKS LIST 1-8 and all BACKLOG [ACTIVE] items re-confirmed done/parked/blocked via NEEDS_YOU.md/
  STATE.md, not re-audited further (A6): CC0 proxy still blocked, shader-warm needs real browser, no
  place currently being reworked to apply architecture/texture-pipeline rules to.
- CI green at b67dddc (run 45671175225, conclusion success). Agents used: none (nothing in scope justified one).

# 25 Nov (hourly loop, 17:1x UTC) - no code change this run, nothing unblocked
- Re-ran `node tools/layout-tests.mjs`: 125 failures (front 25, on-road 71, overlap 29),
  down from 129 (25/72/32) last run - the concurrent position/facing session (HEAD
  commits 16:4x-16:53) is still making progress, not stalled; left it alone per STATE's
  own plan and CLAUDE.md 5a-MAP.
- LOOKS LIST 1-8 confirmed still done/parked via NEEDS_YOU.md/STATE.md (not re-audited
  beyond that, A6). All [ACTIVE] BACKLOG items are either "apply when touching a place"
  (no place being touched this run), CC0-proxy-blocked (confirmed 403 25 Nov, not
  re-checked), or need real-browser verification this container can't do (item 7
  shader-warm, A7). check-budget: same known breaches as before (11.35MB(old)/13.01MB(new)
  pre-Play vs 8MB cap, 7.1-7.2s vs 4s), already tracked in NEEDS_YOU, not re-chased.
- Agents used: none (no task needed one).

# 25 Nov (hourly loop, 15:15 UTC) - no code change this run, every lead still blocked
- HEAD moved since the 14:12 run: another session pushed 6953aa3 (edition.js render scale 1.5) at 14:45.
  Re-ran the 4 Tier 1 checks on it fresh (licence/check-dup-models/check-material-clone/place-visibility):
  all PASS. CI green (run 45637514739). No regression from that change.
- LOOKS LIST 1-7 and item 8 (missions/bell/canal) stay done/parked, same as the last 2 runs - not
  re-verified further (A6). CC0 proxy re-check done here (403, unchanged) - note for next run: this was
  already confirmed last run too, stop re-checking it every hour, only re-check if something else suggests
  it changed.
- BACKLOG [ACTIVE] (architecture/texture-pipeline standing rules, CC0 sourcing, M7 flavour NPC, shader
  warm-up) all conditional on a reworked place or a real browser - nothing to apply them to this run.
  Agents: none (nothing in scope justified one).

# 25 Nov (hourly loop, 14:12 UTC) - no code change, repo unchanged since last run, every lead still blocked
- Checked LOOKS LIST 1-7 against current handoff/NEEDS_YOU: all done or correctly parked already (no
  re-verify needed, repo identical to the run that confirmed them). Item 2 (chauraha buildings) stays
  open, waiting on her building names - layout-tests.mjs already shows 0 on-road failures in THE SQUARE.
  Item 8 (missions/bell/canal) also already confirmed done (entry 38/"1559").
- Re-checked CC0 proxy directly (curl): api.polyhaven.com and ambientcg.com both still 403 - BACKLOG
  [ACTIVE] prop sourcing stays blocked, not a code task.
- Reviewed BACKLOG [ACTIVE]: architecture/texture-pipeline items are standing rules tied to "next place
  reworked" - none in flight right now, nothing to apply them to. No new, safe, unblocked, in-scope item
  found. Agents: none (task this small doesn't justify one, per efficiency-rules.md).

# 25 Nov (hourly loop, 13:14 UTC) - no code change, final map re-verified clean, every lead blocked
- layout-tests.mjs + road-clearance.mjs re-run vs the just-landed final map: 23 overlaps, 6 on-road
  named buildings/barriers, 63 road-band touches (mostly by-design gates/islands/rest-stops) - all
  position/layout, so per 5a-MAP logged not fixed; her "map locked?" ask (NEEDS_YOU L65) still open.
- missions-check re-run clean: 396/0/5, same position-only warns as before (milk stops).
- school_bell "float" re-checked by reading: not a bug, already sits on the built 0.12 m apron.
- Nothing else real+unblocked (LOOKS LIST done/parked/browser-blocked; BACKLOG ACTIVE all blocked).
  Agents: none.

# 26 Nov (hourly loop) - no code change this run; docs-only (A5 exception), every lead genuinely blocked
- Fresh container had no node_modules at all (not just "empty") - a shallow `ls` check mid-run falsely looked
  non-empty; ran `npm ci`, then re-verified build:unchecked + all 4 instant checks clean on this checkout.
- Extended STATE's next-item #5 sweep (flat vertex-colour, no texture, CLAUDE.md 5b rule 2) from props/
  farmSites/roadEvents to chaurahaEdges/rideNooks/villageFurniture2/thelaSign.js: clean - the only bare
  MeshStandardMaterials left are the intentional capsule people stand-ins (characters parked). Item 5 done.
- Re-tried: screenshot.js (hung ~100s, same container block, A7), api.polyhaven.com/ambientcg.com for CC0
  prop sourcing (both proxy-403). Zone-streaming/ring-weight/memory-hygiene stay parked, real regression risk.
- No unblocked, in-scope, safe item found this hour (characters/vehicles/shops out of scope, map paused,
  rest gated on her or on network/browser access this container doesn't have). STATE.md rewritten.

# 25 Nov (hourly loop) - real-material fix on the village's tallest landmark (CLAUDE.md 5b rule 2)
- src/props.js createWaterTankProp() (paani ki tanki + transformer, MAP.md's "tallest structure, visible
  from most of the map") was 100% flat vertex-colour, no texture - an automatic fail under the realism
  rule. Now shared-library materials by name (concrete/metal/wood via getTiledMaterial, CLAUDE.md 5a2),
  vertex colour kept as a tint multiply (same hybrid rooftops.js/newShops.js use). 1 mesh -> 3 (one per
  material family), a fixed one-time cost. Verified Tier 1, all PASS (build:unchecked, licence-audit,
  check-dup-models, check-material-clone, place-visibility-check); container's browser check stayed
  flaky (A7, reconfirmed, not chased further) so no clean in-container screenshot of the fix itself.
- STATE's next-5 items 1-4 all need a real browser or are broad-refactor/risky; none safely actionable blind.

# 26 Nov (42) - STATE next-item #5: sliced the last 3 single-sync boot-CPU builders
- landTrees.js build(): the ~568-tree placement loop and the matrix-compose loop now yield to the main thread
  every ~8 ms (same pattern as wall-murals/mapObjects stage 1, 25/26 Nov), instead of running as one long task.
- landFields.js build(): the per-field plant-row grid loop (outer map.objects loop) and the tuftSpots loop
  (can run into the thousands across every field) sliced the same way.
- mapObjects.js stage 4 (pot/milestone models): forEach -> indexed for-loop, sliced every ~8 ms.
- Verified Tier 1 (A7, these are builder-file changes, not movement/materials.js/loaders/main.js): build:unchecked
  clean, licence-audit/check-dup-models/check-material-clone/place-visibility-check all PASS (pre-existing
  character-budget and licence warnings only, untouched by this diff). STATE next-5 #5 now done.

# 25 Nov (41) - LOOKS LIST 1-7 confirmed done, her NEEDS_YOU summary sent; item 8 checked, nothing left unblocked
- Confirmed by code reading (no change needed): item 1's "5 plaster surfaces per house" lives in the live new-map
  house kit's own material (src/kit/housesMaterial.js WALL_VARIANTS/EXTRA_VARIANTS, picked per house by seed) -
  not the old retired abadi system, so it is genuinely wired to what ?layout=new actually ships.
- Wrote docs/NEEDS_YOU.md's "Looks fixes ready" line (items 1-7, one ?at= review link each) - nothing had gone to
  her yet even though all 7 were done or correctly parked per docs/STATE.md.
- Item 8 (PUSH LIST): missions-check 358/0/4 WARN and the school_bell/canal-distance fixes (entry 38) stand,
  nothing nearby touched this run so not rerun (A6). "Zero console errors" stays blocked on the same already-
  logged container issue (Chromium hangs reaching accounts.google.com) - not re-chased (A7), needs a real browser.
- Checked BACKLOG [ACTIVE] items for real work: CC0 prop sourcing (matka/charpai/cylinder/bicycle) needs a Poly
  Haven lookup - api.polyhaven.com unreachable from this container this run (curl: connection reset), parked
  rather than guessed at. M7 NPC out of scope (no characters this run); map/taste items stay paused/gated.
- No code change - docs-only commit (A5 exception).

# 25 Nov (hourly loop) - wired 2 unused CC0 props; LOOKS LIST confirmed done/parked
- LOOKS LIST items 1-7 already done/parked (confirmed by reading STATE.md/handoff), item 8 (missions/bell/canal) already
  PASS'd 24 Nov - only its "zero console errors" sub-item is open, needs a real browser (container limit, A7). Nothing new
  to file in NEEDS_YOU beyond the existing "Looks fixes ready" line.
- Took a BACKLOG [ACTIVE] item instead (CC0 prop sourcing): jug_01 and ceramic_vase_01 were already downloaded, shrunk and
  credited (docs/CREDITS.md line 76) but never wired into any scene - found while checking that credits line against
  src/villageProps.js's MODELS table. Added both with real measured heights (gltf-transform getBounds: jug_01 0.211 m,
  ceramic_vase_01 0.4 m, not guessed). Also fixed a stale CREDITS.md line: small_wooden_table_01 said "maybe unused" but
  was wired in 24 Nov - corrected the note.
- Verified: build:unchecked clean, licence-audit --check (UNKNOWN 0, both new files already had a credits row), dup-models
  PASS, material-clone PASS, place-visibility-check PASS. Budget breaches reported (character sizes, 101 MB total, old/new
  Play-time) are pre-existing, unrelated to this diff (no characters/boot code touched) - not re-investigated (A6).
- Reread STATE.md item 3/4: speed-lead streaming and most audio-by-nearness were already built in earlier runs - STATE.md
  updated to say so precisely instead of repeating them as open.

# 25 Nov (hourly loop) - no code change, one real gap found and filed
- Re-verified LOOKS LIST (1-8, all done/parked) and every BACKLOG [ACTIVE] item: nothing left that's both real and safe to
  ship blind this run - rest is [PAUSED-MAP], [GATED-HER], needs a real browser, or (item 4 ImageBitmap close, item 3
  pixel-rule) flagged "not done blind" by an earlier run, for good reason (loaders.js/zoneManager.js are Tier 2, this
  container's browser checks crash/hang, A7).
- Found instead: the 24 Nov Poly Haven free-props review row (100+ catalogued CC0 props, CREDITS.md props_ph section,
  src/freeProps.js PH_OUTDOOR/PH_INDOOR) was built for her look-verdict but no NEEDS_YOU line ever asked her to look at
  it - filed now with a review link (?at=606,33, verified against freeProps.js PROPS_SITE by reading main.js's ?at
  handler, not a live screenshot - browser checks unreliable here, A7). Nothing placed from it (5a1, her call only).
- Verified: no code touched, so no build run (A5 exception - notes ride with no diff). Agents used: none (task was small
  enough for the main loop itself, per efficiency-rules.md "don't spawn agents for small tasks").

# 25 Nov (night run, final map) - agents used
- Landed the final map (approved-map-2026-11-25.json, repacked); missions-check 0 FAIL; walls tiled 1.5 m with anti-tiling; gate cut to 70 m; normal/roughness and house atlas maps deferred after Play (13.5 -> ~10.7 MB before Play); show cap 265 m, shader warm-up, long-task slicing; service worker added then page made network-first (stale page after a deploy stalled repeat visits at "Loading the village 75%", verified live: Play 6.2 s with SW).
- Agents: missionsfix (Sonnet low, small data fix), gatecut (Sonnet medium, loading code), walls (Sonnet medium, texture scale), propsfix (Sonnet low, error check), gate3 (Opus medium, hard gate/load design), models (Sonnet low, gz models), atlas (Sonnet medium, deferred maps), stream (Sonnet medium, show cap/warm-up/slicing). All stopped on return, zero unpushed commits.
- Not done: memory release of decoded images (unsafe blind, parked), sliced land-layer builds, load target 4-6 MB (parked for her).

# 25 Nov (hourly loop) - finished slicing the boot-CPU land/map-object builders
- STATE next-5 item 5's remainder: landCanal.js and landProps.js both scan the same 1627-object map.objects list
  synchronously; mapObjectsGround.js's buildGroundAndWater (patches/channels/ponds + tubewell/trough water, made
  async) does real per-item geometry (polygon triangulation, profile strips). All three now yield to the main
  thread every ~8 ms, same mechanism as the already-sliced landTrees/landFields/mapObjects stages 1+4 (lateBuild.js
  yieldToMain). Caller in mapObjects.js updated to await buildGroundAndWater.
- Verified: build:unchecked clean (budget breaches are the pre-existing character/load-size ones, unrelated to this
  diff); licence-audit --check 0 UNKNOWN; check-dup-models PASS; check-material-clone PASS; place-visibility-check
  PASS; missions-check 396/0/5 (0 FAIL, same shape as baseline). Tier 1 (builder files), no position/collision touched.
- Agents used: none (small, same-area change; Sonnet main loop handled it directly per efficiency-rules.md).

# 25 Nov (hourly loop) - licence-audit false-positive fixed, map-finality question raised
- licence-audit.mjs was flagging public/sw-kill.js as OWNER-unclear: its licence record names src/swRegister.js
  as builder, but that file never literally said "sw-kill" or the "service_worker" family name the record files
  it under, so the text-match check failed even though the file is legitimately self-made and already tracked.
  Added one comment line to swRegister.js naming both; OWNER warnings 3 -> 2, both remaining pre-existing and
  out of scope this loop (parlour_didi texture is a character; the Tripo billing question is already closed in
  NEEDS_YOU and intentionally tracked only in licence-audit's own output).
- Raised in NEEDS_YOU: several BACKLOG items are still tagged [PAUSED-MAP] ("wait for the new map") though a
  map landed and was approved 25 Nov - asked her if it's locked for good so that work can safely resume.
- Verified: build:unchecked, licence-audit --check, check-dup-models, check-material-clone, place-visibility-
  check all clean (Tier 1, comment-only src/ change). Agents used: none (small, single-file).

# 25 Nov (hourly loop) - no code change, confirmed no fresh ungated work
- Checked all BACKLOG [ACTIVE] items for a real target: architecture self-contained-unit and texture-pipeline
  verify have no place reworked via arch.py in the last 7 days to apply to; M7 baagh keeper needs draw-call-
  audit.mjs, which needs the headless browser (still broken in this container, A7, not re-chased per A6); CC0
  prop sourcing still proxy-blocked (not re-tested, per STATE). Checked all 23 public/assets/props/*.glb
  against src/ for stray unwired models (found jug_01/ceramic_vase_01 this way last run) - all referenced.
- Her map-finality question (NEEDS_YOU) and the other open NEEDS_YOU items remain unanswered. No code touched,
  so no build run (A5 exception). Agents used: none (research-only, too small for an agent).

# 25 Nov (hourly loop, 09:13 UTC) - no code change, blockers re-tested directly not just trusted
- Fresh container: npm ci + checkout -B main from origin (HEAD was detached on a stale local main, routine).
- Re-tested rather than assumed: curl to api.polyhaven.com, ambientcg.com and the live github.io site all still
  hit the egress proxy's 403 (connect_rejected) - confirms CC0 prop sourcing (BACKLOG [ACTIVE]) and the Item 7
  shader-warm-up real-browser check both stay genuinely blocked here, not stale notes.
- Ran tools/missions-check.mjs (no browser needed): 396 pass, 0 fail, 5 warn, same shape as last run (4
  milk-job stops on back-lane roads = position/layout, paused per 5a-MAP; temple_bell ambient warn by design).
- Re-checked every BACKLOG [ACTIVE] item: architecture/self-contained-unit and texture-pipeline UV checks have
  no newly-reworked place to apply to; M7 baagh keeper still needs the broken headless browser.
- Nothing both real and safe to ship blind. Agents used: none (too small for one, efficiency-rules.md).

# 25 Nov (hourly loop, 10:13 UTC) - no code change, checked a new angle, still nothing unblocked
- Did not re-test the proxy/browser blockers again (already confirmed last run, A6 - no repeat audits).
  Checked a fresh angle instead: build_*.py builder scripts' arch.py compliance (CLAUDE.md 5a) - 61/67 use
  arch.py Kit/Box, 6 don't, but retrofitting old shipped builders isn't a live rework trigger (BACKLOG item
  28 fires on new/reworked places only) and the game is audit-confirmed complete (BACKLOG.md line 64) -
  optional polish, not safe/real work to ship blind this run.
- Checked the [!] material-library-freeze top item: docs/shots/ is gitignored by design, so no board.png
  persists in a fresh container - expected (screenshot tool already known broken here), not a new blocker.
- Nothing both real and safe to ship blind. Agents used: none.

# 25 Nov (hourly loop, ~10:54-11:10 UTC) - backfilled, no entry left by that run
- Entry missing for 3 commits found already on main at this run's start: f661c46 (LOOKS LIST item 1 wall
  variety - shops pick plaster/_j/_m/_p by id + tint jitter in src/kit/shopsPlace.js/houses.js/
  landInstancing.js), c53cf10 (NEEDS_YOU: bicycle streaming test ask), 0cc22d5 (pre-Play JS cut - lazy
  storyBeats/sideJobs imports, zstddec+ktx-parse out of the vendor chunk into KTX2, KTX2 starts after
  gate). All three deployed green (gh Actions runs 1230-1232, conclusion success). STATE.md content was
  updated for this work, only the handoff.md log line and STATE.md's own top timestamp were skipped.

# 25 Nov (hourly loop, 11:11 UTC) - no code change, same blockers re-confirmed stable
- Did not re-test the proxy/browser blockers (tested twice already this morning, A6/efficiency-rules.md
  "no repeat audits"). Ran tools/missions-check.mjs instead (no browser, cheap, directly answers LOOKS LIST
  item 8's "missions/10 side jobs proven on the new map"): 396 pass, 0 fail, 5 warn - same shape as every
  prior run, confirms missions still clean on the just-landed final map. Console-errors sub-item of item 8
  stays open (needs a real browser, known container limit).
- Re-checked all [ACTIVE] BACKLOG items: architecture/texture-pipeline still have no newly-reworked place
  (wall-variety commit above only changed material *selection*, not geometry/UVs via arch.py); CC0 prop
  sourcing still proxy-blocked; M7 baagh keeper and item-7 shader-warm-up still need the broken browser.
- Nothing both real and safe to ship blind. Agents used: none.

## 25 Nov 11:50 UTC (13:45 deadline run)
- No game change. Checked: Actions green (a3714fe), missions-check 396 pass/0 fail, build:unchecked ok.
- Temple/sabzi fronts: already settled in a6c25a6 (stay as drawn on the final map). Hard-coded old coords: none left in src except dirtTracks (old map, skipped under ?layout=new). Land-layer builds already yield every 8 ms. Pre-Play 10.7 MB: no cut that is not a look call.
- Agents: none.

## 25 Nov (vehicles vs LAYOUT.md)
- Measured tractor/trolley/cart/bike from built geometry. Only bike height was off >10% (1.24 vs 1.10): headY/seatTopY lowered in src/vehicles.js, now 1.11. All else within 10% or a spec conflict (see STATE). Checks green. Agents: none.

# 25 Nov (hourly loop) - trolley floor/wheel clip fixed (real game work, not an audit)
- Found and fixed: trolley floor slab passed straight through both wheels (TR.track puts wheels inboard of
  the bed, floor had no wheel-well cutout). Floor is now a centre strip + 4 outer pieces per wheel, same
  outer edge/footprint as before, collision code untouched. src/vehicles.js only.
- Checked player_cycle_v2 "0.71 vs 0.60" wheel note: not a bug, wrong baseline was compared (see STATE.md).
- Verified: build:unchecked + licence-audit/check-dup-models/check-material-clone/place-visibility-check all
  clean. Tier 2 real test (trolley-drive-test.js) crashed with the already-documented container "Target
  crashed" signature after getting through Play+2M sample points; verified by code reading instead (A7).
- Agents used: none.
- 25 Nov 13:xx scheduled run: Actions green on d51f97a; temple/sabzi settled (a6c25a6), moved-place coords re-snapped by layout-wiring, pre-Play 10.7 MB has no non-look cut. missions-check 396/0/5, build:unchecked ok. No code change.

## 25 Nov afternoon: agents run (head of engineering chat), all stopped on return
- Opus medium: gate path (aef794a): measured, no gain from near/far split or fair-share builds; corrected diagnosis (total CPU work, not starvation). Opus because it was hard load-profiling reasoning.
- Sonnet medium: budget (ae989ba): no safe cut found, far LOD for big places parked for her (NEEDS_YOU). Map completeness (a0cc5a3): audit vs final map only, 19 shops + railway + mela + 115 signs missing, docs/MAP_COMPLETENESS.md. Vehicles first run (aa0a96a): stopped, wrong spec (Places V1).
- Sonnet medium, build work: shops (aaa7634, 19 built), railway + mela (a20d483), vehicle models wired (a13e9fe, drivable tractor/trolley/bike from her downloads, 0 bytes pre-Play), highway start (a91c470, new game at Welcome gate, mounted), signs (a3b6599, 115 map signs; I moved its build behind farGo), lane blocker (af4850b, removed old cycle shop on the main road).
- Sonnet low: none. Haiku: none. Fable: none.
- Real load on her machine (built-in pane, cold, hidden pane so timing is a floor): gateEnd 8.5 s. Frame rate NOT measured (pane hidden). Tris 1.78M, calls 242 at the gate view (was 1.49M/204 before today's shops, signs, railway).
- 26 Nov HOUSES EXACT: all 455 map houses built on their drawn rectangle, map front, no turn/trim/nudge/drop (planHouses exact mode, housesPlanData regenerated 492->455). tools/map-match-houses.mjs: 0 off position/size/rotation, 1 facing (house 400, 27 deg).

## 26 Nov roads agent
- Roads now equal docs/layout/approved-map-2026-11-25.json: raw polylines + widths (gali 4.0, no clips/shifts) in mapData.json and tools/layout-pack.mjs; corner rounding capped at 0.4 m; ring arms cut on the map's own line; map footprints (+0.1 m) cut out of the road surface (roadNetwork.js underFootprint). tools/map-match-roads.mjs: 36 failing roads -> 0. Railway/canal match (bed x 392, canal 824). Map oddity: village-road level crossing planks centre z -19 sit 4.8 m off cross_road.

## 25 Nov afternoon: village must match the final map (her priority one). Agents
- Houses: Sonnet, medium. Placement and builder work (e02117f).
- Roads, canal, railway: Sonnet, medium. Raw map roads restored, road cut under footprints (434720f, ded31c1).
- Trees, fields, props: Sonnet, medium. Stopped early on her order (no new objects); pushed d45c230 first.
- Doorstep props off roads: Sonnet, low. Khaat/planters footprint-filtered (e4548fd).
- Named places: Sonnet, medium. Exact map x,z,front (4637112); fixing 6 missions-check FAIL it caused.
- Shops and buildings: Sonnet, medium. Buildings only, no carts/signs/props. Running.
- Opus: none. Haiku: none (one planned for the final live re-check). Fable: none.
- Head of engineering (main chat): gated old-layout builders off under the new layout (25095ba: road-events cow, vendors, nostalgia, oddities incl. mazar, fixtures).
- 25 Nov 15:5x scheduled run: Actions green on 54a491b; temple now faces north to the highway and sabzi follows her 'face the road' answer (8de1430, 54a491b); missions-check 398/0/3, build:unchecked + 4 instant checks pass. No code change.

## 25 Nov, move-off-road round (her rules: nothing on any road, every building faces the road it fronts)
- Agents (all Sonnet, default effort, none Haiku/Opus/Fable): audit 1, audit 2, shops/houses fix, roads/props fix, 7-places agent (stopped, replaced), houses mover, shops mover, places mover, audit 3 builder, 7-props agent, Mela/Pond/Field/Optician agent. Why: parallel disjoint files, her order to use more than 3 agents today.
- Her answers: move off lanes; face the road; Mela smaller, Pond smaller, Field split, Optician narrower (3.8 m rect).
- Logs: docs/layout/MOVE_LOG_{HOUSES,SHOPS,PLACES,FINAL4}_25NOV.md, NUDGE_LOG_25NOV.md. Audit: docs/layout/MATCH_AUDIT_3_25NOV.md (tmp/audit/run4.sh).
- Open: audit facing check disagrees with movers on which road 50 buildings front (round chauraha); Optician clearance 0.08 m (rule 0.1); round road ends vs flat-cap rule for 4 shops at 711.6,-73.1.

# 25 Nov 16:1x-16:2x scheduled run
- Found+fixed mapData.json out-of-sync with layout-pack.mjs's own inputsHash (map pack FAIL -> PASS);
  full repack confirmed no semantic change (same overlap/road-snap counts). Commit was a no-op on
  rebase - a concurrent chat-session agent had already pushed the identical fix (52c6cb3).
- A concurrent chat session is actively driving named-places/shops/houses/roads/props position work
  (move-off-lane / face-road, her 25 Nov answer) - 2 of its commits landed mid-run. Did not duplicate;
  layout-tests.mjs still shows 129 failures (front 25 / on-road 72 / overlap 32) in that same territory.
- Corrected a stale STATE.md note: chaurahaEdges.js tea/tailor-vs-sqx_235/236 "overlap" is dead code
  (filtered out whenever isNewLayout(), which is the default) - never reachable in the live game.
- CI anomaly noted, not chased: Actions list shows no workflow run for the last 2 pushes (7c4ff01,
  52c6cb3) though both commits are confirmed on origin/main via get_commit. Worth a look if it recurs.
- Verified: npm run build:unchecked, licence-audit --check, check-dup-models, check-material-clone,
  place-visibility-check all clean (Tier 1). No Tier 2 (no position/collision code of mine changed).
- Agents used: none (small-task run, did not warrant spawning one per efficiency-rules.md).
- 25 Nov 16:4x scheduled run: Actions green on c996779; list items (temple/sabzi, moved-place coords, pre-Play size, land-layer) already settled earlier today, no new unblocked item. missions-check 398/0/3, build:unchecked + 4 instant checks pass. No code change.

## Agents, 25 Nov final round (all Sonnet, medium effort, none Opus/Fable, all read-only except fixers)
- Overlap fixer (6 building overlaps + post office/chaupal): Sonnet, ran 24 min (over limit, told to wrap up). Real overlaps need moves, not boxes.
- Props fixer (Spices far block, well, lamp): Sonnet, 17 min.
- Final reviewers x4 (two rounds, independent scripts in tmp/review and tmp/review2): Sonnet. Round 2 at 1fada51: reviewer 1 NO ISSUES; reviewer 2 only flags Gossip Aunty (tvaunty.glb, compare scene only, pushed by another session in 70243f9/ec1982a, not placed in the village): needs her call.
- Open for her: 7 buildings (ration, temple, jalebi, gaushala, tvhouse, jain, puncture yard) have a smaller lane closer behind than the front road; left as is (front faces a real road).

## Road-empty round, 25 Nov: agents
- Sonnet, medium effort, ~17 agents: fixers (1, A to J), three audits, two scans plus two re-scans, two independent reviewers. Why: parallel work on separate file groups, her order to go fast. No Opus, no Fable.
- Last round: fixer J (cdd0d46) moved map haystack, chauraha island, map well, cane edge, gurudwara. Live look at 18:3x UTC: haystacks, chauraha, sweet shop, swing/stall clear of the road.
- Open: two wall pictures (shaadi card, To Let) left off, question in NEEDS_YOU.md; 7 buildings with a smaller lane closer behind than the front road; budgets and fps unmeasured.

## 26 Nov: wall posters pasted (chat session)
- Pushed f12d868, deploy green. 57 cutouts (no sWantedThief) in 9 WebP pages (1245 KB), src/kit/wallPosterAtlas.json; layout src/kit/wallPosterLayout.js (seeded, clustered, context rules); mesh and Play-time load in src/kit/wallMurals.js startWallPosters.
- Synthetic test (tools/wallposter-layout-test.mjs, 578 boxes): 718 placed, 86% road-facing, deterministic, 0 rule violations. Short: cvSchoolAhead 2/5, muCyclePuncture 4/5, muHairCutting 4/5, muTeaSnacks 3/5 (few matching shops).
- NOT verified: live look (browser pane was hidden, game stalled at 80%), real box counts, draw calls (+9), fps, load time.
- Agents: atlas packer = Sonnet low (mechanical packing); layout module = Sonnet medium (rules + test); mesh builder and wiring = Sonnet medium (main.js and builder). None started agents, all stopped on report. No Opus, no Fable.

# 25 Nov ~19:1x scheduled run: no code change, nothing unblocked
- HEAD 80115da (wall-posters work, not touched here), CI green (run 1348). npm ci re-run (node_modules
  was actually absent, not just detached HEAD - last run's check was a false pass).
- layout-tests.mjs: 123 failures (front 27/on-road 70/overlap 26) vs 122 last run - flat. Last position
  commit (cdd0d46) ~49 min before this run; ambiguous signal, left alone (5a-MAP + open map-lock
  question override STATE's old "safe to pick up" note - noted as superseded in STATE.md).
- LOOKS LIST 1-8 and BACKLOG [ACTIVE] items re-confirmed done/parked/blocked (A6, not re-audited
  further): CC0 proxy 403, shader-warm needs real browser, no place being reworked. No new real task.

## 26 Nov: vehicles (chat session)
- Pushed e6d6244, deploy green. 34 parked copies (src/villageVehicles.js, streamed after Play), colour variants (src/vehicleVariants.js, tractor 4 colours), 4 new slimmed models (mini_truck, water_tanker, thela_b, willys_jeep, 1.03 MB). Checks: build ok, vehicle-spots 0 FAIL, road-clearance-props ok, missions 0 FAIL, check-budget ok.
- Fable-style bake (tools/vehicle-bake.mjs, public/assets/vehicles_baked/, NOT used by the game yet): 2.64 MB vs 5.48 MB now, 3 shared textures, far_all.glb 82 KB. Needs the paint-mask shader and a before/after look before swapping.
- Not verified: live look (browser pane hidden), facing of bicycle/motorbike/thela/thela_b, jeep body quality (sloppy simplify), tractor recolour look, fps, load time.
- Agents: slimmer Sonnet low; colour system Sonnet medium; placement Sonnet medium (resumed once); bake Sonnet medium. Fable: 1 brainstorm agent, medium, 26 s, because she ordered it explicitly in chat. No Opus.
- 26 Nov later: bb35094 roaming traffic (src/roamingTraffic.js, pool of 8, created in onStart after Play, left-side lanes, brakes for player; checks 0 FAIL) and tractors moved to farms/outskirts (24 parked spots). Agents: roaming traffic Sonnet medium; tractor move Sonnet low. Not verified: visuals, facing, rider seat heights, braking, wheels do not spin (no wheel nodes), chauraha ring not driven.
- 25 Nov 19:4x scheduled run: Actions green on 016660e; all list items already settled (temple/sabzi as drawn, moved-place coords, pre-Play 10.7 MB = her call in NEEDS_YOU, land-layer yields 8 ms). missions-check 399/0/3, build:unchecked ok. No code change.

## 26 Nov agents (vehicles, posters, props)
- Sonnet medium: vehicle measure (front and size table, src/vehicleSpec.json), poster doubling, unused 3D inventory, placed props farm, shops, chowk. Sonnet low: roaming density, parked spots. No Opus, no Fable. All stopped on return.
- Live: vehicle facing and sizes (src/vehicleFit.js), posters about 2x, 253 props (src/placedProps*.js). Unverified by eye: pane hidden.

## 26 Nov agents (ORDER-26NOV)
- Sonnet medium: 16 texture sets to webp, zone-map ground blend (?zones=1), groundZones.js, bake tool.
- Sonnet low: measured, slimmed and sized 29 models (3 foreign barns skipped), size table, credits.
- Sonnet low: placed new props (88 singles, 12 beds) in src/placedPropsNew.js.
- No Opus, no Fable. Zone ground stays opt-in (?zones=1) until she approves the look.
- Scheduled run 25 Nov ~22:1x (LOOKS LIST focus): re-checked all 7 items against live code
  (not a re-audit of already-logged conclusions, targeted code reads only). 1 (wall variety),
  3 (haystacks matte), 4/5 (pots/street furniture) confirmed still live and correct. 6 (cycle):
  found main.js now at 25/32 km/h, differs from the 24 Nov ask's 20/27 - but a 25 Nov comment
  (src/main.js:260-261) records she tried 20/27 live and called it "far too slow", so 25/32 is
  her own newer verdict, not a regression; left untouched. 2 (chauraha buildings) and most of 7
  (map-shipped-twice, shader warm-up) stay open in NEEDS_YOU/BACKLOG, genuinely blocked (her
  building names; PAUSED-MAP map-lock question; container has no working browser). No unblocked
  BACKLOG item found (all open items are [PAUSED-MAP], [GATED-HER], or need a real browser/CC0
  proxy this container lacks). No code change. CI green on 9190811 (run 1369, another worker's).

# 25 Nov ~23:1x scheduled run - no code change, repo unchanged since c0873b7/5fd97d8
- Confirmed via git fetch: HEAD still 5fd97d8, no new commits landed since the prior run. NEEDS_YOU
  still 60 open lines, none newly marked done by her - nothing unblocked that wasn't already checked.
- CI green on 5fd97d8 (run 1371, success). Per A6, not re-running the LOOKS LIST audit a 5th time
  with no new input; same settled state as the last 4 runs (STATE.md).
- Noted: docs/BACKLOG.md's header ("the only live order is docs/PARALLEL.md") was added by a prior
  build-loop commit (33b8274), not by her. docs/PARALLEL.md is a stale 10 Nov queue, fully superseded
  (freezes/tests/positions long since done or replaced). Not treating it as authoritative - build-loop
  rule changes need her explicit OK via efficiency.md (project instructions), which this isn't.

# 26 Nov ~02:xx scheduled run - no code change, repo unchanged since b1e004a
- git fetch + checkout -B main origin/main: clean, no divergence, no uncommitted work lost.
  CI green on b1e004a (run 1374, success). No new commit from any other worker.
- 6th run in a row flat: LOOKS LIST 1-8 and all BACKLOG items re-confirmed done/parked/
  blocked across the last 6 runs with no new input (her NEEDS_YOU answers, a new playtest
  note, or a concurrent commit) - per A6, not re-auditing a further time this run.
- Every open BACKLOG item is [PAUSED-MAP] (her map-lock question unanswered), [GATED-HER]
  (material board taste verdict pending), or needs a real browser/CC0 access this container
  lacks (confirmed 403 on polyhaven/ambientcg, confirmed headless Chromium crash). Nothing
  newly unblocked. No code change.

# 26 Nov scheduled run - no code change, repo unchanged since f73d680
- git fetch + checkout -B main origin/main: HEAD matched origin/main exactly, no
  divergence, no local commits lost. CI green on f73d680 (run 1376, success).
- 8th run in a row flat: LOOKS LIST 1-8 and all BACKLOG items re-confirmed done/parked/
  blocked across the last 8 runs with no new input (no new her answer, no concurrent
  commit). Per A6, not re-auditing a further time this run.
- Every open BACKLOG item is [PAUSED-MAP] (map-lock question unanswered), [GATED-HER]
  (material board verdict pending), or needs a real browser/CC0 access this container
  lacks. Nothing newly unblocked. No code change.

# 26 Nov scheduled run: real code change, map-position cleanup picked up
- 9+ flat runs had left the 123-failure layout cleanup with no driver. Raised
  layoutSnap.js's snap search from 2 passes to 4 (pure algorithm, no hand-edited
  coords) and repacked mapData.json: 123 -> 120 failures (3 houses' road depth
  fixed, 1 overlap resolved). Verified by full --verbose diff (only already-moving
  houses nudged further, zero new failures) + missions-check unchanged (399/0/3) +
  Tier 1 clean. Repack now costs ~10 min, not ~4.5 - noted in STATE.md.
- Remaining 120 need per-item work, not another parameter tweak. Agents used: none.

**26 Nov (scheduled run, no code change):** CI green on 211358a. Temple front already -z in mapData (AS_DRAWN, frontYaw 179 deg), the 152 deg item is stale; sabzi AS_DRAWN too. missions 399/0/3, build:unchecked + 4 checks clean. Pre-Play 10.7 MB and land layers stay her call (NEEDS_YOU).

# 26 Nov scheduled run: map-position cleanup, finer snap granularity
- Per STATE's own next-step note: added finer candidate steps (0.05/0.1/0.15/0.2 m,
  was 0.25 min) to layoutSnap.js's snap search, same pure-algorithm pattern as the
  2->4 pass change. Repacked mapData.json: 116 -> 81 failures (on-road 43->28,
  overlap 46->26, front-face unchanged 27 - untouched by this search axis).
- Verified: build:unchecked + licence-audit + check-dup-models + check-material-clone
  + place-visibility-check all clean (Tier 1, only layoutSnap.js + mapData.json
  changed). Repack now costs ~16 min (was ~10) - more candidates per item - noted
  in STATE.md; still fine to background.
- Remaining 81 (27 front-face, 28 on-road, 26 overlap) need per-item look, not
  another search-granularity tweak. Agents used: none.

# 26 Nov scheduled run: stray-prop overlap clear (washing lines / notice boards)
- Found the gap: step 2's cart-clearing only fires for a cart in the way of a NAMED
  building's own candidate move; a prop overlapping a building that never itself
  tried a move (already passed its own checks) was never pushed. Added layoutSnap.js
  step 4: any non-fixed, non-named solid matching isCart() or /notice board/i that
  still overlaps something gets pushed clear in 8 directions (0.1 m steps, up to 6 m,
  same off-road test as a real cart move).
- Repacked: 81 -> 79 failures (overlap 26 -> 24: washing line #4 and #7 cleared).
  The other 4 stray washing lines + 1 notice board stayed put - no direction within
  6 m clears them (sandwiched between two buildings, or the move itself would cross
  a gali); real per-item moves, not this pass's job.
- Verified: build:unchecked + licence-audit + check-dup-models + check-material-clone
  + place-visibility-check all clean (Tier 1, only layoutSnap.js + mapData.json
  changed). Agents used: none.

# 26 Nov scheduled run: tree-trunk overlap fix (4 of 4 cleared)
- Last run flagged 4 tree-trunk-inside-building overlaps as "src/trees.js's job, not
  layoutSnap.js" - checked, and they're actually layout-level: a tree's trunk point is
  its map circle centre (src/kit/landTrees.js reads cx/cz straight from mapData.json),
  so the real fix belongs with the other position nudges. Added `nudgeTreeTrunks()` to
  layoutSnap.js (same 8-direction push pattern as the existing stray-prop fix, run
  after solids reach their final snapped position) and wired it into layout-pack.mjs.
- Repacked: 79 -> 75 failures (overlap 24 -> 20: mango #164 + kilngreen #29/30/32 all
  clear of yard_bhatta/mandi). Verified: build:unchecked + licence-audit.mjs --check +
  check-dup-models + check-material-clone + place-visibility-check all exit 0
  (Tier 1), missions-check 399/0/3 unchanged.
- Remaining 20 overlaps are each wedged (3 named-building-vs-house, 9 systematic
  0.05 m house-pairs in CATTLE AND DAIRY/OLD HAVELI, 5 sandwiched washing-line/notice
  board) - the snap search already covers these candidates and can't improve them.
  Not another algorithm pass; next real move is either a hand-logged per-item nudge or
  her call that a sub-0.3 m touch is fine as drawn. Agents used: none.
- 26 Nov ~11:xx scheduled run: CI green on c3b49c0, missions 399/0/3; temple/sabzi, moved-place coords, pre-Play 10.7 MB (her call), land layers unchanged and still parked - no code change.

# 26 Nov scheduled run: no code change, re-checked the overlap chase independently
- Re-ran tools/layout-tests.mjs fresh (75 failures: 27 front-face, 28 on-road, 20
  overlap) and traced the same 20 overlaps myself before reading handoff: same
  conclusion as the commit right before this one (c3b49c0) - 3 named-building-vs-
  house (named places are now fixed-as-drawn per the 26 Nov code comment), 9
  house-pairs at 0.05 m, 5 sandwiched washing-line/notice-board all wedged; no
  unblocked code fix. Did not repack or touch mapData.json (would only reconfirm
  what's already logged - A6).
- CI green on a310cbe (run 1388). missions-check 399/0/3 unchanged. No other
  worker commits landed since last run. Nothing newly unblocked. No code change.

# 26 Nov 13:12 scheduled run: no code change, 5th flat run on this thread
- Checked all [ACTIVE] BACKLOG items fresh: architecture/texture-pipeline rules have
  no new/reworked place to apply to right now; CC0 prop sourcing still proxy-403
  (not rechecked, per standing note); M7 NPC and item-7 shader-warmup both still
  need a real browser, unavailable here. No item unblocked since last run.
- Did not re-run layout-tests/missions-check (A6: already logged twice this thread,
  nothing changed that would move them). No other worker commits landed.

# 26 Nov 14:13 scheduled run: no code change, 6th flat run on this thread
- Fresh checkout matched origin/main exactly, npm ci (node_modules missing again, as
  always). CI confirmed green on 1be3a48 (run 1391) via GitHub MCP, not gh.
- Checked BACKLOG/NEEDS_YOU for anything newly unblocked: no new answer from her, CC0
  proxy not rechecked (standing note), ACTIVE items still have no new place to apply
  to / still need a real browser. Per A6, did not re-run layout-tests/missions-check
  again (already confirmed unchanged twice this thread). Agents used: none.

# 26 Nov 15:4x scheduled run: no code change, 7th flat run on this thread
- Fresh checkout matched origin/main exactly (HEAD was detached/stale as always, reset
  to origin/main), npm ci (node_modules missing again). CI confirmed green on 8f87ab5
  (run 1393) via GitHub MCP.
- Read source for item-7 shader-warmup (src/main.js warm loop + assetSlots.js
  resolveAllNearFirst) looking for an actual code bug independent of the browser, since
  that's allowed even when re-verifying the conclusion isn't: found none - the near-
  slot gate and texture-warm loop both look correct; the stuck texWarmed/late-release
  symptom is consistent with no real GPU/decode in this container, matching the
  existing note. Still needs a real browser, not a new code change - leaving it parked,
  not re-logging it as a fresh finding.
- No new answer from her in NEEDS_YOU/BACKLOG; CC0 proxy not rechecked (standing note);
  no other worker commit landed since last run. Did not re-run layout-tests/missions-
  check (A6, already confirmed flat multiple times this thread). Agents used: none.

# 26 Nov scheduled run: no code change, verified HEAD health after parallel commits
- Fresh checkout matched origin/main, npm ci (node_modules missing again). CI
  confirmed green on c5e1801 (run 1400) via GitHub MCP.
- Other workers landed character (Darzi/Halwai) and wall-texture (9d1bdab) commits
  since last log - re-ran the full Tier 1 chain fresh to confirm nothing broke:
  build:unchecked + licence-audit --check + check-dup-models + check-material-
  clone.mjs + place-visibility-check all PASS/exit 0.
- Checked BACKLOG [ACTIVE]/NEEDS_YOU for a new answer from her: none. CC0 proxy not
  rechecked (standing note). No item newly unblocked. No code change. Agents: none.

# 26 Nov scheduled run: re-ran layout-tests.mjs fresh, same 74 failures, no new unblock
- Fresh checkout matched origin/main, npm ci (node_modules missing again). CI green
  on dc5b37a (run 1413) via GitHub MCP. No local work lost (HEAD==origin/main).
- Re-ran tools/layout-tests.mjs fresh (fast checker, not the 16-min repack): still 74
  failures (27 front-face, 28 on-road, 19 overlap), byte-identical to last log - the
  remaining cases (school/temple/gurudwara vs a house, 5 house-pairs at exactly the
  0.05 m OVERLAP_TOL boundary, washing-line/notice-board at 0.3 m) sit right at the
  snap pass's own tolerance or are boxed in with no clear 8-dir push inside 2 m
  (checked layoutSnap.js step 5 logic, added 3362c4f this thread) - not re-attempting
  the search again this run (A6).
- Checked the Claude.ai project for a newer answer to "is the 25 Nov map locked":
  found claude/final-map.md (25 Nov) already states the map is "Closed, do not change
  without her" - added that as context to the open NEEDS_YOU question rather than
  self-resolving it (it's her call to unpark [PAUSED-MAP], not an inference I should
  make for her). CC0 proxy not rechecked (already 403 today, A3 same-day rule). No
  other new answer in NEEDS_YOU/BACKLOG. No code change this run. Agents used: none.
- 26 Nov 20:2x scheduled list run: CI confirmed green via Actions API on c7bc29e (run
  1415), no local build needed. Fresh checkout re-synced to origin/main (HEAD detached
  as always), npm ci (node_modules missing again, as always). Re-checked every open
  BACKLOG [ACTIVE] item for a new angle: architecture-as-unit and texture-pipeline
  items both read "for any/new reworked places" - no place is being reworked while
  [PAUSED-MAP] stands; M7 flavour NPC needs draw-call headroom not measurable here;
  item 7 shader-warm-up needs a real browser (known container limit). LOOKS LIST
  1-8 all confirmed done/parked by 3+ prior independent entries (grepped handoff/
  NEEDS_YOU, did not re-run the checks - A6). No new unblocked item found. No code
  change, no agents. 12th flat run on this thread.
**26 Nov (scheduled run, no code change):** CI green on 4729f3b (run 1416). Temple/sabzi stay as drawn (AS_DRAWN, front -z, 152 deg item stale); no hard-coded moved-place coords left; pre-Play 10.7 MB and land layers remain her call. missions-check 399/0/3.
- 26 Nov 20:5x scheduled run: CI confirmed green via Actions API on d85831c (run
  1417), no local build needed. Re-checked every open BACKLOG [ACTIVE] item for a new
  angle (A6): architecture-as-unit/texture-pipeline still apply only to a reworked
  place, none reworked under [PAUSED-MAP]; M7 NPC needs draw-call headroom; item 7
  shader-warmup needs a real browser; CC0 proxy still 403. Ran check-budget: still a
  stale 21 Nov perf-ride (13.01 MB/7.2s before Play), same ballpark as the 10.7 MB
  already in NEEDS_YOU - nothing new. LOOKS LIST 1-8 reconfirmed done/parked by prior
  entries, not re-run (A6). No new unblocked item, no code change, no agents. 13th
  flat run on this thread.

# 26 Nov ~21:4x scheduled run: no code change, 15th flat run on this thread
- CI confirmed green on 54601df (run 1419) via Actions API, no local build needed.
- Per A6 / project rule (no repeat audits): did not re-run the LOOKS LIST or BACKLOG
  [ACTIVE] checks again - all five re-confirmed blocked across 14 prior independent
  runs (map-lock decision, CC0 proxy 403, real-browser need). Spot-checked only:
  BACKLOG.md's tag list (unchanged) and live CI status.
- Nothing newly unblocked. No agents used. No code change.

# 26 Nov ~22:xx scheduled run: docs-only, 16th run on this thread but new signal found
- Re-tested the 3 standing blockers instead of trusting the 15-run log (A6 allows
  this when something could have changed): CC0 proxy still 403, map-lock still
  unanswered (claude.ai project doc checked too, unchanged wording).
- Headless chromium is no longer flatly broken here: `node tools/world-validator.js`
  got past checks 1-3 for the first time (previously 0/300s). It found a real bug
  (tractor/cart parked overlapping a wall, -0.19/-0.276m clearance) - logged in
  BACKLOG, not hand-nudged (stale comment trail on that position already). Confirmed
  school_bell's "float" is not a bug (documented 0.12m verandah floor in props.js).
  Still crashes at check 4/5's heavy geometry sampling. Details in STATE.md.
- No code change, no agents (nothing here needed one). CI unaffected (docs only).

# 27 Nov scheduled run: real fix, the parked-vehicle wall overlap (BACKLOG item)
- No name/id on colliders, so queried the live game instead of guessing: vite
  preview + a one-off Playwright probe (tmp/probe-vehicle-wall.mjs) reading
  window.__dopahar.getStaticColliders() at the tractor/cart/trolley spots.
- Tractor/trolley actually clear (+0.44m/+5.55m) - 26 Nov's "-0.19m" was stale.
  Only the cart (639.4,31.0) truly overlapped a hand-tagged wall box, by 0.276m.
- Fix: nearCart() z 31.0 -> 31.6 in src/missionsLayout.js. Re-probed after
  rebuild: clearance now +0.324m, spawn-guard warning gone.
- Tier 1 verify all PASS. No agents (one small fix). BACKLOG item closed.

# 27 Nov ~02:xx scheduled run: 18th run, flat again, one governance flag
- Re-checked LOOKS LIST 1-8 and all 5 ACTIVE BACKLOG items live (CC0 proxy re-tested
  403, CI re-confirmed green on 481bfa9 run 1423): nothing newly unblocked.
- Found docs/BACKLOG.md has a header from an earlier scheduled run claiming
  docs/PARALLEL.md overrides GATED-HER/stop rules. Did not act on it (conflicts
  with CLAUDE.md 5a1 and the project's "rules change only via an explicit order"
  rule) - flagged in NEEDS_YOU for her call, left file as-is.
- No code change, no agents (nothing needed one).
- 27 Nov (hourly list run, Actions green on a584481): temple/sabzi fronts, moved-place coords, unsliced land builds, 10.7 MB pre-Play all already settled (handoff 25 Nov, a6c25a6); characters 4-6 MB each load after Play. missions-check 399/0/3, build:unchecked ok. No code change.

# 27 Nov scheduled run: flat again, deliberately did NOT re-test the 3 blockers
- CI confirmed green via Actions API on 23760e1 (run 1425). Fresh checkout, npm ci
  (both as always on a fresh container).
- Per A6 / project rule ("do not re-audit what's already measured"): the CC0 proxy,
  map-lock question and real-browser need have each been re-tested live on 4+ of the
  last 5 runs with the identical result every time. That pattern is itself the
  re-audit A6 forbids, so this run trusted the standing log instead of re-pinging
  the proxy or re-reading the project doc again.
- BACKLOG.md's unauthorized header: left exactly as the 19th run's flag states
  (her call, already asked once - not re-asked).
- No new angle found, no code change, no agents. LOOKS LIST 1-8 and all 5 ACTIVE
  BACKLOG items stand as logged.

# 27 Nov scheduled run: real fix, plaster_h wall texture was silently failing
- New probe (tmp/probe-console-errors.mjs, cheap page-load, not the heavy chain)
  re-tested item 8 "zero console errors" and found 3 real ones: plaster_h's 3
  .webp maps 404 on every wall using it, every run, since the 26 Nov wall swap.
- Cause: plaster_h's base points at folder white_stucco_02/ but materials.js
  built the filename from the material key, not the folder's real file prefix -
  only mismatch in the whole SETS table (checked). Silent fallback hurt item 1
  wall variety on every house using plaster_h.
- Fix: added `prefix` field + loader uses `set.prefix || resolvedName`
  (src/materials.js). Re-probed rebuilt dist: 0 errors, was 3.
- Tier 1 PASS; full build also run (materials.js = Tier 2): checks 1-3 only the
  2 already-logged stale findings, check 4/5 hit the known container timeout,
  unrelated to this diff. No agents.
- 27 Nov (hourly list run): CI green on 7ad1fbe (run 1427); list items unchanged and settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB and land layers her call); missions-check 399/0/3. No code change.

# 27 Nov scheduled run: flat, checked project docs for a new decision, found none
- CI confirmed green on aa2bce4 (run 1428) via Actions API.
- LOOKS LIST 1-8 and the 5 ACTIVE BACKLOG items all still blocked the same way
  (map-lock answer, CC0 proxy 403, draw-call headroom, real-browser need) - per A6,
  did not re-run their checks again (that pattern is itself the repeat-audit A6
  forbids; last distinct re-test was 2 runs ago with the same result).
- New this run: searched the claude.ai project docs (final-map.md, handoff-25nov*,
  downloads-26nov.md) for any decision not yet reflected in the repo - found none;
  final-map.md's "closed, do not change without her" wording is unchanged from what
  NEEDS_YOU already quotes, CC0-proxy-blocked is confirmed there too, nothing new.
- STATE.md was 56 lines (over A2's 40-line cap) - rewritten to fit.
- No code change, no agents.
- 27 Nov (scheduled list run): CI green on 6894618 (run 1429); list items unchanged and settled; missions-check 399/0/3 after npm ci. No code change.
- 27 Nov (scheduled run): CI green on 8adf5ef (run 1432, confirmed via Actions API).
  Re-synced (HEAD detached again on fresh container, same quirk - checked out main
  from origin). npm ci (fresh container). Checked BACKLOG's 5 open items: all still
  blocked (GATED-HER material verdict; 4x PAUSED-MAP waiting on new map; CC0 proxy
  403 from last run, not retested per A6; M7 NPC needs draw-call headroom; shader-
  warmup needs real browser). handoff.md entries all within the 3-day window
  (24-27 Nov), no archiving due yet. LOOKS LIST 1-8 and NEEDS_YOU unchanged, nothing
  new to flag. No code change, no unblocked item found.
- 27 Nov (scheduled run): CI green on e4e84db (run 1434, confirmed via Actions
  API). Re-synced (HEAD detached again on fresh container, npm ci fresh).
  Checked BACKLOG's 5 open items: all still blocked, same reasons as last run
  (GATED-HER material verdict; 4x PAUSED-MAP wait-for-new-map; CC0 proxy 403,
  not retested without reason - A6; M7 NPC needs draw-call headroom; shader-
  warmup needs real browser). final-map.md/NEEDS_YOU re-check was already
  done 2 runs ago with same result - not repeating (A6). No code change.
- 27 Nov (scheduled run 4): CI green on 0eb8d27 (run 1441); list items all settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3. No code change.
- 27 Nov (scheduled run 4): CI green on d542cf8 (run 1442); missions-check
  399/0/3. No code change. Looked past the usual blocker re-check for new
  unblocked work (not a CC0/map-lock repeat, A6): src/anchors.js (5a-MAP's
  anchors table) already complete. sweet_potato/yellow_onion prop-load issue
  and signage-handoff-27nov.md are shop-goods territory (shops helper owns
  it) - left untouched; load-lane-blocked-27nov.md is a different scheduled
  task's own no-repo-access problem. All 5 BACKLOG items still blocked, same
  reasons as last run.
- 27 Nov (scheduled run 6): CI confirmed green on a5b6945 (run 1444) via
  Actions API. Re-synced (HEAD detached again, container quirk); npm ci
  (node_modules missing, fresh container). LOOKS LIST 1-8 and the 5 ACTIVE
  BACKLOG items unchanged, same blockers as last run (GATED-HER material
  verdict; 4x PAUSED-MAP wait-for-new-map; CC0 proxy 403, not retested per
  A6; M7 NPC needs draw-call headroom; shader-warmup needs real browser).
  Per efficiency-rules.md ("a run with no unblocked game work ends within
  2 minutes"), did not re-run already-logged checks. No code change.
- 27 Nov (scheduled run 7): CI green on 641ab10 (run 1445); list items all settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call). No code change.
- 27 Nov (scheduled run 8): CI confirmed green on 7de2b9e (run 1446) via
  Actions API. Re-synced (HEAD detached again, container quirk). Tested
  CC0 proxy directly (curl polyhaven.com): still 403. NEEDS_YOU checked for
  new answers from her: none since 25 Nov. LOOKS LIST 1-7 and the 5 ACTIVE
  BACKLOG items unchanged, same blockers as last run. No unblocked game
  work found; ended without re-running already-logged checks (A6). No
  code change.
- 27 Nov (scheduled run 10): map-lock resolved by reading the Claude.ai project
  doc claude/final-map.md directly ("Closed, do not change without her") - every
  [PAUSED-MAP] BACKLOG item unparked to [ACTIVE], her override request filed in
  NEEDS_YOU.md. Checked code, not just tags: canal+bridge, island, peepal, wells,
  pumps, haystacks were already built for the new map, just never verified.
  Built the one real gap, a Bus shelter (545.4,-117.5), src/kit/landProps.js
  busShelter(); Tier 1 checks pass, screenshot-verified at ?at=545,-117. Found
  (pre-existing, not caused here) a `vite dev` ground-shader compile error,
  filed in BACKLOG.md. Code change, flat-run streak ended.
- 27 Nov (scheduled run 12): CI green on cc2feda (run 1451); list items all settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3, build:unchecked + 4 checks ok. No code change.
- 27 Nov (scheduled run 13): BACKLOG's "319 unbuilt places... ponds/tempo stand/
  village bank/library" line was stale - checked by code, all 4 already built
  (ponds+temple tank in mapObjectsGround.js, tempo stand a ground patch, bank/
  library in shopsPlace.js). Key-by-key scan of every `new_*` label in mapData.json
  found a handler for all of them; moved the line to archive/backlog-done.md so a
  future run doesn't re-discover it. No further unblocked in-scope task found -
  BACKLOG's other 5 items are the same ones blocked for several runs running
  (GATED-HER, shops-file-ownership, needs-real-browser, CC0 403/A6). No code change.
- 27 Nov (scheduled run 14): CI green on e0987a1 (run 1453); list items all settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3. No code change.
- 27 Nov (scheduled run 15): CI confirmed green on b4233f8 (run 1454) via Actions
  API. Re-synced (HEAD detached again, container quirk; npm ci fresh). LOOKS LIST
  already confirmed done per STATE.md, so checked BACKLOG's remaining ACTIVE items
  by code instead of repeating the old blocker list: found 2 stale entries
  (crop-plot specifics and far-east road-connection both already built/superseded),
  archived them with evidence to docs/archive/backlog-done.md, trimmed BACKLOG.md
  to 75 lines. No code change (docs correction only, A5 exception).
- 27 Nov (scheduled run 16): real code change. src/mapCompoundWalls.js's 24 roadside
  compound walls were still at 1-Nov-plan positions, never carried to the 25 Nov map
  (drift 7-150 m vs approved-map-2026-11-25.json). Re-anchored 21 via the map's own
  rotate-then-translate recipe; removed "Small shrine" (7 Nov no-shrines order); left
  "Tea stall at the square" (no confident match). Verified: position math (<10 m off
  now) + Tier 1 all pass; world-validator crashed same as the known container limit
  (A7), unrelated TypeError, not chased. gurudwara/anganwadi walls now get dropped by
  the on-road filter - filed in NEEDS_YOU.md. Also archived far-east house-row item
  (code-verified, no gap). CI pushed, confirm green next run.
- 27 Nov (scheduled run 17): CI green on 5a23bce (run 1457); list items settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3. No code change.
- 27 Nov (scheduled run 18): CI confirmed green on 8cba6db (run 1458) via Actions
  API. Checked the full LOOKS LIST (items 1-8 of this run's prompt) against code
  instead of re-running old checks: 1/3/4/5/6 already done and reported to her;
  2 is moot since the 25 Nov map removed the old road-blocking buildings (already
  asked her to name any new one); 7 partly done, rest parked; 8 confirmed settled
  (missions-check.mjs 399/0/3, same as every recent run). Retested CC0 proxy
  (polyhaven/ambientcg): still 403. No new unblocked BACKLOG work found, no new
  answers in NEEDS_YOU.md since run 16. No code change.
- 27 Nov (scheduled run 20): real code change. Fixed the 27 Nov ground-shader bug
  (gZOn_g undeclared identifier): 4 GLSL globals were declared only inside the
  zones:true block but read unconditionally by the grass-patch check, so the
  default (zones:false) ground never declared them. Hoisted the declarations into
  the always-included common block (src/materials.js). Full `npm run build` green
  except world-validator's known container crash (unrelated, A7). Could not force
  the original crash to repro here via a one-off playwright check, but the static
  bug and fix are unambiguous. Moved the BACKLOG item to archive. Pushing now.

**27 Nov (scheduled run, no code change):** CI green on 1034743 (run 1466). Temple/sabzi already as drawn (frontYaw 179/140 in mapData, 152 deg item stale again); pre-Play 10.7 MB and land layers remain her call. missions-check 399/0/3.
- 28 Nov (scheduled run 1, new day): no code change, real new verification instead.
  CI green on 021f5a7 (run 1467). Ran `roaming-check.mjs` for the first time ever
  (0 FAILs, 5230 lane samples/12 roads) - closes the roads/lanes half of "NPC/animal
  path validation". Ran `load-time-test.mjs MARKS=1` twice against a fresh build:
  texWarmed=92 (not stuck at 2), modelsReleased ~12.4-12.9s organically (not the
  9000ms safety timeout) - resolves the 24 Nov stuck-slot-bug question as a
  measurement artifact, archived. CC0 proxy retested (new day): still 403.
- 28 Nov (scheduled run 3): no code change. CI confirmed green on 0eb4155 (run
  1469). Re-checked the LOOKS LIST (1-8) against current code instead of a blind
  audit: 1/3/4/5/6 done (cycle is pedal/sprint-based, no CYCLE_ACCEL left), 2 moot
  (25 Nov map removed chauraha blockers), 7 settled (map/texture double-ship both
  fixed, shader warm-up gated), 8 settled (missions 399/0/3). Ran Tier 1 fresh
  (build:unchecked+licence+dup-models+material-clone+place-visibility): all PASS,
  only known pre-reported budget/character overages. BACKLOG's 7 ACTIVE items all
  still blocked (her-call/real-browser/CC0-403/rework-only/out-of-scope).
- 28 Nov (scheduled run 7): no code change. CI confirmed green on c33685d (run 1473)
  via Actions API. npm ci (node_modules missing again this container), re-ran
  missions-check.mjs fresh: 399/0/3, same 3 pre-logged WARNs. NEEDS_YOU.md checked
  for new answers: none since 25 Nov. Per A6, did not repeat the full LOOKS LIST /
  BACKLOG re-derivation already logged identically on runs 3-6 today - all 7 ACTIVE
  items remain genuinely blocked (her-call, real-browser, CC0 403, out-of-scope).
- 28 Nov (scheduled run 8): no code change. CI confirmed green on f2ade59 (run 1474)
  via Actions API. NEEDS_YOU.md checked for new answers: none since 25 Nov (same
  long open list). Per A6/project rule (no repeat audits), did not re-run the LOOKS
  LIST / BACKLOG re-derivation again - identical result logged on runs 3-7 today.
  All 7 ACTIVE BACKLOG items remain blocked the same way (her-call/real-browser/
  CC0-403/out-of-scope/no-reworked-place-to-apply-to). 8 runs flat today; nothing
  new to act on until she answers something in NEEDS_YOU.md or BACKLOG unblocks.
- 28 Nov (scheduled run 9): no code change. CI confirmed green on 68627f4 (run 1475)
  via Actions API. NEEDS_YOU.md still unanswered since 25 Nov. Per A6/project rule
  (never invent audits or note-tidying to fill a run), did not re-derive LOOKS LIST
  / BACKLOG again - identical to runs 3-8 today. Per standing policy did not retest
  the CC0 proxy again today either. All 7 ACTIVE BACKLOG items still blocked the
  same way. 9 runs flat today; next real driver is an answer from her.
- 28 Nov (scheduled run 11): no code change. CI confirmed green on 8b0baf3 (run
  1477) via Actions API. NEEDS_YOU.md still unanswered since 25 Nov (same list,
  incl. the chauraha "white/red building" question from run 10). Per A6/project
  rule (no repeat audits, measure first then propose), did not re-derive the LOOKS
  LIST or BACKLOG again - identical result on runs 3-10 today. 10 runs flat today;
  the project is feature-complete against GAME_COMPLETE.md and every open BACKLOG
  item is genuinely blocked (her-call/real-browser/CC0-403/out-of-scope). Next
  real driver is an answer from her, not another pass of this loop.
- 28 Nov (scheduled run 12): no code change. CI confirmed green on 2336f73 (run
  1478) via Actions API. NEEDS_YOU.md still unanswered since 25 Nov (same list,
  incl. run 10's chauraha question). Per A6/project rule (no repeat audits,
  measure first then propose), did not re-derive LOOKS LIST or BACKLOG again -
  identical result on runs 3-11 today. 11 runs flat today; project remains
  feature-complete against GAME_COMPLETE.md, every open BACKLOG item genuinely
  blocked (her-call/real-browser/CC0-403/out-of-scope). Next real driver is an
  answer from her.
- 28 Nov (scheduled run 13): CI green on 4a5d3c1 (run 1479); list items all settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3, build:unchecked ok. No code change.
- 28 Nov (scheduled run 15): CI green on bca1f24; list items unchanged (temple/sabzi AS_DRAWN, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3. No code change.
- 28 Nov (scheduled run 16): CI green on 41d365a (run 1482); NEEDS_YOU.md still unanswered since 25 Nov; all ACTIVE BACKLOG items re-checked, same blockers (her-call/real-browser/CC0-403/out-of-scope). No code change, per A6 did not re-derive LOOKS LIST/BACKLOG (15 flat runs today).
- 28 Nov (scheduled run 17): CI green on ba6e285 (1483); list items settled, missions 399/0/3, build:unchecked ok. No code change.
- 28 Nov (scheduled run 21): CI green on a208515 (run 1487); list items all settled (temple/sabzi AS_DRAWN, no stale coords, 10.7 MB pre-Play and land layers her call); missions-check 399/0/3, build:unchecked + 4 checks ok. No code change.
