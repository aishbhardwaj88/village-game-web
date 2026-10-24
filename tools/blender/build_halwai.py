"""
The halwai (sweet/snack shop) — Blender model from Places V1/halwai/MAIN_halwai_elevations.png and
LAYOUT.md (checklist: docs/halwai-checklist.md).

Run: tools/blender/make.sh halwai halwai_compound
Authored in world offsets from HALWAI_CENTER (-40, 62): footprint x[-2.25,2.25] (depth, FRONT = -x, the lane
side, open) z[-2.75,2.75] (width), h=3.5. Walls: north (z=-2.75) and back (x=+2.25); the +z (chair) side is the
second open doorway. Exact asset slot; the old code walls/roof/platform/cabinet/chairs stay as a hidden
`halwai_old` group so collision and the validator stay exact (the roof slab is a 2D collider over the whole
footprint, as for every other building here, so the interior is a diorama, not walkable).
"""
import sys
import os
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, boolean_cut, join_objects, ROOT
from arch import Kit, ring, clay_pot, plastic_chair, dabba, sack, STEEL, BRASS, TERRA, LEAF

OUT = os.path.join(ROOT, 'tmp', 'halwai_compound_raw.glb')
kit = Kit(split_props=False, wood_slot='props')  # real PBR wood rides in the (otherwise paint-only) props slot: no extra draw call
rnd = random.Random(5)

W0, W1 = -2.25, 2.25      # x: front (street) .. back
Z0, Z1 = -2.75, 2.75      # z: north (closed) .. south (open doorway)
H = 3.5
T = 0.22
TEAL = 0x7FA29A
MUSTARD_H = 1.25          # ochre band height


def wood(obj, c=0x93785B):
    """Weathered grey-brown painted wood as flat vertex colour (the CC0 wood texture is near-black once tinted)."""
    return kit.add('paint', obj, c)


def walls():
    # closed north wall + back wall (centrelines on the footprint edges, 0.22 thick — matches the code colliders)
    kit.add('plaster', wb('wall_n', W0 - 0.11, W1 + 0.11, Z0 - 0.11, Z0 + 0.11, 0, H, 0.01))
    kit.add('plaster', wb('wall_e', W1 - 0.11, W1 + 0.11, Z0, Z1 + 0.11, 0, H, 0.01))
    # ochre lower band on every outer face (a flat paint line, proud 2 cm) + a darker cap line
    kit.add('plinth', wb('band_n', W0 - 0.13, W1 + 0.13, Z0 - 0.13, Z0 - 0.09, 0, MUSTARD_H, 0.006))
    kit.add('plinth', wb('band_e', W1 + 0.09, W1 + 0.13, Z0, Z1 + 0.13, 0, MUSTARD_H, 0.006))
    # piers: the four corners of the open front/side, wide like the reference
    for (px, pz) in ((W0 + 0.05, Z0 + 0.05), (W0 + 0.05, Z1 - 0.05), (W1 - 0.05, Z1 - 0.05)):
        kit.add('plaster', wb('pier', px - 0.3, px + 0.3, pz - 0.3, pz + 0.3, 0, H, 0.012))
        kit.add('plinth', wb('pier_band', px - 0.32, px + 0.32, pz - 0.32, pz + 0.32, 0, MUSTARD_H, 0.008))
    # weathered patches where the limewash has flaked off to the brick, on the front piers
    for (px, pz, hh) in ((W0 - 0.28, Z0 + 0.2, 2.3), (W0 - 0.28, Z1 - 0.3, 1.5), (W0 + 0.1, Z1 + 0.27, 2.0), (W1 + 0.13, Z0 + 0.6, 2.4)):
        kit.add('brick', wb('patch', px - 0.02, px + 0.02, pz - 0.14, pz + 0.14, hh, hh + 0.35, 0.004))
    # roof slab with overhang, fascia stripe, scuppers
    kit.add('trim', wb('roof', W0 - 0.35, W1 + 0.35, Z0 - 0.35, Z1 + 0.35, H, H + 0.25, 0.02))
    kit.add('trim', wb('roof_cap', W0 - 0.2, W1 + 0.2, Z0 - 0.2, Z1 + 0.2, H + 0.25, H + 0.32, 0.015))
    # interior floor
    kit.add('floor', wb('floor', W0, W1, Z0, Z1, -0.01, 0.03, 0))


