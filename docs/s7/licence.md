# Licence check (S7, 21 Nov 2026)

The game is going to be sold, so every file it ships was checked for "are we allowed to sell this?".
Full list, one row per file: `docs/LICENCES.md`. Nothing was deleted or moved.

## The answer in numbers

**238 files ship from public/ (118.8 MB).**

| What | Files | Size | Cleared? |
|---|---|---|---|
| Free third-party files (Poly Haven, ambientCG, OpenGameArt, Freesound), all CC0, all in CREDITS.md | 102 | 14.9 MB | yes |
| Made by us (Blender scripts in tools/blender, leaf atlases from CC0 photos, far-tree pictures, a data file) | 126 | 27.9 MB | yes |
| People made with Tripo AI | 10 | 76.0 MB | **waits on you** (plan question below) |
| Not allowed / unknown | 0 | 0 | none found |

Also checked:
- **Code inside the game**: three.js (MIT), postprocessing (Zlib), meshoptimizer decoder (MIT). All fine for selling; their licence texts are now in the credits screen.
- **Font**: Noto Sans Devanagari (SIL Open Font License): fine for selling.
- **Brands**: none. No real brand names, logos or wordmarks anywhere.
- **The built game (dist/)**: only our code plus the public/ files above. Nothing extra.

## Needs you (one question)

- **Which Tripo plan made the 10 people?** (Brother, Dada, Dadi, Maa, Parlour Didi, Pitaji, Postman, Sarpanch, Sister, Teacher.)
  Tripo's pricing page: paid plans = "private models, commercial use"; free plan = models are public, under CC BY 4.0.
  Please open your Tripo account, look at Billing / Subscription, and tell us the plan name and the month you made them.
  If you bought API credits instead of a plan, say that.

## Must replace before selling

- **Nothing today.** If the Tripo answer is "free plan", the 10 people would need to be remade on a paid plan.

## Worth knowing

- The panchayat flag is the Indian national flag (drawn by our code). Fine in the village; keep it off the store page, box art, logo and ads unless your lawyer says otherwise.
- The old saloon car has the shape of a 1960s Ambassador, with no name or badge. The jeep is generic.
- **23 shipped files (2.9 MB) are not used anywhere in the code** (old dharam kanta and petrol pump, material sample panels, TV cabinets, a garden leaf sheet, 4 Poly Haven props, 2 texture sets). They are all cleared, so nothing is urgent. Dropping them would make the game smaller. That is the integrator's call; the list is in `docs/LICENCES.md`.
- **Name typo on the credits screen**: the Hindi line under "Made by Aishwarya Bhardwaj" reads "आशा भारद्वाज" (Asha). Fix below.

## What was done

1. **`tools/licence-audit.mjs`**: checks every file in public/, the fonts, the code packages, and dist/ (with `--dist`). It reads `tools/licence-records.json` (one record per file or file family) and checks the proof behind each record:
   - free files: the licence is allowed AND CREDITS.md has its row; for Poly Haven models it also checks the pictures inside carry Poly Haven's own names;
   - our own files: the builder script exists and names the file; any picture inside a model must come from our own CC0 texture sets or be drawn by the script;
   - Tripo files: marked "waits on owner" until `tripoPlanConfirmed` is filled in.
   It writes `docs/LICENCES.md` and `src/creditsData.json`. Runs in under 1 second.
2. **`docs/CREDITS.md` fixed**: added Small Wooden Table 01 (Poly Haven, Ulan Cabanilla, CC0: it was shipped with no row); every prop and potted plant now named one by one; leaf photo sets and the rust / burlap / dry-earth textures turned into proper rows with links; the replaced school sound marked as no longer shipped; new sections for the font, the code packages, the Tripo people and "made in this repo".
3. **In-game credits screen (`src/credits.js`)**: now built from `src/creditsData.json`, so it always matches the records. Shows: CC BY authors (none today; they appear automatically when one is added), thanks to the CC0 libraries with every sound author named, the font with its licence, three.js / postprocessing / meshoptimizer with their full licence texts (tap "Licence text"), and "Characters made with Tripo AI". English first, Hindi beneath. It no longer ships the whole CREDITS.md file inside the game code.
4. **The check that stops new unrecorded files**: `node tools/licence-audit.mjs --check`. Tested: a made-up new file in public/ makes it fail with a plain message; the real repo passes (with the one Tripo warning).

## Checks run (numbers)

- `npm run build:unchecked`: built fine (the budget gate prints its existing size warnings: characters 6.5-8.7 MB each, whole game 120.7 MB; not from this work).
- `node tools/licence-audit.mjs --check --dist` on the built game: 238 files, 0 errors, 1 owner question, 0 unknown files in dist/.
- Built game booted headless (Chromium, vite preview), credits screen opened: every section renders, **0 red console errors**.
- `--check` with a made-up new file: exit 1 (FAILED), as intended. `--check --strict`: exit 1 today because of the Tripo question, as intended.

## Wiring needed (integrator applies; I did not touch these files)

1. **package.json scripts** (perf owns scripts):
   - add `"licence": "node tools/licence-audit.mjs"` and `"licence:check": "node tools/licence-audit.mjs --check"`
   - put `node tools/licence-audit.mjs --check && ` at the front of both `"build"` and `"build:unchecked"` (adds under 1 s).
2. **Deploy / paid release** (`.github/workflows/deploy.yml`, perf owns): after `vite build`, run `node tools/licence-audit.mjs --check --dist`. For the paid desktop build use `--check --dist --strict` once the Tripo answer is in (strict also fails on owner questions).
3. **index.html line 1315**: change `आशा भारद्वाज द्वारा निर्मित` to `ऐश्वर्या भारद्वाज द्वारा निर्मित`.
4. **CLAUDE.md section 9** (one line): "Every new file under public/ gets a record in tools/licence-records.json (and a CREDITS.md row if third-party) in the same commit; `npm run licence` regenerates docs/LICENCES.md and the credits screen data."
5. **Desktop agent**: the desktop edition must work offline, so Noto Sans Devanagari should be bundled as local font files with the OFL licence text beside them (OFL allows this in a paid game). When those files land in public/, add a record (category credited, licence OFL-1.1, creditsKey "Noto Sans Devanagari") so the check passes.
6. **When the owner answers Tripo**: set `"tripoPlanConfirmed": "<plan name>, <month>, confirmed by owner <date>"` in `tools/licence-records.json` and re-run `node tools/licence-audit.mjs`. A value starting with "free" turns the 10 people into "must replace".
