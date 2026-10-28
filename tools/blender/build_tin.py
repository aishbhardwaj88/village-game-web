"""
Tin (corrugated galvanised iron) as GEOMETRY - PARALLEL.md item 1, her verdict twice: "Tin is still flat."

One ~2.2 x 2.0 m roof panel at a 15 deg lean-to pitch: 3 sheets across x 2 rows up the slope = 6 sheets, every one its own shell.
  - corrugation: a true sine across each sheet, pitch 76 mm, depth 18 mm, 6 vertices per pitch, so the eave silhouette is wavy.
  - side laps: each sheet is 10.5 corrugations wide and lies 1.5 corrugations over its neighbour (offset 9 pitches, so the
    profiles nest); end lap 150 mm where the upper row lies over the lower. Every lapping sheet sits 2.5-4.5 mm proud, with a
    darkened band beside its edge on the sheet below (the shadow line) and rust bleeding out of the laps down the valleys.
  - screws: hex head + washer on CROWNS only (every second crown, purlin rows), each slightly crooked, each with a rust tear
    running down-slope from it. Missing screws where a corner has lifted leave just their stain.
  - per sheet: in-plane skew and offset (the eave line is not straight), a gentle bow, one free corner lifted 6-22 mm, a dent or
    two, its own age (one newer bluish sheet, one older rustier one), zinc bloom, dust settled in the valleys, sun-bleached crowns.
  - frame: three 60 x 50 mm purlins + two rafters + four posts in the frozen wood set, so the sample stands on its own.

Library sets only, through arch.py's Kit: 'tin' (CorrugatedSteel005, repeat 0.8) and 'wood' (repeat 1.0). arch.corrugate stays the
default for every other building; it is hooked here only to skip meshes that already carry their own modelled 'Base' colour.

Run:  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_tin.py [-- render]
      node tools/shrink.js tmp/tin_panel_raw.glb public/assets/models/tin_panel.glb 999999
      node tools/strip-textures.mjs public/assets/models/tin_panel.glb public/assets/models/tin_panel.glb
Frame: Blender +Z up, the slope faces -Y (glTF +Z, 'south'); eave centre at (0, 0, EAVE_Z).
"""
import os
import sys
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix, noise
from common import ROOT, hex_to_linear_rgb, cyl, limb, box_uv, load_pbr_material
import arch
from arch import Kit

OUT = os.path.join(ROOT, 'tmp', 'tin_panel_raw.glb')
SHOTS = os.path.join(ROOT, 'docs', 'shots', 'tin-2026-10-28')

P = 0.076            # corrugation pitch
A = 0.009            # half the 18 mm depth
NCORR = 10.5         # corrugations per sheet (side lap 1.5 -> neighbours 9 pitches apart, profiles nest)
SEG = 6              # vertices per pitch
THK = 0.0010         # modelled sheet thickness (top skin to underside)
PITCH = math.radians(15)
EAVE_Z = 1.75
L_LOW, L_UP, LAP = 1.15, 1.0, 0.15      # sheet lengths along the slope; upper row starts at t = L_LOW - LAP
X0 = -NCORR * P * 0.5 - 9 * P            # left edge of sheet column 0 (panel centred on x = 0)

DIRV = Vector((0, math.cos(PITCH), math.sin(PITCH)))     # up the slope
NRM = Vector((0, -math.sin(PITCH), math.cos(PITCH)))     # sheet normal
ORIG = Vector((0, 0, EAVE_Z))


def _hooked(orig):
    def fn(obj, base_hex, seed=0):
        if 'Base' in obj.data.color_attributes:
            return True
        return orig(obj, base_hex, seed)
    return fn


arch.corrugate = _hooked(arch.corrugate)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def world(s, t, h):
    return ORIG + Vector((s, 0, 0)) + DIRV * t + NRM * h


