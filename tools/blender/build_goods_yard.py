"""
Kirana goods yard (1 Nov village plan, places[] 'Kirana goods yard', centre (14.5, 48.1), turn 99.7 deg; compound wall line given
in compound_walls[] 'belongs_to: Kirana goods yard'). ONE GLB, one root node 'goods_yard', modelled SQUARE in the place's own
frame; src/main.js turns the zone group by the map's turn (src/turn.js applyTurn), so the walls land on the map's wall line.

Local frame (pre-turn, metres about the centre): x -4.5..4.5 along the map's 9.0 m side, z -5.22..5.22 along the 10.44 m side.
After the 99.7 deg turn local +z faces WEST: the map's wall leaves a 3.0 m gap on that side (x -1.54..1.50 here) = the gate.
The general store stands ~0.7 m behind the back (-z) wall.

What is in it (hard surface only, no lettering, no plants, no people):
  - compound wall on the map line: 230 mm brick (brick set), cement plinth skirt, segmented cement coping with crack gaps,
    lime-plastered pillars every ~3 m with old lime render patches falling off the outer face, damp band low down.
  - gate: two rendered brick piers, two iron leaves (bars over a sheet lower half) standing open inward, a brick-on-edge apron.
  - floor: packed earth (library 'packed_earth' colour), cracks/dimples from arch.earth_ground, spilled grain, a few stains.
  - tin lean-to on the back wall: galvanised corrugated roof (arch.corrugate), pipe posts, angle purlins.
  - under it: a brick-bonded stack of ~24 jute grain sacks (jute set) on three wooden pallets, each sack its own size/yaw/tone.
  - tarpaulin-covered pile (back right): draped sheet over sacks, sun-bleached top, dusty skirt, two ropes, bricks on the hem.
  - platform weighing scale on a cement plinth near the gate, a sack on its deck, slotted counterweights, one sack standing.
  - thela (hand cart): planked bed, two spoked wheels, iron shafts and stand, three sacks on it.
  - stacked empty pallets and slatted wooden crates on the right wall; plank-and-brick stack on the left wall.
Materials, frozen library only, by name through arch.Kit: plaster set (lime plaster, cement, packed earth via kind 'earth'),
brick set ('brick'), tin ('tin', arch.corrugate), wood (arch.plank_wood), metal (arch.rust_steel), jute ('jute' set, 2.6),
tarpaulin set (the existing shared public/assets/textures/tarpaulin, riding the thatch slot via tex_override). No new values.
Run:  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_goods_yard.py        (-> tmp/goods_yard_raw.glb)
      node tools/shrink.js tmp/goods_yard_raw.glb public/assets/models/goods_yard.glb 999999
      node tools/strip-textures.mjs public/assets/models/goods_yard.glb public/assets/models/goods_yard.glb
      Blender -b --python tools/blender/build_goods_yard.py -- render    (shots into docs/shots/assets-goods_yard/)
"""
import sys, os, math, random, shutil
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import wb, limb, cyl, quad, new_bmesh_obj, hex_to_linear_rgb, export_glb, load_pbr_material, box_uv, ROOT
import arch
from arch import Kit, ring, lathe

CEMENT, CEMENT_HI, CEMENT_LO = 0xa29f96, 0xaeaba1, 0x8c897f
LIME, LIME_DIRTY, LIME_GREY = 0xd6d0c0, 0xc2bba8, 0xaaa496
MORTAR, MUD, ROPE, RUST = 0x8e877a, 0x6e5e4a, 0x9a8462, 0x7a4a2c
EARTH, EARTH_LO = 0xC4B496, 0xB0A07E          # material board 'packed_earth'
BRICK_TONES = [0x9a6650, 0x8e5d4a, 0xa36d55, 0x86594a, 0x9b7059]
JUTE_TONES = [0xE8DCC8, 0xD9CDB5, 0xEFE6D2, 0xCFC2A8, 0xE2D2B0, 0xC9BBA0]
WOOD_TONES = [0x9a8466, 0x8a7458, 0xa89070, 0x7f6a50]
TARP = 0x6f8798

XW, ZW = 4.5, 5.22          # wall centre lines (local)
T = 0.23                    # wall thickness
GX0, GX1 = -1.54, 1.50      # gate gap on the +z wall
HW = 1.55                   # wall height to the coping

