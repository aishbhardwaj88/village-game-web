"""
Haystacks (J0, 27 Oct playthrough note; PARALLEL.md Wave 2 item 11): three variants, each ONE model drawn merged by src/haystacks.js.
  haystack_cone_v2 : tall conical bhoosa kup (4.7 m), creased by forkfuls, cinched by two sagging ropes, gobar-mud plastered cap
                     with a ragged edge and a straw top-knot, shaggy hanging locks all round, spilled straw on the ground.
  haystack_heap_v2 : low wide heap (2.4 m), elongated, two overlapping lobes, old sun-bleached grey crown, locks all over.
  haystack_half_v2 : a beehive stack half used: a STEPPED vertical cut face (lower cut, shelf, upper cut) with modelled
                     compressed straw strata, pull-out hollows and short ends sticking out of the face, slumped loose straw at its foot.
NOT a smooth dome: the body is a lumpy surface of forkful bulges (gaussian lumps), and the silhouette is broken by modelled
straw locks (bent 3-sided prisms, flattened) and fine single strands, so there is no alpha card and no extra transparent draw call.
Everything is ONE material: the shared thatch set. Per-strand colour comes from 6 straw tones (fresh, gold, tan, bleached,
weathered grey, dirty brown) baked as vertex colour (kind 'paint' routed into the thatch group); the body uses arch.thatch_straw.
Run: tools/blender/make_haystacks.sh   (writes public/assets/models/haystack_<type>_v2.glb; textures stripped, the game re-applies
the shared thatch set).   Preview: Blender -b --python tools/blender/build_haystack.py -- render  (docs/shots/assets-haystacks/)
Local frame: origin at the stack centre on the ground, upright, real sizes at scale 1. Cut face of 'half' faces +x.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector
from common import ROOT, new_bmesh_obj, load_pbr_material, box_uv
import arch
from arch import Kit
from common import hex_to_linear_rgb

_roof_thatch = arch.thatch_straw


def stack_thatch(obj, base_hex, seed=0):
    """arch.thatch_straw (bundle ridges, shag, valley weathering), then its roof-tuned darkening is lifted: it pulls up to 85%
    toward near-black, right under eaves, far too heavy on a free-standing stack (the body read as dark fur under golden locks).
    Kept: half its variation. Added: a dirty foot band, a sun-bleached grey crown and low-frequency forkful patches."""
    _roof_thatch(obj, base_hex, seed)
    me = obj.data
    lay = me.color_attributes['Base']
    br, bg, bb = hex_to_linear_rgb(base_hex)
    gr, gg, gb = hex_to_linear_rgb(GREY)
    dr, dg, db = hex_to_linear_rgb(DIRT)
    fr, fg, fb = hex_to_linear_rgb(FRESH)
    zs = [v.co.z for v in me.vertices]
    z0, z1 = min(zs), max(zs)
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, 6.28) for _ in range(3)]
    for li, lp in enumerate(me.loops):
        co = me.vertices[lp.vertex_index].co
        h = (co.z - z0) / max(z1 - z0, 0.05)
        c = lay.data[li].color
        r, g, b = c[0] * 0.5 + br * 0.5, c[1] * 0.5 + bg * 0.5, c[2] * 0.5 + bb * 0.5
        patch = math.sin(co.x * 1.7 + ph[0] + math.sin(co.z * 1.3)) * math.sin(co.y * 1.9 + co.z * 0.8 + ph[1])
        if patch > 0.25:   # a fresher forkful
            k = min(1.0, (patch - 0.25) * 1.2) * 0.5
            r, g, b = r + (fr - r) * k, g + (fg - g) * k, b + (fb - b) * k
        k = STACK_GREY * max(0.0, h - 0.55) / 0.45
        r, g, b = r + (gr - r) * k, g + (gg - g) * k, b + (gb - b) * k
        k = 0.55 * max(0.0, 1.0 - co.z / 0.45)
        r, g, b = r + (dr - r) * k, g + (dg - g) * k, b + (db - b) * k
        lay.data[li].color = (r, g, b, 1.0)
    return True


STACK_GREY = 0.5
arch.thatch_straw = stack_thatch   # this process only: arch.py is untouched, Kit.finalize looks the name up at call time

# straw tones (sRGB). Nothing at full saturation, nothing near black or white.
FRESH, GOLD, TAN, BLEACH, GREY, DIRT = 0xE0C47E, 0xCFAA62, 0xB38E55, 0xD3C69E, 0xA2967C, 0x7A6646
ROPE, MUD, MUD_DRY = 0x5E5242, 0x6A6052, 0x857A6A

PROFILES = {
    'cone': [(1.75, 0), (1.9, 0.5), (1.85, 1.4), (1.6, 2.3), (1.2, 3.1), (0.75, 3.8), (0.35, 4.3), (0.0, 4.65)],
    'heap': [(2.1, 0), (2.2, 0.3), (2.05, 0.9), (1.65, 1.5), (1.05, 2.0), (0.45, 2.3), (0.0, 2.4)],
    'heap2': [(1.3, 0), (1.35, 0.25), (1.2, 0.7), (0.85, 1.15), (0.4, 1.45), (0.0, 1.55)],
    'half': [(1.95, 0), (2.05, 0.5), (2.0, 1.3), (1.75, 2.1), (1.3, 2.8), (0.65, 3.25), (0.0, 3.45)],
}


def interp(prof, z):
    if z <= prof[0][1]:
        return prof[0][0]
    for (r0, h0), (r1, h1) in zip(prof, prof[1:]):
        if z <= h1:
            return r0 + (r1 - r0) * (z - h0) / max(h1 - h0, 1e-6)
    return 0.0


class Surf:
    """Lumpy stack surface: radius(angle, z) = profile x (1 + forkful lumps + creases - rope cinch), elliptic and leaning."""
    def __init__(self, prof, seed, sx=1.0, sy=1.0, lumps=14, amp=0.09, bands=(), lean=(0.0, 0.0), cx=0.0, cy=0.0, rot=0.0):
        rnd = random.Random(seed)
        self.prof, self.sx, self.sy, self.bands, self.lean, self.cx, self.cy, self.rot = prof, sx, sy, bands, lean, cx, cy, rot
        self.top = prof[-1][1]
        self.lumps = [(rnd.uniform(-math.pi, math.pi), rnd.uniform(0.1, self.top * 0.85), rnd.uniform(0.35, 0.8), rnd.uniform(0.3, 0.7), rnd.uniform(-amp, amp * 1.3)) for _ in range(lumps)]
        self.ph = [rnd.uniform(0, 6.28) for _ in range(4)]

    def r(self, a, z):
        f = 1.0
        for a0, z0, sa, sz, am in self.lumps:
            da = math.atan2(math.sin(a - a0), math.cos(a - a0))
            f += am * math.exp(-(da / sa) ** 2 - ((z - z0) / sz) ** 2)
        f += 0.03 * math.sin(a * 7 + self.ph[0] + z * 1.3) + 0.018 * math.sin(a * 15 + z * 5 + self.ph[1]) + 0.012 * math.sin(z * 9 + self.ph[2])
        for h in self.bands:
            f -= 0.055 * math.exp(-((z - h) / 0.09) ** 2)
        f += 0.05 * math.exp(-(z / 0.35) ** 2)   # the foot slumps outward under the weight
        return interp(self.prof, z) * f

    def p(self, a, z):
        r = self.r(a, z)
        x, y = r * math.cos(a) * self.sx, r * math.sin(a) * self.sy
        c, s = math.cos(self.rot), math.sin(self.rot)
        return Vector((self.cx + x * c - y * s + self.lean[0] * z, self.cy + x * s + y * c + self.lean[1] * z, z))

    def normal(self, a, z):
        e = 0.02
        n = (self.p(a + e, z) - self.p(a - e, z)).cross(self.p(a, z + e) - self.p(a, z - e))
        rad = self.p(a, z) - Vector((self.cx, self.cy, z))
        if n.dot(rad) < 0:
            n = -n
        return n.normalized()


def body(name, surf, seg=32, rows=16, cut=None, extra_z=()):
    """The stack shell: rings of `seg` around, a pole on top; open at the ground. cut(z) -> x plane (points beyond are pressed onto it)."""
    bm = bmesh.new()
    zs = sorted(set([surf.top * (i / rows) ** 0.85 * 0.985 for i in range(rows)] + list(extra_z)))
    rings = []
    for z in zs:
        ring = []
        for i in range(seg):
            q = surf.p(i / seg * math.tau, z)
            if cut is not None and q.x > cut(z):
                q.x = cut(z)
            ring.append(bm.verts.new(q))
        rings.append(ring)
    tq = surf.p(0, surf.top)
    tq.x, tq.y = surf.cx + surf.lean[0] * surf.top, surf.cy + surf.lean[1] * surf.top
    pole = bm.verts.new(tq)
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    for i in range(seg):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % seg], pole))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


class Buckets:
    """One bmesh per straw tone; each becomes a 'paint' object (flat vertex colour) routed into the thatch material."""
    def __init__(self):
        self.bm = {}

    def get(self, hexc):
        if hexc not in self.bm:
            self.bm[hexc] = bmesh.new()
        return self.bm[hexc]

    def add_to(self, kit, name):
        for i, (hexc, bm) in enumerate(self.bm.items()):
            if len(bm.faces):
                o = new_bmesh_obj('%s_%d' % (name, i), bm)
                for poly in o.data.polygons:   # smooth: a lock's 7 vertices are shared, not split per face (a third of the file size)
                    poly.use_smooth = True
                kit.add('paint', o, hexc)


def side_of(d):
    s = d.cross(Vector((0, 0, 1)))
    if s.length < 1e-4:
        s = d.cross(Vector((1, 0, 0)))
    return s.normalized()


def lock(bm, p, d, L, w, t, droop):
    """A flattened, bent lock of straw: triangle cross-section (w wide, t thick) -> mid (70%) -> tip point. 9 triangles."""
    s = side_of(d)
    n = s.cross(d).normalized()
    base = [bm.verts.new(p + s * w / 2), bm.verts.new(p - s * w / 2), bm.verts.new(p + n * t)]
    d2 = (d + Vector((0, 0, -droop))).normalized()
    m = p + d * L * 0.55 + Vector((0, 0, -droop * L * 0.12))
    s2 = side_of(d2)
    n2 = s2.cross(d2).normalized()
    mid = [bm.verts.new(m + s2 * w * 0.35), bm.verts.new(m - s2 * w * 0.35), bm.verts.new(m + n2 * t * 0.7)]
    tip = bm.verts.new(m + d2 * L * 0.45)
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((base[i], base[j], mid[j], mid[i]))
        bm.faces.new((mid[i], mid[j], tip))


def strand(bm, p, d, L, t=0.012):
    """A single fine straw: thin 3-sided spike. 3 triangles."""
    s = side_of(d)
    n = s.cross(d).normalized()
    b = [bm.verts.new(p + s * t), bm.verts.new(p - s * t * 0.5 + n * t * 0.87), bm.verts.new(p - s * t * 0.5 - n * t * 0.87)]
    tip = bm.verts.new(p + d * L)
    for i in range(3):
        bm.faces.new((b[i], b[(i + 1) % 3], tip))


def pick(rnd, table):
    tot = sum(w for _, w in table)
    x = rnd.uniform(0, tot)
    for c, w in table:
        x -= w
        if x <= 0:
            return c
    return table[-1][0]


def tone_at(rnd, h, weathered):
    """Straw tone by relative height h (0 ground .. 1 top): dirty at the foot, gold in the middle, grey and bleached on the exposed crown."""
    if h < 0.15:
        return pick(rnd, [(DIRT, 4), (TAN, 4), (GOLD, 2), (GREY, 1)])
    if h > 0.7:
        return pick(rnd, [(GREY, 2 + 4 * weathered), (BLEACH, 3), (GOLD, 2), (FRESH, 1)])
    return pick(rnd, [(GOLD, 4), (TAN, 3), (FRESH, 2), (BLEACH, 1), (GREY, 1 + 3 * weathered), (DIRT, 0.5)])


def shag(bk, surf, seed, n_locks, n_strands, Lk, weathered=0.0, cut=None, zmin=0.05, zmax=0.93):
    """Hanging locks and loose strands on the surface. More low down and under the ropes (where straw is pulled and hangs)."""
    rnd = random.Random(seed)
    placed = 0
    tries = 0
    while placed < n_locks + n_strands and tries < 20000:
        tries += 1
        h = rnd.uniform(zmin, zmax) ** 0.85
        z = surf.top * h
        a = rnd.uniform(-math.pi, math.pi)
        p = surf.p(a, z)
        if cut is not None and p.x > cut(z) - 0.08:
            continue
        nrm = surf.normal(a, z)
        down = Vector((0, 0, -1))
        tang = (down - nrm * down.dot(nrm))
        tang = tang.normalized() if tang.length > 1e-3 else down
        jit = Vector((rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35), rnd.uniform(-0.15, 0.15)))
        is_lock = placed < n_locks
        if h > 0.88:   # crown: wind-tousled, sticking up and out
            d = (nrm * 0.7 + tang * 0.5 + Vector((0, 0, 0.15)) + jit).normalized()
        elif is_lock:  # locks lie on the stack like shingles, lifting off it a little: layered, not spiky
            d = (tang * rnd.uniform(0.8, 1.0) + nrm * rnd.uniform(0.12, 0.4) + jit * 0.7).normalized()
        else:          # odd loose strands stand a little proud and break the outline
            d = (tang * rnd.uniform(0.6, 1.0) + nrm * rnd.uniform(0.25, 0.6) + jit).normalized()
        col = tone_at(rnd, h, weathered)
        root = p - nrm * 0.03
        if is_lock:
            L = Lk * rnd.uniform(0.5, 1.3) * (1.25 if h < 0.3 else 1.0)
            lock(bk.get(col), root, d, L, rnd.uniform(0.045, 0.09), rnd.uniform(0.012, 0.022), rnd.uniform(0.1, 0.45))
        else:
            strand(bk.get(col), root, d, Lk * rnd.uniform(0.6, 1.6), rnd.uniform(0.007, 0.012))
        placed += 1


def skirt(bk, surf, seed, n, spread, cut=None):
    """Straw spilled and trodden flat on the ground round the foot: lying locks and strands, tips lifting a little."""
    rnd = random.Random(seed)
    for _ in range(n):
        a = rnd.uniform(-math.pi, math.pi)
        p0 = surf.p(a, 0.02)
        if cut is not None and p0.x > cut(0.0) - 0.05:
            continue
        rad = (p0 - Vector((surf.cx, surf.cy, 0.02)))
        rad.z = 0
        rad.normalize()
        out = rnd.uniform(-0.1, spread) ** 1.0
        p = p0 + rad * out
        p.z = rnd.uniform(0.005, 0.03)
        ang = rnd.uniform(-1.2, 1.2)
        d = Vector((rad.x * math.cos(ang) - rad.y * math.sin(ang), rad.x * math.sin(ang) + rad.y * math.cos(ang), rnd.uniform(0.02, 0.12))).normalized()
        col = pick(rnd, [(DIRT, 3), (TAN, 4), (GOLD, 3), (GREY, 2), (BLEACH, 1)])
        if rnd.random() < 0.5:
            lock(bk.get(col), p, d, rnd.uniform(0.2, 0.45), rnd.uniform(0.05, 0.1), 0.012, 0.0)
        else:
            strand(bk.get(col), p, d, rnd.uniform(0.2, 0.5), 0.008)


def rope(bk, surf, h, seed, sides=5, seg=48, r=0.03, cut=None):
    """A sagging coir rope round the stack, half sunk into the cinch it makes."""
    rnd = random.Random(seed)
    ph = rnd.uniform(0, 6.28)
    bm = bk.get(ROPE)
    rings = []
    for i in range(seg):
        a = i / seg * math.tau
        z = h + 0.07 * math.sin(a * 2 + ph) + 0.025 * math.sin(a * 5 + ph * 2)
        c = surf.p(a, z)
        nrm = surf.normal(a, z)
        c = c + nrm * (r * 0.85)
        tan = Vector((-math.sin(a), math.cos(a), 0))
        u = nrm
        v = tan.cross(u).normalized()
        rings.append([bm.verts.new(c + (u * math.cos(k / sides * math.tau) + v * math.sin(k / sides * math.tau)) * r) for k in range(sides)])
    for i in range(seg):
        a0, a1 = rings[i], rings[(i + 1) % seg]
        if cut is not None and max(a0[0].co.x, a1[0].co.x) > cut(h) - 0.12:
            continue   # the rope was cut and pulled off where the face was dug out
        for k in range(sides):
            bm.faces.new((a0[k], a0[(k + 1) % sides], a1[(k + 1) % sides], a1[k]))


def mud_cap(bk, surf, z0, seed):
    """Gobar-mud plaster sealing the top of the kup against rain: a thin shell over the crown with a ragged lower edge, two tones."""
    rnd = random.Random(seed)
    seg = 28
    edge = [z0 + 0.18 * math.sin(i * 0.9 + seed) + rnd.uniform(-0.12, 0.12) for i in range(seg)]
    rows = 6
    grid = []
    for k in range(rows + 1):
        ring = []
        for i in range(seg):
            a = i / seg * math.tau
            zz = edge[i] + (surf.top * 0.975 - edge[i]) * (k / rows) ** 0.9
            p = surf.p(a, zz) + surf.normal(a, zz) * (0.035 + 0.01 * rnd.random())
            ring.append(p)
        grid.append(ring)
    for k in range(rows):
        for i in range(seg):
            j = (i + 1) % seg
            col = MUD if (k + i * 3 + rnd.randint(0, 2)) % 4 else MUD_DRY
            bm = bk.get(col)
            bm.faces.new([bm.verts.new(q) for q in (grid[k][i], grid[k][j], grid[k + 1][j], grid[k + 1][i])])
    # close the very top with a little cone
    bm = bk.get(MUD)
    tip = surf.p(0, surf.top) * 0
    tip = Vector((surf.cx + surf.lean[0] * surf.top, surf.cy + surf.lean[1] * surf.top, surf.top + 0.04))
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((bm.verts.new(grid[-1][i]), bm.verts.new(grid[-1][j]), bm.verts.new(tip)))
    # a few straw ends poking out under the ragged edge
    for i in range(seg):
        if rnd.random() < 0.7:
            a = i / seg * math.tau
            p = surf.p(a, edge[i] - 0.02)
            n = surf.normal(a, edge[i])
            strand(bk.get(pick(rnd, [(GREY, 3), (BLEACH, 2), (GOLD, 1)])), p - n * 0.03, (n + Vector((0, 0, -0.9))).normalized(), rnd.uniform(0.15, 0.32), 0.012)
    return tip


def top_knot(bk, tip, seed):
    """The twisted straw knot the stacker leaves on the peak."""
    rnd = random.Random(seed)
    for k in range(9):
        d = Vector((rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), 1.0)).normalized()
        lock(bk.get(pick(rnd, [(GREY, 2), (BLEACH, 2), (GOLD, 1)])), tip - Vector((0, 0, 0.05)), d, rnd.uniform(0.25, 0.45), 0.06, 0.02, rnd.uniform(0.3, 0.9))


def cut_face(bk, surf, cut, z0, z1, seed, nu=18, nv=None):
    """Vertical cut face at x = cut(z) between z0 and z1: compressed straw strata (horizontal ridges), hollows where forkfuls
    were pulled out, banded fresh/gold/tan. Built straight into the tone buckets, one quad at a time."""
    rnd = random.Random(seed)
    nv = nv or max(6, int((z1 - z0) / 0.05))
    hollows = [(rnd.uniform(-1.2, 1.2), rnd.uniform(z0, z1), rnd.uniform(0.18, 0.35), rnd.uniform(0.012, 0.028)) for _ in range(5)]
    ph = rnd.uniform(0, 6.28)

    def half_width(x, z):
        lo, hi = 0.0, 3.0
        for _ in range(18):
            mid = (lo + hi) / 2
            a = math.atan2(mid, x)
            q = surf.p(a, z)
            if math.hypot(x, mid) < math.hypot(q.x, q.y) * 0.985:
                lo = mid
            else:
                hi = mid
        return lo

    grid = []
    for k in range(nv + 1):
        z = z0 + (z1 - z0) * k / nv
        x = cut(z)
        w = half_width(x, z)
        row = []
        for i in range(nu + 1):
            y = -w + 2 * w * i / nu
            dx = 0.035 + 0.022 * abs(math.sin(z * 21 + ph + 0.8 * math.sin(y * 2.3))) + 0.008 * rnd.random() + 0.05 * math.cos(y / max(w, 0.3) * 1.5) * math.sin((z - z0) / max(z1 - z0, 0.3) * 3.0)
            for hy, hz, hr, hd in hollows:
                dx -= hd * math.exp(-((y - hy) ** 2 + (z - hz) ** 2) / (hr * hr))
            row.append(Vector((x + dx, y, z)))
        grid.append(row)
    for k in range(nv):
        zc = (grid[k][0].z + grid[k + 1][0].z) / 2
        col = None
        for i in range(nu):
            yc = grid[k][i].y
            band = math.sin(zc * 17 + ph + 1.1 * math.sin(yc * 1.4 + zc * 2.0) + 0.5 * math.sin(yc * 3.7))
            if col is not None and rnd.random() < 0.6:
                pass
            elif band > 0.6:
                col = pick(rnd, [(TAN, 3), (GOLD, 2)])
            elif band < -0.4:
                col = pick(rnd, [(FRESH, 3), (BLEACH, 1)])
            else:
                col = pick(rnd, [(GOLD, 4), (FRESH, 2), (TAN, 1)])
            bm = bk.get(col)
            bm.faces.new([bm.verts.new(q) for q in (grid[k][i], grid[k + 1][i], grid[k + 1][i + 1], grid[k][i + 1])])
    # short cut-off ends bristling out of the face
    for _ in range(int(45 * (z1 - z0))):
        k, i = rnd.randint(1, nv - 1), rnd.randint(1, nu - 1)
        p = grid[k][i] - Vector((0.03, 0, 0))
        d = Vector((1.0, rnd.uniform(-0.6, 0.6), rnd.uniform(-0.7, 0.2))).normalized()
        if rnd.random() < 0.5:
            lock(bk.get(pick(rnd, [(GOLD, 2), (FRESH, 2), (TAN, 1)])), p, d, rnd.uniform(0.1, 0.25), rnd.uniform(0.04, 0.08), 0.012, 0.6)
        else:
            strand(bk.get(pick(rnd, [(GOLD, 2), (FRESH, 2)])), p, d, rnd.uniform(0.1, 0.3), 0.008)
    return grid


def build_kit(kind):
    kit = Kit(split_props=False, own=('thatch',), route={'paint': 'thatch'})
    bk = Buckets()
    if kind == 'cone':
        s = Surf(PROFILES['cone'], 3, sx=1.0, sy=0.94, lumps=16, amp=0.08, bands=(1.15, 2.35), lean=(0.03, -0.015))
        kit.add('thatch', body('stack', s, seg=32, rows=18), 0xD6B977)
        rope(bk, s, 1.15, 1)
        rope(bk, s, 2.35, 2)
        tip = mud_cap(bk, s, 3.75, 4)
        top_knot(bk, tip, 5)
        shag(bk, s, 23, 620, 260, 0.4, weathered=0.4, zmax=0.8)
        skirt(bk, s, 24, 110, 0.7)
    elif kind == 'heap':
        s = Surf(PROFILES['heap'], 5, sx=1.18, sy=0.88, lumps=18, amp=0.11, lean=(0.0, 0.02))
        s2 = Surf(PROFILES['heap2'], 6, sx=1.1, sy=0.9, lumps=10, amp=0.12, cx=-1.7, cy=0.55, rot=0.5)
        kit.add('thatch', body('stack', s, seg=32, rows=14), 0xC2AB7A)
        kit.add('thatch', body('lobe', s2, seg=26, rows=10), 0xCDB27A)
        shag(bk, s, 25, 560, 240, 0.36, weathered=0.9, zmax=0.97)
        shag(bk, s2, 26, 200, 80, 0.3, weathered=0.6, zmax=0.97)
        skirt(bk, s, 27, 120, 0.8)
        skirt(bk, s2, 28, 50, 0.6)
    else:  # half
        s = Surf(PROFILES['half'], 8, sx=1.0, sy=0.96, lumps=16, amp=0.09, bands=(1.2,), lean=(-0.02, 0.0))
        zs = 1.75

        def cut(z):
            return 0.5 if z < zs else 0.0
        kit.add('thatch', body('stack', s, seg=34, rows=18, cut=cut, extra_z=(zs - 0.012, zs + 0.012)), 0xD0B575)
        rope(bk, s, 1.2, 3, cut=cut)
        shag(bk, s, 29, 560, 220, 0.38, weathered=0.6, cut=cut)
        skirt(bk, s, 30, 90, 0.6, cut=cut)
        cut_face(bk, s, cut, 0.0, zs - 0.012, 31)
        cut_face(bk, s, cut, zs + 0.012, s.top * 0.8, 32, nu=14)
        # the shelf left by the step: loose straw lying on it
        rnd = random.Random(33)
        for _ in range(30):
            p = Vector((rnd.uniform(0.0, 0.45), rnd.uniform(-1.1, 1.1), zs + 0.01))
            if math.hypot(p.x, p.y) > s.r(math.atan2(p.y, p.x), zs) * 0.92:
                continue
            d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.0, 0.25))).normalized()
            lock(bk.get(pick(rnd, [(GOLD, 3), (FRESH, 2), (BLEACH, 1)])), p, d, rnd.uniform(0.15, 0.35), 0.07, 0.015, 0.1)
        # slumped loose straw pulled from the face, in a low lumpy heap at its foot
        m = Surf([(1.05, 0), (1.05, 0.12), (0.8, 0.38), (0.35, 0.58), (0.0, 0.64)], 11, sx=0.75, sy=1.25, lumps=8, amp=0.18, cx=1.2, cy=0.15)
        kit.add('thatch', body('mound', m, seg=22, rows=6), 0xD8BE80)
        shag(bk, m, 34, 150, 90, 0.28, weathered=0.0, zmin=0.0, zmax=0.98)
        skirt(bk, m, 35, 50, 0.5)
    bk.add_to(kit, 'straw')
    return kit


def build(kind):
    kit = build_kit(kind)
    kit.finalize(os.path.join(ROOT, 'tmp', 'haystack_%s_v2_raw.glb' % kind), {}, drift_amp=0.1, ao_strength=0.55)


def render():
    """All three side by side on dry earth, plus two close-ups. Writes docs/shots/assets-haystacks/."""
    from mathutils import Vector as V
    records = []
    for kind, dx, dy in (('cone', -5.0, 0.0), ('heap', 0.6, 0.6), ('half', 5.8, -0.2)):
        kit = build_kit(kind)
        for _, o, _ in kit.records:
            o.location.x += dx
            o.location.y += dy
            for coll in list(o.users_collection):
                coll.objects.unlink(o)
        records.extend(kit.records)
    master = Kit(split_props=False, own=('thatch',), route={'paint': 'thatch'})
    for kind, o, col in records:
        bpy.context.collection.objects.link(o)
        bpy.context.view_layer.update()
        o.data.transform(o.matrix_world)
        o.matrix_world.identity()
        master.add(kind, o, col)
    master.finalize(os.path.join(ROOT, 'tmp', 'haystacks_preview_raw.glb'), {}, drift_amp=0.1, ao_strength=0.55)
    for mat in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if mat.node_tree:
            for nd in mat.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
            if mat.name.startswith('hb_thatch'):   # src/stagingYard.js multiplies the thatch albedo by (4.0, 3.4, 2.5)
                nt = mat.node_tree
                bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
                src = bsdf.inputs['Base Color'].links[0].from_socket
                mx = nt.nodes.new('ShaderNodeMixRGB')
                mx.blend_type = 'MULTIPLY'
                mx.use_clamp = False
                mx.inputs['Fac'].default_value = 1.0
                mx.inputs['Color2'].default_value = (4.0, 3.4, 2.5, 1.0)
                nt.links.new(src, mx.inputs['Color1'])
                nt.links.new(mx.outputs['Color'], bsdf.inputs['Base Color'])
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
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
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-haystacks')
    os.makedirs(d, exist_ok=True)
    shots = [('a_all_three', (3.0, -17.0, 4.2), (0.6, 0.0, 1.8), 32, (55, 0, 35)),
             ('b_half_cut_face', (12.5, -4.5, 2.4), (5.8, -0.2, 1.3), 38, (55, 0, 70)),
             ('c_cone_close', (-8.0, -6.0, 1.6), (-5.0, 0.0, 2.2), 30, (50, 0, -30))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'cone'
    if which == 'render':
        render()
    else:
        build(which)
