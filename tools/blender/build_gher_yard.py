"""
Family cattle and tractor yard (gher), 1 Nov village plan: places[] 'Family cattle and tractor yard (gher)', centre (38, 41.5),
turn 5 deg. ONE GLB, one root 'gher_yard', origin = the map centre, built square (src/gherYard.js turns it with src/turn.js).
Local frame (metres, +x east, +z south, the map's corners un-turned about the centre):
  open ground  x -4.6..4.6, z -8.03..3.92      building (shed)  x -3.68..3.70, z 0.55..3.77
Hard surface only, no animals, plants or people:
  boundary     low brick wall (1.1 m) under a mud render (lipai) that has fallen off low down in patches, modelled bricks showing;
               rounded mud top. North side: a 3.2 m tractor gate between two modelled-brick pillars, two pipe-gate leaves folded
               open against the wall.
  shed         open-fronted, the full map building: brick back wall (2.36 m, also the yard's south boundary), half-length side
               walls under the roof slope, cement render + flaking limewash; two brick corner pillars and two GI pipe posts on the
               front; steel angle rafters, timber purlins, corrugated tin sheets (one old rust-red sheet, bricks weighing them
               down); cement floor in cracked panels with stains.
  nand         cement-rendered brick feeding trough along the back wall, three bays, iron tethering rings on the front, pegs.
  chaff cutter (toka) at the shed's east end: angle-iron stand, timber feed box, cast-iron flywheel with handle and blades.
  khel         water trough against the west wall: rendered brick, dark water, algae band, chipped corner, wet ground.
  tethering    four timber khoonta posts in a row by the east wall, iron rings, a rope coil, worn ground rings.
  leaning      a cart wheel (spoked, iron tyre) against the west wall, a desi plough against the east wall, a yoke on the wall top.
  ground       packed earth (geometry: swells, cracks, hoof dimples) inside the walls and out through the gate.
Run:
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_gher_yard.py            (-> tmp/gher_yard_raw.glb)
  node tools/shrink.js tmp/gher_yard_raw.glb public/assets/models/gher_yard.glb 999999
  node tools/strip-textures.mjs public/assets/models/gher_yard.glb public/assets/models/gher_yard.glb
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_gher_yard.py -- render   (docs/shots/assets-gher_yard/)
Materials, frozen library only, by name through arch.Kit: plaster set (lime plaster / cement / mud render / modelled bricks /
packed earth as kind 'earth'), tin via arch.corrugate, wood via arch.plank_wood, metal via arch.rust_steel. No new material values.
"""
import sys, os, math, random, shutil
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import wb, limb, cyl, quad, prism_x, new_bmesh_obj, hex_to_linear_rgb, export_glb, load_pbr_material, box_uv, ROOT
import arch
from arch import Kit, ring, lathe

CEMENT, CEMENT_HI, CEMENT_LO = 0xa29f96, 0xaeaba1, 0x8c897f
DAMP, WET, ALGAE, ALGAE_DK = 0x75746c, 0x6a6b65, 0x5f6747, 0x4c5538
LIME, LIME_DIRTY, LIME_GREY = 0xd6d0c0, 0xc2bba8, 0xaaa496
MORTAR, SOOT, MUD, ROPE = 0x8e877a, 0x4d4743, 0x6e5e4a, 0x9a8462
MUD_RENDER = [0x8f7d63, 0x877559, 0x968569, 0x8a7a62]
EARTH = 0xA8977A
RUST = 0x7a4a2c
IRON = 0x4a4e4c
BRICK_TONES = [0x9a6650, 0x8e5d4a, 0xa36d55, 0x86594a, 0x9b7059]
WOOD_OLD, WOOD_GREY, WOOD_WARM = 0x7f6d58, 0x8a8070, 0x8a7458
TIN_TONES = [0x8e9498, 0x989ea1, 0x868c8f, 0x92989a]
GATE_PAINT = 0x55705f

# ---------------------------------------------------------------- per-face colours + ground grime (wraps arch.colorize, as build_field_props.py)
FACECOLS = {}
GRIME = {}
_orig_colorize = arch.colorize


def _colorize(obj, hex_color, attr='Col'):
    _orig_colorize(obj, hex_color, attr)
    if attr != 'Base':
        return
    me = obj.data
    fc = FACECOLS.get(obj.name)
    if fc and len(fc) != len(me.polygons):
        fc = None
    g0, st = GRIME.get(obj.name, (0.0, 0.22))
    base = hex_to_linear_rgb(hex_color)
    cache = {}
    out = [0.0] * (len(me.loops) * 4)
    verts = me.vertices
    for p in me.polygons:
        if fc:
            h = fc[p.index]
            c = cache.get(h) or cache.setdefault(h, hex_to_linear_rgb(h))
        else:
            c = base
        for li in p.loop_indices:
            co = verts[me.loops[li].vertex_index].co
            damp = max(0.0, min(1.0, (g0 + 0.32 - co.z) / 0.32)) * (0.65 + 0.35 * math.sin(co.x * 7.3 + co.y * 5.1))
            k = 1.0 - st * damp + 0.035 * math.sin(co.x * 13.1 + co.y * 9.7 + co.z * 11.3)
            out[li * 4:li * 4 + 4] = (c[0] * k, c[1] * k, c[2] * k, 1.0)
    me.color_attributes[attr].data.foreach_set('color', out)


arch.colorize = _colorize


def jit(hexc, rnd, amt=0.06):
    v = 1.0 + rnd.uniform(-amt, amt)
    out = 0
    for sh in (16, 8, 0):
        c = (hexc >> sh) & 0xff
        c = int(max(8, min(236, c * v * (1.0 + rnd.uniform(-amt, amt) * 0.4))))
        out = (out << 8) | c
    return out


def shade(hexc, k):
    out = 0
    for sh in (16, 8, 0):
        out = (out << 8) | int(max(8, min(236, ((hexc >> sh) & 0xff) * k)))
    return out


