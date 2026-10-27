"""
Haystacks (J0, 27 Oct playthrough note): three variants, each ONE model drawn merged by src/haystacks.js.
  haystack_cone_v2 : tall conical stack (4.6 m), creased by forkfuls, rope bands, shaggy hanging straw tufts.
  haystack_heap_v2 : low wide heap (2.6 m), lumpy, tufts all over.
  haystack_half_v2 : a beehive stack half used: a vertical cut face (flat, strand pattern) on the +x side, slumped loose straw at its foot.
Shaggy silhouette comes from real geometry tufts (thin 3-sided cones drooping outward), not alpha cards, so no extra transparent draw call.
Run: tools/blender/make_haystacks.sh   (writes public/assets/models/haystack_<type>_v2.glb; slot ends in _v2: textures stripped, the game re-applies the shared thatch set)
Local frame: origin at the stack centre on the ground, upright, real sizes at scale 1 (base radius ~1.9 m). Colour and wear are vertex colour.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, Matrix
from common import ROOT, new_bmesh_obj
from arch import Kit, lathe

PROFILES = {
    'cone': [(1.7, 0), (1.85, 0.6), (1.75, 1.6), (1.45, 2.6), (0.95, 3.5), (0.4, 4.2), (0.12, 4.6), (0.0, 4.7)],
    'heap': [(2.2, 0), (2.3, 0.4), (2.15, 1.0), (1.7, 1.7), (1.0, 2.2), (0.45, 2.45), (0.0, 2.55)],
    'half': [(1.9, 0), (2.0, 0.5), (1.95, 1.3), (1.7, 2.1), (1.2, 2.8), (0.55, 3.2), (0.0, 3.35)],
}


def shape(obj, seed, cut=None):
    """Forkful creases + low lumpiness + a slight lean; cut = x of a vertical cut plane (everything beyond it is flattened onto it)."""
    rnd = random.Random(seed)
    a, b, c = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28), rnd.uniform(0.04, 0.07)
    for v in obj.data.vertices:
        x, y, z = v.co
        ang = math.atan2(y, x)
        f = 1 + c * math.sin(x * 3.1 + z * 2.3 + a) * math.cos(y * 2.7 + z * 1.9 + b) + 0.035 * math.sin(ang * 7 + a) + 0.02 * math.sin(ang * 13 + z * 4 + b)
        v.co.x = x * f + z * 0.04 * math.sin(seed)
        v.co.y = y * f
        if cut is not None and v.co.x > cut:
            v.co.x = cut
    obj.data.update()


def tufts(name, obj, seed, count, length, cut=None, min_z=0.15):
    """Thin drooping straw tufts pinned on the surface of `obj`: 3-sided cones leaning outward and down."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    verts = [v.co.copy() for v in obj.data.vertices if v.co.z > min_z and v.co.z < max(w.co.z for w in obj.data.vertices) - 0.1]
    for _ in range(count):
        p = rnd.choice(verts)
        out = Vector((p.x, p.y, 0)).normalized() if (p.x or p.y) else Vector((1, 0, 0))
        if cut is not None and abs(p.x - cut) < 0.02:
            out = Vector((1, 0, 0))
        d = (out * rnd.uniform(0.55, 0.9) + Vector((0, 0, -rnd.uniform(0.5, 1.0)))).normalized()
        d = (d + Vector((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), 0))).normalized()
        L = length * rnd.uniform(0.6, 1.4)
        m = Matrix.Translation(p - out * 0.04 + d * (L / 2)) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=3, radius1=0.008, radius2=0.025 * rnd.uniform(0.7, 1.3), depth=L, matrix=m)
    return new_bmesh_obj(name, bm)


def build(kind):
    kit = Kit(split_props=False, own=('thatch',))
    prof = PROFILES[kind]
    seed = {'cone': 3, 'heap': 5, 'half': 8}[kind]
    cut = 0.55 if kind == 'half' else None
    body = lathe('stack', 0, 0, prof, seg=22)
    shape(body, seed, cut)
    kit.add('thatch', body, 0xe0cb8c)
    n = {'cone': 200, 'heap': 170, 'half': 180}[kind]
    L = {'cone': 0.45, 'heap': 0.4, 'half': 0.42}[kind]
    kit.add('thatch', tufts('tufts', body, seed + 20, n, L, cut), 0xe9d9a2)
    # rope bands (dark, rough) at 1.0 m and 2.2 m on the standing stacks
    if kind != 'half':
        for i, h in enumerate((1.0, 2.0) if kind == 'cone' else (0.9,)):
            r = max(q[0] for q in prof if q[1] <= h + 0.3) if False else next((prof[j - 1][0] + (prof[j][0] - prof[j - 1][0]) * ((h - prof[j - 1][1]) / (prof[j][1] - prof[j - 1][1])) for j in range(1, len(prof)) if prof[j][1] >= h), 1.0)
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=False, segments=20, radius1=r * 1.03, radius2=r * 1.03, depth=0.07, matrix=Matrix.Translation((0, 0, h)))
            kit.add('thatch', new_bmesh_obj('rope%d' % i, bm), 0x7a6a44)
    if kind == 'half':
        # slumped loose straw at the foot of the cut face: a low lumpy mound of tufts and a flattened heap
        mound = lathe('mound', 1.0, 0, [(1.1, 0), (1.15, 0.12), (0.9, 0.4), (0.4, 0.62), (0.0, 0.7)], seg=18)
        shape(mound, 11)
        kit.add('thatch', mound, 0xcdb97c)
        kit.add('thatch', tufts('mound_tufts', mound, 31, 25, 0.35, None, 0.05), 0xdccb92)
    kit.finalize(os.path.join(ROOT, 'tmp', 'haystack_%s_v2_raw.glb' % kind), {}, drift_amp=0.1, ao_strength=0.55)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'cone'
build(which)
