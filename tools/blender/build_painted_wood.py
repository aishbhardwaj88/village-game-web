"""
Painted wood family (PARALLEL.md Wave 1 item 2, 28 Oct). Plank doors and shutters as GEOMETRY:
  - every plank is its own timber box, with a real 3-6 mm gap to its neighbour (the shadow line), its own small set-back and cup
  - the bare wood is the shared 'wood' scan with UVs laid ALONG the plank (the scan's grain runs along U), each plank sampling its
    own seam-free strip of the scan, so neighbours never share grain
  - the paint is a separate skin 1.5 mm proud of the wood (shared 'plaster' set, colour in vertex colours), cut by marching squares
    against a wear field, so chips have real ragged outlines; an older red-oxide coat shows in a band around each chip before bare wood
  - the wear field: plank edges along the gaps, plank ends, the kicked and splashed bottom 30 cm, hand zones round the latch,
    halos round every nail / strap, plus a few random chips elongated along the grain
  - colour: per-plank tint and hue drift, chalky sun fade (stronger high up), dirt band at the foot, rust bleeding down from nails,
    darkened paint at the gap edges. Nothing at full saturation, no pure black or white.
Paint colours deliberately carry NO green cast (ART_REVIEW: the old board's 0x9CC0B6 read too green): G never leads B or R.

Reusable API (import from this file; arch.py is not edited):
    from build_painted_wood import WoodAcc, board, plank_panel, door
    acc = WoodAcc()                                         # two buffers: 'paint' (hb_main, plaster set 0.5) and 'wood' (hb_wood, wood set 1.0)
    board(acc, M, W, L, T, paint, under, rnd, wear=0.5, fixings=(), cell=0.04, skins=('front',), grime=())
        One painted timber. Local frame: a = across (0..W), b = along the grain (0..L), y = thickness (front face at y=0, back at
        y=+T, so the front looks toward Blender -y = glTF +z). M (mathutils.Matrix 4x4) places it. skins: which faces get the
        chipped paint skin ('front', 'back', 'left', 'right'). fixings: [(world_x, world_z, radius, strength), ...] wear halos.
    plank_panel(acc, M, W, H, paint, under, seed, wear=0.5, plank_w=0.15, T=0.024, fixings=(), cell=0.04, grime=())
        A ledged panel of vertical planks W x H (local x 0..W, z 0..H, front at y=0), random plank widths, gaps, bottom unevenness,
        three back ledges. Returns the list of plank (x0, x1).
    door(acc, M, W, H, paint, under, seed, wear=0.5, leaves=2, studs=False, cell=0.04)
        Frame (chaukhat) + sill + 1 or 2 plank leaves + strap hinges, nail rows, kunda (hasp, staple, ring handles).
        Origin at the bottom centre of the frame on the ground, frame front face at y=0.
    acc.finalize(out_path)                                  # build objects, materials (with dopahar_set extras), export GLB
Paint hex values are used as vertex colours exactly like Kit tints (the texture multiplies them).

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_painted_wood.py -- all     (tmp/painted_wood_panel*_raw.glb)
  node tools/shrink.js tmp/painted_wood_panel_raw.glb public/assets/models/painted_wood_panel.glb 999999
  node tools/strip-textures.mjs public/assets/models/painted_wood_panel.glb public/assets/models/painted_wood_panel.glb
  (same for _b, _c)
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_painted_wood.py -- render  (docs/shots/assets-painted_wood/)
Variants: painted_wood_panel   = faded indigo-blue double door, medium wear (the sample)
          painted_wood_panel_b = dark chocolate-brown double door, iron studs, heavy wear at the foot, no older coat (under=None)
          painted_wood_panel_c = pale sky-blue single-leaf door, light wear, fresher coat
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from common import ROOT, load_pbr_material, wire_vertex_ao, hex_to_linear_rgb, clear_scene, export_glb, join_objects

EPS_TOP, EPS_UNDER = 0.0016, 0.0009
# seam-free bands of the wood scan across the grain (v), measured from the scan's own board joints
WOOD_BANDS = [(0.26, 0.49), (0.51, 0.82), (0.93, 1.24)]

PAINTS = {   # sun-faded, never saturated, no green lead
    'indigo': 0x5C73A0,
    'brown': 0x5E3B2C,
    'sky': 0xADBED5,
}
UNDER = {'oxide': 0x8A5646, 'umber': 0x4E4339, 'cream': 0xC6BCA6}
BARE = 0xB4A898      # multiplies the wood scan: weathered bare timber
RUST = 0x6E4128
IRON = 0x4A4542


# ---------------------------------------------------------------- noise
def _h(ix, iy, s):
    n = (ix * 374761393 + iy * 668265263 + s * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def vnoise(x, y, s=0):
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _h(ix, iy, s), _h(ix + 1, iy, s)
    c, d = _h(ix, iy + 1, s), _h(ix + 1, iy + 1, s)
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy


def fbm(x, y, s=0, oct=3):
    t, amp, norm = 0.0, 1.0, 0.0
    for i in range(oct):
        t += vnoise(x, y, s + i * 17) * amp
        norm += amp
        x, y, amp = x * 2.03, y * 2.03, amp * 0.5
    return t / norm


def sstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def mix(c0, c1, t):
    return tuple(c0[i] + (c1[i] - c0[i]) * t for i in range(3))


def lin(hx):
    return hex_to_linear_rgb(hx)


# ---------------------------------------------------------------- buffers
class Buf:
    def __init__(self):
        self.v, self.f, self.col, self.uv = [], [], [], []

    def poly(self, pts, cols, uvs, normal=None):
        """pts: world Vectors (Blender frame). Reversed if its winding disagrees with `normal`."""
        if normal is not None and len(pts) >= 3:
            n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
            if n.length > 1e-12 and n.dot(normal) < 0:
                pts, cols, uvs = pts[::-1], cols[::-1], uvs[::-1]
        i0 = len(self.v)
        self.v.extend(tuple(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts))))
        self.col.extend(cols)
        self.uv.extend(uvs)


class WoodAcc:
    def __init__(self):
        self.paint, self.wood = Buf(), Buf()

    def tris(self):
        return sum(len(f) - 2 for b in (self.paint, self.wood) for f in b.f)

    def objects(self, prefix='hb'):
        out = []
        for g, buf, sset, rep in (('main', self.paint, 'plaster', 0.5), ('wood', self.wood, 'wood', 1.0)):
            if not buf.f:
                continue
            me = bpy.data.meshes.new(prefix + '_' + g)
            me.from_pydata(buf.v, [], buf.f)
            me.update()
            uvl = me.uv_layers.new(name='UVMap')
            flat_uv = [c for uv in buf.uv for c in uv]
            # from_pydata keeps loop order = our vertex order (each poly owns its own verts)
            uvl.data.foreach_set('uv', flat_uv)
            ca = me.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
            ca.data.foreach_set('color', [c for col in buf.col for c in (min(1.0, col[0]), min(1.0, col[1]), min(1.0, col[2]), 1.0)])
            me.color_attributes.active_color = ca
            for p in me.polygons:
                p.use_smooth = False
            ob = bpy.data.objects.new(prefix + '_' + g, me)
            bpy.context.scene.collection.objects.link(ob)
            m = load_pbr_material(prefix + '_' + g, sset, repeat=(rep, rep))
            wire_vertex_ao(m, strength=1.0)
            m['dopahar_set'] = sset
            m['dopahar_repeat'] = float(rep)
            me.materials.append(m)
            out.append(ob)
        return out

    def finalize(self, out_path):
        obs = self.objects()
        export_glb(obs, out_path)
        print('tri count', self.tris())
        return obs


# ---------------------------------------------------------------- one painted timber
def _clip(poly, t):
    """Sutherland-Hodgman against the scalar field: keep where f < t. poly = [(a, b, f)]."""
    out = []
    n = len(poly)
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        pin, qin = p[2] < t, q[2] < t
        if pin:
            out.append(p)
        if pin != qin:
            k = (t - p[2]) / (q[2] - p[2])
            out.append((p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, t))
    return out


def board(acc, M, W, L, T, paint, under, rnd, wear=0.5, fixings=(), cell=0.04, skins=('front',), grime=(), bare=BARE, edge_dark=0.62):
    seed = rnd.randrange(1 << 20)
    R3 = M.to_3x3()
    P = lambda a, y, b: M @ Vector((a, y, b))
    # ---- wood core: 6 faces, grain along b
    band = rnd.choice([bd for bd in WOOD_BANDS if bd[1] - bd[0] > W] or WOOD_BANDS)
    ov = rnd.uniform(band[0], max(band[0], band[1] - W))
    ou = rnd.uniform(0, 10)
    bk = [x * rnd.uniform(0.9, 1.06) for x in lin(bare)]

    def wcol(p, dark=1.0):
        h = p.z
        k = (0.72 + 0.28 * sstep(0.0, 0.35, h)) * dark
        return (bk[0] * k, bk[1] * k, bk[2] * k * 0.97)

    faces = {
        'front': ([(0, 0, 0), (W, 0, 0), (W, 0, L), (0, 0, L)], (0, -1, 0), lambda a, y, b: (b + ou, a + ov)),
        'back': ([(0, T, 0), (W, T, 0), (W, T, L), (0, T, L)], (0, 1, 0), lambda a, y, b: (b + ou, a + ov)),
        'left': ([(0, 0, 0), (0, T, 0), (0, T, L), (0, 0, L)], (-1, 0, 0), lambda a, y, b: (b + ou, y + ov)),
        'right': ([(W, 0, 0), (W, T, 0), (W, T, L), (W, 0, L)], (1, 0, 0), lambda a, y, b: (b + ou, y + ov + 0.05)),
        'bottom': ([(0, 0, 0), (W, 0, 0), (W, T, 0), (0, T, 0)], (0, 0, -1), lambda a, y, b: (a + ou, y)),
        'top': ([(0, 0, L), (W, 0, L), (W, T, L), (0, T, L)], (0, 0, 1), lambda a, y, b: (a + ou, y)),
    }
    for name, (cs, nrm, uvf) in faces.items():
        pts = [P(*c) for c in cs]
        dark = edge_dark if name in ('left', 'right') else (0.85 if name in ('bottom', 'top') else 1.0)
        acc.wood.poly(pts, [wcol(p, dark) for p in pts], [uvf(*c) for c in cs], normal=R3 @ Vector(nrm))

    # ---- paint skins
    pk = lin(paint)
    drift = (rnd.uniform(0.93, 1.07), rnd.uniform(0.95, 1.04), rnd.uniform(0.93, 1.06))
    tone = rnd.uniform(0.86, 1.1)
    pk = tuple(pk[i] * drift[i] * tone for i in range(3))
    uk = lin(under) if under is not None else (0, 0, 0)
    rust = lin(RUST)
    t1 = 0.5
    for sk in skins:
        if sk in ('front', 'back'):
            D, yy = W, (-EPS_TOP if sk == 'front' else T + EPS_TOP)
            to3 = (lambda u, b, e: P(u, -e, b)) if sk == 'front' else (lambda u, b, e: P(u, T + e, b))
            nrm = R3 @ Vector((0, -1 if sk == 'front' else 1, 0))
        else:
            D = T
            to3 = (lambda u, b, e: P(-e, u, b)) if sk == 'left' else (lambda u, b, e: P(W + e, u, b))
            nrm = R3 @ Vector((-1 if sk == 'left' else 1, 0, 0))

        def field(u, b):
            p = to3(u, b, 0.0)
            ed = min(u, D - u)
            en = min(b, L - b)
            n1 = fbm(u * 9.0, b * 2.4, seed)
            n2 = fbm(u * 38.0, b * 9.0, seed + 5)
            n3 = fbm(u * 6.0 + p.x * 3.0, b * 1.6, seed + 11)
            f = 0.0
            patch = sstep(0.38, 0.72, fbm(b * 1.3, u * 2.0 + 3.0, seed + 31))      # edge wear comes and goes along the plank
            f += wear * 1.1 * math.exp(-ed / 0.010) * (0.2 + 0.9 * patch) * (0.45 + 1.0 * n2)
            f += 0.22 * (fbm(u * 90.0, b * 28.0, seed + 41) - 0.5)                  # ragged chip outline (resolved in split cells)
            f += wear * 0.9 * math.exp(-en / 0.025) * (0.4 + n2)
            f += wear * 1.15 * (1.0 - sstep(0.0, 0.32, p.z)) * (0.35 + 0.9 * n1)
            for (fx, fz, r, s) in fixings:
                d2 = (p.x - fx) ** 2 + (p.z - fz) ** 2
                if d2 < 9 * r * r:
                    f += s * math.exp(-d2 / (r * r)) * (0.55 + 0.9 * n2)
            for (gx, gz, r, s) in grime:     # hand zones: paint rubbed thin
                d2 = (p.x - gx) ** 2 + (p.z - gz) ** 2
                f += 0.6 * s * math.exp(-d2 / (r * r)) * (0.4 + n1)
            f += wear * 0.7 * sstep(0.64, 0.84, n3) * (0.6 + 0.6 * n2)
            return f

        def pcol(u, b, f):
            p = to3(u, b, 0.0)
            ed = min(u, D - u)
            nl = fbm(p.x * 1.3, p.z * 0.9, seed + 3)
            fade = min(0.5, 0.05 + 0.22 * wear * nl + 0.12 * sstep(0.4, 2.2, p.z))
            lum = (pk[0] * 0.3 + pk[1] * 0.55 + pk[2] * 0.15)
            chalk = (lum * 1.35 + 0.05, lum * 1.3 + 0.045, lum * 1.24 + 0.04)
            c = mix(pk, chalk, fade)
            c = mix(c, (c[0] * 0.78, c[1] * 0.68, c[2] * 0.52), 0.7 * (1.0 - sstep(0.0, 0.45, p.z)) * (0.6 + 0.6 * nl))
            for (fx, fz, r, s) in fixings:   # rust bleeding downward from each fixing
                dz = fz - p.z
                if -0.01 < dz < 0.25:
                    q = math.exp(-((p.x - fx) ** 2) / (0.008 + 0.06 * max(0, dz)) ** 2) * math.exp(-max(0, dz) / 0.12)
                    c = mix(c, rust, min(0.65, 0.7 * q * s))
            for (gx, gz, r, s) in grime:
                d2 = (p.x - gx) ** 2 + (p.z - gz) ** 2
                c = mix(c, (c[0] * 0.62, c[1] * 0.58, c[2] * 0.52), 0.55 * s * math.exp(-d2 / (r * r * 1.6)))
            c = mix(c, (c[0] * 0.7, c[1] * 0.66, c[2] * 0.6), 0.6 * math.exp(-ed / 0.006))   # dirt in the gap edge
            c = mix(c, (c[0] * 0.82, c[1] * 0.78, c[2] * 0.72), 0.5 * sstep(t1 - 0.1, t1, f))  # grime line round a chip
            return c

        def ucol(u, b, f):
            p = to3(u, b, 0.0)
            c = tuple(uk[i] * (0.85 + 0.25 * fbm(u * 20, b * 6, seed + 9)) for i in range(3))
            return mix(c, (c[0] * 0.75, c[1] * 0.68, c[2] * 0.55), 0.6 * (1.0 - sstep(0.0, 0.4, p.z)))

        def fu(u, b, f):   # the older coat shows in a band round SOME chips: band width wanders by region
            return f - (0.03 + 0.16 * sstep(0.45, 0.75, fbm(u * 3.0 + 7.0, b * 1.1, seed + 21)))

        def emit(q):
            fmin = min(x[2] for x in q)
            fmax = max(x[2] for x in q)
            if fmin < t1:   # top coat
                poly = q if fmax < t1 else _clip(q, t1)
                if len(poly) >= 3:
                    acc.paint.poly([to3(a, b, EPS_TOP) for a, b, _ in poly], [pcol(a, b, f) for a, b, f in poly],
                                   [(b * 0.45, a * 1.6) for a, b, _ in poly], normal=nrm)   # plaster scan stretched along the plank: brush strokes, not stucco
            if fmax >= t1 and under is not None:   # older coat, only where the top coat is gone
                qu = [(a, b, fu(a, b, f)) for a, b, f in q]
                if min(x[2] for x in qu) < t1:
                    poly = qu if max(x[2] for x in qu) < t1 else _clip(qu, t1)
                    if len(poly) >= 3:
                        acc.paint.poly([to3(a, b, EPS_UNDER) for a, b, _ in poly], [ucol(a, b, f) for a, b, f in poly],
                                       [(b * 0.45 + 3.1, a * 1.6) for a, b, _ in poly], normal=nrm)

        nu, nb = max(1, int(math.ceil(D / cell))), max(1, int(math.ceil(L / cell)))
        us = [min(D, i * D / nu) for i in range(nu + 1)]
        bs = [min(L, j * L / nb) for j in range(nb + 1)]
        F = [[field(u, b) for u in us] for b in bs]
        K = 2
        for j in range(nb):
            for i in range(nu):
                q = [(us[i], bs[j], F[j][i]), (us[i + 1], bs[j], F[j][i + 1]), (us[i + 1], bs[j + 1], F[j + 1][i + 1]), (us[i], bs[j + 1], F[j + 1][i])]
                fmin = min(x[2] for x in q)
                fmax = max(x[2] for x in q)
                if fmax < t1 - 0.09 or fmin > t1 + 0.22:   # clearly painted / clearly bare: one quad
                    emit(q)
                    continue
                # chip boundary passes near: split K x K so the ragged high-frequency edge resolves
                su = [us[i] + (us[i + 1] - us[i]) * k / K for k in range(K + 1)]
                sb = [bs[j] + (bs[j + 1] - bs[j]) * k / K for k in range(K + 1)]
                G = [[field(u, b) for u in su] for b in sb]
                for jj in range(K):
                    for ii in range(K):
                        emit([(su[ii], sb[jj], G[jj][ii]), (su[ii + 1], sb[jj], G[jj][ii + 1]), (su[ii + 1], sb[jj + 1], G[jj + 1][ii + 1]), (su[ii], sb[jj + 1], G[jj + 1][ii])])


# ---------------------------------------------------------------- small hardware (paint buffer, iron colours)
def _box(acc_buf, M, x0, x1, y0, y1, z0, z1, col, rnd=None):
    R3 = M.to_3x3()
    c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    fs = [((0, 1, 5, 4), (0, -1, 0)), ((2, 3, 7, 6), (0, 1, 0)), ((1, 2, 6, 5), (1, 0, 0)), ((3, 0, 4, 7), (-1, 0, 0)), ((4, 5, 6, 7), (0, 0, 1)), ((3, 2, 1, 0), (0, 0, -1))]
    for idx, n in fs:
        pts = [M @ Vector(c[i]) for i in idx]
        acc_buf.poly(pts, [col] * 4, [(p.x + p.y, p.z) for p in pts], normal=R3 @ Vector(n))


def nail(acc, M, x, z, r=0.007, col=None, seg=6, h=0.004):
    """Domed nail / stud head on the front (y<0)."""
    col = col or lin(IRON)
    R3 = M.to_3x3()
    ring = [M @ Vector((x + r * math.cos(2 * math.pi * k / seg), -EPS_TOP, z + r * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
    ring2 = [M @ Vector((x + 0.6 * r * math.cos(2 * math.pi * k / seg), -EPS_TOP - h, z + 0.6 * r * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
    hi = tuple(min(1.0, c * 1.25) for c in col)
    for k in range(seg):
        k2 = (k + 1) % seg
        pts = [ring[k], ring[k2], ring2[k2], ring2[k]]
        mid = (pts[0] + pts[2]) * 0.5
        out = (mid - M @ Vector((x, -EPS_TOP, z)))
        acc.paint.poly(pts, [col, col, hi, hi], [(p.x, p.z) for p in pts], normal=out)
    acc.paint.poly(ring2, [hi] * seg, [(p.x, p.z) for p in ring2], normal=R3 @ Vector((0, -1, 0)))


def torus(acc, M, cx, cy, cz, R, r, col, seg=12, tseg=5, plane='xz'):
    for i in range(seg):
        for j in range(tseg):
            pts = []
            for (ii, jj) in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)):
                a = 2 * math.pi * ii / seg
                b = 2 * math.pi * jj / tseg
                rr = R + r * math.cos(b)
                if plane == 'xz':
                    pts.append(M @ Vector((cx + rr * math.cos(a), cy + r * math.sin(b), cz + rr * math.sin(a))))
                else:   # ring hanging in the yz plane
                    pts.append(M @ Vector((cx + r * math.sin(b), cy + rr * math.cos(a), cz + rr * math.sin(a))))
            a = 2 * math.pi * (i + 0.5) / seg
            ctr = M @ Vector((cx + R * math.cos(a), cy, cz + R * math.sin(a))) if plane == 'xz' else M @ Vector((cx, cy + R * math.cos(a), cz + R * math.sin(a)))
            mid = sum(pts, Vector()) / 4
            acc.paint.poly(pts, [col] * 4, [(p.x, p.z) for p in pts], normal=mid - ctr)


# ---------------------------------------------------------------- assemblies
def plank_panel(acc, M, W, H, paint, under, seed, wear=0.5, plank_w=0.15, T=0.024, fixings=(), cell=0.05, grime=()):
    rnd = random.Random(seed)
    n = max(2, round(W / plank_w))
    ws = [rnd.uniform(0.82, 1.18) for _ in range(n)]
    gaps = [rnd.uniform(0.002, 0.0045) for _ in range(n - 1)]
    sc = (W - sum(gaps)) / sum(ws)
    x = 0.0
    out = []
    for i in range(n):
        w = ws[i] * sc
        dz0 = rnd.uniform(0.0, 0.012)                          # uneven, worn feet
        dz1 = rnd.uniform(-0.006, 0.0)
        dy = rnd.uniform(-0.0015, 0.002)                       # each plank sits a touch proud or back
        cup = rnd.uniform(-0.6, 0.6)                           # twist / cup, degrees
        Mi = M @ Matrix.Translation((x, dy, dz0)) @ Matrix.Translation((w / 2, 0, 0)) @ Matrix.Rotation(math.radians(cup), 4, 'Z') @ Matrix.Translation((-w / 2, 0, 0))
        board(acc, Mi, w, H - dz0 + dz1, T, paint, under, rnd, wear=wear * rnd.uniform(0.8, 1.2), fixings=fixings, cell=cell, grime=grime)
        out.append((x, x + w))
        if i < n - 1:   # tongue in the groove: what the eye meets through a gap is dark timber, never a black slot
            g0, g1 = x + w - 0.01, x + w + gaps[i] + 0.01
            pts = [M @ Vector(c) for c in ((g0, T * 0.5, 0.01), (g1, T * 0.5, 0.01), (g1, T * 0.5, H - 0.01), (g0, T * 0.5, H - 0.01))]
            tc = tuple(c * 0.45 for c in lin(BARE))
            acc.wood.poly(pts, [tc] * 4, [(p_.z, p_.x) for p_ in pts], normal=M.to_3x3() @ Vector((0, -1, 0)))
        x += w + (gaps[i] if i < n - 1 else 0)
    # back ledges (seen through the gaps): bare, dark
    for zc in (0.16, H * 0.5, H - 0.16):
        Ml = M @ Matrix.Translation((0.03, T, zc + 0.05)) @ Matrix.Rotation(math.radians(90), 4, 'Y')   # b runs along +x, a downward
        board(acc, Ml, 0.10, W - 0.06, 0.028, paint, under, rnd, wear=0, cell=1.0, skins=(), bare=0x8A7E70, edge_dark=0.7)
    return out


def door(acc, M, W, H, paint, under, seed, wear=0.5, leaves=2, studs=False, cell=0.05, plank_w=0.15):
    """Frame + sill + leaves. M places the bottom centre of the frame; front face at local y=0."""
    rnd = random.Random(seed * 31 + 7)
    FW, FD = 0.085, 0.11            # frame member face width, depth
    SILL = 0.07
    x0 = -W / 2
    # door leaves sit 12 mm back inside the frame rebate
    ow, oh = W - 2 * FW, H - FW - SILL
    lw = ow / leaves
    iron = lin(IRON)
    lean = rnd.uniform(-0.3, 0.3)
    hinge_rows = (SILL + 0.16, SILL + oh * 0.5, SILL + oh - 0.16)
    latch_z = SILL + oh * rnd.uniform(0.5, 0.56)
    fix = []
    hand = []
    for L in range(leaves):
        lx0 = x0 + FW + L * lw + 0.002
        lw_ = lw - 0.004
        hinge_side = 0 if L == 0 else 1          # leaf 0 hinges on the left jamb, leaf 1 on the right
        meet_x = lx0 + (lw_ if hinge_side == 0 else 0)
        for zr in hinge_rows:
            nn = max(2, round(lw_ / plank_w))
            for k in range(nn):
                fx = lx0 + (k + 0.5) * lw_ / nn + rnd.uniform(-0.01, 0.01)
                fix.append((fx, zr + rnd.uniform(-0.02, 0.02), 0.022, 0.55))
                fix.append((fx + rnd.uniform(0.02, 0.04), zr + rnd.uniform(-0.03, 0.03), 0.02, 0.45))
        hand.append((meet_x + (-0.07 if hinge_side == 0 else 0.07), latch_z, 0.12, 1.0))
        hand.append((meet_x + (-0.05 if hinge_side == 0 else 0.05), SILL + 0.35, 0.16, 0.8))   # pushed open with a foot
        if studs:
            for zr in [SILL + 0.3 + i * (oh - 0.6) / 5 for i in range(6)]:
                for k in range(4):
                    fix.append((lx0 + (k + 0.5) * lw_ / 4, zr, 0.02, 0.35))
    W2 = lambda t: ((M @ Vector((t[0], 0, t[1]))).x, (M @ Vector((t[0], 0, t[1]))).z, t[2], t[3])   # wear fields work in world x/z
    fix, hand = [W2(t) for t in fix], [W2(t) for t in hand]
    for L in range(leaves):
        lx0 = x0 + FW + L * lw + 0.002
        lw_ = lw - 0.004
        Ml = M @ Matrix.Translation((lx0, 0.012, SILL + 0.004)) @ Matrix.Rotation(math.radians(lean * (1 if L else -1) * 0.2), 4, 'Y')
        planks = plank_panel(acc, Ml, lw_, oh - 0.008, paint, under, seed * 13 + L, wear=wear, plank_w=plank_w, fixings=fix, cell=cell, grime=hand)
        hinge_side = 0 if L == 0 else 1
        # strap hinges: flat iron bars from the hinge edge across ~60% of the leaf, nailed through
        for zr in (hinge_rows[0], hinge_rows[2]):
            sl = lw_ * rnd.uniform(0.55, 0.68)
            sx0 = lx0 - 0.03 if hinge_side == 0 else lx0 + lw_ - sl
            sx1 = sx0 + sl + 0.03
            ic = tuple(iron[i] * rnd.uniform(0.9, 1.15) for i in range(3))
            _box(acc.paint, M, sx0, sx1, 0.012 - EPS_TOP - 0.0045, 0.012 - EPS_TOP, zr - 0.018, zr + 0.018, ic)
            for k in range(4):
                nail(acc, M @ Matrix.Translation((0, 0.012 - 0.0045, 0)), sx0 + 0.05 + k * (sl - 0.06) / 3, zr, r=0.006, col=tuple(c * 0.8 for c in ic))
        # nail rows over the middle ledge (where no strap)
        for (px0, px1) in planks:
            for dx in (0.3, 0.7):
                nail(acc, Ml, px0 + (px1 - px0) * dx + rnd.uniform(-0.006, 0.006), hinge_rows[1] - SILL - 0.004 + rnd.uniform(-0.015, 0.015), r=0.0055,
                     col=tuple(c * rnd.uniform(0.85, 1.25) for c in iron))
        if studs:
            for zr in [0.3 + i * (oh - 0.6) / 5 for i in range(6)]:
                for k in range(4):
                    nail(acc, Ml, (k + 0.5) * lw_ / 4, zr - 0.004, r=0.011, h=0.008, col=tuple(c * rnd.uniform(0.8, 1.2) for c in iron))
        # ring handle (kunda) near the meeting edge
        hx = lx0 + (lw_ - 0.09 if hinge_side == 0 else 0.09)
        _box(acc.paint, M, hx - 0.025, hx + 0.025, 0.012 - EPS_TOP - 0.004, 0.012 - EPS_TOP, latch_z - 0.03, latch_z + 0.03, tuple(c * 0.9 for c in iron))
        torus(acc, M, hx, 0.012 - EPS_TOP - 0.009, latch_z - 0.045, 0.045, 0.0045, tuple(c * 1.1 for c in iron), plane='xz')
    if leaves == 2:   # hasp staple + chain loop across the meeting stiles
        mx = x0 + FW + lw
        _box(acc.paint, M, mx - 0.11, mx + 0.01, 0.012 - EPS_TOP - 0.004, 0.012 - EPS_TOP, latch_z + 0.08, latch_z + 0.105, iron)
        torus(acc, M, mx + 0.03, 0.012 - EPS_TOP - 0.008, latch_z + 0.092, 0.022, 0.004, iron, seg=10, plane='xz')
    else:
        mx = x0 + FW + lw - 0.05
        _box(acc.paint, M, mx - 0.12, mx + 0.02, 0.012 - EPS_TOP - 0.004, 0.012 - EPS_TOP, latch_z + 0.08, latch_z + 0.105, iron)
    # frame (chaukhat): jambs, head, sill. Front face of the frame at y=0, members bigger and proud of the leaves.
    rf = random.Random(seed + 99)
    jfix = [W2((x0 + FW * 0.5, z, 0.03, 0.4)) for z in hinge_rows] + [W2((x0 + W - FW * 0.5, z, 0.03, 0.4)) for z in hinge_rows]
    for side in (0, 1):
        jx = x0 if side == 0 else x0 + W - FW
        Mj = M @ Matrix.Translation((jx, 0, 0))
        board(acc, Mj, FW, H, FD, paint, under, rf, wear=wear * 1.1, fixings=jfix, cell=cell, skins=('front', 'right' if side == 0 else 'left'), grime=hand)
    # head: b runs along +x
    Mh = M @ Matrix.Translation((x0 + FW, 0, H)) @ Matrix.Rotation(math.radians(90), 4, 'Y')   # a runs downward: a=FW is the soffit
    board(acc, Mh, FW, W - 2 * FW, FD, paint, under, rf, wear=wear * 0.8, cell=cell, skins=('front', 'right'))
    # sill: low threshold rail, worn hardest
    Ms = M @ Matrix.Translation((x0 + FW, 0, SILL)) @ Matrix.Rotation(math.radians(90), 4, 'Y')
    board(acc, Ms, SILL, W - 2 * FW, FD, paint, under, rf, wear=min(1.0, wear * 1.6), cell=cell, skins=('front', 'left'))


VARIANTS = {
    'painted_wood_panel': dict(paint=PAINTS['indigo'], under=UNDER['oxide'], seed=3, wear=0.55, leaves=2, studs=False, W=2.0, H=2.1, plank_w=0.15),
    'painted_wood_panel_b': dict(paint=PAINTS['brown'], under=None, seed=8, wear=0.62, leaves=2, studs=True, W=1.9, H=2.05, plank_w=0.17),
    'painted_wood_panel_c': dict(paint=PAINTS['sky'], under=UNDER['cream'], seed=21, wear=0.35, leaves=1, studs=False, W=1.15, H=2.05, plank_w=0.14),
}


def make(name, M=None):
    v = VARIANTS[name]
    acc = WoodAcc()
    door(acc, M or Matrix.Identity(4), v['W'], v['H'], v['paint'], v['under'], v['seed'], wear=v['wear'], leaves=v['leaves'], studs=v['studs'], plank_w=v['plank_w'])
    return acc


def build(name):
    clear_scene()
    acc = make(name)
    acc.finalize(os.path.join(ROOT, 'tmp', name + '_raw.glb'))
    print('VARIANT', name, 'tris', acc.tris())


def render():
    """Preview: all three set into a limewashed brick wall, warm afternoon sun. Writes docs/shots/assets-painted_wood/."""
    clear_scene()
    xs = {'painted_wood_panel': 0.0, 'painted_wood_panel_b': -2.9, 'painted_wood_panel_c': 2.6}
    acc = WoodAcc()
    for nm, x in xs.items():
        v = VARIANTS[nm]
        door(acc, Matrix.Translation((x, 0, 0)), v['W'], v['H'], v['paint'], v['under'], v['seed'], wear=v['wear'], leaves=v['leaves'], studs=v['studs'], plank_w=v['plank_w'])
    obs = acc.objects()
    for m in bpy.data.materials:
        nt = m.node_tree
        if not nt:
            continue
        for nd in nt.nodes:
            if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                nd.inputs['Fac'].default_value = 1.0
        if m.name.endswith('main'):   # the game's plaster boost (x1.4, src/stagingYard.js addWeathering)
            bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
            src = bsdf.inputs['Base Color'].links[0].from_socket
            mx = nt.nodes.new('ShaderNodeMixRGB'); mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1.0
            mx.inputs['Color2'].default_value = (1.4, 1.4, 1.4, 1)
            nt.links.new(src, mx.inputs['Color1']); nt.links.new(mx.outputs['Color'], bsdf.inputs['Base Color'])
        if m.name.endswith('wood'):   # the game's wood shader: pull the scan's green cast toward warm brown (src/stagingYard.js)
            bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
            src = bsdf.inputs['Base Color'].links[0].from_socket
            mx = nt.nodes.new('ShaderNodeMixRGB'); mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1.0
            mx.inputs['Color2'].default_value = (2.6, 2.6 * 0.916, 2.6 * 0.832, 1)   # x2.6 = the game's wood boost
            nt.links.new(src, mx.inputs['Color1']); nt.links.new(mx.outputs['Color'], bsdf.inputs['Base Color'])
    # wall: limewash plaster with openings, dark rooms behind, ground
    wm = load_pbr_material('pv_wall', 'plaster', repeat=(0.5, 0.5))
    bsdf = next(n for n in wm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tint = wm.node_tree.nodes.new('ShaderNodeMixRGB'); tint.blend_type = 'MULTIPLY'; tint.inputs['Fac'].default_value = 1.0
    tint.inputs['Color2'].default_value = (*lin(0xE6DCC6), 1)
    nt = wm.node_tree; s = bsdf.inputs['Base Color'].links[0].from_socket
    nt.links.new(s, tint.inputs['Color1']); nt.links.new(tint.outputs['Color'], bsdf.inputs['Base Color'])
    dark = bpy.data.materials.new('pv_dark'); dark.use_nodes = True
    dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.018, 0.016, 1)
    gm = load_pbr_material('pv_ground', 'dryearth', repeat=(0.6, 0.6))

    def cube(name, x0, x1, y0, y1, z0, z1, mat):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        o = bpy.context.active_object; o.name = name; o.scale = (x1 - x0, y1 - y0, z1 - z0)
        bpy.ops.object.transform_apply(scale=True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.cube_project(cube_size=1.0); bpy.ops.object.mode_set(mode='OBJECT')
        o.data.materials.append(mat)
        return o
    edges = []
    for nm, x in sorted(xs.items(), key=lambda kv: kv[1]):
        w = VARIANTS[nm]['W']
        edges.append((x - w / 2, x + w / 2, VARIANTS[nm]['H']))
    cx = -4.6
    for (a, b, h) in edges:
        cube('wall', cx, a, -0.0, 0.3, 0, 3.0, wm)
        cube('wall_top', a, b, 0.0, 0.3, h, 3.0, wm)
        cube('room', a - 0.2, b + 0.2, 0.3, 2.0, 0, 3, dark)
        cx = b
    cube('wall', cx, 4.6, 0.0, 0.3, 0, 3.0, wm)
    cube('ground', -6, 6, -5, 3, -0.1, 0.0, gm)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1280, 860
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
    sun.rotation_euler = (math.radians(52), 0, math.radians(-38))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-painted_wood'); os.makedirs(d, exist_ok=True)
    for name, loc, look, lens in [('a_row', (0.3, -6.8, 1.6), (0.0, 0, 1.15), 30),
                                  ('b_close_blue', (0.55, -1.7, 1.05), (0.25, 0, 0.75), 45),
                                  ('c_foot_raking', (-1.7, -1.5, 0.55), (-2.6, 0, 0.45), 40)]:
        cam.location = loc; cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
if which == 'render':
    render()
elif which == 'all':
    for nm in VARIANTS:
        build(nm)
else:
    build(which)
