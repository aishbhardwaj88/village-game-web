"""
Khalihan (threshing floor) - arch.py Kit, to Places V1/khalihan/LAYOUT.md + MAIN_khalihan_views.png. Run: tools/blender/make.sh khalihan khalihan_v2
Frame: site-local metres, +z south = front. Dry hard earth block 30 x 24 m: x[-12,12] z[-15,15]?? (24 wide x 30 deep): x[-12,12], z[-15,15].
Centre: round gobar/mud-plastered threshing floor 14 m across. Back: red-orange thresher (drum, feed tray, tall curved chute) belt-driven by a small motor, chute pointing at the (hers) bhusa heap
at the back-left. Right: wooden tripod beam scale (the tall conical straw stack is hers: its mud-plastered footing ring is left empty). Front-right: blue tarp (the grain heap is hers), soop + rake,
a row of stitched jute sacks, pitchfork, broom. Front-left: tarp shade on 4 bamboo poles with a charpai, clay pot, tumbler. The wheat bundles / bhusa heap / straw stack are crops: not built.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, sack, lathe, ring, STEEL
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'khalihan_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
add = kit.add
rnd = random.Random(71)
RED = 0xB8522F
add('paint', wb('block', -12, 12, -15, 15, -0.5, 0.04, 0.0), 0xC8AE8A)
add('paint', wb('floor_ring', -0.1, 0.1, -0.1, 0.1, 0.04, 0.041, 0.0), 0xBFA27A)
add('paint', cyl('gobar_floor', -2.0, 0.0, 0.04, 0.09, 7.0, 7.0, 40), 0xAA9170)
for k in range(8):
    a = rnd.uniform(0, math.tau)
    add('paint', cyl('floor_wear', -2.0 + 4 * math.cos(a), 4 * math.sin(a), 0.09, 0.095, rnd.uniform(0.8, 1.6), 1.0, 10), 0xB09878)
# thresher: red drum on a frame with two wheels, feed tray, tall curved chute, belt to a small motor
tx, tz = -5.0, -10.5
add('metal', wb('chassis', tx - 1.6, tx + 1.6, tz - 0.8, tz + 0.8, 0.6, 0.72, 0.01), 0x3A3C3E)
add('metal', cyl('drum_body', tx, tz, 0.72, 1.7, 0.9, 0.9, 20), RED) if False else None
add('metal', lathe('drum', tx, tz, [(0.0, 0.7), (0.0, 0.7)], seg=3), RED) if False else None
for k in range(1):
    pass
# horizontal drum (axis along x): approximate with a box body + two end caps built from rings
add('metal', wb('drum_box', tx - 1.3, tx + 1.3, tz - 0.75, tz + 0.75, 0.75, 1.75, 0.18), RED)
for sg in (-1, 1):
    add('metal', ring('drum_end', tx + sg * 1.3, tz, 1.25, 0.65, 0.07, axis='x'), 0x8E2F1A)
for k in range(5):
    add('metal', wb('drum_band', tx - 1.3 + 0.2 + k * 0.5, tx - 1.3 + 0.25 + k * 0.5, tz - 0.78, tz + 0.78, 0.75, 1.75, 0.02), 0x9E3A20)
add('metal', limb('feed_tray', (tx - 1.3, tz, 1.55), (tx - 2.7, tz, 1.1), 1.2, 0.05), RED)
for sz in (-1, 1):
    add('metal', limb('feed_tray_side', (tx - 1.3, tz + sz * 0.6, 1.55), (tx - 2.7, tz + sz * 0.6, 1.1), 0.04, 0.35), 0x9E3A20)
# tall curved chute: up the side then bending over toward the (hers) bhusa heap at the back-left
add('metal', limb('chute_a', (tx + 0.9, tz - 0.4, 1.6), (tx + 0.9, tz - 0.4, 3.0), 0.55, 0.5), RED)
add('metal', limb('chute_b', (tx + 0.9, tz - 0.4, 3.0), (tx + 0.4, tz - 0.4, 3.4), 0.55, 0.5), RED)
add('metal', limb('chute_c', (tx + 0.4, tz - 0.4, 3.4), (tx - 0.3, tz - 0.4, 3.45), 0.55, 0.5), RED)
add('metal', limb('chute_d', (tx - 0.3, tz - 0.4, 3.45), (tx - 0.9, tz - 0.4, 3.2), 0.55, 0.5), RED)
add('metal', limb('chute_e', (tx - 0.9, tz - 0.4, 3.2), (tx - 1.3, tz - 0.4, 2.8), 0.55, 0.5), RED)
for sg in (-1, 1):
    add('metal', ring('wheel', tx + sg * 1.7, tz + 0.9, 0.5, 0.5, 0.1, axis='x'), 0x1B1B1D)
    add('metal', ring('wheel_rim', tx + sg * 1.7, tz + 0.9, 0.5, 0.38, 0.03, axis='x'), 0x8E2F1A)
    add('metal', cyl('wheel_hub', tx + sg * 1.7, tz + 0.9, 0.35, 0.65, 0.06, 0.06, 8), 0x3A3C3E) if False else None
add('metal', limb('tow_bar', (tx + 1.6, tz, 0.55), (tx + 4.2, tz + 0.2, 0.35), 0.1, 0.08), 0x6A3A2A)
# small motor + belt (belt drawn as two long thin boxes from the drum pulley to the motor pulley)
mx, mz = tx + 5.2, tz + 0.5
add('metal', wb('motor_stand', mx - 0.5, mx + 0.5, mz - 0.3, mz + 0.3, 0.0, 0.4, 0.01), 0x4A4C50)
add('metal', cyl('motor_body', mx, mz, 0.4, 0.95, 0.28, 0.28, 12), 0x2E5E3A)
add('metal', ring('pulley_m', mx - 0.35, mz, 0.7, 0.18, 0.04, axis='x'), 0x2A2A2C)
add('metal', ring('pulley_d', tx + 1.4, tz - 0.3, 1.25, 0.28, 0.04, axis='x'), 0x2A2A2C)
add('paint', limb('belt_a', (tx + 1.45, tz - 0.3, 1.5), (mx - 0.4, mz, 0.88), 0.07, 0.012), 0x2A241E)
add('paint', limb('belt_b', (tx + 1.45, tz - 0.3, 1.0), (mx - 0.4, mz, 0.52), 0.07, 0.012), 0x2A241E)
# straw-stack footing: a mud-plastered ring, empty (the stack is hers), + the wooden tripod beam scale beside it
pk.brick_ring(kit, 8.0, -9.5, 2.4, 0, 0.12, 0.3, 20, kind='paint') if False else None
add('paint', cyl('stack_footing', 8.0, -9.5, 0.04, 0.12, 2.6, 2.6, 24), 0x9A7F5C)
sx, sz = 5.8, -6.0
for k in range(3):
    a = k * math.tau / 3 + 0.4
    add('wood', limb('tripod_leg', (sx + 0.9 * math.cos(a), sz + 0.9 * math.sin(a), 0), (sx, sz, 2.6), 0.07, 0.06))
add('metal', limb('scale_beam', (sx - 0.8, sz, 2.4), (sx + 0.8, sz, 2.4), 0.05, 0.04), 0x4A4C50)
for sg in (-1, 1):
    for dz in (-0.12, 0.12):
        add('metal', limb('chain', (sx + sg * 0.78, sz, 2.38), (sx + sg * 0.78, sz + dz, 1.4), 0.01), 0x2A2A2C)
    add('metal', lathe('pan', sx + sg * 0.78, sz, [(0.0, 1.35), (0.25, 1.38), (0.29, 1.45), (0.25, 1.45), (0.0, 1.38)], seg=12), 0x3A3C3E)
add('wood', limb('scale_pole', (sx + 1.0, sz + 0.3, 0.0), (sx + 1.0, sz + 0.3, 1.6), 0.04), 0x8A6A48)
# front-right: blue tarp (flat; grain heap is hers), soop (winnowing tray) + rake, sacks, pitchfork, broom
add('paint', wb('tarp', 3.0, 8.5, 2.0, 7.0, 0.04, 0.06, 0.003), 0x4F83B8)
add('paint', wb('tarp_hem', 3.0, 8.5, 2.0, 2.1, 0.06, 0.07, 0.0), 0x3E6C9C)
add('paint', lathe('soop', 2.4, 6.5, [(0.0, 0.06), (0.32, 0.1), (0.36, 0.18), (0.32, 0.18), (0.0, 0.1)], seg=14), 0xB59A66)
add('wood', limb('rake_h', (2.0, 6.8, 0.05), (0.2, 7.6, 0.07), 0.04), 0x8A6A48)
add('wood', limb('rake_head', (1.9, 6.5, 0.07), (2.2, 7.1, 0.07), 0.04, 0.06), 0x6A4A32)
for k in range(6):
    sack(kit, 2.8 + k * 0.62, 10.0, 0.04, 0.05 * (k % 2), (0xB59A66, 0xC9B07C, 0xA88A58)[k % 3], w=0.5, d=0.34, hh=0.8)
add('wood', limb('pitchfork_h', (1.5, 10.4, 0.04), (0.2, 11.3, 0.07), 0.035), 0x8A6A48)
for k in range(3):
    add('metal', limb('fork_tine', (1.55 + k * 0.05, 10.35 + k * 0.08, 0.05), (1.75 + k * 0.05, 10.2 + k * 0.08, 0.05), 0.012), 0x6C7074)
add('wood', limb('broom_h', (7.8, 11.0, 0.04), (5.8, 11.3, 0.07), 0.03), 0x8A6A48)
add('paint', limb('broom_head', (7.9, 10.95, 0.06), (8.2, 10.9, 0.06), 0.2, 0.04), 0x9A8A58)
# front-left: tarp shade on four bamboo poles with a charpai under it, clay pot, tumbler
px0, px1, pz0, pz1 = -10.5, -5.5, 7.5, 11.5
for (x, z, h) in ((px0, pz0, 2.2), (px1, pz0, 2.2), (px0, pz1, 1.8), (px1, pz1, 1.8)):
    add('wood', limb('bamboo', (x, z, 0), (x + 0.03, z, h), 0.07, 0.06))
add('paint', limb('tarp_shade', (px0 - 0.2, pz0 - 0.1, 2.25), (px1 + 0.2, pz0 - 0.1, 2.25), 0.02, 0.02), 0x8A94A0) if False else None
add('paint', wb('shade_tarp', px0 - 0.3, px1 + 0.3, pz0 - 0.2, pz1 + 0.3, 2.0, 2.04, 0.0), 0x8E9AA6)
add('wood', limb('shade_rope', (px0, pz0, 2.2), (px0, pz1, 1.8), 0.02), 0xB89A64)
pk.charpai(kit, -8.0, 9.5, 0.0)
pk.pot(kit, -10.6, 12.0, 0.0, 0.8)
add('metal', cyl('tumbler', -9.9, 12.2, 0.0, 0.1, 0.04, 0.05, 8), STEEL)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04})
