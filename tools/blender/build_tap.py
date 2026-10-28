"""
Drinking taps (J0, 27 Oct playthrough note; PARALLEL.md wave 2 item 7): three varieties, each ONE small model drawn merged by src/taps.js.
  tap_wall_v2  : a brick wall stub, limewashed above a ragged line where the plaster has fallen off at the damp zone; a galvanised riser
                 clamped to it, elbow, short stub and a brass bib tap; a HOLLOW cement trough (real walls, floor, water set below the rim,
                 a chipped corner, a drain notch) on a cracked cement apron.
  tap_stand_v2 : galvanised standpipe on a chamfered cement plinth, elbow + stub + bib tap with a cross handle and a cloth filter tied on the
                 spout; a small hollow catch basin with a drain notch and a brick bucket rest, on a two-piece cracked slab.
  tap_pyaau_v2 : pyaau stand: exposed brick pillar with a limewashed front panel and a cement coping, a galvanised header with two taps,
                 a long hollow cement basin with a drain spout, a steel tumbler on a chain from a hook.
Run: tools/blender/make_taps.sh            (writes public/assets/models/tap_<type>_v2.glb; textures stripped, the game re-applies the shared sets)
     Blender -b --python tools/blender/build_tap.py -- render   (preview shots into docs/shots/assets-taps/)
Local frame: origin at the base centre on the ground, the water side (trough/basin/spout) = +z.
Sets (frozen library only): lime/cement plaster (hb_main, 0.5), brick (1.2), metal (1.0). Galvanised pipe and brass ride the metal set on kind
'galv' (routed to the metal group, so rust_steel's heavy corrosion is NOT applied: GI pipe is grey, not a wreck); clamps keep 'metal' rust.
Weathering is per-vertex colour injected through a small wrapper on arch.colorize (this file only; arch.py is not edited): big faces are
sliced on a 5-7 cm grid so the gradients have vertices to live on. Rising damp with a ragged edge, mud splash at the foot, algae in the wet
corners and below the waterline, a pale lime-scale ring at the water line and white scale streaks under every spout, sun-faded tops,
verdigris on the brass, rust bleeding from every pipe joint, and a per-unit tint drift.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import ROOT, hex_to_linear_rgb, wb, limb, cyl, new_bmesh_obj
import arch
from arch import Kit, ring, lathe

# ---------------------------------------------------------------- per-loop colour injection (same trick as build_pots.py)
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


# palette (sRGB hex, never pure black or white)
LIME, CEMENT, CEMENT_D, BRICKT = 0xd9d3c4, 0xa8a398, 0x96928a, 0xb0a69a
DAMP, MUD, ALGAE, ALGAE_D, SCALE = 0x7a7c70, 0x6a5a45, 0x5f7a32, 0x3e5228, 0xe6e3d6
WATER, GALV, GALV_D, BRASS, VERD, RUST, IRON = 0x3c4a46, 0x9aa19e, 0x6f7673, 0x9a7c45, 0x5f7f68, 0x7a4a2c, 0x3a3a36


# ---------------------------------------------------------------- geometry helpers
def bake(obj):
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    return obj


def slice_obj(obj, sx=None, sy=None, sz=None):
    """Cut the mesh on axis-aligned planes every s metres so per-vertex wear has vertices (Blender axes; y = -wz)."""
    bake(obj)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for axis, step in ((0, sx), (1, sy), (2, sz)):
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
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def tube(name, p0, p1, r, seg=10, r1=None):
    """Cylinder between two points (wx, wz, h)."""
    a = Vector((p0[0], -p0[1], p0[2]))
    b = Vector((p1[0], -p1[1], p1[2]))
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r1 is None else r1, depth=d.length)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=bm.verts)
    obj = new_bmesh_obj(name, bm)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def paint(obj, fn, seed):
    """Per-loop colours from fn(wx, wz, h, normal, rnd) -> linear Vector."""
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
            cols += [max(0.012, min(0.85, c[0])), max(0.012, min(0.85, c[1])), max(0.012, min(0.85, c[2])), 1.0]
    COLS[obj.name] = cols
    return obj


# ---------------------------------------------------------------- weathering
class Wear:
    """Masonry/cement weathering in one place. damp: rising damp top (ragged). splash: mud height. wet: list of (x0,x1,z0,z1) ground-level
    wet zones where algae grows up the faces. streaks: (x, h_top, h_bot, half_width, colour hex, strength) running down from spouts/joints.
    waterline: (h, x0,x1,z0,z1) a pale scale ring on inner faces and algae below it."""

    def __init__(self, base, damp=0.18, splash=0.1, wet=(), streaks=(), waterline=None, fade=0.12, seed=0, grime=0.0):
        self.base, self.damp, self.splash, self.wet, self.streaks, self.waterline, self.fade, self.seed, self.grime = \
            lin(base), damp, splash, wet, streaks, waterline, fade, seed, grime

    def __call__(self, x, z, h, n, rnd):
        s = self.seed
        c = self.base * (1.0 + 0.07 * fbm(x * 1.7, z * 1.7 + h, s) + 0.04 * (rnd.random() - 0.5))
        # grime: general dirt, heavier low down and on vertical faces
        c = mix(c, c * 0.78, self.grime * (0.4 + 0.6 * (1.0 - min(1.0, h))) * (0.6 + 0.4 * fbm(x * 3, h * 4, s + 1)))
        # sun-faded, dusty tops
        if n.z > 0.7:
            c = mix(c, lin(0xcfc6b2), self.fade * (0.7 + 0.3 * fbm(x * 5, z * 5, s)))
        # rising damp with a ragged edge, darker and slightly green right at the foot
        if self.damp > 0:
            edge = self.damp * (1.0 + 0.35 * fbm(x * 2.3 + z * 1.9, 0.0, s + 2))
            dmp = 1.0 - sstep(edge - 0.06, edge + 0.01, h)
            c = mix(c, c * lin(DAMP) * 1.4, 0.85 * dmp)
            c = mix(c, lin(ALGAE_D), 0.45 * dmp * sstep(0.14, 0.0, h) * (0.5 + 0.5 * fbm(x * 8, z * 8, s)))
            # a darker tide mark where the damp stops, with a pale salt bloom just above it
            c = mix(c, c * 0.6, 0.6 * max(0.0, 1.0 - abs(h - edge) / 0.022))
            c = mix(c, lin(SCALE), 0.3 * max(0.0, 1.0 - abs(h - edge - 0.035) / 0.02) * (0.5 + 0.5 * fbm(x * 11, z * 11, s)))
        # mud splash at the foot
        c = mix(c, lin(MUD), 0.7 * sstep(self.splash, 0.0, h) * (0.6 + 0.4 * fbm(x * 9, z * 9, s + 3)))
        # wet zones: algae creeping up from the ground
        for x0, x1, z0, z1 in self.wet:
            dx = max(x0 - x, 0.0, x - x1)
            dz = max(z0 - z, 0.0, z - z1)
            d = math.hypot(dx, dz)
            reach = 0.16 + 0.08 * fbm(x * 6, z * 6, s + 4)
            a = sstep(reach, 0.0, d + h * 0.8)
            c = mix(c, mix(lin(ALGAE), lin(ALGAE_D), 0.5 + 0.5 * fbm(x * 15, z * 15 + h * 9, s)), 0.8 * a)
        # streaks running down from spouts and joints
        for sx_, ht, hb, hw, col, st in self.streaks:
            if hb <= h <= ht:
                w = hw * (0.7 + 0.5 * (ht - h) / max(ht - hb, 0.01))
                a = sstep(w, 0.0, abs(x - sx_ + 0.012 * math.sin(h * 40))) * sstep(hb, hb + 0.06, h)
                c = mix(c, lin(col), st * a)
        # water line inside a basin: pale scale ring at the surface, algae under it
        if self.waterline:
            wh, x0, x1, z0, z1 = self.waterline
            if x0 - 0.01 <= x <= x1 + 0.01 and z0 - 0.01 <= z <= z1 + 0.01:
                c = mix(c, lin(SCALE), 0.75 * max(0.0, 1.0 - abs(h - wh - 0.012) / 0.014))
                c = mix(c, mix(lin(ALGAE), lin(ALGAE_D), 0.5 + 0.5 * fbm(x * 20, z * 20, s)), 0.85 * sstep(wh, wh - 0.03, h))
        return c


def metal_wear(base, joints=(), scale_below=None, verd=0.0, seed=0):
    """GI pipe / brass: dull base with per-vertex mottling, rust bleeding down from each joint height, verdigris low on brass,
    white lime scale on the lowest part (scale_below = h under which crust shows)."""
    b = lin(base)

    def fn(x, z, h, n, rnd):
        c = b * (1.0 + 0.1 * fbm(x * 30, h * 30 + z * 20, seed) + 0.05 * (rnd.random() - 0.5))
        c = mix(c, lin(GALV_D), 0.3 * max(0.0, -n.z))   # grimy undersides
        for jh in joints:
            if h <= jh + 0.012:
                c = mix(c, lin(RUST), 0.75 * sstep(0.09, 0.0, jh - h) * (0.6 + 0.4 * math.sin(x * 90 + z * 70) ** 2))
        if verd:
            c = mix(c, lin(VERD), verd * max(0.0, -n.z + 0.3) * (0.5 + 0.5 * fbm(x * 40, h * 40, seed)))
        if scale_below is not None:
            c = mix(c, lin(SCALE), 0.85 * sstep(scale_below + 0.01, scale_below - 0.008, h))
        return c
    return fn


# ---------------------------------------------------------------- building blocks
def hollow(kit, name, x0, x1, z0, z1, h0, h1, t, water_h, wear, chip=None, notch=None):
    """A real cement trough/basin: floor, four walls, water below the rim. chip = 'ne' etc: one corner of the rim knocked down 3 cm.
    notch = (side, u0, u1): a drain gap in that wall's top ('E' or 'S'), 3 cm deep."""
    parts = [wb(name + '_floor', x0 + t, x1 - t, z0 + t, z1 - t, h0, h0 + t, 0.004)]
    sides = {'N': (x0, x1, z0, z0 + t), 'S': (x0, x1, z1 - t, z1), 'W': (x0, x0 + t, z0 + t, z1 - t), 'E': (x1 - t, x1, z0 + t, z1 - t)}
    for k, (a0, a1, b0, b1) in sides.items():
        if notch and notch[0] == k:
            side, u0, u1 = notch
            if k in ('N', 'S'):
                parts += [wb(name + '_' + k + 'a', a0, u0, b0, b1, h0, h1, 0.012), wb(name + '_' + k + 'b', u1, a1, b0, b1, h0, h1, 0.012),
                          wb(name + '_' + k + 'n', u0, u1, b0, b1, h0, h1 - 0.035, 0.008)]
            else:
                parts += [wb(name + '_' + k + 'a', a0, a1, b0, u0, h0, h1, 0.012), wb(name + '_' + k + 'b', a0, a1, u1, b1, h0, h1, 0.012),
                          wb(name + '_' + k + 'n', a0, a1, u0, u1, h0, h1 - 0.035, 0.008)]
            continue
        if chip and k == chip[0].upper():
            # the chipped corner: the last 9 cm of this wall top is 3 cm lower, the break left rough
            if k in ('N', 'S'):
                cx = x1 - 0.09 if chip[1] == 'e' else x0 + 0.09
                lo, hi = (a0, cx) if chip[1] == 'e' else (cx, a1)
                parts += [wb(name + '_' + k, lo, hi, b0, b1, h0, h1, 0.012),
                          wb(name + '_' + k + 'c', cx if chip[1] == 'e' else a0, a1 if chip[1] == 'e' else cx, b0, b1, h0, h1 - 0.03, 0.004)]
                continue
        parts.append(wb(name + '_' + k, a0, a1, b0, b1, h0, h1, 0.012, segments=1))
    for i, p in enumerate(parts):
        if not p.name.endswith('_floor'):
            slice_obj(p, sx=0.12, sy=0.12, sz=0.05)
        kit.add('plaster', paint(p, wear, seed=hash(p.name) & 0xffff))
    water = wb(name + '_water', x0 + t, x1 - t, z0 + t, z1 - t, h0 + t, water_h, 0.002)
    kit.add('plaster', paint(water, lambda x, z, h, n, r: lin(WATER) * (1.0 + 0.12 * fbm(x * 8, z * 8)) + 0.06 * lin(ALGAE) * (0.5 + 0.5 * fbm(x * 4, z * 4, 2)), 3))


