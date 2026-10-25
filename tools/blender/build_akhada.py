"""
Akhada - arch.py Kit, to Places V1/akhada/LAYOUT.md + MAIN_akhada_front_isometric.png. Run: tools/blender/make.sh akhada akhada_v2
Frame: site-local metres, +z south = front. Bare earth patch 22 x 20 m: x[-11,11] z[-10,10]. Wrestling pit 12 x 12 m at the centre, sunk 0.3 m, soft dug reddish-brown soil, low mud bank 0.3 m,
~4 m open strip all round. Back-left: platform for the neem (hers), a climbing rope hung from a bamboo frame, bamboo rack with 2 mugdar clubs + a gada, bricks as weights. Back-right: bamboo + rusty tin
shed 3 x 2 m with a drying line, hand pump, 1 m cement water tank. Charpai at the right; phawdas (spades) + a levelling plank by the pit, a bucket, stray bricks. No shrine/flags/religious symbols.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, join_objects, ROOT
from arch import Kit, lathe, STEEL
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'akhada_v2_raw.glb')
kit = Kit(split_props=False, own=('metal', 'tin'), wood_slot='props')
add = kit.add
rnd = random.Random(73)
add('paint', wb('patch_l', -11, -6, -10, 10, -0.08, 0.03, 0.0), 0xB59468)
add('paint', wb('patch_r', 6, 11, -10, 10, -0.08, 0.03, 0.0), 0xB59468)
add('paint', wb('patch_b', -6, 6, -10, -6, -0.08, 0.03, 0.0), 0xB59468)
add('paint', wb('patch_f', -6, 6, 6, 10, -0.08, 0.03, 0.0), 0xB59468)
# the pit: the world ground cannot be dug, so the pit is read as sunk by a 0.3 m mud bank round a reddish-brown soil floor laid on the ground (floor 0.3 m below the bank top)
add('paint', wb('pit_floor', -6, 6, -6, 6, 0.0, 0.06, 0.0), 0x8A4B34)
for (a, b, c, d) in ((-6.8, 6.8, -6.8, -6.0), (-6.8, 6.8, 6.0, 6.8), (-6.8, -6.0, -6.0, 6.0), (6.0, 6.8, -6.0, 6.0)):
    add('paint', wb('bank', a, b, c, d, 0.0, 0.33, 0.1), 0xA06E4C)
for k in range(10):
    a = rnd.uniform(0, math.tau)
    add('paint', cyl('soil_mound', rnd.uniform(-4.5, 4.5), rnd.uniform(-4.5, 4.5), 0.06, 0.12, rnd.uniform(0.5, 1.1), rnd.uniform(0.3, 0.8), 10), 0x8F5238)
# back-left: neem platform (empty) + climbing rope on a bamboo frame beside it
pk.brick_ring(kit, -8.0, -7.6, 1.5, 0, 0.35, 0.34, 20)
add('paint', cyl('neem_soil', -8.0, -7.6, 0.0, 0.3, 1.3, 1.3, 20), 0x4A3524)
for dz in (-0.6, 0.6):
    add('wood', limb('rope_post', (-5.0, -8.0 + dz, 0), (-5.0, -8.0 + dz, 4.6), 0.12, 0.1))
add('wood', limb('rope_beam', (-5.0, -8.6, 4.5), (-5.0, -7.4, 4.5), 0.12, 0.1))
add('paint', limb('climb_rope', (-5.0, -8.0, 4.45), (-5.0, -8.0, 0.8), 0.07, 0.07), 0xB89A64)
for k in range(8):
    add('paint', cyl('rope_knot', -5.0, -8.0, 1.0 + k * 0.45, 1.06 + k * 0.45, 0.06, 0.06, 6), 0xA88A58)
# bamboo rack with two mugdar clubs and a gada
for dx in (-0.8, 0.8):
    add('wood', limb('rack_post', (-9.0 + dx, -3.0, 0), (-9.0 + dx, -3.0, 1.4), 0.09, 0.08))
add('wood', limb('rack_bar', (-9.9, -3.0, 1.1), (-8.1, -3.0, 1.1), 0.06))
add('wood', limb('rack_bar_lo', (-9.9, -3.0, 0.55), (-8.1, -3.0, 0.55), 0.06))
for k, x in enumerate((-9.6, -9.0)):
    add('wood', lathe('mugdar', x, -2.8, [(0.04, 0.0), (0.04, 0.5), (0.09, 0.62), (0.14, 0.9), (0.14, 1.1), (0.09, 1.2), (0.0, 1.22)], seg=10), 0x6A4A32)
add('wood', lathe('gada_shaft', -8.5, -2.8, [(0.035, 0.0), (0.035, 0.7), (0.05, 0.75)], seg=8), 0x6A4A32)
add('metal', lathe('gada_head', -8.5, -2.8, [(0.05, 0.75), (0.16, 0.85), (0.17, 1.1), (0.1, 1.3), (0.0, 1.32)], seg=12), 0x4A4D52)
for k in range(6):
    add('brick', wb('weight_brick', -10.4 + (k % 3) * 0.26, -10.4 + (k % 3) * 0.26 + 0.23, -4.9 + (k // 3) * 0.12, -4.9 + (k // 3) * 0.12 + 0.11, 0, 0.075, 0.0), 0xB5603C)
# back-right: bamboo + rusty tin shed 3 x 2 with a drying line, hand pump, 1 m cement tank
sx0, sx1, sz0, sz1 = 5.5, 8.5, -9.0, -7.0
for (x, z, h) in ((sx0, sz0, 2.4), (sx1, sz0, 2.4), (sx0, sz1, 1.9), (sx1, sz1, 1.9)):
    add('wood', limb('bamboo', (x, z, 0), (x + 0.03, z, h), 0.08, 0.07))
for k in range(3):
    xa = sx0 - 0.3 + k * 1.2
    add('tin', prism_x('shed_sheet', xa, xa + 1.18, [(sz0 - 0.3, 2.5), (sz1 + 0.4, 2.0), (sz1 + 0.4, 2.05), (sz0 - 0.3, 2.55)]), (0x8C5A44, 0x7A4F3C, 0xA0654A)[k])
for k in range(5):
    add('tin', wb('back_sheet', sx0 + k * 0.6, sx0 + (k + 1) * 0.6 - 0.01, sz0 - 0.05, sz0, 0, 2.3, 0.0), (0x8C5A44, 0x9A9EA0, 0x7A4F3C, 0xA0654A, 0x6E7478)[k])
add('paint', limb('dry_line', (sx0, sz1 + 0.2, 1.7), (sx1, sz1 + 0.2, 1.7), 0.02), 0xB89A64)
for k in range(2):
    add('paint', wb('cloth', sx0 + 0.5 + k * 1.2, sx0 + 1.0 + k * 1.2, sz1 + 0.18, sz1 + 0.22, 0.9, 1.7, 0.0), (0xC9D4D8, 0xD8B8A0)[k])
pk.hand_pump(kit, 4.0, -7.5, 0x2E5E3A, tub=False)
add('trim', wb('tank', 3.0, 4.0, -9.4, -8.4, 0, 1.0, 0.02), 0xA9A69F)
add('paint', wb('tank_water', 3.1, 3.9, -9.3, -8.5, 0.8, 0.95, 0.0), 0x5E8A86)
# charpai at the right; phawdas + levelling plank by the pit; bucket; stray bricks
pk.charpai(kit, 9.0, 1.0, 1.57)
for k, (x, z, a) in enumerate(((-6.9, 3.0, 0.3), (-6.9, 3.6, -0.2))):
    add('wood', limb('phawda_h', (x, z, 0.04), (x + 1.1, z + 0.3, 1.0 if k == 0 else 0.04), 0.04), 0x6A4A32)
    add('metal', wb('phawda_blade', x - 0.12, x + 0.12, z - 0.1, z + 0.1, 0.0, 0.25, 0.004), 0x6C7074) if k == 0 else add('metal', wb('phawda_blade', x - 0.15, x + 0.15, z - 0.12, z + 0.12, 0.0, 0.03, 0.004), 0x6C7074)
add('wood', wb('plank', 6.9, 9.4, 4.0, 4.4, 0.0, 0.05, 0.004))
pk.bucket(kit, 7.2, 6.5, 0x7C8084)
for k in range(5):
    add('brick', wb('stray_brick', -3.0 + k * 1.3 + rnd.uniform(-0.3, 0.3), -3.0 + k * 1.3 + 0.23, 7.0 + rnd.uniform(0, 1.2), 7.11 + rnd.uniform(0, 1.2), 0, 0.075, 0.0), 0xB5603C)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_brick': '#FFFFFF', 'hb_tin': '#FFFFFF', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})
