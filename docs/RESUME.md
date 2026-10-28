# PAUSED 28 Oct 2026 by Aishwarya. Resume in 3-4 days.

She needed her weekly usage limit for something else. `tmp/STOP` is set, so the
autopilot loop ends after its current run and will not start another.

## To restart
1. Delete `tmp/STOP`
2. Double-click `Dopahar autopilot.command`
3. The loop reads `docs/AUTOPILOT.md`, which points at `docs/PARALLEL.md`

## Exactly where it stands

### Materials: her verdict is in, 28 Oct
APPROVED AND FROZEN, never touch again:
- terracotta, painted wood, rusted steel, packed earth

REJECTED, in rework:
- **tin** (failed twice) - Claude rebuilt it with REAL corrugation geometry on the
  cloud machine, `tools/blender/build_tin_panel.py`, 2,340 tris, 76mm pitch, 18mm
  depth, screws on crowns, rust tears. NOT yet rendered convincingly, NOT yet wired
  into the board or the game. The front render was framed too close to show the wavy
  eave silhouette, which is the whole point of the fix. Re-render at a grazing angle
  with the sheet edge in frame before showing her.
- **thatch** - too dark, nearly black. Needs pale straw gold and a shaggy alpha-cutout
  silhouette.
- **mud and dung** - too smooth. Needs displaced surface, hand-smear arcs, straw flecks.
- **jute** - no weave depth. Needs real warp/weft geometry.

The shared cause, stated so it is not relearned: `build_material_board.py` builds every
panel as a flat box with a texture (`kit.add(kind, wb(...slab...))`). A picture of a
ridge is not a ridge. **Structure must be modelled, not painted.**

### Done since the 28 Oct restart
- Gaushala compound to 75%, primary school re-squeezed
- Second street-lamp and gobar-stack variants wired so rows do not read as copies
- Gobar wall patches on the tubewell kothri, classroom matka, day-prop lanterns
- Collision clean: 4,764 static solids, 122 NPC legs, 0 failures

### The map is being replaced
She drew a new village plan on 28 Oct and is revising it with a separate chat.
**Do no layout, lane, road or position work until she hands over the final map.**
Her stated goals for it: a much larger central square with the chaupal and peepal on
it, every building fronting a lane, back-to-back house rows and perimeter blocks so
back elevations are rarely seen, compound walls where a back must face a street.

### Guard against the old failure
`tools/watchdog.sh` runs before every cycle. It counts commits touching files outside
`docs/`, and after two empty 3-hour windows it injects a stall banner at the TOP of
`docs/AUTOPILOT.md`. The 27-28 Oct stall ran 21 hours because an order was added at
line 52 of a file whose line 3 said to ignore everything below. Put new orders at the
TOP.
