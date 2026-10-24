"""
Shared architecture helpers for the Blender building scripts (school, halwai, tea stall, ...).
build_house.py predates this module and keeps its own copies; new buildings use this.

Frame (same as common.py): wx = world X offset (east +), wz = world Z offset (south +), h = height,
all relative to the building's anchor point (the `*_CENTER` constants in src/village.js). Blender
Y = -wz, so glTF Z = wz and a model exported this way is placed with an EXACT asset slot at the anchor.

Typical script:
    kit = Kit()                                   # materials + object registry
    b = Bldg('main', -12, 12, 6, 12, 3.7)         # footprint x0,x1,z0,z1 + wall height
    kit.add('plaster', b.wall('S', cuts=[...]))
    ...
    kit.finalize(OUT, tints={...})                # join per material, UV, AO, tint, export
"""
import os
import sys
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import (
    clear_scene, load_pbr_material, wire_vertex_ao, hex_to_linear_rgb, bake_dirty_vertex_colors,
    join_objects, export_glb, boolean_cut, colorize, wb, limb, cyl, sphere, prism_x, prism_z, quad,
    make_paint_material, box_uv, ROOT,
)

# Draw-call budget (2026-10-21): every building is ONE textured mesh ('hb_main', the CC0 plaster set, colour from
# vertex colours: kinds plaster/plinth/trim/floor/apron/wood/concrete/paint all fold into it) plus, only where used,
# a brick mesh and a corrugated-tin mesh (their textures carry real detail) and the transparent decals.
MAIN_KINDS_TEXTURE = ('plaster', 0.5)
OWN_TEXTURE_KINDS = {'brick': ('brick', 1.2), 'tin': ('tin', 0.8), 'terracotta': ('terracotta', 1.0), 'thatch': ('thatch', 1.0), 'wood': ('wood', 1.0), 'metal': ('metal', 1.0), 'jute': ('jute', 2.6)}
OPT_IN_KINDS = ('thatch', 'wood', 'metal', 'jute')  # own real PBR set only when the script asks (Kit(own=(...))): each is one extra draw call per building