# ---------------------------------------------------------------- per-face colours + damp band (same wrapper as build_field_props)
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

    def obox(self, cx, cz, w, d, h0, h1, yaw, col):
        """Box of size w (local x) by d (local z), turned by yaw (rad, +x toward +z), centred at (cx, cz)."""
        c, s = math.cos(yaw), math.sin(yaw)
        q = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
        q = [(cx + x * c - z * s, cz + x * s + z * c) for x, z in q]
        self.hexa([(x, z, h0) for x, z in q] + [(x, z, h1) for x, z in q], col)

    def obj(self, grime=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        o = new_bmesh_obj(self.name, self.bm)
        FACECOLS[o.name] = self.fc
        if grime:
            GRIME[o.name] = grime
        return o


def blob(name, cx, cz, h, rx, rz, seed, n=12, rough=0.22):
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


def place_M(px, pz, yaw):
    """Matrix: a piece built about its own origin, turned by yaw (+x toward +z) and moved to (px, pz) (local metres)."""
    return Matrix.Translation((px, -pz, 0)) @ Matrix.Rotation(-yaw, 4, 'Z')


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


# ---------------------------------------------------------------- a lying gunny sack: rounded pillow, dog-eared corners, own lumps
def sack_lying(name, cx, cz, h0, L, W, H, yaw, rnd, tilt=0.0):
    nu, nv = 12, 6
    ph = [rnd.uniform(0, math.tau) for _ in range(3)]
    sp = lambda v, e: math.copysign(abs(v) ** e, v)
    bm = bmesh.new()
    rings = []
    for k in range(1, nv):
        phi = -math.pi / 2 + math.pi * k / nv
        row = []
        for i in range(nu):
            th = (i + 0.5) / nu * math.tau
            cp, spp = sp(math.cos(phi), 0.55), sp(math.sin(phi), 0.55)
            x = L / 2 * cp * sp(math.cos(th), 0.3)
            z = W / 2 * cp * sp(math.sin(th), 0.3)
            y = H / 2 * spp
            corner = abs(math.cos(th) * math.sin(th)) * 2.0                  # 1 at the four plan corners
            ear = 1.0 + 0.09 * corner ** 3 * max(0.0, cp) ** 4                # dog ears at the seam ends
            lump = 1.0 + 0.035 * math.sin(th * 3 + ph[0]) * math.cos(phi * 2 + ph[1])
            x, z = x * ear * lump, z * ear * lump
            if y > 0:
                y *= 1.0 - 0.18 * (1.0 - corner) * cp                       # grain settles: top sags a little between the ears
            row.append((x, z, y))
        rings.append(row)
    # poles
    bot = bm.verts.new((0, 0, -H / 2 * 0.97))
    top = bm.verts.new((0, 0, H / 2 * 0.88))
    vs = [[bm.verts.new((x, -z, y)) for x, z, y in row] for row in rings]
    for k in range(len(vs) - 1):
        for i in range(nu):
            j = (i + 1) % nu
            bm.faces.new((vs[k][i], vs[k][j], vs[k + 1][j], vs[k + 1][i]))
    for i in range(nu):
        j = (i + 1) % nu
        bm.faces.new((bot, vs[0][j], vs[0][i]))
        bm.faces.new((vs[-1][i], vs[-1][j], top))
    for v in bm.verts:
        v.co.z = max(v.co.z, -H / 2 * 0.86)                                  # flat underside where it sits
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_bmesh_obj(name, bm)
    for p in o.data.polygons:
        p.use_smooth = True
    M = Matrix.Translation((cx, -cz, h0 + H / 2 * 0.86)) @ Matrix.Rotation(-yaw, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'X')
    return xform(o, M)


def add_sack(kit, rnd, cx, cz, h0, yaw, L=0.9, W=0.56, H=0.27, tilt=0.0):
    s = rnd.uniform(0.94, 1.06)
    kit.add('jute', sack_lying('sack', cx + rnd.uniform(-0.025, 0.025), cz + rnd.uniform(-0.025, 0.025), h0, L * s, W * rnd.uniform(0.95, 1.05),
                               H * rnd.uniform(0.92, 1.08), yaw + rnd.uniform(-0.09, 0.09), rnd, tilt), jit(JUTE_TONES[rnd.randint(0, len(JUTE_TONES) - 1)], rnd, 0.05))
    return H * 0.86


# ---------------------------------------------------------------- pallet / crate
def pallet(kit, rnd, cx, cz, h0, yaw, w=1.2, d=1.0, tone=None):
    """Real boards with gaps: 3 runners (stringers) on blocks, 7 top deck boards, 3 bottom boards."""
    m = Multi('pallet')
    tone = tone or WOOD_TONES[rnd.randint(0, 3)]
    for i, z in enumerate((-d / 2 + 0.05, 0.0, d / 2 - 0.05)):
        m.obox(0, z, w, 0.09, 0.022, 0.12, 0, jit(tone, rnd, 0.07))          # stringers
    for i, z in enumerate((-d / 2 + 0.05, 0.0, d / 2 - 0.05)):
        m.obox(0, z, w, 0.1, 0.0, 0.022, 0, jit(tone, rnd, 0.07))            # bottom boards along x
    n = 7
    for i in range(n):
        x = -w / 2 + 0.05 + (w - 0.1) * i / (n - 1)
        if rnd.random() < 0.06:
            continue
        m.obox(x + rnd.uniform(-0.01, 0.01), rnd.uniform(-0.01, 0.01), 0.1, d, 0.12, 0.142, rnd.uniform(-0.015, 0.015), jit(tone, rnd, 0.09))
    o = m.obj(grime=(h0, 0.25))
    xform(o, Matrix.Translation((0, 0, h0)))
    xform(o, place_M(cx, cz, yaw))
    kit.add('plank', o, None)
    return 0.142


def crate(kit, rnd, cx, cz, h0, yaw, w=0.62, d=0.42, h=0.34):
    """Slatted crate: corner posts, 3 slats a side with gaps, slatted bottom, open top with two slats lying across."""
    m = Multi('crate')
    tone = jit(WOOD_TONES[rnd.randint(0, 3)], rnd, 0.06)
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.box(sx * w / 2 - (0.04 if sx > 0 else 0), sx * w / 2 + (0 if sx > 0 else 0.04), sz * d / 2 - (0.04 if sz > 0 else 0), sz * d / 2 + (0 if sz > 0 else 0.04), 0.0, h, jit(tone, rnd, 0.05))
    for k in range(3):
        hb = 0.02 + k * (h - 0.03) / 3
        ht = hb + (h - 0.03) / 3 - 0.025
        for sz in (-1, 1):
            m.box(-w / 2 + 0.04, w / 2 - 0.04, sz * d / 2 - 0.012, sz * d / 2 + 0.006, hb, ht, jit(tone, rnd, 0.08))
        for sx in (-1, 1):
            m.box(sx * w / 2 - 0.012, sx * w / 2 + 0.006, -d / 2 + 0.04, d / 2 - 0.04, hb, ht, jit(tone, rnd, 0.08))
    for k in range(4):
        x = -w / 2 + 0.07 + (w - 0.14) * k / 3
        m.box(x - 0.05, x + 0.05, -d / 2 + 0.01, d / 2 - 0.01, 0.0, 0.015, jit(tone, rnd, 0.08))
    o = m.obj(grime=(0.0, 0.22))
    xform(o, Matrix.Translation((0, 0, h0)))
    xform(o, place_M(cx, cz, yaw))
    kit.add('plank', o, None)
    return h


# ================================================================ compound wall + gate + floor
def build_walls(kit, rnd):
    hx, hz = T / 2, T / 2
    runs = [  # (x0, x1, z0, z1, outward normal axis, sign)
        (-XW - hx, XW + hx, -ZW - hz, -ZW + hz, 'z', -1),
        (-XW - hx, -XW + hx, -ZW + hz, ZW - hz, 'x', -1),
        (XW - hx, XW + hx, -ZW + hz, ZW - hz, 'x', 1),
        (-XW - hx, GX0 + 0.2, ZW - hz, ZW + hz, 'z', 1),
        (GX1 - 0.2, XW + hx, ZW - hz, ZW + hz, 'z', 1),
    ]
    for (x0, x1, z0, z1, ax, sg) in runs:
        kit.add('brick', wb('wall', x0, x1, z0, z1, 0.0, HW, 0.006), jit(0xB39886, rnd, 0.03))
    # cement plinth skirt both faces, ragged top
    sk = Multi('skirt')
    for (x0, x1, z0, z1, ax, sg) in runs:
        for side in (-1, 1):
            if ax == 'z':
                plane = (z1 if side > 0 else z0)
                strips(sk, 'z', plane, side, x0, x1, lambda u: 0.0, lambda u: 0.26 + 0.05 * math.sin(u * 3.7) + rnd.uniform(-0.02, 0.02), 0.014,
                       lambda u: jit(CEMENT_LO if math.sin(u * 1.3) > 0 else CEMENT, rnd, 0.04), w=0.18)
            else:
                plane = (x1 if side > 0 else x0)
                strips(sk, 'x', plane, side, z0, z1, lambda u: 0.0, lambda u: 0.26 + 0.05 * math.sin(u * 3.1) + rnd.uniform(-0.02, 0.02), 0.014,
                       lambda u: jit(CEMENT_LO if math.sin(u * 1.7) > 0 else CEMENT, rnd, 0.04), w=0.18)
    kit.add('plaster', sk.obj(grime=(0.0, 0.35)))
    # old lime render clinging on in patches on the OUTER faces, ragged edges
    rp = Multi('render')
    for (x0, x1, z0, z1, ax, sg) in runs:
        u0, u1 = (x0, x1) if ax == 'z' else (z0, z1)
        plane = (z1 if sg > 0 else z0) if ax == 'z' else (x1 if sg > 0 else x0)
        L = u1 - u0
        for _ in range(max(1, int(L / 2.6))):
            a = rnd.uniform(u0 + 0.2, u1 - 1.0)
            b = min(u1 - 0.1, a + rnd.uniform(0.6, 1.6))
            top = rnd.uniform(0.9, 1.45)
            ph = rnd.uniform(0, 6)
            strips(rp, ax, plane, sg, a, b, lambda u: 0.28 + 0.06 * max(0.0, math.sin(u * 9 + ph)) + rnd.uniform(0.0, 0.03),
                   lambda u: 0.28 + (top - 0.28) * (math.sin((u - a) / (b - a) * math.pi) ** 0.8) * (0.72 + 0.14 * math.sin(u * 13 + ph) + 0.14 * math.sin(u * 37 + 2 * ph)) + rnd.uniform(-0.04, 0.03),
                   0.010, lambda u: jit(LIME_DIRTY if math.sin(u * 5 + ph) > -0.3 else LIME_GREY, rnd, 0.04), w=0.05)
    kit.add('plaster', rp.obj(grime=(0.0, 0.3)))
    # coping: cement slab segments with crack gaps, slight overhang
    cp = Multi('coping')
    for (x0, x1, z0, z1, ax, sg) in runs:
        u0, u1 = (x0, x1) if ax == 'z' else (z0, z1)
        n = max(1, int((u1 - u0) / 0.9))
        for i in range(n):
            a = u0 + (u1 - u0) * i / n + 0.006
            b = u0 + (u1 - u0) * (i + 1) / n - 0.006
            col = jit(CEMENT if i % 3 else CEMENT_LO, rnd, 0.05)
            top = HW + 0.075 - (0.02 if rnd.random() < 0.1 else 0.0)
            if ax == 'z':
                cp.box(a, b, z0 - 0.03, z1 + 0.03, HW, top, col)
            else:
                cp.box(x0 - 0.03, x1 + 0.03, a, b, HW, top, col)
    kit.add('plaster', cp.obj(grime=(-1, 0)))
    # pillars: lime-plastered, every ~3 m and at the corners, with a cement cap
    pil = [(-XW, -ZW), (XW, -ZW), (-XW, ZW), (XW, ZW), (-1.5, -ZW), (1.5, -ZW), (-XW, -1.74), (-XW, 1.74), (XW, -1.74), (XW, 1.74), (-3.0, ZW), (3.0, ZW)]
    pm = Multi('pillars')
    for (x, z) in pil:
        P = 0.19
        pm.box(x - P, x + P, z - P, z + P, 0.0, 1.78, jit(LIME_DIRTY if rnd.random() < 0.6 else LIME_GREY, rnd, 0.04))
    kit.add('plaster', pm.obj(grime=(0.0, 0.32)))
    for (x, z) in pil:
        kit.add('plaster', wb('pcap', x - 0.23, x + 0.23, z - 0.23, z + 0.23, 1.78, 1.85, 0.012), jit(CEMENT, rnd))
        if rnd.random() < 0.5:   # a chip knocked off a pillar corner, brick showing
            sx, sz = rnd.choice((-1, 1)), rnd.choice((-1, 1))
            kit.add('brick', wb('pchip', x + sx * 0.19 - sx * 0.1, x + sx * 0.188, z + sz * 0.19 - sz * 0.1, z + sz * 0.188, 0.5, 0.75, 0.004), jit(0xC9A090, rnd))
    # rain streaks down the pillars from the caps
    rs = Multi('streaks')
    for (x, z) in pil:
        ph = rnd.uniform(0, 6)
        for face, plane, sgn, u0, u1 in (('z', z + 0.19, 1, x - 0.17, x + 0.17), ('z', z - 0.19, -1, x - 0.17, x + 0.17), ('x', x + 0.19, 1, z - 0.17, z + 0.17), ('x', x - 0.19, -1, z - 0.17, z + 0.17)):
            strips(rs, face, plane, sgn, u0, u1, lambda u: 1.78 - 0.1 - 0.5 * max(0.0, math.sin(u * 23 + ph)) ** 2, lambda u: 1.775, 0.003,
                   lambda u: jit(0x8a8478, rnd, 0.05), w=0.03)
    kit.add('plaster', rs.obj(grime=(-1, 0)))
    # gate piers: bigger, rendered, pyramid caps
    for x in (GX0, GX1):
        P = 0.25
        gp = Multi('gate_pier')
        gp.box(x - P, x + P, ZW - P, ZW + P, 0.0, 1.95, jit(LIME_DIRTY, rnd, 0.03))
        kit.add('plaster', gp.obj(grime=(0.0, 0.35)))
        kit.add('plaster', wb('gp_cap', x - P - 0.05, x + P + 0.05, ZW - P - 0.05, ZW + P + 0.05, 1.95, 2.03, 0.012), jit(CEMENT, rnd))
        cm = Multi('gp_top')
        q = [(x - P - 0.03, ZW - P - 0.03), (x + P + 0.03, ZW - P - 0.03), (x + P + 0.03, ZW + P + 0.03), (x - P - 0.03, ZW + P + 0.03)]
        cm.hexa([(a, b, 2.03) for a, b in q] + [(x + (a - x) * 0.2, ZW + (b - ZW) * 0.2, 2.2) for a, b in q], jit(CEMENT_HI, rnd))
        kit.add('plaster', cm.obj(grime=(-1, 0)))
        ws = Multi('gp_wear')   # render worn off the outer face low down, brick behind
        strips(ws, 'z', ZW + P, 1, x - P + 0.03, x + P - 0.03, lambda u: 0.25, lambda u: 0.45 + 0.25 * max(0.0, math.sin(u * 11 + x)) ** 2, 0.004, lambda u: jit(0x8e5d4a, rnd, 0.05), w=0.06)
        kit.add('plaster', ws.obj(grime=(0.0, 0.2)))
    # gate leaves, iron, standing open inward against the front wall
    for hx_, ang, paint in ((GX0 + 0.27, math.radians(-154), 0x5d7280), (GX1 - 0.27, math.radians(-26), 0x5d7280)):
        start = len(kit.records)
        sgn = 1 if hx_ < 0 else -1
        Lf = 1.24
        x0, x1 = 0.0, Lf
        B, Tp = 0.08, 1.62
        PNT = jit(paint, rnd, 0.04)
        kit.add('metal', limb('stile_h', (x0, 0, B - 0.03), (x0, 0, Tp + 0.03), 0.05, 0.05), PNT)
        kit.add('metal', limb('stile_l', (x1, 0, B - 0.02), (x1, 0, Tp + 0.02), 0.045, 0.045), PNT)
        for hh in (B, 0.8, Tp):
            kit.add('metal', limb('rail', (x0, 0, hh), (x1, 0, hh), 0.045, 0.045), PNT)
        for i in range(1, 9):
            kit.add('metal', limb('bar', (x0 + Lf * i / 9, 0, 0.82), (x0 + Lf * i / 9, 0, Tp), 0.016, 0.016), PNT)
            kit.add('metal', limb('spike', (x0 + Lf * i / 9, 0, Tp), (x0 + Lf * i / 9, 0, Tp + 0.09), 0.012, 0.012), PNT)
        kit.add('metal', wb('sheet', x0 + 0.02, x1 - 0.02, -0.006, 0.006, B + 0.02, 0.79, 0.0, 1), jit(paint, rnd, 0.06))
        kit.add('metal', limb('tower_bolt', (x1 - 0.05, 0.03, 0.03), (x1 - 0.05, 0.03, 0.5), 0.02, 0.02), jit(RUST, rnd))
        M = place_M(hx_, ZW - 0.16, ang)
        for _, o, _ in kit.records[start:]:
            xform(o, M)
        for hh in (0.3, 1.35):
            kit.add('metal', limb('hinge', (hx_ - sgn * 0.12, ZW - 0.13, hh), (hx_, ZW - 0.16, hh), 0.03, 0.03), jit(RUST, rnd))
    # brick-on-edge apron through the gate
    ap = Multi('apron')
    z = ZW + 0.5
    row = 0
    while z > ZW - 1.0:
        x = GX0 + 0.3 + (0.115 if row % 2 else 0.0) - 0.23
        while x < GX1 - 0.3:
            a, b = max(x, GX0 + 0.27), min(x + 0.225, GX1 - 0.27)
            if b - a > 0.05:
                sink = -0.02 if rnd.random() < 0.08 else rnd.uniform(-0.006, 0.004)
                ap.box(a, b, z - 0.07, z, -0.05, 0.06 + sink, jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.06))
            x += 0.23
        z -= 0.075
        row += 1
    kit.add('plaster', ap.obj(grime=(0.0, 0.25)))
    # floor: packed earth
    kit.add('earth', wb('floor', -XW + hx, XW - hx, -ZW + hz, ZW - hz, -0.06, 0.03, 0.01), EARTH)
    # spilled grain near the stacks and the scale, a dark stain where the thela stands, a swept-up mound of chaff
    for (x, z, rx, rz, c) in ((-2.0, -3.15, 0.35, 0.14, 0xCDB78A), (-0.4, -3.2, 0.18, 0.09, 0xC9B180), (2.6, 1.08, 0.28, 0.08, 0xCDB78A), (1.2, -2.15, 0.2, 0.1, 0xC9B180)):
        kit.add('plaster', blob('floor_mark', x, z, 0.062, rx, rz, rnd.randint(0, 999)), jit(c, rnd, 0.04))