class Multi:
    """Many hexahedra in one object, a colour per block."""
    def __init__(self, name):
        self.name, self.bm, self.fc = name, bmesh.new(), []

    def hexa(self, pts, col):
        vs = [self.bm.verts.new((x, -z, h)) for x, z, h in pts]
        for idx in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            self.bm.faces.new([vs[i] for i in idx])
            self.fc.append(col)

    def box(self, x0, x1, z0, z1, h0, h1, col):
        x0, x1 = min(x0, x1), max(x0, x1)
        z0, z1 = min(z0, z1), max(z0, z1)
        q = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
        self.hexa([(x, z, h0) for x, z in q] + [(x, z, h1) for x, z in q], col)

    def obj(self, grime=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        o = new_bmesh_obj(self.name, self.bm)
        FACECOLS[o.name] = self.fc
        if grime:
            GRIME[o.name] = grime
        return o


def blob(name, cx, cz, h, rx, rz, seed, n=14, rough=0.22):
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, math.tau) for _ in range(3)]
    pts = []
    for i in range(n):
        a = i / n * math.tau
        k = 1.0 + rough * (0.6 * math.sin(2 * a + ph[0]) + 0.3 * math.sin(3 * a + ph[1]) + 0.15 * math.sin(5 * a + ph[2]))
        pts.append((cx + rx * k * math.cos(a), cz + rz * k * math.sin(a), h))
    o = quad(name, pts)
    if o.data.polygons[0].normal.z < 0:
        o.data.flip_normals()
    return o


def xform(obj, M):
    obj.data.transform(M)
    return obj


def brick_row(m, face, plane, sgn, u0, u1, h0, h1, off, rnd, depth=0.11, skip=None, sunk=0.02):
    """One course of stretchers on a straight face. face 'z': bricks run along x on the plane z=plane; 'x': along z on x=plane."""
    u = u0 - off
    while u < u1 - 0.02:
        a, b = max(u + 0.005, u0), min(u + 0.225, u1)
        if b - a > 0.05 and not (skip and skip((a + b) / 2, (h0 + h1) / 2)):
            j = rnd.uniform(-0.004, 0.003)
            col = jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.05)
            if rnd.random() < 0.05:
                j -= sunk
                col = jit(0x7a5444, rnd, 0.05)
            outer, inner = plane + sgn * j, plane - sgn * depth
            hh0, hh1 = h0 + rnd.uniform(0, 0.003), h1 - rnd.uniform(0, 0.003)
            if face == 'z':
                m.box(a, b, inner, outer, hh0, hh1, col)
            else:
                m.box(inner, outer, a, b, hh0, hh1, col)
        u += 0.23


def strips(m, face, plane, sgn, u0, u1, hb_fn, ht_fn, thick, col_fn, w=0.07):
    n = max(1, int((u1 - u0) / w))
    for i in range(n):
        a, b = u0 + (u1 - u0) * i / n, u0 + (u1 - u0) * (i + 1) / n
        uc = (a + b) / 2
        hb, ht = hb_fn(uc), ht_fn(uc)
        if ht - hb < 0.02:
            continue
        if face == 'z':
            m.box(a, b, plane, plane + sgn * thick, hb, ht, col_fn(uc))
        else:
            m.box(plane, plane + sgn * thick, a, b, hb, ht, col_fn(uc))


# ================================================================ walls
STYLE = {
    'mud': (MUD_RENDER, 0.016),
    'lime': ([LIME, LIME_DIRTY, LIME_DIRTY, LIME_GREY], 0.012),
    'cement': ([CEMENT, CEMENT_LO, CEMENT, CEMENT_HI], 0.012),
}


