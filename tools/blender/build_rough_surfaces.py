"""
rough_surfaces (PARALLEL.md Wave 1 item 4): thatch, mud-and-dung, jute, packed earth. Four ~2 x 2 m sample panels in one GLB.

Uses the frozen library sets through arch.py's Kit exactly like build_material_board.py (thatch -> 'thatch' set, jute -> 'burlap',
earth -> 'dryearth' in the props slot). arch.py's thatch_straw / earth_ground / jute_weave stay the defaults; this file only
hooks them so a mesh that ALREADY carries its own 'Base' colour layer (the four hero surfaces built below, with their structure
modelled in) skips the generic pass. Anything else (rafters, posts, slab edges) still goes through arch.py's own functions.

Fixes against the 27 Oct board review:
  - thatch: ridges were faint (arch only displaces faces whose normal.z > 0.15, so a vertical board got NONE). Here it is a real
    30 deg roof panel with ~10 cm straw bundles, stepped courses (each course's butt end overhangs the one below), and a ragged eave.
  - jute: weave flat at distance (arch's 3.3 cm weave period is below its own 8.7 cm grid, so it aliased to nothing). Here the
    distance read comes from modelled drape folds, a stitched seam between two sack widths, a sewn-on patch, a rolled hem and
    per-thread tone bands; the burlap set's repeat drops 0.9 -> 0.6 so the weave in the texture is 1.5x larger.
  - packed earth: was darker than her pale reference. Vertex tint is now near-white so the pale dryearth scan carries the colour,
    with broom-swept arcs, chappal prints, a cycle-tyre groove and pale dust on the crowns.
  - mud-and-dung: a kachcha wall panel (lipai) with hand-sweep arcs modelled as low ridges, a damp foot, a raised darker mud plinth,
    shrinkage cracks and one fresher (greener) re-smeared patch.

Run:  Blender -b --python tools/blender/build_rough_surfaces.py [-- render]
      then node tools/shrink.js tmp/rough_surfaces_raw.glb public/assets/models/rough_surfaces.glb 999999
           node tools/strip-textures.mjs public/assets/models/rough_surfaces.glb public/assets/models/rough_surfaces.glb
Frame: Blender, +Z up, camera side is -Y (glTF +Z, 'south'). Panel centres x = -4.5 thatch, -1.5 jute, 1.5 mud, 4.5 earth.
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

OUT = os.path.join(ROOT, 'tmp', 'rough_surfaces_raw.glb')
SHOTS = os.path.join(ROOT, 'docs', 'shots', 'assets-rough_surfaces')


def _hooked(orig):
    def fn(obj, base_hex, seed=0):
        if 'Base' in obj.data.color_attributes:   # built here with its own modelled structure and colour
            return True
        return orig(obj, base_hex, seed)
    return fn


arch.thatch_straw = _hooked(arch.thatch_straw)
arch.earth_ground = _hooked(arch.earth_ground)
arch.jute_weave = _hooked(arch.jute_weave)
_orig_dirt = arch.bake_dirty_vertex_colors


def _soft_dirt(obj, blur_iterations=2, dirt_only=False):
    """Blender's dirty-vertex bake normalises concavity over the whole mesh, so on a dense gently-swelling skin every concave swell
    flips to a sharp-edged dark island (seen in the first render). The cavities that matter are already modelled and coloured here,
    so blur the bake further and lift it toward white: it keeps the contact shadow in cracks and valleys, loses the blotches."""
    _orig_dirt(obj, blur_iterations=6, dirt_only=dirt_only)
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
    return tuple(min(1.0, max(0.0, a[i] * k)) for i in range(3))


def surface(name, nu, nv, pos_fn, col_fn, up, smooth=True):
    """Grid of (nu+1) x (nv+1) verts. pos_fn(i, j) -> (x, y, z); col_fn(i, j) -> linear rgb. Faces turned to face `up`."""
    bm = bmesh.new()
    vs = [[bm.verts.new(pos_fn(i, j)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            f.smooth = smooth
    bm.normal_update()
    upv = Vector(up)
    if sum(f.normal.dot(upv) for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    cols = {}
    for i in range(nu + 1):
        for j in range(nv + 1):
            cols[vs[i][j]] = col_fn(i, j)
    layer = bm.loops.layers.color.new('Base')
    for f in bm.faces:
        for lp in f.loops:
            c = cols[lp.vert]
            lp[layer] = (c[0], c[1], c[2], 1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def quad_obj(name, pts):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in pts], [], [tuple(range(len(pts)))])
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- thatch: 30 deg roof panel, ridge at the back
def thatch_panel(kit, cx, seed):
    rnd = random.Random(seed)
    pitch = math.radians(30)
    L, W = 2.1, 2.0                     # down-slope length, width
    ridge_y, ridge_z = 0.9, 2.15
    d = Vector((0, -math.cos(pitch), -math.sin(pitch)))   # down the slope
    n = Vector((0, -math.sin(pitch), math.cos(pitch)))    # out of the roof
    nu, nv = 80, 56                     # 2.5 cm across (bundles ~10 cm), 3.75 cm down
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    fringe, f = [], 0.05
    for _ in range(81):                 # straw ends: wandering length, a few long strays
        f = max(0.0, min(0.12, f + rnd.uniform(-0.03, 0.03)))
        fringe.append(f + (0.06 if rnd.random() < 0.08 else 0.0))
    course = 0.34
    patched = {k for k in range(30) if rnd.random() < 0.18}   # newer straw pushed into a few bundles
    H = {}

    def field(i, j):
        if (i, j) in H:
            return H[(i, j)]
        u = -W / 2 + W * i / nu
        v = L * j / nv
        k = u / 0.1 + 0.35 * math.sin(u * 3.1 + ph[0]) + 0.12 * math.sin(v * 2.6 + ph[1])
        bundle = 1.0 - abs(math.cos(math.pi * k)) ** 0.5                 # 0 in the sharp valley between bundles, 1 on the rounded crown
        s = (v / course + 0.12 * math.sin(u * 4.3 + ph[2])) % 1.0           # 0 top of a course, 1 its butt end
        shag = rnd.random()
        H[(i, j)] = (u, v, bundle, s, shag, int(k) % 30)
        return H[(i, j)]

    def pos(i, j):
        u, v, bundle, s, shag, b = field(i, j)
        h = 0.055 * bundle + 0.03 * s ** 2 + 0.006 * shag
        if i in (0, nu):
            h *= 0.4
        p = Vector((cx + u, ridge_y, ridge_z)) + d * v + n * h
        if j == nv:                     # ragged eave: straw ends hang past the butt line and droop
            p += d * fringe[i] + Vector((rnd.uniform(-0.01, 0.01), 0, -0.6 * fringe[i]))
        return tuple(p)

    crown, valley = lin(0xFFEBC0), lin(0xA08A66)
    grey, newer = lin(0xC8BCA6), lin(0xFFF0B4)
    rot = lin(0x86785E)

    def col(i, j):
        u, v, bundle, s, shag, b = field(i, j)
        c = mix(valley, crown, bundle * 0.75 + 0.25 * s)
        c = mix(c, grey, 0.45 * (1 - v / L) + 0.15 * shag)          # sun-greyed toward the ridge
        if b in patched:
            c = mix(c, newer, 0.55)
        low = max(0.0, (v - L * 0.7) / (L * 0.3))                       # older, damper straw at the eave
        rotp = 0.5 + 0.5 * math.sin(u * 2.3 + ph[3]) * math.sin(v * 3.1 + ph[4])
        c = mix(c, rot, low * 0.55 * rotp + 0.12 * (1 - bundle))
        return scale(c, 0.9 + 0.2 * shag)

    kit.add('thatch', surface('thatch_skin', nu, nv, pos, col, up=tuple(n)))
    # underside + gable edges (flat, colour only via arch's own pass) and two bamboo rafters and posts beneath
    off = -n * 0.05
    a = Vector((cx - W / 2, ridge_y, ridge_z)) + off
    b2 = Vector((cx + W / 2, ridge_y, ridge_z)) + off
    kit.add('thatch', quad_obj('thatch_under', [a, b2, b2 + d * (L + 0.05), a + d * (L + 0.05)]), 0x9A8C70)
    for x in (cx - 0.75, cx + 0.75):    # bamboo rafters lying along the slope under the straw
        r = wb('rafter', x - 0.035, x + 0.035, -(L - 0.15) / 2, (L - 0.15) / 2, -0.035, 0.035, 0.015)
        mid = Vector((0, ridge_y, ridge_z)) + d * (L / 2) + off * 2.0
        r.rotation_euler.x = pitch
        r.location = (0, mid.y, mid.z)
        bpy.context.view_layer.update()
        r.data.transform(r.matrix_world); r.matrix_world.identity()
        kit.add('trim', r, 0xA58E66)
    for x in (cx - 0.85, cx + 0.85):
        for vv, hh in ((0.25, None), (1.85, None)):
            p = Vector((x, ridge_y, ridge_z)) + d * vv + off * 3
            kit.add('trim', wb('post', x - 0.045, x + 0.045, -p.y - 0.045, -p.y + 0.045, 0.0, p.z, 0.015), 0x8F7A58)


# ---------------------------------------------------------------- jute: two opened gunny sacks stitched together, hung from a bamboo
def jute_panel(kit, cx, seed):
    rnd = random.Random(seed)
    W, top, bot = 2.0, 2.1, 0.12
    nu, nv = 66, 66                      # 3 cm grid
    ties = [-1.0, -0.34, 0.33, 1.0]
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    slub_rows = {j for j in range(nv + 1) if rnd.random() < 0.12}
    slub_cols = {i for i in range(nu + 1) if rnd.random() < 0.10}
    seam_x = 0.07
    px0, px1, pz0, pz1 = -0.72, -0.38, 0.55, 0.92                     # sewn-on patch
    F = {}

    def field(i, j):
        if (i, j) in F:
            return F[(i, j)]
        x = -W / 2 + W * i / nu
        t = j / nv                                                       # 0 top, 1 bottom
        z = top - (top - bot) * t
        gap = min(abs(x - tx) for tx in ties)                            # sag between the ties
        span = 0.33
        sag = 0.035 * math.sin(math.pi * min(1.0, gap / span)) * (1 - t) ** 2
        z -= sag
        fold = (0.035 * math.sin(x * 9.4 + ph[0] + 0.8 * t) + 0.02 * math.sin(x * 17 + ph[1] - 1.3 * t)) * (0.35 + 0.65 * t)
        fold += 0.025 * math.sin(x * 4.2 + ph[2]) * t
        hem = max(0.0, (t - 0.94) / 0.06)                                # rolled hem at the foot
        weave = 0.0
        seam = math.exp(-((x - seam_x) / 0.025) ** 2)
        patch = 1.0 if (px0 < x < px1 and pz0 < z < pz1) else 0.0
        pedge = 1.0 if patch and min(x - px0, px1 - x, z - pz0, pz1 - z) < 0.035 else 0.0
        y = fold - 0.012 * hem - 0.008 * seam - 0.004 * patch - 0.004 * pedge
        F[(i, j)] = (x, z, y, t, weave, seam, patch + pedge, hem)
        return F[(i, j)]

    def pos(i, j):
        x, z, y, *_ = field(i, j)
        return (cx + x, y, z)

    base, dirt = lin(0xF2E2C0), lin(0xA08868)
    faded, patchc = lin(0xFFF4DC), lin(0xE6DCBC)

    def col(i, j):
        x, z, y, t, weave, seam, patch, hem = field(i, j)
        c = base
        c = mix(c, faded, 0.35 * (1 - t))                                 # sun-bleached top
        c = mix(c, dirt, 0.6 * max(0.0, (t - 0.72) / 0.28) ** 1.5)       # dust and splash at the foot
        stain = 0.5 + 0.5 * math.sin(x * 2.6 + ph[3]) * math.sin(z * 2.2 + ph[4])
        c = mix(c, dirt, 0.25 * stain ** 3)
        if x > seam_x:                                                    # the second sack is a different batch
            c = scale(c, 0.93)
        k = 1.0 + 0.04 * weave + (0.1 if j in slub_rows else 0) - (0.08 if i in slub_cols else 0)
        k -= 0.3 * seam + 0.15 * hem
        if patch:
            c = mix(c, patchc, 0.8)
            if patch > 1:
                k -= 0.12                                                 # stitched hem of the patch
        return scale(c, k)

    kit.add('jute', surface('jute_skin', nu, nv, pos, col, up=(0, -1, 0)))
    # bamboo pole on two posts (main plaster set, colour only)
    kit.add('trim', wb('jute_pole', cx - 1.15, cx + 1.15, -0.05, 0.05, top + 0.0, top + 0.07, 0.02), 0xA89068)
    for x in (cx - 1.1, cx + 1.1):
        kit.add('trim', wb('jute_post', x - 0.045, x + 0.045, -0.05, 0.05, 0.0, top + 0.12, 0.015), 0x8E7856)
    for tx in ties:                                                       # coir ties over the pole
        kit.add('trim', wb('jute_tie', cx + tx - 0.02, cx + tx + 0.02, -0.06, 0.06, top - 0.05, top + 0.09, 0.008), 0x7A6448)


# ---------------------------------------------------------------- mud-and-dung: kachcha wall panel with lipai
def mud_panel(kit, cx, seed):
    rnd = random.Random(seed)
    W, Hh, T = 2.0, 2.0, 0.3
    nu, nv = 70, 70                     # ~2.9 cm grid
    ph = [rnd.uniform(0, 6.28) for _ in range(8)]
    arcs = []
    for gx in range(8):
        for gz in range(8):
            arcs.append((-1.0 + gx * 0.29 + rnd.uniform(-0.08, 0.08), 0.1 + gz * 0.28 + rnd.uniform(-0.08, 0.08),
                         rnd.uniform(0.18, 0.3), rnd.uniform(0, 6.28)))
    cracks = [(rnd.uniform(-0.8, 0.8), rnd.uniform(0.9, 1.6), rnd.uniform(-0.25, 0.25)) for _ in range(4)]
    fresh = (rnd.uniform(-0.6, 0.2), rnd.uniform(0.6, 1.2))
    M = {}

    def field(i, j):
        if (i, j) in M:
            return M[(i, j)]
        x = -W / 2 + W * i / nu
        z = Hh * j / nv
        bulge = 0.012 * math.sin(x * 2.1 + ph[0]) * math.sin(z * 1.7 + ph[1]) + 0.006 * math.sin(x * 5.3 + z * 4.1 + ph[2])
        sweep = 0.0
        for ax, az, R, a0 in arcs:
            dx, dz = x - ax, z - az
            r = math.hypot(dx, dz)
            if abs(r - R) < 0.06:
                ang = (math.atan2(dz, dx) - a0) % 6.283
                if ang < 2.4:                                              # a hand sweep is a ~140 deg arc, not a circle
                    sweep = max(sweep, (1 - abs(r - R) / 0.06) * math.sin(ang / 2.4 * math.pi))
        crack = 0.0
        for kx, kz0, lean in cracks:
            if kz0 < z < Hh:
                along = x - (kx + lean * (z - kz0) + 0.03 * math.sin(z * 23))
                crack = max(crack, max(0.0, 1 - abs(along) / 0.02) * min(1.0, (z - kz0) / 0.2))
        plinth = 1.0 if z < 0.32 else max(0.0, 1 - (z - 0.32) / 0.04)
        fr = math.hypot((x - fresh[0]) / 0.35, (z - fresh[1]) / 0.28)
        frp = max(0.0, 1 - fr) ** 0.5
        roundtop = max(0.0, (z - (Hh - 0.12)) / 0.12)
        M[(i, j)] = (x, z, bulge, sweep, crack, plinth, frp, roundtop)
        return M[(i, j)]

    def pos(i, j):
        x, z, bulge, sweep, crack, plinth, frp, roundtop = field(i, j)
        out = bulge + 0.005 * sweep - 0.006 * crack + 0.03 * plinth + 0.003 * frp
        y = -T / 2 - out + 0.06 * roundtop ** 2                            # the top edge rolls back over the wall head
        zz = z - 0.02 * roundtop ** 2
        if i in (0, nu) or j == 0:
            y = -T / 2 - 0.0
        return (cx + x, y, zz)

    dry, damp = lin(0xE2D6BC), lin(0xA08C70)
    plinthc, freshc = lin(0xC0AC8C), lin(0xC4C0A0)

    def col(i, j):
        x, z, bulge, sweep, crack, plinth, frp, roundtop = field(i, j)
        c = dry
        c = mix(c, freshc, frp * 0.85)
        c = mix(c, plinthc, plinth)
        c = mix(c, damp, max(0.0, 1 - z / 0.45) ** 2 * 0.8)               # rising damp and splash at the foot
        streak = max(0.0, math.sin(x * 31 + ph[5])) ** 8 * max(0.0, (z - 1.2) / 0.8)
        c = mix(c, damp, 0.25 * streak)                                   # rain runs from the wall head
        k = 1.0 + 8.0 * bulge + 0.08 * sweep - 0.45 * crack
        if rnd.random() < 0.025:                                          # chopped-straw flecks in the dung
            k += 0.18
        return scale(c, k)

    kit.add('earth', surface('mud_skin', nu, nv, pos, col, up=(0, -1, 0)))
    kit.add('earth', wb('mud_core', cx - W / 2, cx + W / 2, -T / 2 + 0.004, T / 2, 0.0, Hh - 0.02, 0.05), 0xB8A888)


# ---------------------------------------------------------------- packed earth: aangan / bus-adda ground, pale and swept
def earth_panel(kit, cx, seed):
    rnd = random.Random(seed)
    W, top = 2.0, 0.08
    nu = nv = 64                        # ~3.1 cm grid
    ph = [rnd.uniform(0, 6.28) for _ in range(8)]
    prints = []
    for k in range(5):                  # chappal prints: a walking line across the panel
        px, py = -0.75 + k * 0.38 + rnd.uniform(-0.04, 0.04), (0.12 if k % 2 else -0.12) + rnd.uniform(-0.03, 0.03)
        prints.append((px, py, rnd.uniform(-0.2, 0.2)))
    pebbles = [(rnd.uniform(-0.95, 0.95), rnd.uniform(-0.95, 0.95), rnd.uniform(0.012, 0.025)) for _ in range(40)]
    E = {}

    def field(i, j):
        if (i, j) in E:
            return E[(i, j)]
        x = -W / 2 + W * i / nu
        y = -W / 2 + W * j / nv
        swell = 0.008 * math.sin(x * 2.1 + ph[0]) * math.cos(y * 1.7 + ph[1]) + 0.004 * math.sin(x * 5.3 + y * 4.1 + ph[2])
        a = math.sin(x * 3.1 + 1.3 * math.sin(y * 1.9 + ph[3]) + ph[4])
        b = math.sin(y * 3.7 + 1.1 * math.sin(x * 2.3 + ph[5]))
        crack = max(0.0, 1.0 - min(abs(a), abs(b)) * 18.0) * (0.5 + 0.5 * math.sin(x * 1.3 + y * 0.7 + ph[6]))
        pr = 0.0
        for px, py, ang in prints:
            ca, sa = math.cos(ang), math.sin(ang)
            lx, ly = (x - px) * ca + (y - py) * sa, -(x - px) * sa + (y - py) * ca
            e = (lx / 0.13) ** 2 + (ly / 0.05) ** 2
            if e < 1:
                pr = max(pr, 1 - e)
        tyre_y = -0.55 + 0.25 * math.sin(x * 1.2 + 0.5)                   # one cycle tyre groove
        tyre = max(0.0, 1 - abs(y - tyre_y) / 0.025)
        peb = 0.0
        for qx, qy, r in pebbles:
            dd = math.hypot(x - qx, y - qy)
            if dd < r * 1.6:
                peb = max(peb, 1 - dd / (r * 1.6))
        broom = math.sin(math.hypot(x + 1.6, y - 1.4) * 34)               # swept arcs from one standing spot
        E[(i, j)] = (x, y, swell, crack, pr, tyre, peb, broom)
        return E[(i, j)]

    def pos(i, j):
        x, y, swell, crack, pr, tyre, peb, broom = field(i, j)
        z = top + swell - 0.008 * crack - 0.006 * pr - 0.007 * tyre + 0.012 * peb + 0.0015 * broom
        if i in (0, nu) or j in (0, nv):   # the outer row turns down into a rounded earth edge (no separate lid to show through)
            z = 0.012
        return (cx + x, y, z)

    base, dust = lin(0xF6EEDC), lin(0xFFFBF0)
    dark, peblc = lin(0xBFAE90), lin(0xE8E2D6)

    def col(i, j):
        x, y, swell, crack, pr, tyre, peb, broom = field(i, j)
        c = base
        patch = 0.5 + 0.5 * math.sin(x * 1.1 + ph[1]) * math.sin(y * 0.9 + ph[2])
        c = mix(c, dust, 0.5 * patch + 25 * max(0.0, swell))              # pale dust on the crowns
        c = mix(c, dark, 0.55 * crack + 0.45 * pr + 0.4 * tyre)
        c = mix(c, peblc, peb)
        return scale(c, 1.0 + 0.04 * broom)

    kit.add('earth', surface('earth_skin', nu, nv, pos, col, up=(0, 0, 1)))
    e = W / nu
    kit.add('earth', wb('earth_slab', cx - W / 2 + e, cx + W / 2 - e, -W / 2 + e, W / 2 - e, 0.0, top - 0.045, 0.0), 0xC8B898)


def build():
    kit = Kit(split_props=True, own=('thatch', 'jute'), tex_override={'jute': ('burlap', 0.6), 'props': ('dryearth', 1.0)})
    thatch_panel(kit, -4.5, 3)
    jute_panel(kit, -1.5, 5)
    mud_panel(kit, 1.5, 7)
    earth_panel(kit, 4.5, 9)
    tints = {'hb_trim': '#B0A080', 'hb_thatch': '#FFFFFF', 'hb_jute': '#FFFFFF', 'hb_earth': '#FFFFFF'}
    kit.finalize(OUT, tints, drift_amp=0.05, ao_strength=0.5)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            print('group', o.name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))


def render():
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.001))
    g = bpy.context.active_object
    gm = bpy.data.materials.new('ground'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.22, 0.17, 1)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    g.data.materials.append(gm)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82)
    sun.rotation_euler = (math.radians(58), math.radians(0), math.radians(-35))   # raking afternoon light across the faces
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    os.makedirs(SHOTS, exist_ok=True)
    for name, loc, look, lens in [('a_all_four', (0.0, -9.5, 3.2), (0.0, 0.0, 0.9), 32),
                                  ('b_thatch_jute', (-3.0, -3.6, 2.0), (-3.0, 0.0, 1.2), 30),
                                  ('c_mud_earth', (3.0, -3.4, 1.8), (3.0, 0.0, 0.6), 30)]:
        cam.location = loc
        cam.data.lens = lens
        dvec = Vector(look) - Vector(loc)
        cam.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(SHOTS, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


build()
if '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--') + 1:]:
    render()
