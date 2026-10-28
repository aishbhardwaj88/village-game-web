"""
mud_dung (PARALLEL.md top section 3, her 28 Oct verdict on the rough_surfaces mud panel: "too smooth and too uniform").

A ~2 x 2 m kachcha wall face finished with lipai (mud + gobar, smeared on by hand), rebuilt so the hand is in the geometry:
  - HAND-SMEAR ARCS: ~110 palm sweeps laid bottom-up like a person working along the wall. Each sweep is a ~70-130 deg arc around
    the wrist/elbow, ~10 cm wide, carrying 3-4 FINGER-DRAG GROOVES (real displacement, 2-4 mm deep) that fade as the hand lifts off,
    a pushed-up lip of material along both edges and a small heap where the stroke stops. Later sweeps overwrite earlier ones, so
    the fans overlap the way real lipai does.
  - Under the sweeps: the wall itself is not flat (+-12 mm bellies, a thicker foot), plus two flaked spots where the newest coat
    came away and shows the older, redder coat 4 mm below, and two hairline shrinkage cracks.
  - STRAW AND HUSK FLECKS are separate little ridged slivers and diamonds sitting ON the surface (chopped bhusa 1-4 cm long, partly
    buried, standing up to ~2.5 mm proud), so they catch light and cast tiny shadows.
  - COLOUR DRIFTS across the wall (vertex colour): a low-frequency field between reddish mud, olive-grey dung and pale dried
    patches, a per-sweep batch tint (each handful of the mix is slightly different), darker groove floors, paler dried crests,
    sun-paler top, and a DARK DAMP BAND at the foot with a wandering tide line and splash flecks above it.

Material: frozen lime-plaster set (matte, repeat 0.5) via the Kit 'props' slot; all the mud/dung colour is vertex colour (the
terracotta / pots precedent). Mud-and-dung is NOT an approved library set, so no new texture is introduced.

Run (repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_mud_dung.py [-- render]   -> tmp/mud_dung_panel_raw.glb
  node tools/shrink.js tmp/mud_dung_panel_raw.glb public/assets/models/mud_dung_panel.glb 999999
  node tools/strip-textures.mjs public/assets/models/mud_dung_panel.glb public/assets/models/mud_dung_panel.glb
Frame: Blender +Z up, the finished face looks toward -Y (glTF +Z, 'south'). Panel spans x -1..1, z 0..2, core 0.3 m thick behind.
"""
import os
import sys
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector
from common import wb, hex_to_linear_rgb, ROOT
import arch
from arch import Kit

OUT = os.path.join(ROOT, 'tmp', 'mud_dung_panel_raw.glb')
SHOTS = os.path.join(ROOT, 'docs', 'shots', 'mud-dung-2026-10-28')
W, HH, T = 2.0, 2.0, 0.3
CORE_GAP = 0.012                      # core face sits 12 mm behind the skin datum: the skin's deepest point is 4.2 mm behind it, so the core never pokes through
NU, NV = 140, 140                     # 1.43 cm grid: finger grooves are ~3.2 cm apart, so >2 samples a period


def _hooked(orig):
    def fn(obj, base_hex, seed=0):
        if 'Base' in obj.data.color_attributes:   # built here with its own modelled relief and colour
            return True
        return orig(obj, base_hex, seed)
    return fn


arch.earth_ground = _hooked(arch.earth_ground)
_orig_dirt = arch.bake_dirty_vertex_colors


def _soft_dirt(obj, blur_iterations=2, dirt_only=False):
    """Same softening as build_rough_surfaces.py: keep contact shadow in grooves, lose the whole-mesh-normalised blotches."""
    _orig_dirt(obj, blur_iterations=4, dirt_only=dirt_only)
    a = obj.data.color_attributes['AO']
    n = len(a.data)
    buf = [0.0] * (n * 4)
    a.data.foreach_get('color', buf)
    for i in range(n):
        for k in range(3):
            buf[i * 4 + k] = 0.55 + 0.45 * min(1.0, buf[i * 4 + k] * 1.6)
    a.data.foreach_set('color', buf)


arch.bake_dirty_vertex_colors = _soft_dirt


def lin(c):
    return hex_to_linear_rgb(c)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def scale(a, k):
    return tuple(min(0.92, max(0.02, a[i] * k)) for i in range(3))