# ================================================================ tin lean-to on the back wall, sack stack under it
def build_lean_to(kit, rnd):
    X0, X1 = -4.35, 0.45
    ZB, ZF = -5.05, -3.05
    HB, HF = 2.55, 2.18
    slope = lambda z: HB + (HF - HB) * (z - ZB) / (ZF - ZB)
    posts = [-4.2, -1.9, 0.3]
    pc = jit(0x4a4e4c, rnd, 0.05)
    for x in posts:
        for z in (ZB + 0.06, ZF + 0.12):
            kit.add('metal', cyl('post', x, z, 0.0, slope(z) - 0.05, 0.038, seg=8), pc)
            kit.add('plaster', cyl('post_foot', x, z, 0.0, 0.12, 0.11, 0.09, seg=8), jit(CEMENT, rnd))
        kit.add('metal', limb('rafter', (x, ZB - 0.05, slope(ZB - 0.05) - 0.05), (x, ZF + 0.18, slope(ZF + 0.18) - 0.05), 0.05, 0.04), pc)
    for z in (ZB + 0.06, (ZB + ZF) / 2, ZF + 0.12):
        kit.add('metal', limb('purlin', (X0 + 0.05, z, slope(z) - 0.02), (X1 - 0.05, z, slope(z) - 0.02), 0.045, 0.04), jit(RUST, rnd, 0.06))
    # roof: two sheets lapped, galvanised grey with rust
    rm = Multi('roof')
    xm = (X0 + X1) / 2 + 0.2
    for (a, b, lift) in ((X0, xm + 0.08, 0.0), (xm - 0.08, X1, 0.02)):
        q = [(a, ZB - 0.1), (b, ZB - 0.1), (b, ZF + 0.3), (a, ZF + 0.3)]
        rm.hexa([(x, z, slope(z) + lift) for x, z in q] + [(x, z, slope(z) + lift + 0.02) for x, z in q], 0xa9b0b2)
    kit.add('tin', rm.obj(), jit(0xa9b0b2, rnd, 0.04))
    # bricks weighing the sheet edge
    for x in (-3.6, -1.2, 0.1):
        b = wb('roof_brick', -0.115, 0.115, -0.055, 0.055, 0.0, 0.075, 0.006)
        z = ZF + 0.2
        xform(b, Matrix.Translation((x, -z, slope(z) + 0.06)) @ Matrix.Rotation(rnd.uniform(-0.3, 0.3), 4, 'Z') @ Matrix.Rotation(math.atan2(HB - HF, ZF - ZB), 4, 'X'))
        kit.add('plaster', b, jit(BRICK_TONES[rnd.randint(0, 4)], rnd))
    # pallets + brick-bonded sack stack
    for i, x in enumerate((-3.62, -2.38, -1.14)):
        pallet(kit, rnd, x + rnd.uniform(-0.03, 0.03), -4.22, 0.03, rnd.uniform(-0.03, 0.03))
    h = 0.03 + 0.142
    courses = [(4, 0.0), (3, 0.45), (4, 0.0), (3, 0.45), (2, 0.9)]
    for k, (n, off) in enumerate(courses):
        for row, z in enumerate((-4.53, -3.92)):
            if k == 4 and row == 1:
                continue
            for i in range(n):
                x = -4.05 + off + i * 0.92
                add_sack(kit, rnd, x + 0.45, z, h, 0.0)
        h += 0.235
    # two sacks lying slumped against the stack front
    add_sack(kit, rnd, -0.25, -3.25, 0.03, math.radians(78), tilt=0.12)
    add_sack(kit, rnd, -1.0, -3.35, 0.03, math.radians(8))


