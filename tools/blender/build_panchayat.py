"""
Panchayat bhavan - arch.py Kit, to Places V1/panchayat/LAYOUT.md (her 25 Oct change: meetings happen OUTSIDE under the neem) + MAIN_panchayat_front_isometric.png.
Run: tools/blender/make.sh panchayat panchayat_v2
Frame: site-local metres, +z south = front. Single storey 14 x 10 m (x[-7,7], z[-10,0]; 3 m verandah z[-3,0] + 7 m rooms), 4.4 m, on a 0.6 m plinth with wide front steps. White lime-wash,
terracotta-red base band, roof line and pillar bases; verandah on 4 round pillars; centre: big carved double door; left: office window; right: blank notice board; blank board above
the entrance; Indian flag on a short pole on the roof above the entrance; black tank. Front = open bare-earth meeting ground 14 x 12 m (z[0,12]) with a round brick chabutra ~7 m out,
left of centre (the neem is hers) with TWO plastic chairs under it facing the building; hand pump near the building's front-right corner. No interior (meetings are outside).
Back: 1 door + 4 windows. Sides: 2 barred windows with open dark shutters each.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, plastic_chair, lathe, ring, STEEL, BRASS, pillar
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'panchayat_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
add = kit.add
WHITE = 0xF4F1EA
TERRA = 0xB4583C
DARK = 0x3A2A22
X0, X1, Z0, Z1 = -7.0, 7.0, -10.0, 0.0
PL = 0.6
H = 3.4
T = 0.3
IRON = 0x3A3C3E

add('paint', wb('ground', -9, 9, -11.5, 13, -0.08, 0.03, 0.0), 0xB69568)
add('paint', wb('ground_worn', -6.5, 6.5, 0.5, 11.5, 0.03, 0.036, 0.0), 0xA98A5E)
add('trim', wb('plinth', X0 - 0.3, X1 + 0.3, Z0 - 0.3, Z1 + 0.3, 0, PL, 0.01), 0xA9A69F)
add('plinth', wb('plinth_band', X0 - 0.32, X1 + 0.32, Z1 + 0.28, Z1 + 0.33, 0, PL, 0.0), TERRA)
# steps: wide, 5 m, 3 risers
for k in range(3):
    d = 0.4
    add('trim', wb('step', -2.5, 2.5, Z1 + 0.3 + (2 - k) * d, Z1 + 0.3 + (3 - k) * d, 0, PL * (k + 1) / 3, 0.006), 0xA3A097)
# walls with openings
def wall_x(z0, z1, ops, base=PL):
    cur = X0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('w', cur, a, z0, z1, base, base + H, 0.0), WHITE)
        if lo > 0:
            add('plaster', wb('w_sill', a, b, z0, z1, base, base + lo, 0.0), WHITE)
        add('plaster', wb('w_lin', a, b, z0, z1, base + hi, base + H, 0.0), WHITE)
        cur = b
    add('plaster', wb('w', cur, X1, z0, z1, base, base + H, 0.0), WHITE)
FZ = -3.0   # room front wall plane (verandah z[-3,0])
wall_x(FZ - T, FZ, [(-1.4, 1.4, 0, 2.8), (-5.6, -3.4, 1.2, 2.4)])
wall_x(Z0, Z0 + T, [(-6.0, -5.0, 1.2, 2.4), (-3.5, -2.5, 1.2, 2.4), (-0.5, 0.5, 0.0, 2.2), (2.5, 3.5, 1.2, 2.4), (5.0, 6.0, 1.2, 2.4)])   # back: 4 windows + 1 door
for sx0, sx1, sg in ((X0, X0 + T, -1), (X1 - T, X1, 1)):
    cur = Z0 + T
    for a, b in ((-7.2, -5.8), (-4.2, -2.8)):
        add('plaster', wb('sw', sx0, sx1, cur, a, PL, PL + H, 0.0), WHITE)
        add('plaster', wb('sw_sill', sx0, sx1, a, b, PL, PL + 1.2, 0.0), WHITE)
        add('plaster', wb('sw_lin', sx0, sx1, a, b, PL + 2.4, PL + H, 0.0), WHITE)
        cur = b
        for k in range(1, 10):
            z = a + k * (b - a) / 10
            add('metal', wb('bar', (sx0 + sx1) / 2 - 0.03, (sx0 + sx1) / 2 + 0.03, z - 0.012, z + 0.012, PL + 1.2, PL + 2.4, 0.0), IRON)
        add('wood', wb('shutter', sx0 + sg * 0.1 - 0.02 if sg > 0 else sx0 - 0.1 - 0.02, sx0 + sg * 0.1 + 0.02 if sg > 0 else sx0 - 0.1 + 0.02, b, b + 0.7, PL + 1.2, PL + 2.4, 0.0) if False else wb('shutter', (sx0 + sx1) / 2 + sg * 0.2 - 0.02, (sx0 + sx1) / 2 + sg * 0.2 + 0.02, b, b + 0.7, PL + 1.2, PL + 2.4, 0.0), DARK)
        add('trim', wb('sill', sx0 - 0.08, sx1 + 0.08, a - 0.05, b + 0.05, PL + 1.14, PL + 1.2, 0.0), 0xA9A69F)
    add('plaster', wb('sw', sx0, sx1, cur, Z1, PL, PL + H, 0.0), WHITE)
add('trim', wb('floor', X0 + T, X1 - T, Z0 + T, Z1, PL, PL + 0.05, 0.0), 0xA19D93)
# verandah: round pillars (terracotta bases), a beam, ceiling fan, slab roof
for x in (-5.5, -1.9, 1.9, 5.5):
    add('plinth', lathe('pil_base', x, -0.5, [(0.3, PL), (0.3, PL + 0.9), (0.27, PL + 0.95)], seg=14), TERRA)
    add('plaster', lathe('pil_shaft', x, -0.5, [(0.22, PL + 0.9), (0.2, PL + 2.9), (0.26, PL + 2.95), (0.26, PL + 3.1)], seg=14), WHITE)
    add('plaster', cyl('pil_cap', x, -0.5, PL + 2.95, PL + H - 0.2, 0.2, 0.22, 14), WHITE)
add('plaster', wb('beam', X0, X1, -0.8, -0.15, PL + H - 0.4, PL + H, 0.01), WHITE)
# roof slab, red roof line, parapet 1.0 with blank board centre, tank, flag
RB = PL + H
add('trim', wb('slab', X0 - 0.25, X1 + 0.25, Z0 - 0.25, Z1 + 0.25, RB, RB + 0.2, 0.01), 0xB4B1A9)
add('plinth', wb('roof_line', X0 - 0.27, X1 + 0.27, Z0 - 0.27, Z1 + 0.27, RB + 0.05, RB + 0.14, 0.0), TERRA)
for (a, b, c, d) in ((X0, X1, Z0, Z0 + 0.2), (X0, X1, Z1 - 0.2, Z1), (X0, X0 + 0.2, Z0 + 0.2, Z1 - 0.2), (X1 - 0.2, X1, Z0 + 0.2, Z1 - 0.2)):
    add('plaster', wb('par', a, b, c, d, RB + 0.2, RB + 0.85, 0.0), WHITE)
    add('trim', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, RB + 0.85, RB + 0.92, 0.0), 0xD8D4C8)
add('plaster', wb('board', -1.8, 1.8, Z1 + 0.0, Z1 + 0.06, RB + 0.25, RB + 0.85, 0.0), 0xEFE3BE)
for nm, a, b, h0, h1 in (('t', -1.84, 1.84, RB + 0.85, RB + 0.9), ('b', -1.84, 1.84, RB + 0.2, RB + 0.25), ('l', -1.84, -1.8, RB + 0.2, RB + 0.9), ('r', 1.8, 1.84, RB + 0.2, RB + 0.9)):
    add('wood', wb('board_edge_' + nm, a, b, Z1 - 0.02, Z1 + 0.08, h0, h1, 0.0), 0x6A5A48)
add('paint', cyl('tank', -5.5, -7.5, RB + 0.2, RB + 1.4, 0.65, 0.65, 18), 0x1C1C1F)
add('paint', sphere('tank_dome', -5.5, -7.5, RB + 1.4, 0.65, 0.65, 0.22, 2), 0x1C1C1F)
for hr in (0.5, 1.0):
    add('paint', cyl('tank_rib', -5.5, -7.5, RB + hr, RB + hr + 0.05, 0.675, 0.675, 18), 0x2A2A2E)
add('metal', limb('flag_pole', (0.0, -0.5, RB + 0.2), (0.0, -0.5, RB + 3.2), 0.06, 0.05), 0xC7CBCF)
add('metal', sphere('flag_ball', 0.0, -0.5, RB + 3.25, 0.07, 0.07, 0.07, 2), BRASS)
pk.flag_cloth(kit, 0.0, -0.5, RB + 3.15, w=1.5, h=1.0)
# the carved double door (dark wood, raised panels + carved bands), frame, big iron handles
dx0, dx1 = -1.4, 1.4
for xx0, xx1, y0, y1 in ((dx0, dx0 + 0.12, PL, PL + 2.8), (dx1 - 0.12, dx1, PL, PL + 2.8), (dx0, dx1, PL + 2.68, PL + 2.8)):
    add('wood', wb('df', xx0, xx1, FZ - T - 0.02, FZ + 0.05, y0, y1, 0.0), DARK)
for lx0, lx1 in ((dx0 + 0.12, -0.02), (0.02, dx1 - 0.12)):
    add('wood', wb('leaf', lx0, lx1, FZ - 0.14, FZ - 0.06, PL + 0.03, PL + 2.68, 0.004), 0x4A3426)
    for r in range(3):
        for c in range(2):
            px0 = lx0 + 0.12 + c * (lx1 - lx0 - 0.24) / 2 + 0.02
            add('wood', wb('panel', px0, px0 + (lx1 - lx0 - 0.24) / 2 - 0.06, FZ - 0.06, FZ - 0.03, PL + 0.2 + r * 0.8, PL + 0.9 + r * 0.8, 0.003), 0x3A2A1E)
            add('wood', wb('carve', px0 + 0.1, px0 + (lx1 - lx0 - 0.24) / 2 - 0.16, FZ - 0.03, FZ - 0.015, PL + 0.35 + r * 0.8, PL + 0.75 + r * 0.8, 0.0), 0x5A4030)
add('metal', sphere('handle_l', -0.12, FZ - 0.05, PL + 1.3, 0.05, 0.05, 0.05, 1), BRASS)
add('metal', sphere('handle_r', 0.12, FZ - 0.05, PL + 1.3, 0.05, 0.05, 0.05, 1), BRASS)
# office window left: wood frame + iron bars + dark open shutters; notice board right (blank cork)
wx0, wx1 = -5.6, -3.4
for xx0, xx1, y0, y1 in ((wx0, wx0 + 0.08, PL + 1.2, PL + 2.4), (wx1 - 0.08, wx1, PL + 1.2, PL + 2.4), (wx0, wx1, PL + 2.32, PL + 2.4), (wx0, wx1, PL + 1.2, PL + 1.28)):
    add('wood', wb('wf', xx0, xx1, FZ - T - 0.02, FZ + 0.03, y0, y1, 0.0), DARK)
for k in range(1, 18):
    x = wx0 + k * (wx1 - wx0) / 18
    add('metal', wb('bar', x - 0.012, x + 0.012, FZ - 0.14, FZ - 0.09, PL + 1.28, PL + 2.32, 0.0), IRON)
add('wood', wb('shutter_l', wx0 - 0.5, wx0, FZ + 0.02, FZ + 0.06, PL + 1.2, PL + 2.4, 0.0), DARK)
add('wood', wb('shutter_r', wx1, wx1 + 0.5, FZ + 0.02, FZ + 0.06, PL + 1.2, PL + 2.4, 0.0), DARK)
add('paint', wb('notice_cork', 3.2, 5.0, FZ + 0.0, FZ + 0.05, PL + 1.2, PL + 2.4, 0.0), 0x8F6B45)
for nm, a, b, h0, h1 in (('t', 3.14, 5.06, PL + 2.4, PL + 2.46), ('b', 3.14, 5.06, PL + 1.14, PL + 1.2), ('l', 3.14, 3.2, PL + 1.14, PL + 2.46), ('r', 5.0, 5.06, PL + 1.14, PL + 2.46)):
    add('wood', wb('notice_edge_' + nm, a, b, FZ - 0.01, FZ + 0.07, h0, h1, 0.0), 0x6A5A48)
for k in range(5):
    add('paint', wb('notice_sheet', 3.35 + (k % 3) * 0.5, 3.6 + (k % 3) * 0.5, FZ + 0.05, FZ + 0.06, PL + 1.5 + (k // 3) * 0.5, PL + 1.9 + (k // 3) * 0.5, 0.0), (0xF2EFE6, 0xE9E4D4)[k % 2])
# ceiling fan under the verandah slab; two chairs, a matka on a stand, flower pots (the plants are hers)
add('metal', cyl('fan_rod', 0.0, -1.6, RB - 0.3, RB, 0.015, 0.015, 6), 0x3A3C3E)
add('metal', cyl('fan_hub', 0.0, -1.6, RB - 0.37, RB - 0.28, 0.09, 0.09, 10), 0x8A8D90)
for k in range(3):
    a = k * math.tau / 3
    add('metal', limb('fan_blade', (0.08 * math.cos(a), -1.6 + 0.08 * math.sin(a), RB - 0.33), (0.6 * math.cos(a), -1.6 + 0.6 * math.sin(a), RB - 0.35), 0.14, 0.015), 0xD9D6CC)
plastic_chair(kit, 3.2, -1.4, 3.14, 0x8A6A4A)
plastic_chair(kit, 4.0, -1.5, 3.14, 0x8A6A4A)
pk.pot(kit, 5.0, -1.2, 0.6 + 0.35, 0.9)
add('metal', limb('stand_a', (4.8, -1.4, PL), (4.85, -1.2, PL + 0.35), 0.03), 0x4A4C50)
add('metal', limb('stand_b', (5.2, -1.4, PL), (5.15, -1.2, PL + 0.35), 0.03), 0x4A4C50)
for x in (-6.4, -4.4, -0.9, 0.9, 3.6, 6.2):
    add('paint', cyl('pot', x, 0.2, PL, PL + 0.28, 0.14, 0.2, 10), 0xB5693F)
# the open meeting ground: round brick chabutra ~7 m out, left of centre (neem is hers, empty), 2 chairs facing the building
cx, cz, R = -3.4, 7.0, 1.5
pk.brick_ring(kit, cx, cz, R - 0.18, 0, 0.5, 0.36, 24)
add('trim', cyl('chab_cap', cx, cz, 0.5, 0.55, R + 0.1, R + 0.1, 24), 0xA9A69F)
add('paint', cyl('chab_soil', cx, cz, 0.0, 0.5, R - 0.35, R - 0.35, 24), 0x4A3524)
plastic_chair(kit, -1.8, 8.6, 3.14 + 3.14, 0xD9D4C6)       # facing the building (north, -z)
plastic_chair(kit, -0.9, 8.9, 3.14 + 3.14, 0x6A4A32)
# hand pump near the front-right corner
pk.hand_pump(kit, 6.0, 1.9, 0x2E5E3A)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.03})
