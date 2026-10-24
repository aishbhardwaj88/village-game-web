"""
Dense abadi ROWS (art review 3, "Background houses - FAIL"): houses share walls and stand in continuous rows along a lane,
modelled from Characters V1/buildings/house_1.png (front elevation + 3/4 view: carved wooden jharokha balconies, plank door with
a wooden chajja, louvred shutters, flat roofs with parapets, roof tank / charpai / clothesline, marigold pots, ochre plinth) and
house_2/house_3 (the pale limewash colour range) and Places V1/house/STYLE_ONLY_other_family_duplex.png.

Run: tools/blender/make_abadi.sh   -> public/assets/models/abadi_row_{a,b,c}.glb + src/abadiBoxes.json (collision footprints)

Each row is authored in its own frame: x along the row (centred on 0), z = depth (front = +z, the lane side), h = height, ground at 0.
Depth D = 7. Rows are instanced in-game (src/scenery.js) facing the lane from both sides.
  A  four houses, two-storey with jharokha balconies and one single-storey, painted limewash, tanks + charpais on the roofs
  B  four single-storey houses: flat parapet roofs, a corrugated-tin verandah roof and a red clay-tile roof among them
  C  mixed: two-storey + single-storey + a cattle baada (low-walled pen with a cow, tin roof) + hand pump on a platform
Every house is swept and limewashed (art-direction 7.1b: modest is cared-for, never crumbling).
"""
import sys, os, math, random, json
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, quad, ROOT
from arch import Kit, pot, STEEL, LEAF, MARI, TERRA

OUTDIR = os.path.join(ROOT, 'tmp')
D = 7.0
ZF = D / 2

WALLS = [0xF0E4C4, 0xBCD0DC, 0xE9BDB4, 0xC2DDCB, 0xE8CE90, 0xF1D2AE, 0xCFD8E6, 0xF3EBD8]
PLINTH = [0xD9A33E, 0x6A7F94, 0xB5693F, 0xC99A4A]
WOODD = 0x4A3426
WOODL = 0x6B4E34
GLASS = 0x1E1A18
# Painted-wood palette (doors, shutters): deep bottle green, teal, oxblood, indigo, ochre, sun-faded turquoise.
# Picked per house from its x position (no rnd draw, so layouts stay identical).
PAINTS = [(0x2F5D46, 0x234736), (0x2E6F72, 0x22555A), (0x7A2E2A, 0x5E2220), (0x2F4A7A, 0x233860), (0xB8862F, 0x946A22), (0x5FA39B, 0x468279)]
_paint = PAINTS[0]


def set_paint(x0, w):
    global _paint
    _paint = PAINTS[int(abs(x0) * 7 + w * 3) % len(PAINTS)]
CLOTH = [0xC0392B, 0x2E8B57, 0x3B5BA5, 0xE0B53A, 0xEEE6D2]

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#FFFFFF', 'hb_trim': '#E6E0D0', 'hb_apron': '#A59A88', 'hb_wood': '#FFFFFF',
         'hb_tin': '#C8D0D4', 'hb_terracotta': '#D98A68'}


def door(kit, cx, w=1.0, h=2.1):
    ft = 0.08
    kit.add('wood', wb('dj', cx - w / 2 - ft, cx - w / 2, ZF - 0.02, ZF + 0.09, 0, h + 0.1, 0.004), WOODL)
    kit.add('wood', wb('dj', cx + w / 2, cx + w / 2 + ft, ZF - 0.02, ZF + 0.09, 0, h + 0.1, 0.004), WOODL)
    kit.add('wood', wb('dl', cx - w / 2 - ft, cx + w / 2 + ft, ZF - 0.02, ZF + 0.09, h, h + 0.12, 0.004), WOODL)
    kit.add('wood', wb('leaf', cx - w / 2, cx + w / 2, ZF - 0.01, ZF + 0.05, 0, h, 0.004), _paint[0])
    for (p0, p1) in ((0.15, 0.95), (1.08, h - 0.15)):
        for a, b in ((cx - w / 2 + 0.07, cx - 0.03), (cx + 0.03, cx + w / 2 - 0.07)):
            kit.add('wood', wb('panel', a, b, ZF + 0.04, ZF + 0.075, p0, p1, 0.004), _paint[1])
    # wooden chajja on two brackets (house_1: slatted slab over the door)
    kit.add('wood', wb('chajja', cx - 0.8, cx + 0.8, ZF + 0.0, ZF + 0.8, h + 0.3, h + 0.37, 0.008), WOODL)
    for sgn in (-1, 1):
        kit.add('wood', limb('chajja_br', (cx + sgn * 0.7, ZF + 0.02, h + 0.0), (cx + sgn * 0.7, ZF + 0.72, h + 0.3), 0.05, 0.04), WOODD)
    kit.add('apron', wb('door_step', cx - 0.7, cx + 0.7, ZF + 0.0, ZF + 0.55, 0, 0.12, 0.008))


