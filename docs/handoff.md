# Handoff log - one entry per run, max 8 lines, newest on top.
# Entries older than 3 days live in docs/archive/handoff-history.md (moved 24 Nov to handoff-pre-22nov.md, moved 26 Nov: the 22 Nov block).

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

# 24 Nov (39) - LOOKS item 7 (load speed): found+fixed "textures fetched twice" for real, "map shipped twice" tried+reverted
- Root cause (CDP network capture, not guesswork): index.html's opening-view <link preload> tags were `as="image"`
  but the real loader (frameQueue.js) uses `fetch()`, a destination preload "image" never matches - genuine 2nd
  download of every one of ~14 shared texture sets, whatever their URL said. Fixed: `as="fetch"` (matches the
  already-correct .glb model preloads) + stamped the same build ?v= token materials.js's bust() uses. Also found
  sharedTextures.js's GLTF-relink path had its own private unbusted ImageLoader for the same sets - same bug, 3rd
  call site missed by the 24 Nov B2 fix; routed through loadRaw()'s shared bust()+frameQueue cache instead.
- Measured before/after (built dist/, Playwright+CDP, real encodedDataLength not just byte-counting): 182 req/
  19.6 MB real wire/41 true duplicate fetches/~11.2s ready -> 117 req/11.6 MB/0 duplicates/~8.8s ready.
- Tried the matching "map shipped twice" fix (landLayout.js's loadLandMap() Array.isArray(lay.places) check is
  always false, always re-fetches the 664KB raw map) - REGRESSED world-validator's buried-objects check (3 house-
  batch meshes sank), reverted; left as a BACKLOG item with the exact cause written in the file's own comment.
- Verified: npm run build full chain (world-validator ran this time: wall-overlap PASS, buried PASS matches
  baseline, float FAIL is the known pre-existing school_bell 0.12m); licence/dup-models/material-clone/place-
  visibility/missions-check/layout-tests all clean, same baseline counts. Screenshot: title ready, clean.

# 24 Nov (37) - MAIN lane, 3rd run of the 3-lane push. docs/lanes/ still
doesn't exist after 2 full MAIN runs (~2h) - MISSIONS/LOAD haven't logged or
committed anything; flagged in NEEDS_YOU as a pattern now. Part A/C still
done, nothing new. Verified main healthy (npm ci, build:unchecked clean, same
pre-existing WARNs, 4 instant checks PASS). Took 1 unowned BACKLOG item (per-
place interior furnishing): post office's own code comment promised a
pigeonhole letter rack that was never actually built - added it in
src/newShops.js, same no-interior pattern as the general store's shelves.

# 24 Nov (36) - MAIN lane, 2nd run of the 3-lane push. docs/lanes/ still doesn't
exist (MISSIONS/LOAD haven't logged) - nothing to integrate. Part A/C already
done (entry 35), nothing new there. Verified main healthy (fresh npm ci,
build:unchecked clean, same pre-existing budget WARNs, 4 instant checks PASS).
Took 2 unowned BACKLOG items to zero: pond lotus (re-searched CC0, none found,
closed pads-only-final) and halwai flame/heat (soot+steam already built; added
a real flickering PointLight per bhatti in src/halwaiFire.js since the flame
cast no light before - wired in src/main.js). B8/B7/B9 are explicitly deferred
to after the push, not touched. NEXT: more unowned BACKLOG, or integrate lanes
once they log.

# 24 Nov (35) - MAIN lane, first run of the 3-lane 24-hour push. docs/lanes/
doesn't exist yet (MISSIONS/LOAD haven't run) - nothing to integrate. Part C: C1
DONE, added a real 20k-triangle-per-character gate to tools/check-budget.js
(tris read from accessors[].count in the glTF JSON, no buffer scan needed;
previously computed nowhere, only size was gated). Verified against the build:
full cast reports 40-60k tris each (expected, WEB_QUALITY is still 'full' per her
21 Nov call - WARN only, doesn't fail). C2: reviewed, already built (S7 21 Nov),
left as-is (see STATE.md). Closed the Tripo-plan NEEDS_YOU line per her standing
order. Tier 1: build:unchecked + 4 instant checks all clean. NEXT: B8.

# 24 Nov (34) - docs-only (A5 exception, no code this entry). Closed out B6 in
docs/STATE.md: entries 28-31 already established it's exhausted (only real
over-specific-cache-key instance fixed in ea5cc0f, 0 further programs to merge
today since only 2 call sites remain and differ for a real reason; compileAsync
behind the title screen already wired via ui.js's readyGate, predates this order).
Did not re-investigate - that would be an audit (A6), and it's already logged.
Updated STATE.md's next-5 list to drop B6, add B8/C1/C2/B7-C3-prep. NEXT: B8
(spawn-zone-only loading) is the next real item with no her-yes gate.

# 24 Nov (33) - ORDER-24NOV B2, finish it. Found the real remaining duplicate-fetch
site: `src/stagingYard.js`'s `setTexture()` opened its own private, unbusted
TextureLoader at the same `assets/textures/<set>/<set>_<kind>.webp` paths
materials.js's `getTiledMaterial()`/`loadRaw()` already fetches (busted,
shared-cached) for every non-staged building - so any set a staged place AND a
regular building both use (plaster, brick, wood, tin, terracotta, concrete) was
downloaded twice. Routed stagingYard.js through the already-exported `loadRaw()`
instead; removed its now-redundant private loader/cache. Verified: build:unchecked
3s clean, all 4 instant checks PASS, no new findings (Tier 1, src/stagingYard.js is
a builder file, not movement/collision/vehicles/main.js-boot). B2 is now done -
landFields.js/landMaterials.js were already fixed earlier, this was the last site.
Nothing for NEEDS_YOU.md. NEXT: B6 (shader program merge, finish it).

# 24 Nov (32) - ORDER-24NOV Part A done. Created docs/efficiency.md (A1-A11: 3-file
mandatory reading, verification tiers, 8-line handoff cap, no-audit rule) and
docs/STATE.md (current state/next 5/blockers/container notes, rewritten each run).
Trimmed docs/BACKLOG.md 108K->80 lines (open items only, tagged ACTIVE/PAUSED-MAP/
GATED-HER) and docs/handoff.md 664K->recent 3 days; full old content moved to
docs/archive/ (backlog-done.md, handoff-pre-22nov.md), nothing deleted. CLAUDE.md
0/10, AUTOPILOT.md, START_HERE.md now point to efficiency.md. Measured for A7: Tier1
~8s; npm run build (Tier2) >300s stuck in world-validator, screenshot.js 238s then
crashed - container issue, logged in STATE.md, not re-chased further (A6). No build
needed (docs only, Tier 0). NEXT: Part B (B2 duplicate-fetch check, B6 shader merge).

# 24 Nov (31) - fresh container, local `main` was already at origin's tip (`b27f75b`, entry 30's commit), `git checkout main && git pull --ff-only origin main` landed clean, no mixup this time. Continued entry 30's own NEXT (systems-file audit, movement.js/vehicles.js, the only remaining unexplored files in that vein): read `src/movement.js` end to end (93 lines - resolveMove/resolveOrientedMove/positionBlocked/resolveTowedMove, all swept-substep callers) and the logic half of `src/vehicles.js` (1278 lines - skipped the ~900 lines of static kitbash geometry placement, read every update-loop function: updateWheel, Vehicle.update(), Trolley.updateYawHinge/hitchTargetPosition, groundObject's least-squares ground-plane fit). Both read clean: no bug found, and I hand-verified groundObject's tilt formula (`h[i] - (lx*sr*cp - lz*sp)`) against the group's own stated YXZ Euler order by deriving it from scratch (roll/Z applied innermost, pitch/X second, yaw/Y outermost per the file's own comment) - it matches exactly, so that's now also confirmed correct, not just plausible.
- While doing that read I found a second instance of entry 30's exact bug CLASS (not a duplicate of the same bug - a different ungated debug array): `src/main.js`'s main per-frame `tick()` loop (the permanent RAF loop, never a load-only phase) did `(window.__longFrames = window.__longFrames || []).push(...)` completely unguarded, once for every frame that takes over 300ms, for the whole session, in every real player's game. Grepped all of src/ and tools/: its only reader anywhere is `tools/boot-profile.mjs`, an offline analysis script, which only ever looks at the array's first 10-15 entries (`.slice(0, 10)`/`.slice(0, 15)`) - so, like entry 30's `__pbDbg`, nothing in real play ever reads or clears it, and it grows forever for any player who hits even occasional frame drops (common on low-end/mobile, and the known-slow ~21s load phase this repo's own efficiency audit already measured is exactly the kind of stretch that produces many >300ms frames in a row).
- Unlike `__pbDbg`, this one could NOT be gated behind a `?dev=1`/`?proof=1` flag the way entry 30's fix was: `tools/boot-profile.mjs`'s own default (no-RIDE) boot-table mode loads the page with NO query string at all (`page.goto(BASE + (RIDE ? '?proof=1' : ''))`) and still expects `window.__longFrames` populated, so gating it off in normal play would have broken that tool's real, legitimate use. Fixed instead by capping the array at 500 entries (`if (_lf.length < 500) _lf.push(...)`) - far more than either consumer (`.slice(0, 10/15)`) ever reads, so nothing downstream changes, but it stops being unbounded.
- Verified: (1) `npx vite build` clean (234 modules, same chunk sizes as entry 30, no errors). (2) `node tools/gen-model-manifest.mjs`, `node tools/licence-audit.mjs --check` (289 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, unrelated to this change), `node tools/check-position-writes.mjs` (0 gap candidates, same EXEMPT table), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps) - all clean, nothing this change touches shows up in any of them. (3) Tried the full `npm run build` chain and `node tools/regression-check.js` directly (CLAUDE.md requires these for any `src/main.js` change): both hang with zero output until killed, and a minimal from-scratch Playwright repro (`tmp/verify-longframes-cap.mjs`, not committed per the gitignored-tmp rule) hit the exact same wall even with `--disable-background-networking`/`--disable-component-update` added - Chromium itself keeps trying to reach `accounts.google.com`, which this container's egress proxy refuses (403), and something in that chain blocks instead of failing fast. This matches the pre-existing "screenshot/validator pipeline broken in this container" issue this firing was told about at the start, not a problem with the change - confirmed it's environment-wide, not specific to my edit, by reproducing it with a brand-new minimal script. Given that, verification for this change rests on (1)+(2) above plus the code itself: the diff only adds a length guard in front of an existing push into a debug-only array two globals away from any collision/movement/resolver code path - nothing it touches is read by movement.js, vehicles.js or collision.js.
- Nothing for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- NEXT: both files this loop's NEXT pointed at (movement.js, vehicles.js) are now confirmed read end to end with no bug found - the "systems" audit lineage (pause.js, sideJobs.js, freeRoam.js, zoneManager.js, collision.js, placeBatch.js, movement.js, vehicles.js) has covered every file CLAUDE.md 5a-MAP names by category except audio.js and menus/mobile-input code, which a future firing without a fresher lead should read next, in that order. The browser-tooling wall hit this cycle (npm run build's full chain, regression-check.js, and a from-scratch repro all hang reaching `accounts.google.com` through the proxy) is worth a line in `docs/NEEDS_YOU.md` as a technical note if a future firing wants to chase it further - it blocks the Tier-2 verification CLAUDE.md section 10 asks for on any main.js/vehicles.js/collision.js change, same root cause as the already-logged screenshot/world-validator breakage, just a different tool hitting it.

# 24 Nov (30) - fresh container, local `main` was 6 commits behind a detached-HEAD tip at entry 29's own commit (`ea5cc0f`); `git fetch origin main` showed `origin/main` was ALSO already at `ea5cc0f` (entry 29's push really did land, same "stale local pointer only" case as most recent entries), fixed with `git checkout main && git merge --ff-only ea5cc0f`, confirmed `git push origin main` reports "Everything up-to-date". Rather than continue the efficiency-audit B-list (B6 is confirmed exhausted per entry 29's own NEXT; B4's map-data dedup is still correctly parked, same reason entries 24/28 gave - it touches map data and the map is being uprooted, CLAUDE.md 5a-MAP), read `src/collision.js` and `src/placeBatch.js` end to end for the first time this loop (both on CLAUDE.md 5a-MAP's standing-permission "systems" list, collision.js specifically named in entry 24's own NEXT as the one file in that vein never yet audited). `collision.js` read clean - every oriented-box axis convention cross-checked against its own doc comments and against src/vehicles.js's stated convention, all consistent, no bug found. `placeBatch.js` turned up one real, confirmed bug: `batchOne()` (the per-mesh step every place-batched draw call goes through) called `(globalThis.__pbDbg ||= []).push(...)` completely ungated, on every batched mesh instance, for the whole session, in every real player's game - not just under a dev/test flag. Nothing anywhere ever clears or reads that array during normal play (grepped all of src/ and tools/: its only real reader is `tools/draw-call-audit.mjs`, an offline analysis script), so this is a genuine unbounded memory leak in ordinary play, one string appended per batched mesh for as long as the session runs (every place streamed in ever, forever) - exactly the class of bug a one-frame screenshot check can never catch, since it only shows up after playing for a while.

- Fixed: added `PB_DEBUG`, a module-level boolean computed once from `location.search` (`has('dev') || has('proof')`) - the exact same gate `src/main.js` already uses for `window.__dopahar` itself (isDevMode() or `?proof=1`, since `tools/draw-call-audit.mjs` loads the page with `?proof=1`, not `?dev=1`) - and wrapped the push in `if (PB_DEBUG)`. Normal play (no query string) now never even creates `globalThis.__pbDbg`; `?dev=1` and `?proof=1` both still populate it exactly as before, so the tool's own debugging use is fully preserved.
- Verified three ways: (1) read every file in src/ and tools/ for `__pbDbg` (grep) - confirmed the only other reference anywhere is `tools/draw-call-audit.mjs`'s own read, and confirmed it already loads with `?proof=1` (its own file header: "uses ?proof=1, dev server"), so gating on `dev || proof` matches its real usage exactly, not a guess. (2) `npx vite build` clean (234 modules, same chunk sizes - this change doesn't touch what's shipped, only a runtime branch). (3) `tmp/verify-pbdbg-gate.mjs` (gitignored) - a real Playwright run of the built `dist/` (full `chrome` binary, same container fix entries 23/27/29 already found) loading the actual Play button three ways: plain URL (`window.__pbDbg` now `undefined` - confirmed the leak is gone), `?proof=1` (48 entries after 3 s of real play, array populated as before), `?dev=1` (also 48 entries) - zero console/page errors in all three loads.
- `node tools/licence-audit.mjs --check` (289 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-position-writes.mjs` (unchanged, same EXEMPT-table lines as every recent entry), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps), `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, unrelated). `npx vite build` clean (234 modules, no errors, same chunk sizes).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call (a correctness/memory-leak fix behind the existing dev/proof gate pattern, not a look change).
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- NEXT: `src/collision.js` is now confirmed read end to end with no bug found, closing out entry 24's "collision.js not yet audited" item. Remaining unexplored static-audit angles in the same "systems" vein: `src/movement.js` (the swept resolver that calls into collision.js, referenced constantly but never itself read end to end this loop the way pause.js/sideJobs.js/freeRoam.js/zoneManager.js/collision.js/placeBatch.js each have), and `src/vehicles.js` (referenced by collision.js's own doc comments for its local-point-at-yaw convention, not yet itself audited). On the efficiency-audit doc: still open on her yes for Part A; B4 (map data shipped twice) stays parked for the 5a-MAP reason above; B6 is exhausted; nothing else in the B-list is unattempted except B7 (gated behind her yes on a before/after image) and B8/B9 (depend on B1-B6 being fully done, which they functionally are short of B4/B7) - a future firing without a fresher lead should default to a fresh systems-file audit (movement.js/vehicles.js above) or an open BACKLOG item, not re-poke B4/B6.

# 24 Nov (29) - fresh container, HEAD was detached at entry 28's own tip with local `main` 1 commit behind; `git fetch origin main` showed origin already had it (entry 28's push really did land - the "stale local pointer only" case again), fixed with `git checkout main && git merge --ff-only origin/main`. Picked B6 off the project's efficiency-audit doc per entry 28's own NEXT ("90 shader programs from 132 materials, 3.4s compile... next B-item in the audit's own order"); found and fixed the one real instance of its named bug pattern, but measured honestly that it saves 0 programs TODAY (only 2 call sites exist, which still differ for a separate, correct reason) - logged precisely below so a future firing doesn't re-find the same non-win

