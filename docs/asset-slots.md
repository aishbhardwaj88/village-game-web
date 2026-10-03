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
| `charpai.glb` | The charpai (rope bed), house front room | 0.9 × 0.5 × 1.9 |
| `hand_pump.glb` | The hand pump, house courtyard | 0.5 × 1.4 × 0.5 |

### October Tripo-day staging slots

Six standalone test slots, lined up in open ground just south of the chowk (not any
real gameplay object's position — a side-by-side judgement lineup, see
`docs/tripo-day.md`). Each already has a correct, matte, code-built placeholder box
waiting in the chowk right now; dropping a real file in replaces it in place, exactly
like every other slot above.

| Slot (filename) | Size (w × h × d, m) | Origin | Facing |
|---|---|---|---|
| `tripo_tractor.glb` | 1.9 × 2.6 × 3.5 | Centre of footprint, ground level (`Places V1/vehicles/LAYOUT.md`'s own rule) | Nose toward -Z |
| `tripo_mother.glb` | 0.66 × 1.65 × 0.66 | Centre of footprint, ground level | Facing -Z (the engine's player/NPC forward convention) |
| `tripo_halwai_kiosk.glb` | 5.5 × 3.5 × 4.5 | Centre of footprint, ground level | Open/counter face toward -Z (this standalone judgement box uses the same universal front convention as every other slot above; the real in-game `halwai_kiosk` slot elsewhere, swapped in at its own real position, uses -X to match that building's own existing geometry) |
| `tripo_tree_neem.glb` | 3.0 × 4.5 × 3.0 | Centre of canopy footprint, trunk base at ground level | None — canopy is rotationally symmetric, any facing reads the same |
| `tripo_tree_peepal.glb` | 3.5 × 5.5 × 3.5 | Centre of canopy footprint, trunk base at ground level | None, as above |
| `tripo_bush.glb` | 1.0 × 0.9 × 1.0 | Centre of footprint, ground level | None, as above |

Heights/sizes: tractor from `Places V1/vehicles/LAYOUT.md` (the authority — never an
image); mother's 1.65m from `reference-from-unity/CHARACTER_BIBLE.md`; halwai_kiosk
from `src/village.js`'s `buildHalwai()` (same real building, matched so a future swap
at its REAL in-game position would be a drop-in too); trees/bush are a judgement call —
picked to roughly match this game's own existing procedural placeholders
(`src/trees.js`), documented here rather than measured from any reference.

## Things worth knowing

- **Orientation**: every model's local -Z is assumed to be "forward" on import — the
  same convention the player/vehicles/NPCs already use. The import pipeline zeroes
  every node's own rotation (root AND every child, at any depth — see
  `src/assetSlots.js`'s `resolveSlot()`) BEFORE applying the slot's own documented
  facing, so a model that's internally consistent (correctly modelled, just wrapped in
  some exporter's own axis-conversion rotation, at any level of the file) always comes
  in facing the right way with no edit here. What this CANNOT fix: a model whose own
  mesh data was modelled backwards to begin with (not a transform on top of correct
  geometry, but the geometry itself facing the wrong way) — there's no way to tell that
  apart from a correct model using the bounding box alone. If a dropped-in model faces
  the wrong way after all this, the model itself needs re-export, not a code change.
- **Material**: every imported model's materials are clamped on import, matching
  `docs/art-rules-characters.md` — metal (metalness ≥ 0.5 in the source) gets dulled to
  roughness 0.25–0.45 and stays reflective; glass (`transparent`/`transmission`) is left
  alone; everything else is forced to metalness 0 and roughness ≥ 0.8 (the highest of
  that doc's own per-category minimums, used as one safe universal floor rather than
  guessing whether a given submesh is skin/cloth/leather/plaster from the file alone).
  A shiny/plasticky import always comes in matte with no edit here.
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