def window(kit, cx, w, h0, h1, shutter_col=None):
    shutter_col = _paint[0] if shutter_col is None else shutter_col
    ft = 0.06
    u0, u1 = cx - w / 2, cx + w / 2
    kit.add('paint', wb('glass', u0, u1, ZF - 0.01, ZF + 0.03, h0, h1, 0), GLASS)
    kit.add('wood', wb('wf', u0 - ft, u0, ZF - 0.01, ZF + 0.08, h0 - 0.02, h1 + 0.04, 0.004), WOODL)
    kit.add('wood', wb('wf', u1, u1 + ft, ZF - 0.01, ZF + 0.08, h0 - 0.02, h1 + 0.04, 0.004), WOODL)
    kit.add('wood', wb('wf', u0 - ft, u1 + ft, ZF - 0.01, ZF + 0.08, h1, h1 + 0.06, 0.004), WOODL)
    kit.add('wood', wb('sill', u0 - 0.1, u1 + 0.1, ZF - 0.01, ZF + 0.14, h0 - 0.07, h0 - 0.0, 0.004), 0xD8D2C2)
    # one leaf closed (louvred), one ajar-dark: reads as a shuttered window
    um = cx
    kit.add('wood', wb('shutter', u0 + 0.02, um - 0.01, ZF + 0.03, ZF + 0.07, h0 + 0.02, h1 - 0.02, 0.003), shutter_col)
    n = int((h1 - h0 - 0.2) / 0.1)
    for k in range(n):
        hk = h0 + 0.12 + k * 0.1
        kit.add('wood', wb('slat', u0 + 0.05, um - 0.04, ZF + 0.07, ZF + 0.1, hk, hk + 0.05, 0), _paint[1])
    for a in (um + 0.01,):
        for j in range(1, 5):
            x = a + j * (u1 - a) / 5
            kit.add('paint', wb('bar', x - 0.012, x + 0.012, ZF + 0.03, ZF + 0.06, h0 + 0.02, h1 - 0.02, 0), 0x2A2A2C)


def jharokha(kit, cx, w=2.0, floor=3.3):
    """Carved wooden balcony bay (house_1): projecting slab on corbels, 4 posts, balustrade, slatted wooden roof."""
    pz = ZF + 0.85
    kit.add('trim', wb('jslab', cx - w / 2, cx + w / 2, ZF - 0.02, pz, floor - 0.12, floor, 0.01), 0xD8D2C2)
    for x in (cx - w / 2 + 0.2, cx, cx + w / 2 - 0.2):
        kit.add('wood', limb('corbel', (x, ZF, floor - 0.8), (x, pz - 0.05, floor - 0.12), 0.1, 0.07), WOODD)
    top = floor + 1.95
    for x in (cx - w / 2 + 0.07, cx + w / 2 - 0.07):
        for z in (ZF + 0.12, pz - 0.07):
            kit.add('wood', limb('jpost', (x, z, floor), (x, z, top), 0.1, 0.1, 0.006), WOODD)
    rh = floor + 0.95
    for z0, z1, x0, x1 in ((pz - 0.07, pz - 0.07, cx - w / 2 + 0.07, cx + w / 2 - 0.07),):
        kit.add('wood', wb('jrail', x0, x1, z0 - 0.05, z1 + 0.05, rh, rh + 0.08, 0.005), WOODD)
        n = 7
        for k in range(n + 1):
            x = x0 + 0.05 + k * ((x1 - x0 - 0.1) / n)
            kit.add('wood', wb('bal', x - 0.025, x + 0.025, z0 - 0.025, z0 + 0.025, floor, rh, 0), WOODD)
    for sgn in (-1, 1):  # side balustrades
        x = cx + sgn * (w / 2 - 0.07)
        kit.add('wood', wb('jrail_s', x - 0.04, x + 0.04, ZF + 0.12, pz - 0.07, rh, rh + 0.08, 0.005), WOODD)
        for k in range(1, 4):
            z = ZF + 0.12 + k * ((pz - 0.07 - ZF - 0.12) / 4)
            kit.add('wood', wb('bal_s', x - 0.025, x + 0.025, z - 0.025, z + 0.025, floor, rh, 0), WOODD)
    kit.add('wood', wb('jroof', cx - w / 2 - 0.1, cx + w / 2 + 0.1, ZF - 0.02, pz + 0.12, top, top + 0.08, 0.008), WOODL)
    # the dark double-shutter opening behind the bay
    kit.add('paint', wb('jdoor', cx - 0.6, cx + 0.6, ZF - 0.01, ZF + 0.04, floor, floor + 1.95, 0), 0x2A1E17)
    for x in (cx - 0.3, cx + 0.3):
        kit.add('wood', wb('jdoor_p', x - 0.2, x + 0.2, ZF + 0.03, ZF + 0.06, floor + 0.2, floor + 1.7, 0), 0x3B2A1E)


