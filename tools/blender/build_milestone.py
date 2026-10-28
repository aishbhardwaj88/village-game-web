"""
Roadside milestones (J0 27 Oct playthrough note; PARALLEL.md wave 2 item 10): whitewashed cement body, yellow rounded top, faded and
weathered, moss at the foot, NO lettering (the signposts carry names and distances). Three variants:
  milestone_v2   : kilometre stone, upright, moderate wear. The slot src/milestones.js already loads.
  milestone_v2_b : kilometre stone, LEANING ~11 deg sideways and 2.5 deg back, sunk 5 cm on its low side, heavier fading, a big chip
                   knocked out of the dome shoulder and a corner chip low down, more moss.
  milestone_v2_c : the small 200 m stone (the real roadside rhythm: four small stones between kilometre stones), older: paint mostly
                   gone to grey cement, washed-out yellow, lichen, a chipped crown.
Run: for v in a b c: Blender -b --python tools/blender/build_milestone.py -- $v   (-> tmp/milestone_v2[_b|_c]_raw.glb)
     then node tools/shrink.js <raw> public/assets/models/<slot>.glb 999999 && node tools/strip-textures.mjs <glb> <glb>
     Blender -b --python tools/blender/build_milestone.py -- render   (preview shots into docs/shots/assets-milestones/)
Local frame: origin at the foot centre on the ground, front face = +z (glTF +z).
Each file is ONE mesh on ONE material (hb_main, the frozen lime-plaster set, repeat 0.5): src/milestones.js takes the first mesh only.

What is MODELLED: the stone is a bevelled slab with a true semicircular crown, hand-dressed (its faces wobble 2 mm, arrises are not
dead straight); chips are real holes (vertices pushed into the body) with fresh grey cement in them; a cement collar half-buried in
an earth mound that hugs the foot; moss cushions, pebbles and dry grass blades at the foot.
What is PAINTED (per-vertex colour): ragged hand-brushed paint line, sun-faded yellow, limewash flaking to grey cement, worn arrises,
rain streaks running down from the crown, mud splash and rising damp at the foot, moss green creeping up the shaded back, lichen.
Per-loop colours are injected through a tiny wrapper on arch.colorize (this file only; arch.py is not edited).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import ROOT, hex_to_linear_rgb, wb, prism_z, new_bmesh_obj
import arch
from arch import Kit

# ---------------------------------------------------------------- per-loop colour injection (same trick as build_pots.py / build_tap.py)
COLS = {}
_orig_colorize = arch.colorize


def _colorize(obj, hex_color, attr='Col'):
    _orig_colorize(obj, hex_color, attr)
    cols = COLS.get(obj.name)
    if cols and attr == 'Base':
        obj.data.color_attributes[attr].data.foreach_set('color', cols)
    return obj


arch.colorize = _colorize


def lin(h):
    return Vector(hex_to_linear_rgb(h))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return a * (1 - t) + b * t


def sstep(e0, e1, x):
    if e0 == e1:
        return 0.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def fbm(x, y, s=0.0):
    return (0.5 * math.sin(x * 7.1 + 1.3 + s) * math.cos(y * 6.3 - s) + 0.3 * math.sin(x * 13.7 - y * 11.1 + 2 + s * 2)
            + 0.2 * math.sin(x * 29.0 + y * 23.0 + s * 3))


# palette (sRGB hex; never pure black or white, nothing at full saturation)
LIME, LIME_SUN = 0xe2ddcf, 0xe8e4d6
YELLOW, YELLOW_FADED = 0xd6a93e, 0xd4bf84
CEMENT, CEMENT_D = 0x9d988c, 0x878277
MUD, DAMP, STREAK = 0x7e6c55, 0x8a8778, 0x6e6a5e
MOSS, MOSS_D, MOSS_Y = 0x5f6c34, 0x3f4c26, 0x8a8a44
LICHEN, LICHEN_O = 0xb4b49a, 0xc0904a
EARTH, EARTH_D = 0x8d7b60, 0x6e604c
GRASS, GRASS_D = 0xa89a5e, 0x7d7a44


def bake(obj):
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    return obj


def paint(obj, fn, seed):
    """Per-loop colours from fn(wx, wz, h, normal, rnd) -> linear Vector, in the object's CURRENT frame."""
    bake(obj)
    me = obj.data
    me.update()
    rnd = random.Random(seed)
    cols = []
    for poly in me.polygons:
        n = poly.normal
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            c = fn(co.x, -co.y, co.z, n, rnd)
            cols += [max(0.015, min(0.8, c[0])), max(0.015, min(0.8, c[1])), max(0.015, min(0.8, c[2])), 1.0]
    COLS[obj.name] = cols
    return obj