def bib(kit, x, z, h, handle='lever', seed=0, cloth=None):
    """Brass bib tap on a horizontal stub ending at (x, z, h), spout down at the +z end: hex nut, body, bonnet, handle, spout,
    lime-scale crust and a stalactite drip at the mouth."""
    br = metal_wear(BRASS, verd=0.45, seed=seed)
    kit.add('galv', paint(tube('nut', (x, z, h), (x, z + 0.022, h), 0.024, seg=6), metal_wear(0x8a7448, verd=0.3, seed=seed), seed))
    kit.add('galv', paint(tube('body', (x, z + 0.02, h), (x, z + 0.075, h), 0.019, seg=10, r1=0.016), br, seed + 1))
    kit.add('galv', paint(cyl('bonnet', x, z + 0.05, h + 0.012, h + 0.05, 0.013, 0.011, seg=8), br, seed + 2))
    if handle == 'cross':
        kit.add('metal', limb('hx', (x - 0.035, z + 0.05, h + 0.055), (x + 0.035, z + 0.05, h + 0.055), 0.011), IRON)
        kit.add('metal', limb('hz', (x, z + 0.015, h + 0.055), (x, z + 0.085, h + 0.055), 0.011), IRON)
    elif handle == 'wheel':
        kit.add('metal', ring('wheel', x, z + 0.05, h + 0.056, 0.026, 0.005, axis='y', seg=10, tube=4), IRON)
        kit.add('metal', limb('spoke', (x - 0.026, z + 0.05, h + 0.056), (x + 0.026, z + 0.05, h + 0.056), 0.006), IRON)
    else:
        kit.add('galv', paint(limb('lever', (x, z + 0.05, h + 0.054), (x + 0.075, z + 0.06, h + 0.06), 0.014, 0.008), br, seed + 3))
    sp = tube('spout', (x, z + 0.075, h + 0.002), (x, z + 0.088, h - 0.045), 0.011, seg=8, r1=0.0095)
    kit.add('galv', paint(sp, metal_wear(BRASS, verd=0.6, scale_below=h - 0.022, seed=seed), seed + 4))
    # lime-scale crust at the mouth and a short drip stalactite
    kit.add('paint', paint(tube('crust', (x, z + 0.088, h - 0.04), (x, z + 0.089, h - 0.053), 0.0135, seg=7, r1=0.012),
                           lambda X, Z, H, n, r: lin(SCALE) * (0.92 + 0.1 * r.random()), seed + 5))
    kit.add('paint', paint(tube('drip', (x + 0.004, z + 0.091, h - 0.053), (x + 0.005, z + 0.092, h - 0.072), 0.0045, seg=5, r1=0.0012),
                           lambda X, Z, H, n, r: lin(SCALE) * 0.95, seed + 6))
    if cloth:
        # a filter cloth tied round the spout: a faded cotton cuff, a knot and a hanging tail
        cc = lin(cloth)
        cf = lambda X, Z, H, n, r: mix(cc, lin(0xb8b2a2), 0.3 + 0.3 * r.random()) * (0.85 + 0.15 * math.sin(H * 300))
        kit.add('paint', paint(tube('cloth', (x, z + 0.08, h - 0.018), (x, z + 0.087, h - 0.05), 0.018, seg=8, r1=0.016), cf, seed + 7))
        kit.add('paint', paint(limb('tail', (x + 0.017, z + 0.083, h - 0.025), (x + 0.03, z + 0.08, h - 0.09), 0.012, 0.004), cf, seed + 8))


