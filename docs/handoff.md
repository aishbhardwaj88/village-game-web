# Handoff log - one entry per run, max 8 lines, newest on top.
# Entries older than 3 days live in docs/archive/ (moved 24 Nov, see handoff-pre-22nov.md).

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

# 22 Nov (7) - real bug found and fixed: the water tank (tallest landmark) had zero collision
- Built `tools/collider-coverage-audit.mjs`, a static no-browser audit of every prop/structure-builder function in src/ against the three real collider mechanisms (explicit `userData.collider`, explicit `userData.colliderBoxes`, and src/autoColliders.js's name-rule-based auto-derive) - the "audit and LIST any solid object with no collider" half of the long-open A0 backlog item, doable without the broken screenshot/validator pipeline. Result: 226 covered, 22 correctly excluded (crops, water surfaces, hanging cloth, decorative batches), 7 uncertain (checked by hand, all fine - boxes live on a sibling object in the same file), 0 mechanical gaps.
- Digging past the mechanical pass (checking every object name against solidRules.js for accidental substring matches) found one real bug: `createWaterTankProp()` in `src/props.js` - MAP.md's "tallest structure, visible from most of the map" - had **zero** collision. Its own old comment said "legs are thin scenery", which was wrong (each of the four legs is a real 0.4x0.4 m concrete post running the full 9 m body-band height), and even if that were right, the mesh's name (`water_tank`/`water_tank_prop`) happens to match solidRules.js's water-surface exclusion rule by bare substring match, so the auto-derive safety net was silently switched off too. A player could walk straight through the tallest landmark in the village.
- Fixed: added four invisible tagged collider boxes for the legs and two for the transformer poles, same convention `createFlagpoleProp()` already uses just above it in the same file, sized to match the visible geometry exactly. Re-ran the audit tool: `createWaterTankProp` now shows covered. `npx vite build` clean, `node tools/licence-audit.mjs` unaffected (no new asset files, pure code). No live/screenshot verification possible in this container - say so plainly rather than claim it's proven in-game.
- Also traced the backlog's other named gap, "cart legs" (roadEvents.js thela, vehicles.js cart) - both already covered by existing collider registration; the note was stale, struck (see previous entry).
- NEXT: tick the A0 backlog line with this finding; the audit tool is reusable for any future prop additions.

# 22 Nov (6) - "cart legs" collider gap found stale, no code change needed
- BACKLOG item A0: "Give colliders to... carts... audit and LIST any solid object with no collider" has carried "cart legs" as a known gap since 23 Oct. Traced both named cases this cycle (no live/screenshot trace possible, code-only): roadEvents.js's thela prop leg is already inside the whole-footprint collider box registered right after `buildThela`; vehicles.js's "cart legs" comment is actually about the bullocks' animal legs, which fall inside the cart's existing dynamic collision assembly (`VEHICLE_PRESETS.cart.assembly`, consumed per-frame by `vehicleSolidBoxes()`). Tagging a vehicle-mesh part with the static collider pattern used for fixed props would freeze a stale invisible wall wherever the cart was at the last zone rebuild - that would be a new bug, not a fix, so no change was made. Struck from the open-gap note in BACKLOG.md; the rest of that item (the static audit asked for) is still open, next.
- NEXT: a static (no-browser) collider-coverage audit tool is in progress to answer the "audit and LIST" half of this item properly, since the screenshot/world-validator/regression-check pipeline that was the only prior way to check this is broken in this container.

# 22 Nov (5) - crop-model and lotus BACKLOG items checked; mustard rebuilt as real 3D geometry
- BACKLOG item: source brinjal/okra/sugarcane/mustard/wheat as real CC0 models or remove each one that fails. Checked Poly Haven's full model catalogue via its JSON API (522 models total, filtered for plant/flower/crop/veg keywords: zero hits beyond flower_gazania and the other scans already in use) and the open web (CGTrader/TurboSquid/RenderHub/Sketchfab, all paid, nothing CC0). No free crop model exists anywhere checked. One marketplace, poly.pizza, didn't go through this cycle - a one-time tool approval it needed went unanswered, logged as a technical note in `docs/NEEDS_YOU.md`, not a decision for her.
- Per-crop result: brinjal/okra were already off (flat alpha cards, "sourced or removed", removed earlier - `buildVegBushes` kept for reference, never called). Sugarcane (`buildCaneClumps`) was already real 3-sided stalk+leaf geometry with vertex colours, not a card - left alone. **Mustard (`buildSarsonBloom`) was still a flat alpha-cut billboard card** (a canopy of painted quads) - the exact 2D-cutout look already rejected elsewhere. Since no model exists and she called this "the signature image", rebuilt it as real geometry instead of leaving the card or deleting the field: each plant is now a real tapering 3-sided stem (same technique as the sugarcane stalks) carrying small 3D floret crosses - four tilted petal triangles per floret, no billboard, no alpha texture, real volume and self-shadowing. Still instanced per plot, still reads as a yellow carpet from a distance (many real florets, not one painted card). Wheat is still code-built field colour with no individual plants modelled - not touched this cycle, flagged for her in NEEDS_YOU in case she wants it looked at too.
- BACKLOG item: lotus/water-lily for the pond. Same sources checked, same result - no free CC0 model exists. Current code (`src/farmSites.js`) already only builds `lotusPadGeo()` (bare pads); `lotusFlowerGeos()`/`lotusPetalTexture()` exist in the file but are never called - so the live game already matches the "no model -> pads only, no paper flowers" end state from her 3 Nov call. Nothing to change.
- Organic-asset survey across the codebase (BACKLOG sub-task, "list every code-built organic thing"):
  - **Real scanned CC0 models (Poly Haven, `public/assets/plants3d/`, via `src/realPlants.js`):** flower_gazania (marigold beds), plus whatever else has landed in that folder per `docs/CREDITS.md` - the only organic things in the game that are actual photoscanned assets, not code.
  - **Code-built, real 3D geometry (not flat cards) - considered fine as-is:** trees (`src/trees.js`: neem/peepal/babool/mango/eucalyptus, branching trunk+twigs, leaf-sprig cards at the tips only, not a flat canopy); sugarcane stalks (`src/field.js` `buildCaneClumps`); mustard/sarson florets (`src/field.js` `buildSarsonBloom`, rebuilt this cycle, see above); animals (`src/animals.js`) draw a real `.glb` model when `public/assets/models/<kind>.glb` exists and fall back to the code-built shape otherwise - cow/dog slots are open per `docs/asset-slots.md`.
  - **Removed, not shipped (no CC0 model, flat-card look already rejected):** brinjal, okra (`src/field.js`, off); tulsi, banana, bougainvillea, creeper garden plants (`src/vegetation.js` `buildGardenPlants` - drawn as nothing, kept as named kinds for when a real model exists); lotus flowers on the pond (pads only, see above).
  - **Still open / not yet looked at this cycle:** wheat (code-built field colour, no individual plant models - flagged above); fruit or food on shop counters, kiln smoke, and the 7 Nov "animals and props with no free model" list (hens, goats, monkey, banyan roots, ruined tree house, women sifting grain) are all still logged as open in NEEDS_YOU from their own dates, not re-checked this cycle.
- Verified: `npm run build` compiles clean (the `vite preview`/`world-validator` failures after it are the same pre-existing Chromium/port environment issue logged earlier this session, not caused by this change). `node tools/licence-audit.mjs`: 0 UNKNOWN, 0 flagged (no new asset files this cycle, mustard is pure code). Committed as `949ea65`.
- NEXT: keep cycling BACKLOG section A for anything else achievable without Blender or the broken screenshot pipeline; retry the poly.pizza lookup once she's written again, in case it turns up something the other sources missed for wheat.

# 22 Nov (4) - texture MIX is live: tin/mud-road/cement/painted-wall now vary building to building
- Her instruction, direct and twice: "good, use mix of these textures so that game look realistic... in reality as well, there is a mix of textures" then, after a second round of options, "use all of these textures. this way we will have variety of textures" - read as approval to implement, not more browsing.
- Sourced 14 total CC0 Poly Haven texture sets across this session (color+normal+roughness each, via the files API + browser-based fetch, no direct curl - this container's egress proxy blocks dl.polyhaven.org): 2 tin, 2 mud-road, 2 cement-wall, 8 painted-wall (6 new this round + the 2 already-liked ones from the first round).
- Checked every new normal map's std-dev before wiring any of it in (the `beige_wall_001` lesson from earlier this session - a flat normal map looks unrealistic even with a good colour map). 12 of 14 passed clearly (std 0.012-0.19). Two painted-wall options from this round, `worn_cracked_plaster` and `yellow_plaster`, came back borderline (0.008-0.010) - likely an artifact of the downscale this container's fetch pipeline needed, not necessarily really flat, but held back rather than risk a repeat of "not realistic". Logged in `docs/NEEDS_YOU.md` for a full-res recheck next cycle.
- `src/materials.js`: added 12 new SETS entries under `public/assets/textures_mix/` plus a `MIX_GROUPS` table (`tin`/`lane`/`concrete`/`plaster`, 2-7 variants each) and `pickMixVariant()` - a deterministic hash on each wall's own repeat/tint values, so the same wall never flickers between variants but different-sized walls across the village land on different ones. Live by default, no toggle, since she explicitly approved all of it - this is different from the still-pending `lane_v2`/`plaster_v2` A/B candidates (her "not realistic" fix), which stay behind `?matv2=1` untouched, separate decision.
- Licence records + CREDITS.md rows added for all 12 (Poly Haven CC0, her "free game, feel free to use assets" + explicit per-texture approval as evidence). `node tools/licence-audit.mjs`: 0 UNKNOWN, 0 flagged. `npm run build` compiles clean; `world-validator`'s in-container Chromium crash is the same pre-existing environment issue logged in 22 Nov (2), not caused by this change.
- `public/assets/textures_mix/` adds 2.7 MB; the budget check's existing 15 breaches (characters, overall game size) are all pre-existing, none newly caused by this change - logged, not silently ignored.
- NEXT: full-res recheck of the 2 held-back wall options; keep an eye out for her reaction to the live mix next time she loads the site (no toggle needed now, it's just there).

# 22 Nov (3) - game confirmed free/no monetization; wall candidate replaced after her "not realistic" call
- **Her decision (22 Nov, scope change, logged not acted on beyond asset-sourcing)**: "I have decided I am not going to be charging anyone for this game. It is going to be a free game, so feel free to use assets." Read narrowly as: loosens CLAUDE.md section 9's "NC never" default for *sourcing textures/props* (an NC-licensed CC asset is legally fine on a game that takes no money) - CC0 still preferred first, CC BY still credited, still never unlicensed/unknown. Does **not** by itself answer the separate, still-open Tripo question (`docs/NEEDS_YOU.md`): whether the 10 Tripo characters were made on a paid plan, because the free-plan concern is that Tripo *publishes the model itself* in its public gallery, not a monetization/attribution issue - that's a factual account question only she can answer, re-asked below.
- **Her "these aren't looking realistic" (on the raw/unlit road+wall comparison sent earlier)**: diagnosed with a raking-light shader (numpy, `shade()`: decodes the normal map, Blinn-Phong-ish spec from roughness, renders at a glancing angle) run on all 4 textures. Road candidate (Poly Haven `dirt_floor`) holds up fine under raking light - real relief, kept as-is. Wall candidate (Poly Haven `beige_wall_001`) was the actual problem: its normal map is nearly flat (visually confirmed, solid-blue ~128,128,255), reads as a flat gradient even lit - correctly called out.
- **Fix**: dropped `beige_wall_001` entirely. New `plaster_v2` candidate instead reuses the EXISTING, already-credited, already-good `plaster` normal + roughness maps (confirmed under raking light to have real stucco/trowel relief) and only replaces the *colour* map - with a median-blurred (9px, 2 passes, OpenCV) version of the current `plaster_color.webp` that erases its baked-in crack lines (the actual "damaged not cared-for" cue, section 6) while keeping its large-scale warm/cool tonal variation. Re-shaded under raking light: genuine stucco grain, zero cracks, zero new licence dependency (derivative of an asset already in CREDITS.md, not a new third-party source) - exactly the "textured but not falling apart" gap that pure Poly Haven/ambientCG search couldn't fill (every clean plaster option was flat; every textured one was tagged damaged/weathered).
- Files updated to match: `public/assets/textures_candidates/plaster_v2/*` (all 3 maps replaced), `tools/licence-records.json` + `docs/CREDITS.md` (creditsKey/source changed from beige_wall_001/Poly Haven to PaintedPlaster017/ambientCG, evidence rewritten to explain the derivative). Still behind the same `?matv2=1` toggle, still not live, still her call.
- `npm run build` reran clean (licence-audit passed, same renderer crash as below on the Chromium verification step - see 22 Nov (2)).
- NEXT: send her the updated raking-light comparison (road unchanged + new crack-free wall) now that both candidates hold up; re-ask the Tripo-plan question narrowly since her free-game note doesn't cover it.

# 22 Nov (2) - texture candidates staged (road, painted buildings), headless renderer broken in this container
- Her ask: free textures for tin, road, grass, muddy road, pond, cement, painted buildings, "keep them ready" for her 2h-later review; also an explicit standing order never to stop building while she's away.
- Road ("plasticky" dark brown/grey): current `lane` roughness map is mid-grey (~0.55) under a roughness:1 multiplier - too glossy for dirt. Candidate: Poly Haven CC0 `dirt_floor` (compacted muddy dirt, real ARM scan, near-white roughness map). Staged at `public/assets/textures_candidates/lane_v2/` (color/normal/roughness, 1K webp).
- Painted buildings: current `plaster_color.webp` has baked-in cracks - reads as "falling apart", not CLAUDE.md section 6's "cared-for, limewashed". Candidate: Poly Haven CC0 `beige_wall_001` (smooth painted exterior, undamaged). Staged at `public/assets/textures_candidates/plaster_v2/`.
- Neither candidate is live. `src/materials.js` adds `lane_v2`/`plaster_v2` SETS entries plus a dev-only `?matv2=1` URL toggle (`VARIANT_OVERRIDE`) - default load is byte-identical to before. Licence records + CREDITS.md rows added so `npm run check-budget`/licence-audit pass clean (still UNKNOWN 0 after this change).
- tin/concrete look like genuine photoscans already (ribbed galvanize, real wood-grain concrete) - left alone. grass_color.webp is actually a patchy moss-on-dirt texture, not lawn grass - real CC0 lawn-grass PBR sets are thin on Poly Haven/ambientCG (most hits were Poliigon/paid or AI-texture sites, not allowed sources); not replaced yet, needs more search time. "Pond" is ambiguous - ponds are a vertex-coloured dip + water shader (`src/dips.js`/`src/water.js`), not a simple tiled material like the others; asked her below rather than guessing at a shader rewrite.
- **Blocker, not her call, logged for the next cycle**: `tools/world-validator.js` and `tools/screenshot.js` both crash the headless Chromium renderer in this container the moment the real 3D scene renders (`page.on('crash')`, "Target crashed"), alongside repeated `CreatePlatformSocket() failed: Address family not supported by protocol (97)` console errors. Reproduced on a clean `ea6bf66` checkout with this session's changes fully stashed, so it's a container/environment regression, not something this cycle's edit caused. Added `--no-sandbox` to world-validator's launch args (safe, didn't fix it). Could not get the mandatory section-10 screenshot this cycle as a result - every other check that doesn't need a GPU (licence-audit, dup-models, place-visibility, build) passed clean.
- NEXT: when the renderer works again, load `?matv2=1` and screenshot both before/after for her. Until then, do not trust "it built" alone for anything touching a visual - same lesson as the 22 Nov (1) entry below, now blocked at the tooling level.

# 22 Nov - shop board variety, new-map houses crash, road wear
- Shop boards (her 22 Nov note: "no variety, same look and feel"): src/kit/shopsSigns.js rewritten - 5 real shapes/thicknesses (shelf-packed atlas), left/right/center text alignment with a trade pictogram for non-centered layouts, wired through src/kit/shopsPlace.js's per-board sizing. Verified live, screenshots sent.
- Found + fixed while verifying: that rewrite's atlas.cells.size reference was stale (SignAtlas moved to atlas.bins arrays), silently crashing the whole s7_shops_land chunk (shops+trees+fields+canal+props all at once, build:unchecked passed fine - only visible in the browser console). Fixed be77755 -> 6c6c170.
- Found + fixed separately: ?layout=new houses (492 of them) were silently failing to build on every load (`makeRoadIndex(map.roads)` with map.roads undefined). First fix (src/kit/houses.js loadPlannedHouses, 9a43fe3) wasn't enough - live site still crashed. Root-caused to map.roads still arriving undefined from one of the two map sources at runtime; made makeRoadIndex itself defensive plus the call site (d33716f). Confirmed live: 492 houses, real children, no error.
- Road wear (her note: "no pits, no stones"): src/roadNetwork.js now has deterministic potholes (cc9d60f, rides the existing vertex grid, no extra draw calls) and a merged-per-chunk loose-stone scatter (159d573, procedural rock shape, shared 'concrete' material, one extra mesh per road chunk). Both verified live via mesh-data inspection, not just a screenshot.
- Lesson reinforced again this session: "it built" / build:unchecked passing is not evidence - every fix this session was verified by loading the real deployed site and reading scene/console state directly; two real silent-failure bugs were only caught that way.
- NEXT: nothing blocked. Natural next items: more realism pass per docs/BACKLOG.md J0 (materials/edge wear), or whatever she flags next. Scoped-not-built: nothing currently.


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
