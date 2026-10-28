"""
jute (PARALLEL.md item 4, her verdict on the board: "no weave"). A ~2 x 2 m hanging gunny-sack panel, two variants.

Why the old one failed: arch.jute_weave displaced a 1.7 cm vertex grid with a 3.3 cm sine, below its own sampling, so the
weave averaged to nothing; and the 'burlap' scan at repeat 0.6 is a fine weave that drops to flat tan beyond 1 m.

What this does instead:
  - WEAVE = a genuine height field, generated here (numpy), of round warp and weft threads crossing OVER and UNDER each other
    (plain weave, 6 mm pitch, coarse bori sacking), with per-thread width slubs, twist striations, fibre streaks and dark
    gaps between threads. From it: a tangent-space normal map (OpenGL +Y), an albedo with cavity darkening and per-thread
    tone, and a roughness map. 512 px tile = 32 x 32 threads = 19.2 cm. Embedded in the GLB (this set is new, not in the
    shared texture folder; the main session can promote it to public/assets/textures/ if she approves it).
  - DRAPE = modelled: the cloth hangs from a jute rope by cord ties, slack swags between ties, stress folds fanning from
    each tie, long vertical folds lower down, a slight curl at the foot.
  - CONSTRUCTION = modelled: three sack widths stitched together (overlapped seam ridges with whip stitches), a folded top
    hem with a running stitch, a sewn-on repair patch (different, darker sack, weave turned ~7 deg, whip-stitched with
    pale sutli twine, one raw frayed edge), a ragged frayed foot with hanging warp threads and a few long loose ones,
    short weft ends sticking out of both selvedges.
  - WEATHERING = vertex colour (multiplied into the albedo): sun-bleached top, dust and splash at the foot, a water tide
    mark, per-sack tone, faded dyed warp stripes on one sack, fold cavities darker.
One mesh, one material (double sided), one draw call.

Run:  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_jute.py [-- render]
      node tools/shrink.js tmp/jute_panel_raw.glb public/assets/models/jute_panel.glb 999999
      node tools/shrink.js tmp/jute_panel_b_raw.glb public/assets/models/jute_panel_b.glb 999999
      (do NOT run strip-textures: the material has no dopahar_set, its weave textures are its own)
Frame: Blender +Z up, the cloth's front faces -Y (glTF +Z). Origin = centre of the rope it hangs from; the cloth hangs
down to about z = -2.0. Width 2.0 m of cloth, rope 2.3 m.
"""
import os
import sys
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from common import clear_scene, export_glb, ROOT

TMP = os.path.join(ROOT, 'tmp')
SHOTS = os.path.join(ROOT, 'docs', 'shots', 'jute-2026-10-28')
TEXDIR = os.path.join(TMP, 'jute_tex')
TILE = 0.192          # metres covered by one texture tile (32 threads at 6 mm)
NTEX = 512
NTHR = 32


# ---------------------------------------------------------------- the weave texture set
def _blur(a, sx, sy):
    """Tileable anisotropic gaussian blur via FFT (sx across columns/u, sy along rows/v, in pixels)."""
    n = a.shape[0]
    k = np.fft.fftfreq(n)
    G = np.exp(-2 * math.pi ** 2 * ((sx * k[None, :]) ** 2 + (sy * k[:, None]) ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * G))


def _norm(a):
    a = a - a.mean()
    return a / (np.abs(a).max() + 1e-6)