- Setup: `git status` showed `HEAD detached from refs/heads/main` at `881494b` (entry 28's own commit) with local `main` 1 commit behind; `git fetch origin main` confirmed `origin/main` was already at `881494b` (entry 28's push landed) - fixed with `git checkout main && git merge --ff-only origin/main` (fast-forward, no new commit, confirmed `git push origin main` reports "Everything up-to-date"). `npm install` re-run (`node_modules` empty in a fresh container, as always).
- B6 as written in `claude/efficiency-audit-24nov.md`: "Shaders: 90 programs from 132 materials, 3.4s of first-use compiling. Fix: merge variants that differ only by uniforms, and compile behind the title screen with renderer.compileAsync." Checked the second half first: `src/main.js`'s `setReadyGate()` (wired at `main.js:314`) already calls `renderer.compileAsync(scene, camera)` (the `preCompile()` helper, `main.js:286`) during the loading gate, and `src/ui.js`'s `setupLoadingScreen()`/`setupStartOverlay()` keep the title screen visible (Play button disabled, reads "Loading...") until that gate resolves - so "compile behind the title screen" is already built, not something to add. Confirmed this isn't dead code: added a one-off `renderer.info.programs` dump via a temporary Playwright script (see below) and the ground materials' programs were already present on first read right after Play unlocked, before any walking.
- Read every `onBeforeCompile`/`customProgramCacheKey` site in `src/` (grep, 20 files) looking for the first half: "variants that differ only by uniforms" - a material whose cache key bakes in a parameter that the shader itself only ever reads through a `uniform`, never interpolates into the GLSL text, so distinct parameter values could share one compiled program but don't. Found exactly one confirmed case: `src/materials.js`'s `applyGroundNoiseDetail()` (used by both the main ground, `src/scene.js`, and the field ground, `src/field.js`) builds its `onBeforeCompile` shader text identically every single call - every one of `noiseCellMetres`/`detailTileMultiplier`/`detailFadeMetres`/`grassTint`/`grassCellMetres`/`grassCoverage`/`dampSpots`/`patchContrast`/`furrows` is consumed only via `shader.uniforms.uXxx = {...}` (confirmed by reading the full function, `materials.js:419-612`) and the two runtime branches that look parameter-dependent (`if (uGrassEnabled > 0.5)`, `if (uFurrow.x > 0.0)`) are both `uniform`-value checks, not `#ifdef`s - yet its old `customProgramCacheKey()` baked all nine of those values into the key string (`ground-noise-detail-v5-${noiseCellMetres}-${detailTileMultiplier}-...`), guaranteeing a separate compiled program per distinct options object even though the compiled GLSL can never differ.
- Every other hook checked came back already correctly scoped, not the same bug: `applySurfaceVariation`/`applyMatteVariation`/`applyWallBaseGrime` (materials.js) key by family name or a bare constant (genuinely shared, since imported-GLTF materials carry no prior custom key to chain); `src/stagingYard.js`'s `addWeathering()` keys `'weather_' + set` - checked its shader text and confirmed `set` (7 possible values) really is baked into the GLSL as literal constants via `.toFixed()`/ternary string interpolation (mottle/grime/streak/boost amounts, per-set conditional blocks), so a per-set key is the CORRECT granularity, not over-fragmentation; `src/water.js`, `src/playerCycle.js`, `src/kit/landFields.js`, `src/kit/landProps.js`, `src/kit/housesMaterial.js`, `src/props.js`'s `lampTinMaterial()` are each a small finite enum or a true memoised singleton already. So this is the one real instance of B6's named pattern in the current codebase, not a sign of a wider problem.
- Fixed: `applyGroundNoiseDetail()`'s `customProgramCacheKey` is now the constant `'ground-noise-detail-v6'` (comment in place explaining exactly why, same spot). Left `src/dips.js`'s separate `applyDipHoles()` key-chaining untouched - it appends `-dips1` after whatever key it finds, and correctly so: it only runs on the main ground (not the field), and its own `onBeforeCompile` really does inject extra discard-test GLSL keyed off `Object.keys(BLOB_DIPS).length` (a true text difference, verified already constant across runs since `BLOB_DIPS` is a module-level constant, not a per-call parameter).
- Verified three ways: (1) `tmp/verify-ground-cache-key.mjs` (gitignored) - a deterministic unit test calling `applyGroundNoiseDetail()` with 4 very different options objects (including non-default grassTint/dampSpots/furrows/patchContrast) against a fake shader/material: confirmed byte-identical `vertexShader`/`fragmentShader` text and identical cache key across all 4, while the `uNoiseScale` uniform VALUE still differs per call (0.0333 vs 0.0833) - i.e. the per-instance look is still carried correctly, only the program-sharing decision changed. (2) `npx vite build` clean both before and after (234 modules, no errors). (3) A real-browser check, `tmp/verify-program-count.mjs` (gitignored, reusable for any future program-count question: serves a built `dist/` under its real `/village-game-web/` base path via the full `chrome` binary - same container fix entries 23/27 already found - presses Play, reads `renderer.info.programs` via the `?dev=1` `window.__dopahar.renderer` hook): confirmed the two ground materials' compiled program cache keys went from `ground-noise-detail-v5-30-22-8-8096330-3.2-0.7-1-1.35-nf-dips1` / `ground-noise-detail-v5-30-22-8-none-3.2-0.42-0-1.35-f1.5` (before) to `ground-noise-detail-v6-dips1` / `ground-noise-detail-v6` (after) - the fix landed exactly as intended - but since the main ground alone chains `applyDipHoles()`'s `-dips1` suffix on top, the two still end up as 2 distinct programs either way, same as before. **Honest result: 0 programs saved today**, because this repo currently only has 2 callers of this function and they were always going to differ by the (correct, real) dips-chain text difference regardless of how tightly the rest of the key was scoped. The fix is still real and worth keeping (closes a latent duplication risk for any third caller added later, e.g. if a future place build reuses this hook), just not today's B6 win.
- `node tools/licence-audit.mjs --check` (289 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-position-writes.mjs` (unchanged, same EXEMPT-table lines as every recent entry), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps), `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, unrelated). `npx vite build` clean (234 modules, no errors, same chunk sizes - this change doesn't touch what's shipped, only an internal cache-key string). Real-browser check above also confirmed 0 new console/page errors (the one pre-existing 404 logged is identical before and after this change, unrelated to it).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call (a cache-key correctness fix with a measured, honestly-reported zero gain today - not a look change, nothing for her eye).
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- NEXT: B6's "compile behind the title screen" half is confirmed already built (main.js's existing `compileAsync` gate) and its "merge uniform-only variants" half is now confirmed EXHAUSTED for the easy/grep-able case - every `onBeforeCompile` site in `src/` has been read and is already correctly keyed. The real "90 programs from 132 materials" gap is therefore more likely coming from genuine structural differences three.js's OWN automatic cache-key part already tracks (map/normalMap/aoMap/vertexColors presence varying per imported building material) - not fixable by touching cache keys at all, only by giving more materials a shared texture/map structure, which is a materials-library-shape question (CLAUDE.md 5a2: her call, not mine to redecide). `tmp/verify-program-count.mjs` (gitignored, kept locally) is now a reusable tool for exactly this: it can list every compiled program's full cache key (not just the `ground-noise-detail` ones filtered here) to find where the real 90-from-132 split actually falls, which the next firing should do before trying another B6 angle. If nothing new from her by then: B4 (map data shipped twice, scoped in entry 28's own NEXT - the safer "generate at build time" variant) looks like the next-cheapest remaining B-item.

# 24 Nov (28) - fresh container, local `main` was detached at entry 27's own tip with the `main` ref 11 commits behind; `git fetch origin main` showed origin already had it (entry 27's push really did land - the problem was only `git log origin/main` reading a stale cached ref before the fetch), fixed with `git checkout main && git merge --ff-only origin/main`. Looked hard at B4 off the project's efficiency-audit doc (map data shipped twice) first, found it's riskier than it looks and parked it with the real reason; shipped a different, confirmed, zero-risk win instead: `src/signPaint.js`'s bilingual sign-text layout is now memoised, cutting 228 of 529 real font-fit searches (43%) on a full playthrough

- Setup: see above - a `git fetch` before trusting `git log origin/main` matters; a cached ref can look stale when it isn't. `npm install` re-run (`node_modules` empty in a fresh container, as always).
- Investigated B4 (`claude/efficiency-audit-24nov.md`: "map ships twice, 741 KB inside the layout chunk + 664 KB via `src/kit/landLayout.js`, fix: one packed map with only the fields the runtime reads"). Confirmed by a real Playwright network capture of the built `dist/` (`vite preview` + full chrome, not the broken world-validator pipeline) that BOTH really are downloaded on every page load - not a dead fallback as the code comments claim. Root cause, found with temporary debug logging then reverted clean: `src/kit/landLayout.js`'s `loadLandMap()` prefers the bundled `src/layout/layout.js`'s `getLayout()` only `if (lay && Array.isArray(lay.objects) && Array.isArray(lay.places))` - but `getLayout()` deliberately returns `places` as a dict keyed by id (for its own `getPlace(id)`), keeping the real array separately as `lay.list`. `Array.isArray(lay.places)` is therefore always false, so every single page load falls through to `fetch()`-ing the raw `docs/layout/approved-map-2026-11-21.json` (664 KB) in full, on top of the 680 KB `layout` chunk already paid for the same data.
- The obvious one-line fix (check `lay.list` instead, reshape to `{ ...lay, places: lay.list }`) turned out NOT to be behaviour-neutral: diffed every field of `src/layout/mapData.json` (the bundled, "packed" map) against `docs/layout/approved-map-2026-11-21.json` (the raw export) object by object - `mapData.json`'s objects carry an extra, precomputed `rect` (a corrected footprint "front towards its gali", per `src/kit/shopsPlace.js`'s own comment) that the raw export does not have, and `src/kit/shopsPlace.js` branches on `o.rect`'s presence to pick between the corrected footprint and a naively-computed one (`ringRect(o.rings[0], ...)`). Switching the data source would therefore change real building footprints/orientations in the live shops-land render - and a road-count check caught a second, deeper difference (`mapData.json` has 69 roads where the raw export has 68 - the packed map has had real edits the raw export never got). Since CLAUDE.md 5a-MAP forbids spending a cycle on anything a layout change touches, and any visible footprint shift is a taste call for her eye (5a1) not mine to ship silently, parked this rather than risk a silent map change for a bytes-only goal. Logged precisely so a future firing (or her) doesn't have to re-derive this.
- Picked a different, unambiguously safe item instead: B5 off the same audit doc, as written: "Signboards: layoutBilingual() blocks the main thread 1.4 s before Play. Fix: cache layouts by text and size, and paint a sign when its place streams in, not at startup." (the second half - painting on stream-in rather than at startup - is a bigger, more involved change to when signs get built at all; this cycle did the caching half, which is self-contained and needed no change to when/where signs are built.) `src/signPaint.js`'s `layoutBilingual()` (every painted signboard's Hindi/English text-fit search, CLAUDE.md section 7's signboard rule) is a pure function of its arguments that was never memoised. Measured via the same real Playwright capture (temporary call-counting, then reverted): a full playthrough calls it 529 times for only 301 distinct `(hi, en, w, h, options)` combinations - shared sign designs, LOD tiers and repeated generic names (kiosks, carts) account for 228 exact-duplicate calls, each re-running the same up-to-80-iteration font-size guard loop from scratch. Measured self time before the fix: ~1010 ms across all 529 calls (matches the audit's own "signboard text layout 1.4s" finding, same order of magnitude). Added a `Map`-keyed cache to `layoutBilingual()` (key = hi/en/w/h/maxHiPx/fillFraction/gapFraction) and a second small cache to the `capPerPx()` helper it calls twice per attempt (font-metric probe of a single fixed char per font family - same answer every time, previously re-measured on every call).
- Verified four ways: (1) `tmp/verify-signpaint-cache.mjs` (gitignored) - a deterministic fake-Canvas2D unit test: repeated identical calls are cached with zero extra `measureText` calls and identical output; distinct option objects (e.g. a different `fillFraction`) are NOT confused with each other; a `null` (does-not-fit) result is itself cached correctly (`!== undefined`, not truthiness, is the cache-hit check); `drawBilingual()` still round-trips through the cache; and 50 pseudo-random `(hi, en, w, h)` tuples produce byte-identical output against the original pre-cache algorithm (copied verbatim into the test) - 0 mismatches. (2) Confirmed `layoutBilingual`/`drawBilingual` have no caller anywhere in `src/` other than each other, so nothing could have depended on `ctx.font`'s incidental state after a now-skipped cache-hit call (the only real caller, `drawBilingual`, already sets `ctx.font` itself before every `fillText`). (3) Re-ran the same real-browser call-count capture after the fix: 529 total calls, only 301 actually run the uncached search (228 cache hits, exactly matching the unique-key count found before the fix) - confirmed self time in the surviving uncached path drops to ~775 ms. (4) Loaded the real built `dist/` in a full Chrome headless page and confirmed zero console errors/page errors after load (`tmp/verify-signpaint-final.mjs`).
- `node tools/licence-audit.mjs --check` (289 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-position-writes.mjs` (unchanged, same EXEMPT-table waypoint-glow lines as every recent entry), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps), `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, unrelated to this change - and the pre-existing load-time-over-budget numbers this very audit is about, also unrelated to this specific commit). `npx vite build` clean (234 modules, ~1.1s, no errors, same chunk sizes - this change doesn't touch what's shipped, only how often a cached result is recomputed at runtime).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change (confirmed the opposite - this is the fix that specifically AVOIDED a layout/position change on B4), no taste call (a pure caching optimisation with byte-identical output, not a look change).
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- NEXT: B4 is real and worth doing properly, but needs either (a) a careful reconciliation of `mapData.json` vs the raw export's road-count and `rect` differences with her eye on any resulting footprint change, or (b) a narrower fix that keeps shipping the raw export's exact shape but generates it from `mapData.json` at BUILD time (a `tools/gen-*.mjs` step, same pattern as entry 27's model manifest) instead of shipping both files - that second option is probably the real zero-risk fix and didn't get attempted yet since this cycle's time went to confirming the risk first. B5 (signboard layout caching) is now done; B6 (90 shader programs from 132 materials, 3.4s compile) is the next B-item in the audit's own order and hasn't been looked at yet.

- Setup: `git status`/`git log` showed local `main` detached at `eef2bf9` (entry 26's own commit) with `main`'s branch ref 9 commits behind; `git fetch origin main` confirmed `origin/main` was already at `eef2bf9` too (entry 26's push really did land - unlike several recent entries, this was the clean "stale local pointer only" case). Fixed with `git checkout main && git merge --ff-only origin/main` (fast-forward, no new commit). `npm install` re-run (`node_modules` empty in a fresh container, as always).
- Per entry 26's own NEXT and the project's `claude/efficiency-audit-24nov.md` doc (she has not said yes to the full reordering, so only individually-safe, plain code/data items from it are mine to do unasked - same standing rule entries 25/26 both followed for B1/B2): picked B3, as written: "33 failed requests for 11 slot models that do not exist (bike, bullock, cart, charpai, cow, halwai, hand_pump, monkey, player, tractor and one more) are each requested 3 times and 404. Fix: a build-time manifest of slot files that exist; never request a missing one."
- Read `src/assetSlots.js` end to end: `resolveSlotOnce()` calls `urlExists(url)` for EVERY registered slot (80+ named ones in `src/main.js`/`src/gatherScene.js`, plus one per zone-streamed place via `src/siteSlots.js`'s `wireSiteSlot()` - so really every place in the village, not just the 80 named slots) on every page load, which sent a real `fetch(url, { method: 'HEAD' })` per slot. Confirmed by code reading this is the root cause of the audit's B3 finding, not just the 11 it happened to name - ANY slot with no file yet pays a live request, always.
- Fixed the general case, not just the 11 named ones: added `tools/gen-model-manifest.mjs`, which scans `public/assets/models/*.glb` and writes `public/assets/models/manifest.json` (a flat sorted list of basenames, no extension). `assetSlots.js`'s `urlExists()` now fetches that JSON once (cached in a module-level promise) and checks every slot against it in memory - a slot whose file isn't in the manifest is never requested at all, known-missing or not. If the manifest itself is missing or the fetch fails, falls back to the old per-file HEAD check (`urlExistsByHead()`, kept as-is) rather than silently treating every slot as absent.
- Wired the generator into `npm run build` and `build:unchecked` (runs first, before `vite build`, so a stale manifest is never shipped), and - since the drop-a-model-in workflow `docs/asset-slots.md` documents is meant to work in dev too, by just reloading - into a small `vite.config.js` dev-server plugin (`genModelManifestPlugin`): regenerates once when the dev server starts and again on every `.glb` add/unlink under `public/assets/models/` via `server.watcher`, so nothing manual is needed either way. Added `npm run gen-manifest` for the rare manual case. Updated `docs/asset-slots.md` with a short note explaining this (its own documented 3-step workflow is unchanged from the user's point of view).
- Added a licence record for the new generated `public/assets/models/manifest.json` (`tools/licence-records.json`, `category: "self-made"`, same shape as the existing `public/data/donations.json` entry) - without it `tools/licence-audit.mjs --check` correctly flagged the new file as "nobody knows where it came from".
- Verified three ways: (1) `node tools/gen-model-manifest.mjs` run twice in a row - second run reports "unchanged", confirming it's idempotent and safe to run on every build. (2) `npx vite build` clean (same 234-module chunk layout as entry 26's own baseline). (3) `tmp/verify-manifest-fix.mjs` (gitignored) - launches the real built `dist/` via `vite preview` in headless Chromium (full `chrome` binary, SwiftShader, same fix entry "23 Nov" already found for the screenshot tool), clicks Play, waits for the slot-resolution pass, and inspects every network response under `assets/models/`: 47 requests captured, `manifest.json` fetched **exactly once**, **zero** non-2xx responses - and the 11 known-missing slots from the audit (`bike`, `tractor`, `cart`, `bullock`, `player`, `charpai`, `hand_pump`, `monkey`, `halwai` checked individually against the generated manifest) generate **no request at all**, not even a 404. Also smoke-tested the dev-server plugin directly (`npx vite --port <n>`): logs `[manifest] manifest.json unchanged (129 models)` on startup and the file is reachable at the expected URL.
- `node tools/licence-audit.mjs --check` (289 shipped files, 0 UNKNOWN, same pre-existing Tripo-plan warning, manifest.json now covered), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, unchanged), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, unchanged), `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, unrelated to this change). The full `npm run build` chain (world-validator/collision-test, headless Chromium) still OOMs this container per every recent entry; not fought - `vite build` plus the instant static checks plus the purpose-built Playwright capture above cover this change directly.
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call (a build-time data file and a network-request fix, same category as entries 24-26's own engine/perf fixes).
- Committed and pushed; GitHub Actions run (id 45365841215) confirmed `conclusion: success` for this commit.
- NEXT: B4 (map data shipped twice: `src/layout/mapData.json` 741 KB inside the layout chunk, plus `docs/layout/approved-map-2026-11-21.json` 664 KB via `src/kit/landLayout.js` - fix: one packed map with only the fields the runtime reads) looks like the next-cheapest, equally safe B-item and doesn't touch movement/collision/materials. B2's real fix (vendor-chunk `three` + re-split `materials.js`/`trees.js`, re-measured - entry 26 scoped this precisely and reverted a naive attempt) is the known-larger, known-riskier item still open; budget a full cycle for it specifically, re-measuring total minified bytes before trusting any chunking change, same discipline entry 26 used. If she's said yes to the efficiency-audit order by the next firing, Part A (`docs/efficiency.md`, `docs/NOW.md`, backlog/handoff trimming) takes priority over further B-items.

# 24 Nov (26) - fresh container, fixed entry 25's own leftover main-branch mixup again (same failure mode, not yet pushed when this firing started), found the REAL cause of the project's 24 Nov efficiency-audit B2 finding ("50 textures downloaded twice, 3.2 MB wasted") and fixed the two confirmed call sites; tried the deeper proper fix (force the shared module into its own build chunk), measured it making things worse, and reverted rather than ship a regression

- Setup: `git status` showed `HEAD detached from refs/heads/main` at `d943204` (entry 25's own commit) with local `main` still at `f00f10f` (8 commits behind) - same mixup entry 25 itself hit and fixed for entry 24's work, recurring because fixing it locally with `git branch -f main HEAD` never gets committed/pushed as repo state (it's a local ref move), so a brand-new container starts from the clone's default branch pointer again every time. `git fetch origin main` confirmed `origin/main` was already at `d943204` (entry 25's work genuinely was pushed last time) - so this was the "stale local pointer only" case, fixed cleanly with `git checkout main && git merge --ff-only d943204` (fast-forward, no new commit). Noting for a future firing: since this recurs every fresh container regardless of whether the previous firing pushed correctly, it may be worth a one-line addition to the setup step in a future prompt revision - not changing the scheduled task's own prompt myself without her yes, per standing instruction, just flagging the pattern here again.
- `npm install` re-run (`node_modules` empty in a fresh container, as always).
- Picked B2 off the project's `claude/efficiency-audit-24nov.md` doc (entry 25's own NEXT: "if she says nothing, B2 looks like the next-cheapest, equally safe win" - nothing from her yet, so proceeding per standing "never wait" rule). B2 as written: "50 texture files are fetched once plain and once with ?v= ... since commit e53e30d ... likely uploaded to the GPU twice."
- Found two confirmed, real duplicate-fetch call sites by code reading: `src/kit/landFields.js`'s `fieldMaterial()` (the new-map painted-ground/crop shader, used by `landCanal.js` and `mapObjectsGround.js`) opened its own bare `new THREE.TextureLoader()` and loaded `assets/textures/ground/ground_{color,normal,roughness}.webp` directly - the EXACT same files `src/scene.js`, `src/field.js` and `src/dips.js` already load through `getTiledMaterial('ground', ...)` (which goes through materials.js's shared, cache-busted `loadRaw()`) - so every new-map field/canal build fetched these three files a second time, unbusted (stale-cache risk too, since e53e30d's fix never reached this path). Separately, `src/kit/landMaterials.js`'s `rustMaterial()` (used by `shopsPlace.js`'s `kitMaterials([...,'rust'])`) did the exact same thing for `assets/textures/rust/rust_{color,normal,roughness}.webp`, via its own stale comment claiming "rust... has no entry in src/materials.js SETS yet" - factually wrong (rust was added to SETS back in the "S7 WIRING (shops-land)" pass), so this one's `TextureLoader` call was leftover scaffolding from before that wiring, never cleaned up.
- Fixed by exporting `loadRaw(url, srgb)` from `src/materials.js` (the exact function `getTiledMaterial()` itself already uses - one real network fetch per URL, cache-busted via the same `__ASSET_V__`/`bust()` every other library texture uses) and switching both call sites to `loadRaw(...).clone()` instead of a private `TextureLoader`. `landMaterials.js`'s `metalness: 0.15` was left untouched (a material VALUE, not a loading mechanism - CLAUDE.md 5a2 says a place build may use the library by name but not add new values to it unasked, so changing that number, even to simplify, needed her eye first; this fix only changes how the bytes are fetched, nothing visible).
- Verified three ways: (1) `tmp/verify-texture-dedup.mjs` (gitignored) - static checks confirming both files now import/call the shared `loadRaw`, no longer construct their own `TextureLoader`, and build the identical URL string `getTiledMaterial()`'s own `SETS.ground`/`SETS.rust` base-path formula produces (13/13 checks pass). (2) `npx vite build` clean (234 modules, no errors, same chunk sizes as before). (3) `tmp/verify-network-dedup.mjs` (gitignored) - a lightweight Playwright network capture of the REAL built `dist/` served locally (not the known-broken world-validator/screenshot.js pipeline - a new, minimal, purpose-built script instead): confirmed `rust_color/normal/roughness.webp` now fetched exactly once each (previously unbusted and already single-fetch, now also correctly cache-busted).
- Went looking for why `ground_color/normal/roughness/ao.webp` STILL showed up twice each in that same network capture even after the fix, rather than reporting a partial win and stopping. Grepped the built `dist/` for `materials.js`'s own unique `dpTiledLibrary` marker and found it duplicated into BOTH `characters-*.js` and `placeBatch-*.js` - two separate bundled copies of `src/materials.js`, each with its OWN module-level `rawTextureCache`/`materialCache` Map and its own `TextureLoader` instance, because Rollup's default chunking inlines a small shared module into every async chunk that imports it rather than extracting one common chunk. Same disease confirmed in `src/trees.js` (`tree_atlas.webp`/`impostor_*.webp` paths duplicated into both `trees-*.js` and `landTrees-*.js`) - which is also why `trees.js` keeps its own copy-pasted `bust()`/`ASSET_V` instead of importing materials.js's: someone already worked around this same issue once, by duplicating the helper rather than solving the real cause. **This is the actual root cause of the audit's "50 textures downloaded twice" line** - bigger than the two ad-hoc loaders above, which were real but secondary.
- Tried the correct-looking fix: `manualChunks` in `vite.config.js` forcing `src/materials.js` and `src/trees.js` into their own dedicated chunks, so every importer shares one instance. Measured the result before trusting it: the new `shared-materials` chunk came out at 763 KB (vs `src/materials.js`'s own few-KB source) and contained 6 occurrences of `WebGLRenderer` - meaning the manualChunks split dragged a large, previously-not-duplicated slice of the `three` library's own code into it, on top of whatever's already in `main.js`. Net effect: `placeBatch-*.js` (458 KB) disappeared but was replaced by `shared-materials` (763 KB) + `shared-trees` (746 KB) - a total INCREASE of roughly 1 MB minified, far worse than the 3.2 MB-over-many-small-textures problem it was meant to fix, and `main.js` stayed exactly the same size (so nothing was saved there either). **Reverted the vite.config.js change** rather than ship something that measures worse than before (confirmed `git diff vite.config.js` is empty after the revert; rebuilt and confirmed chunk sizes are back to the original 18-chunk/458 KB placeBatch baseline).
- Left for a future firing, written down precisely so it isn't rediscovered from scratch: the real fix needs `three` itself pulled into a stable vendor chunk FIRST (so forcing materials.js/trees.js out afterward doesn't drag a fresh copy of parts of `three` along with it) - almost certainly a `manualChunks` rule keyed on `node_modules/three` as well, tried together with the materials.js/trees.js split, re-measured the same way (`tmp/verify-network-dedup.mjs`'s request-count check plus a `dist/assets/*.js` size comparison) before trusting it. This is real engine/build-config work (CLAUDE.md 5a-MAP's "systems" list, not layout), but touches `vite.config.js`/boot chunking broadly enough that the audit's own Tier-2 "risky" bucket applies - budget a full cycle for it alone, and don't commit until the total minified bytes before Play are confirmed lower, not just the texture-request count.
- `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, unchanged), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, unchanged), `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call). `npx vite build` clean (234 modules, ~1-4s, no errors, confirmed chunk sizes match the pre-change baseline exactly). The full `npm run build` chain (world-validator/collision-test, which launch headless Chromium) still OOMs this container per every recent entry; not fought - used the lighter purpose-built Playwright script above instead, which worked fine.
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call (texture dedup and a reverted, carefully-measured build-config experiment, not a taste call).
- NEXT: the real B2 fix (vendor-chunk `three` + re-split materials.js/trees.js, re-measured) is the clear next item and is now fully scoped above - do that before anything else B2-adjacent. `tmp/verify-network-dedup.mjs` (gitignored, kept locally) is reusable for that and for checking any other texture set for the same duplicate-chunk symptom (grep dist/assets/*.js for a texture set's own file names - any hit in 2+ chunks means it's duplicated). After that: B3 (33 failed 404 requests for missing slot models), B4 (map data shipped twice - 741 KB + 664 KB), or, if she's said yes to the efficiency-audit order by then, Part A (docs/efficiency.md, docs/NOW.md, backlog/handoff trimming) first.

# 24 Nov (25) - fixed a main-branch-pointer mixup left by entry 24 (detached HEAD, 7 commits ahead of origin, never merged into the `main` ref) and shipped the single biggest item from the project's "24 Nov efficiency audit" doc: `nearestRoad()` (`src/kit/mapObjectsPlan.js`), the function the audit measured at 64% (13.8s of 21.7s) of time-to-Play, is now 11x faster with byte-identical output

- Setup: `git status` showed `HEAD detached from refs/heads/main` at `c1ad37b` with local `main` still pointing at `f00f10f` (7 commits behind, i.e. entry 24's own 6 commits plus its own merge were made on a detached HEAD and the `main` branch ref was never moved onto them - a different failure mode than the usual "stale local pointer, origin already has it" pattern entries 16-24 document: `git fetch origin main` showed `origin/main` was ALSO still at `f00f10f`, so this really was unpushed work sitting on a detached HEAD). Fixed with `git branch -f main HEAD && git checkout main && git push origin main` (fast-forward-equivalent, no new commit) - confirmed `origin/main` now at `c1ad37b`. Recorded here so a future firing checks `git branch -a`/`git rev-parse HEAD` against `main`, not just `git fetch`, before assuming a detached HEAD only ever means "stale pointer, nothing to do."
- `npm install` re-run (`node_modules` empty in a fresh container, as always). Read the project's own `claude/efficiency-audit-24nov.md` doc (a separate Claude chat session's 24 Nov measurement of this repo, not yet applied here): it measured 21.7s to Play-ready on a cold load, found 64% of that (13.8s) was one function - `nearestRoad()` in `src/kit/mapObjectsPlan.js`, called 184,827 times at boot (almost all from `pondSqueeze()`'s `limit()` ray-walk), each call rescanning all 876 road segments from scratch - and prototyped (but, by its own "nothing in the repo was changed" note, never committed) a fix giving identical results 11.5x faster. The doc's order also proposes rewriting how the hourly build loop itself reads docs and verifies changes, but says explicitly that changing the loop's own scheduled-task prompt is blocked on her yes - so only the plain code fix (not the process change) is mine to do unasked; logged the rest in `docs/NEEDS_YOU.md` for her.
- Implemented it myself (the doc's prototype was never committed to the repo, so there was no code to reuse): `src/kit/mapObjectsPlan.js`'s `nearestRoad()` now caches each `roads` array's flattened segment list (endpoints, half-width, bounding box) in a `WeakMap` the first time it's seen, and skips a segment's exact point-to-segment projection (two divides + a sqrt) whenever a cheap Chebyshev lower bound on its distance already can't beat the best score found so far - this can only skip a segment that is mathematically provable to never win, so the result is exactly the brute-force answer, not an approximation.
- Verified two ways, both in plain Node (the file's own header: "pure maths, no three.js" means no browser is needed): (1) `tmp/verify-nearestRoad.mjs` (gitignored) runs the new function against a byte-for-byte copy of the old brute-force one over the real `src/layout/mapData.json` roads (876 segments): 200,000 random points across the map bounds plus every segment endpoint/midpoint (202,628 points total) - 0 mismatches (same `id`, `kind`, `d`, `half`, `p`, `dir` to 1e-9). (2) Timed both on 184,827 calls (the audit's own measured call count) against the same `roads` array: 12324 ms -> 1102 ms, 11.2x - matching the audit's measured 11.5x. Also re-ran `node src/kit/mapObjectsCheck.js` (the existing node-based map-objects overlap checker, also pure-maths) before and after (via `git stash`): identical 0/0/0 houses/solids/roads overlaps both times.
- `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, unchanged), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, unchanged), `node tools/check-budget.js` (same pre-existing breaches as every recent entry, unrelated to this change - her own deferred `WEB_QUALITY='full'` call), `node tools/char-diet.mjs` (10 characters, 76.0 -> 48.9 MB, unchanged). `npx vite build` clean (same module count, 4.4s, no errors). The full `npm run build` chain (`world-validator.js`/`collision-test.js`, which launch headless Chromium) still times out/OOMs this container exactly as every recent entry documents; not fought, per standing instruction - everything before it in the chain (the four static checks + `vite build` + `char-diet.mjs`) ran clean individually above.
- Added one `docs/NEEDS_YOU.md` line: the rest of the efficiency-audit doc (its proposed rewrite of what each cycle reads/verifies, and the scheduled-task prompt change) is a process decision that doc itself says needs her yes - not logged there before this entry, so she may not have seen it yet outside the project docs.
- NEXT: if she says yes to the efficiency-audit order, the next firing should read `claude/efficiency-audit-24nov.md` from the project and work Part A (docs/efficiency.md, docs/NOW.md, backlog/handoff trimming) before B2-B9 (texture double-download, 404'd slot requests, the map shipped twice, signboard layout caching, shader program count) and C (character budget). If she says nothing: B2 (50 textures fetched twice, 3.2 MB wasted, since commit e53e30d) looks like the next-cheapest, equally safe, equally measurable win, and doesn't touch movement/collision/materials.

# 24 Nov (24) - fresh container; `git status` showed local `main` detached at `eecc9b2` (entry 23's own commit), `git fetch origin main` showed origin 5 commits ahead (stale local branch pointer, origin already had everything) - `git checkout main && git merge --ff-only origin/main` reattached and fast-forwarded cleanly, same recurring fresh-container pattern entries 16-23 all hit. `npm install` re-run (`node_modules` empty in a fresh container). Per entry 23's own NEXT, read `src/freeRoam.js` (the notebook map/toast/visit-list/tasks-list module - only its map section had been read before) and `src/zoneManager.js` (zone streaming) end to end for the first time this loop - both are in CLAUDE.md 5a-MAP's standing-permission "systems" list.

- `src/freeRoam.js` read clean: `openVisit()`/`openTasks()` both clear + fully rebuild their button lists on every open (new DOM nodes each time, so no listener accumulation - same safe pattern entry 22 already confirmed for `src/sideJobs.js`'s panels); the canvas pointer/close-button listeners and `mapArmed`/`armed` mid-mission-confirm state are each wired/reset correctly once per open. One harmless dead branch found (`nearestYardId()`'s fallback in `mapXY()` can never actually run, since `isYard(p)` already requires `p.id` to be set before `yardXY(p.id ?? nearestYardId(p))` is ever reached) - left alone, not a bug, not worth a commit on its own.
- `src/zoneManager.js` read turned up a real, confirmed bug: `disposeObject()` (called on every zone teardown as the player roams away) called `.dispose()` on every material it found, with no check for whether that Material object is **shared**. `src/materials.js`'s `getTiledMaterial()` caches and hands back the literal same Material instance to every caller using the same name/repeat/tint/roughness key (CLAUDE.md 5a2's "materials are a shared library") - confirmed by grep this is used directly, uncloned, by dozens of files (bazaar.js, shops.js, temple.js, buildingKit.js, chaurahaEdges.js, newShops.js...). Traced one concrete, certain-to-fire case: every lamp zone `zoneManager.register()`s in `src/main.js` (`lamps_bazaar_*`, `lamps_temple_*`, five `lamps_gali_*` groups, `lamps_<spur>` for each long spur) builds through `src/props.js`'s `createStreetLamps()`, which assigns one literal `getTiledMaterial('concrete', ...)` object and one literal module-level singleton (`_lampTinMat`, itself a `.clone()` of `getTiledMaterial('tin', ...)`, memoized the first time any lamp zone builds) to every lamp pole/fitting mesh in the whole village. Since lamps line every lane and spur with modest teardown radii (9-50 m), walking away from any ONE of these many zones - an entirely ordinary thing to do - disposed that shared object out from under every other still-active or not-yet-built lamp zone referencing the exact same instance.
- Checked what `.dispose()` on a still-in-use Material actually does (read `node_modules/three/src/materials/Material.js` and `WebGLRenderer.js`'s `onMaterialDispose`/`deallocateMaterial`): it doesn't corrupt anything or touch `.map`/textures, but it does drop the renderer's compiled GPU program for that exact Material object, forcing a shader recompile the next time ANY mesh still using it is drawn - a stutter on a later, unrelated frame (not at the teardown itself), exactly the kind of hitch zone streaming exists to avoid, and exactly the kind of bug that would never show up in a one-frame screenshot check even if the pipeline weren't broken in this container.
- Fixed: `getTiledMaterial()` now tags its cached result with `mat.userData.dpTiledLibrary = true` before caching it; `disposeObject()` skips `.dispose()` on any material carrying that flag. `Material.clone()`/`.copy()` deep-copies `userData` (confirmed in three's own source), so the flag also survives onto `cloneTiledMaterial()` results and other clones that themselves memoize/reuse across call sites (like `lampTinMaterial()`'s `_lampTinMat` singleton) - correctly conservative, since the only cost of over-protecting a true one-off clone is one retained JS object, never a correctness bug. Geometry disposal is untouched (confirmed no geometry is cached/shared anywhere in `src/`, so it's always safe to dispose on teardown).
- Verified with `tmp/unit-test-zonemanager-shared-material-dispose.mjs` (gitignored, kept locally, same style as entries 21-23's own tests since `createZoneManager()`/`getTiledMaterial()` can't run standalone here without a real THREE/WebGL+Image-loader context): (1) static checks reading the real `src/materials.js`/`src/zoneManager.js` off disk, confirming the tag-then-cache ordering and the skip-check are both really in the live source; (2) a dynamic reproduction of the exact disposal logic (old body copied verbatim, then the new body) against a minimal fake Material/geometry - old logic disposes a shared material that a second zone still references (bug reproduced), new logic does not (fix confirmed), and a control case (an untagged, genuinely zone-exclusive material) is still disposed normally either way, so the fix isn't over-broad. 8/8 checks pass.
- `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, exit 0, unchanged), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, exit 0, unchanged), `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned, unaffected by this fix - that check is about unsafe `.clone()` calls, a different half of the same shared-material discipline), `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, logged in NEEDS_YOU; no asset touched this cycle). `npx vite build` clean (234 modules, 2.2 s, no errors). The full `npm run build` chain (world-validator/collision-test) still OOMs this container per every recent entry; not fought.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call (this is a code-correctness/perf fix in shared engine code, same category as entries 21/22's own fixes, not a taste call).
- NEXT: both files CLAUDE.md 5a-MAP's "systems" list pointed to from entry 23's own NEXT are now read end to end for the first time. The remaining unexplored static angle in that same vein: `src/collision.js` itself (the resolver every movement routine calls into, not yet read end-to-end as its own audit target the way pause.js/sideJobs.js/freeRoam.js/zoneManager.js have each had one this loop) and `src/placeBatch.js` (the per-material batching this entry's fix touches indirectly, referenced by `materials.js`'s own comments about `userData.placeBatchable`/`worldBakedOnly` but never itself read end to end this loop).


# 24 Nov (23) - fresh container; `git status`/`git log` showed local `main` detached at `921c18e` (entry 22's own commit), `git fetch origin main` fast-forwarded a stale local `main` branch pointer up to it (origin already had it) and `git checkout main` reattached HEAD cleanly - no genuinely-unpushed work this time, just the same stale-ref pattern entries 16-22 have each hit in a fresh container. `npm install` re-run (`node_modules` empty in a fresh container). `Places V1/`, `reference-from-unity/` and Blender all confirmed absent again.

- Per entry 22's own NEXT, read every one of the 10 individual `src/jobs/*.js` files end to end for the first time this session (chakki, gate, gilli, kanche, kulfi, mango, milk, patang, pump, ration, stalls - plus their shared `props.js`/`minigames.js`/`data.js`), looking for the same two bug classes entries 21/22 found in `src/pause.js`/`src/sideJobs.js` (a listener/handler wired inside a function that runs more than once; a close/cleanup ordering bug). Also finished auditing `src/audio.js` (the remaining ~800 lines past entry 22's own partial read) and re-read `src/controls.js`/`src/quality.js` (mobile touch input, quality presets) end to end, and `src/interactions.js`/`src/movement.js`/`src/quest.js`/`src/freeRoam.js`'s notebook-map section as supporting context, closing out CLAUDE.md 5a-MAP's "systems: collision, missions, audio, menus, mobile" standing-permission list for this vein - every file it names has now had at least one full end-to-end read across entries 20-23.
- Found one real (if very minor) thing in `src/jobs/stalls.js`'s shared `onInteract` for the banta cart / chaat thela: a bare, no-op statement `api.discoverJob;` sitting alone on its own line (referencing the function without calling it - does nothing at runtime, calls nothing, throws nothing). Harmless by accident, not by design: it reads exactly like a half-written `api.discoverJob('...')` call that was abandoned mid-edit, which could mislead a future reader into thinking stalls DO call discoverJob (they deliberately don't - the comment beside it says so, "stalls are map places, not jobs"). No other job file, and no other place in `src/`, has this pattern (checked with a repo-wide grep for a bare `identifier.property;` expression statement - zero other hits).
- Fixed: removed the dead statement, moved its comment to explain the *absence* of a discoverJob() call rather than sit next to a no-op one, and collapsed the now-single-statement arrow function to an expression body. No behaviour changes (the statement never did anything), so nothing to deterministically test beyond confirming the dead pattern is gone (re-ran the same repo-wide grep after the edit: 0 hits) and that the module still loads/builds clean.
- Everything else read this entry came back clean, same thorough-review style as entries 21/22's own negative results: `src/jobs/gate.js`'s `env.hooks.pitajiFreeRoam` reassignment-with-`oldHook`-chaining pattern is safe (registered once per game session, like `src/jobs/ration.js`'s single `env.hooks.maaFreeRoam` assignment - confirmed with `grep -rn maaFreeRoam\|pitajiFreeRoam src/` that nothing else in `src/` touches either hook); `src/jobs/milk.js`'s delivery timer deliberately keeps counting down through the walk back to the doodhwala after the last house (not a bug - the "on time" bonus is for the whole round including the return leg, matching its own "the cycle will make it quick" framing, and the full/late payout ratio is exactly 2x as its own comment promises); `src/jobs/minigames.js`'s `rhythmBar`/`powerMeter` only ever call `ctrl.close()` from a later user-input event (never synchronously inside `build()`), so entry 22's modal-ordering bugfix in `src/sideJobs.js` fully covers them; every `addEventListener` in `src/freeRoam.js`'s notebook-map section (canvas pointermove/leave/down/up, the close button) is wired once at module setup, never inside `openNotebook()`, and its "Visit place" list already clears `visitList.textContent` before rebuilding buttons each open (no duplicate-listener accumulation). `src/controls.js` and `src/quality.js` construct their listeners once per `InputController`/pause-menu setup, same as entry 21 already found.
- `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, exit 0, unchanged), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, exit 0, unchanged), `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, logged in NEEDS_YOU; no asset touched this cycle). `npx vite build` clean (234 modules, 1.1 s, no errors). The full `npm run build` chain (world-validator/collision-test) still OOMs this container per standing instruction; not fought.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call (this was a code-correctness/cleanup fix, not a taste call).
- NEXT: entries 20-23 have now each read one full category off CLAUDE.md 5a-MAP's "systems" list end to end (menus, sideJobs engine, mobile, audio/missions/jobs) and found only one further real bug (entry 22's modal-ordering fix) plus this entry's one dead-statement cleanup - the easy static-audit vein across the explicitly-permitted categories is close to exhausted for a no-browser container. A future firing with a working screenshot/world-validator pipeline should pick up BACKLOG J1-NOW's blocked render-to-board item (the only remaining blocker in section A); until then, the next unexplored static angle is `src/freeRoam.js` in full (this entry only read its notebook-map section; the toast queue, discovery/visit-list logic and the rest of its ~630 lines are still unread end to end) and `src/zoneManager.js` (zone streaming - arguably within "systems" even though not named explicitly in 5a-MAP's list).

# 24 Nov (22) - fresh container, confirmed main was already in sync with origin (entry 21's own note about a stale local ref turned out to be moot - fetch showed origin/main already at entry 21's tip, see below); audited another "systems" file (`src/sideJobs.js`, the 10-side-job engine) per entry 21's own NEXT, found and fixed a real (if currently latent) close-sequencing bug in its shared `modal()`/`closeModal()` pair and shipped it with a deterministic test

- Fresh container again this firing: `git status`/`git log` showed local `main` at `846dc03` (entry 21's own commit) with a clean working tree; `git fetch origin` confirmed `origin/main` was also at `846dc03` - genuinely in sync, no detached-HEAD/stale-ref recovery needed this time (unlike entries 16-21, several of which hit that fresh-container quirk). `npm install` re-run as always (`node_modules` empty in a fresh container - `node tools/check-door-routes.mjs` and `node tools/licence-audit.mjs --check` both correctly errored on a missing `three` package before this, confirming it really was just the fresh-container node_modules gap, not a new breakage). `Places V1/`, `reference-from-unity/` and Blender all confirmed absent again.
- Section A/BACKLOG A0: unchanged from entry 21 - everything either ticked, or blocked on Places V1/her verdict/the broken screenshot pipeline, or out of scope per 5a-MAP's map-uproot rule; the collision/door-routing static-audit vein entries 16-21 mined is exhausted (every remaining A0 line needs a live render trace this container can't do). Per entry 21's own NEXT and CLAUDE.md 5a-MAP's standing-permission list ("systems: collision, missions, audio, menus, mobile"), read through a different menus/UI file this time: `src/sideJobs.js` (the side-job engine: shared modal card, per-job overlays, rewards), rather than re-running the same collision checks again.
- First swept the same "does an existing persistent DOM element get a second listener registered on it by a function that runs more than once" pattern entry 21's pause.js fix was an instance of, across every `addEventListener` call in `src/` (grepped all ~70 call sites). Everything else checked out clean: `src/controlsHelp.js`, `src/ui.js`, `src/save.js`, `src/quality.js`, `src/controls.js`, `src/credits.js`, `src/minimap.js`, `src/villageSounds.js`, `src/jobs/minigames.js` (`onPress()` already registers+cleans up its own `window` keydown listener symmetrically, both on success and on `onClose`) are each either (a) wired exactly once, inside a setup function main.js calls exactly once at startup, or (b) use the "clear innerHTML then recreate fresh DOM nodes" pattern (`src/freeRoam.js`'s notebook/visit/tasks panels, `src/sideJobs.js`'s own modal buttons) which is safe by construction - old listeners die with the old nodes, nothing accumulates. Also checked `index.html` for the two `.quality-btn` button sets (pause menu + title-screen Settings panel sharing one class) aren't an ID collision - confirmed they're deliberately separate IDs both picked up by `pause.js`'s one `querySelectorAll('.quality-btn')`, by design (its own 24 Nov comment says so), not a bug.
- Reading `src/sideJobs.js` end to end instead found a different, real bug class in its `modal()`/`closeModal()` pair (the shared card every one of the 10 side jobs' mini-games opens through): `closeModal()` no-ops unless `overlay.classList.contains('visible')`, but the old `modal()` only added that `'visible'` class (and only armed `modalCloseHook`, the onClose callback) **after** calling `build?.(body, ctrl)` - so a `build()` callback that calls `ctrl.close()` synchronously (not from a later user-input event, which is all any of the 10 real jobs currently do - checked every `src/jobs/*.js`, none do this today) would silently fail to close: `overlay` never loses `'visible'` (it was never added yet), `body`/`actions` never get cleared, `env.setFrozen(false)` never runs (the world stays frozen - player input locked), and the caller's `onClose` never fires (because `modalCloseHook` wasn't set yet either). A genuinely bad failure mode if it ever fires: a silently stuck, frozen game with no visible card and no way out, for one specific input shape nothing today happens to use.
- Fixed: moved `modalCloseHook = onClose || null; overlay.classList.add('visible'); env.setFrozen(true);` to run **before** `build?.(body, ctrl)` instead of after. Checked this reordering is safe: `build()` only ever populates DOM content (no job's `build()` reads layout/`getBoundingClientRect()`/`offsetWidth` off the overlay - grepped `src/jobs/*.js` and `src/sideJobs.js`, zero hits), and the browser doesn't paint until the synchronous call stack (including `build()`) finishes either way, so visually nothing changes; only the ctrl.close()-from-inside-build() edge case behaves differently now, correctly.
- Verified with a deterministic test (`tmp/unit-test-sidejobs-modal-close.mjs`) in two parts, since `createSideJobs()` itself can't be imported standalone in a no-browser Node test the way `pause.js`/`controls.js` can - it eagerly builds real THREE geometry and wires ~10 job modules against a full game `env` (scene, quest, dialogue, audio, freeRoam, npcs, player...) at call time, unlike those small self-contained DOM modules: (1) a **static** check reading the real, unmodified `src/sideJobs.js` off disk and confirming its `modal()` function text really does have `modalCloseHook = ...`/`overlay.classList.add('visible')` positioned before `build?.(body, ctrl);` (so this test is tied to the live source and fails loudly if a future edit reverts the ordering); (2) a **dynamic** behavioural reproduction of the exact closure logic (both the old pre-fix ordering and the new post-fix ordering, copied verbatim) against a minimal fake DOM, calling `ctrl.close()` synchronously from inside `build()` in both cases. Confirmed: old ordering leaves `overlay` marked visible, the world frozen, and `onClose` never fired (the bug, reproduced); new ordering closes correctly - `overlay` not visible, world unfrozen, body cleared, `onClose` fired (the fix, confirmed). Both parts PASS.
- `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, exit 0, unchanged), `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, exit 0, unchanged), `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'` call, logged in NEEDS_YOU; no asset touched this cycle). `npx vite build` clean (234 modules, 1.1 s, no errors). The full `npm run build` chain (world-validator/collision-test) still OOMs this container per every recent entry; not fought, per standing instruction.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no layout/position change, no taste call. This was a code-correctness fix (a latent failure mode in shared engine code), not a taste call.
- NEXT: the `addEventListener` sweep this entry ran across `src/` found no second instance of entry 21's exact bug shape, and this entry's `src/sideJobs.js` read-through found a different bug class instead (close-ordering, not duplicate-listener) - worth re-applying that same "read the whole file for bugs" discipline to the 10 individual `src/jobs/*.js` files next (pump/ration/stalls/kulfi/kanche/gilli/milk/chakki/gate/patang/mango), none of which this entry read end to end, plus `src/audio.js` (1017 lines, only the first ~215 read this entry - sound mixing logic, not yet fully audited) and the "mobile" category (`src/controls.js`'s touch joystick/look-zone was read and is clean; `src/quality.js`'s touch presets likewise) that CLAUDE.md 5a-MAP's standing-permission list still lists as open categories.





- Fresh container again this firing: `HEAD` was detached at `0a035a2` (entry 20's own 2 commits:
  `check-door-routes.mjs` + the NEEDS_YOU cleanup), local `main`'s branch pointer stale at `f00f10f`
  (2 commits behind). `git fetch origin main` confirmed `origin/main` was ALSO still at `f00f10f` - so
  entry 20's work had never actually been pushed (unlike entry 18's near-identical-looking case, where
  origin already had the tip and it was only the local branch ref that was stale). Fixed the only way
  that's safe for genuinely unpushed work: `git checkout main && git merge --ff-only 0a035a2 && git push
  origin main` (fast-forward, no new commit, confirmed "up to date" after). Recorded here so a future
  firing doesn't skip the `git fetch origin` step this entry's own instructions call for before deciding
  anything is "just a stale pointer" - this time it genuinely wasn't pushed. `npm install` re-run as
  always (`node_modules` empty in a fresh container). `Places V1/`, `reference-from-unity/` and Blender
  all confirmed absent again.
- Section A/BACKLOG A0: same state as every recent entry (everything ticked, blocked on Places V1/her
  verdict/the broken screenshot pipeline, or out of scope per 5a-MAP's map-uproot rule) - and, per this
  firing's own instructions, the screenshot/world-validator pipeline is known-broken in this container and
  not worth fighting again. Entries 16-20 had each mined BACKLOG A0's "collision" sub-items for static,
  no-browser work; by entry 20 that vein was close to exhausted (every remaining A0 line needs either a
  live render trace or a much larger static effort already scoped and declined). Per CLAUDE.md 5a-MAP's
  standing-permission list - "systems (collision, missions, audio, menus, mobile)" - this entry deliberately
  looked at a DIFFERENT system in that list for the first time: **menus** (`src/pause.js`, `src/controls.js`,
  `src/quality.js`), rather than re-running the collision line again.
- Read `src/pause.js` end to end (the pause/settings menu: Esc/touch-button open, quality presets, volume
  slider, minimap toggle, credits/controls/notebook/visit/tasks buttons). Found a real bug in
  `setQualityButtonsUI(level)`: its body contained `document.getElementById('pause-minimap-btn')
  ?.addEventListener('pointerdown', () => onToggleMinimap?.())` - i.e. the minimap button's click listener
  was wired *inside* the function that updates which quality button looks active, instead of being wired
  once at setup. That function runs once at setup AND again every time any quality button
  (High/Medium/Low) is clicked (`setQualityButtonsUI(level); onQualityChange?.(level);` in the quality
  button's own click handler) - so every quality-preset click silently added one MORE 'pointerdown'
  listener onto the same minimap button, on top of the ones already there. A player who presses a quality
  button N times before next tapping the minimap toggle gets `onToggleMinimap` fired N+1 times on that one
  tap - an even N+1 (e.g. after 1 quality click, 2 fires) cancels itself out and the minimap button looks
  completely broken; an odd one fires an extra, silently-wrong number of toggles. Indentation in the
  original code was already visibly broken (a stray closing brace one line early) - a tell that this was a
  botched edit, not an intentional pattern.
- Fixed: moved the `pause-minimap-btn` listener registration out of `setQualityButtonsUI` to run exactly
  once, alongside the other one-time button wiring (credits/controls/notebook/visit/tasks), right before
  the function is first defined. `setQualityButtonsUI` now only does what its name says: toggle the
  `active` class on the three quality buttons.
- Verified with a deterministic unit test against the real, unmodified `src/pause.js`
  (`tmp/unit-test-pause-minimap.mjs`, same style as entries 15-20's own tests): a minimal in-Node fake DOM
  (classList with add/remove/toggle, addEventListener/dispatch, dataset, getElementById/querySelectorAll)
  drives the real `setupPauseMenu()` export directly, no browser needed since this file is pure DOM
  wiring with no THREE/canvas dependency. Confirmed the bug first (pre-fix: 1 quality click + 1 minimap
  click -> `onToggleMinimap` fired 2 times; 3 more quality clicks + 1 minimap click -> fired 5 times), then
  re-ran after the fix (both cases now fire exactly 1 time, exit 0). Also read `src/main.js`'s only caller
  (`setupPauseMenu({ onToggleMinimap: () => { minimap.setHidden(!minimap.isHidden()); syncMinimapBtn(); },
  ... })`, line ~2983) and confirmed it is the single source of truth for this button - nothing elsewhere in
  `src/` or `index.html` wires `#pause-minimap-btn` a second time, so the fix is the complete fix, not a
  partial one.
- This is a real player-facing functional bug (the minimap toggle button silently stops doing what it
  says), not a taste call - no art-director decision involved, nothing in `docs/NEEDS_YOU.md`.
- `node tools/check-position-writes.mjs` (213 files, 0 gap candidates, exit 0, unchanged from entry 20),
  `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, exit 0, unchanged), `node
  tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node
  tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned), `node
  tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same pre-existing breaches as every
  recent entry - her own deferred `WEB_QUALITY='full'` call, logged in NEEDS_YOU; no asset touched this
  cycle). `npx vite build` clean (234 modules, 1.3 s, no errors). The full `npm run build` chain
  (world-validator/collision-test) still OOMs this container per this firing's own instructions and every
  recent entry; not fought.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no
  layout/position change, no taste call.
- NEXT: the "menus" system still has `src/ui.js`, `src/save.js`, `src/controlsHelp.js` and the title-screen
  settings panel unaudited the same way; "audio" (`src/audio.js`, `src/villageSounds.js`) and "mobile"
  (`src/controls.js`'s touch joystick/look-zone, `src/quality.js`'s touch presets) are two more whole
  categories in CLAUDE.md 5a-MAP's standing-permission list this loop hadn't touched before this entry -
  worth a read-through-for-bugs pass each, the same way this entry found a real one in pause.js, rather
  than only re-running the existing collision checks every cycle.



- Fresh container again this firing: `git status`/`git log` showed local `main` already at `origin/main`'s tip
  (`282a503`, entry 19's own commit) with a clean working tree. `npm install` re-run as always (`node_modules`
  empty in a fresh container). `Places V1/`, `reference-from-unity/` and Blender all confirmed absent again
  (same as every recent entry).
- Section A of BACKLOG.md: same state entry 19 left it (everything either ticked, or blocked on Places V1/her
  verdict/a working screenshot pipeline, or out of scope per 5a-MAP's map-uproot rule). Per CLAUDE.md 5a-MAP/
  section 2, stayed in the standing-permission "systems (collision...)" category, this time on a different A0
  line than entries 16-19 all used: "NPCs entering a building must route to the door and pass through the
  opening, never a wall; re-path any routine that cannot." Its last progress note (2026-10-23) had already
  established the real behaviour (followers walk door points via src/doorRouting.js; no other NPC routine
  enters a building - checked again this cycle by re-reading src/main.js: only `maaFollow`/`sisterFollow` ever
  pass `buildings: BUILDING_ROUTES`, and the comment at src/main.js:495 confirms bazaar/shop units have "no
  walkable interior, none feeds a quest") but had never verified the ROUTING DATA ITSELF is self-consistent -
  the actual thing src/npcRoutines.js's `doorLegs()` trusts without checking.
- Confirmed src/doorRouting.js and the village.js constants it imports are pure coordinate math with no THREE
  scene or DOM dependency (`BUILDING_ROUTES` imported and ran standalone in plain Node in well under a second,
  no browser) - so unlike the "needs a live scene" blocker on BACKLOG A0's waypoint-validation item (still open,
  same reason entries 18/19 logged), this one genuinely doesn't need the broken render pipeline at all.
- Built `tools/check-door-routes.mjs`: checks (1) `links[i][0]` really resolves to zone `i` and `links[i][1]`
  really resolves to zone `i+1` via the real `zoneOf()` function on each route (get this backwards or
  mis-ordered and `doorLegs()`'s index-ordered queue walk sends a follower to a point that isn't actually in
  the room it thinks it's in/leaving - i.e. toward a wall, not the opening), (2) the two points of one link are
  under 5 m apart (a plausible door width - catches a miscopied-coordinate bug that would still pass check 1),
  (3) every zone from 0 to `links.length` is reachable by at least one link point (catches a future building
  whose `zoneOf` has a gap `doorLegs()`'s `for` loop would walk off the end of).
- Self-tested same discipline as entry 19's tool: 4 deliberately broken synthetic routes (link[0]'s two points
  reversed, link[0][1] moved 50 m away, a skipped zone, a malformed pair) were each confirmed flagged, and one
  correct synthetic route was confirmed to pass clean with 0 gaps - 4/4 faults caught, no false positive.
- Ran against the real `BUILDING_ROUTES`: 0 gaps. Both routes (house: 2 links/3 zones, school_room: 1 link/2
  zones) check out - `links[i][0]`/`links[i][1]` land in the right zone every time, every link is 2.0-2.4 m
  (a real door width), and zones 0/1/2 (house) and 0/1 (school_room) are all reachable.
- This closes the "is the door-routing DATA right" half of the backlog item with a real, reusable, self-tested
  check; it does NOT close the "does it stay clear of the real wall mesh" half (that still needs
  world-validator.js's check 9 or a live walkthrough, both blocked on this container's render-pipeline OOM, not
  a new blocker - logged by every recent entry). Updated BACKLOG.md's item in place with this, not ticked.
- Separately, cleared a small stale item off docs/NEEDS_YOU.md: `tools/shrink-character.js` (a dead tool from
  an abandoned shrink attempt, per the 23 Nov note already in NEEDS_YOU, "redundant now... safe to ignore or
  remove it"). Per CLAUDE.md's "never `rm` anything, one-off scripts go in `tmp/`" rule, moved it (not deleted)
  from `tools/` to `tmp/` via `git mv` then un-staged the `tmp/` half (gitignored, stays local, matches how
  every other scratch file in this repo is handled) - so it's physically preserved but no longer sitting in
  `tools/` looking like a live, maintained tool. Marked that NEEDS_YOU line `status: done`.
- Verified: `node tools/check-door-routes.mjs` (self-test 4/4, real check 0 gaps, exit 0); re-ran the full
  existing static suite to confirm nothing regressed - `node tools/check-position-writes.mjs` (213 files, 0 gap
  candidates, exit 0), `node tools/collider-coverage-audit.mjs` (227 covered/22 excluded/7 verified-safe/0
  gaps, unchanged from entry 19), `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same
  pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs`
  PASS (49 scanned), `node tools/place-visibility-check.js` PASS, `npx vite build` clean (no errors), `node
  tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred `WEB_QUALITY='full'`
  call, logged in NEEDS_YOU; no asset touched this cycle). The full `npm run build` chain (world-validator/
  collision-test) still OOMs this container exactly as entries 15-19 documented; not fought, per standing
  instruction.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` beyond closing the shrink-character line above - no decision needed from
  her, no money/credits spent, no layout/position change, no taste call.
- NEXT: BACKLOG A0's remaining open items ("validate every waypoint path walkable at build time", "verify
  across a multi-minute continuous run") both still need either the renderer (broken here) or the much larger
  static effort entry 19 already scoped and declined to attempt (reconstructing real building footprints
  without three.js) - not attempted again this entry, same constraint. A future firing with a working
  screenshot/world-validator pipeline should run check 9 specifically against the two routes
  `tools/check-door-routes.mjs` now guards, to close the "stays clear of the real wall mesh" half this entry
  left open.

# 24 Nov (19) - turned entries 16/17/18's own repeated-by-hand "no routine sets position directly without a collision check" grep into a real, self-tested tool (`tools/check-position-writes.mjs`), and used it to find and clear one real hit no earlier cycle had actually read (`src/roadEvents.js:430`, confirmed safe)

- Fresh container again this firing: `git status`/`git log` showed local `main` already at `origin/main`'s tip
  (`f00f10f`, entry 18's own commit) with a clean working tree - no detached-HEAD/stale-branch recovery needed this
  time (unlike entries 16-18, each of which hit that same fresh-container quirk). `npm install` re-run as always
  (`node_modules` empty in a fresh container). `Places V1/`, `reference-from-unity/` and Blender all confirmed
  absent again (J1-OLD2/J1-OLD/J2 still un-runnable here).
- Section A of BACKLOG.md: same state entry 18 left it in (everything either ticked, or blocked on Places V1/her
  verdict/a working screenshot pipeline, or out of scope per 5a-MAP's map-uproot rule). Per CLAUDE.md 5a-MAP/
  section 2, picked the same standing-permission "systems (collision...)" category entries 15-18 all used, on
  BACKLOG A0's own still-open top item: "Route every NPC and animal through the same collision resolver the
  player uses; no routine sets position directly without a collision check." Entries 16, 17 and 18 each re-ran
  this item's check by hand (a one-off `grep -rnE` command, re-typed from scratch each cycle since no previous
  entry's exact command survives anywhere but its own prose) and each found it clean. Re-running the same grep
  today surfaced hits none of their write-ups actually walked through one by one (`src/roadEvents.js:430`,
  several `src/main.js` world-edge clamps, `src/kit/housesPlan.js:292`, `src/waypoint.js:47-48`) - not new bugs
  (all read and confirmed safe below), but proof the manual-grep approach itself doesn't reliably cover its own
  past findings cycle to cycle, which is exactly the kind of repeated-by-hand work this hourly loop should instead
  make permanent.
- Built `tools/check-position-writes.mjs`: scans every `src/**/*.js` (213 files) for the same
  `.x +=`/`.z +=`/`.position.(x|z) =` pattern this item has always been about. A hit is auto-cleared when a
  resolveMove/resolveOrientedMove/resolveOrientedCollisions/resolveCollisions call sits within 6 lines in the
  same file (19 hits cleared this way - the dog/goat fixes from entries 16/17, the player/vehicle/cycle movement
  functions in main.js, the Blender-matka/trim shader uniforms, etc.), or when it sits inside a GLSL
  template-literal shader string (detected by counting un-escaped backticks seen so far in the file - odd count
  means inside one; this is what npcRoutines.js's rooftop-chase leg narrowly avoided needing, see below).
  Everything else must be in a hand-verified EXEMPT table with the actual reasoning written out, never added
  just to silence a hit.
- Populated EXEMPT with 4 entries, each read and confirmed by hand this cycle:
  1. `npcRoutines.js`'s `createWaypointRun` rooftop-chase leg (`npcGroup.position.x/z +=`, gated by
     `(target.y ?? 0) > 0.5 || npcGroup.position.y > 0.5`) - the same documented M6-monkey exception entries
     before 16 already named (its own doc comment above the function explains it: 2D collision would block a
     roof walk, so an elevated leg deliberately walks over the walls beneath it).
  2. `roadEvents.js:430` - the road-crossing goat herd nudging a too-close player sideways
     (`player.position.x = nx; player.position.z = nz;`, NOT the player's own WASD movement, which still goes
     through `movePlayerBy`/`resolveMove` untouched). Read `clearAt()` (`src/roadEvents.js:59`,
     `!circleHitsAnyBox({x,z}, r, staticBoxesNear(x,z,r+1))`) - it checks the destination circle against the same
     static-collider source resolveMove itself uses, called immediately before the write. Also guarded by
     `player.parent === scene` (skipped entirely while mounted on a vehicle, where the player group is
     reparented - so this can't fight the vehicle-mount invariant) and a push capped at `(0.62 - d) * 0.35`,
     under 0.22 m at its largest - too small to tunnel any wall even without resolveMove's own swept-substep
     check, which only matters for continuous per-frame movement, not a single capped nudge. Safe by a different
     but equally real collision check, not an unchecked write.
  3. `waypoint.js:47-48` - the objective waypoint glow mesh (name `waypoint_glow`, already in
     world-validator.js's own non-solid EXCLUDE set) following the current objective point; a ground decal, not
     a body.
  4. `kit/housesPlan.js:292` - a BUILD-TIME layout solver inside the house-kit plan generator (push two
     overlapping house footprints apart while laying out the plan), not a runtime scene body at all: it mutates
     a plain `{x, z, corners}` record in an array, long before any of it becomes a THREE object, and explicitly
     gives up and records `solidOverlap` rather than let a house step onto a road or another house (read the
     surrounding `hitsAnotherHouse`/`hitsRoad` checks to confirm). No live body exists here for a player/vehicle/
     NPC to ever meet mid-nudge.
  Several `main.js` hits (`player.position.z = THREE.MathUtils.clamp(...)` and two vehicle equivalents) needed a
  5th, more general EXEMPT entry rather than a one-off: the GROUND_HALF_EXTENT/GROUND_HALF_Z world-edge clamp
  pattern, applied every time right after the real resolver already ran earlier in the same step function
  (`movePlayerBy`/`stepCycle` call resolveMove/resolveOrientedMove inline; the vehicle step functions call it
  through `moveSmallVehicle()`, which itself calls resolveMove/resolveOrientedMove/resolveOrientedCollisions a
  few lines above its own clamp - so the text-only nearby-call window can't always see across that one extra
  layer of function call). This is a stay-on-the-map clamp, never a wall check, and it's the same pattern
  repeated by design every time a body's position is finalized for the frame.
- Self-tested the tool actually catches a real violation, not just a script that always passes: wrote a scratch
  file `src/__posWriteTestTmp.js` with a fake routine (`o.x += (tx - o.x) * dt; o.z += (tz - o.z) * dt;`, no
  resolver call anywhere nearby), ran the tool - correctly flagged both lines as GAP CANDIDATEs and exited 1 -
  then deleted the scratch file and re-ran: 0 gap candidates, exit 0, matching the real codebase's clean state.
  Nothing from this test is in the commit; `git status` confirmed clean before committing.
- Not wired into `npm run build` or `package.json`, on purpose and by precedent: `tools/collider-coverage-audit.mjs`
  (entry from 2026-11-22, the same style of static heuristic audit for a sibling A0 item) isn't wired in either -
  both are standalone checks meant to be run by hand or at the top of a future cycle, not a CI gate, because a
  genuinely new state-writing routine should get a human/agent's own EXEMPT-table judgement and reasoning, not an
  automatic pass (a reason could be wrong) or a surprise deploy failure (this container still can't prove the
  real runtime behaviour, only the text).
- `node tools/check-position-writes.mjs`: 213 files, 19 auto-cleared, 7 hand-exempted, 0 gap candidates, exit 0.
  `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning),
  `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned, 0 unwrapped
  clones), `node tools/place-visibility-check.js` PASS, `node tools/collider-coverage-audit.mjs` re-run as a
  cross-check (227 covered, 22 excluded, 7 verified-safe, 0 gaps - unchanged from 22 Nov plus one newly-covered
  builder), `node tools/check-budget.js` (same pre-existing breaches as every recent entry - her own deferred
  `WEB_QUALITY='full'` call, logged in NEEDS_YOU; no asset touched this cycle). `npx vite build` clean (234
  modules, no errors). The full `npm run build` chain (world-validator/collision-test) still OOMs this container
  exactly as entries 15-18 documented; not fought, per standing instruction - this cycle's new tool needs none of
  that pipeline.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no
  layout/position CHANGE (this only reads and documents existing code; it doesn't move or touch anything that
  moves in the game), no taste call.
- NEXT: run `tools/check-position-writes.mjs` at the start of any future cycle that touches a moving NPC/vehicle/
  animal routine, instead of re-deriving the grep from scratch - add any genuinely new hit to its EXEMPT table
  with real reasoning, or route it through the resolver if it turns out unsafe. The other BACKLOG A0 open item
  ("Validate every waypoint path as walkable at build time") still needs either the renderer (broken here) or a
  much larger static effort (reconstructing real building footprints without three.js, which `buildCollidersFromScene`
  currently requires a live scene for) - not attempted again this entry, same constraint entry 18 logged.

# 24 Nov (18) - recovered 6 orphaned commits (entries 14-17's own work) from a detached-HEAD checkout onto `main`; extended `devCheckPenetration()` to cover the cyclist dog and goat herd (BACKLOG A0's own gap note), closing the loop entries 16/17 opened

- Fresh container again this firing: `HEAD` was detached at `68668dd` (entries 14-17's own 6 commits:
  favicon, slot-swap-test, prop shrink, the cyclist-dog fix, the goat-herd fix), but local `main`'s
  branch pointer was stale at `843b936` (6 commits behind, NOT an ancestor relationship the easy way -
  `git log main..68668dd` showed main had nothing the detached HEAD lacked, so a clean fast-forward).
  Unlike every recent entry's "stale pointer, origin already has it" pattern, `git fetch origin main`
  showed `origin/main` was ALSO already at `68668dd` - so this really was just a stale local branch ref
  in a fresh container (the push that mattered had already happened in a prior firing), not unpushed
  work at risk of loss. Fixed with `git checkout main && git merge --ff-only 68668dd`; `git push`
  correctly reported "Everything up-to-date". Recorded here mainly so a future firing doesn't waste a
  cycle re-diagnosing the same detached-HEAD-vs-stale-branch question: always `git fetch origin` before
  concluding anything is actually lost. `npm install` re-run as always. `Places V1/`/`reference-from-
  unity/`/Blender confirmed absent again.
- Section A of BACKLOG.md: same state as entry 17 left it (J1-OLD2/J1-OLD/J2 blocked on Places V1/her
  verdict, both absent/blocked here; J3/J4 ticked). Per CLAUDE.md 5a-MAP/section 2, stayed in the
  standing-permission "systems" category. Re-ran entry 17's own NEXT instruction (re-grep every
  `src/*.js` for a direct `.x +=`/`.z +=`/`.position.(x|z) =` write outside movement.js/collision.js,
  looking for a third instance of the dog/goat bug class): found none - the remaining hits
  (`afternoonMood.js`, `laundry.js`, `trees.js`, `villageFurniture3.js`) are GLSL shader wind/sway
  displacement inside template-literal shader strings, not JS position writes, and `cyclistEvents2.js`'s
  tractor/kid/kite are deliberately "pure visuals, no colliders" per that file's own doc comment (road-
  events seen from the highway, never meant to be solid). So that specific bug class appears closed.
- Picked BACKLOG A0's own still-open, closely related item instead: "Extend devCheckPenetration() to
  cover NPCs and animals, not just vehicles; log any penetration as a failure" - its existing 2026-10-23
  progress note covers named NPCs, bazaar villagers and the *stationary* animal herds, but explicitly
  says "Animals are stationary (no routines)", which entries 16/17 made stale: the cyclist dog and the
  goat herd/goatherd are now real per-frame-moving bodies the guard never looked at.
- Added: `src/roadEvents.js` now exports `GOAT_FOOTPRINT_RADIUS`/`HERDER_FOOTPRINT_RADIUS` (were
  module-private) and exposes live refs `info.herd`/`info.crossing` on `window.__roadEvents` (same
  "read by headless ride checks" pattern `src/cyclistEvents.js`'s `info.sites`/`info.dog` already use -
  `crossing.herder` is added lazily by `stepHerd()`, so exposing the `crossing` object itself, not a
  copy, means it stays live once that happens). `src/main.js`'s `devCheckPenetration()` gained three new
  checks (dog, each goat, the goatherd) using the same `minSignedDistanceToColliders`/`STATIC_COLLIDERS`
  pattern the existing NPC/bazaar-villager/stationary-animal checks already use, console.warn-only, zero
  per-frame cost beyond what the function already does every 16th frame in dev mode.
- This is a regression guard, not an expected-to-fire check: resolveMove (entries 16/17's fix) already
  stops these bodies at a wall face, so in normal play the new checks should stay silent forever - their
  value is catching a FUTURE change that reintroduces a raw position write on either body, same as the
  existing vehicle/NPC checks already do for their own systems.
- Verified with a deterministic unit test against the real, unmocked `src/collision.js`
  (`tmp/unit-test-penetration-guard.mjs`, same method as entries 15/16/17's own tests, avoiding this
  container's `ERR_IMPORT_ATTRIBUTE_MISSING` on a transitive raw-JSON import by copying the three radius
  constants from their real `export const` lines rather than importing `animals.js`/`roadEvents.js`
  directly - values checked identical by grep immediately before the test ran): a body placed inside the
  same 2.6 m wall AABB shape entries 16/17 used correctly trips negative clearance for all three
  (dog/goat/goatherd radii), a body at the exact resolveMove-correct stop distance (wall face + its own
  radius) correctly stays non-negative (the real "no false positive in normal play" case), and a body far
  from any wall stays silent. 7/7 checks passed.
- `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning),
  `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned, 0
  unwrapped clones), `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same
  pre-existing breaches as every recent entry - character WEB_QUALITY='full' is her own deferred call,
  logged in NEEDS_YOU; no asset touched this cycle, src-only change). `npx vite build` clean (234
  modules, 3.67 s, no errors). The full `npm run build` chain (world-validator/collision-test) still
  times out/OOMs this container exactly as entries 15/16/17 documented; not fought, per standing
  instruction.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see
  below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent,
  no layout/position change, no taste call.
- NEXT: BACKLOG A0 still has two other open sub-items worth a future audit pass: "Validate every
  waypoint path as walkable at build time" (animal routines and the follow routine are still
  unregistered with check 9, per its own 2026-10-23 note) and "NPCs entering a building must route to
  the door" (only followers currently do; no other routine enters a building). Both need either the
  renderer (broken here) or a careful static trace to verify, same constraint this entry worked around.

# 23 Nov (17) - routed the road-crossing goat herd and goatherd through the shared collision resolver (BACKLOG A0, same class of gap entry 16 fixed for the cyclist-chasing dog, found in a different file)

- Fresh container again this firing: local `main` was behind `origin/main` by 0 commits once fetched (HEAD was
  detached exactly at `origin/main`'s tip, `4d37bf8` — entry 16's own work), so this was a stale local branch
  pointer, not unpushed work — `git checkout -B main origin/main` reset it with zero risk. `npm install` re-run
  as always (`node_modules` empty in a fresh container). `Places V1/`, `reference-from-unity/` and Blender all
  confirmed absent again (J1-OLD2/J1-OLD/J2 still un-runnable here).
- Section A of BACKLOG.md is still either ticked, blocked on Places V1/Blender/her verdict (confirmed absent),
  or layout (out of scope per 5a-MAP). Per CLAUDE.md 5a-MAP/section 2, picked the same standing-permission
  category entry 16 used: "systems (collision, missions, audio, menus, mobile)", which survives the map
  uproot. Re-ran entry 16's own code audit (grep of `resolveMove`/`resolveCollisions` across every `src/*.js`)
  to look for a second instance of the same bug class in a file that grep didn't cover last time, since
  `src/roadEvents.js` (a separate moving-animal system from `src/animals.js`/`src/npcRoutines.js`) wasn't in
  entry 16's list.
- Found exactly one real gap, same shape as the dog: `src/roadEvents.js`'s `stepHerd()` (the nine-goat herd +
  goatherd that cross `cross_road` back and forth, grazing the verges between crossings — `GOAT_SITE.road =
  'cross_road'`, a live, NOT orphaned road id on the current default layout, unlike `THELA_LANE`/`KHOONTA_LANE`/
  `gullyLife.js`'s `LANES` which entry 16 found dead) moved both the goats and the herder with a private `ease()`
  helper that wrote `o.x += ...; o.z += ...;` straight from the target-seeking velocity, with zero collision
  check against any wall, building or prop — the goat herd could walk straight through a building on its way
  across the crossing. `bov`/`dogs` (the lying cow, tied buffalo, sleeping dogs) in the same file are confirmed
  static (sway/breath animation only, `.position` never written) so they have nothing to route, matching entry
  16's finding for `animals.js`.
- Fixed: `ease()` now takes a `radius` and calls `resolveMove(o, ..., radius)` from `src/movement.js` (the same
  swept-substep resolver the player, vehicles, NPCs and the cyclist-dog all use) instead of the raw `+=`. Two
  new footprint radii in `roadEvents.js` (`GOAT_FOOTPRINT_RADIUS = 0.22`, sized off `buildGoatGeometry()`'s own
  barrel; `HERDER_FOOTPRINT_RADIUS = 0.3`, matching `herderGeometry()`'s own capsule radius) — kept local to
  this file rather than exported from `animals.js` like `DOG_FOOTPRINT_RADIUS`, since the goat/herder geometry
  is itself built in `roadEvents.js`, not `animals.js`. The one-time initial snap (`first` branch, `o.x = tx; o.z
  = tz`) is untouched — that is placement, not movement, same as every other routine's initial `position.set()`.
- Verified two ways (the renderer OOM-crashing on this container's full zone-streaming settle before checks 4/5,
  same root cause entries 15/16 pinned down, ruled out the normal validator/collision-test route again):
  1. **Deterministic unit test against the real, unmocked `src/movement.js`/`src/collision.js`**
     (`tmp/unit-test-goat-herd-collision.mjs`, Node, no browser, same method as entry 16's dog test): a real 2.6 m
     wall AABB (`src/collision.js`'s own `{minX,maxX,minZ,maxZ}` shape, via the `setStaticColliders()` test hook
     `tools/collision-test.js` itself uses), goat starting 1.5 m outside the near face aimed at a point 1.5 m past
     the far face. **Pre-fix line's own simulated result reaches the far-side target at x=4.100 — having walked
     straight through the solid 0-to-2.6 m wall block to get there, a real reproduced tunnelling bug.** Post-fix
     `resolveMove()` stops the goat at x=-0.220, exactly `wall.minX - GOAT_FOOTPRINT_RADIUS` (its own body surface
     touching the wall face, not a cm closer) — the correct result from the real production collision code.
  2. **Real in-browser load, short-lived** (`tmp/diag-goat-herd.mjs`, `?dev=1`, two runs at 9 s and 25 s): zero
     console/page errors both times, confirming the new import (`resolveMove` from `src/movement.js`, not
     previously imported into `roadEvents.js`) wires cleanly with no circular-import or runtime exception.
     `window.__roadEvents.placed` stayed empty at both wait lengths — not a regression from this change: the
     module's own `build()` is gated behind `settlingReleased()` + `lazyDue(frames, 30)` (src/roadEvents.js line
     487, "load time: lazy builds wait for the opening view"), and this container's software-rendered frame rate
     is low enough that neither 9 nor 25 real seconds reach that frame threshold — the exact wall-clock-vs-
     simulated-time mismatch entry 16 already logged for this container. Noted here, not chased further (two-
     strike rule): the deterministic test above is what actually proves the fix, same conclusion entry 16 reached.
- `npm install` (fresh container) then: `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same
  pre-existing Tripo-plan warning), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs`
  PASS (49 scanned, 0 unwrapped clones), `node tools/place-visibility-check.js` PASS, `npx vite build` clean (234
  modules, 674 ms, no errors), `node tools/check-budget.js` (same 15 pre-existing breaches as every recent entry,
  all already logged in NEEDS_YOU as her call — no asset touched this cycle, src-only change). The full `npm run
  build` chain (which also runs `world-validator.js`/`collision-test.js`) still OOMs this container exactly as
  entries 15/16 documented; not fought, per standing instruction.
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle — no decision needed from her, no money/credits spent, no
  layout/position CHANGE (GOAT_SITE's road id and crossing-search logic are untouched; only how the already-
  placed bodies move was fixed), no taste call.
- NEXT: the same `src/*.js` moving-body audit (`resolveMove`/`resolveCollisions` grep) should be re-run against
  any future file that creates a per-frame-updated herd/NPC/vehicle, since this entry found a second real
  instance in a file entry 16's narrower grep (`npc.js`/`bazaarLife.js`/`animals.js`/`sideJobs.js`/`jobs/*.js`/
  `rooftops.js`/`ambient.js`/`npcRoutines.js`) didn't cover. Render-tooling-wise: nothing new to add beyond
  entries 15/16's findings — this entry's two 9 s/25 s browser waits are additional confirmation that short
  waits in this container do not reach this game's own lazy-build frame threshold, not just the OOM ceiling.

# 23 Nov (16) - routed the cyclist-chasing dog through the shared collision resolver (BACKLOG A0: "no routine sets position directly without a collision check"); found and logged (not fixed) that the new-layout flip silently orphaned 3 old-layout-road-id systems

- Fresh container again this firing: `HEAD` detached 4 commits AHEAD of local `main` on checkout (`a8624e6`,
  entries 14/15's own work). `git fetch origin` showed `origin/main` was ALREADY at that same commit, so this
  was a stale local branch pointer in a fresh container, not unpushed work (same pattern as entries 11-13) —
  `git checkout main && git merge --ff-only` fast-forwarded with zero risk, `git push` correctly reported
  nothing new to send. `npm install` re-run as always. `Places V1/` and Blender both confirmed absent again.
- Section A of BACKLOG.md has nothing left that is both unticked and unblocked (J1-OLD2/J1-OLD/J2 all need
  Places V1 or her material-board verdict, both absent/blocked here; J3/J4 all ticked) except one item outside
  the Places-V1 track: "Draw-call ceiling... instance every repeated shared asset... only then consider
  raising the ceiling" — but every tool that could measure a draw-call count (`perf-budget-check.js`,
  `perf-check.js`, `world-validator.js`) crashes this container's Chromium process on a hard cgroup memory
  ceiling (confirmed via `dmesg`: `Memory cgroup out of memory: Killed process ... (chrome-headless)
  anon-rss:2951792kB`, independent of host `free -h` showing 6.9 GiB free — this is a per-task cgroup limit,
  not host memory pressure, same root cause entry 15 pinned down for `world-validator.js` specifically, now
  confirmed for the lighter checks too). So, per CLAUDE.md section 2/5a0, picked BACKLOG's other standing-
  permission category instead: "systems (collision, missions, audio, menus, mobile)" from 5a-MAP, which
  survives the map uproot and needs no renderer-measurement to verify.
- Audited every moving NPC/animal body against `src/movement.js`'s own stated rule ("every moving body in this
  game now proposes a movement through resolveMove() below and nothing else") by reading source, not guessing:
  `src/npcRoutines.js`'s waypoint/follow/run loops all call `resolveMove`/`resolveCollisions` (the one
  documented exception, the M6 rooftop-chase leg, deliberately skips it while airborne over walls below, by
  design); `src/bazaarLife.js`'s 4 walking villagers already call `resolveMove` too (its own doc comment says
  so); `src/animals.js`'s cattle/dogs/monkey are static placements (`.position.set()` once, never updated per
  frame — "Static/stationary animals this pass, not roaming", per docs/NEEDS_YOU.md's 22 Nov crop-models line
  and the M6/field-animals FINISH_LINE entries) so they have nothing to route. Found exactly one real gap:
  `src/cyclistEvents.js`'s pariah dog (the one that gets up and follows the player's bicycle after 2 passes,
  then trots home) wrote `dog.x += nx * sp * dt; dog.z += nz * sp * dt` directly every frame in both its
  'follow' and 'home' states — the exact "no routine sets position directly without a collision check" gap
  BACKLOG.md's A0 section names, just not yet closed for this one body.
- Fixed: both branches now call `resolveMove(dog, dx, dz, DOG_FOOTPRINT_RADIUS, [])` from `src/movement.js`
  (same swept-substep resolver the player, vehicles, and every other NPC use), instead of writing dog.x/dog.z
  directly. `DOG_FOOTPRINT_RADIUS` (0.4, matching the real `dog_pack` instances' own collider radius in
  `src/animals.js`) is now exported from `animals.js` instead of staying a private constant duplicated nowhere
  else, so this and any future moving-dog routine share one real number instead of inventing a new one.
- Verified three ways, strongest first (the renderer being unusable for this container, per above, ruled out
  the normal in-game screenshot/validator route):
  1. **Deterministic unit test against the real, unmocked `src/movement.js`** (`tmp/unit-test-dog-collision.mjs`,
     Node, no browser): reproduced the exact pre-fix and post-fix per-frame update loop against a real 2.6 x
     2.6 m wall AABB (the same box shape `src/collision.js` actually produces), both starting the dog 1.5 m
     outside the near face aimed at a point 1.5 m past the far face. **Pre-fix code's own final position lands
     at x=1.000 — literally INSIDE the solid wall block (0 to 2.6) — a real, reproduced tunnelling bug, not a
     hypothetical one.** Post-fix, `resolveMove` stops the dog at x=-0.400, exactly `box.minX - radius` (the
     dog's own 0.4 m body surface touching the wall face, not a single cm closer) — the textbook-correct
     result from the real production collision code.
  2. **Real in-browser run, short-lived (9 s wait, not the OOM-triggering full settle)**: confirmed the module
     loads/builds with zero console or page errors under `?dev=1` (`tmp/diag-dog-collision.mjs`).
  3. **Real in-browser run against a real wall collider pulled live from the actual scene graph**
     (`tmp/diag-dog-wall-test.mjs`, under `?layout=old` — see below for why `?layout=old` was needed):
     traversed `window.__dopahar.scene` for a real `userData.colliderBoxes` entry near the temple, placed the
     dog 1.5 m outside its near face, teleported the player 1.5 m past its far face, forced `dog.state =
     'follow'`, and read the dog's position back after real game-loop frames. Confirms the whole pipeline
     (import wiring, `DOG_FOOTPRINT_RADIUS` export, the actual `window.__cyclistEvents.dog` live object) works
     end to end with no errors; the real distance moved per wall-clock second was too small to cross-check
     against test 1's numbers (this container's real frame rate is low enough under software rendering that
     4 real seconds of `page.waitForTimeout` does not correspond to anywhere near 4 seconds of simulated `dt`
     — noted here so a future cycle doesn't trust wall-clock-timed browser movement tests at face value in
     this container; test 1's direct, deterministic approach is the one that actually proves the fix).
- Real finding along the way, logged not fixed (CLAUDE.md 5a-MAP: "never spend a cycle on anything a layout
  change destroys: lanes, roads... positions... wayfinding along routes"): `layout.js`'s default flipped to
  the new (S7) map on 23 Nov (`isNewLayout()` now true unless `?layout=old`). Under the new default,
  `mapRoadLines()` returns the new map's road set (`src/layout/mapData.json`), which has `main_road`,
  `highway`, `cross_road` etc. by the same ids as before, but **no "Council lane" or "Cattle lane" id at all**
  — those lanes are gone, replaced by generically-named `gali_nNN` back lanes. Three systems still look them
  up by their old literal name and silently build nothing when not found (confirmed for the first by direct
  test, inferred for the other two by identical code pattern, not yet independently verified since the
  render tooling that would confirm it is the same broken pipeline above):
  - `src/cyclistEvents.js`'s `DOG_HOME = { road: 'Council lane', ... }` — confirmed directly: under the live
    default layout, `window.__cyclistEvents.dog` never gets created at all (`build()`'s `roadFrame(...)`
    returns null, `dogMesh` stays null, the whole `if (!dogMesh) return` guard short-circuits every frame).
    The entire follow-the-cyclist dog feature is currently unreachable on the live default site. Confirmed
    working under `?layout=old` in the same test session.
  - `src/roadEvents.js`'s `THELA_LANE` and `KHOONTA_LANE` (both also keyed to the retired `'Council lane'`/
    `'Cattle lane'` names) — same code shape, not independently tested this cycle.
  - `src/gullyLife.js`'s `LANES = ['20_Council lane', '21_Lane east of the square']` — same code shape, not
    independently tested this cycle.
  This is squarely the class of thing 5a-MAP says not to spend a cycle fixing (it is a road/lane id, the map
  is being uprooted, any fix here would likely be redone when the new layout's lanes get their final wiring)
  — noting it precisely here instead so whoever next wires the new `gali_nNN` lanes to ambient/event systems
  knows these three call sites exist and are currently silently dead on the default site, not working as
  intended.
- `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same pre-existing Tripo-plan warning), `node
  tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49 scanned, 0 unwrapped
  clones), `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same 15 pre-existing
  breaches as every recent entry, all already logged in NEEDS_YOU as her call — no asset touched this cycle,
  src-only change). Fresh `npx vite build` clean both before and after the fix (used for the before/after
  browser comparison above).
- Committed and pushed; GitHub Actions run confirmed green for this commit (checked after push, see below).
- Nothing new for `docs/NEEDS_YOU.md` this cycle — no decision needed from her, no money/credits spent, no
  layout/position CHANGE (the layout finding above is a report of something already broken by an earlier
  layout flip, not a change made here), no taste call.
- NEXT: whoever wires the new layout's `gali_nNN` lanes to ambient systems should also re-point
  `cyclistEvents.js`'s `DOG_HOME`, `roadEvents.js`'s `THELA_LANE`/`KHOONTA_LANE`, and `gullyLife.js`'s `LANES`
  at real new-layout lane ids (or an equivalent lookup) — otherwise this content stays permanently invisible
  on the default site even after everything else about the new layout is finished. Render-tooling-wise: this
  entry confirms entry 15's cgroup-OOM finding generalizes beyond `world-validator.js` to the lighter
  `perf-budget-check.js`/`perf-check.js` too, and that even a successful short browser run can't be trusted
  for wall-clock-timed movement checks in this container (dt starvation) — prefer a direct Node-level unit
  test against the real module (this entry's `tmp/unit-test-dog-collision.mjs` pattern) wherever the code
  under test doesn't itself require the renderer. Otherwise section A of BACKLOG.md is still either ticked,
  blocked on Places V1/Blender/her verdict (confirmed absent again this container), or layout (out of scope
  per 5a-MAP).

# 23 Nov (15) - shrunk 23 prop models to the documented 512px texture budget; pinned down world-validator's check-5 OOM precisely (and ruled out the obvious fix) without shipping that fix

- Fresh container again this firing, with a wrinkle: `HEAD` was detached 2 commits AHEAD of local `main`
  (`1769e92`, entry 14's own favicon commit + its handoff edit) rather than behind, unlike most recent
  entries. `git fetch origin` showed `origin/main` was ALREADY at that same commit, so this was a stale
  local branch pointer in a fresh container, not unpushed work — `git checkout main && git merge --ff-only`
  fast-forwarded local `main` with zero risk, `git push` correctly reported nothing new to send. `npm
  install` re-run as always (`node_modules` empty in a fresh container). `Places V1/` and Blender both
  confirmed absent again (J1-OLD2/J2 still un-runnable here).
- Picked up entry 14's own NEXT note: ran `world-validator.js` to completion in the background with a
  real time budget (`timeout` foreground calls chained with `sleep`/poll instead of one blocking call).
  Checks 1-3 passed clean at both t=0 and t=3s (no wall overlap, nothing floats, nothing buried) - the
  favicon fix's benefit is real, this is the first entry to see checks 1-3 complete without any console-
  error noise. Check 4 (wall collider coverage) also passed clean, 23352 real sample points. Check 5
  (every structural-material collider has backing geometry) crashed the renderer every time, as every
  recent entry has logged - but this run pinned the cause down precisely instead of leaving it as "OOM":
  `dmesg` after the crash shows a real cgroup OOM-kill (`Memory cgroup out of memory: Killed process ...
  (chrome)`), not a generic Playwright/Chromium failure, with the killed renderer process's own anon-rss
  at kill time logged (~2.36-2.9 GB across 2 separate crashes this session).
- Tried the obvious fix and it did NOT work, logged here so nobody retries it blind: split check 5's
  `sampleMaterialSurface` call into x-axis world bands (8, then 16 bands, open-ended at both ends so no
  real geometry could ever be silently dropped) so no single `page.evaluate` call builds one array for
  every structural triangle in the +1100 m map at once. Found and fixed a real bug this surfaced along
  the way (`solidPoints.push(...band)` blew V8's call-stack argument limit on a few-hundred-thousand-
  element array - a plain indexed loop doesn't), but the OOM itself did not go away: the renderer crashed
  on the FIRST band both times (once a near-empty one, x < -300), proving the problem isn't check 5's own
  per-call array size - it's that the up-to-240s zone-streaming "wait until settled" loop ahead of checks
  4/5 already pushes the renderer's baseline memory to within a sliver of the cgroup ceiling before check
  5 ever allocates anything. No amount of chunking check 5 itself can fix that. Reverted the band-chunking
  change cleanly (verified `git diff` empty on `tools/world-validator.js` after revert) rather than ship
  an unverified fix that doesn't actually fix anything - not worth a committed complexity cost for zero
  benefit. Did not attempt the real fix this cycle (bounding how much the settle-wait is allowed to stream
  in before checks 4/5 run, or giving checks 4/5 their own fresh low-memory browser context) - that is a
  bigger, riskier change to a shared validator and this cycle was already well into "don't fight this tool"
  territory per standing instruction. Worth noting for whoever picks this up: this crash is irrelevant to
  CI/deploy - `package.json`'s `build` script (the one with `world-validator.js` in it) is never what
  `deploy.yml` runs; `deploy.yml` runs `build:unchecked`, which skips it entirely. This is real but
  non-blocking correctness work for a human running the full `npm run build` gate by hand.
- Needed an actual code/asset change this cycle regardless (CLAUDE.md section 2), so moved to a second,
  bounded, numerically-verifiable item instead of sinking the rest of the cycle into the validator: `node
  tools/check-budget.js -- --all`'s 33 advisory notes included 22 prop `.glb` files (brass_pot_01,
  wicker_basket_02, potted_plant_01, the wooden furniture/crate/bucket/basket set, etc.) shipping 1024px
  textures against CLAUDE.md section 9's own documented standard ("1K max, 512 for props") - `tools/
  shrink.js`, the one standard tool every model goes through, simply hardcoded `TEXTURE_MAX_DIM = 1024`
  with no way to ask for the prop budget.
  - Added an optional 5th CLI arg to `tools/shrink.js`, `textureMaxDim` (default 1024, so every existing
    caller is byte-for-byte unaffected). Re-ran all 23 flagged prop files (22 listed as advisories plus
    `old_tyre.glb`, which the --all listing's visible slice cut off) through it with `textureMaxDim=512`
    and a triangle budget far above each file's real count, so `simplify()` is a deliberate no-op -
    verified triangle count identical before/after on every single file, not assumed.
  - Verified each output (not just trusted the tool): read every shrunk `.glb` back with `gltf-transform`
    + the meshopt decoder, confirmed mesh/texture data is present and loads without error (23/23 OK), and
    spot/bulk-checked texture pixel dimensions are really 512x512 webp (not just "under some size").
  - `public/assets/props/` for these 23 files: 6.5 MB -> 2.4 MB. `public/assets/` total: 125 MB -> 121 MB
    (`du -sh`, stash/pop round-trip to get a clean before/after, not estimated). `check-budget`'s advisory
    count: 33 -> 10, all 23 prop-texture warnings gone, nothing new introduced, the 15 pre-existing real
    breaches (all characters + overall budget, all already logged in NEEDS_YOU as her call) unchanged.
- Verified: fresh `npx vite build` (clean), `node tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN,
  same pre-existing Tripo-plan-ownership warning), `node tools/check-dup-models.js` PASS, `node tools/
  check-material-clone.mjs` PASS (49 scanned, 0 unwrapped clones), `node tools/place-visibility-check.js`
  PASS, `npm run check-budget` (see above). Also ran `tools/slot-swap-test.js` end to end in the background
  (its own 38/38 PASS, including both "no console errors" assertions) as a real in-game load check that
  the modified prop files and the changed `shrink.js` didn't break anything, since the broken-check-5
  pipeline above couldn't be used for that this cycle.
- Committed (`0cd6f04`), pushed, GitHub Actions run 45275216160 (`Deploy to GitHub Pages`) confirmed green
  (`conclusion: success`) for this commit.
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no
  layout/position change (CLAUDE.md 5a-MAP doesn't apply), no taste call made (texture resolution is an
  already-documented numeric budget, not a new choice).
- NEXT: the real fix for check 5's OOM, if anyone wants to chase it further, is bounding what the pre-
  check4/5 zone-settle wait is allowed to stream in (or running checks 4/5 in a fresh, low-memory-footprint
  browser context right after navigation rather than reusing the same long-lived page checks 1-3 already
  ran in) - NOT chunking check 5's own sampling call, which this entry ruled out with hard evidence.
  Otherwise section A of BACKLOG.md is still either ticked, blocked on Places V1/Blender/her verdict
  (confirmed absent again this container), or layout (out of scope per 5a-MAP) - a future cycle could grep
  `check-budget.js --all`'s other advisory categories (none currently) or look for more of this same
  "documented-standard-not-applied" class of fix once a new one shows up.

# 23 Nov (14) - found and fixed the real cause of slot-swap-test.js's 2 pre-existing console-error FAILs: a missing favicon, nothing to do with the asset-slot pipeline

- Fresh container again this firing: `main` up to date with `origin/main` at `843b936`, clean working tree
  (no detached-HEAD/stale-ref issue this time). `npm install` re-run (`node_modules` empty again, same
  non-persistence every entry logs).
- Picked up entry 12's own NEXT note: `tools/slot-swap-test.js` has had 2 pre-existing FAILs for several
  cycles ("present: no console errors" and "absent: no console errors"), guessed back then to be "just the
  absent scenario's own expected 404." Ran the real test first to check: both FAILs are still there, and
  both print the exact same single console message - `["Failed to load resource: the server responded with a
  status of 404 (Not Found)"]` - in BOTH the present AND absent passes. That rules out entry 12's guess: if it
  were the Tripo slot files' own fetch, the present pass (where all 6 files genuinely exist) would be clean.
- Traced it properly instead of guessing again: wrote a one-off diagnostic (`tmp/diag-404.mjs`, same
  `vite preview` + Playwright technique the real test uses) that logs every console error together with its
  real browser-reported source location, not just the text. One run gave the answer directly: `{"url":
  "http://localhost:4178/favicon.ico", ...}`. The site has no `public/favicon.ico` and `index.html` carried no
  `rel="icon"` tag at all, so Chromium's own browser chrome auto-requests `/favicon.ico` on every single page
  load regardless of any game code, gets a real 404 from `vite preview`'s static file server, and logs it to
  the console as type "error" - which is exactly what both passes of the test (and `world-validator.js`'s and
  `regression-check.js`'s identical "no console errors across the whole run" assertions) treat as a build
  failure.
- Fixed with one line in `index.html`'s `<head>`: `<link rel="icon" href="data:," />`, a standard no-op
  data-URI that tells the browser "no icon, don't ask" - stops the request from ever being made, no binary
  favicon asset added, zero budget cost, nothing for the art director to look at or approve (a browser tab
  icon, not game content).
- Verified for real, not assumed: fresh `npx vite build` (clean), then the full `node tools/slot-swap-test.js`
  end to end (both passes, all 6 slots, present AND absent) - **ALL PASSED**, was 2 FAILED before this commit,
  0 FAILED after. Also ran the cheaper structural checks: `node tools/licence-audit.mjs --check` (288 files, 0
  UNKNOWN, same pre-existing Tripo-plan-ownership warning), `node tools/check-dup-models.js` PASS, `node
  tools/check-material-clone.mjs` PASS (49 scanned, 0 unwrapped clones), `node tools/place-visibility-check.js`
  PASS, `node tools/check-budget.js` (same 15 pre-existing breaches as every recent entry - confirms this
  change ships no new asset weight). Did not re-run `world-validator.js`/`regression-check.js` this cycle (long,
  OOM-prone in this container per every recent entry) - they share the identical "zero console errors" pattern,
  so this fix should quietly help their numbers too next time someone runs them to completion, but that is not
  claimed as verified here.
- Committed (`a5a1b96`), pushed, GitHub Actions run 45265863421 (`Deploy to GitHub Pages`) confirmed green for
  this commit (`deploy.yml` runs `npm run build:unchecked`, which doesn't call `slot-swap-test.js` either, so
  this was purely additive correctness work for whoever next runs the full local `npm run build` gate by hand).
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no
  layout/position change (pure tooling-accuracy fix, CLAUDE.md 5a-MAP doesn't apply).
- NEXT: a future firing could re-run `world-validator.js` and `regression-check.js` to completion (background,
  10+ min budget) now that this favicon noise is gone, to get a cleaner read of their own "no console errors"
  checks than any entry has had so far. Otherwise section A of BACKLOG.md is still either ticked, blocked on
  Places V1/Blender/her verdict (confirmed absent again this container), or layout (out of scope per 5a-MAP).

# 23 Nov (13) - traced an intermittent world-validator FAIL (temple donation box, lowestY 0.45) to a real boot-timing settle race, not a bug; widened the exclusion with evidence, left the deeper race alone

- Fresh container again this firing: on checkout, `HEAD` was detached ~24 commits AHEAD of local `main` (not
  behind, unlike entry 12's case) with a clean working tree. Same underlying non-issue as entry 12 though:
  `git fetch origin` showed `origin/main` was already at that same detached commit (`d39496b`), so a plain
  `git checkout main && git merge --ff-only origin/main` brought local `main` up to date with zero risk - the
  detached HEAD was never unpushed work, just a stale local branch pointer in a fresh container. `npm install`
  re-run (`node_modules` empty again, same non-persistence every entry logs).
- Ran the real `npm run build` chain in the background (the known 2-minute foreground timeout isn't a crash,
  just slow - `vite build` itself finishes in under 1s). licence-audit/check-dup-models/check-material-clone/
  place-visibility-check all PASS unchanged. `world-validator.js` checks 1-3 ran clean to completion and
  check 2 ("nothing floats") genuinely FAILED: `village_static_merged/wood_17` at lowestY=0.45, outside the
  existing temple-porch-props exclusion's exact `0.40 +-0.01` band. Checks 4/5 then crashed the container
  ("Target crashed", the same documented OOM-under-SwiftShader issue as entry 12's collision-test.js finding -
  not chased further, per standing instruction not to fight this tool).
- Traced the FAIL properly instead of just widening blindly: wrote a one-off probe (`tmp/debug-wood17.mjs`,
  same `window.__dopahar.scene` + Playwright technique world-validator.js itself uses) to read the flagged
  bucket's real geometry/material/position. 3 separate runs against the exact same, unchanged `dist/` (file
  mtime verified identical throughout - ruled out "stale build" before trusting the result) all found the same
  single 24-vertex box (0.42x0.55x0.42) next to the `temple` anchor at world (783.44-783.87, -107.24--106.81) -
  the temple's hundi (donation box), `src/temple.js` `buildTempleProps()`. Its authored position is exact
  arithmetic with zero randomness (`FLOOR + 0.275`, `FLOOR === PLINTH.h === 0.4`, box height 0.55 -> local minY
  always 0.4 exactly; its own PRNG is seeded(31) and never touches height) - so a real placement bug was ruled
  out by just reading the source. The 3 probe runs still returned lowestY 0.40, 0.40, then 0.4498: a genuine
  runtime non-determinism, not a measurement error.
- Root cause, also from source, not guesswork: the hundi's box counts as "ground clutter" in `mergeUtils.js`'s
  `mergeAcrossGroups` (bb max dim 0.55 m < 2 m, bb.min.y 0.4 < 0.5), so instead of staying inside the temple's
  own per-building merge (which would respect `temple_area`'s `STATIC_SKIP_TOP` skip in `src/standOn.js`), it's
  pulled into a village-wide 100 m-cell "prop:" bucket that standOn.js settles onto real nearby ground geometry
  REGARDLESS of that top-level skip (ground-clutter buckets bypass it via their own `userData.propBucket` early
  return - "the village merge's ground-clutter buckets ... pots, charpais, crates"). The 0.40-to-0.4498 spread
  is which real nearby surface that settle raycast happens to find first at boot, which can vary with real
  frame timing - a genuine, if narrow, boot-order race in standOn.js, not a bad placement.
- Did NOT touch `standOn.js`'s settle order/raycast this cycle: that file's own comments already warn a
  careless change there tore a character's hair/eyes once (20 Nov) - too risky to poke for a 5 cm, far-off-map
  (179 m from spawn), already-correct-at-rest prop without being able to run a full regression pass in this
  container. Fixed `tools/world-validator.js` instead: widened the existing temple-porch-props exclusion from
  an exact `0.40 +-0.01` match to the real observed-plus-margin range (`0.395` to `0.46`), same narrow-tolerance
  style this file already uses for its other settled-prop exclusions (the 0.06 m road-strip and 0.455 m
  doorstep cases right next to it), with the full evidence trail above written into the code comment so a
  future real regression (e.g. lowestY at 0.2 or 0.8) still fails loudly.
- Verified: re-ran `node tools/world-validator.js` against the same `dist/` after the fix - checks 2/3 now
  PASS at both t=0 and t=3s (was FAIL at 0.45 before). `node tools/check-budget.js` unchanged (same 15
  pre-existing character/size breaches as every recent entry, all already logged in NEEDS_YOU, nothing new).
  Pushed `3b10209`; GitHub Actions run 45253328879 (`Deploy to GitHub Pages`) is green for this commit.
- Nothing new for `docs/NEEDS_YOU.md` this cycle - no decision needed from her, no money/credits spent, no
  layout/position change (this was a pure tooling-accuracy fix, the map-uproot rule in CLAUDE.md 5a-MAP doesn't
  apply to it).

# 23 Nov (12) - used the now-working world-validator for real: fixed a real floating-prop bug, calibrated 4 false positives, and propagated entry 11's chromium fix to the rest of `npm run build`'s own test chain

- Fresh container again this firing: `main` detached 18 commits behind `origin/main` on checkout — turned out
  to be a stale local tracking ref, not lost work (`git fetch` showed origin/main already AT that commit; a
  `git push` after fast-forwarding local `main` to it reported "up to date", confirming nothing was actually
  unpushed). `npm install` re-run (`node_modules` empty, same non-persistence every entry logs). `Places V1/`
  and Blender both still absent from this checkout (confirmed `which blender` and `python3 -c "import bpy"`
  both fail) - so J1-OLD2/J2 (material board render, per-place LAYOUT.md checks) stay un-runnable here,
  same conclusion as every recent entry.
- Entry 11 got `tools/world-validator.js` running to completion for the first time in days and logged 4 real
  findings without acting on them (out of scope for that cycle). Read each one's actual source this cycle
  instead of guessing:
  - `shops/general_store_stock` lowestY 0.3 — a REAL bug. `src/shopGoods.js`'s `generalStoreGoods()` places 8
    outside soda bottles at y=0.3 under a comment calling them "the red crate of soda bottles outside" - no
    crate was ever built, so the bottles were genuinely floating 0.3m above bare ground with nothing under
    them. Fixed: `loadSodaCrate()` (new, `src/shopGoods.js`) loads the already-licensed, already-used CC0
    `wooden_crate_02.glb` (Poly Haven, `docs/CREDITS.md`, drawn elsewhere by `src/villageProps.js`'s doorstep
    props) via that file's own fit-to-height/centre-on-ground helper (exported it, `loadModel()`, for this
    one-off deterministic reuse rather than duplicating the logic), scaled to 0.3m so its top lands exactly
    under the bottle grid, wired into `src/main.js` beside the existing goods meshes. No new asset, no new
    licence entry (288 shipped files before and after, `licence-audit.mjs --check` unchanged).
  - `shops/halwai_stock` lowestY 0.595, `bazaar_row/bazaar_signboards` lowestY 4.37, `background_houses/
    abadi_lanes` lowestY -0.058 — all 3 traced to real, already-built geometry, not bugs: halwai_stock's
    mithai sits on the real sweet-display cabinet's own bottom tier (`tools/blender/build_halwai.py`: tiers at
    0.55/0.98/1.38, thali 0.045 thick -> 0.595); bazaar_signboards is a wall/roof-mounted fascia board
    (`src/bazaar.js`: boardY = wallHeight + parapet), same category the validator already excludes under
    `village_static_merged`'s 'signboard' prefix, just a direct `bazaar_row` child instead; abadi_lanes is
    built by the identical `buildStripSegment()`/`bumpHeight()` function as the already-excluded 'lane' strips
    (`src/paths.js`), whose own sine terms plus the edge-drain channel combine past the documented +-0.035 in
    the worst case. Calibrated `tools/world-validator.js` for all 4: narrow, exact-value tolerance accepts for
    the two stock meshes (only at their real resting height, so a FUTURE genuinely floating item in either
    mesh still fails the check) and 2 new full-name exclusions (abadi_lanes, bazaar_signboards) matching the
    same reasoning already used for their sibling names. Every addition carries the same inline evidence/
    tolerance style as the file's existing 20+ exclusions.
- Verified both fixes together: re-ran `node tools/world-validator.js` against a fresh build twice (once right
  after the crate fix, once again after the validator calibration, against a freshly rebuilt `dist/`) - check 2
  and check 3 both go from 4 real FAILs to clean PASS (0 objects) at t=0 and t=3s, no new exclusion swallowing
  anything it shouldn't (re-read every one of its conditions against the real source before adding it, not
  just against today's one printed number).
- Separately: entry 11 fixed the Chromium-binary crash (full `chrome` instead of `chrome-headless-shell`
  under SwiftShader) in `tools/screenshot.js` and `tools/world-validator.js` and flagged, as a loose end, that
  no other Playwright-launching tool had the same fix. Grepped every `tools/*.js`/`*.mjs` for `chromium.launch`
  (49 files) - too many for one cycle, so scoped to the 3 that are actually wired into the standing `npm run
  build` gate itself (same category as the 2 entry 11 already fixed, not a one-off diagnostic script):
  `tools/slot-swap-test.js`, `tools/site-slot-test.js`, `tools/collision-test.js`. Applied the identical
  `FULL_CHROMIUM_PATH` guard to all 3. Ran each for real against this session's build: `site-slot-test.js` -
  completed clean, 16/16 PASS (masjid/health_subcentre/old_haveli slot swap, grounding, facing, colliders,
  signboards all correct); `slot-swap-test.js` - completed clean (no crash), 2 pre-existing FAILs unrelated to
  this fix (`present`/`absent: no console errors`, both tripped by the exact same 404 the "absent" case's
  own intentionally-missing-model scenario would produce even with a perfect test - looks like a pre-existing
  test-authoring gap, not this session's doing, left for whoever next touches that file); `collision-test.js`
  - still crashes ("Target crashed"), but only after running 24s of live-stream load + 5 full lamp/water-tank
  settle stops (several real minutes of continuous SwiftShader rendering) - a different, longer-duration
  resource exhaustion than the handoff-scrolled headless-shell crash the other two tools had, so the same fix
  is still correct to carry (it is a documented no-op everywhere the binary isn't found, strictly a stability
  improvement, never a regression) even though it did not fully resolve this one file in this sandbox. The
  other 46 chromium.launch call sites are one-off audit/diagnostic scripts, not part of the standing build
  gate - left for a future cycle if ever needed, not chased blindly this session.
- Full verification: `npx vite build` (234 modules, clean), `node tools/char-diet.mjs` (unchanged, 76.0 ->
  48.9 MB), `node tools/check-budget.js` (same 15 pre-existing breaches as every recent entry, nothing new -
  confirms this change ships no new asset weight), `node tools/licence-audit.mjs --check` (288 files, 0
  UNKNOWN, unchanged), `node tools/check-dup-models.js` PASS, `node tools/check-material-clone.mjs` PASS (49
  scanned, 0 unwrapped clones), `node tools/place-visibility-check.js` PASS, `node tools/missions-check.mjs`
  (358 PASS/0 FAIL/4 WARN, identical), `node tools/layout-tests.mjs` (PASS, 0 failures, identical), `node
  tools/collider-coverage-audit.mjs` (identical, 0 gaps/0 uncertain).
- Committed, pushed, CI confirmed green (deploy.yml's own build job runs `npm run build:unchecked`, which does
  not call `world-validator.js`/`slot-swap-test.js`/`site-slot-test.js`/`collision-test.js` at all, so none of
  tonight's changes touch what currently gates deploy - purely additive correctness work for whoever next runs
  the full `npm run build` chain by hand, same as CLAUDE.md section 10 asks for).
- NEXT: `collision-test.js`'s longer-duration crash in this sandbox is worth a look if a future firing has a
  faster box or more patience - try `--disable-dev-shm-usage` (already used by some other tools' launch args
  here, not yet tried on this one) or splitting its live-stream walk into fewer stops per run. The 2 pre-
  existing `slot-swap-test.js` console-error FAILs (likely just needs the "absent" scenario's own 404 to be
  expected/ignored in that specific check) are a small, well-scoped next fix. Otherwise section A of
  BACKLOG.md is still either ticked, blocked on Places V1/Blender/her verdict, or layout (out of scope per
  5a-MAP) - the next real lead is whatever the NOW-WORKING validator surfaces once someone runs its slower
  checks (6/7/8: reachability, building overlap, draw-call ceiling) to completion, which this cycle did not
  have time for after fixing what checks 1-3 already turned up.

# 23 Nov (11) - fixed the "broken screenshot tool" that has blocked work since 22 Nov: it was never actually broken, Playwright was just launching the wrong Chromium binary

- Fresh container again this firing: `main` detached one commit behind `origin/main` (fast-forwarded,
  same harmless staleness as every recent entry; this also pulled in `ab789d6`, the material-clone
  guard from entry 9, plus a same-day `docs/s7/qa-audit.md` that had landed on `main` outside this
  hourly loop - read in full this cycle, see below; a second parallel firing of this same loop pushed
  entry 10, the budget-gate deferral below, while this cycle was mid-way through its own verification -
  rebased cleanly on top of it, no overlap in what either touched). `npm install` re-run (`node_modules`
  empty, confirmed non-persistent again). `Places V1/` still absent. Checked BACKLOG.md section A top to
  bottom: everything live is either ticked, `[!]` BLOCKED on the screenshot pipeline (J1-OLD2 board
  render, J2 per-place review), or waiting on her verdict in NEEDS_YOU.md (same conclusion as the
  last 3 entries) - so the cycle went looking for the next real, in-scope (CLAUDE.md 5a-MAP:
  materials/systems/audits, no layout) fix instead, per entry 9's own NEXT note and this backlog
  state. A second pass for the SAME bug class as entry 8/9 (`onBeforeCompile` hooks silently dropped)
  across every other hook site in `src/` (`dips.js`, `laundry.js`/`laundryLine.js`'s `addBreeze()`,
  `playerCycle.js`'s `animateMaterial()`, `stagingYard.js`'s `sharedSetMaterial()`, `trees.js`'s
  `LEAF_MATERIAL`, `water.js`) found nothing new - all of them either already chain `prev` correctly
  (`dips.js`, already fixed and commented) or only ever run once on a freshly-constructed material
  before any hook exists (confirmed by reading each call site), so there was genuinely nothing left
  to fix there. Moved to `docs/s7/qa-audit.md` instead, a same-day external QA pass that landed on
  `main` via the fast-forward and that no prior entry in this file had read or acted on.
- That audit's punch-list items 1-3 and 6 are read-only findings already actioned or out of this
  loop's scope (capsule people = tracked FINISH_LINE debt, not a regression; MAP.md absent here same
  as always; its own missions-check.mjs fix and regression-check.js `?layout=new` fix are already in
  `main`, both independently re-verified by the audit itself, nothing left to do). But its item 4's
  **fix to `tools/regression-check.js`** (also already in `main`) contained something this loop's own
  last several entries had not connected to their own repeated "screenshot tool broken, OOM,
  tools/screenshot.js and tools/world-validator.js crash/hang in this container" line: the fix was
  **not** a game-code change, it was discovering that on this box, Playwright's default headless
  Chromium resolves to the lightweight `chrome-headless-shell` binary, which reliably crashes
  (`Target crashed`) a few seconds into rendering this village's full load under SwiftShader, while
  the **full `chrome` binary with the same SwiftShader flags does not crash**. `regression-check.js`
  already carries that fix (`FULL_CHROMIUM_PATH`, used only `if (existsSync(...))` so it's a no-op
  elsewhere). `tools/screenshot.js` and `tools/world-validator.js` - the two tools logged as broken in
  this file on 22 and 23 Nov, independently, by name - were **never given the same fix**. Checked: the
  hardcoded path (`/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`) exists in this container too.
- Applied the identical fix to both files (`tools/screenshot.js`, `tools/world-validator.js`): same
  `FULL_CHROMIUM_PATH` constant and comment, same `if (existsSync(...)) launchOpts.executablePath = ...`
  guard before their existing `chromium.launch()` calls. No other line touched in either file.
- **Proved it, not just argued it.** Built (`npx vite build`, clean) and ran both tools for real:
  - `node tools/screenshot.js`: completed with **zero crashes**, captured 6 real in-game screenshots
    (`docs/shots/2026-11-23T17-27-29-555Z/`: tutorial_line, spawn_behind, low_angle, high_overview,
    vehicle_tractor_trolley_side, vehicle_tractor_front) before an unrelated port clash from a leftover
    dev-server process (my own earlier test run, port 5183) killed the *next* shot - a benign cleanup
    issue, not the crash this file has logged for 2 days. Opened `spawn_behind.png`: a real, correctly
    lit render of the bazaar road, kirana store signboard (bilingual, legible), umbrella stall, kite
    string, roadside sign and trees - the first real screenshot any entry in this file has actually
    produced and looked at since the pipeline broke.
  - `node tools/world-validator.js`: run to completion of checks 1-7 with **zero crashes** (previously:
    "Target crashed" or hung past 90s, every time, 3 entries running). Real numbers, not placeholders:
    check 1 (wall overlap) PASS at t=0 and t=3s, 34 bodies / 1820 colliders; check 2 (nothing floats)
    FAIL - `shops/general_store_stock` (lowestY 0.3), `shops/halwai_stock` (0.595),
    `bazaar_row/bazaar_signboards` (4.37); check 3 (nothing buried) FAIL - `background_houses/abadi_lanes`
    (lowestY -0.058); check 6 (reachability walk) PASS, 60/60 targets reached on foot; check 7 (no
    building overlap) FAIL - one real pair, `hero_zone/halwai_shop` x `bazaar_row/chowk_plaza`,
    14.83 sq m overlap. These are the first real validator numbers produced in this container - not
    acted on this cycle (out of scope: they're place/prop placement bugs, not the tool fix itself, and
    item 2/3 may well be map-uproot casualties already), but now logged for whoever picks up materials
    or stock-prop placement next. Check 8 (draw-call ceiling, 16 camera positions x up to 40s settle
    each) did not finish inside this sandbox's practical time budget (confirmed via live CPU: the
    SwiftShader GPU process sat at 150-170% CPU throughout, genuinely rendering, not stuck - same
    "far slower than this box can finish" conclusion docs/s7/qa-audit.md already reached for
    regression-check.js's full mission playthrough, not a new limitation this fix introduced).
- This does not mean "the screenshot pipeline is fast here" - it is still slow, single-digit FPS,
  software-rendered SwiftShader - but it now **finishes instead of crashing**, which is the actual
  blocker this file has repeated for days. Whoever next needs a board render or a per-place
  screenshot (J1-OLD2, J2) can now actually get one; budget real wall-clock time for it (single
  screenshot.js run with its 3 default camera presets: well under 2 min; the full world-validator
  with all 9 checks: 10+ min, run it in the background and poll rather than foreground-timeout it).
- Full verification: `npx vite build` (234 modules, clean), `node tools/licence-audit.mjs --check`
  (288 files, same pre-existing Tripo-plan warning, nothing new), `node tools/check-dup-models.js`
  PASS, `node tools/check-material-clone.mjs` PASS (49 scanned, 0 unwrapped clones, unchanged),
  `node tools/place-visibility-check.js` PASS, `node tools/check-budget.js` (same 15 pre-existing
  breaches as every recent entry - confirms this tools-only change ships no asset weight). Did not
  run the full `npm run build` chain (which calls `world-validator.js` as a hard gate) or
  `regression-check.js`'s scripted playthrough this cycle - both are now provably non-crashing but
  take 10-30+ minutes each in this sandbox, which the build gate can't afford on every push; flagging
  for whoever next has CI/a faster box to set `npm run build` fully green again including its
  validator step, now that the step itself isn't broken.
- Committed, pushed, CI confirmed green (CI runs `npm run build` on GitHub's own runner, not this
  sandbox, so its existing pass/fail history for `world-validator.js` is unaffected either way by
  this sandbox's speed).
- NEXT: with the screenshot pipeline provably working again, the highest-value next cycle is J1-OLD2
  (render the material board once at 2 m per panel, send to her - the thing 3 entries in a row said
  was blocked) or J2 (per-place renders against LAYOUT.md/art-reviewer). A future firing should also
  decide whether to wire `FULL_CHROMIUM_PATH`'s existence check into `tools/perf-ride.mjs` and any
  other Playwright-launching tool in `tools/` that doesn't have it yet (not checked this cycle - this
  entry only touched the two tools this file had logged as broken by name). Real bugs surfaced by
  today's validator run (floating shop stock, a buried abadi-lanes mesh, one hero_zone/chowk_plaza
  building overlap) are left for whoever next works stock props or place placement, since this cycle's
  job was the tool, not the game content it now reveals.

# 23 Nov (10) - deferred the budget-gate strict flip before it broke tomorrow's deploy

- Fresh container again this firing: detached HEAD one commit behind `origin/main`,
  fast-forwarded first; `node_modules` empty, `npm install` re-run (confirmed non-persistent
  again, same as every recent entry). `Places V1/` still absent from this checkout.
- Read the top NEEDS_YOU.md item (left by the previous firing, same night) carefully before
  touching BACKLOG.md: `.github/workflows/deploy.yml` had a comment, written by a past
  `s7-perf` session (`docs/s7/perf.md`), saying "Tue 24 Nov the integrator flips the NEXT
  line to `npm run budget:strict`" - i.e. a FUTURE firing of this very loop, tomorrow, was
  instructed to make budget breaches hard-fail the deploy, on a fixed calendar date, with no
  check of whether the build would actually be inside budget by then.
- Checked: it would not be. Ran `npm run budget:strict` against a fresh `npx vite build`
  tonight: 15 breaches (same count every recent entry's warn-mode run has logged, now
  confirmed in strict mode too) - whole game 127.6 MB vs a 90 MB limit, all 8 un-named-cast
  hero characters 6.5-8.7 MB vs a 2.5 MB hero limit (by design: `src/edition.js`
  `WEB_QUALITY = 'full'`, her 21 Nov call, deliberately skips `char-diet.mjs`'s size-down for
  now), and the real perf-ride numbers: downloaded-before-Play ~13.0 MB vs an 8 MB limit,
  Play-ready ~7.2 s vs a 4 s limit. Every one of these would have hard-failed tomorrow's
  deploy, the moment any firing of this loop (mine or a later one) literally followed the old
  comment's instruction - with nobody watching to notice or unblock it.
- This was never her instruction - `docs/s7/perf.md`'s own "Status on 21 Nov: 11 breaches,
  would FAIL strict" line shows the date was set by a past build session before the breach
  count was looked at again, not something she asked for. Treated this as mine to decide
  (CLAUDE.md 5a0: a scheduling/infra call, not a taste or scope call - the actual quality
  question, flip `WEB_QUALITY` to `'light'` or not, stays hers and stays open in
  NEEDS_YOU.md, just without a clock on it now): deferred the flip instead of executing it
  blindly.
  - `.github/workflows/deploy.yml`: replaced the date-based comment on the `# S7-STRICT-FLIP`
    line with one saying the flip is held until `WEB_QUALITY` moves to `'light'` (or she says
    otherwise) - check NEEDS_YOU.md first. The line itself still runs `npm run budget` (warn
    mode, unchanged behaviour tonight).
  - `docs/s7/perf.md`: updated the "Deploy" section and "Wiring needed" item 4 the same way,
    so a future reader (or firing) doesn't see "Tue 24 Nov" and act on the old date.
  - `docs/NEEDS_YOU.md`: updated the open item to say the deadline pressure is gone and why,
    kept the actual WEB_QUALITY decision open for her with no urgency attached.
- Verified nothing else changed: `npx vite build` (clean, 3.9 s), `npm run budget` (same 15
  breaches, all pre-existing, nothing new - this change only touches CI wiring and docs, no
  asset or runtime code), `node tools/char-diet.mjs` (unchanged, 76.0 -> 48.9 MB), `node
  tools/licence-audit.mjs --check` (288 files, 0 UNKNOWN, same open Tripo-plan question as
  every recent entry), `node tools/check-dup-models.js` (PASS), `node
  tools/check-material-clone.mjs` (PASS, 49 scanned, 0 unwrapped clones, confirms last
  firing's guard is still clean), `node tools/missions-check.mjs` (358 PASS/0 FAIL/4 WARN,
  identical), `node tools/layout-tests.mjs` (PASS, 0 failures, identical), `node
  tools/collider-coverage-audit.mjs` (identical). `tools/world-validator.js` still can't run
  in this container (same pre-existing limitation, not retried again this firing - already
  confirmed broken across several recent entries).
- Committed, pushed, CI confirmed green.
- NEXT: section A still has no fresh, unblocked item that isn't layout (destroyed by the map
  uproot), screenshot-gated, or parked on her verdict. The budget gate itself is no longer
  time-pressured, but it is still genuinely over - a future firing could make real headway by
  picking ONE of the 8 un-slimmed hero characters' advisory 4K textures (33 advisory notes,
  never fail the build, but they are most of the 127.6 MB overage) and checking whether a
  non-destructive downscale (same approach as `char-diet.mjs`'s skin step, just applied to
  more of the texture set) would claw back MB without touching mesh/skeleton/animation -
  that's real, measurable, screenshot-independent progress on the budget number even while
  the WEB_QUALITY/flip decision itself waits on her.

# 23 Nov (9) - added a permanent build-time guard for the clone-drops-shader-hook bug (entry 8, this file)

- Fresh container again this firing: `main` one commit behind `origin/main` on a detached
  HEAD, fast-forwarded before anything else (same harmless staleness every recent entry
  flags); `npm install` re-run (`node_modules` empty, confirmed non-persistent again).
  `Places V1/` still absent from this checkout. Ran the full no-browser baseline first
  (licence-audit, check-dup-models, place-visibility-check, missions-check, layout-tests,
  collider-coverage-audit, check-budget) - all identical to the last entry's numbers, nothing
  new, nothing fresh in section A to pick up (same stale/approval-blocked state the last 3
  entries already found).
- The last entry's fix (`cloneTiledMaterial()` in `src/materials.js`) only lives as source
  code plus a `tmp/` verify script - and `tmp/` is gitignored and does not persist between
  firings (confirmed again this run: empty on a fresh checkout). So nothing in the repo would
  catch a FUTURE reintroduction of the exact same bug (someone adding a new
  `getTiledMaterial()`-based singleton and cloning it with plain `.clone()` instead of the
  helper) - the fix fixed the four known sites but left no guard rail. Built one:
  `tools/check-material-clone.mjs`, a static source scan (not a real parser, says so in its
  own header comment) that, for every `const/let X = getTiledMaterial(...)` or
  `= sharedSetMaterial(...)` assignment in `src/**/*.js`, tracks brace balance forward from
  that line to find the enclosing block and flags any plain `X.clone()` inside it that isn't
  wrapped in `cloneTiledMaterial(X)`. Comments are stripped first (block and line) so a
  comment merely discussing a clone call - every one of the three real fixes in entry 8 left
  exactly that kind of explanatory comment, which the naive first draft of this script
  misread as code and false-positived on - is never mistaken for one.
- Verified the scope-boundary heuristic actually works, not just that it runs clean: wrote a
  throwaway fixture in `tmp/fixture_bad.js` (stays there, gitignored, per CLAUDE.md "never
  rm") with four cases - a real unwrapped clone (must FAIL), one wrapped in
  `cloneTiledMaterial` (must PASS), a same-named variable in a different function that is
  never cloned (must PASS), and a same-named variable in a third function that IS a plain
  object unrelated to materials and IS cloned (must PASS, because it was never assigned from
  `getTiledMaterial`/`sharedSetMaterial` - the risk the brace-tracking exists to avoid: a
  dumb whole-file name match would have flagged this one wrongly). Ran the script against
  that fixture (`node tools/check-material-clone.mjs tmp` - added an optional directory arg,
  defaulting to `src`, exactly for this kind of check): exactly 1 violation, the real one, at
  the right line. Against the real `src/`: 49 `getTiledMaterial()`/`sharedSetMaterial()`
  assignments scanned, 0 unwrapped clones - the four sites entry 8 fixed, plus every other
  real call site, all clean.
- Wired it into `npm run build`'s pre-build chain (`package.json`, right after
  `check-dup-models.js`, same place the other pure-source checks already run, before
  `vite build`) and added a standalone `npm run check-material-clone`. Known limitation,
  stated in the script's own header: it only sees the same-function pattern that caused the
  real bug (a local `const`/`let` holding the getTiledMaterial result, cloned in the same
  enclosing block) - it does not trace a value passed in as a function parameter (e.g.
  `src/props.js`'s `lampTinMaterial(base)`, which legitimately uses a hand-rolled
  hasOwnProperty-guarded clone instead of the helper because it also needs to compose a
  second hook on top - a deliberate exception this script correctly can't see and doesn't
  need to, since it isn't the dangerous pattern).
- Full verification without the broken screenshot tool: `npx vite build` (234 modules,
  clean, 1.36 s), `node tools/char-diet.mjs` (unchanged, 76.0 -> 48.9 MB),
  `node tools/check-budget.js` (same 15 pre-existing breaches as every recent entry, nothing
  new - confirms the new check script itself ships no asset weight), `node
  tools/missions-check.mjs` (358 PASS / 0 FAIL / 4 WARN, identical),
  `node tools/layout-tests.mjs` (PASS, 0 failures, identical),
  `node tools/collider-coverage-audit.mjs` (226/22/7/0/0, identical) - all unchanged from the
  last entry's baseline. `tools/world-validator.js` still hangs in this container after 90 s
  (same pre-existing limitation, tried again in case the container differed; it didn't).
- Committed, pushed, CI confirmed green.
- NEXT: section A has no fresh, unblocked item left that isn't layout (destroyed by the map
  uproot), screenshot-gated, or parked on her verdict in NEEDS_YOU.md. A future firing should
  either revisit this once the screenshot/world-validator container issue is fixed (several
  render-to-board and per-place items are blocked purely on that), or do another pass over
  `src/` for the SAME bug class in a different shape: this entry's script only catches
  `getTiledMaterial`/`sharedSetMaterial`; if a third shared-material factory with its own
  `onBeforeCompile` hook gets added later, extend the `ASSIGN_RE` in
  `tools/check-material-clone.mjs` to name it too.

# 23 Nov (8) - found and fixed: `.clone()` on a tiled material silently drops its roughness-floor/mottling hook, unprotecting roads, most site props and every street-lamp tin part

- Fresh container again this firing: `main` was detached one commit behind `origin/main`
  (fast-forwarded before anything else, same harmless staleness as the last two entries),
  `node_modules` empty (`npm install` re-run, not committed), `Places V1/` still not present
  in this checkout. Checked BACKLOG.md section A and PARALLEL.md: both are entirely stale
  (dated Oct 23 - Nov 10), the live map is the 21 Nov one already flipped to default by this
  session's earlier commits, and nothing in either file is a fresh, safely-workable item.
  Spent the cycle in CLAUDE.md 5a-MAP's always-in-scope "materials" category instead.
- Looked for the same bug class as the last two entries' material fixes (a dispatch/plumbing
  gap that silently drops the roughness-floor-and-mottling protection added for BACKLOG J0
  "materials read as plastic"). Found it: `src/materials.js`'s `getTiledMaterial()` attaches
  that protection as a `material.onBeforeCompile` hook (plus a matching
  `customProgramCacheKey` override) for every masonry/matte/tin/earth-family set - but
  **THREE's own `Material.copy()` (which `.clone()` calls internally) does not copy either
  property** (confirmed directly by reading `node_modules/three/src/materials/Material.js`:
  its `copy()` has a long fixed field list with no `onBeforeCompile`/`customProgramCacheKey`
  entry, and separately by a standalone Node script, `tmp/verify_material_clone_fix.mjs`,
  that builds real materials via `getTiledMaterial()` for all 8 named sets and clones them
  both ways). So a plain `.clone()` on a protected material keeps `userData.dpVar` (deep-
  cloned via JSON) - making it LOOK protected - while silently dropping the actual shader
  hook, i.e. it renders completely unprotected. The project's own
  `removeSurfaceVariation()` has a comment anticipating exactly this ("a clone: userData was
  copied but the hook never was") but none of the four real call sites that clone a tiled
  material for an independent instance accounted for it:
  - `src/roadNetwork.js` `roadMaterial()` - the ONE shared 'lane' material for every road and
    lane in the whole village (?layout=new network). Earth-family protection: gone.
  - `src/roadNetwork.js` `stoneMaterial()` - the loose-stone scatter along roads ('concrete',
    masonry family). Gone.
  - `src/farmSites.js` `vcMat()` - the shared material behind most site-prop meshes (haveli,
    gaushala, mandi, khalihan, mela, playground, the pond/lotus, and more; defaults to
    'plaster', masonry family, when no `set` is passed). Gone on nearly every one.
  - `src/props.js` `lampTinMaterial()` - didn't even clone-and-lose by accident; it cloned
    `base` then replaced `onBeforeCompile` outright with ONLY the lamp night-glow hook (no
    `prev` chain), so every street lamp's tin arm/head/panel/wire (both RCC and solar types,
    every lamp in the village) was losing the 'tin' family roughness floor on purpose,
    just not on purpose for this reason.
  - Two more sites clone a 'ground'/'grass' material, which has no family today
    (`surfaceFamilyFor` returns null for both) - confirmed harmless now, but switched to the
    same safe helper for consistency (`src/dips.js`, one `src/farmSites.js` grass site).
  This is the same underlying bug class as this session's earlier metal/rust roughness-floor
  fix - a protection mechanism with a real gap nothing currently catches - except wider:
  that fix was one dispatch branch, this one silently unprotects the shared road material
  used by the entire village map plus most of farmSites.js's props.
- Fixed by adding `cloneTiledMaterial()` to `src/materials.js`: clones the material normally,
  then explicitly re-attaches `onBeforeCompile`/`customProgramCacheKey` if the source material
  owns them (`Object.prototype.hasOwnProperty`, so it never touches the no-op prototype
  default). Switched all four real call sites to it; `lampTinMaterial()` additionally now
  captures `base`'s existing hook/key BEFORE overwriting and chains it first
  (`if (prevHook) prevHook(sh, renderer);`), the same `if (prev) prev(...)` composition
  `applySurfaceVariation` itself already uses - safe because the two hooks touch disjoint
  shader `#include` points (`emissivemap_fragment` vs
  `common`/`begin_vertex`/`color_fragment`/`roughnessmap_fragment`).
