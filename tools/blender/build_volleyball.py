"""
Volleyball court - arch.py Kit, to Places V1/volleyball/LAYOUT.md (net ON the centre line; 18 x 9 m court on the 24 x 15 m patch).
Run:  tools/blender/make.sh volleyball volleyball_v2
Frame: x along the court (long axis), z across; patch x[-12,12] z[-7.5,7.5]; front (bench side) = +z.
Hand-drawn uneven white lime lines: boundary 18 x 9, centre line x=0, attack lines x=+-3. Net exactly on the centre line (two equal 9 x 9 halves):
bamboo poles 2.6 m, 0.75 m outside the side lines, two guy ropes each to pegs, net top 2.4 m, slightly saggy (alpha-textured mesh + top tape).
Long side (+z): wooden bench, row of bricks as seats, bucket of lime with a tin scoop, a ball, clay pot + mug.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, quad, join_objects, ROOT
from arch import Kit, decal_material, lathe, clay_pot, STEEL

OUT = os.path.join(ROOT, 'tmp', 'volleyball_v2_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(5)


def add(k, o, c=None):
    kit.add(k, o, c)
    return o


def net_px(u, v):
    # 1.0 m tall x 9.5 m wide: 0.1 m diamond-ish mesh strands, knotted
    x, y = u * 95.0, v * 10.0
    fx, fy = x - math.floor(x), y - math.floor(y)
    if fx < 0.12 or fy < 0.14:
        return (0.07, 0.06, 0.05, 0.95)
    return None


nmat = decal_material('hb_net', (512, 64), net_px)

add('paint', wb('patch', -12, 12, -7.5, 7.5, -0.08, 0.04, 0.0), 0xA98B62)
add('paint', wb('patch_worn1', -7, 7, -3.5, 3.5, 0.04, 0.046, 0.0), 0xA3865E)
for (x, z, r) in ((-5, 1, 2.2), (4, -2, 1.8), (6, 3, 1.4)):
    add('paint', cyl('scuff', x, z, 0.04, 0.05, r, r, 12), 0xAF946B)


def lime(x0, z0, x1, z1):
    """An uneven hand-laid lime line: segments with jitter in width and a small wander."""
    L = math.hypot(x1 - x0, z1 - z0)
    n = max(2, int(L / 0.5))
    px, pz = x0, z0
    for i in range(1, n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t + (rnd.uniform(-0.03, 0.03) if i < n else 0)
        z = z0 + (z1 - z0) * t + (rnd.uniform(-0.03, 0.03) if i < n else 0)
        add('paint', limb('lime', (px, pz, 0.045), (x, z, 0.045), rnd.uniform(0.09, 0.14), 0.012), 0xF0EEE6 if rnd.random() > 0.15 else 0xCFCCBF)
        px, pz = x, z


for (a, b) in (((-9, -4.5), (9, -4.5)), ((-9, 4.5), (9, 4.5)), ((-9, -4.5), (-9, 4.5)), ((9, -4.5), (9, 4.5)), ((0, -4.5), (0, 4.5)), ((-3, -4.5), (-3, 4.5)), ((3, -4.5), (3, 4.5))):
    lime(a[0], a[1], b[0], b[1])
# poles (bamboo, slightly bowed), guy ropes + pegs
PZ = 5.25
for sg in (-1, 1):
    z = sg * PZ
    add('wood', limb('pole', (0, z, 0), (0.04, z, 2.62), 0.075, 0.06))
    for k in range(4):
        add('wood', limb('node', (0.01 * k, z, 0.55 * k + 0.2), (0.01 * k, z, 0.55 * k + 0.24), 0.09))
    for dx in (-1.0, 1.0):
        peg = (dx * 2.0, z + sg * 1.6)
        add('paint', limb('guy', (0.04, z, 2.45), (peg[0], peg[1], 0.05), 0.012, 0.012), 0xB89A64)
        add('wood', limb('peg', (peg[0], peg[1], 0.0), (peg[0], peg[1], 0.22), 0.04))
# net: two quads (both faces) from pole to pole with a sag, top tape, bottom cord
n = 12
for k in range(n):
    za, zb = -PZ + 0.05 + (2 * PZ - 0.1) * k / n, -PZ + 0.05 + (2 * PZ - 0.1) * (k + 1) / n
    sag = lambda z: -0.07 * (1 - (z / PZ) ** 2)
    for flip in (False, True):
        pts = [(0.0, za, 1.4 + sag(za)), (0.0, zb, 1.4 + sag(zb)), (0.0, zb, 2.4 + sag(zb)), (0.0, za, 2.4 + sag(za))]
        o = quad('net', pts if not flip else list(reversed(pts)))
        uvl = o.data.uv_layers.new(name='UVMap')
        me = o.data
        for loop in me.loops:
            co = me.vertices[loop.vertex_index].co
            uvl.data[loop.index].uv = ((-co.y + PZ) / (2 * PZ), co.z - 1.4 + 0.07)
        me.materials.append(nmat)
        kit.extra.append(o)
    add('paint', limb('tape', (0, za, 2.4 + sag(za)), (0, zb, 2.4 + sag(zb)), 0.06, 0.05), 0xEFEDE6)
    add('paint', limb('cord', (0, za, 1.4 + sag(za)), (0, zb, 1.4 + sag(zb)), 0.02, 0.02), 0x2A2A2A)
# the long side (+z): bench, bricks as seats, lime bucket + tin scoop, ball, clay pot + mug
bz = 6.1
add('wood', wb('bench_top', 2.0, 4.6, bz - 0.22, bz + 0.22, 0.44, 0.5, 0.008))
for x in (2.2, 4.4):
    add('wood', wb('bench_leg', x - 0.05, x + 0.05, bz - 0.18, bz + 0.18, 0, 0.44, 0.0))
add('wood', wb('bench_back', 2.0, 4.6, bz + 0.2, bz + 0.25, 0.5, 0.85, 0.006))
for k in range(8):
    x = -5.5 + k * 0.5
    add('brick', wb('seat_brick', x, x + 0.23, bz - 0.05, bz + 0.11, 0.0, 0.11, 0.006))
    if k % 2 == 0:
        add('brick', wb('seat_brick2', x, x + 0.23, bz - 0.05, bz + 0.11, 0.11, 0.22, 0.006))
add('metal', cyl('bucket', -1.0, bz, 0, 0.34, 0.2, 0.26, 14), 0x9FA3A7)
add('paint', cyl('lime_fill', -1.0, bz, 0.3, 0.33, 0.23, 0.23, 14), 0xEEEDE6)
add('metal', limb('bucket_handle', (-1.24, bz, 0.34), (-0.76, bz, 0.34), 0.012), 0x3A3C3E)
add('metal', cyl('scoop', -0.55, bz + 0.1, 0.0, 0.09, 0.06, 0.08, 8), 0xB9BDC2)
add('paint', sphere('ball', 6.4, 3.2, 0.11, 0.105, 0.105, 0.105, 2), 0xE8E6DA)
add('paint', limb('ball_panel', (6.3, 3.2, 0.11), (6.5, 3.2, 0.11), 0.2, 0.03), 0x2E5E8B)
clay_pot(kit, 7.0, bz, 0.8)
add('metal', cyl('mug', 7.6, bz, 0.0, 0.12, 0.05, 0.06, 8), STEEL)

TINTS = {'hb_plaster': '#FFF2D0', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_brick': '#AE6C54', 'hb_metal': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})