def tank(kit, x, z, h):
    for dx, dz in ((-0.3, -0.3), (0.3, -0.3), (-0.3, 0.3), (0.3, 0.3)):
        kit.add('paint', limb('tleg', (x + dx, z + dz, h), (x + dx, z + dz, h + 0.25), 0.05, 0.05), 0x555555)
    kit.add('paint', cyl('tank', x, z, h + 0.25, h + 1.1, 0.5, 0.5, 14), 0x1C1C1F)
    kit.add('paint', sphere('tank_dome', x, z, h + 1.1, 0.5, 0.5, 0.18, 1), 0x1C1C1F)


def charpai(kit, x, z, h, ang):
    ca, sa = math.cos(ang), math.sin(ang)

    def p(dx, dz, hh):
        return (x + dx * ca - dz * sa, z + dx * sa + dz * ca, hh)
    for sx in (-1, 1):
        for sz in (-1, 1):
            kit.add('wood', limb('leg', p(sx * 0.42, sz * 0.9, h), p(sx * 0.42, sz * 0.9, h + 0.36), 0.06, 0.06), WOODD)
    for i in range(6):
        t = -0.85 + i * 0.34
        kit.add('paint', limb('weave', p(-0.42, t, h + 0.37), p(0.42, t, h + 0.37), 0.32, 0.02), CLOTH[i % 5])


def clothesline(kit, x0, x1, z, h, rnd):
    for x in (x0, x1):
        kit.add('wood', limb('cl_post', (x, z, h), (x, z, h + 1.5), 0.05, 0.05), WOODD)
    kit.add('paint', limb('cl_line', (x0, z, h + 1.45), (x1, z, h + 1.4), 0.012, 0.012), 0xDDDDDD)
    k = max(2, int((x1 - x0) / 0.9))
    for i in range(k):
        x = x0 + 0.3 + i * ((x1 - x0 - 0.5) / k)
        kit.add('paint', quad('cloth', [(x, z, h + 1.42), (x + 0.5, z, h + 1.4), (x + 0.46, z, h + 0.8), (x + 0.02, z, h + 0.85)]), rnd.choice(CLOTH))


