"""
The general store on the bazaar approach lane — Blender model from Places V1/general_store/MAIN_general_store_orthos.png
(checklist: docs/general-store-checklist.md). Run: tools/blender/make.sh general_store general_store
LOCAL frame (src/shops.js's buildGeneralStore): origin = block centre, front (counter window) = +wz. Solid block 3.5 (x) x
3.0 (z) x 3.2 high; placed with an EXACT slot at STORE_POS + the same rotationY; the code block/roof/counter/goods stay
hidden in `store_old` as collision backing. The window is a recess cut into the solid block (no walkable interior).
The painted sign is the existing code signboard (src/signboards.js, front plane z=1.56, y~3.1, 2.9 wide).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, quad, boolean_cut, ROOT
from arch import Kit, ring, dabba, STEEL, BRASS, LEAF, MARI

OUT = os.path.join(ROOT, 'tmp', 'general_store_raw.glb')
kit = Kit()
rnd = random.Random(33)
TEAL = 0x3E7F86
TEAL_D = 0x2F646A
PACKETS = [0xF2C21E, 0xD9382B, 0x2E9E5B, 0xF08A24, 0x7B4FB0, 0x2E86C1, 0xE0509A, 0xA3C93A]


def block():
    wall = wb('block', -1.75, 1.75, -1.5, 1.5, 0, 3.2, 0.012)
    # the counter window: a deep recess into the solid block at the front
    boolean_cut(wall, wb('cut', -1.25, 1.25, 0.65, 1.6, 0.9, 2.1, 0), apply_mod=True)
    kit.add('plaster', wall)
    # ochre lower band, proud 2 cm, broken at the window
    for (x0, x1) in ((-1.78, -1.25), (1.25, 1.78)):
        kit.add('plinth', wb('band_f', x0, x1, 1.5, 1.53, 0, 0.9, 0.005))
    kit.add('plinth', wb('band_n', -1.78, 1.78, -1.53, -1.5, 0, 0.9, 0.005))
    kit.add('plinth', wb('band_w', -1.78, -1.75, -1.5, 1.5, 0, 0.9, 0.005))
    kit.add('plinth', wb('band_e', 1.75, 1.78, -1.5, 1.5, 0, 0.9, 0.005))
    kit.add('plinth', wb('band_below', -1.25, 1.25, 1.5, 1.53, 0, 0.9, 0.005))
    # teal frame round the window
    kit.add('paint', wb('frame_l', -1.35, -1.25, 1.45, 1.6, 0.0, 2.2, 0.006), TEAL)
    kit.add('paint', wb('frame_r', 1.25, 1.35, 1.45, 1.6, 0.0, 2.2, 0.006), TEAL)
    kit.add('paint', wb('frame_t', -1.35, 1.35, 1.45, 1.6, 2.1, 2.2, 0.006), TEAL)
    # planked counter (outside), top slab, lintel board
    kit.add('paint', wb('counter', -1.25, 1.25, 1.45, 1.85, 0, 0.9, 0.01), TEAL)
    for h in (0.22, 0.46, 0.7):
        kit.add('paint', wb('plank', -1.24, 1.24, 1.85, 1.865, h, h + 0.015, 0), TEAL_D)
    kit.add('wood', wb('counter_top', -1.32, 1.32, 1.4, 1.92, 0.9, 0.96, 0.008))
    kit.add('paint', wb('lintel', -1.3, 1.3, 1.5, 1.66, 1.85, 2.0, 0.006), TEAL)
    kit.add('apron', wb('step', -1.35, 1.35, 1.7, 2.1, 0, 0.14, 0.01))
    # roof: sloped corrugated tin, a deep awning over the front + a small ridge cap at the back
    kit.add('tin', prism_x('roof', -2.05, 2.05, [(-1.7, 3.28), (2.45, 3.32 - 0.34), (2.45, 3.38 - 0.34), (-1.7, 3.35)]))
    kit.add('trim', wb('roof_edge', -2.06, 2.06, 2.43, 2.5, 2.9, 3.04, 0.005))
    for x in (-1.5, 1.5):
        kit.add('paint', limb('awning_stay', (x, 1.52, 2.5), (x, 2.4, 3.0), 0.04, 0.04), TEAL_D)


def interior():
    # inside the recess (back at z=0.65): shelves of packets and jars, a hanging scale, a bulb
    for hh in (1.2, 1.55, 1.9):
        kit.add('wood', wb('shelf', -1.2, 1.2, 0.65, 1.0, hh, hh + 0.03, 0.004))
    # (24 Oct 2026: the box packets and jars that stood here are replaced by real-shaped, printed goods built in code, src/shopGoods.js)
    for i in range(3):
        kit.add('paint', wb('bread', 0.5 + i * 0.2, 0.66 + i * 0.2, 1.1, 1.26, 0.96, 1.03, 0.01), 0xC98A4A)
    kit.add('paint', cyl('scale_base', 0.0, 1.18, 0.96, 1.0, 0.12, 0.12, 12), 0x30343A)
    kit.add('paint', limb('scale_post', (0.0, 1.18, 1.0), (0.0, 1.18, 1.4), 0.03, 0.03), 0x30343A)
    kit.add('paint', cyl('scale_pan', 0.0, 1.18, 1.0, 1.03, 0.14, 0.14, 12), STEEL)
    kit.add('paint', sphere('scale_dial', 0.0, 1.18, 1.43, 0.09, 0.03, 0.09, 1), 0xE9E7DD)
    kit.add('paint', sphere('bulb', 0.0, 1.0, 2.0, 0.05, 0.05, 0.065, 1), 0xFFF0B0)
    kit.add('paint', limb('bulb_cable', (0.0, 1.0, 2.1), (0.0, 1.0, 2.02), 0.01, 0.01), 0x222222)


def hanging_packets():
    """Two strings of bright snack packets either side of the window, as in the reference."""
    for side in (-1, 1):
        for col in range(2):
            x = side * (1.45 + col * 0.18)
            kit.add('paint', limb('string', (x, 1.54, 2.2), (x, 1.54, 0.6), 0.008, 0.008), 0x333333)
            # packets hang from the string: printed packs built in code (src/shopGoods.js)


def outside():
    # red crate of green bottles (no labels) at the left, steel bucket of marigolds at the right
    kit.add('paint', wb('crate', -1.65, -1.05, 1.75, 2.05, 0, 0.3, 0.01), 0xC0392B)
    # soda bottles in the crate: real-shaped bottles with printed labels in code (src/shopGoods.js)
    kit.add('paint', cyl('bucket', 1.55, 1.9, 0.0, 0.34, 0.2, 0.17, 14), STEEL)
    for i in range(7):
        a = i * 0.9
        kit.add('paint', sphere('mari', 1.55 + 0.1 * math.cos(a), 1.9 + 0.1 * math.sin(a), 0.4 + 0.04 * (i % 3), 0.07, 0.07, 0.06, 1), MARI[i % 3])


block()
interior()
hanging_packets()
outside()
TINTS = {'hb_plaster': '#F2E6C6', 'hb_plinth': '#E0A83F', 'hb_trim': '#D8D2C2', 'hb_apron': '#9C8264', 'hb_tin': '#C8D0D4', 'hb_wood': '#A08568'}
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.06, 'hb_apron': 0.08}, ao_strength=0.4)
