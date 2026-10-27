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


def corrugate(obj, base_hex, seed=0):
    """Tin as GEOMETRY (27 Oct, her verdict 'not tin'): subdivide the upward faces of a roof slab and push real ribs out of
    them. Rib pitch and depth wander along the sheet, sheets lap with a raised step every ~0.85 m, a few dents/buckles, fixing
    washers on the crowns, and a per-corner 'Base' colour with rust blooming up from the bottom edge and around the washers."""
    import bmesh
    from mathutils import Vector
    rnd = random.Random(seed * 7919 + len(obj.data.vertices))
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    tops = [f for f in bm.faces if f.normal.z > 0.2 and f.calc_area() > 0.4]
    if not tops:
        bm.free()
        return False
    tdir = {}
    for f in tops:
        n = f.normal
        dd = Vector((-n.x, -n.y))
        dd = dd.normalized() if dd.length > 0.05 else Vector((0.0, -1.0))
        tdir[f.index] = (Vector((-dd.y, dd.x)), dd)
    et, ed = {}, {}
    for f in tops:
        t, dd = tdir[f.index]
        for e in f.edges:
            v = (e.verts[1].co - e.verts[0].co).to_2d()
            if v.length < 1e-4:
                continue
            (et if abs(v.normalized().dot(t)) > 0.9 else ed)[e.index] = e
    bm.edges.ensure_lookup_table()
    cuts_t = max(2, int(max(e.calc_length() for e in et.values()) / 0.036)) if et else 0
    if et:
        bmesh.ops.subdivide_edges(bm, edges=list(et.values()), cuts=cuts_t, use_grid_fill=True)
    bm.edges.ensure_lookup_table()
    ed_edges = [e for e in bm.edges if e.index in ed and e.is_valid]
    if ed_edges:
        L = max(e.calc_length() for e in ed_edges)
        bmesh.ops.subdivide_edges(bm, edges=ed_edges, cuts=max(1, int(L / 0.6)), use_grid_fill=True)
    # displace + colour
    bm.faces.ensure_lookup_table()
    top_ids = set(f.index for f in tops)
    # faces were rebuilt by the subdivides; re-find upward faces from geometry
    up = [f for f in bm.faces if f.normal.z > 0.2]
    ref = None
    for f in tops:
        ref = tdir[f.index]
        break
    t, dd = ref
    ph0, ph1, ph2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    dents = [(rnd.uniform(-1, 1), rnd.uniform(0, 1), rnd.uniform(0.25, 0.6), rnd.uniform(0.02, 0.05)) for _ in range(4)]
    # sheet extents along t and d
    allv = {v for f in up for v in f.verts}
    ss = [v.co.x * t.x + v.co.y * t.y for v in allv]
    dsv = [v.co.x * dd.x + v.co.y * dd.y for v in allv]
    s0, s1, d0, d1 = min(ss), max(ss), min(dsv), max(dsv)
    sheet_w = 0.82
    shift = {}
    for v in allv:
        s = v.co.x * t.x + v.co.y * t.y
        d = v.co.x * dd.x + v.co.y * dd.y
        u = (s - s0)
        dn = (d - d0) / max(d1 - d0, 1e-3)     # 0 at the top (ridge) .. 1 at the lower edge
        warp = 0.55 * math.sin(u * 0.37 + ph0) + 0.3 * math.sin(u * 1.13 + ph1)
        pitch = 0.108 * (1.0 + 0.06 * math.sin(u * 0.21 + ph2))
        phase = (u + warp * 0.05) / pitch
        sheet = int(u // sheet_w)
        sr = random.Random(sheet * 131 + seed)
        sheet_dy = sr.uniform(0.0, 0.016)                       # each sheet sits a touch higher: the lap line
        sheet_ph = sr.uniform(-0.12, 0.12)
        amp = 0.021 * (1.0 + 0.22 * math.sin(u * 0.9 + ph1) + 0.12 * math.sin(d * 0.8 + u * 0.3))
        prof = math.sin((phase + sheet_ph) * 6.2832)
        prof = max(-1.0, min(1.0, prof * 1.35))                 # flat-ish crowns and valleys
        h = amp * (0.5 + 0.5 * prof) + sheet_dy
        lap = (u % sheet_w)
        if lap < 0.05:                                           # overlap seam: a raised flange along the sheet edge
            h += 0.012 * (1.0 - lap / 0.05)
        crown = 0.5 + 0.5 * prof
        # dents and buckles: flatten the ribs, push the sheet in
        for (du, dv, r, depth) in dents:
            cx = s0 + (du * 0.5 + 0.5) * (s1 - s0)
            cd = dv * (d1 - d0)
            q = math.exp(-(((s - cx) ** 2 + (d - d0 - cd) ** 2) / (r * r)))
            h = h * (1.0 - 0.7 * q) - depth * q
        # fixing washers: bumps on every other crown, two rows per sheet (near top and bottom of each span)
        dd_ = d - d0
        for row in (0.12, (d1 - d0) - 0.12):
            if abs(dd_ - row) < 0.03 and crown > 0.85 and (sheet * 3 + int(phase)) % 2 == 0:
                h += 0.010
        shift[v] = h
    cols = {}
    for v in allv:
        s = v.co.x * t.x + v.co.y * t.y
        d = v.co.x * dd.x + v.co.y * dd.y
        dn = (d - d0) / max(d1 - d0, 1e-3)
        fromedge = (d1 - d)                                      # metres up from the lower edge
        rust = max(0.0, 1.0 - fromedge / (0.35 + 0.45 * (0.5 + 0.5 * math.sin(s * 2.3 + ph0) * math.sin(s * 0.7 + ph1))))
        rust = rust * rust * 0.9
        rust += 0.25 * max(0.0, math.sin(s * 5.3 + ph2) * math.sin(d * 1.1 + s * 0.4)) ** 3   # blotches/streaks
        rust = min(rust, 0.95)
        cols[v] = rust
    for v, h in shift.items():
        n = Vector((0, 0, 1))
        v.co += n * h
    for f in bm.faces:
        f.smooth = True
    # per-corner colour: base tint, rusted toward a brown-orange, crowns catch a lighter sheen, valleys dull
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert
            ru = cols.get(v, 0.0)
            hh = shift.get(v, 0.0)
            sh = 0.88 + 0.28 * min(1.0, hh / 0.04)
            k = (1.0 - ru)
            lp[layer] = ((r0 * k + 0.30 * ru) * sh, (g0 * k + 0.15 * ru) * sh, (b0 * k + 0.07 * ru) * sh, 1.0)
    bm.to_mesh(obj.data)
    bm.free()
    return True


def tile_roof(obj, base_hex, seed=0):
    """Terracotta as GEOMETRY (27 Oct, her verdict 'plastic wrap'): subdivide each upward roof face and model Mangalore tiles:
    rows 0.26 m down the slope, each tile 0.24 m wide with a raised centre roll and channels at the sides, every tile rising
    toward its lower lip and dropping off to the row below (the overlap), per-tile height/lateral jitter, a few cracked (dark,
    sunk) and a few paler replacement tiles, moss/dirt in the channels and under each lip. Per-corner colour in 'Base'."""
    import bmesh
    from mathutils import Vector
    rnd = random.Random(seed * 104729 + len(obj.data.vertices))
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    tops = [f for f in bm.faces if f.normal.z > 0.2 and f.calc_area() > 0.4]
    if not tops:
        bm.free()
        return False
    def frame(n):
        dd = Vector((-n.x, -n.y))
        dd = dd.normalized() if dd.length > 0.05 else Vector((0.0, -1.0))
        return Vector((-dd.y, dd.x)), dd
    et, ed = {}, {}
    for f in tops:
        t, dd = frame(f.normal)
        for e in f.edges:
            v = (e.verts[1].co - e.verts[0].co).to_2d()
            if v.length < 1e-4:
                continue
            (et if abs(v.normalized().dot(t)) > 0.9 else ed)[e.index] = e
    ST, SD, TW, RP = 0.08, 0.0867, 0.24, 0.26
    if et:
        bmesh.ops.subdivide_edges(bm, edges=list(et.values()), cuts=max(2, int(max(e.calc_length() for e in et.values()) / ST)), use_grid_fill=True)
    bm.edges.ensure_lookup_table()
    ed_edges = [e for e in bm.edges if e.index in ed and e.is_valid]
    if ed_edges:
        bmesh.ops.subdivide_edges(bm, edges=ed_edges, cuts=max(1, int(max(e.calc_length() for e in ed_edges) / SD)), use_grid_fill=True)
    bm.faces.ensure_lookup_table()
    up = [f for f in bm.faces if f.normal.z > 0.2]
    vframe = {}
    for f in up:
        fr = frame(f.normal)
        for v in f.verts:
            vframe.setdefault(v, (round(fr[1].x, 1), round(fr[1].y, 1), fr))
    ext = {}
    for v, (kx, ky, fr) in vframe.items():
        t, dd = fr
        s = v.co.x * t.x + v.co.y * t.y
        d = v.co.x * dd.x + v.co.y * dd.y
        e = ext.setdefault((kx, ky), [s, s, d, d])
        e[0], e[1], e[2], e[3] = min(e[0], s), max(e[1], s), min(e[2], d), max(e[3], d)
    tile_fx = {}
    def tile(ci, ri):
        key = (ci, ri)
        if key not in tile_fx:
            r = random.Random(ci * 7919 + ri * 104729 + seed)
            roll = r.random()
            tile_fx[key] = (r.uniform(-0.004, 0.006), r.uniform(-0.03, 0.03), r.uniform(0.9, 1.1), 'crack' if roll < 0.04 else ('pale' if roll < 0.08 else ''), r.random())
        return tile_fx[key]
    info = {}
    for v, (kx, ky, fr) in vframe.items():
        t, dd = fr
        s0, s1, d0, d1 = ext[(kx, ky)]
        s = v.co.x * t.x + v.co.y * t.y - s0
        d = v.co.x * dd.x + v.co.y * dd.y - d0
        ri = int(d // RP + 1e-6)
        fr_d = (d - ri * RP) / RP                  # 0 at a tile's upper end .. 1 at its lower lip
        if fr_d > 0.995 and d < (d1 - d0) - 0.01:  # a vertex on the lip belongs to the tile BELOW's start only visually: keep as lip
            fr_d = 1.0
        jy, jx, hs, special, rv = tile(int((s + 0.0) // TW), ri)
        # lateral jitter per row shifts the column grid a little
        s2 = s - (tile(0, ri)[1])
        ci = int((s2 + 1e-6) // TW)
        jy, jx, hs, special, rv = tile(ci, ri)
        fx = (s2 - ci * TW) / TW                   # 0..1 across the tile
        roll = 0.5 - 0.5 * math.cos(fx * 6.2832)  # raised centre roll
        rise = 0.034 * (fr_d ** 0.9) * hs          # tile surface climbs toward its lower lip
        h = rise + 0.009 * roll + jy
        chan = (1.0 - roll) * (1.0 - 0.6 * fr_d)    # how deep in a side channel / high on the tile
        if special == 'crack':
            h -= 0.012 * (1.0 - abs(fx - 0.5) * 1.5)
        info[v] = (h, special, rv, fr_d, chan, ri)
        v.co.z += h
    for f in bm.faces:
        f.smooth = False
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert
            if v not in info:
                lp[layer] = (r0, g0, b0, 1.0)
                continue
            h, special, rv, fr_d, chan, ri = info[v]
            k = 0.86 + 0.3 * rv                                  # per-tile tint
            c = [r0 * k, g0 * k, b0 * k]
            if special == 'pale':
                c = [r0 * 1.25, g0 * 1.18, b0 * 1.05]
            elif special == 'crack':
                c = [r0 * 0.6, g0 * 0.55, b0 * 0.55]
            grime = max(0.0, chan - 0.55) * 1.2 + (0.35 * (1.0 - fr_d) if fr_d < 0.35 else 0.0) * (0.4 + rv)   # channels and under the lip above
            m = min(0.6, grime * (0.35 + 0.65 * ((rv * 7.0) % 1.0)))
            c = [c[0] * (1 - m) + 0.07 * m, c[1] * (1 - m) + 0.10 * m, c[2] * (1 - m) + 0.04 * m]   # moss-dark dirt
            lp[layer] = (c[0], c[1], c[2], 1.0)
    bm.to_mesh(obj.data)
    bm.free()
    return True


def plank_wood(obj, base_hex, seed=0):
    """Painted wood as GEOMETRY (27 Oct, her verdict 'plastic wrap'): every large flat face of a wood piece is cut into
    planks ~0.14 m wide with a real V-gap between them (so AO and light give the shadow line), per-plank height and
    colour variation, and paint worn through to bare wood near the face edges and along the gaps."""
    import bmesh
    from mathutils import Vector
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    big = [f for f in bm.faces if f.calc_area() > 0.15 and len(f.verts) == 4]
    if not big:
        bm.free()
        return False
    PW, SS = 0.14, 0.035
    sdir = {}
    for f in big:
        n = f.normal
        if abs(n.z) < 0.6:
            s_ = Vector((-n.y, n.x)).normalized()
        else:
            es = [(e.verts[1].co - e.verts[0].co).to_2d() for e in f.edges]
            lg = max(es, key=lambda v: v.length)
            s_ = Vector((-lg.y, lg.x)).normalized()    # planks run along the long edge; s is across them
        sdir[f.index] = s_
    cut = {}
    for f in big:
        s_ = sdir[f.index]
        for e in f.edges:
            v = (e.verts[1].co - e.verts[0].co).to_2d()
            if v.length > 1e-4 and abs(v.normalized().dot(s_)) > 0.9 and e.calc_length() > 0.2:
                cut[e.index] = e
    if not cut:
        bm.free()
        return False
    # vertical faces also need an in-plane s (the horizontal tangent); handled by projecting onto the 2D direction above
    groups = {}
    for e in cut.values():
        groups.setdefault(max(2, min(60, int(e.calc_length() / SS))), []).append(e)   # per-length cut counts: opposite edges of a face match
    for n_cuts, es in groups.items():
        bmesh.ops.subdivide_edges(bm, edges=[e for e in es if e.is_valid], cuts=n_cuts, use_grid_fill=True)
    bm.faces.ensure_lookup_table()
    # re-find big flat faces after the cut (area now small): classify by normal and membership in the original plane via vertex sets
    big_pos = [(f.normal.copy(), f.calc_center_median()) for f in big if f.is_valid]
    info = {}
    for f in bm.faces:
        n = f.normal
        c = f.calc_center_median()
        if abs(n.z) < 0.6:
            s_ = Vector((-n.y, n.x)).normalized()
        else:
            continue
        for v in f.verts:
            info.setdefault(v, (n.copy(), s_))
    # horizontal faces: reuse the stored plank directions via nearest original face
    for f in bm.faces:
        if abs(f.normal.z) >= 0.6:
            for bn, bc in big_pos:
                if bn.dot(f.normal) > 0.99 and abs((f.calc_center_median() - bc).dot(bn)) < 1e-3:
                    es = [(e.verts[1].co - e.verts[0].co).to_2d() for e in f.edges]
                    ex = max(es, key=lambda v: v.length)
                    # long edge of a split strip is the plank direction
                    s_ = Vector((-ex.y, ex.x)).normalized()
                    for v in f.verts:
                        info.setdefault(v, (f.normal.copy(), s_))
                    break
    ext = {}
    for v, (n, s_) in info.items():
        k = (round(n.x, 1), round(n.y, 1), round(n.z, 1))
        sv = v.co.x * s_.x + v.co.y * s_.y
        e = ext.setdefault(k, [sv, sv])
        e[0], e[1] = min(e[0], sv), max(e[1], sv)
    pl = {}
    for v, (n, s_) in info.items():
        k = (round(n.x, 1), round(n.y, 1), round(n.z, 1))
        s0, s1 = ext[k]
        sv = v.co.x * s_.x + v.co.y * s_.y - s0
        pi = int((sv / PW) + 0.5 + 1e-6)         # plank index (gaps fall at half-plank offsets: face edges are never gaps)
        fp = ((sv / PW) + 0.5) % 1.0
        fmin = min(fp, 1.0 - fp)
        r = random.Random(pi * 7919 + seed + int(abs(n.z) * 5))
        gap = max(0.0, 1.0 - fmin / 0.27) if (sv > 1e-3 and sv < (s1 - s0) - 1e-3) else 0.0
        pl[v] = (n, -0.013 * gap + r.uniform(-0.002, 0.003), r.random(), gap, pi)
    for v, (n, d, rv, gap, pi) in pl.items():
        v.co += n * d
    # nothing else moves (side faces of the slab keep their positions); colour per corner
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    # distance to the object's bounding box edge for paint wear
    xs = [v.co for v in bm.verts]
    mn = Vector((min(c.x for c in xs), min(c.y for c in xs), min(c.z for c in xs)))
    mx = Vector((max(c.x for c in xs), max(c.y for c in xs), max(c.z for c in xs)))
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert
            if v not in pl:
                lp[layer] = (r0, g0, b0, 1.0)
                continue
            n, d, rv, gap, pi = pl[v]
            k = 0.82 + 0.34 * rv                          # per-plank paint tone
            c = [r0 * k * (0.96 + 0.08 * ((rv * 13) % 1.0)), g0 * k, b0 * k * (1.04 - 0.08 * ((rv * 29) % 1.0))]
            ed = min(min(v.co.x - mn.x, mx.x - v.co.x), min(v.co.y - mn.y, mx.y - v.co.y), min(v.co.z - mn.z, mx.z - v.co.z))
            wear = max(0.0, 1.0 - ed / 0.1) * 0.65 + gap * 0.5 * (0.3 + rv)
            wear = min(0.8, wear * (0.5 + 0.5 * ((rv * 5.7) % 1.0)))
            bare = (0.34, 0.20, 0.09)                      # bare timber (linear)
            c = [c[i] * (1 - wear) + bare[i] * wear for i in range(3)]
            lp[layer] = (c[0], c[1], c[2], 1.0)
    for f in bm.faces:
        f.smooth = False
    bm.to_mesh(obj.data)
    bm.free()
    return True


def rust_steel(obj, base_hex, seed=0):
    """Rusted steel as GEOMETRY (27 Oct, her verdict 'flat texture on a flat box'): big faces are subdivided so pitting
    and raised flake edges are real relief, with downward rust streaks, darker scale low down and bare bright metal on
    the high edges that hands touch. Small pieces (bolts, chains) skip the relief and only take the colour."""
    import bmesh
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    big = [f for f in bm.faces if f.calc_area() > 0.04 and len(f.verts) == 4]
    if big and len(bm.faces) < 400:
        bmesh.ops.subdivide_edges(bm, edges=list({e for f in big for e in f.edges}), cuts=3, use_grid_fill=True)
    bm.normal_update()
    rnd = random.Random(seed * 131 + 7)
    ph = [rnd.uniform(0, 6.28) for _ in range(4)]
    zs = [v.co.z for v in bm.verts]
    z0, z1 = min(zs), max(zs)
    rel = {}
    for v in bm.verts:
        x, y, z = v.co.x, v.co.y, v.co.z
        pit = math.sin(x * 23 + ph[0]) * math.sin(y * 19 + z * 17 + ph[1]) * math.sin(z * 29 + x * 11 + ph[2])
        flake = max(0.0, math.sin(x * 7 + z * 5 + ph[3]) * math.sin(y * 6 - z * 8 + ph[0])) ** 2
        rel[v] = (pit, flake)
        if v.is_boundary or (z1 - z0) < 0.02:
            continue
        v.co += v.normal * (-0.004 * max(0.0, pit) + 0.005 * flake)
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    rust_c = (0.30, 0.095, 0.035)
    scale_c = (0.11, 0.05, 0.03)
    bare_c = (0.42, 0.43, 0.44)
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert
            pit, flake = rel[v]
            h = (v.co.z - z0) / max(z1 - z0, 0.05)
            streak = max(0.0, math.sin(v.co.x * 31 + v.co.y * 27 + ph[1])) ** 3 * (0.4 + 0.6 * h)   # runs down from high points
            rust = min(0.95, 0.25 + 0.5 * (1.0 - h) + 0.45 * streak + 0.3 * max(0.0, pit) + 0.2 * rnd.random() * 0 )
            c = [r0 * (1 - rust) + rust_c[0] * rust, g0 * (1 - rust) + rust_c[1] * rust, b0 * (1 - rust) + rust_c[2] * rust]
            sc = min(0.8, flake * 1.4 * (1.2 - h))
            c = [c[i] * (1 - sc) + scale_c[i] * sc for i in range(3)]
            hi = max(0.0, flake - 0.65) * 2.0 * (0.3 + h) * (1.0 if abs(v.normal.z) < 0.7 else 0.4)
            hi = min(0.6, hi)
            c = [c[i] * (1 - hi) + bare_c[i] * hi for i in range(3)]
            lp[layer] = (c[0], c[1], c[2], 1.0)
    for f in bm.faces:
        f.smooth = False
    bm.to_mesh(obj.data)
    bm.free()
    return True


def thatch_straw(obj, base_hex, seed=0):
    """Thatch as GEOMETRY: big faces are subdivided so straw bundles are real ridges running down the slope (wandering
    width and phase), with a ragged shaggy lower edge, darker weathered straw low down and in the valleys, fresh pale
    straw on the bundle crowns, and a few dark patched-over bundles. Small pieces only take the colour."""
    import bmesh
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    big = [f for f in bm.faces if f.calc_area() > 0.15 and len(f.verts) == 4]
    if big and len(bm.faces) < 400:
        bmesh.ops.subdivide_edges(bm, edges=list({e for f in big for e in f.edges}), cuts=5, use_grid_fill=True)
    bm.normal_update()
    rnd = random.Random(seed * 97 + 11)
    ph = [rnd.uniform(0, 6.28) for _ in range(4)]
    zs = [v.co.z for v in bm.verts]
    z0, z1 = min(zs), max(zs)
    rel = {}
    for v in bm.verts:
        x, y, z = v.co.x, v.co.y, v.co.z
        u = x * 0.9 + y * 0.9   # across the slope: bundle index
        wob = 0.25 * math.sin(z * 2.3 + ph[0])
        bundle = abs(math.sin(u * 5.5 + wob + ph[1] + 0.6 * math.sin(u * 1.7 + ph[2])))   # 0 in the valley, 1 on the crown
        shag = max(0.0, math.sin(x * 37 + y * 31 + ph[3]) * math.sin(z * 13 + ph[0]))
        rel[v] = (bundle, shag)
        if v.is_boundary or (z1 - z0) < 0.05 or abs(v.normal.z) < 0.15:
            continue
        low = 1.0 - (z - z0) / max(z1 - z0, 0.05)
        v.co += v.normal * (0.035 * bundle + 0.02 * shag * (0.4 + low))
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    pale = (0.62, 0.50, 0.24)
    dark = (0.10, 0.075, 0.04)
    patched = {i for i in range(8) if rnd.random() < 0.5}
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert
            bundle, shag = rel[v]
            h = (v.co.z - z0) / max(z1 - z0, 0.05)
            weather = min(0.85, 0.15 + 0.5 * (1.0 - h) + 0.35 * (1.0 - bundle))
            c = [r0 * (1 - weather) + dark[0] * weather, g0 * (1 - weather) + dark[1] * weather, b0 * (1 - weather) + dark[2] * weather]
            fresh = max(0.0, bundle - 0.6) * 1.4 * (0.3 + h)
            c = [c[i] * (1 - fresh) + pale[i] * fresh for i in range(3)]
            if int((v.co.x + v.co.y) * 0.9 / 0.57 + 3.1) % 8 in patched and shag > 0.3:
                c = [c[i] * 0.55 for i in range(3)]
            lp[layer] = (c[0], c[1], c[2], 1.0)
    for f in bm.faces:
        f.smooth = False
    bm.to_mesh(obj.data)
    bm.free()
    return True


def earth_ground(obj, base_hex, seed=0):
    """Packed earth / mud-and-dung as GEOMETRY: the top face is subdivided into a fine grid and displaced with low swells, a network of
    dried cracks (narrow sunk lines with dark floors), cart-rut and hoof dimples, and darker damp/dung patches; paler dust on the ridges.
    Only wide, mostly-upward slabs take it; small pieces just take the colour."""
    import bmesh
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    big = [f for f in bm.faces if f.calc_area() > 0.6 and f.normal.z > 0.9]
    if not big:
        bm.free()
        return False
    bmesh.ops.subdivide_edges(bm, edges=list({e for f in big for e in f.edges}), cuts=39, use_grid_fill=True)
    bm.normal_update()
    rnd = random.Random(seed * 53 + 7)
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    dimples = [(rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.05, 0.11)) for _ in range(14)]
    cx = sum(v.co.x for v in bm.verts) / len(bm.verts)
    cy = sum(v.co.y for v in bm.verts) / len(bm.verts)
    info = {}
    for v in bm.verts:
        x, y = v.co.x - cx, v.co.y - cy
        swell = 0.012 * math.sin(x * 2.1 + ph[0]) * math.cos(y * 1.7 + ph[1]) + 0.006 * math.sin(x * 5.3 + y * 4.1 + ph[2])
        a = math.sin(x * 3.1 + 1.3 * math.sin(y * 1.9 + ph[3]) + ph[4])
        b = math.sin(y * 3.7 + 1.1 * math.sin(x * 2.3 + ph[5]))
        crack = max(0.0, 1.0 - min(abs(a), abs(b)) * 14.0)   # thin sunk lines where a or b crosses zero
        dim = 0.0
        for dx, dy, r in dimples:
            d2 = ((x - dx) ** 2 + (y - dy) ** 2) / (r * r)
            if d2 < 1.0:
                dim = max(dim, 1.0 - d2)
        patch = 0.5 + 0.5 * math.sin(x * 1.1 + ph[1]) * math.sin(y * 0.9 + ph[2])
        info[v] = (swell, crack, dim, patch)
        if not v.is_boundary and v.normal.z > 0.5:
            v.co.z += swell - 0.016 * crack - 0.02 * dim
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    for f in bm.faces:
        for lp in f.loops:
            swell, crack, dim, patch = info[lp.vert]
            k = 0.82 + 0.3 * patch + 12.0 * swell
            k *= 1.0 - 0.55 * crack - 0.25 * dim
            lp[layer] = (min(1.0, r0 * k), min(1.0, g0 * k), min(1.0, b0 * k), 1.0)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(obj.data)
    bm.free()
    return True


def jute_weave(obj, base_hex, seed=0):
    """Jute as GEOMETRY: faces over ~0.15 m^2 are subdivided to a ~1.7 cm grid and displaced as an over-under weave (warp and weft threads
    alternate), with slubs, a frayed darker seam stripe, and per-thread tone. Small faces only take the colour."""
    import bmesh
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    big = [f for f in bm.faces if f.calc_area() > 0.15 and len(f.verts) == 4]
    if not big or len(bm.faces) > 400:
        bm.free()
        return False
    bmesh.ops.subdivide_edges(bm, edges=list({e for f in big for e in f.edges}), cuts=23, use_grid_fill=True)
    bm.normal_update()
    rnd = random.Random(seed * 31 + 5)
    ph = rnd.uniform(0, 6.28)
    info = {}
    for v in bm.verts:
        x, y, z = v.co.x, v.co.y, v.co.z
        warp = math.sin((x + y) * 190.0 + ph)
        weft = math.sin(z * 190.0)
        weave = warp * weft                                  # over-under checker
        slub = max(0.0, math.sin(x * 13 + z * 7 + ph) * math.sin(y * 11 - z * 5)) ** 3
        info[v] = (weave, slub)
        if not v.is_boundary:
            v.co += v.normal * (0.0022 * weave + 0.004 * slub)
    layer = bm.loops.layers.color.new('Base')
    r0, g0, b0 = hex_to_linear_rgb(base_hex)
    for f in bm.faces:
        for lp in f.loops:
            weave, slub = info[lp.vert]
            k = 0.88 + 0.12 * weave + 0.2 * slub
            lp[layer] = (min(1.0, r0 * k), min(1.0, g0 * k), min(1.0, b0 * k), 1.0)
    bm.to_mesh(obj.data)
    bm.free()
    return True


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
            if not ((kind == 'tin' and corrugate(obj, color, seed=len(self.records))) or (kind == 'terracotta' and tile_roof(obj, color, seed=len(self.records))) or (kind == 'wood' and plank_wood(obj, color, seed=len(self.records))) or (kind == 'metal' and rust_steel(obj, color, seed=len(self.records))) or (kind == 'thatch' and thatch_straw(obj, color, seed=len(self.records))) or (kind == 'earth' and earth_ground(obj, color, seed=len(self.records))) or (kind == 'jute' and jute_weave(obj, color, seed=len(self.records)))):
                colorize(obj, color, attr='Base')
            groups[self.route.get(kind) or kind if kind in ('brick', 'tin', 'terracotta') or kind in self.own or kind in self.route else ('props' if (kind in ('paint', 'earth') and self.split_props) else 'main')].append(obj)
        mats = {}
        for g, objs in groups.items():
            if not objs:
                continue
            tex, rep = self.tex_override.get(g) or OWN_TEXTURE_KINDS.get(g, MAIN_KINDS_TEXTURE)  # 'props' (kind paint) = same plaster set, its own material so it can skip the shadow pass
            m = load_pbr_material('hb_' + g, tex, repeat=(rep, rep))
            wire_vertex_ao(m, strength=0.5)
            m['dopahar_set'] = tex   # exported as glTF extras: staged places (tools/strip-textures.mjs) drop the embedded copies and src/stagingYard.js re-applies the shared set
            m['dopahar_repeat'] = float(rep)
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
    # monobloc silhouette: dished seat with a thick front lip, rear legs sweeping up into the back uprights, slatted back with a wide top rail, splayed tapered legs, front stretcher
    kit.add('paint', limb('seat', p(0, 0, 0.45), p(0, 0, 0.485), 0.42, 0.40, 0.014), colour)
    kit.add('paint', limb('seat_lip', p(0, 0.205, 0.43), p(0, 0.205, 0.5), 0.40, 0.03, 0.012), colour)
    kit.add('paint', limb('seat_rim_l', p(-0.215, 0, 0.47), p(-0.215, 0, 0.51), 0.03, 0.40, 0.008), colour)
    kit.add('paint', limb('seat_rim_r', p(0.215, 0, 0.47), p(0.215, 0, 0.51), 0.03, 0.40, 0.008), colour)
    for dx in (-0.19, 0.19):
        kit.add('paint', limb('upright_lo', p(dx, -0.17, 0.46), p(dx, -0.235, 0.7), 0.04, 0.03, 0.008), colour)
        kit.add('paint', limb('upright_hi', p(dx, -0.235, 0.7), p(dx, -0.29, 0.92), 0.04, 0.03, 0.008), colour)
    kit.add('paint', limb('back_top', p(0, -0.285, 0.9), p(0, -0.295, 0.95), 0.44, 0.05, 0.012), colour)
    for k in range(3):
        hh = 0.58 + k * 0.1
        kit.add('paint', limb('back_slat', p(0, -0.2 - (hh - 0.5) * 0.2, hh), p(0, -0.2 - (hh - 0.5) * 0.2, hh + 0.05), 0.36, 0.022, 0.006), colour)
    for dx in (-0.18, 0.18):
        kit.add('paint', limb('leg', p(dx * 1.12, 0.19 * 1.12, 0.0), p(dx, 0.17, 0.46), 0.032, 0.04, 0.008), colour)
        kit.add('paint', limb('leg', p(dx * 1.12, -0.19 * 1.12, 0.0), p(dx, -0.17, 0.46), 0.032, 0.04, 0.008), colour)
    kit.add('paint', limb('stretcher', p(-0.18, 0.18, 0.18), p(0.18, 0.18, 0.18), 0.022, 0.022), colour)
    kit.add('paint', limb('stretcher_b', p(-0.18, -0.18, 0.18), p(0.18, -0.18, 0.18), 0.022, 0.022), colour)
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
    """A flour/grain sack: one elliptical lathed bag - flat base, full belly, pinched neck tied with cord, flared mouth - with per-sack lean and bulge."""
    import bmesh
    from common import new_bmesh_obj
    rnd = random.Random(int(abs(x * 91 + z * 57 + h * 31) * 100))
    bw, bd = w * 0.5, d * 0.5
    ca, sa = math.cos(ang), math.sin(ang)
    lean = rnd.uniform(-0.04, 0.04) * hh
    bulge = rnd.uniform(0.94, 1.06)
    prof = [(0.0, 0.0), (0.82, 0.0), (0.97, 0.05), (1.0 * bulge, 0.3), (0.92 * bulge, 0.6), (0.7, 0.78), (0.3, 0.86), (0.2, 0.9),
            (0.3, 0.93), (0.42, 1.0), (0.36, 1.03), (0.0, 1.0)]
    seg = 16
    bm = bmesh.new()
    rings = []
    for k, (r, f) in enumerate(prof):
        hy = h + f * hh
        shift = lean * f
        rings.append([])
        for i in range(seg):
            t = i / seg * math.tau
            wob = 1.0 + 0.05 * math.sin(t * 3 + k) * (0.4 if f > 0.8 else 1.0)  # soft fabric folds
            lx, lz = r * bw * math.cos(t) * wob + shift, r * bd * math.sin(t) * wob
            rings[-1].append(bm.verts.new((x + lx * ca - lz * sa, -(z + lx * sa + lz * ca), hy)))
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = new_bmesh_obj('sack', bm)
    for poly in body.data.polygons:
        poly.use_smooth = True
    kit.add(kind, body, colour)
    # cord ring tying the neck
    cr = bw * 0.2 * 1.18
    kit.add('paint', lathe('sack_cord', x + lean * 0.88 * ca, z + lean * 0.88 * sa, [(cr, h + hh * 0.875), (cr, h + hh * 0.905)], seg=10), 0x6A5238)
