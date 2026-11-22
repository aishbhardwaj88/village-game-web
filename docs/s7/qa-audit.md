# S7 QA audit — new layout (?layout=new), 22 Nov 2026

Audit only. No game code touched. Scope: a real check of `?layout=new`, the layout shipping, against
CLAUDE.md's hard rules and the sprint's own test tools, with numbers.

## Punch list (for the integrator)

1. **Capsule/pill people still show in normal play under BOTH layouts** (FINISH_LINE.md's "Zero capsule/pill
   people" line is correctly left unticked). Not new-layout-specific, but real and widespread: plain
   `THREE.CapsuleGeometry` ambient figures in `src/lifeScenes.js:155-156`, `src/vendors2.js:16,210`,
   `src/bazaarLife.js:82`, `src/gullyLife.js:33,348`, `src/milkCentre.js:69`, `src/roadEvents.js:120,156`, and
   two named shopkeepers in `src/farmSites.js:1243` (banta keeper) and `:1273` (chaatwala), each commented
   "capsule until the 3D people arrive". None of this is gated behind `?dev=1` — it is what a normal player
   sees today. `src/characters.js` is the only file that replaced capsules with code-built people. This is
   known, tracked debt (FINISH_LINE.md People section), not a regression, but it is the single biggest gap
   between the new layout and the finish line's "zero capsule" bar.

2. **The Node test tool `tools/missions-check.mjs` cannot check Dadi, the banta/chaat stalls, the milk round,
   or any other side-job logic that lives in `src/sideJobs.js`, under either layout.** `src/kit/landLayout.js:13`
   calls `import.meta.glob(...)`, a Vite build-time macro with no meaning under plain Node — so
   `createSideJobs(env)` throws on import before doing anything, every run. This currently shows up as a
   false-looking `FAIL job dadi (free roam): (0.0, 0.0) is off the village map` (full output below), and two
   silent `COLLECT ERROR` lines for `sideJobs` and `milk stops` that are easy to miss. Dadi's own fallback
   default in `src/sideJobs.js:176` (`{x:-43.3, z:41.8}`, pre-S7, pre-shift coordinates) never even gets
   exercised. docs/s7/missions.md's "0 FAIL, 4 WARN, 365 tests" is now stale: this run gets 177 tests, 1 FAIL,
   1 WARN, because of the crash — a real drop in what the checker proves, not a drop in what the game does
   (the real browser build runs through Vite, where `import.meta.glob` works; this is a Node-tool-only blind
   spot, but it means nobody has actually re-verified Dadi/milk/side-job positions against the new map with
   this tool since `landLayout.js` was added).

3. **MAP.md could not be checked at all — the file does not exist in this environment.**
   `reference-from-unity/` is gitignored (CLAUDE.md section 5) and is not present anywhere on this machine,
   in this worktree, the main repo checkout, or any other agent's worktree I could see. Task item 3 (named
   buildings vs MAP.md's place list) is therefore not done here; it needs running on a machine that actually
   has the reference folder. In its place I checked the sprint's own source of truth,
   `docs/layout/approved-map-2026-11-21.json` (which `docs/s7/layout.md` says supersedes MAP.md for this
   sprint), via `node tools/layout-tests.mjs`: **PASS, 0 failures, 167 named buildings, 492 houses, 926
   footprints checked** — matching docs/s7/layout.md's round-2 numbers exactly. No gap found against that
   file. Whether that file is itself complete against MAP.md's original place list is unverified here.

4. **`tools/regression-check.js` only ever tests `?layout=old`** — it has no `?layout=new` / URLSearchParams
   handling at all, and `DEFAULT_LAYOUT = 'old'` in `src/layout/layout.js:31`. So "zero new console errors in
   a full playthrough" for the new layout is not covered by this tool at all; only `layout-smoke.mjs` (headless
   boot, not a full scripted playthrough) touches `?layout=new`. Flagging this plainly per the brief, not
   fixing it.