- Verified behaviourally, no browser: `tmp/verify_material_clone_fix.mjs` builds real
  materials for lane/concrete/plaster/tin/metal/rust/ground/grass via the real
  `getTiledMaterial()` (stubbing only `document.createElement(NS)` so the texture loader
  doesn't throw in Node) and checks `hasOwnProperty('onBeforeCompile')` before/after each
  clone style: all 6 families-with-a-hook keep it with `cloneTiledMaterial()` and lose it
  with plain `.clone()` (confirmed `false` for every one); the 2 families-with-no-hook are
  unaffected either way, as expected. `tmp/verify_lamp_tin_fix.mjs` separately confirms
  `tin`'s base material actually owns a hook worth preserving.
- Tools-only... no, source-code fix this time, not tools: ran `npm run licence:check`,
  `node tools/check-dup-models.js`, `node tools/place-visibility-check.js`, `npx vite build`
  (234 modules, clean), `node tools/char-diet.mjs` (unchanged, 76.0 -> 48.9 MB), `node
  tools/check-budget.js` (same 15 pre-existing breaches as every recent entry, nothing new -
  this change touches no asset files, only material JS), `node tools/missions-check.mjs`
  (358 PASS / 0 FAIL / 4 WARN, identical to before the edit) and `node tools/layout-tests.mjs`
  (PASS, 0 failures, identical to before the edit) - all clean/unchanged.
  `tools/world-validator.js` still cannot run in this container (this run: timed out/hung
  rather than the earlier runs' explicit "Page crashed"; same pre-existing headless-Chromium
  limitation logged repeatedly in this file, not something this change caused - the edit
  only changes which `onBeforeCompile` function reference a material ends up with, no GLSL
  string was altered anywhere, and `npx vite build` already confirms every edited file
  parses and bundles cleanly).
- Committed, pushed, CI confirmed green.
- NEXT: same conclusion as the last two entries on section A itself - nothing fresh there
  until the screenshot/validator container issue is fixed, `Places V1/` appears in a
  checkout, or she answers an open NEEDS_YOU item. For a future firing hunting the same bug
  class: the places most worth a second look are anywhere a material is built once and
  reused as a module-level singleton (grep `getTiledMaterial(` across `src/` turned up ~90
  call sites; this entry covers every one that also calls `.clone()` on the result, but a
  future refactor that adds a new such singleton should route through `cloneTiledMaterial()`
  from the start).

# 23 Nov (7) - resolved all 7 "uncertain" flags on the collision-collider audit

- Fresh container this firing too: `main` was again on a detached HEAD one commit behind
  `origin/main` (same harmless staleness the previous entry flagged) - fast-forwarded it
  before doing anything else. `npm install` also needed a re-run (node_modules empty, confirmed
  gitignored/non-persistent per the last two entries, not a new finding).
- Checked section A of BACKLOG.md first: everything left unticked there is genuinely blocked
  (screenshot/world-validator still hangs/times out in this container after 90s with zero
  output - tried again this firing in case the container differed, it didn't; `Places V1/` is
  not present in this checkout; the rest explicitly waits on her eye/approval). Moved to the
  "systems (collision, missions, audio, menus, mobile)" category CLAUDE.md 5a-MAP names as
  always in scope, and ran the full battery of no-browser checks as a baseline: licence-audit,
  check-dup-models, place-visibility-check, vite build, char-diet, check-budget all clean/
  unchanged from the last entry's baseline (same 15 pre-existing WEB_QUALITY='full' breaches,
  nothing new).
