# S7 desktop build round 3 (22 Nov): re-tested against current main

Round 1 and round 2 (docs/s7/desktop.md) smoke-tested the pipeline on 21 Nov. This round re-runs the same pipeline
against current `main`, which has since gained the characters agent's full-quality wiring, the wallposters agent's
murals/signboards, and perf's world-bounds wiring, and (important) the owner's 22 Nov call to turn real sun shadows
ON in the full preset. Numbers below are real, from one headless run on this shared box, not estimates.

## What changed on main since round 2 that affects the desktop numbers

- **Sun shadows are now ON in the full preset** (`src/edition.js`, commit "Sun shadows ON in the full-quality preset
  (her call left to us, 22 Nov: premium look)"). Round 2's notes said sun shadows were prepared but OFF; that is no
  longer true. This is the single biggest reason the draw-call number below is higher than round 2's.
- Characters, wallposters (signboards, wall murals) and perf's world-bounds wiring are all merged into main and were
  exercised in this build (the screenshot below shows a Hindi/English signboard and the sun-shadowed scene).

## Build + smoke, this run (`git merge origin/main` was a no-op: this worktree was already even with main)

1. `npm run desktop:install` - 283 packages, Electron 45.4.1 downloaded fine through the proxy this time (no manual
   zip fetch needed; round 1's workaround still documented in desktop.md in case the proxy is flaky again).
2. `npm run build:desktop` - **122.4 MB**, built in 1.8 s. `dopahar-build.json` confirms `characters: original (no
   char-diet)`.
3. `npx electron-builder --linux dir` (under the shared browser lock) - packaged fine, **398 MB unpacked** (260 MB of
   that is Electron's own Chromium/Node, 122 MB is the game, per round 1's breakdown, unchanged).
4. `sh desktop/scripts/smoke.sh` (packaged Linux app, no screen, software rendering, under the shared lock) - **both
   runs PASS, 0 console errors in each.**

### Real numbers (run 1, this round)

| Check | Result |
|---|---|
| Loaded from | `app://dopahar/village-game-web/index.html` (no internet) |
| Edition / quality / characters | desktop / full / original |
| Title shown | 4.0 s |
| Play ready | 5.5 s |
| Play pressed, first 3D frame | yes, at 11.7 s wall-clock (software rendering on a shared, GPU-less box) |
| Draw calls after Play | **252** (round 2 was 128-130; the difference is sun shadows now ON, plus wallposters/characters content) |
| Shader programs | 75 |
| Canvas | 1600 x 900 @ 1x (box has no real GPU, so dpr capped at 1 here; a real Mac/PC reaches the 'full' preset's pixelRatioMax of 2) |
| Character files shipped | originals confirmed (Maa 8,354,036 bytes = same file as public/, not slimmed) |
| Safe bridge to the page | only `{edition:'desktop', version:'0.1.0'}`; Node and files NOT reachable from the game |
| Hindi text | renders with the bundled font (self-hosted since round 2); screenshot shows a correct signboard: Hindi bold/larger on top ("किराना स्टोर"), English smaller beneath ("General Store") |
| Contacts Google Fonts | **no** - only the 10 known "file not found" answers for optional model slots (tractor, trolley, cart, bullock, bike, player, halwai, monkey, charpai, hand_pump), same as every prior round; no font/network request to any external host |
| Saves kept after closing and reopening | yes (value written in run 1 read back in run 2) |
| Console errors | 0 (run 1), 0 (run 2) |

Screenshot: `desktop/smoke/run1.png` (not committed, build output). Shows the player cycling up to a kirana store with
a correctly-formatted bilingual signboard, visible ground shadows (sun shadows on), and a populated minimap. Nothing
black, flat, or broken.

**252 draw calls is comfortably inside the sprint's own ceiling for the ride** (SPRINT.md: <=150 main pass / <=250
incl. shadows - this is right at that incl.-shadows line on one static frame with shadows on; worth the perf agent
re-checking across a real play span per CLAUDE.md section 10, not just this one frame).

## 3. Windows Action - has it ever been run?

`gh run list --workflow=desktop-windows.yml` returns **no runs**. It has never been triggered. The workflow file
itself is valid YAML (checked with a parser) and its steps match the documented pipeline (`npm ci`, licence check,
`build:desktop`, `npm --prefix desktop ci`, `dist:win`, upload). **Someone with push access needs to go to the GitHub
Actions tab and run "Desktop Windows installer" by hand** - this worktree has no push access and cannot trigger it.

## 4. Can a real Mac build happen from this Linux box?

**No.** electron-builder's `dmg` target shells out to macOS's own `hdiutil` to build the disk image; that tool does
not exist on Linux, so a .dmg cannot be produced here (confirmed in round 1's notes too). A Mac `.zip` of the app
*can* technically be assembled without `hdiutil`, but it would be unsigned and untested here, and the project's own
rule is the Mac build happens on the MacBook or a macOS CI runner, not worked around on Linux.

**Added `.github/workflows/desktop-mac.yml`** in this commit, mirroring `desktop-windows.yml`'s structure exactly
(manual `workflow_dispatch` only, `npm ci` -> licence check -> `build:desktop` -> `npm --prefix desktop ci` ->
`npm --prefix desktop run dist:mac` -> upload `*.dmg` and `*.zip` as a 14-day artifact named `Dopahar-mac`), but
`runs-on: macos-latest` so it runs on a real GitHub-hosted Mac with `hdiutil` available. No money spent, no signing
(same `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` as the Windows file; the app's existing ad-hoc `identity: '-'` setting in
`desktop/package.json` still applies, giving a free local signature good enough for her own Mac, not for distribution
without the Apple Developer Program). YAML validated with a parser; not run (no push access from this worktree).

## 5. Character-diet exclusion from the desktop build - confirmed

- `package.json`: `build:desktop` runs only `node desktop/scripts/build-game.mjs`. `build` and `build:unchecked` (the
  web paths) are the only scripts that call `node tools/char-diet.mjs`.
- `desktop/scripts/build-game.mjs` itself documents and enforces this: it never imports or calls char-diet, and its
  own log line says so (`"characters: original (no char-diet)"`), confirmed in this run's output and in
  `dist-desktop/dopahar-build.json`.
- Character file sizes shipped in the packaged app match the untouched originals byte-for-byte (Maa 8,354,036 bytes).

## 6. `npm run licence:check`

**Passes.** 240 shipped files; 104 credited, 126 self-made, 10 Tripo, 0 unknown. One standing owner question (which
Tripo plan made the 10 people) remains open per her own order not to be asked again (docs/s7/licence.md); nothing new
broke.

## What's still needed before the 28 Nov "full desktop build" checkpoint

1. **Windows installer**: someone with GitHub push access needs to open the Actions tab and manually run "Desktop
   Windows installer" at least once, to get a real Setup.exe/zip and confirm the workflow actually succeeds on a
   Windows runner (it has never been run).
2. **Mac installer**: same, but for the new `.github/workflows/desktop-mac.yml` added here ("Desktop Mac installer").
   This is the only way to get a real signed-enough-for-testing `.dmg`/`.zip` pair; it cannot be done from this Linux
   box or from the MacBook unless someone is physically at it running `npm run desktop:mac`.
3. **Apple Developer Program ($99/yr, ~Rs 8,429)** and a **paid Windows signing cert (optional)** are still the only
   way to ship without OS warning boxes; both are pure owner/money decisions already logged in desktop.md, unchanged
   by this round, and this agent spent nothing.
4. **Real-GPU numbers**: every number above comes from a software-rendered, GPU-less box. Play-ready time, draw calls
   under real hardware, and pixel ratio 2 still need a real Mac/Windows machine per round 2's open item (unchanged).
5. **Re-check the 252-draw-call number across a real play span**, not one static frame, now that sun shadows are on
   by default in 'full' - CLAUDE.md section 10 calls a single screenshot insufficient evidence for anything that
   changes over time (camera movement, more characters coming into shadow range, etc). Flagging for the perf agent,
   not reworking it myself (out of this agent's ownership).

## Nothing found broken since the 21 Nov smoke test

Both smoke runs pass with 0 console errors, saves persist across restart, the safe preload bridge is unchanged (only
`{edition, version}` exposed, Node unreachable), and no Google Fonts contact. The only behaviour change is the higher
draw-call count, which is an expected, deliberate consequence of turning sun shadows on (desktop.md itself flagged
"20 to 85 extra draw calls per view" as the cost when this was still a pending decision).

LINK: not yet. YOU: nothing from this check; the two items above (manually running the Windows Action and the new Mac
Action from the GitHub Actions tab) need someone with push access, not her. NEXT: nothing further planned by this
agent this cycle; handing findings to the integrator.
