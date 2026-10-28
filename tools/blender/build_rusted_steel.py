"""
Rusted steel as GEOMETRY (Wave 1 item 3, docs/PARALLEL.md). Replaces the 'flat brown' look of arch.rust_steel.

REUSABLE API (import from this file; arch.py is not touched):

    from build_rusted_steel import steel_box, rusted_steel, finalize_steel

    steel_box(name, x0, x1, z0, z1, h0, h1, cell=0.018) -> obj
        A box in the arch.wb() frame (wx, wz, h; Blender y = -wz) whose six faces are real grids of ~`cell` metres, so
        rusted_steel() has vertices to push. Use it for sheets, tubes, flat bars. Small parts (cyl/limb) need no grid:
        they take the colour and material split only.

    rusted_steel(obj, seed=0, paint_hex=0x5E7F6A, corrosion=0.0, relief=1.0, zrange=None,
                 handled=(), sources=(), crevice=0.0) -> obj
        seed       per-instance variation (pattern, tones, chip layout). Never reuse a seed on adjacent pieces.
        paint_hex  the old paint (sRGB hex) that survives in islands; sun-faded and chalked toward the top.
        corrosion  -0.4 (mostly painted) .. +0.5 (mostly rust and thick scale). Bottom always rusts first.
        relief     multiplier on all displacement (1.0 = paint 0.4 mm, curled chip edges ~2.5 mm, scale plates ~4 mm).
        zrange     (z_bottom, z_top) in Blender metres for the whole assembly, so every part agrees on 'low down'.
        handled    [((x, y, z), radius), ...] Blender coords: worn to bare bright steel by hands, grime ring around it.
        sources    [(x0, x1, z, length, width), ...] Blender coords: rust streak sources (rail undersides, bolt heads);
                   streaks run DOWN from them. Natural streaks also run down from any rusty patch above.
        crevice    extra corrosion within 6 cm of the object's own border (sheet edges trapped in a frame).
        Writes a 'Base' CORNER colour layer and sets material_index per face: 0 = rust scan set, 1 = metal set
        (surviving paint and handled bare steel need a neutral base under them; the rust scan multiplies everything brown).

    finalize_steel(objs, out_glb, ao_strength=0.55)
        Joins, gives both slots the shared CC0 sets (rust = ambientCG Rust007, metal) with dopahar_set extras so
        src/stagingYard.js can re-apply them, box-UVs in metres at arch.py's metal repeat 1.0, bakes dirty-vertex AO
        into COLOR_0 (Base x AO) and exports. One mesh, two primitives = two draw calls.

Run: Blender -b --python tools/blender/build_rusted_steel.py -- [all|render]
     then node tools/shrink.js tmp/rusted_steel_panel_raw.glb public/assets/models/rusted_steel_panel.glb 999999
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, Matrix, noise
from common import (ROOT, clear_scene, cyl, limb, new_bmesh_obj, load_pbr_material, wire_vertex_ao, box_uv,
                    bake_dirty_vertex_colors, join_objects, export_glb, hex_to_linear_rgb)

RUST_SET, METAL_SET = ('rust', 1.0), ('metal', 1.0)          # arch.py table: metal repeat 1.0
TEX_AVG = {0: (0.24, 0.069, 0.019), 1: (0.29, 0.30, 0.32)}   # linear mean albedo of rust_color / metal_color.webp


# ----------------------------------------------------------------------------- geometry
def steel_box(name, x0, x1, z0, z1, h0, h1, cell=0.018):
    """Axis box in the wb() frame with every face a grid of ~cell metres (shared seam verts are welded)."""
    if x1 < x0: x0, x1 = x1, x0
    if z1 < z0: z0, z1 = z1, z0
    X0, X1, Y0, Y1, Z0, Z1 = x0, x1, -z1, -z0, h0, h1
    nx = max(1, round((X1 - X0) / cell)); ny = max(1, round((Y1 - Y0) / cell)); nz = max(1, round((Z1 - Z0) / cell))
    bm = bmesh.new()

    def face(origin, du, dv, nu, nv):
        grid = [[bm.verts.new(origin + du * (i / nu) + dv * (j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
        for i in range(nu):
            for j in range(nv):
                bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    o = Vector((X0, Y0, Z0))
    ex, ey, ez = Vector((X1 - X0, 0, 0)), Vector((0, Y1 - Y0, 0)), Vector((0, 0, Z1 - Z0))
    face(o, ex, ez, nx, nz)                         # -Y (front, +wz)
    face(o + ey, ez, ex, nz, nx)                    # +Y
    face(o, ez, ey, nz, ny)                         # -X
    face(o + ex, ey, ez, ny, nz)                    # +X
    face(o, ey, ex, ny, nx)                         # -Z
    face(o + ez, ex, ey, nx, ny)                    # +Z
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


# ----------------------------------------------------------------------------- the material
def _smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _hash(p):
    return (math.sin(p.x * 127.1 + p.y * 311.7 + p.z * 74.7) * 43758.5453) % 1.0


def _mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def rusted_steel(obj, seed=0, paint_hex=0x5E7F6A, corrosion=0.0, relief=1.0, zrange=None, handled=(), sources=(), crevice=0.0):
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    rnd = random.Random(seed * 7919 + 13)
    off = Vector((rnd.uniform(-50, 50), rnd.uniform(-50, 50), rnd.uniform(-50, 50)))
    zs = [v.co.z for v in bm.verts]
    zb, zt = zrange or (min(zs), max(zs))
    xs = [v.co.x for v in bm.verts]
    bx0, bx1, bz0, bz1 = min(xs), max(xs), min(zs), max(zs)
    paint = hex_to_linear_rgb(paint_hex)
    chalk = (0.33, 0.34, 0.33)
    CHIP, PIT = 1 / 0.055, 1 / 0.013

    def corr_at(q):
        n = 0.55 * noise.noise(q * 1.7 + off) + 0.32 * noise.noise(q * 4.3 + off * 1.3) + 0.16 * noise.noise(q * 10.1 + off * 0.7)
        h = min(1.0, max(0.0, (q.z - zb) / max(zt - zb, 0.05)))
        c = 0.38 + corrosion + 0.75 * n + 0.55 * (1 - h) ** 2.2 - 0.12 * h
        if crevice:
            d = min(q.x - bx0, bx1 - q.x, q.z - bz0, bz1 - q.z)
            c += crevice * (1 - _smooth(0.0, 0.06, d))
        for (x0, x1, sz, L, w) in sources:   # rust gathers round every bolt and ledge
            dx = max(0.0, x0 - q.x, q.x - x1)
            c += 0.22 * math.exp(-(dx * dx + (q.z - sz) ** 2) / 0.0016)
        return c

    def cls_of(c, hsh):
        if c < 0.5:
            return 'paint'
        if c > 0.88:
            return 'pop' if hsh < 0.16 else 'scale'
        return 'rust'

    def hand_w(q):
        w = 0.0
        for (c, r) in handled:
            d = (q - Vector(c)).length
            w = max(w, 1 - _smooth(r * 0.55, r, d))
        return w

    def sample(q, n):
        """Everything the colour and relief need at one point. g = signed distance (m) to the edge of the
        neutral-metal region (surviving paint or hand-worn bare steel), negative inside it."""
        warp = noise.noise_vector(q * 7.0 + off) * 0.012
        d, pts = noise.voronoi((q + warp) * CHIP)
        c0, c1 = corr_at(pts[0] / CHIP), corr_at(pts[1] / CHIP)
        h0 = _hash(pts[0])
        k0, k1 = cls_of(c0, h0), cls_of(c1, _hash(pts[1]))
        e = d[1] - d[0]                              # 0 on a chip/plate border
        p0, p1 = k0 == 'paint', k1 == 'paint'
        gp = ((-e if p0 else e) * 0.5 / CHIP) if p0 != p1 else (-0.05 if p0 else 0.05)
        gb = min([(q - Vector(c)).length - 0.775 * r for (c, r) in handled] or [1.0])
        w = hand_w(q)
        if gb < 0:
            k0 = 'bare'
        pd, pp = noise.voronoi(q * PIT + off)
        pit = (1 - pd[0] / 0.38) if (pd[0] < 0.38 and _hash(pp[0]) > 0.5) else 0.0
        return dict(k=k0, k1=k1, e=e, h0=h0, c=corr_at(q), w=w, pit=pit, g=min(gp, gb))


    def streak(q, n):
        if abs(n.z) > 0.5:
            return 0.0
        col = noise.noise(Vector((q.x * 34 + off.x, q.y * 34 + off.y, q.z * 0.9 + off.z)))
        col = max(0.0, col) ** 1.3 * 1.8
        above = max(corr_at(q + Vector((0, 0, 0.1))), corr_at(q + Vector((0, 0, 0.25))))
        s = col * _smooth(0.55, 1.0, above)
        for (x0, x1, sz, L, w) in sources:
            if q.z >= sz or sz - q.z > L:
                continue
            dz = (sz - q.z) / L
            ww = w * (1 + 0.8 * dz)
            dx = max(0.0, x0 - q.x, q.x - x1)
            if dx < ww:
                line = 1.0 if (x1 - x0) < 0.02 else max(0.0, col * 1.4)
                s += (1 - dx / ww) * (1 - dz) ** 0.8 * line * (0.7 + 0.3 * noise.noise(q * 50 + off))
        return min(1.0, s)

    # ---- snap the grid onto the paint/rust contour, so chip outlines are clean polygons, not grid staircases
    bmesh.ops.triangulate(bm, faces=bm.faces[:])      # on triangles any two snapped corners share an edge, so the contour is an edge path
    G = {v: sample(v.co.copy(), v.normal)['g'] for v in bm.verts}
    moves = {}
    for ed in bm.edges:
        a, b = ed.verts
        ga, gb_ = G[a], G[b]
        if (ga < 0) != (gb_ < 0) and ed.calc_length() < 0.04:   # dense grids only: never fold a coarse bolt or rod
            t = ga / (ga - gb_)
            moves.setdefault(a if abs(ga) <= abs(gb_) else b, []).append(a.co.lerp(b.co, t))
    for v, ps in moves.items():
        v.co = sum(ps, Vector()) / len(ps)
    bm.normal_update()
    fmat = {}
    for f in bm.faces:
        fmat[f] = 1 if sample(f.calc_center_median(), f.normal)['g'] < 0 else 0

    # ---- relief
    S = {}
    for v in bm.verts:
        s = sample(v.co.copy(), v.normal.copy())
        S[v] = s
        k, e = s['k'], s['e']
        if v in moves:
            k = 'paint' if any(fmat[f] for f in v.link_faces) and s['k'] != 'bare' and s['w'] < 0.3 else k
        if k == 'paint':
            dsp = 0.0004
            if s['k1'] != 'paint' and e < 0.7:          # chip edge curling away from the rust under it
                dsp += 0.0032 * (1 - e / 0.7) ** 2
            if s['c'] > 0.38:                             # blisters where rust is lifting the paint from below
                dsp += 0.0014 * max(0.0, noise.noise(v.co * 70 + off)) * _smooth(0.38, 0.5, s['c'])
        elif k == 'scale':
            dsp = 0.0022 + 0.0026 * s['h0']               # laminar scale plates, each its own thickness
            if e < 0.3:
                dsp += 0.0018 * (1 - e / 0.3)             # plate edges lift
            if e < 0.06:
                dsp = 0.0002                              # crack between plates
        elif k == 'pop':
            dsp = -0.0010                                 # a plate has fallen off: fresh rust in a shallow crater
        elif k == 'rust':
            dsp = 0.0005 * noise.noise(v.co * 60 + off)
        else:
            dsp = 0.0
        if k != 'paint':
            dsp -= 0.0016 * s['pit'] * (0.5 + min(1.0, s['c']))
        dsp *= (1 - s['w'])
        v.co += v.normal * dsp * relief

    # ---- per-face material, per-corner colour
    bm.normal_update()
    layer = bm.loops.layers.color.new('Base')
    for f in bm.faces:
        mi = fmat[f]
        f.material_index = mi
        avg = TEX_AVG[mi]
        for lp in f.loops:
            v = lp.vert
            s = S[v]
            q = v.co
            h = min(1.0, max(0.0, (q.z - zb) / max(zt - zb, 0.05)))
            st = streak(q, f.normal)
            tone = 0.5 + 0.5 * noise.noise(q * 3.3 + off * 0.5)
            if mi == 1 and s['g'] < 0.004 and s['k'] != 'bare' and s['w'] < 0.5:
                fade = min(0.75, 0.22 + 0.38 * h + 0.25 * tone)                       # sun-faded and chalky toward the top
                t = _mix(paint, chalk, fade)
                kk = 0.88 + 0.22 * s['h0']                                             # per-chip tone (repaint touch-ups)
                t = tuple(c * kk for c in t)
                if s['k1'] != 'paint' and s['e'] < 0.6:                                # rust bleeding out under the chip edge
                    t = _mix(t, (0.16, 0.055, 0.02), 0.5 * (1 - s['e'] / 0.6))
                t = _mix(t, (0.17, 0.06, 0.022), 0.75 * st)                            # rust run-off over the paint
                t = _mix(t, (0.13, 0.10, 0.075), 0.6 * (1 - _smooth(0.0, 0.14, h)))    # splash dirt at the foot
            elif mi == 1:
                t = _mix((0.38, 0.38, 0.39), (0.20, 0.08, 0.03), 0.6 * s['pit'])         # polished steel, rust left in the pits
                t = _mix(t, (0.07, 0.055, 0.045), 0.7 * _smooth(0.85, 0.5, s['w']))     # grease ring round the rubbed patch
            else:
                # multipliers on the rust scan: orange fresh rust .. dark brown-black scale, never one brown
                k = s['k'] if s['k'] in ('scale', 'pop') else 'rust'
                hue = _mix((0.62, 0.50, 0.44), (1.0, 0.92, 0.78), tone)
                if k == 'scale':
                    hue = tuple(c * (0.38 + 0.22 * s['h0']) for c in (1.0, 0.9, 0.86))
                    if s['e'] < 0.3:
                        hue = _mix(hue, (0.8, 0.66, 0.5), 0.6 * (1 - s['e'] / 0.3))    # lifted plate edges show paler oxide
                elif k == 'pop':
                    hue = (1.0, 0.97, 0.85)
                hue = tuple(c * (1 - 0.6 * s['pit']) for c in hue)
                hue = _mix(hue, (0.42, 0.33, 0.30), 0.55 * st)
                hue = _mix(hue, (0.5, 0.42, 0.36), 0.5 * (1 - _smooth(0.0, 0.14, h)))
                if s['w'] > 0.0:
                    hue = tuple(c * (1 - 0.55 * s['w']) for c in hue)
                lp[layer] = (min(1.0, hue[0]), min(1.0, hue[1]), min(1.0, hue[2]), 1.0)
                continue
            lp[layer] = (min(1.0, t[0] / avg[0]), min(1.0, t[1] / avg[1]), min(1.0, t[2] / avg[2]), 1.0)
    for f in bm.faces:
        f.smooth = True
    obj.data.materials.clear()
    for m in _mats().values():          # slots must exist or Blender drops material_index on write
        obj.data.materials.append(m)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


_MATS = {}


def _mats():
    if not _MATS:
        for i, (nm, (tex, rep)) in enumerate((('hb_metal', RUST_SET), ('hb_metal_bare', METAL_SET))):
            m = load_pbr_material(nm, tex, repeat=(rep, rep))
            wire_vertex_ao(m, strength=0.5)
            m['dopahar_set'] = tex
            m['dopahar_repeat'] = float(rep)
            _MATS[i] = m
    return _MATS


def finalize_steel(objs, out, ao_strength=0.55):
    mats = _mats()
    for o in objs:                      # rusted_steel() already set both slots (clearing them would zero material_index)
        if len(o.data.materials) != 2:
            o.data.materials.clear()
            o.data.materials.append(mats[0])
            o.data.materials.append(mats[1])
    obj = join_objects(objs, 'hb_steel')
    box_uv(obj, (1, 1, 1))
    me = obj.data
    me.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
    me.color_attributes.active_color = me.color_attributes['AO']
    bake_dirty_vertex_colors(obj)
    ao_l, base_l = me.color_attributes['AO'], me.color_attributes['Base']
    n = len(me.loops)
    ao, base = [0.0] * (n * 4), [0.0] * (n * 4)
    ao_l.data.foreach_get('color', ao)
    base_l.data.foreach_get('color', base)
    for li in range(n):
        for k in range(3):
            a = 1.0 - (1.0 - ao[li * 4 + k]) * ao_strength
            ao[li * 4 + k] = min(1.0, a * base[li * 4 + k])
    ao_l.data.foreach_set('color', ao)
    me.color_attributes.active_color = ao_l
    me.color_attributes.remove(base_l)
    export_glb([obj], out)
    print('tri count', sum(len(p.vertices) - 2 for p in me.polygons))
    return obj


# ----------------------------------------------------------------------------- the sample: a 2 x 1 m sheet gate
def gate(seed, paint_hex, corrosion, style='rail', dx=0.0):
    """2.0 x 1.0 m: 40 mm square-tube frame, 1.5 mm sheet infill recessed in it, flat-bar stiffeners with bolt heads,
    two strap hinges on the left, a tower bolt and D-pull on the right (worn bright by hands). Origin bottom centre."""
    W, H, T, cell = 2.0, 1.0, 0.04, 0.02
    zr = (0.0, H)
    parts = []
    L = lambda *a, **k: parts.append((a, k))
    # sheet (front face at wz = +0.003); frame tubes wz -0.02..0.02
    sheet = steel_box('sheet', -W / 2 + T, W / 2 - T, -0.003, 0.003, T, H - T, cell)
    bolts, srcs = [], []
    bars = []
    if style == 'rail':
        bars.append(steel_box('rail', -W / 2 + T, W / 2 - T, 0.003, 0.009, 0.47, 0.52, cell))
        bars.append(steel_box('stile', -0.025, 0.025, 0.003, 0.009, T, H - T, cell))
        srcs.append((-W / 2 + T, W / 2 - T, 0.47, 0.42, 0.012))
        for x in (-0.72, -0.36, 0.36, 0.72):
            bolts.append((x, 0.495))
        for z in (0.2, 0.8):
            bolts.append((0.0, z))
    else:   # two diagonal-free vertical flats and a low kick rail
        for x in (-0.33, 0.33):
            bars.append(steel_box('flat', x - 0.025, x + 0.025, 0.003, 0.009, T, H - T, cell))
            bolts += [(x, 0.25), (x, 0.75)]
        bars.append(steel_box('kick', -W / 2 + T, W / 2 - T, 0.003, 0.009, 0.16, 0.2, cell))
        srcs.append((-W / 2 + T, W / 2 - T, 0.16, 0.16, 0.012))
    for bx, bz in bolts:
        srcs.append((bx, bx, bz - 0.01, 0.35, 0.014))
    frame = [steel_box('top', -W / 2, W / 2, -0.02, 0.02, H - T, H, 0.02),
             steel_box('bot', -W / 2, W / 2, -0.02, 0.02, 0.0, T, 0.02),
             steel_box('left', -W / 2, -W / 2 + T, -0.02, 0.02, T, H - T, 0.02),
             steel_box('right', W / 2 - T, W / 2, -0.02, 0.02, T, H - T, 0.02)]
    srcs.append((-W / 2 + T, W / 2 - T, H - T, 0.5, 0.012))      # under the top tube: water sits on the sheet lip
    small = []
    for bx, bz in bolts:
        small.append(cyl('bolt', 0.0, 0.0, 0, 0.008, 0.009, 0.007, seg=6))
        small[-1].matrix_world = Matrix.Translation((bx, -0.009, bz)) @ Matrix.Rotation(math.pi / 2, 4, 'X')
    for hz in (0.18, 0.82):   # strap hinges + barrels on the left post
        small.append(steel_box('strap', -W / 2, -W / 2 + 0.17, 0.02, 0.026, hz - 0.022, hz + 0.022, 0.03))
        small.append(cyl('barrel', -W / 2 - 0.014, 0.0, hz - 0.06, hz + 0.06, 0.013, seg=8))
        small.append(cyl('pin', -W / 2 - 0.014, 0.0, hz + 0.06, hz + 0.075, 0.007, seg=6))
    lz = 0.58 if style == 'rail' else 0.5
    small.append(steel_box('bolt_plate', W / 2 - 0.2, W / 2 - 0.02, 0.02, 0.025, lz - 0.03, lz + 0.03, 0.03))
    small.append(limb('bolt_rod', (W / 2 - 0.19, 0.034, lz), (W / 2 + 0.05, 0.034, lz), 0.014))
    small.append(limb('bolt_knob', (W / 2 - 0.12, 0.034, lz), (W / 2 - 0.12, 0.085, lz + 0.01), 0.012))
    for (a, b) in (((W / 2 - 0.33, 0.009, lz - 0.08), (W / 2 - 0.33, 0.06, lz - 0.08)), ((W / 2 - 0.33, 0.06, lz - 0.08), (W / 2 - 0.33, 0.06, lz + 0.08)),
                   ((W / 2 - 0.33, 0.06, lz + 0.08), (W / 2 - 0.33, 0.009, lz + 0.08))):
        small.append(limb('pull', a, b, 0.016))
    handled = [((W / 2 - 0.12, -0.07, lz), 0.05), ((W / 2 - 0.33, -0.06, lz), 0.09), ((W / 2 - 0.3, -0.02, H), 0.13),
               ((-W / 2 - 0.014, 0.0, 0.25), 0.03), ((-W / 2 - 0.014, 0.0, 0.89), 0.03)]   # knob, pull, top tube, hinge pins
    rnd = random.Random(seed)
    objs = []
    rusted_steel(sheet, seed=seed, paint_hex=paint_hex, corrosion=corrosion, zrange=zr, handled=(), sources=srcs, crevice=0.35)
    objs.append(sheet)
    for i, o in enumerate(bars + frame + small):
        rusted_steel(o, seed=seed * 31 + i + 1, paint_hex=paint_hex, corrosion=corrosion + rnd.uniform(-0.1, 0.12), zrange=zr, handled=handled, sources=srcs)
        objs.append(o)
    if dx:
        for o in objs:
            o.data.transform(Matrix.Translation((dx, 0, 0)))
    return objs


GATES = [   # (out name, seed, faded paint, corrosion, style)
    ('rusted_steel_panel', 3, 0x5E7F6A, 0.0, 'rail'),       # old gate green, half gone
    ('rusted_steel_panel_b', 8, 0x4F6C86, 0.22, 'flats'),   # municipal blue, mostly rust, heavy scale low down
]


def build_all():
    for name, seed, paint, corr, style in GATES:
        clear_scene()
        _MATS.clear()
        finalize_steel(gate(seed, paint, corr, style), os.path.join(ROOT, 'tmp', name + '_raw.glb'))


def render():
    clear_scene()
    _MATS.clear()
    a = gate(3, 0x5E7F6A, 0.0, 'rail', dx=-1.15)
    b = gate(8, 0x4F6C86, 0.22, 'flats', dx=1.15)
    obj = finalize_steel(a + b, os.path.join(ROOT, 'tmp', 'rusted_steel_preview_raw.glb'))
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; match it in the preview
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'concrete', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 1.0, 0))
    g = bpy.context.active_object; g.data.materials.append(gm); box_uv(g, (1, 1, 1))
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 1.2, 0), rotation=(math.pi / 2, 0, 0))
    wl = bpy.context.active_object
    wm = load_pbr_material('wall', 'plaster', repeat=(0.5, 0.5)); wl.data.materials.append(wm); box_uv(wl, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-rusted_steel')
    os.makedirs(d, exist_ok=True)
    shots = [('a_pair_front', (0.0, -4.6, 1.15), (0.0, 0.0, 0.5), 35, (55, 0, -30)),
             ('b_close_latch', (-0.05, -0.75, 0.75), (-0.42, 0.0, 0.5), 50, (70, 0, -70)),       # raking light across the sheet
             ('c_raking_b', (2.9, -1.3, 0.55), (1.0, 0.0, 0.32), 42, (75, 0, 60))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
    render() if which == 'render' else build_all()
