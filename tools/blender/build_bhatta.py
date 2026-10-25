"""
Bhatta (brick kiln) - arch.py Kit, to Places V1/bhatta/LAYOUT.md + MAIN_bhatta_views.png. Run: tools/blender/make.sh bhatta bhatta_v2
Frame: site-local metres, +z south = front. Dusty reddish earth block 80 x 50 m: x[-40,40] z[-25,25].
Kiln: long oval trench kiln 50 x 18 m (x[-25,25] z[-17,1]), 2 m high mound of ash-covered bricks with rows of round iron feed lids. Chimney: tapering old red brick, 30 m, 3 m wide at base,
darker bands, blackened top, at the back edge of the kiln. Front-left: drying field of raw grey-brown bricks in long lattice rows (25 x 15 m). Front-right: four cubes of finished red bricks
(3 x 1.5 x 1.5 m). Left edge: clay pit, moulding bench with wooden moulds, water drum, buckets, sand heaps. Right: brick-post tin shed with charpai + clay pot, hand pump on a cement platform.
Coal heap by the kiln, wheelbarrow, shovels. (Smoke is an effect, not geometry.)
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, join_objects, ROOT
from arch import Kit, lathe, ring, STEEL
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'bhatta_v2_raw.glb')
kit = Kit(split_props=False, own=('metal', 'tin'), wood_slot='props')
add = kit.add
rnd = random.Random(61)
EARTH = 0xA8643F

add('paint', wb('patch', -40, 40, -25, 25, -0.4, 0.03, 0.0), EARTH)
for (x, z, w, d, c) in ((-30, 12, 20, 14, 0x9A5A3A), (22, -3, 16, 10, 0xB06E48), (0, 20, 30, 8, 0x9F6040), (-10, -22, 30, 4, 0xB06E48)):
    add('paint', wb('patch_tone', x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0.03, 0.036, 0.0), c)
# ---- kiln: stadium 50 x 18, 2 m mound, brick sides, ash top with iron lids
KX0, KX1, KZ0, KZ1 = -25.0, 25.0, -17.0, 1.0
R = 9.0
KZc = (KZ0 + KZ1) / 2
add('brick', wb('kiln_mid', KX0 + R, KX1 - R, KZ0, KZ1, 0, 2.0, 0.02))
for sg in (-1, 1):
    cx = (KX0 + R) if sg < 0 else (KX1 - R)
    add('brick', cyl('kiln_end', cx, KZc, 0, 2.0, R, R - 0.4, 32))
# sloped brick-ash batter: slightly wider footing, then an ash top 
add('brick', wb('kiln_foot', KX0 + R, KX1 - R, KZ0 - 0.4, KZ1 + 0.4, 0, 0.6, 0.0))
for sg in (-1, 1):
    cx = (KX0 + R) if sg < 0 else (KX1 - R)
    add('brick', cyl('kiln_end_foot', cx, KZc, 0, 0.6, R + 0.4, R + 0.3, 32))
add('paint', wb('ash_mid', KX0 + R, KX1 - R, KZ0 + 0.5, KZ1 - 0.5, 2.0, 2.12, 0.0), 0x9C9A94)
for sg in (-1, 1):
    cx = (KX0 + R) if sg < 0 else (KX1 - R)
    add('paint', cyl('ash_end', cx, KZc, 2.0, 2.12, R - 0.9, R - 1.0, 32), 0x9C9A94)
for k in range(13):
    for row in (-1, 1):
        x = KX0 + R + 1.0 + k * 2.6 if False else -23.0 + k * 3.6
        z = KZc + row * 3.6
        if abs(x) > 24:
            continue
        add('metal', cyl('lid', x, z, 2.12, 2.2, 0.55, 0.55, 14), 0x3A2E26)
        add('metal', cyl('lid_rim', x, z, 2.2, 2.25, 0.42, 0.42, 14), 0x4A3A2E)
# ash-dusted brick courses on the sides: darker lines drawn as thin rings (read as stacked bricks under the brick texture)
# ---- chimney 30 m, 3 m base, tapering, bands, blackened top
CX, CZ = -12.0, -19.5
add('brick', wb('chim_plinth', CX - 2.4, CX + 2.4, CZ - 2.4, CZ + 2.4, 0, 3.2, 0.02))
add('trim', wb('chim_plinth_cap', CX - 2.55, CX + 2.55, CZ - 2.55, CZ + 2.55, 3.2, 3.4, 0.01), 0x8C8478)
prof = [(1.55, 3.4), (1.4, 12.0), (1.28, 22.0), (0.95, 30.0)]
add('brick', lathe('chimney', CX, CZ, [(r, h) for r, h in prof], seg=16), 0xB4705A)
add('brick', lathe('chim_band1', CX, CZ, [(1.43, 11.6), (1.43, 12.4)], seg=16), 0x6E4030)
add('brick', lathe('chim_band2', CX, CZ, [(1.32, 19.6), (1.32, 20.4)], seg=16), 0x6E4030)
add('brick', lathe('chim_band3', CX, CZ, [(1.18, 25.6), (1.18, 26.2)], seg=16), 0x6E4030)
add('paint', lathe('chim_soot', CX, CZ, [(0.97, 28.4), (0.97, 30.0), (0.92, 30.1)], seg=16), 0x2A2420)
add('paint', lathe('chim_rim', CX, CZ, [(1.1, 29.85), (1.1, 30.1), (0.85, 30.1)], seg=16), 0x3A332E)
add('metal', limb('chim_ladder_l', (CX + 1.45, CZ + 0.2, 3.4), (CX + 1.05, CZ + 0.2, 28.0), 0.04), 0x3A3C3E)
# ---- drying field: raw bricks in long lattice rows (front-left, 25 x 15 m)
RAW = 0x8A7A66
x0, x1, z0, z1 = -34.0, -9.0, 8.0, 23.0
n = 0
zz = z0
while zz < z1 - 0.5:
    layer_h = 0.075
    for lay in range(2):
        if lay == 0:
            add('brick', wb('raw_row', x0, x1, zz, zz + 0.23, 0.03, 0.03 + layer_h, 0.0), RAW)
        else:
            # cross-laid bricks every 0.9 m every other pair of rows
            if int(zz / 0.7) % 2 == 0:
                for xx in [x0 + 0.4 + k * 1.1 for k in range(int((x1 - x0) / 1.1))]:
                    add('brick', wb('raw_cross', xx, xx + 0.11, zz - 0.12, zz + 0.35, 0.03 + layer_h, 0.03 + 2 * layer_h, 0.0), RAW)
    zz += 0.62
# ---- finished red brick cubes 3 x 1.5 x 1.5, front-right; courses staggered a little
for (cx, cz) in ((10.0, 8.0), (14.5, 8.0), (10.0, 13.5), (14.5, 13.5)):
    # one real-brick block per cube (3 x 1.5 x 1.5): the brick texture carries the courses and joints at true scale
    add('brick', wb('cube', cx - 1.5, cx + 1.5, cz - 0.75, cz + 0.75, 0.03, 1.53, 0.02), 0xE08A60)
    add('brick', wb('cube_top_course', cx - 1.4, cx + 1.4, cz - 0.7, cz + 0.7, 1.53, 1.6, 0.0), 0xD87A55)
# ---- left edge: clay pit, moulding bench with moulds, water drum, buckets, sand heaps
add('brick', wb('pit_rim_n', -39.0, -33.0, 0.0, 0.4, 0, 0.3, 0.0), 0x7A5A44)
add('brick', wb('pit_rim_s', -39.0, -33.0, 3.4, 3.8, 0, 0.3, 0.0), 0x7A5A44)
add('brick', wb('pit_rim_w', -39.0, -38.6, 0.4, 3.4, 0, 0.3, 0.0), 0x7A5A44)
add('brick', wb('pit_rim_e', -33.4, -33.0, 0.4, 3.4, 0, 0.3, 0.0), 0x7A5A44)
add('paint', wb('pit_clay', -38.6, -33.4, 0.4, 3.4, 0.0, 0.18, 0.0), 0x5A4636)
add('wood', wb('bench_top', -37.0, -34.0, 5.0, 5.8, 0.55, 0.62, 0.006))
for x in (-36.8, -34.2):
    for z in (5.1, 5.7):
        add('wood', wb('bench_leg', x - 0.04, x + 0.04, z - 0.04, z + 0.04, 0, 0.55, 0.0))
for k in range(3):
    add('wood', wb('mould', -36.8 + k * 0.9, -36.8 + k * 0.9 + 0.7, 5.2, 5.6, 0.62, 0.7, 0.003), 0x6A4A32)
    add('paint', wb('mould_clay', -36.7 + k * 0.9, -36.7 + k * 0.9 + 0.6, 5.25, 5.55, 0.66, 0.7, 0.0), 0x6A5642)
add('metal', cyl('water_drum', -38.0, 7.0, 0, 0.95, 0.3, 0.3, 14), 0x5C6F7A)
for hh in (0.25, 0.7):
    add('metal', cyl('drum_rib', -38.0, 7.0, hh, hh + 0.04, 0.32, 0.32, 14), 0x4A5A64)
for k, (x, z) in enumerate(((-37.0, 8.2), (-36.4, 7.8), (-37.4, 9.0))):
    pk.bucket(kit, x, z, 0x7C8084 if k % 2 else 0x9FA3A7)
for (x, z, r, h) in ((-33.0, -20.0, 3.2, 2.0), (-29.0, -16.0, 2.4, 1.4), (-37.0, -13.0, 2.0, 1.2)):
    add('paint', lathe('sand_heap', x, z, [(r, 0.0), (r * 0.85, h * 0.4), (r * 0.5, h * 0.8), (r * 0.15, h), (0.0, h)], seg=14), 0xC9A878)
# ---- right: brick-post tin shed with charpai + clay pot, hand pump on a cement platform
sx0, sx1, sz0, sz1 = 28.0, 34.0, -12.0, -6.0
for (x, z) in ((sx0, sz0), (sx1, sz0), (sx0, sz1), (sx1, sz1)):
    add('brick', wb('post', x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 3.0 if z == sz0 else 2.5, 0.01))
add('brick', wb('shed_back', sx0 - 0.3, sx1 + 0.3, sz0 - 0.2, sz0 + 0.2, 0, 3.0, 0.0))
add('brick', wb('shed_side', sx1 - 0.2, sx1 + 0.2, sz0, sz1, 0, 2.5, 0.0)) if False else None
for k in range(6):
    xa = sx0 - 0.5 + k * 1.2
    add('tin', prism_x('roof_sheet', xa, xa + 1.18, [(sz0 - 0.4, 3.1), (sz1 + 0.5, 2.6), (sz1 + 0.5, 2.65), (sz0 - 0.4, 3.15)]), (0x8C5A44, 0x7A4F3C, 0x9A9EA0, 0xA0654A, 0x7F8588, 0x8C5A44)[k])
for z, h in ((sz0, 3.0), (sz1, 2.5)):
    add('wood', limb('beam', (sx0 - 0.3, z, h), (sx1 + 0.3, z, h), 0.15, 0.12))
pk.charpai(kit, 31.0, -9.0, 0.0)
pk.pot(kit, 33.2, -7.0, 0.0, 1.0)
cx, cz = 24.0, 3.0
add('trim', wb('pump_plat', cx - 1.3, cx + 1.3, cz - 1.2, cz + 1.2, 0, 0.15, 0.01), 0xA9A69F)
add('trim', wb('pump_trough', cx + 0.2, cx + 1.1, cz - 0.3, cz + 0.3, 0.15, 0.4, 0.01), 0xA09D95)
add('metal', cyl('pump_base', cx - 0.5, cz, 0.15, 0.55, 0.16, 0.13, 10), 0x2E5E3A)
add('metal', cyl('pump_col', cx - 0.5, cz, 0.55, 1.3, 0.085, 0.07, 10), 0x2E5E3A)
add('metal', limb('pump_handle', (cx - 0.5, cz, 1.22), (cx - 1.05, cz, 1.55), 0.055), 0x2E5E3A)
add('metal', limb('pump_spout', (cx - 0.5, cz, 0.95), (cx - 0.1, cz, 0.75), 0.065), 0x2E5E3A)
# ---- coal heap by the kiln, wheelbarrow, two shovels
add('paint', lathe('coal_heap', 5.0, -19.5, [(3.0, 0.0), (2.6, 0.5), (1.8, 1.0), (0.9, 1.4), (0.0, 1.6)], seg=12), 0x242220)
for k in range(10):
    a = rnd.uniform(0, math.tau)
    add('paint', sphere('coal_lump', 5.0 + rnd.uniform(-2.4, 2.4), -19.5 + rnd.uniform(-2.0, 2.0), 0.18, 0.18, 0.16, 0.14, 1), 0x2E2B28)
wx, wz = 18.0, 4.5
add('metal', wb('barrow_tray', wx - 0.4, wx + 0.4, wz - 0.3, wz + 0.3, 0.38, 0.7, 0.02), 0x6C7074)
add('metal', ring('barrow_wheel', wx + 0.0, wz + 0.55, 0.25, 0.25, 0.05, axis='x'), 0x1B1B1D)
for sg in (-1, 1):
    add('wood', limb('barrow_handle', (wx + sg * 0.3, wz - 0.3, 0.55), (wx + sg * 0.35, wz - 1.2, 0.85), 0.04), 0x8A6A48)
for k, (x, z) in enumerate(((7.5, 3.2), (8.4, 3.5))):
    add('wood', limb('shovel_h', (x, z, 0.05), (x + 0.5, z + 0.1, 1.1), 0.035), 0x8A6A48)
    add('metal', wb('shovel_blade', x - 0.12, x + 0.12, z - 0.1, z + 0.1, 0.0, 0.3, 0.003), STEEL)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_brick': '#FFFFFF', 'hb_tin': '#FFFFFF', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.08})