class Kit:
    def __init__(self, split_props=True, own=(), tex_override=None, route=None, wood_slot=None):
        clear_scene()
        if wood_slot:   # real wood set riding in a material slot this building does not use (brick/terracotta/tin): zero extra draw calls
            route = dict(route or {}, wood=wood_slot)
            tex_override = dict(tex_override or {}, **{wood_slot: ('wood', 1.0)})
        self.split_props = split_props
        self.own = tuple(own)
        self.route = route or {}                 # e.g. {'thatch': 'props'}: send a kind into another group (its material/draw call)
        self.tex_override = tex_override or {}   # e.g. {'tin': ('thatch', 1.0)}: a building with no tin of its own re-uses the tin slot (and its draw call) for another real set
        self.records = []   # (kind, obj, colour or None)
        self.extra = []     # objects exported as-is (decals), joined by the caller

    def add(self, kind, obj, color=None):
        self.records.append((kind, obj, color))
        return obj

    @property
    def G(self):
        out = {}
        for k, o, _ in self.records:
            out.setdefault(k, []).append(o)
        return out

    def finalize(self, out, tints, drift=None, ao_strength=0.5, drift_amp=0.05):
        """Colour every object (per-kind sRGB tint from `tints['hb_<kind>']`, or its own paint colour) into a 'Base'
        vertex-colour layer, join into hb_main / hb_brick / hb_tin, box-UV, bake dirty-vertex AO, then write
        AO(soft) x Base x a smooth +-drift into the exported COLOR_0 layer."""
        groups = {'main': [], 'props': [], 'brick': [], 'tin': [], 'terracotta': [], 'thatch': [], 'wood': [], 'metal': [], 'jute': []}
        for kind, obj, color in self.records:
            if color is None:
                color = int(tints.get('hb_' + kind, '#ffffff').lstrip('#'), 16)
            colorize(obj, color, attr='Base')
            groups[self.route.get(kind) or kind if kind in ('brick', 'tin', 'terracotta') or kind in self.own or kind in self.route else ('props' if (kind == 'paint' and self.split_props) else 'main')].append(obj)
        mats = {}
        for g, objs in groups.items():
            if not objs:
                continue
            tex, rep = self.tex_override.get(g) or OWN_TEXTURE_KINDS.get(g, MAIN_KINDS_TEXTURE)  # 'props' (kind paint) = same plaster set, its own material so it can skip the shadow pass
            m = load_pbr_material('hb_' + g, tex, repeat=(rep, rep))
            wire_vertex_ao(m, strength=0.5)
            for o in objs:
                o.data.materials.clear()
                o.data.materials.append(m)
        exports = []
        for g, objs in groups.items():
            if not objs:
                continue
            obj = join_objects(objs, 'hb_' + g)
            box_uv(obj, (1, 1, 1))
            me = obj.data
            me.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
            me.color_attributes.active_color = me.color_attributes['AO']
            bake_dirty_vertex_colors(obj)
            ao_layer = me.color_attributes['AO']
            base_layer = me.color_attributes['Base']
            n = len(me.loops)
            ao = [0.0] * (n * 4)
            base = [0.0] * (n * 4)
            ao_layer.data.foreach_get('color', ao)
            base_layer.data.foreach_get('color', base)
            verts = me.vertices
            for li in range(n):
                co = verts[me.loops[li].vertex_index].co
                v = 1.0 + drift_amp * math.sin(co.x * 0.9 + co.y * 1.3) * math.cos(co.z * 0.7 + co.x * 0.4) + drift_amp * 0.5 * math.sin(co.y * 3.1 + co.z * 2.3)
                for k in range(3):
                    a = 1.0 - (1.0 - ao[li * 4 + k]) * ao_strength
                    ao[li * 4 + k] = min(1.0, a * base[li * 4 + k] * v)
            ao_layer.data.foreach_set('color', ao)
            me.color_attributes.active_color = ao_layer
            me.color_attributes.remove(base_layer)
            exports.append(obj)
        export_glb(exports + self.extra, out)
        print('tri count', sum(len(o.data.polygons) for o in exports + self.extra))


class Bldg:
    """An axis-aligned building footprint with named faces, for placing things ON a wall.
    Face names: 'S' = +wz side, 'N' = -wz side, 'E' = +wx, 'W' = -wx. `t` is wall thickness; the
    footprint x0..x1 / z0..z1 is the OUTER envelope."""

    def __init__(self, name, x0, x1, z0, z1, h, t=0.22):
        self.name, self.x0, self.x1, self.z0, self.z1, self.h, self.t = name, x0, x1, z0, z1, h, t
        self.plane = {'S': z1, 'N': z0, 'E': x1, 'W': x0}

    def fb(self, face, u0, u1, d0, d1, h0, h1, bevel=0.01):
        """Box on `face`: u along the face (wx for S/N, wz for E/W), depth d OUTWARD from the face plane."""
        P = self.plane[face]
        if face == 'S':
            return wb('fb', u0, u1, P + d0, P + d1, h0, h1, bevel)
        if face == 'N':
            return wb('fb', u0, u1, P - d1, P - d0, h0, h1, bevel)
        if face == 'E':
            return wb('fb', P + d0, P + d1, u0, u1, h0, h1, bevel)
        return wb('fb', P - d1, P - d0, u0, u1, h0, h1, bevel)

    def recess(self, face, u0, u1, h0, h1, depth=0.1):
        return self.fb(face, u0, u1, -depth, 0.05, h0, h1, 0)

    def through(self, face, u0, u1, h0, h1):
        return self.fb(face, u0, u1, -self.t - 0.05, 0.05, h0, h1, 0)

    def solid(self, h=None, cuts=(), bevel=0.012):
        """The whole block as one beveled box, with boolean-cut openings."""
        w = wb(self.name, self.x0, self.x1, self.z0, self.z1, 0, h or self.h, bevel)
        for c in cuts:
            boolean_cut(w, c, apply_mod=True)
        return w


