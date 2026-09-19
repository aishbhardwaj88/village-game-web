# Asset slots — dropping a finished model in

This is the plain-language version of `src/assetSlots.js`. If you (or Tripo) have a
finished `.glb` for something in the game, here's exactly what to do.

## The short version

1. Name the file exactly as shown in the table below (e.g. `tractor.glb`).
2. Put it in `public/assets/models/`.
3. Reload the game. That's it — nothing else to edit.

The model is automatically scaled to fit the real-world size the placeholder was
built to, grounded so it sits flush on the floor, centred, and placed exactly where
the placeholder was (including on anything moving, like a driving vehicle). The
placeholder itself is hidden, not deleted — if the file is missing, broken, or fails
to load for any reason, the placeholder just stays visible and the game keeps working
exactly as it does today.

## Slot names and sizes

| Slot (filename) | What it replaces | Target size (w × h × d, metres) |
|---|---|---|
| `tractor.glb` | The whole tractor, including wheels | 1.9 × 2.6 × 3.5 |
| `trolley.glb` | The whole trolley | 2.0 × 1.5 × 3.5 |
| `cart.glb` | The bullock cart's platform + wheels (not the bullocks — see below) | 1.6 × 1.5 × 3.0 |
| `bullock.glb` | One bullock — used twice, once per animal | 0.6 × 1.6 × 2.2 |
| `bike.glb` | The bicycle | 0.7 × 1.1 × 2.0 |
| `halwai_kiosk.glb` | The halwai's whole stall building | 5.5 × 3.5 × 4.5 |
| `player.glb` | The player character | 0.7 × 2.0 × 0.7 |
| `maa.glb` | Maa | 0.66 × 1.8 × 0.66 |
| `halwai.glb` | The halwai | 0.66 × 1.8 × 0.66 |
| `teacher.glb` | The teacher | 0.66 × 1.8 × 0.66 |
| `sister.glb` | The sister | 0.66 × 1.8 × 0.66 |
| `charpai.glb` | The charpai (rope bed) | registered once item 3 builds its placeholder — see `docs/parked.md` |
| `hand_pump.glb` | The hand pump | registered once item 3 builds its placeholder — see `docs/parked.md` |

## Things worth knowing

- **Orientation**: the model's own local "forward" is whatever the source file
  exported as +Z (or whatever your modelling tool's default was). If it faces the
  wrong way in-game, the fix today is a one-line `rotationOffset` in the slot's
  registration in `src/main.js` — ask, or search `main.js` for `assetSlots.register`.
- **Scale**: the model is scaled *uniformly* (never stretched on one axis) to fit
  inside the target box above — so if it's proportioned very differently from the
  placeholder, it'll end up smaller than the target on one or two axes rather than
  distorted. If that reads wrong, adjust the model's own proportions rather than the
  slot's target size, so the "size" column stays a true real-world measurement.
- **Animation**: swapping in a model replaces the *visual* placeholder only. Things
  like wheel roll, steering, body pitch/roll/sway, and the bullocks' leg-swing are
  driven by the placeholder's own rig and are not preserved for a swapped-in static
  model — the vehicle/character still moves, turns, and mounts/dismounts correctly,
  it just won't have that extra animated detail unless a future pass rigs it.
- **The pipeline itself never needs touching to add a new slot's model** — only to
  *add a brand new slot* (a replaceable object that doesn't exist yet), which does
  need one `assetSlots.register(...)` call in `src/main.js`.
- **Test slot**: `ceramic_pot.glb` (already in `public/assets/models/`) is wired to a
  bright magenta test box near the house courtyard, purely to prove the pipeline
  works end to end — safe to ignore, or repurpose for testing a new slot.

## How it works (for the next session touching this)

`src/assetSlots.js`'s `createAssetSlotRegistry()` returns `{register, resolveAll}`.
`main.js` calls `register(name, {dimensions, hide, placements})` once per slot, right
after every placeholder already exists (vehicles, NPCs, the halwai building) — reading
only their already-public handles (`vehicle.group`/`.bodyPivot`/`.wheels`, `npc`/
`.userData.mesh`, etc.), so `src/vehicles.js` itself is never touched (this queue's
"do not rebuild vehicle geometry" instruction). Then `resolveAll()` runs once,
fire-and-forget (same pattern as the existing HDRI/signboard loads) — for each slot it
does a `HEAD` request for `public/assets/models/<slot>.glb`, and only actually loads it
if that comes back as a real file (a Vite dev-server quirk: a *missing* file under the
app's base path 200s back `index.html`, not a 404 — `urlExists()` checks the response's
`content-type` isn't `text/html` to tell the difference; see `docs/parked.md`).