# ================================================================ tarpaulin-covered pile
def build_tarp(kit, rnd):
    cx, cz, A, Bz, H = 2.65, -3.75, 1.55, 1.15, 1.25
    nx, nz = 34, 26
    gx0, gx1, gz0, gz1 = cx - A - 0.4, cx + A + 0.4, cz - Bz - 0.3, cz + Bz + 0.4
    gx1 = min(gx1, XW - T / 2 - 0.02)
    gz0 = max(gz0, -ZW + T / 2 + 0.02)
    ph = [rnd.uniform(0, 6.28) for _ in range(5)]

    def hgt(x, z):
        u, v = (x - cx) / A, (z - cz) / Bz
        d = (abs(u) ** 4 + abs(v) ** 4) ** 0.25
        core = max(0.0, min(1.0, (1.12 - d) / 0.34)) ** 0.7
        lumps = 0.05 * math.sin(x * 4.1 + ph[0]) * math.sin(z * 3.7 + ph[1]) + 0.03 * math.sin(x * 9.3 + z * 7.1 + ph[2])
        fold = 0.035 * max(0.0, math.sin((x + z * 0.3) * 6.0 + ph[3])) ** 3 * (1 - core)
        return max(0.06, H * core + lumps * core + 0.04 * (1 - core) * (0.5 + 0.5 * math.sin(x * 5 + z * 3 + ph[4])) + fold)

    bm = bmesh.new()
    grid = []
    for j in range(nz + 1):
        z = gz0 + (gz1 - gz0) * j / nz
        row = []
        for i in range(nx + 1):
            x = gx0 + (gx1 - gx0) * i / nx
            row.append(bm.verts.new((x, -z, hgt(x, z))))
        grid.append(row)
    cols = []
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            hz = sum(v.co.z for v in (grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])) / 4
            t = max(0.0, min(1.0, hz / H))
            top_c, mid_c, hem_c = (0x8a, 0xa0, 0xae), (0x6f, 0x87, 0x98), (0x76, 0x7c, 0x70)   # sun-bleached top, faded blue, dusty hem
            a, b, f = (mid_c, top_c, (t - 0.5) / 0.5) if t > 0.5 else (hem_c, mid_c, t / 0.5)
            f = f * f * (3 - 2 * f)
            c = (int(a[0] + (b[0] - a[0]) * f) << 16) | (int(a[1] + (b[1] - a[1]) * f) << 8) | int(a[2] + (b[2] - a[2]) * f)
            cols.append(jit(c, rnd, 0.025))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    o = new_bmesh_obj('tarp', bm)
    for p in o.data.polygons:
        p.use_smooth = True
    FACECOLS[o.name] = cols
    kit.add('tarp', o, TARP)
    # two ropes over the top, tied off to bricks
    for x in (cx - 0.7, cx + 0.65):
        pts = [(x + 0.04 * math.sin(k), gz0 + 0.1 + (gz1 - gz0 - 0.2) * k / 12) for k in range(13)]
        pts = [(px, pz, hgt(px, pz) + 0.015) for px, pz in pts]
        for a, b in zip(pts, pts[1:]):
            kit.add('plaster', limb('rope', a, b, 0.018, 0.018), jit(ROPE, rnd, 0.05))
    # bricks holding the hem, a couple of sack corners showing at the open end
    for (x, z) in ((gx0 + 0.15, gz1 - 0.15), (gx0 + 0.2, (gz0 + gz1) / 2), (cx, gz1 - 0.1), (gx1 - 0.15, gz1 - 0.2), (cx - 0.9, gz1 - 0.12)):
        b = wb('hem_brick', -0.115, 0.115, -0.055, 0.055, 0.0, 0.075, 0.006)
        xform(b, Matrix.Translation((x, -z, hgt(x, z) - 0.01)) @ Matrix.Rotation(rnd.uniform(0, 3), 4, 'Z'))
        kit.add('plaster', b, jit(BRICK_TONES[rnd.randint(0, 4)], rnd))
    add_sack(kit, rnd, gx0 + 0.45, gz1 - 0.05, 0.03, math.radians(95), H=0.25)


