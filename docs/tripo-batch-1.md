# Tripo batch 1 — first judgement batch (prep only, nothing generated yet)

Written after the people decision (docs/NEEDS_YOU.md: **TRIPO**, 2026-10-21). Every
reference image below has already been cropped into the exact view files
`tools/tripo_batch.py` reads; the script itself has been fixed to actually work for
this project (see "Script fixes" below) and verified with `--dry-run` — a real mode,
not a manual trace: it prints exactly what would be uploaded and the estimated credit
cost, and makes **zero network calls**, for **zero credits**, with **no key required**.

**Nothing in this file has been run for real.** `tools/tripo_batch.py` refuses to make
any real API call while `.env`'s `TRIPO_API_KEY` is empty or still looks like a
placeholder (see `is_probably_real_key()`) — confirmed by trying a real (non-dry-run)
call against the current fake test key, which it correctly refused.

## The 9 items

| # | Slot name | Output file | Reference image(s) used | Views | Rig? | Credits |
|---|---|---|---|---|---|---|
| 1 | `tractor` | `tractor.glb` | `Places V1/vehicles/tractor/MAIN_tractor_family_orthos.png` (2×2 ortho grid, cropped into 4) | front, left, back, right | no | 30 |
| 2 | `trolley` | `trolley.glb` | `MAIN_trolley_orthos.png` (back/left/right) + `MAIN_trolley_views.png` left panel (front/drawbar) | front, left, back, right | no | 30 |
| 3 | `cart` | `cart.glb` | `Places V1/vehicles/bullock_cart/MAIN_cart_only_views.png` (2 panels, cropped) — the platform+wheels only, **no bullocks** | front, back | no | 30 |
| 4 | `bullock` | `bullock.glb` | `Places V1/vehicles/bullock_cart/MAIN_bullock_cart_views.png`, one ox cropped out of each panel (used twice in-game per `docs/asset-slots.md`) | front, back | no | 30 |
| 5 | `maa` | `maa.glb` | `Characters V1/people/_real/mother_real.png` — clean full-body front, neutral A-pose, empty hands | front only (single-image equivalent) | yes | 30 + 25 |
| 6 | `dada` | `dada.glb` | `Characters V1/people/family1/family1_grandfather.jpg` — only reference available (front only) | front only (single-image equivalent) | yes | 30 + 25 |
| 7 | `postman` | `postman.glb` | `Characters V1/people/villagers/3d_inputs_v2_tucked/` — already had a real 4-view set prepared in an earlier session | front, left, back, right | yes | 30 + 25 |
| 8 | `halwai_kiosk` | `halwai_kiosk.glb` | `Places V1/halwai/MAIN_halwai_elevations.png` (2×2 labelled grid, cropped) | front, left (side-from-left), back | no | 30 |
| 9 | `bike` | `bike.glb` | `Characters V1/props/postman_cycle.png` — two bikes side by side in one sheet, cropped into two separate views | front, left (two renders of the same bicycle, not a true front/side pair, but the best this sheet gives) | no | 30 |

**Total: 345 credits = $3.45 (about Rs. 294 at 1 USD = 85.14 INR).** Confirmed by
`tools/tripo_batch.py --dry-run` itself, not hand math — see "Dry-run output" below.

Settings used for every item: `--texstd` (standard texture quality, the cheaper
30-credit tier — this is a judgement batch, not final production texture quality),
no `--ultra` (standard geometry — polycount is reduced locally for free regardless,
per the script's own existing comments). `--rig` only for the 3 people (maa/dada/
postman); rig-check itself is free either way, full auto-rig is +25 credits and is
only actually charged if the model turns out riggable.

## Why Maa used `mother_real.png`, not `family1_mother.png`

`Characters V1/people/family1/family1_mother.png` has a cleaner front+back pair, but
the back half shows her with one arm raised (shielding her eyes) and holding a metal
pot — a different pose than the front, and a prop in hand. Mixing inconsistent poses
across multiview inputs confuses the reconstruction, and `docs/art-rules-characters.md`
is explicit that reference images must show "a clean A-pose with EMPTY HANDS (props are
separate models)". `mother_real.png` is the clean single reference that actually
matches that rule, so Maa is a single-image generation, not multiview.

