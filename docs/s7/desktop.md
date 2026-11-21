# S7 desktop agent notes (desktop edition of Dopahar)

## What the desktop edition is
- The same game, packed as a normal app you double-click on a Mac or a Windows PC. This is the edition that will be SOLD.
- It carries its own copy of Chrome's drawing engine inside (the tool is called Electron), so the game looks and behaves the same on every computer, whatever browser the player uses.
- The whole game is inside the app. Nothing is downloaded from the internet while playing (one exception today: the Hindi font, see "Wiring needed" 6).
- Saves live in the app's own folder on the computer and survive closing and reopening the app (tested, see Test results).

## How it differs from the web edition
- Owner's decision (21 Nov): FULL quality first, everywhere. The web also runs "full" until she approves the village; the "light" web settings exist only as a placeholder to be tuned later. Switching the web to light later = one line (`WEB_QUALITY` in src/edition.js).

| | Desktop ("full") | Web later ("light", placeholder) |
|---|---|---|
| Character models | original files, 4096 px skins (6.5 to 8.7 MB each) | slimmed by tools/char-diet.mjs (1024 px, 2048 for heroes) |
| Fully animated characters | up to 24, within 40 m | up to 12, within 25 m |
| Characters hidden beyond | 80 m | 50 m |
| Real sun shadows | on, within 120 m (her call, see Needs her) | off by default, within 60 m |
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
- `sunShadows`: real sun shadows on by default (src/main.js)
- `charTextures`: 'original' or 'slim', a fact about the build, for tests

## How to build (on the MacBook)
- One-time setup, in the Terminal, inside the game folder:

```
cd desktop && npm install && cd ..
```

- Build the game for desktop (no character slimming), then the Mac app:

```
node desktop/scripts/build-game.mjs && cd desktop && npm run dist:mac && cd ..
```