def galv_run(kit, pts, r=0.021, seed=0, fittings=True, joints_h=()):
    """A galvanised pipe through a list of points, with a fatter fitting (socket/elbow) at every interior point."""
    fn = metal_wear(GALV, joints=joints_h, seed=seed)
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        p = tube('gi%d' % i, a, b, r, seg=10)
        if abs(a[2] - b[2]) > 0.15:
            slice_obj(p, sz=0.04)
        kit.add('galv', paint(p, fn, seed + i))
    if fittings:
        for i, p in enumerate(pts[1:-1]):
            kit.add('galv', paint(cyl('fit%d' % i, p[0], p[1], p[2] - 0.03, p[2] + 0.03, r + 0.007, seg=10), metal_wear(GALV_D, joints=(p[2],), seed=seed), seed + 20 + i))


def brick_core(kit, name, x0, x1, z0, z1, h0, h1, wear):
    b = wb(name, x0, x1, z0, z1, h0, h1, 0.008, segments=1)
    slice_obj(b, sx=0.15, sy=0.15, sz=0.075)
    kit.add('brick', paint(b, wear, seed=11))


def lime_skin(kit, name, x0, x1, face_z, h_lo, h1, wear, seed, t=0.012, sides=None):
    """Limewash plaster skin proud of a brick face (+z side), its lower edge ragged where it has fallen away at the damp line."""
    s = wb(name, x0, x1, face_z, face_z + t, h_lo, h1, 0.004, segments=1)
    slice_obj(s, sx=0.07, sz=0.085)
    bm = bmesh.new()
    bm.from_mesh(s.data)
    rnd = random.Random(seed)
    for v in bm.verts:
        if abs(v.co.z - h_lo) < 1e-4:
            v.co.z = h_lo + 0.09 * max(0.0, 0.5 + fbm(v.co.x * 3.1, 0.0, seed)) + 0.03 * rnd.random()
    bm.to_mesh(s.data)
    bm.free()
    kit.add('plaster', paint(s, wear, seed))


