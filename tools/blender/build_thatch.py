"""
thatch (PARALLEL.md "2. THATCH", her 28 Oct verdict: "not at all clear"): a ~2 x 2 m, 30 deg lean-to roof panel (chhappar).

Her three notes and how each is answered here:
  - "far too dark, nearly black": the shared thatch photo set is itself dark brown and arch.thatch_straw multiplies it toward
    (0.10, 0.075, 0.04), so no vertex tint could lift it. This panel does NOT use that set. It carries its own small straw texture,
    generated below (strand by strand, tileable, 256 px over 0.4 m, colour + normal + roughness), pale straw gold. The vertex colour
    then only ever darkens or greys it: sun-bleached silver-pale toward the ridge and on bundle crowns, golden newer bundles, greyer
    and darker in the valleys, under each course butt, on the underside, and in a few damp patches low on the roof.
  - "silhouette must be shaggy": alpha-cutout straw cards (their own MASK material, double-sided) hang from the eave in two layers,
    bristle out of the ridge roll, and stray out of every course butt.
  - "visible courses, with the binding rope line": six modelled courses, each butt standing ~5 cm proud of the course below with
    a ragged end, and a twisted moonj rope pressed across every course (the straw dips under it) with stitch loops every ~22 cm.

Materials (3 draw calls): hb_thatch (straw skin, ridge roll, ropes, underside: embedded straw texture, no dopahar_set so it is
kept), hb_thatch_cards (alpha MASK, embedded), hb_wood (bamboo rafters/posts: the frozen shared 'wood' set by name, dopahar_set
'wood', stripped from the public GLB like every staged place). No CC0 thatch set lighter than the rejected one exists in the repo,
and the art direction calls for modelled structure, so the straw is hand-built; said in the report.

Run:  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_thatch.py [-- render] [variant=old]
      node tools/shrink.js tmp/thatch_panel_raw.glb public/assets/models/thatch_panel.glb 999999
      node tools/strip-textures.mjs public/assets/models/thatch_panel.glb public/assets/models/thatch_panel.glb
Frame: Blender +Z up; the eave faces -Y (glTF +Z, 'south'). Panel centred on x = 0; ridge at y = +0.87, z = 2.9; eave z ~ 1.9.
"""
import os
import sys
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Matrix
from common import ROOT, clear_scene, load_pbr_material, box_uv, join_objects, export_glb, hex_to_linear_rgb

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VARIANT = 'old' if 'variant=old' in ARGS else 'main'
SLOT = 'thatch_panel_old' if VARIANT == 'old' else 'thatch_panel'
OUT = os.path.join(ROOT, 'tmp', SLOT + '_raw.glb')
TEXDIR = os.path.join(ROOT, 'tmp', 'thatch_tex')
SHOTS = os.path.join(ROOT, 'docs', 'shots', 'thatch-2026-10-28')
SEED = 11 if VARIANT == 'main' else 29
AGE = 0.0 if VARIANT == 'main' else 1.0          # 'old': greyer, more damp, shaggier eave

PITCH = math.radians(30)
L, W = 2.0, 2.0                                    # down-slope length, width
RIDGE = Vector((0.0, L * math.cos(PITCH) / 2, 2.9))
D = Vector((0, -math.cos(PITCH), -math.sin(PITCH)))    # down the slope
N = Vector((0, -math.sin(PITCH), math.cos(PITCH)))     # out of the roof
X = Vector((1, 0, 0))
NC = 6                                             # courses
C = L / NC
TEX_M = 0.4                                        # straw texture covers 0.4 m


def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin(h):
    return hex_to_linear_rgb(h)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


# ------------------------------------------------------------------ textures (numpy, written as PNG, packed into the GLB as WebP)
STRAW = [(0.93, 0.86, 0.66), (0.88, 0.76, 0.48), (0.95, 0.90, 0.74), (0.84, 0.72, 0.44), (0.78, 0.74, 0.64), (0.90, 0.80, 0.56),
         (0.70, 0.58, 0.38)]
STRAW_W = [3, 4, 2, 3, 2, 3, 1]


def _pick(rnd):
    return rnd.choices(STRAW, weights=STRAW_W)[0]