5. **Headless boot, `?layout=new` only** (ran once, under `flock /tmp/s7-browser.lock`, `DIST=dist-qa`, after
   `npx vite build --outDir dist-qa`): boots in 155 s (slower than docs/s7/layout.md's 71 s on 22 Nov — this
   machine was under load today, not a regression), 200 zones built, **0 zone-build errors**, 25 console
   lines, all the same `Failed to load resource: 404` line (model-slot probes, per docs/s7/fixes.md item 5 —
   expected, not real errors). All 5 coordinate probes (anganwadi, gurudwara, old_haveli, post_office_v2,
   health_subcentre) matched their anchors exactly. I did not also run `?layout=old` in the same pass (one
   browser run, per the brief's budget), so I can't personally confirm "new shows nothing old doesn't" this
   round — I'm relying on docs/s7/layout.md's 22 Nov run for that comparison, which this boot is consistent
   with.

6. **No standalone-shrine, faith-building-task, real-brand, or single-language-signboard violations found**
   under new layout (details below) — these checks came back clean.

## Detailed findings

### 1. Capsule people (full list, with gating status)
All of the following build in both `?layout=old` and `?layout=new` (none check `isNewLayout()` for whether
to use a capsule vs a built figure — only position/route logic is layout-aware):
- `src/lifeScenes.js:155-156` — ambient instanced capsule people, comment: "ONE instanced capsule mesh (same
  style as src/bazaarLife.js)".
- `src/vendors2.js:16,210` — "People are capsule placeholders."
- `src/bazaarLife.js:82` — the bazaar's 13 ambient figures, one shared capsule geometry (positions are
  layout-aware per item 2 above; the body is not).
- `src/gullyLife.js:33,348` — "People are capsule stand-ins"; the new-layout gate at `gullyLife.js:265` only
  keeps them out of buildings, it does not change the body.
- `src/milkCentre.js:69` — capsule geometry for the milk-centre figure.
- `src/roadEvents.js:120,156` — "capsule placeholder plus a lathi" and a goatherd capsule.
- `src/farmSites.js:1243` (`npc_banta_keeper`) and `:1273` (`npc_chaatwala`) — explicitly commented "capsule
  until the 3D people arrive."
`src/characters.js` is the one file that has moved past capsules (code-built stylised people). This matches
FINISH_LINE.md's People section being correctly left unticked for "Zero capsule/pill people."

### 2. missions-check.mjs crash detail
Full relevant output:
```
COLLECT ERROR ERR sideJobs: TypeError: (intermediate value).glob is not a function
    at file:///.../src/kit/landLayout.js:13:35
COLLECT ERROR ERR milk stops: TypeError: (intermediate value).glob is not a function
== job:dadi: 0 pass, 1 fail, 0 warn
  FAIL onmap job dadi (free roam): (0.0, 0.0) is off the village map (600 m west: the 1 Nov shift)
missions-check (?layout=new): 85 points/routes collected (old layout: 97); tests 177: 175 PASS, 1 FAIL, 1 WARN
```
`src/kit/landLayout.js:13`: `const layoutModules = import.meta.glob('../layout/layout.js');` — this is a
Vite macro, statically replaced at Vite build time; it has no runtime meaning when `missions-check.mjs`
`import()`s the module tree directly under plain `node`. `src/sideJobs.js` imports this module (indirectly,
via whatever chain reaches `landLayout.js`), so `createSideJobs(env)` throws on import, before the real
Dadi/milk/banta/chaat logic (which does have correct S7 position wiring, e.g. `src/sideJobs.js:176`'s
`spot('dadi', ...)`) ever runs. The 1 WARN (`temple_bell`, ambient-only, no task) and 175 PASS are genuine and
cover M1-M8, interactions, shops, and the jobs whose checks live outside `createSideJobs` (pump, ration,
kulfi, kanche, gilli, milk marker, chakki, gate, patang, mango all show PASS as separate marker checks). Only
the deep inside-sideJobs logic (Dadi NPC position itself, banta/chaat buy points, milk doorsteps) is unproven
by this tool right now.

### 3. MAP.md comparison — not possible in this sandbox
`reference-from-unity/` is listed in `.gitignore` (lines 13-16) and genuinely absent: checked this worktree,
`/home/claude/village-game-web`, every other `/home/claude/wt/*` worktree, and a full-filesystem shallow
search for `MAP.md` — zero hits anywhere. I could not produce the requested MAP.md-vs-built diff. Used
`docs/layout/approved-map-2026-11-21.json` + `tools/layout-tests.mjs` instead (see punch list item 3): PASS,
167 named buildings, 0 failures, matching docs/s7/layout.md's own round-2 numbers. This does not confirm the
approved map itself is complete against MAP.md's original place list — that comparison needs the actual file.