# ----------------------------------------------------------------------------- small props (paint kind)
LEAF = [0x3F7A34, 0x4F8F3A, 0x2F6A2C, 0x5C9A40]
TERRA = 0xB5693F
SOIL = 0x33261A
MARI = [0xE8891A, 0xF2B01E, 0xD9631A]
STEEL = 0xB9BDC2
BRASS = 0xB08A3E


def pot(kit, x, z, h, r=0.2, tall=0.26, flower=None, leaf=None):
    # 24 Oct 2026 (art director: "flower pots: not improved, replace with real free pot models"): the faceted code-built pot with a
    # blob of spheres for a plant is gone from every Blender building. Real Poly Haven potted plants are instanced by src/villageProps.js.
    return
    kit.add('paint', cyl('pot', x, z, h, h + tall, r * 0.72, r, 10), TERRA)
    kit.add('paint', cyl('pot_rim', x, z, h + tall - 0.03, h + tall + 0.02, r * 1.07, r * 1.07, 10), TERRA)
    kit.add('paint', cyl('soil', x, z, h + tall, h + tall + 0.025, r * 0.95, r * 0.95, 10), SOIL)
    base = h + tall + 0.03
    if flower:
        for i in range(5):
            a = i * 1.26
            kit.add('paint', sphere('mari', x + 0.6 * r * math.cos(a), z + 0.6 * r * math.sin(a), base + 0.12 + 0.03 * (i % 2), r * 0.36, r * 0.36, r * 0.3, 1), flower[i % len(flower)])
        kit.add('paint', sphere('mari_c', x, z, base + 0.2, r * 0.4, r * 0.4, r * 0.32, 1), flower[0])
        kit.add('paint', sphere('mari_leaf', x, z, base + 0.05, r * 0.85, r * 0.85, r * 0.18, 1), LEAF[2])
    else:
        c = leaf or LEAF
        for i in range(6):
            a = i * 1.05
            kit.add('paint', sphere('leaf', x + 0.45 * r * math.cos(a), z + 0.45 * r * math.sin(a), base + 0.18 + 0.07 * (i % 3), r * 0.55, r * 0.55, r * 0.42, 1), c[i % len(c)])
        kit.add('paint', sphere('leaf_top', x, z, base + 0.4, r * 0.62, r * 0.62, r * 0.45, 1), c[1])


def flower_bed(kit, x0, x1, z0, z1, h=0.0, rnd=None, soil=SOIL, colours=(0xE8891A, 0xF2B01E, 0xD9631A, 0xC2185B, 0xE04A7A, 0xF4E04D)):
    """A brick-bordered bed of bare soil; src/main.js plants real flowers on it."""
    rnd = rnd or random.Random(3)
    t = 0.12
    kit.add('brick', wb('bed_n', x0, x1, z0, z0 + t, 0, 0.22, 0.01))
    kit.add('brick', wb('bed_s', x0, x1, z1 - t, z1, 0, 0.22, 0.01))
    kit.add('brick', wb('bed_w', x0, x0 + t, z0 + t, z1 - t, 0, 0.22, 0.01))
    kit.add('brick', wb('bed_e', x1 - t, x1, z0 + t, z1 - t, 0, 0.22, 0.01))
    kit.add('paint', wb('bed_soil', x0 + t, x1 - t, z0 + t, z1 - t, 0, 0.2, 0), soil)
    # (blooms removed 24 Oct, playtest item 2: flat-coloured icosphere 'flowers' read as polyhedra; the game places real
    #  scanned Poly Haven gazania on the bed instead, src/main.js)