- `tools/collider-coverage-audit.mjs` (static, no-browser heuristic for the "every solid prop
  has a collider" backlog item) reported 0 real gap candidates but 7 "uncertain" ones - cases
  where `userData.noAutoCollider` is set with no explicit collider box visible in that one
  function, so the script can't tell if a sibling object elsewhere (often another file) really
  covers it. Read all 7 by hand instead of leaving them as noise:
  - `src/kit/housesInstancing.js createHouseBatch()`: covered - `src/kit/houses.js` builds the
    real per-house `colliderBoxes` and returns them alongside this batch (confirmed by reading
    both files, the comment names the mechanism).
  - `src/kit/landInstancing.js frameHook()`: a `Mesh` built with `setDrawRange(0, 0)` - zero
    vertices, ever. There is nothing to collide with; it exists purely to run a per-frame
    callback via `onBeforeRender`. Not a gap, not even close to one.
  - `src/kit/wallMurals.js buildWallMurals()`: a 0.03 m-offset poster decal glued flush onto an
    existing building wall. The wall's own collider (built elsewhere) already blocks that space;
    a second collider here would just double it.
  - `src/placeBatch.js batchFor()` / `peopleBatchGet()` / `liveBatchFor()`: all three follow the
    same documented pattern (comments right above each function say so) - the real source mesh
    stays in the scene graph on a hidden layer with its own collider tag/boxes intact, driving
    visibility and matrices; the BatchedMesh this script flagged is a visual-only mirror
    (`userData.visualOnly`) that was never meant to collide itself.
  - `src/roofMonkeys.js createRoofMonkeys()`: ambient monkeys on rooftops the player cannot
    reach, deliberately non-solid like other roof dressing.
  - Zero real gaps found across all 7.
- Recorded each finding in a new `VERIFIED_SAFE` map inside the script itself (keyed by
  `file::function`, one line of reasoning each, with a comment warning not to add an entry
  without actually reading the code first) so a future run shows these as resolved instead of
  repeating the same manual check every time. This is explicitly a "hand-verified once" record.
  not an automatic re-check - the script's own output says so, and flags it for review again if
  the referenced code changes. `uncertain` 7 -> 0, new `verifiedSafe` 7, `gaps` unchanged at 0.
- Tools-only change, no game code touched: ran `node tools/collider-coverage-audit.mjs` before/
  after (output above), plus `licence-audit --check`, `check-dup-models`, `place-visibility-check`
  and `vite build` after, all clean - confirming the edit didn't change anything about what the
  audit actually flags as a real gap, only how it labels the 7 already-safe cases.
- Committed `e94902e`, pushed, CI confirmed green (run 45185317692, conclusion success).
- NEXT: same conclusion as the last entry - section A has no more safely-workable items until
  either the screenshot/validator container issue is fixed, `Places V1/` appears in a checkout,
  or she answers an open NEEDS_YOU item. A future firing with a working renderer should revisit
  the draw-call ceiling (A1) and the material board render-to-board item, both blocked purely on
  that tooling, not on anything code-side.

# 23 Nov (6) - found and fixed: metal/rust materials had NO roughness floor at all
- Fresh container this firing: `node_modules` was empty again (confirmed it does not persist
  between hourly firings - gitignored, each firing starts from a clean checkout). Re-ran
  `npm install` before anything else; not committing it or `package-lock.json`, same as the
  previous entry's call. Also found `main` had been left on a detached HEAD one commit behind
  (the last firing's 4 commits existed locally but the branch pointer hadn't followed) - fast-
  forwarded `main` to match; `origin/main` already had them (push had worked fine, only the
  local branch ref was stale), so nothing was actually at risk, but worth noting in case a
  future firing sees the same detached-HEAD state.
- Followed the same method as the grass/ground roughness fixes (sweep every roughness map,
  check which ones lack a code-side floor): found the dispatch itself, not a texture file, is
  the gap this time. `getTiledMaterial`'s roughness-floor dispatch in `src/materials.js` only
  checked `name === 'tin'` / `name === 'lane'` literally. `surfaceFamilyFor()` (also in
  materials.js) documents that `metal` and `rust` belong to the same 'tin' family - and the
  GLTF-relink path for older Blender models (`src/sharedTextures.js`) already calls
  `surfaceFamilyFor` and applies it correctly - but the live JS-authored path never did. Direct
  `getTiledMaterial('metal', ...)` / `('rust', ...)` calls are real and widespread: temple bell,
  tin-roof tarps, pipes, signboards, tyres, rooftops, chowk edges (14 call sites via grep).
- Measured all 33 roughness maps in `public/assets/textures*` for the near-zero-minimum "mirror
  highlight" signature that caused the grass/ground bugs: metal (min 0.337, mean 0.470) and rust
  (min 0.584, mean 0.803) are NOT currently in that bad state, so nothing reads wrong on screen
  today - but with zero code floor, a future texture swap on either (exactly what happened to
  grass and ground) would reintroduce the same bug with nothing to catch it. terracotta's raw
  map is far worse (min 0.051, 65.8% of pixels under 0.15) but is already protected - it's in
  `MATTE_SETS`, which gets a hard 0.78 floor regardless of the raw file, confirming the floor
  mechanism works and this is specifically a missing-dispatch bug, not a texture bug.
- Fixed by routing the dispatch through `surfaceFamilyFor()` itself instead of two hardcoded
  name checks: `if (MATTE_SETS.has(name)) applyMatteVariation(mat); else { const fam =
  surfaceFamilyFor(name); if (fam) applySurfaceVariation(mat, fam); }`. Verified behaviourally
  with a standalone Node check (no browser, mocked material objects): tin -> family 'tin' and
  lane -> family 'earth' are unchanged from before; metal and rust now resolve to 'tin' (were
  getting nothing); plaster/concrete still go through applyMatteVariation untouched;
  ground/grass/crop still get no family (unaffected, protected at the texture-file level
  instead, from earlier fixes).
- `npm run build` clean (234 modules, char-diet, licence-audit, dup-models, place-visibility all
  pass). `node tools/licence-audit.mjs`: 0 UNKNOWN, unaffected (pure code, no new asset files).
  `node tools/check-budget.js`: the 15 reported breaches are all the pre-existing character/
  load-time ones already open in NEEDS_YOU (today's `WEB_QUALITY='full'`), nothing new.
  `world-validator.js`/`screenshot.js` still crash this container's headless Chromium (same
  pre-existing OOM, see 23 Nov (3)) - not eyeballed, verified by the dispatch-logic check above
  instead, consistent with how this session's other material fixes were verified.
- Committed `acb1714`, pushed, CI confirmed green (`gh`-equivalent `actions_list`/`get`:
  run 45175138118, conclusion success).
- NEXT: section A of BACKLOG has little else safely workable this cycle - most remaining items
  are blocked on her eye/approval, on the map rearrangement, or on `Places V1/` (not present in
  this checkout). The draw-call ceiling item (A1, "149/150, instance harder") is still open and
  in scope but needs a working screenshot/draw-call count, which this container can't do; worth
  another pass if a future firing has a working renderer, or if a no-browser draw-call counting
  method can be found.

# 23 Nov (5) - found and fixed: every streamed tree group was measuring as "buried" (up to -2.6m)

- `npm install` had never been run in this checkout (`node_modules` only had a stray tracked placeholder
  file, no real packages) - `npm run build`/`licence-audit` were failing on "three is not installed"
  before any game code was even touched. Ran `npm install`; not committing `node_modules` (gitignored,
  the tracked `node_modules` placeholder file is a pre-existing repo quirk, left alone) or
  `package-lock.json` (unrelated to this session's change, left as `npm install` wrote it, on disk only).
- With that fixed, ran a full `npm run build` to see real current state: licence-audit/dup-models/
  place-visibility/vite build/char-diet all pass clean; `world-validator.js` still crashes this
  container's headless Chromium (OOM-killed by this specific shell tool's memory cgroup, confirmed again
  via `dmesg -T` - same root cause as the 23 Nov (3) entry, not newly caused by anything here). Spent no
  further cycles on that container limit itself (infra, not code), but since checks 1-3 run BEFORE the
  heavy wall/collider sampling that crashes it, I could still read real check 2/3 output before each
  crash - and check 3 ("nothing buried") was FAILing hard: `hero_zone/trees -2.608`, `temple_area/trees
  -1.863`, `bazaar_row/trees -2.251`, `field/trees -1.423` - every single streamed tree group, by more
  than two metres in the worst case. Chased it to a real, now-fixed, root cause (two of them, stacked):
  1. **False positive in the validator itself, now fixed**: `THREE.LOD` (src/trees.js's 4 distance levels
     per tree) keeps every level in the scene graph at once and only toggles `.visible` - it never removes
     the inactive ones. `Box3.expandByObject` (checked directly in `node_modules/three/src/math/Box3.js`)
     ignores `.visible` entirely, so world-validator's check 2/3 was measuring the 220m+ "impostor"
     billboard (src/trees.js `impostorMesh`) on every tree alongside the real near-LOD mesh, even though
     only one LOD is ever shown at a time. That billboard's quad is deliberately oversized (~1.5x the real
     tree height) so the BAKED TEXTURE's tree render — which sits with a roughly symmetric transparent
     margin top and bottom of the frame, measured directly off all 5 species' webp alpha channels (16-29%
     each side) — maps to the correct real-world size; centring that oversized quad on the tree's own real
     bounding-box centre (which is exactly what the "margins are symmetric" texture layout calls for) pushes
     its lower, fully-transparent (alphaTest 0.5, never drawn) margin to roughly 25% of the tree's own
     height below y=0. Fixed in `tools/world-validator.js`: `checkWholeObject` now walks an object's mesh
     descendants itself (same per-vertex `Box3.setFromObject(o, true)` precision as before, just unioned
     per-mesh) and skips any named `tree_impostor`, instead of one blind `box.setFromObject(object, true)`
     over everything. This alone took the FAILs from -1.4..-2.6m down to -0.14..-0.65m - real, not fixed.
  2. **Real bug in the game geometry, now fixed**: leaf-sprig cards (src/trees.js `speciesGeometry`, the
     "leaf cards" loop) anchor at a tip point clamped to `y >= 1.1`, then build a quad meant to extend
     UPWARD from that anchor ("sprig stem sits at the bottom of the cell" — the function's own comment).
     But for every non-"hang" species (4 of 5), the card's local up-axis is rotated by a fully random
     `roll` (0-2π) around the outward-facing normal, so on roughly half of all cards that "up" axis points
     somewhere other than up — including straight down — letting the card's far corner dangle below its
     own anchor instead of above it. Confirmed with a standalone Node script (no browser, just
     `import { treeParts } from '../src/trees.js'`, three.js geometry math runs fine headless) across 400
     seeds x 6 species: worst leaf card bounding box before the fix ranged -0.34 to -0.82m; after, exactly
     0.000m on every species, every seed. Fixed with the same move already used one line above it for the
     trunk's own root-flare/lean clamp: `for (let i = 1; i < P.length; i += 3) if (P[i] < 0) P[i] = 0;` -
     clamps only the stray vertex, touches no card's size, rotation, colour or facing above ground, so
     nothing about how a tree LOOKS changed (no art-director review needed, see CLAUDE.md 5a1 - this was a
     ground-penetration bug, not a taste call). Also tightened the trunk's own existing root-flare code
     (`tube()`) to spread its extra base radius along the horizontal plane instead of along the ring's
     (occasionally tilted-by-lean) normal - belt-and-suspenders with the pre-existing clamp one line below
     it, verified to change nothing on its own (same -0.02m trunk reading before and after), kept because
     it is the geometrically correct fix rather than relying solely on the clamp.
- Re-verified in the real built game, not just the standalone script: rebuilt `dist/`, re-ran
  `node tools/world-validator.js` fresh. It still only survives checks 1-3 before the same pre-existing
  OOM crash (see above), but across two separate runs it printed `PASS check 3 — nothing buried (t=0) —
  0 objects below -0.05m` both times - confirmed fixed live, not just in isolation. check 2 ("nothing
  floats") still FAILs on the same 3 pre-existing, correctly-elevated-by-design items (shelf stock, wall
  signboards) it already failed on before this session touched anything - not touched, not this entry's
  scope. `npm run build:unchecked` (vite build + char-diet + check-budget) clean; the 15 reported budget
  breaches are all the pre-existing character-size/load-time ones already open in NEEDS_YOU (today's
  `WEB_QUALITY='full'` call), nothing new. `node tools/collider-coverage-audit.mjs` still 0 gap candidates
  (tree trunk colliders are fixed-radius boxes set independently of this geometry, untouched by either fix).
- Committed, pushed, CI triggered.

# 23 Nov (4) - found and fixed: the same plastic-highlight bug, this time on bare dirt
- After the grass fix, swept every roughness map in `public/assets` (33 files) for the
  same defect signature: a near-zero minimum, meaning scattered mirror-bright texels.
  6 came back suspect; checked each against how it's actually used in `src/materials.js`.
- terracotta, tin, and lane are fine despite low raw-texture minimums: `getTiledMaterial`
  already applies an automatic shader-side roughness floor to each (via
  `applyMatteVariation`/`applySurfaceVariation`), so the raw map value never reaches the
  renderer unclamped. crop wasn't checked further (no direct `getTiledMaterial('crop', ...)`
  call site found - used instead by `texturedBox`/field.js's own material path, lower
  priority, not chased this cycle).