def apron(kit, name, x0, x1, z0, z1, wear, crack_x=None):
    """Cement apron slab on the ground, in two pours with a real gap if crack_x is given, the second pour 6 mm lower."""
    if crack_x is None:
        pieces = [(x0, x1, 0.045)]
    else:
        pieces = [(x0, crack_x - 0.006, 0.045), (crack_x + 0.006, x1, 0.039)]
    for i, (a, b, top) in enumerate(pieces):
        s = wb('%s%d' % (name, i), a, b, z0, z1, -0.02, top, 0.01, segments=1)
        slice_obj(s, sx=0.14, sy=0.14)
        kit.add('plaster', paint(s, wear, seed=31 + i))


# ---------------------------------------------------------------- the three taps
def new_kit():
    COLS.clear()
    return Kit(split_props=False, own=('metal',), route={'galv': 'metal'})


def wall(kit, seed=1):
    # apron, cracked, wet in front of the trough and down at the drain notch (east)
    aw = Wear(CEMENT_D, damp=0, splash=0, wet=[(-0.4, 0.42, 0.36, 0.5), (0.4, 0.62, 0.0, 0.3)], fade=0.08, seed=seed, grime=0.3)
    apron(kit, 'tw_apron', -0.62, 0.62, -0.12, 0.72, aw, crack_x=0.17)
    # brick wall stub, limewashed above a ragged line; the skin also wraps the cap
    ww = Wear(BRICKT, damp=0.62, splash=0.14, wet=[(-0.45, 0.45, -0.12, 0.0)], fade=0.05, seed=seed, grime=0.25,
              streaks=[(0.0, 1.12, 0.62, 0.025, 0x6f6458, 0.3)])
    brick_core(kit, 'tw_wall', -0.55, 0.55, -0.34, -0.12, 0.0, 1.18, ww)
    lw = Wear(LIME, damp=0.62, splash=0.0, fade=0.1, seed=seed + 1, grime=0.15,
              streaks=[(-0.115, 0.98, 0.62, 0.025, RUST, 0.7), (-0.115, 0.6, 0.38, 0.035, 0x6c7066, 0.6), (0.0, 0.62, 0.38, 0.05, 0x6c7066, 0.45), (0.25, 1.15, 0.7, 0.05, 0x8c8676, 0.4)])
    lime_skin(kit, 'tw_skin', -0.55, 0.55, -0.12, 0.3, 1.18, lw, seed + 2)
    cap = wb('tw_cap', -0.58, 0.58, -0.37, -0.09, 1.18, 1.24, 0.01)
    slice_obj(cap, sx=0.15)
    kit.add('plaster', paint(cap, Wear(CEMENT, damp=0, splash=0, fade=0.2, seed=seed + 3, grime=0.35), seed + 3))
    # hollow trough, chipped NE corner (away from the wall: south-east), drain notch in the east wall
    tw = Wear(CEMENT, damp=0.0, splash=0.0, wet=[(-0.42, 0.42, 0.36, 0.42), (0.42, 0.5, -0.1, 0.36)], seed=seed + 4, grime=0.35,
              streaks=[(0.0, 0.36, 0.045, 0.05, SCALE, 0.5)], waterline=(0.27, -0.36, 0.36, -0.06, 0.32))
    hollow(kit, 'tw_tr', -0.42, 0.42, -0.12, 0.38, 0.045, 0.38, 0.06, 0.27, tw, chip='sw', notch=('E', 0.08, 0.2))
    # riser up the wall from the ground, clamped, elbow out, stub, tap over the trough
    galv_run(kit, [(-0.115, -0.095, 0.04), (-0.115, -0.095, 0.66), (0.0, -0.095, 0.66), (0.0, 0.02, 0.66)], seed=seed + 5,
             joints_h=(0.66, 0.42))
    for hh in (0.42, 0.9):
        if hh < 0.66:
            kit.add('metal', limb('clamp', (-0.16, -0.098, hh), (-0.07, -0.098, hh), 0.03, 0.014), RUST)
    kit.add('metal', limb('clamp2', (0.0, -0.105, 0.6), (0.0, -0.105, 0.72), 0.014, 0.03), RUST)
    bib(kit, 0.0, 0.02, 0.66, handle='lever', seed=seed + 6)
    # a washing stone on the rim and a half brick inside the trough as a bucket rest
    kit.add('brick', paint(wb('tw_wash', -0.4, -0.18, 0.3, 0.4, 0.38, 0.43, 0.012), Wear(0x9c8c7e, damp=0, splash=0, fade=0.15, seed=7, grime=0.3), 8))