def make_weave_textures(seed=11):
    rng = np.random.default_rng(seed)
    N, T = NTEX, NTHR
    p = N / T
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float64) + 0.5     # row = v (warp runs along v), col = u (weft runs along u)
    s, t = xx / p, yy / p
    i = np.floor(s).astype(int) % T                          # warp thread index
    j = np.floor(t).astype(int) % T                          # weft thread index
    a = s - np.floor(s) - 0.5                                # across the warp thread
    b = t - np.floor(t) - 0.5                                # across the weft thread
    # per-thread width, with slubs (thick-thin) along each thread: a tileable 1D noise per thread
    wi = rng.uniform(0.62, 0.86, T)
    wj = rng.uniform(0.60, 0.84, T)
    slw = np.stack([_norm(_blur(rng.standard_normal((N, N)), 0.1, 14)[:, 0]) for _ in range(T)])   # (T, N) along v
    slf = np.stack([_norm(_blur(rng.standard_normal((N, N)), 0.1, 14)[:, 0]) for _ in range(T)])   # (T, N) along u
    xi, yi = xx.astype(int), yy.astype(int)
    hw = 0.5 * wi[i] * (1 + 0.28 * slw[i, yi])
    hf = 0.5 * wj[j] * (1 + 0.28 * slf[j, xi])
    pw = np.sqrt(np.clip(1 - (a / hw) ** 2, 0, 1))
    pf = np.sqrt(np.clip(1 - (b / hf) ** 2, 0, 1))
    cw = np.cos(math.pi * (t - 0.5) + math.pi * i)          # +1 where this warp passes OVER the weft, -1 under
    cf = np.cos(math.pi * (s - 0.5) + math.pi * j + math.pi)
    twist_w = np.sin(2 * math.pi * (t * 2.6 + a * 1.4))      # slanted striations of a twisted yarn
    twist_f = np.sin(2 * math.pi * (s * 2.6 - b * 1.4))
    fib_w = _norm(_blur(rng.standard_normal((N, N)), 0.6, 7))   # fibres run along the thread
    fib_f = _norm(_blur(rng.standard_normal((N, N)), 7, 0.6))
    Hw = np.where(pw > 0, 0.48 + 0.30 * cw + 0.34 * pw + 0.05 * pw * twist_w + 0.06 * fib_w * pw, 0.0)
    Hf = np.where(pf > 0, 0.48 + 0.30 * cf + 0.34 * pf + 0.05 * pf * twist_f + 0.06 * fib_f * pf, 0.0)
    warp_on_top = Hw >= Hf
    H = np.maximum(np.maximum(Hw, Hf), 0.0)
    gap = (pw <= 0) & (pf <= 0)
    fuzz = _blur(rng.standard_normal((N, N)), 0.8, 0.8)
    H = H + 0.03 * _norm(fuzz)
    Hs = _blur(H, 0.7, 0.7)
    # normal map, OpenGL convention (+Y = +v); 1 H unit ~ one thread thickness ~ 6 texels
    k = 3.2
    dx = (np.roll(Hs, -1, 1) - np.roll(Hs, 1, 1)) * 0.5
    dy = (np.roll(Hs, -1, 0) - np.roll(Hs, 1, 0)) * 0.5
    nx, ny, nz = -dx * k, -dy * k, np.ones_like(Hs)
    ln = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nrm = np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], -1)
    # albedo (sRGB values), nothing above ~0.8, gaps a warm dark brown not black
    tone_w = rng.uniform(0.84, 1.08, T)
    tone_f = rng.uniform(0.82, 1.06, T)
    warp_c = np.array([0.72, 0.60, 0.41])
    weft_c = np.array([0.67, 0.555, 0.375])
    thr = np.where(warp_on_top[..., None], warp_c * tone_w[i][..., None] * (1 + 0.10 * fib_w)[..., None],
                   weft_c * tone_f[j][..., None] * (1 + 0.10 * fib_f)[..., None])
    hn = np.clip(Hs / 1.05, 0, 1)
    cav = (0.42 + 0.58 * hn ** 0.8)[..., None]
    col = thr * cav
    gapc = np.array([0.20, 0.155, 0.11])
    col = np.where(gap[..., None], gapc * (0.9 + 0.2 * hn[..., None]), col)
    hair = np.clip(_norm(_blur(rng.standard_normal((N, N)), 0.5, 0.5)), 0, 1)[..., None]
    col = col * (1 - 0.06 * hair) + 0.06 * hair * np.array([0.80, 0.70, 0.52])   # pale stray fibres
    col = np.clip(col, 0.03, 0.82)
    rough = np.clip(0.93 - 0.07 * hn + 0.03 * fuzz / (np.abs(fuzz).max() + 1e-6), 0.8, 0.99)
    rough = np.where(gap, 0.99, rough)
    os.makedirs(TEXDIR, exist_ok=True)

    def save(name, rgb, cs):
        img = bpy.data.images.new(name, N, N, alpha=False)
        px = np.ones((N, N, 4), np.float32)
        px[..., :3] = rgb
        img.pixels.foreach_set(px.ravel())
        path = os.path.join(TEXDIR, name + '.png')
        img.filepath_raw = path
        img.file_format = 'PNG'
        img.save()
        img.colorspace_settings.name = cs
        return img

    return (save('jute_weave_color', col, 'sRGB'), save('jute_weave_normal', nrm, 'Non-Color'),
            save('jute_weave_roughness', np.repeat(rough[..., None], 3, -1), 'Non-Color'))