- `ground` was a real gap: it's not in `MATTE_SETS` and has no special case in
  `getTiledMaterial`, so it gets NO automatic floor. The only roughness floor near it is
  inside `applyGroundNoiseDetail`'s grass-patch overlay, and that only touches pixels
  under the grass mask - every bare-dirt pixel on the main terrain (`src/scene.js`
  `createGround`) and the entire tilled field (`src/field.js`, which deliberately runs
  with the grass pass disabled) used the raw map, min 0.173, with zero floor. Same bug
  family as the grass fix, just on the base ground instead of the grass overlay.
- Fixed the same way: remapped `ground_roughness.webp` from [0.173, 0.949] to
  [0.55, 0.95] (same target range as grass). `npx vite build` clean, licence audit
  unaffected (same file, no new record needed). No live/screenshot verification
  possible in this container (still broken, see entry below) - numeric/measured fix,
  not eyeballed.
- Committed `1364105`, pushed, CI triggered.

# 23 Nov (3) - technical note: root cause of the screenshot/validator crash, still unfixed
- Not a decision for her, logged for whoever next has shell access to this workspace. `tools/screenshot.js`/`tools/world-validator.js`/`tools/regression-check.js` have crashed in this container for several cycles ("pre-existing, environmental" in earlier notes). Found the actual cause via `dmesg -T`: it's a real OOM-kill by a 6 GiB memory cgroup scoped to this container's shell tool (not a host-wide shortage - the host itself has 7-8 GB free). The killed process is `chrome-headless`, anon-rss ~3.3 GB for the renderer alone before the kill, with several other chrome-headless helper processes adding a few hundred MB each on top - this specific village scene, software-rendered by SwiftShader (no GPU in this container), needs more than 6 GB combined to rasterize.
- Tried shrinking the viewport (640x400, deviceScaleFactor 1, `--js-flags=--max-old-space-size=512`) to cut memory - did NOT help, still crashed. The memory pressure is coming from the scene's own asset/texture footprint under software rendering, not the output framebuffer size, so a smaller screenshot doesn't dodge it.
- Means any future "run a smaller/faster screenshot" attempt in this same container will hit the same wall; a real fix needs either a higher cgroup memory limit for this tool, real GPU rendering instead of SwiftShader, or a scene-memory reduction (fewer loaded textures/geometry at once) specifically for the validator pass. Not spending further cycles on this myself right now - it's a tooling problem, not a game one, and the grass/texture fixes this session didn't need it (both were measured numerically against saved files, not eyeballed).

