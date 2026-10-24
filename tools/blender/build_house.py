"""
The player's house COMPOUND — the whole visible house, hand-modelled in Blender from
Places V1/house/MAIN_house_courtyard_cutaway.png (checklist: docs/house-checklist.md).

Run:  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_house.py
Then: node tools/shrink.js tmp/house_compound_raw.glb public/assets/models/house_compound.glb 999999

AUTHORED IN THE GAME'S OWN FRAME, relative to HOUSE_CENTER (src/village.js, world -48,39):
  wx = world X offset (east +), wz = world Z offset (south +, the lane side), h = height.
(common.py's wb()/limb()/cyl()... all take that frame; Blender Y = -wz so glTF Z = wz.)
Placed with an EXACT asset slot (no fit-scaling, no recentring) at HOUSE_CENTER, rotationY 0.

Fixed by the existing collision/gameplay code (do not move without editing src/village.js
+ src/collision.js together):
  block   x[-5,5] z[-7,1]  (HOUSE_BLOCK: w10 d8 centred wz=-3), wall centrelines on those
          edges, 0.22 thick; real door gap x[-0.65,0.65] in the south wall (courtyard side)
  roof    walking surface h=6.15 (HOUSE_ROOF_Y); stairs run x[-6.5,-5.3], wz 1 -> -7
  yard    x[-9,9] z[-7,7] courtyard; low walls at x=+-9 (collision exists there)
  pump (-2.5,5.5), tulsi (3,4.5), charpai (-3.4,-0.7) stay code-built

Materials are named hb_* on purpose: tools/world-validator.js samples engine materials
named plaster/wood/metal/concrete/... for its collider checks and those must keep
coming only from the (hidden) code-built collision geometry.

Why the first attempt's windows "didn't render": they were drawn INSIDE a solid wall
(never cut), so the wall hid them — not a three.js bug. Every opening below is a real
boolean cut with the frame/leaf set into the recess.
"""
import sys
import os
import math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import (
    clear_scene, beveled_box, box_uv, load_pbr_material, tint_material, wire_vertex_ao,
    hex_to_linear_rgb, bake_dirty_vertex_colors, join_objects, export_glb, boolean_cut,
    colorize, wb, limb, cyl, sphere, prism_x, prism_z, quad, make_paint_material,
    new_bmesh_obj, ROOT,
)

OUT = os.path.join(ROOT, 'tmp', 'house_compound_raw.glb')

# ----------------------------------------------------------------------------- layout
BX0, BX1 = -5.0, 5.0          # block centrelines
BZ0, BZ1 = -7.0, 1.0
WT = 0.22
S, N, E, W = BZ1 + WT / 2, BZ0 - WT / 2, BX1 + WT / 2, BX0 - WT / 2   # outer face planes
FACE = {'S': S, 'N': N, 'E': E, 'W': W}
H_WALL = 5.85                  # underside of the roof slab
H_ROOF = 6.15                  # walking surface of the roof
H_FLOOR2 = 3.2                 # upper-floor / balcony walking surface
DOOR_X = 0.65                  # half width of the real ground-floor door gap

# ----------------------------------------------------------------------------- colours
LIMEWASH = 0xC9D6DE
PLINTH = 0x5D7184
TRIM = 0xB4C1CA
WOOD = 0x3B2B24
WOOD_LIGHT = 0x5A4636
BRICK = 0xA4563A
TERRA = 0xB5693F
SOIL = 0x33261A
LEAF = [0x3F7A34, 0x4F8F3A, 0x2F6A2C, 0x5C9A40]
MARI = [0xE8891A, 0xF2B01E, 0xD9631A]
STEEL = 0xB9BDC2
BRASS = 0xB08A3E
TANK = 0x1C1C1F
CLOTH = [0xC0392B, 0x2E8B57, 0x3B5BA5, 0xE0B53A, 0xEEE6D2]
COW = 0x8A5A3C

from arch import Kit
kit = Kit(split_props=False, wood_slot='props')
add = kit.add
# sRGB multiplies baked into vertex colours (kinds: plaster/plinth/trim/wood/brick/floor, paint carries its own colour)
TINTS = {'hb_plaster': '#BCD2E6', 'hb_plinth': '#7A91AB', 'hb_trim': '#AFC4D9', 'hb_wood': '#A8875F',
         'hb_brick': '#D98A68', 'hb_floor': '#B4C6D6'}


def fb(name, face, u0, u1, d0, d1, h0, h1, bevel=0.01):
    """Box on a wall face: u along the face (wx for S/N, wz for E/W), d = depth OUTWARD from the face plane."""
    P = FACE[face]
    if face == 'S':
        return wb(name, u0, u1, P + d0, P + d1, h0, h1, bevel)
    if face == 'N':
        return wb(name, u0, u1, P - d1, P - d0, h0, h1, bevel)
    if face == 'E':
        return wb(name, P + d0, P + d1, u0, u1, h0, h1, bevel)
    return wb(name, P - d1, P - d0, u0, u1, h0, h1, bevel)


def recess(face, u0, u1, h0, h1, depth=0.1):
    return fb('cut', face, u0, u1, -depth, 0.05, h0, h1, 0)


def through(face, u0, u1, h0, h1):
    return fb('cut', face, u0, u1, -WT - 0.05, 0.05, h0, h1, 0)


# ----------------------------------------------------------------------------- facade parts
def double_door(face, u0, u1, h0, h1, depth=0.1):
    """Dark wood double door in a recess: frame, two leaves with raised panels, brass pulls."""
    ft = 0.07
    d_in = -depth + 0.01
    add('wood', fb('df_l', face, u0, u0 + ft, d_in, 0.04, h0, h1, 0.004))
    add('wood', fb('df_r', face, u1 - ft, u1, d_in, 0.04, h0, h1, 0.004))
    add('wood', fb('df_t', face, u0, u1, d_in, 0.04, h1 - ft, h1, 0.004))
    um = (u0 + u1) / 2
    for i, (a, b) in enumerate(((u0 + ft, um - 0.01), (um + 0.01, u1 - ft))):
        add('wood', fb('leaf', face, a, b, d_in, d_in + 0.05, h0, h1 - ft, 0.004))
        pw = (b - a) - 0.2
        hh = (h1 - ft - h0)
        for (p0, p1) in ((h0 + 0.12, h0 + hh * 0.42), (h0 + hh * 0.5, h1 - ft - 0.12)):
            add('wood', fb('panel', face, a + 0.1, a + 0.1 + pw, d_in + 0.05, d_in + 0.085, p0, p1, 0.004))
    for sgn in (-1, 1):
        add('paint', fb('pull', face, um + sgn * 0.07 - 0.015, um + sgn * 0.07 + 0.015, d_in + 0.05, d_in + 0.11, (h0 + h1) / 2 - 0.1, (h0 + h1) / 2 + 0.1, 0), BRASS)


def louvre_window(face, u0, u1, h0, h1, depth=0.1):
    """Recessed window with two dark louvred shutters (closed): frame + slats."""
    ft = 0.06
    d_in = -depth + 0.01
    add('wood', fb('wf_l', face, u0, u0 + ft, d_in, 0.05, h0, h1, 0.004))
    add('wood', fb('wf_r', face, u1 - ft, u1, d_in, 0.05, h0, h1, 0.004))
    add('wood', fb('wf_t', face, u0, u1, d_in, 0.05, h1 - ft, h1, 0.004))
    add('wood', fb('wf_b', face, u0 - 0.04, u1 + 0.04, d_in, 0.09, h0 - 0.05, h0 + ft - 0.02, 0.004))  # projecting sill
    um = (u0 + u1) / 2
    for a, b in ((u0 + ft, um - 0.01), (um + 0.01, u1 - ft)):
        add('wood', fb('shutter_back', face, a, b, d_in, d_in + 0.03, h0 + ft - 0.02, h1 - ft, 0))
        n = int(((h1 - ft) - (h0 + ft)) / 0.085)
        for k in range(n):
            hk = h0 + ft + 0.02 + k * 0.085
            add('wood', fb('slat', face, a + 0.02, b - 0.02, d_in + 0.03, d_in + 0.07, hk, hk + 0.05, 0))