# ================================================================ platform weighing scale
def build_scale(kit, rnd):
    cx, cz = 2.55, 1.85
    kit.add('plaster', wb('scale_plinth', cx - 0.85, cx + 0.85, cz - 0.7, cz + 0.7, -0.03, 0.13, 0.02), jit(CEMENT, rnd))
    kit.add('plaster', wb('plinth_chip', cx + 0.6, cx + 0.86, cz + 0.5, cz + 0.71, 0.05, 0.135, 0.008), jit(CEMENT_LO, rnd))
    kit.add('plaster', blob('plinth_wear', cx, cz + 0.1, 0.132, 0.55, 0.4, rnd.randint(0, 999)), jit(0x95918a, rnd))
    frame = jit(0x4f6a52, rnd, 0.05)        # old green paint
    H0 = 0.13
    # base frame + chequer deck
    kit.add('metal', wb('scale_base', cx - 0.42, cx + 0.42, cz - 0.3, cz + 0.42, H0, H0 + 0.12, 0.01), frame)
    kit.add('metal', wb('scale_deck', cx - 0.4, cx + 0.4, cz - 0.28, cz + 0.4, H0 + 0.12, H0 + 0.15, 0.006), jit(0x6c6f6c, rnd, 0.05))
    dm = Multi('chequer')
    for i in range(7):
        for j in range(6):
            x = cx - 0.34 + i * 0.113
            z = cz - 0.22 + j * 0.113
            dm.obox(x, z, 0.05, 0.012, H0 + 0.15, H0 + 0.156, math.radians(45 if (i + j) % 2 else -45), jit(0x5e615e, rnd, 0.05))
    kit.add('metal', dm.obj(grime=(-1, 0)))
    for sx in (-1, 1):
        kit.add('metal', cyl('wheel', cx + sx * 0.32, cz + 0.45, 0.13, 0.13 + 0.002, 0.07, seg=10), jit(0x3e3a36, rnd))
        kit.add('metal', ring('caster', cx + sx * 0.32, cz + 0.45, H0 + 0.07, 0.055, 0.02, axis='x', seg=10, tube=4), jit(0x3e3a36, rnd))
    # column at the back, beam on top, poise and hanger
    kit.add('metal', wb('column', cx - 0.06, cx + 0.06, cz - 0.36, cz - 0.24, H0 + 0.12, H0 + 1.05, 0.008), frame)
    kit.add('metal', wb('col_box', cx - 0.12, cx + 0.12, cz - 0.38, cz - 0.22, H0 + 0.95, H0 + 1.12, 0.01), frame)
    BH = H0 + 1.2
    kit.add('metal', limb('beam', (cx - 0.38, cz - 0.30, BH), (cx + 0.42, cz - 0.30, BH), 0.03, 0.045), jit(0x8d9294, rnd, 0.04))
    kit.add('metal', limb('beam_stay', (cx, cz - 0.30, H0 + 1.12), (cx - 0.05, cz - 0.30, BH), 0.025, 0.025), frame)
    for k in range(8):
        x = cx - 0.3 + k * 0.09
        kit.add('metal', limb('notch', (x, cz - 0.30, BH + 0.02), (x, cz - 0.30, BH + 0.032), 0.006, 0.05), jit(0x5e615e, rnd))
    kit.add('metal', wb('poise', cx + 0.1, cx + 0.17, cz - 0.34, cz - 0.26, BH - 0.04, BH + 0.05, 0.01), jit(0x6f7374, rnd))
    kit.add('metal', limb('hanger', (cx + 0.42, cz - 0.30, BH), (cx + 0.42, cz - 0.30, BH - 0.35), 0.012, 0.012), jit(0x5e615e, rnd))
    for k in range(3):
        kit.add('metal', cyl('slot_wt', cx + 0.42, cz - 0.30, BH - 0.35 - (k + 1) * 0.025, BH - 0.35 - k * 0.025 - 0.003, 0.06 - k * 0.008, seg=12), jit(0x4a4e4c, rnd))
    # loose counterweights stacked on the plinth
    for k, (r, t) in enumerate(((0.085, 0.03), (0.075, 0.028), (0.065, 0.025), (0.055, 0.022))):
        h0 = 0.13 + sum(tt for _, tt in ((0.085, 0.03), (0.075, 0.028), (0.065, 0.025), (0.055, 0.022))[:k])
        kit.add('metal', cyl('counterwt', cx - 0.6 + rnd.uniform(-0.01, 0.01), cz + 0.35, h0, h0 + t - 0.002, r, seg=12), jit(0x4a4e4c, rnd, 0.06))
    # a sack being weighed on the deck, another standing ready
    add_sack(kit, rnd, cx, cz + 0.06, H0 + 0.156, math.radians(4), L=0.82, W=0.52, H=0.28)
    arch.sack(kit, cx - 1.05, cz + 0.45, 0.03, ang=0.6, colour=jit(JUTE_TONES[1], rnd), w=0.5, d=0.36, hh=0.72, kind='jute')