def barred_window(kit, b, face, u0, u1, h0, h1, depth=0.12):
    """Recess already cut by the caller; fills it with a dark frame + vertical iron bars + a sill."""
    ft = 0.07
    d_in = -depth + 0.01
    kit.add('wood', b.fb(face, u0, u0 + ft, d_in, 0.04, h0, h1, 0.004))
    kit.add('wood', b.fb(face, u1 - ft, u1, d_in, 0.04, h0, h1, 0.004))
    kit.add('wood', b.fb(face, u0, u1, d_in, 0.04, h1 - ft, h1, 0.004))
    kit.add('wood', b.fb(face, u0 - 0.04, u1 + 0.04, d_in, 0.1, h0 - 0.05, h0 + ft - 0.02, 0.004))
    n = max(4, int((u1 - u0) / 0.11))
    for i in range(1, n):
        u = u0 + ft + i * ((u1 - u0 - 2 * ft) / n)
        kit.add('paint', b.fb(face, u - 0.012, u + 0.012, d_in + 0.02, d_in + 0.05, h0 + ft - 0.02, h1 - ft, 0), 0x2A2A2C)
    kit.add('paint', b.fb(face, u0 + ft, u1 - ft, d_in + 0.02, d_in + 0.05, (h0 + h1) / 2 - 0.02, (h0 + h1) / 2 + 0.02, 0), 0x2A2A2C)
    kit.add('paint', b.fb(face, u0 + ft, u1 - ft, d_in, d_in + 0.015, h0 + ft - 0.02, h1 - ft, 0), 0x1B1B1D)  # dark glazing behind the bars


def panel_door(kit, b, face, u0, u1, h0, h1, depth=0.1, ajar=False):
    """Single dark-wood panelled door in a recess (frame + leaf + 4 raised panels + handle)."""
    ft = 0.08
    d_in = -depth + 0.01
    kit.add('wood', b.fb(face, u0, u0 + ft, d_in, 0.04, h0, h1, 0.004))
    kit.add('wood', b.fb(face, u1 - ft, u1, d_in, 0.04, h0, h1, 0.004))
    kit.add('wood', b.fb(face, u0, u1, d_in, 0.04, h1 - ft, h1, 0.004))
    kit.add('wood', b.fb(face, u0 + ft, u1 - ft, d_in, d_in + 0.05, h0, h1 - ft, 0.004))
    pw = (u1 - u0) - 2 * ft - 0.2
    hh = (h1 - ft - h0)
    for (p0, p1) in ((h0 + 0.12, h0 + hh * 0.42), (h0 + hh * 0.5, h1 - ft - 0.12)):
        kit.add('wood', b.fb(face, u0 + ft + 0.1, u0 + ft + 0.1 + pw, d_in + 0.05, d_in + 0.085, p0, p1, 0.004))
    kit.add('paint', b.fb(face, u1 - ft - 0.16, u1 - ft - 0.1, d_in + 0.05, d_in + 0.12, (h0 + h1) / 2 - 0.05, (h0 + h1) / 2 + 0.05, 0), BRASS)


def pillar(kit, x, z, h0, h1, w=0.36, base_h=1.0, base_kind='plinth'):
    """Square verandah pillar: coloured base (ochre), plaster shaft, small capital."""
    kit.add(base_kind, wb('pil_base', x - w / 2 - 0.02, x + w / 2 + 0.02, z - w / 2 - 0.02, z + w / 2 + 0.02, h0, h0 + base_h, 0.012))
    kit.add('plaster', wb('pil_shaft', x - w / 2, x + w / 2, z - w / 2, z + w / 2, h0 + base_h, h1 - 0.12, 0.012))
    kit.add('plaster', wb('pil_cap', x - w / 2 - 0.05, x + w / 2 + 0.05, z - w / 2 - 0.05, z + w / 2 + 0.05, h1 - 0.12, h1, 0.01))


def bench(kit, x0, x1, z, h=0.45, depth=0.34, along='x'):
    """A plain wooden school bench (plank seat + 2 trestle legs)."""
    if along == 'x':
        kit.add('wood', wb('bench_seat', x0, x1, z - depth / 2, z + depth / 2, h - 0.05, h, 0.008))
        for x in (x0 + 0.15, x1 - 0.15):
            kit.add('wood', wb('bench_leg', x - 0.04, x + 0.04, z - depth / 2 + 0.03, z + depth / 2 - 0.03, 0, h - 0.05, 0.004))
    else:
        kit.add('wood', wb('bench_seat', z - depth / 2, z + depth / 2, x0, x1, h - 0.05, h, 0.008))
        for x in (x0 + 0.15, x1 - 0.15):
            kit.add('wood', wb('bench_leg', z - depth / 2 + 0.03, z + depth / 2 - 0.03, x - 0.04, x + 0.04, 0, h - 0.05, 0.004))


