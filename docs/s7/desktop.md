# S7 desktop agent notes (desktop edition of Dopahar)

## What the desktop edition is
- The same game, packed as a normal app you double-click on a Mac or a Windows PC. This is the edition that will be SOLD.
- It carries its own copy of Chrome's drawing engine inside (the tool is called Electron), so the game looks and behaves the same on every computer, whatever browser the player uses.
- The whole game is inside the app, the Hindi font included (self-hosted since round 2). Nothing is downloaded from the internet while playing.
- Saves live in the app's own folder on the computer and survive closing and reopening the app (tested, see Test results).

## How it differs from the web edition
- Owner's decision (21 Nov): FULL quality first, everywhere. The web also runs "full" until she approves the village; the "light" web settings exist only as a placeholder to be tuned later. Switching the web to light later = one line (`WEB_QUALITY` in src/edition.js).

| | Desktop ("full") | Web later ("light", placeholder) |
|---|---|---|
| Character models | original files, 4096 px skins (6.5 to 8.7 MB each) | slimmed by tools/char-diet.mjs (1024 px, 2048 for heroes) |
| Fully animated characters | up to 24, within 40 m | up to 12, within 25 m |
| Characters hidden beyond | 80 m | 50 m |
| Real sun shadows | OFF until she says yes (one line to flip); when on: within 120 m | off by default, within 60 m |
| Shadow sharpness (map) | 4096 px over a 120 m box | 2048 px over 60 m |
| Screen sharpness (pixel ratio) | up to 2 | up to 1.5 |
| Zones built ahead of you | further out (+40 to +70 m) | today's distances |
| Window | 1600 x 900, resizable, fullscreen key | browser tab |

- The pause menu's Medium and Low still work on desktop, so a player on a weak laptop can step down.

## How it is decided which edition is running
- Inside the app, a tiny safe script (desktop/preload.js) tells the game `window.dopaharDesktop = { edition: 'desktop', version: '0.1.0' }`. Nothing else from the computer is visible to the game (checked: the game cannot reach files or Node).
- Testing in a browser: add `?edition=desktop` or `?quality=light` to the address.
- The running game shows what it chose on `window.__dopaharEdition` (edition, quality, which character files the build shipped).

## Quality keys (one function for everyone: `getQuality()` in src/edition.js)
- `charNear`, `charMaxFull`, `charFar`, `charMidHz`, `charLoadRadius`: character tiers (characters agent, src/characterLOD.js `LOD`)
- `shadowRadius`, `charShadowRadius`, `blobMaxDistance`: distance shadows (perf, src/renderer.js)
- `shadowMapSize`, `shadowExtent`, `shadowFar`, `pixelRatioMax`: pause menu "High" ceiling (already wired, src/quality.js, marked block)
- `zoneAlwaysExtra`, `zoneSightExtra`, `zoneVisExtra`: zone streaming distances (src/zoneManager.js)
- `sunShadows`: real sun shadows on by default (src/main.js). Now `false` in both presets; flip `sunShadows` in the `full` preset to `true` once she says yes
- `charTextures`: 'original' or 'slim', a fact about the build, for tests

## How to build (on the MacBook)
- One-time setup, in the Terminal, inside the game folder:

```
npm run desktop:install
```

- Build the full-quality game and the Mac app (both chips) in one go:

```
npm run desktop:mac
```

- Result: `desktop/out/Dopahar-0.1.0-mac-arm64.dmg` and `.zip` (Apple chip) and `-mac-x64` (older Intel Macs).
- Try it without packing (fast, after `npm run build:desktop` once):

```
npm run desktop:start
```