# ================================================================ thela (hand cart)
def build_thela(kit, rnd):
    start = len(kit.records)
    L, W, BH = 1.9, 0.92, 0.7
    # bed: frame of square iron, planked deck (each plank its own piece, real gaps)
    iron = jit(0x5a5c58, rnd, 0.05)
    for sz in (-1, 1):
        kit.add('metal', limb('side', (-L / 2, sz * W / 2, BH - 0.03), (L / 2, sz * W / 2, BH - 0.03), 0.045, 0.045), iron)
    for x in (-L / 2, 0.0, L / 2):
        kit.add('metal', limb('cross', (x, -W / 2, BH - 0.03), (x, W / 2, BH - 0.03), 0.04, 0.04), iron)
    tone = WOOD_TONES[rnd.randint(0, 3)]
    kit.add('wood', wb('deck', -L / 2 - 0.02, L / 2 + 0.02, -W / 2 + 0.01, W / 2 - 0.01, BH, BH + 0.03, 0.006), jit(tone, rnd, 0.05))   # arch.plank_wood cuts the planks
    # low side boards
    for sz in (-1, 1):
        kit.add('plank', wb('sideboard', -L / 2, L / 2, sz * W / 2 - 0.015, sz * W / 2 + 0.015, BH + 0.03, BH + 0.16, 0.004), jit(tone, rnd, 0.06))
    # shafts out front (+x), stand under the front, two spoked wheels on an axle at the middle
    for sz in (-1, 1):
        kit.add('metal', limb('shaft', (L / 2, sz * (W / 2 - 0.05), BH - 0.03), (L / 2 + 0.85, sz * (W / 2 - 0.12), BH - 0.08), 0.04, 0.04), iron)
    kit.add('metal', limb('grip_bar', (L / 2 + 0.85, -(W / 2 - 0.12), BH - 0.08), (L / 2 + 0.85, W / 2 - 0.12, BH - 0.08), 0.035, 0.035), jit(0x3e3a36, rnd))
    for sz in (-1, 1):
        kit.add('metal', limb('stand', (L / 2 - 0.1, sz * (W / 2 - 0.08), BH - 0.05), (L / 2 - 0.05, sz * (W / 2 - 0.08), 0.0), 0.035, 0.035), iron)
        kit.add('metal', limb('rear_stand', (-L / 2 + 0.1, sz * (W / 2 - 0.08), BH - 0.05), (-L / 2 + 0.05, sz * (W / 2 - 0.08), 0.0), 0.035, 0.035), iron)
    R = 0.34
    WZ = W / 2 + 0.08
    kit.add('metal', limb('axle', (0, -WZ - 0.03, R), (0, WZ + 0.03, R), 0.035, 0.035), iron)
    for sz in (-1, 1):
        z = sz * WZ
        kit.add('metal', limb('hanger', (-0.06, z, BH - 0.05), (0, z, R), 0.03, 0.03), iron)
        kit.add('metal', limb('hanger2', (0.06, z, BH - 0.05), (0, z, R), 0.03, 0.03), iron)
        kit.add('metal', ring('tyre', 0, z, R, R - 0.03, 0.03, axis='z', seg=18, tube=5), jit(0x34322f, rnd, 0.04))
        kit.add('metal', ring('rim', 0, z, R, R - 0.065, 0.012, axis='z', seg=16, tube=4), jit(0x8d9294, rnd))
        kit.add('metal', cyl('hub', 0, z - 0.05, R - 0.04, R + 0.04, 0.035, seg=8), jit(0x6f7374, rnd))
        for k in range(10):
            a = k / 10 * math.tau
            kit.add('metal', limb('spoke', (0, z, R), (R * 0.82 * math.cos(a), z + 0.01 * sz, R + R * 0.82 * math.sin(a)), 0.006, 0.006), jit(0x8d9294, rnd))
    # three sacks on the bed
    for (x, z, ya) in ((-0.48, -0.2, 0.05), (0.42, -0.18, -0.08), (-0.05, 0.12, 1.5)):
        add_sack(kit, rnd, x, z, BH + 0.03, ya, L=0.86, W=0.52, H=0.26)
    M = place_M(-1.35, 1.25, math.radians(-22))
    for _, o, _ in kit.records[start:]:
        xform(o, M)


