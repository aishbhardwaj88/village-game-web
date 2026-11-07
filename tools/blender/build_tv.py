"""
TV family (VILLAGE_VOCABULARY.md sections 5 and 13: "neighbours in a doorway watching one TV", "a Doordarshan TV in a
wooden cabinet"), 7 Nov. One small prop, two variants. Generic: no brand, no badge, no lettering anywhere.

  tv_cabinet_v2   : a 1990s CRT colour set inside a varnished wooden cabinet with two overlay shutters (fielded panels,
        brass knobs, hinge barrels) swung open, a lace doily on the cabinet top, standing on a low four-leg plank stool.
        Beside it an old square ghee tin filled with concrete holds a 6.2 m bamboo pole (MODELLED nodes, a slight bend)
        carrying a Yagi aerial (boom, folded dipole on a plastic box, reflector, five directors, one bent by a crow), the
        coax taped down the pole, across the ground and into the back of the cabinet.
  tv_cabinet_v2_b : the same set on a small table with turned legs and a lower shelf, a lace cloth hanging over the
        table edges, one shutter folded right back and the other only half open, a darker cabinet; a 5.6 m pole whose
        aerial has four directors, one snapped short, and the boom pointing another way.

CRT: tapered rear shell, a curved (bulged) screen behind a moulded bezel, a control column on the right with two ribbed
rotary knobs, a row of push buttons, a power button, a dim lamp and a slatted speaker grille, all MODELLED. The screen is
a dense grid whose vertex colour carries the grey-blue static (speckle + scan-line banding), so it costs no texture.

FACING: the screen faces +Z (glTF/three.js +Z = arch frame +wz). Origin on the ground under the middle of the stool.
Footprint: stool ~0.6 x 0.5 m, the pole tin at (+0.95, -0.30). Aerial up at 6 m.
Meshes per model: hb_wood (cabinet, stool, bamboo: the shared 'wood' set, repeat 1.0), hb_metal (tin, aerial, hinges,
knob brass: the shared 'metal' set, repeat 1.0), hb_main (plastic shell, screen, cloth, cable, tape, concrete: the shared
plaster set, repeat 0.5). Colour and wear are per-vertex, then Kit.finalize's dirty-vertex AO.

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_tv.py [-- render]
  for s in tv_cabinet_v2 tv_cabinet_v2_b; do
    node tools/shrink.js tmp/${s}_raw.glb public/assets/models/$s.glb 999999
    node tools/strip-textures.mjs --relink public/assets/models/$s.glb public/assets/models/$s.glb
  done
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import limb, new_bmesh_obj, load_pbr_material, box_uv, hex_to_linear_rgb, wb as _wb


PLAIN = {'grille', 'btn', 'lamp', 'power', 'vent', 'lip', 'hasp', 'trim', 'tin_bead', 'apron', 'stretch', 'dpanel', 'back',
         'bottom', 'fill', 'mould', 'dbox', 'dboard', 'shelf', 'plinth'}


def wb(name, x0, x1, z0, z1, h0, h1, bevel=0.012):
    if name in PLAIN:       # small or hidden pieces: a plain 12-triangle box (keeps the file under 80 KB)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(abs(x1 - x0), abs(z1 - z0), abs(h1 - h0)), verts=bm.verts)
        bmesh.ops.translate(bm, vec=((x0 + x1) / 2, -(z0 + z1) / 2, (h0 + h1) / 2), verts=bm.verts)
        return new_bmesh_obj(name, bm)
    return _wb(name, x0, x1, z0, z1, h0, h1, bevel, segments=1)   # one bevel ring: the edge catches light, half the triangles
import arch
from arch import Kit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RND = random.Random(1987)


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


def rev(name, a, b, prof, seg=10, caps=True, smooth=True):
    """Surface of revolution about a->b; prof = [(t 0..1 along the axis, radius)]."""
    A, Bv = B(a), B(b)
    d = Bv - A
    Ln = d.length
    d.normalize()
    u, v = _frame(d)
    bm = bmesh.new()
    rings = []
    for t, r in prof:
        c = A + d * (t * Ln)
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


def polytube(name, pts, r, sides=5, caps=False):
    P = [B(p) for p in pts]
    n = len(P)
    tans = [(P[min(n - 1, i + 1)] - P[max(0, i - 1)]).normalized() for i in range(n)]
    u, _ = _frame(tans[0])
    bm = bmesh.new()
    rings = []
    for i in range(n):
        t = tans[i]
        u = (u - t * t.dot(u)).normalized()
        v = t.cross(u).normalized()
        rings.append([bm.verts.new(P[i] + (u * math.cos(k / sides * math.tau) + v * math.sin(k / sides * math.tau)) * r) for k in range(sides)])
    for i in range(n - 1):
        for k in range(sides):
            m = (k + 1) % sides
            bm.faces.new((rings[i][k], rings[i][m], rings[i + 1][m], rings[i + 1][k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm), sides >= 5)


def loft(name, sections, closed=True, caps=True, smooth=False):
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


def grid(name, nu, nv, fn):
    """An open sheet: fn(u, v) -> arch point, u, v in 0..1."""
    bm = bmesh.new()
    vs = [[bm.verts.new(B(fn(i / nu, j / nv))) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _smooth(new_bmesh_obj(name, bm))


def bake(o, M):
    """Apply the object's own transform, then M (a Blender-space matrix)."""
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
    o.data.transform(M)
    return o


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