def front():
    # teal-painted wooden frame around the opening + the raised wooden shutter box above it
    fx = W0 - 0.12
    for z in (Z0 + 0.5, Z1 - 0.5):
        kit.add('wood', wb('frame_post', fx - 0.05, fx + 0.05, z - 0.05, z + 0.05, 0, 2.7, 0.006), TEAL)
    kit.add('wood', wb('frame_beam', fx - 0.05, fx + 0.05, Z0 + 0.45, Z1 - 0.45, 2.62, 2.72, 0.006), TEAL)
    wood(wb('shutter_box', fx - 0.2, fx + 0.12, Z0 + 0.35, Z1 - 0.35, 2.72, 3.4, 0.012))
    for k in range(4):  # plank lines across the box
        h = 2.8 + k * 0.17
        kit.add('plinth', wb('shutter_line', fx - 0.205, fx - 0.19, Z0 + 0.36, Z1 - 0.36, h, h + 0.02, 0.0))
    # side (south) opening: header beam over the doorway
    wood(wb('side_beam', W0 + 0.1, W1 - 0.1, Z1 - 0.18, Z1 + 0.12, 2.9, 3.4, 0.012))
    # counter: painted wood cabinet base at the front (the code's 0.9 m deep kadhai platform)
    cx0, cx1 = W0 + 0.05, W0 + 0.9
    wood(wb('counter_body', cx0, cx1, Z0 + 0.4, Z1 - 0.4, 0.0, 0.9, 0.01))
    wood(wb('counter_top', cx0 - 0.05, cx1 + 0.05, Z0 + 0.35, Z1 - 0.35, 0.9, 0.98, 0.012))
    for z in (Z0 + 0.4, Z1 - 0.4, 0.0):   # teal frame posts + two panels either side
        kit.add('wood', wb('counter_post', cx0 - 0.04, cx0 + 0.04, z - 0.05, z + 0.05, 0.0, 0.9, 0.004), TEAL)
    for hh in (0.0, 0.88):
        kit.add('wood', wb('counter_rail', cx0 - 0.04, cx0 + 0.04, Z0 + 0.4, Z1 - 0.4, hh, hh + 0.05, 0.004), TEAL)
    for z0, z1 in ((Z0 + 0.5, -0.1), (0.1, Z1 - 0.5)):
        for hh in (0.12, 0.5):
            wood(wb('counter_panel', cx0 - 0.05, cx0 - 0.02, z0, z1, hh, hh + 0.3, 0.004))
    # brick bhattis with the two kadhais: jalebi (left) and samosa (right)
    for (kz, what) in ((-1.15, 'jalebi'), (1.15, 'samosa')):
        kx = (cx0 + cx1) / 2 + 0.02
        kit.add('brick', wb('bhatti', kx - 0.4, kx + 0.4, kz - 0.4, kz + 0.4, 0.98, 1.2, 0.01))
        # fire mouth on the customer-facing side: sooty arch, black recess, glowing ember bed and a half-burnt log
        kit.add('paint', wb('fire_soot', kx - 0.408, kx - 0.4, kz - 0.26, kz + 0.26, 1.04, 1.2, 0.0), 0x2B2724)
        kit.add('paint', wb('fire_mouth', kx - 0.43, kx - 0.4, kz - 0.17, kz + 0.17, 0.99, 1.13, 0.0), 0x0E0C0B)
        kit.add('paint', wb('fire_embers', kx - 0.44, kx - 0.42, kz - 0.14, kz + 0.14, 0.99, 1.04, 0.0), 0xFF7A28)
        kit.add('paint', limb('fire_log', (kx - 0.46, kz - 0.12, 1.07), (kx - 0.46, kz + 0.12, 1.05), 0.03, 0.03, 0.0), 0x3A2A20)
        kit.add('paint', sphere('kadhai', kx, kz, 1.32, 0.42, 0.42, 0.17, 3), 0x1B1B1D)
        kit.add('paint', cyl('kadhai_oil', kx, kz, 1.4, 1.43, 0.37, 0.37, 18), 0xB8741F)
        kit.add('paint', ring('kadhai_rim', kx, kz, 1.46, 0.41, 0.018, axis='y'), 0x2A2A2C)
        # the jalebi coils / samosas frying in the kadhai are textured goods now (src/shopGoods.js halwaiGoods)
        # ladle + jhara resting across the rim
        kit.add('paint', limb('ladle', (kx - 0.05, kz - 0.5, 1.58), (kx + 0.05, kz + 0.1, 1.46), 0.025, 0.025), STEEL)
        kit.add('paint', cyl('ladle_cup', kx + 0.05, kz + 0.1, 1.42, 1.47, 0.06, 0.06, 10), STEEL)
    # firewood stacked under the counter's open end and by the chairs
    for r in range(3):
        for c in range(4 - r):
            x = W0 + 0.15 + r * 0.14 + c * 0.0
            z = Z1 + 0.35 + c * 0.2 + r * 0.1
            kit.add('wood', limb('log', (x - 0.3, z, 0.1 + r * 0.17), (x + 0.3, z, 0.1 + r * 0.17), 0.17, 0.17, 0.0), 0xC9A47A)
    # (QR board and sound box removed 24 Oct: UPI-era props are after the ~2015 cut-off and read as a grey panel with black squares)