def make_material(imgs):
    ci, ni, ri = imgs
    m = bpy.data.materials.new('jute_weave')
    m.use_nodes = True
    m.use_backface_culling = False
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = 0.0

    def tex(img, y):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        n.location = (-500, y)
        return n
    c, n, r = tex(ci, 300), tex(ni, 0), tex(ri, -300)
    va = nt.nodes.new('ShaderNodeVertexColor')
    va.layer_name = 'Col'
    va.location = (-500, 600)
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Fac'].default_value = 1.0
    mix.location = (-150, 400)
    nt.links.new(c.outputs['Color'], mix.inputs['Color1'])
    nt.links.new(va.outputs['Color'], mix.inputs['Color2'])
    nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.location = (-150, 0)
    nt.links.new(n.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    nt.links.new(r.outputs['Color'], bsdf.inputs['Roughness'])
    return m


# ---------------------------------------------------------------- mesh accumulator
class Acc:
    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.col = self.bm.loops.layers.color.new('Col')

    def face(self, vs, uvs, cols):
        f = self.bm.faces.new(vs)
        f.smooth = True
        for lp, uv, c in zip(f.loops, uvs, cols):
            lp[self.uv].uv = uv
            lp[self.col] = (c[0], c[1], c[2], 1.0)
        return f

    def grid(self, P, U, C):
        """P, U, C: 2D lists [row][col] of positions, uvs, colours."""
        V = [[self.bm.verts.new(p) for p in row] for row in P]
        for r in range(len(P) - 1):
            for k in range(len(P[0]) - 1):
                idx = ((r, k), (r + 1, k), (r + 1, k + 1), (r, k + 1))
                self.face([V[a][b] for a, b in idx], [U[a][b] for a, b in idx], [C[a][b] for a, b in idx])

    def ribbon(self, pts, side, width, u0, v0, colour):
        """A thin strip along pts (a loose thread); `side` is the in-plane width direction."""
        L = [pts[0]]
        rowsP, rowsU, rowsC = [], [], []
        acc = 0.0
        for q, pt in enumerate(pts):
            if q:
                acc += (pt - pts[q - 1]).length
            w = width * (1 - 0.55 * q / max(1, len(pts) - 1))           # tapers to the frayed tip
            rowsP.append([pt - side * w / 2, pt + side * w / 2])
            rowsU.append([(u0, v0 + acc / TILE), (u0 + width / TILE, v0 + acc / TILE)])
            rowsC.append([colour, colour])
        self.grid(rowsP, rowsU, rowsC)

    def tube(self, pts, radius, sides, colour, uv_fn):
        """Closed-ring tube (stitch, cord). uv_fn(k_along, ring_index, angle) -> uv."""
        rows = []
        for q, pt in enumerate(pts):
            d = (pts[min(q + 1, len(pts) - 1)] - pts[max(q - 1, 0)]).normalized()
            ref = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
            e1 = d.cross(ref).normalized()
            e2 = d.cross(e1).normalized()
            rows.append([pt + (e1 * math.cos(2 * math.pi * s / sides) + e2 * math.sin(2 * math.pi * s / sides)) * radius
                         for s in range(sides + 1)])
        P = rows
        U = [[uv_fn(q, s, 2 * math.pi * s / sides) for s in range(sides + 1)] for q in range(len(pts))]
        C = [[colour] * (sides + 1) for _ in pts]
        self.grid(P, U, C)


def clamp3(c, hi=0.94):
    return tuple(max(0.04, min(hi, x)) for x in c)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[k] * (1 - t) + b[k] * t for k in range(3))