def wall_vent(face, u, h, size=0.15):
    add('wood', fb('vent', face, u - size / 2, u + size / 2, -0.06, -0.02, h - size / 2, h + size / 2, 0))


# ----------------------------------------------------------------------------- block walls
def make_wall(name, face, cutters, u0, u1, z_or_x0, z_or_x1, h1=H_WALL):
    if face in ('S', 'N'):
        w = wb(name, u0, u1, z_or_x0, z_or_x1, 0, h1, 0.01)
    else:
        w = wb(name, z_or_x0, z_or_x1, u0, u1, 0, h1, 0.01)
    for c in cutters:
        boolean_cut(w, c, apply_mod=True)
    add('plaster', w)
    return w


def build_walls():
    # SOUTH (courtyard side, the real door) — ground: door gap, 2 closed double doors, 2 windows;
    # upper: 2 windows, 2 double doors, the open kitchen alcove.
    cs = [through('S', -DOOR_X, DOOR_X, 0, 2.25)]
    cs += [recess('S', -3.1, -1.7, 0, 2.3), recess('S', 1.7, 3.1, 0, 2.3),
           recess('S', -4.5, -3.5, 1.0, 2.2), recess('S', 3.5, 4.5, 1.0, 2.2),
           recess('S', -4.6, -3.6, 3.9, 5.1), recess('S', 3.6, 4.6, 3.9, 5.1),
           recess('S', -3.2, -1.8, H_FLOOR2, 5.4), recess('S', 1.8, 3.2, H_FLOOR2, 5.4),
           through('S', -1.1, 1.1, H_FLOOR2, 5.4)]
    vents_s = [(-4.9, 2.55), (-0.95, 2.55), (0.95, 2.55), (4.9, 2.55), (-4.9, 5.4), (4.9, 5.4)]
    for u, h in vents_s:
        cs.append(recess('S', u - 0.075, u + 0.075, h - 0.075, h + 0.075, 0.07))
    make_wall('wall_s', 'S', cs, BX0 - WT / 2, BX1 + WT / 2, BZ1 - WT / 2, BZ1 + WT / 2)
    double_door('S', -3.1, -1.7, 0, 2.3)
    double_door('S', 1.7, 3.1, 0, 2.3)
    louvre_window('S', -4.5, -3.5, 1.0, 2.2)
    louvre_window('S', 3.5, 4.5, 1.0, 2.2)
    louvre_window('S', -4.6, -3.6, 3.9, 5.1)
    louvre_window('S', 3.6, 4.6, 3.9, 5.1)
    double_door('S', -3.2, -1.8, H_FLOOR2, 5.4)
    double_door('S', 1.8, 3.2, H_FLOOR2, 5.4)
    for u, h in vents_s:
        wall_vent('S', u, h)
    # ground door: real gap — dark frame (jambs + lintel), the two leaves swung back flat against the front
    ft = 0.1
    add('wood', fb('dj_l', 'S', -DOOR_X - ft, -DOOR_X, -WT - 0.01, 0.05, 0, 2.3, 0.006))
    add('wood', fb('dj_r', 'S', DOOR_X, DOOR_X + ft, -WT - 0.01, 0.05, 0, 2.3, 0.006))
    add('wood', fb('dj_t', 'S', -DOOR_X - ft, DOOR_X + ft, -WT - 0.01, 0.05, 2.2, 2.4, 0.006))
    for sgn in (-1, 1):
        a = sgn * (DOOR_X + ft + 0.01)
        b = sgn * (DOOR_X + ft + 0.01 + 0.62)
        lo, hi = min(a, b), max(a, b)
        add('wood', fb('door_open', 'S', lo, hi, 0.05, 0.1, 0.05, 2.2, 0.004))
        for (p0, p1) in ((0.2, 0.95), (1.1, 2.0)):
            add('wood', fb('door_open_panel', 'S', lo + 0.08, hi - 0.08, 0.1, 0.13, p0, p1, 0.004))
    # NORTH — ground + upper windows
    cn = [recess('N', -3.0 - 0.5, -3.0 + 0.5, 1.0, 2.2), recess('N', 3.0 - 0.5, 3.0 + 0.5, 1.0, 2.2),
          recess('N', -0.5, 0.5, 1.0, 2.2),
          recess('N', -3.5, -2.5, 3.9, 5.1), recess('N', 2.5, 3.5, 3.9, 5.1), recess('N', -0.5, 0.5, 3.9, 5.1)]
    make_wall('wall_n', 'N', cn, BX0 - WT / 2, BX1 + WT / 2, BZ0 - WT / 2, BZ0 + WT / 2)
    for cx in (-3.0, 0.0, 3.0):
        louvre_window('N', cx - 0.5, cx + 0.5, 1.0, 2.2)
        louvre_window('N', cx - 0.5, cx + 0.5, 3.9, 5.1)
    # WEST (stair side) — upper windows only (the stairs hide the ground floor)
    cw = [recess('W', -2.9, -2.0, 3.9, 5.1), recess('W', -5.4, -4.5, 3.9, 5.1)]
    for u in (-1.0, -4.0, -6.0):
        cw.append(recess('W', u - 0.075, u + 0.075, 2.5, 2.65, 0.07))
    make_wall('wall_w', 'W', cw, BZ0 + WT / 2, BZ1 - WT / 2, BX0 - WT / 2, BX0 + WT / 2)
    louvre_window('W', -2.9, -2.0, 3.9, 5.1)
    louvre_window('W', -5.4, -4.5, 3.9, 5.1)
    # EAST (east yard side) — ground: 2 windows + a side door; upper: 2 windows + balcony door
    ce = [recess('E', -1.9, -1.0, 1.0, 2.2), recess('E', -5.9, -5.0, 1.0, 2.2), recess('E', -4.1, -2.9, 0, 2.3),
          recess('E', -1.9, -1.0, 3.9, 5.1), recess('E', -5.9, -5.0, 3.9, 5.1), recess('E', -4.1, -2.9, H_FLOOR2, 5.4)]
    make_wall('wall_e', 'E', ce, BZ0 + WT / 2, BZ1 - WT / 2, BX1 - WT / 2, BX1 + WT / 2)
    louvre_window('E', -1.9, -1.0, 1.0, 2.2)
    louvre_window('E', -5.9, -5.0, 1.0, 2.2)
    double_door('E', -4.1, -2.9, 0, 2.3)
    louvre_window('E', -1.9, -1.0, 3.9, 5.1)
    louvre_window('E', -5.9, -5.0, 3.9, 5.1)
    double_door('E', -4.1, -2.9, H_FLOOR2, 5.4)
    # corner pilasters hide the wall-to-wall seams
    for (cx, cz) in ((BX0, BZ0), (BX1, BZ0), (BX0, BZ1), (BX1, BZ1)):
        add('plaster', wb('pilaster', cx - 0.19, cx + 0.19, cz - 0.19, cz + 0.19, 0, H_WALL, 0.012))


def build_bands():
    """Plinth (darker), string course between floors, crown band, roof slab."""
    # plinth ring, broken at the door gap
    ph = 0.55
    add('plinth', wb('plinth_s_a', BX0 - 0.2, -DOOR_X - 0.1, S - 0.14, S + 0.06, 0, ph, 0.015))
    add('plinth', wb('plinth_s_b', DOOR_X + 0.1, BX1 + 0.2, S - 0.14, S + 0.06, 0, ph, 0.015))
    add('plinth', wb('plinth_n', BX0 - 0.2, BX1 + 0.2, N - 0.06, N + 0.14, 0, ph, 0.015))
    add('plinth', wb('plinth_w', W - 0.06, W + 0.14, BZ0 - 0.2, BZ1 + 0.2, 0, ph, 0.015))
    add('plinth', wb('plinth_e', E - 0.14, E + 0.06, BZ0 - 0.2, BZ1 + 0.2, 0, ph, 0.015))
    add('trim', wb('plinth_cap_s_a', BX0 - 0.21, -DOOR_X - 0.1, S - 0.15, S + 0.07, ph, ph + 0.05, 0.01))
    add('trim', wb('plinth_cap_s_b', DOOR_X + 0.1, BX1 + 0.21, S - 0.15, S + 0.07, ph, ph + 0.05, 0.01))
    # string course around the whole block at the floor line (under the balcony slab on the south)
    sc0, sc1 = 2.9, 3.25
    add('trim', wb('sc_n', BX0 - 0.2, BX1 + 0.2, N - 0.06, N + 0.1, sc0, sc1, 0.012))
    add('trim', wb('sc_w', W - 0.06, W + 0.1, BZ0 - 0.2, BZ1 + 0.2, sc0, sc1, 0.012))
    add('trim', wb('sc_e', E - 0.1, E + 0.06, BZ0 - 0.2, BZ1 + 0.2, sc0, sc1, 0.012))
    # crown band under the roof slab
    cb0, cb1 = 5.5, 5.85
    add('trim', wb('cb_s', BX0 - 0.2, BX1 + 0.2, S - 0.1, S + 0.07, cb0, cb1, 0.012))
    add('trim', wb('cb_n', BX0 - 0.2, BX1 + 0.2, N - 0.07, N + 0.1, cb0, cb1, 0.012))
    add('trim', wb('cb_w', W - 0.07, W + 0.1, BZ0 - 0.2, BZ1 + 0.2, cb0, cb1, 0.012))
    add('trim', wb('cb_e', E - 0.1, E + 0.07, BZ0 - 0.2, BZ1 + 0.2, cb0, cb1, 0.012))