DUST, SOOT = 0x75695a, 0x2e2925


def wear_colour(obj, base_hex, mode, seed):
    me = obj.data
    if 'Base' not in me.color_attributes:
        me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    layer = me.color_attributes['Base']
    base = L(base_hex)
    unit = 1.0 + RND.uniform(-0.07, 0.07)       # per-piece tone: no two boards the same
    out = []
    for lp in me.loops:
        v = me.vertices[lp.vertex_index]
        x, y, z = v.co
        n = v.normal
        j = 1.0 + (_hash(x, y, z, seed) - 0.5) * 0.10
        c = [ch * unit * j for ch in base]
        low = max(0.0, (0.30 - z) / 0.30)
        if mode == 'teak':          # varnished wood: sun-faded tops, dust low down, rubbed paler edges by hand height
            c = _lerp(c, _lerp(c, L(0x9a8062), 0.5), 0.35 * max(0.0, n.z))
            c = _lerp(c, L(DUST), 0.06 + 0.40 * low)
            if _hash(round(x * 50), round(y * 50), round(z * 50), seed + 3) > 0.93:
                c = _lerp(c, L(0x8c6a48), 0.5)                                   # varnish chips to paler bare wood
        elif mode == 'bamboo':       # weathered grey above, still a little yellow-green near the ground, dark nodes
            g = min(1.0, z / 3.0)
            c = _lerp(c, L(0x8e8a7c), 0.55 * g)
            c = _lerp(c, L(0x4a4030), 0.35 * max(0.0, math.sin(z * 9 + seed) * math.sin(x * 40 + y * 30)))
            c = _lerp(c, L(DUST), 0.30 * low)
        elif mode == 'node':
            c = _lerp(c, L(0x4c4234), 0.45)
        elif mode == 'plastic':     # set's shell: dust on the top faces, a little sun-fade
            c = _lerp(c, L(0x8a8478), 0.30 * max(0.0, n.z) ** 2)
        elif mode == 'screen':      # grey-blue static: speckle + scan-line bands + a brighter centre (CRT bloom)
            r = math.hypot(x - obj.get('cx', 0.0), z - obj.get('cz', 0.0)) / 0.2
            sp = _hash(round(x * 300), round(y * 300), round(z * 300), seed)
            band = 0.5 + 0.5 * math.sin(z * 260 + seed)
            k = 0.55 + 0.30 * sp + 0.12 * band - 0.25 * min(1.0, r * r)
            c = [ch * k for ch in base]
        elif mode == 'alu':         # oxidised aluminium: chalky, dark rain streaks
            c = _lerp(c, L(0x5c5a55), 0.35 * max(0.0, math.sin(x * 70 + y * 50 + seed)) ** 4)
        elif mode == 'tin':         # an old ghee tin: paint gone, rust low down and on the seams
            c = _lerp(c, L(0x6a4430), 0.08 + 0.35 * max(0.0, (0.20 - z) / 0.20) + 0.25 * max(0.0, math.sin(x * 60 + z * 45 + seed)) ** 3)
            c = _lerp(c, L(DUST), 0.25 * low)
        elif mode == 'brass':
            c = _lerp(c, L(0x4e4430), 0.35 * (0.5 + 0.5 * math.sin(x * 400 + z * 300)))
        elif mode == 'cloth':       # lace: open-work read as tone, a little yellowed
            hole = (0.5 + 0.5 * math.sin(x * 220) * math.sin(y * 220)) ** 3
            c = _lerp(c, L(0x8a7e68), 0.28 * hole + 0.10)
        elif mode == 'cable':
            c = _lerp(c, L(DUST), 0.15 + 0.5 * low)
        elif mode == 'concrete':
            c = _lerp(c, L(DUST), 0.25 + 0.25 * _hash(round(x * 40), round(y * 40), 0, seed))
        out.extend((min(c[0], 0.85), min(c[1], 0.85), min(c[2], 0.85), 1.0))
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

    def W(self, o, col, wear='teak'):           # wood -> hb_wood
        o['wear'] = wear
        return self.kit.add('teak', o, jit(col, 0.05))

    def M(self, o, col, wear='alu'):            # metal -> hb_metal
        o['wear'] = wear
        return self.kit.add('alu', o, jit(col, 0.04))

    def P(self, o, col, wear='plastic'):        # plastic, glass, cloth, cable, concrete -> hb_main
        o['wear'] = wear
        return self.kit.add('plastic', o, jit(col, 0.03))