def parapet(kit, x0, x1, H, wall, ph=0.75):
    t = 0.18
    kit.add('trim', wb('roof', x0 - 0.1, x1 + 0.1, -ZF - 0.15, ZF + 0.2, H, H + 0.15, 0.01), 0xD8D2C2)
    kit.add('plaster', wb('par_f', x0 - 0.02, x1 + 0.02, ZF + 0.02, ZF + 0.2, H + 0.15, H + 0.15 + ph, 0.008), wall)
    kit.add('plaster', wb('par_b', x0 - 0.02, x1 + 0.02, -ZF - 0.15, -ZF + 0.03, H + 0.15, H + 0.15 + ph, 0.008), wall)
    kit.add('plaster', wb('par_l', x0 - 0.02, x0 + t, -ZF - 0.15, ZF + 0.2, H + 0.15, H + 0.15 + ph, 0.008), wall)
    kit.add('plaster', wb('par_r', x1 - t, x1 + 0.02, -ZF - 0.15, ZF + 0.2, H + 0.15, H + 0.15 + ph, 0.008), wall)
    kit.add('trim', wb('cope', x0 - 0.06, x1 + 0.06, ZF - 0.02, ZF + 0.26, H + 0.15 + ph, H + 0.22 + ph, 0.006), 0xD8D2C2)
    for u in (x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.7):  # parapet weep/vent slots (house_1)
        kit.add('paint', wb('vent', u - 0.07, u + 0.07, ZF + 0.19, ZF + 0.215, H + 0.4, H + 0.55, 0), GLASS)


def house(kit, rnd, x0, w, floors, wall, plinth, roof='flat', jh=True):
    H = 3.3 if floors == 1 else 6.4
    kit.add('plaster', wb('blk', x0, x0 + w, -ZF, ZF, 0, H, 0.01), wall)
    kit.add('plinth', wb('plinth', x0 - 0.01, x0 + w + 0.01, ZF - 0.02, ZF + 0.06, 0, 0.65, 0.008), plinth)
    kit.add('trim', wb('plinth_cap', x0 - 0.02, x0 + w + 0.02, ZF - 0.03, ZF + 0.08, 0.65, 0.7, 0.006), 0xD8D2C2)
    # back wall (seen from the field side): ochre plinth, small barred windows, a vent — no longer a blank slab
    kit.add('plinth', wb('plinth_b', x0 - 0.01, x0 + w + 0.01, -ZF - 0.06, -ZF + 0.02, 0, 0.65, 0.008), plinth)
    bx = x0 + w * (0.35 if rnd.random() < 0.5 else 0.65)
    for hb0, hb1 in ((1.3, 2.1),) + (((4.0, 4.9),) if floors == 2 else ()):
        kit.add('paint', wb('bwin', bx - 0.4, bx + 0.4, -ZF - 0.05, -ZF + 0.02, hb0, hb1, 0), GLASS)
        kit.add('wood', wb('bwin_f', bx - 0.46, bx + 0.46, -ZF - 0.09, -ZF - 0.03, hb1, hb1 + 0.06, 0.004), WOODL)
        kit.add('wood', wb('bwin_s', bx - 0.5, bx + 0.5, -ZF - 0.12, -ZF - 0.03, hb0 - 0.07, hb0, 0.004), 0xD8D2C2)
        for j in range(1, 5):
            xx = bx - 0.4 + j * 0.16
            kit.add('paint', wb('bwin_bar', xx - 0.012, xx + 0.012, -ZF - 0.08, -ZF - 0.05, hb0, hb1, 0), 0x2A2A2C)
    kit.add('paint', wb('bvent', x0 + w * 0.5 - 0.08, x0 + w * 0.5 + 0.08, -ZF - 0.04, -ZF + 0.01, H - 0.5, H - 0.34, 0), GLASS)
    # door and window on opposite thirds so neighbours differ
    left = rnd.random() < 0.5
    set_paint(x0, w)
    dcx = x0 + w * (0.3 if left else 0.7)
    wcx = x0 + w * (0.72 if left else 0.28)
    door(kit, dcx)
    window(kit, wcx, 0.95, 1.1, 2.2)
    if floors == 2:
        kit.add('trim', wb('string', x0 - 0.02, x0 + w + 0.02, ZF - 0.03, ZF + 0.1, 3.0, 3.18, 0.008), 0xD8D2C2)
        if jh and w >= 4.4:
            jharokha(kit, dcx, 2.0)
            window(kit, wcx, 0.95, 3.9, 5.1)
        else:
            window(kit, dcx, 0.95, 3.9, 5.1)
            window(kit, wcx, 0.95, 3.9, 5.1)
            # simple railing balcony across the upper front
            kit.add('trim', wb('bslab', x0 + 0.1, x0 + w - 0.1, ZF - 0.02, ZF + 0.6, 3.18, 3.3, 0.008), 0xD8D2C2)
            kit.add('wood', wb('brail', x0 + 0.1, x0 + w - 0.1, ZF + 0.54, ZF + 0.6, 4.2, 4.28, 0.005), WOODD)
            for k in range(int((w - 0.3) / 0.2)):
                x = x0 + 0.15 + k * 0.2
                kit.add('wood', wb('bbal', x - 0.025, x + 0.025, ZF + 0.55, ZF + 0.59, 3.3, 4.2, 0), WOODD)
    if roof == 'flat':
        parapet(kit, x0, x0 + w, H, wall)
        r = rnd.random()
        if r < 0.55:
            tank(kit, x0 + w * 0.7, -0.6, H + 0.15)
        if r > 0.35:
            charpai(kit, x0 + w * 0.35, 0.3, H + 0.15, rnd.uniform(-0.3, 0.3))
        if rnd.random() < 0.5:
            clothesline(kit, x0 + 0.5, x0 + w - 0.5, -2.2, H + 0.15, rnd)
        if rnd.random() < 0.3 and floors == 2:  # stair-head mumty room
            kit.add('plaster', wb('mumty', x0 + 0.3, x0 + 1.9, -2.9, -1.2, H + 0.15, H + 2.3, 0.01), wall)
            kit.add('trim', wb('mumty_roof', x0 + 0.2, x0 + 2.0, -3.0, -1.1, H + 2.3, H + 2.45, 0.01), 0xD8D2C2)
            kit.add('wood', wb('mumty_door', x0 + 0.8, x0 + 1.5, -1.22, -1.17, H + 0.15, H + 2.1, 0), WOODD)
    elif roof == 'tin':
        kit.add('tin', prism_x('roof_tin', x0 - 0.1, x0 + w + 0.1, [(-ZF - 0.2, H + 0.75), (ZF + 0.9, H - 0.08), (ZF + 0.9, H), (-ZF - 0.2, H + 0.83)]))
        for x in (x0 + 0.2, x0 + w - 0.2):
            kit.add('wood', limb('vpost', (x, ZF + 0.8, 0), (x, ZF + 0.8, H - 0.1), 0.11, 0.11), WOODD)
        kit.add('apron', wb('veranda', x0, x0 + w, ZF, ZF + 0.95, 0, 0.14, 0.01))
    elif roof == 'tile':
        kit.add('terracotta', prism_x('roof_tile', x0 - 0.15, x0 + w + 0.15, [(-ZF - 0.25, H - 0.05), (0.0, H + 1.1), (ZF + 1.0, H - 0.2), (ZF + 1.0, H - 0.1), (0.0, H + 1.22), (-ZF - 0.25, H + 0.05)]))
        for x in (x0 + 0.2, x0 + w - 0.2):
            kit.add('wood', limb('vpost', (x, ZF + 0.9, 0), (x, ZF + 0.9, H - 0.2), 0.12, 0.12), WOODD)
        kit.add('apron', wb('veranda', x0, x0 + w, ZF, ZF + 1.0, 0, 0.16, 0.01))
        kit.add('wood', wb('bench', x0 + 0.5, x0 + 1.9, ZF + 0.5, ZF + 0.85, 0.0, 0.4, 0.008), WOODL)
    # (24 Oct 2026: the blocky code-built marigold/leafy pots were removed on the art director's instruction; real Poly Haven
    # potted plants are instanced at the doorsteps by src/villageProps.js instead)
    rnd.random()  # keep the random stream identical so every other detail stays where it was
    return H


