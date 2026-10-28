"""
Terracotta Mangalore tile roof as REAL GEOMETRY (PARALLEL.md Wave 1 item 1; material-library.md: terracotta FAILED as 'plastic wrap',
board v9 'reads as rust', NEEDS_YOU round 2 'too dark').

Every tile is its own little mesh: the Mangalore cross-section (raised interlock rolls at both sides, two shallow channels, a low centre
rib), the tile pitched so its lower nose sits proud of the row below (a real step + shadow line at every course), a nose face, and per-tile
jitter in slide, lift, yaw and roll. A few tiles are cracked (two pieces, the lower one slipped), a few have a chipped nose corner, a few
are paler newer replacements. Moss/dirt lives in the channels and at each tile head under the row above, plus small modelled moss cushions
lodged in the channels. Crowns are sun-faded and lichen-flecked. Colour is per corner, in the 'Base' layer Kit.finalize consumes.

TEXTURE: the glazed 'terracotta' scan is NOT used (roughness ~0.14, which is the plastic look, and it reads as rust). Tiles ride the frozen,
matte lime-plaster set (tex_override {'terracotta': ('plaster', 0.5)}, the pots precedent); the fired-clay colour is vertex colour. So
the exported material says dopahar_set = 'plaster'. If the staged shader is later given a matte clay set, only TEX below changes.

---------------------------------------------------------------------------------------------------------------------------------
REUSABLE API (to fold into arch.py later; nothing here edits arch.py):

  tile_slope(kit, x0, x1, z_ridge, z_eave, h_ridge, h_eave, seed=0, **kw)
      Axis-aligned convenience: one roof slope spanning wx x0..x1, falling from (z_ridge, h_ridge) to (z_eave, h_eave). Works for a
      slope falling to +wz or to -wz. Same frame as every Kit script: wx east, wz south, h up.

  tile_roof_geo(kit, origin, across, down, width, length, seed=0, base=TILE_BASE, detail='high', underlay=True, moss=0.5,
                cracked=0.035, chipped=0.05, pale=0.06, tile_w=0.21, tile_l=0.33, kind='terracotta')
      General slope. origin = (wx, wz, h) of the ridge-end corner at u=0; across = (wx, wz, h) unit vector along the ridge;
      down = (wx, wz, h) unit vector down the slope (includes the drop). width/length in metres along those. The surface normal is
      across x down, flipped to point up. Adds ONE pre-coloured object to kit under `kind` (tiles + moss cushions + optional underlay
      deck, fascia and barge boards), so the whole slope is one draw call with the kit's terracotta group.
        detail='high'  : 11-point profile x 4 stations + bevelled nose  (~92 tris/tile, ~1300 tris/m2)  close-up / hero roofs
        detail='low'   : 5-point profile x 2 stations + plain nose       (~16 tris/tile, ~230 tris/m2)   background / distant roofs
        moss 0..1 scales moss coverage; cracked/chipped/pale are per-tile probabilities.
      Returns the object.

  install_guard()   MUST be called once before kit.finalize: Kit.finalize otherwise runs arch.tile_roof (the older displacement
      version) or colorize() over a 'terracotta' object and overwrites the per-corner colours. The guard makes arch.tile_roof return
      True for objects tagged obj['dopahar_prebuilt'] and defers to the original for everything else. When this folds into arch.py,
      the equivalent is one line in finalize: skip the kind processors when obj.get('dopahar_prebuilt').

Run (repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_terracotta.py -- panel   -> tmp/terracotta_panel_raw.glb
  node tools/shrink.js tmp/terracotta_panel_raw.glb public/assets/models/terracotta_panel.glb 999999
  node tools/strip-textures.mjs public/assets/models/terracotta_panel.glb public/assets/models/terracotta_panel.glb
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_terracotta.py -- render  -> docs/shots/assets-terracotta/

terracotta_panel.glb frame (glTF): a 3.0 m wide x 2.0 m (along the slope) sample slope at 26 deg, centred on x = 0. Ridge end at
z = -0.90, h = 1.40; eave at z = +0.90, h = 0.52 (eave toward +z, the viewer). It carries its own deck, fascia and barge boards, and
no supports: stand it on whatever the board/yard provides.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector
import arch
from arch import Kit
from common import ROOT, hex_to_linear_rgb, wb

TILE_BASE = 0xEC9A78        # vertex colour; x the matte plaster albedo (~0.5 linear) + dust lands on weathered Mangalore orange-red ~#B07058
TEX = {'terracotta': ('plaster', 0.5)}

# clay families (linear multipliers on the base): ordinary, browner aged, redder, more orange
FAMILIES = [((1.00, 1.00, 1.00), 0.40), ((0.86, 0.84, 0.86), 0.25), ((1.00, 0.86, 0.84), 0.18), ((1.00, 1.07, 0.94), 0.17)]
FADE = (0.58, 0.46, 0.38)      # sun-bleached dusty clay (linear)
DUST = (0.52, 0.44, 0.36)      # settled dust over everything (linear): keeps the clay off full saturation
GRIME = (0.10, 0.08, 0.065)    # channel dirt (linear)
MOSS = (0.085, 0.11, 0.030)    # dark olive moss (linear)
MOSS_LIGHT = (0.20, 0.22, 0.07)
LICHEN = (0.48, 0.45, 0.32)    # pale grey-yellow lichen flecks
RAW = (0.80, 0.42, 0.25)       # fresh broken clay at a chip


def _lerp(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


PROFILES = {
    # x (0..1 across the tile), height above the tile's plane (m). Rolls at both edges, two channels, low centre rib.
    'high': [(0.00, -0.001), (0.06, 0.010), (0.15, 0.006), (0.27, -0.004), (0.39, 0.000), (0.50, 0.006),
             (0.61, 0.000), (0.73, -0.004), (0.85, 0.005), (0.94, 0.013), (1.00, 0.009)],
    'low': [(0.00, 0.000), (0.25, -0.003), (0.50, 0.005), (0.75, -0.003), (1.00, 0.011)],
}
STATIONS = {'high': (0.0, 0.3, 0.65, 1.0), 'low': (0.0, 1.0)}


def _noise(u, v, ph):
    return (math.sin(u * 1.7 + ph[0] + 0.8 * math.sin(v * 1.3 + ph[1])) * math.sin(v * 2.1 + ph[2] + 0.6 * math.sin(u * 2.9)) +
            0.5 * math.sin(u * 4.3 + v * 3.7 + ph[3]))


def tile_roof_geo(kit, origin, across, down, width, length, seed=0, base=TILE_BASE, detail='high', underlay=True, moss=0.5,
                  cracked=0.035, chipped=0.05, pale=0.06, tile_w=0.21, tile_l=0.33, kind='terracotta'):
    rnd = random.Random(seed * 7919 + 17)
    O = Vector(origin); A = Vector(across).normalized(); D = Vector(down).normalized()
    N = A.cross(D)
    if N.z < 0:
        N = -N
    N.normalize()

    def P(u, v, w):   # local -> Blender (wx, -wz, h)
        p = O + A * u + D * v + N * w
        return (p.x, -p.y, p.z)

    prof = PROFILES[detail]
    stations = STATIONS[detail]
    ncol = max(1, int(round(width / tile_w)))
    nrow = max(1, int(round(length / tile_l)))
    tw = width / ncol
    tl = length / nrow
    base_lin = hex_to_linear_rgb(base)
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    ph2 = [rnd.uniform(0, 6.28) for _ in range(6)]
    col_wet = [rnd.random() ** 2 for _ in range(ncol)]           # some columns carry the rain: darker channels all the way down

    bm = bmesh.new()
    clay = bm.loops.layers.color.new('Base')
    faces_smooth = []

    def put_face(vs, cols, smooth):
        try:
            f = bm.faces.new(vs)
        except ValueError:
            return
        for lp, c in zip(f.loops, cols):
            lp[clay] = (c[0], c[1], c[2], 1.0)
        f.smooth = smooth

    # per-tile records
    for r in range(nrow):
        row_shift = rnd.uniform(-0.006, 0.006)
        for c in range(ncol):
            tr = random.Random(seed * 104729 + r * 1009 + c * 31)
            roll = tr.random()
            special = 'pale' if roll < pale else ('crack' if roll < pale + cracked else ('chip' if roll < pale + cracked + chipped else ''))
            fam = tr.random(); acc = 0.0
            for mul, p_ in FAMILIES:
                acc += p_
                if fam <= acc:
                    break
            val = tr.uniform(0.86, 1.08)
            tint = tuple(base_lin[i] * mul[i] * val for i in range(3))
            if special == 'pale':
                tint = (min(1.0, base_lin[0] * 1.10), min(1.0, base_lin[1] * 1.20), min(1.0, base_lin[2] * 1.18))
            fade = tr.uniform(0.22, 0.48) * (0.4 if special == 'pale' else 1.0)
            dust = tr.uniform(0.14, 0.26) * (0.5 if special == 'pale' else 1.0)
            du = row_shift + tr.uniform(-0.004, 0.004)
            dv = tr.uniform(-0.007, 0.007)
            yaw = math.radians(tr.uniform(-1.3, 1.3))
            lift = 0.026 + tr.uniform(-0.003, 0.005)                 # nose height above the deck
            dw = tr.uniform(-0.002, 0.003)
            rollw = tr.uniform(-0.004, 0.004)                         # one side sits higher
            u0, u1 = c * tw + 0.001, (c + 1) * tw + (0.007 if c < ncol - 1 else -0.001)   # the right roll laps over the next tile's low left edge
            v_nose = (r + 1) * tl + dv + (0.035 if r == nrow - 1 else 0.0)   # the eave course overhangs the fascia
            v_head = r * tl - 0.025                                   # visible part starts just under the nose of the row above
            uc, vc = (u0 + u1) / 2, (v_head + v_nose) / 2
            ca, sa = math.cos(yaw), math.sin(yaw)
            head_w = 0.004 if r > 0 else 0.002

            def surf(x, t, extra_dw=0.0):
                """x 0..1 across, t 0..1 head->nose; returns local (u, v, w)."""
                u = u0 + (u1 - u0) * x
                v = v_head + (v_nose - v_head) * t
                # profile height, linear interpolation across the profile points
                for i in range(len(prof) - 1):
                    if prof[i][0] <= x <= prof[i + 1][0]:
                        k = (x - prof[i][0]) / (prof[i + 1][0] - prof[i][0])
                        hp = prof[i][1] * (1 - k) + prof[i + 1][1] * k
                        break
                else:
                    hp = prof[-1][1]
                w = head_w + (lift - head_w) * t + hp + dw + rollw * (x - 0.5) + 0.002 * math.sin(math.pi * t) + extra_dw
                du_, dv_ = u - uc, v - vc
                return (uc + du_ * ca - dv_ * sa + du, vc + du_ * sa + dv_ * ca, w)

            def shade(x, t, hp, u, v, piece_dark=0.0):
                ch = max(0.0, min(1.0, (0.006 - hp) / 0.010))          # 1 deep in a channel, 0 on a roll
                crown = max(0.0, min(1.0, (hp - 0.004) / 0.008))
                col = tint
                col = _lerp(col, DUST, dust)
                col = _lerp(col, FADE, fade * (0.35 + 0.65 * crown) * (0.6 + 0.6 * (1.0 - v / max(length, 0.1))))     # crowns and the upper slope bleach most
                g = 0.18 * ch + 0.30 * (1.0 - t) ** 2 + 0.25 * col_wet[c] * ch + 0.12 * (v / max(length, 0.1))
                if special == 'pale':
                    g *= 0.45
                col = _lerp(col, GRIME, min(0.55, g))
                if special != 'pale':
                    mz = _noise(u, v, ph) * 0.5 + 0.5
                    mz = mz * (0.6 + 0.6 * (v / max(length, 0.1)))     # more moss toward the damp eave
                    m = max(0.0, mz - (1.0 - 0.75 * moss)) * 3.2 * (0.35 + 0.65 * max(ch, (1.0 - t) ** 3))
                    col = _lerp(col, _lerp(MOSS, MOSS_LIGHT, (u * 7.3 + v * 3.1) % 1.0 * 0.6), min(0.85, m))
                    li = max(0.0, _noise(u * 3.1, v * 2.7, ph2) * 0.5 + 0.5 - 0.80) * 4.0 * crown
                    col = _lerp(col, LICHEN, min(0.5, li))
                if piece_dark:
                    col = tuple(x_ * (1.0 - piece_dark) for x_ in col)
                return col

            xs = [p[0] for p in prof]
            hps = [p[1] for p in prof]

            def build_piece(t_lo, t_hi, extra, face_lo, face_hi, nose_chip=None, dark=0.0):
                """t_lo/t_hi: functions x -> t. extra: (du, dv, dw) shift of this piece. face_lo/face_hi: add an end face (broken edge / nose)."""
                ts = [[t_lo(x) + (t_hi(x) - t_lo(x)) * s for s in stations] for x in xs]
                grid = []
                cols = []
                for i, x in enumerate(xs):
                    rowv, rowc = [], []
                    for j, s in enumerate(stations):
                        t = ts[i][j]
                        u, v, w = surf(x, t)
                        u += extra[0]; v += extra[1]; w += extra[2]
                        rowv.append(bm.verts.new(P(u, v, w)))
                        rowc.append(shade(x, t, hps[i], u, v, dark))
                    grid.append(rowv); cols.append(rowc)
                for i in range(len(xs) - 1):
                    for j in range(len(stations) - 1):
                        put_face([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]],
                                 [cols[i][j], cols[i + 1][j], cols[i + 1][j + 1], cols[i][j + 1]], True)
                # end faces: a strip from the surface edge down to the course below
                for which, on in ((len(stations) - 1, face_hi), (0, face_lo)):
                    if not on:
                        continue
                    top, bot, ctop, cbot = [], [], [], []
                    for i, x in enumerate(xs):
                        t = ts[i][which]
                        u, v, w = surf(x, t)
                        u += extra[0]; v += extra[1]; w += extra[2]
                        is_nose = which == len(stations) - 1
                        drop = (w - (head_w + 0.6 * hps[i] - 0.004)) if (is_nose and t > 0.97) else 0.014
                        drop = max(0.012, drop)
                        if detail == 'high' and is_nose:
                            mid = bm.verts.new(P(u, v + 0.006, w - 0.006))
                            top.append((bm.verts.new(P(u, v, w)), mid))
                        else:
                            top.append((bm.verts.new(P(u, v, w)), None))
                        bot.append(bm.verts.new(P(u, v + (0.004 if is_nose else -0.002), w - drop)))
                        chipped_here = nose_chip is not None and t < 0.97 and is_nose
                        base_c = shade(x, t, hps[i], u, v, dark)
                        if chipped_here or not is_nose:
                            ec = _lerp(RAW, GRIME, 0.35 if not is_nose else 0.15)
                        else:
                            ec = tuple(k * 0.82 for k in base_c)
                        ctop.append(ec); cbot.append(_lerp(ec, GRIME, 0.45))
                    for i in range(len(xs) - 1):
                        (a0, m0), (a1, m1) = top[i], top[i + 1]
                        b0, b1 = bot[i], bot[i + 1]
                        if which == 0:   # head-side broken edge faces up-slope: reverse winding
                            put_face([a0, b0, b1, a1], [ctop[i], cbot[i], cbot[i + 1], ctop[i + 1]], False)
                        elif m0 is not None:
                            put_face([a1, m1, m0, a0], [ctop[i + 1], ctop[i + 1], ctop[i], ctop[i]], False)
                            put_face([m1, b1, b0, m0], [ctop[i + 1], cbot[i + 1], cbot[i], ctop[i]], False)
                        else:
                            put_face([a1, b1, b0, a0], [ctop[i + 1], cbot[i + 1], cbot[i], ctop[i]], False)

            if special == 'crack':
                ts0 = tr.uniform(0.40, 0.70)
                slope_k = tr.uniform(-0.25, 0.25)
                split = lambda x: ts0 + slope_k * (x - 0.5)
                build_piece(lambda x: 0.0, lambda x: split(x) - 0.012, (0, 0, 0), False, True, dark=0.05)
                build_piece(lambda x: split(x) + 0.012, lambda x: 1.0, (tr.uniform(-0.003, 0.003), 0.006, -0.004), False, True, dark=0.10)
            elif special == 'chip':
                side = tr.random() < 0.5
                cw = tr.uniform(0.18, 0.32); cd = tr.uniform(0.06, 0.13)
                def nose_t(x, side=side, cw=cw, cd=cd):
                    xx = x if side else 1.0 - x
                    return 1.0 - cd * max(0.0, 1.0 - xx / cw)
                build_piece(lambda x: 0.0, nose_t, (0, 0, 0), False, True, nose_chip=True)
            else:
                build_piece(lambda x: 0.0, lambda x: 1.0, (0, 0, 0), False, True)

            # moss cushion lodged in a channel at the tile head, under the nose above
            if special != 'pale' and r > 0 and tr.random() < 0.10 * (0.5 + moss) * (0.6 + 0.8 * r / max(1, nrow - 1)):
                xx = 0.27 if tr.random() < 0.5 else 0.73
                tt = tr.uniform(0.05, 0.22)
                u, v, w = surf(xx, tt)
                rad = tr.uniform(0.035, 0.06); hh = tr.uniform(0.008, 0.016)
                seg = 7
                ring0, ring1 = [], []
                for k in range(seg):
                    a = k / seg * math.tau
                    jr = tr.uniform(0.75, 1.2)
                    ring0.append(bm.verts.new(P(u + math.cos(a) * rad * jr * 0.7, v + math.sin(a) * rad * jr * 1.6, w - 0.004)))   # elongated down the channel
                    ring1.append(bm.verts.new(P(u + math.cos(a) * rad * 0.4 * jr, v + math.sin(a) * rad * 0.9 * jr, w + hh * tr.uniform(0.6, 1.0))))
                top = bm.verts.new(P(u + tr.uniform(-0.008, 0.008), v, w + hh * 1.15))
                mc = _lerp(MOSS, MOSS_LIGHT, tr.random() * 0.7)
                mc2 = _lerp(MOSS_LIGHT, (0.26, 0.27, 0.07), tr.random() * 0.6)
                for k in range(seg):
                    k2 = (k + 1) % seg
                    put_face([ring0[k], ring0[k2], ring1[k2], ring1[k]], [mc, mc, mc2, mc2], True)
                    put_face([ring1[k], ring1[k2], top], [mc2, mc2, mc2], True)

    if underlay:
        # timber deck under the tiles, a fascia board along the eave and barge boards at both ends (weathered grey-brown timber)
        timber = hex_to_linear_rgb(0x9C8A76)
        tdark = hex_to_linear_rgb(0x6E6052)
        def box(u0, u1, v0, v1, w0, w1, cb, ct):
            vs = [bm.verts.new(P(u, v, w)) for (u, v, w) in
                  ((u0, v0, w0), (u1, v0, w0), (u1, v1, w0), (u0, v1, w0), (u0, v0, w1), (u1, v0, w1), (u1, v1, w1), (u0, v1, w1))]
            for idx, cc in (((0, 3, 2, 1), cb), ((4, 5, 6, 7), ct), ((0, 1, 5, 4), ct), ((1, 2, 6, 5), cb), ((2, 3, 7, 6), cb), ((3, 0, 4, 7), cb)):
                put_face([vs[i] for i in idx], [cc] * 4, False)
        box(0, width, -0.02, length, -0.03, 0.0, tdark, timber)
        box(-0.01, width + 0.01, length - 0.02, length + 0.012, -0.19, -0.03, tdark, timber)
        box(-0.03, 0.0, -0.02, length + 0.012, -0.13, 0.045, tdark, timber)
        box(width, width + 0.03, -0.02, length + 0.012, -0.13, 0.045, tdark, timber)

    bm.normal_update()
    me = bpy.data.meshes.new('terracotta_tiles')
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new('terracotta_tiles', me)
    bpy.context.collection.objects.link(obj)
    obj['dopahar_prebuilt'] = 1
    me.color_attributes.active_color = me.color_attributes['Base']
    kit.add(kind, obj, base)
    return obj


def tile_slope(kit, x0, x1, z_ridge, z_eave, h_ridge, h_eave, seed=0, **kw):
    run = z_eave - z_ridge
    drop = h_eave - h_ridge
    L = math.hypot(run, drop)
    if run > 0:
        origin, across = (x0, z_ridge, h_ridge), (1, 0, 0)
    else:   # falls toward -wz: start at x1 so across x down still points up
        origin, across = (x1, z_ridge, h_ridge), (-1, 0, 0)
    return tile_roof_geo(kit, origin, across, (0, run / L, drop / L), x1 - x0, L, seed=seed, **kw)


def install_guard():
    if getattr(arch.tile_roof, '_dopahar_guard', False):
        return
    orig = arch.tile_roof
    def guarded(obj, base_hex, seed=0):
        if obj.get('dopahar_prebuilt'):
            return True
        return orig(obj, base_hex, seed)
    guarded._dopahar_guard = True
    arch.tile_roof = guarded


# ------------------------------------------------------------------------------------------------- sample panel + preview
PANEL = dict(x0=-1.5, x1=1.5, z_ridge=-0.90, z_eave=0.90, h_ridge=1.40, h_eave=0.52)   # 26 deg, 2.0 m along the slope


def make_panel(detail='high'):
    install_guard()
    kit = Kit(split_props=False, tex_override=TEX)
    tile_slope(kit, seed=3, detail=detail, moss=0.55, **PANEL)
    out = os.path.join(ROOT, 'tmp', 'terracotta_panel%s_raw.glb' % ('' if detail == 'high' else '_low'))
    kit.finalize(out, {}, drift_amp=0.04, ao_strength=0.55)
    return kit


def render():
    install_guard()
    kit = Kit(split_props=False, tex_override=TEX)
    tile_slope(kit, seed=3, detail='high', moss=0.55, **PANEL)
    # second panel at low detail behind, for the LOD comparison
    tile_slope(kit, seed=8, detail='low', moss=0.55, x0=1.9, x1=4.9, z_ridge=-0.90, z_eave=0.90, h_ridge=1.40, h_eave=0.52)
    # a lime-plaster wall stub under the ridge end and a packed ground, render only
    kit.add('plaster', wb('wall', -1.6, 5.0, -1.12, -0.90, 0.0, 1.40, 0.01), 0xE4DDCB)
    kit.add('plaster', wb('ground', -4.0, 8.0, -3.0, 6.0, -0.05, 0.0, 0.0), 0xB8A88C)
    kit.finalize(os.path.join(ROOT, 'tmp', 'terracotta_preview_raw.glb'), {}, drift_amp=0.04, ao_strength=0.55)
    for m in bpy.data.materials:   # the game multiplies vertex colour in full; match it
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.5; sun.data.color = (1.0, 0.94, 0.84); sun.data.angle = math.radians(1.5)
    sun.rotation_euler = (math.radians(48), math.radians(12), math.radians(-30))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-terracotta')
    os.makedirs(d, exist_ok=True)
    # Blender coords: (wx, -wz, h)
    for name, loc, look, lens in [('a_mid_6m', (1.2, -5.2, 3.2), (1.6, 0.0, 0.9), 35),
                                  ('b_close_eave', (-0.4, -1.75, 1.15), (-0.9, -0.55, 0.65), 40),
                                  ('c_grazing', (-2.6, -1.6, 1.25), (0.2, 0.1, 0.95), 35)]:
        cam.location = loc
        cam.data.lens = lens
        dvec = Vector(look) - Vector(loc)
        cam.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'panel'
if which == 'render':
    render()
elif which == 'low':
    make_panel('low')
else:
    make_panel('high')