def wall_run(kit, rnd, name, axis, c, u0, u1, H, T, faces, cap='mud', h0=0.0, top_fn=None):
    """A brick wall along `axis` ('x' runs along x on z=c, 'z' runs along z on x=c), u0..u1, base h0, height H (or top_fn(u)).
    faces: {+1/-1: (style, [(u_centre, half_width, patch_top), ...])}: each face is rendered in proud strips; inside a patch the
    render has fallen away from the ground up to a ragged patch_top and modelled bricks show, set 1.5 cm behind the render."""
    face = 'z' if axis == 'x' else 'x'
    top = top_fn or (lambda u: H)

    def B(m, a, b, d0, d1, hb, ht, col):
        if axis == 'x':
            m.box(a, b, c + d0, c + d1, hb, ht, col)
        else:
            m.box(c + d0, c + d1, a, b, hb, ht, col)

    core = Multi(name + '_core')
    n = max(1, int((u1 - u0) / 0.6)) if top_fn else 1
    for i in range(n):
        a, b = u0 + (u1 - u0) * i / n, u0 + (u1 - u0) * (i + 1) / n
        B(core, a, b, -T / 2 + 0.012, T / 2 - 0.012, h0 - 0.04, min(top(a), top(b)), jit(MORTAR, rnd, 0.04))
    kit.add('plaster', core.obj(grime=(h0, 0.2)))
    for sgn, (style, patches) in faces.items():
        tones, thick = STYLE[style]
        plane = c + sgn * T / 2
        ph = rnd.uniform(0, 6)

        def ptop(u, patches=patches):
            best = 0.0
            for (uc, hw, pt) in patches:
                t = (u - (uc - hw)) / (2 * hw)
                if 0.0 < t < 1.0:
                    best = max(best, h0 + (pt - h0) * (math.sin(t * math.pi) ** 0.5) * (0.82 + 0.18 * math.sin(u * 23 + uc)))
            return best

        base_tone = jit(tones[rnd.randint(0, len(tones) - 1)], rnd, 0.02)
        rs = Multi(name + '_render')
        # strips: fine (6 cm) over and around patches so the torn edge is ragged, wide (0.35 m) elsewhere
        u = u0
        while u < u1 - 1e-4:
            near = any(abs(u - uc) < hw + 0.12 for (uc, hw, _) in patches)
            step = 0.06 if near else 0.35
            b = min(u1, u + step)
            uc_ = (u + b) / 2
            pt = ptop(uc_)
            hb = pt if pt > h0 else h0 + max(0.0, 0.05 * math.sin(uc_ * 3.1 + ph))
            ht = top(uc_) - 0.004
            col = shade(base_tone, 1.0 + 0.035 * math.sin(uc_ * 0.9 + ph) + 0.02 * math.sin(uc_ * 2.3 + ph * 2) + rnd.uniform(-0.012, 0.012))
            if ht - hb > 0.02:
                B(rs, u, b, sgn * T / 2 - (0 if sgn > 0 else thick), sgn * T / 2 + (thick if sgn > 0 else 0), hb, ht, col)
            u = b
        kit.add('plaster', rs.obj(grime=(h0, 0.34 if style == 'mud' else 0.26)))
        if patches:
            br = Multi(name + '_bricks')
            CH = 0.076
            hmax = max(p[2] for p in patches)
            for k in range(int((hmax - h0) / CH) + 1):
                hb = h0 + k * CH + 0.005
                for (uc, hw, pt) in patches:
                    brick_row(br, face, plane, sgn, uc - hw, uc + hw, hb, hb + CH - 0.011, 0.115 * (k % 2), rnd,
                              skip=lambda uu, hh: hh > ptop(uu) + 0.03)
            kit.add('plaster', br.obj(grime=(h0, 0.25)))
    # top
    cp = Multi(name + '_cap')
    if cap == 'mud':
        u = u0
        while u < u1 - 1e-4:
            b = min(u1, u + 0.45)
            ha, hb_ = top(u) + 0.065 + rnd.uniform(-0.012, 0.012), top(b) + 0.065 + rnd.uniform(-0.012, 0.012)
            w0, w1 = T / 2 + 0.02, T * 0.22
            col = jit(MUD_RENDER[2], rnd, 0.04)
            if axis == 'x':
                q0 = [(u, c - w0), (b, c - w0), (b, c + w0), (u, c + w0)]
                q1 = [(u, c - w1, ha), (b, c - w1, hb_), (b, c + w1, hb_), (u, c + w1, ha)]
            else:
                q0 = [(c - w0, u), (c + w0, u), (c + w0, b), (c - w0, b)]
                q1 = [(c - w1, u, ha), (c + w1, u, ha), (c + w1, b, hb_), (c - w1, b, hb_)]
            hs = [top(u), top(b), top(b), top(u)] if axis == 'x' else [top(u), top(u), top(b), top(b)]
            cp.hexa([(x, z, h - 0.01) for (x, z), h in zip(q0, hs)] + q1, col)
            u = b
    elif cap == 'cement':
        u = u0
        while u < u1 - 1e-4:
            b = min(u1, u + 0.9 + rnd.uniform(-0.2, 0.2))
            if u1 - b < 0.3:
                b = u1
            B(cp, u + 0.004, b - 0.004, -T / 2 - 0.02, T / 2 + 0.02, top(u), top(u) + 0.045 - rnd.uniform(0, 0.008), jit(CEMENT if rnd.random() < 0.6 else CEMENT_LO, rnd, 0.04))
            u = b
    if cp.fc:
        kit.add('plaster', cp.obj(grime=(-1, 0)))


def brick_pillar(kit, rnd, name, cx, cz, P, h0, h1, cap=True, wash=None):
    """Square modelled-brick pillar (half width P) on a cement footing, corners alternating per course; optional limewash on a face."""
    kit.add('plaster', wb(name + '_core', cx - P + 0.012, cx + P - 0.012, cz - P + 0.012, cz + P - 0.012, h0, h1, 0.004), jit(MORTAR, rnd, 0.04))
    br = Multi(name + '_bricks')
    CH = 0.076
    for k in range(int((h1 - h0) / CH)):
        hb = h0 + k * CH + 0.005
        ht = hb + CH - 0.011
        off = 0.115 if k % 2 else 0.0
        full, short = (-P, P), (-P + 0.11, P - 0.11)
        zr, xr = (full, short) if k % 2 == 0 else (short, full)
        brick_row(br, 'z', cz + P, 1, cx + zr[0], cx + zr[1], hb, ht, off, rnd)
        brick_row(br, 'z', cz - P, -1, cx + zr[0], cx + zr[1], hb, ht, off, rnd)
        brick_row(br, 'x', cx + P, 1, cz + xr[0], cz + xr[1], hb, ht, off, rnd)
        brick_row(br, 'x', cx - P, -1, cz + xr[0], cz + xr[1], hb, ht, off, rnd)
    kit.add('plaster', br.obj(grime=(h0, 0.22)))
    if wash:
        ww = Multi(name + '_wash')
        ph = rnd.uniform(0, 6)
        for face, plane, sgn, u0, u1 in wash:
            strips(ww, face, plane, sgn, u0, u1, lambda u: h0 + 0.25 + 0.2 * max(0.0, math.sin(u * 9 + ph)) ** 2,
                   lambda u: h1 - 0.02 - 0.25 * max(0.0, math.sin(u * 6.1 + ph + 1)) ** 4, 0.006, lambda u: jit(LIME if math.sin(u * 13 + ph) > -0.3 else LIME_GREY, rnd, 0.03), w=0.06)
        kit.add('plaster', ww.obj(grime=(h0, 0.3)))
    if cap:
        kit.add('plaster', wb(name + '_cap', cx - P - 0.05, cx + P + 0.05, cz - P - 0.05, cz + P + 0.05, h1, h1 + 0.07, 0.012), jit(CEMENT, rnd))
        cm = Multi(name + '_cap_top')
        q = [(cx - P - 0.03, cz - P - 0.03), (cx + P + 0.03, cz - P - 0.03), (cx + P + 0.03, cz + P + 0.03), (cx - P - 0.03, cz + P + 0.03)]
        cm.hexa([(x, z, h1 + 0.07) for x, z in q] + [(cx + (x - cx) * 0.2, cz + (z - cz) * 0.2, h1 + 0.2) for x, z in q], jit(CEMENT_HI, rnd))
        kit.add('plaster', cm.obj(grime=(-1, 0)))


