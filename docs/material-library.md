# Material library

**Status: NOT YET APPROVED.** The art director approves this ONCE, per material.
Once approved, the values below are frozen and every build uses them BY NAME.
No build script may define its own material values.

After approval, `art-reviewer` only checks that a surface uses a library material.
It does not judge how any material looks. That judgement was made here, once.

| Material | Status | Approved on | Her note |
|---|---|---|---|
| brick | **APPROVED** | 27 Oct 2026 | "bricks look like bricks" |
| lime plaster | **APPROVED** | 27 Oct 2026 | row 1 "still looks fine" |
| cement plaster | **APPROVED** | 27 Oct 2026 | row 1 "still looks fine" |
| concrete | **APPROVED** | 27 Oct 2026 | "concrete look like concrete" |
| tin roof | **FAILED** | 27 Oct 2026 | "tin is not looking like tin" |
| terracotta tile | **FAILED** | 27 Oct 2026 | "looking like plastic wraps" |
| painted wood | **FAILED** | 27 Oct 2026 | "looking like plastic wraps" |
| rusted steel | **FAILED** | 27 Oct 2026 | "looking like plastic wraps" |
| thatch | not yet shown | | |
| mud and dung | not yet shown | | |
| jute | not yet shown | | |
| packed earth | not yet shown | | |

## The four approved materials are FROZEN as of 27 Oct

Brick, lime plaster, cement plaster and concrete are settled. **Do not re-tune them,
do not re-review them, do not iterate them.** Use them by name everywhere. Apply them
to all 22 staged places now; that work is unblocked and does not wait for the rest.

## Why the four failed, and the fix (lead engineer's diagnosis, 27 Oct)

Brick and concrete pass because their texture carries strong built-in structure. The
four failures are **a flat colour texture stretched over a flat box with no structure
at all.** That is exactly what "plastic wrap" means. Texture tuning will not fix any
of them: **the structure has to be geometry.**

- **Tin:** the ribs are there but perfectly regular, perfectly clean, reading as a
  painted barcode. Real corrugated tin has: varying rib pitch, dents and buckles along
  the sheet, rust blooming from the bottom edge and around nail holes, visible fixing
  washers at the laps, overlapping sheet joints with a shadow line, and sheen that
  varies along the ribs rather than a uniform grey.
- **Terracotta tile:** currently one brown smear with no tile shapes. Build the tiles
  as real overlapping geometry (Mangalore pattern), each with a slight offset in
  height and rotation, moss in the channels, a few cracked or replaced-paler tiles.
- **Painted wood:** currently a green-grey smear. Needs real plank separation as
  geometry with gaps and shadow lines, grain running along the plank, paint worn
  through to bare wood at the edges and around fixings, and per-plank colour variation.
- **Rusted steel:** currently a brown blur. Needs rust that has FORM: pitting, flaking
  scale with raised edges, streaks running downward, and bare metal showing where it
  is handled or rubbed.

**Rule: if a material's real-world identity comes from its structure (tiles, planks,
corrugation, weave), that structure is MODELLED, not painted on a flat face.**

### Order
1. Apply the 4 approved materials to all 22 places immediately. Do not wait.
2. Rebuild the 4 failed ones as geometry-plus-texture, **once**, then send to her.
3. Build thatch, mud-and-dung, jute and packed earth, then send them with the others.

## How approval works

1. Render the board, one panel per material, at 2 m.
2. Send her the images. She replies per material: approved, or one line on what to change.
3. Change ONLY the materials she rejected. Re-send only those.
4. When a material is approved, record the date and her note above and freeze it.

**Never iterate a material more than once without sending it to her.** Ten internal
rounds happened on 27 Oct and none of them could converge, because no one in the loop
could certify taste. One round plus her eye settles it.