# ---------------------------------------------------------------- the sheets
class Sheet:
    def __init__(self, col, row, seed):
        r = random.Random(seed)
        self.col, self.row, self.r = col, row, r
        self.L = L_LOW if row == 0 else L_UP
        self.s0 = X0 + col * 9 * P + r.uniform(-0.0015, 0.0015) + (r.uniform(-0.004, 0.004) if row else 0.0)
        self.t0 = (0.0 if row == 0 else L_LOW - LAP) + r.uniform(-0.012, 0.012)
        self.ang = math.radians(r.uniform(-0.12, 0.12))           # in-plane skew
        self.lift = col * 0.0025 + row * 0.0045                    # stacking: c+1 over c, upper row over lower
        self.amp = A * r.uniform(0.95, 1.05)
        self.bow = r.uniform(-0.0012, 0.0012)
        self.twist = r.uniform(-0.0015, 0.0015)
        self.age = [0.55, 0.25, 0.8, 0.4, 0.15, 0.65][(row * 3 + col) % 6]     # 0 newer .. 1 old
        self.tint = mix((0.90, 0.93, 0.97), (0.80, 0.78, 0.74), self.age)
        # one free corner lifts: the left edge is the exposed one (c+1 laps over c); lower row at the eave, upper at the end lap
        self.corner = r.uniform(0.006, 0.022) if r.random() < 0.75 else 0.0
        self.cr = (r.uniform(0.22, 0.4), r.uniform(0.22, 0.42))
        self.dents = []
        for _ in range(r.randint(0, 2)):
            self.dents.append((r.uniform(1.5 * P, 8.5 * P), r.uniform(0.2, self.L - 0.25), r.uniform(0.05, 0.1), r.uniform(0.0015, 0.0035)))
        self.off = Vector((r.uniform(-60, 60), r.uniform(-60, 60), r.uniform(-60, 60)))
        self.screws, self.stains = [], []

    def g(self, u, v):
        """local (u across from the left edge, v up the slope from the lower edge) -> global slope coords (s, t)"""
        ca, sa = math.cos(self.ang), math.sin(self.ang)
        cu, cv = u - NCORR * P / 2, v - self.L / 2
        return (self.s0 + NCORR * P / 2 + ca * cu - sa * cv, self.t0 + self.L / 2 + sa * cu + ca * cv)

    def corner_w(self, u, v):
        ru, rv = self.cr
        return (max(0.0, 1 - u / ru) ** 2) * (max(0.0, 1 - v / rv) ** 2)

    def h(self, u, v):
        prof = math.cos(2 * math.pi * u / P)
        x = v / self.L
        hh = self.lift + self.amp * prof
        hh -= self.bow * math.sin(math.pi * x) + self.twist * (u / (NCORR * P) - 0.5) * x
        hh += self.corner * self.corner_w(u, v)
        for (du, dv, rad, dep) in self.dents:
            q = math.exp(-((u - du) ** 2 + (v - dv) ** 2) / (rad * rad))
            hh -= dep * q * (0.6 + 0.4 * (prof * 0.5 + 0.5))     # dents flatten the crowns most
        return hh


def make_sheets():
    sheets = []
    seed = 11
    for row in (0, 1):
        for col in range(3):
            sheets.append(Sheet(col, row, seed))
            seed += 17
    return sheets


def screw_layout(sheets):
    rnd = random.Random(5)
    for sh in sheets:
        rows = (0.07, 0.6) if sh.row == 0 else (LAP / 2, 0.5, sh.L - 0.07)
        crowns = (1, 3, 5, 7) if sh.col < 2 else (1, 3, 5, 7, 9)
        for ri, v in enumerate(rows):
            for k in crowns:
                kk = k + (1 if (ri % 2 and k < 9) else 0) if sh.col < 2 else k   # rows stagger by a crown
                u = kk * P + rnd.uniform(-0.002, 0.002)
                vv = v + rnd.uniform(-0.008, 0.008)
                gone = sh.corner and sh.corner_w(u, vv) > 0.12
                if not gone and rnd.random() < 0.04:
                    gone = True                                    # one fell out years ago
                (sh.stains if gone else sh.screws).append((u, vv, rnd.uniform(0.09, 0.32), rnd.random()))