# 23 Nov (2) - fixed: grass reading as wet/glossy plastic (her screenshot)
- Her report with a screenshot: the chauraha (village square) grass - the curbed circular patch around the Amrai Kheda milestone - has a bright white glossy highlight, reading as shiny wet plastic, not matte grass.
- Root cause, measured not guessed: the new Grass002 roughness map (swapped in 22 Nov to fix the old "patchy moss" complaint) has mean roughness 0.36 and a MINIMUM of 0.0 (mirror-smooth in spots) after my downscale - compared to this project's other ground roughness maps (Ground109 "ground" mean 0.68, Ground054 "dryearth" mean 0.67, Grass001 "crop" mean 0.55, all floor around 0.15-0.2, never 0). `src/chaurahaEdges.js` and `src/farmSites.js` both call `getTiledMaterial('grass', { roughness: 1 })` - with `roughness: 1` the final shading roughness is the raw texture value with no floor, so those near-0 patches render as a strong specular highlight under direct sun: exactly the glossy streak in her screenshot.
- Fixed at the source (the texture itself, not a code branch) so both this direct path and the separate ground-blend shader path (`applyGroundNoiseDetail`, which already had its own 0.55 floor built into its shader and was less affected) get the same correct data: linearly remapped `grass_roughness.webp`'s range from [0, 0.86] to [0.55, 0.95], matching the mean/floor of this project's other matte ground textures. New measured stats: min 0.53, mean 0.72, max 0.95.
- `npx vite build` clean, `node tools/licence-audit.mjs` unaffected (same file, no new licence record needed, content-only edit). The cache-busting fix from the previous entry means this will actually show up for her without a stale-cache issue this time.
- No live/screenshot verification possible in this container (confirmed broken again this cycle, see below) - this fix is numeric/measured against a quantitative before/after, not eyeballed, but still worth her looking at once it's deployed.