def _draw_strands(Wd, Ht, n, rnd, wrap_y, card):
    col = np.zeros((Ht, Wd, 3)); hgt = np.zeros((Ht, Wd)); alpha = np.zeros((Ht, Wd)); zb = np.full((Ht, Wd), -1.0)
    if not card:
        col[:] = (0.50, 0.40, 0.25); alpha[:] = 1.0; zb[:] = 0.0
    for _ in range(n):
        x0 = rnd.uniform(0, Wd)
        if card:
            length = int(Ht * rnd.uniform(0.45, 1.0)); y1 = Ht; y0 = Ht - length
        else:
            length = int(rnd.uniform(40, 220)); y0 = rnd.randrange(Ht); y1 = y0 + length
        slope = rnd.uniform(-0.06, 0.06); bend = rnd.uniform(-6, 6) if card else rnd.uniform(-2, 2)
        r = rnd.uniform(0.7, 1.6)
        base = np.array(_pick(rnd)) * rnd.uniform(0.92, 1.05)
        lay = rnd.uniform(0.2, 1.0)
        ys = np.arange(y0, y1)
        t = (ys - y0) / max(1, length)                       # 0 at one end (card: the tip), 1 at the other
        xs = x0 + slope * (ys - y0) + bend * (1 - t) ** 2 if card else x0 + slope * (ys - y0) + bend * np.sin(t * 3.1)
        taper = np.clip(t / 0.18, 0.35, 1.0) if card else np.clip(np.minimum(t, 1 - t) / 0.1, 0.4, 1.0)
        tone = 1.0 + 0.10 * np.sin(t * rnd.uniform(4, 12) + rnd.uniform(0, 6))   # nodes and sheen along a stalk
        if card:
            tone = tone * (1.0 + 0.10 * (1 - t))                                      # bleached tips
        for off in np.arange(-math.ceil(r), math.ceil(r) + 1):
            prof = np.clip(1 - (np.abs(off) / (r * taper + 0.3)) ** 2, 0, 1)
            m = prof > 0.05
            if not m.any():
                continue
            px = (np.round(xs + off).astype(int)) % Wd
            py = (ys % Ht) if wrap_y else ys
            ok = m & (py >= 0) & (py < Ht)
            px, py, pr, tn = px[ok], py[ok], prof[ok], tone[ok]
            h = lay + 0.25 * pr
            win = h > zb[py, px]
            px, py, pr, tn, h = px[win], py[win], pr[win], tn[win], h[win]
            zb[py, px] = h
            hgt[py, px] = h
            alpha[py, px] = 1.0
            col[py, px] = np.clip(base[None, :] * (0.82 + 0.18 * pr)[:, None] * tn[:, None], 0, 1)
    if card:
        top = int(Ht * 0.9)                                  # the bound top of the bundle is solid (it sits under the course)
        hole = alpha[top:] < 0.5
        col[top:][hole] = (0.62, 0.52, 0.34); alpha[top:] = 1.0
    return col, hgt, alpha


def _normal_from_height(h, strength, wrap):
    if wrap:
        dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
        dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    else:
        dx = np.gradient(h, axis=1); dy = np.gradient(h, axis=0)
    nx, ny, nz = -dx * strength, -dy * strength, np.ones_like(h)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], -1)


def _save(name, rgb, a=None, colorspace='sRGB'):
    Ht, Wd = rgb.shape[:2]
    img = bpy.data.images.new(name, Wd, Ht, alpha=a is not None)
    px = np.ones((Ht, Wd, 4)); px[..., :3] = rgb
    if a is not None:
        px[..., 3] = a
    img.pixels.foreach_set(px.astype(np.float32).ravel())
    os.makedirs(TEXDIR, exist_ok=True)
    img.filepath_raw = os.path.join(TEXDIR, name + '.png'); img.file_format = 'PNG'
    img.save()
    img.colorspace_settings.name = colorspace
    img.pack()
    return img