def sheet_colour(sh, sheets, u, v, top=True):
    s, t = sh.g(u, v)
    q = Vector((s, t, 0)) + sh.off
    prof = math.cos(2 * math.pi * u / P)
    crown, valley = 0.5 + 0.5 * prof, 0.5 - 0.5 * prof
    if not top:
        c = mix((0.62, 0.62, 0.60), (0.50, 0.40, 0.32), 0.4 * sh.age + 0.3 * max(0.0, noise.noise(q * 4)))
        return mix(c, (0.40, 0.20, 0.09), 0.5 * (1 - smooth(0.0, 0.12, v)) * sh.age)
    c = sh.tint
    n1 = noise.noise(q * 2.2)
    n2 = noise.noise(q * 9.0)
    c = tuple(x * (1.0 + 0.06 * n1 + 0.03 * n2) for x in c)
    c = mix(c, (0.95, 0.94, 0.90), 0.22 * smooth(0.15, 0.6, noise.noise(q * 3.1 + Vector((7, 1, 3)))))   # white zinc bloom
    c = tuple(x * (0.97 + 0.06 * crown) for x in c)                                                        # bleached crowns
    c = mix(c, (0.66, 0.57, 0.45), valley * (0.18 + 0.12 * max(0.0, n1)))                                  # dust in the valleys
    rust = 0.0
    rust += (1 - smooth(0.0, 0.06 + 0.08 * (0.5 + 0.5 * n2), v)) * (0.35 + 0.6 * sh.age)                  # lower sheet edge
    rust += sh.age * 0.55 * smooth(0.25, 0.75, noise.noise(q * 5.0 + Vector((3, 9, 1)))) * (0.4 + 0.6 * valley)
    # rust bleeding out of the laps, down the valleys
    for o in sheets:
        if o is sh:
            continue
        if o.lift > sh.lift and o.row > sh.row and o.s0 - 0.02 < s < o.s0 + NCORR * P + 0.02:
            d = o.t0 - t                                   # metres below the upper sheet's lower edge
            if 0 < d < 0.22:
                rust += valley ** 2 * (1 - d / 0.22) ** 1.5 * (0.5 + 0.5 * max(0.0, noise.noise(Vector((s * 40, 0, 0)) + sh.off)))
    # rust tears from every screw (and from the holes of missing ones)
    for (su, sv, ln, rr) in sh.screws + sh.stains:
        dv = sv - v
        if -0.012 < dv < ln:
            w = 0.007 + 0.02 * max(0.0, dv) / ln
            du = abs(u - su - 0.004 * math.sin(dv * 40 + rr * 6))
            if du < w:
                k = (1 - du / w) * (1 - max(0.0, dv) / ln) ** 0.7 * (0.75 + 0.25 * rr)
                rust += 1.3 * k
    rust = min(1.0, rust)
    rc = mix((0.78, 0.36, 0.13), (0.44, 0.21, 0.09), 0.5 + 0.5 * n2)
    c = mix(c, rc, rust * 0.92)
    # shadow line: a dark band on this sheet just outside the edge of any sheet lapping over it
    for o in sheets:
        if o.lift <= sh.lift:
            continue
        ol, oh = o.s0, o.s0 + NCORR * P
        if o.row == sh.row and o.t0 - 0.02 < t < o.t0 + o.L:
            d = ol - s
            if -0.004 < d < 0.016:
                c = tuple(x * (0.45 + 0.55 * smooth(0.0, 0.016, d)) for x in c)
        if o.row > sh.row and ol - 0.01 < s < oh:
            d = o.t0 - t
            if -0.004 < d < 0.02:
                c = tuple(x * (0.42 + 0.58 * smooth(0.0, 0.02, d)) for x in c)
    return tuple(min(0.95, max(0.03, x)) for x in c)