def school_bag(kit, x, z, h, ang=0.0, colour=0xC0392B):
    """A small school bag standing on a bench: body + front pocket + strap loop."""
    ca, sa = math.cos(ang), math.sin(ang)
    def p(dx, dz, hh):
        return (x + dx * ca - dz * sa, z + dx * sa + dz * ca, hh)
    kit.add('paint', limb('bag', p(0, 0, h), p(0, 0, h + 0.34), 0.28, 0.14, 0.02), colour)
    kit.add('paint', limb('bag_pocket', p(0, 0.09, h + 0.02), p(0, 0.09, h + 0.2), 0.22, 0.05, 0.01), 0x2B2B30)
    kit.add('paint', limb('bag_strap', p(-0.1, 0.0, h + 0.3), p(0.1, 0.0, h + 0.3), 0.03, 0.12, 0.0), 0x1B1B1D)


def ring(name, cx, cz, h, R, r, axis='z', seg=None, tube=None):
    """A torus (tyres, rims) centred at world offsets (cx, cz, h). axis='z': the ring lies in the
    (wx, h) plane (axle along wz); axis='x': ring in the (wz, h) plane (axle along wx)."""
    import bmesh
    from common import new_bmesh_obj
    seg = seg or max(8, min(18, int(10 + 18 * R)))     # small rings (bangles, tubes) stay cheap
    tube = tube or (4 if r < 0.03 else 5)
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = i / seg * math.tau
        row = []
        for j in range(tube):
            b = j / tube * math.tau
            rr = R + r * math.cos(b)
            u, v = rr * math.cos(a), rr * math.sin(a)      # u along the ring's first axis, v up
            w = r * math.sin(b)                            # along the axle
            if axis == 'z':
                wx, wz, hh = cx + u, cz + w, h + v
            elif axis == 'y':          # horizontal ring (lying flat): u along wx, v along wz, w up
                wx, wz, hh = cx + u, cz + v, h + w
            else:
                wx, wz, hh = cx + w, cz + u, h + v
            row.append(bm.verts.new((wx, -wz, hh)))
        verts.append(row)
    for i in range(seg):
        for j in range(tube):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % tube], verts[i][(j + 1) % tube]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


def decal_material(name, size_wh, draw_fn):
    """A transparent decal material from a pure-python painter: draw_fn(u, v) -> (r, g, b, a) linear, u/v in 0..1."""
    w, h = size_wh
    img = bpy.data.images.new(name + '_img', w, h, alpha=True)
    px = [0.0] * (w * h * 4)
    for j in range(h):
        v = (j + 0.5) / h
        for i in range(w):
            c = draw_fn((i + 0.5) / w, v)
            if c is not None:
                o = (j * w + i) * 4
                px[o:o + 4] = c
    img.pixels.foreach_set(px)
    img.pack()
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.95
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    try:
        mat.blend_method = 'BLEND'
    except Exception:
        pass
    return mat


def decal_quad(name, x0, x1, z0, z1, h, uv_rect, mat):
    """Flat decal quad over world offsets x0..x1 / z0..z1 at height h, sampling uv_rect=(u0,v0,u1,v1)."""
    obj = quad(name, [(x0, z1, h), (x1, z1, h), (x1, z0, h), (x0, z0, h)])
    uvl = obj.data.uv_layers.new(name='UVMap')
    u0, v0, u1, v1 = uv_rect
    for loop, (u, v) in zip(obj.data.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]):
        uvl.data[loop.index].uv = (u, v)
    obj.data.materials.append(mat)
    return obj


TERRACOTTA_TONES = [0xB5693F, 0xA85C36, 0xC27546]


