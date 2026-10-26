"""
Peepal chaupal - arch.py Kit, to Places V1/chaupal/LAYOUT.md + MAIN_chaupal_front_isometric.png / back_top (top = layout authority).
Run:  tools/blender/make.sh chaupal chaupal_v2
Frame: site-local metres, +z south = front. Bare earth patch 20 x 20 m (x,z in [-10,10]); four lanes meet at the middles of its sides (outside).
Round brick platform 8 m across (R 4) with cement top, cream edge, brick steps front + both sides; the tree pit is left EMPTY (the huge peepal is hers).
3 charpais + 1 takht + 2 plastic chairs (red, green) round the platform; notice board 2 m on 2 wooden posts at the left (blank paper sheets plus two
picture-only event posters, a circus and a cricket match, no lettering); hand pump + matka on a cement slab front-right; concrete electric pole with one street lamp at the right; a broom.
No threads or lamps on the tree, no hookah (game rules).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, quad, join_objects, ROOT
from arch import Kit, plastic_chair, lathe, clay_pot, decal_material, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'chaupal_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(3)
CEMENT = 0x8E8C86
CREAM = 0xE8DFC0


def add(k, o, c=None):
    kit.add(k, o, c)
    return o


def ring_wall(cx, cz, R, h0, h1, t, kind='brick', n=40):
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        add(kind, limb('seg', (cx + R * math.cos(a0), cz + R * math.sin(a0), (h0 + h1) / 2), (cx + R * math.cos(a1), cz + R * math.sin(a1), (h0 + h1) / 2), t, h1 - h0))


def charpai(cx, cz, ang, w=1.9, d=1.0):
    ca, sa = math.cos(ang), math.sin(ang)
    P = lambda u, v, h: (cx + u * ca - v * sa, cz + u * sa + v * ca, h)
    for u in (-w / 2 + 0.07, w / 2 - 0.07):
        for v in (-d / 2 + 0.07, d / 2 - 0.07):
            add('wood', limb('cot_leg', P(u, v, 0), P(u, v, 0.4), 0.07))
    for (a, b, c, e) in ((-w / 2, w / 2, -d / 2, -d / 2 + 0.06), (-w / 2, w / 2, d / 2 - 0.06, d / 2), (-w / 2, -w / 2 + 0.06, -d / 2, d / 2), (w / 2 - 0.06, w / 2, -d / 2, d / 2)):
        add('wood', limb('cot_frame', P((a + b) / 2, (c + e) / 2, 0.41), P((a + b) / 2 + 0.0001, (c + e) / 2, 0.41), max(0.06, abs(b - a)), max(0.06, abs(e - c)) if abs(b - a) > 0.1 else 0.06) if False else limb('cot_frame', P(a, (c + e) / 2, 0.4), P(b, (c + e) / 2, 0.4), 0.07, 0.07) if abs(b - a) > 0.1 else limb('cot_frame', P((a + b) / 2, c, 0.4), P((a + b) / 2, e, 0.4), 0.07, 0.07))
    for k in range(8):
        v = -d / 2 + 0.1 + k * (d - 0.2) / 7
        add('paint', limb('rope', P(-w / 2 + 0.05, v, 0.43), P(w / 2 - 0.05, v, 0.43), 0.03, 0.02), 0xB89A64)
    for k in range(12):
        u = -w / 2 + 0.1 + k * (w - 0.2) / 11
        add('paint', limb('rope2', P(u, -d / 2 + 0.05, 0.45), P(u, d / 2 - 0.05, 0.45), 0.03, 0.02), 0xA88A58)


add('paint', wb('patch', -10, 10, -10, 10, -0.08, 0.04, 0.0), 0xB69568)
add('paint', wb('worn_ns', -1.8, 1.8, -10, 10, 0.04, 0.046, 0.0), 0xA38358)       # trodden lanes crossing
add('paint', wb('worn_ew', -10, 10, -1.8, 1.8, 0.04, 0.046, 0.0), 0xA38358)
# platform: brick drum, cement top, cream edge, tree pit ring
R = 4.0
ring_wall(0, 0, R - 0.17, 0, 0.9, 0.38)
add('trim', cyl('top', 0, 0, 0.9, 0.98, R + 0.08, R + 0.08, 40), CEMENT)
add('trim', cyl('edge', 0, 0, 0.97, 1.02, R + 0.14, R + 0.14, 40), CREAM)
add('trim', cyl('inner_edge', 0, 0, 0.98, 1.1, 1.55, 1.55, 28), CREAM)
add('paint', cyl('pit_soil', 0, 0, 0.0, 1.0, 1.38, 1.38, 28), 0x4A3524)
for i in range(6):   # brick courses read as bands
    pass
# steps: front (+z), left (-x), right (+x): three brick steps each, 2.4 m wide
for (dx, dz, ang) in ((0, 1, 0), (-1, 0, math.pi / 2), (1, 0, -math.pi / 2)):
    for k in range(3):
        d = R + 0.1 + (2 - k) * 0.38
        h = 0.3 * (k + 1)
        cx, cz = dx * (d + 0.19), dz * (d + 0.19)
        w, t = (2.4, 0.38) if dz else (0.38, 2.4)
        add('brick', wb('step', cx - w / 2, cx + w / 2, cz - t / 2, cz + t / 2, 0, h - 0.0, 0.01))
        add('trim', wb('step_nose', cx - w / 2 - 0.02, cx + w / 2 + 0.02, cz - t / 2 - 0.02, cz + t / 2 + 0.02, h - 0.04, h, 0.004), CEMENT)
# seating round the platform
charpai(-6.6, 3.6, 0.35)
charpai(6.2, 4.6, -0.3)
charpai(0.5, 6.9, 0.05)
# takht (low wooden platform) at the right-back
tx, tz = 5.2, -3.8
add('wood', wb('takht_top', tx - 1.1, tx + 1.1, tz - 0.55, tz + 0.55, 0.38, 0.46, 0.006))
for dx in (-0.95, 0.95):
    for dz in (-0.4, 0.4):
        add('wood', wb('takht_leg', tx + dx - 0.05, tx + dx + 0.05, tz + dz - 0.05, tz + dz + 0.05, 0, 0.38, 0.0))
plastic_chair(kit, -0.9, -5.5, 3.6, 0xC62828)
plastic_chair(kit, 0.9, -5.7, 3.0, 0x2E8B3A)
# notice board on two wooden posts (left), blank paper sheets
bx, bz = -8.0, 0.8
for dz in (-1.1, 1.1):
    add('wood', limb('nb_post', (bx, bz + dz, 0), (bx, bz + dz, 2.4), 0.13))
add('wood', wb('nb_frame', bx - 0.07, bx + 0.07, bz - 1.05, bz + 1.05, 1.0, 2.2, 0.01))
add('paint', wb('nb_cork', bx + 0.06, bx + 0.09, bz - 0.95, bz + 0.95, 1.1, 2.1, 0.0), 0x8F6B45)
for k in range(11):
    sz = bz - 0.85 + rnd.uniform(0, 1.5)
    sh = 1.2 + rnd.uniform(0, 0.75)
    add('paint', wb('nb_sheet', bx + 0.09, bx + 0.1, sz, sz + rnd.uniform(0.22, 0.4), sh, sh + rnd.uniform(0.25, 0.4), 0.0), rnd.choice((0xF2EFE6, 0xE9E4D4, 0xF6F3EC)))
# two picture-only event posters (circus, cricket match) pinned over the sheets: 512x256 atlas, 2 cells, torn, faded, creased
def _h(ix, iy, sd):
    n = (ix * 374761393 + iy * 668265263 + sd * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def _vn(x, y, sd):
    ix, iy = int(math.floor(x)), int(math.floor(y))
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _h(ix, iy, sd), _h(ix + 1, iy, sd)
    c, d = _h(ix, iy + 1, sd), _h(ix + 1, iy + 1, sd)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy


def _rgb(h):
    return ((h >> 16) & 255) / 255.0, ((h >> 8) & 255) / 255.0, (h & 255) / 255.0


def event_px(u, v):
    i = min(1, int(u * 2))
    x, y = u * 2 - i, v
    e = 0.04 + 0.04 * _vn(x * 14 + i * 9, y * 14, 3)
    if x < e or x > 1 - e or y < e * 0.6 or y > 1 - e * 0.6:
        return None
    if x > 0.78 and y > 0.84 and _vn(x * 9, y * 9, 8) > 0.45:
        return None
    cx, cy = x - 0.5, y - 0.5
    if i == 0:   # circus: striped big top on a dusk-yellow ground, a pennant, a ring of lights
        r, g, b = _rgb(0xE8C45A)
        ink = None
        if y > 0.62:
            ink = 0x7A5A3A
        elif y > 0.3 and abs(cx) < 0.36 * (y - 0.12) / 0.5 + 0.05:
            ink = 0xB8342C if int((x + 1) * 7) % 2 else 0xF1E6C8
        elif y > 0.12 and abs(cx) < 0.36 * (y - 0.12) / 0.5 + 0.05:
            ink = 0xB8342C if int((x + 1) * 7) % 2 else 0xF1E6C8
        if 0.04 < y < 0.14 and abs(cx - 0.02) < 0.1 * (0.14 - y) / 0.1 + 0.01:
            ink = 0x2E6A8A
        if (cx ** 2 + (y - 0.82) ** 2) < 0.012 and cx ** 2 + (y - 0.82) ** 2 > 0.005:
            ink = 0x3A2E80
    else:        # cricket match: green pitch, three stumps, bat and ball under a blue sky
        r, g, b = _rgb(0x9DC3DC)
        ink = None
        if y > 0.55:
            ink = 0x6E9A4E
        if 0.2 < y < 0.8 and any(abs(cx - d) < 0.018 for d in (-0.07, 0.0, 0.07)) and y < 0.8 and y > 0.45:
            ink = 0xE6D6A8
        if abs(cx - 0.24 + (y - 0.6) * 0.5) < 0.04 and 0.4 < y < 0.88:
            ink = 0xC8A66A
        if (cx + 0.2) ** 2 + (y - 0.3) ** 2 < 0.008:
            ink = 0xB02A22
    if ink is not None:
        ir, ig, ib = _rgb(ink)
        r, g, b = r * 0.2 + ir * 0.8, g * 0.2 + ig * 0.8, b * 0.2 + ib * 0.8
    fade = 0.28 + 0.3 * (1 - y)
    lum = 0.6 * r + 0.3 * g + 0.1 * b
    r, g, b = r + (lum * 0.9 + 0.22 - r) * fade, g + (lum * 0.9 + 0.2 - g) * fade, b + (lum * 0.9 + 0.15 - b) * fade
    k = (0.9 + 0.2 * _vn(x * 90 + i * 5, y * 90, 5)) * (1 - (0.18 if abs(x - 0.5) < 0.01 or abs(y - 0.5) < 0.01 else 0.0))
    k *= 1 - max(0.0, _vn(x * 4 + i * 3, y * 4, 11) - 0.55) * 0.45
    pw = lambda c: max(0.0, min(1.0, c * k)) ** 2.2
    return (pw(r), pw(g), pw(b), 0.92)


emat = decal_material('hb_decal', (512, 256), event_px)
for i, (dz, w, hgt, h0) in enumerate(((-0.45, 0.78, 0.98, 1.12), (0.42, 0.66, 0.88, 1.2))):
    xx = bx + 0.112
    o = quad('event_poster', [(xx, bz + dz - w / 2, h0), (xx, bz + dz + w / 2, h0), (xx, bz + dz + w / 2, h0 + hgt), (xx, bz + dz - w / 2, h0 + hgt)])
    uvl = o.data.uv_layers.new(name='UVMap')
    for loop, uv in zip(o.data.loops, [(i / 2, 0), ((i + 1) / 2, 0), ((i + 1) / 2, 1), (i / 2, 1)]):
        uvl.data[loop.index].uv = uv
    o.data.materials.append(emat)
    kit.extra.append(o)
# hand pump + matka on a cement slab (front-right)
px, pz = 6.8, 7.0
add('trim', wb('pump_slab', px - 1.0, px + 1.0, pz - 0.9, pz + 0.9, 0, 0.12, 0.01), CEMENT)
add('trim', wb('pump_tub', px - 0.2, px + 0.9, pz + 0.1, pz + 0.7, 0.12, 0.34, 0.01), 0xA09D95)
add('metal', cyl('pump_base', px - 0.5, pz - 0.2, 0.12, 0.5, 0.15, 0.12, 10), 0x2E5E3A)
add('metal', cyl('pump_col', px - 0.5, pz - 0.2, 0.5, 1.25, 0.08, 0.065, 10), 0x2E5E3A)
add('metal', limb('pump_handle', (px - 0.5, pz - 0.2, 1.18), (px - 1.0, pz - 0.2, 1.5), 0.05), 0x2E5E3A)
add('metal', limb('pump_spout', (px - 0.5, pz - 0.2, 0.9), (px - 0.1, pz - 0.2, 0.72), 0.06), 0x2E5E3A)
clay_pot(kit, px - 0.7, pz + 0.55, 0.9)
add('metal', cyl('mug', px + 0.55, pz - 0.5, 0.12, 0.26, 0.05, 0.06, 8), STEEL)
# concrete electric pole at the right with a crossarm and one street lamp
lx, lz = 8.2, 1.0
add('trim', limb('pole', (lx, lz, 0), (lx, lz, 9.0), 0.26, 0.2), 0xA9A69F)
add('metal', limb('crossarm', (lx - 0.7, lz, 8.6), (lx + 0.7, lz, 8.6), 0.08, 0.1), 0x4A4C50)
for dx in (-0.6, 0, 0.6):
    add('paint', cyl('insulator', lx + dx, lz, 8.62, 8.78, 0.05, 0.04, 8), 0xC9C4B4)
add('metal', limb('lamp_arm', (lx, lz, 7.6), (lx - 1.3, lz, 7.9), 0.06), 0x4A4C50)
add('paint', cyl('lamp_head', lx - 1.4, lz, 7.78, 7.95, 0.2, 0.12, 10), 0xCFCFC8)
add('metal', limb('meter_box', (lx + 0.14, lz, 1.7), (lx + 0.14, lz, 2.3), 0.12, 0.3), 0x7A7D80)
# a twig broom leaning on the platform
add('wood', limb('broom_handle', (-4.6, 3.4, 0.0), (-4.2, 3.0, 1.0), 0.03))
add('paint', limb('broom_head', (-4.7, 3.5, 0.0), (-4.55, 3.35, 0.4), 0.22, 0.06), 0x9A8A58)

TINTS = {'hb_plaster': '#FFF2D0', 'hb_plinth': '#E8DFC0', 'hb_trim': '#C9C6BE', 'hb_apron': '#A8845A', 'hb_wood': '#8A6A48', 'hb_brick': '#A06A58', 'hb_metal': '#FFFFFF'}
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})
