"""
Petrol pump V2 - arch.py Kit, to Places V1/petrol_pump/LAYOUT.md + MAIN_petrol_pump_front_isometric.png (navy + orange). Unbranded: no logos, no numbers.
Run: tools/blender/make.sh petrol_pump_v2 petrol_pump_v2
Frame: site-local metres, +z south = front (the long 30 m edge, the road). Concrete forecourt slab 30 x 20 m: x[-15,15] z[-10,10].
Canopy 18 x 10 m over the front half (front edge 2 m in from the slab front), 4 square columns, 5.5 m clear, 6.5 m top; orange fascia with a navy stripe, white underside;
columns navy below, white above. 2 raised islands (yellow/black striped ends) ~6 m apart running front-to-back, 1 white dispenser each with navy panels.
Sales office at the back 8 x 5 m, 4.4 m, white, navy base band, orange roof line, glass door + window, black water tank; back wall on the slab's back edge with one barred window
and one plain door. Air stand left of the office; water cooler, fire buckets + extinguishers on the right (marigolds are hers). Pole sign 6 m tall at the front-left corner, navy
with blank orange panels. 2 flush underground tank lids in the front-right forecourt.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, lathe, ring, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'petrol_pump_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
add = kit.add
NAVY = 0x1D2B66
ORANGE = 0xEE7A1C
WHITE = 0xF2F1EC
YEL = 0xF0C41C
BLK = 0x1B1B1D
SLAB = 0xA9A69F

add('paint', wb('ground', -17, 17, -12, 12, -0.08, 0.02, 0.0), 0xA38A66)
add('trim', wb('slab', -15, 15, -10, 10, 0, 0.1, 0.01), SLAB)
# expansion joints + tyre-worn, oil-stained lanes
for x in (-10, -5, 0, 5, 10):
    add('paint', wb('joint', x - 0.015, x + 0.015, -10, 10, 0.1, 0.104, 0.0), 0x6E6B64)
for z in (-5, 0, 5):
    add('paint', wb('joint', -15, 15, z - 0.015, z + 0.015, 0.1, 0.104, 0.0), 0x6E6B64)
for (x, z, r) in ((-6, 3, 1.4), (6, 2, 1.1), (0, 5.5, 1.8)):
    add('paint', cyl('stain', x, z, 0.1, 0.105, r, r * 0.8, 12), 0x6E6860)
# canopy: front edge 2 m in from the slab front -> z[0,8]?? 10 deep: z from -2 to 8
CX0, CX1, CZ0, CZ1 = -9, 9, -2, 8
H_CL, H_TOP = 5.5, 6.5
for (x, z) in ((CX0 + 1.0, CZ0 + 1.0), (CX1 - 1.0, CZ0 + 1.0), (CX0 + 1.0, CZ1 - 1.0), (CX1 - 1.0, CZ1 - 1.0)):
    add('trim', wb('col_base', x - 0.5, x + 0.5, z - 0.5, z + 0.5, 0.1, 0.35, 0.01), 0xB5B1A7)
    add('plinth', wb('col_navy', x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0.35, 2.4, 0.01), NAVY)
    add('plaster', wb('col_white', x - 0.4, x + 0.4, z - 0.4, z + 0.4, 2.4, H_CL, 0.01), WHITE)
    add('plinth', wb('col_band', x - 0.43, x + 0.43, z - 0.43, z + 0.43, 2.35, 2.5, 0.0), ORANGE)
# white underside, orange fascia with a navy stripe, flat roof deck
add('plaster', wb('canopy_under', CX0, CX1, CZ0, CZ1, H_CL, H_CL + 0.15, 0.01), WHITE)
add('trim', wb('canopy_deck', CX0, CX1, CZ0, CZ1, H_CL + 0.15, H_TOP - 0.2, 0.01), 0xB4B1A9)
for (a, b, c, d) in ((CX0 - 0.1, CX1 + 0.1, CZ1 - 0.05, CZ1 + 0.1), (CX0 - 0.1, CX1 + 0.1, CZ0 - 0.1, CZ0 + 0.05), (CX0 - 0.1, CX0 + 0.05, CZ0, CZ1), (CX1 - 0.05, CX1 + 0.1, CZ0, CZ1)):
    add('plinth', wb('fascia', a, b, c, d, H_CL - 0.05, H_TOP, 0.01), ORANGE)
    add('plinth', wb('fascia_stripe', a - 0.005, b + 0.005, c - 0.005, d + 0.005, H_CL + 0.45, H_CL + 0.7, 0.0), NAVY)
# islands 1.4 x 6 m, 0.25 high, running front-to-back; yellow/black striped ends; one dispenser each
for ix in (-3.0, 3.0):
    add('trim', wb('island', ix - 0.7, ix + 0.7, 0.8, 6.8, 0.1, 0.35, 0.02), 0xB5B1A7)
    for z0, z1 in ((0.8, 1.4), (6.2, 6.8)):
        for k in range(4):
            add('paint', wb('stripe', ix - 0.7 + k * 0.35, ix - 0.7 + (k + 1) * 0.35, z0, z1, 0.35, 0.36, 0.0), YEL if k % 2 == 0 else BLK)
        for sx in (-0.7, 0.7):
            add('paint', wb('kerb_s', ix + sx - 0.03, ix + sx + 0.03, z0, z1, 0.1, 0.35, 0.0), YEL if (z0 == 0.8) else BLK)
    dz = 3.8
    add('plaster', wb('disp', ix - 0.35, ix + 0.35, dz - 0.25, dz + 0.25, 0.35, 1.9, 0.02), WHITE)
    add('plinth', wb('disp_panel_f', ix - 0.3, ix + 0.3, dz + 0.25, dz + 0.27, 0.9, 1.5, 0.0), NAVY)
    add('plinth', wb('disp_panel_b', ix - 0.3, ix + 0.3, dz - 0.27, dz - 0.25, 0.9, 1.5, 0.0), NAVY)
    add('paint', wb('disp_screen_f', ix - 0.2, ix + 0.2, dz + 0.27, dz + 0.28, 1.2, 1.42, 0.0), 0x1B1D22)
    add('paint', wb('disp_screen_b', ix - 0.2, ix + 0.2, dz - 0.28, dz - 0.27, 1.2, 1.42, 0.0), 0x1B1D22)
    add('plinth', wb('disp_top', ix - 0.38, ix + 0.38, dz - 0.28, dz + 0.28, 1.9, 2.05, 0.01), NAVY)
    for sgn in (-1, 1):
        add('metal', limb('hose', (ix + sgn * 0.37, dz, 1.4), (ix + sgn * 0.5, dz + 0.1, 0.9), 0.05), 0x1B1B1D)
        add('metal', limb('nozzle_holster', (ix + sgn * 0.36, dz - 0.1, 1.1), (ix + sgn * 0.36, dz + 0.1, 1.1), 0.05), 0x4A4D52)
# sales office at the back: 8 x 5 m, white, navy base band, orange roof line, glass door + window, tank
OX0, OX1, OZ0, OZ1 = -4, 4, -10, -5
OH = 3.6
T = 0.25
def seg_x(z0, z1, ops, c=WHITE):
    cur = OX0
    for a, b, lo, hi in sorted(ops):
        add('plaster', wb('ow', cur, a, z0, z1, 0.1, OH, 0.0), c)
        if lo > 0.1:
            add('plaster', wb('ow_sill', a, b, z0, z1, 0.1, lo, 0.0), c)
        add('plaster', wb('ow_lin', a, b, z0, z1, hi, OH, 0.0), c)
        cur = b
    add('plaster', wb('ow', cur, OX1, z0, z1, 0.1, OH, 0.0), c)
seg_x(OZ1 - T, OZ1, [(-2.6, -1.4, 0.1, 2.3), (0.8, 3.2, 1.0, 2.4)])                       # front: glass door left, window right
seg_x(OZ0, OZ0 + T, [(-2.4, -1.5, 0.1, 2.2), (1.6, 2.6, 1.3, 2.3)])                      # back: plain door, barred window
for sx0, sx1 in ((OX0, OX0 + T), (OX1 - T, OX1)):
    add('plaster', wb('os', sx0, sx1, OZ0 + T, OZ1 - T, 0.1, OH, 0.0), WHITE)
# glass: door + window panes (pale blue, frames navy)
for (a, b, lo, hi) in ((-2.6, -1.4, 0.1, 2.3), (0.8, 3.2, 1.0, 2.4)):
    add('paint', wb('glass', a + 0.06, b - 0.06, OZ1 - 0.14, OZ1 - 0.12, lo + 0.06, hi - 0.06, 0.0), 0x9FC3D4)
    for xx0, xx1, y0, y1 in ((a, a + 0.07, lo, hi), (b - 0.07, b, lo, hi), (a, b, hi - 0.07, hi), (a, b, lo, lo + 0.07)):
        add('plinth', wb('gframe', xx0, xx1, OZ1 - 0.2, OZ1 + 0.02, y0, y1, 0.0), NAVY)
add('plinth', wb('door_mid', -2.0 - 0.02, -2.0 + 0.02, OZ1 - 0.2, OZ1 + 0.02, 0.1, 2.3, 0.0), NAVY)
add('paint', wb('handle', -1.55, -1.5, OZ1 + 0.02, OZ1 + 0.08, 1.0, 1.4, 0.0), STEEL)
add('trim', wb('office_step', -2.9, -1.1, OZ1, OZ1 + 0.5, 0.1, 0.25, 0.0), SLAB)
# back: barred window + plain door details
for k in range(1, 8):
    add('metal', wb('bar', 1.6 + k * 0.125, 1.6 + k * 0.125 + 0.024, OZ0 - 0.02, OZ0 + 0.05, 1.3, 2.3, 0.0), 0x3A3C3E)
add('wood', wb('back_door', -2.35, -1.55, OZ0 - 0.03, OZ0 + 0.05, 0.1, 2.15, 0.004), 0x4A3A30)
# navy base band + orange roof line, slab, parapet, tank
add('plinth', wb('band_f', OX0 - 0.02, OX1 + 0.02, OZ1 - T - 0.03, OZ1 + 0.03, 0.1, 0.9, 0.0), NAVY)
add('plinth', wb('band_b', OX0 - 0.02, OX1 + 0.02, OZ0 - 0.03, OZ0 + 0.03, 0.1, 0.9, 0.0), NAVY)
add('plinth', wb('band_l', OX0 - 0.03, OX0 + 0.03, OZ0, OZ1, 0.1, 0.9, 0.0), NAVY)
add('plinth', wb('band_r', OX1 - 0.03, OX1 + 0.03, OZ0, OZ1, 0.1, 0.9, 0.0), NAVY)
add('trim', wb('oslab', OX0 - 0.2, OX1 + 0.2, OZ0 - 0.0, OZ1 + 0.2, OH, OH + 0.2, 0.01), 0xB4B1A9)
add('plinth', wb('oroof_line', OX0 - 0.22, OX1 + 0.22, OZ0 - 0.02, OZ1 + 0.22, OH + 0.04, OH + 0.12, 0.0), ORANGE)
for (a, b, c, d) in ((OX0, OX1, OZ0, OZ0 + 0.2), (OX0, OX1, OZ1 - 0.2, OZ1), (OX0, OX0 + 0.2, OZ0 + 0.2, OZ1 - 0.2), (OX1 - 0.2, OX1, OZ0 + 0.2, OZ1 - 0.2)):
    add('plaster', wb('opar', a, b, c, d, OH + 0.2, 4.4, 0.0), WHITE)
    add('plinth', wb('opar_cap', a - 0.04, b + 0.04, c - 0.04, d + 0.04, 4.4, 4.46, 0.0), ORANGE)
add('paint', cyl('tank', -2.5, -8.0, 4.0, 5.2, 0.62, 0.62, 18), 0x1C1C1F)
add('paint', sphere('tank_dome', -2.5, -8.0, 5.2, 0.62, 0.62, 0.22, 2), 0x1C1C1F)
for hr in (4.3, 4.8):
    add('paint', cyl('tank_rib', -2.5, -8.0, hr, hr + 0.05, 0.645, 0.645, 18), 0x2A2A2E)
add('trim', wb('ofloor', OX0 + T, OX1 - T, OZ0 + T, OZ1 - T, 0.1, 0.15, 0.0), 0x8E8B83)
# inside: a desk + chair, a wall rack (no brands), a calendar-less wall
add('wood', wb('desk', -1.0, 1.2, -9.0, -8.2, 0.72, 0.78, 0.006), 0x8A6A48)
for x in (-0.95, 1.15):
    for z in (-8.95, -8.25):
        add('wood', wb('desk_leg', x - 0.03, x + 0.03, z - 0.03, z + 0.03, 0.15, 0.72, 0.0), 0x6A4A32)
# air stand left of the office, water cooler + fire buckets + extinguishers on the right
add('metal', limb('air_post', (-6.5, -7.0, 0.1), (-6.5, -7.0, 1.4), 0.12, 0.1), NAVY)
add('paint', wb('air_gauge', -6.58, -6.42, -7.12, -7.05, 1.0, 1.2, 0.0), 0xE8E4D8)
add('metal', limb('air_hose', (-6.4, -7.0, 1.3), (-5.9, -6.5, 0.5), 0.03), BLK)
add('trim', wb('air_base', -6.8, -6.2, -7.3, -6.7, 0.1, 0.18, 0.01), SLAB)
add('metal', wb('cooler', 5.3, 5.9, -9.7, -9.2, 0.1, 1.15, 0.02), 0xCFD6DA)
add('metal', cyl('cooler_tap', 5.6, -9.15, 0.95, 1.05, 0.04, 0.04, 8), BRASS)
add('metal', wb('cooler_top', 5.25, 5.95, -9.75, -9.15, 1.15, 1.2, 0.0), 0x9AA3A8)
for k in range(3):
    add('metal', cyl('fire_bucket', 6.4 + k * 0.45, -9.5, 0.1, 0.4, 0.15, 0.2, 12), 0xB3231C)
    add('paint', cyl('sand', 6.4 + k * 0.45, -9.5, 0.36, 0.4, 0.17, 0.17, 12), 0xC9B484)
for k in range(2):
    add('metal', cyl('extinguisher', 7.6 + k * 0.35, -9.6, 0.1, 0.7, 0.07, 0.07, 10), 0xC62828)
    add('metal', cyl('ext_neck', 7.6 + k * 0.35, -9.6, 0.7, 0.78, 0.03, 0.03, 8), 0x1B1B1D)
    add('metal', cyl('ext_cap', 7.6 + k * 0.35, -9.6, 0.78, 0.82, 0.05, 0.05, 8), 0x1B1B1D)
add('trim', wb('rack', 5.1, 8.4, -9.9, -9.7, 0.1, 0.12, 0.0), SLAB)
# pole sign 6 m tall, front-left corner: navy pole, blank orange panels (no marks)
px, pz = -13.0, 8.5
add('metal', limb('sign_pole', (px, pz, 0.1), (px, pz, 6.0), 0.3, 0.25), NAVY)
add('trim', wb('sign_foot', px - 0.5, px + 0.5, pz - 0.5, pz + 0.5, 0.1, 0.4, 0.01), SLAB)
add('plinth', wb('sign_frame', px - 1.3, px + 1.3, pz - 0.15, pz + 0.15, 3.6, 6.0, 0.02), NAVY)
add('plinth', wb('sign_panel_f', px - 1.15, px + 1.15, pz + 0.15, pz + 0.17, 3.75, 5.85, 0.0), ORANGE)
add('plinth', wb('sign_panel_b', px - 1.15, px + 1.15, pz - 0.17, pz - 0.15, 3.75, 5.85, 0.0), ORANGE)
add('plinth', wb('sign_stripe_f', px - 1.15, px + 1.15, pz + 0.17, pz + 0.18, 4.55, 4.75, 0.0), NAVY)
# two flush underground tank lids in the front-right forecourt
for (lx, lz) in ((10.0, 4.0), (12.2, 6.0)):
    add('metal', cyl('tank_lid', lx, lz, 0.1, 0.13, 0.45, 0.45, 20), 0x6C7074)
    add('metal', cyl('tank_lid_in', lx, lz, 0.13, 0.145, 0.3, 0.3, 16), 0x5E6266)

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.03})