# ================================================================ the yard
XW, ZN, ZS = 4.45, -7.85, 3.75          # wall centrelines: west/east x = -+XW, north z = ZN, south z = ZS
TB = 0.3                                # boundary wall thickness
HB = 1.1                                # boundary wall height
GX, GP = 1.85, 0.23                     # gate pillar centre x (+-), half width
Z_FRONT = 0.78                          # shed front post line
HR = lambda z: 2.74 - 0.11 * (z - 0.45)  # roof underside (rafter top) at z


def build_boundary(kit, rnd):
    # west and east walls (full length), patches on the outer face and a few inside
    wall_run(kit, rnd, 'west', 'z', -XW, ZN - TB / 2, ZS + TB / 2, HB, TB,
             {-1: ('mud', [(-6.2, 0.55, 0.62), (-1.0, 0.4, 0.45), (2.4, 0.7, 0.8)]), 1: ('mud', [(-0.9, 0.35, 0.4)])})
    wall_run(kit, rnd, 'east', 'z', XW, ZN - TB / 2, ZS + TB / 2, HB, TB,
             {1: ('mud', [(-5.0, 0.8, 0.7), (0.2, 0.45, 0.5)]), -1: ('mud', [(-3.2, 0.3, 0.38)])})
    # north wall, either side of the gate
    wall_run(kit, rnd, 'north_w', 'x', ZN, -XW, -GX - GP, HB, TB,
             {-1: ('mud', [(-3.4, 0.5, 0.66)]), 1: ('mud', [])})
    wall_run(kit, rnd, 'north_e', 'x', ZN, GX + GP, XW, HB, TB,
             {-1: ('mud', [(3.0, 0.45, 0.5)]), 1: ('mud', [(3.6, 0.3, 0.35)])})
    # south: low ends, the tall shed back wall between them (inside face cement + lime, outside mud)
    wall_run(kit, rnd, 'south_w', 'x', ZS, -XW, -3.85, HB, TB, {1: ('mud', []), -1: ('mud', [])})
    wall_run(kit, rnd, 'south_e', 'x', ZS, 3.85, XW, HB, TB, {1: ('mud', [(4.2, 0.25, 0.4)]), -1: ('mud', [])})
    wall_run(kit, rnd, 'back', 'x', ZS, -3.85, 3.85, HR(ZS + TB / 2) - 0.02, TB,
             {1: ('mud', [(-2.6, 0.6, 0.7), (1.5, 0.9, 0.95)]), -1: ('lime', [(2.9, 0.35, 1.05)])}, cap='cement')
    # gate pillars: modelled brick, limewash on the road face
    for sx in (-1, 1):
        x = sx * GX
        kit.add('plaster', wb('pil_foot', x - GP - 0.06, x + GP + 0.06, ZN - GP - 0.06, ZN + GP + 0.06, -0.04, 0.08, 0.012), jit(CEMENT_LO, rnd))
        brick_pillar(kit, rnd, 'gate_pil', x, ZN, GP, 0.08, 1.5, wash=[('z', ZN - GP, -1, x - GP, x + GP)])
    # gate leaves, GI pipe frame painted green, folded open flat against the north wall's inner face
    for sx in (-1, 1):
        hx = sx * (GX - GP - 0.04)
        L = 1.52
        zl = ZN + GP + 0.06 + (0.02 if sx > 0 else 0.0)              # just inside the pillar's inner face
        pnt = jit(GATE_PAINT, rnd, 0.05)
        x0, x1 = hx, hx + sx * L                                     # swung open: the leaf runs away from the gap, along the wall
        kit.add('metal', limb('g_stile_h', (x0, zl, 0.10), (x0, zl, 1.30), 0.05, 0.05), pnt)
        kit.add('metal', limb('g_stile_l', (x1, zl, 0.12), (x1, zl, 1.28), 0.045, 0.045), pnt)
        for h in (0.14, 0.72, 1.28):
            kit.add('metal', limb('g_rail', (x0, zl, h), (x1, zl, h), 0.045, 0.045), pnt)
        for i in range(1, 9):
            x = x0 + (x1 - x0) * i / 9
            if sx > 0 and i == 6:
                continue                                            # a bar gone
            kit.add('metal', limb('g_bar', (x, zl, 0.14), (x, zl, 1.28), 0.018, 0.018), pnt)
        kit.add('metal', limb('g_brace', (x0, zl, 0.16), (x1, zl, 1.26), 0.035, 0.012), pnt)
        for h in (0.3, 1.1):
            kit.add('metal', limb('g_hinge', (sx * GX, ZN + GP - 0.02, h), (x0, zl, h), 0.035, 0.03), jit(RUST, rnd))
        kit.add('metal', limb('g_bolt', (x1 - sx * 0.06, zl + 0.03, 0.02), (x1 + sx * 0.06, zl + 0.03, 0.55), 0.02, 0.02), jit(RUST, rnd))


def build_ground(kit, rnd):
    kit.add('earth', wb('yard_earth', -XW + TB / 2, XW - TB / 2, ZN + TB / 2, ZS - TB / 2, -0.06, 0.0, 0.0), jit(EARTH, rnd, 0.03))
    kit.add('earth', wb('gate_earth', -GX + GP, GX - GP, ZN - 0.9, ZN + TB / 2 + 0.01, -0.06, 0.0, 0.0), jit(EARTH, rnd, 0.03))
    # worn, dung-darkened ground ring where the animals stand at the tethering posts (kept low-contrast: the earth geometry does the rest)
    kit.add('plaster', blob('worn', 3.25, -3.35, 0.02, 0.55, 2.3, rnd.randint(0, 999), n=18, rough=0.12), jit(0x958468, rnd, 0.03))


