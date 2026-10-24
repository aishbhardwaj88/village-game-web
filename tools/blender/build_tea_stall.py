"""
The tea stall on the house-school lane — Blender model from Places V1/tea_stall/MAIN_tea_stall_orthos.png
(checklist: docs/tea-stall-checklist.md). Run: tools/blender/make.sh tea_stall tea_stall
LOCAL frame (matches src/shops.js's buildTeaStall group): origin = stall centre, front/customer side = +wz, back wall at
-wz. 4 m wide (x) x 2.5 m deep (z) x 2.6 m posts. Placed with an EXACT slot at TEA_SHOP_POS with the same rotationY
(src/main.js); the code walls/roof/counter/posts stay hidden in `tea_old` as the collision backing. The painted
sign is the existing code signboard (src/signboards.js) — this model only adds the posts that hold it.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, quad, ROOT
from arch import Kit, ring, dabba, STEEL, BRASS, LEAF

OUT = os.path.join(ROOT, 'tmp', 'tea_stall_raw.glb')
# real PBR wood and steel rides in the tin slot (the roof's draw call): hero view is at the 150 ceiling
kit = Kit(split_props=False, route={'metal': 'tin'}, wood_slot='props')
rnd = random.Random(21)
TEAL = 0x3E7F86
TEAL_D = 0x2F646A
WOODB = 0x7A4A32


def structure():
    # back wall: cream limewash with the ochre lower band
    kit.add('plaster', wb('back', -2.0, 2.0, -1.25, -1.03, 0, 2.6, 0.01))
    kit.add('plinth', wb('back_band', -2.0, 2.0, -1.28, -1.25, 0, 0.9, 0.005))
    kit.add('plinth', wb('back_band_in', -2.0, 2.0, -1.03, -1.0, 0, 0.9, 0.005))
    # teal posts front + teal edge strips on the back wall
    for x in (-1.92, 1.92):
        kit.add('paint', wb('post', x - 0.07, x + 0.07, 1.1, 1.24, 0, 2.6, 0.006), TEAL)
        kit.add('paint', wb('edge', x - 0.07, x + 0.07, -1.28, -1.0, 0, 2.6, 0.006), TEAL)
    kit.add('paint', wb('beam_front', -2.0, 2.0, 1.1, 1.24, 2.38, 2.6, 0.006), TEAL)
    kit.add('paint', wb('beam_back', -2.0, 2.0, -1.28, -1.0, 2.38, 2.6, 0.006), TEAL)
    for z in (-0.5, 0.2, 0.9):  # purlins across
        kit.add('wood', wb('purlin', -2.1, 2.1, z - 0.04, z + 0.04, 2.44, 2.56, 0.004))
    # sloped corrugated tin roof, higher at the back wall (as in the side elevation) + a pale fascia strip
    kit.add('tin', prism_x('roof', -2.35, 2.35, [(-1.6, 2.84), (1.6, 2.5), (1.6, 2.56), (-1.6, 2.9)]))
    kit.add('trim', wb('fascia', -2.36, 2.36, 1.58, 1.64, 2.44, 2.62, 0.004))
    # raised step across the front
    kit.add('apron', wb('step', -1.95, 1.95, 0.73, 1.28, 0, 0.14, 0.01))
    # the code sign board now stands directly ON the roof front (reference: board fixed to the roof edge, no frame): two short
    # teal posts behind it, from the roof to the board's top (board centre y=3.0, width 3.6, front plane z=1.19). The old
    # tall posts + cross brace + stays made an odd X frame (art review 1) and are gone.
    for x in (-1.55, 1.55):
        kit.add('paint', limb('sign_post', (x, 1.08, 2.55), (x, 1.08, 3.2), 0.07, 0.07, 0.004), TEAL_D)


def counter_and_goods():
    # planked teal counter (0.9 high) with a top slab
    kit.add('paint', wb('counter', -1.85, 1.85, 0.5, 1.0, 0, 0.9, 0.008), TEAL)
    for h in (0.2, 0.45, 0.7):
        kit.add('paint', wb('plank_line', -1.84, 1.84, 1.0, 1.015, h, h + 0.015, 0.0), TEAL_D)
    for x in (-1.85, 0.0, 1.85):
        kit.add('paint', wb('counter_post', x - 0.05, x + 0.05, 0.98, 1.04, 0, 0.9, 0.004), TEAL_D)
    kit.add('wood', wb('counter_top', -1.95, 1.95, 0.45, 1.06, 0.9, 0.96, 0.008))
    # stove + big pot + kettle + tray of tea glasses + newspaper + steel containers on the counter
    kit.add('paint', wb('stove', -1.3, -0.65, 0.58, 0.95, 0.96, 1.2, 0.02), 0x2B2724)
    kit.add('paint', cyl('chulha_mouth', -0.97, 0.76, 1.2, 1.22, 0.14, 0.14, 12), 0x120F0E)
    kit.add('metal', cyl('pot', -0.97, 0.76, 1.22, 1.46, 0.23, 0.25, 16), STEEL)
    kit.add('paint', cyl('pot_lid', -0.97, 0.76, 1.46, 1.49, 0.26, 0.26, 16), 0x8A8E93)
    kit.add('paint', cyl('tea_surface', -0.97, 0.76, 1.455, 1.465, 0.2, 0.2, 14), 0x9A5A2A)
    kit.add('paint', limb('handle_l', (-1.22, 0.76, 1.44), (-1.35, 0.76, 1.44), 0.035, 0.03), 0x222222)
    kit.add('paint', limb('handle_r', (-0.72, 0.76, 1.44), (-0.59, 0.76, 1.44), 0.035, 0.03), 0x222222)
    kit.add('metal', cyl('kettle', -0.3, 0.7, 0.96, 1.2, 0.13, 0.1, 12), STEEL)
    kit.add('metal', limb('kettle_spout', (-0.3, 0.8, 1.12), (-0.3, 0.97, 1.22), 0.035, 0.035), STEEL)
    kit.add('paint', limb('kettle_handle', (-0.42, 0.7, 1.15), (-0.18, 0.7, 1.15), 0.025, 0.03), 0x222222)
    kit.add('metal', wb('tray', 0.35, 1.1, 0.62, 0.94, 0.96, 0.99, 0.006), STEEL)
    for i in range(3):
        for j in range(2):
            kit.add('paint', cyl('glass', 0.5 + i * 0.22, 0.7 + j * 0.15, 0.99, 1.1, 0.04, 0.045, 10), 0xD8E8E8)
    kit.add('paint', cyl('cup', 1.35, 0.78, 0.96, 1.03, 0.04, 0.03, 10), 0xE8D8B8)
    kit.add('paint', cyl('cup', 1.5, 0.82, 0.96, 1.03, 0.04, 0.03, 10), 0xE8D8B8)
    kit.add('paint', quad('newspaper', [(1.45, 0.58, 0.965), (1.85, 0.58, 0.965), (1.85, 0.92, 0.965), (1.45, 0.92, 0.965)]), 0xE9E5D8)
    for k in range(5):
        kit.add('paint', wb('news_line', 1.5, 1.8, 0.62 + k * 0.06, 0.64 + k * 0.06, 0.966, 0.97, 0), 0x4A4A48)
    # back shelf with glass jars of biscuits/namkeen and bright packets
    kit.add('wood', wb('shelf', -1.8, 1.6, -1.03, -0.7, 1.5, 1.55, 0.006))
    for x in (-1.5, 0.0, 1.3):
        kit.add('wood', limb('shelf_bracket', (x, -1.03, 1.3), (x, -0.78, 1.5), 0.04, 0.05))
    for i in range(5):
        x = -1.55 + i * 0.32
        kit.add('paint', cyl('jar', x, -0.88, 1.55, 1.8, 0.1, 0.1, 12), (0xC9A56A, 0xE2C27E, 0xB8864A, 0xD9B45A, 0xC9A56A)[i])
        kit.add('paint', cyl('jar_lid', x, -0.88, 1.8, 1.84, 0.105, 0.105, 12), 0xC0392B if i % 2 else 0x2E86C1)
    # (the flat-colour box packets that stood here are now textured printed packs: src/shopGoods.js teaStallGoods)
    kit.add('metal', cyl('steel_tin', 1.45, -0.85, 1.55, 1.75, 0.09, 0.09, 10), STEEL)
    kit.add('paint', sphere('bulb', 0.2, 0.0, 2.2, 0.05, 0.05, 0.065, 1), 0xFFF0B0)
    kit.add('paint', limb('bulb_cable', (0.2, 0.0, 2.4), (0.2, 0.0, 2.26), 0.01, 0.01), 0x222222)


def front_furniture():
    # long wooden bench in front of the counter + stretchers
    kit.add('wood', wb('bench_seat', -1.8, 1.0, 1.55, 1.9, 0.42, 0.48, 0.01))
    for x in (-1.65, 0.85):
        kit.add('wood', wb('bench_leg', x - 0.04, x + 0.04, 1.6, 1.85, 0, 0.42, 0.005))
    kit.add('wood', wb('stretcher', -1.65, 0.85, 1.7, 1.74, 0.18, 0.22, 0.004))
    # red plastic stool, blue water jerrycan, steel bucket, small wooden stool
    for dx, dz in ((-0.14, -0.14), (0.14, -0.14), (-0.14, 0.14), (0.14, 0.14)):
        kit.add('paint', limb('stool_leg', (-2.25 + dx, 1.7 + dz, 0), (-2.25 + dx * 0.8, 1.7 + dz * 0.8, 0.44), 0.035, 0.035), 0xC0392B)
    kit.add('paint', cyl('stool_seat', -2.25, 1.7, 0.44, 0.49, 0.2, 0.2, 12), 0xC0392B)
    kit.add('paint', wb('jerrycan', -2.65, -2.35, 1.35, 1.65, 0.0, 0.5, 0.03), 0x2E6BD0)
    kit.add('paint', cyl('jerrycan_cap', -2.5, 1.5, 0.5, 0.56, 0.05, 0.05, 8), 0x1F4F9E)
    kit.add('metal', cyl('bucket', 1.65, 1.8, 0.0, 0.34, 0.2, 0.17, 14), STEEL)
    kit.add('paint', cyl('bucket_in', 1.65, 1.8, 0.33, 0.345, 0.17, 0.17, 14), 0x1B2A33)
    kit.add('wood', wb('stool_seat', 2.05, 2.4, 1.55, 1.9, 0.42, 0.47, 0.008))
    for dx, dz in ((2.1, 1.6), (2.35, 1.6), (2.1, 1.85), (2.35, 1.85)):
        kit.add('wood', wb('stool_leg', dx - 0.025, dx + 0.025, dz - 0.025, dz + 0.025, 0, 0.42, 0.004))


structure()
counter_and_goods()
front_furniture()
TINTS = {'hb_metal': '#C9CDD2', 'hb_plaster': '#F2E6C6', 'hb_plinth': '#E0A83F', 'hb_trim': '#D8D2C2', 'hb_apron': '#9C8264', 'hb_tin': '#C8D0D4', 'hb_wood': '#A08568'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.06, 'hb_apron': 0.08}, ao_strength=0.4)