### 4. Hard content rules — checked clean
- **Faith buildings, zero tasks**: `tools/missions-check.mjs`'s own faith flag only fires on `temple_bell`
  (an ambient sound interaction, no task, no reward — matches CLAUDE.md's "zero tasks," ambient-only is fine).
  Grepped `src/jobs/`, `src/sideJobs.js`, `src/interactions*.js` for gurudwara/masjid/jain: no hits.
- **Standalone shrines**: `grep -rniE shrine src/` — the only live `'shrine'` site *kind* handler left is in
  `src/longWalks.js:105-107` (dead code: zero entries of `kind: 'shrine'` in the current
  `LONG_WALK_SITES` data array, which was regenerated for the 3 Nov map and never repopulated with one).
  `src/villageFurniture4.js:300` and `src/main.js:1832` both explicitly confirm the roadside majar/field
  shrine were removed on her 7 Nov order and stay removed. `LONG_WALK_SITES`' fixed old-map coordinates are
  correctly relocated/dropped for new layout by `src/layout/layout-wiring-entry.js` (confirmed importing
  `LONG_WALK_SITES` and `RIDE_NOOK_SITES` and snapping/dropping them per docs/s7/layout.md's "51 moved, 20
  kept" line) — so this isn't a floating-prop risk either.
- **Real brands / wordmarks**: grepped for common brand names (Coca-Cola, Pepsi, Airtel, Jio, Hero, Bajaj,
  Maruti, Samsung, etc.) across `src/` and `docs/s7/`: no hits (only unrelated game-dev jargon, "hero zone").
- **Era (nothing post-~2015)**: nothing found suggesting smartphones/modern tech; not exhaustively checked
  beyond the brand grep and reading through prop comments, given the time budget.

### 5. Signboards — shared path checked, no stale single-language boards found
Every true shop/place signboard goes through `src/signPaint.js`'s `drawBilingual()`, called from
`src/signboards.js` (hero boards), `src/kit/shopsSigns.js:102`, and `src/kit/mapObjectsSigns.js:31,38`
(gram panchayat notice board) — all pass `hi` first, `en` second, into the one shared paint routine, so the
Hindi-bold-larger/English-smaller/same-ink rule is enforced in one place, not per-shop. I did not find a
second, independent signboard-painting code path for the new layout's shops. The only standalone
`ctx.fillText` Devanagari calls outside `drawBilingual` are in `src/smallShops.js` (lines 76-91, 183-199):
these paint a newspaper front page, magazine covers and a mithai box lid — goods/prop textures, not shop
signboards, so the painted-board rule doesn't apply to them, and none carry English at all (Hindi-only
headlines/titles are normal for an in-world newspaper, not a sign). No violation found, but flagging for the
record since they're outside the shared helper.

### 6. Capsule/pill people — see punch list item 1 and detail section 1.

### 7. regression-check.js layout coverage — see punch list item 4.

## Deferred, not actioned (per the brief — owner has parked this category)
- Ambient life / crowd density / extra animals / birds: not reviewed, not touched, per standing instruction.
  `src/gullyLife.js`'s capsule stand-ins (section 1) are flagged only because they are visible capsule
  *people* in normal play, which the brief explicitly asked me to grep for — not as a comment on crowd
  density or population count, which stays untouched.

## What to fix first
Of everything above, the most important single thing for the integrator is **item 2: `missions-check.mjs`
has been silently blind to all of Dadi, the banta/chaat stalls and the milk round since `landLayout.js`'s
`import.meta.glob` landed**, because it means nobody has actually machine-checked those side-job positions
against the new map at all — the tool reports a FAIL that looks like a real "Dadi is off the map" bug but is
actually just the checker crashing before it gets there, and could be hiding a real position bug underneath.
Fix the checker (give it a Vite-aware runner, or a Node-safe fallback in `landLayout.js` for when
`import.meta.glob` isn't available) before trusting any "0 FAIL" side-job claim again, then re-run it to get
a real answer on Dadi's new-layout position.