def build_shed(kit, rnd):
    # floor: cement panels on a 10 cm slab, a cracked one, stains, a front lip
    fl = Multi('floor')
    xs = [-3.55, -1.8, 0.0, 1.75, 3.55]
    zs = [Z_FRONT - 0.18, 2.1, ZS - TB / 2]
    for i in range(4):
        for j in range(2):
            sink = -0.012 if (i, j) == (2, 0) else 0.0
            fl.box(xs[i] + 0.006, xs[i + 1] - 0.006, zs[j] + 0.006, zs[j + 1] - 0.006, -0.05, 0.1 + sink + rnd.uniform(-0.004, 0.003), jit(CEMENT if (i + j) % 2 else CEMENT_LO, rnd, 0.05))
    kit.add('plaster', fl.obj(grime=(-0.1, 0.2)))
    for (x, z, rx, rz, col) in ((-2.4, 2.35, 0.5, 0.26, 0x7d7464), (-0.6, 2.4, 0.42, 0.22, 0x80776a), (1.2, 2.3, 0.45, 0.25, 0x7a7163), (0.4, 1.3, 0.7, 0.35, 0x86837a), (-1.9, 1.1, 0.4, 0.3, 0x9a968c)):
        kit.add('plaster', blob('floor_stain', x, z, 0.103, rx, rz, rnd.randint(0, 999)), jit(col, rnd, 0.04))
    # side walls (brick, cement render with limewash), z 1.55 .. back wall, top under the roof slope
    for sx in (-1, 1):
        x = sx * 3.58
        wall_run(kit, rnd, 'side', 'z', x, 1.55, ZS - TB / 2 + 0.01, 0, 0.23,
                 {sx: ('cement', [(2.6, 0.3, 0.55)]), -sx: ('lime', [(1.9, 0.25, 0.5)])}, cap=None, h0=0.1, top_fn=lambda z: HR(z) - 0.004)
    # front: brick corner pillars, two GI pipe posts on cement footings
    for sx in (-1, 1):
        brick_pillar(kit, rnd, 'shed_pil', sx * 3.55, Z_FRONT, 0.17, 0.1, HR(Z_FRONT) - 0.1, cap=False,
                     wash=[('z', Z_FRONT - 0.17, -1, sx * 3.55 - 0.17, sx * 3.55 + 0.17)])
    for x in (-1.22, 1.18):
        kit.add('plaster', wb('post_foot', x - 0.16, x + 0.16, Z_FRONT - 0.16, Z_FRONT + 0.16, 0.08, 0.2, 0.02), jit(CEMENT_LO, rnd))
        kit.add('metal', cyl('gi_post', x, Z_FRONT, 0.18, HR(Z_FRONT) - 0.1, 0.045, seg=12), jit(0x8a8f8e, rnd, 0.05))
        kit.add('metal', wb('post_plate', x - 0.08, x + 0.08, Z_FRONT - 0.08, Z_FRONT + 0.08, HR(Z_FRONT) - 0.112, HR(Z_FRONT) - 0.1, 0.0, 1), jit(RUST, rnd))
    # front beam (steel angle), rafters (angle) front to back, timber purlins across
    kit.add('metal', wb('front_beam', -3.78, 3.78, Z_FRONT - 0.05, Z_FRONT + 0.05, HR(Z_FRONT) - 0.1, HR(Z_FRONT) - 0.02, 0.004), jit(0x56544f, rnd))
    for x in (-3.55, -1.2, 1.2, 3.55):
        kit.add('metal', limb('rafter', (x, 0.35, HR(0.35) - 0.03), (x, 3.98, HR(3.98) - 0.03), 0.05, 0.06), jit(0x5a524a, rnd, 0.06))
    for z in (0.45, 1.4, 2.4, 3.4):
        kit.add('wood', limb('purlin', (-3.9, z, HR(z) + 0.035), (3.9, z, HR(z) + 0.035), 0.07, 0.07), jit(WOOD_OLD, rnd, 0.05))
    # tin sheets, 0.86 m wide with overlap, front overhang to z 0.25 and back past the wall
    za, zb = 0.25, 4.02
    x = -3.95
    k = 0
    while x < 3.95:
        w = 0.86
        dh = rnd.uniform(-0.006, 0.006)
        a, b = HR(za) + 0.07 + dh + (k % 2) * 0.008, HR(zb) + 0.07 + dh + (k % 2) * 0.008
        tone = 0xa05a3e if k == 5 else (0xa7acae if k == 2 else TIN_TONES[k % 4])
        kit.add('tin', prism_x('sheet', x, min(3.95, x + w), [(za, a), (zb, b), (zb, b + 0.012), (za, a + 0.012)]), jit(tone, rnd, 0.04))
        x += w - 0.05
        k += 1
    # bricks weighing the sheets down along the front and over the back wall
    for (bx, bz) in ((-3.1, 0.55), (-1.5, 0.6), (0.2, 0.52), (1.9, 0.58), (3.3, 0.6), (-2.2, 3.6), (0.9, 3.65), (2.7, 3.55)):
        h = HR(bz) + 0.07 + 0.045
        br = wb('roof_brick', -0.115, 0.115, -0.055, 0.055, 0.0, 0.075, 0.006)
        xform(br, Matrix.Translation((bx, -bz, h)) @ Matrix.Rotation(math.atan(0.11) + rnd.uniform(-0.04, 0.04), 4, 'X') @ Matrix.Rotation(rnd.uniform(-0.4, 0.4), 4, 'Z'))
        kit.add('plaster', br, jit(BRICK_TONES[rnd.randint(0, 4)], rnd))
    # fascia rust streaks under the front sheet edge: a thin dark drip line on the front beam
    kit.add('plaster', wb('drip', -3.78, 3.78, Z_FRONT - 0.052, Z_FRONT - 0.048, HR(Z_FRONT) - 0.1, HR(Z_FRONT) - 0.06, 0.0, 1), jit(0x5c4a3c, rnd))