- Windows installer: on GitHub, Actions tab > "Desktop Windows installer" > Run workflow; the Setup.exe appears as a download on that run (about 15 to 25 minutes). Or `npm run desktop:win` on a Windows PC.
- Web build is unchanged: `npm run build` (the characters agent's slimming step runs there only).
- On this Linux box the Electron downloads fail through the proxy, so the four Electron zips were fetched by hand (checksums verified) into desktop/.electron-zips/ and passed with `-c.electronDist=.electron-zips`. On the Mac this is not needed.

## Built here (21 Nov, Electron 45.4.1, cloud Linux box)
- Not committed (build outputs are ignored by git). Paths:

| File | Size | Notes |
|---|---|---|
| desktop/out/Dopahar-0.1.0-mac-arm64.zip | 200 MB | Apple chip Macs. Unsigned (see below) |
| desktop/out/Dopahar-0.1.0-mac-x64.zip | 204 MB | Intel Macs. Unsigned |
| desktop/out/Dopahar-0.1.0-win-x64.zip | 233 MB | unzip, run Dopahar.exe |
| desktop/out/Dopahar-0.1.0-windows-portable.exe | 184 MB | one file, double-click; unpacks itself each start (slower start) |
| desktop/out/linux-unpacked/ | 396 MB | used for the smoke test |
| dist-desktop/ (the game inside every app) | 122 MB | of which the 10 characters 76 MB |

- On a computer the installed app takes about 380 MB (Mac) to 480 MB (Windows): about 260 MB is the built-in Chrome engine, 122 MB is the game.
- Mac .dmg: cannot be made on Linux (needs Apple's disk tool). Made automatically by `npm run dist:mac` on the Mac.
- Mac zips made here are NOT signed. On an Apple-chip Mac an unsigned app shows "Dopahar is damaged". Build the Mac app on the MacBook instead: there it gets a free basic ("ad-hoc") signature automatically, enough for her own Mac. Selling needs the paid Apple signature (Steam section). If testing a zip from here anyway, after unzipping run once:

```
xattr -cr ~/Downloads/Dopahar.app && codesign --force --deep -s - ~/Downloads/Dopahar.app
```

- Windows installer (Setup.exe, NSIS): could not be made here. It needs the 32-bit Windows runner "wine" on Linux; only the 64-bit one installed. The Windows zip and the one-file portable .exe were made instead.

## Test results (smoke test, packaged Linux app, no screen, software drawing)
- How: `sh desktop/scripts/smoke.sh` runs the PACKAGED Linux app twice with no screen (xvfb) and software drawing, inside the shared browser lock. Run 1 waits for the title and Play, presses Play, plays 6 s. Run 2 restarts the app with the same save folder. Reports: desktop/smoke/run1.json, run2.json (not committed).
- **Both runs PASS. 0 console errors in each.**

| Check | Result |
|---|---|
| Game loaded from the files inside the app (no internet) | yes, `app://dopahar/village-game-web/index.html` |
| Edition / quality reported by the game | desktop / full |
| Character files shipped | originals (Maa 8,354,036 bytes = the file in public/, not slimmed) |
| Safe bridge to the page | only `{ edition: 'desktop', version: '0.1.0' }`; Node and files NOT reachable from the game |
| Title shown / Play ready | 4.0 s / 8.2 s (software drawing on a shared, GPU-less box: a real Mac is far faster) |
| Play pressed, first 3D frame drawn | yes; 130 draw calls, 70 shaders, 1600 x 900 window |
| Saves kept after closing and reopening | yes (value written in run 1 read back in run 2) |
| Console errors | 0 (run 1), 0 (run 2) |

- Third run (rebuilt app, 8 s of play, 0 errors, 127 draw calls) saved a picture of the game running inside the app: desktop/smoke/shot/run3.png (village street, Kirana store board, minimap, the Hindi line drawn with the computer's own Devanagari font).
- Not errors, noted: 10 "file not found" answers for optional model slots (tractor, trolley, cart, bullock, bike, player, halwai, monkey, charpai, hand_pump). The game asks whether a real model exists and keeps its placeholder when not; same on the web. The Google font request was blocked (Wiring 6).
- Could not be tested here: real GPU speed, pixel ratio 2 (the test screen is 1x), F11 / Cmd+Ctrl+F fullscreen and link opening (need a person at a real screen). First thing to try on the MacBook.
- `npm run build:unchecked` passes (budget report unchanged from the perf baseline: same 11 known breaches, none new).

## Needs her (plain words)
- Real sun shadows for the paid edition: yes or no? They are the biggest look upgrade (they cost 20 to 85 extra draw calls per view, measured 3 Nov). Prepared but OFF; turning them on is one line.
- Apple Developer Program, $99 a year (Rs 8,429), when she wants Mac players to open the app without a warning. Not needed for her own testing.

## Steam later (no Steam code added yet)
- **Steam app id**: comes from Steamworks after paying the Steam Direct fee, $100 per game (Rs 8,514), paid back to her after the game earns $1,000 on Steam.
- **What Steam needs from us**: the Windows and Mac folders this build already makes (Steam's uploader, SteamPipe, takes the unpacked app folders, not the installer), a store page with images, and a short review by Valve.
- **Achievements (optional)**: an open-source add-on called steamworks.js (MIT licence, free) lets the game tell Steam "achievement unlocked". Adds one small file to desktop/ and a few lines in the game. The Steam overlay (Shift+Tab) is fiddly inside Electron; skip it at first.
- **Mac signing**: Apple Developer Program $99/yr (Rs 8,429) lets us sign and "notarise" the Mac app so it opens with no warning. Strongly advised for selling on Mac, also outside Steam.
- **Windows signing**: optional. Without it Windows shows a blue "Windows protected your PC" box for direct downloads; games started from Steam do not show it. A signing certificate costs roughly $10 a month (Rs 851) to a few hundred dollars a year; decide only if selling outside Steam.
- **Saves on Steam**: already in the app's own folder; Steam Cloud can later be pointed at that folder (no code needed).

## Round 2 (21 Nov evening): wiring applied by me
- **Root package.json scripts** added: `build:desktop`, `desktop:install`, `desktop:start`, `desktop:mac`, `desktop:win`. `build:unchecked` unchanged (`vite build && node tools/check-budget.js`). char-diet is not in the web build yet; when the characters agent adds it, it goes in `build`/`build:unchecked` only, never in `build:desktop`.
- **src/renderer.js**: pixel ratio cap, shadow radius, character real-shadow radius, blob distance now come from `getQuality()` ('full': 2, 120 m, 30 m, 80 m; 64 blob slots instead of 40 when blobs reach past 50 m).
- **src/main.js** (inside the S7 WIRING (desktop) lines): `FOLLOW_SUN_SHADOWS = getQuality().sunShadows || ?shadows=follow`. **`sunShadows` is `false` in the full preset for now** (src/edition.js, one line to flip).
- **src/scene.js**: sun light distance `Math.max(80, shadowExtent + 40)` (160 m for 'full') so the 120 m shadow box never clips tall things. Everything that reads the sun's direction normalises it (checked: night.js, dayline.js, sky), so nothing else changes.
- **Hindi font self-hosted**: `public/fonts/noto-sans-devanagari/NotoSansDevanagari-600-700.woff2` (104 KB; weights 600 to 700 in one file, cut from Google's own OFL variable font with fontTools) + `OFL.txt` beside it. index.html and people.html load it with one `@font-face` and a preload; Google's servers are no longer contacted. Licence record in tools/licence-records.json, CREDITS.md font row updated, docs/LICENCES.md + src/creditsData.json regenerated (the credits screen still lists the font). tools/licence-audit.mjs learned to list fonts that ship as files (two small marked lines).
- **.github/workflows/desktop-windows.yml**: manual only (Actions > "Desktop Windows installer" > Run workflow), on a free Windows machine: licence check, `build:desktop`, `npm --prefix desktop run dist:win`, uploads Setup.exe + zip as a download for 14 days. deploy.yml untouched. Not run yet (needs a push to GitHub).
- Checks: `npm run build:unchecked` passes (15 budget lines, all known: 10 characters, whole game, before-Play/Play-ready; none new). `npm run licence:check` passes (only the Tripo plan question). Smoke (packaged Linux app rebuilt from round 2, `sh desktop/scripts/smoke.sh`, shared browser lock): **run 1 and run 2 PASS, 0 console errors each**; desktop / full / original characters; title 4.8 s, Play ready 11.7 s, Play pressed and drawn (128 draw calls, 1600 x 900); **no request to Google any more** (the only "not found" answers are the 10 optional model slots, as before); save written in run 1 read back in run 2. Picture: desktop/smoke/run1.png (Hindi text drawn with the bundled font). The scene in it differs from round 1 (fewer houses on the left of the opening view) because of other agents' work merged into main, not because of these changes.

## Still for the integrator (files I must not edit)
1. **src/characterLOD.js** (characters agent): `import { getQuality } from './edition.js';` then `const q = getQuality();` and `LOD = { NEAR: q.charNear, FAR: q.charFar, MAX_FULL: q.charMaxFull, MID_HZ: q.charMidHz, HYST: 2, LOAD_RADIUS: q.charLoadRadius, LOAD_AT_ONCE: 2 }` ('full': 40 m, 80 m, 24, 20 Hz, 90 m).
2. **src/zoneManager.js** (layout agent editing it): `import { getQuality } from './edition.js';` then `ALWAYS_EXTRA = getQuality().zoneAlwaysExtra` (110), `SIGHT_EXTRA = getQuality().zoneSightExtra` (300), `VIS_EXTRA = getQuality().zoneVisExtra` (130). Watch the draw-call ceiling when VIS_EXTRA grows.
3. **docs/CREDITS.md** (licence agent, FYI): Electron (MIT) and Chromium's licences ship inside the app automatically (LICENSE.electron.txt, LICENSES.chromium.html). App icon = the game's own peepal render.
4. Optional: `--max-texture 4096` flag in tools/char-diet.mjs for a "full slim" desktop profile (same skins, smaller files, ~76 MB -> ~35 MB), called from desktop/scripts/build-game.mjs.

## Files
- src/edition.js (new), src/quality.js (marked S7 ADDITION block + one marked line), src/main.js (marked `S7 WIRING (desktop)` import, init call, sun shadows line), src/renderer.js, src/scene.js (marked S7 lines)
- public/fonts/noto-sans-devanagari/ (font + OFL), index.html, people.html, tools/licence-records.json, tools/licence-audit.mjs (marked), docs/CREDITS.md
- package.json (desktop scripts), .github/workflows/desktop-windows.yml
- desktop/main.js, desktop/preload.js, desktop/package.json (electron-builder settings), desktop/build/icon.png
- desktop/scripts/build-game.mjs (desktop game build), desktop/scripts/smoke.sh + smoke-summary.mjs (smoke test)
