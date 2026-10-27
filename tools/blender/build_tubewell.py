"""
Tubewell + kothri - arch.py Kit, to Places V1/tubewell/LAYOUT.md. Run: tools/blender/make.sh tubewell tubewell_v2
Frame: site-local metres, +z south = front (field edge). Packed-earth patch 12 x 10 m: x[-6,6] z[-5,5] (grass tufts are hers).
Kothri back-left: brick pump room 3.5 x 3 m, 3 m tall, flat slab roof, grey iron door open (motor + pump, starter box, pipes, bulb inside), meter box on its
RIGHT side, wires to an 8 m concrete pole at the back-right. Thick pipe gushing into a cement hauz 2.5 x 2.5 x 0.8 m in front of the kothri; ONE brick channel
0.5 m wide from the hauz to the front edge. Right: charpai, matka + lota, spade + sickle, slippers (the shisham tree is hers).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, lathe, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'tubewell_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(21)
add = kit.add
CEM = pk.CEMENT
IRON = 0x6E7378

add('paint', wb('patch', -6, 6, -5, 5, -0.08, 0.04, 0.0), 0x8A7058)
add('paint', wb('worn', -2.5, 6, -1, 4.8, 0.04, 0.046, 0.0), 0x6E5842)
# kothri
x0, x1, z0, z1 = -5.5, -2.0, -4.5, -1.5
T = 0.3
H = 3.0
# walls: back, left, right solid; front with a 1.1 m door gap
vx0, vx1 = x0 + 1.4, x0 + 2.1
add('brick', wb('k_back_l', x0, vx0, z0, z0 + T, 0, H, 0.0))
add('brick', wb('k_back_r', vx1, x1, z0, z0 + T, 0, H, 0.0))
add('brick', wb('k_back_lo', vx0, vx1, z0, z0 + T, 0, 2.0, 0.0))
add('brick', wb('k_back_hi', vx0, vx1, z0, z0 + T, 2.6, H, 0.0))
# vent opening high on the back wall: iron bars + sill, so daylight reaches the motor
add('trim', wb('vent_sill', vx0 - 0.05, vx1 + 0.05, z0 - 0.04, z0 + T + 0.02, 1.96, 2.0, 0.0), 0xB4B1A9)
for k in range(5):
    add('metal', wb('vent_bar', vx0 + 0.08 + k * 0.14, vx0 + 0.11 + k * 0.14, z0 + 0.1, z0 + 0.13, 2.0, 2.6, 0.0), 0x3A3C40)
add('brick', wb('k_left', x0, x0 + T, z0 + T, z1 - T, 0, H, 0.0))
add('brick', wb('k_right', x1 - T, x1, z0 + T, z1 - T, 0, H, 0.0))
dx0, dx1 = x0 + 0.7, x0 + 1.85
add('brick', wb('k_front_l', x0, dx0, z1 - T, z1, 0, H, 0.0))
add('brick', wb('k_front_r', dx1, x1, z1 - T, z1, 0, H, 0.0))
add('brick', wb('k_front_lintel', dx0, dx1, z1 - T, z1, 2.2, H, 0.0))
# window vent high on the back wall
# flat slab roof with overhang + parapet-less rim
add('trim', wb('k_slab', x0 - 0.25, x1 + 0.25, z0 - 0.25, z1 + 0.35, H, H + 0.2, 0.01), 0xB4B1A9)
add('trim', wb('k_rim', x0 - 0.27, x1 + 0.27, z1 + 0.3, z1 + 0.37, H + 0.2, H + 0.3, 0.004), 0xB4B1A9)
# door: frame + grey iron leaf standing open (swung outside against the front wall)
for xx0, xx1, y0, y1 in ((dx0, dx0 + 0.08, 0, 2.2), (dx1 - 0.08, dx1, 0, 2.2), (dx0, dx1, 2.12, 2.2)):
    add('metal', wb('df', xx0, xx1, z1 - T - 0.02, z1 + 0.03, y0, y1, 0.0), 0x4A4D52)
add('metal', wb('door_leaf', dx1 + 0.02, dx1 + 1.1, z1 + 0.05, z1 + 0.1, 0.05, 2.12, 0.004), 0x7C8084)
add('metal', wb('door_rib', dx1 + 0.1, dx1 + 1.0, z1 + 0.1, z1 + 0.115, 0.3, 1.9, 0.0), 0x6C7074)
add('paint', wb('door_latch', dx1 + 0.9, dx1 + 1.0, z1 + 0.1, z1 + 0.18, 1.0, 1.1, 0.0), BRASS)
# inside: floor, motor on a concrete bed, pump, starter box on the wall, pipes, a bulb
add('trim', wb('k_floor', x0 + T, x1 - T, z0 + T, z1 - T, 0, 0.05, 0.0), 0xB5B1A8)
mx, mz = x0 + 1.2, z0 + 1.1
add('trim', wb('motor_bed', mx - 0.5, mx + 0.9, mz - 0.4, mz + 0.4, 0.05, 0.2, 0.01), CEM)
add('paint', cyl('motor', mx, mz, 0.2, 0.75, 0.3, 0.3, 14), 0x2E5E7A)
add('paint', cyl('motor_cap', mx, mz, 0.75, 0.85, 0.22, 0.22, 14), 0x1F4A63)
add('metal', cyl('pump_body', mx + 0.75, mz, 0.2, 0.55, 0.22, 0.2, 12), 0x3F4A52)
add('metal', limb('pipe_h', (mx + 0.75, mz, 0.4), (x1 - T, mz, 0.4), 0.14), IRON)
add('metal', limb('pipe_v', (mx + 0.75, mz, 0.55), (mx + 0.75, mz, 1.6), 0.12), IRON)
add('metal', limb('pipe_w', (mx + 0.75, mz, 1.6), (x1 - T, mz, 1.6), 0.12), IRON)
add('paint', wb('starter_box', x0 + 0.35, x0 + 0.85, z0 + T, z0 + T + 0.15, 1.3, 1.85, 0.01), 0x7A7D80)
add('paint', wb('starter_door', x0 + 0.4, x0 + 0.8, z0 + T + 0.15, z0 + T + 0.17, 1.35, 1.8, 0.0), 0x6C7074)
add('metal', limb('wire_in', (x0 + 0.6, z0 + T + 0.1, 1.85), (x0 + 0.6, z0 + T + 0.1, 2.9), 0.03), 0x1B1B1D)
add('paint', sphere('bulb', x0 + 1.9, z0 + 1.4, 2.7, 0.07, 0.07, 0.09, 1), 0xF4E9B0)
add('metal', limb('bulb_cord', (x0 + 1.9, z0 + 1.4, 2.95), (x0 + 1.9, z0 + 1.4, 2.77), 0.015), 0x1B1B1D)
# meter box on the RIGHT side wall (outside)
add('paint', wb('meter_box', x1, x1 + 0.18, z0 + 1.0, z0 + 1.6, 1.4, 2.0, 0.01), 0x7A7D80)
add('paint', wb('meter_glass', x1 + 0.18, x1 + 0.2, z0 + 1.1, z0 + 1.5, 1.6, 1.9, 0.0), 0x9FB3B8)
# 8 m concrete pole, back-right, with a crossarm and wires running to the kothri roof
px, pz = 4.8, -3.9
add('trim', limb('pole', (px, pz, 0), (px, pz, 8.0), 0.24, 0.18), 0xA9A69F)
add('metal', limb('crossarm', (px - 0.7, pz, 7.5), (px + 0.7, pz, 7.5), 0.08, 0.1), 0x4A4C50)
for dx in (-0.6, 0, 0.6):
    add('paint', cyl('ins', px + dx, pz, 7.52, 7.7, 0.05, 0.04, 8), 0xC9C4B4)
for dz in (0.0, 0.08, 0.16):
    add('metal', limb('wire', (px - 0.6, pz, 7.65), (x1 + 0.25, z0 + 0.5 + dz * 3, H + 0.45), 0.012, 0.012), 0x1B1B1D)
# hauz 2.5 x 2.5 x 0.8 in front of the kothri, thick pipe gushing into it from the kothri's front wall
hx0, hx1, hz0, hz1 = -4.6, -2.1, -0.9, 1.6
t = 0.2
add('trim', wb('hauz_n', hx0, hx1, hz0, hz0 + t, 0, 0.8, 0.01), CEM)
add('trim', wb('hauz_s', hx0, hx1, hz1 - t, hz1, 0, 0.8, 0.01), CEM)
add('trim', wb('hauz_w', hx0, hx0 + t, hz0 + t, hz1 - t, 0, 0.8, 0.01), CEM)
add('trim', wb('hauz_e', hx1 - t, hx1, hz0 + t, hz1 - t, 0, 0.8, 0.01), CEM)
add('trim', wb('hauz_floor', hx0, hx1, hz0, hz1, 0, 0.1, 0.0), 0x8E8B83)
add('paint', wb('hauz_water', hx0 + t, hx1 - t, hz0 + t, hz1 - t, 0.1, 0.62, 0.0), 0x5E8A86)
add('metal', limb('gush_pipe_a', (dx0 + 0.55, z1 - T, 0.9), (dx0 + 0.55, hz0 + 0.5, 0.9), 0.2), IRON)
add('metal', limb('gush_pipe_b', (dx0 + 0.55, hz0 + 0.5, 0.9), (dx0 + 0.55, hz0 + 0.55, 0.62), 0.2), IRON)
add('paint', limb('gush', (dx0 + 0.55, hz0 + 0.56, 0.9), (dx0 + 0.55, hz0 + 0.62, 0.6), 0.2, 0.12), 0xCFE3E4)
add('paint', limb('gush_core', (dx0 + 0.55, hz0 + 0.56, 0.85), (dx0 + 0.55, hz0 + 0.6, 0.62), 0.11, 0.08), 0xEEF6F6)
add('paint', cyl('splash', dx0 + 0.55, hz0 + 0.66, 0.6, 0.66, 0.32, 0.26, 12), 0xDDEBEB)
# ONE brick channel 0.5 m wide from the hauz to the front edge, centred on the hauz
cx = (hx0 + hx1) / 2
add('brick', wb('chan_l', cx - 0.4, cx - 0.25, hz1, 5.0, 0, 0.18, 0.0))
add('brick', wb('chan_r', cx + 0.25, cx + 0.4, hz1, 5.0, 0, 0.18, 0.0))
add('paint', wb('chan_bed', cx - 0.25, cx + 0.25, hz1 - 0.05, 5.0, 0, 0.04, 0.0), 0x6E5B42)
add('trim', wb('outlet', cx - 0.25, cx + 0.25, hz1 - 0.2, hz1, 0.1, 0.2, 0.0), CEM)
# the right side: charpai, matka + lota, spade + sickle, slippers (tree is hers)
pk.charpai(kit, 3.3, 1.2, 0.25)
pk.pot(kit, 2.0, 2.6, 0.0, 0.9)
add('metal', cyl('lota', 2.5, 2.7, 0, 0.14, 0.06, 0.08, 10), BRASS)
add('metal', limb('spade_shaft', (4.6, 3.4, 0.0), (4.9, 3.0, 1.1), 0.04), 0x8A6A48)
add('metal', wb('spade_blade', 4.55, 4.7, 3.4, 3.6, 0.0, 0.3, 0.004), 0x7C8084)
add('metal', limb('sickle_h', (4.2, 3.7, 0.04), (4.4, 3.76, 0.04), 0.05, 0.04), 0x6A4A2E)
add('metal', limb('sickle_b', (3.75, 3.6, 0.03), (4.2, 3.7, 0.03), 0.04, 0.015), STEEL)
for k, (sx, sz, a) in enumerate(((2.4, 0.4, 0.3), (2.6, 0.6, 0.5))):
    add('paint', limb('slipper', (sx - 0.13, sz, 0.03), (sx + 0.13, sz + 0.04, 0.03), 0.09, 0.04), 0x2E5E8B if k == 0 else 0xC9A83A)
# the tree's root platform: a low mud ring where the shisham stands (tree is hers)
pk.brick_ring(kit, 4.3, -0.8, 0.9, 0, 0.18, 0.2, 16)
add('paint', cyl('root_soil', 4.3, -0.8, 0.0, 0.15, 0.82, 0.82, 16), 0x4A3524)

TINTS = {'hb_plaster': '#FFF2D0', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_brick': '#A8705C', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})
