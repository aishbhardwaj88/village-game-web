"""
Player bicycle (3 Nov): an Indian roadster of the old heavy black kind (28 inch wheels, diamond frame, rod brakes, full
mudguards, rear carrier, half chain case, swept-back upright bar, ting-ting bell, sprung leather saddle, folded rear stand).
No lettering, no badge, no transfers anywhere.

FACING: front wheel toward +Z (glTF/three.js +Z = arch frame +wz). Origin on the ground (y=0) at the midpoint between the
two axles. Wheels touch y=0. Wheelbase 1.04 m, overall ~1.79 m incl. mudguards, bar top ~1.04 m, saddle top ~0.99 m.
src/playerCycle.js loads it as-is (no rotation, no scale).

Two draw calls:
  hb_metal : every steel part, the shared 'metal' library set (repeat 1.0). Kind 'steel' is ROUTED into the metal group so
             it takes this script's own wear colouring instead of arch.rust_steel (which rusts a whole object from the
             bottom up, right for a hand pump, wrong for a painted frame).
  hb_main  : rubber and leather (tyres, grips, pedal blocks, brake pads, saddle) on the shared plaster set (repeat 0.5),
             whose roughness sits ~0.9, the rubber value.
Weathering is per-vertex colour (arch.colorize is wrapped for objects tagged obj['wear']): worn black paint with sun-faded
tops, dust rising from the ground, chipped edges showing rust or bare steel; dull chrome rims/hubs with rust spots; a rusty
oily chain; dusty grey-black tyres; leather worn paler where it is sat on. Then Kit.finalize's dirty-vertex AO and drift.

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_player_cycle.py [-- render]
  node tools/shrink.js tmp/player_cycle_v2_raw.glb public/assets/models/player_cycle_v2.glb 999999
  node tools/strip-textures.mjs --relink public/assets/models/player_cycle_v2.glb public/assets/models/player_cycle_v2.glb
--relink, NOT the default strip: src/playerCycle.js does not call swapShared(), so the textures must come back through the
loader plugin (src/sharedTextures.js), which every getGLTFLoader() load gets. make.sh's *_v2 rule would strip them for good.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector
from common import limb, cyl, prism_x, new_bmesh_obj, load_pbr_material, box_uv, hex_to_linear_rgb
import arch
from arch import Kit, ring

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RND = random.Random(1903)

# ---------------------------------------------------------------- dimensions (wx, wz, h), metres
HY = 0.355            # axle height = tyre outer radius (28 x 1 1/2)
FZ, RZ = 0.52, -0.52  # front / rear axle (wz)
BB = (0.0, -0.06, 0.275)
SC = (0.0, -0.285, 0.82)          # seat cluster
CROWN = (0.0, 0.29, 0.724)        # fork crown, on a 66 deg steering axis with 60 mm rake
AX = (-0.407, 0.914)              # steering axis, upward (wz, h)
HT_TOP = (0.0, 0.229, 0.861)

# ---------------------------------------------------------------- colours (sRGB hex; nothing at full black or white)
PAINT = 0x252628      # old black enamel
CHROME = 0x9a9c9a     # dull nickel/chrome
RUBBER = 0x2f2e2c
LEATHER = 0x3d2c20
CHAIN = 0x4a3526


# ---------------------------------------------------------------- geometry helpers
def B(p):
    return Vector((p[0], -p[1], p[2]))


def tube(name, p0, p1, r, sides=6, caps=False, r1=None):
    """Round-ish tube between two (wx, wz, h) points, `sides` facets, open ends unless caps."""
    a, b = B(p0), B(p1)
    d = (b - a).normalized()
    up = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 0, 1))
    u = d.cross(up).normalized()
    v = d.cross(u).normalized()
    r1 = r if r1 is None else r1
    bm = bmesh.new()
    rings = []
    for c, rr in ((a, r), (b, r1)):
        rings.append([bm.verts.new(c + (u * math.cos(i / sides * math.tau) + v * math.sin(i / sides * math.tau)) * rr) for i in range(sides)])
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_bmesh_obj(name, bm)
    if sides >= 6:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def ribbons(name, segs, w):
    """Flat strips (spokes): each (p0, p1) becomes one quad facing the axle (wx), w wide. Material is double-sided."""
    bm = bmesh.new()
    for p0, p1 in segs:
        a, b = B(p0), B(p1)
        d = (b - a).normalized()
        s = d.cross(Vector((1, 0, 0))).normalized() * (w * 0.5)
        bm.faces.new([bm.verts.new(x) for x in (a - s, b - s, b + s, a + s)])
    return new_bmesh_obj(name, bm)


def annulus(name, cz, r0, r1, n):
    """Flat ring in the wheel plane (wx = 0) around an axle at (wz=cz, h=HY): n quads, double-sided material."""
    bm = bmesh.new()
    inner = [bm.verts.new(B((0.0, cz + r0 * math.cos(i / n * math.tau), HY + r0 * math.sin(i / n * math.tau)))) for i in range(n)]
    outer = [bm.verts.new(B((0.0, cz + r1 * math.cos(i / n * math.tau), HY + r1 * math.sin(i / n * math.tau)))) for i in range(n)]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((inner[i], inner[j], outer[j], outer[i]))
    return new_bmesh_obj(name, bm)


def mudguard(name, cz, R, a0, a1, n, half=0.033, curl=0.013):
    """Open C-section sheet arc around an axle at (wz=cz, h=HY), angles in degrees (0 = forward +wz, 90 = up)."""
    bm = bmesh.new()
    rows = []
    for k in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * k / n)
        ca, sa = math.cos(a), math.sin(a)
        row = []
        for wx, dr in ((-half, -curl), (-half * 0.55, -curl * 0.15), (half * 0.55, -curl * 0.15), (half, -curl)):
            rr = R + dr
            row.append(bm.verts.new(B((wx, cz + rr * ca, HY + rr * sa))))
        rows.append(row)
    for k in range(n):
        for i in range(3):
            bm.faces.new((rows[k][i], rows[k][i + 1], rows[k + 1][i + 1], rows[k + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_bmesh_obj(name, bm)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def saddle(name):
    """Sprung leather saddle, nose to +wz: a loft of closed 6-point sections."""
    st = [(-0.425, 0.090, 0.972, 0.946), (-0.37, 0.104, 0.990, 0.944), (-0.27, 0.058, 0.984, 0.951),
          (-0.170, 0.016, 0.970, 0.956)]
    bm = bmesh.new()
    secs = []
    for wz, hw, top, bot in st:
        pts = [(-hw, bot + 0.006), (-hw * 0.62, top - 0.007), (0.0, top), (hw * 0.62, top - 0.007), (hw, bot + 0.006), (0.0, bot)]
        secs.append([bm.verts.new(B((x, wz, h))) for x, h in pts])
    for k in range(len(secs) - 1):
        for i in range(6):
            j = (i + 1) % 6
            bm.faces.new((secs[k][i], secs[k][j], secs[k + 1][j], secs[k + 1][i]))
    bm.faces.new(secs[0])
    bm.faces.new(list(reversed(secs[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_bmesh_obj(name, bm)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def on_axis(base, t):
    return (base[0], base[1] + AX[0] * t, base[2] + AX[1] * t)


# ---------------------------------------------------------------- weathering (vertex colour)
def _fr(x):
    return x - math.floor(x)


def _hash(x, y, z, s):
    return _fr(math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453)


def _lerp(c, d, t):
    t = max(0.0, min(1.0, t))
    return [c[i] + (d[i] - c[i]) * t for i in range(3)]


_LIN = {}


def L(hexc):
    if hexc not in _LIN:
        _LIN[hexc] = hex_to_linear_rgb(hexc)
    return list(_LIN[hexc])


DUST, FADE, CHIP_RUST, BARE, RUST_SPOT, OIL = 0x6e6252, 0x46484b, 0x6a4430, 0x7c7c77, 0x7a4a2c, 0x2b2522


def wear_colour(obj, base_hex, mode, seed):
    me = obj.data
    if 'Base' not in me.color_attributes:
        me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    layer = me.color_attributes['Base']
    base = L(base_hex)
    unit = 1.0 + RND.uniform(-0.05, 0.05)      # per-part tone, so no two parts are the same black
    out = []
    for lp in me.loops:
        v = me.vertices[lp.vertex_index]
        x, y, z = v.co
        n = v.normal
        j = 1.0 + (_hash(x, y, z, seed) - 0.5) * 0.10
        c = [ch * unit * j for ch in base]
        low = max(0.0, (0.45 - z) / 0.45)
        if mode == 'paint':
            c = _lerp(c, L(FADE), 0.30 * max(0.0, n.z))                                  # sun-faded upper faces
            c = _lerp(c, L(DUST), 0.10 + 0.45 * low + 0.15 * max(0.0, n.z))            # dust, heavier near the road
            h = _hash(round(x * 55), round(y * 55), round(z * 55), seed + 3)
            if h > 0.84:                                                                 # chips: rust mostly, some bare steel
                c = _lerp(c, L(CHIP_RUST if h < 0.95 else BARE), 0.75)
        elif mode == 'chrome':
            spot = math.sin(x * 41 + seed) * math.sin(y * 37 + z * 29) * math.sin(z * 53 + x * 13)
            c = _lerp(c, L(RUST_SPOT), max(0.0, spot - 0.15) * 1.6 + 0.12)
            c = _lerp(c, L(DUST), 0.10 + 0.35 * low)
        elif mode == 'rust':
            c = _lerp(c, L(OIL), 0.5 + 0.5 * math.sin(x * 90 + y * 140 + z * 120))
        elif mode == 'rubber':
            c = _lerp(c, L(DUST), 0.12 + 0.40 * low)
        elif mode == 'leather':
            top = max(0.0, n.z - 0.6) * 2.5
            c = _lerp(c, L(0x5e4634), 0.6 * top)                                          # sat-on sheen worn paler
            c = _lerp(c, L(DUST), 0.08)
        out.extend((min(c[0], 0.85), min(c[1], 0.85), min(c[2], 0.85), 1.0))
    layer.data.foreach_set('color', out)
    me.color_attributes.active_color = layer


_orig_colorize = arch.colorize


def colorize_hook(obj, hex_color, attr='Col'):
    mode = obj.get('wear')
    if mode and attr == 'Base':
        wear_colour(obj, hex_color, mode, seed=len(obj.name) + RND.randint(0, 999))
        return obj
    return _orig_colorize(obj, hex_color, attr)


arch.colorize = colorize_hook   # Kit.finalize calls arch.colorize by its module global


# ---------------------------------------------------------------- the cycle
def build():
    kit = Kit(split_props=False, route={'steel': 'metal'})

    def S(o, col=PAINT, wear='paint'):
        o['wear'] = wear
        return kit.add('steel', o, col)

    def R(o, col=RUBBER, wear='rubber'):
        o['wear'] = wear
        return kit.add('rubber', o, col)

    # wheels: tyre, rim, hub, 32 tangent-laced spokes on two flanges
    for wz, hub_w in ((FZ, 0.042), (RZ, 0.055)):
        R(ring('tyre', 0.0, wz, HY, 0.336, 0.019, axis='x', seg=16, tube=4))
        S(annulus('rim', wz, 0.300, 0.322, 16), CHROME, 'chrome')   # flat band in the wheel plane: the sidewall is what reads
        S(tube('hub', (-hub_w, wz, HY), (hub_w, wz, HY), 0.022 if wz > 0 else 0.027, 8, caps=True), 0x85857f, 'chrome')
        segs = []
        for i in range(28):
            side = 1 if i % 2 == 0 else -1
            ar = i / 28 * math.tau
            ah = ar + (0.55 if (i // 2) % 2 == 0 else -0.55)
            segs.append(((side * 0.030, wz + 0.028 * math.cos(ah), HY + 0.028 * math.sin(ah)),
                         (side * 0.002, wz + 0.302 * math.cos(ar), HY + 0.302 * math.sin(ar))))
        S(ribbons('spokes', segs, 0.0045), 0x8b8c89, 'chrome')

    # frame: diamond, round tubes
    ht_bot = on_axis(CROWN, 0.012)
    S(tube('head', ht_bot, on_axis(HT_TOP, 0.012), 0.020, 6))
    S(tube('top', SC, (0.0, 0.236, 0.836), 0.0145, 6))
    S(tube('down', BB, (0.0, 0.278, 0.752), 0.0165, 6))
    S(tube('seat', BB, (SC[0], SC[1] - 0.004, SC[2] + 0.01), 0.0145, 6))
    S(tube('bb', (-0.04, BB[1], BB[2]), (0.04, BB[1], BB[2]), 0.022, 6))
    for s in (-1, 1):
        S(tube('chainstay', (s * 0.03, BB[1] - 0.01, BB[2]), (s * 0.056, RZ, HY), 0.0095, 4))
        S(tube('seatstay', (s * 0.022, SC[1] - 0.01, SC[2] - 0.02), (s * 0.056, RZ, HY), 0.0085, 4))
        a0 = (s * 0.045, CROWN[1], CROWN[2])
        bend = (s * 0.045, 0.416, 0.441)
        S(tube('fork', a0, bend, 0.012, 5, r1=0.010))
        S(tube('fork', bend, (s * 0.045, FZ, HY), 0.010, 5, r1=0.008))
    S(tube('crown', (-0.055, CROWN[1], CROWN[2]), (0.055, CROWN[1], CROWN[2]), 0.016, 6, caps=True))

    # seat post, saddle with two coil springs and a clip
    post_top = (0.0, SC[1] - 0.05, SC[2] + 0.12)
    S(tube('post', SC, post_top, 0.011, 5), CHROME, 'chrome')
    R(saddle('saddle'), LEATHER, 'leather')
    S(tube('clip', post_top, (0.0, -0.19, 0.952), 0.007, 4), 0x2c2c2d)
    S(tube('clip_x', (-0.065, -0.375, 0.905), (0.065, -0.375, 0.905), 0.008, 4), 0x2c2c2d)
    for s in (-1, 1):
        S(tube('spring', (s * 0.062, -0.385, 0.902), (s * 0.062, -0.39, 0.948), 0.015, 5, r1=0.013), CHROME, 'chrome')

    # stem, swept-back roadster bar, grips, bell
    st_top = on_axis(HT_TOP, 0.10)
    C = (0.0, 0.245, 0.965)
    S(tube('stem', HT_TOP, st_top, 0.012, 5), CHROME, 'chrome')
    S(tube('stem_x', st_top, C, 0.011, 5), CHROME, 'chrome')
    S(tube('bar_c', (-0.10, C[1], C[2]), (0.10, C[1], C[2]), 0.0115, 6))
    for s in (-1, 1):
        p = [(s * 0.10, C[1], C[2]), (s * 0.205, 0.205, 0.982), (s * 0.268, 0.120, 1.013)]
        for k in range(2):
            S(tube('bar', p[k], p[k + 1], 0.0115, 6))
        R(tube('grip', (s * 0.266, 0.125, 1.012), (s * 0.292, 0.030, 1.022), 0.0165, 6, caps=True), 0x3a3029, 'rubber')
        # rod-brake lever under the grip and its rod back along the bar
        S(tube('lever', (s * 0.245, 0.170, 0.992), (s * 0.282, 0.055, 0.995), 0.006, 4), 0x2d2e30)
        S(tube('bar_rod', (s * 0.245, 0.170, 0.992), (s * 0.06, 0.262, 0.948), 0.0042, 4), 0x2d2e30)
    S(cyl('bell', 0.13, C[1], 0.976, 1.001, 0.029, 0.017, seg=8), 0xa2a29a, 'chrome')
    S(tube('bell_lever', (0.13, C[1] - 0.01, 0.985), (0.17, C[1] - 0.04, 0.99), 0.004, 4), 0x8d8d86, 'chrome')

    # rod brakes. Front (right lever): rod down the front of the head tube to the crown, stirrup up the fork blades,
    # pads pulling up under the rim. Rear (left lever): rod down to the top tube, along under it, down to the rear stirrup.
    ROD = 0x2a2b2d
    S(tube('rod_f', (0.06, 0.262, 0.948), (0.03, 0.312, 0.745), 0.0045, 4), ROD)
    S(tube('rod_r0', (-0.06, 0.262, 0.948), (-0.028, 0.262, 0.80), 0.0045, 4), ROD)
    S(tube('rod_r1', (-0.028, 0.262, 0.80), (-0.028, -0.235, 0.782), 0.0045, 4), ROD)
    S(tube('rod_r2', (-0.028, -0.235, 0.782), (0.0, -0.335, 0.70), 0.0045, 4), ROD)
    for wz0, wz1, h0, h1 in ((0.300, 0.350, 0.712, 0.598), (-0.340, -0.392, 0.695, 0.608)):
        S(tube('stirrup_x', (-0.05, wz0, h0), (0.05, wz0, h0), 0.005, 4), ROD)
        for s in (-1, 1):
            S(tube('stirrup', (s * 0.05, wz0, h0), (s * 0.05, wz1, h1), 0.005, 4), ROD)
            R(tube('pad', (s * 0.03, wz1 - 0.012, h1 + 0.026), (s * 0.03, wz1 + 0.012, h1 + 0.010), 0.009, 4), 0x3a332c, 'rubber')

    # mudguards and stays, rear mud flap and reflector
    S(mudguard('guard_f', FZ, 0.378, 22, 205, 11))
    S(mudguard('guard_r', RZ, 0.378, 46, 196, 10))
    S(tube('flap', (0.0, RZ + 0.378 * math.cos(math.radians(196)), HY + 0.378 * math.sin(math.radians(196))),
           (0.0, -0.89, 0.16), 0.024, 4), 0x2e2c2a, 'rubber')
    R(tube('reflector', (0.0, -0.905, 0.43), (0.0, -0.912, 0.39), 0.016, 4, caps=True), 0x7e2b24, 'rubber')
    for s in (-1, 1):
        a = math.radians(40)
        S(tube('stay_f', (s * 0.044, FZ, HY), (s * 0.033, FZ + 0.37 * math.cos(a), HY + 0.37 * math.sin(a)), 0.0035, 4), ROD)
        a = math.radians(165)
        S(tube('stay_r', (s * 0.058, RZ, HY), (s * 0.033, RZ + 0.37 * math.cos(a), HY + 0.37 * math.sin(a)), 0.0035, 4), ROD)

    # rear carrier: two rails, four slats, legs to the rear axle, front feet to the seat stays
    CH = 0.778
    for s in (-1, 1):
        S(tube('rail', (s * 0.075, -0.27, CH), (s * 0.075, -0.80, CH), 0.0065, 4))
        S(tube('leg', (s * 0.075, -0.79, CH), (s * 0.062, RZ, HY), 0.0055, 4))
        S(tube('foot', (s * 0.075, -0.27, CH), (s * 0.024, -0.30, 0.795), 0.005, 4))
    for wz in (-0.36, -0.58, -0.79):
        S(tube('slat', (-0.078, wz, CH + 0.004), (0.078, wz, CH + 0.004), 0.006, 4))

    # drive: chainring, cranks, block pedals (right crank forward), lower chain run, half chain case
    S(tube('ring', (0.058, BB[1], BB[2]), (0.067, BB[1], BB[2]), 0.098, 10, caps=True), 0x5a5652, 'chrome')
    for s, dz in ((1, 0.17), (-1, -0.17)):
        end = (s * 0.088, BB[1] + dz, BB[2] - 0.01)
        S(tube('crank', (s * 0.072, BB[1], BB[2]), end, 0.011, 4), 0x6e6c66, 'chrome')
        R(limb('pedal', (s * 0.094, end[1], end[2]), (s * 0.19, end[1], end[2]), 0.075, 0.024), 0x34302b, 'rubber')
    S(tube('chain', (0.063, BB[1] - 0.005, BB[2] - 0.098), (0.063, RZ, HY - 0.045), 0.006, 4), CHAIN, 'rust')
    guard = [(0.06, 0.30), (0.035, 0.37), (-0.02, 0.405), (-0.08, 0.415), (-0.50, 0.445), (-0.555, 0.43), (-0.57, 0.40),
             (-0.55, 0.37), (-0.50, 0.36), (-0.14, 0.325), (-0.04, 0.285), (0.04, 0.255)]
    S(prism_x('chainguard', 0.082, 0.087, guard))

    # rear stand, folded up behind the wheel
    for s in (-1, 1):
        S(tube('stand', (s * 0.066, RZ, HY), (s * 0.066, -0.90, 0.53), 0.0065, 4))
    S(tube('stand_x', (-0.066, -0.90, 0.53), (0.066, -0.90, 0.53), 0.0065, 4))
    return kit


def tri_count(objs):
    t = 0
    for o in objs:
        o.data.calc_loop_triangles()
        t += len(o.data.loop_triangles)
    return t


# ---------------------------------------------------------------- preview render
def render(path):
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 96
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
    sun.rotation_euler = tuple(math.radians(x) for x in (50, 0, 60))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    # Blender frame (wx, -wz, h): the front (+wz) is Blender -Y. Camera on the right (+wx, chain side), a little ahead.
    loc, look = Vector((2.6, -1.3, 1.25)), Vector((0.0, 0.0, 0.52))
    cam.location = loc
    cam.data.lens = 42
    cam.rotation_euler = (look - loc).to_track_quat('-Z', 'Y').to_euler()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


if __name__ == '__main__':
    kit = build()
    kit.finalize(os.path.join(ROOT, 'tmp', 'player_cycle_v2_raw.glb'), {}, drift_amp=0.05, ao_strength=0.45)
    objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('hb_')]
    for o in objs:
        print('mesh', o.name, 'tris', tri_count([o]))
    print('TRIANGLES', tri_count(objs))
    if '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--'):]:
        render(os.path.join(ROOT, 'docs', 'shots', 'player-cycle-2026-11-03', 'a.png'))