# ================================================================ pallets, crates, plank-and-brick stack
def build_stores(kit, rnd):
    # empty pallets stacked on the right wall, each a little out of line, one leaning on the wall
    h = 0.03
    for k in range(5):
        h += pallet(kit, rnd, 3.72 + rnd.uniform(-0.05, 0.05), -1.35 + rnd.uniform(-0.05, 0.05), h, math.radians(90 + rnd.uniform(-4, 4)))
    start = len(kit.records)
    pallet(kit, rnd, 0, 0, 0.0, math.radians(90))
    M = Matrix.Translation((3.96, 0.0, 0.03)) @ Matrix.Rotation(math.radians(-70), 4, 'Y') @ Matrix.Translation((0.5, 0, 0))
    for _, o, _ in kit.records[start:]:
        xform(o, M)
    # crates: a stack of three and two on the floor
    h = 0.03
    for k in range(3):
        h += crate(kit, rnd, 3.82 + rnd.uniform(-0.04, 0.04), 1.1 + rnd.uniform(-0.04, 0.04), h, math.radians(90 + rnd.uniform(-6, 6)))
    crate(kit, rnd, 3.3, 0.35, 0.03, math.radians(rnd.uniform(70, 110)))
    crate(kit, rnd, 3.85, 2.05, 0.03, math.radians(rnd.uniform(-20, 20)), w=0.56, d=0.4, h=0.3)
    # brick stack (left wall): modelled bricks, header/stretcher courses, a few missing at the top
    bm_ = Multi('brick_stack')
    X0, Z0 = -4.25, -2.80
    for k in range(9):
        h0 = 0.03 + k * 0.077
        if k % 2 == 0:
            for i in range(4):
                for j in range(4):
                    if k >= 7 and rnd.random() < 0.3:
                        continue
                    x, z = X0 + j * 0.115, Z0 + i * 0.235
                    bm_.box(x + 0.004, x + 0.109, z + 0.004, z + 0.229, h0, h0 + 0.072, jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.05))
        else:
            for i in range(8):
                for j in range(2):
                    if k >= 7 and rnd.random() < 0.3:
                        continue
                    x, z = X0 + j * 0.23, Z0 + i * 0.1175
                    bm_.box(x + 0.004, x + 0.226, z + 0.004, z + 0.112, h0, h0 + 0.072, jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.05))
    kit.add('plaster', bm_.obj(grime=(0.0, 0.25)))
    for k in range(4):
        b = wb('loose_brick', -0.115, 0.115, -0.055, 0.055, 0.0, 0.075, 0.006)
        xform(b, Matrix.Translation((-3.55 + rnd.uniform(-0.2, 0.2), -(-2.5 + rnd.uniform(-0.3, 0.3)), 0.03)) @ Matrix.Rotation(rnd.uniform(0, 3), 4, 'Z'))
        kit.add('plaster', b, jit(BRICK_TONES[rnd.randint(0, 4)], rnd))
    # plank stack on two low brick piers, spacer battens between layers
    pm = Multi('piers')
    for z in (-1.2, 0.9):
        for k in range(3):
            h0 = 0.03 + k * 0.077
            for j in range(2):
                bm_x = -4.2 + j * 0.25 + (0.06 if k % 2 else 0)
                pm.box(bm_x, bm_x + 0.225, z - 0.055, z + 0.055, h0, h0 + 0.072, jit(BRICK_TONES[rnd.randint(0, 4)], rnd, 0.05))
    kit.add('plaster', pm.obj(grime=(0.0, 0.2)))
    h = 0.03 + 3 * 0.077
    for layer in range(3):
        for i in range(4 - (layer == 2)):
            x = -4.22 + i * 0.165 + rnd.uniform(-0.01, 0.01)
            p = wb('plank', x, x + 0.15, -1.62 + rnd.uniform(-0.05, 0.05), 1.45 + rnd.uniform(-0.08, 0.08), h, h + 0.04, 0.004)
            xform(p, Matrix.Translation((x + 0.075, 0, 0)) @ Matrix.Rotation(rnd.uniform(-0.012, 0.012), 4, 'Z') @ Matrix.Translation((-x - 0.075, 0, 0)))
            kit.add('plank', p, jit(WOOD_TONES[rnd.randint(0, 3)], rnd, 0.06))
        h += 0.04
        if layer < 2:
            for z in (-1.2, 0.9):
                kit.add('plank', wb('batten', -4.25, -3.55, z - 0.03, z + 0.03, h, h + 0.03, 0.003), jit(WOOD_TONES[1], rnd))
            h += 0.03


