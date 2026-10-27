"""
Atta chakki - arch.py Kit, to Places V1/atta_chakki/LAYOUT.md + MAIN_atta_chakki_front_isometric.png.
Run: tools/blender/make.sh atta_chakki atta_chakki_v2
Frame: site-local metres, +z south = front. Shed 6 x 5 m (x[-3,3], z[-5,0]) on a low plinth + cement forecourt 6 x 3 m. White lime-plastered brick walls dusted with flour, rust-red
corrugated tin GABLE roof (ridge along x, gable ends on the sides), 3.4 m to the eaves, short steel exhaust pipe. Front: two faded green wooden doors folded fully open (flat against
the front wall). Inside (walk-in): stone mill with hopper + chute into a steel tin on a steel frame, motor on a concrete block, flat belt over two pulleys, wheat sacks at the back,
hanging beam balance, one bare bulb, flour dust. Forecourt: steel tins + cloth bundles, wooden bench, bucket, broom. One barred window on each side wall (the side walls are solid).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, join_objects, ROOT
from arch import Kit, sack, lathe, ring, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'atta_chakki_v2_raw.glb')
kit = Kit(split_props=False, own=('metal', 'tin'), wood_slot='props')
add = kit.add
rnd = random.Random(47)
WHITE = 0xCFCDC2
GREEN = 0x7DA586
IRON = 0x4A4D52
X0, X1, Z0, Z1 = -3.0, 3.0, -5.0, 0.0
EAVES = 3.4
T = 0.3

add('paint', wb('ground', -4.5, 4.5, -6, 4.2, -0.08, 0.02, 0.0), 0xA38A66)
add('trim', wb('forecourt', X0 - 0.2, X1 + 0.2, Z1 + 0.15, 3.0, 0, 0.12, 0.01), 0xA9A69F)
add('trim', wb('plinth', X0 - 0.1, X1 + 0.1, Z0 - 0.1, Z1 + 0.15, 0, 0.2, 0.01), 0x9F9C92)
add('trim', wb('step', -1.5, 1.5, 3.0, 3.25, 0, 0.06, 0.0), 0xA3A097)
# walls (white, flour-dusted lower brick patches read through the brick texture where the plaster would have fallen)
add('plaster', wb('back', X0, X1, Z0, Z0 + T, 0.2, EAVES, 0.0), WHITE)
add('plaster', wb('gable_back', X0, X1, Z0, Z0 + T, EAVES, EAVES + 1.0, 0.0), WHITE)
for sx0, sx1 in ((X0, X0 + T), (X1 - T, X1)):
    wins = (-3.1, -2.1)
    add('plaster', wb('side_a', sx0, sx1, Z0 + T, wins[0], 0.2, EAVES, 0.0), WHITE)
    add('plaster', wb('side_sill', sx0, sx1, wins[0], wins[1], 0.2, 1.2, 0.0), WHITE)
    add('plaster', wb('side_lin', sx0, sx1, wins[0], wins[1], 2.4, EAVES, 0.0), WHITE)
    add('plaster', wb('side_b', sx0, sx1, wins[1], Z1, 0.2, EAVES, 0.0), WHITE)
    # gable triangle: a prism extruded along z of the profile (x, h)
    xa = sx0 if sx0 < 0 else sx0
    add('plaster', prism_x('gable', sx0, sx1, [(Z0, EAVES), (Z1, EAVES), ((Z0 + Z1) / 2, EAVES + 1.25)]), WHITE)
    for k in range(1, 9):
        z = wins[0] + k * (wins[1] - wins[0]) / 9
        add('metal', wb('bar', (sx0 + sx1) / 2 - 0.03, (sx0 + sx1) / 2 + 0.03, z - 0.012, z + 0.012, 1.2, 2.4, 0.0), IRON)
    add('wood', wb('wframe', sx0 - 0.02, sx1 + 0.02, wins[0], wins[1], 1.14, 1.2, 0.0), 0x6A5A48)
    add('wood', wb('wframe_t', sx0 - 0.02, sx1 + 0.02, wins[0], wins[1], 2.4, 2.46, 0.0), 0x6A5A48)
# front: two posts + lintel with a green door frame, wide opening (4.4 m) so the doors fold fully open
add('plaster', wb('fl', X0, X0 + 0.7, Z1 - T, Z1, 0.2, EAVES, 0.0), WHITE)
add('plaster', wb('fr', X1 - 0.7, X1, Z1 - T, Z1, 0.2, EAVES, 0.0), WHITE)
add('plaster', wb('flin', X0, X1, Z1 - T, Z1, 2.7, EAVES, 0.0), WHITE)
add('wood', wb('door_head', X0 + 0.65, X1 - 0.65, Z1 - T - 0.02, Z1 + 0.05, 2.55, 2.72, 0.0), GREEN)
for sx in (X0 + 0.65, X1 - 0.75):
    add('wood', wb('door_post', sx, sx + 0.1, Z1 - T - 0.02, Z1 + 0.05, 0.2, 2.6, 0.0), GREEN)
# the doors, folded fully open against the outside front wall (leaf z-brace pattern)
for sg in (-1, 1):
    xo = sg * 2.28
    add('wood', wb('door_leaf', xo - 0.55, xo + 0.55, Z1 + 0.06, Z1 + 0.1, 0.2, 2.5, 0.0) if False else wb('door_leaf', min(sg * 2.35, sg * 3.0) - 0.0, max(sg * 2.35, sg * 3.0), Z1 + 0.06, Z1 + 0.11, 0.2, 2.5, 0.0), GREEN)
    x0d, x1d = (sg * 2.38, sg * 2.98)
    xa, xb = min(x0d, x1d), max(x0d, x1d)
    for h in (0.35, 1.3, 2.3):
        add('wood', wb('door_rail', xa, xb, Z1 + 0.11, Z1 + 0.14, h - 0.08, h + 0.08, 0.0), 0x4F7653)
    add('wood', limb('door_brace', (xa, Z1 + 0.125, 0.35) if sg > 0 else (xb, Z1 + 0.125, 0.35), (xb, Z1 + 0.125, 2.3) if sg > 0 else (xa, Z1 + 0.125, 2.3), 0.07, 0.03), 0x4F7653)
# tin gable roof: ridge along x (rust red), rafters, a ridge cap, short steel exhaust pipe through the back slope
RIDGE = EAVES + 1.25
slope = prism_x('roof_slab_n', X0 - 0.45, X1 + 0.45, [(Z0 - 0.5, EAVES - 0.1), ((Z0 + Z1) / 2, RIDGE + 0.03), ((Z0 + Z1) / 2, RIDGE + 0.1), (Z0 - 0.5, EAVES - 0.03)])
add('tin', slope, 0xA65A4C)
add('tin', prism_x('roof_slab_s', X0 - 0.45, X1 + 0.45, [((Z0 + Z1) / 2, RIDGE + 0.03), (Z1 + 0.6, EAVES - 0.1), (Z1 + 0.6, EAVES - 0.03), ((Z0 + Z1) / 2, RIDGE + 0.1)]), 0xA94836)
add('metal', limb('ridge_cap', (X0 - 0.45, (Z0 + Z1) / 2, RIDGE + 0.12), (X1 + 0.45, (Z0 + Z1) / 2, RIDGE + 0.12), 0.25, 0.08), 0x8A4A3A)
for k in range(7):
    x = X0 - 0.2 + k * (X1 - X0 + 0.4) / 6
    add('wood', limb('rafter', (x, Z0 - 0.1, EAVES - 0.2), (x, (Z0 + Z1) / 2, RIDGE - 0.15), 0.07), 0x6A4A32)
    add('wood', limb('rafter', (x, Z1 + 0.5, EAVES - 0.2), (x, (Z0 + Z1) / 2, RIDGE - 0.15), 0.07), 0x6A4A32)
add('metal', cyl('exhaust', 1.8, -3.0, RIDGE - 0.6, RIDGE + 0.55, 0.08, 0.08, 10), 0x7C8186)
add('metal', cyl('exhaust_cap', 1.8, -3.0, RIDGE + 0.55, RIDGE + 0.6, 0.15, 0.15, 10), 0x6C7074)
# floor: cement, flour-dusted
add('trim', wb('floor', X0 + T, X1 - T, Z0 + T, Z1, 0.2, 0.25, 0.0), 0x9A978F)
add('paint', wb('flour_dust', -1.2, 1.2, -3.5, -1.0, 0.25, 0.255, 0.0), 0xE4E2DA)
# stone mill on a steel frame: frame, stone disc (two stones), hopper, chute + steel tin
mx, mz = -0.2, -2.5
for dx in (-0.8, 0.8):
    for dz in (-0.55, 0.55):
        add('metal', limb('frame_leg', (mx + dx, mz + dz, 0.25), (mx + dx, mz + dz, 0.95), 0.1), 0x6C7074)
add('metal', wb('frame_top', mx - 0.9, mx + 0.9, mz - 0.65, mz + 0.65, 0.95, 1.02, 0.01), 0x7C8186)
add('metal', wb('frame_brace', mx - 0.8, mx + 0.8, mz - 0.5, mz - 0.45, 0.45, 0.5, 0.0), 0x6C7074)
add('tin', lathe('stone_lower', mx, mz, [(0.0, 1.02), (0.62, 1.02), (0.66, 1.06), (0.66, 1.2), (0.62, 1.23), (0.0, 1.23)], seg=28), 0xB4B1A9) if False else None
add('trim', lathe('stone_lower', mx, mz, [(0.0, 1.02), (0.62, 1.02), (0.66, 1.06), (0.66, 1.2), (0.0, 1.2)], seg=28), 0xA6A39B)
add('trim', lathe('stone_upper', mx, mz, [(0.0, 1.2), (0.6, 1.2), (0.62, 1.3), (0.55, 1.34), (0.0, 1.34)], seg=28), 0xB1AEA6)
add('metal', lathe('hopper', mx, mz, [(0.14, 1.34), (0.5, 1.9), (0.52, 1.95), (0.48, 1.95), (0.1, 1.34)], seg=4), 0x7C8186)
add('metal', cyl('hopper_neck', mx, mz, 1.3, 1.4, 0.1, 0.1, 8), 0x6C7074)
add('metal', limb('chute', (mx + 0.55, mz, 1.22), (mx + 0.85, mz, 0.9), 0.2, 0.04), 0x8A8F94)
add('metal', cyl('steel_tin', mx + 0.9, mz, 0.25, 0.8, 0.22, 0.22, 14), STEEL)
add('paint', cyl('flour_in_tin', mx + 0.9, mz, 0.78, 0.8, 0.2, 0.2, 14), 0xEEEDE6)
# motor on a concrete block + flat belt over two pulleys
bx, bz = 1.9, -2.5
add('trim', wb('motor_block', bx - 0.5, bx + 0.5, bz - 0.4, bz + 0.4, 0.25, 0.7, 0.01), 0xA6A39B)
add('metal', cyl('motor_body', bx, bz, 0.7, 1.15, 0.28, 0.28, 14), 0x4F5A64)
for k in range(5):
    add('metal', cyl('motor_fin', bx, bz, 0.72 + k * 0.08, 0.76 + k * 0.08, 0.31, 0.31, 14), 0x424B53)
pu_big = (mx + 0.9, 1.15)
add('metal', ring('pulley_a', mx + 0.95, mz - 0.1, 1.55, 0.3, 0.06, axis='x'), 0x4A3F36)
add('metal', ring('pulley_b', bx - 0.5, bz - 0.1, 0.95, 0.15, 0.05, axis='x'), 0x4A3F36)
add('paint', limb('belt_top', (mx + 1.0, mz - 0.1, 1.85), (bx - 0.45, bz - 0.1, 1.1), 0.12, 0.012), 0x2A241E)
add('paint', limb('belt_bot', (mx + 1.0, mz - 0.1, 1.25), (bx - 0.45, bz - 0.1, 0.8), 0.12, 0.012), 0x2A241E)
add('metal', limb('mill_shaft', (mx + 0.6, mz - 0.1, 1.55), (mx + 1.0, mz - 0.1, 1.55), 0.06), 0x6C7074)
# wheat sacks at the back, hanging beam balance, bare bulb
for k in range(7):
    sack(kit, -2.3 + (k % 3) * 0.55, -4.3 + (k // 3) * 0.1, (k // 3) * 0.3 + 0.25, 0.15 * (k % 2), (0xB59A66, 0xC9B07C, 0xA88A58)[k % 3], w=0.6, d=0.42, hh=0.55)
bx2, bz2 = 0.8, -3.9
add('wood', limb('balance_hang', (bx2, bz2, EAVES + 0.2), (bx2, bz2, 2.6), 0.03), 0x6A4A32)
add('metal', limb('balance_beam', (bx2 - 0.7, bz2, 2.6), (bx2 + 0.7, bz2, 2.6), 0.05, 0.03), 0x3A3C3E)
for sg in (-1, 1):
    px = bx2 + sg * 0.65
    for dz in (-0.12, 0.12):
        add('metal', limb('chain', (px, bz2, 2.58), (px, bz2 + dz, 1.9), 0.012), 0x2A2A2C)
    add('metal', lathe('pan', px, bz2, [(0.0, 1.85), (0.2, 1.88), (0.24, 1.94), (0.2, 1.94), (0.0, 1.88)], seg=12), 0x3A3C3E)
add('paint', sphere('bulb', 0.0, -1.2, 3.0, 0.07, 0.07, 0.09, 1), 0xF4E9B0)
add('metal', limb('bulb_cord', (0.0, -1.2, EAVES + 0.3), (0.0, -1.2, 3.07), 0.012), 0x1B1B1D)
# forecourt: steel tins + cloth bundles in a row, bench, bucket, broom
for k in range(6):
    x = -2.7 + k * 0.52
    add('metal', cyl('tin', x, 2.2, 0.12, 0.7, 0.2, 0.22, 14), STEEL)
    add('metal', cyl('tin_lid', x, 2.2, 0.7, 0.74, 0.23, 0.23, 14), 0x8A8E93)
    if k % 2 == 0:
        sack(kit, x + 0.1, 1.6, 0.12, 0.3 * k, (0xD9CDAF, 0xB89A64)[(k // 2) % 2], w=0.34, d=0.26, hh=0.35)
pk.bench(kit, -0.4, 1.4, 1.0, 0.44, 0.4)
pk.bucket(kit, 2.5, 1.0)
add('wood', limb('broom', (3.3, 0.7, 0.12), (3.45, 0.55, 1.15), 0.03), 0x8A6A48)
add('paint', limb('broom_head', (3.25, 0.75, 0.12), (3.3, 0.7, 0.45), 0.2, 0.06), 0x9A8A58)

# flour scoops: steel cup with a short wooden handle, one on a forecourt tin lid, one leant at the sacks
for sx, sy, sz, ang in ((-2.7 + 2 * 0.52, 2.2, 0.74, 0.0), (-1.5, -3.55, 0.82, 0.5)):
    add('metal', lathe('scoop_cup', sx, sy, [(0.0, sz), (0.07, sz + 0.01), (0.1, sz + 0.07), (0.085, sz + 0.07), (0.0, sz + 0.02)], seg=10), 0x9AA0A6)
    add('wood', limb('scoop_handle', (sx + 0.08, sy, sz + 0.06), (sx + 0.08 + 0.22 * math.cos(ang), sy + 0.22 * math.sin(ang), sz + 0.1), 0.014), 0x7A5A3A)

TINTS = {'hb_plaster': '#D6D8DA', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#C9C4B8', 'hb_tin': '#FFFFFF', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.05})