# ---------------------------------------------------------------- one panel
def build_panel(acc, v):
    rnd = random.Random(v['seed'])
    W, L = 2.0, v['length']
    ties = v['ties']
    ph = [rnd.uniform(0, 6.28) for _ in range(8)]
    seams = v['seams']                      # x of the two sack joins
    stripes = v['stripes']                  # (x0, x1) dyed warp stripes
    S = v['slack']

    def tie_frac(X):
        for a0, a1 in zip(ties, ties[1:]):
            if a0 <= X <= a1:
                return (X - a0) / (a1 - a0), a1 - a0
        return 0.0, 1.0

    def pos(X, R):
        f, span = tie_frac(X)
        sw = math.sin(math.pi * f)
        sag = S * (span / 0.66) * sw * math.exp(-R / 0.55)
        z = -0.025 - R - sag
        y = -0.035 * sw * math.exp(-R / 0.4)                                     # the swag bellies toward the viewer
        y += 0.016 * math.cos(2 * math.pi * f * 2) * math.exp(-R / 0.3) * (1 - abs(2 * f - 1) ** 2)   # stress folds off the ties
        lo = 0.3 + 0.7 * min(1.0, R / 1.1)
        y += (0.034 * math.sin(X * 7.3 + ph[0] + 0.6 * R) + 0.016 * math.sin(X * 15.1 + ph[1] - 0.9 * R)
              + 0.008 * math.sin(X * 31 + ph[2] + 2.0 * R)) * lo
        y += -0.03 * math.sin(math.pi * (X + W / 2) / W) * (R / L)                # belly
        y += 0.025 * (R / L) ** 6 * math.sin(X * 5 + ph[3])                       # foot curls
        y += 0.012 * max(0.0, abs(X) / (W / 2) - 0.9) / 0.1                       # selvedges turn back
        for sx in seams:
            y -= 0.0045 * math.exp(-((X - sx) / 0.011) ** 2)                      # overlapped seam ridge
        if R < 0.05:
            y -= 0.004                                                             # double thickness hem
        return Vector((X, y, z))

    def normal(X, R):
        e = 0.004
        dx = pos(X + e, R) - pos(X - e, R)
        dr = pos(X, R + e) - pos(X, R - e)
        n = dr.cross(dx).normalized()
        return n if n.y < 0 else -n                                                # front = -Y

    base = (0.90, 0.88, 0.84)
    fade = (0.95, 0.94, 0.90)
    dust = (0.60, 0.52, 0.42)
    sack_tint = v['sack_tint']
    stain_c, stain_r = v['stain']

    def colour(X, R):
        c = base
        c = mix(c, fade, 0.55 * (1 - R / L) ** 2)
        c = mix(c, dust, 0.65 * max(0.0, (R / L - 0.68) / 0.32) ** 1.4)
        si = 0 if X < seams[0] else (1 if X < seams[1] else 2)
        c = tuple(c[k] * sack_tint[si][k] for k in range(3))
        d = math.hypot(X - stain_c[0], R - stain_c[1])
        if d < stain_r + 0.03:
            c = tuple(x * (0.88 if d < stain_r else 1.0) * (0.8 if abs(d - stain_r) < 0.018 else 1.0) for x in c)   # tide mark
        blot = 0.5 + 0.5 * math.sin(X * 3.1 + ph[4]) * math.sin(R * 2.7 + ph[5])
        c = tuple(x * (1 - 0.12 * blot ** 3) for x in c)
        for sx in seams:
            if abs(X - sx) < 0.0125:
                c = tuple(x * 0.74 for x in c)
        for s0, s1, sc in stripes:
            if s0 - 1e-4 <= X <= s1 + 1e-4:
                c = tuple(c[k] * sc[k] for k in range(3))
        y = pos(X, R).y
        c = tuple(x * (1 - 2.2 * max(0.0, y - 0.01)) for x in c)                  # folds receding = in shadow
        if R < 0.05:
            c = tuple(x * (0.86 if R > 0.042 else 1.0) for x in c)
        return clamp3(c)

    # columns: 5 cm grid + exact edges for seams and stripes
    xs = {round(-W / 2 + W * k / 40, 5) for k in range(41)}
    for sx in seams:
        xs |= {round(sx + d, 5) for d in (-0.0125, -0.006, 0.0, 0.006, 0.0125)}
    for s0, s1, _ in stripes:
        xs |= {round(s0 - 0.0015, 5), s0, s1, round(s1 + 0.0015, 5)}
    xs = sorted(xs)
    rag = {X: (rnd.uniform(0.0, 0.025) + v['tear'](X)) for X in xs}
    nv = 42
    Rs = [0.0, 0.042, 0.05] + [0.05 + (L - 0.05) * k / (nv - 3) for k in range(1, nv - 2)]
    P, U, C = [], [], []
    for R0 in Rs:
        rp, ru, rc = [], [], []
        for X in xs:
            R = min(R0, L - rag[X]) if R0 > 0.06 else R0
            rp.append(pos(X, R))
            ru.append(((X + W / 2) / TILE, -R / TILE))
            rc.append(colour(X, R))
        P.append(rp); U.append(ru); C.append(rc)
    acc.grid(P, U, C)

    def surf(X, R, off):
        return pos(X, R) + normal(X, R) * off

    thread_u = 0.5 / NTHR          # u at the centre of warp thread 0
    # frayed foot: bared warp threads all along the bottom, every ~7 mm, a few long loose ones
    X = -W / 2 + 0.004
    while X < W / 2 - 0.004:
        Rb = L - (rag[min(xs, key=lambda q: abs(q - X))]) - 0.004
        long = rnd.random() < 0.035
        ln = rnd.uniform(0.12, 0.30) if long else rnd.uniform(0.008, 0.05) * (1.6 if v['tear'](X) > 0.02 else 1.0)
        n_seg = 6 if long else 3
        start = surf(X, Rb, 0.0)
        drift = rnd.uniform(-0.25, 0.25) if long else rnd.uniform(-0.12, 0.12)
        curl = rnd.uniform(-0.02, 0.02)
        pts = [start + Vector((drift * ln * (q / n_seg) ** 1.5, curl * (q / n_seg) ** 2 - 0.002 * q, -ln * q / n_seg))
               for q in range(n_seg + 1)]
        g = rnd.uniform(0.80, 0.98)
        acc.ribbon(pts, Vector((1, 0, 0)), rnd.uniform(0.0024, 0.0034), thread_u, rnd.random(),
                   clamp3(mix((0.86 * g, 0.80 * g, 0.70 * g), dust, 0.35)))
        X += rnd.uniform(0.005, 0.010)
    # weft ends sticking out of both selvedges
    for side in (-1, 1):
        R = 0.07
        while R < L - 0.05:
            ln = rnd.uniform(0.004, 0.025) * (2.2 if rnd.random() < 0.06 else 1.0)
            X0 = side * (W / 2 - 0.003)
            st = surf(X0, R, 0.0)
            droop = rnd.uniform(0.0, 0.5)
            pts = [st + Vector((side * ln * q / 2, 0.0, -droop * ln * (q / 2) ** 2)) for q in range(3)]
            g = rnd.uniform(0.82, 0.98)
            acc.ribbon(pts, Vector((0, 0, 1)), rnd.uniform(0.0022, 0.003), thread_u, rnd.random(),
                       clamp3((0.88 * g, 0.83 * g, 0.74 * g)))
            R += rnd.uniform(0.006, 0.014)

    twine = clamp3((0.93, 0.90, 0.82))
    cord = clamp3((0.62, 0.55, 0.45))

    def stitch(p0, p1, r=0.0016, lift=0.0018, colour=twine):
        mid = (p0 + p1) * 0.5 + Vector((0, -lift, 0))
        acc.tube([p0, mid, p1], r, 4, colour, lambda q, s_, ang: (0.70 + 0.004 * s_, 0.3 + 0.05 * q))

    # top hem running stitch
    X = -W / 2 + 0.03
    while X < W / 2 - 0.03:
        dl = rnd.uniform(0.012, 0.017)
        stitch(surf(X, 0.046, 0.0035), surf(X + dl, 0.046 + rnd.uniform(-0.002, 0.002), 0.0035), colour=cord)
        X += dl + rnd.uniform(0.010, 0.016)
    # seam whip stitches
    for sx in seams:
        R = 0.06
        while R < L - 0.06:
            a0 = surf(sx - 0.013, R, 0.004)
            a1 = surf(sx + 0.013, R + 0.012, 0.004)
            stitch(a0, a1, colour=cord)
            R += rnd.uniform(0.028, 0.036)

    # sewn-on patch: a darker, newer sack, weave turned, hemmed on three sides, one raw frayed edge
    px, pr, pw_, ph_ = v['patch']
    rot = v['patch_rot']
    nu_p, nv_p = 9, 8
    pcol = v['patch_tint']
    PP, PU, PC = [], [], []
    for a in range(nv_p + 1):
        rp, ru, rc = [], [], []
        for b in range(nu_p + 1):
            X = px + pw_ * (b / nu_p - 0.5)
            R = pr + ph_ * (a / nv_p - 0.5)
            edge = min(b, nu_p - b, a, nv_p - a)
            off = 0.0055 + (0.0015 if edge == 0 else 0.0)
            rp.append(surf(X, R, off))
            uu, vv = (X - px) / TILE, -(R - pr) / TILE
            ru.append((uu * math.cos(rot) - vv * math.sin(rot) + 0.37, uu * math.sin(rot) + vv * math.cos(rot) + 0.11))
            k = 0.86 if edge == 0 else 1.0
            c = colour(X, R)
            rc.append(clamp3(tuple(c[q] * pcol[q] * k for q in range(3))))
        PP.append(rp); PU.append(ru); PC.append(rc)
    acc.grid(PP, PU, PC)
    # whip stitches round three sides
    per = []
    for b in range(0, 17):
        per.append((px + pw_ * (b / 16 - 0.5), pr - ph_ / 2, 'top'))
        per.append((px + pw_ * (b / 16 - 0.5), pr + ph_ / 2, 'bot'))
    for a in range(0, 15):
        per.append((px - pw_ / 2, pr + ph_ * (a / 14 - 0.5), 'l'))
    raw_side = v['patch_raw']
    for X, R, sd in per:
        if sd == raw_side:
            continue
        jx, jr = rnd.uniform(-0.003, 0.003), rnd.uniform(-0.003, 0.003)
        inward = {'top': (0.0, 0.016), 'bot': (0.0, -0.016), 'l': (0.016, 0.0), 'r': (-0.016, 0.0)}[sd]
        a0 = surf(X + jx + inward[0], R + jr + inward[1], 0.0075)
        a1 = surf(X + jx - inward[0] * 0.5 + 0.006, R + jr - inward[1] * 0.5 + 0.006, 0.004)
        stitch(a0, a1)
    # right side: a darned running stitch line and the raw edge
    for a in range(12):
        R = pr + ph_ * (a / 11 - 0.5)
        stitch(surf(px + pw_ / 2 - 0.022, R, 0.0075), surf(px + pw_ / 2 - 0.022, R + 0.011, 0.0075))
    # raw edge fray
    if raw_side in ('top', 'bot'):
        R = pr + (ph_ / 2 if raw_side == 'bot' else -ph_ / 2)
        X = px - pw_ / 2 + 0.005
        while X < px + pw_ / 2 - 0.005:
            ln = rnd.uniform(0.006, 0.03)
            st = surf(X, R, 0.006)
            dz = -1 if raw_side == 'bot' else 1
            pts = [st + Vector((rnd.uniform(-0.3, 0.3) * ln * q / 2, -0.001 * q, dz * ln * q / 2)) for q in range(3)]
            acc.ribbon(pts, Vector((1, 0, 0)), 0.0028, thread_u, rnd.random(), clamp3(tuple(0.80 * x for x in pcol)))
            X += rnd.uniform(0.006, 0.011)
    else:
        X = px + pw_ / 2
        R = pr - ph_ / 2 + 0.005
        while R < pr + ph_ / 2 - 0.005:
            ln = rnd.uniform(0.006, 0.028)
            st = surf(X, R, 0.006)
            pts = [st + Vector((ln * q / 2, -0.001 * q, -rnd.uniform(0.0, 0.4) * ln * (q / 2) ** 2)) for q in range(3)]
            acc.ribbon(pts, Vector((0, 0, 1)), 0.0028, thread_u, rnd.random(), clamp3(tuple(0.80 * x for x in pcol)))
            R += rnd.uniform(0.006, 0.011)

    # the rope it hangs from (2-ply twisted jute sutli: a helical texture lay plus a lumpy profile) and the cord ties
    rope_pts = []
    n_r = 80
    for q in range(n_r + 1):
        X = -1.15 + 2.3 * q / n_r
        rope_pts.append(Vector((X, 0.0, -0.002 * math.sin(X * 2.1 + ph[6]))))
    acc.tube(rope_pts, 0.0085, 6, clamp3((0.70, 0.63, 0.52)),
             lambda q, s_, ang: (0.25 + ang * 0.0085 / TILE * 1.0 + q * (2.3 / n_r) / TILE * 0.6, q * (2.3 / n_r) / TILE))
    for tx in ties:
        loop = []
        for q in range(9):
            ang = 2 * math.pi * q / 8
            loop.append(Vector((tx + 0.006 * math.sin(ang * 2), -0.012 * math.cos(ang) - 0.002,
                                0.006 + 0.026 * math.sin(ang) - 0.024)))
        acc.tube(loop, 0.0035, 5, cord, lambda q, s_, ang: (0.5 + q * 0.03, ang * 0.02))
        # the cloth bunches at the tie
        for d in (-0.012, 0.012):
            st = surf(tx + d, 0.02, 0.003)
            stitch(st, st + Vector((0, 0, -0.035)), r=0.004, lift=0.004, colour=clamp3((0.80, 0.74, 0.62)))


