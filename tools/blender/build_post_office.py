"""
Post office (dak ghar) - arch.py Kit, to Places V1/post_office/LAYOUT.md + MAIN_post_office_front_isometric.png.
Run: tools/blender/make.sh post_office post_office_v2
Frame: site-local metres, +z south = front. Single storey 8 x 7 m (x[-4,4], z[-7,0]), 4.4 m (3.4 floor + 1.0 parapet), pale yellow lime-wash, dark red base band + roof line,
flat roof, black tank. Front: 2 m deep open verandah on two square pillars, cement floor 2 steps up; door left (dark wood, iron studs), grilled counter window right, blank
board above, notice board left of the door; bench, 2 jute mail bags, ONE bicycle. Red cylindrical pillar post box on a cement plinth at the front-right corner.
Sides: one barred window each with dark shutters. Back: one door, one window.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, sack, bicycle, lathe, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'post_office_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
add = kit.add
rnd = random.Random(43)
YEL = 0xF0DFA2
RED = 0x7A2A26
IRON = 0x3A3C3E
DARK = 0x3A2A22
T = 0.25
X0, X1, Z0, Z1 = -4.0, 4.0, -7.0, 0.0
H = 3.4

add('paint', wb('ground', -5.5, 5.5, -8, 3.5, -0.08, 0.02, 0.0), 0xA38A66)
# openings: front door left, counter window right; back door + window; side windows
def run_x(z0, z1, ops):
    cur = X0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('w', cur, a, z0, z1, 0, H, 0.0), YEL)
        if lo > 0:
            add('plaster', wb('w_sill', a, b, z0, z1, 0, lo, 0.0), YEL)
        add('plaster', wb('w_lin', a, b, z0, z1, hi, H, 0.0), YEL)
        cur = b
    add('plaster', wb('w', cur, X1, z0, z1, 0, H, 0.0), YEL)
def run_z(x0, x1, ops):
    cur = Z0 + T
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('w', x0, x1, cur, a, 0, H, 0.0), YEL)
        if lo > 0:
            add('plaster', wb('w_sill', x0, x1, a, b, 0, lo, 0.0), YEL)
        add('plaster', wb('w_lin', x0, x1, a, b, hi, H, 0.0), YEL)
        cur = b
    add('plaster', wb('w', x0, x1, cur, Z1 - T, 0, H, 0.0), YEL)
run_x(Z1 - T, Z1, [(-3.0, -1.9, 0, 2.3), (1.0, 3.0, 1.1, 2.3)])
run_x(Z0, Z0 + T, [(-2.5, -1.5, 0, 2.2), (1.3, 2.5, 1.2, 2.4)])
run_z(X0, X0 + T, [(-3.8, -2.6, 1.2, 2.4)]) if False else None
cur = Z0 + T
for sx0, sx1 in ((X0, X0 + T), (X1 - T, X1)):
    for a, b, lo, hi in ((-4.2, -3.0, 1.2, 2.4),):
        add('plaster', wb('w', sx0, sx1, cur, a, 0, H, 0.0), YEL)
        add('plaster', wb('w_sill', sx0, sx1, a, b, 0, lo, 0.0), YEL)
        add('plaster', wb('w_lin', sx0, sx1, a, b, hi, H, 0.0), YEL)
        add('plaster', wb('w', sx0, sx1, b, Z1 - T, 0, H, 0.0), YEL)
# base band + roof line
add('plinth', wb('band_f', X0 - 0.02, X1 + 0.02, Z1 - T - 0.03, Z1 + 0.03, 0, 0.9, 0.0), RED)
add('plinth', wb('band_b', X0 - 0.02, X1 + 0.02, Z0 - 0.03, Z0 + 0.03, 0, 0.9, 0.0), RED)
add('plinth', wb('band_l', X0 - 0.03, X0 + 0.03, Z0, Z1, 0, 0.9, 0.0), RED)
add('plinth', wb('band_r', X1 - 0.03, X1 + 0.03, Z0, Z1, 0, 0.9, 0.0), RED)
add('trim', wb('slab', X0 - 0.2, X1 + 0.2, Z0 - 0.2, Z1 + 2.2, H, H + 0.2, 0.01), 0xB4B1A9)     # slab carries over the verandah
add('plinth', wb('roof_line', X0 - 0.22, X1 + 0.22, Z0 - 0.22, Z1 + 2.22, H + 0.04, H + 0.12, 0.0), RED)
for (a, b, c, d) in ((X0, X1, Z0, Z0 + 0.2), (X0, X1, Z1 + 2.0, Z1 + 2.2), (X0, X0 + 0.2, Z0 + 0.2, Z1 + 2.0), (X1 - 0.2, X1, Z0 + 0.2, Z1 + 2.0)):
    add('plaster', wb('par', a, b, c, d, H + 0.2, 4.4, 0.0), YEL)
    add('plinth', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 4.4, 4.46, 0.0), 0xC9B070)
add('paint', cyl('tank', 2.4, -5.0, 3.6, 4.8, 0.65, 0.65, 18), 0x1C1C1F)
add('paint', sphere('tank_dome', 2.4, -5.0, 4.8, 0.65, 0.65, 0.22, 2), 0x1C1C1F)
for hr in (3.9, 4.4):
    add('paint', cyl('tank_rib', 2.4, -5.0, hr, hr + 0.05, 0.675, 0.675, 18), 0x2A2A2E)
add('trim', wb('floor', X0 + T, X1 - T, Z0 + T, Z1, 0, 0.05, 0.0), 0xA19D93)
# verandah: 2 m deep, cement floor 2 steps up, two square pillars at the outer corners, a beam
add('trim', wb('ver_floor', X0, X1, Z1, Z1 + 2.0, 0, 0.3, 0.01), 0xA9A69F)
for k, d in enumerate((0.15, 0.3)):
    add('trim', wb('ver_step', -1.4, 1.4, Z1 + 2.0 + (0.3 - d) * 1.3 + 0.0, Z1 + 2.0 + (0.3 - d) * 1.3 + 0.3, 0, d, 0.006), 0xA09D95)
for sx in (X0 + 0.3, X1 - 0.3):
    add('plaster', wb('pillar', sx - 0.2, sx + 0.2, Z1 + 1.6, Z1 + 2.0, 0.3, H, 0.01), YEL)
    add('plinth', wb('pillar_base', sx - 0.23, sx + 0.23, Z1 + 1.57, Z1 + 2.03, 0.3, 1.1, 0.01), RED)
add('plaster', wb('ver_beam', X0, X1, Z1 + 1.55, Z1 + 2.05, H - 0.4, H, 0.01), YEL)
add('plinth', wb('ver_beam_band', X0, X1, Z1 + 2.05, Z1 + 2.08, H - 0.25, H - 0.15, 0.0), RED)
# front door left: dark wood leaf with iron studs, frame
dx0, dx1 = -3.0, -1.9
for xx0, xx1, y0, y1 in ((dx0, dx0 + 0.08, 0, 2.3), (dx1 - 0.08, dx1, 0, 2.3), (dx0, dx1, 2.22, 2.3)):
    add('wood', wb('df', xx0, xx1, Z1 - T - 0.02, Z1 + 0.03, y0, y1, 0.0), DARK)
add('wood', wb('door_leaf', dx0 + 0.08, dx1 - 0.08, Z1 - 0.12, Z1 - 0.06, 0.0, 2.22, 0.004), DARK)
for r in range(4):
    for c in range(3):
        add('metal', sphere('stud', dx0 + 0.25 + c * 0.28, Z1 - 0.05, 0.5 + r * 0.45, 0.025, 0.025, 0.025, 1), 0x2A2A2C)
add('paint', wb('handle', dx1 - 0.25, dx1 - 0.2, Z1 - 0.06, Z1 + 0.02, 1.0, 1.15, 0.0), BRASS)
# grilled counter window right: frame + grille + inner counter shelf
wx0, wx1 = 1.0, 3.0
for xx0, xx1, y0, y1 in ((wx0, wx0 + 0.07, 1.1, 2.3), (wx1 - 0.07, wx1, 1.1, 2.3), (wx0, wx1, 2.23, 2.3), (wx0, wx1, 1.1, 1.17)):
    add('wood', wb('wf', xx0, xx1, Z1 - T - 0.02, Z1 + 0.03, y0, y1, 0.0), DARK)
for k in range(1, 15):
    x = wx0 + k * (wx1 - wx0) / 15
    add('metal', wb('bar', x - 0.012, x + 0.012, Z1 - 0.12, Z1 - 0.07, 1.17, 2.23, 0.0), IRON)
add('metal', wb('bar_h', wx0, wx1, Z1 - 0.12, Z1 - 0.07, 1.65, 1.7, 0.0), IRON)
add('trim', wb('window_sill', wx0 - 0.08, wx1 + 0.08, Z1 - 0.2, Z1 + 0.12, 1.02, 1.1, 0.006), 0xA9A69F)
add('wood', wb('counter_shelf', wx0, wx1, Z1 - 0.8, Z1 - T, 1.0, 1.06, 0.0), 0x6A4A32)
# blank board above, notice board left of the door
add('plaster', wb('board', -2.4, 2.4, Z1 + 1.95, Z1 + 2.02, H + 0.25, H + 0.8, 0.0), 0xEFE3BE) if False else None
add('plaster', wb('board', -1.9, 1.9, Z1 + 2.05, Z1 + 2.12, 2.45, 3.05, 0.0), 0xEFE3BE)
for nm, a, b, h0, h1 in (('t', -1.95, 1.95, 3.05, 3.1), ('b', -1.95, 1.95, 2.4, 2.45), ('l', -1.95, -1.9, 2.4, 3.1), ('r', 1.9, 1.95, 2.4, 3.1)):
    add('wood', wb('board_edge_' + nm, a, b, Z1 + 2.03, Z1 + 2.14, h0, h1, 0.0), DARK)
add('wood', wb('notice_frame', -3.9, -3.35, Z1 - 0.02, Z1 + 0.04, 1.2, 2.2, 0.0), DARK)
add('paint', wb('notice_cork', -3.85, -3.4, Z1 + 0.04, Z1 + 0.06, 1.25, 2.15, 0.0), 0x8F6B45)
for k in range(5):
    add('paint', wb('notice_sheet', -3.82 + (k % 2) * 0.2, -3.7 + (k % 2) * 0.2, Z1 + 0.06, Z1 + 0.07, 1.3 + k * 0.17, 1.42 + k * 0.17, 0.0), (0xF2EFE6, 0xE9E4D4)[k % 2])
# bench, two jute mail bags, ONE bicycle on the verandah, a stool
pk.bench(kit, 1.4, 3.2, Z1 + 1.35, 0.44, 0.4)
sack(kit, -3.3, Z1 + 1.2, 0.3, 0.3, 0xA88A58, w=0.55, d=0.4, hh=0.6)
sack(kit, -2.7, Z1 + 1.35, 0.3, -0.3, 0xB89A64, w=0.55, d=0.4, hh=0.55)
for i in range(2):
    add('paint', wb('mail_tag', -3.3 + i * 0.6, -3.2 + i * 0.6, Z1 + 1.4, Z1 + 1.45, 0.65, 0.75, 0.0), 0xB3231C)
bicycle(kit, -1.4, Z1 + 3.0, 0x2E5E8B)
# red cylindrical pillar post box on a cement plinth, front-right corner
bx, bz = 5.0, Z1 + 1.6
add('trim', wb('box_plinth', bx - 0.4, bx + 0.4, bz - 0.4, bz + 0.4, 0, 0.2, 0.01), 0xA9A69F)
add('metal', lathe('post_box', bx, bz, [(0.0, 0.2), (0.28, 0.2), (0.3, 0.26), (0.3, 1.3), (0.33, 1.34), (0.33, 1.42), (0.2, 1.52), (0.0, 1.56)], seg=18), 0xB3201C)
add('metal', wb('box_slot', bx - 0.12, bx + 0.12, bz + 0.27, bz + 0.34, 1.0, 1.07, 0.0), 0x1B1B1D)
add('metal', wb('box_door', bx - 0.14, bx + 0.14, bz + 0.29, bz + 0.31, 0.35, 0.85, 0.0), 0x9A1A16)
# side windows: barred with dark open shutters; back door + window
for sx, sg in ((X0, -1), (X1, 1)):
    for k in range(1, 9):
        z = -4.2 + k * 1.2 / 9
        add('metal', wb('bar', sx - 0.03, sx + 0.03, z - 0.012, z + 0.012, 1.2, 2.4, 0.0), IRON)
    add('wood', wb('shutter', sx + sg * 0.1 - 0.02, sx + sg * 0.1 + 0.02, -3.0, -2.45, 1.2, 2.4, 0.0), DARK)
    add('trim', wb('sill', sx - 0.1, sx + 0.1, -4.25, -2.95, 1.14, 1.2, 0.0), 0xA9A69F)
add('wood', wb('back_door', -2.45, -1.55, Z0 - 0.02, Z0 + 0.06, 0, 2.18, 0.004), DARK)
for k in range(1, 8):
    add('metal', wb('bwbar', 1.3 + k * 0.15, 1.3 + k * 0.15 + 0.024, Z0 - 0.03, Z0 + 0.02, 1.2, 2.4, 0.0), IRON)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04})
