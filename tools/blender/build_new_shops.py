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
kit = Kit(split_props=False, own=('jute', 'metal'))
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


def grille_window(face, side, zc, y0, y1, w, d_out=0.0):
    """Real window on a wall face: dark recess, painted frame, iron bars, projecting sill. face = wall x (side +/-1 = outward) for side walls."""
    z0, z1 = zc - w / 2, zc + w / 2
    a, b = (face, face + side * 0.02) if side > 0 else (face - 0.02, face)
    kit.add('paint', wb('recess', a, b, z0, z1, y0, y1, 0), 0x1D1A17)
    fa, fb = (face, face + side * 0.07) if side > 0 else (face - 0.07, face)
    for zz0, zz1, h0, h1 in ((z0 - 0.07, z1 + 0.07, y1, y1 + 0.07), (z0 - 0.07, z1 + 0.07, y0 - 0.07, y0), (z0 - 0.07, z0, y0 - 0.07, y1 + 0.07), (z1, z1 + 0.07, y0 - 0.07, y1 + 0.07)):
        kit.add('paint', wb('wframe', fa, fb, zz0, zz1, h0, h1, 0.004), 0x4A3524)
    n = max(3, int(w / 0.14))
    ba, bb = (face + side * 0.03, face + side * 0.05) if side > 0 else (face - 0.05, face - 0.03)
    for i in range(n):
        zz = z0 + (i + 0.5) * w / n
        kit.add('paint', wb('bar', ba, bb, zz - 0.012, zz + 0.012, y0, y1, 0), 0x26262A)
    kit.add('paint', wb('rail', ba, bb, z0, z1, (y0 + y1) / 2 - 0.012, (y0 + y1) / 2 + 0.012, 0), 0x26262A)
    sa, sb = (face, face + side * 0.16) if side > 0 else (face - 0.16, face)
    kit.add('trim', wb('sill', sa, sb, z0 - 0.08, z1 + 0.08, y0 - 0.1, y0 - 0.03, 0.005))


def back_window(cx_w, zface, w, y0, y1, out=-1):
    """Same, on a wall whose face is a constant z (out = -1: facing -z)."""
    x0, x1 = cx_w - w / 2, cx_w + w / 2
    a, b = (zface - 0.02, zface) if out < 0 else (zface, zface + 0.02)
    kit.add('paint', wb('recess', x0, x1, a, b, y0, y1, 0), 0x1D1A17)
    fa, fb = (zface - 0.07, zface) if out < 0 else (zface, zface + 0.07)
    for xx0, xx1, h0, h1 in ((x0 - 0.07, x1 + 0.07, y1, y1 + 0.07), (x0 - 0.07, x1 + 0.07, y0 - 0.07, y0), (x0 - 0.07, x0, y0 - 0.07, y1 + 0.07), (x1, x1 + 0.07, y0 - 0.07, y1 + 0.07)):
        kit.add('paint', wb('wframe', xx0, xx1, fa, fb, h0, h1, 0.004), 0x4A3524)
    n = max(3, int(w / 0.14))
    ba, bb = (zface - 0.05, zface - 0.03) if out < 0 else (zface + 0.03, zface + 0.05)
    for i in range(n):
        xx = x0 + (i + 0.5) * w / n
        kit.add('paint', wb('bar', xx - 0.012, xx + 0.012, ba, bb, y0, y1, 0), 0x26262A)
    kit.add('paint', wb('rail', x0, x1, ba, bb, (y0 + y1) / 2 - 0.012, (y0 + y1) / 2 + 0.012, 0), 0x26262A)
    sa, sb = (zface - 0.16, zface) if out < 0 else (zface, zface + 0.16)
    kit.add('trim', wb('sill', x0 - 0.08, x1 + 0.08, sa, sb, y0 - 0.1, y0 - 0.03, 0.005))