def back_and_cabinet():
    # sweet display cabinet (back band): wood frame, three tiers of steel thalis with mithai
    cx0, cx1 = W1 - 0.85, W1 - 0.25
    zc0, zc1 = -1.75, -0.25
    wood(wb('cab_base', cx0, cx1, zc0, zc1, 0, 0.5, 0.01))
    for z in (zc0, zc1):
        wood(wb('cab_post', cx0, cx1, z - 0.04, z + 0.04, 0.5, 1.6, 0.006))
    wood(wb('cab_top', cx0 - 0.03, cx1 + 0.03, zc0 - 0.03, zc1 + 0.03, 1.6, 1.66, 0.008))
    for k, hh in enumerate((0.55, 0.98, 1.38)):
        wood(wb('cab_shelf', cx0, cx1, zc0 + 0.04, zc1 - 0.04, hh, hh + 0.025, 0.004))
        for i in range(3):
            z = zc0 + 0.28 + i * 0.47
            tx = (cx0 + cx1) / 2
            kit.add('paint', cyl('thali', tx, z, hh + 0.025, hh + 0.045, 0.19, 0.19, 14), STEEL)
            # mithai on the thali: textured goods now (src/shopGoods.js halwaiGoods)
    # shelf on the back wall with dabbas, jars, a marble slab, sacks of flour and sugar
    bx = W1 - 0.2
    wood(wb('back_shelf', bx - 0.3, bx, 0.3, 2.3, 1.3, 1.35, 0.006))
    wood(wb('back_shelf_hi', bx - 0.3, bx, 0.3, 2.3, 2.0, 2.05, 0.006))
    for i in range(5):
        dabba(kit, bx - 0.15, 0.55 + i * 0.4, 1.35, 0.1, 0.26, STEEL if i % 2 else 0x9AA0A6)
    for i in range(4):
        kit.add('paint', cyl('jar', bx - 0.15, 0.55 + i * 0.5, 2.05, 2.3, 0.1, 0.1, 12), (0xCFE3E0, 0xE8C9A0, 0xD9B070, 0xE6D2A8)[i])  # glass jars of namkeen
        kit.add('paint', cyl('jar_lid', bx - 0.15, 0.55 + i * 0.5, 2.3, 2.34, 0.105, 0.105, 12), 0x333333)
    wood(wb('table', bx - 0.55, bx - 0.05, 0.4, 1.4, 0, 0.8, 0.01))
    kit.add('paint', wb('marble_slab', bx - 0.55, bx - 0.05, 0.4, 1.4, 0.8, 0.86, 0.008), 0xE4E0D6)
    for i, (z, c) in enumerate(((1.75, 0xE6DCC0), (2.1, 0xF0EBDD), (1.95, 0xD9C9A0))):
        sack(kit, bx - 0.3, z, 0.0, 0.0, c)
    # two bare bulbs on cables from the roof slab, a switchboard on the back wall
    for z in (-0.9, 0.9):
        kit.add('paint', limb('bulb_cable', (W0 + 1.3, z, H), (W0 + 1.3, z, 2.7), 0.01, 0.01), 0x222222)
        kit.add('paint', sphere('bulb', W0 + 1.3, z, 2.62, 0.05, 0.05, 0.065, 1), 0xFFF0B0)
    kit.add('paint', wb('switchboard', W1 - 0.14, W1 - 0.1, 1.3, 1.55, 1.4, 1.65, 0.004), 0xE9E7DD)


