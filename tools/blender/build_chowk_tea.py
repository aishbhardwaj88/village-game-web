"""
The chowk tea stall ("Yadav Chai Nashta") — Blender model from Places V1/tea_stall_chowk/MAIN_tea_stall_chowk_orthos.png
(checklist: docs/chowk-checklist.md). Run: tools/blender/make.sh chowk_tea tea_stall_chowk
LOCAL frame = src/bazaar.js's buildTeaStallChowk group: origin = stall centre, front (open, counter side) = -wz, solid back wall at
+wz; 6 m wide (x) x 3.5 m deep (z); roof edge 2.8, counter 0.9. Exact slot at CHOWK_TEA_POS with rotationY CHOWK_TEA_ROT. The code wall/
counter/posts/roof stay hidden (`tea_stall_chowk` group) as collision backing; the painted sign is the existing code signboard.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, quad, ROOT
from arch import Kit, ring, dabba, clay_pot, plastic_chair, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'tea_stall_chowk_raw.glb')
kit = Kit(split_props=False, wood_slot='props')
rnd = random.Random(14)
TEAL = 0x3E7F86
TEAL_D = 0x2F646A
W, D = 6.0, 3.5
FZ, BZ = -D / 2, D / 2      # front / back planes
ROOF_E, ROOF_B = 2.8, 3.3   # roof edge (front) / back height


def structure():
    kit.add('plaster', wb('back_wall', -W / 2, W / 2, BZ - 0.22, BZ, 0, 2.8, 0.01))
    kit.add('plinth', wb('back_band', -W / 2, W / 2, BZ, BZ + 0.025, 0, 0.5, 0.005))
    kit.add('plinth', wb('back_band_in', -W / 2, W / 2, BZ - 0.245, BZ - 0.22, 0, 0.5, 0.005))
    # weathered patches of exposed brick on the outer (back) face, as in the reference's back view
    for (x, h, w_, hh) in ((-2.0, 1.4, 0.9, 0.7), (-1.1, 1.9, 0.6, 0.5), (1.6, 1.1, 0.7, 0.5)):
        kit.add('brick', wb('patch', x - w_ / 2, x + w_ / 2, BZ, BZ + 0.015, h, h + hh, 0.004))
    # four teal posts (front pair at the roof edge, rear pair carrying the high back edge)
    for x in (-W / 2 + 0.1, W / 2 - 0.1):
        kit.add('paint', wb('post_f', x - 0.06, x + 0.06, FZ + 0.04, FZ + 0.16, 0, ROOF_E, 0.006), TEAL)
        kit.add('paint', wb('post_b', x - 0.06, x + 0.06, BZ - 0.16, BZ - 0.04, 0, ROOF_B, 0.006), TEAL)
    kit.add('paint', wb('beam_f', -W / 2, W / 2, FZ + 0.04, FZ + 0.16, ROOF_E - 0.18, ROOF_E, 0.006), TEAL)
    # single-pitch corrugated tin roof, low at the open front, with a brick-red cap strip along the high back edge
    kit.add('tin', prism_x('roof', -W / 2 - 0.25, W / 2 + 0.25, [(FZ - 0.15, ROOF_E + 0.02), (BZ + 0.1, ROOF_B + 0.02), (BZ + 0.1, ROOF_B + 0.08), (FZ - 0.15, ROOF_E + 0.08)]))
    for k in range(10):
        kit.add('brick', wb('cap_brick', -W / 2 - 0.2 + k * 0.62, -W / 2 - 0.2 + k * 0.62 + 0.58, BZ - 0.05, BZ + 0.15, ROOF_B + 0.06, ROOF_B + 0.2, 0.008))
    kit.add('paint', limb('roof_stay_l', (-W / 2 + 0.1, FZ + 0.1, ROOF_E - 0.1), (-W / 2 + 0.1, FZ + 0.9, ROOF_E + 0.12), 0.04, 0.04), TEAL_D)
    kit.add('paint', limb('roof_stay_r', (W / 2 - 0.1, FZ + 0.1, ROOF_E - 0.1), (W / 2 - 0.1, FZ + 0.9, ROOF_E + 0.12), 0.04, 0.04), TEAL_D)
    # raised sign frame posts (the code sign hangs at y ~ roofEdge + 0.8, 4.8 wide, in front of the back edge of the roof)
    for x in (-2.1, 2.1):
        kit.add('paint', limb('sign_post', (x, FZ + 0.25, ROOF_E), (x, FZ + 0.25, ROOF_E + 1.35), 0.07, 0.07), TEAL_D)
    # ochre-banded plinth for the whole structure + a poured floor
    kit.add('floor', wb('floor', -W / 2, W / 2, FZ, BZ - 0.22, -0.01, 0.05, 0))
    kit.add('apron', wb('step', -W / 2 + 0.1, W / 2 - 0.1, FZ - 0.5, FZ + 0.05, 0, 0.12, 0.01))


def counter_and_goods():
    cw = W - 0.6
    cz0, cz1 = FZ + 0.05, FZ + 0.55   # code counter centre z = -d/2 + 0.3, 0.5 deep
    kit.add('paint', wb('counter', -cw / 2, cw / 2, cz0, cz1, 0, 0.9, 0.008), TEAL)
    for h in (0.2, 0.45, 0.7):
        kit.add('paint', wb('plank', -cw / 2 + 0.02, cw / 2 - 0.02, cz0 - 0.012, cz0, h, h + 0.014, 0), TEAL_D)
    for x in (-cw / 2, -cw / 6, cw / 6, cw / 2):
        kit.add('paint', wb('counter_post', x - 0.05, x + 0.05, cz0 - 0.02, cz0 + 0.05, 0, 0.9, 0.004), TEAL_D)
    kit.add('wood', wb('counter_top', -cw / 2 - 0.05, cw / 2 + 0.05, cz0 - 0.05, cz1 + 0.12, 0.9, 0.96, 0.008))
    # two gas rings with a big black kadhai and a steel pot, a tray of fried snacks, steel glasses, a tiffin bucket
    for (x, kind) in ((-1.6, 'kadhai'), (-0.3, 'pot')):
        kit.add('paint', wb('stove', x - 0.28, x + 0.28, cz0 + 0.1, cz1 + 0.02, 0.96, 1.08, 0.015), 0x2B2724)
        if kind == 'kadhai':
            kit.add('paint', sphere('kadhai', x, (cz0 + cz1) / 2 + 0.05, 1.18, 0.3, 0.3, 0.1, 2), 0x1B1B1D)
            kit.add('paint', ring('kadhai_rim', x, (cz0 + cz1) / 2 + 0.05, 1.22, 0.29, 0.015, axis='y'), 0x2A2A2C)
        else:
            kit.add('paint', cyl('pot', x, (cz0 + cz1) / 2 + 0.05, 1.08, 1.34, 0.2, 0.22, 14), STEEL)
            kit.add('paint', cyl('pot_lid', x, (cz0 + cz1) / 2 + 0.05, 1.34, 1.37, 0.23, 0.23, 14), 0x8A8E93)
    kit.add('paint', wb('tray', 0.55, 1.35, cz0 + 0.05, cz1 + 0.05, 0.96, 0.99, 0.006), STEEL)
    for i in range(6):
        kit.add('paint', sphere('snack', 0.7 + (i % 3) * 0.28, (cz0 + cz1) / 2 + (i // 3) * 0.2 - 0.05, 1.03, 0.09, 0.09, 0.05, 1), 0xC98A3A)
    for i in range(5):
        kit.add('paint', cyl('glass', -2.6 + i * 0.12, cz0 + 0.2, 0.96, 1.06, 0.04, 0.045, 10), STEEL)
    kit.add('paint', cyl('tiffin', -2.35, cz0 + 0.35, 0.96, 1.2, 0.11, 0.1, 12), STEEL)
    kit.add('paint', quad('paper', [(1.9, cz0 + 0.05, 0.965), (2.3, cz0 + 0.05, 0.965), (2.3, cz0 + 0.4, 0.965), (1.9, cz0 + 0.4, 0.965)]), 0xE9E5D8)
    # back wall shelf of glass jars + a wall calendar + a CRT television on a bracket + a transistor radio
    kit.add('wood', wb('shelf', -1.9, 0.9, BZ - 0.55, BZ - 0.22, 1.55, 1.6, 0.006))
    for x in (-1.6, -0.3, 0.8):
        kit.add('wood', limb('bracket', (x, BZ - 0.22, 1.35), (x, BZ - 0.58, 1.55), 0.04, 0.05))
    for i in range(7):
        x = -1.75 + i * 0.37
        kit.add('paint', cyl('jar', x, BZ - 0.38, 1.6, 1.85, 0.09, 0.09, 12), (0xC9A56A, 0xE2C27E, 0xB8864A, 0xD9B45A)[i % 4])
        kit.add('paint', cyl('jar_lid', x, BZ - 0.38, 1.85, 1.89, 0.095, 0.095, 12), (0xC0392B, 0x2E86C1)[i % 2])
    kit.add('paint', wb('calendar', -2.65, -2.15, BZ - 0.26, BZ - 0.22, 1.5, 2.1, 0), 0xE9E5D8)
    kit.add('paint', wb('calendar_pic', -2.6, -2.2, BZ - 0.27, BZ - 0.255, 1.8, 2.05, 0), 0x2E9E5B)
    kit.add('paint', wb('tv_bracket', 1.9, 2.3, BZ - 0.55, BZ - 0.22, 1.55, 1.6, 0.006), 0x30343A)
    kit.add('paint', wb('tv', 1.8, 2.45, BZ - 0.6, BZ - 0.25, 1.62, 2.06, 0.03), 0x2A2A2C)
    kit.add('paint', wb('tv_screen', 1.86, 2.39, BZ - 0.61, BZ - 0.595, 1.68, 2.0, 0), 0x3A4A50)
    kit.add('paint', wb('radio', 1.2, 1.65, BZ - 0.5, BZ - 0.28, 1.6, 1.82, 0.02), 0x5A4A3A)
    kit.add('paint', cyl('radio_dial', 1.42, BZ - 0.505, 1.66, 1.7, 0.05, 0.05, 10), 0xC9B27A)


def seating():
    # rope charpai against the left side, maroon benches along the front, red plastic chairs, water pot, bucket
    kit.add('wood', wb('charpai_frame', -W / 2 - 0.2, -W / 2 + 0.7, -0.2, 1.7, 0.36, 0.42, 0.01))
    for sx in (-W / 2 - 0.15, -W / 2 + 0.65):
        for sz in (-0.15, 1.65):
            kit.add('wood', limb('charpai_leg', (sx, sz, 0), (sx, sz, 0.38), 0.06, 0.06))
    for k in range(12):
        kit.add('paint', wb('rope', -W / 2 - 0.16, -W / 2 + 0.66, -0.1 + k * 0.15, -0.07 + k * 0.15, 0.415, 0.43, 0), 0xD8C8A0)
    for x in (-1.9, 0.5):
        kit.add('paint', wb('bench_seat', x - 0.9, x + 0.9, FZ - 0.5, FZ - 0.12, 0.42, 0.48, 0.01), 0x7A3A36)
        for dx in (-0.8, 0.8):
            kit.add('paint', wb('bench_leg', x + dx - 0.04, x + dx + 0.04, FZ - 0.44, FZ - 0.2, 0, 0.42, 0.004), 0x4A2A28)
    plastic_chair(kit, W / 2 + 0.45, FZ + 0.4, -math.pi / 2, 0xA13A3A)
    plastic_chair(kit, W / 2 + 0.55, FZ + 1.0, -math.pi / 2 - 0.2, 0xA13A3A)
    clay_pot(kit, W / 2 - 0.5, 0.6, 1.1)
    kit.add('paint', cyl('bucket', -1.0, FZ - 0.9, 0.0, 0.34, 0.2, 0.17, 14), STEEL)
    kit.add('paint', cyl('can', -2.6, FZ - 0.3, 0.0, 0.3, 0.1, 0.1, 10), 0x2E6BD0)


structure()
counter_and_goods()
seating()
TINTS = {'hb_plaster': '#F2E6C6', 'hb_plinth': '#E0A83F', 'hb_apron': '#9C8264', 'hb_floor': '#8E897F', 'hb_wood': '#B89A74', 'hb_tin': '#C8D0D4', 'hb_brick': '#C26543'}
kit.finalize(OUT, TINTS, drift_amp=0.06, ao_strength=0.4)