# ================================================================ assembly
def build_all():
    arch.clear_scene()
    _clear, _export = arch.clear_scene, arch.export_glb
    captured = []
    arch.clear_scene = lambda: None
    arch.export_glb = lambda objs, out: captured.extend(objs)
    kit = Kit(split_props=False, own=('wood', 'metal', 'jute'), route={'tarp': 'thatch', 'plank': 'wood'}, tex_override={'thatch': ('tarpaulin', 1.0)})
    rnd = random.Random(7121)
    build_walls(kit, rnd)
    build_lean_to(kit, rnd)
    build_tarp(kit, rnd)
    build_scale(kit, rnd)
    build_thela(kit, rnd)
    build_stores(kit, rnd)
    kit.finalize('unused', {'hb_brick': '#FFFFFF'}, drift_amp=0.06, ao_strength=0.5)
    arch.clear_scene, arch.export_glb = _clear, _export
    e = bpy.data.objects.new('goods_yard', None)
    bpy.context.collection.objects.link(e)
    for o in captured:
        o.name = 'goods_yard_' + o.name.split('.')[0]
        o.parent = e
    for o in captured:
        print('MESH tris', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
    print('ROOT tris goods_yard', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in captured))
    return [(e, captured)]


def export(empties):
    out = os.path.join(ROOT, 'tmp', 'goods_yard_raw.glb')
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
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.001))
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
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-goods_yard')
    os.makedirs(d, exist_ok=True)
    # Blender coords: x = local x, y = -local z. The gate (+z local) is at Blender y = -5.22.
    shots = [('a_over_gate', (3.0, -15.0, 9.0), (0.0, 0.5, 0.6), 28, (50, 0, 30)),
             ('b_inside_stack', (2.0, -3.0, 1.7), (-1.6, 3.8, 0.9), 24, (55, 0, 40)),
             ('c_scale_thela', (-2.8, -4.4, 1.6), (1.8, -1.2, 0.6), 26, (60, 0, -35))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'build'
    em = build_all()
    if which == 'render':
        render(em)
    else:
        export(em)