def make_textures():
    rnd = random.Random(101)
    col, hgt, _ = _draw_strands(256, 256, 900, rnd, True, False)
    rough = 0.62 + 0.3 * (1 - np.clip(hgt, 0, 1))           # exposed stalks carry a faint waxy sheen, the gaps are dull
    skin = (_save('thatch_straw_color', col), _save('thatch_straw_normal', _normal_from_height(hgt, 2.2, True), colorspace='Non-Color'),
            _save('thatch_straw_rough', np.repeat(rough[..., None], 3, -1), colorspace='Non-Color'))
    ccol, chgt, ca = _draw_strands(256, 256, 170, random.Random(202), False, True)
    card = (_save('thatch_card_color', ccol, ca), _save('thatch_card_normal', _normal_from_height(chgt, 2.2, False), colorspace='Non-Color'))
    lum = (0.2126 * srgb_to_lin(col[..., 0]) + 0.7152 * srgb_to_lin(col[..., 1]) + 0.0722 * srgb_to_lin(col[..., 2])).mean()
    print('straw texture mean linear luminance %.3f (sRGB mean %s)' % (lum, np.round(col.reshape(-1, 3).mean(0), 3)))
    return skin, card


def straw_material(name, color_img, normal_img, rough_img=None, alpha=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree; nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial'); bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tc = nodes.new('ShaderNodeTexImage'); tc.image = color_img
    attr = nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'AO'
    mul = nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    links.new(tc.outputs['Color'], mul.inputs[6]); links.new(attr.outputs['Color'], mul.inputs[7])
    links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    tn = nodes.new('ShaderNodeTexImage'); tn.image = normal_img
    nm = nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
    links.new(tn.outputs['Color'], nm.inputs['Color']); links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if rough_img:
        tr = nodes.new('ShaderNodeTexImage'); tr.image = rough_img
        sep = nodes.new('ShaderNodeSeparateColor')
        links.new(tr.outputs['Color'], sep.inputs['Color']); links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = 0.8
    if alpha:
        rd = nodes.new('ShaderNodeMath'); rd.operation = 'ROUND'      # glTF exporter reads ROUND as alphaMode MASK, cutoff 0.5
        links.new(tc.outputs['Alpha'], rd.inputs[0]); links.new(rd.outputs[0], bsdf.inputs['Alpha'])
        mat.use_backface_culling = False
        try:
            mat.surface_render_method = 'DITHERED'
        except Exception:
            pass
    else:
        mat.use_backface_culling = True
    return mat


# ------------------------------------------------------------------ mesh builder: quads with per-corner colour and uv
class MB:
    def __init__(self):
        self.v, self.f, self.c, self.uv = [], [], [], []   # f: vertex index tuples; c/uv: per-face-corner lists

    def vert(self, p):
        self.v.append(tuple(p)); return len(self.v) - 1

    def face(self, idx, cols, uvs):
        self.f.append(tuple(idx)); self.c.append(list(cols)); self.uv.append(list(uvs))

    def grid(self, P, Cc, U, flip=False):
        """P, Cc, U: [i][j] nested lists of positions / colours / uvs."""
        nu, nv = len(P) - 1, len(P[0]) - 1
        ids = [[self.vert(P[i][j]) for j in range(nv + 1)] for i in range(nu + 1)]
        for i in range(nu):
            for j in range(nv):
                q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                if flip:
                    q = q[::-1]
                self.face([ids[a][b] for a, b in q], [Cc[a][b] for a, b in q], [U[a][b] for a, b in q])

    def obj(self, name, mat, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.update()
        ca = me.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
        ul = me.uv_layers.new(name='UVMap')
        k = 0
        for pi, p in enumerate(me.polygons):
            p.use_smooth = smooth
            for n, li in enumerate(p.loop_indices):
                c = self.c[pi][n]
                ca.data[li].color = (c[0], c[1], c[2], 1.0)
                ul.data[li].uv = self.uv[pi][n]
        me.color_attributes.active_color = ca
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        me.materials.append(mat)
        return o


def P(u, v, h):
    return RIDGE + X * u + D * v + N * h


# ------------------------------------------------------------------ the straw skin, six courses
def build_skin(mb, rnd):
    nu = 100
    us = [-W / 2 + W * i / nu for i in range(nu + 1)]
    ph = [rnd.uniform(0, 6.28) for _ in range(12)]
    damp = [(rnd.uniform(-0.8, 0.8), rnd.uniform(1.1, 1.95), rnd.uniform(0.18, 0.35)) for _ in range(3 + int(2 * AGE))]
    damp.append((rnd.uniform(-0.7, 0.7), rnd.uniform(0.5, 0.9), 0.15))
    bleach, gold, valley = (0.99, 0.98, 0.95), (1.0, 0.90, 0.70), (0.66, 0.58, 0.45)
    shadow, dampc, greyc = (0.50, 0.44, 0.36), (0.50, 0.50, 0.45), (0.80, 0.79, 0.75)
    ropes = []
    butts = []
    for ci in range(NC):
        r2 = random.Random(SEED * 100 + ci)
        vs = 0.0 if ci == 0 else ci * C - 0.09
        bw = r2.uniform(0.085, 0.11)                                   # bundle width for this course
        bph = r2.uniform(0, 6.28)
        rag = 0.045 if ci == NC - 1 else 0.022
        ve = []
        e = 0.0
        for i in range(nu + 1):
            e = max(-1, min(1, e + r2.uniform(-0.45, 0.45)))
            ve.append((ci + 1) * C + rag * e + (rag * 1.3 if r2.random() < 0.06 else 0))
        newer = {k for k in range(40) if r2.random() < 0.12 * (1 - 0.6 * AGE)}
        v_rope = ci * C + 0.33 * C + (0.02 if ci == 0 else 0.0)
        ropes.append(v_rope)
        nv = 18
        Pp, Cc, Uu = [], [], []
        hb = []
        for i, u in enumerate(us):
            rowp, rowc, rowu, rowh = [], [], [], []
            for j in range(nv + 1):
                t = j / nv
                v = vs + (ve[i] - vs) * t
                k = u / bw + 0.3 * math.sin(v * 3.0 + bph) + 0.1 * math.sin(u * 7 + ph[0])
                bundle = 1.0 - abs(math.cos(math.pi * k)) ** 0.6
                h = 0.03 + 0.06 * t ** 1.5 + 0.02 * bundle + 0.004 * r2.random()
                h -= 0.016 * math.exp(-((v - v_rope) / 0.03) ** 2)            # straw squeezed under the rope
                if abs(u) > W / 2 - 0.06:
                    h *= 0.75 + 0.25 * (W / 2 - abs(u)) / 0.06
                rowh.append(h)
                rowp.append(P(u, v, h))
                # colour multiplier
                c = mix(gold, bleach, 0.55 * (1 - v / L) + 0.35 * bundle + 0.25 * AGE)   # silver-pale toward ridge / crowns
                c = mix(c, greyc, 0.25 * AGE + 0.15 * (1 - bundle))
                if int(k) % 40 in newer:
                    c = mix(c, gold, 0.6)
                c = mix(c, valley, 0.45 * (1 - bundle) ** 2)
                c = mix(c, shadow, 0.65 * max(0.0, 1 - t / 0.22) if ci > 0 else 0.0)   # tucked under the butt above
                c = mix(c, shadow, 0.25 * math.exp(-((v - v_rope) / 0.025) ** 2))
                for dx, dv, rr in damp:
                    dd = math.hypot((u - dx) / rr, (v - dv) / (rr * 0.7))
                    if dd < 1:
                        c = mix(c, dampc, (0.7 + 0.2 * AGE) * (1 - dd) ** 0.7)
                low = max(0.0, (v - 1.6) / 0.4)
                c = mix(c, dampc, 0.25 * low * (0.5 + 0.5 * math.sin(u * 5 + ph[1])))
                c = tuple(x * (0.93 + 0.1 * r2.random()) for x in c)
                rowc.append(c)
                rowu.append((u / TEX_M + ci * 0.37, -v / TEX_M))
            Pp.append(rowp); Cc.append(rowc); Uu.append(rowu); hb.append(rowh[-1])
        mb.grid(Pp, Cc, Uu, flip=True)
        # butt end: the cut straw ends, from the top skin down under the course
        Bp, Bc, Bu = [], [], []
        for i, u in enumerate(us):
            v = ve[i]
            col_end = mix((0.62, 0.55, 0.43), (0.78, 0.70, 0.55), random.random())
            Bp.append([P(u, v, hb[i]), P(u, v + 0.012, hb[i] * 0.55), P(u, v + 0.004, 0.012)])
            Bc.append([col_end, mix(col_end, shadow, 0.4), shadow])
            Bu.append([(u / TEX_M, 0.0), (u / TEX_M, 0.03), (u / TEX_M, 0.07)])
        mb.grid(Bp, Bc, Bu, flip=True)
        butts.append((ve, hb))
        # verges (both sides) closing the course
        for side, i in ((-1, 0), (1, nu)):
            u = us[i]
            Sp, Sc, Su = [], [], []
            for j in range(nv + 1):
                v = vs + (ve[i] - vs) * j / nv
                Sp.append([P(u, v, 0.0), Pp[i][j]])
                Sc.append([shadow, Cc[i][j]])
                Su.append([(v / TEX_M, 0), (v / TEX_M, 0.2)])
            mb.grid(Sp, Sc, Su, flip=(side > 0))
    return us, ropes, butts


def rope(mb, pts, radius, rnd, colour):
    """Twisted rope along a polyline: 6-sided tube with a 3-ply helical ridge in shape and tone."""
    seg = 6
    rings_p, rings_c, rings_u = [], [], []
    acc = 0.0
    for k, p in enumerate(pts):
        tdir = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        a = N - tdir * N.dot(tdir)
        if a.length < 1e-4:
            a = Vector((0, 0, 1))
        a.normalize(); b = tdir.cross(a)
        if k:
            acc += (p - pts[k - 1]).length
        rp, rc, ru = [], [], []
        for s in range(seg + 1):
            th = 2 * math.pi * s / seg
            ply = math.cos(3 * th - acc * 160)                 # 3-ply twist, ~4 cm lay
            r = radius * (1 + 0.18 * ply)
            rp.append(p + a * math.cos(th) * r + b * math.sin(th) * r)
            k2 = 0.8 + 0.2 * ply
            rc.append(tuple(x * k2 for x in colour))
            ru.append((acc / 0.1, s / seg * 0.25))
        rings_p.append(rp); rings_c.append(rc); rings_u.append(ru)
    mb.grid(rings_p, rings_c, rings_u, flip=False)


def build_ropes(mb, us, ropes, rnd):
    rc = (0.62, 0.50, 0.36)                                  # moonj/sutli rope: weathered, darker than the straw so the line reads
    for ci, vr in enumerate(ropes):
        pts = []
        for i in range(0, len(us), 2):
            u = us[i]
            h = 0.03 + 0.06 * ((vr - (0 if ci == 0 else ci * C - 0.09)) / (C + (0 if ci == 0 else 0.09))) ** 1.5 + 0.004
            pts.append(P(u, vr + 0.004 * math.sin(u * 9 + ci), h + 0.008))
        rope(mb, pts, 0.011, rnd, tuple(x * rnd.uniform(0.9, 1.08) for x in rc))
        # stitch loops: the binding passes through the thatch to the batten below every ~22 cm
        u = -W / 2 + rnd.uniform(0.08, 0.2)
        while u < W / 2 - 0.08:
            t = (vr - (0 if ci == 0 else ci * C - 0.09)) / (C + (0 if ci == 0 else 0.09))
            h = 0.03 + 0.06 * t ** 1.5 + 0.012
            a = P(u, vr - 0.035, h - 0.012); m = P(u + 0.004, vr, h + 0.014); b = P(u + 0.008, vr + 0.035, h - 0.012)
            rope(mb, [a, (a + m) / 2 + N * 0.006, m, (m + b) / 2 + N * 0.006, b], 0.006, rnd, tuple(x * 0.9 for x in rc))
            u += rnd.uniform(0.19, 0.25)


def build_ridge(mb, rnd):
    """Ridge roll: a bound straw sausage capping the top edge, with rope wraps."""
    nu, ns = 100, 10
    R0 = 0.075
    ctr = RIDGE + N * 0.055 + D * 0.02
    Pp, Cc, Uu = [], [], []
    for i in range(nu + 1):
        u = -W / 2 - 0.03 + (W + 0.06) * i / nu
        wrap = min(abs(((u + 1.0) % 0.32) - 0.16) / 0.02, 1.0)        # pinched where the rope wraps
        rp, rc, ru = [], [], []
        for s in range(ns + 1):
            th = 2 * math.pi * s / ns
            r = R0 * (0.82 + 0.18 * wrap) * (1 + 0.06 * math.sin(th * 5 + u * 13) + 0.04 * rnd.random())
            off = N * math.cos(th) * r + (-D) * math.sin(th) * r * 1.1
            rp.append(ctr + X * u + off)
            up = 0.5 + 0.5 * math.cos(th)
            c = mix((0.55, 0.50, 0.42), (0.99, 0.98, 0.94), up)       # bleached on top, grey-dark beneath
            c = mix(c, (0.55, 0.47, 0.36), (1 - wrap) * 0.6)
            rc.append(c)
            ru.append((s / ns * 0.9, u / TEX_M))
        Pp.append(rp); Cc.append(rc); Uu.append(ru)
    mb.grid(Pp, Cc, Uu, flip=True)
    rc = (0.58, 0.47, 0.34)
    u = -1.0 + 0.16
    while u < 1.0:
        pts = []
        for s in range(9):
            th = 2 * math.pi * s / 8
            pts.append(ctr + X * (u + 0.01 * s / 8) + N * math.cos(th) * (R0 * 0.88) + (-D) * math.sin(th) * (R0 * 0.97))
        rope(mb, pts, 0.008, rnd, rc)
        u += 0.32
    return ctr, R0


def build_underside(mb):
    """The underside seen from below the eave: greyer, darker, smoke-and-damp stained straw ends."""
    nu, nv = 20, 20
    Pp, Cc, Uu = [], [], []
    for i in range(nu + 1):
        u = -W / 2 + W * i / nu
        rp, rc, ru = [], [], []
        for j in range(nv + 1):
            v = (L + 0.03) * j / nv
            rp.append(P(u, v, -0.004 + 0.006 * math.sin(u * 23 + v * 7)))
            k = 0.40 + 0.08 * math.sin(u * 7.0) * math.sin(v * 5.0)
            rc.append((k * 1.02, k, k * 0.92))
            ru.append((u / TEX_M, -v / TEX_M))
        Pp.append(rp); Cc.append(rc); Uu.append(ru)
    mb.grid(Pp, Cc, Uu, flip=False)


# ------------------------------------------------------------------ alpha straw cards
def card(mb, base, along, across, length, width, droop, tint, twist=0.0):
    """A 2-segment straw card hanging from `base`: top edge along `across` (width), body along `along`, bending by `droop` (down)."""
    rows = []
    for s, t in enumerate((0.0, 0.5, 1.0)):
        c = base + along * (length * t) + Vector((0, 0, -droop * t * t))
        rows.append(c)
    ax = across.normalized()
    if twist:
        ax = (Matrix.Rotation(twist, 3, along.normalized()) @ ax).normalized()
    Pp, Cc, Uu = [], [], []
    for side in (-0.5, 0.5):
        Pp.append([r + ax * width * side for r in rows])
        Cc.append([tint, tint, tuple(x * 1.04 for x in tint)])
        Uu.append([(side + 0.5, 1.0), (side + 0.5, 0.5), (side + 0.5, 0.0)])
    mb.grid(Pp, Cc, Uu)


def build_cards(cb, rnd, butts, ridge_ctr, R0):
    def tint(base=1.0):
        k = base * rnd.uniform(0.82, 1.0)
        g = rnd.uniform(0.0, 0.25 + 0.3 * AGE)
        return mix((k, k * 0.95, k * 0.86), (k * 0.82, k * 0.80, k * 0.76), g)

    ve, hb = butts[-1]
    nu = len(ve) - 1
    # eave fringe, two layers
    for layer, (step, hfac, lmin, lmax) in enumerate(((0.07, 0.75, 0.14, 0.26 + 0.06 * AGE), (0.09, 0.3, 0.10, 0.2))):
        u = -W / 2 + rnd.uniform(0, step)
        while u < W / 2:
            i = min(nu, max(0, int((u + W / 2) / W * nu)))
            base = P(u, ve[i] - 0.06, hb[i] * hfac)
            along = (D + N * rnd.uniform(-0.25, 0.05) + X * rnd.uniform(-0.15, 0.15)).normalized()
            card(cb, base, along, X, rnd.uniform(lmin, lmax), rnd.uniform(0.09, 0.17), rnd.uniform(0.03, 0.09),
                 tint(0.92 if layer else 1.0), twist=rnd.uniform(-0.35, 0.35))
            u += step * rnd.uniform(0.7, 1.3)
    # strays out of every upper course butt
    for ci in range(NC - 1):
        ve, hb = butts[ci]
        for _ in range(int(16 + 10 * AGE)):
            i = rnd.randrange(2, nu - 1)
            u = -W / 2 + W * i / nu
            base = P(u, ve[i] - 0.05, hb[i] * 0.6)
            along = (D + N * rnd.uniform(-0.05, 0.25)).normalized()
            card(cb, base, along, X, rnd.uniform(0.07, 0.14), rnd.uniform(0.05, 0.1), 0.01, tint(), twist=rnd.uniform(-0.4, 0.4))
    # ridge bristle: up and back over the roll, a few forward
    u = -W / 2 + 0.02
    while u < W / 2:
        fwd = rnd.random() < 0.3
        th = rnd.uniform(-0.6, 0.9) if not fwd else rnd.uniform(1.2, 1.6)
        dirv = (N * math.cos(th) + (-D) * math.sin(th)) if not fwd else (N * 0.5 + D * 1.0)
        base = ridge_ctr + X * u - dirv.normalized() * 0.03
        card(cb, base, dirv.normalized(), X, rnd.uniform(0.09, 0.2), rnd.uniform(0.07, 0.13), rnd.uniform(-0.01, 0.03), tint(1.0),
             twist=rnd.uniform(-0.5, 0.5))
        u += rnd.uniform(0.05, 0.09)
    # verge strays on both sides
    for side in (-1, 1):
        for _ in range(10):
            v = rnd.uniform(0.15, L - 0.1)
            base = P(side * (W / 2 - 0.04), v, 0.05)
            along = (X * side + D * rnd.uniform(0.2, 0.8)).normalized()
            card(cb, base, along, D, rnd.uniform(0.06, 0.12), rnd.uniform(0.06, 0.1), 0.02, tint(0.95), twist=rnd.uniform(-0.6, 0.6))


# ------------------------------------------------------------------ bamboo frame (shared frozen wood set, by name)
def pole(name, a, b, r, seg=8):
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r * 0.92, depth=d.length)
    rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def build_frame(rnd):
    objs = []
    off = -N * 0.03
    for x in (-0.8, 0.0, 0.8):                                  # rafters under the straw
        objs.append(pole('rafter', RIDGE + X * x + off - D * 0.08, RIDGE + X * x + D * (L + 0.06) + off, 0.03))
    for v in (0.15, 0.85, 1.55):                                # battens across the rafters
        objs.append(pole('batten', RIDGE + X * -1.05 + D * v + off * 2.2, RIDGE + X * 1.05 + D * v + off * 2.2, 0.018))
    objs.append(pole('ridge_pole', RIDGE + X * -1.08 + off * 2.5, RIDGE + X * 1.08 + off * 2.5, 0.045))
    for x in (-0.9, 0.9):                                       # posts, slightly out of true
        for v in (0.05, 1.9):
            top = RIDGE + X * x + D * v + off * 3.0
            objs.append(pole('post', Vector((top.x + rnd.uniform(-0.02, 0.02), top.y + rnd.uniform(-0.02, 0.02), 0.0)), top, 0.045))
    for o in objs:
        me = o.data
        ca = me.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
        t = lin(0xB89A6A)
        k = rnd.uniform(0.85, 1.05)
        ca.data.foreach_set('color', [t[0] * k, t[1] * k, t[2] * k, 1.0] * len(me.loops))
        me.color_attributes.active_color = ca
    w = join_objects(objs, 'hb_wood')
    box_uv(w, (1, 1, 1))
    m = load_pbr_material('hb_wood', 'wood', repeat=(1.0, 1.0))
    attr = m.node_tree.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'AO'
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    src = bsdf.inputs['Base Color'].links[0].from_socket
    mul = m.node_tree.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    m.node_tree.links.new(src, mul.inputs[6]); m.node_tree.links.new(attr.outputs['Color'], mul.inputs[7])
    m.node_tree.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    m['dopahar_set'] = 'wood'; m['dopahar_repeat'] = 1.0
    w.data.materials.clear(); w.data.materials.append(m)
    return w


def mean_albedo(o):
    """Mean albedo luminance (linear) of a straw mesh: vertex colour x straw texture mean, area-weighted per face corner."""
    return None


def build():
    clear_scene()
    rnd = random.Random(SEED)
    (sc, sn, sr), (cc, cn) = make_textures()
    m_skin = straw_material('hb_thatch', sc, sn, sr)
    m_card = straw_material('hb_thatch_cards', cc, cn, alpha=True)
    mb = MB()
    us, ropes, butts = build_skin(mb, rnd)
    build_ropes(mb, us, ropes, rnd)
    ctr, R0 = build_ridge(mb, rnd)
    build_underside(mb)
    skin = mb.obj('hb_thatch', m_skin)
    cb = MB()
    build_cards(cb, rnd, butts, ctr, R0)
    cards = cb.obj('hb_thatch_cards', m_card)
    wood = build_frame(rnd)
    # albedo check: vertex-colour mean x straw texture mean (linear luminance), skin only
    me = skin.data
    buf = [0.0] * (len(me.loops) * 4)
    me.color_attributes['AO'].data.foreach_get('color', buf)
    a = np.array(buf).reshape(-1, 4)[:, :3]
    tex = np.array(sc.pixels[:]).reshape(-1, 4)[:, :3]
    tl = srgb_to_lin(tex).mean(0)
    alb = a * tl
    print('SKIN mean albedo linear luminance %.3f  (sRGB-ish %.3f)' % ((alb @ [0.2126, 0.7152, 0.0722]).mean(),
          ((alb @ [0.2126, 0.7152, 0.0722]).mean()) ** (1 / 2.2)))
    export_glb([skin, cards, wood], OUT)
    for o in (skin, cards, wood):
        print('group', o.name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
    return skin, cards, wood


def render():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    g = bpy.context.active_object
    gm = bpy.data.materials.new('ground'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.32, 0.27, 0.2, 1)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    g.data.materials.append(gm)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    os.makedirs(SHOTS, exist_ok=True)
    mid = RIDGE + D * (L / 2) + N * 0.05
    shots = [
        # flat-lit, square to the roof plane: uniform white sky only, no sun, so the pixels are close to albedo x AO
        ('a_flat_front', mid + N * 3.6, mid, 40, (1, 1, 1), 1.0, 0.0, True),
        # low angle at the eave, afternoon sun raking across: silhouette, fringe, underside
        ('b_low_eave', RIDGE + D * L + Vector((0.9, -1.6, -0.75)), RIDGE + D * (L - 0.15) + Vector((0, 0, -0.05)), 26,
         (0.62, 0.7, 0.85), 0.5, 4.0, False),
        ('c_three_quarter', Vector((-2.6, -3.6, 3.4)), mid + Vector((0, 0, -0.4)), 32, (0.62, 0.7, 0.85), 0.5, 4.0, False),
    ]
    tag = '' if VARIANT == 'main' else '_old'
    for name, loc, look, lens, skyc, skys, sune, flat in shots:
        bg.inputs['Color'].default_value = (*skyc, 1); bg.inputs['Strength'].default_value = skys
        sun.data.energy = sune; sun.data.color = (1.0, 0.94, 0.84)
        sun.rotation_euler = (math.radians(55), 0, math.radians(-30))
        g.hide_render = flat
        sc.render.film_transparent = flat
        cam.location = loc; cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(SHOTS, name + tag + '.png')
        bpy.ops.render.render(write_still=True)
        if flat:
            img = bpy.data.images.load(sc.render.filepath)
            px = np.array(img.pixels[:]).reshape(-1, 4)
            m = px[:, 3] > 0.9
            lum = px[m, :3] @ np.array([0.2126, 0.7152, 0.0722])
            print('FLAT RENDER mean sRGB luminance over panel pixels: %.3f (n=%d); mean rgb %s' % (lum.mean(), m.sum(),
                  np.round(px[m, :3].mean(0), 3)))
        print('rendered', sc.render.filepath)


build()
if 'render' in ARGS:
    render()