VARIANTS = {
    'jute_panel': dict(
        seed=5, length=1.95, ties=[-1.0, -0.34, 0.33, 1.0], slack=0.055,
        seams=[-0.33, 0.36], stripes=[(0.05, 0.062, (0.62, 0.78, 0.80)), (0.085, 0.097, (0.62, 0.78, 0.80))],
        sack_tint=[(1.0, 0.98, 0.95), (0.95, 0.94, 0.93), (1.02, 0.97, 0.90)],
        stain=((0.55, 1.25), 0.17),
        patch=(-0.58, 0.78, 0.36, 0.32), patch_rot=math.radians(7), patch_raw='r',
        patch_tint=(0.80, 0.74, 0.66), tear=lambda X: max(0.0, (0.25 - abs(X - 0.7)) * 0.25)),
    'jute_panel_b': dict(
        seed=9, length=2.0, ties=[-1.0, 0.0, 1.0], slack=0.06,
        seams=[-0.30, 0.38], stripes=[(-0.72, -0.712, (0.86, 0.62, 0.56)), (-0.69, -0.682, (0.86, 0.62, 0.56)),
                                      (-0.66, -0.652, (0.86, 0.62, 0.56))],
        sack_tint=[(0.96, 0.95, 0.94), (1.02, 0.98, 0.91), (0.97, 0.94, 0.90)],
        stain=((-0.2, 0.55), 0.22),
        patch=(0.58, 1.32, 0.40, 0.30), patch_rot=math.radians(-9), patch_raw='bot',
        patch_tint=(0.76, 0.72, 0.68), tear=lambda X: max(0.0, (X + 0.75) * -0.35) if X < -0.75 else 0.0),
}