# ----------------------------------------------------------------------------- balcony + alcove
def railing(x0, z0, x1, z1, h0, post_every=2.4, bal_gap=0.2):
    """Dark carved wooden railing along a straight run, in the (wx, wz) plane at floor height h0."""
    length = math.hypot(x1 - x0, z1 - z0)
    n_post = max(2, int(round(length / post_every)) + 1)
    ux, uz = (x1 - x0) / length, (z1 - z0) / length

    def pt(t, h):
        return (x0 + ux * t, z0 + uz * t, h)
    top = h0 + 0.95
    add('wood', limb('rail_top', pt(0, top), pt(length, top), 0.1, 0.075, 0.008))
    add('wood', limb('rail_mid', pt(0, h0 + 0.62), pt(length, h0 + 0.62), 0.05, 0.04))
    add('wood', limb('rail_bot', pt(0, h0 + 0.1), pt(length, h0 + 0.1), 0.08, 0.07, 0.006))
    n_bal = int(length / bal_gap)
    for i in range(1, n_bal):
        t = i * (length / n_bal)
        add('wood', limb('bal', pt(t, h0 + 0.1), pt(t, top), 0.045, 0.045))
        if i % 2 == 0:   # carved diamond block between the rails
            add('wood', limb('carve', pt(t, h0 + 0.5), pt(t, h0 + 0.74), 0.085, 0.07))
    for i in range(n_post):
        t = i * length / (n_post - 1)
        add('wood', limb('newel', pt(t, h0), pt(t, top + 0.12), 0.13, 0.13, 0.01))
        add('wood', limb('newel_cap', pt(t, top + 0.12), pt(t, top + 0.2), 0.17, 0.17, 0.01))


def build_balcony():
    # front balcony slab, cantilevered over the door + courtyard edge, with corbels
    zf = 2.7
    add('trim', wb('balc_slab', BX0 - 0.35, BX1 + 0.35, S - 0.05, zf, 3.0, H_FLOOR2, 0.015))
    add('trim', wb('balc_fascia', BX0 - 0.35, BX1 + 0.35, zf - 0.02, zf + 0.06, 2.82, 3.0, 0.012))
    for x in (-4.4, -2.2, 0.0, 2.2, 4.4):
        add('wood', limb('corbel_d', (x, S, 2.45), (x, S + 1.0, 3.0), 0.12, 0.09, 0.006))
        add('wood', limb('corbel_h', (x, S, 2.45), (x, S + 0.08, 3.0), 0.14, 0.12))
    railing(BX0 - 0.3, zf - 0.08, BX1 + 0.3, zf - 0.08, H_FLOOR2)
    railing(BX0 - 0.3, S + 0.05, BX0 - 0.3, zf - 0.08, H_FLOOR2, post_every=2.0)
    railing(BX1 + 0.3, S + 0.05, BX1 + 0.3, zf - 0.08, H_FLOOR2, post_every=2.0)
    # side balcony on the east wall over the east yard
    xf = E + 1.25
    add('trim', wb('balc_e_slab', E - 0.05, xf, BZ0 + 0.3, BZ1 - 0.3, 3.0, H_FLOOR2, 0.015))
    for z in (-5.5, -3.5, -1.5):
        add('wood', limb('corbel_e', (E, z, 2.45), (E + 1.0, z, 3.0), 0.09, 0.12, 0.006))
    railing(xf - 0.08, BZ0 + 0.3, xf - 0.08, BZ1 - 0.3, H_FLOOR2, post_every=2.0)
    railing(E + 0.05, BZ0 + 0.3, xf - 0.08, BZ0 + 0.3, H_FLOOR2, post_every=2.0)
    railing(E + 0.05, BZ1 - 0.3, xf - 0.08, BZ1 - 0.3, H_FLOOR2, post_every=2.0)


def build_kitchen_alcove():
    """The upstairs kitchen corner, seen through the open alcove in the upper south wall: a little room
    with a clay chulha and steel utensils on wall shelves (scenery, not walkable)."""
    x0, x1 = -1.1, 1.1
    zb = -1.5
    add('plaster', wb('alc_wall_l', x0 - 0.12, x0, zb, S - 0.1, H_FLOOR2, 5.4, 0))
    add('plaster', wb('alc_wall_r', x1, x1 + 0.12, zb, S - 0.1, H_FLOOR2, 5.4, 0))
    add('plaster', wb('alc_back', x0, x1, zb - 0.12, zb, H_FLOOR2, 5.4, 0))
    add('plaster', wb('alc_ceil', x0 - 0.12, x1 + 0.12, zb - 0.12, S, 5.4, 5.55, 0))
    add('floor', wb('alc_floor', x0, x1, zb, S + 0.02, 3.0, H_FLOOR2 + 0.01, 0))
    # chulha — clay stove with two pots on it, against the left wall
    add('paint', wb('chulha', -0.95, -0.2, -1.3, -0.6, H_FLOOR2, H_FLOOR2 + 0.5, 0.03), 0x9A7556)
    add('paint', cyl('chulha_hole', -0.6, -0.95, H_FLOOR2 + 0.5, H_FLOOR2 + 0.52, 0.17, 0.17, 12), 0x1E1612)
    add('paint', cyl('pot1', -0.6, -0.95, H_FLOOR2 + 0.5, H_FLOOR2 + 0.78, 0.15, 0.17, 12), STEEL)
    add('paint', sphere('pot1_lid', -0.6, -0.95, H_FLOOR2 + 0.78, 0.15, 0.15, 0.06, 1), STEEL)
    add('paint', cyl('stack', -0.78, -1.28, H_FLOOR2 + 0.5, H_FLOOR2 + 1.4, 0.05, 0.05, 8), 0x2A2420)
    # wall shelves with steel utensils on the back wall + right wall
    for k, hs in enumerate((4.15, 4.8)):
        add('wood', wb('shelf', -1.0, 1.0, zb, zb + 0.32, hs, hs + 0.05, 0.004))
        for bx in (-0.8, 0.8):
            add('wood', limb('shelf_br', (bx, zb, hs - 0.2), (bx, zb + 0.26, hs), 0.03, 0.05))
        for i in range(5):
            x = -0.85 + i * 0.4
            if (i + k) % 2 == 0:  # standing thali plate
                add('paint', sphere('thali', x, zb + 0.07, hs + 0.2, 0.17, 0.025, 0.17, 2), STEEL)  # a standing steel plate
            else:
                add('paint', cyl('lota', x, zb + 0.16, hs + 0.05, hs + 0.25, 0.08, 0.1, 10), BRASS if i % 4 else STEEL)
                add('paint', sphere('lota_n', x, zb + 0.16, hs + 0.28, 0.055, 0.055, 0.05, 1), BRASS if i % 4 else STEEL)
    add('paint', cyl('big_pot_a', 0.55, -1.0, H_FLOOR2, H_FLOOR2 + 0.55, 0.28, 0.2, 12), STEEL)
    add('paint', cyl('big_pot_b', 0.0, -1.2, H_FLOOR2, H_FLOOR2 + 0.4, 0.22, 0.17, 12), BRASS)


