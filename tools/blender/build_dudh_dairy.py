"""
Dudh dairy + stable - built with arch.py's Kit to Places V1/dudh_dairy/LAYOUT.md (V2) and the approved
MAIN_dudh_dairy_back_top.png (TOP = layout authority) / MAIN_dudh_dairy_front_isometric.png / MAIN_dudh_dairy_sides.png.

Run:  tools/blender/make.sh dudh_dairy dudh_dairy_v2

Frame: site-local metres, +x east, +z south (front, toward the lane). Bare earth patch 18 x 12 m: x[-9,9] z[-6,6].
  LEFT-BACK   shop 7 wide x 5 deep, 4 m tall, white lime-wash, light-blue base band + roof lines, black tank on the flat roof; front FULLY
              open (roller shutter rolled up) with a full-width white-tile counter; blank cream board above the opening (text painted in-game);
              back wall = one wooden door + one barred window; the slogan band on the LEFT (lane-facing) side wall with a cow-and-calf picture.
  RIGHT-BACK  stable 6 x 4 m: wooden posts, thick thatch roof, cement feeding trough, tethering pegs/rings, straw bed.
  YARD        two benches + farmers' cans in front of the shop, chaff cutter with a big flywheel and a fodder pile, hand pump over a cement tub,
              dung cakes drying on a low mud wall + a dung stack, a charpai, clay pots, a bucket.
Cow and buffalo are capsule placeholders / hers; green fodder is organic (not built). Drawing notes are not built.
"""
import sys
import os
import math
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, join_objects, quad, hex_to_linear_rgb, ROOT
import arch
from arch import Kit, lathe, clay_pot, decal_material, ring, bicycle, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'dudh_dairy_v2_raw.glb')
# Phase 5b (2 Nov): the yard ground and every mark lying on it ride the library's packed-earth material BY NAME, exactly as the approved
# material board (build_material_board.py) renders it: the dryearth scan at repeat 1.0 x vertex colour. Kind 'earth' is routed into the
# otherwise unused 'jute' slot carrying that set. In the plaster set the runtime weathering (src/stagingYard.js addWeathering) desaturates
# and darkens everything below 0.7 m, which is why the painted stains, paths and wet patches read as one flat grey-brown.
kit = Kit(split_props=False, own=('metal', 'thatch'), wood_slot='props', route={'earth': 'jute'}, tex_override={'jute': ('dryearth', 1.0)})

BLUE = 0x8FBBD6
WHITE = 0xF4F1EA
TILE = 0xEFEFEA
CEMENT = 0xA9A69F
SH_X0, SH_X1, SH_Z0, SH_Z1 = -8.5, -1.5, -5.5, -0.5   # shop footprint 7 x 5
SH_H = 3.6                                              # wall height; roof slab to 3.85, parapet to 4.0
T = 0.25


def add(kind, o, c=None):
    kit.add(kind, o, c)
    return o


def steel(o, c=STEEL):
    return add('metal', o, c)


# ---------------------------------------------------------------------------------------------- decal: cow + calf picture
def cow_picture(u, v):
    x, y = u * 1.1, v * 0.8
    if x < 0.04 or x > 1.06 or y < 0.04 or y > 0.76:
        return (0.25, 0.1, 0.07, 1.0)
    def L(h):
        return tuple(((c / 255.0) ** 2.2) for c in ((h >> 16) & 255, (h >> 8) & 255, h & 255)) + (1.0,)
    def el(cx, cy, rx, ry):
        return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0
    if y < 0.2:
        return L(0x4F8F3A)
    for (ox, sc, body) in ((0.32, 1.0, 0xF4EFE4), (0.78, 0.55, 0xC98A4E)):
        px, py = (x - ox) / sc, (y - 0.15) / sc
        if el(ox + 0.0 * 0, 0, 1, 1) and False:
            pass
        if (px - 0.2) ** 2 / 0.2 ** 2 + (py - 0.2) ** 2 / 0.1 ** 2 <= 1.0:
            return L(0xB8793F) if (px - 0.12) ** 2 + (py - 0.22) ** 2 < 0.004 else L(body)
        if (px - 0.42) ** 2 / 0.06 ** 2 + (py - 0.27) ** 2 / 0.055 ** 2 <= 1.0:
            return L(body)
        if (0.05 < px < 0.09 or 0.13 < px < 0.17 or 0.26 < px < 0.3 or 0.34 < px < 0.38) and 0.0 < py < 0.15:
            return L(body)
        if 0.395 < px < 0.405 and 0.31 < py < 0.36:
            return L(0x6B4A2A)
    if el(0.95, 0.62, 0.07, 0.07):
        return L(0xF2B01E)
    return L(0xBFE0EC)


dmat = decal_material('hb_decal', (256, 192), cow_picture)


def wall_decal_W(x, z0, z1, h0, h1):
    """Picture on the outward (-x) face of the left wall."""
    o = quad('picture', [(x, z0, h0), (x, z1, h0), (x, z1, h1), (x, z0, h1)])
    uvl = o.data.uv_layers.new(name='UVMap')
    me = o.data
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uvl.data[loop.index].uv = ((-co.y - z0) / (z1 - z0), (co.z - h0) / (h1 - h0))
    me.materials.append(dmat)
    kit.extra.append(o)


# ---------------------------------------------------------------------------------------------- ground
# Phase 5 (2 Nov): the reviewer failed the dairy for a flat ground and spotless surfaces. The ground is now ONE displaced grid
# (0.25 m cells) in the library's packed-earth and mud-and-dung colours (build_material_board.py values, used by name, no new
# material): trodden wear paths sunk a little and darker, a damp zone and run-off trickle at the hand pump, the stable floor
# trampled to mud and dung, paler dust at the patch rim. Small marks (milk splashes, hoof prints, dung pats, straw) are
# overlay geometry sitting on the same height function, so nothing floats or sinks.
EARTH, EARTH_LO = 0xC4B496, 0xB0A07E   # library 'packed_earth'
MUD, MUD_LO = 0x7E7058, 0x6A5C48       # library 'mud_dung'
rnd = random.Random(1907)
PX0, PX1, PZ0, PZ1 = -9.0, 9.0, -6.0, 6.0
GTOP = 0.04
# wear paths: (start, end, half-width) in site metres
PATHS = [((-5.0, 6.0), (-4.6, 1.1), 0.95),      # lane -> counter (the main customer track)
         ((-1.4, 6.0), (-1.2, 1.4), 0.55),      # lane -> the can line
         ((1.6, 6.0), (0.9, 4.7), 0.6),         # lane -> pump
         ((5.4, -1.2), (1.4, 3.2), 0.7),        # stable -> pump (cattle led to water)
         ((4.4, -1.2), (3.6, 0.5), 0.55),       # stable -> chaff cutter
         ((-2.0, 1.25), (5.8, 1.6), 0.5)]       # along the shop front to the stable
PUMP = (0.6, 3.8)


def _lin(h):
    return hex_to_linear_rgb(h)


def _seg_d(px, pz, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz)))
    return math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz)


def _smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def g_fields(x, z):
    """(height, wear, mud, wet, dust) of the yard ground at site (x, z)."""
    wobble = 0.18 * math.sin(x * 1.3 + z * 0.7) + 0.1 * math.sin(z * 2.9 - x * 1.7)
    wear = 0.0
    for a, b, w in PATHS:
        d = _seg_d(x, z, a, b)
        wear = max(wear, 1.0 - _smooth(w * (0.45 + wobble), w * (1.15 + wobble), d))
    # stable floor (x 3..9, z -5.5..-1.5) trampled to mud, spilling out in front where the cattle stand
    ins = min(x - 2.8, 9.0 - x, z + 5.8, -1.2 - z + 0.8 * (0.5 + 0.5 * math.sin(x * 1.9)))
    mud = _smooth(-0.3, 0.6, ins + 0.15 * math.sin(x * 3.3 + z * 2.1))
    # damp at the pump: wide wet halo plus a trickle running off toward the lane (+x, +z)
    dpx, dpz = x - PUMP[0], z - PUMP[1]
    wet = 1.0 - _smooth(0.9, 1.7 + 0.25 * math.sin(math.atan2(dpz, dpx) * 3 + 1.0), math.hypot(dpx, dpz))
    td = _seg_d(x, z, (PUMP[0] + 0.7, PUMP[1] + 0.6), (2.6 + 0.3 * math.sin(z * 2.0), 6.0))
    trickle = 1.0 - _smooth(0.08, 0.32, td)
    wet = max(wet, trickle)
    rim = min(x - PX0, PX1 - x, z - PZ0, PZ1 - z)
    dust = 1.0 - _smooth(0.1, 1.2, rim)
    swell = 0.012 * math.sin(x * 2.1 + 0.4) * math.cos(z * 1.7 + 1.1) + 0.006 * math.sin(x * 5.3 + z * 4.1) + 0.004 * math.sin(x * 9.1 - z * 7.3)
    h = GTOP + swell * (1.0 - 0.5 * wear) - 0.012 * wear - 0.014 * trickle + 0.01 * mud * math.sin(x * 4.7 + z * 3.9)
    if rim < 0.01:
        h = GTOP
    return h, wear, mud, wet, dust


def gh(x, z):
    return g_fields(x, z)[0]


def ground_colour(x, z):
    h, wear, mud, wet, dust = g_fields(x, z)
    patch = 0.5 + 0.5 * math.sin(x * 0.9 + 0.3) * math.sin(z * 1.1 + 1.7) + 0.15 * math.sin(x * 3.7 + z * 2.3)
    a, b = _lin(EARTH), _lin(EARTH_LO)
    c = [a[i] + (b[i] - a[i]) * max(0.0, min(1.0, patch)) for i in range(3)]
    worn = [v * 0.86 for v in b]                                       # compacted, darker trodden earth
    c = [c[i] + (worn[i] - c[i]) * 0.75 * wear for i in range(3)]
    m0, m1 = _lin(MUD), _lin(MUD_LO)
    dung = 0.5 + 0.5 * math.sin(x * 2.3 + 1.0) * math.cos(z * 2.9)
    mc = [m0[i] + (m1[i] - m0[i]) * dung for i in range(3)]
    c = [c[i] + (mc[i] - c[i]) * mud for i in range(3)]
    c = [v * (1.0 - 0.42 * wet) for v in c]                            # damp earth darkens
    c = [v * (1.0 + 0.1 * dust) for v in c]                            # paler dust on the rim
    # phase 5b: big soft blotches so 18 m of yard is never one tone - darker old damp/dung-trodden patches, paler sun-dried dust patches
    bl = math.sin(x * 0.61 + 1.3) * math.sin(z * 0.83 + 0.2) + 0.6 * math.sin(x * 1.37 - z * 0.91 + 2.1)
    dark = _smooth(0.55, 1.1, bl)
    pale = _smooth(0.5, 1.05, -bl) * (1.0 - wet)
    c = [v * (1.0 - 0.22 * dark) for v in c]
    c = [v * (1.0 + 0.12 * pale) for v in c]
    n = 1.0 + 0.07 * math.sin(x * 13.1 + z * 7.7) * math.sin(z * 11.3 - x * 3.1)
    return tuple(min(1.0, v * n) for v in c) + (1.0,)


