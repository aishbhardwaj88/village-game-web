# Wallposters agent (s7-wallposters)

Owns: `src/kit/wallMurals.js` only. Branch `s7-wallposters`, worktree only, never pushed.

## What this does

Expands the signage agent's wall-mural system (CLAUDE.md section 5b: a bare wall is an
automatic fail) per the art director's two rounds of direct feedback (22 Nov):

1. "Find them yourself" — a real village papers every open wall: movie posters, slogans,
   wanted/missing notices, event posters, and more. Not just the original 8 civic
   slogans + 4 folk murals.
2. "Why aren't road-facing walls being utilised?" — the old system never used the front
   wall and picked back/side walls with no idea which one actually faces a road.
3. Follow-up: real walls are NOT all one uniform "poster" look. Civic slogans are
   hand-painted on the plaster; movie/missing/classified/event content is printed
   paper glued on top. These needed two visibly different treatments.

All three are done. Strictly no religion anywhere (the devotional design the integrator
removed stays removed — not touched), strictly no real political parties/figures, no
real brands, no real phone numbers, nothing post-~2015.

## Part 1 — the content library: 41 designs across 6 categories

| Category | Count | ids |
|---|---|---|
| Civic / government slogans (**painted**) | 10 | clean, vaccinate, water, trees, girled, school, family, literacy, gramSabha, stubble |
| Fictional movie posters (**pasted**) | 8 | filmVillageLove, filmBadla, filmChandni, filmSarpanch, filmDoEkad, filmAandhi, filmMela, filmKasam |
| Missing/lost notices (**pasted**) | 4 | missBuffalo, missGoat, missDog, missCycle |
| Classifieds / help-wanted (**pasted**) | 6 | jobLabour, jobTailor, jobShop, tuition, repair, recharge |
| Event posters (**pasted**) | 9 | eventMela, eventMagic, eventOrchestra, eventCircus, eventKushti, eventCricket, eventKabaddi, eventSchool, eventBlood |
| Pure-graphic folk murals, no text (**painted**) | 4 | rangoli, cowpeacock, handprints, almanac (kept from the original agent, untouched) |

One-line description of every new design (the original 8 civic + 4 graphic are
unchanged from `docs/s7/signage.md` except `girled`, reworded below):

- **clean** — "अपना गांव साफ रखें / Keep the village clean", broom icon.
- **vaccinate** — "बच्चों को टीका लगवाएं / Get children vaccinated", water-drop icon.
- **water** — "जल ही जीवन है / Water is life".
- **trees** — "पेड़ लगाओ, जीवन बचाओ / Plant trees, save life", tree icon.
- **girled** — reworded to the real, well-known public-service phrase per her 22 Nov
  call: "बेटी बचाओ, बेटी पढ़ाओ / Save the daughter, educate the daughter" (generic
  phrasing, not a scheme logo).
- **school** — "स्कूल जरूर जाएं / Always go to school", pencil icon.
- **family** — "छोटा परिवार सुखी परिवार / Small family, happy family".
- **literacy** — "साक्षरता ही शक्ति है / Literacy is strength", book icon.
- **gramSabha** (new) — "ग्राम सभा की बैठक / Village council meeting", a plain notice-
  board icon — administrative, no party name, nothing partisan.
- **stubble** (new) — "पराली न जलाएं / Don't burn crop stubble", a flame with a slash.
- **filmVillageLove** — fictional title "मेरा गांव मेरी जान / My village, my life",
  tagline "इस दिवाली", a cart-wheel emblem (no face/figure).