# ================================================================ the set
SHELL = 0x4a4642      # warm charcoal plastic, never pure black
SHELL_B = 0x5a5048    # B: the brown-wood-effect plastic of an older set
SCREEN = 0x9aa6ac
BRASS = 0xa08a4c


def build(variant):
    kit = Kit(split_props=False, route={'teak': 'wood', 'alu': 'metal'})
    A = Adder(kit)
    wood = 0x9a6a46 if variant == 'a' else 0x7a5238
    stool_wood = 0xa88c66 if variant == 'a' else 0x92704e

    # ---------------- stand
    if variant == 'a':      # low plank stool: four legs, aprons, side stretchers, three top planks with gaps
        top = 0.50
        for sx in (-1, 1):
            for sz in (-1, 1):
                lx, lz = sx * 0.245 + RND.uniform(-0.006, 0.006), sz * 0.185 + RND.uniform(-0.006, 0.006)
                A.W(limb('leg', (lx + sx * 0.012, lz + sz * 0.010, 0.0), (lx, lz, top - 0.005), 0.046, 0.046), jit(stool_wood, 0.08))
            A.W(wb('apron', sx * 0.245 - 0.012, sx * 0.245 + 0.012, -0.17, 0.17, top - 0.075, top - 0.012, 0.004), stool_wood)
            A.W(wb('stretch', sx * 0.25 - 0.011, sx * 0.25 + 0.011, -0.18, 0.18, 0.10, 0.135, 0.004), stool_wood)
        for sz in (-1, 1):
            A.W(wb('apron', -0.23, 0.23, sz * 0.185 - 0.012, sz * 0.185 + 0.012, top - 0.075, top - 0.012, 0.004), stool_wood)
        for k, wz in enumerate((-0.155, 0.0, 0.155)):
            A.W(wb('plank', -0.30 + RND.uniform(-0.01, 0.01), 0.30 + RND.uniform(-0.01, 0.01), wz - 0.071, wz + 0.071,
                   top - 0.012 + RND.uniform(-0.002, 0.002), top + 0.016, 0.005), jit(stool_wood, 0.1))
        hb = top + 0.016
    else:                   # small table: turned legs, a lower shelf, a lace cloth hanging over the edges
        top = 0.60
        prof = [(0.0, 0.020), (0.06, 0.024), (0.12, 0.018), (0.45, 0.022), (0.55, 0.027), (0.62, 0.020), (0.86, 0.020), (0.88, 0.026), (1.0, 0.026)]
        for sx in (-1, 1):
            for sz in (-1, 1):
                A.W(rev('tleg', (sx * 0.26, sz * 0.19, 0.0), (sx * 0.26, sz * 0.19, top - 0.02), prof, seg=7), stool_wood)
        A.W(wb('shelf', -0.28, 0.28, -0.21, 0.21, 0.15, 0.17, 0.004), stool_wood)
        for sx in (-1, 1):
            A.W(wb('apron', sx * 0.26 - 0.01, sx * 0.26 + 0.01, -0.17, 0.17, top - 0.09, top - 0.02, 0.004), stool_wood)
        for sz in (-1, 1):
            A.W(wb('apron', -0.24, 0.24, sz * 0.19 - 0.01, sz * 0.19 + 0.01, top - 0.09, top - 0.02, 0.004), stool_wood)
        A.W(wb('ttop', -0.31, 0.31, -0.235, 0.235, top - 0.02, top + 0.005, 0.005), stool_wood)
        # lace cloth: flat on the top, folding over the edge and hanging 9 cm with a scalloped hem
        HX, HZ, DROP = 0.31, 0.235, 0.09
        def cloth(u, v):
            x = (u - 0.5) * 2 * (HX + DROP)
            z = (v - 0.5) * 2 * (HZ + DROP)
            ox, oz = max(0.0, abs(x) - HX), max(0.0, abs(z) - HZ)
            o = max(ox, oz)
            hy = top + 0.008
            if o > 0:
                x = math.copysign(min(abs(x), HX + 0.006), x) if ox > 0 else x
                z = math.copysign(min(abs(z), HZ + 0.006), z) if oz > 0 else z
                hem = 0.012 * abs(math.sin((x + z) * 40))         # scallops
                hy = top + 0.008 - o + (hem if o > DROP * 0.85 else 0.0)
                x += math.copysign(0.004 * (o / DROP), x) if ox > 0 else 0.0
                z += math.copysign(0.004 * (o / DROP), z) if oz > 0 else 0.0
            return (x, z, hy)
        A.P(grid('cloth', 12, 9, cloth), 0xd8d0be, 'cloth')
        hb = top + 0.010

    # ---------------- cabinet (W x D x H), boards 2 cm, overhanging top with a thin moulding, feet
    W, D, H, t = 0.66, 0.50, 0.58, 0.02
    if variant == 'a':
        for sx in (-1, 1):
            for sz in (-1, 1):
                A.W(rev('foot', (sx * 0.29, sz * 0.20, hb), (sx * 0.29, sz * 0.20, hb + 0.035), [(0, 0.022), (0.5, 0.03), (1, 0.026)], seg=8), wood)
        hb += 0.035
    else:
        A.W(wb('plinth', -W / 2 + 0.03, W / 2 - 0.03, -D / 2 + 0.03, D / 2 - 0.03, hb, hb + 0.03, 0.004), wood)
        hb += 0.03
    A.W(wb('bottom', -W / 2, W / 2, -D / 2, D / 2, hb, hb + t, 0.003), wood)
    A.W(wb('side', -W / 2, -W / 2 + t, -D / 2, D / 2, hb + t, hb + H - t, 0.003), wood)
    A.W(wb('side', W / 2 - t, W / 2, -D / 2, D / 2, hb + t, hb + H - t, 0.003), wood)
    A.W(wb('back', -W / 2 + t, W / 2 - t, -D / 2, -D / 2 + 0.012, hb + t, hb + H - t, 0.002), jit(wood, 0.1))
    A.W(wb('top', -W / 2 - 0.018, W / 2 + 0.018, -D / 2 - 0.01, D / 2 + 0.018, hb + H - t, hb + H + 0.004, 0.005), wood)
    A.W(wb('mould', -W / 2 - 0.008, W / 2 + 0.008, D / 2, D / 2 + 0.012, hb + H - t - 0.018, hb + H - t, 0.003), jit(wood, 0.08))
    # face frame: stiles and rails proud of the carcass edge
    A.W(wb('stile', -W / 2, -W / 2 + 0.035, D / 2 - 0.005, D / 2 + 0.006, hb, hb + H - t, 0.003), wood)
    A.W(wb('stile', W / 2 - 0.035, W / 2, D / 2 - 0.005, D / 2 + 0.006, hb, hb + H - t, 0.003), wood)
    A.W(wb('rail', -W / 2, W / 2, D / 2 - 0.005, D / 2 + 0.006, hb, hb + 0.04, 0.003), wood)
    # lace doily on the top, scalloped edge, slightly off-centre and turned
    dc = (RND.uniform(-0.05, 0.05), RND.uniform(-0.03, 0.03))
    rot = RND.uniform(0, 1)
    bm = bmesh.new()
    ring = []
    for i in range(24):
        a = i / 24 * math.tau + rot
        r = (0.20 if variant == 'a' else 0.17) * (1.0 + 0.06 * math.cos(a * 12))
        ring.append(bm.verts.new(B((dc[0] + r * math.cos(a) * 1.25, dc[1] + r * math.sin(a), hb + H + 0.006))))
    c = bm.verts.new(B((dc[0], dc[1], hb + H + 0.006)))
    for i in range(24):
        bm.faces.new((c, ring[i], ring[(i + 1) % 24]))
    A.P(new_bmesh_obj('doily', bm), 0xdcd4c0, 'cloth')

    # ---------------- doors: overlay shutters, frame + recessed panel + raised field, brass knob, two hinge barrels
    open_ang = (math.radians(104), math.radians(118)) if variant == 'a' else (math.radians(168), math.radians(78))
    dh0, dh1 = hb + 0.045, hb + H - t - 0.022
    DW, DT = W / 2 - 0.004, 0.018
    for side, ang in ((-1, open_ang[0]), (1, open_ang[1])):
        hx = side * (W / 2)                     # hinge line on the outer front edge
        pieces = []
        # built CLOSED: the door spans from the hinge (hx) inward by DW, in front of the face frame
        def span(u0, u1):
            a, b = hx - side * u0, hx - side * u1
            return min(a, b), max(a, b)
        fz0, fz1 = D / 2 + 0.007, D / 2 + 0.007 + DT
        sw = 0.045
        x0, x1 = span(0.0, sw); pieces.append(wb('dstile', x0, x1, fz0, fz1, dh0, dh1, 0.003))
        x0, x1 = span(DW - sw, DW); pieces.append(wb('dstile', x0, x1, fz0, fz1, dh0, dh1, 0.003))
        x0, x1 = span(sw, DW - sw)
        pieces.append(wb('drail', x0, x1, fz0, fz1, dh1 - 0.05, dh1, 0.003))
        pieces.append(wb('drail', x0, x1, fz0, fz1, dh0, dh0 + 0.06, 0.003))
        pieces.append(wb('dpanel', x0, x1, fz0 + 0.002, fz0 + 0.010, dh0 + 0.06, dh1 - 0.05, 0.002))
        if variant == 'a':      # raised field
            pieces.append(wb('dfield', x0 + 0.03, x1 - 0.03, fz0 + 0.010, fz0 + 0.016, dh0 + 0.09, dh1 - 0.08, 0.006))
        else:                   # two vertical grooves read as three boards
            w3 = (x1 - x0) / 3
            for k in range(3):
                pieces.append(wb('dboard', x0 + k * w3 + 0.003, x0 + (k + 1) * w3 - 0.003, fz0 + 0.010, fz0 + 0.015, dh0 + 0.06, dh1 - 0.05, 0.002))
        dcol = jit(wood, 0.06)
        metal_pieces = []
        kx = hx - side * (DW - 0.03)
        metal_pieces.append((rev('knob', (kx, fz1, (dh0 + dh1) / 2), (kx, fz1 + 0.03, (dh0 + dh1) / 2), [(0, 0.008), (0.5, 0.006), (0.8, 0.014), (1, 0.010)], seg=8), BRASS, 'brass'))
        for hh in (dh0 + 0.07, dh1 - 0.07):
            metal_pieces.append((tube('hinge', (hx, fz0 - 0.002, hh - 0.035), (hx, fz0 - 0.002, hh + 0.035), 0.006, 6, caps=True), 0x8a7a50, 'brass'))
        if side == 1:           # a hasp on the right door (the set is locked up at night, the key with the eldest)
            metal_pieces.append((wb('hasp', kx - side * 0.012 - 0.01, kx - side * 0.012 + 0.01, fz1, fz1 + 0.004, dh0 + 0.16, dh0 + 0.24, 0.001), 0x6e6450, 'brass'))
        pivot = B((hx, fz0, 0.0))
        R = Matrix.Translation(pivot) @ Matrix.Rotation(side * ang, 4, 'Z') @ Matrix.Translation(-pivot)
        for o in pieces:
            A.W(bake(o, R), dcol)
        for o, col, wr in metal_pieces:
            A.M(bake(o, R), col, wr)

    # ---------------- the CRT, sitting on the cabinet floor, its bezel 2.5 cm behind the face frame
    shell = SHELL if variant == 'a' else SHELL_B
    TW, TH = 0.56, 0.46
    th0 = hb + t + 0.004
    fz = D / 2 - 0.025                          # bezel front plane
    cz = th0 + TH / 2
    A.P(wb('bezel', -TW / 2, TW / 2, fz - 0.10, fz - 0.012, th0, th0 + TH, 0.014), shell)
    # rear shell tapers to the neck: lofted from the bezel back to a small box at the cabinet back
    secs = []
    for wz, hw, hh, dz in ((fz - 0.10, TW / 2 - 0.01, TH / 2 - 0.01, 0.0), (fz - 0.22, TW / 2 - 0.04, TH / 2 - 0.04, -0.01),
                           (fz - 0.34, 0.17, 0.15, -0.03), (-D / 2 + 0.02, 0.13, 0.11, -0.05)):
        cc = cz + dz
        secs.append([(-hw, wz, cc - hh), (hw, wz, cc - hh), (hw, wz, cc + hh), (-hw, wz, cc + hh)])
    A.P(loft('rear', secs), jit(shell, 0.05))
    for k in range(6):                          # vent slots moulded on the rear top
        wz = fz - 0.25 - k * 0.022
        A.P(limb('vent', (-0.10, wz, cz + 0.155 - 0.03 * (k / 5) - 0.012), (0.10, wz, cz + 0.155 - 0.03 * (k / 5) - 0.012), 0.008, 0.010), jit(shell, 0.1))
    # screen: 4:3, rounded corners, bulged face, offset left; a bezel lip all round it
    SX, SW, SH = -0.055, 0.40, 0.30
    def scr(u, v):
        nx, ny = (u - 0.5) * 2, (v - 0.5) * 2
        # pull the corners in (superellipse) so the tube reads rounded
        k = (abs(nx) ** 5 + abs(ny) ** 5) ** 0.2
        s = 1.0 if k < 1e-6 else max(abs(nx), abs(ny)) / k
        nx, ny = nx * s, ny * s
        bulge = 0.016 * (1 - 0.5 * (nx * nx + ny * ny))
        return (SX + nx * SW / 2, fz - 0.014 + bulge, cz + 0.02 + ny * SH / 2)
    so = grid('screen', 14, 10, scr)
    so['cz'] = cz + 0.02
    so['cx'] = SX
    A.P(so, SCREEN, 'screen')
    lip = 0.022
    for (x0, x1, h0, h1) in ((SX - SW / 2 - lip, SX + SW / 2 + lip, cz + 0.02 + SH / 2, cz + 0.02 + SH / 2 + lip),
                             (SX - SW / 2 - lip, SX + SW / 2 + lip, cz + 0.02 - SH / 2 - lip, cz + 0.02 - SH / 2),
                             (SX - SW / 2 - lip, SX - SW / 2 + 0.004, cz + 0.02 - SH / 2, cz + 0.02 + SH / 2),
                             (SX + SW / 2 - 0.004, SX + SW / 2 + lip, cz + 0.02 - SH / 2, cz + 0.02 + SH / 2)):
        A.P(wb('lip', x0, x1, fz - 0.014, fz, h0, h1, 0.004), jit(shell, 0.04))
    # control column on the right: two ribbed rotary knobs, push buttons, power button, lamp, speaker slats
    CX = 0.215
    for k, hh in enumerate((cz + 0.13, cz + 0.035)):
        rib = [(0, 0.032), (0.15, 0.032), (0.2, 0.026), (0.95, 0.025), (1.0, 0.018)]
        knob = rev('dial', (CX, fz - 0.012, hh), (CX, fz + 0.022, hh), rib, seg=10)
        bmk = bmesh.new(); bmk.from_mesh(knob.data)
        for vv in bmk.verts:                    # ribs: every other column pushed out
            a = math.atan2(vv.co.z - hh, vv.co.x - CX)
            if (round(a / (math.tau / 10)) % 2 == 0) and vv.co.y < -(fz - 0.008) + 0.0:
                vv.co.x = CX + (vv.co.x - CX) * 1.12; vv.co.z = hh + (vv.co.z - hh) * 1.12
        bmk.to_mesh(knob.data); bmk.free()
        A.P(knob, 0x3a3734 if k == 0 else 0x6a6660)
        A.P(limb('pointer', (CX - 0.002, fz + 0.023, hh), (CX + 0.002 + 0.012 * math.cos(0.7 + k), fz + 0.023, hh + 0.02 * math.sin(0.7 + k)), 0.004, 0.003), 0xb8b0a0)
    for k in range(4):
        A.P(wb('btn', CX - 0.04 + k * 0.022, CX - 0.04 + k * 0.022 + 0.016, fz - 0.012, fz + 0.004, cz - 0.04, cz - 0.026, 0.002), 0x5c5853)
    A.P(wb('power', CX - 0.03, CX + 0.006, fz - 0.012, fz + 0.007, cz - 0.08, cz - 0.06, 0.003), 0x6e6a64)
    A.P(wb('lamp', CX + 0.018, CX + 0.028, fz - 0.012, fz + 0.002, cz - 0.074, cz - 0.066, 0.001), 0x7a3a2c)
    for k in range(7):
        hh = cz - 0.11 - k * 0.014
        A.P(wb('grille', CX - 0.045, CX + 0.045, fz - 0.012, fz + 0.003, hh - 0.004, hh + 0.004, 0.002), jit(shell, 0.12))
    # a small steel nameplate-less strip under the screen (no lettering) and two feet under the bezel
    A.M(wb('trim', SX - 0.10, SX + 0.10, fz - 0.012, fz + 0.002, th0 + 0.018, th0 + 0.026, 0.001), 0x9a968c, 'alu')

    # ---------------- aerial pole: ghee tin of concrete, bamboo with nodes and a slight bend, taped coax, Yagi
    PX, PZ = 0.95, -0.30
    A.M(wb('tin', PX - 0.12, PX + 0.12, PZ - 0.12, PZ + 0.12, 0.0, 0.34, 0.006), 0xc8c4b8, 'tin')
    A.M(wb('tin_rim', PX - 0.125, PX + 0.125, PZ - 0.125, PZ + 0.125, 0.325, 0.342, 0.003), 0xb8b4a8, 'tin')
    for hb_ in (0.11, 0.22):     # the two rolled beads pressed round a ghee tin
        A.M(wb('tin_bead', PX - 0.124, PX + 0.124, PZ - 0.124, PZ + 0.124, hb_ - 0.006, hb_ + 0.006, 0.004), 0xbcb8ac, 'tin')
    A.P(wb('fill', PX - 0.115, PX + 0.115, PZ - 0.115, PZ + 0.115, 0.30, 0.335, 0.004), 0x9a958a, 'concrete')
    HP = 6.2 if variant == 'a' else 5.6
    bend = (0.05, -0.04) if variant == 'a' else (-0.04, -0.06)
    def pole_at(h):                              # a gentle bow, top leaning off by `bend`
        f = h / HP
        return (PX + bend[0] * f * f, PZ + bend[1] * f * f)
    nseg = 4
    hs = [0.30 + (HP - 0.30) * k / nseg for k in range(nseg + 1)]
    for k in range(nseg):
        h0, h1 = hs[k], hs[k + 1]
        p0, p1 = pole_at(h0), pole_at(h1)
        r0, r1 = 0.034 - 0.010 * h0 / HP, 0.034 - 0.010 * h1 / HP
        nn = max(1, int((h1 - h0) / 0.36))
        prof = []
        for i in range(nn + 1):
            tt = i / nn
            rr = r0 + (r1 - r0) * tt
            if 0 < i < nn:      # the node ridge
                prof += [(tt, rr + 0.0045), (tt + 0.014, rr)]
            else:
                prof.append((tt, rr))
        A.W(rev('bamboo', (p0[0], p0[1], h0 - 0.01), (p1[0], p1[1], h1), prof, seg=6), 0xe0cc9c, 'bamboo')
    # the coax: from the aerial down the pole (taped every ~0.9 m), across the ground and up into the cabinet back
    pts = []
    h = HP - 0.15
    while h > 0.36:
        p = pole_at(h)
        a = h * 1.7
        pts.append((p[0] + 0.036 * math.cos(a), p[1] + 0.036 * math.sin(a), h))
        h -= 0.45
    p = pole_at(0.36)
    pts += [(p[0] - 0.14, p[1] + 0.01, 0.36), (p[0] - 0.20, p[1] + 0.02, 0.12), (p[0] - 0.24, p[1] + 0.03, 0.012),
            (0.40, -0.26, 0.012), (0.26, -0.28, 0.02 if variant == 'a' else 0.16), (0.20, -0.27, hb - 0.03), (0.16, -D / 2 - 0.01, hb + 0.20)]
    A.P(polytube('coax', pts, 0.0045, 4), 0x3a3836, 'cable')
    for h in [x * 0.9 + 0.8 for x in range(int((HP - 1.2) / 0.9))]:
        p = pole_at(h)
        A.P(tube('tape', (p[0], p[1], h - 0.02), (p[0], p[1], h + 0.02), 0.035 - 0.010 * h / HP + 0.006, 7), 0x3c3a38, 'cable')
    # Yagi: clamp + mast stub, boom along a variant heading, reflector, folded dipole on a box, directors
    top_p = pole_at(HP)
    A.M(tube('clamp', (top_p[0], top_p[1], HP - 0.22), (top_p[0], top_p[1], HP - 0.12), 0.032, 6), 0x6c6a64, 'tin')
    A.M(tube('clamp', (top_p[0], top_p[1], HP - 0.06), (top_p[0], top_p[1], HP + 0.02), 0.030, 6), 0x6c6a64, 'tin')
    A.M(tube('mast', (top_p[0], top_p[1], HP - 0.24), (top_p[0], top_p[1], HP + 0.30), 0.014, 6, caps=True), 0x9a9890)
    yaw = math.radians(25 if variant == 'a' else -70)
    ux, uz = math.cos(yaw), math.sin(yaw)       # boom direction
    px_, pz_ = -uz, ux                          # element direction
    bh = HP + 0.26
    def bp(s, e=0.0, dh=0.0):
        return (top_p[0] + ux * s + px_ * e, top_p[1] + uz * s + pz_ * e, bh + dh)
    tilt = 0.0 if variant == 'a' else 0.04
    A.M(tube('boom', bp(-0.55, 0, -0.55 * tilt), bp(0.95, 0, 0.95 * tilt), 0.011, 6, caps=True), 0xa09e96)
    A.M(tube('boom_clamp', bp(0.0, 0, -0.04), bp(0.0, 0, 0.04), 0.022, 6), 0x7a7870, 'tin')
    elems = [(-0.50, 0.50), (0.10, 0.37), (0.30, 0.355), (0.50, 0.34), (0.70, 0.325), (0.90, 0.31)] if variant == 'a' \
        else [(-0.50, 0.52), (0.15, 0.36), (0.40, 0.34), (0.65, 0.16), (0.90, 0.31)]
    for i, (s, hl) in enumerate(elems):
        dh = s * tilt
        droop = 0.012 + RND.uniform(0, 0.01)
        if variant == 'a' and i == 3:            # the bent one: a crow sits on it every evening
            A.M(polytube('elem', [bp(s, -hl, dh - 0.01), bp(s, -hl * 0.4, dh), bp(s, 0, dh), bp(s, hl * 0.45, dh - 0.01), bp(s + 0.06, hl, dh - 0.12)], 0.0045, 4), 0xa4a29a)
        else:
            A.M(polytube('elem', [bp(s, -hl, dh - droop), bp(s, -hl * 0.5, dh - droop * 0.3), bp(s, 0, dh), bp(s, hl * 0.5, dh - droop * 0.3), bp(s, hl, dh - droop)], 0.0045, 4), 0xa4a29a)
    # folded dipole: a long thin loop just behind the first director, on a small plastic box where the coax lands
    s0 = -0.10
    loop = [bp(s0, -0.40, 0.0), bp(s0, 0.40, 0.0), bp(s0 + 0.0, 0.42, 0.03), bp(s0, 0.40, 0.06), bp(s0, -0.40, 0.06), bp(s0, -0.42, 0.03), bp(s0, -0.40, 0.0)]
    A.M(polytube('dipole', loop, 0.005, 4), 0x9c9a92)
    q = bp(s0, 0, -0.035)
    A.P(wb('dbox', q[0] - 0.035, q[0] + 0.035, q[1] - 0.035, q[1] + 0.035, q[2] - 0.02, q[2] + 0.03, 0.006), 0x6c6862)
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
        bpy.ops.mesh.primitive_plane_add(size=16, location=(0, 0, 0))
        g = bpy.context.active_object
        g.name = 'ground'
        g.data.materials.append(gm)
        box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1000, 1000
    sc.view_settings.view_transform = 'AgX'
    if 'sun' not in bpy.data.objects:
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
        w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
        sun.rotation_euler = tuple(math.radians(x) for x in (50, 0, 30))
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
    shots = os.path.join(ROOT, 'docs', 'shots', 'assets-tv')
    for slot, var in (('tv_cabinet_v2', 'a'), ('tv_cabinet_v2_b', 'b')):
        kit = build(var)
        if os.environ.get('TRI_DEBUG'):
            agg = {}
            for _, o, _ in kit.records:
                k = o.name.split('.')[0]
                o.data.calc_loop_triangles()
                a = agg.setdefault(k, [0, 0])
                a[0] += len(o.data.loop_triangles); a[1] += len(o.data.loops)
            print('BREAKDOWN', slot, sorted(agg.items(), key=lambda kv: -kv[1][1]))
        kit.finalize(os.path.join(ROOT, 'tmp', slot + '_raw.glb'), {}, drift_amp=0.05, ao_strength=0.45)
        objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('hb_')]
        for o in objs:
            print('mesh', slot, o.name, 'tris', tri_count([o]))
        print('TRIANGLES', slot, tri_count(objs))
        if do_render:
            # Blender frame: the screen faces Blender -Y.
            render(os.path.join(shots, slot + '_front34.png'), (1.0, -2.1, 1.35), (0.15, 0.0, 0.75), lens=40)
            render(os.path.join(shots, slot + '_full.png'), (-3.2, -6.5, 2.4), (0.6, 0.0, 2.9), lens=28)