def back_door(cx_d, zface, w, h, leaf):
    """Staff door in a back wall facing -z: recess, frame, leaf with two raised panels and a rail, hinges, brass handle, step."""
    x0, x1 = cx_d - w / 2, cx_d + w / 2
    kit.add('paint', wb('drecess', x0 - 0.08, x1 + 0.08, zface - 0.03, zface, 0.0, h, 0), 0x14110E)
    kit.add('paint', wb('dframe', x0 - 0.09, x1 + 0.09, zface - 0.09, zface, h, h + 0.09, 0.004), 0x2F2016)
    for xx0, xx1 in ((x0 - 0.09, x0), (x1, x1 + 0.09)):
        kit.add('paint', wb('dframe', xx0, xx1, zface - 0.09, zface, 0.0, h + 0.09, 0.004), 0x2F2016)
    kit.add('paint', wb('leaf', x0, x1, zface - 0.07, zface - 0.02, 0.02, h, 0.004), leaf)
    for h0, h1 in ((0.2, h * 0.45), (h * 0.55, h - 0.2)):
        kit.add('paint', wb('dpanel', x0 + 0.1, x1 - 0.1, zface - 0.1, zface - 0.07, h0, h1, 0.004), 0x3D2818)
    kit.add('paint', wb('drail', x0, x1, zface - 0.1, zface - 0.07, h * 0.47 , h * 0.53, 0.004), 0x2F2016)
    for hy in (0.3, h - 0.3):
        kit.add('paint', wb('hinge', x0, x0 + 0.16, zface - 0.1, zface - 0.07, hy, hy + 0.05, 0), 0x26262A)
    kit.add('paint', cyl('handle', x1 - 0.12, zface - 0.12, h * 0.5 - 0.02, h * 0.5 + 0.02, 0.025, 0.025, 8), BRASS)
    kit.add('apron', wb('dstep', x0 - 0.25, x1 + 0.25, zface - 0.4, zface, 0.0, 0.12, 0.01))


def openings(cx, w, d, leaf):
    """Grilled side windows and a staff door at the back (shop shells are solid boxes; these are real framed openings)."""
    for side in (1, -1):
        grille_window(cx + side * w / 2, side, -0.2, 1.5, 2.3, 0.8)
    back_door(cx + 0.5, -d / 2, 0.9, 2.0, leaf)
    back_window(cx - 0.8, -d / 2, 0.6, 1.5, 2.2)


def post_office():
    cx = 5.0
    block(cx, 3.2, 3.0, 3.0, 'wall_po', 2.2)
    openings(cx, 3.2, 3.0, 0x3F5B6A)
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
    sack(kit, cx - 1.4, 2.1, 0.0, 0.0, 0xB89A62, 0.5, 0.35, 0.55, kind='jute')
    # counter work (counter top y = 0.96, z 1.45..1.92): envelope stack with a rubber band, black desk phone, brown-paper parcels tied with twine
    top, cz = 0.96, 1.7
    for i, col in enumerate((0xE9E3D0, 0xDCD3B8, 0xC9D6DC, 0xEFE6C8, 0xE2D5B4)):
        kit.add('paint', wb('env', cx - 0.55 + 0.01 * (i % 2), cx - 0.31 + 0.01 * (i % 2), cz - 0.07, cz + 0.06, top + i * 0.012, top + (i + 1) * 0.012, 0.001), col)
    kit.add('paint', wb('band', cx - 0.45, cx - 0.43, cz - 0.075, cz + 0.065, top, top + 0.062, 0.001), 0x8A2A24)
    kit.add('paint', wb('phone', cx + 0.0, cx + 0.2, cz - 0.1, cz + 0.07, top, top + 0.09, 0.02), 0x1B1B1D)
    kit.add('paint', cyl('dial', cx + 0.1, cz - 0.015, top + 0.09, top + 0.105, 0.055, 0.055, 12), 0x2B2B2E)
    kit.add('paint', wb('handset', cx + 0.0, cx + 0.2, cz - 0.1, cz - 0.03, top + 0.105, top + 0.14, 0.015), 0x151517)
    for i, (px, ang) in enumerate(((0.6, 0.05), (0.88, -0.08), (0.74, 0.1))):
        pz, py = cz + 0.0, top + (0.2 if i == 2 else 0.0)
        kit.add('jute', wb('parcel', cx + px - 0.15, cx + px + 0.15, pz - 0.12, pz + 0.12, py, py + 0.2, 0.012), (0xA8865A, 0xB59468, 0x9C7C52)[i])
        kit.add('paint', wb('twine', cx + px - 0.008, cx + px + 0.008, pz - 0.125, pz + 0.125, py, py + 0.205, 0.001), 0x6B5A3A)
        kit.add('paint', wb('twine', cx + px - 0.155, cx + px + 0.155, pz - 0.008, pz + 0.008, py, py + 0.205, 0.001), 0x6B5A3A)
    # the village postbox mounted on the wall + a bicycle is the postman's (NPC), none here


