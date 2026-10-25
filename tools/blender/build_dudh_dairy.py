"""
Dudh dairy + stable - built with arch.py's Kit to Places V1/dudh_dairy/LAYOUT.md (V2) and the approved
MAIN_dudh_dairy_back_top.png (TOP = layout authority) / MAIN_dudh_dairy_front_isometric.png / MAIN_dudh_dairy_sides.png.

Run:  tools/blender/make.sh dudh_dairy dudh_dairy_v2

Frame: site-local metres, +x east, +z south (front, toward the lane). Bare earth patch 18 x 12 m: x[-9,9] z[-6,6].
  LEFT-BACK   shop 7 wide x 5 deep, 4 m tall, white lime-wash, light-blue base band + roof lines, black tank on the flat roof; front FULLY
              open (roller shutter rolled up) with a full-width white-tile counter; blank cream board above the opening (text painted in-game);
              back wall = one wooden door + one barred window; the slogan band on the LEFT (lane-facing) side wall with a cow-and-calf picture.
  RIGHT-BACK  stable 6 x 4 m: wooden posts, thick thatch roof, cement feeding trough, tethering pegs/rings, straw bed.
  YARD        two benches + farmers' cans in front of the shop, chaff cutter with a big flywheel and a fodder pile, hand pump over a cement tub,
              dung cakes drying on a low mud wall + a dung stack, a charpai, clay pots, a bucket.
Cow and buffalo are capsule placeholders / hers; green fodder is organic (not built). Drawing notes are not built.
"""
import sys
import os
import math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, join_objects, quad, ROOT
from arch import Kit, lathe, clay_pot, decal_material, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'dudh_dairy_v2_raw.glb')
kit = Kit(split_props=False, own=('metal', 'thatch'), wood_slot='props')

BLUE = 0x8FBBD6
WHITE = 0xF4F1EA
TILE = 0xEFEFEA
CEMENT = 0xA9A69F
SH_X0, SH_X1, SH_Z0, SH_Z1 = -8.5, -1.5, -5.5, -0.5   # shop footprint 7 x 5
SH_H = 3.6                                              # wall height; roof slab to 3.85, parapet to 4.0
T = 0.25


def add(kind, o, c=None):
    kit.add(kind, o, c)
    return o


def steel(o, c=STEEL):
    return add('metal', o, c)


# ---------------------------------------------------------------------------------------------- decal: cow + calf picture
def cow_picture(u, v):
    x, y = u * 1.1, v * 0.8
    if x < 0.04 or x > 1.06 or y < 0.04 or y > 0.76:
        return (0.25, 0.1, 0.07, 1.0)
    def L(h):
        return tuple(((c / 255.0) ** 2.2) for c in ((h >> 16) & 255, (h >> 8) & 255, h & 255)) + (1.0,)
    def el(cx, cy, rx, ry):
        return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0
    if y < 0.2:
        return L(0x4F8F3A)
    for (ox, sc, body) in ((0.32, 1.0, 0xF4EFE4), (0.78, 0.55, 0xC98A4E)):
        px, py = (x - ox) / sc, (y - 0.15) / sc
        if el(ox + 0.0 * 0, 0, 1, 1) and False:
            pass
        if (px - 0.2) ** 2 / 0.2 ** 2 + (py - 0.2) ** 2 / 0.1 ** 2 <= 1.0:
            return L(0xB8793F) if (px - 0.12) ** 2 + (py - 0.22) ** 2 < 0.004 else L(body)
        if (px - 0.42) ** 2 / 0.06 ** 2 + (py - 0.27) ** 2 / 0.055 ** 2 <= 1.0:
            return L(body)
        if (0.05 < px < 0.09 or 0.13 < px < 0.17 or 0.26 < px < 0.3 or 0.34 < px < 0.38) and 0.0 < py < 0.15:
            return L(body)
        if 0.395 < px < 0.405 and 0.31 < py < 0.36:
            return L(0x6B4A2A)
    if el(0.95, 0.62, 0.07, 0.07):
        return L(0xF2B01E)
    return L(0xBFE0EC)


dmat = decal_material('hb_decal', (256, 192), cow_picture)


def wall_decal_W(x, z0, z1, h0, h1):
    """Picture on the outward (-x) face of the left wall."""
    o = quad('picture', [(x, z0, h0), (x, z1, h0), (x, z1, h1), (x, z0, h1)])
    uvl = o.data.uv_layers.new(name='UVMap')
    me = o.data
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uvl.data[loop.index].uv = ((-co.y - z0) / (z1 - z0), (co.z - h0) / (h1 - h0))
    me.materials.append(dmat)
    kit.extra.append(o)