def stand(kit, seed=2):
    sw = Wear(CEMENT_D, damp=0, splash=0, wet=[(-0.25, 0.25, 0.3, 0.6), (0.25, 0.45, 0.45, 0.6)], fade=0.08, seed=seed, grime=0.3)
    apron(kit, 'ts_slab', -0.5, 0.5, -0.32, 0.72, sw, crack_x=-0.14)
    # chamfered plinth: a body and a narrower cap step
    pw = Wear(CEMENT, damp=0.12, splash=0.1, wet=[(-0.2, 0.2, 0.2, 0.3)], fade=0.15, seed=seed + 1, grime=0.3,
              streaks=[(0.0, 0.3, 0.05, 0.04, RUST, 0.35)])
    for nm, a, h0, h1, bv in (('ts_plinth', 0.2, 0.04, 0.24, 0.012), ('ts_plinthcap', 0.165, 0.235, 0.29, 0.01)):
        p = wb(nm, -a, a, -a, a, h0, h1, bv)
        slice_obj(p, sx=0.06, sy=0.06, sz=0.04)
        kit.add('plaster', paint(p, pw, seed + 2))
    kit.add('metal', cyl('ts_flange', 0, 0, 0.29, 0.305, 0.05, 0.05, seg=10), RUST)
    galv_run(kit, [(0.0, 0.0, 0.3), (0.0, 0.0, 0.84), (0.0, 0.13, 0.84)], seed=seed + 3, joints_h=(0.84, 0.34))
    kit.add('galv', paint(cyl('ts_cap', 0, 0, 0.87, 0.9, 0.026, 0.02, seg=10), metal_wear(GALV_D, seed=seed), 4))
    bib(kit, 0.0, 0.13, 0.84, handle='cross', seed=seed + 4, cloth=0xc9b49a)
    # catch basin under the spout, drain notch south, a brick as a bucket rest
    bw = Wear(CEMENT, damp=0.0, splash=0, wet=[(-0.25, 0.25, 0.55, 0.62)], seed=seed + 5, grime=0.35,
              streaks=[(0.0, 0.15, 0.045, 0.05, SCALE, 0.45)], waterline=(0.115, -0.2, 0.2, 0.14, 0.52))
    hollow(kit, 'ts_basin', -0.22, 0.22, 0.12, 0.56, 0.04, 0.15, 0.05, 0.115, bw, chip='nw', notch=('S', -0.06, 0.04))
    kit.add('brick', paint(wb('ts_rest', -0.07, 0.09, 0.16, 0.27, 0.09, 0.155, 0.01), Wear(0x9a8a7c, damp=0.13, splash=0, seed=9, grime=0.3), 9))


