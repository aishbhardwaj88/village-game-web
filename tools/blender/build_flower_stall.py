"""
The roadside flower stall — Blender model from Places V1/flower_stall/ (LAYOUT.md + MAIN_flower_stall_orthos.png).
Checklist: docs/temple-checklist.md (flower stall rows). Run: tools/blender/make.sh flower_stall flower_stall
Authored in world offsets from FLOWER_STALL_POS (-2, 50) (src/temple.js): 2.5 x 2 x 2.2 m, four bamboo poles, sagging dark-green tarp,
low plank table on stacked bricks, baskets of marigold/rose/jasmine, garlands hung from a bamboo rod across the front (-z side),
jute mat. No walls, no sign (LAYOUT.md: the bilingual signboard rule does not apply). Exact slot, rotationY 0; code stall hidden.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, quad, ROOT
from arch import Kit, ring, LEAF

OUT = os.path.join(ROOT, 'tmp', 'flower_stall_raw.glb')
kit = Kit()
rnd = random.Random(12)
W, D, H = 2.5, 2.0, 2.2
BAMBOO = 0xB59A5B
TARP = 0x2F5A3A


def structure():
    for (px, pz) in ((-W / 2 + 0.08, -D / 2 + 0.08), (W / 2 - 0.08, -D / 2 + 0.08), (-W / 2 + 0.08, D / 2 - 0.08), (W / 2 - 0.08, D / 2 - 0.08)):
        kit.add('paint', cyl('pole', px, pz, 0.0, H, 0.045, 0.04, 8), BAMBOO)
        for k in range(1, 5):
            kit.add('paint', cyl('node', px, pz, k * H / 5 - 0.02, k * H / 5 + 0.02, 0.055, 0.055, 8), 0x8A7340)
    # roof frame rods + a sagging tarp lashed on (one slab with a belly, and a rolled edge)
    kit.add('paint', limb('rod_f', (-W / 2 - 0.1, -D / 2 + 0.08, H - 0.05), (W / 2 + 0.1, -D / 2 + 0.08, H - 0.05), 0.05, 0.05), BAMBOO)
    kit.add('paint', limb('rod_b', (-W / 2 - 0.1, D / 2 - 0.08, H - 0.05), (W / 2 + 0.1, D / 2 - 0.08, H - 0.05), 0.05, 0.05), BAMBOO)
    for x in (-W / 2 + 0.08, W / 2 - 0.08):
        kit.add('paint', limb('rod_s', (x, -D / 2 - 0.1, H - 0.05), (x, D / 2 + 0.1, H - 0.05), 0.05, 0.05), BAMBOO)
    kit.add('paint', prism_x('tarp', -W / 2 - 0.1, W / 2 + 0.1, [(-D / 2 - 0.15, H + 0.02), (-D / 4, H - 0.12), (0.0, H - 0.17), (D / 4, H - 0.12), (D / 2 + 0.15, H + 0.0), (D / 2 + 0.15, H + 0.05), (D / 4, H - 0.07), (0.0, H - 0.12), (-D / 4, H - 0.07), (-D / 2 - 0.15, H + 0.07)]), TARP)
    # rope ties
    for (px, pz) in ((-W / 2 + 0.08, -D / 2 + 0.08), (W / 2 - 0.08, -D / 2 + 0.08)):
        kit.add('paint', limb('rope', (px, pz, H - 0.1), (px + (0.4 if px < 0 else -0.4), pz - 0.5, 0.05), 0.012, 0.012), 0xCDBA8A)
    # jute mat on the ground
    kit.add('jute', wb('mat', -W / 2 - 0.2, W / 2 + 0.2, -D / 2 - 0.1, D / 2 + 0.1, 0.0, 0.025, 0.004)) if False else kit.add('paint', wb('mat', -W / 2 - 0.2, W / 2 + 0.2, -D / 2 - 0.1, D / 2 + 0.1, 0.0, 0.025, 0.004), 0xB89A62)


def table_and_flowers():
    # low plank table (0.4 m) on stacked bricks
    for x in (-0.6, 0.6):
        for k in range(2):
            kit.add('brick', wb('brick_stack', x - 0.2, x + 0.2, 0.05, 0.55, k * 0.1, k * 0.1 + 0.1, 0.006) if False else wb('brick_stack', x - 0.2, x + 0.2, 0.05, 0.55, k * 0.15, k * 0.15 + 0.14, 0.006))
    kit.add('wood', wb('plank_top', -0.85, 0.85, 0.0, 0.62, 0.3, 0.38, 0.008))
    # baskets: marigold (orange), marigold (yellow), rose (red/pink), jasmine bowl (white)
    def basket(x, z, col, r=0.24):
        kit.add('paint', cyl('basket', x, z, 0.38, 0.52, r, r * 0.85, 14), 0xB08A4A)
        kit.add('paint', cyl('basket_rim', x, z, 0.5, 0.54, r * 1.02, r * 1.02, 14), 0x8A6A3A)
        for _ in range(26):
            a = rnd.random() * math.tau
            rr = rnd.random() * r * 0.8
            kit.add('paint', sphere('bloom', x + rr * math.cos(a), z + rr * math.sin(a), 0.55 + 0.05 * (1 - rr / r), 0.045, 0.045, 0.035, 1), col[rnd.randrange(len(col))])
    basket(-0.55, 0.3, (0xE8751A, 0xF08A24, 0xD9631A))
    basket(-0.05, 0.3, (0xF2C21E, 0xF5D04A))
    basket(0.5, 0.3, (0xC0392B, 0xD94A6A, 0xB02A4A))
    kit.add('paint', cyl('bowl', 0.82, 0.25, 0.38, 0.46, 0.14, 0.1, 12), 0xE9E5D8)
    for _ in range(14):
        kit.add('paint', sphere('jasmine', 0.82 + rnd.uniform(-0.09, 0.09), 0.25 + rnd.uniform(-0.09, 0.09), 0.48, 0.03, 0.03, 0.03, 1), 0xF6F2E6)
    # a banana leaf with loose blooms + a stool + a steel weighing bowl
    kit.add('paint', quad('leaf', [(-0.2, 0.0, 0.385), (0.35, 0.0, 0.385), (0.35, 0.45, 0.385), (-0.2, 0.45, 0.385)]), 0x3F7A34) if False else None
    for dz in (-0.1, 0.1):
        kit.add('paint', limb('stool_leg', (1.05, 0.6 + dz, 0.0), (1.05, 0.6 + dz, 0.38), 0.05, 0.05), 0xC9B596)
    kit.add('paint', cyl('stool', 1.05, 0.6, 0.38, 0.42, 0.22, 0.22, 12), 0xC9B596)
    for k in range(3):
        kit.add('paint', cyl('loose', 0.75 + k * 0.12, 0.65, 0.0, 0.2, 0.0, 0.0, 6) if False else sphere('loose', 0.75 + k * 0.12, 0.65, 0.08, 0.08, 0.08, 0.06, 1), (0xE8751A, 0xF2C21E, 0xC0392B)[k])
    # garlands hung from the front bamboo rod: strings of marigold blooms + a longer rose one
    for k, x in enumerate([-1.0 + 0.17 * i for i in range(12)]):  # art review 2: more garland colour (12 strands, was 6)
        col = (0xE8751A, 0xF2C21E, 0xE8751A, 0xF2C21E, 0xC0392B, 0xE8751A, 0xF2C21E, 0xE04A7A)[k % 8]
        ln = 0.9 + 0.12 * (k % 3)
        kit.add('paint', limb('garland_string', (x, -D / 2 + 0.08, H - 0.12), (x, -D / 2 + 0.08, H - 0.12 - ln), 0.012, 0.012), 0xCDBA8A)
        for j in range(int(ln / 0.07)):
            kit.add('paint', sphere('g_bloom', x + rnd.uniform(-0.015, 0.015), -D / 2 + 0.08, H - 0.16 - j * 0.07, 0.05, 0.05, 0.04, 1), col if j % 5 else 0x3F7A34)

    # a thick marigold swag across the whole front rod, sagging in the middle, + a rose/marigold fringe along the table front
    for j in range(41):
        t = j / 40
        x = -1.1 + 2.2 * t
        sag = 0.22 * (1 - (2 * t - 1) ** 2)
        kit.add('paint', sphere('swag', x, -D / 2 + 0.1, H - 0.08 - sag, 0.07, 0.07, 0.06, 1), (0xE8751A, 0xF2C21E, 0xE8751A, 0xC0392B)[j % 4] if j % 7 else 0x3F7A34)


structure()
table_and_flowers()
TINTS = {'hb_wood': '#B89A74', 'hb_brick': '#C26543'}
kit.finalize(OUT, TINTS, drift_amp=0.05, ao_strength=0.4)