def slice_bm(bm, steps):
    """Cut on axis-aligned planes (Blender axes) every ~step metres so wear and chips have vertices to live on."""
    for axis, step in enumerate(steps):
        if not step:
            continue
        lo = min(v.co[axis] for v in bm.verts)
        hi = max(v.co[axis] for v in bm.verts)
        n = int((hi - lo) / step)
        no = Vector((0, 0, 0))
        no[axis] = 1.0
        for i in range(1, n + 1):
            co = Vector((0, 0, 0))
            co[axis] = lo + i * (hi - lo) / (n + 1)
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)


# ---------------------------------------------------------------- the variants
SPECS = {
    # W, D, shoulder (where the crown springs), crown height ratio, bottom of the stone (buried), lean (deg sideways, deg back), sink
    'a': dict(W=0.55, D=0.20, sh=0.62, k=0.95, h0=-0.10, lean=(0.0, 0.0), sink=0.0, fade=0.35, flake=0.25, moss=0.5, lichen=0.1,
              streak=0.35, seed=11,
              chips=[(0.275, 0.10, 0.30, 0.045, 0.018), (-0.20, -0.10, 0.80, 0.04, 0.012)]),
    'b': dict(W=0.55, D=0.20, sh=0.60, k=0.95, h0=-0.10, lean=(11.0, -2.5), sink=0.05, fade=0.65, flake=0.45, moss=0.9, lichen=0.3,
              streak=0.55, seed=23,
              chips=[(0.22, 0.10, 0.80, 0.085, 0.035), (-0.275, 0.10, 0.12, 0.06, 0.022), (0.275, -0.10, 0.45, 0.035, 0.012)]),
    'c': dict(W=0.30, D=0.13, sh=0.34, k=0.9, h0=-0.08, lean=(-3.0, 1.5), sink=0.01, fade=0.85, flake=0.7, moss=0.7, lichen=0.55,
              streak=0.45, seed=37,
              chips=[(0.0, 0.065, 0.48, 0.05, 0.02), (-0.15, 0.065, 0.10, 0.035, 0.012)]),
}
SLOT = {'a': 'milestone_v2', 'b': 'milestone_v2_b', 'c': 'milestone_v2_c'}