## The bicycle reference, resolved (2026-10-20)

`Places V1/vehicles/bike/` was empty — flagged as a gap in `docs/NEEDS_YOU.md`. The
art director's answer: it wasn't actually missing, `Characters V1/props/
postman_cycle.png` is a real bicycle reference. Checked `Characters V1/props/
milkman_bike.png` too, which the same answer suggested as a second view — but it's
actually a **motorcycle** (engine, exhaust, headlamp), not a pedal bicycle, and this
game's bike preset (`src/vehicles.js` — no engine, 2.0×0.7×1.1m) is a plain cycle.
Mixing a motorcycle image into a bicycle's multiview set would confuse the
reconstruction, so it was **not** used — `postman_cycle.png` already shows two
separate renders of the same bicycle in one sheet, cropped into
`Places V1/vehicles/bike/3d_inputs/bike_{front,left}.png`, which is enough on its own.

## Script fixes made to `tools/tripo_batch.py`

It was written with three real bugs that would have broken this batch (not just
housekeeping — these would have silently failed or written to the wrong place):

1. **Output path.** Pointed at `VillageGame/Assets/Characters3D/` — a Unity-style path
   that doesn't exist anywhere in this repo (this is village-game-web, not the
   separate Unity project — CLAUDE.md: never touch that project from here, and this
   wasn't even its real name). Fixed to `public/assets/models/<slot>.glb`, the actual
   path `src/assetSlots.js`'s swap pipeline reads.
2. **Input discovery.** `find_inputs()` only ever searched `Characters V1` — every
   vehicle/building reference lives under `Places V1` instead and would never have
   been found. Also required a `_front.png` specifically to exist, which the trolley's
   own reference set doesn't have (3 solid 3/4-angle views, no clean front-on shot).
   Both fixed.
3. **Filename mismatch.** `slug()` stripped underscores, turning `halwai_kiosk` into
   `halwaikiosk` — but `assetSlots.js` resolves a slot from exactly `${slot.name}.glb`,
   underscore and all, so the real output would never have been found by the game.
   Fixed to keep underscores.

Also added: a real `--dry-run` flag (prints the exact upload/request plan and credit
estimate, zero network calls — the one `call()` function every single API interaction
funnels through refuses outright if `--dry-run` is set, as a hard backstop) and
`is_probably_real_key()`, which refuses to run for real against a key that's too short
or still looks like a placeholder — the actual code-level guarantee behind "zero Tripo
API calls until a real key exists," not just a promise to remember.

## Dry-run output (captured verbatim, 2026-10-20 — zero credits spent, zero network calls)

```
$ python3 tools/tripo_batch.py tractor trolley cart bullock halwai_kiosk bike --texstd --dry-run
--dry-run: no network calls will be made, no credits will be spent, no key is required.
...
=== DRY RUN TOTAL: 180 credits across 6 item(s) ===

$ python3 tools/tripo_batch.py maa dada postman --texstd --rig --dry-run
--dry-run: no network calls will be made, no credits will be spent, no key is required.
...
=== DRY RUN TOTAL: 165 credits across 3 item(s) ===
```

180 + 165 = **345 credits total**, under the 400-credit cap.

## Running it for real, once a real key exists

Two separate commands (rigging only makes sense for the 3 people):

```
python3 tools/tripo_batch.py tractor trolley cart bullock halwai_kiosk bike --texstd
python3 tools/tripo_batch.py maa dada postman --texstd --rig
```

Each `.glb` lands directly in `public/assets/models/<slot>.glb` — the asset-slot
system picks it up automatically on the next reload, hiding its code-built
placeholder, no other wiring needed. After that: run `node tools/shrink.js` on each
new model (budget check), confirm `npm run check-budget` and `npm run build` still
pass, screenshot each one in a standalone lineup and in real gameplay, LOOK at every
one against its reference image and `reference-from-unity/docs/art-direction.md`
before trusting it, then ask YES/NO on the dashboard before generating anything
further (per the standing instruction — never batch 2 without an explicit yes).