def pyaau(kit, seed=3):
    aw = Wear(CEMENT_D, damp=0, splash=0, wet=[(-0.6, 0.6, 0.5, 0.62), (0.62, 0.8, 0.05, 0.35)], fade=0.08, seed=seed, grime=0.3)
    apron(kit, 'tp_apron', -0.78, 0.82, -0.36, 0.78, aw, crack_x=0.3)
    # exposed brick pillar; a limewashed front panel; cement coping
    bw = Wear(BRICKT, damp=0.3, splash=0.14, wet=[(-0.6, 0.6, 0.0, 0.05)], fade=0.05, seed=seed, grime=0.25,
              streaks=[(0.3, 1.1, 0.75, 0.03, 0x6a5a4c, 0.3)])
    brick_core(kit, 'tp_pillar', -0.62, 0.62, -0.3, 0.0, 0.0, 1.1, bw)
    lw = Wear(LIME, damp=0.3, splash=0.0, fade=0.1, seed=seed + 1, grime=0.12,
              streaks=[(-0.3, 0.62, 0.26, 0.04, 0x6c7066, 0.55), (0.3, 0.62, 0.26, 0.04, 0x6c7066, 0.55), (0.16, 0.64, 0.4, 0.02, RUST, 0.6), (-0.16, 0.64, 0.45, 0.02, RUST, 0.6)])
    lime_skin(kit, 'tp_skin', -0.58, 0.58, 0.0, 0.26, 1.04, lw, seed + 2)
    cop = wb('tp_cop', -0.67, 0.67, -0.35, 0.05, 1.1, 1.17, 0.012)
    slice_obj(cop, sx=0.15)
    kit.add('plaster', paint(cop, Wear(CEMENT, damp=0, splash=0, fade=0.22, seed=seed + 3, grime=0.35), seed + 3))
    # long hollow basin, drain notch on the east wall, chipped south-west corner
    tw = Wear(CEMENT, damp=0.0, splash=0, wet=[(-0.6, 0.6, 0.48, 0.55), (0.58, 0.7, 0.05, 0.3)], seed=seed + 4, grime=0.35,
              streaks=[(-0.3, 0.24, 0.045, 0.045, SCALE, 0.5), (0.3, 0.24, 0.045, 0.045, SCALE, 0.5)], waterline=(0.15, -0.55, 0.55, 0.06, 0.44))
    hollow(kit, 'tp_basin', -0.6, 0.6, 0.0, 0.5, 0.045, 0.24, 0.06, 0.15, tw, chip='sw', notch=('E', 0.12, 0.24))
    # drain lip sticking out of the notch
    kit.add('plaster', paint(wb('tp_lip', 0.6, 0.7, 0.13, 0.23, 0.19, 0.205, 0.004), Wear(CEMENT_D, damp=0, splash=0, wet=[(0.6, 0.7, 0.13, 0.23)], seed=5), 5))
    # riser up the west side, header along the front, two taps
    galv_run(kit, [(-0.66, -0.12, 0.04), (-0.66, -0.12, 0.64), (-0.66, 0.05, 0.64), (0.4, 0.05, 0.64)], seed=seed + 5, joints_h=(0.64,))
    kit.add('galv', paint(tube('tp_endcap', (0.4, 0.05, 0.64), (0.43, 0.05, 0.64), 0.027, seg=8), metal_wear(GALV_D, joints=(0.64,), seed=seed), 12))
    for xx in (-0.3, 0.3):
        kit.add('galv', paint(tube('tee', (xx, 0.05, 0.64), (xx, 0.1, 0.64), 0.026, seg=10), metal_wear(GALV_D, seed=seed), 6))
        kit.add('metal', limb('hold', (xx + 0.14, 0.0, 0.64), (xx + 0.14, 0.075, 0.64), 0.05, 0.016), RUST)
    bib(kit, -0.3, 0.1, 0.64, handle='lever', seed=seed + 6)
    bib(kit, 0.3, 0.1, 0.64, handle='wheel', seed=seed + 7)
    # steel tumbler on a chain from a hook in the panel
    kit.add('metal', limb('hook', (0.5, 0.0, 0.9), (0.5, 0.05, 0.9), 0.012), IRON)
    for i in range(6):
        hh = 0.88 - i * 0.034
        kit.add('metal', ring('link%d' % i, 0.5 + 0.004 * i, 0.06, hh, 0.012, 0.0028, axis='z' if i % 2 else 'x', seg=8, tube=4), IRON)
    st = metal_wear(0xa7aaa8, seed=seed + 8)
    kit.add('galv', paint(lathe('glass', 0.52, 0.07, [(0.0, 0.59), (0.028, 0.59), (0.031, 0.6), (0.036, 0.685), (0.0365, 0.689), (0.032, 0.689), (0.0, 0.605)], seg=12), st, 9))
    # a clay lid on the coping, as if a matka sat there in summer
    kit.add('paint', paint(lathe('lid', -0.4, -0.15, [(0.0, 1.17), (0.09, 1.17), (0.11, 1.19), (0.08, 1.2), (0.02, 1.215), (0.0, 1.215)], seg=14),
                           lambda X, Z, H, n, r: lin(0xa9654a) * (0.9 + 0.15 * fbm(X * 30, Z * 30)), 10))