def d_back(d):
    return -d / 2 + 0.2


def ration_shop():
    cx = 0.0
    block(cx, 3.6, 3.0, 3.0, 'wall_rs', 2.6, tin=True)
    openings(cx, 3.6, 3.0, 0x5A3A24)
    # sacks of grain stacked in the window, a brass beam scale, a painted rate board, a platform scale in front, queue rail
    for i, col in enumerate((0xC9B27A, 0xB89A62, 0xD8C690, 0xB89A62)):
        sack(kit, cx - 0.9 + i * 0.6, -0.5, 0.0, 0.0, col, 0.55, 0.4, 0.6, kind='jute')
        sack(kit, cx - 0.6 + i * 0.6, -0.5, 0.6, 0.0, col, 0.5, 0.38, 0.5, kind='jute') if i < 3 else None
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
    # flank stock outside (the JS-side copies are invisible collision backing): jute grain/sugar sacks stacked two high on the right, slatted crates on the left
    rr = random.Random(31)
    for i in range(6):
        sack(kit, cx + 2.25 + rr.uniform(-0.04, 0.04), 0.6 + (i % 3) * 0.5, (i // 3) * 0.36, rr.uniform(-0.2, 0.2), (0xC9B27A, 0xB59468, 0xD8C690, 0xA88A5E)[i % 4], 0.5, 0.36, 0.5, kind='jute')
    for i, (dx, dd, dz) in enumerate(((0, 1.0, 0.0), (0.04, 1.5, 0.0), (0.0, 1.25, 0.34))):
        x0, d0 = cx - 2.25 + dx, dd
        kit.add('wood', wb('crate', x0 - 0.25, x0 + 0.25, d0 - 0.2, d0 + 0.2, dz, dz + 0.32, 0.008))
        for sl in range(3):  # slats proud of the sides
            kit.add('wood', wb('slat', x0 - 0.27, x0 + 0.27, d0 - 0.21, d0 + 0.21, dz + 0.04 + sl * 0.1, dz + 0.09 + sl * 0.1, 0.004))
        if i < 2:  # a crate of glass oil bottles
            for b in range(4):
                kit.add('paint', cyl('bottle', x0 - 0.18 + b * 0.12, d0, dz + 0.32, dz + 0.58, 0.04, 0.04, 8), 0xC8A64A)
    # counter work (top y 0.96, z 1.45..1.92): beam scale with two pans, register ledger, a row of lidded steel tins and measuring cans
    top, cz = 0.96, 1.7
    kit.add('metal', cyl('scale_stand', cx - 0.7, cz, top, top + 0.4, 0.03, 0.03, 8), 0x3A3D40)
    kit.add('metal', wb('scale_beam', cx - 1.0, cx - 0.4, cz - 0.01, cz + 0.01, top + 0.4, top + 0.42, 0.003), 0x4A4D50)
    for sx in (-0.28, 0.28):
        kit.add('metal', cyl('scale_pan', cx - 0.7 + sx, cz, top + 0.22, top + 0.235, 0.11, 0.11, 12), 0x9A9484)
        kit.add('paint', limb('scale_cord', (cx - 0.7 + sx, cz, top + 0.4), (cx - 0.7 + sx, cz, top + 0.235), 0.004, 0.004), 0x333333)
    kit.add('paint', wb('ledger', cx + 0.3, cx + 0.62, cz - 0.16, cz + 0.06, top, top + 0.05, 0.004), 0x5A2A22)
    kit.add('paint', wb('ledger_pages', cx + 0.31, cx + 0.6, cz - 0.15, cz + 0.05, top + 0.05, top + 0.075, 0.0), 0xE4DCC0)
    for i in range(4):
        h_ = 0.16 + (i % 2) * 0.05
        kit.add('metal', cyl('tin', cx + 0.85 + i * 0.17, cz, top, top + h_, 0.065, 0.065, 12), (0x8F9AA2, 0xB9B6AA)[i % 2])
        kit.add('metal', cyl('tin_lid', cx + 0.85 + i * 0.17, cz, top + h_, top + h_ + 0.02, 0.07, 0.07, 12), 0x6D7075)


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
    back_window(cx + 0.6, -d / 2, 0.7, 1.5, 2.2)  # grilled vent window on the back wall
    # the mill: stone housing with a hopper above it, a green-grey motor with a flywheel + belt, an iron chimney pipe on the roof
    sx, sz = cx - 0.45, -0.45
    GREEN, BLUE, DARKS = 0x5F8A6E, 0x3E6A9A, 0x2A2A28
    # concrete plinth, cast-iron drum housing (flat top, bolted lid ring), square sheet-metal hopper with lid, flour-dusted
    kit.add('concrete', wb('plinth_m', sx - 0.55, sx + 0.55, sz - 0.5, sz + 0.5, 0.05, 0.2, 0.02)) if False else kit.add('paint', wb('plinth_m', sx - 0.55, sx + 0.55, sz - 0.5, sz + 0.5, 0.05, 0.2, 0.02), 0x9C9A92)
    kit.add('metal', cyl('drum', sx, sz, 0.2, 0.82, 0.46, 0.46, 40), GREEN)
    kit.add('metal', cyl('drum_lid', sx, sz, 0.82, 0.9, 0.49, 0.49, 40), 0x4C7058)
    for i in range(10):
        a_ = i / 10 * math.tau
        kit.add('metal', cyl('bolt', sx + 0.43 * math.cos(a_), sz + 0.43 * math.sin(a_), 0.9, 0.95, 0.025, 0.025, 6), 0x2A2A28)
    kit.add('metal', cyl('hopper_neck', sx, sz, 0.95, 1.12, 0.14, 0.14, 24), BLUE)
    kit.add('metal', cyl('hopper_cone', sx, sz, 1.12, 1.6, 0.14, 0.5, 32), BLUE)
    kit.add('metal', cyl('hopper_rim', sx, sz, 1.6, 1.65, 0.52, 0.52, 32, cap=False), 0x2F5278)
    kit.add('paint', wb('hopper_grain', sx - 0.33, sx + 0.33, sz - 0.33, sz + 0.33, 1.5, 1.52, 0.0), 0xD9C58A)
    # outlet chute sloping forward from the drum into a sack held on a low platform scale
    kit.add('metal', limb('chute', (sx + 0.4, sz + 0.3, 0.55), (sx + 0.4, sz + 0.85, 0.3), 0.2, 0.2), 0x9AA0A4)
    sack(kit, sx + 0.4, sz + 1.0, 0.0, 0.0, 0xF3EFE2, 0.42, 0.3, 0.5, kind='jute')
    # flat steel flour tray under the chute, rimmed, with a soft heap of fresh atta
    kit.add('metal', wb('tray', sx - 0.35, sx + 0.05, sz + 0.55, sz + 1.2, 0.0, 0.07, 0.01), 0xA7ADB0)
    kit.add('paint', sphere('tray_heap', sx - 0.15, sz + 0.88, 0.07, 0.17, 0.26, 0.07, 2), 0xF1ECDD)
    kit.add('metal', wb('scale_plate', sx + 0.1, sx + 0.7, sz + 0.75, sz + 1.25, 0.0, 0.05, 0.005), 0x3A3A38)
    # motor on the right: blue body with cooling ribs, mounting rails, pulley + crossed-less V-belt up to the drum shaft behind a mesh guard
    mx, mz = cx + 0.85, -0.45
    kit.add('metal', wb('rails', mx - 0.5, mx + 0.5, mz - 0.25, mz + 0.25, 0.0, 0.08, 0.008), DARKS)
    kit.add('metal', cyl('motor_body', mx, mz, 0.08, 0.5, 0.2, 0.2, 32), BLUE)
    for i in range(6):
        hh = 0.14 + i * 0.06
        kit.add('metal', cyl('rib', mx, mz, hh, hh + 0.025, 0.215, 0.215, 32), 0x2F5278)
    kit.add('metal', wb('term_box', mx - 0.1, mx + 0.1, mz + 0.18, mz + 0.34, 0.3, 0.45, 0.01), 0x2F5278)
    kit.add('metal', ring('pulley', mx - 0.3, mz, 0.3, 0.17, 0.035, axis='x'), DARKS)
    kit.add('paint', limb('belt_up', (mx - 0.3, mz, 0.47), (sx + 0.46, sz + 0.0, 0.7), 0.05, 0.05), 0x1A1A1A)
    kit.add('paint', limb('belt_dn', (mx - 0.3, mz, 0.13), (sx + 0.46, sz + 0.0, 0.5), 0.05, 0.05), 0x1A1A1A)
    kit.add('metal', limb('guard', (mx - 0.28, mz + 0.06, 0.65), (sx + 0.5, sz + 0.06, 0.78), 0.05, 0.05), 0xB8A830)
    # electrical: switch board on the back wall with a wire running to the motor, a hanging bulb on a flex
    kit.add('paint', wb('board', cx + 0.7, cx + 1.1, -d / 2 + 0.22, -d / 2 + 0.3, 1.5, 1.95, 0.01), 0x3A3A38)
    kit.add('paint', wb('switch', cx + 0.8, cx + 0.88, -d / 2 + 0.3, -d / 2 + 0.34, 1.65, 1.75, 0.004), 0xD0C8B0)
    kit.add('paint', limb('wire', (cx + 0.9, -d / 2 + 0.3, 1.5), (mx, mz - 0.25, 0.45), 0.012, 0.012), 0x1A1A1A)
    kit.add('paint', limb('flex', (cx - 0.1, 0.2, h - 0.2), (cx - 0.1, 0.2, h - 0.75), 0.012, 0.012), 0x1A1A1A)
    kit.add('paint', sphere('bulb', cx - 0.1, 0.2, h - 0.82, 0.07, 0.07, 0.09, 1), 0xFFE9A8)
    # chimney vent pipe on the roof
    kit.add('metal', cyl('chimney', cx + w / 2 - 0.35, -d / 2 + 0.4, h + 0.2, h + 2.2, 0.1, 0.1, 10), 0x4A4642)
    kit.add('metal', cyl('chimney_cap', cx + w / 2 - 0.35, -d / 2 + 0.4, h + 2.2, h + 2.3, 0.16, 0.12, 10), 0x4A4642)
    # sacks of wheat (tan) and flour (white) stacked against the side posts, a flour bin with a heap, a hanging pan scale, a counter with ledger
    for i in range(3):
        sack(kit, cx - 1.2 + (i % 2) * 0.05, 0.4 + i * 0.5, 0.0, 0.0, 0xD9C58A, 0.42, 0.3, 0.5, kind='jute')
    sack(kit, cx - 1.18, 0.65, 0.5, 0.1, 0xD9C58A, 0.42, 0.3, 0.45, kind='jute')
    for i in range(3):
        sack(kit, cx + 1.2, 0.2 + i * 0.5, 0.0, 0.0, 0xF3EFE2, 0.42, 0.3, 0.5, kind='jute')
    sack(kit, cx + 1.2, 0.45, 0.5, -0.1, 0xF3EFE2, 0.42, 0.3, 0.45, kind='jute')
    kit.add('metal', cyl('bin', cx + 0.4, 0.9, 0.0, 0.5, 0.25, 0.22, 28), 0x8F9AA2)
    kit.add('paint', sphere('flour_heap', cx + 0.4, 0.9, 0.52, 0.22, 0.22, 0.1, 1), 0xF3EFE2)
    kit.add('paint', limb('scale_hang', (cx - 0.5, 0.9, h - 0.2), (cx - 0.5, 0.9, 1.5), 0.015, 0.015), 0x333333)
    kit.add('metal', cyl('scale_pan', cx - 0.5, 0.9, 1.45, 1.5, 0.17, 0.15, 24), STEEL)
    kit.add('paint', sphere('flour_spill', sx + 0.6, sz + 0.5, 0.06, 0.3, 0.22, 0.04, 1), 0xF3EFE2)
    # flour dust whitening the machine's top surfaces and the floor around it
    kit.add('paint', sphere('dust', sx, sz, 0.93, 0.4, 0.4, 0.03, 1), 0xF3EFE2)
    kit.add('paint', sphere('dust_floor', sx + 0.2, sz + 0.5, 0.055, 0.8, 0.6, 0.03, 1), 0xEFEAD8)


post_office()
ration_shop()
atta_chakki()
TINTS = {'hb_wall_po': '#B7CEE3', 'hb_wall_rs': '#EBCB86', 'hb_wall_ac': '#D9987A', 'hb_plinth': '#C98A3C', 'hb_trim': '#D8D2C2', 'hb_apron': '#A59A88', 'hb_floor': '#8E897F', 'hb_wood': '#B89A74'}
kit.finalize(OUT, TINTS, drift_amp=0.06, ao_strength=0.4)
