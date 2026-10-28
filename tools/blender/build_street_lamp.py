"""
Street lamps (PARALLEL.md Wave 2 item 8, rebuilt 28 Oct). Two types, two variants each. Day props only: night glow is v2.

  lamp_rcc_v2 / lamp_rcc_v2_b  : PSC/RCC concrete pole for abadi lanes. Chamfered rectangular section tapering toward the top, a
        chipped cement muff at the foot, painted traffic bands (zebra on A, a limewash band on B), earth splash, rain and algae streaks,
        rust bleeding down from every steel clamp, a stencilled pole number, pasted bills (layered, torn), a switch box with door,
        hinges and latch. THE CABLES: a twin cable down the side face in clips that bow out between them, swinging out in a
        drip loop to the top insulator the overhead wires hang from, the feed cable wrapping onto the bracket arm and taped along it
        to the tube batten; a bare earth wire down the back into the ground. A curved GI-pipe arm with a brace, tube light batten
        (B adds a reflector hood, a spalled corner with rebar, and a dead old cable coiled on the box).
  lamp_solar_v2 / lamp_solar_v2_b : panchayat solar light. Galvanised 12-sided pole on a concrete pedestal (base plate, gussets, bolts),
        zinc mottling and rust at the weld, a battery box with rain hood, louvres, hasp and padlock and a stencilled number, a tilted
        panel with modelled cell grid, dust at the low edge and bird droppings, LED head on an arm (A: flat finned LED, B: round UFO head),
        cables tied down the pole with a service loop beside the box.

Frame: origin at the foot centre, arm and lane side = +z (glTF +z). Two meshes per model: hb_main (concrete set in game: pole, pedestal,
boxes, panel, paper) and hb_tin (iron: arms, clamps, heads, cables). src/props.js ignores the embedded materials and applies its own
concrete / tin sets at 1.2 m tiles, so colour lives in the vertex colours. Pole heights are FIXED by src/props.js: RCC 6.4 m with the
overhead-wire anchor at 6.55 (top insulator), solar 4.8 m. Lens / diffuser vertices are the only tin vertices brighter than linear 0.85
(src glows them at night).

Build:   ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_street_lamp.py
         then for each of lamp_rcc_v2 lamp_rcc_v2_b lamp_solar_v2 lamp_solar_v2_b:
           node tools/shrink.js tmp/<n>_raw.glb public/assets/models/<n>.glb 999999 && node tools/strip-textures.mjs <that glb> <that glb>
Preview: ... build_street_lamp.py -- render     (writes docs/shots/assets-streetlamps/)
src loads lamp_<type>_v2.glb only; the _b variants are ready for a one-line change there to alternate them per lamp.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import wb, limb, cyl, new_bmesh_obj, hex_to_linear_rgb
import arch
from arch import Kit, lathe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEX = {'main': ('concrete', 1 / 1.2), 'tin': ('tin', 1 / 1.2)}   # preview matches the game's sets and tile size

# ---------------------------------------------------------------------------------------------------------------------------
# Per-vertex weathering. Kit.finalize flat-colours every object through arch.colorize; objects painted here carry their own
# 'Base' layer and are passed through untouched.
_orig_colorize = arch.colorize


def _colorize(obj, hex_color, attr='Col'):
    if obj.get('painted') and attr in obj.data.color_attributes:
        obj.data.color_attributes.active_color = obj.data.color_attributes[attr]
        return obj
    return _orig_colorize(obj, hex_color, attr)


arch.colorize = _colorize


def lin(c):
    return tuple(max(0.0, min(1.0, x)) ** 2.2 for x in c)


def hx(h):
    return ((h >> 16) & 255) / 255.0, ((h >> 8) & 255) / 255.0, (h & 255) / 255.0


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def mul(a, k):
    return tuple(x * k for x in a)


def hsh(*a):
    s = math.sin(sum(v * k for v, k in zip(a, (12.9898, 78.233, 37.719, 51.37))) ) * 43758.5453
    return s - math.floor(s)


def paint(obj, fn):
    """fn(p, n, fc) -> sRGB (0..1). p = vertex (wx, wz, h), n = loop normal (wx, wz, h), fc = face centre (wx, wz, h)."""
    me = obj.data
    mw = obj.matrix_world
    if 'Base' not in me.color_attributes:
        me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    layer = me.color_attributes['Base']
    rot = mw.to_3x3()
    out = [0.0] * (len(me.loops) * 4)
    for poly in me.polygons:
        c = mw @ poly.center
        fc = (c.x, -c.y, c.z)
        nn = rot @ poly.normal
        n = (nn.x, -nn.y, nn.z)
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            col = lin(fn((v.x, -v.y, v.z), n, fc))
            out[li * 4:li * 4 + 4] = [col[0], col[1], col[2], 1.0]
    layer.data.foreach_set('color', out)
    me.color_attributes.active_color = layer
    obj['painted'] = 1
    return obj


def V(x, z, h):
    return Vector((x, -z, h))


def loft(name, rings, caps=True):
    """Closed rings (lists of Blender Vectors, same count) joined bottom to top."""
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for a, b in zip(vs, vs[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps:
        bm.faces.new(list(reversed(vs[0])))
        bm.faces.new(vs[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


def tube(name, pts, r, sides=5):
    """A round-ish tube along a polyline of (wx, wz, h): cables, pipes. Parallel-transported frames so it never twists."""
    P = [V(*p) for p in pts]
    rings = []
    u = None
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        if u is None:
            ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            u = t.cross(ref).normalized()
        else:
            u = (u - t * u.dot(t)).normalized()
        w = t.cross(u)
        rr = r(i) if callable(r) else r
        rings.append([p + (u * math.cos(k / sides * math.tau) + w * math.sin(k / sides * math.tau)) * rr for k in range(sides)])
    return loft(name, rings)


def bow(a, b, n, out, amp, wob=0.0, seed=0.0):
    """Points from a to b (exclusive of b) bowing out along vector `out` by amp at the middle: cable between two clips."""
    pts = []
    for k in range(n):
        s = k / n
        bulge = 4 * s * (1 - s)
        w = wob * math.sin(s * 3.1 + seed) * bulge
        pts.append(tuple(a[i] + (b[i] - a[i]) * s + out[i] * amp * bulge + (w if i == 0 else 0) for i in range(3)))
    return pts


def sheet(name, pts, outward):
    """One flat polygon (overlay paper, paint, streak) wound to face `outward` (Blender vector)."""
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    f = bm.faces.new(vs)
    bm.normal_update()
    if f.normal.dot(outward) < 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    return new_bmesh_obj(name, bm)


def strip(name, rows, place, outward):
    """A tapered strip down a surface: rows = [(u_centre, h, half_width)], place(u, h) -> Blender Vector."""
    bm = bmesh.new()
    vv = [(bm.verts.new(place(u - w, h)), bm.verts.new(place(u + w, h))) for u, h, w in rows]
    for (a0, a1), (b0, b1) in zip(vv, vv[1:]):
        bm.faces.new((a0, a1, b1, b0))
    bm.normal_update()
    if bm.faces[:] and sum((f.normal for f in bm.faces), Vector()).dot(outward) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return new_bmesh_obj(name, bm)


SEG = {'0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g'}


def digit_rects(text, u0, h0, w, ht, s, gap):
    """Stencil digits (seven-segment strokes with stencil breaks) as (u0, u1, h0, h1) rects, left to right from u0."""
    out = []
    for ch in text:
        hm = h0 + ht / 2
        r = {'a': (u0, u0 + w, h0 + ht - s, h0 + ht), 'd': (u0, u0 + w, h0, h0 + s), 'g': (u0, u0 + w, hm - s / 2, hm + s / 2),
             'f': (u0, u0 + s, hm + s / 2 + 0.003, h0 + ht - s - 0.003), 'b': (u0 + w - s, u0 + w, hm + s / 2 + 0.003, h0 + ht - s - 0.003),
             'e': (u0, u0 + s, h0 + s + 0.003, hm - s / 2 - 0.003), 'c': (u0 + w - s, u0 + w, h0 + s + 0.003, hm - s / 2 - 0.003)}
        out += [r[k] for k in SEG[ch]]
        u0 += w + gap
    return out


# ---------------------------------------------------------------------------------------------------------------------------
# RCC pole
RCC = {
    'a': dict(seed=3, bands='zebra', number='27', bills='weather', hood=False, chip=False, dead_coil=False, conc=(0.64, 0.64, 0.61), lean_arm=0.0),
    'b': dict(seed=11, bands='lime', number='114', bills='side', hood=True, chip=True, dead_coil=True, conc=(0.60, 0.60, 0.575), lean_arm=0.05),
}


def rcc(kit, var):
    P = RCC[var]
    rnd = random.Random(P['seed'])
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    H = 6.4
    HW = 0.07
    hd = lambda h: 0.095 - 0.04 * (h / H)          # half depth along the lane axis; width stays 0.14
    CH = 0.016
    conc = P['conc']

    def prof(h, grow=0.0):
        w, d, c = HW + grow, hd(h) + grow, CH
        return [V(w - c, d, h), V(w, d - c, h), V(w, -d + c, h), V(w - c, -d, h), V(-w + c, -d, h), V(-w, -d + c, h), V(-w, d - c, h), V(-w + c, d, h)]

    # ---- surface colour of the concrete, shared by the pole and every overlay that fades into it
    if P['bands'] == 'zebra':
        bands = [(0.35, 0.65, (0.83, 0.82, 0.77)), (0.65, 0.95, (0.21, 0.21, 0.20)), (0.95, 1.25, (0.83, 0.82, 0.77)), (1.25, 1.55, (0.21, 0.21, 0.20))]
    else:
        bands = [(0.3, 1.3, (0.82, 0.82, 0.78))]

    def concrete(p, n=(0, 0, 0), fc=None):
        x, z, h = p
        k = 1 + 0.045 * math.sin(h * 1.3 + ph[0]) + 0.03 * math.sin(h * 4.7 + ph[1]) + 0.02 * math.sin(x * 40 + z * 30 + ph[2])
        c = mul(conc, k)
        if n[0] < -0.6:                      # the weather side is darker and greener
            c = mix(c, (0.47, 0.49, 0.44), 0.35)
        if n[1] > 0.6:                       # lane face takes the sun: a touch paler
            c = mix(c, (0.72, 0.71, 0.67), 0.25)
        hh = fc[2] if fc else h
        for b0, b1, bc in bands:
            if b0 <= hh < b1 and not (fc and abs(fc[2] - h) > 0.4):
                c = mix(bc, c, 0.18 + 0.12 * hsh(round(hh, 2), ph[3]))
        if H - 0.9 < h:                       # soot / bird grime near the top and the fitting
            c = mix(c, (0.40, 0.40, 0.38), (h - (H - 0.9)) / 0.9 * 0.35)
        s = max(0.0, (0.75 - h) / 0.75)       # earth splash from the lane
        c = mix(c, (0.40, 0.35, 0.28), 0.8 * s ** 1.4 * (0.75 + 0.25 * math.sin(x * 50 + z * 35 + ph[4])))
        if 0.18 < h < 0.42:
            c = mul(c, 0.88)                  # damp line above the muff
        return c

    # ---- the pole
    hs = sorted(set([0.0, 0.1, 0.2, 0.3, 0.35, 0.45, 0.55, 0.65, 0.8, 0.95, 1.05, 1.25, 1.3, 1.45, 1.55, 1.7]
                    + [round(1.95 + 0.45 * i, 3) for i in range(int((H - 2.0) / 0.45))] + [H]))
    pole = loft('pole', [prof(h) for h in hs])
    kit.add('plaster', paint(pole, lambda p, n, fc: concrete(p, n, fc)))
    # top cap, slightly proud and darker
    cap = loft('cap', [prof(H - 0.06, 0.006), prof(H + 0.02, 0.006)])
    kit.add('plaster', paint(cap, lambda p, n, fc: mix(concrete(p), (0.42, 0.42, 0.40), 0.4)))

    # ---- cement muff at the foot, chipped top edge
    bm = bmesh.new()
    seg = 10
    rings = []
    for k, (r, h) in enumerate([(0.27, -0.02), (0.25, 0.14), (0.2, 0.24)]):
        ring = []
        for i in range(seg):
            a = i / seg * math.tau
            jr = r + (0.025 * (hsh(i, var == 'b') - 0.5) if k == 2 else 0.01 * (hsh(i, 7) - 0.5))
            jh = h + (0.035 * (hsh(i, 3, var == 'b') - 0.6) if k == 2 else 0)
            ring.append(bm.verts.new((jr * math.cos(a), jr * math.sin(a), jh)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    muff = new_bmesh_obj('muff', bm)
    kit.add('plaster', paint(muff, lambda p, n, fc: mix((0.60, 0.59, 0.55), (0.38, 0.34, 0.28), 1.0 - p[2] / 0.24 + 0.15 * math.sin(p[0] * 31 + p[1] * 17))))

    # ---- helpers for things stuck flat onto a face
    def fpos(face, u, h, off):
        return {'L': V(u, hd(h) + off, h), 'B': V(-u, -hd(h) - off, h), 'R': V(HW + off, u, h), 'W': V(-HW - off, -u, h)}[face]

    OUT = {'L': V(0, 1, 0), 'B': V(0, -1, 0), 'R': V(1, 0, 0), 'W': V(-1, 0, 0)}

    def face_rect(name, face, u0, u1, h0, h1, off, fn):
        o = sheet(name, [fpos(face, u0, h0, off), fpos(face, u1, h0, off), fpos(face, u1, h1, off), fpos(face, u0, h1, off)], OUT[face])
        kit.add('plaster', paint(o, fn))

    def streak(name, face, u, h_top, ln, w, col, fade=1.0, kind='plaster'):
        rows = []
        for i in range(5):
            s = i / 4
            rows.append((u + 0.006 * math.sin(s * 5 + u * 40), h_top - ln * s, w * (1 - 0.7 * s) + 0.002))
        o = strip(name, rows, lambda uu, h: fpos(face, uu, h, 0.0015), OUT[face])
        kit.add(kind, paint(o, lambda p, n, fc: mix(col, concrete(p, n), min(1.0, (h_top - p[2]) / ln * fade + 0.15))))

    # rain + algae streaks off the cap and the clamps, rust bleeding below every steel band
    for i, face in enumerate(['L', 'B', 'R', 'W', 'B', 'W']):
        u = (rnd.random() - 0.5) * 0.08
        streak('rain%d' % i, face, u, H - 0.03 - rnd.random() * 0.1, 1.2 + rnd.random() * 2.2, 0.018 + rnd.random() * 0.014, (0.34, 0.36, 0.31), fade=0.8)

    # ---- arm: curved GI pipe from a clamp on the lane face, braced, out over the lane
    ARM_H = H - 0.55
    reach = 1.42
    lift = 0.26 + P['lean_arm']
    arm_pt = lambda s: (0.0, hd(ARM_H) + 0.02 + s * reach, ARM_H + lift * (1 - (1 - s) ** 2))
    arm_pts = [arm_pt(i / 8) for i in range(9)]
    kit.add('tin', tube('arm', arm_pts, 0.024, 6), 0x55524a)
    kit.add('tin', cyl('arm_end', 0, arm_pts[-1][1] + 0.01, arm_pts[-1][2] - 0.03, arm_pts[-1][2] + 0.03, 0.03, 0.03, seg=6), 0x4a463e)
    s_br = 0.48
    br = arm_pt(s_br)
    kit.add('tin', tube('brace', [(0, hd(H - 1.2) + 0.015, H - 1.2), (0, br[1], br[2] - 0.02)], 0.016, 5), 0x55524a)
    for hh, nm in ((ARM_H, 'clamp_arm'), (H - 1.2, 'clamp_brace')):
        band = loft(nm, [prof(hh - 0.035, 0.007), prof(hh + 0.035, 0.007)])
        kit.add('tin', paint(band, lambda p, n, fc: mix((0.33, 0.31, 0.28), (0.45, 0.25, 0.13), 0.55 + 0.3 * math.sin(p[0] * 60 + p[1] * 40))))
        for sx in (-1, 1):  # clamp bolts sticking out on the sides
            kit.add('tin', limb(nm + '_bolt%d' % sx, (sx * (HW + 0.005), 0.0, hh), (sx * (HW + 0.045), 0.0, hh), 0.016), 0x3e3a33)
        for face, u in (('L', 0.035), ('R', 0.02), ('W', -0.03)):
            streak(nm + '_rust_' + face, face, u + rnd.uniform(-0.01, 0.01), hh - 0.04, 0.35 + rnd.random() * 0.5, 0.01, (0.52, 0.31, 0.17))

    # ---- tube batten under the arm (white enamel gone yellow, rust at the ends), straps, the tube
    zb0, zb1 = 0.34, 1.40
    def under(z, d):
        s = (z - hd(ARM_H) - 0.02) / reach
        return ARM_H + lift * (1 - (1 - s) ** 2) - d
    b0, b1 = (0, zb0, under(zb0, 0.11)), (0, zb1, under(zb1, 0.11))
    batt = limb('batten', b0, b1, 0.075, 0.045)
    kit.add('tin', batt, 0xCDC5AA)    # white enamel gone yellow; the rusted ends are the holders below
    for zz in (zb0 + 0.12, zb1 - 0.12):
        kit.add('tin', limb('strap%d' % int(zz * 100), (0, zz, under(zz, 0.09)), (0, zz, under(zz, 0.0)), 0.03, 0.006), 0x4a463e)
    kit.add('tin', tube('tube', [(0, zb0 + 0.04, under(zb0 + 0.04, 0.155)), (0, zb1 - 0.04, under(zb1 - 0.04, 0.155))], 0.0135, 6), 0xF6F3E6)
    for zz in (zb0 + 0.02, zb1 - 0.02):
        kit.add('tin', wb('holder%d' % int(zz * 100), -0.02, 0.02, zz - 0.02, zz + 0.02, under(zz, 0.17), under(zz, 0.13), 0.004), 0x8c8778)
        kit.add('tin', wb('battend%d' % int(zz * 100), -0.039, 0.039, zz - 0.025, zz + 0.025, under(zz, 0.135), under(zz, 0.085), 0.004), 0x7a4a2c)
    if P['hood']:   # sheet reflector over the tube, bent, rust along its lip
        for sx in (-1, 1):
            hood = limb('hood%d' % sx, (sx * 0.06, zb0 + 0.02, under(zb0 + 0.02, 0.15)), (sx * 0.06, zb1 - 0.02, under(zb1 - 0.02, 0.15)), 0.006, 0.07)
            hood.data.transform(Matrix.Translation(V(sx * 0.06, (zb0 + zb1) / 2, under((zb0 + zb1) / 2, 0.15))) @ Matrix.Rotation(sx * 0.6, 4, (0, 1, 0)) @ Matrix.Translation(-V(sx * 0.06, (zb0 + zb1) / 2, under((zb0 + zb1) / 2, 0.15))))
            kit.add('tin', paint(hood, lambda p, n, fc: mix((0.70, 0.69, 0.64), (0.45, 0.29, 0.18), 0.4 + 0.3 * math.sin(p[1] * 9))))

    # ---- top: pin insulator the overhead wires hang from (anchor H+0.15 in src), a reel insulator for the second core
    kit.add('tin', cyl('pin', 0, 0, H + 0.02, H + 0.07, 0.012, 0.012, seg=6), 0x4a463e)
    kit.add('tin', lathe('insulator', 0, 0, [(0.028, H + 0.06), (0.048, H + 0.075), (0.036, H + 0.10), (0.042, H + 0.11), (0.024, H + 0.145), (0.012, H + 0.165)], seg=8), 0x7c4c38)
    kit.add('tin', limb('dstrap', (0.0, hd(H) + 0.0, H - 0.06), (0.0, hd(H) + 0.07, H - 0.06), 0.05, 0.008), 0x4a463e)
    kit.add('tin', cyl('reel', 0, hd(H) + 0.05, H - 0.10, H - 0.03, 0.026, 0.026, seg=8), 0xd2cbbb)

    # ---- switch box on the lane face: body, door, hinges, latch, gland, rust bloom on the bottom
    BX0, BX1, BH0, BH1 = -0.13, 0.13, 1.95, 2.33
    zf = hd(2.1) + 0.005
    box = wb('swbox', BX0, BX1, zf, zf + 0.14, BH0, BH1, 0.01)
    rust_low = lambda base: (lambda p, n, fc: mix(base, (0.43, 0.26, 0.15), max(0.0, 1 - (p[2] - BH0) / 0.12) * 0.75 + 0.1 * math.sin(p[0] * 50)))
    kit.add('tin', paint(box, rust_low((0.40, 0.46, 0.41))))
    kit.add('tin', paint(wb('swdoor', BX0 + 0.02, BX1 - 0.02, zf + 0.14, zf + 0.152, BH0 + 0.02, BH1 - 0.02, 0.004), rust_low((0.36, 0.42, 0.38))))
    for hh in (BH0 + 0.07, BH1 - 0.09):
        kit.add('tin', wb('hinge%d' % int(hh * 100), BX0 + 0.012, BX0 + 0.03, zf + 0.148, zf + 0.158, hh, hh + 0.05, 0.002), 0x3a352e)
    kit.add('tin', wb('latch', BX1 - 0.045, BX1 - 0.025, zf + 0.15, zf + 0.165, BH0 + 0.16, BH0 + 0.21, 0.002), 0x3a352e)
    kit.add('tin', cyl('gland', 0.08, zf + 0.06, BH1, BH1 + 0.04, 0.02, 0.016, seg=6), 0x3a352e)
    for sx, uu in ((-1, -0.04), (1, 0.05)):
        streak('boxrust%d' % sx, 'L', uu, BH0 - 0.005, 0.5 + 0.3 * rnd.random(), 0.02, (0.50, 0.31, 0.18))
    for hh in (BH0 + 0.06, BH1 - 0.06):   # the box hangs on two flat straps round the pole
        kit.add('tin', loft('boxstrap%d' % int(hh * 100), [prof(hh - 0.015, 0.005), prof(hh + 0.015, 0.005)]), 0x3e3a33)

    # ---- THE DOWN-CABLES. Twin cable down the +x side face in clips, bowing out between them.
    cx = HW + 0.013
    clips = [BH1 + 0.25 + 0.78 * i for i in range(5)]           # 2.58 .. 5.7
    top_clip = H - 0.62
    clips = [c for c in clips if c < top_clip - 0.3] + [top_clip]
    for ci, (zoff, rr) in enumerate(((0.025, 0.011), (-0.005, 0.0095))):
        pts = [(0.08 + 0.01 * ci, zf + 0.06, BH1 + 0.03)]      # out of the gland
        pts.append((cx + 0.01, zoff * 0.5 + 0.02, BH1 + 0.12))
        pts.append((cx, zoff, clips[0]))
        for a, b in zip(clips, clips[1:]):
            pts += bow((cx, zoff, a), (cx, zoff, b), 4, (1, 0, 0), 0.012 + 0.012 * hsh(a, ci), 0.0)[1:]
            pts.append((cx, zoff, b))
        if ci == 0:
            # supply: up past the arm, out into a drip loop on the lane side, up to the top insulator
            pts += [(cx, zoff, H - 0.32), (cx - 0.01, 0.07, H - 0.12), (0.09, 0.2, H - 0.30), (0.06, 0.27, H - 0.47), (0.03, 0.24, H - 0.38),
                    (0.0, 0.14, H - 0.08), (0.0, 0.05, H + 0.06), (0.0, 0.0, H + 0.11)]
        else:
            # feed: wraps round the corner onto the arm and runs taped under it to the batten end
            pts += [(cx - 0.005, hd(ARM_H) - 0.01, ARM_H - 0.04), (0.035, hd(ARM_H) + 0.02, ARM_H - 0.03)]
            for s in (0.08, 0.2, 0.32):
                a = arm_pt(s)
                pts.append((0.02, a[1], a[2] - 0.03))
            pts += [(0.012, zb0 + 0.02, under(zb0 + 0.02, 0.06)), (0.0, zb0 - 0.01, under(zb0, 0.1))]
        kit.add('tin', tube('cable%d' % ci, pts, rr, 5), 0x1e1e1c)
    for c in clips:
        kit.add('tin', wb('clip%d' % int(c * 100), HW - 0.002, cx + 0.016, -0.025, 0.045, c - 0.012, c + 0.012, 0.002), 0x34312c)
    for s in (0.12, 0.26):   # black insulation tape binding the feed to the arm
        a = arm_pt(s)
        kit.add('tin', wb('tape%d' % int(s * 100), -0.03, 0.04, a[1] - 0.015, a[1] + 0.015, a[2] - 0.05, a[2] + 0.028, 0.004), 0x26251f)
    # bare GI earth wire down the back face into the ground beside the muff
    ew = [(-0.035, -hd(H - 0.05) - 0.006, H - 0.05)]
    for h in (4.6, 3.1, 1.6):
        ew.append((-0.035, -hd(h) - 0.006, h))
    ew += [(-0.035, -hd(0.5) - 0.01, 0.5), (-0.035, -0.22, 0.26), (-0.04, -0.33, 0.04), (-0.04, -0.36, -0.05)]
    kit.add('tin', tube('earth', ew, 0.004, 4), 0x8a8a84)
    for h in (4.6, 3.1, 1.6):
        kit.add('tin', wb('eclip%d' % int(h * 10), -0.05, -0.02, -hd(h) - 0.014, -hd(h), h - 0.01, h + 0.01, 0.002), 0x34312c)
    if P['dead_coil']:   # an old cut cable left coiled on a nail below the box
        coil = []
        for k in range(13):
            a = k / 12 * math.tau * 1.15
            coil.append((-0.06 + 0.07 * math.sin(a), zf + 0.02 + 0.015 * math.cos(a * 2), BH0 - 0.16 - 0.1 * (1 - math.cos(a)) * 0.6))
        coil += [(-0.03, zf + 0.04, BH0 - 0.4), (0.0, zf + 0.06, BH0 - 0.52)]
        kit.add('tin', tube('deadcoil', coil, 0.008, 4), 0x2a2723)

    # ---- painted pole number (white patch, black stencil) on the lane face above the box
    nh0, nh1 = 2.55, 2.74
    face_rect('numpatch', 'L', -0.058, 0.058, nh0, nh1, 0.0015, lambda p, n, fc: mix((0.86, 0.84, 0.70), concrete(p), 0.2 + 0.25 * hsh(p[0] * 9, p[2] * 7)))
    t = P['number']
    w = 0.028 if len(t) == 2 else 0.024
    tw = len(t) * w + (len(t) - 1) * 0.008
    for i, (u0, u1, h0, h1) in enumerate(digit_rects(t, -tw / 2, nh0 + 0.035, w, 0.12, 0.009, 0.008)):
        face_rect('dig%d' % i, 'L', u0, u1, h0, h1, 0.0025, lambda p, n, fc: (0.18, 0.18, 0.17))

    # ---- pasted bills: an old torn one underneath, a newer one over it, printed blocks (no readable lettering)
    bf = 'W' if P['bills'] == 'weather' else 'R'
    bw = 0.05 if bf == 'W' else 0.05
    hb = 1.78 if bf == 'W' else 1.62
    old = [fpos(bf, -bw, hb - 0.02, 0.0015), fpos(bf, bw - 0.01, hb + 0.01, 0.0015), fpos(bf, bw, hb + 0.24, 0.0015), fpos(bf, bw * 0.3, hb + 0.30, 0.0015), fpos(bf, -bw * 0.6, hb + 0.27, 0.0015), fpos(bf, -bw, hb + 0.18, 0.0015)]
    kit.add('plaster', paint(sheet('bill_old', old, OUT[bf]), lambda p, n, fc: mix((0.80, 0.76, 0.64), concrete(p), 0.35)))
    pc = (0.86, 0.66, 0.38) if var == 'a' else (0.80, 0.62, 0.66)
    face_rect('bill', bf, -bw + 0.008, bw - 0.004, hb + 0.06, hb + 0.30, 0.0025, lambda p, n, fc: mix(pc, (0.85, 0.83, 0.76), 0.25 + 0.3 * (p[2] - hb)))
    face_rect('bill_head', bf, -bw + 0.016, bw - 0.012, hb + 0.25, hb + 0.285, 0.0032, lambda p, n, fc: (0.55, 0.22, 0.18) if var == 'a' else (0.25, 0.30, 0.50))
    face_rect('bill_photo', bf, -bw + 0.016, -bw + 0.05, hb + 0.17, hb + 0.235, 0.0032, lambda p, n, fc: (0.42, 0.36, 0.33))
    for i in range(4):
        hh = hb + 0.085 + i * 0.022
        face_rect('bill_line%d' % i, bf, -bw + 0.016, bw - 0.015 - 0.02 * (i % 2), hh, hh + 0.008, 0.0032, lambda p, n, fc: (0.30, 0.27, 0.25))
    # a scrap of a third bill, mostly scraped off, on the weather face
    face_rect('bill_scrap', 'W', -0.03, 0.04, 2.9, 3.0, 0.0015, lambda p, n, fc: mix((0.78, 0.74, 0.66), concrete(p), 0.45))

    if P['chip']:  # spalled corner with a rusting rebar showing
        cz = hd(3.6)
        kit.add('plaster', paint(sheet('spall', [V(HW + 0.002, cz - 0.05, 3.48), V(HW + 0.002, cz - 0.005, 3.5), V(HW + 0.002, cz - 0.01, 3.72), V(HW + 0.002, cz - 0.045, 3.66)], V(1, 0, 0)),
                                 lambda p, n, fc: (0.47, 0.45, 0.42)))
        kit.add('tin', tube('rebar', [(HW + 0.004, cz - 0.022, 3.47), (HW + 0.006, cz - 0.024, 3.71)], 0.005, 4), 0x6a3a20)
        streak('rebar_rust', 'R', cz - 0.024, 3.47, 0.6, 0.012, (0.50, 0.30, 0.17))


# ---------------------------------------------------------------------------------------------------------------------------
# Panchayat solar light
SOLAR = {
    'a': dict(seed=5, tilt=24, head='flat', number='08', box_h=2.55, box_col=(0.42, 0.50, 0.47), flyer=False),
    'b': dict(seed=17, tilt=30, head='ufo', number='31', box_h=2.35, box_col=(0.50, 0.52, 0.55), flyer=True),
}


def solar(kit, var):
    P = SOLAR[var]
    rnd = random.Random(P['seed'])
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    H = 4.8
    SIDES = 12
    rad = lambda h: 0.062 - 0.02 * max(0.0, h - 0.34) / (H - 0.34)
    ang = lambda i: (i + 0.5) / SIDES * math.tau      # a flat face centred on the lane (+z)
    ring = lambda h, g=0.0: [V(math.sin(ang(i)) * (rad(h) + g), math.cos(ang(i)) * (rad(h) + g), h) for i in range(SIDES)]

    def zinc(p, n=(0, 0, 0), fc=None):
        x, z, h = p
        a = math.atan2(x, z)
        m = math.sin(a * 3 + h * 2.1 + ph[0]) * math.sin(h * 5.3 + ph[1]) + 0.5 * math.sin(a * 7 - h * 9 + ph[2])
        c = (0.60, 0.62, 0.61)
        c = mix(c, (0.72, 0.73, 0.70), max(0.0, m) * 0.45)     # white zinc bloom
        c = mix(c, (0.46, 0.48, 0.48), max(0.0, -m) * 0.4)
        r = max(0.0, (0.75 - h) / 0.42) * (0.55 + 0.45 * math.sin(a * 4 + ph[3]))
        c = mix(c, (0.46, 0.28, 0.16), min(0.85, r))               # rust up from the weld
        s = max(0.0, (0.7 - h) / 0.4)
        return mix(c, (0.40, 0.35, 0.28), 0.55 * s)

    hs = [0.32, 0.36, 0.45, 0.6, 0.8, 1.1, 1.5, 2.0, 2.6, 3.2, 3.8, 4.3, H]
    kit.add('tin', paint(loft('pole', [ring(h) for h in hs]), zinc))
    kit.add('tin', paint(loft('weld', [ring(0.32, 0.006), ring(0.38, 0.003)]), lambda p, n, fc: (0.42, 0.27, 0.17)))

    # pedestal, chamfered top, earth splash, a broken corner
    def ped(p, n, fc):
        c = mul((0.66, 0.65, 0.61), 1 + 0.05 * math.sin(p[0] * 13 + p[1] * 9 + ph[4]))
        c = mix(c, (0.40, 0.35, 0.28), 0.85 * max(0.0, (0.2 - p[2]) / 0.24) ** 1.2)
        if n[2] > 0.7:
            c = mix(c, (0.55, 0.52, 0.46), 0.4)
        return c
    kit.add('plaster', paint(wb('pedestal', -0.21, 0.21, -0.21, 0.21, -0.03, 0.30, 0.03), ped))
    kit.add('plaster', paint(sheet('ped_chip', [V(0.212, 0.212, 0.30), V(0.212, 0.09, 0.30), V(0.212, 0.15, 0.2)], V(1, 0, 0)), lambda p, n, fc: (0.52, 0.50, 0.46)))
    kit.add('tin', wb('baseplate', -0.13, 0.13, -0.13, 0.13, 0.30, 0.318, 0.004), 0x5a4a3c)
    for sx in (-1, 1):
        for sz in (-1, 1):
            kit.add('tin', cyl('bolt', sx * 0.1, sz * 0.1, 0.318, 0.37, 0.011, 0.011, seg=6), 0x4d3a2c)
            kit.add('tin', cyl('nut', sx * 0.1, sz * 0.1, 0.318, 0.338, 0.02, 0.02, seg=6), 0x5b4532)
    for a in (0, math.pi / 2, math.pi, 3 * math.pi / 2):   # gussets
        dx, dz = math.sin(a), math.cos(a)
        g = limb('gusset', (dx * 0.07, dz * 0.07, 0.318), (dx * 0.06, dz * 0.06, 0.46), 0.008 if abs(dz) > 0.5 else 0.08, 0.08 if abs(dz) > 0.5 else 0.008)
        kit.add('tin', g, 0x5d4a3a)

    # painted pole number: pale patch wrapped on the lane face, stencil digits
    def wrap(name, u0, u1, h0, h1, off, fn, kind='tin'):
        rows = [((u0 + u1) / 2, h0, (u1 - u0) / 2), ((u0 + u1) / 2, h1, (u1 - u0) / 2)]
        bm = bmesh.new()
        cols = 3
        grid = []
        for uu, hh, ww in rows:
            r = rad(hh) + off
            grid.append([bm.verts.new(V(math.sin((uu - ww + 2 * ww * k / cols) / r) * r, math.cos((uu - ww + 2 * ww * k / cols) / r) * r, hh)) for k in range(cols + 1)])
        for k in range(cols):
            bm.faces.new((grid[0][k], grid[0][k + 1], grid[1][k + 1], grid[1][k]))
        bm.normal_update()
        bm.faces.ensure_lookup_table()
        if bm.faces[0].normal.dot(V(math.sin(((u0 + u1) / 2) / rad(h0)), math.cos(((u0 + u1) / 2) / rad(h0)), 0)) < 0:
            bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        kit.add(kind, paint(new_bmesh_obj(name, bm), fn))
    nh0 = 1.9
    wrap('numpatch', -0.045, 0.045, nh0, nh0 + 0.17, 0.004, lambda p, n, fc: mix((0.86, 0.80, 0.52), zinc(p), 0.25))
    t = P['number']
    for i, (u0, u1, h0, h1) in enumerate(digit_rects(t, -0.031, nh0 + 0.03, 0.026, 0.11, 0.008, 0.01)):
        wrap('dig%d' % i, u0, u1, h0, h1, 0.0055, lambda p, n, fc: (0.20, 0.20, 0.19))
    for i, a0 in enumerate((0.5, -1.3, 2.4)):   # rust runs down from the box straps and arm sleeve
        hh = (P['box_h'] - 0.02, P['box_h'] + 0.43, H - 0.32)[i]
        rows = [(a0 * rad(hh), hh, 0.006), (a0 * rad(hh) + 0.003, hh - 0.25, 0.004), (a0 * rad(hh) - 0.002, hh - 0.55, 0.0015)]
        bm = bmesh.new()
        grid = [[bm.verts.new(V(math.sin((u + s * w) / (rad(h) + 0.0015)) * (rad(h) + 0.0015), math.cos((u + s * w) / (rad(h) + 0.0015)) * (rad(h) + 0.0015), h)) for s in (-1, 1)] for u, h, w in rows]
        for r0, r1 in zip(grid, grid[1:]):
            bm.faces.new((r0[0], r0[1], r1[1], r1[0]))
        bm.normal_update()
        bm.faces.ensure_lookup_table()
        if bm.faces[0].normal.dot(V(math.sin(a0), math.cos(a0), 0)) < 0:
            bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        kit.add('tin', paint(new_bmesh_obj('rust%d' % i, bm), lambda p, n, fc, hh=hh: mix((0.48, 0.28, 0.15), zinc(p), (hh - p[2]) / 0.6)))

    # battery box with rain hood, door, hinges, hasp + padlock, louvres, straps, stencil number
    BH = P['box_h']
    z0, z1 = 0.065, 0.285
    bc = P['box_col']
    def boxpaint(base):
        return lambda p, n, fc: mix(mix(base, (0.62, 0.63, 0.60), 0.2 if n[2] > 0.6 else 0.0), (0.44, 0.27, 0.15), max(0.0, 1 - (p[2] - BH) / 0.1) * 0.7 * (0.6 + 0.4 * math.sin(p[0] * 40 + ph[5])))
    kit.add('plaster', paint(wb('battery', -0.17, 0.17, z0, z1, BH, BH + 0.42, 0.01), boxpaint(bc)))
    kit.add('plaster', paint(wb('battery_door', -0.15, 0.15, z1, z1 + 0.012, BH + 0.02, BH + 0.39, 0.004), boxpaint(mul(bc, 0.93))))
    hood = limb('hood', (0, z0 - 0.01, BH + 0.455), (0, z1 + 0.045, BH + 0.405), 0.38, 0.012)
    kit.add('plaster', paint(hood, lambda p, n, fc: mix(mul(bc, 1.05), (0.82, 0.80, 0.74), 0.35 * max(0.0, math.sin(p[0] * 23 + 1.1) * math.sin(p[1] * 31)) if n[2] > 0.5 else 0.0)))
    for hh in (BH + 0.06, BH + 0.30):
        kit.add('tin', wb('hinge', -0.165, -0.145, z1 + 0.008, z1 + 0.02, hh, hh + 0.05, 0.002), 0x3a352e)
    kit.add('tin', wb('hasp', 0.11, 0.135, z1 + 0.012, z1 + 0.022, BH + 0.19, BH + 0.26, 0.002), 0x3a352e)
    kit.add('tin', wb('lock', 0.105, 0.14, z1 + 0.022, z1 + 0.042, BH + 0.135, BH + 0.19, 0.004), 0x7a5e32)
    kit.add('tin', limb('shackle', (0.114, z1 + 0.032, BH + 0.19), (0.131, z1 + 0.032, BH + 0.19), 0.006, 0.03), 0x7c7c76)
    for sx in (-1, 1):
        for i in range(4):
            hh = BH + 0.12 + i * 0.045
            l = limb('louvre', (sx * 0.172, z0 + 0.07, hh), (sx * 0.172, z1 - 0.07, hh), 0.005, 0.012)
            kit.add('tin', l, 0x3c403c)
    for hh in (BH + 0.06, BH + 0.36):
        kit.add('tin', paint(loft('bstrap', [ring(hh - 0.015, 0.004), ring(hh + 0.015, 0.004)]), lambda p, n, fc: (0.40, 0.27, 0.18)))
    # stencil number on the door, pale on the paint
    for i, (u0, u1, h0, h1) in enumerate(digit_rects(P['number'], -0.06, BH + 0.07, 0.035, 0.1, 0.01, 0.012)):
        kit.add('plaster', paint(sheet('bdig%d' % i, [V(u0, z1 + 0.0135, h0), V(u1, z1 + 0.0135, h0), V(u1, z1 + 0.0135, h1), V(u0, z1 + 0.0135, h1)], V(0, 1, 0)), lambda p, n, fc: (0.80, 0.78, 0.66)))
    for i, uu in enumerate((-0.15, 0.12)):   # rust runs from the hinges / hasp down the door and box
        hh = BH + 0.06 if i == 0 else BH + 0.135
        pts = [V(uu - 0.006, z1 + 0.0135, hh), V(uu + 0.006, z1 + 0.0135, hh), V(uu + 0.002, z1 + 0.0135, hh - 0.14), V(uu - 0.002, z1 + 0.0135, hh - 0.14)]
        kit.add('plaster', paint(sheet('drust%d' % i, pts, V(0, 1, 0)), lambda p, n, fc, hh=hh: mix((0.46, 0.27, 0.15), bc, (hh - p[2]) / 0.16)))
    if P['flyer']:   # a paper notice taped to the door, one corner lifted
        fz = z1 + 0.014
        kit.add('plaster', paint(sheet('flyer', [V(-0.12, fz, BH + 0.2), V(0.06, fz, BH + 0.205), V(0.065, fz, BH + 0.37), V(-0.115, fz, BH + 0.365)], V(0, 1, 0)),
                                 lambda p, n, fc: mix((0.86, 0.84, 0.76), (0.72, 0.66, 0.52), (BH + 0.37 - p[2]) * 3)))
        kit.add('plaster', paint(sheet('flyer_curl', [V(0.06, fz, BH + 0.205), V(0.02, fz, BH + 0.2), V(0.045, fz + 0.03, BH + 0.24)], V(0, 1, 0)), lambda p, n, fc: (0.76, 0.74, 0.66)))
        for i in range(4):
            hh = BH + 0.24 + i * 0.03
            kit.add('plaster', paint(sheet('fl_line%d' % i, [V(-0.1, fz + 0.001, hh), V(0.04 - 0.03 * (i % 2), fz + 0.001, hh), V(0.04 - 0.03 * (i % 2), fz + 0.001, hh + 0.01), V(-0.1, fz + 0.001, hh + 0.01)], V(0, 1, 0)), lambda p, n, fc: (0.30, 0.28, 0.26)))
        for u in (-0.12, 0.065):
            kit.add('plaster', paint(sheet('tape', [V(u - 0.02, fz + 0.002, BH + 0.35), V(u + 0.02, fz + 0.002, BH + 0.35), V(u + 0.02, fz + 0.002, BH + 0.38), V(u - 0.02, fz + 0.002, BH + 0.38)], V(0, 1, 0)), lambda p, n, fc: (0.74, 0.70, 0.56)))

    # arm + head
    AH = H - 0.32
    a0, a1 = (0, rad(AH), AH), (0, 0.78, AH + 0.17)
    kit.add('tin', tube('arm', [a0, (0, 0.4, AH + 0.09), a1], 0.022, 6), 0x7c807c)
    kit.add('tin', paint(loft('sleeve', [ring(AH - 0.06, 0.006), ring(AH + 0.06, 0.006)]), lambda p, n, fc: mix((0.55, 0.56, 0.54), (0.46, 0.28, 0.16), 0.6)))
    if P['head'] == 'flat':
        hz0, hz1, hh0 = 0.66, 1.08, AH + 0.115
        def housing(p, n, fc):
            c = (0.42, 0.44, 0.45)
            if n[2] > 0.6:
                c = mix(c, (0.66, 0.63, 0.56), 0.45)          # dust settles on top
            return c
        kit.add('tin', paint(wb('head', -0.085, 0.085, hz0, hz1, hh0, hh0 + 0.055, 0.012), housing))
        for i in range(5):
            x = -0.06 + i * 0.03
            kit.add('tin', paint(wb('fin%d' % i, x - 0.004, x + 0.004, hz0 + 0.05, hz1 - 0.05, hh0 + 0.055, hh0 + 0.085, 0.002), housing))
        kit.add('tin', wb('lens', -0.07, 0.07, hz0 + 0.025, hz1 - 0.025, hh0 - 0.008, hh0, 0.003), 0xF4F1E2)
        kit.add('plaster', paint(sheet('dropping', [V(-0.02, hz0 + 0.2, hh0 + 0.0895), V(0.03, hz0 + 0.22, hh0 + 0.0895), V(0.01, hz0 + 0.27, hh0 + 0.0895)], V(0, 0, 1)), lambda p, n, fc: (0.84, 0.83, 0.78)))
        head_end = (0, hz0 + 0.03, hh0 + 0.03)
    else:
        cz, top = 0.86, AH + 0.2
        kit.add('tin', cyl('drop', 0, cz, top - 0.03, top + 0.02, 0.018, 0.018, seg=6), 0x7c807c)
        kit.add('tin', paint(lathe('ufo', 0, cz, [(0.0, top), (0.05, top - 0.005), (0.13, top - 0.04), (0.16, top - 0.07), (0.155, top - 0.085)], seg=12, smooth=False),
                             lambda p, n, fc: mix((0.36, 0.38, 0.40), (0.64, 0.61, 0.55), 0.45 if n[2] > 0.5 else 0.0)))
        kit.add('tin', lathe('ufo_lens', 0, cz, [(0.14, top - 0.085), (0.12, top - 0.1), (0.0, top - 0.105)], seg=12, smooth=False), 0xF4F1E2)
        head_end = (0, cz - 0.06, top - 0.01)

    # panel on a tilt mount at the pole top
    kit.add('tin', cyl('topcap', 0, 0, H - 0.02, H + 0.05, rad(H) + 0.006, rad(H) + 0.006, seg=8), 0x6a6e6a)
    kit.add('tin', tube('mast', [(0, 0, H + 0.05), (0, -0.03, H + 0.30)], 0.032, 6), 0x7c807c)
    tl = math.radians(P['tilt'])
    PC = (0.0, -0.05, H + 0.36)
    L2, W2 = 0.33, 0.5
    du = (0.0, math.cos(tl), math.sin(tl))          # up the slope (toward the lane, rising)
    nrm = (0.0, -math.sin(tl), math.cos(tl))        # panel faces up and away from the lane
    pp = lambda x, s, d: (x, PC[1] + du[1] * s + nrm[1] * d, PC[2] + du[2] * s + nrm[2] * d)
    for x in (-0.28, 0.28):
        kit.add('tin', limb('rail', pp(x, -L2 + 0.03, -0.035), pp(x, L2 - 0.03, -0.035), 0.03, 0.03), 0x6a6e6a)
    kit.add('tin', limb('crossbar', (-0.3, PC[1], PC[2] - 0.06), (0.3, PC[1], PC[2] - 0.06), 0.03), 0x6a6e6a)
    kit.add('tin', limb('strut', (0, -0.03, H + 0.28), (0, PC[1] - 0.18, PC[2] - 0.1), 0.025), 0x6a6e6a)
    # aluminium frame (back tray + raised lip)
    kit.add('plaster', paint(limb('frame', pp(0, -L2, -0.012), pp(0, L2, -0.012), 2 * W2, 0.03),
                             lambda p, n, fc: mix((0.70, 0.71, 0.70), (0.55, 0.52, 0.46), 0.3)))
    for (a, b) in (((-W2, -L2), (W2, -L2)), ((-W2, L2), (W2, L2)), ((-W2, -L2), (-W2, L2)), ((W2, -L2), (W2, L2))):
        o = limb('lip', pp(a[0], a[1], 0.006), pp(b[0], b[1], 0.006), 0.022, 0.012)
        kit.add('plaster', paint(o, lambda p, n, fc: mix((0.72, 0.73, 0.72), (0.58, 0.54, 0.46), 0.6 if (p[2] - PC[2]) < -0.1 else 0.15)))
    # cell field: 9 x 5 cells, each a face; dust gathers at the low edge, droppings, per-cell tone
    NX, NY = 9, 5
    bm = bmesh.new()
    gv = [[bm.verts.new(V(*pp(-W2 + 0.018 + (2 * W2 - 0.036) * i / NX, -L2 + 0.018 + (2 * L2 - 0.036) * j / NY, 0.004))) for i in range(NX + 1)] for j in range(NY + 1)]
    for j in range(NY):
        for i in range(NX):
            bm.faces.new((gv[j][i], gv[j][i + 1], gv[j + 1][i + 1], gv[j + 1][i]))
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    if bm.faces[0].normal.dot(V(*nrm)) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    cells = new_bmesh_obj('cells', bm)
    drops = {(rnd.randrange(NX), rnd.randrange(NY)) for _ in range(3)}
    def cellcol(p, n, fc):
        s = ((p[1] - PC[1]) * du[1] + (p[2] - PC[2]) * du[2] + L2) / (2 * L2)       # 0 low edge .. 1 high edge
        fi = int(((fc[0] + W2) / (2 * W2)) * NX)
        fj = int(((fc[1] - PC[1]) * du[1] + (fc[2] - PC[2]) * du[2] + L2) / (2 * L2) * NY)
        c = mul((0.16, 0.21, 0.32), 0.9 + 0.2 * hsh(fi, fj, P['seed']))
        c = mix(c, (0.55, 0.52, 0.45), 0.12 + 0.55 * max(0.0, 0.35 - s) / 0.35)
        if (fi, fj) in drops:
            c = mix(c, (0.80, 0.79, 0.74), 0.45)
        return c
    kit.add('plaster', paint(cells, cellcol))
    for i in range(1, NX):   # cell gaps (back sheet showing) and the two busbars per column
        x = -W2 + 0.018 + (2 * W2 - 0.036) * i / NX
        o = sheet('gap', [V(*pp(x - 0.003, -L2 + 0.02, 0.005)), V(*pp(x + 0.003, -L2 + 0.02, 0.005)), V(*pp(x + 0.003, L2 - 0.02, 0.005)), V(*pp(x - 0.003, L2 - 0.02, 0.005))], V(*nrm))
        kit.add('plaster', paint(o, lambda p, n, fc: (0.62, 0.64, 0.66)))
    for j in range(1, NY):
        s = -L2 + 0.018 + (2 * L2 - 0.036) * j / NY
        o = sheet('gaph', [V(*pp(-W2 + 0.02, s - 0.003, 0.005)), V(*pp(W2 - 0.02, s - 0.003, 0.005)), V(*pp(W2 - 0.02, s + 0.003, 0.005)), V(*pp(-W2 + 0.02, s + 0.003, 0.005))], V(*nrm))
        kit.add('plaster', paint(o, lambda p, n, fc: (0.62, 0.64, 0.66)))
    jb = pp(0.0, 0.05, -0.04)
    kit.add('tin', wb('jbox', -0.05, 0.05, jb[1] - 0.04, jb[1] + 0.04, jb[2] - 0.035, jb[2] + 0.005, 0.004), 0x2f2f2c)

    # cables: panel -> down the pole (cable ties, bowing between) -> box top; box -> service loop -> up to the arm -> head
    ca, cb = 1.15, 1.42          # angles round the pole (from the lane face toward +x)
    on = lambda a, h, g=0.012: (math.sin(a) * (rad(h) + g), math.cos(a) * (rad(h) + g), h)
    ties = [H - 0.12, H - 0.55, H - 1.0, H - 1.45]
    ties = [t for t in ties if t > BH + 0.6]
    ptsA = [(0.0, jb[1] - 0.02, jb[2] - 0.035), (0.03, -0.02, H + 0.1), on(ca, H - 0.04)]
    for a, b in zip(ties, ties[1:] + [BH + 0.5]):
        ptsA += bow(on(ca, a), on(ca, b), 3, (math.sin(ca), math.cos(ca), 0), 0.015 + 0.01 * hsh(a))
    ptsA += [on(ca, BH + 0.5), (0.11, 0.11, BH + 0.47), (0.12, 0.17, BH + 0.445)]
    kit.add('tin', tube('cableA', ptsA, 0.0085, 5), 0x1e1e1c)
    ptsB = [(0.172, 0.20, BH + 0.30), (0.215, 0.20, BH + 0.24), (0.25, 0.17, BH + 0.12), (0.24, 0.12, BH + 0.06), (0.2, 0.07, BH + 0.10),
            (0.13, 0.03, BH + 0.25)]
    for a, b in zip([BH + 0.5] + sorted(ties)[:-1], sorted(ties)[:-1] + [AH - 0.08]):
        ptsB += bow(on(cb, a), on(cb, b), 3, (math.sin(cb), math.cos(cb), 0), 0.012 + 0.012 * hsh(b))
    ptsB += [on(cb, AH - 0.08), (0.05, rad(AH) + 0.02, AH - 0.02), (0.02, 0.3, AH + 0.04), (0.02, 0.55, AH + 0.11), head_end]
    kit.add('tin', tube('cableB', ptsB, 0.0085, 5), 0x1e1e1c)
    for t in ties:   # cable ties
        kit.add('tin', loft('tie', [ring(t - 0.006, 0.02), ring(t + 0.006, 0.02)]), 0x2a2a28)


# ---------------------------------------------------------------------------------------------------------------------------
def make():
    for typ, fn, vars_ in (('rcc', rcc, ('a', 'b')), ('solar', solar, ('a', 'b'))):
        for v in vars_:
            kit = Kit(split_props=False, tex_override=TEX)
            fn(kit, v)
            name = 'lamp_%s_v2%s' % (typ, '' if v == 'a' else '_b')
            kit.finalize(os.path.join(ROOT, 'tmp', name + '_raw.glb'), {}, drift_amp=0.05, ao_strength=0.5)


def render():
    """A lane as src/props.js lays it: RCC poles every 14 m alternating sides with sagging twin wires, then two solar lights.
    Writes docs/shots/assets-streetlamps/."""
    kit = Kit(split_props=False, tex_override=dict(TEX, props=('dryearth', 0.5)), route={'earth': 'props'})
    hash_ = lambda k: (math.sin(k * 127.1 + 311.7) * 43758.5453) % 1.0

    def place(build, var, x, z, rotY, n):
        n0 = len(kit.records)
        build(kit, var)
        lean = Matrix.Rotation((hash_(n * 7.31 + 2) - 0.5) * 0.05, 4, 'X') @ Matrix.Rotation((hash_(n * 7.31 + 3) - 0.5) * 0.05, 4, 'Y')
        sc = 0.96 + hash_(n * 7.31 + 5) * 0.1
        M = Matrix.Translation(V(x, z, 0)) @ Matrix.Rotation(rotY, 4, 'Z') @ lean @ Matrix.Scale(sc, 4)
        for k, o, c in kit.records[n0:]:
            o.data.transform(o.matrix_world)
            o.matrix_world.identity()
            o.data.transform(M)
        return M

    W = 4.5
    tops = []
    lane = [(-14, 'a'), (0, 'b'), (14, 'a')]
    for i, (x, v) in enumerate(lane):
        side = 1 if i % 2 == 0 else -1
        off = W / 2 + 0.7 + hash_(i * 7.31 + 1) * 0.2
        M = place(rcc, v, x, off * side, 0.0 if side < 0 else math.pi, i)
        tops.append(M @ Vector((0, 0, 6.55)))
    for a, b in zip(tops, tops[1:]):
        span = (b - a).length
        sag = min(0.9, span * 0.045)
        for dy in (0, -0.12):
            pts = []
            for s in range(17):
                u = s / 16
                q = a.lerp(b, u)
                pts.append((q.x, -q.y, q.z + dy - sag * 4 * u * (1 - u)))
            kit.add('tin', tube('wire', pts, 0.008, 4), 0x1e1e1c)
    place(solar, 'a', 24, W / 2 + 0.8, math.pi, 7)
    place(solar, 'b', 34, -(W / 2 + 0.85), 0.0, 8)
    kit.add('earth', wb('ground', -30, 45, -9, 9, -0.2, 0.0, 0.002), 0x9a8467)
    kit.add('plaster', wb('lane', -30, 45, -W / 2, W / 2, -0.2, 0.012, 0.002), 0x8f877a)
    kit.add('plaster', wb('wall_n', -30, 45, -9.4, -9, 0, 2.6, 0.01), 0xcfc6b2)
    kit.finalize(os.path.join(ROOT, 'tmp', 'streetlamps_preview_raw.glb'), {}, drift_amp=0.05, ao_strength=0.5)
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 40
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.64, 0.80, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.1
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.5; sun.data.color = (1.0, 0.93, 0.82); sun.rotation_euler = (math.radians(50), math.radians(8), math.radians(150))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-streetlamps')
    os.makedirs(d, exist_ok=True)
    only = sys.argv[sys.argv.index('--') + 2:] if len(sys.argv) > sys.argv.index('--') + 2 else None
    shots = [('a_lane_rcc', V(-24, 0.6, 1.7), V(4, 0.0, 4.2), 30),
             ('b_rcc_close', V(-16.6, -0.4, 1.8), V(-14, 3.0, 2.7), 30),
             ('c_rcc_top', V(-17.6, 0.2, 4.4), V(-14, 2.4, 5.7), 32),
             ('d_solar_a', V(20.6, -0.2, 1.8), V(24, 3.0, 2.9), 26),
             ('e_solar_b', V(37.4, 0.2, 1.8), V(34, -3.1, 2.9), 26)]
    for name, loc, look, lens in shots:
        if only and name not in only:
            continue
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (look - loc).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
if which == 'render':
    render()
else:
    make()
