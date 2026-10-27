"""
Gobar cakes (J0, 27 Oct playthrough note): two models, merged by src/gobar.js.
  gobar_wall_v2  : a 1.3 x 1.0 m patch of hand-patted discs stuck on a wall (flat back at y=0, discs bulge to +y), each with finger dimples and a rim lip, slightly overlapping.
  gobar_stack_v2 : a conical bitauda, 1.5 m high: ring on ring of flat cakes narrowing upward, capped with a straw thatch.
Run: tools/blender/make_gobar.sh   (writes public/assets/models/gobar_<type>_v2.glb; _v2: textures stripped, the game re-applies the shared set)
Dung is the matte plaster set (roughness ~1) tinted by vertex colour, the cap is the shared thatch set. Colour and wear are vertex colour.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, Matrix
from common import ROOT, new_bmesh_obj
from arch import Kit, lathe


def cake(name, r, thick, seed, dimples=3):
    """One hand-patted disc lying on z=0: domed top, lipped rim, a few finger dimples pressed in, wobbly outline."""
    rnd = random.Random(seed)
    prof = [(0.0, thick * 0.7), (r * 0.55, thick * 0.95), (r * 0.95, thick * 0.8), (r, thick * 0.3), (0.0, 0.0)]
    o = lathe(name, 0, 0, prof, seg=6)
    p1, p2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    ds = [(rnd.uniform(0, 6.28), rnd.uniform(0.3, 0.65) * r) for _ in range(dimples)]
    for v in o.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        rr = math.hypot(v.co.x, v.co.y)
        k = 1 + 0.07 * math.sin(3 * a + p1) + 0.05 * math.sin(5 * a + p2)
        v.co.x *= k
        v.co.y *= k
        if v.co.z > thick * 0.5:
            for da, dr in ds:
                d = math.hypot(v.co.x - dr * math.cos(da), v.co.y - dr * math.sin(da))
                if d < r * 0.16:
                    v.co.z -= thick * 0.35 * (1 - d / (r * 0.16))
    return o


def place(o, x, y, z, rx=0.0, rz=0.0):
    o.matrix_world = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X')
    bpy.context.view_layer.update()
    return o


def wall(kit):
    rnd = random.Random(4)
    # blender local: +z up. Build with discs lying flat in xy then stand them (rx = -90deg) so their dome faces -y; mirror by building with rx=+90 -> dome faces +y.
    n = 0
    for row in range(2):
        for col in range(4):
            if rnd.random() < 0.12:
                continue
            r = rnd.uniform(0.095, 0.125)
            x = -0.6 + col * 0.27 + (0.11 if row % 2 else 0) + rnd.uniform(-0.02, 0.02)
            z = 0.1 + row * 0.25 + rnd.uniform(-0.02, 0.02)
            o = cake('w%d' % n, r, rnd.uniform(0.028, 0.04), n)
            place(o, x, 0.0, z, rx=math.pi / 2, rz=rnd.uniform(0, 6.28))
            # lay-down: after rx=+90deg the dome (+z local) points to -y; flip by using rotation about X of -90deg
            kit.add('plaster', o, [0x5a4430, 0x6a5238, 0x4f3c2a, 0x76603f][n % 4])
            n += 1


def stack(kit):
    rnd = random.Random(9)
    n = 0
    layers = [(0.6, 5), (0.38, 4)]
    for li, (R, cnt) in enumerate(layers):
        z = 0.08 + li * 0.2
        for k in range(cnt):
            a = k / cnt * math.tau + li * 0.5 + rnd.uniform(-0.1, 0.1)
            r = rnd.uniform(0.15, 0.19)
            o = cake('s%d' % n, r, rnd.uniform(0.035, 0.05), 50 + n)
            place(o, R * math.cos(a), R * math.sin(a), z + rnd.uniform(-0.01, 0.01), rx=rnd.uniform(-0.12, 0.12), rz=rnd.uniform(0, 6.28))
            kit.add('plaster', o, [0x5a4430, 0x6a5238, 0x4f3c2a, 0x76603f][n % 4])
            n += 1
    # filler core so no gaps show
    core = lathe('core', 0, 0, [(0.0, 0.0), (0.55, 0.0), (0.5, 0.35), (0.38, 0.6), (0.22, 0.8), (0.0, 0.85)], seg=10)
    kit.add('plaster', core, 0x4a3828)
    # straw thatch cap
    cap = lathe('cap', 0, 0, [(0.0, 1.32), (0.18, 1.22), (0.4, 0.98), (0.5, 0.78), (0.44, 0.72), (0.2, 0.9), (0.0, 0.95)], seg=10)
    kit.add('thatch', cap, 0xcdb97c)
    # drooping straw wisps at the cap rim
    bm = bmesh.new()
    for i in range(3):
        a = rnd.uniform(0, 6.28)
        p = Vector((0.5 * math.cos(a), 0.5 * math.sin(a), 0.76))
        out = Vector((math.cos(a), math.sin(a), 0))
        d = (out * 0.5 + Vector((0, 0, -0.85))).normalized()
        L = rnd.uniform(0.15, 0.3)
        m = Matrix.Translation(p + d * L / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=3, radius1=0.006, radius2=0.02, depth=L, matrix=m)
    kit.add('thatch', new_bmesh_obj('wisps', bm), 0xdccb92)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'wall'
kit = Kit(split_props=False, own=('thatch',))
(wall if which == 'wall' else stack)(kit)
kit.finalize(os.path.join(ROOT, 'tmp', 'gobar_%s_v2_raw.glb' % which), {}, drift_amp=0.1, ao_strength=0.6)