BUILDERS = {'wall': wall, 'stand': stand, 'pyaau': pyaau}


def make(which):
    for t, fn in BUILDERS.items():
        if which not in ('all', t):
            continue
        kit = new_kit()
        fn(kit)
        kit.finalize(os.path.join(ROOT, 'tmp', 'tap_%s_v2_raw.glb' % t), {}, drift_amp=0.05, ao_strength=0.55)


def render():
    """Preview: the three in a row on bare ground, daylight. Writes docs/shots/assets-taps/."""
    kit = new_kit()
    for fn, dx in ((wall, -1.8), (stand, 0.0), (pyaau, 1.8)):
        n0 = len(kit.records)
        fn(kit)
        for _, o, _ in kit.records[n0:]:
            o.data.transform(Matrix.Translation((dx, 0, 0)))
            if o.name in COLS:
                pass
    kit.add('plaster', wb('ground', -3.2, 3.2, -1.5, 2.5, -0.1, -0.015, 0.01), 0x8a7a62)
    p = os.path.join(ROOT, 'tmp', 'taps_preview_raw.glb')
    kit.finalize(p, {}, drift_amp=0.05, ao_strength=0.55)
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
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-taps')
    os.makedirs(d, exist_ok=True)
    # water side is +wz = Blender -y: the camera stands at negative Blender y looking toward +y
    for name, loc, look, lens in [('a_all_three', (0.6, -4.2, 1.9), (0.0, 0.0, 0.45), 35),
                                  ('b_wall_tap_close', (-1.3, -1.25, 1.05), (-1.8, 0.0, 0.45), 40),
                                  ('c_stand_close', (0.55, -1.25, 1.05), (0.0, -0.2, 0.45), 40),
                                  ('d_pyaau_close', (2.35, -1.75, 1.15), (1.85, -0.1, 0.5), 38)]:
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