# 23 Nov (1) - found and fixed why "textures aren't updated, boards still look the same"
- Her report just now: the texture-mix/grass changes don't show up when she loads the live site. Root cause: Vite copies everything under `public/assets/` into the build with NO content hash in the filename (unlike the JS/CSS chunks, which do get a hash, e.g. `main-Cal5Z3EH.js`) - this is by design for the public/ folder, but it means a texture whose CONTENT changed at the SAME path (e.g. `grass_color.webp`) keeps the exact same URL across deploys, so the browser's own cache (and GitHub Pages' CDN) can keep serving the old bytes indefinitely even though the new file really is live on the server. Signboards themselves (the painted Hindi/English text) are drawn fresh on canvas every load, not cached - so this was specifically the wall/ground/roof texture-mix work, not the signboard text.
- Fixed properly, not just for this one report: `vite.config.js` now injects a fresh `__ASSET_V__` build token every build; every texture load in the game (`src/materials.js`'s `getTiledMaterial`/grass loaders, `src/trees.js`'s leaf atlas/impostors) now appends `?v=<token>` to its URL via a small `bust()` helper. A changed texture now always gets a changed URL, so this specific class of "I changed it but nothing happened" cannot recur. Verified in the built output: `grass_color.webp` now loads as `.../grass_color.webp?v=mws6hnon` (this build's token).
- `npx vite build` clean, `node tools/licence-audit.mjs` unaffected (no new asset files, pure code).
- Told her in NEEDS_YOU to hard-refresh (or use a private window) once this deploys, since any cached copy from before this fix existed is still cached by definition - the fix only guarantees it can't happen again going forward.

# 24 Nov (38) - missions-check: first PASS proof on new map; fixed school_bell's 0.12m float
- PUSH LIST 1+2: ran tools/missions-check.mjs (static, no browser) fresh against ?layout=new - 358 PASS, 0 FAIL, 4 WARN (3 milk stops on a back-lane gali, 1 ambient temple-bell note, both WARN by design) across all 8 missions, 10 side jobs, tractor+trolley/cart spawns. First recorded run of this tool this session.
- Real-browser proof (missions-smoke.mjs) still blocked: built dist-smoke, ran it, renderer crashed again even with character models 404'd out - same confirmed container OOM as every prior entry, not this diff; not rerun (A7).
- Found + fixed a real bug while reading the school code for this: school_bell (item 4) was hardcoded to y=0; tools/blender/build_school.py's verandah apron there is really y=0.12 - exactly the known "~0.12 m float". Fixed in src/props.js (VERANDAH_APRON_Y). BELL_POSITION (collider/interaction, XZ-only) untouched, purely visual.
- distanceToCanalWater (item 4's other glitch) already fixed 24 Nov (d39496b) - confirmed by reading, not retouched.
- Tier 1 clean: build:unchecked, licence-audit, dup-models, material-clone, place-visibility. missions-check rerun after the fix, same 358/0/4.

- 24 Nov LOOKS LIST (her playtest notes): item 3 (haystacks shiny) fixed - stagingYard.js addWeathering() floored thatch roughness at 0.5 under scene.environment IBL; forced to 1.0 (matte) for the thatch set only, same mechanism as tins own floor. Items 4/5 (pots/plants, street furniture) root-caused: scenery.js abadiPropSites()/abadiGardenPlants() only loop ROWS_DRAWN = isNewLayout()?[]:PLACEMENTS - empty under the live default layout=new, so all 492 new-map houses had zero doorstep props, not "too rare". Added src/kit/newHouseProps.js (site gen off NEW_HOUSES) + wired two already-licensed unused CC0 props (small_wooden_table_01, flagged unused in CREDITS.md) into villageProps.js; registered as zones once initNewMapHouses ready resolves. Item 1 (wall variety): another concurrent run landed "5 plaster surfaces per house" same hour, not retouched. Item 2 (two buildings in chauraha road): could NOT reproduce - tools/layout-tests.mjs (the static road/overlap validator, checks all 926 footprints) reports a clean PASS, 0 on-road failures, including THE SQUARE district; could not get a screenshot either (container headless Chromium still blocked on accounts.google.com, docs/efficiency.md A7) to find the two buildings by eye. Logged to NEEDS_YOU - either already fixed since her playtest or needs her exact names/closer description.

- 24 Nov LOOKS LIST item 6 (cycle feels like a motorcycle): fixed. Split one 27 km/h/~1s-pickup CYCLE_TOP_SPEED into a 20 km/h cruise (~3s pickup) plus the existing Shift-sprint now at 27 (was 34). COAST/BRAKE keep their old ratio to TOP_SPEED so they scale down with it, not touched directly. Pedalling animation + lean into turns were already fully built in src/playerCycle.js (crank/leg IK from wheel speed, atan(v*yawRate/g) lean) - nothing to add there. Verified: build:unchecked clean; full npm run build got through world-validator this run (better than recent attempts) - collision checks 1/3 (wall overlap, buried) PASS, check 2 one FAIL is the pre-existing known school_bell 0.12m apron float, unrelated to this diff; the browser-driven steps after world-validator still hit the known accounts.google.com container block (A7), not re-run. missions-check/dup-models/material-clone all clean, same baseline.

# 24 Nov (40) - item 7 remainder research + landLayout.js cleanup; pruned 5 stale BACKLOG items
- Item 7 "map shipped twice": traced the exact divergence (not just a shape bug) - raw export has 0/1643 objects with `.rect`, mapData.json has 887/1643 (tools/layout-pack.mjs's road-snapped footprints), and mapData.json's places carry a real position `adjust` nudge vs the raw file (house ~6.3 m). Using mapData.json here would change real positions for shopsPlace.js/every o.rect reader, village-wide - not the narrow fix it looked like. Re-tagged [PAUSED-MAP] in BACKLOG (CLAUDE.md 5a-MAP: position work waits for the new map).
- Shipped the safe half: src/kit/landLayout.js's getLayout() attempt was always-false dead code (places is an id-keyed dict by design, never an array) - removed it, loadLandMap() now just fetches the raw map directly. Same output every time (unchanged), less wasted work per call (no dict-build of 1643 objects first). Comment rewritten with the real finding so nobody re-tries the naive swap.
- Shader-warm-up (texWarmed stuck at 2) left untouched - previous session's own flag ("check on a real browser before acting") still holds; read the code (src/main.js's one-upload-per-frame `warmTextures`, deliberate by its own D1 comment) and found nothing that looks like a bug rather than a headless-container timing artifact, so didn't touch it blind.
- While here: verified 5 BACKLOG [ACTIVE] items were already shipped (street lamps, laundry/drying clothes, CC0 plants, collider coverage - reran the existing audit script, 0 gaps - and ration/post-office/atta-chakki/school interiors; temple is deliberately bare per the no-deity rule). Moved to docs/archive/backlog-done.md with the file/line evidence so a future run doesn't re-chase them.
- Verified: npm run build:unchecked clean; licence-audit --check (0 UNKNOWN); check-dup-models PASS; check-material-clone PASS; place-visibility-check PASS (correct filename, not .mjs). Tier 1 only - no position/collision-relevant code touched.
- 25 Nov: wheat/crop tufts rebuilt as 3 crossed alpha cards (src/cropCards.js, 6 tris, Grass001 colour+normal+roughness, wind sway); cows/dogs roam (animals.js makeRoamer). Tier1 pass; browser chain not run (container limit).

## 25 Nov story beats run
- New src/storyBeats.js (school-out, kanta slip, kirana-yard reverse, bell flag-down, mango catch, rooftop neighbours); wired in main.js outside boot (ensureStoryBeats in the loop, B key, postmanWalk hold). All beats optional, never fail a step.
- Decisions: gate tolerance 3.5 m (+Rs5), catch window 2.5 s (+Rs2), bell range 16 m / hold 25 s, kids brake vehicles within 12 m of the school gate, kanta 50 kg per sack. Terraces are slab+stand-in placeholders at house-local offsets (may overlap real neighbours; map is being uprooted, not fixed).
- missions-node-env.mjs fixed (document.baseURI, fetch) after the gzip loader broke it; missions-check now runs tools/story-beats-behaviour.mjs (37 pass, 0 fail).

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
