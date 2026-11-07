"""
Scooter family (VILLAGE_VOCABULARY.md section 13, nostalgic discoveries), 7 Nov. Two small hard-surface props, two variants each.
Generic: no brand, no badge, no lettering, blank number plates.

  scooter_covered_v2 / _b : a 1990s geared step-through scooter parked on its centre stand under a faded tarpaulin cover.
        The cover is a lofted, MODELLED drape (rounded top over the bar and the seat, a sag over the floorboard, sides hanging
        straight with ripples that grow toward the hem, a turned-up hem with thickness, a pinched seam at each end) tied
        round the seat with a rope and a knot whose two ends hang. What shows under it: the small pressed-steel split-rim
        wheels (treaded tyres, wheel nuts), the bulbous front mudguard on its single-sided link fork, the floorboard edge
        with rubber runners and a chrome edge strip, the foot of the legshield, the centre stand, the silencer, the kick lever.
        A: faded blue tarp, duck-egg scooter.  B: faded olive tarp, cream scooter, a second rope round the bar, the hem lifted.
  scooter_motorcycle_v2 / _b : a generic 1990s single-cylinder roadster leaning on its left side stand. 18 inch wire wheels
        (36 spokes, drum hubs, treaded tyres), telescopic fork with rubber gaiters, round headlamp nacelle with speedo pod,
        wide bar with levers and round mirrors, teardrop tank with knee pads and a chrome cap, long flat seat with a strap,
        tool boxes, finned barrel and head, round side covers, exhaust down and back to a long silencer, swing arm,
        coil-spring rear shocks (modelled helix), chain and guard, both mudguards with stays, blank plates, tail lamp, carrier.
        A: faded maroon.  B: old navy, no carrier, bar turned the other way.

FACING: front toward +Z (glTF/three.js +Z = arch frame +wz). Origin on the ground midway between the axles. Wheels touch y=0.
Meshes per model: hb_metal (painted and bright steel, the shared 'metal' set, repeat 1.0), hb_main (rubber, leather, rope,
plastic lenses: the shared plaster set, repeat 0.5, roughness ~0.9) and, scooter only, hb_thatch (the cover: the shared
'tarpaulin' set riding the thatch slot via tex_override, repeat 1.0, the same arrangement build_goods_yard.py uses).
Colour and wear are per-vertex (dust rising from the ground, sun-faded tops, chips, rust spots on chrome, a sun-bleached
cover with rain streaks), then Kit.finalize's dirty-vertex AO.

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_scooter.py [-- render]
  for s in scooter_covered_v2 scooter_covered_v2_b scooter_motorcycle_v2 scooter_motorcycle_v2_b; do
    node tools/shrink.js tmp/${s}_raw.glb public/assets/models/$s.glb 999999
    node tools/strip-textures.mjs --relink public/assets/models/$s.glb public/assets/models/$s.glb
  done
--relink keeps the exported materials and only drops the embedded texture copies; src/sharedTextures.js (GLTFLoader plugin)
puts the shared maps back on any getGLTFLoader() load, so no swapShared() call is needed by whoever wires it in.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import limb, new_bmesh_obj, load_pbr_material, box_uv, hex_to_linear_rgb, wb
import arch
from arch import Kit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RND = random.Random(1990)

CHROME = 0x9a9c98
RUBBER = 0x2f2e2c
FRAME_BLACK = 0x2a2a2b
ALLOY = 0x7f7b72


# ================================================================ geometry helpers (arch frame wx, wz, h; Blender = (wx, -wz, h))
def B(p):
    return Vector((p[0], -p[1], p[2]))


def _frame(d):
    up = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 0, 1))
    u = d.cross(up).normalized()
    return u, d.cross(u).normalized()


def _smooth(o, on=True):
    for p in o.data.polygons:
        p.use_smooth = on
    return o


def rev(name, a, b, prof, seg=12, caps=True, smooth=True):
    """Surface of revolution about the axis a->b. prof = [(t, r)], t 0..1 along the axis, r radius. Caps the ends if r > 0."""
    A, Bv = B(a), B(b)
    d = Bv - A
    L = d.length
    d.normalize()
    u, v = _frame(d)
    bm = bmesh.new()
    rings = []
    for t, r in prof:
        c = A + d * (t * L)
        rings.append([bm.verts.new(c + (u * math.cos(i / seg * math.tau) + v * math.sin(i / seg * math.tau)) * r) for i in range(seg)])
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    if caps:
        if prof[0][1] > 1e-4:
            bm.faces.new(list(reversed(rings[0])))
        if prof[-1][1] > 1e-4:
            bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm), smooth and seg >= 6)


def tube(name, p0, p1, r, sides=6, caps=False, r1=None):
    return rev(name, p0, p1, [(0.0, r), (1.0, r if r1 is None else r1)], seg=sides, caps=caps)


def polytube(name, pts, r, sides=5, caps=False, r_end=None):
    """A tube swept along a polyline (exhaust bends, springs, ropes) with parallel-transported frames, one mesh."""
    P = [B(p) for p in pts]
    n = len(P)
    tans = []
    for i in range(n):
        a, b = P[max(0, i - 1)], P[min(n - 1, i + 1)]
        tans.append((b - a).normalized())
    u, _ = _frame(tans[0])
    bm = bmesh.new()
    rings = []
    for i in range(n):
        t = tans[i]
        u = (u - t * t.dot(u)).normalized()
        v = t.cross(u).normalized()
        rr = r if r_end is None else r + (r_end - r) * i / (n - 1)
        rings.append([bm.verts.new(P[i] + (u * math.cos(k / sides * math.tau) + v * math.sin(k / sides * math.tau)) * rr) for k in range(sides)])
    for i in range(n - 1):
        for k in range(sides):
            m = (k + 1) % sides
            bm.faces.new((rings[i][k], rings[i][m], rings[i + 1][m], rings[i + 1][k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm), sides >= 5)


def loft(name, sections, closed=True, caps=True, smooth=True):
    """Skin a list of equal-length point rings (arch-frame points). closed: each ring is a loop."""
    bm = bmesh.new()
    rings = [[bm.verts.new(B(p)) for p in s] for s in sections]
    m = len(sections[0])
    for k in range(len(rings) - 1):
        for i in range(m if closed else m - 1):
            j = (i + 1) % m
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    if caps and closed:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm), smooth)


def ribbons(name, segs, w):
    """Flat strips (spokes): each (p0, p1) is one quad facing the axle (wx). Kit materials export double-sided."""
    bm = bmesh.new()
    for p0, p1 in segs:
        a, b = B(p0), B(p1)
        s = (b - a).normalized().cross(Vector((1, 0, 0))).normalized() * (w * 0.5)
        bm.faces.new([bm.verts.new(x) for x in (a - s, b - s, b + s, a + s)])
    return new_bmesh_obj(name, bm)


def tread_tyre(name, cz, hy, R, r, seg=24, sides=5, depth=0.004):
    """Tyre torus, axle along wx at (wz=cz, h=hy). The crown carries MODELLED tread: the centre rib and the shoulder rows
    pushed out on alternate rings, out of phase, so the contact face reads as blocks, not paint."""
    bm = bmesh.new()
    rows = []
    for i in range(seg):
        a = i / seg * math.tau
        row = []
        for k in range(sides):
            t = k / sides * math.tau
            rr = r
            if k == 0 and i % 2 == 0:
                rr += depth
            elif k in (1, sides - 1) and i % 2 == 1:
                rr += depth * 0.8
            radial = R + rr * math.cos(t)
            row.append(bm.verts.new(B((rr * 1.08 * math.sin(t), cz + radial * math.cos(a), hy + radial * math.sin(a)))))
        rows.append(row)
    for i in range(seg):
        n = (i + 1) % seg
        for k in range(sides):
            m = (k + 1) % sides
            bm.faces.new((rows[i][k], rows[n][k], rows[n][m], rows[i][m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm))


def fender(name, cz, hy, R, a0, a1, n, prof):
    """Mudguard sheet arc around an axle (wz=cz, h=hy), angles in degrees (0 = forward +wz, 90 = up).
    prof = [(wx, dr)] across the sheet: dr pulls the skirts in toward the wheel."""
    bm = bmesh.new()
    rows = []
    for k in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * k / n)
        rows.append([bm.verts.new(B((wx, cz + (R + dr) * math.cos(a), hy + (R + dr) * math.sin(a)))) for wx, dr in prof])
    for k in range(n):
        for i in range(len(prof) - 1):
            bm.faces.new((rows[k][i], rows[k][i + 1], rows[k + 1][i + 1], rows[k + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm))


# ================================================================ weathering (vertex colour)
def _fr(x):
    return x - math.floor(x)


def _hash(x, y, z, s):
    return _fr(math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453)


def _lerp(c, d, t):
    t = max(0.0, min(1.0, t))
    return [c[i] + (d[i] - c[i]) * t for i in range(3)]


def L(hexc):
    return list(hex_to_linear_rgb(hexc))


DUST, FADE, CHIP_RUST, BARE, RUST_SPOT, OIL = 0x6e6252, 0x8a8a84, 0x6a4430, 0x7c7c77, 0x7a4a2c, 0x2b2522


def wear_colour(obj, base_hex, mode, seed):
    me = obj.data
    if 'Base' not in me.color_attributes:
        me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    layer = me.color_attributes['Base']
    base = L(base_hex)
    unit = 1.0 + RND.uniform(-0.06, 0.06)      # per-part tone: no two panels the same colour
    zs = [v.co.z for v in me.vertices]
    ztop = max(zs) if zs else 1.0
    out = []
    for lp in me.loops:
        v = me.vertices[lp.vertex_index]
        x, y, z = v.co
        n = v.normal
        j = 1.0 + (_hash(x, y, z, seed) - 0.5) * 0.10
        c = [ch * unit * j for ch in base]
        low = max(0.0, (0.40 - z) / 0.40)
        if mode == 'paint':
            c = _lerp(c, _lerp(c, L(FADE), 0.5), 0.45 * max(0.0, n.z))                 # sun-faded upper faces
            c = _lerp(c, L(DUST), 0.08 + 0.45 * low + 0.12 * max(0.0, n.z))
            h = _hash(round(x * 60), round(y * 60), round(z * 60), seed + 3)
            if h > 0.92:                                                                 # chips: rust mostly, some bare steel
                c = _lerp(c, L(CHIP_RUST if h < 0.95 else BARE), 0.7)
        elif mode == 'chrome':
            spot = math.sin(x * 41 + seed) * math.sin(y * 37 + z * 29) * math.sin(z * 53 + x * 13)
            c = _lerp(c, L(RUST_SPOT), max(0.0, spot - 0.15) * 1.5 + 0.10)
            c = _lerp(c, L(DUST), 0.10 + 0.35 * low)
        elif mode == 'alloy':                                                            # engine: oily grime in the lower half
            c = _lerp(c, L(OIL), 0.15 + 0.35 * max(0.0, (0.45 - z) / 0.25) * (0.6 + 0.4 * math.sin(x * 60 + y * 45)))
            c = _lerp(c, L(DUST), 0.12)
        elif mode == 'rust':
            c = _lerp(c, L(OIL), 0.5 + 0.5 * math.sin(x * 90 + y * 140 + z * 120))
        elif mode == 'rubber':
            c = _lerp(c, L(DUST), 0.12 + 0.45 * low)
        elif mode == 'leather':
            top = max(0.0, n.z - 0.6) * 2.5
            c = _lerp(c, L(0x5a4636), 0.55 * top)
            c = _lerp(c, L(DUST), 0.10)
        elif mode == 'rope':
            c = _lerp(c, L(0x4a3e2c), 0.3 * (0.5 + 0.5 * math.sin(x * 200 + y * 170 + z * 230)))   # twist read as tone
            c = _lerp(c, L(DUST), 0.15)
        elif mode == 'tarp':
            up = max(0.0, n.z)
            c = _lerp(c, _lerp(c, L(0xc8c2b2), 0.65), 0.75 * up ** 1.4)                   # sun-bleached top
            streak = max(0.0, math.sin(x * 37 + y * 23 + seed)) ** 6 * (1.0 - up)          # rain/dust runs down the sides
            c = _lerp(c, L(0x5c5446), 0.22 * streak)
            hem = max(0.0, (0.55 - z) / 0.3)
            c = _lerp(c, L(DUST), 0.10 + 0.40 * hem)                                        # dusty hem, splash from the lane
            c = _lerp(c, L(0x3c3a34), 0.18 * max(0.0, -n.z))                                # underside of the hem turn
            blot = max(0.0, _hash(round(x * 9), round(y * 9), round(z * 9), seed + 7) - 0.88) * 3.0
            c = _lerp(c, _lerp(c, L(0xb0a890), 0.5), blot)                                   # odd paler patches (bird lime, wear)
        out.extend((min(c[0], 0.82), min(c[1], 0.82), min(c[2], 0.82), 1.0))
    layer.data.foreach_set('color', out)
    me.color_attributes.active_color = layer


_orig_colorize = arch.colorize


def colorize_hook(obj, hex_color, attr='Col'):
    mode = obj.get('wear')
    if mode and attr == 'Base':
        wear_colour(obj, hex_color, mode, seed=len(obj.name) + RND.randint(0, 999))
        return obj
    return _orig_colorize(obj, hex_color, attr)


arch.colorize = colorize_hook   # Kit.finalize calls arch.colorize by its module global


def jit(hexc, amt=0.05):
    r, g, b = (hexc >> 16) & 255, (hexc >> 8) & 255, hexc & 255
    k = 1.0 + RND.uniform(-amt, amt)
    return (min(255, int(r * k)) << 16) | (min(255, int(g * k)) << 8) | min(255, int(b * k))


class Adder:
    def __init__(self, kit):
        self.kit = kit

    def S(self, o, col, wear='paint'):            # steel (painted or bright) -> hb_metal
        o['wear'] = wear
        return self.kit.add('steel', o, jit(col, 0.04))

    def R(self, o, col=RUBBER, wear='rubber'):     # rubber, leather, rope, lenses -> hb_main
        o['wear'] = wear
        return self.kit.add('rubber', o, jit(col, 0.04))

    def T(self, o, col):                           # tarpaulin -> hb_thatch (tarpaulin set)
        o['wear'] = 'tarp'
        return self.kit.add('tarp', o, col)


def new_kit(tarp=False):
    if tarp:
        return Kit(split_props=False, route={'steel': 'metal', 'tarp': 'thatch'}, tex_override={'thatch': ('tarpaulin', 1.0)})
    return Kit(split_props=False, route={'steel': 'metal'})


# ================================================================ scooter under a cover
S_FZ, S_RZ, S_HY = 0.60, -0.63, 0.222     # 3.50-10 tyres, 1.23 m wheelbase


def small_wheel(A, cz, nuts_side, paint, seed):
    A.R(tread_tyre('tyre', cz, S_HY, 0.178, 0.046, seg=20, sides=5), RUBBER)
    # split pressed-steel rim: flanges, dished centre, hub boss (axle along wx)
    prof = [(0.0, 0.045), (0.10, 0.10), (0.24, 0.142), (0.36, 0.126), (0.64, 0.126), (0.76, 0.142), (0.90, 0.10), (1.0, 0.045)]
    A.S(rev('rim', (-0.062, cz, S_HY), (0.062, cz, S_HY), prof, seg=12), paint)
    for k in range(5 if nuts_side else 0):
        a = k / 5 * math.tau + seed
        wz, h = cz + 0.075 * math.cos(a), S_HY + 0.075 * math.sin(a)
        A.S(tube('nut', (nuts_side * 0.054, wz, h), (nuts_side * 0.068, wz, h), 0.010, 5, caps=True), 0x8a8780, 'chrome')


def cover_table(variant):
    # wz, top height, half width, hem height (the drape is interpolated between these)
    t = [(0.60, 0.84, 0.0, 0.56), (0.575, 0.98, 0.20, 0.50), (0.53, 1.06, 0.33, 0.44), (0.44, 1.04, 0.35, 0.38),
         (0.34, 0.92, 0.29, 0.34), (0.20, 0.76, 0.27, 0.32), (0.04, 0.73, 0.27, 0.31), (-0.10, 0.81, 0.29, 0.31),
         (-0.22, 0.87, 0.33, 0.30), (-0.42, 0.89, 0.37, 0.30), (-0.62, 0.87, 0.37, 0.30), (-0.77, 0.81, 0.34, 0.31),
         (-0.88, 0.69, 0.27, 0.33), (-0.95, 0.53, 0.15, 0.36), (-0.985, 0.43, 0.0, 0.39)]
    if variant == 'b':     # hem pulled up at the back (someone checked the tyre), a slightly fuller seat
        t = [(wz, T + (0.02 if wz < -0.2 else 0.0), W, Hm + (0.07 * max(0.0, min(1.0, (-0.3 - wz) / 0.4)))) for wz, T, W, Hm in t]
    return t


def cover_sampler(table):
    def P(wz):
        for k in range(len(table) - 1):
            a, b = table[k], table[k + 1]
            if a[0] >= wz >= b[0]:
                f = (a[0] - wz) / (a[0] - b[0])
                f = f * f * (3 - 2 * f)
                return [a[i] + (b[i] - a[i]) * f for i in (1, 2, 3)]
        return list(table[0][1:] if wz > table[0][0] else table[-1][1:])
    return P


def cover_point(P, wz, s, ph, out=0.0):
    """s 0..1 runs hem (left, -wx) -> over the top -> hem (right). Returns an arch-frame point."""
    T, W, Hm = P(wz)
    a = (s - 0.5) * math.pi
    lift = max(0.0, math.cos(a)) ** 0.38
    side = 1.0 - lift
    sg = 1.0 if a >= 0 else -1.0
    x = W * math.sin(a)
    h = Hm + (T - Hm) * lift
    ripple = 0.024 * side ** 1.4 * math.sin(wz * 21 + ph[0] + 1.8 * math.sin(wz * 6.5 + ph[1] + sg))   # hanging folds
    x += sg * (ripple + 0.035 * side ** 2.2)                                                          # flares at the hem
    h += 0.007 * math.sin(s * 19 + wz * 11 + ph[2]) * (1 - side)                                      # creases on top
    h += 0.018 * side ** 3 * math.sin(wz * 14 + ph[3] + sg * 2.0)                                     # wavy hem line
    wz2 = wz + 0.012 * side * math.sin(s * 9 + ph[4])
    if out:
        x += sg * out * math.sin(abs(a))
        h += out * math.cos(a)
    return (x, wz2, h)


def build_scooter(variant):
    kit = new_kit(tarp=True)
    A = Adder(kit)
    paint = 0x8fa5a4 if variant == 'a' else 0xb2a585
    tarp = 0x5a7590 if variant == 'a' else 0x6d7858
    ph = [RND.uniform(0, 6.28) for _ in range(5)]

    # ---- wheels, front fork (single-sided leading link on the left), front mudguard
    small_wheel(A, S_FZ, 1, paint, 0.3)
    small_wheel(A, S_RZ, 0, 0x6e6f6a, 1.1)      # rear nuts face the engine side, under the cover
    fork_top, fork_bot = (-0.085, 0.47, 0.56), (-0.085, 0.53, 0.30)
    A.S(tube('fork', fork_top, fork_bot, 0.024, 8, caps=True), paint)
    A.S(limb('link', (-0.085, 0.53, 0.30), (-0.080, S_FZ, S_HY), 0.035, 0.05), paint)
    A.S(tube('damper', (-0.10, 0.58, 0.25), (-0.10, 0.49, 0.47), 0.016, 6, caps=True), FRAME_BLACK)
    A.S(tube('hub_cap', (-0.07, S_FZ, S_HY), (-0.11, S_FZ, S_HY), 0.045, 10, caps=True), 0x7d7c76, 'chrome')
    A.S(tube('head', (0.0, 0.46, 0.50), (0.0, 0.42, 0.74), 0.03, 8), FRAME_BLACK)
    guard_prof = [(-0.118, -0.050), (-0.112, -0.012), (-0.085, 0.010), (-0.04, 0.020), (0.0, 0.023),
                  (0.04, 0.020), (0.085, 0.010), (0.112, -0.012), (0.118, -0.050)]
    A.S(fender('guard_f', S_FZ, S_HY, 0.245, 22, 158, 12, guard_prof), paint)
    A.S(tube('guard_crest', (0.0, S_FZ + 0.245 * math.cos(math.radians(30)), S_HY + 0.27 * math.sin(math.radians(30))),
             (0.0, S_FZ + 0.25 * math.cos(math.radians(70)), S_HY + 0.27 * math.sin(math.radians(70))), 0.008, 4), CHROME, 'chrome')

    # ---- legshield foot, floorboard with rubber runners and chrome edge strips, centre stand, silencer, kick lever
    A.S(wb('legshield', -0.27, 0.27, 0.40, 0.445, 0.20, 0.46, 0.02), paint)
    A.S(wb('floor', -0.175, 0.175, -0.14, 0.41, 0.17, 0.235, 0.012), paint)
    for k in range(5):
        x = -0.12 + k * 0.06
        A.R(limb('runner', (x, -0.10, 0.243), (x, 0.38, 0.243), 0.022, 0.014), 0x34312d)
    for s in (-1, 1):
        A.S(limb('edge', (s * 0.178, -0.14, 0.215), (s * 0.178, 0.41, 0.215), 0.010, 0.022), CHROME, 'chrome')
        A.S(tube('stand', (s * 0.12, -0.08, 0.17), (s * 0.165, -0.17, 0.012), 0.012, 6), FRAME_BLACK)
        A.R(limb('stand_foot', (s * 0.165, -0.20, 0.008), (s * 0.165, -0.13, 0.008), 0.035, 0.016), 0x3a3631)
    A.S(tube('stand_x', (-0.12, -0.08, 0.17), (0.12, -0.08, 0.17), 0.012, 6), FRAME_BLACK)
    A.S(rev('silencer', (0.16, -0.30, 0.235), (0.20, -0.86, 0.265),
            [(0.0, 0.03), (0.08, 0.06), (0.5, 0.066), (0.9, 0.06), (1.0, 0.03)], seg=10), 0x5b554e, 'rust')
    A.S(tube('tailpipe', (0.20, -0.86, 0.265), (0.205, -0.92, 0.27), 0.018, 6), 0x4a4038, 'rust')
    A.S(polytube('kick', [(0.30, -0.52, 0.36), (0.32, -0.42, 0.30), (0.33, -0.36, 0.26)], 0.012, 5), CHROME, 'chrome')
    A.R(limb('kick_pad', (0.33, -0.37, 0.265), (0.39, -0.37, 0.265), 0.035, 0.022), 0x34312d)

    # ---- the cover: lofted drape, hem turned up with thickness
    table = cover_table(variant)
    P = cover_sampler(table)
    NU, NV = 24, 15
    wz0, wz1 = table[0][0], table[-1][0]
    secs = []
    for i in range(NU + 1):
        wz = wz0 + (wz1 - wz0) * i / NU
        ring = [cover_point(P, wz, j / NV, ph) for j in range(NV + 1)]
        # hem turn-up: 1.2 cm in, 3 cm up, both sides, so the edge has thickness from below
        l0, r0 = ring[0], ring[-1]
        ring = [(l0[0] + 0.012, l0[1], l0[2] + 0.03), (l0[0] + 0.012, l0[1], l0[2])] + ring + \
               [(r0[0] - 0.012, r0[1], r0[2]), (r0[0] - 0.012, r0[1], r0[2] + 0.03)]
        secs.append(ring)
    A.T(loft('cover', secs, closed=False, caps=False), tarp)

    # ---- rope(s) round the cover, a knot on the right side with two hanging ends; eyelets on the hem
    ROPE = 0x9a8a64
    ropes = [-0.40] if variant == 'a' else [-0.48, 0.47]
    for k, wr in enumerate(ropes):
        pts = [cover_point(P, wr + 0.01 * math.sin(j * 1.3), j / 14, ph, out=0.010) for j in range(15)]
        A.R(polytube('rope', pts, 0.008, 4), ROPE, 'rope')
        kn = cover_point(P, wr, 0.82, ph, out=0.016)
        A.R(rev('knot', (kn[0] - 0.012, kn[1], kn[2]), (kn[0] + 0.016, kn[1], kn[2]), [(0, 0.012), (0.5, 0.02), (1, 0.011)], seg=6), ROPE, 'rope')
        for e in (-1, 1):
            A.R(polytube('rope_end', [(kn[0] + 0.012, kn[1], kn[2]), (kn[0] + 0.03, kn[1] + e * 0.02, kn[2] - 0.08),
                                      (kn[0] + 0.036, kn[1] + e * 0.03, kn[2] - 0.17 - 0.03 * k)], 0.007, 4), ROPE, 'rope')
    for s_, side in ((0.0, -1), (1.0, 1)):
        for wz in (0.30, -0.25, -0.75):
            p = cover_point(P, wz, s_, ph)
            A.S(tube('eyelet', (p[0] - side * 0.002, p[1], p[2] + 0.018), (p[0] + side * 0.004, p[1], p[2] + 0.018), 0.009, 5, caps=True),
                0x8d8670, 'chrome')
    return kit


# ================================================================ motorcycle
M_FZ, M_RZ, M_HY = 0.65, -0.66, 0.318
LEAN = math.radians(-6.0)       # leans toward -wx (left) onto the side stand


def wire_wheel(A, cz, rear, seed):
    A.R(tread_tyre('tyre', cz, M_HY, 0.276, 0.042, seg=18, sides=5, depth=0.0045), RUBBER)
    A.S(arch.ring('rim', 0.0, cz, M_HY, 0.232, 0.013, axis='x', seg=16, tube=3), CHROME, 'chrome')
    hub_w = 0.075 if rear else 0.062
    hub = rev('hub', (-hub_w, cz, M_HY), (hub_w, cz, M_HY),
              [(0.0, 0.085 if rear else 0.075), (0.38, 0.085 if rear else 0.075), (0.45, 0.05), (1.0, 0.055)], seg=8)
    A.S(hub, ALLOY, 'alloy')
    segs = []
    for i in range(36):
        side = 1 if i % 2 == 0 else -1
        ar = i / 36 * math.tau + seed
        ah = ar + (0.55 if (i // 2) % 2 == 0 else -0.55)
        segs.append(((side * (hub_w - 0.012), cz + 0.058 * math.cos(ah), M_HY + 0.058 * math.sin(ah)),
                     (side * 0.003, cz + 0.225 * math.cos(ar), M_HY + 0.225 * math.sin(ar))))
    A.S(ribbons('spokes', segs, 0.0045), 0x8b8c89, 'chrome')
    if rear:   # sprocket on the left
        A.S(tube('sprocket', (-0.085, cz, M_HY), (-0.079, cz, M_HY), 0.085, 10, caps=True), 0x5a5652, 'rust')


def build_motorcycle(variant):
    kit = new_kit()
    A = Adder(kit)
    paint = 0x6c2c27 if variant == 'a' else 0x2f3b4b
    seed = 0.2 if variant == 'a' else 1.4

    wire_wheel(A, M_FZ, False, seed)
    wire_wheel(A, M_RZ, True, seed + 0.5)

    # ---- front end: telescopic fork with gaiters, yokes, headlamp nacelle + speedo, bar, levers, mirrors
    HEAD_T, HEAD_B = (0.0, 0.40, 0.95), (0.0, 0.46, 0.79)
    def fork_at(t):     # along the fork line from the axle (t=0) to the top yoke (t=1)
        a, b = (M_FZ - 0.03, M_HY), (0.40, 0.95)
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    for s in (-1, 1):
        x = s * 0.088
        z0, h0 = fork_at(0.0)
        z1, h1 = fork_at(0.36)
        z2, h2 = fork_at(0.56)
        z3, h3 = fork_at(1.0)
        A.S(tube('slider', (x, z0 + 0.03, h0 - 0.02), (x, z1, h1), 0.024, 6, caps=True), ALLOY, 'alloy')
        A.R(rev('gaiter', (x, z1, h1), (x, z2, h2), [(0, 0.027), (0.5, 0.032), (1, 0.025)], seg=6), 0x2e2d2b)
        A.S(tube('stanchion', (x, z2, h2), (x, z3, h3), 0.019, 8), CHROME, 'chrome')
    for zz, hh in ((fork_at(0.70)), (fork_at(0.98))):
        A.S(limb('yoke', (-0.11, zz, hh), (0.11, zz, hh), 0.05, 0.03), FRAME_BLACK)
    hl = (0.0, 0.47, 0.86)
    A.S(rev('nacelle', (0.0, hl[1] - 0.12, hl[2]), (0.0, hl[1] + 0.03, hl[2]),
            [(0.0, 0.05), (0.4, 0.088), (1.0, 0.098)], seg=12), paint)
    A.S(arch.ring('lamp_rim', 0.0, hl[1] + 0.035, hl[2], 0.093, 0.009, axis='z', seg=12, tube=3), CHROME, 'chrome')
    A.R(rev('lens', (0.0, hl[1] + 0.03, hl[2]), (0.0, hl[1] + 0.05, hl[2]), [(0, 0.088), (1.0, 0.05)], seg=12), 0xb6b2a2, 'rubber')
    A.S(rev('speedo', (0.0, 0.42, 0.97), (0.0, 0.44, 1.03), [(0, 0.04), (1, 0.045)], seg=8), FRAME_BLACK)
    A.R(tube('dial', (0.0, 0.44, 1.031), (0.0, 0.443, 1.036), 0.038, 8, caps=True), 0x6e6c62, 'rubber')
    turn = 0.06 if variant == 'a' else -0.08                       # bar turned a little, never dead straight
    def bar_pt(x, dz, h):
        c, s_ = math.cos(turn), math.sin(turn)
        return (x * c - dz * s_ * 0.0, 0.40 + dz + x * s_, h)
    bar = [bar_pt(-0.38, -0.10, 1.07), bar_pt(-0.25, -0.07, 1.06), bar_pt(-0.10, 0.0, 1.0), bar_pt(0.10, 0.0, 1.0),
           bar_pt(0.25, -0.07, 1.06), bar_pt(0.38, -0.10, 1.07)]
    A.S(polytube('bar', bar, 0.012, 5), CHROME, 'chrome')
    A.S(tube('bar_clamp', (0.0, 0.40, 0.95), (0.0, 0.40, 1.0), 0.016, 6), FRAME_BLACK)
    for s, i in ((-1, 0), (1, 5)):
        p, q = bar[i], bar[i - 1 if i else 1]
        A.R(tube('grip', p, (p[0] + (p[0] - q[0]) * -0.9, p[1] + (p[1] - q[1]) * -0.9, p[2] + (p[2] - q[2]) * -0.9), 0.017, 5, caps=True), 0x35302b)
        A.S(polytube('lever', [(p[0] * 0.66, p[1] + 0.03, p[2] - 0.01), (p[0] * 0.85, p[1] + 0.07, p[2] - 0.005), (p[0] * 0.98, p[1] + 0.06, p[2])], 0.006, 4), CHROME, 'chrome')
        A.S(limb('lever_block', (p[0] * 0.62, p[1] + 0.005, p[2] - 0.012), (p[0] * 0.70, p[1] + 0.01, p[2] - 0.012), 0.04, 0.035), FRAME_BLACK)
        m0 = (p[0] * 0.66, p[1] + 0.01, p[2])
        m1 = (p[0] * 0.80, p[1] - 0.03, p[2] + 0.15)
        A.S(tube('mirror_stalk', m0, m1, 0.006, 4), CHROME, 'chrome')
        A.S(rev('mirror', (m1[0], m1[1] - 0.008, m1[2] + 0.035), (m1[0], m1[1] + 0.012, m1[2] + 0.035), [(0, 0.05), (1, 0.042)], seg=7), CHROME, 'chrome')
    A.S(polytube('cable', [(0.08, 0.40, 1.0), (0.10, 0.46, 0.92), (0.09, 0.44, 0.80), (0.05, 0.36, 0.74)], 0.006, 4), FRAME_BLACK)

    # ---- front mudguard with stays and a blank plate
    A.S(fender('guard_f', M_FZ, M_HY, 0.318, 10, 150, 8, [(-0.06, -0.018), (-0.04, 0.0), (0.0, 0.006), (0.04, 0.0), (0.06, -0.018)]), paint)
    for s in (-1, 1):
        a = math.radians(55)
        A.S(tube('stay_f', (s * 0.085, M_FZ, M_HY), (s * 0.058, M_FZ + 0.31 * math.cos(a), M_HY + 0.31 * math.sin(a)), 0.005, 4), CHROME, 'chrome')
    A.S(limb('plate_f', (0.0, 0.775, 0.625), (0.0, 0.875, 0.585), 0.008, 0.085), 0xc7bfa4, 'paint')

    # ---- frame: down tube, backbone, cradle, seat rails, swing arm
    BK = FRAME_BLACK
    A.S(polytube('down', [(0.0, 0.43, 0.82), (0.0, 0.30, 0.55), (0.0, 0.24, 0.30), (0.0, 0.10, 0.20), (0.0, -0.18, 0.21)], 0.022, 5), BK)
    A.S(polytube('backbone', [(0.0, 0.41, 0.90), (0.0, 0.20, 0.86), (0.0, -0.10, 0.76), (0.0, -0.20, 0.70)], 0.024, 5), BK)
    A.S(tube('seat_post', (0.0, -0.20, 0.70), (0.0, -0.18, 0.21), 0.02, 6), BK)
    for s in (-1, 1):
        A.S(tube('rail', (s * 0.10, -0.18, 0.74), (s * 0.11, -0.86, 0.76), 0.012, 5), BK)
        A.S(tube('rail_brace', (s * 0.10, -0.20, 0.42), (s * 0.11, -0.60, 0.75), 0.011, 5), BK)
        A.S(limb('swingarm', (s * 0.105, -0.17, 0.36), (s * 0.105, M_RZ, M_HY), 0.035, 0.05), BK)
        # rear shock: chrome body + MODELLED coil spring
        lo, hi = (s * 0.125, M_RZ + 0.08, M_HY + 0.04), (s * 0.125, -0.42, 0.76)
        A.S(tube('shock_rod', lo, hi, 0.012, 6), CHROME, 'chrome')
        A.S(tube('shock_cap', (lo[0], lo[1] + (hi[1] - lo[1]) * 0.62, lo[2] + (hi[2] - lo[2]) * 0.62), hi, 0.032, 6, caps=True), CHROME, 'chrome')
        d = (Vector(hi) - Vector(lo))
        dn = d.normalized()
        u = Vector((1, 0, 0))
        v = Vector((0, -dn[2], dn[1]))   # perpendicular in the (wz, h) plane
        pts = []
        for k in range(17):
            t = 0.10 + 0.48 * k / 16
            a = k / 4 * math.tau
            c = Vector(lo) + d * t
            pts.append(tuple(c + (u * math.cos(a) + v * math.sin(a)) * 0.026))
        A.S(polytube('spring', pts, 0.006, 3), CHROME if variant == 'a' else 0x3a3c40, 'chrome')
    A.S(tube('pivot', (-0.13, -0.17, 0.36), (0.13, -0.17, 0.36), 0.02, 6, caps=True), BK)

    # ---- engine: crankcase, finned barrel and head (tilted forward), side covers, carburettor + filter
    case = [(0.20, 0.22), (0.22, 0.30), (0.18, 0.40), (0.06, 0.44), (-0.12, 0.42), (-0.20, 0.36), (-0.20, 0.25), (-0.12, 0.20), (0.06, 0.19)]
    A.S(arch.prism_x('crankcase', -0.105, 0.105, case), ALLOY, 'alloy')
    for s in (-1, 1):
        A.S(rev('side_cover', (s * 0.105, 0.06, 0.31), (s * 0.135, 0.06, 0.31), [(0, 0.10), (1, 0.07)], seg=10), ALLOY, 'alloy')
    tilt = math.radians(14)
    base = Vector((0.0, 0.08, 0.44))
    ax = Vector((0.0, math.sin(tilt), math.cos(tilt)))
    top = base + ax * 0.30
    A.S(tube('barrel', tuple(base), tuple(top), 0.058, 8, caps=True), 0x5f5c56, 'alloy')
    for k in range(7):
        c = base + ax * (0.035 + k * 0.038)
        w = 0.078 if k < 5 else 0.086                                   # head fins a touch wider than the barrel's
        A.S(limb('fin', tuple(c - ax * 0.003), tuple(c + ax * 0.003), w * 2, w * 1.75), 0x6a665e if k < 5 else 0x726d64, 'alloy')
    A.S(tube('plug', tuple(top - ax * 0.02 + Vector((0.0, -0.05, 0.0))), tuple(top + ax * 0.03 + Vector((0.0, -0.06, 0.0))), 0.009, 5, caps=True), 0x9a958a, 'chrome')
    A.S(tube('carb', (0.0, 0.0, 0.52), (0.0, -0.12, 0.54), 0.03, 6, caps=True), ALLOY, 'alloy')
    A.S(rev('filter', (0.0, -0.12, 0.54), (0.0, -0.22, 0.56), [(0, 0.06), (1, 0.06)], seg=8), FRAME_BLACK)
    A.S(polytube('kick', [(0.14, -0.12, 0.32), (0.18, -0.18, 0.26), (0.19, -0.32, 0.30)], 0.012, 5), CHROME, 'chrome')
    A.S(polytube('gear', [(-0.13, 0.02, 0.33), (-0.17, 0.12, 0.26), (-0.18, 0.20, 0.27)], 0.009, 4), CHROME, 'chrome')
    for s in (-1, 1):
        A.S(tube('peg_bar', (s * 0.04, 0.06, 0.24), (s * 0.15, 0.06, 0.24), 0.011, 5), BK)
        A.R(tube('peg', (s * 0.15, 0.06, 0.24), (s * 0.25, 0.06, 0.24), 0.018, 5, caps=True), 0x34302b)

    # ---- exhaust: header bends down and back on the right to a long cigar silencer
    hdr = top - ax * 0.20 + Vector((0.0, 0.07, 0.0))
    A.S(polytube('header', [tuple(hdr), (0.07, 0.24, 0.42), (0.13, 0.26, 0.30), (0.16, 0.18, 0.22), (0.165, -0.05, 0.215), (0.17, -0.26, 0.24)],
                 0.022, 5), 0x8c877d, 'chrome')
    A.S(rev('silencer', (0.17, -0.24, 0.24), (0.18, -0.98, 0.34), [(0.0, 0.026), (0.1, 0.05), (0.85, 0.054), (1.0, 0.03)], seg=8), CHROME, 'chrome')

    # ---- chain, chain guard, rear mudguard, blank plate, tail lamp, carrier (A only)
    A.S(tube('chain_u', (-0.08, 0.10, 0.36), (-0.082, M_RZ, M_HY + 0.083), 0.006, 4), 0x4a3526, 'rust')
    A.S(tube('chain_l', (-0.08, 0.10, 0.29), (-0.082, M_RZ, M_HY - 0.083), 0.006, 4), 0x4a3526, 'rust')
    A.S(arch.prism_x('chain_guard', -0.105, -0.095, [(0.12, 0.40), (-0.65, M_HY + 0.11), (-0.70, M_HY + 0.06), (-0.62, M_HY + 0.075), (0.10, 0.37)]), paint)
    A.S(fender('guard_r', M_RZ, M_HY, 0.325, 25, 200, 9, [(-0.07, -0.02), (-0.05, 0.0), (0.0, 0.006), (0.05, 0.0), (0.07, -0.02)]), paint)
    for s in (-1, 1):
        a = math.radians(175)
        A.S(tube('stay_r', (s * 0.105, M_RZ, M_HY), (s * 0.07, M_RZ + 0.32 * math.cos(a), M_HY + 0.32 * math.sin(a)), 0.006, 4), BK)
    a = math.radians(195)
    pz, ph = M_RZ + 0.33 * math.cos(a), M_HY + 0.33 * math.sin(a)
    A.S(limb('plate_r', (-0.10, pz - 0.008, ph), (0.10, pz - 0.008, ph), 0.13, 0.008), 0xc4bba0, 'paint')
    A.R(rev('tail_lamp', (0.0, pz + 0.02, ph + 0.12), (0.0, pz - 0.06, ph + 0.12), [(0, 0.03), (1, 0.045)], seg=8), 0x7e2b24)

    # ---- tank (teardrop loft), knee pads, chrome cap; long flat seat with strap; tool boxes
    tank = [(0.40, 0.05, 0.93, 0.86), (0.34, 0.12, 0.99, 0.82), (0.22, 0.155, 1.01, 0.79), (0.08, 0.15, 0.995, 0.78),
            (-0.04, 0.12, 0.96, 0.785), (-0.12, 0.06, 0.90, 0.80)]
    secs = []
    for wz, hw, tp, bt in tank:
        ring = []
        for i in range(8):
            a = i / 8 * math.tau
            x = hw * math.sin(a)
            hmid, hr = (tp + bt) / 2, (tp - bt) / 2
            ca = math.cos(a)
            ring.append((x, wz, hmid + hr * (abs(ca) ** 0.8) * (1 if ca >= 0 else -1)))
        secs.append(ring)
    A.S(loft('tank', secs), paint)
    A.S(tube('tank_cap', (0.0, 0.25, 1.0), (0.0, 0.25, 1.022), 0.034, 8, caps=True), CHROME, 'chrome')
    for s in (-1, 1):
        A.R(limb('knee_pad', (s * 0.148, 0.10, 0.86), (s * 0.140, -0.02, 0.85), 0.012, 0.075), 0x2f2c29)
    seat = []
    for wz, hw, tp in ((-0.10, 0.11, 0.85), (-0.16, 0.14, 0.90), (-0.40, 0.15, 0.905), (-0.66, 0.14, 0.90), (-0.80, 0.12, 0.87)):
        seat.append([(-hw, wz, 0.775), (-hw, wz, tp - 0.03), (-hw * 0.75, wz, tp), (hw * 0.75, wz, tp), (hw, wz, tp - 0.03), (hw, wz, 0.775)])
    A.R(loft('seat', seat), 0x2e2620, 'leather')
    A.R(polytube('strap', [(-0.152, -0.36, 0.80), (-0.13, -0.36, 0.912), (0.13, -0.36, 0.912), (0.152, -0.36, 0.80)], 0.009, 4), 0x2c241e, 'leather')
    for s in (-1, 1):
        A.S(limb('toolbox', (s * 0.145, -0.47, 0.62), (s * 0.145, -0.21, 0.62), 0.06, 0.19), paint)
    if variant == 'a':
        for s in (-1, 1):
            A.S(tube('carrier', (s * 0.10, -0.78, 0.82), (s * 0.10, -1.02, 0.80), 0.009, 5), CHROME, 'chrome')
            A.S(tube('carrier_leg', (s * 0.10, -1.0, 0.80), (s * 0.115, -0.86, 0.62), 0.008, 4), CHROME, 'chrome')
        for wz in (-0.84, -0.93, -1.02):
            A.S(tube('carrier_x', (-0.10, wz, 0.815), (0.10, wz, 0.815), 0.008, 4), CHROME, 'chrome')
    else:
        A.S(polytube('grab', [(-0.11, -0.70, 0.79), (-0.12, -0.85, 0.82), (0.0, -0.90, 0.83), (0.12, -0.85, 0.82), (0.11, -0.70, 0.79)], 0.011, 5), CHROME, 'chrome')

    # ---- side stand (left): authored in the leaned frame so its foot lands on the ground after LEAN
    rot = Matrix.Rotation(LEAN, 4, 'Y')
    inv = rot.inverted()
    foot_world = Vector((-0.30, -(-0.05), 0.012))          # Blender coords of the foot on the ground
    foot = inv @ foot_world
    foot_a = (foot.x, -foot.y, foot.z)
    A.S(tube('side_stand', (-0.10, 0.04, 0.24), foot_a, 0.013, 6), BK)
    A.S(limb('stand_pad', (foot_a[0], foot_a[1] - 0.03, foot_a[2]), (foot_a[0], foot_a[1] + 0.03, foot_a[2]), 0.05, 0.012), BK)

    # lean the whole bike over: every object gets the same rotation about the ground line under the wheels
    for _, o, _ in kit.records:
        o.data.transform(o.matrix_world)
        o.matrix_world.identity()
        o.data.transform(rot)
    return kit


# ================================================================ export, count, render
def tri_count(objs):
    t = 0
    for o in objs:
        o.data.calc_loop_triangles()
        t += len(o.data.loop_triangles)
    return t


def render(path, loc, look, lens=40):
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    if 'ground' not in bpy.data.objects:
        gm = load_pbr_material('ground_m', 'dryearth', repeat=(0.5, 0.5))
        bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
        g = bpy.context.active_object
        g.name = 'ground'
        g.data.materials.append(gm)
        box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'AgX'
    if 'sun' not in bpy.data.objects:
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
        w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
        sun.rotation_euler = tuple(math.radians(x) for x in (50, 0, 60))
    cam = bpy.data.objects.get('cam')
    if cam is None:
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    sc.camera = cam
    cam.location = Vector(loc)
    cam.data.lens = lens
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


if __name__ == '__main__':
    do_render = '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--'):]
    shots = os.path.join(ROOT, 'docs', 'shots', 'assets-scooter')
    jobs = [('scooter_covered_v2', build_scooter, 'a'), ('scooter_covered_v2_b', build_scooter, 'b'),
            ('scooter_motorcycle_v2', build_motorcycle, 'a'), ('scooter_motorcycle_v2_b', build_motorcycle, 'b')]
    for slot, fn, var in jobs:
        kit = fn(var)
        if os.environ.get('TRI_DEBUG'):
            agg = {}
            for _, o, _ in kit.records:
                o.data.calc_loop_triangles()
                k = o.name.split('.')[0]
                agg[k] = agg.get(k, 0) + len(o.data.loop_triangles)
            print('BREAKDOWN', slot, sorted(agg.items(), key=lambda kv: -kv[1]))
        kit.finalize(os.path.join(ROOT, 'tmp', slot + '_raw.glb'), {}, drift_amp=0.05, ao_strength=0.45)
        objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('hb_')]
        for o in objs:
            print('mesh', slot, o.name, 'tris', tri_count([o]))
        print('TRIANGLES', slot, tri_count(objs))
        if do_render:
            # Blender frame: front (+wz) is Blender -Y. Three-quarter view from the right front, and one from the left rear.
            render(os.path.join(shots, slot + '_front34.png'), (2.3, -2.0, 1.15), (0.0, -0.05, 0.48))
            render(os.path.join(shots, slot + '_rear34.png'), (-2.2, 2.1, 1.3), (0.0, 0.0, 0.48))