- **filmBadla** — "बदला / The revenge", tagline "जल्द आ रही है", a flame emblem. `layered`.
- **filmChandni** — "चांदनी रात / Moonlit night", tagline "इस होली", a crescent-moon emblem.
- **filmSarpanch** — "सरपंच / The headman", tagline "सिनेमाघरों में", wheel emblem.
- **filmDoEkad** — "दो एकड़ ज़मीन / Two acres of land", tagline "इस सीज़न", wheel emblem. `faded`.
- **filmAandhi** — "आंधी और तूफान / Storm and whirlwind", tagline "जल्द", flame emblem.
- **filmMela** — "मेले का प्यार / Love at the fair", tagline "इस दिवाली", moon emblem.
- **filmKasam** — "कसम / The vow", tagline "अगले हफ्ते", wheel emblem. `faded`.
- **missBuffalo/Goat/Dog/Cycle** — "लापता भैंस/बकरी/कुत्ता" and "साइकिल खो गई", each with
  its own line-art icon, all sharing the line "सरपंच के घर संपर्क करें" (contact at the
  sarpanch's house) — invented, generic, never a real phone number. missBuffalo
  `layered`, missDog/missCycle `faded`.
- **jobLabour** — "खेत मजदूर चाहिए / Field labourers needed", sickle icon.
- **jobTailor** — "दर्जी की जरूरत / Tailor wanted", scissors icon. `faded`.
- **jobShop** — "दुकान सहायक चाहिए / Shop assistant wanted", bell icon.
- **tuition** — "ट्यूशन पढ़ाई जाती है / Tuition classes offered", book icon.
- **repair** — "साइकिल व ट्रैक्टर मरम्मत / Cycle and tractor repair", wrench icon.
- **recharge** — "मोबाइल रिचार्ज यहां होता है / Mobile recharge here", phone icon.
- **eventMela** — "गांव का मेला / Village fair", starburst icon.
- **eventMagic** — "जादू का खेल / Magic show", starburst icon.
- **eventOrchestra** — "ऑर्केस्ट्रा और डीजे रात / Orchestra and DJ night", music-note icon.
- **eventCircus** — "सर्कस आ रहा है / Circus is coming", tent icon. `layered`.
- **eventKushti** — "कुश्ती दंगल / Wrestling tournament", an akhada-ring + crossed-gada
  icon (no human figures). `faded`.
- **eventCricket** — "क्रिकेट टूर्नामेंट / Cricket tournament", bat icon.
- **eventKabaddi** — "कबड्डी टूर्नामेंट / Kabaddi tournament", court-lines icon.
- **eventSchool** — "स्कूल का वार्षिक उत्सव / School annual function", bell icon.
- **eventBlood** — "रक्तदान शिविर / Blood donation camp", blood-drop icon.
- **rangoli / cowpeacock / handprints / almanac** — unchanged graphic murals from the
  signage agent.

Every text board keeps the CLAUDE.md section-7 rule for its main line: Hindi bold and
larger on top, English smaller beneath, same dark colour — verified by eye in the
atlas dump (`docs/s7/wallposters/atlas_full.png`). Movie/event posters additionally
carry a Hindi-only tagline/timing line as decorative flavour (not the compliance line).

Movie posters are typographic only: stacked bold titles, taglines, a release-style
line ("इस दिवाली" / "इस होली" / "जल्द आ रही है" etc.), and one abstract graphic emblem
per mood (flame for action, crescent moon for romance, cart wheel for drama/rural) —
**no faces, no figures, nothing that could read as a portrait.** No real film titles,
no real actor/studio/production-house names.

## Part 2 — two wall treatments (her 22 Nov follow-up)

Every design now carries `treatment: 'painted' | 'pasted'`:

- **painted** (civic slogans + the 4 graphic murals): no separate paper rectangle, no
  drop shadow. The border is drawn in the same ink colour as the lettering (paint, not
  a frame), with a faint second pass for brush unevenness, a chalky desaturating
  overlay, one or two faint paint drips below the border, and a hair of hand-painted
  skew on the whole sign. Never a torn edge — it's paint, not paper.
- **pasted** (movie/missing/classified/event): a visible cream/off-white paper
  rectangle distinct from the wall colour behind it, a drop shadow so it reads as
  stuck-on, one lifted/curled corner (small triangle + highlight), a per-design
  rotation (~±5°) so posters don't sit dead straight, an optional sun-faded/yellowed
  tint (`faded: true` on 6 designs), and an optional second poster peeking out from
  underneath (`layered: true` on 3 designs: filmBadla, missBuffalo, eventCircus) for
  the papered-in-layers look.

Known simplification: the rotation/faded/layered look is baked per **design** in the
shared atlas (every instance of e.g. `filmBadla` shares the same skew), not re-randomised
per **instance** — true per-instance variation would need either a bigger atlas with
several rotated copies of each design or a per-quad UV transform. Placement position
and jitter are still per-instance (unaffected). Flagging this as a known limitation,
not iterating on it per the "never iterate twice before showing her" rule — this is a
reasonable approximation and the visual mix already reads correctly in the proof shot.

## Part 3 — road-facing walls now get used

`buildWallMurals(boxes, opts)` (same exported name, same basic box shape, so **no
caller is broken by leaving `opts.roads` unset** — behaviour is then identical to the
original: back wall 46%, each side 22%, front never used, ~10% none):

- **New optional `opts.roads`**: any index with `.clearance(x, z)` → metres to the
  nearest road edge (e.g. `makeRoadIndex()` from `landLayout.js`, already built in
  `shopsPlace.js` as the local `roads` variable). When given, each candidate wall is
  sampled ~2.5 m beyond its own outward face; a wall within `opts.roadFaceDist` (default
  7 m) of a road/lane is "road-facing" and gets `opts.roadBoost` (default 3.5×) its base
  selection weight, capped so a 5-8% "no mural" chance always remains even on a
  heavily road-facing building (real walls stay bare too).
- **New optional `box.door = { x0, x1 }`** (house only, local wall-x metres, from
  `e.info.door.x0/x1` which `buildHouseBatch` already computes): when given and the
  box isn't `kind: 'shop'`, the front wall's two strips either side of the door become
  extra low-base-weight candidates that get the same road-facing boost — so a house
  beside a road can now take a poster beside its door, never over it. A shop's front
  always stays clear (its own sign board).
- **New optional `box.kind`**: `'shop'` never considers the front wall at all (keeps
  the existing shop-board convention); anything else behaves like a house.
- **New box shape for long straight walls**: `{ segment: true, x1, z1, x2, z2, side,
  seed, density }` — places several posters spaced along the run directly (the classic
  "roadside compound wall papered in layers" surface), at full density when the run
  itself tests as road-facing via `opts.roads`, reduced (~40%) otherwise.

Measured in the QA scene (10 houses beside a road with doors, 8 shops beside a road,
2 compound-wall segments, one of them road-facing and one not, `roadFaceDist: 7`):
**52 posters placed from 20 candidate boxes, 41 of them on a wall/segment that tested
as road-facing** — i.e. almost every road-facing surface in the scene got at least one
poster, and the far, non-road segment stayed visibly sparser than the near one. See
`docs/s7/wallposters/overview.png`.

## Wiring needed (I do not own these three files — please apply)

**`src/kit/shopsPlace.js`** — `roads` is already built locally (`const roads =
makeRoadIndex(map.roads);` near the top of `buildShops`) and `kit: 'shop'` is implied
for every shop, so only two small edits:

1. Where `muralBoxes.push(...)` is built (inside `put()`), add `kind: 'shop'`:
   ```js
   muralBoxes.push({ x: rect.x, z: rect.z, ry: rect.ry, w: opts.colW ?? rect.width, d: opts.colD ?? rect.depth, seed: i, kind: 'shop' });
   ```
2. Where `buildWallMurals(muralBoxes)` is called near the bottom, pass `roads`:
   ```js
   const { mesh: muralMesh, stats: muralStats } = buildWallMurals(muralBoxes, { roads });
   ```

**`src/kit/houses.js`** — needs a road index threaded in (it isn't built here today)
and the door field added to `muralBoxes`:

1. Add the import (alongside the existing `housesPlan.js` import line):
   ```js
   import { makeRoadIndex } from './landLayout.js';
   ```
2. In `createNewMapHouses`, right after `const plan = map.plan || planHouses(map.houses, map.roads);`, add:
   ```js
   const roadIdx = makeRoadIndex(map.roads);
   ```
3. Change the `buildHouseBatch(entries, { cache })` call a few lines down to:
   ```js
   built = buildHouseBatch(entries, { cache, roads: roadIdx });
   ```
4. `buildHouseBatch`'s signature already destructures an options object — add `roads =
   null` to it:
   ```js
   export function buildHouseBatch(entries, { withFar = true, withClutter = true, nearDist = NEAR_DIST, clutterDist = CLUTTER_DIST, farDist = FAR_DIST, cache = null, roads = null } = {}) {
   ```
5. Where `muralBoxes` is built inside `buildHouseBatch`, add `kind: 'house'` and the
   door field (note: `e.info` is already set earlier in the same function, so
   `e.info.door.x0/x1` is available at this point):
   ```js
   const muralBoxes = entries.map((e, i) => ({
     x: e.x, z: e.z, y: e.y || 0, ry: e.ry,
     w: e.w ?? e.cw * (e.sx || 1), d: e.d ?? e.cd * (e.sz || 1),
     seed: i, kind: 'house',
     door: e.info?.door ? { x0: e.info.door.x0, x1: e.info.door.x1 } : undefined,
   }));
   const { mesh: muralMesh, stats: muralStats } = buildWallMurals(muralBoxes, { roads });
   ```

**`src/farmSites.js`** (candidate only — not applied, your call whether it's worth the
refactor): `createBoundaryWall(position, name, runs, gaps)` already iterates `runs` as
`{ a: {x,z}, b: {x,z} }` world-coordinate pairs with 4 m sub-segments. If you want
compound walls (school/gaushala/panchayat/farm boundary) to carry posters, the
`segment` box shape above was built exactly for this. The cleanest hookup I can see
without editing this file myself: wherever `createBoundaryWall` is called, build a
parallel array `const muralSegments = runs.map((r, i) => ({ segment: true, x1: r.a.x, z1: r.a.z, x2: r.b.x, z2: r.b.z, side: 1, seed: i, density: 1.2 }))` (flip `side` to
`-1` if posters end up on the field-facing side instead of the road-facing one — easy
to tell from one screenshot) and pass the combined array (`[...muralBoxes, ...muralSegments]`)
into whichever `buildWallMurals(..., { roads })` call already covers that site, or a new
one if none exists yet. I did not touch `farmSites.js` — this is a candidate, not a
wired change.

## Verify done

- `npm run build:unchecked` passes on this branch (same pre-existing 15 budget
  breaches as before, all from character assets, unrelated to this file).
- `node --check` / esbuild parse check on `src/kit/wallMurals.js`: clean.
- Not wired into `src/kit/houses.js` / `src/kit/shopsPlace.js` yet by me (per the brief,
  I don't own those files) — `docs/s7/signage.md`'s wiring notes already got
  `buildWallMurals(muralBoxes)` called with no options in both files, which still
  works unchanged against the new signature (backward compatible); the road-facing
  boost only activates once the integrator applies the five edits above.
- Rendered an isolated three.js QA scene (not the full game, same approach as the
  signage agent): 10 houses with doors beside a fake road, 8 shops beside the same
  road, and 2 compound-wall segments (one beside the road, one 13 m back). Screenshots:
  - `docs/s7/wallposters/overview.png` — the whole scene from above; the near
    (road-facing) segment row visibly denser/layered than the far one.
  - `docs/s7/wallposters/closeup_movies.png`, `closeup_events.png`,
    `closeup_missing_classified.png`, `closeup_house_fronts.png` — closer angles (note:
    these close-ups view some quads from behind because the QA scene has no real wall
    geometry to occlude the far side — a debug-scene artifact only; the content itself
    is proven correct below, and in the real game the building's own walls occlude the
    wrong side exactly as they do for the original 12-design signage system).
  - `docs/s7/wallposters/atlas_full.png` — **the real proof of content and both
    treatments**: every design laid out flat, no 3D involved. Confirmed by eye: every
    civic board is Hindi-bold-larger/English-smaller-same-colour; painted boards show
    no paper rect and an integrated painted border; pasted boards show a visible paper
    rectangle, drop shadow, one curled corner, a few yellowed/faded, three with a
    second poster layered underneath; no religious content anywhere; no political
    content; no recognizable faces/figures on any movie poster.
  - Script used (kept in `tmp/`, gitignored): `tmp/wallposters-test.html` +
    `tmp/wallposters-shot.mjs`. Rerun with
    `flock /tmp/s7-browser.lock node tmp/wallposters-shot.mjs` (own Vite dev server on
    port 5462) if you want to re-check after wiring the road-facing fix in.

## Not checked yet (flagging, not blocking)

- Not checked in the real running game with real wall geometry and real roads/doors —
  needs the wiring above applied first. Once wired, a real in-game screenshot of a
  lane with houses/shops beside a road would be the final proof.
- Per-instance (not per-design) rotation/faded variation for pasted posters — noted
  above as a known simplification.