def lathe(name, cx, cz, profile, seg=24, smooth=True):
    """Surface of revolution about the vertical axis at (cx, cz): profile = [(radius, height), ...] bottom to top. Smooth-shaded, capped at the ends."""
    import bmesh
    from common import new_bmesh_obj
    bm = bmesh.new()
    rings = []
    for r, h in profile:
        rings.append([bm.verts.new((cx + r * math.cos(i / seg * math.tau), -(cz + r * math.sin(i / seg * math.tau)), h)) for i in range(seg)])
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    if profile[0][0] > 0:
        bm.faces.new(list(reversed(rings[0])))
    if profile[-1][0] > 0:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_bmesh_obj(name, bm)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def clay_pot(kit, x, z, s=1.0, tone=None):
    """A real matka: one smooth lathed profile - flat-ish foot, round belly (widest at 40 %), tapering shoulder, short flared neck and a rolled rim."""
    c = tone or TERRACOTTA_TONES[int(abs(x * 7 + z * 13)) % 3]
    prof = [(0.0, 0.0), (0.12, 0.0), (0.17, 0.03), (0.23, 0.13), (0.27, 0.27), (0.26, 0.38), (0.21, 0.49), (0.14, 0.57), (0.115, 0.61), (0.13, 0.65), (0.16, 0.675), (0.165, 0.69), (0.14, 0.695), (0.0, 0.69)]
    kit.add('paint', lathe('matka', x, z, [(r * s, h * s) for r, h in prof], seg=22), c)


def bicycle(kit, bx, bz, col=0x2A3A42, lean=0.0):
    """A readable Indian roadster bicycle standing along +wx (front wheel at bx, rear at bx+1.05): tyres + rims + spokes + hubs in the (wx, h) plane,
    diamond frame, fork, high handlebar with grips and a bell, saddle, crank + pedal, chain guard, rear carrier, headlamp. Size ~1.45 m long, 1.05 m high."""
    R = 0.34
    fx, rx = bx, bx + 1.05
    for wx in (fx, rx):
        kit.add('paint', ring('tyre', wx, bz, R + 0.01, R, 0.032, axis='z'), 0x1B1B1D)
        kit.add('paint', ring('rim', wx, bz, R + 0.01, R - 0.045, 0.01, axis='z'), 0xB6BABD)
        kit.add('paint', cyl('hub', wx, bz, R - 0.03, R + 0.05, 0.025, 0.025, 8), 0xB6BABD)
        for k in range(8):
            a = k / 8 * math.pi * 2
            kit.add('paint', limb('spoke', (wx, bz, R + 0.01), (wx + (R - 0.045) * math.cos(a), bz, R + 0.01 + (R - 0.045) * math.sin(a)), 0.006, 0.006), 0xB6BABD)
    hub_f, hub_r = (fx, bz, R + 0.01), (rx, bz, R + 0.01)
    seat_top = (rx - 0.2, bz, 0.98)
    bb = (rx - 0.45, bz, 0.3)                         # bottom bracket
    head_b, head_t = (fx + 0.12, bz, 0.78), (fx + 0.2, bz, 0.95)
    for a, b, t in ((hub_r, bb, 0.03), (hub_r, seat_top, 0.025), (bb, seat_top, 0.035), (bb, head_b, 0.045), (seat_top, head_t, 0.04), (hub_f, head_b, 0.03)):
        kit.add('paint', limb('frame', a, b, t, t), col)
    kit.add('paint', limb('stem', head_t, (fx + 0.14, bz, 1.06), 0.03, 0.03), 0x333333)
    kit.add('paint', limb('bars', (fx + 0.14, bz - 0.28, 1.06), (fx + 0.14, bz + 0.28, 1.06), 0.022, 0.022), 0x2B2B2B)
    for sg in (-1, 1):
        kit.add('paint', limb('grip', (fx + 0.14, bz + sg * 0.25, 1.06), (fx + 0.14, bz + sg * 0.33, 1.05), 0.032, 0.032), 0x151515)
    kit.add('paint', sphere('lamp', fx + 0.04, bz, 0.97, 0.06, 0.06, 0.05, 1), 0xE9E2B0)
    kit.add('paint', sphere('bell', fx + 0.16, bz + 0.1, 1.1, 0.035, 0.035, 0.03, 1), 0xB6BABD)
    kit.add('paint', wb('saddle', seat_top[0] - 0.12, seat_top[0] + 0.12, bz - 0.07, bz + 0.07, 0.98, 1.03, 0.015), 0x1C1C1C)
    kit.add('paint', limb('crank', (bb[0], bz + 0.06, bb[2] + 0.12), (bb[0], bz + 0.06, bb[2] - 0.12), 0.022, 0.022), 0x555555)
    kit.add('paint', wb('pedal', bb[0] - 0.05, bb[0] + 0.05, bz + 0.07, bz + 0.17, bb[2] - 0.14, bb[2] - 0.11, 0.004), 0x222222)
    kit.add('paint', wb('chainguard', bb[0], rx, bz + 0.045, bz + 0.065, 0.22, 0.34, 0.01), 0x1E1E20)
    kit.add('paint', wb('carrier', rx - 0.3, rx + 0.12, bz - 0.09, bz + 0.09, 0.78, 0.8, 0.005), 0x1E1E20)
    kit.add('paint', limb('carrier_leg', (rx - 0.3, bz, 0.79), (rx, bz, R + 0.01), 0.012, 0.012), 0x1E1E20)
    kit.add('paint', limb('stand', (bb[0] + 0.15, bz, 0.12), (bb[0] + 0.15, bz + 0.18, 0.0), 0.014, 0.014), 0x333333)