def build_ground():
    import bmesh
    from common import new_bmesh_obj
    step = 0.25
    nx, nz = int(round((PX1 - PX0) / step)), int(round((PZ1 - PZ0) / step))
    bm = bmesh.new()
    grid = [[None] * (nz + 1) for _ in range(nx + 1)]
    for i in range(nx + 1):
        for j in range(nz + 1):
            x, z = PX0 + i * step, PZ0 + j * step
            grid[i][j] = bm.verts.new((x, -z, gh(x, z)))
    for i in range(nx):
        for j in range(nz):
            bm.faces.new((grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j], grid[i][j]))   # wound so the normal faces up
    # skirt down to -0.08 round the rim
    rimv = [grid[i][0] for i in range(nx + 1)] + [grid[nx][j] for j in range(1, nz + 1)] + \
           [grid[i][nz] for i in range(nx - 1, -1, -1)] + [grid[0][j] for j in range(nz - 1, 0, -1)]
    low = [bm.verts.new((v.co.x, v.co.y, -0.08)) for v in rimv]
    for k in range(len(rimv)):
        k2 = (k + 1) % len(rimv)
        f = bm.faces.new((rimv[k], rimv[k2], low[k2], low[k]))
        f.normal_update()
        cm = f.calc_center_median()
        if f.normal.x * cm.x + f.normal.y * cm.y < 0:
            f.normal_flip()
    bm.normal_update()
    for f in bm.faces:
        if f.normal.z > 0.5 and f.calc_center_median().z > 0:
            f.smooth = True
    layer = bm.loops.layers.color.new('Base')
    for f in bm.faces:
        for lp in f.loops:
            co = lp.vert.co
            col = ground_colour(co.x, -co.y)
            if co.z < 0:
                col = tuple(v * 0.8 for v in col[:3]) + (1.0,)
            lp[layer] = col
    o = new_bmesh_obj('dairy_ground', bm)
    add('earth', o, EARTH)
    add('trim', wb('step_pad', -6.2, -2.2, -0.5, 0.45, 0, 0.1, 0.01), CEMENT)           # cement apron under the counter


# library earth_ground() would re-subdivide and recolour the grid; the dairy grid already carries its per-vertex packed-earth colour
_lib_earth_ground = arch.earth_ground


def _earth_ground(obj, base_hex, seed=0):
    if obj.name.startswith('dairy_ground'):
        return True
    return _lib_earth_ground(obj, base_hex, seed)


arch.earth_ground = _earth_ground

# Kit's dirty-vertex AO normalises cavity over the whole joined mesh, so the yard grid's gentle swells came out as big dark
# mottles and every lone decal quad (stain, streak, splash) at a flat ~0.75. The dairy's ground and its decals carry their own
# painted weathering, so after the bake their AO is reset to clean; walls, props and roofs keep the baked AO untouched.
_lib_dirt = arch.bake_dirty_vertex_colors


def _dirt(obj, *a, **k):
    _lib_dirt(obj, *a, **k)
    me = obj.data
    ao = me.color_attributes.get('AO')
    if ao is None:
        return
    use = [0] * len(me.vertices)
    for p in me.polygons:
        for vi in p.vertices:
            use[vi] += 1
    for p in me.polygons:
        lone = all(use[vi] == 1 for vi in p.vertices)
        yard = p.normal.z > 0.7 and p.center.z < 0.075 and abs(p.center.x) < 9.05 and abs(p.center.y) < 6.05
        if lone or yard:
            for li in p.loop_indices:
                ao.data[li].color = (1.0, 1.0, 1.0, 1.0)


arch.bake_dirty_vertex_colors = _dirt


def blob(name, cx, cz, h, rx, rz, seed, n=10, rough=0.22, ang=0.0):
    """A flat irregular patch (stain, splash, puddle) at height h."""
    r = random.Random(seed)
    ph = [r.uniform(0, math.tau) for _ in range(3)]
    ca, sa = math.cos(ang), math.sin(ang)
    pts = []
    for i in range(n):
        a = i / n * math.tau
        k = 1.0 + rough * (0.6 * math.sin(2 * a + ph[0]) + 0.3 * math.sin(3 * a + ph[1]) + 0.15 * math.sin(5 * a + ph[2]))
        u, v = rx * k * math.cos(a), rz * k * math.sin(a)
        pts.append((cx + u * ca - v * sa, cz + u * sa + v * ca, h))
    o = quad(name, pts)
    if o.data.polygons[0].normal.z < 0:
        o.data.flip_normals()
    return o


def ground_blob(name, cx, cz, rx, rz, colour, ang=0.0, lift=0.005, n=10, rough=0.22):
    r = max(rx, rz)
    h = max(gh(cx + dx * r, cz + dz * r) for dx, dz in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (0.7, 0.7), (-0.7, -0.7), (0.7, -0.7), (-0.7, 0.7)))
    return add('earth', blob(name, cx, cz, h + lift, rx, rz, rnd.randint(0, 99999), n=n, rough=rough, ang=ang), colour)


def jit(hexc, amt=0.06):
    v = 1.0 + rnd.uniform(-amt, amt)
    out = 0
    for sh in (16, 8, 0):
        c = (hexc >> sh) & 0xff
        out = (out << 8) | int(max(10, min(240, c * v * (1.0 + rnd.uniform(-amt, amt) * 0.4))))
    return out