def roof_gear():
    # grey-green water tank on a stand + TV antenna
    tx, tz, th = 0.7, -1.4, H + 0.32
    for dx, dz in ((-0.4, -0.4), (0.4, -0.4), (-0.4, 0.4), (0.4, 0.4)):
        kit.add('paint', limb('tank_leg', (tx + dx, tz + dz, th), (tx + dx, tz + dz, th + 0.2), 0.06, 0.06), 0x666A6E)
    kit.add('paint', cyl('tank', tx, tz, th + 0.2, th + 1.3, 0.55, 0.55, 20), 0x566159)
    kit.add('paint', sphere('tank_dome', tx, tz, th + 1.3, 0.55, 0.55, 0.2, 2), 0x566159)
    for hr in (0.45, 0.9):
        kit.add('paint', cyl('tank_rib', tx, tz, th + 0.2 + hr, th + 0.25 + hr, 0.575, 0.575, 20), 0x4A544D)
    kit.add('paint', limb('tank_pipe', (tx + 0.58, tz, th + 0.4), (tx + 0.58, tz, H + 0.25), 0.045, 0.045), 0x777B7E)
    ax, az = -1.4, 1.4
    kit.add('paint', limb('ant_mast', (ax, az, H + 0.32), (ax, az, H + 2.0), 0.03, 0.03), 0xB0B4B8)
    kit.add('paint', limb('ant_boom', (ax - 0.5, az, H + 1.7), (ax + 0.5, az, H + 1.7), 0.022, 0.022), 0xB0B4B8)
    for k in range(6):
        xe = ax - 0.45 + k * 0.18
        ln = 0.65 - abs(k - 2.5) * 0.08
        kit.add('paint', limb('ant_el', (xe, az - ln / 2, H + 1.7), (xe, az + ln / 2, H + 1.7), 0.016, 0.016), 0xC4C8CC)
    # drainpipe at the back-north corner
    kit.add('paint', limb('drain', (W1 + 0.18, Z0 - 0.17, 0.12), (W1 + 0.18, Z0 - 0.17, H), 0.08, 0.08), 0x9A9EA3)
    kit.add('paint', limb('drain_foot', (W1 + 0.18, Z0 - 0.17, 0.2), (W1 + 0.1, Z0 - 0.5, 0.12), 0.08, 0.08), 0x9A9EA3)


def outside():
    # clay pots in a cluster at the front-left of the shop face
    for (x, z, s) in ((-2.95, -2.3, 1.0), (-2.7, -1.7, 0.85), (-3.15, -1.75, 0.9), (-2.85, -2.9, 0.8), (-2.55, -2.55, 0.9)):
        clay_pot(kit, x, z, s)
    # two (three) plastic chairs at the open side, matching the code chairs' footprints
    plastic_chair(kit, W0 + 1.75 - 0.0, Z1 + 0.6, math.pi, 0xA13A3A)           # code chair at (cx-0.5, cz+3.35)
    plastic_chair(kit, W0 + 2.75, Z1 + 1.1, math.pi + 0.5, 0x7FA286, arms=True)   # code chair at (cx+0.5, cz+3.85)
    plastic_chair(kit, W0 + 2.2, Z1 + 0.85, math.pi - 0.3, 0x9FA3BA)          # a third, stacked among them


walls()
front()
back_and_cabinet()
roof_gear()
outside()

TINTS = {'hb_plaster': '#E6E0CC', 'hb_plinth': '#E0A83F', 'hb_trim': '#D6D0C2', 'hb_floor': '#8A867D',
         'hb_wood': '#A08568', 'hb_brick': '#C26543'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.07, 'hb_plinth': 0.08, 'hb_trim': 0.07}, ao_strength=0.4)
