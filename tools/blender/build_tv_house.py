"""
TV house - arch.py Kit, to Places V1/tv_house/LAYOUT.md + MAIN_tv_house_front_isometric.png. Run: tools/blender/make.sh tv_house tv_house_v2
Frame: site-local metres, +z south = front. Two-storey 12 x 10 m (x[-6,6], z[-10,0]), 7.8 m to the parapet + a small roof room at the back (back-LEFT seen from the front).
Walls pale creamy yellow-ochre, maroon bands/frames/parapets, gold-painted tips on railings and gate. Ground floor centre: carved doors folded open, TV on a lace-covered cabinet,
sofa, crockery showcase, ceiling fan; grilled windows either side; tiled steps. First floor: front terrace (z[-3,0]) with maroon railing + gold tips. Roof: black tank, 6 m rod
antenna pole + guy wires, small dish. Front yard 12 x 6 m (z[0,6]) with a 1 m wall, maroon gate with gold tips, big durrie, red/yellow plastic chairs, bench, pots INSIDE the wall, tulsi stand.
Back wall: 1 door, 2+2 grilled windows.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, quad, join_objects, ROOT
from arch import Kit, plastic_chair, decal_material, lathe, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'tv_house_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
add = kit.add
rnd = random.Random(53)
CREAM = 0xE8D8A6
MAROON = 0x7A2A2E
GOLD = 0xC9A23A
DARK = 0x4A2E22
X0, X1, Z0, Z1 = -6.0, 6.0, -10.0, 0.0
H1 = 3.4
SL = 0.25
H2 = H1 + SL + 3.4          # first-floor ceiling
T = 0.3
FZ = -3.0                   # first-floor front wall plane; terrace z[-3,0]


def durrie(u, v):
    import math as m
    x, y = u - 0.5, v - 0.5
    d = abs(x) * 2 + abs(y) * 2
    if max(abs(x), abs(y)) > 0.47:
        return None
    ring = int(d * 7)
    cols = ((0.75, 0.15, 0.2), (0.95, 0.75, 0.15), (0.15, 0.4, 0.65), (0.9, 0.9, 0.85), (0.8, 0.3, 0.15), (0.2, 0.55, 0.3))
    c = cols[ring % len(cols)]
    if max(abs(x), abs(y)) > 0.44:
        c = (0.6, 0.1, 0.15)
    return tuple(v ** 2.2 for v in c) + (1.0,)


dmat = decal_material('hb_decal', (256, 256), durrie)


def ground_decal(x0, x1, z0, z1, h):
    o = quad('durrie', [(x0, z1, h), (x1, z1, h), (x1, z0, h), (x0, z0, h)])
    uvl = o.data.uv_layers.new(name='UVMap')
    me = o.data
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uvl.data[loop.index].uv = ((co.x - x0) / (x1 - x0), (-co.y - z0) / (z1 - z0))
    me.materials.append(dmat)
    kit.extra.append(o)


add('earth', wb('ground', -8, 8, -12, 7.5, -0.08, 0.03, 0.0), 0xB69568)
# ground floor shell with openings
def wall_x(z0, z1, h0, h1, ops, c=CREAM):
    cur = X0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('w', cur, a, z0, z1, h0, h1, 0.0), c)
        if lo > 0:
            add('plaster', wb('w_sill', a, b, z0, z1, h0, h0 + lo, 0.0), c)
        add('plaster', wb('w_lin', a, b, z0, z1, h0 + hi, h1, 0.0), c)
        cur = b
    add('plaster', wb('w', cur, X1, z0, z1, h0, h1, 0.0), c)
def side_wall(sx0, sx1, h0, h1, wins):
    cur = Z0 + T
    for a, b in wins:
        add('plaster', wb('sw', sx0, sx1, cur, a, h0, h1, 0.0), CREAM)
        add('plaster', wb('sw_sill', sx0, sx1, a, b, h0, h0 + 1.2, 0.0), CREAM)
        add('plaster', wb('sw_lin', sx0, sx1, a, b, h0 + 2.4, h1, 0.0), CREAM)
        cur = b
    add('plaster', wb('sw', sx0, sx1, cur, Z1 - T if h0 == 0 else FZ, h0, h1, 0.0), CREAM)
wall_x(Z1 - T, Z1, 0, H1, [(-1.8, 1.8, 0, 2.7), (-4.9, -3.3, 1.1, 2.4), (3.3, 4.9, 1.1, 2.4)])
wall_x(Z0, Z0 + T, 0, H1, [(-4.6, -3.6, 1.1, 2.3), (-2.8, -1.8, 1.1, 2.3), (-0.5, 0.5, 0, 2.2), (1.8, 2.8, 1.1, 2.3), (3.6, 4.6, 1.1, 2.3)])
side_wall(X0, X0 + T, 0, H1, [(-6.5, -5.3), (-3.0, -1.8)])
side_wall(X1 - T, X1, 0, H1, [(-6.5, -5.3), (-3.0, -1.8)])
add('trim', wb('floor', X0 + T, X1 - T, Z0 + T, Z1 - T, 0, 0.1, 0.0), 0xB9AE98)
add('plinth', wb('band_f', X0 - 0.02, X1 + 0.02, Z1 - T - 0.03, Z1 + 0.03, 0, 0.9, 0.0), MAROON)
add('plinth', wb('band_b', X0 - 0.02, X1 + 0.02, Z0 - 0.03, Z0 + 0.03, 0, 0.9, 0.0), MAROON)
add('plinth', wb('band_l', X0 - 0.03, X0 + 0.03, Z0, Z1, 0, 0.9, 0.0), MAROON)
add('plinth', wb('band_r', X1 - 0.03, X1 + 0.03, Z0, Z1, 0, 0.9, 0.0), MAROON)
# first-floor slab (carries the front terrace), maroon fascia stripes
add('trim', wb('slab1', X0 - 0.2, X1 + 0.2, Z0 - 0.2, Z1 + 0.25, H1, H1 + SL, 0.01), 0xB4B1A9)
add('plinth', wb('slab1_band', X0 - 0.22, X1 + 0.22, Z0 - 0.22, Z1 + 0.27, H1 + 0.02, H1 + 0.12, 0.0), MAROON)
# first floor rooms z[-10,-3], doors + windows on the terrace wall
B0 = H1 + SL
def wall_up(z0, z1, ops):
    cur = X0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('uw', cur, a, z0, z1, B0, B0 + 3.4, 0.0), CREAM)
        if lo > 0:
            add('plaster', wb('uw_sill', a, b, z0, z1, B0, B0 + lo, 0.0), CREAM)
        add('plaster', wb('uw_lin', a, b, z0, z1, B0 + hi, B0 + 3.4, 0.0), CREAM)
        cur = b
    add('plaster', wb('uw', cur, X1, z0, z1, B0, B0 + 3.4, 0.0), CREAM)
wall_up(FZ - T, FZ, [(-2.2, -1.0, 0, 2.3), (1.0, 2.0, 1.1, 2.3), (-4.8, -3.6, 1.1, 2.3), (3.8, 5.0, 1.1, 2.3)])
wall_up(Z0, Z0 + T, [(-4.0, -3.0, 1.1, 2.3), (-0.5, 0.5, 0, 2.2), (3.0, 4.0, 1.1, 2.3)])
for sx0, sx1 in ((X0, X0 + T), (X1 - T, X1)):
    add('plaster', wb('usw', sx0, sx1, Z0 + T, FZ, B0, B0 + 3.4, 0.0), CREAM)
add('plaster', wb('uside_l', X0, X0 + T, FZ, Z1, B0, B0 + 1.0, 0.0), CREAM)       # terrace parapet walls
add('plaster', wb('uside_r', X1 - T, X1, FZ, Z1, B0, B0 + 1.0, 0.0), CREAM)
add('trim', wb('terrace_floor', X0 + T, X1 - T, FZ, Z1 - 0.1, B0, B0 + 0.05, 0.0), 0xA19D93)
# upper wall frames: doors + windows (dark wood, grille)
def opening_frame(a, b, lo, hi, z, h0, door=False):
    for xx0, xx1, y0, y1 in ((a, a + 0.08, lo, hi), (b - 0.08, b, lo, hi), (a, b, hi - 0.08, hi), (a, b, lo, lo + 0.08)):
        add('wood', wb('of', xx0, xx1, z - T - 0.02, z + 0.03, h0 + y0, h0 + y1, 0.0), DARK)
    if door:
        add('wood', wb('leaf', a + 0.08, b - 0.08, z - 0.14, z - 0.06, h0 + lo + 0.02, h0 + hi - 0.08, 0.004), 0x5A3C28)
        for r in range(2):
            add('wood', wb('lpanel', a + 0.2, b - 0.2, z - 0.06, z - 0.03, h0 + 0.2 + r * 1.0, h0 + 1.0 + r * 1.0, 0.003), 0x4A2E1E)
    else:
        n = max(3, int((b - a) / 0.11))
        for k in range(1, n):
            x = a + k * (b - a) / n
            add('metal', wb('bar', x - 0.012, x + 0.012, z - 0.14, z - 0.09, h0 + lo + 0.08, h0 + hi - 0.08, 0.0), MAROON)
        add('metal', wb('bar_h', a, b, z - 0.14, z - 0.09, h0 + (lo + hi) / 2 - 0.02, h0 + (lo + hi) / 2 + 0.02, 0.0), MAROON)
        add('plinth', wb('lintel', a - 0.15, b + 0.15, z + 0.0, z + 0.07, h0 + hi, h0 + hi + 0.15, 0.0), MAROON)
for (a, b, lo, hi) in ((-4.9, -3.3, 1.1, 2.4), (3.3, 4.9, 1.1, 2.4)):
    opening_frame(a, b, lo, hi, Z1, 0)
for (a, b, lo, hi, dr) in ((-2.2, -1.0, 0, 2.3, True), (1.0, 2.0, 1.1, 2.3, False), (-4.8, -3.6, 1.1, 2.3, False), (3.8, 5.0, 1.1, 2.3, False)):
    opening_frame(a, b, lo, hi, FZ, B0, door=dr)
# back wall: 1 door + 2+2 grilled windows (ground), upper floor too
for (a, b, lo, hi) in ((-4.6, -3.6, 1.1, 2.3), (-2.8, -1.8, 1.1, 2.3), (1.8, 2.8, 1.1, 2.3), (3.6, 4.6, 1.1, 2.3)):
    for k in range(1, 8):
        x = a + k * (b - a) / 8
        add('metal', wb('bar', x - 0.012, x + 0.012, Z0 - 0.02, Z0 + 0.05, lo, hi, 0.0), MAROON)
add('wood', wb('back_door', -0.45, 0.45, Z0 - 0.03, Z0 + 0.06, 0, 2.2, 0.004), 0x5A3C28)
# ground-floor centre room: carved doors folded fully open, tiled steps, TV on a lace cabinet, sofa, crockery showcase, ceiling fan
dx0, dx1 = -1.8, 1.8
for xx0, xx1, y0, y1 in ((dx0, dx0 + 0.12, 0, 2.7), (dx1 - 0.12, dx1, 0, 2.7), (dx0, dx1, 2.58, 2.7)):
    add('wood', wb('df', xx0, xx1, Z1 - T - 0.02, Z1 + 0.05, y0, y1, 0.0), DARK)
for sg in (-1, 1):
    xa, xb = (dx0 - 0.9, dx0) if sg < 0 else (dx1, dx1 + 0.9)
    add('wood', wb('door_leaf', xa, xb, Z1 + 0.05, Z1 + 0.1, 0.05, 2.6, 0.004), 0x8A5A34)
    for r in range(3):
        add('wood', wb('door_carve', xa + 0.1, xb - 0.1, Z1 + 0.1, Z1 + 0.13, 0.25 + r * 0.8, 0.85 + r * 0.8, 0.0), 0x4F351F)
for k in range(3):
    add('trim', wb('tile_step', -1.8, 1.8, Z1 + 0.05 + (2 - k) * 0.3, Z1 + 0.05 + (3 - k) * 0.3, 0, 0.15 * (k + 1), 0.006), 0xC9B79B)
add('wood', wb('cabinet', -1.4, 0.0, -9.6, -8.6, 0.1, 0.85, 0.01), 0x8A5A34)
add('paint', wb('lace', -1.45, 0.05, -9.65, -8.55, 0.85, 0.88, 0.0), 0xF2EEDF)
add('paint', wb('tv_body', -1.0, -0.3, -9.4, -8.9, 0.88, 1.5, 0.02), 0x2B2D30)
add('paint', wb('tv_screen', -0.95, -0.35, -8.9, -8.87, 0.95, 1.43, 0.0), 0x14161A)
add('wood', wb('sofa_seat', -2.6, 1.4, -6.6, -5.7, 0.1, 0.5, 0.02), 0x8A4A3A)
add('wood', wb('sofa_back', -2.6, 1.4, -6.7, -6.4, 0.5, 1.0, 0.02), 0x8A4A3A)
for sx in (-2.6, 1.2):
    add('wood', wb('sofa_arm', sx, sx + 0.2, -6.7, -5.7, 0.1, 0.7, 0.02), 0x8A4A3A)
for k in range(3):
    add('paint', wb('crochet', -2.4 + k * 1.3, -1.8 + k * 1.3, -6.0, -5.7, 0.5, 0.56, 0.0), 0xF2EEDF)
add('wood', wb('showcase', 1.8, 3.2, -9.7, -9.1, 0.1, 2.0, 0.01), 0x8A5A34)
add('paint', wb('showcase_glass', 1.85, 3.15, -9.1, -9.08, 0.5, 1.9, 0.0), 0xBFD7DC)
for h in (0.9, 1.4):
    add('wood', wb('showcase_shelf', 1.85, 3.15, -9.65, -9.1, h, h + 0.03, 0.0), 0x5A3C28)
for k in range(5):
    add('metal', cyl('crock', 2.0 + k * 0.25, -9.4, 0.93, 1.1, 0.07, 0.07, 8), (0xE6E2D2, 0xB3231C)[k % 2])
add('metal', cyl('fan_rod', 0.0, -5.0, H1 - 0.35, H1, 0.015, 0.015, 6), 0x3A3C3E)
add('metal', cyl('fan_hub', 0.0, -5.0, H1 - 0.42, H1 - 0.33, 0.09, 0.09, 10), 0x8A8D90)
for k in range(3):
    a = k * math.tau / 3
    add('metal', limb('fan_blade', (0.08 * math.cos(a), -5.0 + 0.08 * math.sin(a), H1 - 0.38), (0.62 * math.cos(a), -5.0 + 0.62 * math.sin(a), H1 - 0.4), 0.14, 0.015), 0xD9D6CC)
# terrace railing: maroon balusters + rails with gold tips, plants are hers
for x in [X0 + 0.4 + k * 0.22 for k in range(int((X1 - X0 - 0.8) / 0.22) + 1)]:
    add('metal', limb('baluster', (x, Z1 - 0.15, B0 + 0.05), (x, Z1 - 0.15, B0 + 0.95), 0.03), MAROON)
for hh in (B0 + 0.1, B0 + 0.95):
    add('metal', limb('rail', (X0 + 0.3, Z1 - 0.15, hh), (X1 - 0.3, Z1 - 0.15, hh), 0.07, 0.06), MAROON)
for x in [X0 + 0.3 + k * 1.5 for k in range(9)]:
    add('metal', limb('newel', (x, Z1 - 0.15, B0), (x, Z1 - 0.15, B0 + 1.05), 0.09), MAROON)
    add('metal', sphere('tip', x, Z1 - 0.15, B0 + 1.1, 0.06, 0.06, 0.07, 1), GOLD)
# roof slab, parapets, band; roof room back-left; tank, antenna, dish
add('trim', wb('slab2', X0 - 0.2, X1 + 0.2, Z0 - 0.2, FZ + 0.25, H2, H2 + SL, 0.01), 0xB4B1A9)
add('plinth', wb('slab2_band', X0 - 0.22, X1 + 0.22, Z0 - 0.22, FZ + 0.27, H2 + 0.02, H2 + 0.12, 0.0), MAROON)
for (a, b, c, d) in ((X0, X1, Z0, Z0 + 0.2), (X0, X1, FZ - 0.2, FZ), (X0, X0 + 0.2, Z0 + 0.2, FZ - 0.2), (X1 - 0.2, X1, Z0 + 0.2, FZ - 0.2)):
    add('plaster', wb('par', a, b, c, d, H2 + SL, H2 + 1.0, 0.0), CREAM)
    add('plinth', wb('par_cap', a - 0.05, b + 0.05, c - 0.05, d + 0.05, H2 + 1.0, H2 + 1.1, 0.0), MAROON)
RR0, RR1, RZ0, RZ1 = -5.5, -1.5, -9.5, -5.5          # roof room, back-left
R0 = H2 + SL
add('plaster', wb('rr_w', RR0, RR1, RZ0, RZ0 + 0.25, R0, R0 + 3.0, 0.0), CREAM)
add('plaster', wb('rr_e', RR0, RR0 + 0.25, RZ0, RZ1, R0, R0 + 3.0, 0.0), CREAM)
add('plaster', wb('rr_e2', RR1 - 0.25, RR1, RZ0, RZ1, R0, R0 + 3.0, 0.0), CREAM)
add('plaster', wb('rr_f1', RR0, -3.9, RZ1 - 0.25, RZ1, R0, R0 + 3.0, 0.0), CREAM)
add('plaster', wb('rr_f2', -2.9, RR1, RZ1 - 0.25, RZ1, R0, R0 + 3.0, 0.0), CREAM)
add('plaster', wb('rr_f3', -3.9, -2.9, RZ1 - 0.25, RZ1, R0 + 2.3, R0 + 3.0, 0.0), CREAM)
add('wood', wb('rr_door', -3.85, -2.95, RZ1 - 0.3, RZ1 - 0.1, R0 + 0.02, R0 + 2.3, 0.004), 0x5A3C28)
add('trim', wb('rr_slab', RR0 - 0.25, RR1 + 0.25, RZ0 - 0.25, RZ1 + 0.25, R0 + 3.0, R0 + 3.2, 0.01), 0xB4B1A9)
add('plinth', wb('rr_band', RR0 - 0.27, RR1 + 0.27, RZ0 - 0.27, RZ1 + 0.27, R0 + 3.02, R0 + 3.12, 0.0), MAROON)
for (a, b, c, d) in ((RR0, RR1, RZ0, RZ0 + 0.2), (RR0, RR1, RZ1 - 0.2, RZ1), (RR0, RR0 + 0.2, RZ0 + 0.2, RZ1 - 0.2), (RR1 - 0.2, RR1, RZ0 + 0.2, RZ1 - 0.2)):
    add('plaster', wb('rr_par', a, b, c, d, R0 + 3.2, R0 + 3.8, 0.0), CREAM)
    add('plinth', wb('rr_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, R0 + 3.8, R0 + 3.88, 0.0), MAROON)
add('paint', cyl('tank', -3.5, -7.5, R0 + 3.2, R0 + 4.4, 0.62, 0.62, 18), 0x1C1C1F)
add('paint', sphere('tank_dome', -3.5, -7.5, R0 + 4.4, 0.62, 0.62, 0.22, 2), 0x1C1C1F)
for hr in (3.5, 4.0):
    add('paint', cyl('tank_rib', -3.5, -7.5, R0 + hr, R0 + hr + 0.05, 0.645, 0.645, 18), 0x2A2A2E)
# antenna: 6 m pole on the right of the roof with an old rod antenna + guy wires; small dish on the parapet
ax, az = 3.0, -6.0
add('metal', limb('ant_pole', (ax, az, H2 + SL), (ax, az, H2 + SL + 6.0), 0.07, 0.06), 0x8A8D90)
for k in range(5):
    y = H2 + SL + 4.0 + k * 0.4
    add('metal', limb('ant_rod', (ax - 0.9 + k * 0.05, az, y), (ax + 0.9 - k * 0.05, az, y), 0.02, 0.02), 0x9A9EA3)
add('metal', limb('ant_boom', (ax, az - 0.5, H2 + SL + 4.0), (ax, az + 0.5, H2 + SL + 4.0), 0.02), 0x9A9EA3)
for (gx, gz) in ((ax - 2.2, az - 1.6), (ax + 2.2, az - 1.6), (ax, az + 2.0)):
    add('metal', limb('guy', (ax, az, H2 + SL + 5.2), (gx, gz, H2 + SL + 0.15), 0.012, 0.012), 0x4A4C50)
add('metal', lathe('dish', 5.2, -2.8, [(0.0, H2 + SL + 0.9), (0.28, H2 + SL + 1.0), (0.3, H2 + SL + 1.05), (0.0, H2 + SL + 0.95)], seg=16), 0xCFD2D4) if False else None
dc = (5.2, -3.4)
add('metal', limb('dish_stand', (dc[0], dc[1], H2 + SL), (dc[0], dc[1], H2 + SL + 0.9), 0.06), 0x6C7074)
add('metal', cyl('dish', dc[0], dc[1] - 0.15, H2 + SL + 0.85, H2 + SL + 1.05, 0.34, 0.12, 16), 0xD5D8DA)
add('metal', limb('dish_arm', (dc[0], dc[1] - 0.15, H2 + SL + 0.95), (dc[0], dc[1] + 0.35, H2 + SL + 1.1), 0.02), 0x6C7074)
# front yard 12 x 6 m: 1 m wall, maroon gate with gold tips, tiled yard, durrie facing the TV, chairs, bench, pots inside, tulsi stand
add('trim', wb('yard_floor', X0, X1, Z1, Z1 + 6.0, 0, 0.08, 0.01), 0xB5AE9E)
for (a, b, c, d) in ((X0, -1.6, Z1 + 5.75, Z1 + 6.0), (1.6, X1, Z1 + 5.75, Z1 + 6.0), (X0, X0 + 0.25, Z1, Z1 + 5.75), (X1 - 0.25, X1, Z1, Z1 + 5.75)):
    add('plaster', wb('ywall', a, b, c, d, 0.08, 1.0, 0.0), CREAM)
    add('plinth', wb('ywall_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 1.0, 1.08, 0.0), MAROON)
# the front wall has the gate gap (2.4 m): rebuild the front wall as two pieces by punching the gap with maroon posts
for sg in (-1, 1):
    add('plaster', wb('gate_pier', sg * 1.35 - 0.25, sg * 1.35 + 0.25, Z1 + 5.7, Z1 + 6.05, 0.08, 1.5, 0.01), CREAM)
    add('plinth', wb('gate_pier_cap', sg * 1.35 - 0.3, sg * 1.35 + 0.3, Z1 + 5.65, Z1 + 6.1, 1.5, 1.58, 0.0), MAROON)
    add('metal', sphere('gate_tip_pier', sg * 1.35, Z1 + 5.875, 1.65, 0.06, 0.06, 0.08, 1), GOLD)
    for i in range(0, 8):
        x = sg * (0.05 + i * 0.14)
        add('metal', limb('gate_bar', (x, Z1 + 5.875, 0.15), (x, Z1 + 5.875, 1.35), 0.025), MAROON)
        add('metal', sphere('gate_tip', x, Z1 + 5.875, 1.4, 0.03, 0.03, 0.05, 1), GOLD)
    for hh in (0.2, 0.7, 1.3):
        add('metal', limb('gate_rail', (sg * 0.02, Z1 + 5.875, hh), (sg * 1.1, Z1 + 5.875, hh), 0.05, 0.04), MAROON)
# the front wall pieces either side of the gate (done last so the gap is real): left [-6,-1.6], right [1.6,6]
for a, b in ((X0, -1.6), (1.6, X1)):
    pass
ground_decal(-2.2, 1.0, 1.0, 4.4, 0.085)           # big durrie facing the TV
plastic_chair(kit, -3.2, 3.4, 3.14 + 0.2, 0xC62828)
plastic_chair(kit, -4.0, 2.4, 3.14 + 0.3, 0xE8B923)
plastic_chair(kit, 3.2, 3.4, 3.14 - 0.2, 0xE8B923)
plastic_chair(kit, 4.0, 2.5, 3.14 - 0.3, 0xC62828)
pk.bench(kit, -5.6, -3.8, 4.8, 0.45, 0.4)
add('plaster', wb('tulsi_stand', 4.6, 5.2, 1.2, 1.8, 0.08, 0.9, 0.01), 0xE9DDC0)
add('plinth', wb('tulsi_stand_cap', 4.55, 5.25, 1.15, 1.85, 0.9, 0.98, 0.0), MAROON)
for x in (-5.4, -4.2, -3.0, 3.0, 4.2, 5.4):
    pk.pot(kit, x, 5.25, 0.08, 0.7, 0xB5693F)
add('plaster', wb('yard_pillar_l', X0, X0 + 0.01, Z1, Z1 + 0.01, 0, 0.01, 0.0), CREAM) if False else None

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.03})