def build_nand(kit, rnd):
    x0, x1 = -3.3, 2.05
    zf, zb = 2.72, ZS - TB / 2
    H = 0.68
    # body: front wall + ends (rendered cement, a chip showing bricks), bowl fill, dividers
    wall_run(kit, rnd, 'nand_front', 'x', zf + 0.065, x0, x1, H, 0.13, {-1: ('cement', [(-0.9, 0.22, 0.42)]), 1: ('cement', [])}, cap='cement', h0=0.1)
    for x in (x0 + 0.065, x1 - 0.065):
        kit.add('plaster', wb('nand_end', x - 0.065, x + 0.065, zf + 0.13, zb, 0.1, H + 0.04, 0.02), jit(CEMENT_LO, rnd))
    kit.add('plaster', wb('nand_fill', x0 + 0.12, x1 - 0.12, zf + 0.12, zb, 0.1, 0.36, 0.0, 1), jit(0x77736a, rnd))
    for x in (-1.55, 0.27):
        kit.add('plaster', wb('nand_div', x - 0.05, x + 0.05, zf + 0.12, zb, 0.36, 0.6, 0.015), jit(CEMENT, rnd))
    # inside each bay: rounded bowl lips (cement fillets), a feed-stained bottom, a green-grey wet line
    for (a, b) in ((x0 + 0.13, -1.6), (-1.5, 0.22), (0.32, x1 - 0.13)):
        cx = (a + b) / 2
        kit.add('plaster', blob('bowl_stain', cx, (zf + zb) / 2 + 0.06, 0.362, (b - a) / 2 - 0.08, 0.26, rnd.randint(0, 999), rough=0.1), jit(0x8a7d5c, rnd, 0.06))
        kit.add('plaster', wb('bowl_wet', a + 0.02, b - 0.02, zb - 0.012, zb - 0.002, 0.36, 0.46, 0.0, 1), jit(0x5e6050, rnd))
        kit.add('plaster', wb('bowl_fillet', a + 0.02, b - 0.02, zf + 0.12, zf + 0.2, 0.36, 0.42, 0.03), jit(CEMENT_LO, rnd))
        # iron tethering ring on a staple in the front face, the khoonta peg in the floor in front
        kit.add('metal', limb('staple', (cx, zf + 0.01, 0.52), (cx, zf - 0.05, 0.52), 0.03, 0.03), jit(RUST, rnd))
        kit.add('metal', ring('teth_ring', cx, zf - 0.065, 0.46, 0.055, 0.009, axis='z'), jit(0x4f4a44, rnd))
        px = cx + rnd.uniform(-0.25, 0.25)
        kit.add('wood', limb('peg', (px, 2.15, 0.08), (px + 0.02, 2.16, 0.42), 0.07, 0.07), jit(WOOD_OLD, rnd, 0.06))
        kit.add('plaster', blob('peg_wear', px, 2.15, 0.104, 0.28, 0.2, rnd.randint(0, 999)), jit(0x857a68, rnd))


def build_chaff_cutter(kit, rnd):
    cx, z0, z1 = 2.85, 1.25, 2.25
    stand = jit(0x5a5650, rnd)
    for x in (cx - 0.2, cx + 0.2):
        for z in (z0 + 0.05, z1 - 0.05):
            kit.add('metal', limb('toka_leg', (x, z, 0.1), (x, z, 0.78), 0.045, 0.045), stand)
        kit.add('metal', limb('toka_side', (x, z0, 0.42), (x, z1, 0.42), 0.04, 0.04), stand)
    kit.add('metal', limb('toka_tie', (cx - 0.22, z1 - 0.05, 0.42), (cx + 0.22, z1 - 0.05, 0.42), 0.04, 0.04), stand)
    # timber feed box, open on top, sloping slightly down toward the blades
    for x in (cx - 0.15, cx + 0.15):
        kit.add('wood', wb('toka_box_side', x - 0.02, x + 0.02, z0 - 0.05, z1, 0.78, 0.98, 0.004), jit(WOOD_WARM, rnd, 0.05))
    kit.add('wood', wb('toka_box_bot', cx - 0.15, cx + 0.15, z0 - 0.05, z1, 0.76, 0.79, 0.004), jit(WOOD_WARM, rnd, 0.05))
    # gearbox at the mouth, axle, flywheel (cast iron, 6 spokes), blades on the flywheel face, handle
    kit.add('metal', wb('toka_head', cx - 0.2, cx + 0.2, z1 - 0.02, z1 + 0.12, 0.7, 1.05, 0.01), jit(0x4c4d4a, rnd))
    kit.add('metal', limb('toka_axle', (cx + 0.2, z1 + 0.05, 0.92), (cx + 0.36, z1 + 0.05, 0.92), 0.05, 0.05), jit(RUST, rnd))
    FX, FH, FR = cx + 0.36, 0.92, 0.42
    kit.add('metal', ring('flywheel', FX, z1 + 0.05, FH, FR, 0.03, axis='x', seg=24), jit(0x3f413e, rnd))
    for k in range(3):
        a = k * math.pi / 3 + 0.2
        kit.add('metal', limb('fly_spoke', (FX, z1 + 0.05 - FR * math.cos(a), FH - FR * math.sin(a)), (FX, z1 + 0.05 + FR * math.cos(a), FH + FR * math.sin(a)), 0.025, 0.03), jit(0x3f413e, rnd))
    kit.add('metal', cyl('fly_hub', FX, z1 + 0.05, FH - 0.07, FH + 0.07, 0.07, seg=10), jit(RUST, rnd))
    for a in (0.9, 0.9 + math.pi):
        kit.add('metal', limb('blade', (FX - 0.03, z1 + 0.05 + 0.08 * math.cos(a), FH + 0.08 * math.sin(a)), (FX - 0.03, z1 + 0.05 + 0.36 * math.cos(a + 0.35), FH + 0.36 * math.sin(a + 0.35)), 0.008, 0.07), jit(0x8d9290, rnd))
    ha = 2.2
    hz, hh = z1 + 0.05 + (FR - 0.02) * math.cos(ha), FH + (FR - 0.02) * math.sin(ha)
    kit.add('metal', limb('handle_pin', (FX, hz, hh), (FX + 0.12, hz, hh), 0.025, 0.025), jit(RUST, rnd))
    kit.add('wood', limb('handle_grip', (FX + 0.1, hz, hh), (FX + 0.26, hz, hh), 0.04, 0.04), jit(WOOD_GREY, rnd))
    kit.add('plaster', blob('toka_floor', cx + 0.1, (z0 + z1) / 2 + 0.3, 0.104, 0.5, 0.7, rnd.randint(0, 999)), jit(0x9a8c6a, rnd, 0.05))