def baada(kit, x0, w):
    """Low-walled cattle pen with a sloped tin roof and a cow (the village-edge baada of MAP.md)."""
    t = 0.2
    wall = 0xE8DCC0
    kit.add('plaster', wb('bw_b', x0, x0 + w, -ZF, -ZF + t, 0, 1.2, 0.01), wall)
    kit.add('plaster', wb('bw_l', x0, x0 + t, -ZF, ZF - 0.5, 0, 1.2, 0.01), wall)
    kit.add('plaster', wb('bw_r', x0 + w - t, x0 + w, -ZF, ZF - 0.5, 0, 1.2, 0.01), wall)
    kit.add('plinth', wb('bw_pl', x0, x0 + w, -ZF - 0.02, -ZF + t + 0.02, 0, 0.4, 0.008), 0xD9A33E)
    kit.add('trim', wb('bw_cope', x0 - 0.03, x0 + w + 0.03, -ZF - 0.03, -ZF + t + 0.03, 1.2, 1.27, 0.006), 0xD8D2C2)
    for x in (x0 + 0.2, x0 + w - 0.2):
        kit.add('wood', limb('bpost', (x, ZF - 0.4, 0), (x, ZF - 0.4, 2.3), 0.12, 0.12), WOODD)
    kit.add('tin', prism_x('broof', x0 - 0.1, x0 + w + 0.1, [(-ZF - 0.1, 2.9), (ZF - 0.1, 2.25), (ZF - 0.1, 2.32), (-ZF - 0.1, 2.97)]))
    kit.add('wood', wb('manger', x0 + 0.4, x0 + w - 0.4, -ZF + 0.3, -ZF + 0.8, 0.0, 0.5, 0.01), WOODL)
    kit.add('paint', wb('hay', x0 + 0.5, x0 + w - 0.5, -ZF + 0.35, -ZF + 0.75, 0.42, 0.6, 0.0), 0xC9A85A)
    cx, cz = x0 + w / 2, 0.4
    COW = 0x8A5A3C
    kit.add('paint', sphere('cow_body', cx, cz, 0.98, 0.62, 0.36, 0.34, 2), COW)
    kit.add('paint', sphere('cow_rump', cx + 0.45, cz, 0.95, 0.4, 0.34, 0.34, 2), COW)
    kit.add('paint', sphere('cow_chest', cx - 0.4, cz, 0.95, 0.38, 0.32, 0.34, 2), COW)
    kit.add('paint', limb('cow_neck', (cx - 0.55, cz, 1.05), (cx - 0.95, cz, 0.98), 0.3, 0.24), COW)
    kit.add('paint', sphere('cow_head', cx - 1.08, cz, 0.93, 0.2, 0.13, 0.13, 1), COW)
    kit.add('paint', sphere('cow_patch', cx + 0.05, cz - 0.28, 1.05, 0.28, 0.1, 0.22, 1), 0xEFE8DA)
    for dx in (-0.5, 0.55):
        for dz in (-0.2, 0.2):
            kit.add('paint', cyl('cow_leg', cx + dx, cz + dz, 0.0, 0.78, 0.07, 0.055, 8), COW)