def build_ground_marks():
    # milk splashes and dribbles: where cans are poured at the counter, along the can line, at the hanging scale's drip
    for _ in range(14):
        x, z = rnd.uniform(-6.0, -2.4), rnd.uniform(0.52, 1.5)
        ground_blob('milk_splash', x, z, rnd.uniform(0.05, 0.16), rnd.uniform(0.04, 0.11), jit(0xDDD8C8, 0.04), rnd.uniform(0, 3), n=9, rough=0.4)
    for _ in range(10):
        x, z = rnd.uniform(-2.2, 0.4), rnd.uniform(0.5, 1.4)
        ground_blob('milk_splash', x, z, rnd.uniform(0.04, 0.12), rnd.uniform(0.03, 0.08), jit(0xD6D0BE, 0.05), rnd.uniform(0, 3), n=8, rough=0.45)
    # milk dried on the cement apron (pale) and a wet dark patch where the counter is wiped down
    for _ in range(6):
        add('paint', blob('apron_milk', rnd.uniform(-6.0, -2.4), rnd.uniform(-0.3, 0.35), 0.104, rnd.uniform(0.06, 0.2), rnd.uniform(0.04, 0.12), rnd.randint(0, 9999), n=9, rough=0.4), jit(0xE2DDCF, 0.03))
    add('paint', blob('apron_wet', -4.4, 0.1, 0.103, 0.7, 0.26, 77, n=12), 0x8E8A80)
    # damp grey puddle at the pump tub's drain corner and a few water-splash darks round the tub
    ground_blob('puddle', PUMP[0] + 1.0, PUMP[1] + 0.7, 0.42, 0.26, 0x5C5A50, ang=0.6, lift=0.003, n=12)
    ground_blob('puddle', PUMP[0] + 1.55, PUMP[1] + 1.25, 0.2, 0.12, 0x625E52, ang=0.9, lift=0.003)
    # hoof prints: cloven pairs along the cattle track stable -> pump and stable -> chaff cutter, and in the stable mud
    def hoof_track(a, b, n):
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz)
        ux, uz = dx / L, dz / L
        ang = math.atan2(uz, ux)
        for k in range(n):
            t = (k + rnd.uniform(-0.2, 0.2)) / n
            side = 0.16 if k % 2 else -0.16
            cx = a[0] + dx * t - uz * side + rnd.uniform(-0.05, 0.05)
            cz = a[1] + dz * t + ux * side + rnd.uniform(-0.05, 0.05)
            col = jit(0x6E5D47, 0.08)
            for s in (-1, 1):
                ground_blob('hoof', cx - uz * s * 0.028, cz + ux * s * 0.028, 0.045, 0.024, col, ang=ang, lift=0.004, n=7, rough=0.15)
    hoof_track((5.2, -1.0), (1.5, 3.0), 18)
    hoof_track((4.3, -1.0), (3.7, 0.3), 6)
    for _ in range(14):
        cx, cz = rnd.uniform(3.6, 8.4), rnd.uniform(-3.6, -1.4)
        a = rnd.uniform(0, math.tau)
        col = jit(0x584A38, 0.08)
        for s in (-1, 1):
            ground_blob('hoof', cx - math.sin(a) * s * 0.028, cz + math.cos(a) * s * 0.028, 0.045, 0.024, col, ang=a, lift=0.004, n=7, rough=0.15)
    # dung pats: low domed lumps by the stable and on the cattle track, plus flattened old dark smears
    for (x, z, r) in ((6.1, -1.0, 0.17), (2.9, 2.1, 0.13), (7.7, -1.25, 0.2), (4.0, -0.4, 0.12), (8.3, -2.9, 0.16)):
        add('earth', sphere('dung_pat', x, z, gh(x, z) - 0.01, r, r * rnd.uniform(0.8, 1.0), 0.045, 1), jit(0x4C3D2A, 0.08))
    for _ in range(9):
        ground_blob('dung_smear', rnd.uniform(1.8, 6.0), rnd.uniform(-1.0, 2.6), rnd.uniform(0.1, 0.22), rnd.uniform(0.07, 0.14), jit(0x5E4C36, 0.08), rnd.uniform(0, 3), n=9, rough=0.35)
    # drip line under the shop's roof-slab overhang (left, back, right): a pitted dark strip in the earth
    for (x0, z0, x1, z1) in ((SH_X0 - 0.3, SH_Z0 - 0.3, SH_X0 - 0.3, SH_Z1 + 0.25), (SH_X0 - 0.3, SH_Z0 - 0.3, SH_X1 + 0.3, SH_Z0 - 0.3), (SH_X1 + 0.3, SH_Z0 - 0.3, SH_X1 + 0.3, SH_Z1 + 0.25)):
        L = math.hypot(x1 - x0, z1 - z0)
        n = int(L / 0.32)
        for k in range(n):
            t = (k + 0.5) / n
            ground_blob('drip_pit', x0 + (x1 - x0) * t + rnd.uniform(-0.05, 0.05), z0 + (z1 - z0) * t + rnd.uniform(-0.05, 0.05), rnd.uniform(0.1, 0.2), rnd.uniform(0.06, 0.1), jit(0x8F7F62, 0.06), math.atan2(z1 - z0, x1 - x0), n=8, rough=0.3)
    # phase 5b: dark stains - cattle urine / dung wash in front of the stable and on the track to the pump, old spilt-water darks
    for _ in range(10):
        ground_blob('urine_stain', rnd.uniform(3.4, 8.4), rnd.uniform(-1.3, 0.4), rnd.uniform(0.18, 0.42), rnd.uniform(0.12, 0.3), jit(0x6A5A44, 0.08), rnd.uniform(0, 3), lift=0.003, n=11, rough=0.35)
    for _ in range(6):
        t = rnd.uniform(0.1, 0.9)
        ground_blob('track_stain', 5.4 + (1.4 - 5.4) * t + rnd.uniform(-0.4, 0.4), -1.2 + 4.4 * t + rnd.uniform(-0.4, 0.4), rnd.uniform(0.15, 0.32), rnd.uniform(0.1, 0.22), jit(0x75644B, 0.08), rnd.uniform(0, 3), lift=0.003, n=10, rough=0.35)
    for _ in range(7):
        ground_blob('old_stain', rnd.uniform(-8.0, 8.0), rnd.uniform(2.6, 5.6), rnd.uniform(0.25, 0.6), rnd.uniform(0.18, 0.4), jit(0x8E7C5E, 0.06), rnd.uniform(0, 3), lift=0.003, n=12, rough=0.3)
    # the wet patch at the pump: a dark soaked ring round the tub, slopped water where buckets are filled, two fresh splashes
    for k in range(9):
        a = k / 9 * math.tau + rnd.uniform(-0.2, 0.2)
        r = rnd.uniform(0.95, 1.2)
        ground_blob('pump_wet', PUMP[0] + r * math.cos(a), PUMP[1] + r * math.sin(a), rnd.uniform(0.38, 0.6), rnd.uniform(0.26, 0.4), jit(0x4A4034, 0.05), a, lift=0.0035, n=11, rough=0.3)
    ground_blob('pump_slop', PUMP[0] + 1.05, PUMP[1] - 0.6, 0.7, 0.48, 0x433A2F, 0.4, lift=0.004, n=13)
    for (dx, dz) in ((-1.1, 0.4), (0.3, 1.2)):
        ground_blob('pump_splash', PUMP[0] + dx, PUMP[1] + dz, 0.22, 0.12, 0x4E4438, rnd.uniform(0, 3), lift=0.0045, n=9, rough=0.5)
    # straw scattered thinly over the whole yard (blown off the cutter and the bhusa heap), not only round the cutter
    for _ in range(150):
        x, z = rnd.uniform(PX0 + 0.3, PX1 - 0.3), rnd.uniform(PZ0 + 0.3, PZ1 - 0.3)
        if SH_X0 - 0.1 < x < SH_X1 + 0.1 and SH_Z0 - 0.1 < z < SH_Z1 + 0.1:
            continue
        a = rnd.uniform(0, math.pi)
        L = rnd.uniform(0.07, 0.22)
        h = gh(x, z) + 0.008
        add('earth', limb('straw_bit', (x - math.cos(a) * L / 2, z - math.sin(a) * L / 2, h), (x + math.cos(a) * L / 2, z + math.sin(a) * L / 2, h + 0.004), 0.009, 0.006), rnd.choice((0xD6C184, 0xCBB474, 0xE0CF98, 0xBFA764)))
    # chopped straw and fodder bits blown about round the chaff cutter, the stable and the charpai
    for (cx, cz, sx, sz, n) in ((3.2, 1.2, 1.6, 1.1, 44), (6.0, -1.0, 2.8, 0.8, 34), (6.6, 1.8, 1.4, 0.9, 12)):
        for _ in range(n):
            x, z = cx + rnd.gauss(0, sx * 0.5), cz + rnd.gauss(0, sz * 0.5)
            if not (PX0 + 0.2 < x < PX1 - 0.2 and PZ0 + 0.2 < z < PZ1 - 0.2):
                continue
            a = rnd.uniform(0, math.pi)
            L = rnd.uniform(0.06, 0.2)
            h = gh(x, z) + 0.008
            c = rnd.choice((0xCDB57A, 0xC2A866, 0xD8C58E, 0xB59A5A)) if rnd.random() < 0.8 else rnd.choice((0x6F8A3A, 0x5E7A32))
            add('earth', limb('straw_bit', (x - math.cos(a) * L / 2, z - math.sin(a) * L / 2, h), (x + math.cos(a) * L / 2, z + math.sin(a) * L / 2, h + 0.004), 0.008, 0.006), c)