# ---------------------------------------------------------------------------------------------- ground
def build_ground():
    add('paint', wb('patch', -9.0, 9.0, -6.0, 6.0, -0.08, 0.04, 0.0), 0xA8885F)
    add('paint', wb('patch_worn', -9.0, 4.0, 1.0, 5.6, 0.04, 0.046, 0.0), 0x96774F)       # trodden forecourt
    add('paint', wb('patch_dark', 3.0, 9.0, -5.8, -1.6, 0.04, 0.046, 0.0), 0x7E6448)      # trampled stable floor
    add('trim', wb('step_pad', -6.2, -2.2, -0.5, 0.45, 0, 0.1, 0.01), CEMENT)           # cement apron under the counter


# ---------------------------------------------------------------------------------------------- shop
def build_shop():
    wall_h = SH_H
    # back wall with a wooden door (left) and a barred window (right)
    ops = [(SH_X0 + 1.0, SH_X0 + 2.1, 0, 2.3), (SH_X1 - 2.4, SH_X1 - 1.2, 1.2, 2.4)]
    cur = SH_X0
    z0, z1 = SH_Z0, SH_Z0 + T
    for a, b, lo, hi in ops:
        add('plaster', wb('bw', cur, a, z0, z1, 0, wall_h, 0.0), WHITE)
        if lo > 0:
            add('plaster', wb('bw_sill', a, b, z0, z1, 0, lo, 0.0), WHITE)
        add('plaster', wb('bw_lin', a, b, z0, z1, hi, wall_h, 0.0), WHITE)
        cur = b
    add('plaster', wb('bw', cur, SH_X1, z0, z1, 0, wall_h, 0.0), WHITE)
    # door: frame + weathered plank leaf + handle; window: frame + bars
    a, b, lo, hi = ops[0]
    for xx0, xx1, y0, y1 in ((a, a + 0.08, 0, hi), (b - 0.08, b, 0, hi), (a, b, hi - 0.08, hi)):
        add('wood', wb('df', xx0, xx1, z0 - 0.02, z1 + 0.02, y0, y1, 0.0))
    add('wood', wb('leaf', a + 0.08, b - 0.08, z0 + 0.06, z0 + 0.14, 0, hi - 0.08, 0.003))
    for k in range(5):
        add('wood', wb('plank', a + 0.08 + k * 0.188, a + 0.08 + k * 0.188 + 0.01, z0 + 0.14, z0 + 0.16, 0.05, hi - 0.1, 0.0))
    add('paint', wb('handle', b - 0.25, b - 0.2, z0 + 0.14, z0 + 0.22, 1.0, 1.2, 0.0), BRASS)
    a, b, lo, hi = ops[1]
    for xx0, xx1, y0, y1 in ((a, a + 0.07, lo, hi), (b - 0.07, b, lo, hi), (a, b, hi - 0.07, hi), (a, b, lo, lo + 0.07)):
        add('wood', wb('wf', xx0, xx1, z0 - 0.02, z1 + 0.02, y0, y1, 0.0))
    for i in range(1, 9):
        x = a + i * (b - a) / 9
        add('paint', wb('bar', x - 0.012, x + 0.012, z0 + 0.1, z0 + 0.14, lo + 0.07, hi - 0.07, 0.0), 0x2A2A2C)
    add('trim', wb('wsill', a - 0.06, b + 0.06, z0 - 0.06, z1 + 0.04, lo - 0.05, lo, 0.004), CEMENT)
    # side walls
    add('plaster', wb('wall_l', SH_X0, SH_X0 + T, SH_Z0, SH_Z1, 0, wall_h, 0.0), WHITE)
    add('plaster', wb('wall_r', SH_X1 - T, SH_X1, SH_Z0, SH_Z1, 0, wall_h, 0.0), WHITE)
    # front: jambs, lintel (blank board area), roller shutter box with the shutter rolled up, 6 m wide opening
    jamb = 0.5
    ox0, ox1 = SH_X0 + jamb, SH_X1 - jamb
    for nm, a, b in (('fj_l', SH_X0, ox0), ('fj_r', ox1, SH_X1)):
        add('plaster', wb(nm, a, b, SH_Z1 - T, SH_Z1, 0, wall_h, 0.0), WHITE)
    add('plaster', wb('lintel', SH_X0, SH_X1, SH_Z1 - T, SH_Z1, 2.7, wall_h, 0.0), WHITE)
    add('metal', wb('shutter_box', ox0, ox1, SH_Z1 - T - 0.02, SH_Z1 - T + 0.2, 2.55, 2.95, 0.02), 0x8A8F94)
    for k in range(10):    # ribbed rolled-up shutter: ridges
        add('metal', wb('shutter_rib', ox0 + 0.1, ox1 - 0.1, SH_Z1 - T - 0.03, SH_Z1 - T - 0.01, 2.58 + k * 0.035, 2.6 + k * 0.035, 0.0), 0x9EA3A8)
    add('metal', wb('guide_l', ox0, ox0 + 0.07, SH_Z1 - T - 0.02, SH_Z1 - T + 0.1, 0, 2.55, 0.0), 0x8A8F94)
    add('metal', wb('guide_r', ox1 - 0.07, ox1, SH_Z1 - T - 0.02, SH_Z1 - T + 0.1, 0, 2.55, 0.0), 0x8A8F94)
    # blank cream board over the opening (text is painted in-game over it)
    add('plaster', wb('board', SH_X0 + 1.0, SH_X1 - 1.0, SH_Z1 + 0.0, SH_Z1 + 0.08, 3.05, 3.55, 0.0), 0xEFE3BE)
    for nm, a, b, h0, h1 in (('t', SH_X0 + 0.96, SH_X1 - 0.96, 3.55, 3.6), ('b', SH_X0 + 0.96, SH_X1 - 0.96, 3.0, 3.05), ('l', SH_X0 + 0.96, SH_X0 + 1.0, 3.0, 3.6), ('r', SH_X1 - 1.0, SH_X1 - 0.96, 3.0, 3.6)):
        add('plinth', wb('board_edge_' + nm, a, b, SH_Z1 - 0.02, SH_Z1 + 0.1, h0, h1, 0.0), BLUE)
    # blue base band + roof lines
    for (a, b, c, d) in ((SH_X0, SH_X1, SH_Z1 - T - 0.03, SH_Z1 + 0.03),):
        add('plinth', wb('band_f', a - 0.03, b + 0.03, c, d, 0, 0.8, 0.0), BLUE)
    add('plinth', wb('band_b', SH_X0 - 0.03, SH_X1 + 0.03, SH_Z0 - 0.03, SH_Z0 + 0.03, 0, 0.8, 0.0), BLUE)
    add('plinth', wb('band_l', SH_X0 - 0.03, SH_X0 + 0.03, SH_Z0, SH_Z1, 0, 0.8, 0.0), BLUE)
    add('plinth', wb('band_r', SH_X1 - 0.03, SH_X1 + 0.03, SH_Z0, SH_Z1, 0, 0.8, 0.0), BLUE)
    # roof slab with overhang, a pale-blue edge line, parapet with a blue cap
    sl = SH_H
    add('trim', wb('slab', SH_X0 - 0.25, SH_X1 + 0.25, SH_Z0 - 0.25, SH_Z1 + 0.25, sl, sl + 0.2, 0.01), WHITE)
    add('plinth', wb('slab_line', SH_X0 - 0.27, SH_X1 + 0.27, SH_Z0 - 0.27, SH_Z1 + 0.27, sl + 0.14, sl + 0.2, 0.0), BLUE)
    pt = 0.18
    ph = 0.35
    add('plaster', wb('par_b', SH_X0, SH_X1, SH_Z0, SH_Z0 + pt, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plaster', wb('par_f', SH_X0, SH_X1, SH_Z1 - pt, SH_Z1, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plaster', wb('par_l', SH_X0, SH_X0 + pt, SH_Z0 + pt, SH_Z1 - pt, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plaster', wb('par_r', SH_X1 - pt, SH_X1, SH_Z0 + pt, SH_Z1 - pt, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plinth', wb('cap', SH_X0 - 0.04, SH_X1 + 0.04, SH_Z0 - 0.04, SH_Z1 + 0.04, sl + 0.2 + ph, sl + 0.2 + ph + 0.05, 0.0), BLUE)
    # black plastic tank on a pad (roof, back-left)
    tx, tz = SH_X0 + 1.4, SH_Z0 + 1.3
    b0 = sl + 0.2
    add('paint', wb('tank_pad', tx - 0.8, tx + 0.8, tz - 0.8, tz + 0.8, b0, b0 + 0.12, 0.0), CEMENT)
    add('paint', cyl('tank', tx, tz, b0 + 0.12, b0 + 1.3, 0.62, 0.62, 18), 0x1C1C1F)
    add('paint', sphere('tank_dome', tx, tz, b0 + 1.3, 0.62, 0.62, 0.22, 2), 0x1C1C1F)
    for hr in (0.45, 0.9):
        add('paint', cyl('tank_rib', tx, tz, b0 + hr, b0 + hr + 0.05, 0.645, 0.645, 18), 0x2A2A2E)
    steel(limb('tank_pipe', (tx + 0.6, tz, b0 + 0.2), (tx + 0.6, tz, sl - 0.1), 0.07), 0x777A7D)
    # floor
    add('trim', wb('floor', SH_X0 + T, SH_X1 - T, SH_Z0 + T, SH_Z1, 0, 0.05, 0.0), 0xBDB8AC)
    # full-width white-tile counter: tiled front, wooden-edged cement top, tile joints as thin lines
    cx0, cx1 = ox0, ox1
    cz0, cz1 = SH_Z1 - 1.2, SH_Z1 - T + 0.02
    add('trim', wb('counter', cx0, cx1, cz0, cz1, 0, 0.88, 0.005), TILE)
    add('trim', wb('counter_top', cx0 - 0.04, cx1 + 0.04, cz0 - 0.04, cz1 + 0.12, 0.88, 0.94, 0.006), 0xD9D6CD)
    jz = cz1 + 0.12
    for k in range(1, 15):
        x = cx0 + k * (cx1 - cx0) / 15
        add('paint', wb('tile_v', x - 0.005, x + 0.005, jz - 0.12, jz, 0.0, 0.88, 0.0), 0x9A9A96) if False else None
    for k in range(1, 15):
        x = cx0 + k * (cx1 - cx0) / 15
        add('paint', wb('tile_v', x - 0.006, x + 0.006, cz1 - 0.002, cz1 + 0.012, 0.0, 0.88, 0.0), 0x9A9A96)
    for k in range(1, 4):
        add('paint', wb('tile_h', cx0, cx1, cz1 - 0.002, cz1 + 0.012, k * 0.22 - 0.006, k * 0.22 + 0.006, 0.0), 0x9A9A96)
    add('plinth', wb('counter_base', cx0, cx1, cz1 - 0.002, cz1 + 0.03, 0, 0.14, 0.0), BLUE)

    # ---- interior stock and equipment (behind and on the counter)
    # back-wall shelves with jars/tins (two rows) and small packets
    for h in (1.45, 1.95):
        add('wood', wb('shelf', SH_X0 + 1.0, SH_X1 - 1.0, SH_Z0 + T, SH_Z0 + T + 0.3, h, h + 0.04, 0.0))
    for k in range(10):
        x = SH_X0 + 1.2 + k * 0.5
        steel(cyl('jar', x, SH_Z0 + T + 0.17, 1.49, 1.49 + 0.2 + (k % 3) * 0.04, 0.09, 0.09, 10), (0xB9BDC2, 0xC9A83A, 0xB9BDC2, 0x8FA0AA)[k % 4])
    for k in range(8):
        x = SH_X0 + 1.4 + k * 0.58
        add('paint', wb('tin', x - 0.1, x + 0.1, SH_Z0 + T + 0.07, SH_Z0 + T + 0.27, 1.99, 2.25 + (k % 2) * 0.05, 0.004), (0xB8472E, 0xC9A83A, 0x2E5E8B, 0x4A7A4A)[k % 4])
    # hanging scale (brass dial, pan chain) + bucket on a hook, left of centre
    sx = SH_X0 + 2.9
    steel(limb('scale_hook', (sx, SH_Z0 + 1.0, 3.55), (sx, SH_Z0 + 1.0, 3.2), 0.02), 0x3A3C3E)
    steel(cyl('scale_dial', sx, SH_Z0 + 1.0, 2.6, 2.95, 0.17, 0.17, 14), 0xE8E4D8)
    steel(limb('scale_chain', (sx, SH_Z0 + 1.0, 2.6), (sx, SH_Z0 + 1.0, 1.9), 0.015), 0x3A3C3E)
    steel(cyl('scale_pan', sx, SH_Z0 + 1.0, 1.85, 1.9, 0.2, 0.2, 12), STEEL)
    bx = sx + 0.9
    steel(limb('bucket_hook', (bx, SH_Z0 + 1.0, 3.5), (bx, SH_Z0 + 1.0, 2.1), 0.015), 0x3A3C3E)
    steel(cyl('hang_bucket', bx, SH_Z0 + 1.0, 1.75, 2.1, 0.17, 0.15, 12), STEEL)
    # steel milk chiller (tall rounded drum with a lid and tap) and milk-testing machine with a blank screen on a shelf
    chx, chz = SH_X0 + 2.0, SH_Z0 + 1.6
    steel(lathe('chiller', chx, chz, [(0.0, 0.0), (0.5, 0.0), (0.54, 0.06), (0.54, 1.2), (0.5, 1.28), (0.0, 1.3)], seg=18), 0xB9BDC2)
    steel(cyl('chiller_lid', chx, chz, 1.3, 1.36, 0.46, 0.46, 18), 0x8A8E93)
    steel(limb('chiller_tap', (chx + 0.54, chz, 0.75), (chx + 0.72, chz, 0.7), 0.05), BRASS)
    add('paint', wb('tester_body', SH_X1 - 2.0, SH_X1 - 1.4, SH_Z0 + T + 0.1, SH_Z0 + T + 0.45, 1.5, 1.72, 0.01), 0xE6E4DE)
    add('paint', wb('tester_screen', SH_X1 - 1.9, SH_X1 - 1.5, SH_Z0 + T + 0.44, SH_Z0 + T + 0.465, 1.56, 1.66, 0.0), 0x1B1D22)
    # counter top: big steel lassi vessel, clay curd matkas, madhani (wooden churner), kulhads, steel tumblers, paneer/khoya glass case, jugs + ladles
    ctop = 0.94
    lx = SH_X0 + 1.6
    steel(lathe('lassi_vessel', lx, cz0 + 0.55, [(0.0, ctop), (0.26, ctop), (0.3, ctop + 0.05), (0.3, ctop + 0.5), (0.26, ctop + 0.6), (0.2, ctop + 0.68), (0.0, ctop + 0.68)], seg=16), STEEL)
    steel(cyl('lassi_lid', lx, cz0 + 0.55, ctop + 0.66, ctop + 0.72, 0.22, 0.22, 16), 0x8A8E93)
    for k, (mx, mz) in enumerate(((lx + 0.75, cz0 + 0.5), (lx + 1.45, cz0 + 0.45), (lx + 2.1, cz0 + 0.6))):
        clay_pot(kit, mx, mz, 0.9 + 0.1 * k)
    # the madhani: a wooden churning stick in a matka, with a cross-bar
    mx = lx + 0.75
    add('wood', limb('madhani', (mx, cz0 + 0.5, ctop + 0.5), (mx, cz0 + 0.5, ctop + 1.15), 0.025))
    add('wood', cyl('madhani_disc', mx, cz0 + 0.5, ctop + 0.48, ctop + 0.52, 0.09, 0.09, 8))
    # curd-pot rack lower on the left of the counter and a row of kulhads (clay cups) + steel tumblers
    for k in range(7):
        add('paint', cyl('kulhad', lx + 2.7 + k * 0.17, cz0 + 0.3, ctop, ctop + 0.11, 0.07, 0.05, 10) if False else cyl('kulhad', lx + 2.7 + k * 0.17, cz0 + 0.3, ctop, ctop + 0.11, 0.055, 0.07, 10), 0xB5693F)
        steel(cyl('tumbler', lx + 2.7 + k * 0.17, cz0 + 0.62, ctop, ctop + 0.12, 0.05, 0.062, 10), STEEL)
    # paneer / khoya glass-fronted case on the counter (right)
    gx0 = SH_X1 - 2.6
    add('paint', wb('case_base', gx0, gx0 + 1.1, cz0 + 0.15, cz0 + 0.75, ctop, ctop + 0.1, 0.0), 0xD9D6CD)
    add('paint', wb('case_glass', gx0 + 0.02, gx0 + 1.08, cz0 + 0.17, cz0 + 0.73, ctop + 0.1, ctop + 0.5, 0.0), 0xBFD7DC)
    for k in range(5):
        add('paint', wb('paneer', gx0 + 0.1 + k * 0.2, gx0 + 0.26 + k * 0.2, cz0 + 0.3, cz0 + 0.5, ctop + 0.1, ctop + 0.2, 0.01), (0xF2EEDF, 0xEFE3BE)[k % 2])
    # jugs + ladles on a small side table at the right wall, ghee tins stacked on the floor
    add('wood', wb('jug_table', SH_X1 - 1.0, SH_X1 - 0.3, SH_Z0 + 1.6, SH_Z0 + 2.4, 0.78, 0.82, 0.004))
    for yy in (SH_Z0 + 1.7, SH_Z0 + 2.3):
        add('wood', wb('jug_leg', SH_X1 - 0.95, SH_X1 - 0.9, yy - 0.03, yy + 0.03, 0, 0.78, 0.0))
        add('wood', wb('jug_leg', SH_X1 - 0.4, SH_X1 - 0.35, yy - 0.03, yy + 0.03, 0, 0.78, 0.0))
    for k in range(3):
        steel(cyl('jug', SH_X1 - 0.85 + k * 0.22, SH_Z0 + 2.0, 0.82, 1.08, 0.075, 0.09, 10), STEEL)
    steel(limb('ladle', (SH_X1 - 0.6, SH_Z0 + 1.75, 0.9), (SH_X1 - 0.35, SH_Z0 + 1.75, 1.15), 0.02), STEEL)
    for k in range(3):
        for j in range(2 - k % 2):
            steel(wb('ghee_tin', SH_X1 - 2.4 + k * 0.4, SH_X1 - 2.4 + k * 0.4 + 0.32, SH_Z0 + 1.0 + j * 0.0, SH_Z0 + 1.32, 0.0 + j * 0.4, 0.4 + j * 0.4, 0.01), (0xC9A83A, 0xB9BDC2)[k % 2])
    # two big milk cans just inside the counter, a wooden stool, a calendar-card on the wall, a fan and a tube light
    for k in range(2):
        cx = SH_X0 + 0.9 + k * 0.5
        steel(lathe('can', cx, SH_Z1 - 1.7, [(0.0, 0.0), (0.19, 0.0), (0.2, 0.04), (0.2, 0.62), (0.15, 0.7), (0.11, 0.74), (0.11, 0.82), (0.16, 0.84), (0.16, 0.88), (0.0, 0.88)], seg=14), STEEL)
    add('wood', wb('stool', SH_X1 - 3.1, SH_X1 - 2.7, SH_Z0 + 2.5, SH_Z0 + 2.9, 0.4, 0.45, 0.0))
    for dx, dz in ((-0.17, -0.17), (0.17, -0.17), (-0.17, 0.17), (0.17, 0.17)):
        add('wood', wb('stool_leg', SH_X1 - 2.9 + dx - 0.02, SH_X1 - 2.9 + dx + 0.02, SH_Z0 + 2.7 + dz - 0.02, SH_Z0 + 2.7 + dz + 0.02, 0, 0.4, 0.0))
    add('paint', limb('tube', (SH_X0 + 2.5, SH_Z0 + 2.5, 3.5), (SH_X0 + 4.5, SH_Z0 + 2.5, 3.5), 0.05), 0xF4F2E6)

    # slogan band on the LEFT (lane-facing) outer wall: wide cream band, bold red border ~4 x 1.2 m; a cow-and-calf picture at its right end.
    bx0, bx1 = SH_Z0 + 0.5, SH_Z0 + 4.5
    xw = SH_X0 - 0.01
    add('paint', wb('slogan_band', xw - 0.02, xw, bx0, bx1, 1.7, 2.9, 0.0), 0xF2E6C2)
    for h0, h1 in ((1.7, 1.78), (2.82, 2.9)):
        add('paint', wb('slogan_border', xw - 0.025, xw, bx0, bx1, h0, h1, 0.0), 0xB3231C)
    for z0b, z1b in ((bx0, bx0 + 0.08), (bx1 - 0.08, bx1)):
        add('paint', wb('slogan_border', xw - 0.025, xw, z0b, z1b, 1.7, 2.9, 0.0), 0xB3231C)
    # the picture sits on the band at its right end (south end, toward the front): 1.1 x 0.8 m
    wall_decal_W(xw - 0.03, bx1 - 1.35, bx1 - 0.25, 1.9, 2.7)


# ---------------------------------------------------------------------------------------------- stable
def build_stable():
    x0, x1, z0, z1 = 3.0, 9.0, -5.5, -1.5
    # mud half-wall behind (back) and the right side, cement trough along the back wall, straw floor
    add('plaster', wb('mud_back', x0, x1, z0, z0 + 0.3, 0, 1.2, 0.0), 0xA88A60)
    add('plaster', wb('mud_right', x1 - 0.3, x1, z0 + 0.3, z1, 0, 1.0, 0.0), 0xA88A60)
    tro = wb('trough', x0 + 0.3, x0 + 3.3, z0 + 0.35, z0 + 1.0, 0, 0.62, 0.015)
    add('trim', tro, CEMENT)
    add('paint', wb('trough_inner', x0 + 0.42, x0 + 3.18, z0 + 0.47, z0 + 0.88, 0.45, 0.5, 0.0), 0x6F6A5E)
    # (the green fodder in it is organic: left out)
    add('paint', wb('straw_floor', x0 + 0.2, x1 - 0.4, z0 + 1.1, z1 - 0.2, 0.04, 0.1, 0.0), 0xC9B070)
    # six wooden posts (rough, slightly tapered) + beams
    posts = [(x0 + 0.15, z1 - 0.1), (x0 + 3.0, z1 - 0.1), (x1 - 0.15, z1 - 0.1), (x0 + 0.15, z0 + 0.35), (x0 + 3.0, z0 + 0.35), (x1 - 0.15, z0 + 0.35)]
    for k, (px, pz) in enumerate(posts):
        add('wood', limb('post', (px, pz, 0), (px + 0.03 * ((k % 3) - 1), pz, 2.9 if pz > z0 + 1 else 3.3), 0.16, 0.14))
    for pz, hh in ((z1 - 0.1, 2.9), (z0 + 0.35, 3.3)):
        add('wood', limb('beam', (x0 + 0.05, pz, hh), (x1 - 0.05, pz, hh), 0.15, 0.13))
    for px in (x0 + 0.15, x0 + 3.0, x1 - 0.15):
        add('wood', limb('tie', (px, z1 - 0.1, 2.9), (px, z0 + 0.35, 3.3), 0.1, 0.1))
    # thick thatch roof: a sloped slab (sloping toward the front), thick, overhanging, with edge thickness and bound ridges (own thatch set)
    th = 0.38
    roof = prism_x('thatch_roof', x0 - 0.45, x1 + 0.45, [(z0 - 0.3, 3.55), (z1 + 0.7, 2.7), (z1 + 0.7, 2.7 - th), (z0 - 0.3, 3.55 - th)])
    add('thatch', roof)
    # bound ropes across the thatch
    for k in range(4):
        zz = z0 + 0.4 + k * 1.05
        yy = 3.55 - (zz - (z0 - 0.3)) / (z1 + 1.0 - z0) * 0.85 + 0.01
        add('wood', limb('rope', (x0 - 0.4, zz, yy), (x1 + 0.4, zz, yy), 0.03, 0.02))
    # tether pegs and iron rings on two posts
    for px in (x0 + 0.15, x0 + 3.0):
        add('wood', limb('peg', (px + 0.1, z0 + 0.45, 0.9), (px + 0.25, z0 + 0.45, 0.9), 0.05))
    # dung stack at the stable's right end (cone of cakes)
    for k, (r, h0, h1) in enumerate(((0.8, 0.0, 0.4), (0.62, 0.4, 0.75), (0.42, 0.75, 1.05), (0.2, 1.05, 1.25))):
        add('paint', cyl('dung_stack_%d' % k, x1 + 0.9, z0 + 0.9, h0, h1, r, r * 0.8, 10), 0x6A5238)


# ---------------------------------------------------------------------------------------------- yard
def build_yard():
    # two long wooden benches in front of the shop
    for bx0, bx1 in ((-7.4, -5.2), (-4.6, -2.4)):
        add('wood', wb('bench_seat', bx0, bx1, 1.7, 2.1, 0.44, 0.5, 0.008))
        for x in (bx0 + 0.2, bx1 - 0.2):
            add('wood', wb('bench_leg', x - 0.04, x + 0.04, 1.75, 2.05, 0, 0.44, 0.003))
        add('wood', wb('bench_rail', bx0 + 0.2, bx1 - 0.2, 1.74, 1.78, 0.2, 0.26, 0.0))
    # farmers' milk cans along the front of the counter
    for k in range(6):
        cx = -2.4 + k * 0.42 + (0.05 if k % 2 else 0)
        steel(lathe('farm_can', cx, 0.9, [(0.0, 0.0), (0.19, 0.0), (0.2, 0.04), (0.2, 0.62), (0.15, 0.7), (0.11, 0.74), (0.11, 0.82), (0.16, 0.84), (0.16, 0.88), (0.0, 0.88)], seg=14), STEEL)
    # chaff cutter: cast frame, big spoked flywheel on a crank, feed trough and blade box
    cx, cz = 3.6, 1.0
    for dz in (-0.35, 0.35):
        steel(limb('cc_leg_a', (cx - 0.55, cz + dz, 0), (cx - 0.3, cz + dz, 0.95), 0.07), 0x2E5E3A)
        steel(limb('cc_leg_b', (cx + 0.55, cz + dz, 0), (cx + 0.3, cz + dz, 0.95), 0.07), 0x2E5E3A)
    steel(wb('cc_box', cx - 0.5, cx + 0.5, cz - 0.3, cz + 0.3, 0.95, 1.15, 0.01), 0x2E5E3A)
    steel(wb('cc_feed', cx - 1.0, cx - 0.45, cz - 0.2, cz + 0.2, 0.95, 1.05, 0.0), 0x4A4C50)
    from arch import ring
    steel(ring('cc_flywheel', cx + 0.1, cz + 0.4, 1.05, 0.5, 0.04, axis='z'), 0x1E1E20)
    for k in range(6):
        a = k / 6 * math.pi
        steel(limb('cc_spoke', (cx + 0.1 - 0.46 * math.cos(a), cz + 0.4, 1.05 - 0.46 * math.sin(a)), (cx + 0.1 + 0.46 * math.cos(a), cz + 0.4, 1.05 + 0.46 * math.sin(a)), 0.03), 0x1E1E20)
    steel(cyl('cc_hub', cx + 0.1, cz + 0.4, 0.98, 1.12, 0.07, 0.07, 10), 0x2A2A2C)
    steel(limb('cc_handle', (cx + 0.1, cz + 0.5, 1.3), (cx + 0.1, cz + 0.8, 1.4), 0.03), 0x2A2A2C)
    # hand pump over a square cement tub
    px, pz = 0.6, 3.8
    tub = wb('pump_tub', px - 0.8, px + 0.8, pz - 0.8, pz + 0.8, 0, 0.45, 0.012)
    add('trim', tub, CEMENT)
    add('paint', wb('pump_water', px - 0.62, px + 0.62, pz - 0.62, pz + 0.62, 0.3, 0.36, 0.0), 0x4F6E75)
    add('paint', wb('pump_rim_n', px - 0.8, px + 0.8, pz - 0.8, pz - 0.62, 0.45, 0.5, 0.0), 0xBDB9B0)
    add('paint', wb('pump_rim_s', px - 0.8, px + 0.8, pz + 0.62, pz + 0.8, 0.45, 0.5, 0.0), 0xBDB9B0)
    add('paint', wb('pump_rim_w', px - 0.8, px - 0.62, pz - 0.62, pz + 0.62, 0.45, 0.5, 0.0), 0xBDB9B0)
    add('paint', wb('pump_rim_e', px + 0.62, px + 0.8, pz - 0.62, pz + 0.62, 0.45, 0.5, 0.0), 0xBDB9B0)
    steel(cyl('pump_base', px, pz - 0.5, 0.45, 0.8, 0.14, 0.12, 10), 0x2E5E3A)
    steel(cyl('pump_col', px, pz - 0.5, 0.8, 1.45, 0.075, 0.06, 10), 0x2E5E3A)
    steel(limb('pump_handle', (px, pz - 0.5, 1.35), (px - 0.5, pz - 0.5, 1.65), 0.05), 0x2E5E3A)
    steel(limb('pump_spout', (px, pz - 0.5, 1.05), (px + 0.35, pz - 0.5, 0.9), 0.06), 0x2E5E3A)
    # dung cakes drying on a low mud wall (rows of round cakes) in the front-middle
    add('plaster', wb('dung_wall', 0.0, 4.6, 5.0, 5.3, 0, 0.35, 0.0), 0xA88A60)
    for k in range(14):
        x = 0.25 + k * 0.32
        add('paint', cyl('dung_cake', x, 5.15, 0.35, 0.4, 0.15, 0.15, 8), 0x6A5238)
        add('paint', cyl('dung_cake2', x + 0.05, 4.7 + (k % 2) * 0.05, 0.04, 0.09, 0.14, 0.14, 8), 0x7A6044)
    # charpai (rope cot) at the right, with woven rope top, a bucket and a clay pot
    cx0, cx1, cz0, cz1 = 5.6, 7.7, 1.2, 2.3
    for x in (cx0 + 0.1, cx1 - 0.1):
        for z in (cz0 + 0.1, cz1 - 0.1):
            add('wood', limb('cot_leg', (x, z, 0), (x, z, 0.38), 0.07))
    add('wood', wb('cot_frame_a', cx0, cx1, cz0, cz0 + 0.07, 0.36, 0.42, 0.0))
    add('wood', wb('cot_frame_b', cx0, cx1, cz1 - 0.07, cz1, 0.36, 0.42, 0.0))
    add('wood', wb('cot_frame_c', cx0, cx0 + 0.07, cz0, cz1, 0.36, 0.42, 0.0))
    add('wood', wb('cot_frame_d', cx1 - 0.07, cx1, cz0, cz1, 0.36, 0.42, 0.0))
    for k in range(10):
        add('paint', wb('cot_rope', cx0 + 0.07, cx1 - 0.07, cz0 + 0.12 + k * 0.095, cz0 + 0.15 + k * 0.095, 0.4, 0.43, 0.0), 0xB89A64)
    for k in range(13):
        add('paint', wb('cot_rope2', cx0 + 0.12 + k * 0.155, cx0 + 0.15 + k * 0.155, cz0 + 0.07, cz1 - 0.07, 0.43, 0.455, 0.0), 0xA88A58)
    steel(cyl('bucket', 8.2, 2.4, 0.0, 0.3, 0.14, 0.18, 12), 0x9FA3A7)
    steel(limb('bucket_handle', (8.02, 2.4, 0.31), (8.38, 2.4, 0.31), 0.012), 0x3A3C3E)
    clay_pot(kit, 7.9, 4.0, 1.0)
    clay_pot(kit, 8.35, 4.3, 0.85)
    clay_pot(kit, 7.5, 4.4, 0.7)


build_ground()
build_shop()
build_stable()
build_yard()

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#8FBBD6', 'hb_trim': '#E9E6DD', 'hb_apron': '#A8845A',
         'hb_wood': '#8A6A48', 'hb_brick': '#C26A44', 'hb_tin': '#C5CDD2', 'hb_metal': '#FFFFFF', 'hb_thatch': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.03, 'hb_plinth': 0.03})