def build_khel(kit, rnd):
    """Water trough against the west wall's inner face."""
    xi = -XW + TB / 2                       # west wall inner face
    xo = -3.42
    za, zb = -5.0, -2.8
    H = 0.56
    wall_run(kit, rnd, 'khel_long', 'z', xo - 0.06, za, zb, H, 0.12, {1: ('cement', [(-4.55, 0.22, 0.38)]), -1: ('cement', [])}, cap='cement')
    for z in (za + 0.06, zb - 0.06):
        wall_run(kit, rnd, 'khel_end', 'x', z, xi, xo - 0.12, H, 0.12, {1: ('cement', []), -1: ('cement', [])}, cap='cement')
    kit.add('plaster', wb('khel_bed', xi, xo - 0.12, za + 0.12, zb - 0.12, -0.02, 0.14, 0.0, 1), jit(0x6c6b62, rnd))
    # algae band at the water line on the inner faces, slime on the wall behind
    for (a, b, c, d) in ((xi, xo - 0.12, za + 0.12, za + 0.125), (xi, xo - 0.12, zb - 0.125, zb - 0.12), (xo - 0.125, xo - 0.12, za + 0.12, zb - 0.12), (xi, xi + 0.005, za + 0.12, zb - 0.12)):
        kit.add('plaster', wb('khel_algae', a, b, c, d, 0.14, 0.47, 0.0, 1), jit(ALGAE_DK, rnd))
    kit.add('water', wb('khel_water', xi + 0.005, xo - 0.125, za + 0.125, zb - 0.125, 0.40, 0.42, 0.0, 1), 0x313b30)
    # spilled water, mud, a GI bucket and an iron tasla upside down
    kit.add('plaster', blob('khel_wet', xo + 0.3, (za + zb) / 2, 0.02, 0.4, 1.25, rnd.randint(0, 999), rough=0.15), jit(0x857561, rnd, 0.03))
    bx, bz = -2.95, -2.45
    prof = [(0.002, 0.0), (0.11, 0.0), (0.115, 0.01), (0.145, 0.27), (0.152, 0.278), (0.14, 0.282), (0.11, 0.03), (0.002, 0.03)]
    kit.add('metal', lathe('bucket', bx, bz, prof, seg=18), jit(0x8d9294, rnd, 0.04))
    kit.add('metal', lathe('bucket_band', bx, bz, [(0.128, 0.12), (0.132, 0.14)], seg=18, smooth=False), jit(0x6f7374, rnd))
    kit.add('metal', ring('bucket_handle', bx, bz, 0.27, 0.15, 0.008, axis='z', seg=12), jit(0x6b6f6f, rnd))
    tprof = [(0.26, 0.0), (0.245, 0.05), (0.2, 0.11), (0.12, 0.148), (0.002, 0.158)]          # iron pan upside down
    kit.add('metal', lathe('tasla', -2.1, 0.15, tprof, seg=20), jit(0x4b4845, rnd))


def build_tethering(kit, rnd):
    for i, z in enumerate((-5.4, -4.05, -2.7, -1.35)):
        x = 3.3 + rnd.uniform(-0.08, 0.08)
        h = rnd.uniform(0.95, 1.18)
        lx, lz = rnd.uniform(-0.05, 0.05), rnd.uniform(-0.04, 0.04)
        tone = (WOOD_OLD, WOOD_GREY, WOOD_WARM, WOOD_GREY)[i]
        kit.add('wood', limb('khoonta', (x, z, -0.1), (x + lx, z + lz, h), 0.15 - 0.01 * (i % 2), 0.14), jit(tone, rnd, 0.06))
        kit.add('wood', limb('khoonta_top', (x + lx, z + lz, h - 0.02), (x + lx * 1.03, z + lz * 1.03, h + 0.04), 0.11, 0.1), jit(tone, rnd, 0.1))
        kit.add('metal', ring('khoonta_ring', x + lx * 0.7, z + lz * 0.7, h - 0.25, 0.1, 0.012, axis='y', seg=12), jit(0x4f4a44, rnd))
        kit.add('metal', ring('khoonta_hoop', x + lx * 0.7 - 0.11, z + lz * 0.7, h - 0.3, 0.055, 0.008, axis='x', seg=10), jit(RUST, rnd))
        if i in (1, 3):
            for k in range(3):
                kit.add('plaster', ring('rope_coil', x + lx * 0.5, z + lz * 0.5, 0.55 - k * 0.03, 0.11 + 0.01 * k, 0.012, axis='y', seg=12, tube=4), jit(ROPE, rnd, 0.08))
            kit.add('plaster', limb('rope_end', (x - 0.1, z, 0.5), (x - 0.35, z + 0.15, 0.03), 0.022, 0.022), jit(ROPE, rnd))