# ----------------------------------------------------------------------------- roof terrace
def pot(x, z, h, r=0.17, tall=0.22, flower=None, leaf=None):
    """Terracotta pot with soil + either marigolds (flower list) or a leafy plant."""
    return  # 24 Oct 2026: code-built pots removed on the art director's instruction (real scanned potted plants are instanced instead)
    add('paint', cyl('pot', x, z, h, h + tall, r * 0.72, r, 10), TERRA)
    add('paint', cyl('pot_rim', x, z, h + tall - 0.03, h + tall + 0.02, r * 1.07, r * 1.07, 10), TERRA)
    add('paint', cyl('soil', x, z, h + tall, h + tall + 0.025, r * 0.95, r * 0.95, 10), SOIL)
    base = h + tall + 0.03
    if flower:
        for i in range(5):
            a = i * 1.26
            add('paint', sphere('mari', x + 0.6 * r * math.cos(a), z + 0.6 * r * math.sin(a), base + 0.12 + 0.03 * (i % 2), r * 0.36, r * 0.36, r * 0.3, 1), flower[i % len(flower)])
        add('paint', sphere('mari_c', x, z, base + 0.2, r * 0.4, r * 0.4, r * 0.32, 1), flower[0])
        add('paint', sphere('mari_leaf', x, z, base + 0.05, r * 0.85, r * 0.85, r * 0.18, 1), LEAF[2])
    else:
        c = leaf or LEAF
        for i in range(6):
            a = i * 1.05
            add('paint', sphere('leaf', x + 0.45 * r * math.cos(a), z + 0.45 * r * math.sin(a), base + 0.18 + 0.07 * (i % 3), r * 0.55, r * 0.55, r * 0.42, 1), c[i % len(c)])
        add('paint', sphere('leaf_top', x, z, base + 0.4, r * 0.62, r * 0.62, r * 0.45, 1), c[1])