def sheet_mesh(sh, sheets):
    nu = int(round(NCORR * SEG))
    us = [NCORR * P * i / nu for i in range(nu + 1)]
    vs = [(sh.L * j / 14, True) for j in range(15)]
    for (su, sv, *_rest) in sh.screws + sh.stains:                  # crisp tear starts: a row just above and below each screw row
        for dv in (-0.012, 0.012):
            vs.append((min(sh.L - 0.005, max(0.005, sv + dv)), False))
    vs = sorted(set(vs), key=lambda a: a[0])
    clean = []
    for v, f in vs:
        if clean and abs(v - clean[-1][0]) < 0.006:
            if f:
                clean[-1] = (v, f)
            continue
        clean.append((v, f))
    vs = clean
    bot_idx = [j for j, (v, f) in enumerate(vs) if f]
    bm = bmesh.new()
    lay = bm.loops.layers.color.new('Base')
    T, B, CT, CB = {}, {}, {}, {}
    for i, u in enumerate(us):
        for j, (v, f) in enumerate(vs):
            s, t = sh.g(u, v)
            hh = sh.h(u, v)
            T[i, j] = bm.verts.new(world(s, t, hh))
            CT[i, j] = sheet_colour(sh, sheets, u, v, True)
            if j in bot_idx:
                B[i, j] = bm.verts.new(world(s, t, hh - THK))
                CB[i, j] = sheet_colour(sh, sheets, u, v, False)
    faces = []

    def face(vs_, cols):
        f = bm.faces.new(vs_)
        faces.append((f, cols))

    for i in range(nu):
        for j in range(len(vs) - 1):
            face((T[i, j], T[i + 1, j], T[i + 1, j + 1], T[i, j + 1]), (CT[i, j], CT[i + 1, j], CT[i + 1, j + 1], CT[i, j + 1]))
        for a, b in zip(bot_idx, bot_idx[1:]):
            face((B[i, a], B[i, b], B[i + 1, b], B[i + 1, a]), (CB[i, a], CB[i, b], CB[i + 1, b], CB[i + 1, a]))
    jl = len(vs) - 1
    for i in range(nu):        # eave and head edges: thin wavy strips
        for j in (0, jl):
            face((T[i, j], B[i, j], B[i + 1, j], T[i + 1, j]), (CB[i, j],) * 4)
    for i in (0, nu):          # side edges: one n-gon per underside span (the top skin has more rows)
        for a, b in zip(bot_idx, bot_idx[1:]):
            ring = [T[i, j] for j in range(a, b + 1)] + [B[i, b], B[i, a]]
            face(ring, (CB[i, a],) * len(ring))
    for f, cols in faces:
        f.smooth = True
        for lp, c in zip(f.loops, cols):
            lp[lay] = (c[0], c[1], c[2], 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # the side n-gons are thin: keep them flat-shaded so the skin normals are not dragged sideways
    for f in bm.faces:
        if len(f.verts) > 4:
            f.smooth = False
    me = bpy.data.meshes.new('tin_sheet')
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new('tin_sheet', me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def screw_objs(sh):
    out = []
    r = random.Random(sh.col * 31 + sh.row * 7 + 3)
    for (u, v, ln, rr) in sh.screws:
        s, t = sh.g(u, v)
        p = world(s, t, sh.h(u, v))
        tilt = Matrix.Rotation(math.radians(r.uniform(-4, 4)), 4, 'X') @ Matrix.Rotation(math.radians(r.uniform(-4, 4)), 4, 'Y')
        M = Matrix.Translation(p) @ Matrix.Rotation(PITCH, 4, 'X') @ tilt @ Matrix.Rotation(r.uniform(0, 1), 4, 'Z')
        washer = cyl('washer', 0, 0, -0.0004, 0.0018, 0.0095, 0.0085, seg=10)
        head = cyl('head', 0, 0, 0.0018, 0.0068, 0.0052, 0.0050, seg=6)
        rust = (0.35 + 0.6 * sh.age) * (0.4 + 0.6 * rr)
        for o, base in ((washer, (0.62, 0.62, 0.60)), (head, (0.70, 0.70, 0.68))):
            o.data.transform(M)
            c = mix(base, (0.50, 0.24, 0.10), min(0.9, rust))
            col = o.data.color_attributes.new('Base', 'FLOAT_COLOR', 'CORNER')
            for d in col.data:
                d.color = (c[0], c[1], c[2], 1.0)
            out.append(o)
    return out


def frame(kit):
    """60 x 50 mm purlins under the screw rows, two rafters, four posts (wood set). limb() takes (wx, wz, h): wz = -y."""
    ws = X0 - 0.06, X0 + NCORR * P + 18 * P + 0.06
    under = -A - 0.0016 - 0.006 - 0.03      # 6 mm clear of the lowest valley (bow + dents sag the sheet)
    def wp(s, t, h):
        p = world(s, t, h)
        return (p.x, -p.y, p.z)
    for t in (0.07, 0.6, L_LOW - LAP / 2, L_LOW - LAP + 0.5, L_LOW - LAP + L_UP - 0.07):
        kit.add('wood', limb('purlin', wp(ws[0], t, under), wp(ws[1], t, under), 0.05, 0.06), 0xB0A088)
    for s in (ws[0] + 0.1, ws[1] - 0.1):
        kit.add('wood', limb('rafter', wp(s, -0.05, under - 0.06), wp(s, L_LOW - LAP + L_UP + 0.05, under - 0.06), 0.07, 0.06), 0x9C8C74)
        for t in (0.07, L_LOW - LAP + L_UP - 0.1):
            top = world(s, t, under - 0.09)
            kit.add('wood', limb('post', (top.x, -top.y, 0.0), (top.x, -top.y, top.z), 0.075), 0xA89A82)


def build():
    kit = Kit(split_props=True, own=('wood',))
    sheets = make_sheets()
    screw_layout(sheets)
    for sh in sheets:
        kit.add('tin', sheet_mesh(sh, sheets))
        for o in screw_objs(sh):
            kit.add('tin', o)
    frame(kit)
    kit.finalize(OUT, {'hb_tin': '#FFFFFF', 'hb_wood': '#FFFFFF'}, drift_amp=0.03, ao_strength=0.35)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            print('group', o.name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
    print('screws', sum(len(s.screws) for s in sheets), 'stains', sum(len(s.stains) for s in sheets))


def render():
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    g = bpy.context.active_object
    gm = load_pbr_material('ground', 'dryearth', repeat=(1.0, 1.0))
    g.data.materials.append(gm); box_uv(g, (1, 1, 1))
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.color = (1.0, 0.94, 0.84); sun.data.angle = math.radians(1.5)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    os.makedirs(SHOTS, exist_ok=True)
    mid = world(0, 1.0, 0)
    eave_l = world(-0.6, 0.0, 0)
    shots = [  # name, camera, look-at, lens, sun (rot deg), sun energy, world strength
        ('a_front_flat', mid + NRM * 3.2 + Vector((0, -0.2, 0)), mid, 42, (20, 0, 0), 2.6, 1.1),
        ('b_eave_low', Vector((-1.55, -1.25, 1.22)), eave_l + Vector((0.35, 0, 0)), 30, (62, 0, -40), 4.0, 1.2),
        ('c_lap_raking', world(0.15, 0.55, 0) + Vector((0.55, -0.75, 0.55)), world(0.1, 1.0, 0), 45, (78, 0, 65), 4.0, 0.5),
    ]
    for name, loc, look, lens, srot, se, ws_ in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in srot)
        sun.data.energy = se
        bg.inputs['Strength'].default_value = ws_
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(SHOTS, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


build()
if '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--') + 1:]:
    render()