def plastic_chair(kit, x, z, ang, colour, arms=False):
    """Moulded plastic chair: seat, tilted back, four legs (ang = rotation about the vertical, 0 faces +wz... back at -wz)."""
    ca, sa = math.cos(ang), math.sin(ang)

    def p(dx, dz, hh):
        return (x + dx * ca - dz * sa, z + dx * sa + dz * ca, hh)
    kit.add('paint', limb('seat', p(0, 0, 0.45), p(0, 0, 0.5), 0.44, 0.44, 0.012), colour)
    kit.add('paint', limb('back', p(0, -0.2, 0.5), p(0, -0.26, 0.9), 0.42, 0.04, 0.01), colour)
    for dx in (-0.18, 0.18):
        for dz in (-0.18, 0.18):
            kit.add('paint', limb('leg', p(dx, dz, 0.0), p(dx * 1.05, dz * 1.05, 0.46), 0.04, 0.04), colour)
    if arms:
        for dx in (-0.22, 0.22):
            kit.add('paint', limb('arm', p(dx, 0.2, 0.62), p(dx, -0.2, 0.62), 0.035, 0.035), colour)
            kit.add('paint', limb('arm_post', p(dx, 0.2, 0.5), p(dx, 0.2, 0.62), 0.03, 0.03), colour)


def dabba(kit, x, z, h, r=0.12, tall=0.28, colour=STEEL):
    """Steel container with a lid."""
    kit.add('paint', cyl('dabba', x, z, h, h + tall, r, r * 0.95, 12), colour)
    kit.add('paint', cyl('dabba_lid', x, z, h + tall, h + tall + 0.03, r * 1.04, r * 1.04, 12), 0x8A8E93)
    kit.add('paint', sphere('dabba_knob', x, z, h + tall + 0.06, 0.03, 0.03, 0.03, 1), 0x8A8E93)


def sack(kit, x, z, h, ang=0.0, colour=0xE6DCC0, w=0.45, d=0.28, hh=0.55, kind='paint'):
    """A flour/grain sack: a stuffed rounded-box bag with a gathered, cord-tied mouth and a slightly slumped top."""
    bw, bd = w * 0.5, d * 0.5
    bevel = min(bd * 0.6, 0.09)
    body = wb('sack', x - bw, x + bw, z - bd, z + bd, h, h + hh * 0.82, bevel, 3)
    for poly in body.data.polygons:
        poly.use_smooth = True
    kit.add(kind, body, colour)
    # cord tying the neck, then the gathered mouth above it
    kit.add('paint', wb('sack_cord', x - bw * 0.52, x + bw * 0.52, z - bd * 0.52, z + bd * 0.52, h + hh * 0.8, h + hh * 0.86, 0.01, 2), 0x6A5238)
    mouth = wb('sack_mouth', x - bw * 0.5, x + bw * 0.5, z - bd * 0.5, z + bd * 0.5, h + hh * 0.84, h + hh * 1.0, 0.04, 3)
    for poly in mouth.data.polygons:
        poly.use_smooth = True
    kit.add(kind, mouth, colour)