def charpai(cx, cz, h, ang, name='charpai'):
    """Rope bed: wooden frame + 4 turned legs + woven coloured top (stripes)."""
    ca, sa = math.cos(ang), math.sin(ang)

    def p(dx, dz, hh):
        return (cx + dx * ca - dz * sa, cz + dx * sa + dz * ca, hh)
    L, Wd = 1.9, 0.92
    for sx in (-1, 1):
        for sz in (-1, 1):
            add('wood', limb('leg', p(sx * Wd / 2 * 0.95, sz * L / 2 * 0.95, h), p(sx * Wd / 2 * 0.95, sz * L / 2 * 0.95, h + 0.38), 0.07, 0.07))
    add('wood', limb('rail_a', p(-Wd / 2, -L / 2, h + 0.36), p(-Wd / 2, L / 2, h + 0.36), 0.07, 0.06))
    add('wood', limb('rail_b', p(Wd / 2, -L / 2, h + 0.36), p(Wd / 2, L / 2, h + 0.36), 0.07, 0.06))
    add('wood', limb('rail_c', p(-Wd / 2, -L / 2, h + 0.36), p(Wd / 2, -L / 2, h + 0.36), 0.07, 0.06))
    add('wood', limb('rail_d', p(-Wd / 2, L / 2, h + 0.36), p(Wd / 2, L / 2, h + 0.36), 0.07, 0.06))
    n = 14
    for i in range(n):
        t0 = -L / 2 + 0.05 + i * (L - 0.1) / n
        col = CLOTH[(i // 2) % len(CLOTH)] if i % 7 else CLOTH[4]
        add('paint', limb('weave', p(-Wd / 2 + 0.04, t0 + (L - 0.1) / n / 2, h + 0.385), p(Wd / 2 - 0.04, t0 + (L - 0.1) / n / 2, h + 0.385), (L - 0.1) / n * 0.95, 0.02), col)


def build_roof():
    # slab with overhang + rounded drip edge
    add('trim', wb('roof_slab', BX0 - 0.4, BX1 + 0.4, BZ0 - 0.4, BZ1 + 0.4, H_WALL, H_ROOF, 0.02))
    # parapet, 0.8 high, with a gap in the west run where the stairs arrive
    pt = 0.2
    pz0, pz1 = BZ0 - 0.4, BZ1 + 0.4
    px0, px1 = BX0 - 0.4, BX1 + 0.4
    add('plaster', wb('par_n', px0, px1, pz0, pz0 + pt, H_ROOF, H_ROOF + 0.8, 0.012))
    add('plaster', wb('par_s', px0, px1, pz1 - pt, pz1, H_ROOF, H_ROOF + 0.8, 0.012))
    add('plaster', wb('par_e', px1 - pt, px1, pz0, pz1, H_ROOF, H_ROOF + 0.8, 0.012))
    add('plaster', wb('par_w_a', px0, px0 + pt, -5.3, pz1, H_ROOF, H_ROOF + 0.8, 0.012))
    add('plaster', wb('par_w_b', px0, px0 + pt, pz0, -7.1, H_ROOF, H_ROOF + 0.8, 0.012))
    # coping
    for nm, (a, b, c, d) in {'n': (px0 - 0.05, px1 + 0.05, pz0 - 0.05, pz0 + pt + 0.05), 's': (px0 - 0.05, px1 + 0.05, pz1 - pt - 0.05, pz1 + 0.05),
                              'e': (px1 - pt - 0.05, px1 + 0.05, pz0 - 0.05, pz1 + 0.05)}.items():
        add('trim', wb('cope_' + nm, a, b, c, d, H_ROOF + 0.8, H_ROOF + 0.88, 0.01))
    add('trim', wb('cope_w_a', px0 - 0.05, px0 + pt + 0.05, -5.3, pz1 + 0.05, H_ROOF + 0.8, H_ROOF + 0.88, 0.01))
    add('trim', wb('cope_w_b', px0 - 0.05, px0 + pt + 0.05, pz0 - 0.05, -7.1, H_ROOF + 0.8, H_ROOF + 0.88, 0.01))
    # scuppers (water spouts) through the parapet
    for x in (-3.0, 2.5):
        add('trim', wb('scupper', x - 0.12, x + 0.12, pz1 - 0.05, pz1 + 0.3, H_ROOF, H_ROOF + 0.12, 0.01))
    # stair landing (flush with the roof) + sloped stringer walls along the stairs
    add('trim', wb('landing', -6.62, -5.0, -7.5, -6.8, 5.9, H_ROOF, 0.015))
    add('plaster', prism_x('stringer_w', -6.62, -6.5, [(1.0, 0.0), (-7.5, 0.0), (-7.5, H_ROOF + 0.95), (1.0, 0.95)]))
    add('plaster', prism_x('stringer_e', -5.3, -5.11, [(1.0, 0.0), (-6.8, 0.0), (-6.8, H_ROOF), (1.0, 0.1)]))
    add('trim', prism_x('stringer_cap', -6.68, -6.44, [(1.0, 0.95), (-7.5, H_ROOF + 0.95), (-7.5, H_ROOF + 1.02), (1.0, 1.02)]))
    # mumty (stair-head room) with a door onto the terrace
    mx0, mx1, mz0, mz1, mt = -4.5, -1.9, -7.05, -4.4, 0.2
    mh = H_ROOF + 2.25
    mw = wb('mumty', mx0, mx1, mz0, mz1, H_ROOF, mh, 0.012)
    boolean_cut(mw, wb('c', -3.95, -3.1, mz1 - 0.3, mz1 + 0.1, H_ROOF, H_ROOF + 2.0, 0), apply_mod=True)
    boolean_cut(mw, wb('c', mx0 - 0.1, mx0 + 0.1, -6.2, -5.4, H_ROOF + 1.4, H_ROOF + 1.9, 0), apply_mod=True)
    add('plaster', mw)
    add('wood', wb('mumty_dl', -3.95 - 0.08, -3.95, mz1 - 0.1, mz1 + 0.04, H_ROOF, H_ROOF + 2.0, 0.004))
    add('wood', wb('mumty_dr', -3.1, -3.1 + 0.08, mz1 - 0.1, mz1 + 0.04, H_ROOF, H_ROOF + 2.0, 0.004))
    add('wood', wb('mumty_dt', -3.95 - 0.08, -3.1 + 0.08, mz1 - 0.1, mz1 + 0.04, H_ROOF + 1.92, H_ROOF + 2.05, 0.004))
    add('wood', wb('mumty_leaf', -3.93, -3.12, mz1 - 0.08, mz1 - 0.02, H_ROOF, H_ROOF + 1.95, 0.004))
    for k in range(3):
        add('wood', wb('mumty_panel', -3.8, -3.25, mz1 - 0.02, mz1 + 0.02, H_ROOF + 0.15 + k * 0.6, H_ROOF + 0.6 + k * 0.6, 0.004))
    add('trim', wb('mumty_slab', mx0 - 0.25, mx1 + 0.25, mz0 - 0.25, mz1 + 0.25, mh, mh + 0.18, 0.015))
    add('trim', wb('mumty_band', mx0 - 0.04, mx1 + 0.04, mz0 - 0.04, mz1 + 0.04, mh - 0.3, mh - 0.05, 0.01))
    # black water tank on the mumty roof (+ legs, ribs, pipe)
    tx, tz = -3.2, -5.7
    th = mh + 0.18
    for dx, dz in ((-0.4, -0.4), (0.4, -0.4), (-0.4, 0.4), (0.4, 0.4)):
        add('paint', limb('tank_leg', (tx + dx, tz + dz, th), (tx + dx, tz + dz, th + 0.25), 0.07, 0.07), 0x555555)
    add('paint', cyl('tank', tx, tz, th + 0.25, th + 1.35, 0.62, 0.62, 20), TANK)
    add('paint', sphere('tank_dome', tx, tz, th + 1.35, 0.62, 0.62, 0.22, 2), TANK)
    for hr in (0.55, 1.0):
        add('paint', cyl('tank_rib', tx, tz, th + hr, th + hr + 0.05, 0.645, 0.645, 20), 0x2A2A2E)
    add('paint', cyl('tank_cap', tx, tz, th + 1.5, th + 1.56, 0.12, 0.12, 10), 0x2A2A2E)
    add('paint', limb('tank_pipe', (tx + 0.65, tz, th + 0.4), (tx + 0.65, tz, mh), 0.05, 0.05), 0x666666)
    # TV antenna on the mumty roof
    ax, az = -2.4, -4.9
    ah = mh + 0.18
    add('paint', limb('ant_mast', (ax, az, ah), (ax, az, ah + 2.1), 0.035, 0.035), 0xB0B4B8)
    add('paint', limb('ant_boom', (ax - 0.55, az, ah + 1.75), (ax + 0.55, az, ah + 1.75), 0.025, 0.025), 0xB0B4B8)
    for k in range(6):
        xe = ax - 0.5 + k * 0.2
        ln = 0.7 - abs(k - 2.5) * 0.08
        add('paint', limb('ant_el', (xe, az - ln / 2, ah + 1.75), (xe, az + ln / 2, ah + 1.75), 0.018, 0.018), 0xC4C8CC)
    # two charpais with coloured woven tops
    charpai(0.7, -4.0, H_ROOF, 0.05)
    charpai(3.2, -5.2, H_ROOF, 0.42)
    # potted marigolds + plants along the parapets
    for i, x in enumerate((-1.4, -0.4, 0.6, 1.6, 2.6, 3.6, 4.4)):
        pot(x, BZ0 - 0.4 + pt + 0.25, H_ROOF, flower=MARI)
    for i, z in enumerate((-6.2, -5.0, -3.8, -2.6, -1.4)):
        pot(BX1 + 0.4 - pt - 0.5, z, H_ROOF, flower=MARI)
    for x in (-3.8, -2.6, -1.4, 3.0, 4.2):
        pot(x, BZ1 + 0.4 - pt - 0.25, H_ROOF, flower=MARI if int(x * 3) % 2 else None)
    # kite tied to the NE corner
    kx, kz, kh = 4.5, -7.9, 9.0
    add('paint', quad('kite_a', [(kx, kz, kh + 0.55), (kx + 0.4, kz, kh), (kx, kz, kh - 0.55), (kx - 0.4, kz, kh)]), 0xF08A24)
    add('paint', quad('kite_b', [(kx, kz + 0.002, kh + 0.55), (kx, kz + 0.002, kh), (kx - 0.4, kz + 0.002, kh)]), 0xE0392B)
    add('paint', limb('kite_stick', (kx, kz - 0.004, kh + 0.55), (kx, kz - 0.004, kh - 0.55), 0.015, 0.015), 0xD8C080)
    add('paint', limb('kite_stick2', (kx - 0.4, kz - 0.004, kh), (kx + 0.4, kz - 0.004, kh), 0.015, 0.015), 0xD8C080)
    add('paint', limb('kite_string', (kx, kz, kh - 0.55), (px1 - 0.1, pz0 + 0.1, H_ROOF + 0.9), 0.008, 0.008), 0xEEEEEE)
    for k in range(5):
        add('paint', quad('kite_tail', [(kx - 0.05, kz, kh - 0.6 - k * 0.2), (kx + 0.05, kz, kh - 0.65 - k * 0.2), (kx, kz, kh - 0.8 - k * 0.2)]), (0xE0392B, 0xF2B01E)[k % 2])


# ----------------------------------------------------------------------------- courtyard
def build_yard_walls():
    h = 1.6
    t = 0.22
    # side walls (collision exists at x=+-9, wz -7..7) and the new south wall w/ gate + north returns
    def wall_run(name, x0, x1, z0, z1):
        add('plaster', wb(name, x0, x1, z0, z1, 0, h, 0.01))
        along_x = (x1 - x0) > (z1 - z0)
        if along_x:
            add('plinth', wb(name + '_pl', x0, x1, z0 - 0.05, z1 + 0.05, 0, 0.42, 0.012))
            add('trim', wb(name + '_cope', x0 - 0.04, x1 + 0.04, z0 - 0.08, z1 + 0.08, h, h + 0.09, 0.012))
        else:
            add('plinth', wb(name + '_pl', x0 - 0.05, x1 + 0.05, z0, z1, 0, 0.42, 0.012))
            add('trim', wb(name + '_cope', x0 - 0.08, x1 + 0.08, z0 - 0.04, z1 + 0.04, h, h + 0.09, 0.012))
    wall_run('yw_w', -9.11, -8.89, -7.11, 7.0)
    wall_run('yw_e', 8.89, 9.11, -7.11, 7.0)
    SW = 6.4
    wall_run('yw_s_w', -9.11, -1.3, SW - 0.11, SW + 0.11)
    wall_run('yw_s_e', 1.3, 9.11, SW - 0.11, SW + 0.11)
    wall_run('yw_n_w', -9.11, -6.6, -7.11, -6.89)
    wall_run('yw_n_e', 5.11, 9.11, -7.11, -6.89)
    # gate: two pillars with caps, a dark wooden lintel beam, leaves swung back flat inside the wall
    for sgn in (-1, 1):
        px = sgn * 1.55
        add('plaster', wb('gate_pillar', px - 0.25, px + 0.25, SW - 0.25, SW + 0.25, 0, 2.2, 0.015))
        add('plinth', wb('gate_pillar_pl', px - 0.28, px + 0.28, SW - 0.28, SW + 0.28, 0, 0.45, 0.012))
        add('trim', wb('gate_cap', px - 0.32, px + 0.32, SW - 0.32, SW + 0.32, 2.2, 2.3, 0.015))
        add('trim', wb('gate_cap2', px - 0.22, px + 0.22, SW - 0.22, SW + 0.22, 2.3, 2.36, 0.01))
        gx0, gx1 = (1.3, 1.37) if sgn > 0 else (-1.37, -1.3)
        add('wood', wb('gate_leaf', gx0, gx1, SW - 1.45, SW - 0.12, 0.12, 1.9, 0.006))
        for hb0, hb1 in ((0.3, 0.45), (0.95, 1.1), (1.6, 1.75)):
            ox = 0.04 if sgn > 0 else -0.04
            add('wood', wb('gate_batten', gx0 + (ox if sgn > 0 else ox), gx1 + (ox if sgn > 0 else ox), SW - 1.45, SW - 0.12, hb0, hb1, 0.004))
        add('wood', wb('gate_leaf_frame', gx0, gx1, SW - 1.45, SW - 1.37, 0.12, 1.9, 0.004))
        add('paint', wb('gate_latch', gx0 - 0.03, gx1 + 0.03, SW - 1.4, SW - 1.3, 0.95, 1.05, 0), 0x2A2A2A)
    add('wood', wb('gate_lintel', -1.3, 1.3, SW - 0.14, SW + 0.14, 2.0, 2.2, 0.01))
    add('wood', wb('gate_lintel_t', -1.8, 1.8, SW - 0.2, SW + 0.2, 2.2, 2.3, 0.01))
    add('trim', wb('gate_threshold', -1.3, 1.3, SW - 0.35, SW + 0.5, 0, 0.05, 0.01))
    # pilasters on the long walls
    for z in (-3.5, 0.0, 3.5):
        add('plaster', wb('pil_w', -9.11, -8.7, z - 0.16, z + 0.16, 0, 1.78, 0.012))
        add('plaster', wb('pil_e', 8.7, 9.11, z - 0.16, z + 0.16, 0, 1.78, 0.012))
        add('trim', wb('pil_w_c', -9.17, -8.64, z - 0.2, z + 0.2, 1.78, 1.85, 0.01))
        add('trim', wb('pil_e_c', 8.64, 9.17, z - 0.2, z + 0.2, 1.78, 1.85, 0.01))
    for x in (-6.0, -3.5, 3.5, 6.0):
        add('plaster', wb('pil_s', x - 0.16, x + 0.16, SW - 0.11, SW + 0.25, 0, 1.78, 0.012))
        add('trim', wb('pil_s_c', x - 0.2, x + 0.2, SW - 0.14, SW + 0.29, 1.78, 1.85, 0.01))


def build_floor():
    add('floor', wb('yard_floor', -8.89, 8.89, -6.89, SW_FLOOR, -0.01, FLOOR_TOP, 0.0))  # above the lane/spur strips (y=0.03) that run under the compound
    add('plinth', wb('floor_edge_s', -8.89, -1.3, SW_FLOOR - 0.3, SW_FLOOR, 0.0, FLOOR_TOP + 0.005, 0.0))
    # stepping slab outside the gate, down to the lane
    add('trim', wb('gate_step', -1.4, 1.4, 6.55, 7.3, 0.0, FLOOR_TOP, 0.0))


SW_FLOOR = 6.29
FLOOR_TOP = 0.06


def build_pump_platform():
    px, pz = -2.5, 5.5
    add('trim', wb('pump_plat_lo', px - 0.75, px + 0.75, pz - 0.75, pz + 0.75, 0.0, 0.07, 0.015))
    add('plinth', wb('pump_plat_hi', px - 0.55, px + 0.55, pz - 0.55, pz + 0.55, 0.07, 0.11, 0.015))
    add('paint', cyl('pump_drain', px, pz + 0.15, 0.11, 0.115, 0.09, 0.09, 12), 0x333A40)


def build_planter():
    x0, x1, z0, z1 = 6.0, 8.0, 2.4, 4.4
    t = 0.22
    h = 0.55
    for nm, (a, b, c, d) in {'n': (x0, x1, z0, z0 + t), 's': (x0, x1, z1 - t, z1), 'w': (x0, x0 + t, z0 + t, z1 - t), 'e': (x1 - t, x1, z0 + t, z1 - t)}.items():
        add('brick', wb('planter_' + nm, a, b, c, d, 0, h, 0.012))
        add('brick', wb('planter_c' + nm, a - 0.04, b + 0.04, c - 0.04, d + 0.04, h, h + 0.06, 0.012))
    add('paint', wb('planter_soil', x0 + t, x1 - t, z0 + t, z1 - t, 0, h + 0.02, 0), SOIL)


def build_jhoola():
    cx = 7.0
    zA, zB = -2.6, -0.8
    top = 2.25
    for z in (zA, zB):
        for sx in (-1, 1):
            add('wood', limb('jh_leg', (cx + sx * 0.85, z, 0), (cx + sx * 0.06, z, top), 0.14, 0.14, 0.008))
        add('wood', limb('jh_brace', (cx - 0.45, z, 0.95), (cx + 0.45, z, 0.95), 0.07, 0.07))
    add('wood', limb('jh_beam', (cx, zA - 0.2, top), (cx, zB + 0.2, top), 0.18, 0.16, 0.01))
    for z in (zA - 0.1, zB + 0.1):
        add('wood', limb('jh_cap', (cx, z - 0.08, top - 0.02), (cx, z + 0.08, top - 0.02), 0.26, 0.24, 0.01))
    # swing seat hanging on two chains/ropes (a bit forward, mid-swing)
    sz = (zA + zB) / 2
    for dz in (-0.55, 0.55):
        add('paint', limb('jh_chain', (cx, sz + dz, top - 0.1), (cx + 0.2, sz + dz, 0.55), 0.025, 0.025), 0x888880)
    add('wood', wb('jh_seat', cx + 0.0, cx + 0.45, sz - 0.7, sz + 0.7, 0.42, 0.48, 0.012))
    add('wood', wb('jh_back', cx + 0.4, cx + 0.46, sz - 0.7, sz + 0.7, 0.48, 0.95, 0.012))
    for dz in (-0.7, 0.7):
        add('wood', wb('jh_arm', cx - 0.02, cx + 0.5, sz + dz - 0.04, sz + dz + 0.04, 0.46, 0.72, 0.008))
    add('paint', wb('jh_cushion', cx + 0.02, cx + 0.42, sz - 0.62, sz + 0.62, 0.48, 0.53, 0.01), 0xA83A2E)


def build_shed():
    x0, x1 = 5.35, 8.89
    z0, z1 = -6.89, -3.2
    add('trim', wb('shed_floor', x0 - 0.1, x1, z0, z1 + 0.1, 0, 0.12, 0.012))
    for z in (z0 + 0.1, z1 - 0.1):
        add('plaster', wb('shed_wall', x0, x1, z - 0.1, z + 0.1, 0.12, 1.1, 0.01))
        add('trim', wb('shed_wall_cap', x0 - 0.03, x1, z - 0.13, z + 0.13, 1.1, 1.16, 0.01))
    for z in (z0 + 0.1, (z0 + z1) / 2, z1 - 0.1):
        add('wood', limb('shed_post', (x0, z, 0.12), (x0, z, 2.2), 0.17, 0.17, 0.008))
    for hr in (0.55, 1.0):
        add('wood', limb('shed_bar', (x0, z0 + 0.1, hr), (x0, (z0 + z1) / 2, hr), 0.07, 0.07))
        add('wood', limb('shed_bar', (x0, (z0 + z1) / 2, hr), (x0, z1 - 0.1, hr), 0.07, 0.07))
    # sloped plank roof: high at the east wall, low over the open front; rafters underneath
    add('wood', prism_z('shed_roof', z0 - 0.15, z1 + 0.15, [(x0 - 0.35, 2.12), (x1, 2.9), (x1, 3.0), (x0 - 0.35, 2.22)]))
    for z in (z0 + 0.1, (z0 + z1) / 2, z1 - 0.1):
        add('wood', limb('rafter', (x0 - 0.3, z, 2.12), (x1, z, 2.9), 0.1, 0.1))
    for k in range(1, 6):  # plank seams on the roof surface
        z = z0 - 0.15 + k * ((z1 - z0 + 0.3) / 6)
        add('trim', limb('seam', (x0 - 0.35, z, 2.235), (x1, z, 3.012), 0.025, 0.012))
    # manger trough along the back wall + a hay pile
    add('plinth', wb('manger', x1 - 0.6, x1 - 0.1, z0 + 0.4, z1 - 0.4, 0.12, 0.5, 0.012))
    add('paint', wb('hay', x1 - 0.55, x1 - 0.15, z0 + 0.5, z1 - 0.5, 0.42, 0.56, 0.0), 0xC9A85A)
    # the cow, standing in the shed, facing the open front (-x)
    cx, cz = 7.0, -5.0
    add('paint', sphere('cow_body', cx, cz, 0.98, 0.62, 0.36, 0.34, 2), COW)
    add('paint', sphere('cow_rump', cx + 0.45, cz, 0.95, 0.4, 0.34, 0.34, 2), COW)
    add('paint', sphere('cow_chest', cx - 0.4, cz, 0.95, 0.38, 0.32, 0.34, 2), COW)
    add('paint', sphere('cow_hump', cx - 0.35, cz, 1.32, 0.2, 0.17, 0.15, 1), COW)
    add('paint', sphere('cow_patch', cx + 0.05, cz - 0.28, 1.05, 0.28, 0.1, 0.22, 1), 0xEFE8DA)
    add('paint', limb('cow_neck', (cx - 0.55, cz, 1.05), (cx - 0.95, cz, 1.0), 0.3, 0.24), COW)
    add('paint', sphere('cow_head', cx - 1.08, cz, 0.93, 0.2, 0.13, 0.13, 1), COW)
    add('paint', sphere('cow_muzzle', cx - 1.26, cz, 0.84, 0.1, 0.09, 0.08, 1), 0xD9A89A)
    for dz in (-0.14, 0.14):
        add('paint', sphere('cow_ear', cx - 1.0, cz + dz * 1.5, 1.04, 0.07, 0.07, 0.03, 1), COW)
        add('paint', limb('cow_horn', (cx - 1.02, cz + dz, 1.06), (cx - 1.05, cz + dz * 1.8, 1.24), 0.03, 0.03), 0xE8E0C8)
    for dx in (-0.5, 0.55):
        for dz in (-0.2, 0.2):
            add('paint', cyl('cow_leg', cx + dx, cz + dz, 0.12, 0.78, 0.07, 0.055, 8), COW)
            add('paint', cyl('cow_hoof', cx + dx, cz + dz, 0.12, 0.2, 0.065, 0.075, 8), 0x2A2320)
    add('paint', limb('cow_tail', (cx + 0.82, cz, 1.05), (cx + 0.9, cz + 0.05, 0.4), 0.04, 0.04), COW)
    add('paint', sphere('cow_udder', cx + 0.3, cz, 0.68, 0.12, 0.1, 0.1, 1), 0xD9A89A)


def build_greenery_and_details():
    # potted plants along the facade base, the gate and the yard edges
    for (x, z) in ((-4.55, 1.75), (-3.85, 1.75), (3.85, 1.75), (4.55, 1.75), (-1.5, 1.6), (1.5, 1.6)):
        pot(x, z, 0.0, 0.2, 0.28, flower=MARI if int(abs(x) * 10) % 2 else None)
    for (x, z) in ((-2.4, 6.0), (2.4, 6.0), (-2.3, 6.95), (2.3, 6.95), (-8.4, 5.6), (-8.4, -6.2), (8.4, 6.0)):
        pot(x, z, 0.0, 0.22, 0.32)
    # large leafy pot beside the gate (foreground of the reference)
    pot(-2.15, 6.75, 0.0, 0.3, 0.45)
    # marigold pots along the balcony rail, hanging on the outside edge
    for x in (-4.5, -3.2, -1.9, -0.6, 0.7, 2.0, 3.3, 4.6):
        pot(x, 2.5, H_FLOOR2, 0.14, 0.17, flower=MARI)
    for z in (-5.8, -4.0, -2.2, -0.6):
        pot(E + 1.1, z, H_FLOOR2, 0.13, 0.17, flower=MARI)
    # creeper vine up the SW corner of the facade, trailing along the balcony rail
    pts = [(-4.95, 1.2, 0.0), (-4.85, 1.2, 0.8), (-4.95, 1.2, 1.7), (-4.8, 1.2, 2.5), (-4.95, 1.25, 3.3), (-4.7, 2.3, 3.9)]
    for a, b in zip(pts, pts[1:]):
        add('paint', limb('vine', a, b, 0.045, 0.045), 0x4A3B25)
    import random
    rnd = random.Random(7)
    for i in range(70):
        t = rnd.random() * (len(pts) - 1)
        k = int(t)
        f = t - k
        a, b = pts[k], pts[min(k + 1, len(pts) - 1)]
        x = a[0] + (b[0] - a[0]) * f + rnd.uniform(-0.18, 0.18)
        z = a[1] + (b[1] - a[1]) * f + rnd.uniform(0.0, 0.2)
        h = a[2] + (b[2] - a[2]) * f + rnd.uniform(-0.1, 0.1)
        add('paint', sphere('vleaf', x, z, h, 0.1, 0.045, 0.075, 1), LEAF[rnd.randrange(4)])
    # stair side wall: plinth band + a few vents so the big wedge isn't a blank slab
    add('plinth', wb('stair_plinth_w', -6.7, -6.48, -7.5, 1.05, 0, 0.42, 0.01))
    for wz in (-1.5, -3.8, -6.0):
        hh = 0.95 + (1.0 - wz) * (H_ROOF / 8.0)   # follow the flight
        add('wood', wb('stair_vent', -6.66, -6.6, wz - 0.1, wz + 0.1, 0.55, 0.75, 0))
    # small brass bell on a bracket by the door, framed pictures by the doors
    add('wood', limb('bell_br', (-1.25, S, 2.4), (-1.25, S + 0.3, 2.4), 0.04, 0.04))
    add('paint', cyl('bell', -1.25, S + 0.3, 2.12, 2.36, 0.09, 0.03, 10), BRASS)
    add('paint', sphere('bell_clapper', -1.25, S + 0.3, 2.1, 0.025, 0.025, 0.025, 1), BRASS)
    for (u, h0, h1, col) in ((-1.28, 1.35, 1.8, 0xC98A3A), (1.38, 4.15, 4.6, 0x6C8FB3), (-1.42, 4.15, 4.6, 0xB75A4A)):
        add('wood', fb('pic_frame', 'S', u - 0.17, u + 0.17, 0.0, 0.05, h0, h1, 0.006))
        add('paint', fb('pic', 'S', u - 0.13, u + 0.13, 0.05, 0.06, h0 + 0.04, h1 - 0.04, 0), col)
    # step in front of the door + a washing stone beside the pump
    add('trim', wb('door_step', -1.1, 1.1, S, S + 0.55, 0.0, 0.16, 0.012))
    add('trim', wb('door_step2', -0.9, 0.9, S + 0.55, S + 0.95, 0.0, 0.08, 0.012))


# ----------------------------------------------------------------------------- rangoli decal
def make_rangoli_material(size=640):
    img = bpy.data.images.new('hb_rangoli_img', size, size, alpha=True)
    px = [0.0] * (size * size * 4)
    TAU = math.tau

    def lin(hexv):
        return hex_to_linear_rgb(hexv)
    WH, PK, OR, YE, GR, MG, DK = lin(0xF4EFE4), lin(0xD6437A), lin(0xF08A24), lin(0xF2C22E), lin(0x2E8B57), lin(0x8E2A7A), lin(0x5A1F4A)
    for j in range(size):
        y = (j + 0.5) / size * 2 - 1
        for i in range(size):
            x = (i + 0.5) / size * 2 - 1
            r = math.hypot(x, y)
            o = (j * size + i) * 4
            if r > 1.0:
                continue
            th = math.atan2(y, x)
            col = None
            a = 1.0
            # outer scalloped ring (pink/white dots)
            edge = 0.955 + 0.04 * math.cos(32 * th)
            if r > edge - 0.0 and r <= 1.0:
                col = PK if int(th / TAU * 32 + 32) % 2 == 0 else WH
            elif r > 0.86:
                col = GR if int(th / TAU * 48 + 48) % 2 == 0 else YE
                if r > 0.9 and r < 0.915:
                    col = WH
            elif r > 0.83:
                col = WH
            else:
                # 12-petal outer flower
                p1 = 0.80 * (0.72 + 0.28 * abs(math.cos(6 * th)))
                p2 = 0.56 * (0.7 + 0.3 * abs(math.cos(4 * th + 0.4)))
                p3 = 0.36 * (0.65 + 0.35 * abs(math.cos(3 * th)))
                if r < 0.07:
                    col = OR if r < 0.035 else DK
                elif r < 0.14:
                    col = YE
                elif r < p3:
                    col = MG if int(th / TAU * 6 + 6) % 2 == 0 else PK
                    if r > p3 - 0.025:
                        col = WH
                elif r < p2:
                    col = YE if int(th / TAU * 8 + 8) % 2 == 0 else OR
                    if r > p2 - 0.025:
                        col = WH
                elif r < p1:
                    col = PK if int(th / TAU * 12 + 12) % 2 == 0 else MG
                    if r > p1 - 0.03:
                        col = WH
                else:
                    col = GR if (int(th / TAU * 12 + 12 + 0.5) % 2) else YE
            if col is not None:
                px[o:o + 4] = [col[0], col[1], col[2], a]
    img.pixels.foreach_set(px)
    img.pack()
    mat = bpy.data.materials.new('hb_rangoli')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.95
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Linear'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    mat.blend_method = 'CLIP' if hasattr(mat, 'blend_method') else None
    try:
        mat.alpha_threshold = 0.5
    except Exception:
        pass
    return mat


def build_rangoli():
    rx, rz, rr = 0.5, 3.7, 1.55
    obj = quad('rangoli', [(rx - rr, rz + rr, 0.064), (rx + rr, rz + rr, 0.064), (rx + rr, rz - rr, 0.064), (rx - rr, rz - rr, 0.064)])
    # UVs: unit square mapped over the quad (decal)
    bpy.context.view_layer.objects.active = obj
    uv = obj.data.uv_layers.new(name='UVMap')
    # wz grows with -Y in Blender; quad order above is (-,-) (+,-) (+,+) (-,+) in (wx,wz)
    for loop, (u, v) in zip(obj.data.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[loop.index].uv = (u, v)
    obj.data.materials.append(make_rangoli_material())
    return obj



# ----------------------------------------------------------------------------- west wing (encloses the aangan)
WX0, WX1 = -9.11, -6.8        # wing footprint x (west yard wall line .. just clear of the stair stringer)
WZ0, WZ1 = -7.0, 4.6
W_H = 3.05                    # slab underside; single storey


def build_west_wing():
    """Single-storey rooms along the west edge of the yard (review 1: the courtyard must be enclosed by rooms on
    2-3 sides, U plan). Doors/windows face EAST into the aangan. Collision: village.js 'west wing' solid."""
    old = FACE['E']
    FACE['E'] = WX1
    doors = [(-5.8, -4.6), (-1.7, -0.5), (2.2, 3.4)]
    wins = [(-3.9, -2.9), (0.3, 1.3), (-6.7, -6.1)]
    cs = [recess('E', a, b, 0, 2.3) for a, b in doors] + [recess('E', a, b, 1.0, 2.2) for a, b in wins]
    for u in (-4.2, -0.6, 1.7, 3.9):
        cs.append(recess('E', u - 0.075, u + 0.075, 2.55, 2.7, 0.07))
    make_wall('wing_mass', 'E', cs, WZ0, WZ1, WX0, WX1, h1=W_H)
    for a, b in doors:
        double_door('E', a, b, 0, 2.3)
    for a, b in wins:
        louvre_window('E', a, b, 1.0, 2.2)
    for u in (-4.2, -0.6, 1.7, 3.9):
        wall_vent('E', u, 2.62)
    # plinth, string course, roof slab, parapet + coping
    add('plinth', wb('wing_plinth', WX1 - 0.04, WX1 + 0.06, WZ0, WZ1, 0, 0.5, 0.012))
    add('trim', wb('wing_plinth_cap', WX1 - 0.05, WX1 + 0.07, WZ0, WZ1, 0.5, 0.55, 0.01))
    add('trim', wb('wing_sc', WX1 - 0.04, WX1 + 0.06, WZ0, WZ1, 2.75, 2.95, 0.01))
    add('trim', wb('wing_slab', WX0 - 0.15, WX1 + 0.2, WZ0 - 0.15, WZ1 + 0.15, W_H, W_H + 0.15, 0.015))
    pt = 0.18
    add('plaster', wb('wing_par_e', WX1 + 0.2 - pt, WX1 + 0.2, WZ0 - 0.15, WZ1 + 0.15, W_H + 0.15, W_H + 0.7, 0.01))
    add('plaster', wb('wing_par_w', WX0 - 0.15, WX0 - 0.15 + pt, WZ0 - 0.15, WZ1 + 0.15, W_H + 0.15, W_H + 0.7, 0.01))
    add('plaster', wb('wing_par_s', WX0 - 0.15, WX1 + 0.2, WZ1 + 0.15 - pt, WZ1 + 0.15, W_H + 0.15, W_H + 0.7, 0.01))
    add('plaster', wb('wing_par_n', WX0 - 0.15, WX1 + 0.2, WZ0 - 0.15, WZ0 - 0.15 + pt, W_H + 0.15, W_H + 0.7, 0.01))
    add('trim', wb('wing_cope', WX0 - 0.2, WX1 + 0.25, WZ0 - 0.2, WZ1 + 0.2, W_H + 0.7, W_H + 0.77, 0.01))
    # chajja (sun-shade slab) over each door on little wood corbels
    for a, b in doors:
        add('trim', wb('chajja', WX1 - 0.02, WX1 + 0.75, a - 0.2, b + 0.2, 2.45, 2.53, 0.01))
        for u in (a - 0.12, b + 0.12):
            add('wood', limb('chajja_br', (WX1, u, 2.1), (WX1 + 0.65, u, 2.45), 0.06, 0.05))
    # a verandah-edge step and marigold pots + a leafy plant in front
    add('trim', wb('wing_step', WX1, WX1 + 0.45, WZ0 + 0.1, WZ1 - 0.1, 0, 0.08, 0.01))
    for i, (a, b) in enumerate(doors):
        pot(WX1 + 0.85, (a + b) / 2 + 0.75, 0.0, 0.2, 0.28, flower=MARI if i != 1 else None)
    pot(WX1 + 0.85, -6.3, 0.0, 0.22, 0.32)
    # roof terrace of the wing: pots + a drying-cloth line
    for z in (-6.0, -4.5, -3.0, 0.0, 2.0, 3.8):
        pot(WX1 - 0.25, z, W_H + 0.15, 0.13, 0.17, flower=MARI)
    for k, z in enumerate((-2.2, -1.0, 0.2)):
        pass
    for z in (-6.2, 3.8):
        add('wood', limb('line_post', (WX0 + 0.8, z, W_H + 0.15), (WX0 + 0.8, z, W_H + 1.5), 0.06, 0.06))
    add('paint', limb('line', (WX0 + 0.8, -6.2, W_H + 1.45), (WX0 + 0.8, 3.8, W_H + 1.35), 0.012, 0.012), 0xDDDDDD)
    for k, z in enumerate((-4.6, -2.8, -1.0, 0.8)):
        add('paint', quad('cloth', [(WX0 + 0.78, z - 0.3, W_H + 1.38), (WX0 + 0.78, z + 0.3, W_H + 1.38), (WX0 + 0.78, z + 0.25, W_H + 0.75), (WX0 + 0.78, z - 0.25, W_H + 0.75)]), CLOTH[k % 4])
    # creeper up the wing's south end
    import random
    rnd = random.Random(11)
    pts = [(WX1 + 0.05, 4.45, 0.0), (WX1 + 0.1, 4.4, 1.0), (WX1 + 0.05, 4.3, 2.0), (WX1 + 0.1, 4.0, 2.9)]
    for a, b in zip(pts, pts[1:]):
        add('paint', limb('wvine', a, b, 0.04, 0.04), 0x4A3B25)
    for i in range(45):
        t = rnd.random() * (len(pts) - 1)
        k = int(t)
        f = t - k
        a, b = pts[k], pts[min(k + 1, len(pts) - 1)]
        add('paint', sphere('wvleaf', a[0] + (b[0] - a[0]) * f + rnd.uniform(0, 0.15), a[1] + (b[1] - a[1]) * f + rnd.uniform(-0.25, 0.1), a[2] + (b[2] - a[2]) * f + rnd.uniform(-0.1, 0.1), 0.1, 0.045, 0.075, 1), LEAF[rnd.randrange(4)])
    FACE['E'] = old


# ----------------------------------------------------------------------------- run
build_walls()
build_bands()
build_balcony()
build_kitchen_alcove()
build_roof()
build_yard_walls()
build_floor()
build_pump_platform()
build_planter()
build_jhoola()
build_shed()
build_west_wing()
build_greenery_and_details()
rangoli = build_rangoli()

kit.extra.append(rangoli)
kit.finalize(OUT, TINTS, drift_amp=0.05, ao_strength=0.5)