def stone_body(s):
    """The slab with its semicircular crown, bevelled, sliced, hand-dressed and chipped. Returns the object (local, upright)."""
    W, D, sh, k, h0 = s['W'], s['D'], s['sh'], s['k'], s['h0']
    R = W / 2
    nseg = 18
    prof = [(R, h0), (R, sh)] + [(R * math.cos(math.pi * i / nseg), sh + R * k * math.sin(math.pi * i / nseg)) for i in range(1, nseg)] + [(-R, sh), (-R, h0)]
    obj = prism_z('ms_body', -D / 2, D / 2, prof)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40)]
    bmesh.ops.bevel(bm, geom=sharp, offset=0.012 if W > 0.4 else 0.009, segments=2, affect='EDGES', clamp_overlap=True, profile=0.5)
    st = 0.042 if W > 0.4 else 0.032
    slice_bm(bm, (st, st, st))
    bm.normal_update()
    rnd = random.Random(s['seed'])
    sd = s['seed'] * 0.37
    for v in bm.verts:
        x, z, h = v.co.x, -v.co.y, v.co.z
        if h < 0.0:
            continue   # below ground: leave it
        # hand-dressed: faces wobble a couple of mm, the crown is not a perfect arc
        d = 0.0022 * fbm(x * 4.1 + z * 3.0, h * 3.7, sd) + 0.0012 * (rnd.random() - 0.5)
        v.co += v.normal * d
    for cx, cz, ch, r, depth in s['chips']:
        c = Vector((cx, -cz, ch))
        for v in bm.verts:
            dist = (v.co - c).length
            if dist < r:
                axis = Vector((0.0, 0.0, min(v.co.z, sh)))
                inward = (axis - v.co)
                if inward.length < 1e-6:
                    continue
                inward.normalize()
                f = (1.0 - dist / r)
                v.co += inward * depth * (f ** 0.7) * (0.75 + 0.5 * rnd.random())
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def stone_paint(s):
    W, D, sh, k = s['W'], s['D'], s['sh'], s['k']
    R = W / 2
    top = sh + R * k
    sd = s['seed'] * 0.53
    yel = mix(lin(YELLOW), lin(YELLOW_FADED), s['fade'])
    lime = mix(lin(LIME), lin(LIME_SUN), 0.4)
    line = sh - (0.035 if W > 0.4 else 0.022)   # the paint line: the yellow is brushed a little below the crown's spring

    def fn(x, z, h, n, rnd):
        # 1. which paint: a ragged, hand-brushed edge, a few drips of yellow below it
        edge = line + 0.006 * fbm(x * 9 + z * 5, 0.0, sd) + 0.004 * math.sin(x * 47 + z * 31)
        drip = 0.035 * max(0.0, math.sin(x * 23 + sd) - 0.92) * 12
        t_y = sstep(edge - 0.004 - drip, edge + 0.004, h)
        c = mix(lime, yel, t_y)
        # whitewash over-painted onto yellow in one place (last coat was sloppy)
        c = mix(c, lime, 0.5 * t_y * sstep(0.02, 0.0, abs(h - edge - 0.012)) * max(0.0, fbm(x * 6, z * 6, sd + 1)))
        # per-unit tint drift and paint mottling
        c = c * (1.0 + 0.04 * math.sin(x * 2.3 + h * 1.7 + sd) + 0.02 * (rnd.random() - 0.5))
        # 2. sun fading on up-facing crown: yellow bleaches towards cream
        if n.z > 0.3:
            c = mix(c, lin(LIME_SUN), 0.35 * s['fade'] * n.z * t_y)
        # 3. paint flaking off to grey cement: patchy, worse low down and on the crown
        fl = 0.6 * fbm(x * 9.3 + z * 4.1, h * 8.7, sd + 2) + 0.6 * fbm(x * 23, h * 19 + z * 7, sd + 5)
        thr = 0.78 - 0.5 * s['flake'] - 0.18 * sstep(0.35, 0.0, h) - 0.1 * t_y
        bare = sstep(thr, thr + 0.03, fl)
        cem = lin(CEMENT) * (0.92 + 0.1 * fbm(x * 20, h * 20, sd))
        c = mix(c, cem, 0.85 * bare)
        # a faint ghost of the old painted panel on the face, where letters used to be (no lettering, just the older coat showing)
        if abs(n.y) > 0.8 and abs(x) < W * 0.36 and line - 0.32 * (W / 0.55) < h < line - 0.06:
            c = mix(c, c * 0.93, 0.5 * s['fade'])
        # 4. worn arrises: wherever the face turns (bevel normals sit between axes) the paint is knocked off
        diag = 1.0 - max(abs(n.x), abs(n.y), abs(n.z))
        c = mix(c, lin(CEMENT_D), sstep(0.12, 0.3, diag) * (0.3 + 0.4 * s['flake']) * sstep(0.0, 0.5, fbm(x * 17, h * 17, sd + 3) + 0.3))
        # 5. chips: fresh, lighter grey cement inside, a dark rim of grime round the old ones
        for cx, cz, ch, r, depth in s['chips']:
            dd = math.sqrt((x - cx) ** 2 + (z - cz) ** 2 + (h - ch) ** 2)
            c = mix(c, lin(0xa9a498) * (0.9 + 0.15 * rnd.random()), sstep(r * 0.9, r * 0.55, dd))
            c = mix(c, c * 0.8, 0.5 * max(0.0, 1.0 - abs(dd - r * 0.95) / (r * 0.18)))
        # 6. rain streaks: dark grey runs from the crown down the faces, narrow and uneven
        if abs(n.z) < 0.5 and h < top:
            for i in range(7):
                sx = -R * 0.85 + i * (R * 1.7 / 6) + 0.03 * math.sin(i * 3.1 + sd)
                w = 0.008 + 0.006 * (0.5 + 0.5 * math.sin(i * 5.3 + sd))
                run = sstep(w, 0.0, abs(x - sx + 0.006 * math.sin(h * 30 + i)))
                strength = s['streak'] * (0.35 + 0.35 * math.sin(i * 2.7 + sd) ** 2) * sstep(0.05, 0.4, h) * sstep(top + 0.02, sh - 0.1, h)
                c = mix(c, lin(STREAK), run * strength)
            # a general grey wash under the crown's lip where water runs off
            c = mix(c, c * 0.88, s['streak'] * 0.4 * sstep(sh - 0.25, sh - 0.02, h) * (1.0 - t_y))
        # 7. foot: rising damp with a ragged tide mark, mud splash, moss on the shaded back
        dmp_h = 0.08 + 0.05 * s['flake'] + 0.03 * fbm(x * 3.3, z * 4, sd + 4)
        dmp = 1.0 - sstep(dmp_h - 0.04, dmp_h + 0.01, h)
        c = mix(c, c * lin(DAMP) * 1.1, 0.75 * dmp)
        c = mix(c, c * 0.78, 0.4 * max(0.0, 1.0 - abs(h - dmp_h) / 0.014))
        splash = (0.16 + 0.04 * fbm(x * 8, z * 8, sd)) * (1.0 if z > 0 else 0.8)
        c = mix(c, lin(MUD), 0.55 * sstep(splash, 0.0, h) * (0.55 + 0.45 * fbm(x * 21, h * 23 + z * 9, sd + 6)))
        back = sstep(0.0, -D / 2, z) + 0.4 * sstep(0.0, -R, x)
        mreach = (0.06 + 0.12 * s['moss']) * (0.6 + 0.4 * fbm(x * 7, z * 7, sd + 7))
        mz = sstep(mreach, 0.0, h) * min(1.0, back)
        c = mix(c, mix(lin(MOSS), lin(MOSS_D), 0.5 + 0.5 * fbm(x * 30, h * 30, sd)), 0.85 * mz)
        # green algae film in the streaks on the back, where the sun never dries it
        if z < -D * 0.3 and abs(n.z) < 0.5:
            c = mix(c, lin(MOSS) * 1.1, 0.25 * s['moss'] * sstep(0.2, 0.7, fbm(x * 9, h * 3, sd + 8) + 0.5) * sstep(top, 0.1, h))
        # 8. lichen: pale grey-green rosettes and a few orange spots on the crown and the back
        if s['lichen'] > 0:
            ls = fbm(x * 26 + z * 13, h * 24, sd + 9)
            on = sstep(0.62 - 0.3 * s['lichen'], 0.72 - 0.3 * s['lichen'], ls) * (0.4 + 0.6 * max(0.0, n.z) + 0.4 * (z < 0))
            c = mix(c, lin(LICHEN), 0.7 * on)
            c = mix(c, lin(LICHEN_O), 0.6 * s['lichen'] * sstep(0.85, 0.95, fbm(x * 41, h * 37 + z * 29, sd + 10)) * (h > sh - 0.1))
        # 9. dust settles on every up-facing surface
        if n.z > 0.5:
            c = mix(c, lin(0xb9a98a), 0.18 * n.z * (0.6 + 0.4 * fbm(x * 11, z * 11, sd + 11)))
        return c
    return fn


