"""
The chowk plaza dressing — Blender model (checklist: docs/chowk-checklist.md). Run: tools/blender/make.sh chowk_plaza chowk_plaza
Authored in world offsets from CHOWK_CENTER (-54, 13) (src/bazaar.js: chabutra at CHOWK_CENTER + (-3, +2), benches/chairs at
CHOWK_TEA_POS (-55, 10) + offsets). Exact slot, rotationY 0; the code plaza furniture (`chowk_plaza` group) stays hidden as collision
backing (only the 12-segment kerb box is solid). The tree standing on the chabutra is a code stand-in (trees = Tripo).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, ROOT
from arch import Kit, ring, clay_pot, plastic_chair, STEEL

OUT = os.path.join(ROOT, 'tmp', 'chowk_plaza_raw.glb')
kit = Kit()
rnd = random.Random(2)
CX, CZ = -3.0, 2.0                 # chabutra centre (offset from CHOWK_CENTER)
TX, TZ = -55 - -54, 10 - 13        # tea stall position offset = (-1, -3)


def chabutra():
    R = 1.15
    n = 24
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        kit.add('brick', limb('kerb', (CX + R * math.cos(a0), CZ + R * math.sin(a0), 0.25), (CX + R * math.cos(a1), CZ + R * math.sin(a1), 0.25), 0.3, 0.5, 0.01))
    kit.add('floor', cyl('deck', CX, CZ, 0.0, 0.54, R - 0.12, R - 0.12, 24))
    kit.add('paint', cyl('soil', CX, CZ, 0.5, 0.56, R - 0.14, R - 0.14, 24), 0x6B5436)
    clay_pot(kit, CX + 0.7, CZ + 0.3, 0.9)
    for k in range(3):   # a few offerings-free decorations: smooth river stones round the trunk
        kit.add('paint', sphere('stone', CX - 0.4 + k * 0.35, CZ - 0.4, 0.6, 0.1, 0.1, 0.06, 1), 0x9A958A)


def seating():
    # two maroon benches near the stall's open front, four plastic chairs (red, green)
    for dz in (-1.5, 1.5):
        x, z = TX - 2.6, TZ + dz
        kit.add('paint', wb('bench_seat', x - 0.7, x + 0.7, z - 0.22, z + 0.22, 0.4, 0.46, 0.01), 0x6A2A2A)
        for dx in (-0.6, 0.6):
            kit.add('paint', wb('bench_leg', x + dx - 0.04, x + dx + 0.04, z - 0.17, z + 0.17, 0, 0.4, 0.004), 0x3A1A1A)
        kit.add('paint', wb('bench_back', x - 0.7, x + 0.7, z + 0.18, z + 0.22, 0.46, 0.85, 0.01), 0x6A2A2A)
    cols = [0xA13A3A, 0x3A9955, 0xA13A3A, 0x3A9955]
    for i, c in enumerate(cols):
        plastic_chair(kit, TX - 4.5 + (i % 2) * 0.7, TZ - 0.6 + (i // 2) * 0.7, math.pi / 2 + (i - 1.5) * 0.15, c, arms=bool(i % 2))


chabutra()
seating()
TINTS = {'hb_floor': '#B8B3A3', 'hb_brick': '#C26543'}
kit.finalize(OUT, TINTS, drift_amp=0.05, ao_strength=0.4)