# ---------------------------------------------------------------------------------------------- shop
def build_shop():
    wall_h = SH_H
    # back wall with a wooden door (left) and a barred window (right)
    ops = [(SH_X0 + 1.0, SH_X0 + 2.1, 0, 2.3), (SH_X1 - 2.4, SH_X1 - 1.2, 1.2, 2.4)]
    cur = SH_X0
    z0, z1 = SH_Z0, SH_Z0 + T
    for a, b, lo, hi in ops:
        add('plaster', wb('bw', cur, a, z0, z1, 0, wall_h, 0.0), WHITE)
        if lo > 0:
            add('plaster', wb('bw_sill', a, b, z0, z1, 0, lo, 0.0), WHITE)
        add('plaster', wb('bw_lin', a, b, z0, z1, hi, wall_h, 0.0), WHITE)
        cur = b
    add('plaster', wb('bw', cur, SH_X1, z0, z1, 0, wall_h, 0.0), WHITE)
    # door: frame + weathered plank leaf + handle; window: frame + bars
    a, b, lo, hi = ops[0]
    for xx0, xx1, y0, y1 in ((a, a + 0.08, 0, hi), (b - 0.08, b, 0, hi), (a, b, hi - 0.08, hi)):
        add('wood', wb('df', xx0, xx1, z0 - 0.02, z1 + 0.02, y0, y1, 0.0))
    add('wood', wb('leaf', a + 0.08, b - 0.08, z0 + 0.06, z0 + 0.14, 0, hi - 0.08, 0.003))
    for k in range(5):
        add('wood', wb('plank', a + 0.08 + k * 0.188, a + 0.08 + k * 0.188 + 0.01, z0 + 0.14, z0 + 0.16, 0.05, hi - 0.1, 0.0))
    add('paint', wb('handle', b - 0.25, b - 0.2, z0 + 0.14, z0 + 0.22, 1.0, 1.2, 0.0), BRASS)
    a, b, lo, hi = ops[1]
    for xx0, xx1, y0, y1 in ((a, a + 0.07, lo, hi), (b - 0.07, b, lo, hi), (a, b, hi - 0.07, hi), (a, b, lo, lo + 0.07)):
        add('wood', wb('wf', xx0, xx1, z0 - 0.02, z1 + 0.02, y0, y1, 0.0))
    for i in range(1, 9):
        x = a + i * (b - a) / 9
        add('paint', wb('bar', x - 0.012, x + 0.012, z0 + 0.1, z0 + 0.14, lo + 0.07, hi - 0.07, 0.0), 0x2A2A2C)
    add('trim', wb('wsill', a - 0.06, b + 0.06, z0 - 0.06, z1 + 0.04, lo - 0.05, lo, 0.004), CEMENT)
    # side walls
    add('plaster', wb('wall_l', SH_X0, SH_X0 + T, SH_Z0, SH_Z1, 0, wall_h, 0.0), WHITE)
    add('plaster', wb('wall_r', SH_X1 - T, SH_X1, SH_Z0, SH_Z1, 0, wall_h, 0.0), WHITE)
    # front: jambs, lintel (blank board area), roller shutter box with the shutter rolled up, 6 m wide opening
    jamb = 0.5
    ox0, ox1 = SH_X0 + jamb, SH_X1 - jamb
    for nm, a, b in (('fj_l', SH_X0, ox0), ('fj_r', ox1, SH_X1)):
        add('plaster', wb(nm, a, b, SH_Z1 - T, SH_Z1, 0, wall_h, 0.0), WHITE)
    # 3 Nov (her item 2, "shops read as half shut"): opening top 2.7 -> 2.98 m (just under the board edge), rolled shutter bottom 2.55 -> 2.85 m
    sb = 2.85
    add('plaster', wb('lintel', SH_X0, SH_X1, SH_Z1 - T, SH_Z1, 2.98, wall_h, 0.0), WHITE)
    add('metal', wb('shutter_box', ox0, ox1, SH_Z1 - T - 0.02, SH_Z1 - T + 0.2, sb, sb + 0.4, 0.02), 0x8A8F94)
    for k in range(10):    # ribbed rolled-up shutter: ridges
        add('metal', wb('shutter_rib', ox0 + 0.1, ox1 - 0.1, SH_Z1 - T - 0.03, SH_Z1 - T - 0.01, sb + 0.03 + k * 0.035, sb + 0.05 + k * 0.035, 0.0), 0x9EA3A8)
    add('metal', wb('guide_l', ox0, ox0 + 0.07, SH_Z1 - T - 0.02, SH_Z1 - T + 0.1, 0, sb, 0.0), 0x8A8F94)
    add('metal', wb('guide_r', ox1 - 0.07, ox1, SH_Z1 - T - 0.02, SH_Z1 - T + 0.1, 0, sb, 0.0), 0x8A8F94)
    # blank cream board over the opening (text is painted in-game over it)
    add('plaster', wb('board', SH_X0 + 1.0, SH_X1 - 1.0, SH_Z1 + 0.0, SH_Z1 + 0.08, 3.05, 3.55, 0.0), 0xEFE3BE)
    for nm, a, b, h0, h1 in (('t', SH_X0 + 0.96, SH_X1 - 0.96, 3.55, 3.6), ('b', SH_X0 + 0.96, SH_X1 - 0.96, 3.0, 3.05), ('l', SH_X0 + 0.96, SH_X0 + 1.0, 3.0, 3.6), ('r', SH_X1 - 1.0, SH_X1 - 0.96, 3.0, 3.6)):
        add('plinth', wb('board_edge_' + nm, a, b, SH_Z1 - 0.02, SH_Z1 + 0.1, h0, h1, 0.0), BLUE)
    # blue base band + roof lines
    for (a, b, c, d) in ((SH_X0, SH_X1, SH_Z1 - T - 0.03, SH_Z1 + 0.03),):
        add('plinth', wb('band_f', a - 0.03, b + 0.03, c, d, 0, 0.8, 0.0), BLUE)
    add('plinth', wb('band_b', SH_X0 - 0.03, SH_X1 + 0.03, SH_Z0 - 0.03, SH_Z0 + 0.03, 0, 0.8, 0.0), BLUE)
    add('plinth', wb('band_l', SH_X0 - 0.03, SH_X0 + 0.03, SH_Z0, SH_Z1, 0, 0.8, 0.0), BLUE)
    add('plinth', wb('band_r', SH_X1 - 0.03, SH_X1 + 0.03, SH_Z0, SH_Z1, 0, 0.8, 0.0), BLUE)
    # roof slab with overhang, a pale-blue edge line, parapet with a blue cap
    sl = SH_H
    add('trim', wb('slab', SH_X0 - 0.25, SH_X1 + 0.25, SH_Z0 - 0.25, SH_Z1 + 0.25, sl, sl + 0.2, 0.01), 0xB4B1A9)   # grey concrete deck, blue only as edge stripes
    ex0, ex1, ez0, ez1, es = SH_X0 - 0.27, SH_X1 + 0.27, SH_Z0 - 0.27, SH_Z1 + 0.27, 0.07
    for nm, a, b, c, d in (('n', ex0, ex1, ez0, ez0 + es), ('s', ex0, ex1, ez1 - es, ez1), ('w', ex0, ex0 + es, ez0, ez1), ('e', ex1 - es, ex1, ez0, ez1)):
        add('plinth', wb('slab_line_' + nm, a, b, c, d, sl + 0.02, sl + 0.2, 0.0), BLUE)
    pt = 0.18
    ph = 0.35
    add('plaster', wb('par_b', SH_X0, SH_X1, SH_Z0, SH_Z0 + pt, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plaster', wb('par_f', SH_X0, SH_X1, SH_Z1 - pt, SH_Z1, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plaster', wb('par_l', SH_X0, SH_X0 + pt, SH_Z0 + pt, SH_Z1 - pt, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    add('plaster', wb('par_r', SH_X1 - pt, SH_X1, SH_Z0 + pt, SH_Z1 - pt, sl + 0.2, sl + 0.2 + ph, 0.0), WHITE)
    ct = sl + 0.2 + ph
    for nm, a, b, c, d in (('n', SH_X0 - 0.04, SH_X1 + 0.04, SH_Z0 - 0.04, SH_Z0 + pt + 0.04), ('s', SH_X0 - 0.04, SH_X1 + 0.04, SH_Z1 - pt - 0.04, SH_Z1 + 0.04), ('w', SH_X0 - 0.04, SH_X0 + pt + 0.04, SH_Z0 + pt, SH_Z1 - pt), ('e', SH_X1 - pt - 0.04, SH_X1 + 0.04, SH_Z0 + pt, SH_Z1 - pt)):
        add('plinth', wb('cap_' + nm, a, b, c, d, ct, ct + 0.05, 0.0), BLUE)
    # black plastic tank on a pad (roof, back-left)
    tx, tz = SH_X0 + 1.4, SH_Z0 + 1.3
    b0 = sl + 0.2
    add('paint', wb('tank_pad', tx - 0.8, tx + 0.8, tz - 0.8, tz + 0.8, b0, b0 + 0.12, 0.0), CEMENT)
    add('paint', cyl('tank', tx, tz, b0 + 0.12, b0 + 1.3, 0.62, 0.62, 18), 0x1C1C1F)
    add('paint', sphere('tank_dome', tx, tz, b0 + 1.3, 0.62, 0.62, 0.22, 2), 0x1C1C1F)
    for hr in (0.45, 0.9):
        add('paint', cyl('tank_rib', tx, tz, b0 + hr, b0 + hr + 0.05, 0.645, 0.645, 18), 0x2A2A2E)
    steel(limb('tank_pipe', (tx + 0.6, tz, b0 + 0.2), (tx + 0.6, tz, sl - 0.1), 0.07), 0x777A7D)
    # floor
    add('trim', wb('floor', SH_X0 + T, SH_X1 - T, SH_Z0 + T, SH_Z1, 0, 0.05, 0.0), 0xBDB8AC)
    # full-width white-tile counter: tiled front, wooden-edged cement top, tile joints as thin lines
    cx0, cx1 = ox0, ox1
    cz0, cz1 = SH_Z1 - 1.2, SH_Z1 - T + 0.02
    add('trim', wb('counter', cx0, cx1, cz0, cz1, 0, 0.88, 0.005), TILE)
    add('trim', wb('counter_top', cx0 - 0.04, cx1 + 0.04, cz0 - 0.04, cz1 + 0.12, 0.88, 0.94, 0.006), 0xD9D6CD)
    jz = cz1 + 0.12
    for k in range(1, 15):
        x = cx0 + k * (cx1 - cx0) / 15
        add('paint', wb('tile_v', x - 0.005, x + 0.005, jz - 0.12, jz, 0.0, 0.88, 0.0), 0x9A9A96) if False else None
    for k in range(1, 15):
        x = cx0 + k * (cx1 - cx0) / 15
        add('paint', wb('tile_v', x - 0.006, x + 0.006, cz1 - 0.002, cz1 + 0.012, 0.0, 0.88, 0.0), 0x9A9A96)
    for k in range(1, 4):
        add('paint', wb('tile_h', cx0, cx1, cz1 - 0.002, cz1 + 0.012, k * 0.22 - 0.006, k * 0.22 + 0.006, 0.0), 0x9A9A96)
    add('plinth', wb('counter_base', cx0, cx1, cz1 - 0.002, cz1 + 0.03, 0, 0.14, 0.0), BLUE)

    # ---- interior stock and equipment (behind and on the counter)
    # back-wall shelves with jars/tins (two rows) and small packets
    for h in (1.45, 1.95):
        add('wood', wb('shelf', SH_X0 + 1.0, SH_X1 - 1.0, SH_Z0 + T, SH_Z0 + T + 0.3, h, h + 0.04, 0.0))
    for k in range(10):
        x = SH_X0 + 1.2 + k * 0.5
        steel(cyl('jar', x, SH_Z0 + T + 0.17, 1.49, 1.49 + 0.2 + (k % 3) * 0.04, 0.09, 0.09, 10), (0xB9BDC2, 0xC9A83A, 0xB9BDC2, 0x8FA0AA)[k % 4])
    for k in range(8):
        x = SH_X0 + 1.4 + k * 0.58
        add('paint', wb('tin', x - 0.1, x + 0.1, SH_Z0 + T + 0.07, SH_Z0 + T + 0.27, 1.99, 2.25 + (k % 2) * 0.05, 0.004), (0xB8472E, 0xC9A83A, 0x2E5E8B, 0x4A7A4A)[k % 4])
    # hanging scale (brass dial, pan chain) + bucket on a hook, left of centre
    sx = SH_X0 + 2.9
    steel(limb('scale_hook', (sx, SH_Z0 + 1.0, 3.55), (sx, SH_Z0 + 1.0, 3.2), 0.02), 0x3A3C3E)
    steel(cyl('scale_dial', sx, SH_Z0 + 1.0, 2.6, 2.95, 0.17, 0.17, 14), 0xE8E4D8)
    steel(limb('scale_chain', (sx, SH_Z0 + 1.0, 2.6), (sx, SH_Z0 + 1.0, 1.9), 0.015), 0x3A3C3E)
    steel(cyl('scale_pan', sx, SH_Z0 + 1.0, 1.85, 1.9, 0.2, 0.2, 12), STEEL)
    bx = sx + 0.9
    steel(limb('bucket_hook', (bx, SH_Z0 + 1.0, 3.5), (bx, SH_Z0 + 1.0, 2.1), 0.015), 0x3A3C3E)
    steel(cyl('hang_bucket', bx, SH_Z0 + 1.0, 1.75, 2.1, 0.17, 0.15, 12), STEEL)
    # steel milk chiller (tall rounded drum with a lid and tap) and milk-testing machine with a blank screen on a shelf
    chx, chz = SH_X0 + 2.0, SH_Z0 + 1.6
    steel(lathe('chiller', chx, chz, [(0.0, 0.0), (0.5, 0.0), (0.54, 0.06), (0.54, 1.2), (0.5, 1.28), (0.0, 1.3)], seg=18), 0xB9BDC2)
    steel(cyl('chiller_lid', chx, chz, 1.3, 1.36, 0.46, 0.46, 18), 0x8A8E93)
    steel(limb('chiller_tap', (chx + 0.54, chz, 0.75), (chx + 0.72, chz, 0.7), 0.05), BRASS)
    add('paint', wb('tester_body', SH_X1 - 2.0, SH_X1 - 1.4, SH_Z0 + T + 0.1, SH_Z0 + T + 0.45, 1.5, 1.72, 0.01), 0xE6E4DE)
    add('paint', wb('tester_screen', SH_X1 - 1.9, SH_X1 - 1.5, SH_Z0 + T + 0.44, SH_Z0 + T + 0.465, 1.56, 1.66, 0.0), 0x1B1D22)
    # counter top: big steel lassi vessel, clay curd matkas, madhani (wooden churner), kulhads, steel tumblers, paneer/khoya glass case, jugs + ladles
    ctop = 0.94
    lx = SH_X0 + 1.6
    steel(lathe('lassi_vessel', lx, cz0 + 0.55, [(0.0, ctop), (0.26, ctop), (0.3, ctop + 0.05), (0.3, ctop + 0.5), (0.26, ctop + 0.6), (0.2, ctop + 0.68), (0.0, ctop + 0.68)], seg=16), STEEL)
    steel(cyl('lassi_lid', lx, cz0 + 0.55, ctop + 0.66, ctop + 0.72, 0.22, 0.22, 16), 0x8A8E93)
    for k, (mx, mz) in enumerate(((lx + 0.75, cz0 + 0.5), (lx + 1.45, cz0 + 0.45), (lx + 2.1, cz0 + 0.6))):
        clay_pot(kit, mx, mz, 0.9 + 0.1 * k)
    # the madhani: a wooden churning stick in a matka, with a cross-bar
    mx = lx + 0.75
    add('wood', limb('madhani', (mx, cz0 + 0.5, ctop + 0.5), (mx, cz0 + 0.5, ctop + 1.15), 0.025))
    add('wood', cyl('madhani_disc', mx, cz0 + 0.5, ctop + 0.48, ctop + 0.52, 0.09, 0.09, 8))
    # curd-pot rack lower on the left of the counter and a row of kulhads (clay cups) + steel tumblers
    for k in range(7):
        add('paint', cyl('kulhad', lx + 2.7 + k * 0.17, cz0 + 0.3, ctop, ctop + 0.11, 0.07, 0.05, 10) if False else cyl('kulhad', lx + 2.7 + k * 0.17, cz0 + 0.3, ctop, ctop + 0.11, 0.055, 0.07, 10), 0xB5693F)
        steel(cyl('tumbler', lx + 2.7 + k * 0.17, cz0 + 0.62, ctop, ctop + 0.12, 0.05, 0.062, 10), STEEL)
    # paneer / khoya glass-fronted case on the counter (right)
    gx0 = SH_X1 - 2.6
    add('paint', wb('case_base', gx0, gx0 + 1.1, cz0 + 0.15, cz0 + 0.75, ctop, ctop + 0.1, 0.0), 0xD9D6CD)
    add('paint', wb('case_glass', gx0 + 0.02, gx0 + 1.08, cz0 + 0.17, cz0 + 0.73, ctop + 0.1, ctop + 0.5, 0.0), 0xBFD7DC)
    for k in range(5):
        add('paint', wb('paneer', gx0 + 0.1 + k * 0.2, gx0 + 0.26 + k * 0.2, cz0 + 0.3, cz0 + 0.5, ctop + 0.1, ctop + 0.2, 0.01), (0xF2EEDF, 0xEFE3BE)[k % 2])
    # jugs + ladles on a small side table at the right wall, ghee tins stacked on the floor
    add('wood', wb('jug_table', SH_X1 - 1.0, SH_X1 - 0.3, SH_Z0 + 1.6, SH_Z0 + 2.4, 0.78, 0.82, 0.004))
    for yy in (SH_Z0 + 1.7, SH_Z0 + 2.3):
        add('wood', wb('jug_leg', SH_X1 - 0.95, SH_X1 - 0.9, yy - 0.03, yy + 0.03, 0, 0.78, 0.0))
        add('wood', wb('jug_leg', SH_X1 - 0.4, SH_X1 - 0.35, yy - 0.03, yy + 0.03, 0, 0.78, 0.0))
    for k in range(3):
        steel(cyl('jug', SH_X1 - 0.85 + k * 0.22, SH_Z0 + 2.0, 0.82, 1.08, 0.075, 0.09, 10), STEEL)
    steel(limb('ladle', (SH_X1 - 0.6, SH_Z0 + 1.75, 0.9), (SH_X1 - 0.35, SH_Z0 + 1.75, 1.15), 0.02), STEEL)
    for k in range(3):
        for j in range(2 - k % 2):
            steel(wb('ghee_tin', SH_X1 - 2.4 + k * 0.4, SH_X1 - 2.4 + k * 0.4 + 0.32, SH_Z0 + 1.0 + j * 0.0, SH_Z0 + 1.32, 0.0 + j * 0.4, 0.4 + j * 0.4, 0.01), (0xC9A83A, 0xB9BDC2)[k % 2])
    # two big milk cans just inside the counter, a wooden stool, a calendar-card on the wall, a fan and a tube light
    for k in range(2):
        cx = SH_X0 + 0.9 + k * 0.5
        steel(lathe('can', cx, SH_Z1 - 1.7, [(0.0, 0.0), (0.19, 0.0), (0.2, 0.04), (0.2, 0.62), (0.15, 0.7), (0.11, 0.74), (0.11, 0.82), (0.16, 0.84), (0.16, 0.88), (0.0, 0.88)], seg=14), STEEL)
    add('wood', wb('stool', SH_X1 - 3.1, SH_X1 - 2.7, SH_Z0 + 2.5, SH_Z0 + 2.9, 0.4, 0.45, 0.0))
    for dx, dz in ((-0.17, -0.17), (0.17, -0.17), (-0.17, 0.17), (0.17, 0.17)):
        add('wood', wb('stool_leg', SH_X1 - 2.9 + dx - 0.02, SH_X1 - 2.9 + dx + 0.02, SH_Z0 + 2.7 + dz - 0.02, SH_Z0 + 2.7 + dz + 0.02, 0, 0.4, 0.0))
    add('paint', limb('tube', (SH_X0 + 2.5, SH_Z0 + 2.5, 3.5), (SH_X0 + 4.5, SH_Z0 + 2.5, 3.5), 0.05), 0xF4F2E6)

    # slogan band on the LEFT (lane-facing) outer wall: wide cream band, bold red border ~4 x 1.2 m; a cow-and-calf picture at its right end.
    bx0, bx1 = SH_Z0 + 0.5, SH_Z0 + 4.5
    xw = SH_X0 - 0.01
    add('paint', wb('slogan_band', xw - 0.02, xw, bx0, bx1, 1.7, 2.9, 0.0), 0xF2E6C2)
    for h0, h1 in ((1.7, 1.78), (2.82, 2.9)):
        add('paint', wb('slogan_border', xw - 0.025, xw, bx0, bx1, h0, h1, 0.0), 0xB3231C)
    for z0b, z1b in ((bx0, bx0 + 0.08), (bx1 - 0.08, bx1)):
        add('paint', wb('slogan_border', xw - 0.025, xw, z0b, z1b, 1.7, 2.9, 0.0), 0xB3231C)
    # the picture sits on the band at its right end (south end, toward the front): 1.1 x 0.8 m
    wall_decal_W(xw - 0.03, bx1 - 1.35, bx1 - 0.25, 1.9, 2.7)


# ---------------------------------------------------------------------------------------------- stable
def build_stable():
    x0, x1, z0, z1 = 3.0, 9.0, -5.5, -1.5
    # mud half-wall behind (back) and the right side, cement trough along the back wall, straw floor
    add('plaster', wb('mud_back', x0, x1, z0, z0 + 0.3, 0, 1.2, 0.0), 0xA88A60)
    add('plaster', wb('mud_right', x1 - 0.3, x1, z0 + 0.3, z1, 0, 1.0, 0.0), 0xA88A60)
    tro = wb('trough', x0 + 0.3, x0 + 3.3, z0 + 0.35, z0 + 1.0, 0, 0.62, 0.015)
    add('trim', tro, CEMENT)
    add('paint', wb('trough_inner', x0 + 0.42, x0 + 3.18, z0 + 0.47, z0 + 0.88, 0.45, 0.5, 0.0), 0x6F6A5E)
    # (the green fodder in it is organic: left out)
    # straw bedding: loose low heaps (not a flat slab), thicker at the back, trodden thin where the cattle stand
    for _ in range(18):
        sx, sz = rnd.uniform(x0 + 0.5, x1 - 0.6), rnd.uniform(z0 + 1.2, z1 - 0.3)
        r = rnd.uniform(0.3, 0.6)
        add('earth', sphere('straw_heap', sx, sz, gh(sx, sz) - 0.02, r, r * rnd.uniform(0.6, 1.0), rnd.uniform(0.04, 0.09), 2), jit(rnd.choice((0xC9B070, 0xBDA262, 0xD2BC80, 0xA98F55)), 0.05))
    # six wooden posts (rough, slightly tapered) + beams
    posts = [(x0 + 0.15, z1 - 0.1), (x0 + 3.0, z1 - 0.1), (x1 - 0.15, z1 - 0.1), (x0 + 0.15, z0 + 0.35), (x0 + 3.0, z0 + 0.35), (x1 - 0.15, z0 + 0.35)]
    for k, (px, pz) in enumerate(posts):
        add('wood', limb('post', (px, pz, 0), (px + 0.03 * ((k % 3) - 1), pz, 2.9 if pz > z0 + 1 else 3.3), 0.16, 0.14))
    for pz, hh in ((z1 - 0.1, 2.9), (z0 + 0.35, 3.3)):
        add('wood', limb('beam', (x0 + 0.05, pz, hh), (x1 - 0.05, pz, hh), 0.15, 0.13))
    for px in (x0 + 0.15, x0 + 3.0, x1 - 0.15):
        add('wood', limb('tie', (px, z1 - 0.1, 2.9), (px, z0 + 0.35, 3.3), 0.1, 0.1))
    # thick thatch roof: a sloped slab (sloping toward the front), thick, overhanging, with edge thickness and bound ridges (own thatch set)
    th = 0.38
    roof = prism_x('thatch_roof', x0 - 0.45, x1 + 0.45, [(z0 - 0.3, 3.55), (z1 + 0.7, 2.7), (z1 + 0.7, 2.7 - th), (z0 - 0.3, 3.55 - th)])
    add('thatch', roof)
    # bound ropes across the thatch
    for k in range(4):
        zz = z0 + 0.4 + k * 1.05
        yy = 3.55 - (zz - (z0 - 0.3)) / (z1 + 1.0 - z0) * 0.85 + 0.01
        add('wood', limb('rope', (x0 - 0.4, zz, yy), (x1 + 0.4, zz, yy), 0.03, 0.02))
    # tether pegs and iron rings on two posts
    for px in (x0 + 0.15, x0 + 3.0):
        add('wood', limb('peg', (px + 0.1, z0 + 0.45, 0.9), (px + 0.25, z0 + 0.45, 0.9), 0.05))
    # dung stack at the stable's right end (cone of cakes)
    for k, (r, h0, h1) in enumerate(((0.8, 0.0, 0.4), (0.62, 0.4, 0.75), (0.42, 0.75, 1.05), (0.2, 1.05, 1.25))):
        add('paint', cyl('dung_stack_%d' % k, x1 + 0.9, z0 + 0.9, h0, h1, r, r * 0.8, 10), 0x6A5238)


# ---------------------------------------------------------------------------------------------- yard
def build_yard():
    # two long wooden benches in front of the shop
    for bx0, bx1 in ((-7.4, -5.2), (-4.6, -2.4)):
        add('wood', wb('bench_seat', bx0, bx1, 1.7, 2.1, 0.44, 0.5, 0.008))
        for x in (bx0 + 0.2, bx1 - 0.2):
            add('wood', wb('bench_leg', x - 0.04, x + 0.04, 1.75, 2.05, 0, 0.44, 0.003))
        add('wood', wb('bench_rail', bx0 + 0.2, bx1 - 0.2, 1.74, 1.78, 0.2, 0.26, 0.0))
    # farmers' milk cans along the front of the counter
    # varied heights, widths, spacing and metal tint (cans differ in age and size)
    cx = -2.4
    for k in range(6):
        sh = (1.0, 0.88, 1.08, 0.94, 1.0, 0.82)[k]
        sw = (1.0, 1.1, 0.92, 1.0, 1.08, 0.95)[k]
        cx += (0.42, 0.47, 0.40, 0.45, 0.43, 0.41)[k]
        prof = [(0.0, 0.0), (0.19 * sw, 0.0), (0.2 * sw, 0.04 * sh), (0.2 * sw, 0.62 * sh), (0.15 * sw, 0.7 * sh), (0.11 * sw, 0.74 * sh), (0.11 * sw, 0.82 * sh), (0.16 * sw, 0.84 * sh), (0.16 * sw, 0.88 * sh), (0.0, 0.88 * sh)]
        steel(lathe('farm_can', cx, 0.9 + (0.06 if k % 2 else -0.04) + 0.02 * k % 3 * 0.5, prof, seg=14), (0xB9BDC2, 0xA9ADB2, 0xC4C7CB, 0x9DA2A8, 0xB2B5B9, 0xA3A6A0)[k])
    # chaff cutter: cast frame, big spoked flywheel on a crank, feed trough and blade box
    cx, cz = 3.6, 1.0
    for dz in (-0.35, 0.35):
        steel(limb('cc_leg_a', (cx - 0.55, cz + dz, 0), (cx - 0.3, cz + dz, 0.95), 0.07), 0x2E5E3A)
        steel(limb('cc_leg_b', (cx + 0.55, cz + dz, 0), (cx + 0.3, cz + dz, 0.95), 0.07), 0x2E5E3A)
    steel(wb('cc_box', cx - 0.5, cx + 0.5, cz - 0.3, cz + 0.3, 0.95, 1.15, 0.01), 0x2E5E3A)
    steel(wb('cc_feed', cx - 1.0, cx - 0.45, cz - 0.2, cz + 0.2, 0.95, 1.05, 0.0), 0x4A4C50)
    from arch import ring
    steel(ring('cc_flywheel', cx + 0.1, cz + 0.4, 1.05, 0.5, 0.04, axis='z'), 0x1E1E20)
    for k in range(6):
        a = k / 6 * math.pi
        steel(limb('cc_spoke', (cx + 0.1 - 0.46 * math.cos(a), cz + 0.4, 1.05 - 0.46 * math.sin(a)), (cx + 0.1 + 0.46 * math.cos(a), cz + 0.4, 1.05 + 0.46 * math.sin(a)), 0.03), 0x1E1E20)
    steel(cyl('cc_hub', cx + 0.1, cz + 0.4, 0.98, 1.12, 0.07, 0.07, 10), 0x2A2A2C)
    steel(limb('cc_handle', (cx + 0.1, cz + 0.5, 1.3), (cx + 0.1, cz + 0.8, 1.4), 0.03), 0x2A2A2C)
    # hand pump over a square cement tub
    px, pz = 0.6, 3.8
    tub = wb('pump_tub', px - 0.8, px + 0.8, pz - 0.8, pz + 0.8, 0, 0.45, 0.012)
    add('trim', tub, CEMENT)
    add('paint', wb('pump_water', px - 0.62, px + 0.62, pz - 0.62, pz + 0.62, 0.3, 0.36, 0.0), 0x4F6E75)
    add('paint', wb('pump_rim_n', px - 0.8, px + 0.8, pz - 0.8, pz - 0.62, 0.45, 0.5, 0.0), 0xBDB9B0)
    add('paint', wb('pump_rim_s', px - 0.8, px + 0.8, pz + 0.62, pz + 0.8, 0.45, 0.5, 0.0), 0xBDB9B0)
    add('paint', wb('pump_rim_w', px - 0.8, px - 0.62, pz - 0.62, pz + 0.62, 0.45, 0.5, 0.0), 0xBDB9B0)
    add('paint', wb('pump_rim_e', px + 0.62, px + 0.8, pz - 0.62, pz + 0.62, 0.45, 0.5, 0.0), 0xBDB9B0)
    steel(cyl('pump_base', px, pz - 0.5, 0.45, 0.8, 0.14, 0.12, 10), 0x2E5E3A)
    steel(cyl('pump_col', px, pz - 0.5, 0.8, 1.45, 0.075, 0.06, 10), 0x2E5E3A)
    steel(limb('pump_handle', (px, pz - 0.5, 1.35), (px - 0.5, pz - 0.5, 1.65), 0.05), 0x2E5E3A)
    steel(limb('pump_spout', (px, pz - 0.5, 1.05), (px + 0.35, pz - 0.5, 0.9), 0.06), 0x2E5E3A)
    # dung cakes drying on a low mud wall (rows of round cakes) in the front-middle
    add('plaster', wb('dung_wall', 0.0, 4.6, 5.0, 5.3, 0, 0.35, 0.0), 0xA88A60)
    for k in range(14):
        x = 0.25 + k * 0.32
        j = ((k * 37) % 11) / 11.0   # deterministic per-cake jitter: size, offset, thickness, tone
        rr = 0.12 + 0.05 * j
        add('paint', cyl('dung_cake', x + 0.04 * (j - 0.5), 5.15 + 0.05 * (0.5 - j), 0.35, 0.39 + 0.03 * ((k * 5) % 3), rr, rr, 8), (0x6A5238, 0x5C4630, 0x75593D, 0x634B34)[k % 4])
        add('paint', cyl('dung_cake2', x + 0.05 + 0.05 * j, 4.7 + (k % 2) * 0.05 + 0.04 * j, 0.04, 0.08 + 0.02 * ((k * 3) % 3), 0.11 + 0.05 * (1 - j), 0.11 + 0.05 * (1 - j), 8), (0x7A6044, 0x6E553B, 0x846848)[k % 3])
    # charpai (rope cot) at the right, with woven rope top, a bucket and a clay pot
    cx0, cx1, cz0, cz1 = 5.6, 7.7, 1.2, 2.3
    for x in (cx0 + 0.1, cx1 - 0.1):
        for z in (cz0 + 0.1, cz1 - 0.1):
            add('wood', limb('cot_leg', (x, z, 0), (x, z, 0.38), 0.07))
    add('wood', wb('cot_frame_a', cx0, cx1, cz0, cz0 + 0.07, 0.36, 0.42, 0.0))
    add('wood', wb('cot_frame_b', cx0, cx1, cz1 - 0.07, cz1, 0.36, 0.42, 0.0))
    add('wood', wb('cot_frame_c', cx0, cx0 + 0.07, cz0, cz1, 0.36, 0.42, 0.0))
    add('wood', wb('cot_frame_d', cx1 - 0.07, cx1, cz0, cz1, 0.36, 0.42, 0.0))
    for k in range(10):
        add('paint', wb('cot_rope', cx0 + 0.07, cx1 - 0.07, cz0 + 0.12 + k * 0.095, cz0 + 0.15 + k * 0.095, 0.4, 0.43, 0.0), 0xB89A64)
    for k in range(13):
        add('paint', wb('cot_rope2', cx0 + 0.12 + k * 0.155, cx0 + 0.15 + k * 0.155, cz0 + 0.07, cz1 - 0.07, 0.43, 0.455, 0.0), 0xA88A58)
    steel(cyl('bucket', 8.2, 2.4, 0.0, 0.3, 0.14, 0.18, 12), 0x9FA3A7)
    steel(limb('bucket_handle', (8.02, 2.4, 0.31), (8.38, 2.4, 0.31), 0.012), 0x3A3C3E)
    clay_pot(kit, 7.9, 4.0, 1.0)
    clay_pot(kit, 8.35, 4.3, 0.85)
    clay_pot(kit, 7.5, 4.4, 0.7)


def wall_quad(name, face, c, u0, u1, h0a, h0b, h1a, h1b):
    """A quad flat on a wall face: face 'W'/'E' -> plane x=c, u runs along z; 'N'/'S' -> plane z=c, u along x.
    Bottom edge h0a (at u0) .. h0b (at u1), top edge h1a .. h1b, so drips and splash bands can taper."""
    if face in ('W', 'E'):
        P = lambda u, h: (c, u, h)
    else:
        P = lambda u, h: (u, c, h)
    return quad(name, [P(u0, h0a), P(u1, h0b), P(u1, h1b), P(u0, h1a)])


def splash_band(face, c, u0, u1, colour, lo=0.02, base=0.16, amp=0.14, step=0.22):
    """Mud splashed up the foot of a wall by rain off the yard: a ragged-topped strip of quads."""
    n = max(1, int((u1 - u0) / step))
    tops = [base + amp * rnd.random() for _ in range(n + 1)]
    for k in range(n):
        a, b = u0 + (u1 - u0) * k / n, u0 + (u1 - u0) * (k + 1) / n
        add('paint', wall_quad('splash', face, c, a, b, lo, lo, tops[k], tops[k + 1]), jit(colour, 0.04))


def streaks(face, c, u0, u1, top, n, colour, lmin=0.4, lmax=1.6, avoid=None):
    """Rain streaks running down from a ledge: narrow tapering strips of grey-beige grime."""
    for _ in range(n):
        u = rnd.uniform(u0, u1)
        w = rnd.uniform(0.04, 0.2)
        L = rnd.uniform(lmin, lmax)
        bot = top - L
        if avoid and avoid[0] - 0.1 < u < avoid[1] + 0.1:
            bot = max(bot, avoid[2] + 0.03)
        if bot >= top - 0.05:
            continue
        if face in ('W', 'E'):
            pts = [(c, u - w * 0.1, bot), (c, u + w * 0.1, bot), (c, u + w / 2, top), (c, u - w / 2, top)]
        else:
            pts = [(u - w * 0.1, c, bot), (u + w * 0.1, c, bot), (u + w / 2, c, top), (u - w / 2, c, top)]
        add('paint', quad('streak', pts), jit(colour, 0.05))


def build_weathering():
    """Lime-wash is never spotless: mud splash on the blue base band, rain streaks under the slab overhang and the window
    sill, a few chipped spots showing the brick (library brick), grime on the counter's tile foot, milk dribbles."""
    SPL = 0x7F7C70
    splash_band('W', SH_X0 - 0.035, SH_Z0, SH_Z1, SPL)
    splash_band('N', SH_Z0 - 0.035, SH_X0, SH_X1, SPL)
    splash_band('E', SH_X1 + 0.035, SH_Z0, SH_Z1, SPL)
    splash_band('S', SH_Z1 + 0.035, SH_X0, SH_X0 + 0.5, SPL)
    splash_band('S', SH_Z1 + 0.035, SH_X1 - 0.5, SH_X1, SPL)
    # rain streaks from the slab drip edge (the slab overhangs, so streaks start just below it), more on the back (monsoon side)
    GR = 0xDDD6C8
    streaks('W', SH_X0 - 0.006, SH_Z0 + 0.2, SH_Z1 - 0.2, SH_H - 0.02, 14, GR, avoid=(SH_Z0 + 0.5, SH_Z0 + 4.5, 2.9))
    streaks('N', SH_Z0 - 0.006, SH_X0 + 0.2, SH_X1 - 0.2, SH_H - 0.02, 18, GR, lmax=2.2)
    streaks('E', SH_X1 + 0.006, SH_Z0 + 0.2, SH_Z1 - 0.2, SH_H - 0.02, 12, GR)
    streaks('S', SH_Z1 + 0.006, SH_X0 + 0.05, SH_X0 + 0.45, SH_H - 0.02, 2, GR, lmax=0.9)
    streaks('S', SH_Z1 + 0.006, SH_X1 - 0.45, SH_X1 - 0.05, SH_H - 0.02, 2, GR, lmax=0.9)
    # dark streaks from the corners of the back window sill
    wa, wb_ = SH_X1 - 2.4, SH_X1 - 1.2
    for u in (wa - 0.02, wb_ + 0.02, (wa + wb_) / 2):
        add('paint', quad('sill_streak', [(u - 0.02, SH_Z0 - 0.007, 0.82), (u + 0.02, SH_Z0 - 0.007, 0.82), (u + 0.06, SH_Z0 - 0.007, 1.14), (u - 0.06, SH_Z0 - 0.007, 1.14)]), jit(0xB8B09E, 0.05))
    # chipped plaster showing brick: a darker broken rim with the library brick inside
    for face, c, u, h, w, hh in (('N', SH_Z0, SH_X0 + 3.1, 0.95, 0.32, 0.2), ('W', SH_X0, SH_Z0 + 0.3, 1.05, 0.26, 0.24),
                                 ('E', SH_X1, SH_Z1 - 0.9, 2.3, 0.22, 0.16), ('S', SH_Z1, SH_X1 - 0.18, 1.35, 0.14, 0.3)):
        sg = -1 if face in ('W', 'N') else 1
        if face in ('W', 'E'):
            add('plaster', wb('chip_rim', c + sg * 0.004 - 0.003, c + sg * 0.004 + 0.003, u - w / 2 - 0.04, u + w / 2 + 0.05, h - 0.035, h + hh + 0.03, 0.0), 0xC9C2B2)
            add('brick', wb('chip_brick', c + sg * 0.008 - 0.004, c + sg * 0.008 + 0.004, u - w / 2, u + w / 2, h, h + hh, 0.0), 0xB0654A)
        else:
            add('plaster', wb('chip_rim', u - w / 2 - 0.04, u + w / 2 + 0.05, c + sg * 0.004 - 0.003, c + sg * 0.004 + 0.003, h - 0.035, h + hh + 0.03, 0.0), 0xC9C2B2)
            add('brick', wb('chip_brick', u - w / 2, u + w / 2, c + sg * 0.008 - 0.004, c + sg * 0.008 + 0.004, h, h + hh, 0.0), 0xB0654A)
    # counter: grime up the foot of the white tiles, and dribbles of milk down the face from the top edge
    cx0, cx1 = SH_X0 + 0.5, SH_X1 - 0.5
    fz = SH_Z1 - T + 0.02 + 0.014
    splash_band('S', fz, cx0, cx1, 0xBDB6A3, lo=0.14, base=0.2, amp=0.12, step=0.3)
    for _ in range(9):
        u = rnd.uniform(cx0 + 0.2, cx1 - 0.2)
        L = rnd.uniform(0.08, 0.4)
        add('paint', quad('milk_drip', [(u - 0.008, fz + 0.001, 0.88 - L), (u + 0.008, fz + 0.001, 0.88 - L), (u + 0.025, fz + 0.001, 0.875), (u - 0.025, fz + 0.001, 0.875)]), jit(0xE4DCC6, 0.03))
    # stable: dung smeared on the mud half-wall where cattle rub, and water stains down the trough
    for _ in range(7):
        u = rnd.uniform(3.6, 8.6)
        add('paint', wall_quad('dung_rub', 'S', -5.5 + 0.305, u, u + rnd.uniform(0.2, 0.5), 0.3, 0.25, rnd.uniform(0.6, 0.95), rnd.uniform(0.6, 0.95)), jit(0x6A5A44, 0.08))
    for _ in range(5):
        u = rnd.uniform(3.4, 6.2)
        add('paint', wall_quad('trough_stain', 'S', -5.5 + 1.0 + 0.017, u, u + rnd.uniform(0.08, 0.25), 0.02, 0.02, rnd.uniform(0.25, 0.5), rnd.uniform(0.25, 0.5)), jit(0x8C887C, 0.05))


def milk_can(name, x, z, h0=0.0, sh=1.0, sw=1.0, colour=STEEL, lid=True, inverted=False):
    """The 40 l aluminium/steel milk can: lathed body, shoulder, neck and a lid cap (or open)."""
    prof = [(0.0, 0.0), (0.19 * sw, 0.0), (0.2 * sw, 0.04 * sh), (0.2 * sw, 0.62 * sh), (0.15 * sw, 0.7 * sh), (0.11 * sw, 0.74 * sh), (0.11 * sw, 0.82 * sh), (0.135 * sw, 0.84 * sh)]
    prof += [(0.16 * sw, 0.86 * sh), (0.16 * sw, 0.9 * sh), (0.0, 0.9 * sh)] if lid else [(0.12 * sw, 0.85 * sh), (0.1 * sw, 0.84 * sh), (0.1 * sw, 0.5 * sh), (0.0, 0.5 * sh)]
    if inverted:
        top = max(hh for _, hh in prof)
        prof = [(r, top - hh) for r, hh in reversed(prof)]
    steel(lathe(name, x, z, [(r, h0 + hh) for r, hh in prof], seg=14), colour)


def build_props():
    # green fodder: chopped heap spilling under the chaff cutter's blade box and a bundle of uncut green stalks by the feed trough
    for _ in range(9):
        fx, fz = 4.15 + rnd.uniform(-0.45, 0.45), 1.0 + rnd.uniform(-0.45, 0.45)
        r = rnd.uniform(0.22, 0.42)
        add('earth', sphere('fodder_heap', fx, fz, gh(fx, fz) - 0.02, r, r * rnd.uniform(0.7, 1.0), rnd.uniform(0.1, 0.2), 1), jit(rnd.choice((0x5F7F3A, 0x6B8A3E, 0x56743A, 0x7A8F45)), 0.06))
    for _ in range(40):
        fx, fz = 4.15 + rnd.gauss(0, 0.35), 1.0 + rnd.gauss(0, 0.35)
        a = rnd.uniform(0, math.tau)
        L = rnd.uniform(0.08, 0.2)
        h = gh(fx, fz) + rnd.uniform(0.06, 0.18)
        add('earth', limb('fodder_bit', (fx, fz, h), (fx + math.cos(a) * L, fz + math.sin(a) * L, h + rnd.uniform(-0.05, 0.05)), 0.012, 0.004), jit(rnd.choice((0x5F7F3A, 0x6E8E40, 0x8C9A50)), 0.06))
    # phase 5b: the FODDER PILE proper - a knee-high heap of chopped green fodder beside the cutter (LAYOUT: "chaff cutter with big
    # flywheel + fodder pile"), built from overlapping domes so its outline is lumpy, with loose bits on its flanks
    FP = (4.9, 0.35)
    for k in range(14):
        a, r = rnd.uniform(0, math.tau), abs(rnd.gauss(0, 0.32))
        fx, fz = FP[0] + r * math.cos(a), FP[1] + r * math.sin(a) * 0.8
        rad = rnd.uniform(0.35, 0.55) * (1.0 - 0.35 * r)
        add('earth', sphere('fodder_pile', fx, fz, gh(fx, fz) - 0.03, rad, rad * rnd.uniform(0.75, 1.0), rnd.uniform(0.28, 0.48) * (1.0 - 0.6 * r), 2), jit(rnd.choice((0x5F7F3A, 0x6B8A3E, 0x56743A, 0x748C42, 0x4E6A34)), 0.06))
    for _ in range(60):
        a, r = rnd.uniform(0, math.tau), rnd.uniform(0.5, 1.0)
        fx, fz = FP[0] + r * math.cos(a), FP[1] + r * math.sin(a) * 0.8
        b = rnd.uniform(0, math.tau)
        L = rnd.uniform(0.08, 0.2)
        h = gh(fx, fz) + 0.02 + max(0.0, 0.42 * (1.0 - r))
        add('earth', limb('fodder_bit', (fx, fz, h), (fx + math.cos(b) * L, fz + math.sin(b) * L, h + rnd.uniform(-0.04, 0.02)), 0.012, 0.004), jit(rnd.choice((0x5F7F3A, 0x6E8E40, 0x8C9A50)), 0.06))
    # dry bhusa (chopped wheat straw) heap behind, between the shop and the stable, a few loose bricks at its foot
    BP = (2.0, -2.7)
    for k in range(10):
        a, r = rnd.uniform(0, math.tau), abs(rnd.gauss(0, 0.35))
        bx_, bz_ = BP[0] + r * math.cos(a), BP[1] + r * math.sin(a)
        rad = rnd.uniform(0.45, 0.7) * (1.0 - 0.3 * r)
        add('earth', sphere('bhusa', bx_, bz_, gh(bx_, bz_) - 0.04, rad, rad * rnd.uniform(0.8, 1.0), rnd.uniform(0.35, 0.6) * (1.0 - 0.5 * r), 2), jit(rnd.choice((0xD2BC80, 0xC9B070, 0xDCC88E, 0xBFA662)), 0.05))
    for k in range(3):
        add('brick', wb('bhusa_brick', BP[0] - 0.5 + k * 0.45, BP[0] - 0.28 + k * 0.45, BP[1] + 0.6, BP[1] + 0.71, 0.0, 0.07, 0.004))
    for k in range(22):   # uncut stalks lying in a loose bundle, butts together at the feed end
        z = 0.55 + rnd.uniform(-0.18, 0.18)
        x0 = 1.55 + rnd.uniform(-0.08, 0.08)
        L = rnd.uniform(1.1, 1.5)
        h = gh(x0, z) + 0.03 + 0.03 * (k % 3)
        add('earth', limb('green_stalk', (x0, z, h), (x0 + L, z + rnd.uniform(-0.25, 0.25), h + rnd.uniform(-0.02, 0.03)), 0.018, 0.006), jit(rnd.choice((0x6F8F3E, 0x5E7E36, 0x86994A)), 0.05))
    # green fodder in the stable trough (LAYOUT: "cement feeding trough with green fodder")
    for k in range(10):
        tx = 3.0 + 0.5 + k * 0.27 + rnd.uniform(-0.05, 0.05)
        add('paint', sphere('trough_fodder', tx, -5.5 + 0.68 + rnd.uniform(-0.06, 0.06), 0.52, rnd.uniform(0.16, 0.22), rnd.uniform(0.15, 0.2), rnd.uniform(0.07, 0.13), 1), jit(rnd.choice((0x5F7F3A, 0x6B8A3E, 0x56743A)), 0.06))
    for _ in range(18):
        tx, tz = rnd.uniform(3.45, 6.15), -5.5 + 0.68 + rnd.uniform(-0.18, 0.18)
        a = rnd.uniform(0, math.tau)
        add('paint', limb('trough_blade', (tx, tz, 0.58), (tx + 0.15 * math.cos(a), tz + 0.15 * math.sin(a), 0.68 + rnd.uniform(0, 0.08)), 0.012, 0.004), jit(0x6E8E40, 0.08))
    # tethering: iron rings on the pegs and a rope tied through each, slack loop dropping toward the ground
    for px, pz in ((3.15, -5.15), (6.0, -5.15)):
        steel(ring('tether_ring', px + 0.28, pz + 0.12, 0.84, 0.06, 0.011, axis='x', seg=10, tube=4), 0x4A3E34)
        rp = [(px + 0.28, pz + 0.12, 0.78), (px + 0.36, pz + 0.45, 0.42), (px + 0.5, pz + 0.95, 0.3), (px + 0.62, pz + 1.4, 0.55)]
        for a, b in zip(rp, rp[1:]):
            add('paint', limb('tether_rope', a, b, 0.022, 0.022), jit(0x9C8558, 0.05))
    # a coil of rope hung on the middle front post, and a pitchfork leaned on the left front post
    for k in range(4):
        add('paint', ring('rope_coil', 6.0 + 0.0, -1.6 + 0.17 + 0.012 * k, 1.35 - 0.02 * k, 0.17 - 0.01 * k, 0.018, axis='z', seg=12, tube=4), jit(0xA48C5C, 0.04))
    add('wood', limb('fork_shaft', (3.4, -0.95, 0.03), (3.22, -1.4, 1.6), 0.035, 0.03))
    for d in (-0.06, 0.0, 0.06):
        steel(limb('fork_tine', (3.22 + d, -1.4, 1.55), (3.2 + d * 1.4, -1.44, 1.9), 0.012, 0.008), 0x55524E)
    steel(limb('fork_bar', (3.15, -1.4, 1.56), (3.29, -1.4, 1.56), 0.015, 0.015), 0x55524E)
    # woven bamboo tokri (fodder basket) by the stable, one upright and one turned over
    for (bx, bz, s, inv) in ((8.1, -0.75, 1.0, False), (7.55, -0.35, 0.85, True)):
        prof = [(0.0, 0.0), (0.16 * s, 0.0), (0.26 * s, 0.1 * s), (0.3 * s, 0.2 * s), (0.31 * s, 0.22 * s), (0.28 * s, 0.22 * s), (0.25 * s, 0.12 * s), (0.0, 0.12 * s)]
        if inv:
            prof = [(r, 0.22 * s - h) for r, h in reversed(prof)]
        add('paint', lathe('tokri', bx, bz, [(r, gh(bx, bz) - 0.01 + h) for r, h in prof], seg=14), jit(0xA88A55, 0.06))
        for k in range(6):   # weave bands
            hh = gh(bx, bz) + (0.03 + k * 0.03) * s
            rr = 0.17 * s + (0.13 * s) * min(1.0, (0.03 + k * 0.03) / 0.2) if not inv else 0.3 * s - 0.13 * s * min(1.0, (0.03 + k * 0.03) / 0.2)
            add('paint', cyl('tokri_band', bx, bz, hh, hh + 0.012, rr + 0.006, rr + 0.006, 14, cap=False), jit(0x8C7044, 0.06))
    # a steel balti and a brass lota at the pump tub, a plastic mug on the rim
    milk_steel = (0xB9BDC2, 0xAEB2B6, 0xC2C5C8)
    steel(cyl('balti', PUMP[0] + 1.05, PUMP[1] - 0.6, gh(PUMP[0] + 1.05, PUMP[1] - 0.6) - 0.01, 0.32, 0.13, 0.17, 12), milk_steel[1])
    steel(ring('balti_handle', PUMP[0] + 1.05, PUMP[1] - 0.6, 0.32, 0.165, 0.008, axis='z', seg=12, tube=3), 0x4A4C4E)
    steel(lathe('lota', PUMP[0] + 0.55, PUMP[1] - 0.68, [(0.0, 0.5), (0.05, 0.5), (0.085, 0.55), (0.08, 0.6), (0.04, 0.64), (0.045, 0.67), (0.0, 0.67)], seg=12), BRASS)
    # can drying stand against the shop's right wall: washed cans upturned on a plank bench to drain
    sx0, sx1, sz = -1.35, 0.3, -1.25
    add('wood', wb('dry_stand', sx0, sx1, sz - 0.25, sz + 0.25, 0.3, 0.35, 0.005))
    for x in (sx0 + 0.1, sx1 - 0.1):
        add('wood', wb('dry_leg', x - 0.04, x + 0.04, sz - 0.2, sz + 0.2, 0.0, 0.3, 0.0))
    for k, x in enumerate((sx0 + 0.32, sx0 + 0.82, sx0 + 1.3)):
        milk_can('dry_can', x + rnd.uniform(-0.04, 0.04), sz + rnd.uniform(-0.04, 0.04), 0.35, rnd.uniform(0.92, 1.05), rnd.uniform(0.95, 1.05), jit(milk_steel[k % 3], 0.04), lid=False, inverted=True)
    ground_blob('drip_wet', -0.5, sz + 0.15, 0.85, 0.3, 0x8E7F64, lift=0.004, n=12)
    # loose lids by the can line, one can with its lid off
    for (x, z) in ((-0.15, 1.45), (0.55, 1.25)):
        steel(cyl('can_lid', x, z, gh(x, z) + 0.005, gh(x, z) + 0.04, 0.16, 0.15, 12), jit(0xB0B4B8, 0.04))
    # a farmer's bicycle with two cans slung off the carrier, stood on the yard's lane side
    bx, bz = -0.75, 2.45
    bicycle(kit, bx, bz, col=0x2F3B35)
    for s in (-1, 1):
        milk_can('bike_can', bx + 0.9, bz + s * 0.27, 0.3, 0.62, 0.8, jit(0xB5B9BD, 0.04), lid=True)
        add('paint', limb('can_strap', (bx + 0.9, bz + s * 0.12, 0.8), (bx + 0.9, bz + s * 0.27, 0.86), 0.015, 0.015), 0x5C4B36)
    # two slatted wooden crates of kulhads stacked by the shop's right wall
    for k, (cx, cz, h0) in enumerate(((-1.1, -3.0, 0.0), (-1.07, -2.98, 0.32))):
        c = jit(0x9A7650, 0.06)
        for j in range(4):   # slatted sides: real gaps between boards
            hh = h0 + 0.02 + j * 0.075
            add('wood', wb('crate_slat', cx - 0.3, cx + 0.3, cz - 0.21, cz - 0.19, hh, hh + 0.055, 0.0), c)
            add('wood', wb('crate_slat', cx - 0.3, cx + 0.3, cz + 0.19, cz + 0.21, hh, hh + 0.055, 0.0), c)
            add('wood', wb('crate_slat', cx - 0.3, cx - 0.28, cz - 0.21, cz + 0.21, hh, hh + 0.055, 0.0), c)
            add('wood', wb('crate_slat', cx + 0.28, cx + 0.3, cz - 0.21, cz + 0.21, hh, hh + 0.055, 0.0), c)
        for dx in (-0.29, 0.29):
            for dz in (-0.2, 0.2):
                add('wood', wb('crate_post', cx + dx - 0.02, cx + dx + 0.02, cz + dz - 0.02, cz + dz + 0.02, h0, h0 + 0.32, 0.0), c)
        add('wood', wb('crate_floor', cx - 0.28, cx + 0.28, cz - 0.19, cz + 0.19, h0, h0 + 0.02, 0.0), c)
    for i in range(4):
        for j in range(3):
            add('paint', cyl('crate_kulhad', -1.07 - 0.21 + i * 0.14, -2.98 - 0.12 + j * 0.12, 0.6, 0.66, 0.045, 0.055, 8), jit(0xB5693F, 0.07))
    # a jhadu (grass broom) leaned against the shop's front left jamb
    add('paint', limb('jhadu_grip', (-8.28, -0.34, 0.75), (-8.3, -0.42, 1.15), 0.05, 0.035), 0x6E5236)
    add('paint', limb('jhadu', (-8.28, -0.34, 0.75), (-8.22, -0.02, 0.03), 0.06, 0.2), 0xB59A62)


build_ground()
build_shop()
build_stable()
build_yard()
build_ground_marks()
build_weathering()
build_props()

TINTS = {'hb_plaster': '#FFFFFF', 'hb_plinth': '#8FBBD6', 'hb_trim': '#E9E6DD', 'hb_apron': '#A8845A',
         'hb_wood': '#8A6A48', 'hb_brick': '#C26A44', 'hb_tin': '#C5CDD2', 'hb_metal': '#FFFFFF', 'hb_thatch': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.03, 'hb_plinth': 0.03})


def render(tag):
    """Cycles look-check shots into docs/shots/assets-dudh_dairy/ (run: Blender -b --python build_dudh_dairy.py -- render)."""
    import shutil
    from mathutils import Vector as V
    from common import load_pbr_material, box_uv
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.09))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sc.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.data.color = (1.0, 0.93, 0.82)
    sun.data.angle = math.radians(1.0)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-dudh_dairy')
    os.makedirs(d, exist_ok=True)
    # Blender frame: (x, -z, h); the lane/front is +z (Blender -y).
    shots = [('a_front', (1.5, -16.0, 5.5), (0.0, 0.0, 0.8), 24, (50, 0, 160)),
             ('b_yard_low', (-6.5, -7.5, 1.7), (3.5, 1.5, 0.4), 22, (55, 0, 140)),
             ('c_overhead', (12.0, -11.0, 14.0), (0.0, 0.0, 0.0), 26, (45, 0, 120))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, tag + name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


if '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--') + 1:]:
    render(sys.argv[-1] + '_' if sys.argv[-1] != 'render' else '')