def to_bm(c):
    """bmesh byte-colour layers store RAW sRGB bytes (no conversion), while color_attributes[...].color reads them back as linear.
    Writing linear values straight in squared every colour (0.32 -> 0.09): encode to sRGB first."""
    def enc(v):
        v = max(0.0, min(1.0, v))
        return v * 12.92 if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    return (enc(c[0]), enc(c[1]), enc(c[2]), 1.0)


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


MUD, DUNG, PALE = lin(0xA8876A), lin(0x958A6E), lin(0xC6B190)
DAMP, TIDE = lin(0x6C5844), lin(0x5A4836)
OLD = lin(0xB08C70)
STRAW, STRAW_GREY, HUSK = lin(0xE2CA8E), lin(0xBCAE8E), lin(0xD2B68A)


class Wall:
    def __init__(self, seed):
        rnd = self.rnd = random.Random(seed)
        self.ph = [rnd.uniform(0, 6.28) for _ in range(12)]
        # palm sweeps, laid row by row from the foot up (the mason works upward), each row left-to-right or back
        self.strokes = []
        rows = 13
        for r in range(rows):
            zc = -0.02 + (HH + 0.06) * r / (rows - 1)
            cols = 9
            order = range(cols) if r % 2 == 0 else range(cols - 1, -1, -1)
            for c in order:
                for _ in range(1 if rnd.random() < 0.8 else 2):
                    mx = -W / 2 - 0.05 + (W + 0.1) * (c + rnd.uniform(0.1, 0.9)) / cols
                    mz = zc + rnd.uniform(-0.07, 0.07)
                    R = rnd.uniform(0.22, 0.42)
                    span = math.radians(rnd.uniform(70, 130))
                    # the wrist sits below and to one side of the arc: the arc's mid-normal leans up-left or up-right
                    lean = rnd.uniform(-0.9, 0.9) + (0.0 if rnd.random() < 0.7 else math.pi)
                    nx, nz = math.sin(lean), math.cos(lean)
                    px, pz = mx - R * nx, mz - R * nz
                    amid = math.atan2(nz, nx)
                    sgn = 1 if rnd.random() < 0.5 else -1
                    a0 = amid - sgn * span / 2
                    nf = 4 if rnd.random() < 0.6 else 3
                    fingers = [(-0.75 + 1.5 * f / (nf - 1)) + rnd.uniform(-0.06, 0.06) for f in range(nf)]
                    self.strokes.append(dict(px=px, pz=pz, R=R, a0=a0, span=span, sgn=sgn, w=rnd.uniform(0.085, 0.115),
                                             depth=rnd.uniform(0.0022, 0.0042), fingers=fingers,
                                             tint=rnd.uniform(-1, 1), k=rnd.uniform(0.93, 1.06), lift=rnd.uniform(0.45, 0.8)))
        self.flakes = [(rnd.uniform(-0.7, 0.6), rnd.uniform(0.75, 1.6), rnd.uniform(0.05, 0.09), rnd.uniform(0.03, 0.06)) for _ in range(2)]
        self.cracks = [(rnd.uniform(-0.8, 0.8), rnd.uniform(1.0, 1.5), rnd.uniform(-0.3, 0.3), rnd.uniform(0.25, 0.45)) for _ in range(2)]
        self.splash = [(rnd.uniform(-1, 1), rnd.uniform(0.3, 0.62) ** 1.0, rnd.uniform(0.006, 0.016)) for _ in range(70)]

    def damp_line(self, x):
        p = self.ph
        return 0.30 + 0.05 * math.sin(x * 2.3 + p[6]) + 0.025 * math.sin(x * 7.1 + p[7]) + 0.012 * math.sin(x * 19 + p[8])

    def field(self, x, z):
        """-> (relief metres outward, info dict for colour)."""
        p = self.ph
        bulge = 0.010 * math.sin(x * 2.1 + p[0]) * math.sin(z * 1.7 + p[1]) + 0.005 * math.sin(x * 4.3 - z * 3.1 + p[2])
        lump = 0.0012 * math.sin(x * 37 + z * 11 + p[3]) * math.sin(z * 29 - x * 7 + p[4])
        foot = 0.012 * (1 - smooth(0.0, 0.35, z))                       # the wall thickens at its foot
        rel = 0.0                                                        # stroke relief, layered
        groove_v, crest_v, stroke_k, stroke_tint, cover = 0.0, 0.0, 1.0, 0.0, 0.0
        for s in self.strokes:
            dx, dz = x - s['px'], z - s['pz']
            r = math.hypot(dx, dz)
            hw = s['w'] / 2
            off = (r - s['R']) / hw                                       # -1..1 across the palm
            if abs(off) > 1.45:
                continue
            ang = ((math.atan2(dz, dx) - s['a0']) * s['sgn']) % (2 * math.pi)
            arc = ang * s['R']
            L = s['span'] * s['R']
            if arc > L + 0.035:
                if arc < 2 * math.pi * s['R'] - 0.02:
                    continue
                arc -= 2 * math.pi * s['R']                               # just before the start
            t = arc / L
            press = smooth(-0.08, 0.08, t) * (1 - s['lift'] * smooth(0.3, 1.0, t))   # hand lands, then lifts off
            g = 0.0
            for f in s['fingers']:
                g = max(g, math.exp(-((off - f) / 0.2) ** 2))
            inside = 1 - smooth(0.85, 1.05, abs(off))
            lip = math.exp(-((abs(off) - 1.12) / 0.14) ** 2)
            heap = math.exp(-((arc - L - 0.012) / 0.014) ** 2) * (1 - smooth(0.6, 1.1, abs(off)))
            h = -s['depth'] * press * g * inside + 0.55 * s['depth'] * press * lip + 0.0025 * heap
            m = (1 - smooth(1.0, 1.45, abs(off))) * smooth(-0.12, 0.0, t) * (1 - smooth(1.0, 1.0 + 0.035 / L, t))
            m = max(m, heap)
            if m <= 0:
                continue
            rel = rel * (1 - m) + h * m
            groove_v = groove_v * (1 - m) + g * inside * press * m
            crest_v = crest_v * (1 - m) + (lip * press + heap) * m
            stroke_k = stroke_k * (1 - m) + s['k'] * m
            stroke_tint = stroke_tint * (1 - m) + s['tint'] * m
            cover = max(cover, m)
        flake = 0.0
        for fx, fz, rx, rz in self.flakes:
            e = ((x - fx) / rx) ** 2 + ((z - fz) / rz) ** 2 + 0.25 * math.sin(math.atan2(z - fz, x - fx) * 5 + fx * 9)
            flake = max(flake, 1 - smooth(0.8, 1.0, e))
        crack = 0.0
        for cx, cz, lean, ln in self.cracks:
            if cz - ln / 2 < z < cz + ln / 2:
                along = x - (cx + lean * (z - cz) + 0.012 * math.sin(z * 41 + cx))
                crack = max(crack, max(0.0, 1 - abs(along) / 0.009) * math.sin(math.pi * (z - cz + ln / 2) / ln))
        total = 0.014 + bulge + lump + foot + rel * (1 - flake) - 0.004 * flake - 0.0015 * crack
        return total, dict(groove=groove_v * (1 - flake), crest=crest_v * (1 - flake), k=stroke_k, tint=stroke_tint, flake=flake,
                           crack=crack, bulge=bulge)

    def colour(self, x, z, info, rnd):
        p = self.ph
        a = 0.5 + 0.5 * math.sin(x * 1.3 + z * 0.6 + p[9]) * math.cos(z * 1.1 - x * 0.4 + p[10])
        b = 0.5 + 0.5 * math.sin(x * 3.1 - z * 2.3 + p[11])
        c = mix(MUD, DUNG, 0.25 + 0.55 * a + 0.2 * info['tint'] * 0.5)      # mud vs dung drift + this sweep's batch
        c = mix(c, PALE, 0.35 * b * (0.6 + 0.4 * smooth(0.6, 2.0, z)))      # dried paler patches, more toward the sun-baked top
        c = mix(c, OLD, info['flake'])
        k = info['k'] * (1 - 0.22 * info['groove']) * (1 + 0.10 * info['crest']) * (1 + 6.0 * info['bulge'])
        k *= 1 - 0.45 * info['crack'] - 0.12 * info['flake'] * (1 - info['flake']) * 4
        c = scale(c, k)
        dl = self.damp_line(x)
        damp = 1 - smooth(dl - 0.10, dl, z)
        c = mix(c, DAMP, 0.85 * damp)
        tide = math.exp(-((z - dl + 0.012) / 0.014) ** 2)
        c = mix(c, TIDE, 0.55 * tide)
        for sx, sz, r in self.splash:
            d = math.hypot(x - sx, z - sz)
            if d < r:
                c = mix(c, DAMP, 0.6 * (1 - d / r))
        return scale(c, 0.97 + 0.06 * rnd.random())