def hand_pump(kit, x, z):
    kit.add('trim', wb('pp_plat', x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 0.1, 0.01), 0xD8D2C2)
    kit.add('paint', cyl('pp_body', x, z, 0.1, 1.15, 0.07, 0.06, 10), 0x3F6B45)
    kit.add('paint', sphere('pp_head', x, z, 1.2, 0.12, 0.12, 0.1, 1), 0x3F6B45)
    kit.add('paint', limb('pp_handle', (x, z, 1.25), (x + 0.55, z, 1.0), 0.05, 0.04), 0x2A2A2C)
    kit.add('paint', limb('pp_spout', (x, z, 0.8), (x, z + 0.3, 0.7), 0.05, 0.04), 0x3F6B45)


def build_row(name, spec, seed, extras=()):
    kit = Kit(split_props=False)
    rnd = random.Random(seed)
    x = 0.0
    boxes = []
    for item in spec:
        kind = item[0]
        if kind == 'house':
            _, w, floors, wi, pi, roof = item
            H = house(kit, rnd, x, w, floors, WALLS[wi], PLINTH[pi], roof)
            boxes.append({'x0': x, 'x1': x + w, 'z0': -ZF, 'z1': ZF + (1.0 if roof in ('tin', 'tile') else 0.0), 'h': H})
        elif kind == 'baada':
            _, w = item
            baada(kit, x, w)
            boxes.append({'x0': x, 'x1': x + w, 'z0': -ZF, 'z1': -ZF + 0.2, 'h': 1.2})
            boxes.append({'x0': x, 'x1': x + 0.2, 'z0': -ZF, 'z1': ZF - 0.5, 'h': 1.2})
            boxes.append({'x0': x + w - 0.2, 'x1': x + w, 'z0': -ZF, 'z1': ZF - 0.5, 'h': 1.2})
            w = item[1]
        elif kind == 'gap':
            _, w = item
        x += w
        if kind == 'pump':
            pass
    L = x
    # shift everything so the row is centred on x = 0 (done by translating all objects)
    for kind, obj, col in kit.records:
        obj.location.x -= L / 2
    for b in boxes:
        b['x0'] -= L / 2
        b['x1'] -= L / 2
    for fn in extras:
        fn(kit, L)
    # a continuous front drain + kerb along the lane edge of the row
    kit.add('paint', wb('drain', -L / 2 - 0.2, L / 2 + 0.2, ZF + 1.05, ZF + 1.3, 0, 0.035, 0.0), 0x4A443C)
    kit.finalize(os.path.join(OUTDIR, f'abadi_row_{name}_raw.glb'), TINTS, drift_amp=0.07, ao_strength=0.4)
    return {'L': round(L, 2), 'boxes': [{k: round(v, 2) for k, v in b.items()} for b in boxes]}