def collar(s):
    """The cement foot the stone is set in: a slab a few cm proud, its arrises broken, half under the earth."""
    W, D = s['W'], s['D']
    m = 0.05 if W > 0.4 else 0.035
    o = wb('ms_collar', -W / 2 - m, W / 2 + m, -D / 2 - m, D / 2 + m, -0.08, 0.075 if W > 0.4 else 0.05, 0.012)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    slice_bm(bm, (0.05, 0.05, 0.0))
    rnd = random.Random(s['seed'] + 1)
    for v in bm.verts:
        if v.co.z > 0.04:
            v.co.z -= 0.006 * max(0.0, fbm(v.co.x * 5, v.co.y * 5, s['seed']))   # broken, uneven top
    bm.to_mesh(o.data)
    bm.free()
    sd = s['seed'] * 0.71

    def fn(x, z, h, n, rnd):
        c = lin(CEMENT) * (0.95 + 0.1 * fbm(x * 9, z * 9, sd) + 0.05 * (rnd.random() - 0.5))
        c = mix(c, lin(MUD), 0.55 * (0.5 + 0.5 * fbm(x * 15, z * 15, sd + 1)))
        c = mix(c, lin(MOSS_D), 0.6 * s['moss'] * sstep(0.0, -D / 2 - m, z) * (0.5 + 0.5 * fbm(x * 12, z * 12, sd + 2)))
        return c
    return paint(o, fn, s['seed'] + 1)


