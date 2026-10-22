"""
The three abadi-core shops — post office, ration shop, atta chakki — Blender models (checklist: docs/new-shops-checklist.md).
No Places V1 reference exists for these (MAP.md only: "Near panchayat: post office, ration shop..."; "atta chakki, heard before seen");
built from src/newShops.js's footprints. Run: tools/blender/make.sh new_shops new_shops
LOCAL frame of ONE model anchored at the ration shop (-68, 31), exact slot rotationY = NEW_SHOPS_ROT (pi/2, facing +X). Front = +wz local.
World dz = -local x, so: post office (world z 26) at local x = +5, ration shop (31) at 0, atta chakki (36) at -5.
Fixed by code: post office 3.2 x 3 x 3, ration 3.6 x 3 x 3 (solid blocks with a counter window), atta chakki 3 x 2.8 x 2.7 open-fronted
(back wall only). The code shells stay hidden (`new_shops_old`) as collision backing; the painted signs are the existing code signboards
(front plane z = d/2 + 0.03, y = h + 0.42, <= 2.2 wide).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, boolean_cut, ROOT
from arch import Kit, ring, dabba, sack, clay_pot, STEEL, BRASS, MARI

OUT = os.path.join(ROOT, 'tmp', 'new_shops_raw.glb')
kit = Kit(split_props=False)
rnd = random.Random(44)


def tin_roof(cx, w, d, h):
    # single-pitch corrugated tin sheet over the flat slab, high at the back, falling to the front lip
    kit.add('tin', prism_x('tin_roof', cx - w / 2 - 0.3, cx + w / 2 + 0.3, [(-d / 2 - 0.3, h + 0.85), (d / 2 + 0.45, h + 0.3), (d / 2 + 0.45, h + 0.37), (-d / 2 - 0.3, h + 0.92)]))
    kit.add('wall_rs', wb('back_raise', cx - w / 2, cx + w / 2, -d / 2 + 0.02, -d / 2 + 0.2, h + 0.22, h + 0.88, 0.006))


def block(cx, w, d, h, kind, win_w, win_h0=0.9, win_h1=2.2, depth=0.75, tin=False):
    wall = wb('block', cx - w / 2, cx + w / 2, -d / 2, d / 2, 0, h, 0.012)
    boolean_cut(wall, wb('cut', cx - win_w / 2, cx + win_w / 2, d / 2 - depth, d / 2 + 0.1, win_h0, win_h1, 0), apply_mod=True)
    kit.add(kind, wall)
    kit.add('plinth', wb('band', cx - w / 2 - 0.02, cx + w / 2 + 0.02, -d / 2 - 0.02, d / 2 + 0.02, 0, 0.7, 0.006))
    # counter outside the window (0.9 high, 0.4 deep), lintel, step; roof with overhang + parapet lip
    kit.add('wood', wb('counter', cx - win_w / 2, cx + win_w / 2, d / 2 - 0.05, d / 2 + 0.35, 0, 0.9, 0.01))
    kit.add('wood', wb('counter_top', cx - win_w / 2 - 0.06, cx + win_w / 2 + 0.06, d / 2 - 0.1, d / 2 + 0.42, 0.9, 0.96, 0.008))
    kit.add('trim', wb('lintel', cx - win_w / 2 - 0.1, cx + win_w / 2 + 0.1, d / 2 - 0.02, d / 2 + 0.12, win_h1, win_h1 + 0.16, 0.008))
    kit.add('apron', wb('step', cx - win_w / 2 - 0.1, cx + win_w / 2 + 0.1, d / 2 + 0.35, d / 2 + 0.75, 0, 0.14, 0.01))
    kit.add('trim', wb('roof', cx - w / 2 - 0.3, cx + w / 2 + 0.3, -d / 2 - 0.3, d / 2 + 0.3, h, h + 0.22, 0.015))
    if tin:
        tin_roof(cx, w, d, h)
    else:
        kit.add(kind, wb('parapet', cx - w / 2 - 0.1, cx + w / 2 + 0.1, -d / 2 - 0.1, -d / 2 + 0.1, h + 0.22, h + 0.6, 0.01))
        kit.add(kind, wb('parapet', cx - w / 2 - 0.1, cx - w / 2 + 0.1, -d / 2 - 0.1, d / 2 + 0.1, h + 0.22, h + 0.6, 0.01))
        kit.add(kind, wb('parapet', cx + w / 2 - 0.1, cx + w / 2 + 0.1, -d / 2 - 0.1, d / 2 + 0.1, h + 0.22, h + 0.6, 0.01))
        kit.add('trim', wb('parapet_cap', cx - w / 2 - 0.14, cx + w / 2 + 0.14, -d / 2 - 0.14, -d / 2 + 0.14, h + 0.6, h + 0.66, 0.008))
    # window frame
    for x in (cx - win_w / 2 - 0.06, cx + win_w / 2):
        kit.add('paint', wb('jamb', x, x + 0.06, d / 2 - 0.05, d / 2 + 0.06, win_h0, win_h1, 0.004), 0x4A4640)
    # shutter-flap raised above the window
    kit.add('wood', wb('flap', cx - win_w / 2 - 0.04, cx + win_w / 2 + 0.04, d / 2 + 0.02, d / 2 + 0.12, win_h1 - 0.5, win_h1 - 0.04, 0.008))


def post_office():
    cx = 5.0
    block(cx, 3.2, 3.0, 3.0, 'wall_po', 2.2)
    # interior seen through the window: pigeonhole rack of letters, a scale, a rubber-stamp pad, a stool
    kit.add('wood', wb('rack', cx - 1.0, cx + 1.0, d_back(3.0) + 0.0, d_back(3.0) + 0.3, 1.3, 2.1, 0.006))
    for r in range(4):
        for c in range(7):
            kit.add('paint', wb('slot', cx - 0.95 + c * 0.28, cx - 0.75 + c * 0.28, d_back(3.0) + 0.3, d_back(3.0) + 0.33, 1.35 + r * 0.2, 1.5 + r * 0.2, 0), (0x2A2A2A, 0xE9E5D8)[(r + c) % 2])
    kit.add('paint', wb('stamp_pad', cx + 0.3, cx + 0.6, 0.9, 1.15, 0.96, 0.99, 0.004), 0x6B2A3A)
    kit.add('paint', cyl('scale', cx - 0.6, 1.0, 0.96, 1.02, 0.16, 0.16, 12), 0x30343A)
    # red pillar letter box (generic, no emblem or text) at the front-right + a notice board and a mail sack
    lx = cx + 2.1
    kit.add('paint', cyl('postbox', lx, 2.4, 0.0, 1.25, 0.28, 0.26, 16), 0xC0392B)
    kit.add('paint', sphere('postbox_cap', lx, 2.4, 1.25, 0.28, 0.28, 0.12, 2), 0xA93226)
    kit.add('paint', wb('slot', lx - 0.14, lx + 0.14, 2.4 - 0.29, 2.4 - 0.25, 0.95, 1.0, 0), 0x1A1A1A)
    kit.add('paint', cyl('postbox_base', lx, 2.4, 0.0, 0.12, 0.31, 0.31, 16), 0x333333)
    kit.add('wood', wb('notice_board', cx - 1.5, cx - 0.5, 1.58, 1.62, 1.35, 2.05, 0.006))
    for k in range(6):
        kit.add('paint', wb('notice', cx - 1.42 + (k % 3) * 0.3, cx - 1.22 + (k % 3) * 0.3, 1.62, 1.64, 1.45 + (k // 3) * 0.3, 1.7 + (k // 3) * 0.3, 0), (0xE9E5D8, 0xF2C21E, 0xBFD0D8)[k % 3])
    sack(kit, cx - 1.4, 2.1, 0.0, 0.0, 0xB89A62, 0.5, 0.35, 0.55)
    # the village postbox mounted on the wall + a bicycle is the postman's (NPC), none here


def d_back(d):
    return -d / 2 + 0.2


def ration_shop():
    cx = 0.0
    block(cx, 3.6, 3.0, 3.0, 'wall_rs', 2.6, tin=True)
    # sacks of grain stacked in the window, a brass beam scale, a painted rate board, a platform scale in front, queue rail
    for i, col in enumerate((0xC9B27A, 0xB89A62, 0xD8C690, 0xB89A62)):
        sack(kit, cx - 0.9 + i * 0.6, -0.5, 0.0, 0.0, col, 0.55, 0.4, 0.6)
        sack(kit, cx - 0.6 + i * 0.6, -0.5, 0.6, 0.0, col, 0.5, 0.38, 0.5) if i < 3 else None
    kit.add('paint', limb('beam_post', (cx + 0.9, 0.7, 0.96), (cx + 0.9, 0.7, 1.6), 0.04, 0.04), BRASS)
    kit.add('paint', limb('beam', (cx + 0.5, 0.7, 1.55), (cx + 1.3, 0.7, 1.55), 0.04, 0.04), BRASS)
    for s in (-1, 1):
        kit.add('paint', cyl('pan', cx + 0.9 + s * 0.4, 0.7, 1.15, 1.18, 0.14, 0.12, 12), BRASS)
        kit.add('paint', limb('pan_chain', (cx + 0.9 + s * 0.4, 0.7, 1.55), (cx + 0.9 + s * 0.4, 0.7, 1.18), 0.01, 0.01), 0x555555)
    kit.add('paint', wb('rate_board', cx - 1.7, cx - 0.6, 1.57, 1.6, 1.4, 2.1, 0.004), 0x1D2B24)
    for k in range(6):  # painted rows (no legible text): chalk ticks
        kit.add('paint', wb('row', cx - 1.62, cx - 0.9 + (k % 2) * 0.2, 1.6, 1.62, 1.55 + k * 0.08, 1.58 + k * 0.08, 0), 0xE9E5D8)
    kit.add('paint', wb('platform_scale', cx + 1.0, cx + 1.6, 2.0, 2.6, 0.0, 0.1, 0.01), 0x30343A)
    kit.add('paint', limb('scale_post', (cx + 1.3, 2.55, 0.1), (cx + 1.3, 2.55, 1.0), 0.05, 0.05), 0x30343A)
    kit.add('paint', sphere('scale_dial', cx + 1.3, 2.5, 1.05, 0.12, 0.04, 0.12, 1), 0xE9E7DD)
    # steel-pipe queue barrier along the front
    for i in range(5):
        x = cx - 1.6 + i * 0.8
        kit.add('paint', limb('rail_post', (x, 3.0, 0.0), (x, 3.0, 0.95), 0.05, 0.05), 0x8A8E93)
    kit.add('paint', limb('rail_bar', (cx - 1.6, 3.0, 0.95), (cx + 1.6, 3.0, 0.95), 0.045, 0.045), 0x8A8E93)
    kit.add('paint', limb('rail_bar', (cx - 1.6, 3.0, 0.5), (cx + 1.6, 3.0, 0.5), 0.04, 0.04), 0x8A8E93)


def atta_chakki():
    cx = -5.0
    w, d, h = 3.0, 2.8, 2.7
    kit.add('wall_ac', wb('back', cx - w / 2, cx + w / 2, -d / 2, -d / 2 + 0.22, 0, h, 0.01))
    kit.add('trim', wb('flour_dust', cx - w / 2, cx + w / 2, -d / 2 + 0.22, -d / 2 + 0.235, 0, 1.2, 0.004))   # flour-whitened lower wall
    kit.add('plinth', wb('band', cx - w / 2, cx + w / 2, -d / 2 - 0.02, -d / 2, 0, 0.6, 0.005))
    for x in (cx - w / 2 + 0.1, cx + w / 2 - 0.1):
        kit.add('wood', limb('post', (x, d / 2 - 0.1, 0.0), (x, d / 2 - 0.1, h), 0.13, 0.13, 0.006))
        kit.add('wood', limb('post_b', (x, -d / 2 + 0.3, 0.0), (x, -d / 2 + 0.3, h), 0.12, 0.12))
    kit.add('wood', wb('beam_f', cx - w / 2, cx + w / 2, d / 2 - 0.18, d / 2 - 0.02, h - 0.2, h, 0.008))
    kit.add('tin', prism_x('tin_roof', cx - w / 2 - 0.3, cx + w / 2 + 0.3, [(-d / 2 - 0.3, h + 0.8), (d / 2 + 0.4, h + 0.2), (d / 2 + 0.4, h + 0.27), (-d / 2 - 0.3, h + 0.87)]))
    kit.add('wall_ac', wb('back_raise', cx - w / 2, cx + w / 2, -d / 2, -d / 2 + 0.22, h, h + 0.82, 0.01))
    kit.add('floor', wb('floor', cx - w / 2, cx + w / 2, -d / 2 + 0.22, d / 2, 0, 0.05, 0))
    kit.add('apron', wb('step', cx - w / 2, cx + w / 2, d / 2 - 0.05, d / 2 + 0.45, 0, 0.12, 0.01))
    # the mill: stone housing with a hopper above it, a green-grey motor with a flywheel + belt, an iron chimney pipe on the roof
    sx, sz = cx - 0.5, -0.2
    kit.add('paint', cyl('stone', sx, sz, 0.0, 0.5, 0.62, 0.62, 18), 0x8A8A86)
    kit.add('paint', cyl('stone_ring', sx, sz, 0.5, 0.58, 0.64, 0.64, 18), 0x6E6E6A)
    kit.add('paint', cyl('hopper', sx, sz, 0.58, 1.3, 0.55, 0.2, 14), 0x4A5A6A)
    kit.add('paint', cyl('hopper_neck', sx, sz, 1.3, 1.55, 0.2, 0.2, 10), 0x4A5A6A)
    kit.add('paint', wb('spout', sx + 0.55, sx + 0.95, sz - 0.1, sz + 0.1, 0.18, 0.28, 0.01), 0x6E6E6A)
    mx, mz = cx + 0.75, -0.3
    kit.add('paint', wb('motor_base', mx - 0.35, mx + 0.35, mz - 0.2, mz + 0.2, 0.0, 0.1, 0.01), 0x2A2A2A)
    kit.add('paint', cyl('motor', mx, mz, 0.1, 0.55, 0.22, 0.22, 14), 0x4F6A5A)
    kit.add('paint', ring('flywheel', mx - 0.3, mz, 0.4, 0.28, 0.035, axis='x'), 0x1C1C1C)
    kit.add('paint', limb('shaft', (mx - 0.35, mz, 0.4), (sx + 0.55, sz, 0.55), 0.04, 0.04), 0x555555)
    kit.add('paint', limb('belt_a', (mx - 0.3, mz + 0.03, 0.68), (sx + 0.5, sz + 0.03, 0.62), 0.02, 0.05), 0x1A1A1A)
    kit.add('paint', limb('belt_b', (mx - 0.3, mz + 0.03, 0.12), (sx + 0.5, sz + 0.03, 0.42), 0.02, 0.05), 0x1A1A1A)
    kit.add('paint', cyl('chimney', cx + w / 2 - 0.35, -d / 2 + 0.4, h + 0.2, h + 2.2, 0.1, 0.1, 10), 0x4A4642)
    kit.add('paint', cyl('chimney_cap', cx + w / 2 - 0.35, -d / 2 + 0.4, h + 2.2, h + 2.3, 0.16, 0.12, 10), 0x4A4642)
    # sacks of wheat (tan) and flour (white), a flour bin, a hanging scale, a heap of flour on the floor
    for i in range(3):
        sack(kit, cx - 1.2 + i * 0.35, 0.8, 0.0, 0.0, 0xD9C58A, 0.45, 0.32, 0.55)
    for i in range(3):
        sack(kit, cx + 0.2 + i * 0.4, 0.95, 0.0, 0.0, 0xF3EFE2, 0.45, 0.32, 0.55)
    kit.add('paint', cyl('bin', cx + 1.1, 0.85, 0.0, 0.6, 0.28, 0.25, 14), 0x8F9AA2)
    kit.add('paint', sphere('flour_heap', cx + 1.1, 0.85, 0.62, 0.26, 0.26, 0.12, 1), 0xF3EFE2)
    kit.add('paint', limb('scale_hang', (cx - 0.9, 0.4, h - 0.2), (cx - 0.9, 0.4, 1.6), 0.015, 0.015), 0x333333)
    kit.add('paint', cyl('scale_pan', cx - 0.9, 0.4, 1.55, 1.6, 0.17, 0.15, 12), STEEL)
    kit.add('paint', sphere('flour_spill', sx + 0.8, sz + 0.1, 0.07, 0.3, 0.22, 0.05, 1), 0xF3EFE2)


post_office()
ration_shop()
atta_chakki()
TINTS = {'hb_wall_po': '#B7CEE3', 'hb_wall_rs': '#EBCB86', 'hb_wall_ac': '#D9987A', 'hb_plinth': '#C98A3C', 'hb_trim': '#D8D2C2', 'hb_apron': '#A59A88', 'hb_floor': '#8E897F', 'hb_wood': '#B89A74'}
kit.finalize(OUT, TINTS, drift_amp=0.06, ao_strength=0.4)