- Result: `desktop/out/Dopahar-0.1.0-mac-arm64.dmg` and `.zip` (Apple chip) and `-mac-x64` (older Intel Macs).
- Try it without packing (fast): `cd desktop && npm start`
- Windows installer: `npm run dist:win` (needs a Windows PC, or the free GitHub Windows build machine, see Wiring 5).
- Web build is unchanged: `npm run build` (the characters agent's slimming step runs there only).

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
- Mac zips made here are NOT signed. On an Apple-chip Mac an unsigned app shows "Dopahar is damaged". Build the Mac app on the MacBook instead (the Mac build signs it for that machine automatically). If testing a zip from here anyway, after unzipping run once:

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

- Not errors, noted: 10 "file not found" answers for optional model slots (tractor, trolley, cart, bullock, bike, player, halwai, monkey, charpai, hand_pump). The game asks whether a real model exists and keeps its placeholder when not; same on the web. The Google font request was blocked (Wiring 6).
- Could not be tested here: real GPU speed, pixel ratio 2 (the test screen is 1x), F11 / Cmd+Ctrl+F fullscreen and link opening (need a person at a real screen). First thing to try on the MacBook.
- `npm run build:unchecked` passes (budget report unchanged from the perf baseline: same 11 known breaches, none new).

## Needs her (plain words)
- Real sun shadows are ON in the desktop "full" preset (the biggest look upgrade of the paid edition). Today the web has them off because they cost 20 to 85 draw calls. Yes or no for desktop?
- Apple Developer Program, $99 a year (Rs 8,429), when she wants Mac players to open the app without a warning. Not needed for her own testing.

## Steam later (no Steam code added yet)
- **Steam app id**: comes from Steamworks after paying the Steam Direct fee, $100 per game (Rs 8,514), paid back to her after the game earns $1,000 on Steam.
- **What Steam needs from us**: the Windows and Mac folders this build already makes (Steam's uploader, SteamPipe, takes the unpacked app folders, not the installer), a store page with images, and a short review by Valve.
- **Achievements (optional)**: an open-source add-on called steamworks.js (MIT licence, free) lets the game tell Steam "achievement unlocked". Adds one small file to desktop/ and a few lines in the game. The Steam overlay (Shift+Tab) is fiddly inside Electron; skip it at first.
- **Mac signing**: Apple Developer Program $99/yr (Rs 8,429) lets us sign and "notarise" the Mac app so it opens with no warning. Strongly advised for selling on Mac, also outside Steam.
- **Windows signing**: optional. Without it Windows shows a blue "Windows protected your PC" box for direct downloads; games started from Steam do not show it. A signing certificate costs roughly $10 a month (Rs 851) to a few hundred dollars a year; decide only if selling outside Steam.
- **Saves on Steam**: already in the app's own folder; Steam Cloud can later be pointed at that folder (no code needed).

## Wiring needed (for the integrator; files I do not own)
1. **package.json scripts** (add):
   - `"build:desktop": "node desktop/scripts/build-game.mjs"` (full-quality game into dist-desktop/, NO char-diet)
   - `"desktop:install": "npm --prefix desktop install"`
   - `"desktop:start": "npm --prefix desktop start"`
   - `"desktop:mac": "npm run build:desktop && npm --prefix desktop run dist:mac"`
   - `"desktop:win": "npm run build:desktop && npm --prefix desktop run dist:win"`
   - Characters agent hook: char-diet runs ONLY in the web `build` / `build:unchecked` (after `vite build`, on dist/). The desktop build never calls it, so the originals ship. Nothing to change in tools/char-diet.mjs. Optional later ("full slim profile"): give char-diet a `--max-texture 4096` flag (`const size = o.maxTexture || (hero ? 2048 : 1024)`) and call `node tools/char-diet.mjs --out dist-desktop/assets/models --max-texture 4096` from build-game.mjs: same skins, smaller geometry, probably 76 MB -> ~35 MB with no visible change. While the web also runs "full" (owner 21 Nov), whether the WEB still slims characters is the integrator's/her call; the slimming does not depend on src/edition.js.
   - Optional: `VITE_DOPAHAR_BUILD=web` in front of the web build so `__dopaharEdition.build` reports 'slim' (purely informational).
2. **src/characterLOD.js** (characters agent): `import { getQuality } from './edition.js';` then build `LOD` from it: `NEAR: q.charNear, FAR: q.charFar, MAX_FULL: q.charMaxFull, MID_HZ: q.charMidHz, LOAD_RADIUS: q.charLoadRadius` (keep HYST, LOAD_AT_ONCE).
3. **src/renderer.js** (perf): `SHADOW_RADIUS = getQuality().shadowRadius`, `CHAR_SHADOW_RADIUS = getQuality().charShadowRadius`, `BLOB_MAX_DISTANCE = getQuality().blobMaxDistance`, `MAX_PIXEL_RATIO = getQuality().pixelRatioMax` (the resize path otherwise caps at 1.5 until applyQuality runs again; main.js already re-applies after a resize). If more than 40 characters can show blobs, raise BLOB_SLOTS.
4. **src/zoneManager.js** (perf): `ALWAYS_EXTRA = getQuality().zoneAlwaysExtra`, `SIGHT_EXTRA = getQuality().zoneSightExtra`, `VIS_EXTRA = getQuality().zoneVisExtra`.
5. **src/main.js** (integrator): `const FOLLOW_SUN_SHADOWS = getQuality().sunShadows || params.get('shadows') === 'follow'` (keeps `?shadows=follow`). **src/scene.js**: sun `distance = 80` -> `Math.max(80, getQuality().shadowExtent + 40)`, otherwise a 120 m shadow box clips tall things on the sun side.
6. **index.html / people.html**: the Hindi font (Noto Sans Devanagari, OFL) comes from Google's servers. In the desktop app with no internet, or where the request is blocked (smoke test: blocked), the system's Devanagari font is used instead (Mac and Windows both have one, so text still shows). Self-hosting the two woff2 files under public/fonts/ + one CREDITS.md row (OFL) fixes it for both editions and also speeds up the web.
7. **.github/workflows** (perf owns): optional job on a free `windows-latest` runner: `npm ci && npm run build:desktop && npm --prefix desktop ci && npm --prefix desktop run dist:win` gives the real Windows installer (Setup.exe) without wine.
8. **docs/CREDITS.md** (licence agent): Electron (MIT) and Chromium's licences ship inside the app automatically (LICENSE.electron.txt, LICENSES.chromium.html). The app icon is made from the game's own peepal tree render (no third-party file). No new third-party assets added.

## Files
- src/edition.js (new), src/quality.js (marked S7 ADDITION block + one marked line), src/main.js (one marked `S7 WIRING (desktop)` import + call)
- desktop/main.js, desktop/preload.js, desktop/package.json (electron-builder settings), desktop/build/icon.png
- desktop/scripts/build-game.mjs (desktop game build), desktop/scripts/smoke.sh + smoke-summary.mjs (smoke test)