def mound(s, lean_dx):
    """Earth heaped round the foot (an elliptical cap), higher on the side the stone leans away from, its rim sinking into the ground."""
    W, D = s['W'], s['D']
    rx, rz = W / 2 + 0.28, D / 2 + 0.26
    nseg, rings = 22, 4
    bm = bmesh.new()
    sd = s['seed'] * 0.91
    centre = bm.verts.new((0.0, 0.0, 0.05))
    grid = []
    for ri in range(1, rings + 1):
        t = ri / rings
        row = []
        for i in range(nseg):
            a = 2 * math.pi * i / nseg
            wob = 1.0 + 0.16 * fbm(math.cos(a) * 1.3, math.sin(a) * 1.3, sd) + 0.05 * math.sin(a * 5 + sd)
            x, z = rx * t * wob * math.cos(a), rz * t * wob * math.sin(a)
            hgt = 0.05 * (1 - t ** 1.4) - 0.02 * t ** 3 + 0.005 * fbm(x * 9, z * 9, sd)
            hgt += 0.03 * (1 - t) * max(0.0, -math.cos(a) * math.copysign(1, lean_dx)) * min(1.0, abs(lean_dx) * 8)
            row.append(bm.verts.new((x, -z, hgt)))
        grid.append(row)
    for i in range(nseg):
        j = (i + 1) % nseg
        bm.faces.new((centre, grid[0][i], grid[0][j]))
        for ri in range(rings - 1):
            bm.faces.new((grid[ri][i], grid[ri + 1][i], grid[ri + 1][j], grid[ri][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    o = new_bmesh_obj('ms_mound', bm)

    def fn(x, z, h, n, rnd):
        c = lin(EARTH) * (0.9 + 0.14 * fbm(x * 11, z * 11, sd) + 0.08 * (rnd.random() - 0.5))
        rr = math.hypot(x / (W / 2 + 0.1), z / (D / 2 + 0.1))
        c = mix(c, lin(EARTH_D), 0.45 * sstep(1.5, 0.9, rr))    # damp, darker earth right against the stone
        back = sstep(0.0, -D / 2 - 0.15, z)
        c = mix(c, mix(lin(MOSS), lin(MOSS_D), 0.5 + 0.5 * fbm(x * 25, z * 25, sd)), 0.7 * s['moss'] * back * sstep(1.9, 1.0, rr))
        return c
    return paint(o, fn, s['seed'] + 2)


def moss_cushions(kit, s, n):
    """Moss cushions where the stone meets the earth, on the shaded back and one side: lumpy flattened domes."""
    W, D = s['W'], s['D']
    rnd = random.Random(s['seed'] + 3)
    for i in range(n):
        side = rnd.random()
        if side < 0.6:
            x, z = (rnd.random() - 0.5) * W * 0.95, -D / 2 - 0.015 - 0.02 * rnd.random()
        else:
            sg = -1 if side < 0.85 else 1
            x, z = sg * (W / 2 + 0.015 + 0.015 * rnd.random()), (rnd.random() - 0.7) * D
        r = 0.035 + 0.04 * rnd.random() * (W / 0.55)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
        for v in bm.verts:
            v.co.z = max(v.co.z, -0.2)
            bump = 1.0 + 0.22 * fbm(v.co.x * 2.1 + i, v.co.y * 2.3, v.co.z + s['seed'])
            v.co = Vector((v.co.x * r * 1.3 * bump, v.co.y * r * 0.8 * bump, v.co.z * r * 0.55 * bump))
        bmesh.ops.translate(bm, vec=(x, -z, 0.035 + r * 0.05), verts=bm.verts)
        o = new_bmesh_obj('ms_moss%d' % i, bm)
        for p in o.data.polygons:
            p.use_smooth = True
        sd = s['seed'] + i * 1.7
        kit.add('paint', paint(o, lambda X, Z, H, nn, rr, sd=sd: mix(mix(lin(MOSS), lin(MOSS_D), 0.5 + 0.5 * fbm(X * 60, Z * 60, sd)),
                                                                      lin(MOSS_Y), 0.35 * max(0.0, nn.z) * (0.5 + 0.5 * fbm(X * 90, Z * 90, sd + 1)))
                               * (0.88 + 0.2 * rr.random()), s['seed'] + 10 + i))


def pebbles(kit, s, n):
    W, D = s['W'], s['D']
    rnd = random.Random(s['seed'] + 4)
    for i in range(n):
        a = rnd.random() * math.tau
        rr = 0.75 + 0.5 * rnd.random()
        x, z = math.cos(a) * (W / 2 + 0.12) * rr, math.sin(a) * (D / 2 + 0.14) * rr
        r = 0.012 + 0.02 * rnd.random()
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
        sx, sy, sz = r * (1 + 0.4 * rnd.random()), r * (0.7 + 0.4 * rnd.random()), r * (0.45 + 0.25 * rnd.random())
        for v in bm.verts:
            v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rnd.random() * math.tau, 3, 'Z'))
        bmesh.ops.translate(bm, vec=(x, -z, 0.02), verts=bm.verts)
        o = new_bmesh_obj('ms_peb%d' % i, bm)
        tone = rnd.choice([0x9a9184, 0x8c8073, 0xa69c8a, 0x7f7668])
        kit.add('paint', paint(o, lambda X, Z, H, nn, r_, t=tone: lin(t) * (0.85 + 0.2 * r_.random()) * (1.08 if nn.z > 0.5 else 0.92), s['seed'] + 30 + i))


def grass(kit, s, tufts, blades):
    """Dry grass tufts at the foot: each blade a thin three-sided spike that bends outward (no alpha, one material)."""
    W, D = s['W'], s['D']
    rnd = random.Random(s['seed'] + 5)
    bm = bmesh.new()
    for t in range(tufts):
        a = rnd.random() * math.tau
        tx, tz = math.cos(a) * (W / 2 + 0.06 + 0.1 * rnd.random()), math.sin(a) * (D / 2 + 0.06 + 0.1 * rnd.random())
        if abs(tx) < W / 2 and abs(tz) < D / 2 + 0.03:
            tz = math.copysign(D / 2 + 0.05, tz)
        for b in range(blades):
            ba = rnd.random() * math.tau
            L = 0.07 + 0.13 * rnd.random()
            lean = 0.25 + 0.45 * rnd.random()
            bx, bz = tx + 0.015 * math.cos(ba), tz + 0.015 * math.sin(ba)
            tip = Vector((bx + math.cos(ba) * L * lean, -(bz + math.sin(ba) * L * lean), 0.03 + L))
            w = 0.0035 + 0.002 * rnd.random()
            base = [bm.verts.new((bx + w * math.cos(ba + k * 2.1), -(bz + w * math.sin(ba + k * 2.1)), 0.025)) for k in range(3)]
            tv = bm.verts.new(tip)
            for k in range(3):
                bm.faces.new((base[k], base[(k + 1) % 3], tv))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_bmesh_obj('ms_grass', bm)
    kit.add('paint', paint(o, lambda X, Z, H, nn, r_: mix(lin(GRASS_D), lin(GRASS), sstep(0.03, 0.16, H)) * (0.8 + 0.3 * r_.random()), s['seed'] + 6))


def build(kit, var, xf=Matrix.Identity(4)):
    """Add one milestone variant to the kit. xf is applied after the stone's own lean (used by the preview only)."""
    s = SPECS[var]
    lx, lz = math.radians(s['lean'][0]), math.radians(s['lean'][1])
    lean_m = Matrix.Translation((0, 0, -s['sink'])) @ Matrix.Rotation(-lx, 4, 'Y') @ Matrix.Rotation(lz, 4, 'X')
    body = paint(stone_body(s), stone_paint(s), s['seed'])
    col = collar(s)
    for o in (body, col):
        o.data.transform(lean_m)
    parts = [body, col, mound(s, math.sin(lx))]
    for o in parts:
        o.data.transform(xf)
        kit.add('paint', o)
    n0 = len(kit.records)
    moss_cushions(kit, s, {'a': 4, 'b': 6, 'c': 4}[var])
    pebbles(kit, s, {'a': 4, 'b': 3, 'c': 5}[var])
    grass(kit, s, {'a': 3, 'b': 4, 'c': 3}[var], 7)
    for _, o, _ in kit.records[n0:]:
        o.data.transform(xf)


def new_kit():
    COLS.clear()
    return Kit(split_props=False)


def make(which):
    for var in SPECS:
        if which not in ('all', var):
            continue
        kit = new_kit()
        build(kit, var)
        kit.finalize(os.path.join(ROOT, 'tmp', SLOT[var] + '_raw.glb'), {}, drift_amp=0.04, ao_strength=0.55)


def render():
    """Preview: the three on bare ground in daylight, plus two close-ups. Writes docs/shots/assets-milestones/."""
    kit = new_kit()
    for var, dx in (('a', -1.0), ('b', 0.15), ('c', 1.1)):
        build(kit, var, Matrix.Translation((dx, 0, 0)))
    kit.add('plaster', wb('ground', -3.5, 3.5, -2.0, 3.0, -0.1, -0.012, 0.01), 0x8d7b60)
    p = os.path.join(ROOT, 'tmp', 'milestones_preview_raw.glb')
    kit.finalize(p, {}, drift_amp=0.04, ao_strength=0.55)
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
                elif nd.type == 'MIX' and getattr(nd, 'blend_type', '') == 'MULTIPLY':
                    nd.inputs[0].default_value = 1.0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1100, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(-30))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-milestones')
    os.makedirs(d, exist_ok=True)
    # front is +wz = Blender -y: the camera stands at negative Blender y
    for name, loc, look, lens in [('a_all_three', (0.4, -3.6, 1.5), (0.05, 0.0, 0.4), 35),
                                  ('b_km_stones_close', (-0.1, -1.7, 0.95), (-0.45, 0.0, 0.45), 40),
                                  ('c_back_and_foot', (0.9, 1.6, 0.8), (0.4, 0.0, 0.25), 40)]:
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
if which == 'render':
    render()
else:
    make(which)