def build_skin(wall, rnd):
    bm = bmesh.new()
    layer = bm.loops.layers.color.new('Base')
    vs, cols = {}, {}
    for i in range(NU + 1):
        for j in range(NV + 1):
            x = -W / 2 + W * i / NU
            z = HH * j / NV
            rel, info = wall.field(x, z)
            edge = smooth(0.0, 0.05, min(x + W / 2, W / 2 - x)) * smooth(0.0, 0.03, z)
            rt = smooth(HH - 0.10, HH, z)                               # wall head rolls back over the top
            y = -T / 2 + CORE_GAP * (1 - edge) - rel * edge * (1 - 0.6 * rt) + 0.07 * rt ** 2   # edges tuck into the core
            zz = z - 0.025 * rt ** 2
            if i in (0, NU) or j == 0:
                y = -T / 2 + CORE_GAP
            vs[(i, j)] = bm.verts.new((x, y, zz))
            cols[(i, j)] = wall.colour(x, z, info, rnd)
    for i in range(NU):
        for j in range(NV):
            f = bm.faces.new((vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]))
            f.smooth = True
    bm.normal_update()
    if sum(f.normal.y for f in bm.faces) > 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    vidx = {v: k for k, v in vs.items()}
    for f in bm.faces:
        for lp in f.loops:
            c = cols[vidx[lp.vert]]
            lp[layer] = to_bm(c)
    me = bpy.data.meshes.new('mud_skin')
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new('mud_skin', me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build_flecks(wall, rnd):
    """Chopped straw (thin ridged slivers) and husk (flat diamonds) lying on / half-buried in the surface."""
    bm = bmesh.new()
    layer = bm.loops.layers.color.new('Base')

    def surf(x, z):
        rel, info = wall.field(x, z)
        return -T / 2 - rel, info

    def put(pts, faces, col):
        vv = [bm.verts.new(p) for p in pts]
        for fi in faces:
            try:
                f = bm.faces.new([vv[k] for k in fi])
            except ValueError:
                continue
            f.smooth = False
            for lp in f.loops:
                lp[layer] = to_bm(col)

    n_straw = n_husk = 0
    for _ in range(520):
        x, z = rnd.uniform(-0.94, 0.94), rnd.uniform(0.05, 1.9)
        y0, info = surf(x, z)
        L = rnd.uniform(0.012, 0.04) if rnd.random() < 0.85 else rnd.uniform(0.04, 0.065)
        ang = rnd.uniform(0, math.pi)
        # straws get dragged along the sweeps: bias toward the local stroke direction is implicit in the random angle; keep it random
        ux, uz = math.cos(ang) * L / 2, math.sin(ang) * L / 2
        wx, wz = -math.sin(ang), math.cos(ang)
        w = rnd.uniform(0.0012, 0.0022)
        h = rnd.uniform(0.0008, 0.0025)
        bury = rnd.random()                                       # >0.6: one end dives under the mud
        ya, _ = surf(x - ux, z - uz)
        yb, _ = surf(x + ux, z + uz)
        ha, hb = h, (h if bury < 0.6 else -0.0005)
        a = (x - ux, ya, z - uz)
        b = (x + ux, yb, z + uz)
        pts = [(a[0] - wx * w, a[1] + 0.0006, a[2] - wz * w), (a[0] + wx * w, a[1] + 0.0006, a[2] + wz * w),
               (b[0] + wx * w, b[1] + 0.0006, b[2] + wz * w), (b[0] - wx * w, b[1] + 0.0006, b[2] - wz * w),
               (a[0], a[1] - ha, a[2]), (b[0], b[1] - hb, b[2])]
        col = mix(STRAW, STRAW_GREY, rnd.random() * 0.8)
        dl = wall.damp_line(x)
        col = mix(col, DAMP, 0.7 * (1 - smooth(dl - 0.1, dl, z)))     # straw in the damp band is wet and dark too
        col = scale(col, rnd.uniform(0.8, 1.05))
        put(pts, [(0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2)], col)
        n_straw += 1
    for _ in range(300):
        x, z = rnd.uniform(-0.94, 0.94), rnd.uniform(0.05, 1.9)
        y0, info = surf(x, z)
        r = rnd.uniform(0.0025, 0.0045)
        ang = rnd.uniform(0, math.pi)
        ca, sa = math.cos(ang), math.sin(ang)
        q = 0.45
        pts = [(x + ca * r, y0 + 0.0005, z + sa * r), (x - sa * r * q, y0 + 0.0005, z + ca * r * q),
               (x - ca * r, y0 + 0.0005, z - sa * r), (x + sa * r * q, y0 + 0.0005, z - ca * r * q),
               (x, y0 - rnd.uniform(0.0008, 0.0016), z)]
        col = scale(mix(HUSK, PALE, rnd.random() * 0.5), rnd.uniform(0.85, 1.05))
        dl = wall.damp_line(x)
        col = mix(col, DAMP, 0.6 * (1 - smooth(dl - 0.1, dl, z)))
        put(pts, [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], col)
        n_husk += 1
    bm.normal_update()
    for f in bm.faces:                                              # every fleck faces the camera side (-Y)
        if f.normal.y > 0:
            f.normal_flip()
    me = bpy.data.meshes.new('mud_flecks')
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new('mud_flecks', me)
    bpy.context.scene.collection.objects.link(obj)
    print('flecks: straw', n_straw, 'husk', n_husk)
    return obj


def build():
    kit = Kit(split_props=True)                    # kind 'earth' -> 'props' group -> frozen lime plaster set at 0.5
    rnd = random.Random(11)
    wall = Wall(17)
    kit.add('earth', build_skin(wall, rnd))
    kit.add('earth', build_flecks(wall, rnd))
    kit.add('earth', wb('mud_core', -W / 2, W / 2, -T / 2 + CORE_GAP, T / 2, 0.0, HH - 0.02, 0.05), 0x9C8668)
    kit.finalize(OUT, {'hb_earth': '#FFFFFF'}, drift_amp=0.04, ao_strength=0.5)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            print('group', o.name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))