def build(name):
    clear_scene()
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)
    imgs = make_weave_textures()
    mat = make_material(imgs)
    acc = Acc()
    build_panel(acc, VARIANTS[name])
    me = bpy.data.meshes.new(name)
    acc.bm.to_mesh(me)
    acc.bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    me.materials.append(mat)
    me.color_attributes.active_color = me.color_attributes['Col']
    print('TRIS', name, sum(len(p.vertices) - 2 for p in me.polygons))
    export_glb([obj], os.path.join(TMP, name + '_raw.glb'))
    return obj


def render(name, shots):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 1000
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.62, 0.66, 0.72, 1)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -2.08))
    g = bpy.context.active_object
    gm = bpy.data.materials.new('ground'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.30, 0.26, 0.20, 1)
    g.data.materials.append(gm)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0.6, 0), rotation=(math.radians(90), 0, 0))   # a wall behind
    wl = bpy.context.active_object
    wm = bpy.data.materials.new('wall'); wm.use_nodes = True
    wm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.42, 0.40, 0.37, 1)
    wl.data.materials.append(wm)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.color = (1.0, 0.95, 0.86)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    os.makedirs(SHOTS, exist_ok=True)
    for shot, loc, look, lens, sun_rot, energy, bgs in shots:
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sun.rotation_euler = sun_rot
        sun.data.energy = energy
        bg.inputs['Strength'].default_value = bgs
        sc.render.filepath = os.path.join(SHOTS, f'{name}_{shot}.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


FLAT = (math.radians(90), 0, 0)                     # sun travelling +Y: straight onto the front, from the camera
RAKE = (math.radians(90), math.radians(-78), 0)     # sun nearly edge-on from +X, grazing across the cloth

if __name__ == '__main__':
    want_render = '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--') + 1:]
    for nm in VARIANTS:
        build(nm)
        if want_render:
            shots = [('a_flat_front', (0, -3.3, -1.0), (0, 0, -1.0), 35, FLAT, 3.0, 1.0),
                     ('b_rake_1p5m', (0.15, -1.5, -0.95), (0.0, 0, -1.0), 35, RAKE, 4.5, 0.25)]
            if nm == 'jute_panel':
                shots.append(('c_rake_patch_close', (-0.45, -0.6, -0.72), (-0.55, 0, -0.8), 40, RAKE, 4.5, 0.25))
            render(nm, shots)