def build_wheel(kit, rnd):
    """Cart wheel (spoked timber, iron tyre) leaning against the west wall's top edge."""
    start = len(kit.records)
    R = 0.66
    hc = R
    kit.add('metal', ring('tyre', 0, 0, hc, R, 0.035, axis='z', seg=28, tube=4), jit(0x4a4440, rnd))
    nf = 7
    for k in range(nf):                                                # felloes as chords
        a0, a1 = k / nf * math.tau, (k + 1) / nf * math.tau
        r = R - 0.06
        kit.add('wood', limb('felloe', (r * math.cos(a0), 0, hc + r * math.sin(a0)), (r * math.cos(a1), 0, hc + r * math.sin(a1)), 0.08, 0.07), jit(WOOD_GREY, rnd, 0.05))
    for k in range(12):
        a = k / 12 * math.tau
        kit.add('wood', limb('spoke', (0.1 * math.cos(a), 0, hc + 0.1 * math.sin(a)), ((R - 0.1) * math.cos(a), 0, hc + (R - 0.1) * math.sin(a)), 0.035, 0.04), jit(WOOD_OLD, rnd, 0.06))
    kit.add('wood', cyl('hub_wood', 0, 0, -0.14, 0.14, 0.13, seg=12), jit(WOOD_WARM, rnd))
    kit.add('metal', ring('hub_band', 0, 0.1, hc, 0.13, 0.012, axis='z', seg=12), jit(RUST, rnd))
    kit.add('metal', ring('hub_band', 0, -0.1, hc, 0.13, 0.012, axis='z', seg=12), jit(RUST, rnd))
    # the hub cylinder was built vertical at the origin: lay it along the axle (wz) at the wheel centre
    hub = kit.records[-3][1]
    xform(hub, Matrix.Translation((0, 0, hc)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    lean = math.radians(13)
    M = Matrix.Translation((-XW + TB / 2 + 0.3, 6.45, 0)) @ Matrix.Rotation(-math.pi / 2, 4, 'Z') @ Matrix.Rotation(lean, 4, 'X')
    for _, o, _ in kit.records[start:]:
        xform(o, M)
    # an old axle beam lying along the wall foot
    kit.add('wood', limb('axle_beam', (-XW + TB / 2 + 0.2, -5.6, 0.07), (-XW + TB / 2 + 0.3, -7.3, 0.08), 0.13, 0.12), jit(WOOD_GREY, rnd))


def build_plough(kit, rnd):
    """Desi hal leaning on the east wall: sole and iron share on the ground, beam resting over the wall top, handle up."""
    xi = XW - TB / 2
    z = -6.4
    P = lambda p, h, dz=0.0: (xi - p, z + dz, h)                   # p = metres out from the wall face
    kit.add('wood', limb('hal_sole', P(1.0, 0.07), P(0.55, 0.09), 0.11, 0.1), jit(WOOD_WARM, rnd))
    kit.add('metal', limb('hal_share', P(1.22, 0.04), P(0.92, 0.07), 0.035, 0.05), jit(0x6f6d68, rnd))
    kit.add('wood', limb('hal_body', P(0.6, 0.06), P(0.7, 0.42), 0.09, 0.09), jit(WOOD_WARM, rnd))
    kit.add('wood', limb('hal_beam', P(0.66, 0.16), P(-0.5, 1.92), 0.08, 0.075), jit(WOOD_OLD, rnd))
    kit.add('wood', limb('hal_handle', P(0.68, 0.38), P(0.95, 1.0), 0.05, 0.05), jit(WOOD_GREY, rnd))
    kit.add('wood', limb('hal_grip', P(0.95, 1.0, -0.09), P(0.95, 1.0, 0.09), 0.04, 0.04), jit(WOOD_GREY, rnd))
    kit.add('metal', limb('hal_strap', P(0.62, 0.2), P(0.72, 0.36), 0.1, 0.012), jit(RUST, rnd))
    # the yoke (jua) lying on the wall top further along, pegs pointing out
    zy0, zy1 = -4.6, -2.9
    hy = HB + 0.1
    kit.add('wood', limb('jua', (XW + 0.02, zy0, hy), (XW - 0.03, zy1, hy + 0.01), 0.1, 0.09), jit(WOOD_GREY, rnd))
    for zz in (zy0 + 0.25, zy0 + 0.7, zy1 - 0.7, zy1 - 0.25):
        kit.add('wood', limb('jua_peg', (XW, zz, hy), (XW + 0.32, zz, hy - 0.05), 0.035, 0.035), jit(WOOD_OLD, rnd))


ROOTS = [
    ('gher_yard', lambda k, r: (build_ground(k, r), build_boundary(k, r), build_shed(k, r), build_nand(k, r), build_chaff_cutter(k, r),
                                build_khel(k, r), build_tethering(k, r), build_wheel(k, r), build_plough(k, r)), ('metal', 'wood'), {'water': 'metal'}, 3841),
]


def build_all():
    arch.clear_scene()
    _clear, _export = arch.clear_scene, arch.export_glb
    empties, tris = [], {}
    for name, fn, own, route, seed in ROOTS:
        captured = []
        arch.clear_scene = lambda: None
        arch.export_glb = lambda objs, out: captured.extend(objs)
        kit = Kit(split_props=False, own=own, route=route)
        fn(kit, random.Random(seed))
        kit.finalize('unused', {}, drift_amp=0.06, ao_strength=0.5)
        FACECOLS.clear()
        GRIME.clear()
        e = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(e)
        for o in captured:
            o.name = name + '_' + o.name.split('.')[0]
            o.parent = e
        tris[name] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in captured)
        for o in captured:
            print('  part', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
        empties.append((e, captured))
    arch.clear_scene, arch.export_glb = _clear, _export
    for k, v in tris.items():
        print('ROOT tris', k, v)
    return empties


def export(empties):
    out = os.path.join(ROOT, 'tmp', 'gher_yard_raw.glb')
    bpy.ops.object.select_all(action='DESELECT')
    objs = []
    for e, children in empties:
        objs.append(e)
        objs.extend(children)
    export_glb(objs, out)


def render(empties):
    from mathutils import Vector as V
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.03))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sc.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.data.color = (1.0, 0.93, 0.82)
    sun.data.angle = math.radians(1.0)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-gher_yard')
    os.makedirs(d, exist_ok=True)
    # Blender frame: (x, -z, h). The yard's gate is at z -7.85 (Blender y +7.85).
    shots = [('a_from_gate', (3.0, 15.5, 6.5), (0.0, 0.5, 0.6), 26, (50, 0, 150)),
             ('b_shed', (-1.5, 3.2, 2.0), (0.5, -2.6, 0.8), 22, (55, 0, 160)),
             ('c_overhead', (9.5, 9.0, 11.0), (0.0, 2.0, 0.0), 28, (45, 0, 120))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        shutil.copy(sc.render.filepath, os.path.join(ROOT, 'tmp', 'gher_yard_' + name + '.png'))
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'build'
    em = build_all()
    if which == 'render':
        render(em)
    else:
        export(em)
