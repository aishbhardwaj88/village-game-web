"""
Paani ki tanki + transformer - arch.py Kit, to Places V1/paani_tanki/LAYOUT.md (+ REF photo for form). Run: tools/blender/make.sh paani_tanki paani_tanki_v2
Frame: site-local metres, +z south = front (gate). Earth patch 20 x 20 m with a low brick boundary + iron gate at the centre of the front wall.
Overhead tank ~24 m in all: weathered grey concrete cylinder 7 m across x 6 m tall on a round gallery slab with railing, shallow dome roof with a railed hatch and
lightning rod; 6 round concrete columns 16 m tall tied by 3 levels of beams; open concrete zig-zag staircase with iron railings up the RIGHT side (landing at each beam
level, foot at the back-right); thick inlet/outlet pipe down the middle. Small brick pump room back-left; transformer on a double (H) pole inside a small iron-mesh
fence, front-right. No lettering (a faded stencil may be added later).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, join_objects, ROOT
from arch import Kit, lathe, ring, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'paani_tanki_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(31)
add = kit.add
CONC = 0xB1B7B8
CONC_D = 0x9CA2A3
IRONC = 0x4A4D52
R_COL = 4.2
H_COL = 16.0


def conc(o, c=CONC):
    return add('trim', o, c)


add('paint', wb('patch', -10, 10, -10, 10, -0.08, 0.04, 0.0), 0xA89068)
add('paint', wb('patch_worn', -2, 2, 2, 10, 0.04, 0.046, 0.0), 0x95795A)
# boundary 1.3 m brick, iron gate 2.4 m at the centre front
for (a, b, z, along_x) in ((-10, -1.2, 10, True), (1.2, 10, 10, True), (-10, 10, -10, True)):
    pk.brick_wall_run(kit, a, z, b, z, 1.3, 0.35)
pk.brick_wall_run(kit, -10, -10, -10, 10, 1.3, 0.35)
pk.brick_wall_run(kit, 10, -10, 10, 10, 1.3, 0.35)
for sg in (-1, 1):
    add('brick', wb('gate_pier', sg * 1.2 - 0.25, sg * 1.2 + 0.25, 9.8, 10.2, 0, 1.9, 0.01))
    conc(wb('gate_pier_cap', sg * 1.2 - 0.3, sg * 1.2 + 0.3, 9.75, 10.25, 1.9, 1.98, 0.006), 0xADB1AF)
    add('metal', limb('gate_hinge', (sg * 0.95, 10.0, 0.1), (sg * 0.95, 10.0, 1.75), 0.05), IRONC)
    add('metal', limb('gate_free', (sg * 0.05, 10.0, 0.1), (sg * 0.05, 10.0, 1.75), 0.05), IRONC)
    for h in (0.2, 0.9, 1.6):
        add('metal', limb('gate_rail', (sg * 0.95, 10.0, h), (sg * 0.05, 10.0, h), 0.04), IRONC)
    for i in range(1, 8):
        x = sg * (0.95 - 0.9 * i / 8)
        add('metal', limb('gate_bar', (x, 10.0, 0.2), (x, 10.0, 1.65), 0.02), IRONC)
# columns, 6 round concrete columns on a ring, ring beams at 3 levels
cols = [(R_COL * math.cos(i * math.pi / 3 + math.pi / 6), R_COL * math.sin(i * math.pi / 3 + math.pi / 6)) for i in range(6)]
for i, (cx, cz) in enumerate(cols):
    conc(cyl('col_base', cx, cz, 0, 0.9, 0.62, 0.55, 14), CONC_D)
    conc(cyl('col', cx, cz, 0.9, H_COL, 0.46, 0.44, 14), CONC if i % 2 else 0xAAB0B0)
for hh in (5.3, 10.6, 15.6):
    for i in range(6):
        a, b = cols[i], cols[(i + 1) % 6]
        conc(limb('beam', (a[0], a[1], hh), (b[0], b[1], hh), 0.42, 0.5), CONC)
# the gallery slab + tank + dome
G0 = H_COL
conc(cyl('gallery', 0, 0, G0, G0 + 0.7, 5.0, 5.0, 32), 0xACB2B2)
conc(cyl('gallery_under', 0, 0, G0 - 0.5, G0, 4.5, 4.9, 32), CONC_D)
conc(lathe('tank', 0, 0, [(3.5, G0 + 0.7), (3.5, G0 + 6.7), (3.6, G0 + 6.75), (3.6, G0 + 6.9), (0.0, G0 + 6.9)], seg=40), 0xB5BDBD)
conc(lathe('dome', 0, 0, [(3.6, G0 + 6.9), (3.0, G0 + 7.45), (1.8, G0 + 7.85), (0.9, G0 + 8.0), (0.0, G0 + 8.0)], seg=40), 0xA8AEAE)
# hatch + rail on the dome, lightning rod
conc(cyl('hatch', 0, 0, G0 + 8.0, G0 + 8.45, 0.7, 0.7, 14), CONC)
conc(lathe('hatch_dome', 0, 0, [(0.78, G0 + 8.45), (0.5, G0 + 8.7), (0.0, G0 + 8.8)], seg=14), 0xAAB0B0)
add('metal', limb('lrod', (0, 0, G0 + 8.8), (0, 0, G0 + 9.0 + 0.8), 0.04), 0x4A4C50)
for k in range(8):
    a = k / 8 * math.tau
    add('metal', limb('hatch_post', (1.2 * math.cos(a), 1.2 * math.sin(a), G0 + 7.85), (1.2 * math.cos(a), 1.2 * math.sin(a), G0 + 8.5), 0.04), IRONC)
for hh in (G0 + 8.25, ):
    for k in range(8):
        a0, a1 = k / 8 * math.tau, (k + 1) / 8 * math.tau
        add('metal', limb('hatch_rail', (1.2 * math.cos(a0), 1.2 * math.sin(a0), hh), (1.2 * math.cos(a1), 1.2 * math.sin(a1), hh), 0.03), IRONC)
# railed gallery walkway: posts every ~0.8 m, two rails
RR = 4.85
n = 36
for k in range(n):
    a0, a1 = k / n * math.tau, (k + 1) / n * math.tau
    add('metal', limb('rail_post', (RR * math.cos(a0), RR * math.sin(a0), G0 + 0.7), (RR * math.cos(a0), RR * math.sin(a0), G0 + 1.8), 0.05), IRONC)
    for hh in (G0 + 1.8, G0 + 1.2):
        add('metal', limb('rail', (RR * math.cos(a0), RR * math.sin(a0), hh), (RR * math.cos(a1), RR * math.sin(a1), hh), 0.04), IRONC)
# inlet/outlet pipe down the middle + a vertical pipe along the tank wall
add('metal', cyl('main_pipe', 0, 0, 0, G0 + 0.1, 0.2, 0.2, 12), 0x5B4A3E)
for hh in (3.0, 8.0, 12.5):
    add('metal', cyl('pipe_flange', 0, 0, hh, hh + 0.15, 0.3, 0.3, 12), 0x4A3F36)
add('metal', cyl('wall_pipe', 0, 3.58, G0 + 0.7, G0 + 6.4, 0.1, 0.1, 10), 0x5B4A3E)
# staircase on the RIGHT side: three zig-zag flights, 1.2 m wide, landings at the beam levels, foot at the back-right
SX = 6.0
W = 1.3
levels = [(G0 + 0.7, 'top'), (10.6 + 0.25, 'L2'), (5.3 + 0.25, 'L1'), (0.0, 'L0')]
dirs = [(+1, -1), (-1, +1), (+1, -1)]       # z start -> z end sign per flight
zs = 4.3
step_rise, step_run = 0.2, 0.28
cur_z = zs
for f in range(3):
    h_top, h_bot = levels[f][0], levels[f + 1][0]
    nst = int(round((h_top - h_bot) / step_rise))
    run = nst * step_run
    z_a = cur_z
    z_b = z_a - run if f % 2 == 0 else z_a + run
    sgn = -1 if z_b < z_a else 1
    # slab under the steps (sloped)
    conc(limb('stringer', (SX, z_a, h_top - 0.1), (SX, z_b, h_bot - 0.1), W, 0.22), 0xA5ABAB)
    for i in range(nst):
        t0 = i / nst
        z = z_a + (z_b - z_a) * (i + 0.5) / nst
        hh = h_top - (i + 1) * (h_top - h_bot) / nst
        conc(wb('step', SX - W / 2, SX + W / 2, z - step_run / 2, z + step_run / 2, hh, hh + 0.1, 0.0), 0xAEB4B4)
    for side in (-1, 1):
        add('metal', limb('hand', (SX + side * (W / 2 - 0.03), z_a, h_top + 0.95), (SX + side * (W / 2 - 0.03), z_b, h_bot + 0.95), 0.045), IRONC)
        add('metal', limb('hand_mid', (SX + side * (W / 2 - 0.03), z_a, h_top + 0.5), (SX + side * (W / 2 - 0.03), z_b, h_bot + 0.5), 0.03), IRONC)
        for k in range(0, nst + 1, 4):
            z = z_a + (z_b - z_a) * k / nst
            hh = h_top - k * (h_top - h_bot) / nst
            add('metal', limb('hand_post', (SX + side * (W / 2 - 0.03), z, hh), (SX + side * (W / 2 - 0.03), z, hh + 0.95), 0.035), IRONC)
    # landing at the bottom of this flight (not at ground)
    if f < 2:
        lz0, lz1 = (z_b - 1.4, z_b) if z_b < z_a else (z_b, z_b + 1.4)
        conc(wb('landing', SX - W / 2 - 0.05, SX + W / 2 + 0.05, lz0, lz1, h_bot - 0.2, h_bot, 0.01), 0xAAB0B0)
        for side in (-1, 1):
            add('metal', limb('land_rail', (SX + side * (W / 2), lz0, h_bot + 0.95), (SX + side * (W / 2), lz1, h_bot + 0.95), 0.045), IRONC)
        cur_z = lz0 if z_b < z_a else lz1
        cur_z = cur_z  # the next flight starts at the far edge of the landing
        if z_b < z_a:
            cur_z = lz0
        else:
            cur_z = lz1
# a landing slab at the top joining the gallery
conc(wb('top_landing', SX - W / 2 - 0.05, SX + W / 2 + 0.05, zs, zs + 1.6, G0 + 0.45, G0 + 0.7, 0.01), 0xAAB0B0)
conc(limb('top_bridge', (SX - W / 2, zs + 0.8, G0 + 0.55), (RR - 0.1, zs * 0.55, G0 + 0.55), 1.0, 0.25), 0xAAB0B0)
# pump room (brick, back-left)
px0, px1, pz0, pz1 = -9.0, -5.8, -9.0, -6.2
add('brick', wb('pump_room', px0, px1, pz0, pz1, 0, 2.7, 0.0))
conc(wb('pump_roof', px0 - 0.2, px1 + 0.2, pz0 - 0.2, pz1 + 0.2, 2.7, 2.9, 0.01), 0xACB1B1)
add('metal', wb('pump_door', px0 + 0.8, px0 + 1.9, pz1 - 0.02, pz1 + 0.06, 0.0, 2.1, 0.0), 0x5C6066)
add('metal', wb('pump_vent', px1 - 1.0, px1 - 0.4, pz1 - 0.02, pz1 + 0.04, 1.9, 2.3, 0.0), 0x3A3C3E)
# transformer on an H-pole inside a small iron-mesh fence (front-right)
tx, tz = 5.5, 5.0
for dx in (-0.7, 0.7):
    conc(limb('hpole', (tx + dx, tz, 0), (tx + dx, tz, 7.5), 0.26, 0.2), 0xA1A6A7)
conc(wb('hpole_platform', tx - 1.0, tx + 1.0, tz - 0.6, tz + 0.6, 3.2, 3.35, 0.0), 0x868B8B)
for hh in (3.9, 6.3):
    add('metal', limb('hpole_bar', (tx - 0.8, tz, hh), (tx + 0.8, tz, hh), 0.08, 0.1), IRONC)
add('paint', wb('tx_tank', tx - 0.55, tx + 0.55, tz - 0.35, tz + 0.35, 3.35, 4.45, 0.02), 0x5E6A72)
for k in range(8):
    add('paint', wb('tx_fin', tx - 0.6, tx + 0.6, tz - 0.4 + k * 0.1, tz - 0.34 + k * 0.1, 3.5, 4.3, 0.0), 0x4F5B63)
for k in range(3):
    add('paint', cyl('tx_insulator', tx - 0.4 + k * 0.4, tz, 4.45, 5.0, 0.07, 0.05, 8), 0x7A4A32)
    add('metal', limb('tx_wire', (tx - 0.4 + k * 0.4, tz, 5.0), (tx - 0.4 + k * 0.4, tz, 6.3), 0.025), 0x1B1B1D)
add('paint', wb('fuse_box', tx + 0.9, tx + 1.35, tz - 0.5, tz - 0.3, 1.5, 2.2, 0.01), 0x7A7D80)
add('metal', limb('pole_wire', (tx - 0.7, tz, 7.3), (tx + 0.7, tz, 7.3), 0.02), 0x1B1B1D)
# fence 3.4 x 3 m: posts + top rail + vertical bars (mesh read)
fx0, fx1, fz0, fz1 = tx - 1.7, tx + 1.7, tz - 1.5, tz + 1.5
for (a, b, c, d) in ((fx0, fx1, fz0, fz0), (fx0, fx1, fz1, fz1), (fx0, fx0, fz0, fz1), (fx1, fx1, fz0, fz1)):
    L = max(abs(b - a), abs(d - c))
    n = int(L / 0.28)
    for i in range(n + 1):
        x, z = a + (b - a) * i / n, c + (d - c) * i / n
        add('metal', limb('mesh_bar', (x, z, 0.0), (x, z, 1.9), 0.018), 0x6C7074)
    for hh in (0.05, 0.6, 1.2, 1.88):
        add('metal', limb('mesh_rail', (a, c, hh), (b, d, hh), 0.03), 0x5E6266)
for (x, z) in ((fx0, fz0), (fx1, fz0), (fx0, fz1), (fx1, fz1)):
    add('metal', limb('fence_post', (x, z, 0), (x, z, 2.0), 0.07), IRONC)

TINTS = {'hb_plaster': '#FFF2D0', 'hb_trim': '#FFFFFF', 'hb_wood': '#8A6A48', 'hb_brick': '#AE6C54', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1, 'hb_trim': 0.1}, drift_amp=0.07)
