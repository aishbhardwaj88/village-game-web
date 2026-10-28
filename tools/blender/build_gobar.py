"""
Gobar / upla (J0, 27 Oct playthrough note; PARALLEL.md Wave 2 item 12). Four models, merged by src/gobar.js (which loads the
two _v2 names; the _b variants are extra, not wired yet):
  gobar_wall_v2    : a ~1.5 x 1.0 m patch of 15 hand-slapped cakes in three staggered rows, 0.55-1.55 m above the ground.
  gobar_wall_v2_b  : a thinner patch: two rows, a couple of fresh dark cakes, and pale ghost smears where dried ones were taken.
  gobar_stack_v2   : conical bitauda 1.55 m high, ~1.3 m across: ring on ring of cakes shingled up a dung core, a straw
                     thatch cap tied at the top-knot with ragged locks hanging off its rim, a small pile of loose cakes at its foot.
  gobar_stack_v2_b : squat beehive 1.3 m: lower half plastered over with a hand-swiped dung skin, two rings of cakes above,
                     an older grey cap, two cakes leaning at the foot.
Every wall cake carries a MODELLED hand print: four finger grooves (grid columns spaced at half the finger pitch, so each
groove and ridge lands on a vertex) and a palm hollow, plus a pushed-out lip, a wobbly outline, and straw fibres: some as
pale vertex flecks, some as real thin strips lying on the surface and whiskers poking out of the rim.
Colour: per-vertex 'Base' (age from fresh olive-brown to sun-faded grey-tan, darker grooves, paler drying rims, radial
cracks), written here and kept by a local wrapper around arch.colorize (arch.py itself is untouched).
Materials: dung is the shared matte plaster set (roughness ~1), the cap is the shared thatch set. 2 draw calls per model.
Local frame (glTF): wall patches have their back on the plane z=0 and bulge toward +z, bottom-centre at x=0, origin on the
ground; stacks stand on the ground centred on the origin.
Run: tools/blender/make_gobar.sh       Preview: Blender -b --python tools/blender/build_gobar.py -- render  (docs/shots/assets-gobar/)
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, Matrix
from common import ROOT, new_bmesh_obj, load_pbr_material, box_uv
import arch
from arch import Kit, lathe

# Keep the per-vertex colour this script writes: arch.finalize flat-colours every plain object, so objects flagged
# 'gobar_base' skip that one call. Local to this process; arch.py is not modified.
_arch_colorize = arch.colorize


def _colorize_keep(obj, hex_color, attr='Col'):
    if obj.get('gobar_base') and attr in obj.data.color_attributes:
        return obj
    return _arch_colorize(obj, hex_color, attr)


arch.colorize = _colorize_keep

# dung tones, sRGB 0..1. Nothing near black, nothing saturated.
FRESH = (0.33, 0.28, 0.20)
DRY = (0.52, 0.46, 0.37)
FADED = (0.62, 0.57, 0.49)
STRAW = [(0.74, 0.65, 0.46), (0.69, 0.60, 0.42), (0.62, 0.57, 0.47), (0.79, 0.71, 0.52)]


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def clamp_col(c):
    return tuple(min(0.88, max(0.06, x)) for x in c)


def hsh(x, y, s):
    v = math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
    return v - math.floor(v)


def bake(o, M):
    o.data.transform(M)
    o.matrix_world.identity()
    return o


def write_base(o, cols):
    """cols: per-loop sRGB tuples -> linear 'Base' layer, flagged so finalize keeps it."""
    me = o.data
    lay = me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    flat = []
    for c in cols:
        l = lin(clamp_col(c))
        flat += [l[0], l[1], l[2], 1.0]
    lay.data.foreach_set('color', flat)
    o['gobar_base'] = 1


class Cake:
    """One hand-patted disc lying on z=0, dome up (+z), hand pointing +y. Analytic height so fibres can sit on it."""
    def __init__(self, rnd, r, thick, hand=True, age=0.7):
        self.r, self.t, self.hand, self.age = r, thick, hand, age
        self.ph = [rnd.uniform(0, 6.28) for _ in range(5)]
        self.pitch = rnd.uniform(0.019, 0.022)
        self.cx = rnd.uniform(-0.1, 0.1) * r
        self.flen = [rnd.uniform(0.62, 0.7), rnd.uniform(0.74, 0.84), rnd.uniform(0.78, 0.88), rnd.uniform(0.66, 0.76)]
        self.depth = rnd.uniform(0.32, 0.45)
        self.cracks = [rnd.uniform(0, 6.28) for _ in range(rnd.randint(1, 3) if age > 0.5 else 0)]
        self.seed = rnd.random() * 10

    def R(self, a):
        p = self.ph
        return self.r * (1 + 0.06 * math.sin(3 * a + p[0]) + 0.04 * math.sin(5 * a + p[1]) + 0.02 * math.sin(9 * a + p[2]))

    def fields(self, x, y):
        a = math.atan2(y, x)
        rho = math.hypot(x, y) / self.R(a)
        r, t = self.r, self.t
        lip = math.exp(-((rho - 0.8) / 0.1) ** 2)
        g = 0.0
        if self.hand:
            palm = math.exp(-((x - self.cx) ** 2 + (y + 0.3 * r) ** 2) / (0.32 * r) ** 2)
            fing = 0.0
            for k in range(4):
                fx = self.cx + (2 * k - 3) * self.pitch / 2
                y0, y1 = -0.08 * r, -0.08 * r + self.flen[k] * r
                along = 1.0 if y0 <= y <= y1 else math.exp(-((y - (y0 if y < y0 else y1)) / (0.05 * r)) ** 2)
                fing = max(fing, along * math.exp(-((x - fx) / (self.pitch * 0.36)) ** 2))
            g = max(0.55 * palm, fing)
        crack = 0.0
        for ca in self.cracks:
            da = math.atan2(math.sin(a - ca), math.cos(a - ca))
            if rho > 0.35:
                crack = max(crack, math.exp(-(da * rho * r / 0.004) ** 2) * min(1.0, (rho - 0.35) * 4))
        return rho, lip, g, crack

    def h(self, x, y):
        rho, lip, g, crack = self.fields(x, y)
        if rho >= 1.0:
            return 0.0
        t = self.t
        n = 0.03 * math.sin(x * 61 + self.ph[3]) * math.sin(y * 53 + self.ph[4])
        return max(0.003, t * ((1 - rho ** 5) ** 0.5 + 0.22 * lip + n) - t * self.depth * g - 0.004 * crack)

    def colour(self, x, y, base):
        rho, lip, g, crack = self.fields(x, y)
        c = base
        c = mix(c, FADED, 0.35 * self.age * max(0.0, rho - 0.7) / 0.3)   # rims dry first
        c = tuple(v * (1 - 0.3 * g) * (1 + 0.1 * lip) * (1 - 0.35 * crack) for v in c)
        f = hsh(x, y, self.seed)
        if f > 0.86:
            c = mix(c, STRAW[int(f * 97) % 4], 0.45)   # straw flecks
        elif f < 0.07:
            c = tuple(v * 0.8 for v in c)
        return c


def cake_obj(name, rnd, r, thick, hand=True, age=0.7, nfib=5, whiskers=1, ny=9):
    """Grid sheet clipped to the wobbly outline (columns at half the finger pitch), boundary snapped onto the outline at z=0.
    Open back: it always sits against a wall, a core or another cake. Fibre strips ride in the same mesh."""
    ck = Cake(rnd, r, thick, hand, age)
    E = r * 1.14
    s = ck.pitch / 2 if hand else r / 5.2
    n0 = int(math.ceil((E + abs(ck.cx)) / s))
    xs = [ck.cx + i * s for i in range(-n0, n0 + 1) if abs(ck.cx + i * s) <= E + s]
    ys = [-E + j * 2 * E / ny for j in range(ny + 1)]
    bm = bmesh.new()
    V = {}

    def vert(i, j):
        if (i, j) not in V:
            V[(i, j)] = bm.verts.new((xs[i], ys[j], 0.0))
        return V[(i, j)]
    for i in range(len(xs) - 1):
        for j in range(ny):
            mx, my = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if math.hypot(mx, my) < ck.R(math.atan2(my, mx)) * 0.97:
                bm.faces.new((vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)))
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        x, y = v.co.x, v.co.y
        if v.is_boundary:
            a = math.atan2(y, x)
            R = ck.R(a)
            v.co.x, v.co.y, v.co.z = R * math.cos(a), R * math.sin(a), 0.0
        else:
            v.co.z = ck.h(x, y)
    base = mix(FRESH, DRY, age)
    base = tuple(c * rnd.uniform(0.93, 1.06) for c in base)
    base = mix(base, (base[0] * 1.02, base[1] * 1.0, base[2] * 0.94), rnd.random())   # warmer or greyer, never pink
    cols_by_face = []
    for f in bm.faces:
        cols_by_face.append([ck.colour(lp.vert.co.x, lp.vert.co.y, base) if not lp.vert.is_boundary else tuple(v * 0.9 for v in base) for lp in f.loops])
    # straw fibres: thin strips lying on the surface, and whiskers poking out of the rim
    for k in range(nfib + whiskers):
        whisk = k >= nfib
        if whisk:
            a = rnd.uniform(0, 6.28)
            R = ck.R(a)
            p0 = Vector((math.cos(a), math.sin(a), 0)) * (R * 0.88)
            d = Vector((math.cos(a + rnd.uniform(-0.5, 0.5)), math.sin(a + rnd.uniform(-0.5, 0.5)), 0))
            L = rnd.uniform(0.015, 0.03)
        else:
            a, rr = rnd.uniform(0, 6.28), r * math.sqrt(rnd.uniform(0.02, 0.6))
            p0 = Vector((rr * math.cos(a), rr * math.sin(a), 0))
            b = rnd.uniform(0, 6.28)
            d = Vector((math.cos(b), math.sin(b), 0))
            L = rnd.uniform(0.015, 0.035)
        p1 = p0 + d * L
        w = Vector((-d.y, d.x, 0)) * rnd.uniform(0.0018, 0.0026)
        z0 = ck.h(p0.x, p0.y) + 0.0015
        z1 = (ck.h(p1.x, p1.y) + 0.0015) if not whisk else max(0.004, z0 * 0.4)
        q = [p0 - w, p1 - w, p1 + w, p0 + w]
        zz = [z0, z1, z1, z0]
        vs = [bm.verts.new((q[i].x, q[i].y, zz[i])) for i in range(4)]
        bm.faces.new(vs)
        sc = mix(STRAW[rnd.randrange(4)], base, rnd.uniform(0.3, 0.55))
        cols_by_face.append([sc, mix(sc, (0.85, 0.79, 0.62), 0.2), sc, mix(sc, base, 0.3)])
    o = new_bmesh_obj(name, bm)
    for p in o.data.polygons:
        p.use_smooth = True
    cols = []
    for p, cl in zip(o.data.polygons, cols_by_face):
        cols += cl[:p.loop_total]
    write_base(o, cols)
    return o


def frame_to(n, up=Vector((0, 0, 1)), spin=0.0):
    """Rotation taking local +z to n, local +y toward `up` projected, then spun about n."""
    n = n.normalized()
    y = (up - n * up.dot(n))
    if y.length < 1e-4:
        y = Vector((0, 1, 0))
    y.normalize()
    x = y.cross(n)
    R = Matrix(((x.x, y.x, n.x, 0), (x.y, y.y, n.y, 0), (x.z, y.z, n.z, 0), (0, 0, 0, 1)))
    return R @ Matrix.Rotation(spin, 4, 'Z')


# ---------------------------------------------------------------- wall patches
def wall(kit, variant='a'):
    rnd = random.Random(4 if variant == 'a' else 17)
    rows = 3 if variant == 'a' else 2
    cols = 6 if variant == 'a' else 5
    n = 0
    taken = []
    for row in range(rows):
        for col in range(cols):
            x = -0.68 + col * 0.27 + (0.135 if row % 2 else 0) + rnd.uniform(-0.03, 0.03)
            if row % 2 and col == cols - 1:
                continue
            z = 0.62 + row * 0.29 + rnd.uniform(-0.035, 0.035)
            if rnd.random() < (0.1 if variant == 'a' else 0.24):
                taken.append((x, z))
                continue
            r = rnd.uniform(0.1, 0.128)
            fresh = variant == 'b' and rnd.random() < 0.25
            age = rnd.uniform(0.05, 0.25) if fresh else rnd.uniform(0.55, 1.0)
            o = cake_obj('w%d' % n, rnd, r, rnd.uniform(0.024, 0.034) * (1.25 if fresh else 1.0), hand=True, age=age)
            M = Matrix.Translation((x, -0.001 * (n % 3), z)) @ frame_to(Vector((0, -1, 0)), Vector((0, 0, 1)), rnd.uniform(-0.45, 0.45))
            kit.add('plaster', bake(o, M))
            n += 1
    if variant == 'b':
        taken += [(-0.45, 1.2), (0.52, 1.17)]
    # ghost smears where dried cakes were pulled off: thin, paler, ragged, flat on the wall
    for k, (x, z) in enumerate(taken):
        bm = bmesh.new()
        ph = [rnd.uniform(0, 6.28) for _ in range(3)]
        R0 = rnd.uniform(0.09, 0.115)
        cols = []
        tone = mix(FRESH, DRY, rnd.uniform(0.6, 0.9))
        seg = 18
        for i in range(seg):
            if math.sin(i * 1.7 + ph[0]) + 0.6 * math.sin(i * 0.6 + ph[1]) < -0.5:   # gaps where the rim came away clean
                continue
            pts = []
            for a in (i / seg * math.tau, (i + 1) / seg * math.tau):
                R = R0 * (1 + 0.08 * math.sin(3 * a + ph[2]))
                wdt = 0.012 + 0.012 * (0.5 + 0.5 * math.sin(5 * a + ph[0]))
                pts += [(R * math.cos(a), R * math.sin(a)), ((R - wdt) * math.cos(a), (R - wdt) * math.sin(a))]
            vs = [bm.verts.new((px, py, 0.002)) for px, py in (pts[0], pts[2], pts[3], pts[1])]
            bm.faces.new(vs)
            cols += [tone, tone, tuple(v * 1.12 for v in tone), tuple(v * 1.12 for v in tone)]
        for i in range(5):   # crumbs left inside the ring
            a, rr = rnd.uniform(0, 6.28), rnd.uniform(0.0, R0 * 0.7)
            cx, cy, q = rr * math.cos(a), rr * math.sin(a), rnd.uniform(0.006, 0.014)
            vs = [bm.verts.new((cx + q * math.cos(b), cy + q * math.sin(b), 0.002)) for b in (0.3, 2.4, 4.4)]
            bm.faces.new(vs)
            cols += [tone] * 3
        o = new_bmesh_obj('ghost%d' % k, bm)
        write_base(o, cols)
        M = Matrix.Translation((x, 0.0, z)) @ frame_to(Vector((0, -1, 0)), Vector((0, 0, 1)), rnd.uniform(0, 6.28))
        kit.add('plaster', bake(o, M))


# ---------------------------------------------------------------- bitauda stacks
def lumpy_lathe(name, prof, seg, rnd, amp=0.02):
    o = lathe(name, 0, 0, prof, seg=seg)
    ph = [rnd.uniform(0, 6.28) for _ in range(4)]
    for v in o.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        rr = math.hypot(v.co.x, v.co.y)
        if rr < 1e-4:
            continue
        k = 1 + amp * (math.sin(4 * a + ph[0] + v.co.z * 3) + 0.6 * math.sin(9 * a + ph[1] - v.co.z * 5))
        v.co.x *= k
        v.co.y *= k
    return o


def prof_r(prof, z):
    for (r0, h0), (r1, h1) in zip(prof, prof[1:]):
        if h0 <= z <= h1:
            return r0 + (r1 - r0) * (z - h0) / max(h1 - h0, 1e-6)
    return prof[-1][0]


def cap(kit, rnd, z0, rb, top, tone, locks=12):
    """Straw cap: lathed cone with a ragged rim, a tied top-knot, and hanging straw locks (thin bent prisms)."""
    prof = [(0.0, top), (0.05, top - 0.02), (rb * 0.3, top - (top - z0) * 0.3), (rb * 0.62, top - (top - z0) * 0.62),
            (rb * 0.88, z0 + 0.06), (rb, z0), (rb * 0.8, z0 + 0.04), (0.0, z0 + 0.12)]
    o = lathe('cap', 0, 0, prof, seg=24)
    ph = rnd.uniform(0, 6.28)
    for v in o.data.vertices:
        if abs(v.co.z - z0) < 1e-4:   # ragged rim: some bundles hang lower
            a = math.atan2(v.co.y, v.co.x)
            v.co.z -= 0.05 * max(0.0, math.sin(5 * a + ph)) + rnd.uniform(0, 0.035)
    kit.add('thatch', o, tone)
    # top-knot: a short cinched tuft and a rope tie
    knot = lathe('knot', 0, 0, [(0.06, top - 0.05), (0.03, top + 0.02), (0.045, top + 0.06), (0.085, top + 0.11), (0.06, top + 0.125), (0.0, top + 0.115)], seg=10)
    kit.add('thatch', knot, tone)
    tie = lathe('tie', 0, 0, [(0.05, top - 0.015), (0.062, top), (0.055, top + 0.03), (0.04, top + 0.035)], seg=10, smooth=False)
    kit.add('plaster', tie, 0x6E5A40)
    # hanging locks
    bm = bmesh.new()
    for i in range(locks):
        a = i / locks * math.tau + rnd.uniform(-0.2, 0.2)
        out = Vector((math.cos(a), math.sin(a), 0))
        side = Vector((-out.y, out.x, 0))
        p = out * (rb * 0.97) + Vector((0, 0, z0 + 0.01))
        L = rnd.uniform(0.07, 0.17)
        w = rnd.uniform(0.012, 0.024)
        pts = [p, p + out * 0.04 + Vector((0, 0, -L * 0.5)), p + out * 0.05 + Vector((0, 0, -L)) + side * rnd.uniform(-0.03, 0.03)]
        rings = []
        for j, q in enumerate(pts):
            ww = w * (1 - j * 0.42)
            rings.append([bm.verts.new(q + side * ww), bm.verts.new(q + out * 0.004), bm.verts.new(q - side * ww)])
        for j in range(2):
            for k in range(3):
                bm.faces.new((rings[j][k], rings[j][(k + 1) % 3], rings[j + 1][(k + 1) % 3], rings[j + 1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    kit.add('paint', new_bmesh_obj('locks', bm), 0xC4AD78)


def ring_of_cakes(kit, rnd, prof, z, tag, ages=(0.55, 1.0), rsz=(0.13, 0.155), gap=0.78):
    R = prof_r(prof, z)
    r_avg = sum(rsz) / 2
    N = max(5, int(math.tau * R / (2 * r_avg * gap)))
    # slope of the core at z (for the shingle tilt)
    dz = 0.05
    slope = math.atan2(prof_r(prof, z - dz) - prof_r(prof, z + dz), 2 * dz)
    a0 = rnd.uniform(0, 6.28)
    for k in range(N):
        a = a0 + k / N * math.tau + rnd.uniform(-0.06, 0.06)
        out = Vector((math.cos(a), math.sin(a), 0))
        tilt = slope + math.radians(rnd.uniform(4, 12))
        n = out * math.cos(tilt) + Vector((0, 0, math.sin(tilt)))
        r = rnd.uniform(*rsz)
        o = cake_obj('%s%d' % (tag, k), rnd, r, rnd.uniform(0.04, 0.052), hand=False, age=rnd.uniform(*ages), nfib=4, whiskers=1, ny=7)
        pos = out * (R + 0.012) + Vector((0, 0, z))
        kit.add('plaster', bake(o, Matrix.Translation(pos) @ frame_to(n, Vector((0, 0, 1)), rnd.uniform(-0.6, 0.6))))


def loose_pile(kit, rnd, x, y, count, tag):
    """A few dried cakes lying flat, one on another, each turned a little."""
    z = 0.0
    for k in range(count):
        r = rnd.uniform(0.12, 0.15)
        o = cake_obj('%s%d' % (tag, k), rnd, r, rnd.uniform(0.03, 0.04), hand=k == count - 1, age=rnd.uniform(0.6, 1.0), nfib=5, whiskers=1, ny=8)
        tilt = Matrix.Rotation(rnd.uniform(-0.08, 0.08), 4, 'X') @ Matrix.Rotation(rnd.uniform(-0.08, 0.08), 4, 'Y')
        kit.add('plaster', bake(o, Matrix.Translation((x + rnd.uniform(-0.03, 0.03), y + rnd.uniform(-0.03, 0.03), z)) @ tilt @ Matrix.Rotation(rnd.uniform(0, 6.28), 4, 'Z')))
        z += 0.03


def leaning(kit, rnd, prof, a, tag):
    """A cake stood on edge against the stack foot."""
    R = prof_r(prof, 0.15)
    out = Vector((math.cos(a), math.sin(a), 0))
    n = out * math.cos(math.radians(35)) + Vector((0, 0, math.sin(math.radians(35))))
    r = rnd.uniform(0.13, 0.15)
    o = cake_obj(tag, rnd, r, 0.035, hand=True, age=rnd.uniform(0.6, 0.95), nfib=5, whiskers=1)
    pos = out * (R + 0.1) + Vector((0, 0, r * 0.82))
    kit.add('plaster', bake(o, Matrix.Translation(pos) @ frame_to(n, Vector((0, 0, 1)), rnd.uniform(-0.3, 0.3))))


def stack(kit, variant='a'):
    rnd = random.Random(9 if variant == 'a' else 23)
    if variant == 'a':
        prof = [(0.6, 0.0), (0.6, 0.2), (0.55, 0.45), (0.47, 0.7), (0.36, 0.92), (0.22, 1.1), (0.0, 1.22)]
        core = lumpy_lathe('core', prof, 16, rnd, 0.01)
        kit.add('plaster', core, 0x4B3D2C)
        for i, z in enumerate((0.12, 0.33, 0.54, 0.75, 0.94)):
            ring_of_cakes(kit, rnd, prof, z, 'r%d_' % i, ages=(0.55, 1.0) if i < 3 else (0.4, 0.85))
        cap(kit, rnd, 0.98, 0.5, 1.5, 0xEAD69A, locks=22)
        loose_pile(kit, rnd, 0.62, -0.58, 4, 'pile')
        leaning(kit, rnd, prof, 2.4, 'lean0')
    else:
        prof = [(0.66, 0.0), (0.67, 0.25), (0.62, 0.5), (0.52, 0.72), (0.4, 0.9), (0.22, 1.04), (0.0, 1.1)]
        # lower half: plastered over with a dung skin, hand-swiped in wavy bands
        skin_prof = [(0.68, -0.02), (0.69, 0.12), (0.69, 0.25), (0.665, 0.38), (0.635, 0.5), (0.59, 0.6), (0.56, 0.64), (0.0, 0.66)]
        sk = lathe('skin', 0, 0, skin_prof, seg=36)
        ph = [rnd.uniform(0, 6.28) for _ in range(4)]
        bm = bmesh.new()
        bm.from_mesh(sk.data)
        # extra rings in the body for the swipe bands
        side = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 0.05 and e.verts[0].co.z < 0.62 and e.verts[1].co.z < 0.62]
        bmesh.ops.subdivide_edges(bm, edges=side, cuts=3, use_grid_fill=True)
        cols = {}
        for v in bm.verts:
            a = math.atan2(v.co.y, v.co.x)
            rr = math.hypot(v.co.x, v.co.y)
            if rr < 0.3:
                cols[v] = mix(FRESH, DRY, 0.6)
                continue
            sw = math.sin(17 * (v.co.z + 0.06 * math.sin(3 * a + ph[0])) + 2.0 * math.sin(a * 2 + ph[1]))
            k = 1 + 0.02 * sw + 0.012 * math.sin(5 * a + ph[2] + v.co.z * 4)
            v.co.x *= k
            v.co.y *= k
            hi = max(0.0, v.co.z) / 0.62
            c = mix(FRESH, DRY, 0.5 + 0.3 * hi + 0.2 * sw)
            c = mix(c, (0.40, 0.33, 0.24), 0.45 * max(0.0, 1 - v.co.z / 0.12))   # damp, splashed foot
            f = hsh(v.co.x, v.co.y + v.co.z, 3.0)
            if f > 0.88:
                c = mix(c, STRAW[int(f * 97) % 4], 0.4)
            cols[v] = c
        bm.to_mesh(sk.data)
        loop_cols = []
        for f in bm.faces:
            for lp in f.loops:
                loop_cols.append(cols[lp.vert])
        bm.free()
        for p in sk.data.polygons:
            p.use_smooth = True
        write_base(sk, loop_cols)
        kit.add('plaster', sk)
        core = lumpy_lathe('core', prof, 16, rnd, 0.01)
        kit.add('plaster', core, 0x4B3D2C)
        for i, z in enumerate((0.66, 0.86)):
            ring_of_cakes(kit, rnd, prof, z, 'r%d_' % i, ages=(0.6, 1.0))
        cap(kit, rnd, 0.9, 0.47, 1.3, 0xD6CBA6, locks=18)
        leaning(kit, rnd, prof, 0.6, 'lean0')
        leaning(kit, rnd, prof, 1.05, 'lean1')


BUILDERS = {'wall': lambda k: wall(k, 'a'), 'wall_b': lambda k: wall(k, 'b'), 'stack': lambda k: stack(k, 'a'), 'stack_b': lambda k: stack(k, 'b')}
OUTNAME = {'wall': 'gobar_wall_v2', 'wall_b': 'gobar_wall_v2_b', 'stack': 'gobar_stack_v2', 'stack_b': 'gobar_stack_v2_b'}


def new_kit():
    return Kit(split_props=False, own=('thatch',), route={'paint': 'thatch'})


def build(which):
    kit = new_kit()
    BUILDERS[which](kit)
    kit.finalize(os.path.join(ROOT, 'tmp', '%s_raw.glb' % OUTNAME[which]), {}, drift_amp=0.06, ao_strength=0.55)


def render():
    """All four on dry earth against a limewashed wall; writes docs/shots/assets-gobar/."""
    from mathutils import Vector as V
    from common import wb
    kit = new_kit()
    for which, off in (('wall', (-1.0, 0.0)), ('wall_b', (1.0, 0.0)), ('stack', (-1.3, -1.8)), ('stack_b', (1.3, -1.9))):
        start = len(kit.records)
        BUILDERS[which](kit)
        T = Matrix.Translation((off[0], off[1], 0)) @ (Matrix.Rotation(0.5 if which == 'stack' else -0.7, 4, 'Z') if 'stack' in which else Matrix())
        for _, o, _ in kit.records[start:]:
            o.data.transform(o.matrix_world)
            o.matrix_world.identity()
            o.data.transform(T)
    kit.add('plaster', wb('wallbg', -3.2, 3.2, -0.25, 0.0, 0.0, 2.6, 0.01), 0xDCD3BE)   # limewash wall, face at y=0
    kit.add('plaster', wb('plinth', -3.2, 3.2, 0.0, 0.12, 0.0, 0.42, 0.01), 0xA59B88)
    kit.finalize(os.path.join(ROOT, 'tmp', 'gobar_preview_raw.glb'), {}, drift_amp=0.06, ao_strength=0.55)
    for mat in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if mat.node_tree:
            for nd in mat.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, -5, 0))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sc.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.data.color = (1.0, 0.93, 0.82)
    sun.data.angle = math.radians(1.0)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-gobar')
    os.makedirs(d, exist_ok=True)
    shots = [('a_all_four', (0.4, -8.2, 2.3), (0.0, -1.0, 0.8), 32, (50, 0, 30)),
             ('b_wall_close', (-0.6, -2.1, 1.35), (-1.0, 0.0, 1.0), 40, (40, 0, 25)),
             ('c_stacks_close', (0.2, -5.6, 1.5), (0.0, -1.85, 0.75), 35, (50, 0, -35))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'wall'
    if which == 'render':
        render()
    else:
        build(which)
