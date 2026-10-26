"""
Dharam kanta (weighbridge) - arch.py Kit, to Places V1/dharam_kanta/LAYOUT.md + MAIN_dharam_kanta_front_isometric_LOWRES.png. Run: tools/blender/make.sh dharam_kanta_v2 dharam_kanta_v2
Frame: site-local metres, +z south = front. Concrete apron 20 x 10 m: x[-10,10] z[-5,5]. Steel platform 12 x 3.5 m along the apron's front half (x[-6,6] z[0.8,4.3]), low surface-mounted,
short ramps at both ends, yellow/black striped kerbs, 4 striped corner bollards. Cabin pad ~8 x 6 m BEHIND the apron (z[-11,-5]): operator cabin 3.5 x 3 m, 3.2 m tall, cream with a grey
base band, steel door, window + counter facing the platform, tin sunshade, black tank. Blank weight-display board on a 4 m pole beside the cabin, facing the platform. Chair, bench, water pot,
tulsi pot, bucket by the cabin door.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, join_objects, ROOT
from arch import Kit, plastic_chair, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'dharam_kanta_v2_raw.glb')
kit = Kit(split_props=False, own=('metal', 'tin'), wood_slot='props')
add = kit.add
YEL, BLK = 0xF0C41C, 0x1B1B1D
CONC = 0xA9A69F
add('paint', wb('ground', -12, 12, -13, 7, -0.08, 0.02, 0.0), 0xA38A66)
add('trim', wb('apron', -10, 10, -5, 5, 0, 0.12, 0.01), CONC)
add('trim', wb('pad', -4.5, 4.5, -11, -5, 0, 0.12, 0.01), 0xB0ADA4)
for x in (-6.7, -3.3, 0, 3.3, 6.7):
    add('paint', wb('joint', x - 0.015, x + 0.015, -5, 5, 0.12, 0.124, 0.0), 0x6E6B64)
# steel platform: deck with chequer plate, side girders, striped kerbs, ramps
PX0, PX1, PZ0, PZ1 = -6.0, 6.0, 0.8, 4.3
add('metal', wb('deck', PX0, PX1, PZ0, PZ1, 0.12, 0.3, 0.01), 0x9A9FA4)
add('metal', wb('deck_plate', PX0 + 0.05, PX1 - 0.05, PZ0 + 0.1, PZ1 - 0.1, 0.3, 0.32, 0.0), 0xB2B7BB)
for k in range(1, 12):
    add('metal', wb('chequer', PX0 + k - 0.03, PX0 + k + 0.03, PZ0 + 0.1, PZ1 - 0.1, 0.32, 0.325, 0.0), 0x8C9094)
add('metal', wb('mid_seam', -0.03, 0.03, PZ0 + 0.1, PZ1 - 0.1, 0.32, 0.326, 0.0), 0x4A4D52)
for z0, z1 in ((PZ0 - 0.15, PZ0 + 0.1), (PZ1 - 0.1, PZ1 + 0.15)):
    for k in range(24):
        add('paint', wb('kerb_stripe', PX0 + k * 0.5, PX0 + (k + 1) * 0.5, z0, z1, 0.3, 0.38, 0.0), YEL if k % 2 == 0 else BLK)
for sg in (-1, 1):
    x0, x1 = (PX0 - 2.0, PX0) if sg < 0 else (PX1, PX1 + 2.0)
    add('metal', prism_x('ramp', x0, x1, [(PZ0, 0.12), (PZ1, 0.12), (PZ1, 0.3 if sg > 0 else 0.12), (PZ0, 0.3)]) if False else wb('ramp_flat', x0, x1, PZ0, PZ1, 0.12, 0.2, 0.0), 0x808589)
    # sloped ramp: a limb from the apron to the deck edge
    add('metal', limb('ramp', (x0 if sg < 0 else x1, (PZ0 + PZ1) / 2, 0.12), (PX0 if sg < 0 else PX1, (PZ0 + PZ1) / 2, 0.3), PZ1 - PZ0, 0.05), 0x808589)
    for k in range(4):
        zx = x0 + (k + 0.5) * 0.5 if sg < 0 else x1 - (k + 0.5) * 0.5
    for z in (PZ0, PZ1):
        for k in range(4):
            xa = (x0 + k * 0.5) if sg < 0 else (x1 - (k + 1) * 0.5)
            add('paint', wb('ramp_stripe', xa, xa + 0.5, z - 0.1 if z == PZ0 else z - 0.0, z + 0.0 if z == PZ0 else z + 0.1, 0.13, 0.18, 0.0), YEL if k % 2 == 0 else BLK)
# four striped bollards at the corners
for (x, z) in ((PX0 - 2.3, PZ0 - 0.5), (PX0 - 2.3, PZ1 + 0.5), (PX1 + 2.3, PZ0 - 0.5), (PX1 + 2.3, PZ1 + 0.5)):
    for k in range(5):
        add('paint', cyl('bollard', x, z, 0.12 + k * 0.22, 0.12 + (k + 1) * 0.22, 0.13, 0.13, 10), YEL if k % 2 == 0 else BLK)
    add('paint', sphere('bollard_cap', x, z, 1.22, 0.13, 0.13, 0.07, 1), BLK)
# cabin 3.5 x 3, 3.2 m tall, cream + grey base band, steel door, window + counter facing the platform (+z), tin sunshade, black tank
CX0, CX1, CZ0, CZ1 = -1.75, 1.75, -9.5, -6.5
CH = 3.2
T = 0.25
add('plaster', wb('c_back', CX0, CX1, CZ0, CZ0 + T, 0.12, CH, 0.0), 0xEFE6C8)
add('plaster', wb('c_l', CX0, CX0 + T, CZ0 + T, CZ1, 0.12, CH, 0.0), 0xEFE6C8)
add('plaster', wb('c_r', CX1 - T, CX1, CZ0 + T, CZ1, 0.12, CH, 0.0), 0xEFE6C8)
# front wall: window left (x -1.4..0.3 at 1.0-2.4), door right (0.7..1.5)
cur = CX0
for a, b, lo, hi in ((-1.4, 0.2, 1.0, 2.3), (0.7, 1.5, 0.12, 2.3)):
    add('plaster', wb('c_f', cur, a, CZ1 - T, CZ1, 0.12, CH, 0.0), 0xEFE6C8)
    if lo > 0.12:
        add('plaster', wb('c_f_sill', a, b, CZ1 - T, CZ1, 0.12, lo, 0.0), 0xEFE6C8)
    add('plaster', wb('c_f_lin', a, b, CZ1 - T, CZ1, hi, CH, 0.0), 0xEFE6C8)
    cur = b
add('plaster', wb('c_f', cur, CX1, CZ1 - T, CZ1, 0.12, CH, 0.0), 0xEFE6C8)
add('plinth', wb('c_band_f', CX0 - 0.02, CX1 + 0.02, CZ1 - T - 0.03, CZ1 + 0.03, 0.12, 0.8, 0.0), 0x8E9196)
add('plinth', wb('c_band_b', CX0 - 0.02, CX1 + 0.02, CZ0 - 0.03, CZ0 + 0.03, 0.12, 0.8, 0.0), 0x8E9196)
add('plinth', wb('c_band_l', CX0 - 0.03, CX0 + 0.03, CZ0, CZ1, 0.12, 0.8, 0.0), 0x8E9196)
add('plinth', wb('c_band_r', CX1 - 0.03, CX1 + 0.03, CZ0, CZ1, 0.12, 0.8, 0.0), 0x8E9196)
# window frame + glass, counter ledge outside; steel door
for xx0, xx1, y0, y1 in ((-1.4, -1.32, 1.0, 2.3), (0.12, 0.2, 1.0, 2.3), (-1.4, 0.2, 2.22, 2.3), (-1.4, 0.2, 1.0, 1.08)):
    add('metal', wb('wf', xx0, xx1, CZ1 - T - 0.02, CZ1 + 0.03, y0, y1, 0.0), 0x5C6064)
add('paint', wb('glass', -1.32, 0.12, CZ1 - 0.14, CZ1 - 0.12, 1.08, 2.22, 0.0), 0xAFC8D2)
add('wood', wb('counter', -1.5, 0.3, CZ1, CZ1 + 0.4, 0.95, 1.02, 0.006))
add('metal', wb('door', 0.78, 1.42, CZ1 - 0.12, CZ1 - 0.06, 0.12, 2.25, 0.004), 0x7C8186)
add('metal', wb('door_frame', 0.7, 1.5, CZ1 - 0.2, CZ1 + 0.02, 2.2, 2.3, 0.0), 0x5C6064)
add('paint', wb('door_handle', 1.28, 1.33, CZ1 - 0.06, CZ1 + 0.02, 1.0, 1.2, 0.0), STEEL)
# tin sunshade over the window, sloped; roof slab + parapet + tank
add('tin', prism_x('sunshade', -1.7, 0.5, [(CZ1 + 0.0, 2.55), (CZ1 + 0.9, 2.25), (CZ1 + 0.9, 2.28), (CZ1 + 0.0, 2.58)]), 0xA0A4A8)
add('trim', wb('slab', CX0 - 0.2, CX1 + 0.2, CZ0 - 0.2, CZ1 + 0.2, CH, CH + 0.2, 0.01), 0xB4B1A9)
for (a, b, c, d) in ((CX0, CX1, CZ0, CZ0 + 0.18), (CX0, CX1, CZ1 - 0.18, CZ1), (CX0, CX0 + 0.18, CZ0 + 0.18, CZ1 - 0.18), (CX1 - 0.18, CX1, CZ0 + 0.18, CZ1 - 0.18)):
    add('plaster', wb('par', a, b, c, d, CH + 0.2, CH + 0.8, 0.0), 0xEFE6C8)
    add('trim', wb('par_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, CH + 0.8, CH + 0.86, 0.0), 0xA9A69F)
add('paint', cyl('tank', -0.6, -8.4, CH + 0.2, CH + 1.4, 0.55, 0.55, 18), 0x1C1C1F)
add('paint', sphere('tank_dome', -0.6, -8.4, CH + 1.4, 0.55, 0.55, 0.2, 2), 0x1C1C1F)
for hr in (0.5, 1.0):
    add('paint', cyl('tank_rib', -0.6, -8.4, CH + hr, CH + hr + 0.05, 0.575, 0.575, 18), 0x2A2A2E)
add('trim', wb('floor', CX0 + T, CX1 - T, CZ0 + T, CZ1 - T, 0.12, 0.16, 0.0), 0x9C988E)
# weight display board on a 4 m pole beside the cabin, facing the platform
bx, bz = 3.2, -5.9
add('metal', limb('disp_pole', (bx, bz, 0.12), (bx, bz, 4.0), 0.1), 0x6C7074)
add('metal', wb('disp_frame', bx - 1.0, bx + 1.0, bz - 0.1, bz + 0.1, 2.7, 3.9, 0.02), 0x4A4D52)
add('paint', wb('disp_screen', bx - 0.9, bx + 0.9, bz + 0.1, bz + 0.12, 2.8, 3.8, 0.0), 0x1A1C20)
# by the cabin door: chair, bench, water pot on a stand, tulsi pot, bucket
plastic_chair(kit, -2.7, -5.6, 3.14, 0xD9D4C6)
pk.bench(kit, 1.9, 3.1, -6.3, 0.44, 0.4)
pk.pot(kit, 2.2, -7.0, 0.7, 0.9)
for sx in (2.0, 2.4):
    add('metal', limb('stand_leg', (sx, -7.1, 0.12), (sx, -7.0, 0.72), 0.03), 0x4A4C50)
add('paint', cyl('tulsi_pot', -2.6, -7.0, 0.12, 0.45, 0.2, 0.26, 10), 0xB5693F)
pk.bucket(kit, 2.4, -5.8, 0x7C8084)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_tin': '#FFFFFF', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.03})