def render():
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    clay = 'clay' in sys.argv
    if clay:   # measurable check only: plain matte material, vertex colour kept, no plaster normal map -> shows the modelled relief alone
        cm = bpy.data.materials.new('clay'); cm.use_nodes = True
        nt = cm.node_tree
        bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.95
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'AO'
        nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
        for o in bpy.data.objects:
            if o.type == 'MESH' and o.name.startswith('hb_'):
                o.data.materials.clear(); o.data.materials.append(cm)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.001))
    g = bpy.context.active_object
    gm = bpy.data.materials.new('ground'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.22, 0.17, 1)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    g.data.materials.append(gm)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.color = (1.0, 0.94, 0.84)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    os.makedirs(SHOTS, exist_ok=True)
    shots = [
        # flat-lit front: soft sky, sun straight from behind the camera, square to the wall, wall fills the frame
        ('a_front_flat', (1100, 1100), (0.0, -5.6, 1.0), (0.0, 0.0, 1.0), 50, (0.0, 1.0, -0.12), 2.2, 1.0),
        # raking light close: low sun skimming in from the left, camera close on the damp foot and the sweeps above it
        ('b_raking_close', (1400, 900), (0.15, -1.55, 0.75), (0.15, 0.0, 0.62), 40, (1.0, 0.14, -0.22), 4.5, 0.25),
        ('c_raking_upper', (1400, 900), (-0.2, -1.4, 1.45), (-0.2, 0.0, 1.35), 40, (-1.0, 0.12, -0.35), 4.5, 0.25),
    ]
    for name, res, loc, look, lens, sdir, energy, sky in shots:
        sc.render.resolution_x, sc.render.resolution_y = res
        bg.inputs['Color'].default_value = (0.55, 0.6, 0.68, 1)
        bg.inputs['Strength'].default_value = sky
        sun.data.energy = energy
        sun.rotation_euler = Vector(sdir).normalized().to_track_quat('-Z', 'Y').to_euler()
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(SHOTS, name + ('_clay' if clay else '') + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


build()
if '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--') + 1:]:
    render()
