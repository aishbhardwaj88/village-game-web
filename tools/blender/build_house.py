"""
The player's house — real Blender shell replacing src/village.js's buildHouse()
wall/roof/parapet boxes (the plinth ring, corner pilasters, and interior
furniture/floor/partition stay exactly as they are — src/buildingKit.js's
shared instanced trim is already efficient and untouched by this pass).

Dimensions copied from src/village.js (keep these two files in sync by hand):
  HOUSE_BLOCK = { w: 10, h: 6, d: 8, cx: HOUSE_CENTER.x, cz: HOUSE_CENTER.z - 3 }
  HOUSE_CENTER = { x: -48, z: 39 } -> cx=-48, cz=36
  WALL_THICKNESS = 0.22
  HOUSE_DOOR_Z = cz + d/2 = 40 (south wall), HOUSE_DOOR_WIDTH = 1.3, door height 2.2
  roof overhang 0.3, roof slab thickness 0.3 at HOUSE_ROOF_Y = h+0.15 = 6.15
  parapet: 0.8 tall, 0.2 thick, sits on the roof slab's own top surface
  PLASTER_HOUSE = PALETTE.mustard = 0xdcc488 (docs/look-standard.md's law —
  this is the established game palette colour, not the Places V1 reference
  render's blue-grey, which was a different, superseded art pass)

Axis convention (all of this file, no exceptions): X = the wall width/world
"west-east" axis, Y = the wall depth/world "south-north" axis, Z = up. The
south wall (with the real door) sits at Y=+D/2, matching HOUSE_DOOR_Z being
the block's MAX z edge in src/village.js. Every beveled_box() call below sizes
and positions things directly in this frame, with Z as the FLOOR (base), not
centre — see common.py's own doc comment.

Exported LOCAL to this building's own centre (cx, cz, floor z=0) — main.js's
asset-slot placement adds the real world position back, same convention every
Tripo slot already uses (see docs/asset-slots.md).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from common import (
    clear_scene, beveled_box, box_uv, load_pbr_material, tint_material,
    wire_vertex_ao, hex_to_linear_rgb, bake_dirty_vertex_colors, join_objects,
    export_glb, MODELS_OUT_DIR,
)
import bpy
import bmesh
import math

W, H, D = 10.0, 6.0, 8.0
WALL_T = 0.22
DOOR_W = 1.3
DOOR_H = 2.2
OVERHANG = 0.3
ROOF_T = 0.3
ROOF_FLOOR_Z = H  # roof slab's own bottom face sits right on top of the walls
PARAPET_H = 0.8
PARAPET_T = 0.2
PARAPET_FLOOR_Z = ROOF_FLOOR_Z + ROOF_T  # sits on the roof slab's own top surface

MUSTARD = hex_to_linear_rgb(0xDCC488)
CONCRETE_TINT = hex_to_linear_rgb(0xD7D2C4)
WOOD_DARK = hex_to_linear_rgb(0x3A2A1E)

clear_scene()

plaster_mat = load_pbr_material('house_plaster', 'plaster', repeat=(2, 2))
tint_material(plaster_mat, MUSTARD, strength=0.3)  # law: 0.3 for walls, docs/look-standard.md
concrete_mat = load_pbr_material('house_concrete', 'concrete', repeat=(3, 3))
tint_material(concrete_mat, CONCRETE_TINT, strength=1.0)
wood_mat = load_pbr_material('house_wood', 'wood', repeat=(1, 1))
tint_material(wood_mat, WOOD_DARK, strength=0.85)
for m in (plaster_mat, concrete_mat, wood_mat):
    wire_vertex_ao(m)

walls = []

# South wall, split either side of the door opening (real gap, not a boolean
# cut — two separate boxes read identically and avoid a boolean solver on a
# thin wall, same approach src/village.js's addGappedWall already uses).
south_seg_len = (W - DOOR_W) / 2
walls.append(beveled_box('wall_south_a', (south_seg_len, WALL_T, H), (-W / 2 + south_seg_len / 2, D / 2 - WALL_T / 2, 0), bevel_width=0.015))
walls.append(beveled_box('wall_south_b', (south_seg_len, WALL_T, H), (W / 2 - south_seg_len / 2, D / 2 - WALL_T / 2, 0), bevel_width=0.015))
walls.append(beveled_box('wall_north', (W, WALL_T, H), (0, -D / 2 + WALL_T / 2, 0), bevel_width=0.015))
walls.append(beveled_box('wall_west', (WALL_T, D, H), (-W / 2 + WALL_T / 2, 0, 0), bevel_width=0.015))
walls.append(beveled_box('wall_east', (WALL_T, D, H), (W / 2 - WALL_T / 2, 0, 0), bevel_width=0.015))

# Door reveal + frame (south wall, Y = +D/2) — a recessed dark jamb so the
# opening reads as a real gap, same visual language as
# src/buildingKit.js's addOpening.
door_frame_t = 0.1
door_y = D / 2 - WALL_T / 2  # the south wall's own centreline
jamb_l = beveled_box('door_jamb_l', (door_frame_t, WALL_T + 0.02, DOOR_H), (-DOOR_W / 2 - door_frame_t / 2, door_y, 0), bevel_width=0.008)
jamb_r = beveled_box('door_jamb_r', (door_frame_t, WALL_T + 0.02, DOOR_H), (DOOR_W / 2 + door_frame_t / 2, door_y, 0), bevel_width=0.008)
lintel = beveled_box('door_lintel', (DOOR_W + door_frame_t * 2, WALL_T + 0.02, 0.12), (0, door_y, DOOR_H), bevel_width=0.008)
reveal_h = DOOR_H - 0.12
reveal = beveled_box('door_reveal', (DOOR_W, 0.04, reveal_h), (0, door_y - WALL_T * 0.3, 0.06), bevel_width=0.002)
for o in (jamb_l, jamb_r, lintel):
    o.data.materials.append(wood_mat)
reveal.data.materials.append(wood_mat)

# Decorative side windows — v1 cut. Built and confirmed present/correctly
# positioned in the exported .glb (a direct re-import + per-material vertex
# dump proved the house_wood geometry sits exactly where the window frame/
# reveal math intends), but the in-game render still shows a flat wall with
# no visible trace of them even as a flat colour patch — a deeper three.js/
# GLTFLoader-side issue (most likely a normals/winding problem from the bevel
# op on a thin protruding box) that would need its own dedicated diagnostic
# pass to chase down. Not worth more time against the much larger remaining
# work order right now; cut for v1, keep everything else (door, bands, roof,
# parapet, chajja — all independently confirmed working). Revisit later if
# there's a spare cycle — see docs/parked.md.
window_objs = []

# Decorative trim band at lintel height (string course), south/north/east/west —
# a thin proud band, same "HOUSE_BAND, darker tint" rule as the code version.
# Top edge sits flush with the top of the door.
band_h = 0.3
band_floor_z = DOOR_H - band_h
bands = [
    beveled_box('band_south_a', (south_seg_len, WALL_T + 0.04, band_h), (-W / 2 + south_seg_len / 2, door_y, band_floor_z), bevel_width=0.01),
    beveled_box('band_south_b', (south_seg_len, WALL_T + 0.04, band_h), (W / 2 - south_seg_len / 2, door_y, band_floor_z), bevel_width=0.01),
    beveled_box('band_north', (W, WALL_T + 0.04, band_h), (0, -D / 2 + WALL_T / 2, band_floor_z), bevel_width=0.01),
    beveled_box('band_west', (WALL_T + 0.04, D, band_h), (-W / 2 + WALL_T / 2, 0, band_floor_z), bevel_width=0.01),
    beveled_box('band_east', (WALL_T + 0.04, D, band_h), (W / 2 - WALL_T / 2, 0, band_floor_z), bevel_width=0.01),
]

# Roof slab + parapet. North/south parapet walls run the FULL overhung width;
# east/west ones are extended by 2x their own thickness so all 4 pieces
# actually overlap at the corners instead of leaving a diagonal gap a real
# parapet could never have.
roof = beveled_box('roof_slab', (W + OVERHANG * 2, D + OVERHANG * 2, ROOF_T), (0, 0, ROOF_FLOOR_Z), bevel_width=0.015)
parapet_n = beveled_box('parapet_n', (W + OVERHANG * 2, PARAPET_T, PARAPET_H), (0, -D / 2 - 0.1, PARAPET_FLOOR_Z), bevel_width=0.01)
parapet_s = beveled_box('parapet_s', (W + OVERHANG * 2, PARAPET_T, PARAPET_H), (0, D / 2 + 0.1, PARAPET_FLOOR_Z), bevel_width=0.01)
parapet_w = beveled_box('parapet_w', (PARAPET_T, D + PARAPET_T * 2, PARAPET_H), (-W / 2 - 0.1, 0, PARAPET_FLOOR_Z), bevel_width=0.01)
parapet_e = beveled_box('parapet_e', (PARAPET_T, D + PARAPET_T * 2, PARAPET_H), (W / 2 - 0.1, 0, PARAPET_FLOOR_Z), bevel_width=0.01)

# A chajja (small weather-overhang slab) above the main door — a real
# architectural cue called for explicitly ("chajjas") that a plain box could
# never have.
chajja = beveled_box('chajja', (DOOR_W + 0.6, 0.5, 0.08), (0, D / 2 + 0.25 - WALL_T / 2, DOOR_H + 0.2), bevel_width=0.015)

for o in walls + [chajja]:
    o.data.materials.append(plaster_mat)
for o in bands:
    o.data.materials.append(concrete_mat)
for o in (roof, parapet_n, parapet_s, parapet_w, parapet_e):
    o.data.materials.append(concrete_mat)

all_objs = walls + [jamb_l, jamb_r, lintel, reveal] + window_objs + bands + [roof, parapet_n, parapet_s, parapet_w, parapet_e, chajja]
for o in all_objs:
    box_uv(o, (1, 1, 1))

house = join_objects(all_objs, 'house_shell')
bake_dirty_vertex_colors(house)

export_glb([house], os.path.join(MODELS_OUT_DIR, 'house_shell.glb'))