def pump_extra(kit, L):
    hand_pump(kit, L / 2 - 1.2, ZF + 2.2)


# widths mix 4.2-5.6; the sums land near 20-21 m
data = {}
data['a'] = build_row('a', [('house', 5.2, 2, 0, 0, 'flat'), ('house', 4.4, 1, 1, 1, 'flat'), ('house', 5.6, 2, 2, 2, 'flat'), ('house', 4.6, 2, 3, 3, 'flat')], 21)
data['b'] = build_row('b', [('house', 4.6, 1, 4, 0, 'tin'), ('house', 4.8, 1, 5, 2, 'flat'), ('house', 5.0, 1, 7, 3, 'tile'), ('house', 4.4, 1, 1, 1, 'flat')], 22)
data['c'] = build_row('c', [('house', 5.4, 2, 5, 3, 'flat'), ('baada', 3.6), ('house', 4.6, 1, 3, 1, 'tin'), ('house', 5.0, 2, 4, 0, 'flat')], 23, extras=(pump_extra,))
with open(os.path.join(ROOT, 'src', 'abadiBoxes.json'), 'w') as f:
    json.dump(data, f)
print('boxes written', {k: v['L'] for k, v in data.items()})


# ----------------------------------------------------------------------------- LOD (far) models
# One low-poly proxy per row (~600 triangles, one material): flat-coloured boxes only. In-game (src/scenery.js) rows nearer than
# NEAR_DIST use the detailed model above, rows beyond use these, so the whole abadi stays inside the 400k-triangle budget.
def house_lod(kit, rnd, x0, w, floors, wall, plinth, roof):
    H = 3.3 if floors == 1 else 6.4
    B = 0.0
    kit.add('plaster', wb('blk', x0, x0 + w, -ZF, ZF, 0, H, B), wall)
    kit.add('plinth', wb('plinth', x0, x0 + w, ZF, ZF + 0.05, 0, 0.65, B), plinth)
    left = rnd.random() < 0.5
    set_paint(x0, w)
    dcx = x0 + w * (0.3 if left else 0.7)
    wcx = x0 + w * (0.72 if left else 0.28)
    kit.add('wood', wb('door', dcx - 0.5, dcx + 0.5, ZF, ZF + 0.06, 0, 2.1, B), _paint[0])
    kit.add('wood', wb('chajja', dcx - 0.8, dcx + 0.8, ZF, ZF + 0.8, 2.4, 2.47, B), WOODL)
    kit.add('paint', wb('win', wcx - 0.5, wcx + 0.5, ZF, ZF + 0.05, 1.1, 2.2, B), 0x4A3426)
    if floors == 2:
        kit.add('paint', wb('win2', wcx - 0.5, wcx + 0.5, ZF, ZF + 0.05, 3.9, 5.1, B), 0x4A3426)
        kit.add('wood', wb('jbay', dcx - 1.0, dcx + 1.0, ZF, ZF + 0.85, 3.2, 5.3, B), WOODD)
    # rear and flank openings (seen from rooftops and the fields): one dark window per floor on the back, a small high vent
    bx = x0 + w * (0.62 if left else 0.38)
    kit.add('paint', wb('bwin', bx - 0.45, bx + 0.45, -ZF - 0.05, -ZF, 1.2, 2.2, B), 0x4A3426)
    if floors == 2:
        kit.add('paint', wb('bwin2', bx - 0.45, bx + 0.45, -ZF - 0.05, -ZF, 4.0, 5.1, B), 0x4A3426)
    if roof == 'flat':
        kit.add('trim', wb('roof', x0 - 0.1, x0 + w + 0.1, -ZF - 0.15, ZF + 0.2, H, H + 0.15, B), 0xD8D2C2)
        kit.add('plaster', wb('par_f', x0, x0 + w, ZF, ZF + 0.2, H + 0.15, H + 0.9, B), wall)
        kit.add('plaster', wb('par_b', x0, x0 + w, -ZF - 0.15, -ZF + 0.05, H + 0.15, H + 0.9, B), wall)
        if rnd.random() < 0.55:
            kit.add('paint', wb('tank', x0 + w * 0.7 - 0.4, x0 + w * 0.7 + 0.4, -1.0, -0.2, H + 0.15, H + 1.2, B), 0x1C1C1F)
    elif roof == 'tin':
        kit.add('paint', prism_x('roof_tin', x0 - 0.1, x0 + w + 0.1, [(-ZF - 0.2, H + 0.75), (ZF + 0.9, H - 0.08), (ZF + 0.9, H), (-ZF - 0.2, H + 0.83)]), 0xAAB2B6)
    elif roof == 'tile':
        kit.add('paint', prism_x('roof_tile', x0 - 0.15, x0 + w + 0.15, [(-ZF - 0.25, H - 0.05), (0.0, H + 1.1), (ZF + 1.0, H - 0.2), (ZF + 1.0, H - 0.1), (0.0, H + 1.22), (-ZF - 0.25, H + 0.05)]), 0xC0603F)


def baada_lod(kit, x0, w):
    kit.add('plaster', wb('bw_b', x0, x0 + w, -ZF, -ZF + 0.2, 0, 1.2, 0), 0xE8DCC0)
    kit.add('plaster', wb('bw_l', x0, x0 + 0.2, -ZF, ZF - 0.5, 0, 1.2, 0), 0xE8DCC0)
    kit.add('plaster', wb('bw_r', x0 + w - 0.2, x0 + w, -ZF, ZF - 0.5, 0, 1.2, 0), 0xE8DCC0)
    kit.add('paint', prism_x('broof', x0 - 0.1, x0 + w + 0.1, [(-ZF - 0.1, 2.9), (ZF - 0.1, 2.25), (ZF - 0.1, 2.32), (-ZF - 0.1, 2.97)]), 0xAAB2B6)
    kit.add('paint', wb('cow', x0 + w / 2 - 0.9, x0 + w / 2 + 0.9, 0.0, 0.8, 0.2, 1.3, 0), 0x8A5A3C)


def build_row_lod(name, spec, seed):
    kit = Kit(split_props=False)
    rnd = random.Random(seed + 500)
    x = 0.0
    for item in spec:
        kind = item[0]
        if kind == 'house':
            _, w, floors, wi, pi, roof = item
            house_lod(kit, rnd, x, w, floors, WALLS[wi], PLINTH[pi], roof)
        elif kind == 'baada':
            _, w = item
            baada_lod(kit, x, w)
        else:
            w = item[1]
        x += w
    for kind, obj, col in kit.records:
        obj.location.x -= x / 2
    kit.finalize(os.path.join(OUTDIR, f'abadi_row_{name}_lod_raw.glb'), TINTS, drift_amp=0.05, ao_strength=0.3)


SPECS = {
    'a': ([('house', 5.2, 2, 0, 0, 'flat'), ('house', 4.4, 1, 1, 1, 'flat'), ('house', 5.6, 2, 2, 2, 'flat'), ('house', 4.6, 2, 3, 3, 'flat')], 21),
    'b': ([('house', 4.6, 1, 4, 0, 'tin'), ('house', 4.8, 1, 5, 2, 'flat'), ('house', 5.0, 1, 7, 3, 'tile'), ('house', 4.4, 1, 1, 1, 'flat')], 22),
    'c': ([('house', 5.4, 2, 5, 3, 'flat'), ('baada', 3.6), ('house', 4.6, 1, 3, 1, 'tin'), ('house', 5.0, 2, 4, 0, 'flat')], 23),
}
for k, (sp, sd) in SPECS.items():
    build_row_lod(k, sp, sd)
