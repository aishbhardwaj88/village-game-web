"""
Tubewell + kothri - arch.py Kit, to Places V1/tubewell/LAYOUT.md. Run: tools/blender/make.sh tubewell tubewell_v2
Render check shots (docs/shots/assets-tubewell/): Blender -b --python tools/blender/build_tubewell.py -- render
Frame: site-local metres, +z south = front (field edge). Packed-earth patch 12 x 10 m: x[-6,6] z[-5,5] (grass tufts are hers).
Kothri back-left: brick pump room 3.5 x 3 m, 3 m tall, flat slab roof, grey iron door open (motor + pump, starter box, pipes, bulb inside), meter box on its
RIGHT side, wires to an 8 m concrete pole at the back-right. Thick pipe gushing into a cement hauz 2.5 x 2.5 x 0.8 m in front of the kothri; ONE brick channel
0.5 m wide from the hauz to the front edge. Right: charpai, matka + lota, spade + sickle, slippers (the shisham tree is hers).

Phase 5 (2 Nov, art-reviewer FAIL: flat ground, spotless surfaces, missing props). Sizes and positions above are unchanged. Added:
  ground   the patch is the approved packed earth (kind 'earth' = arch.earth_ground geometry: swells, cracks, dimples), in 2 x 2 tiles with their own
           crack seeds, then post-shaded here: wet dark mud sunk round the hauz outlet and along the channel, splash ring round the tank, puddles,
           paler compacted foot paths (field edge -> hauz -> kothri door, hauz -> charpai), an oil stain by the door, grass-green fade at the edge.
  hauz     cement walls cut into a grid so they carry vertex grime: algae below the waterline inside, a dark waterline band with a pale lime ring,
           damp rising on the outside, green slime under the outlet notch; modelled lime drips down the outer faces from the rim. A real outlet
           notch in the south wall with an iron sluice plate in its slot. Water is a glossy surface below the rim (material 'village_water',
           colours from src/water.js's old tubewell values), foam and ripple rings under the jet; water also runs down the channel; puddles.
  kothri   brick walls cut into bands: rising damp, splash dust, rain streaks under the slab; a roof spout with its stain, rust run under the meter.
           Delivery pipe now leaves through the brick wall (it used to float through the open doorway) with flanges and a gate valve; bore casing.
           Door leaf swung flat against the wall to the left so the pipe clears it. Starter board with wiring: main switch with lever, starter with
           green/red buttons and ammeter, three porcelain fuses, capacitor, cables clipped along the walls to the meter side and down to the motor.
           Service drop: wires sag from the pole to a GI mast on the roof, then a drop cable down to the meter box and into the wall.
  props    woven charpai (turned legs, diagonal niwar weave sagging in the middle, rolled durrie), matka on an iron ring stand with an inverted lota
           and a steel glass, phawda + hansiya, three pairs of chappals (door, charpai, hauz), plastic and iron buckets, washing stone + soap,
           hose coil hung on the wall, an unbranded oil tin, a roadster bicycle leaning on the kothri, pole stay wire.
Materials, frozen library only (arch.Kit kinds): brick, plaster set (cement/trim/paint/earth = packed earth), wood set, metal = rusted steel.
The only non-library surface is the water (no library entry exists; values reused from src/water.js).
"""
import sys, os, math, random, shutil
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Matrix, Vector
from common import wb, limb, cyl, sphere, quad, hex_to_linear_rgb, new_bmesh_obj, load_pbr_material, box_uv, ROOT
import arch
from arch import Kit, lathe, ring, STEEL, BRASS
import placekit as pk

OUT = os.path.join(ROOT, 'tmp', 'tubewell_v2_raw.glb')
# Phase 5b (2 Nov): ground + ground marks ride the library's packed earth BY NAME, as the approved material board renders it (dryearth
# scan x vertex colour), through the unused 'jute' slot. In the plaster set the runtime weathering desaturates/darkens everything below
# 0.7 m, which made the patch read as grey paving.
kit = Kit(split_props=False, own=('metal',), wood_slot='props', route={'earth': 'jute'}, tex_override={'jute': ('dryearth', 1.0)})
rnd = random.Random(21)
add = kit.add
CEM = pk.CEMENT
IRON = 0x6E7378
CABLE = 0x2C2C2E
EARTH = 0xC4B496                                  # library 'packed_earth' (build_material_board.py), was a darker sampled 0x8A7058
EARTH_LO, MUD, MUD_LO = 0xB0A07E, 0x7E7058, 0x6A5C48   # library packed_earth low tone, library 'mud_dung'
ALGAE, ALGAE_DK, LIME = 0x5F6747, 0x4C5538, 0xD2CDBE
_uid = [0]


def uname(s):
    _uid[0] += 1
    return '%s_%d' % (s, _uid[0])


def nz(x, z, f=1.0, s=0.0):
    """cheap smooth value noise 0..1 from summed sines"""
    return 0.5 + 0.25 * math.sin(x * 1.7 * f + s) * math.cos(z * 1.3 * f + s * 1.9) + 0.25 * math.sin((x * 0.8 - z * 1.1) * 2.3 * f + s * 0.7)


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def mix(c, d, t):
    return tuple(c[i] * (1 - t) + d[i] * t for i in range(3))


def lin(h):
    return hex_to_linear_rgb(h)


# ---------------------------------------------------------------- grime: per-object vertex colour functions (wrap arch.colorize, as build_gher_yard.py)
GRIME = {}
_orig_colorize = arch.colorize


def _colorize(obj, hex_color, attr='Col'):
    _orig_colorize(obj, hex_color, attr)
    fn = GRIME.get(obj.name)
    if attr != 'Base' or not fn:
        return
    me = obj.data
    base = lin(hex_color)
    out = [0.0] * (len(me.loops) * 4)
    mw = obj.matrix_world
    for p in me.polygons:
        n = (mw.to_3x3() @ p.normal).normalized()
        for li in p.loop_indices:
            co = mw @ me.vertices[me.loops[li].vertex_index].co
            c = fn(co.x, -co.y, co.z, (n.x, -n.y, n.z), base)
            out[li * 4:li * 4 + 4] = (min(1.0, c[0]), min(1.0, c[1]), min(1.0, c[2]), 1.0)
    me.color_attributes[attr].data.foreach_set('color', out)


arch.colorize = _colorize


def grimy(kind, obj, color, fn):
    GRIME[obj.name] = fn
    return add(kind, obj, color)


def gbox(name, x0, x1, z0, z1, h0, h1, step=0.3, hs=()):
    """Unbevelled box cut by planes every `step` m along x and z and at the heights `hs`, so vertex grime has somewhere to live."""
    o = wb(uname(name), x0, x1, z0, z1, h0, h1, bevel=0)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    planes = []
    for a0, a1, ax in ((x0, x1, 0), (z0, z1, 1)):
        k = int((a1 - a0) / step)
        for i in range(1, k + 1):
            v = a0 + (a1 - a0) * i / (k + 1)
            planes.append(((v, 0, 0), (1, 0, 0)) if ax == 0 else ((0, -v, 0), (0, 1, 0)))
    for h in hs:
        if h0 + 0.01 < h < h1 - 0.01:
            planes.append(((0, 0, h), (0, 0, 1)))
    for co, no in planes:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
    bm.to_mesh(o.data)
    bm.free()
    return o


def xf_since(n0, M):
    """apply a Blender-space matrix to every object added since record n0 (rotations, leaning)"""
    for k, o, c in kit.records[n0:]:
        o.data.transform(o.matrix_world)
        o.matrix_world.identity()
        o.data.transform(M)


def at(wx, wz, h=0.0):
    return Matrix.Translation((wx, -wz, h))


def polyline(name, pts, t, kind='paint', col=CABLE, t2=None):
    for a, b in zip(pts, pts[1:]):
        add(kind, limb(name, a, b, t, t2 or t), col)


def sag_line(p0, p1, sag, n=6):
    return [(p0[0] + (p1[0] - p0[0]) * i / n, p0[1] + (p1[1] - p0[1]) * i / n, p0[2] + (p1[2] - p0[2]) * i / n - sag * 4 * (i / n) * (1 - i / n)) for i in range(n + 1)]


def blob(name, cx, cz, h, r, seed, n=14, sq=1.0):
    """an irregular flat ngon (puddles, foam, stains)"""
    rr = random.Random(seed)
    pts = []
    for i in range(n):
        a = i / n * math.tau
        k = r * (0.75 + 0.4 * rr.random())
        pts.append((cx + k * math.cos(a), cz + k * sq * math.sin(a), h))
    return up(quad(uname(name), pts))


def up(o):
    """flat ngons/quads face the sky"""
    for p in o.data.polygons:
        if p.normal.z < 0:
            o.data.flip_normals()
            break
    return o


# ---------------------------------------------------------------- site plan (unchanged numbers)
x0, x1, z0, z1 = -5.5, -2.0, -4.5, -1.5          # kothri
T, H = 0.3, 3.0
vx0, vx1 = x0 + 1.4, x0 + 2.1                    # back vent
dx0, dx1 = x0 + 0.7, x0 + 1.85                   # door gap
hx0, hx1, hz0, hz1 = -4.6, -2.1, -0.9, 1.6       # hauz
t = 0.2
cx = (hx0 + hx1) / 2                             # channel centre line
hcz = (hz0 + hz1) / 2
WL = 0.6                                         # water level in the hauz
PX = -3.0                                        # delivery pipe line (through the brick wall right of the door)
GZ = hz0 + 0.55                                  # where the jet lands


# ---------------------------------------------------------------- ground: approved packed earth, then wet mud / paths / oil / edge fade
PATHS = [[(-1.4, 5.0), (-1.6, 2.6), (-1.75, 0.6), (-2.4, -1.15), (-4.3, -1.2)],   # field edge -> hauz side -> kothri door
         [(-1.75, 1.0), (0.6, 1.4), (2.3, 1.6)],                                  # hauz -> charpai
         [(3.2, 5.0), (3.0, 2.2)]]                                                # field edge -> charpai
OIL = [(-2.55, -1.25, 0.32), (-4.05, -1.25, 0.18), (-1.6, -2.3, 0.22)]


def seg_d(px, pz, a, b):
    ax, az = a
    bx, bz = b
    vx, vz = bx - ax, bz - az
    L = vx * vx + vz * vz
    u = max(0.0, min(1.0, ((px - ax) * vx + (pz - az) * vz) / L))
    return math.hypot(px - ax - u * vx, pz - az - u * vz)


def wetness(x, z):
    d = math.hypot(x - cx, (z - (hz1 + 0.35)) * 1.2)
    w = smooth(1.25 + 0.35 * nz(x, z, 3, 1), 0.35, d)                    # mud fan where the notch spills
    if hz1 < z < 5.2:
        w = max(w, smooth(0.95 + 0.25 * nz(x, z, 4, 2), 0.32, abs(x - cx)) * (0.95 - 0.12 * (z - hz1) / 3.4))
    ex = max(hx0 - x, 0, x - hx1)
    ez = max(hz0 - z, 0, z - hz1)
    dr = math.hypot(ex, ez)
    if dr < 0.7:
        w = max(w, 0.55 * smooth(0.7, 0.05, dr) * (0.6 + 0.6 * nz(x, z, 6, 3)))   # splash ring
    w = max(w, 0.7 * smooth(0.75, 0.15, math.hypot(x + 1.55, z - 0.45)))      # washing stone
    return min(1.0, w)


def ground_fx(obj):
    me = obj.data
    lay = me.color_attributes['Base']
    cols = [0.0] * (len(me.loops) * 4)
    lay.data.foreach_get('color', cols)
    vinfo = {}
    for v in me.vertices:
        if v.co.z < 0.0:
            continue
        x, z = v.co.x, -v.co.y
        w = wetness(x, z)
        p = 0.0
        for pl in PATHS:
            d = min(seg_d(x, z, a, b) for a, b in zip(pl, pl[1:]))
            p = max(p, smooth(0.5, 0.12, d) * (0.75 + 0.35 * nz(x, z, 5, 4)))
        p *= 1.0 - w
        o = 0.0
        for ox, oz, r in OIL:
            o = max(o, smooth(r * (1.1 + 0.3 * nz(x, z, 9, ox)), r * 0.2, math.hypot(x - ox, (z - oz) * 1.3)))
        edge = smooth(1.0, 0.0, min(6 - abs(x), 5 - abs(z)))
        if v.co.z > 0.0:
            v.co.z += -0.028 * w * (0.7 + 0.3 * nz(x, z, 7)) - 0.012 * p
            v.co.z = v.co.z * (1 - 0.6 * p) + (0.032) * 0.6 * p              # paths: trodden flat, cracks filled
        vinfo[v.index] = (w, p, o, edge)
    wet_c, dust_c, oil_c, grass_c = lin(0x5A4A38), lin(0xD2C6AA), lin(0x3A342E), lin(0x8A8458)
    lo_c, mud_c = lin(EARTH_LO), lin(MUD)
    for li, lp in enumerate(me.loops):
        inf = vinfo.get(lp.vertex_index)
        if not inf:
            continue
        w, p, o, e = inf
        c = cols[li * 4:li * 4 + 3]
        x_, z_ = me.vertices[lp.vertex_index].co.x, -me.vertices[lp.vertex_index].co.y
        bl = math.sin(x_ * 0.67 + 0.4) * math.sin(z_ * 0.91 + 1.9) + 0.6 * math.sin(x_ * 1.43 - z_ * 1.07 + 0.8)
        c = mix(c, lo_c, 0.5 * smooth(-0.2, 0.6, bl))                       # big soft tone patches: the patch is never one colour
        c = mix(c, mud_c, 0.45 * smooth(0.7, 1.25, bl) * (1 - p))            # old trodden mud-and-dung patches
        c = mix(c, grass_c, 0.45 * e * (1 - w))
        c = mix(c, dust_c, 0.5 * p)
        c = mix(c, wet_c, 0.78 * w)
        c = mix(c, oil_c, 0.7 * o)
        cols[li * 4:li * 4 + 3] = c
    lay.data.foreach_set('color', cols)
    me.update()


_orig_earth = arch.earth_ground


def _earth(obj, base_hex, seed=0):
    ok = _orig_earth(obj, base_hex, seed=sum(map(ord, obj.name)))
    if ok and obj.name.startswith('tw_ground'):
        ground_fx(obj)
    return ok


arch.earth_ground = _earth
# ONE ground slab (was 2 x 2 tiles with their own crack seeds: the tile border read as a straight paving seam)
add('earth', wb('tw_ground', -6, 6, -5, 5, -0.08, 0.04, bevel=0), EARTH)


def ground_h(x, z):
    """approx top of the earth at (x, z): sunk in the wet mud, flattened on the paths (marks sit on it)"""
    return 0.04 - 0.028 * wetness(x, z) * 0.85


# footprints: bare feet and chappals pressed into the soft ground along the paths and round the hauz, darker where it is wet
fr = random.Random(77)
for pl in PATHS:
    for a, b in zip(pl, pl[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        for k in range(int(L / 0.36)):
            tt = (k + fr.uniform(0, 0.4)) / max(1, int(L / 0.36))
            side = 0.09 if k % 2 else -0.09
            fx = a[0] + (b[0] - a[0]) * tt - math.sin(ang) * side + fr.uniform(-0.04, 0.04)
            fz = a[1] + (b[1] - a[1]) * tt + math.cos(ang) * side + fr.uniform(-0.04, 0.04)
            if hx0 - 0.05 < fx < hx1 + 0.05 and hz0 - 0.05 < fz < hz1 + 0.05:
                continue
            w_ = wetness(fx, fz)
            col = 0x4E3F30 if w_ > 0.4 else (0x9A8A6C if fr.random() < 0.7 else 0x887858)
            add('earth', blob('footprint', fx, fz, ground_h(fx, fz) + 0.016, 0.11, fr.randint(0, 9999), n=8, sq=0.42), col)
            # rotate the print along the walk direction
            o = kit.records[-1][1]
            o.data.transform(Matrix.Translation((fx, -fz, 0)) @ Matrix.Rotation(-(ang + fr.uniform(-0.2, 0.2)), 4, 'Z') @ Matrix.Translation((-fx, fz, 0)))
for k in range(26):                                   # splashing kids' prints round the hauz, in the wet
    a = fr.uniform(0, math.tau)
    fx, fz = cx + 1.75 * math.cos(a) * fr.uniform(0.9, 1.15), hcz + 1.75 * math.sin(a) * fr.uniform(0.9, 1.15)
    if fz < hz0 - 0.2 and fx < x1 + 0.1:
        continue
    add('earth', blob('footprint', fx, fz, ground_h(fx, fz) + 0.016, 0.09, fr.randint(0, 9999), n=8, sq=0.45), 0x4A3C2E)
# dry dung pats and stains where the bullocks are watered at the hauz (east side), straw bits blown in from the fields
for k in range(5):
    fx, fz = fr.uniform(-1.6, 0.4), fr.uniform(-0.6, 2.2)
    add('earth', sphere('dung_pat', fx, fz, ground_h(fx, fz) - 0.01, 0.14, 0.12, 0.04, 1), [0x5A4834, 0x4C3D2A, 0x66523A][k % 3])
for k in range(8):
    fx, fz = fr.uniform(-5.5, 5.5), fr.uniform(-4.5, 4.7)
    if wetness(fx, fz) > 0.3 or (x0 - 0.3 < fx < x1 + 0.3 and z0 - 0.3 < fz < z1 + 0.4):
        continue
    add('earth', blob('dry_stain', fx, fz, ground_h(fx, fz) + 0.015, fr.uniform(0.25, 0.55), fr.randint(0, 9999), n=12, sq=0.7), [0x8E7C5E, 0x9A8868, 0x84725A][k % 3])
for k in range(90):
    fx, fz = fr.uniform(-5.8, 5.8), fr.uniform(-4.8, 4.8)
    if (x0 - 0.1 < fx < x1 + 0.1 and z0 - 0.1 < fz < z1 + 0.1) or (hx0 - 0.1 < fx < hx1 + 0.1 and hz0 - 0.1 < fz < hz1 + 0.1):
        continue
    a = fr.uniform(0, math.pi)
    L = fr.uniform(0.07, 0.2)
    h = ground_h(fx, fz) + 0.018
    add('earth', limb('straw_bit', (fx - math.cos(a) * L / 2, fz - math.sin(a) * L / 2, h), (fx + math.cos(a) * L / 2, fz + math.sin(a) * L / 2, h + 0.004), 0.009, 0.006), fr.choice((0xD6C184, 0xCBB474, 0xBFA764)))

# puddles in the sunk mud by the notch and along the channel banks (water material, below)
WATER_OBJS = []
for k, (px, pz, r) in enumerate(((cx - 0.75, hz1 + 0.45, 0.32), (cx + 0.7, hz1 + 0.7, 0.24), (cx - 0.6, hz1 + 1.6, 0.18), (cx + 0.55, hz1 + 2.4, 0.2), (-1.2, 0.95, 0.2))):
    WATER_OBJS.append(blob('puddle', px, pz, 0.028, r, 40 + k, sq=0.7))

# ---------------------------------------------------------------- kothri: brick walls cut into bands for grime
HS = (0.08, 0.18, 0.3, 0.42, 0.56, 0.75, 1.1, 1.6, 2.1, 2.5, 2.75, 2.9)


def brick_grime(x, z, h, n, c):
    k = nz(x, z, 2.2, 5)
    damp = 1.0 - smooth(0.35 + 0.35 * k, 0.75 + 0.35 * k, h)                  # rising damp, ragged top (phase 5b: higher and darker)
    c = tuple(ch * (1 - 0.48 * damp) for ch in c)
    soot = smooth(1.9, 2.95, h) * (0.55 + 0.45 * nz(x, z, 3, 8))              # soot / grime blackening under the slab edge
    c = tuple(ch * (1 - 0.35 * soot) for ch in c)
    dust = 1.0 - smooth(0.0, 0.35 + 0.25 * nz(x, z, 6, 2), h)                # splash dust
    c = mix(c, mix(c, lin(0x8E7A62), 1.0), 0.45 * dust)
    if n[2] < 0.5:
        col = max(0.0, math.sin((x + z) * 7.3 + 1.1)) ** 4 * smooth(1.6, 2.9, h)   # rain streak columns under the slab edge
        c = tuple(ch * (1 - 0.22 * col) for ch in c)
    return c


def bwall(name, a0, a1, b0, b1, h0, h1):
    return grimy('brick', gbox(name, a0, a1, b0, b1, h0, h1, step=0.45, hs=HS), None, brick_grime)


bwall('k_back_l', x0, vx0, z0, z0 + T, 0, H)
bwall('k_back_r', vx1, x1, z0, z0 + T, 0, H)
bwall('k_back_lo', vx0, vx1, z0, z0 + T, 0, 2.0)
bwall('k_back_hi', vx0, vx1, z0, z0 + T, 2.6, H)
add('trim', wb('vent_sill', vx0 - 0.05, vx1 + 0.05, z0 - 0.04, z0 + T + 0.02, 1.96, 2.0, 0.0), 0xB4B1A9)
for k in range(5):
    add('metal', wb('vent_bar', vx0 + 0.08 + k * 0.14, vx0 + 0.11 + k * 0.14, z0 + 0.1, z0 + 0.13, 2.0, 2.6, 0.0), 0x3A3C40)
bwall('k_left', x0, x0 + T, z0 + T, z1 - T, 0, H)
bwall('k_right', x1 - T, x1, z0 + T, z1 - T, 0, H)
bwall('k_front_l', x0, dx0, z1 - T, z1, 0, H)
bwall('k_front_r', dx1, x1, z1 - T, z1, 0, H)
bwall('k_front_lintel', dx0, dx1, z1 - T, z1, 2.2, H)


def slab_grime(x, z, h, n, c):
    if n[2] > 0.5:   # roof top: dust, dark lichen near the edges where water stands
        e = min(x - (x0 - 0.25), (x1 + 0.25) - x, z - (z0 - 0.25), (z1 + 0.35) - z)
        return mix(c, lin(0x6E6A5E), 0.5 * smooth(0.5, 0.0, e) + 0.2 * nz(x, z, 3))
    return mix(c, lin(0x5E5A52), 0.35 * nz(x, z, 9, 2))                    # edge: grey water marks


grimy('trim', gbox('k_slab', x0 - 0.25, x1 + 0.25, z0 - 0.25, z1 + 0.35, H, H + 0.2, step=0.5), 0xB4B1A9, slab_grime)
add('trim', wb('k_rim', x0 - 0.27, x1 + 0.27, z1 + 0.3, z1 + 0.37, H + 0.2, H + 0.3, 0.004), 0xAAA79E)
# roof spout on the back edge, its black stain down the back wall, a splash-darkened patch below
add('metal', limb('spout', (x0 + 0.6, z0 - 0.1, H + 0.12), (x0 + 0.6, z0 - 0.55, H + 0.08), 0.09), IRON)
add('paint', wb('spout_stain', x0 + 0.5, x0 + 0.72, z0 - 0.006, z0, 0.2, H - 0.02, 0.0), 0x4E4A44)
add('paint', wb('spout_stain2', x0 + 0.56, x0 + 0.64, z0 - 0.008, z0 - 0.004, 1.2, H - 0.05, 0.0), 0x3E3A36)
# rain streaks below the slab corners (front face, both corners) and a pale lime run where the slab joint weeps
for sx, w_, l in ((x0 + 0.05, 0.12, 1.4), (x1 - 0.18, 0.1, 1.1), (dx1 + 0.4, 0.05, 0.6)):
    add('paint', wb('streak', sx, sx + w_, z1, z1 + 0.004, H - l, H - 0.02, 0.0), 0x5C564E)
add('paint', wb('lime_run', x1, x1 + 0.004, z0 + 0.3, z0 + 0.36, 2.2, H - 0.02, 0.0), 0xC9C5B8)

# phase 5b weathering on the brick: white efflorescence (salt bloom) crusting just above the damp line, soot smudged up the front wall
# over the door and over the back vent, a dark damp tide-mark band at the foot. Paint decals a few mm proud of the brick face.
OUTN = {'W': (-1, 0), 'E': (1, 0), 'N': (0, 1), 'S': (0, -1)}   # outward normal in Blender (x, y); Blender y = -site z


def face_out(o, face):
    """single-sided decal: make its normal point away from the wall (quad()'s recalc on a lone face can pick either side)"""
    nx, ny = OUTN[face]
    pn = o.data.polygons[0].normal
    if pn.x * nx + pn.y * ny < 0:
        o.data.flip_normals()
    return o


def wall_blob(face, c, u, h, ru, rh, seed, col, n=12):
    rr = random.Random(seed)
    pts = []
    for i in range(n):
        a = i / n * math.tau
        k = 0.7 + 0.45 * rr.random()
        uu, hh = u + ru * k * math.cos(a), max(0.03, h + rh * k * math.sin(a))
        pts.append((c, uu, hh) if face in ('W', 'E') else (uu, c, hh))
    add('paint', face_out(quad(uname('wall_blob'), pts), face), col)


er = random.Random(404)
EFF = (0xDCD7CA, 0xD2CCBE, 0xE4E0D4)
for face, c, u0, u1, avoid in (('W', x0 - 0.006, z0 + 0.2, z1 - 0.2, ()), ('E', x1 + 0.006, z0 + 0.2, z1 - 0.2, ((z0 + 0.9, z0 + 1.7),)),
                               ('N', z0 - 0.006, x0 + 0.2, x1 - 0.2, ()), ('S', z1 + 0.006, dx1 + 0.15, x1 - 0.15, ((PX - 0.35, PX + 0.35),))):
    for k in range(int((u1 - u0) / 0.42)):
        u = u0 + (k + er.uniform(0.1, 0.9)) * 0.42
        if any(a_ < u < b_ for a_, b_ in avoid):
            continue
        hh = er.uniform(0.55, 0.95)
        wall_blob(face, c, u, hh, er.uniform(0.1, 0.24), er.uniform(0.05, 0.12), er.randint(0, 9999), er.choice(EFF))
        if er.random() < 0.5:                                         # thin salt run below a bloom
            wall_blob(face, c - (0.0005 if face in ('W', 'N') else -0.0005), u + er.uniform(-0.05, 0.05), hh - 0.14, 0.035, 0.12, er.randint(0, 9999), er.choice(EFF), n=8)
# soot fanning up the front wall above the door head (hurricane lantern hung there on power-cut nights) and above the back vent
for face, c, u, h0_, w_ in (('S', z1 + 0.007, (dx0 + dx1) / 2, 2.25, 0.5), ('N', z0 - 0.007, (vx0 + vx1) / 2, 2.62, 0.38)):
    for j in range(4):
        wall_blob(face, c + (0.0006 * j if face == 'S' else -0.0006 * j), u + er.uniform(-0.08, 0.08), h0_ + 0.12 + j * 0.1, w_ * (1 - 0.18 * j), 0.13, er.randint(0, 9999), (0x4A4440, 0x3E3A36, 0x55504A, 0x46423E)[j], n=12)
# a dark damp tide-mark band at the foot of every face: ragged-topped strip
for face, c, u0, u1 in (('W', x0 - 0.004, z0, z1), ('E', x1 + 0.004, z0, z1), ('N', z0 - 0.004, x0, x1), ('S', z1 + 0.004, dx1, x1)):
    nseg = max(1, int((u1 - u0) / 0.25))
    tops = [0.16 + 0.14 * er.random() for _ in range(nseg + 1)]
    for k in range(nseg):
        a_, b_ = u0 + (u1 - u0) * k / nseg, u0 + (u1 - u0) * (k + 1) / nseg
        P = (lambda u, hh: (c, u, hh)) if face in ('W', 'E') else (lambda u, hh: (u, c, hh))
        add('paint', face_out(quad(uname('damp_foot'), [P(a_, 0.02), P(b_, 0.02), P(b_, tops[k + 1]), P(a_, tops[k])]), face), 0x5A4C40)


# door: frame + grey iron leaf standing open, swung flat against the front wall to the LEFT (the delivery pipe leaves right of the door)
for xx0, xx1, y0, y1 in ((dx0, dx0 + 0.08, 0, 2.2), (dx1 - 0.08, dx1, 0, 2.2), (dx0, dx1, 2.12, 2.2)):
    add('metal', wb('df', xx0, xx1, z1 - T - 0.02, z1 + 0.03, y0, y1, 0.0), 0x4A4D52)
add('trim', wb('threshold', dx0, dx1, z1 - T, z1 + 0.12, 0, 0.07, 0.006), 0x9C998F)
lx0, lx1 = dx0 - 1.08, dx0 - 0.02
add('metal', wb('door_leaf', lx0, lx1, z1 + 0.05, z1 + 0.1, 0.05, 2.12, 0.004), 0x7C8084)
for hh in (0.35, 1.05, 1.75):
    add('metal', wb('door_rib', lx0 + 0.06, lx1 - 0.06, z1 + 0.1, z1 + 0.115, hh, hh + 0.06, 0.0), 0x6C7074)
for hh in (0.3, 1.8):
    add('metal', cyl('hinge', lx1 + 0.01, z1 + 0.07, hh, hh + 0.12, 0.022, None, 8), 0x55585C)
add('paint', wb('door_latch', lx0 + 0.04, lx0 + 0.16, z1 + 0.1, z1 + 0.16, 1.0, 1.06, 0.0), 0x8A7A4E)
add('paint', wb('door_kick', lx0 + 0.1, lx1 - 0.1, z1 + 0.1, z1 + 0.104, 0.05, 0.5, 0.0), 0x6A5A48)   # mud kicked up the bottom of the leaf

# ---------------------------------------------------------------- inside: floor, motor, pump, bore, delivery pipe, starter board, wiring, bulb


def floor_grime(x, z, h, n, c):
    o = 0.0
    for ox, oz, r in ((-4.0, -3.4, 0.75), (-3.35, -3.0, 0.4), (-4.6, -2.3, 0.3)):
        o = max(o, smooth(r, r * 0.3, math.hypot(x - ox, z - oz)) * (0.6 + 0.4 * nz(x, z, 8)))
    c = mix(c, lin(0x3A3632), 0.7 * o)
    return mix(c, lin(0x8C7A62), 0.25 * smooth(0.6, 0.0, min(x - (x0 + T), (x1 - T) - x, z - (z0 + T), (z1 - T) - z)))   # dust in the corners


grimy('trim', gbox('k_floor', x0 + T, x1 - T, z0 + T, z1 - T, 0, 0.05, step=0.25), 0xB0ACA2, floor_grime)
mx, mz = x0 + 1.2, z0 + 1.1
grimy('trim', gbox('motor_bed', mx - 0.5, mx + 0.9, mz - 0.4, mz + 0.4, 0.05, 0.2, step=0.2), CEM,
      lambda x, z, h, n, c: mix(c, lin(0x3C3834), 0.55 * (0.5 + 0.5 * nz(x, z, 11)) * (0.6 if n[2] > 0.5 else 0.3)))
add('paint', cyl('motor', mx, mz, 0.2, 0.75, 0.3, 0.3, 14), 0x2E5A72)
for k in range(6):
    add('paint', cyl('motor_fin', mx, mz, 0.28 + k * 0.075, 0.3 + k * 0.075, 0.315, None, 14), 0x2A5068)
add('paint', cyl('motor_cap', mx, mz, 0.75, 0.85, 0.22, 0.22, 14), 0x1F465C)
add('paint', wb('motor_tbox', mx - 0.1, mx + 0.1, mz - 0.4, mz - 0.29, 0.45, 0.62, 0.006), 0x26485C)
for ox in (-0.38, 0.38):
    add('metal', wb('motor_foot', mx + ox - 0.06, mx + ox + 0.06, mz - 0.3, mz + 0.3, 0.2, 0.26, 0.0), 0x35383C)
add('metal', cyl('pump_body', mx + 0.75, mz, 0.2, 0.55, 0.22, 0.2, 12), 0x3F4A52)
add('metal', limb('coupling', (mx + 0.28, mz, 0.4), (mx + 0.55, mz, 0.4), 0.12), 0x4A4E52)
# bore casing out of the floor, suction pipe into the pump
bx_, bz_ = mx + 1.35, mz + 0.45
add('metal', cyl('bore_casing', bx_, bz_, 0.0, 0.32, 0.11, None, 12), 0x5A5650)
add('metal', cyl('bore_flange', bx_, bz_, 0.32, 0.36, 0.17, None, 12), 0x4E4A44)
add('trim', cyl('bore_collar', bx_, bz_, 0.0, 0.1, 0.26, 0.22, 12), 0x9A978E)
add('metal', limb('suction', (bx_, bz_, 0.3), (mx + 0.9, mz + 0.1, 0.35), 0.1), IRON)
# delivery: up out of the pump, forward along +z, across to the pipe line, out through the front wall and over the hauz rim
DH = 0.9
dp = [(mx + 0.75, mz, 0.55), (mx + 0.75, mz, DH), (mx + 0.75, z1 - T - 0.15, DH), (PX, z1 - T - 0.15, DH), (PX, hz0 + 0.42, DH)]
for a, b in zip(dp, dp[1:]):
    add('metal', limb('delivery', a, b, 0.17), IRON)
for p in dp[1:4]:
    add('metal', wb('elbow', p[0] - 0.12, p[0] + 0.12, p[1] - 0.12, p[1] + 0.12, p[2] - 0.12, p[2] + 0.12, 0.02), 0x5E6266)
for fz in (mz + 0.35, z1 - T - 0.6):
    add('metal', limb('flange', (mx + 0.75, fz, DH), (mx + 0.75, fz + 0.04, DH), 0.28), 0x4E5256)
# gate valve on the forward run: body, stem, red-oxide hand wheel
vz = mz + 0.7
add('metal', wb('valve_body', mx + 0.62, mx + 0.88, vz - 0.12, vz + 0.12, DH - 0.15, DH + 0.15, 0.02), 0x4A4E52)
add('metal', cyl('valve_stem', mx + 0.75, vz, DH + 0.15, DH + 0.38, 0.02, None, 6), 0x6A6E72)
add('paint', ring('valve_wheel', mx + 0.75, vz, DH + 0.38, 0.12, 0.014, axis='y'), 0x7E4A3A)
for k in range(3):
    a = k / 3 * math.tau
    add('paint', limb('valve_spoke', (mx + 0.75, vz, DH + 0.38), (mx + 0.75 + 0.12 * math.cos(a), vz + 0.12 * math.sin(a), DH + 0.38), 0.015), 0x7E4A3A)
# outside the wall: a mortar patch where the pipe was let through, the pipe resting on the hauz rim
add('trim', wb('pipe_patch', PX - 0.22, PX + 0.22, z1, z1 + 0.012, DH - 0.2, DH + 0.2, 0.01), 0x9E9A90)
add('metal', limb('gush_drop', (PX, hz0 + 0.42, DH), (PX, GZ, DH - 0.12), 0.17), IRON)
add('metal', wb('pipe_clamp', PX - 0.12, PX + 0.12, hz0 + 0.02, hz0 + 0.18, 0.79, 0.84, 0.0), 0x4E4A44)

# starter board on the back wall, inside
bz0 = z0 + T
add('wood', wb('board', x0 + 0.35, x0 + 1.55, bz0, bz0 + 0.03, 1.1, 1.95, 0.006))
SX = x0 + 0.5                                         # starter
add('paint', wb('starter_box', SX, SX + 0.5, bz0 + 0.03, bz0 + 0.2, 1.25, 1.8, 0.012), 0x6E7276)
add('paint', wb('starter_door', SX + 0.04, SX + 0.46, bz0 + 0.2, bz0 + 0.215, 1.29, 1.76, 0.0), 0x7A7E80)
add('paint', wb('amm_face', SX + 0.12, SX + 0.26, bz0 + 0.215, bz0 + 0.225, 1.56, 1.7, 0.0), 0xD2CEC0)
add('paint', limb('amm_needle', (SX + 0.19, bz0 + 0.228, 1.58), (SX + 0.23, bz0 + 0.228, 1.67), 0.006), 0x2E2E30)
add('paint', wb('btn_g', SX + 0.31, SX + 0.37, bz0 + 0.215, bz0 + 0.25, 1.62, 1.68, 0.004), 0x3E7048)
add('paint', wb('btn_r', SX + 0.31, SX + 0.37, bz0 + 0.215, bz0 + 0.25, 1.5, 1.56, 0.004), 0x8E3E34)
add('paint', wb('starter_handle', SX + 0.18, SX + 0.3, bz0 + 0.215, bz0 + 0.24, 1.36, 1.4, 0.004), 0x3A3C3E)
add('paint', cyl('capacitor', x0 + 0.43, bz0 + 0.09, 1.2, 1.44, 0.045, None, 10), 0x5E6266)
MS = x0 + 1.15                                        # iron-clad main switch with its side lever
add('paint', wb('main_switch', MS, MS + 0.28, bz0 + 0.03, bz0 + 0.17, 1.5, 1.88, 0.012), 0x56635A)
add('paint', limb('ms_lever', (MS + 0.29, bz0 + 0.1, 1.7), (MS + 0.33, bz0 + 0.18, 1.55), 0.025), 0x3A3C3E)
for k in range(3):                                    # kit-kat porcelain fuses
    fx = MS - 0.02 + k * 0.12
    add('paint', wb('fuse', fx, fx + 0.08, bz0 + 0.03, bz0 + 0.1, 1.16, 1.33, 0.008), 0xD6D1C4)
# cables: in from the meter side high on the right wall, along under the slab, down to the switch; switch -> starter; starter -> motor
CY = 2.62
polyline('cab_in', [(x1 - T - 0.02, z0 + 1.3, 2.0), (x1 - T - 0.02, z0 + 1.3, CY), (x1 - T - 0.02, bz0 + 0.02, CY), (MS + 0.14, bz0 + 0.02, CY), (MS + 0.14, bz0 + 0.06, 1.88)], 0.018)
polyline('cab_ms', [(MS, bz0 + 0.06, 1.7), (SX + 0.5, bz0 + 0.06, 1.7)], 0.016)
polyline('cab_fuse', [(MS + 0.1, bz0 + 0.06, 1.5), (MS + 0.1, bz0 + 0.06, 1.33)], 0.012)
polyline('cab_motor', [(SX + 0.25, bz0 + 0.08, 1.25), (SX + 0.25, bz0 + 0.04, 0.12), (SX + 0.4, bz0 + 0.3, 0.08), (mx, mz - 0.55, 0.1), (mx, mz - 0.38, 0.5)], 0.022)
for k in range(5):                                    # clips holding the cable run
    q = [(x1 - T - 0.02, z0 + 1.3, 2.3), (x1 - T - 0.02, z0 + 0.9, CY), (x1 - T - 0.02, z0 + 0.5, CY), (MS + 0.6, bz0 + 0.02, CY), (SX + 0.25, bz0 + 0.04, 0.7)][k]
    add('paint', wb('clip', q[0] - 0.02, q[0] + 0.02, q[1] - 0.02, q[1] + 0.02, q[2] - 0.02, q[2] + 0.02, 0.0), 0x8A8680)
# bulb: holder on a short cord from the slab, switch on the board
add('paint', sphere('bulb', x0 + 1.9, z0 + 1.4, 2.7, 0.07, 0.07, 0.09, 1), 0xE8DFB0)
add('paint', cyl('bulb_holder', x0 + 1.9, z0 + 1.4, 2.76, 2.84, 0.03, None, 8), 0x3A3A3C)
add('paint', limb('bulb_cord', (x0 + 1.9, z0 + 1.4, 3.0), (x0 + 1.9, z0 + 1.4, 2.84), 0.012), CABLE)
polyline('cab_bulb', [(x0 + 1.9, z0 + 1.4, 2.99), (x0 + 1.9, bz0 + 0.02, 2.99), (x0 + 1.9, bz0 + 0.02, CY)], 0.012)
# odds on the floor: an oil can and a rag by the motor, a spare pipe length along the left wall
add('metal', wb('oil_can_in', mx - 0.75, mx - 0.6, mz + 0.5, mz + 0.65, 0.05, 0.25, 0.01), 0x5C6E5A)
add('paint', blob('rag', mx + 0.3, mz + 0.62, 0.055, 0.14, 7, n=9), 0x7A6E5E)
add('metal', limb('spare_pipe', (x0 + T + 0.12, z0 + 1.6, 0.11), (x0 + T + 0.12, z1 - T - 0.2, 0.11), 0.11), 0x5E5850)

# ---------------------------------------------------------------- meter box on the RIGHT side wall, service drop from the pole via a GI roof mast
add('paint', wb('meter_box', x1, x1 + 0.18, z0 + 1.0, z0 + 1.6, 1.4, 2.0, 0.01), 0x787B7E)
add('paint', wb('meter_glass', x1 + 0.18, x1 + 0.2, z0 + 1.1, z0 + 1.5, 1.6, 1.9, 0.0), 0x8FA2A6)
add('paint', wb('meter_seal', x1 + 0.18, x1 + 0.21, z0 + 1.42, z0 + 1.46, 1.45, 1.5, 0.0), 0x8E3E34)
add('paint', wb('meter_rust', x1, x1 + 0.005, z0 + 1.22, z0 + 1.34, 0.5, 1.4, 0.0), 0x7A5A44)   # run-off below the box
add('metal', limb('meter_conduit', (x1 + 0.09, z0 + 1.3, 1.4), (x1 + 0.09, z0 + 1.3, 1.25), 0.05), 0x5E6266)
add('metal', limb('meter_conduit2', (x1 + 0.09, z0 + 1.3, 1.25), (x1 - 0.05, z0 + 1.3, 1.25), 0.05), 0x5E6266)
mast = (x1 - 0.12, z0 + 0.6)
add('metal', limb('roof_mast', (mast[0], mast[1], H + 0.2), (mast[0], mast[1], H + 1.15), 0.05), 0x7E8286)
add('metal', limb('mast_stay', (mast[0], mast[1], H + 0.9), (mast[0] - 0.6, mast[1] + 0.4, H + 0.2), 0.02), 0x6E7276)
add('trim', wb('mast_foot', mast[0] - 0.1, mast[0] + 0.1, mast[1] - 0.1, mast[1] + 0.1, H + 0.2, H + 0.27, 0.01), 0x9E9A90)
for k, hh in enumerate((H + 1.1, H + 0.98)):
    add('paint', cyl('shackle', mast[0] + 0.06, mast[1], hh - 0.04, hh + 0.04, 0.035, None, 8), 0xC2BDB0)
# drop cable from the mast, over the slab edge and down the right wall to the meter box top
polyline('drop', [(mast[0] + 0.06, mast[1], H + 0.98), (mast[0] + 0.06, mast[1], H + 0.3), (x1 + 0.27, mast[1] + 0.1, H + 0.22), (x1 + 0.27, mast[1] + 0.1, H - 0.05), (x1 + 0.04, z0 + 1.15, 2.6), (x1 + 0.06, z0 + 1.15, 2.0)], 0.02)

# 8 m concrete pole, back-right, crossarm, insulators, stay wire; service wires sag to the roof mast
px, pz = 4.8, -3.9
add('trim', limb('pole', (px, pz, 0), (px, pz, 8.0), 0.24, 0.18), 0xA6A39B)
add('trim', wb('pole_collar', px - 0.22, px + 0.22, pz - 0.22, pz + 0.22, 0.0, 0.12, 0.02), 0x8E8A80)
add('paint', wb('pole_grime', px - 0.125, px + 0.125, pz - 0.125, pz + 0.125, 0.12, 0.7, 0.0), 0x7E786C)
add('metal', limb('crossarm', (px - 0.7, pz, 7.5), (px + 0.7, pz, 7.5), 0.08, 0.1), 0x4A4C50)
for dx in (-0.6, 0, 0.6):
    add('paint', cyl('ins', px + dx, pz, 7.52, 7.7, 0.05, 0.04, 8), 0xC2BDAE)
for k, dx in enumerate((-0.6, 0.0)):
    pts = sag_line((px + dx, pz, 7.68), (mast[0] + 0.06, mast[1], H + 1.1 - k * 0.12), 0.35, 8)
    polyline('svc_wire', pts, 0.014)
add('metal', limb('pole_stay', (px, pz, 6.6), (px + 1.1, pz - 0.9, 0.05), 0.016), 0x6E7276)
add('trim', wb('stay_anchor', px + 1.0, px + 1.25, pz - 1.05, pz - 0.8, -0.05, 0.1, 0.02), 0x8E8A80)

# ---------------------------------------------------------------- hauz 2.5 x 2.5 x 0.8: walls with grime, a notch + sluice, water, jet


def hauz_grime(x, z, h, n, c):
    inward = n[0] * (cx - x) + n[1] * (hcz - z) > 0.02 and abs(n[2]) < 0.5
    k = nz(x, z + h, 4, 2)
    if n[2] > 0.5:                                    # rim top: splashed dark near the jet, dusty elsewhere
        sp = smooth(1.3, 0.2, math.hypot(x - PX, z - GZ))
        c = mix(c, lin(0x6E6C64), 0.55 * sp + 0.12 * k)
        return mix(c, lin(0x8C8574), 0.2 * (1 - sp))
    if inward:
        if h < WL:
            return mix(c, lin(ALGAE_DK), 0.8)
        band = smooth(WL + 0.14, WL, h)               # dark wet band just above the water
        c = mix(c, lin(ALGAE), 0.75 * band)
        ring_ = smooth(0.03, 0.0, abs(h - (WL + 0.16)))  # pale mineral ring where the level usually stands
        return mix(c, lin(LIME), 0.5 * ring_)
    damp = 1.0 - smooth(0.12 + 0.25 * k, 0.45 + 0.2 * k, h)
    c = mix(c, lin(0x6A6A62), 0.55 * damp)
    if n[1] > 0.5:                                    # south face: green slime fanning out under the notch
        g = smooth(0.9, 0.15, abs(x - cx)) * smooth(0.75, 0.2, h)
        c = mix(c, lin(ALGAE_DK), 0.7 * g)
    return mix(c, lin(0xB8B4A8), 0.15 * nz(x, z, 9, 7) * (1 - damp))


def hwall(name, a0, a1, b0, b1, h0, h1):
    return grimy('trim', gbox(name, a0, a1, b0, b1, h0, h1, step=0.3, hs=(0.12, 0.25, 0.4, 0.52, WL - 0.02, WL + 0.06, WL + 0.14, WL + 0.18, 0.72)), CEM, hauz_grime)


NW = 0.5                                              # notch width = channel width
NB = 0.5                                              # notch sill height (below the water level, so it spills)
hwall('hauz_n', hx0, hx1, hz0, hz0 + t, 0, 0.8)
hwall('hauz_s_l', hx0, cx - NW / 2, hz1 - t, hz1, 0, 0.8)
hwall('hauz_s_r', cx + NW / 2, hx1, hz1 - t, hz1, 0, 0.8)
hwall('hauz_s_sill', cx - NW / 2, cx + NW / 2, hz1 - t, hz1, 0, NB)
hwall('hauz_w', hx0, hx0 + t, hz0 + t, hz1 - t, 0, 0.8)
hwall('hauz_e', hx1 - t, hx1, hz0 + t, hz1 - t, 0, 0.8)
add('trim', wb('hauz_floor', hx0, hx1, hz0, hz1, 0, 0.1, 0.0), 0x6E6C60)
# chipped rim corners
for qx, qz in ((hx0, hz0), (hx1, hz1)):
    add('paint', wb('chip', qx - 0.002 if qx == hx0 else qx - 0.1, qx + 0.1 if qx == hx0 else qx + 0.002, qz - 0.002 if qz == hz0 else qz - 0.1, qz + 0.1 if qz == hz0 else qz + 0.002, 0.72, 0.802, 0.0), 0x8E8B82)
# sluice: two angle-iron guides in the notch and a rusted plate lifted a hand's width
for sx in (cx - NW / 2 - 0.02, cx + NW / 2 - 0.02):
    add('metal', wb('sluice_guide', sx, sx + 0.04, hz1 - 0.14, hz1 - 0.08, NB - 0.02, 0.95, 0.0), 0x4E4A44)
add('metal', wb('sluice_plate', cx - NW / 2 + 0.01, cx + NW / 2 - 0.01, hz1 - 0.125, hz1 - 0.095, NB + 0.07, 0.98, 0.004), 0x5E5248)
add('metal', limb('sluice_grip', (cx - 0.1, hz1 - 0.11, 0.98), (cx + 0.1, hz1 - 0.11, 0.98), 0.03), 0x4E4A44)
# lime drips down the outer faces from the rim, slime streaks low on the south face
lr = random.Random(5)
for face in ('n', 's', 'w', 'e'):
    for k in range(7):
        u = lr.uniform(0.15, 2.35)
        L = lr.uniform(0.12, 0.55)
        w_ = lr.uniform(0.02, 0.07)
        col = [0xCFCABC, 0xC4BFB0, 0xD8D3C6][k % 3]
        h1_ = 0.8 - lr.uniform(0.0, 0.05)
        if face == 's' and abs(hx0 + u - cx) < NW / 2 + 0.05:
            continue
        if face == 'n':
            o = wb('lime', hx0 + u - w_ / 2, hx0 + u + w_ / 2, hz0 - 0.004, hz0, h1_ - L, h1_, 0.0)
        elif face == 's':
            o = wb('lime', hx0 + u - w_ / 2, hx0 + u + w_ / 2, hz1, hz1 + 0.004, h1_ - L, h1_, 0.0)
        elif face == 'w':
            o = wb('lime', hx0 - 0.004, hx0, hz0 + u - w_ / 2, hz0 + u + w_ / 2, h1_ - L, h1_, 0.0)
        else:
            o = wb('lime', hx1, hx1 + 0.004, hz0 + u - w_ / 2, hz0 + u + w_ / 2, h1_ - L, h1_, 0.0)
        add('paint', o, col)
for k in range(5):
    sx = cx + lr.uniform(-0.75, 0.75)
    add('paint', wb('slime', sx - 0.03, sx + 0.03, hz1, hz1 + 0.005, 0.02, lr.uniform(0.2, 0.45), 0.0), 0x4E5638)
# the water: glossy surface below the rim; foam + ripple rings under the jet; a lip spilling over the sill into the channel
WATER_OBJS.append(up(quad('hauz_water', [(hx0 + t, hz0 + t, WL), (hx1 - t, hz0 + t, WL), (hx1 - t, hz1 - t, WL), (hx0 + t, hz1 - t, WL)])))
WATER_OBJS.append(up(quad('spill', [(cx - NW / 2, hz1 - t, NB + 0.03), (cx + NW / 2, hz1 - t, NB + 0.03), (cx + NW / 2 - 0.02, hz1 + 0.05, 0.16), (cx - NW / 2 + 0.02, hz1 + 0.05, 0.16)])))
WATER_OBJS.append(up(quad('chan_water', [(cx - 0.24, hz1 + 0.05, 0.11), (cx + 0.24, hz1 + 0.05, 0.11), (cx + 0.24, 5.0, 0.07), (cx - 0.24, 5.0, 0.07)])))
add('paint', blob('foam', PX, GZ + 0.02, WL + 0.004, 0.36, 3, n=16), 0xC9D2CC)
add('paint', blob('foam_core', PX, GZ + 0.02, WL + 0.008, 0.2, 4, n=12), 0xDCE2DE)
for k, R in enumerate((0.48, 0.66)):
    add('paint', ring('ripple', PX, GZ + 0.02, WL + 0.003, R, 0.012, axis='y', seg=24, tube=3), 0xA9B6B0)
add('paint', limb('gush', (PX, GZ, DH - 0.2), (PX, GZ + 0.04, WL + 0.02), 0.2, 0.14), 0xC6D6D6)
add('paint', limb('gush_core', (PX, GZ, DH - 0.2), (PX, GZ + 0.03, WL + 0.04), 0.11, 0.08), 0xDDE6E4)
add('paint', blob('foam_chan', cx, hz1 + 0.12, 0.115, 0.2, 9, n=10, sq=0.6), 0xBFC8C0)

# ONE brick channel 0.5 m wide from the hauz to the front edge, centred on the hauz; slimy at the waterline, pebbles in the bed


def chan_grime(x, z, h, n, c):
    wet_ = smooth(0.17, 0.06, h)
    c = mix(c, lin(ALGAE_DK), 0.55 * wet_ * (0.6 + 0.4 * nz(x, z, 5)))
    return mix(c, lin(0x6E5E4A), 0.35 * nz(x, z, 3, 1))


grimy('brick', gbox('chan_l', cx - 0.4, cx - 0.25, hz1, 5.0, 0, 0.18, step=0.5, hs=(0.08, 0.13)), None, chan_grime)
grimy('brick', gbox('chan_r', cx + 0.25, cx + 0.4, hz1, 5.0, 0, 0.18, step=0.5, hs=(0.08, 0.13)), None, chan_grime)
add('paint', wb('chan_bed', cx - 0.25, cx + 0.25, hz1 - 0.05, 5.0, 0, 0.05, 0.0), 0x4E4032)
for k in range(9):
    add('paint', sphere('pebble', cx + lr.uniform(-0.2, 0.2), lr.uniform(hz1 + 0.3, 4.9), 0.06, 0.035, 0.03, 0.02, 1), [0x7E786C, 0x6A645A, 0x8A8274][k % 3])
add('trim', wb('outlet', cx - 0.25, cx + 0.25, hz1 - 0.05, hz1 + 0.15, 0.05, 0.12, 0.0), 0x8A877E)
# a broken brick and a few loose bricks where the channel bank was patched
for k, (bxx, bzz, a) in enumerate(((cx + 0.62, 3.1, 0.3), (cx - 0.7, 4.3, -0.5), (cx + 0.75, 3.35, 1.2))):
    n0 = len(kit.records)
    add('brick', wb('loose_brick', -0.11, 0.11, -0.055, 0.055, 0.0, 0.07 if k < 2 else 0.05, 0.006))
    xf_since(n0, at(bxx, bzz, 0.03) @ Matrix.Rotation(a, 4, 'Z'))

# ---------------------------------------------------------------- the right side: woven charpai, matka + lota, tools, chappals (tree is hers)


def woven_charpai(ccx, ccz, ang, w=1.9, d=1.0, seed=0):
    n0 = len(kit.records)
    rr = random.Random(seed)
    leg = [(0.038, 0.0), (0.045, 0.04), (0.04, 0.12), (0.05, 0.2), (0.032, 0.28), (0.045, 0.34), (0.05, 0.4), (0.042, 0.48), (0.0, 0.48)]
    for u in (-w / 2 + 0.05, w / 2 - 0.05):
        for v in (-d / 2 + 0.05, d / 2 - 0.05):
            add('wood', lathe(uname('cot_leg'), u, v, leg, seg=8))
    for v in (-d / 2 + 0.05, d / 2 - 0.05):                     # long side rails (paati)
        add('wood', limb('cot_rail', (-w / 2, v, 0.42), (w / 2, v, 0.42), 0.065, 0.065))
    for u in (-w / 2 + 0.05, w / 2 - 0.05):                     # head and foot rails (sirhana / painti)
        add('wood', limb('cot_end', (u, -d / 2, 0.42), (u, d / 2, 0.42), 0.06, 0.06))
    U, V = w / 2 - 0.09, d / 2 - 0.09

    def hz_(u, v):
        return 0.445 - 0.07 * (1 - (u / U) ** 2) * (1 - (v / V) ** 2)
    tones = [0xB4A07A, 0xA89470, 0xBEAA84]
    for fam in (1, -1):
        c0 = -(U + V)
        k = 0
        while c0 < U + V:
            # the line u = fam * v + c0, clipped to the inner rectangle
            vs = []
            for v in (-V, V):
                u = fam * v + c0
                if -U <= u <= U:
                    vs.append(v)
            for u in (-U, U):
                v = (u - c0) * fam
                if -V <= v <= V:
                    vs.append(v)
            if len(vs) >= 2:
                va, vb = min(vs), max(vs)
                if vb - va > 0.04:
                    pts = []
                    m = max(2, int((vb - va) / 0.18) + 1)
                    for i in range(m + 1):
                        v = va + (vb - va) * i / m
                        u = fam * v + c0
                        over = 0.006 * (1 if (i + k + (fam > 0)) % 2 else -1)
                        pts.append((u, v, hz_(u, v) + over))
                    col = tones[(k + rr.randrange(3)) % 3] if fam > 0 else 0x9E8A66
                    for a, b in zip(pts, pts[1:]):
                        add('paint', limb('niwar', a, b, 0.03, 0.012), col)
            c0 += 0.11
            k += 1
    # rolled durrie at the head end: faded maroon with cream stripes
    for i in range(5):
        v0 = -d / 2 + 0.12 + i * (d - 0.24) / 5
        add('paint', limb('durrie', (-w / 2 + 0.25, v0, 0.49), (-w / 2 + 0.25, v0 + (d - 0.24) / 5, 0.49), 0.17, 0.15), 0x8A5048 if i % 2 == 0 else 0xC9B89A)
    xf_since(n0, at(ccx, ccz) @ Matrix.Rotation(-ang, 4, 'Z'))


woven_charpai(3.3, 1.2, 0.25, seed=3)
# matka on an iron ring stand, lota upside down on its mouth, a steel glass beside
mkx, mkz = 2.0, 2.6
add('metal', ring('matka_stand', mkx, mkz, 0.26, 0.215, 0.012, axis='y', seg=14, tube=4), 0x3E3A36)
for k in range(3):
    a = k / 3 * math.tau + 0.4
    add('metal', limb('stand_leg', (mkx + 0.215 * math.cos(a), mkz + 0.215 * math.sin(a), 0.26), (mkx + 0.24 * math.cos(a), mkz + 0.24 * math.sin(a), 0.0), 0.016), 0x3E3A36)
pk.pot(kit, mkx, mkz, 0.16, 0.9, 0xA8603C)
add('paint', blob('matka_wet', mkx, mkz, 0.056, 0.3, 11, n=12), 0x5E4A38)   # the sweating pot keeps the ground under it damp
add('paint', lathe('lota', mkx, mkz, [(0.04, 0.78), (0.05, 0.8), (0.03, 0.84), (0.075, 0.88), (0.085, 0.93), (0.065, 0.98), (0.0, 0.98)], seg=12), 0xA88A48)
add('paint', lathe('glass', mkx + 0.42, mkz + 0.1, [(0.0, 0.0), (0.03, 0.0), (0.038, 0.11), (0.034, 0.11), (0.0, 0.01)], seg=10), 0xA9ADB0)
# phawda (wooden handle, blade at right angles) and hansiya lying by the charpai foot
n0 = len(kit.records)
add('wood', limb('phawda_handle', (0.0, 0.0, 0.2), (0.0, 1.0, 0.03), 0.04))
add('metal', wb('phawda_blade', -0.12, 0.12, -0.04, 0.0, 0.0, 0.24, 0.006), 0x6E6A64)
add('metal', limb('phawda_eye', (0.0, -0.02, 0.18), (0.0, 0.06, 0.17), 0.06), 0x5E5A54)
xf_since(n0, at(4.75, 2.25) @ Matrix.Rotation(-0.55, 4, 'Z'))
n0 = len(kit.records)
add('wood', limb('hansiya_h', (0.0, 0.0, 0.02), (0.0, 0.14, 0.02), 0.035))
arc = [(0.15 * (1 - math.cos(i * 2.6 / 6)), 0.14 + 0.15 * math.sin(i * 2.6 / 6), 0.012) for i in range(7)]
for a, b in zip(arc, arc[1:]):
    add('metal', limb('hansiya_b', a, b, 0.03, 0.006), 0x8A8C8E)
xf_since(n0, at(4.4, 3.05) @ Matrix.Rotation(1.9, 4, 'Z'))


def chappal_pair(ccx, ccz, ang, col, seed):
    rr = random.Random(seed)
    for side in (-1, 1):
        n0 = len(kit.records)
        add('paint', wb('sole', -0.045, 0.045, -0.13, 0.13, 0.0, 0.022, 0.008), 0xB8B0A0 if side < 0 else 0xB0A898)
        add('paint', limb('strap', (-0.04, 0.02, 0.026), (0.0, -0.08, 0.04), 0.014), col)
        add('paint', limb('strap', (0.04, 0.02, 0.026), (0.0, -0.08, 0.04), 0.014), col)
        xf_since(n0, at(ccx + side * 0.07 + rr.uniform(-0.03, 0.03), ccz + rr.uniform(-0.05, 0.05)) @ Matrix.Rotation(ang + rr.uniform(-0.35, 0.35), 4, 'Z'))


chappal_pair(-4.15, -1.18, 0.2, 0x3A5A7E, 1)       # at the kothri door
chappal_pair(2.55, 0.35, 1.2, 0x7A6038, 2)          # under the charpai edge
chappal_pair(-1.55, 1.85, -0.6, 0x5E3E3A, 3)        # by the hauz, kids splashing

# ---------------------------------------------------------------- use by the hauz: washing stone + soap, buckets, oil tin; hose on the wall; bicycle
n0 = len(kit.records)
add('trim', wb('wash_stone', -0.38, 0.38, -0.24, 0.24, 0.0, 0.09, 0.03), 0x86827A)
add('brick', wb('stone_prop', -0.3, 0.3, 0.16, 0.26, 0.0, 0.12, 0.006))
add('paint', wb('soap', -0.05, 0.05, -0.03, 0.03, 0.1, 0.13, 0.008), 0xC8BE86)
xf_since(n0, at(-1.55, 0.45) @ Matrix.Rotation(0.4, 4, 'Z'))
# plastic bucket (faded blue, mug inside) and a dented iron balti lying on its side
add('paint', cyl('bucket_p', -1.65, 1.35, 0.0, 0.32, 0.13, 0.17, 14), 0x4E6A80)
add('paint', cyl('bucket_p_rim', -1.65, 1.35, 0.3, 0.33, 0.18, None, 14), 0x46607A)
add('paint', ring('bucket_p_handle', -1.65, 1.35, 0.33, 0.17, 0.008, axis='z', seg=10, tube=3), 0x8A8E90)
add('paint', cyl('mug', -1.62, 1.33, 0.2, 0.31, 0.05, 0.055, 10), 0xB8783E)
n0 = len(kit.records)
add('metal', cyl('balti', 0.0, 0.0, 0.0, 0.3, 0.14, 0.18, 12), 0x8E8E88)
add('metal', ring('balti_rim', 0.0, 0.0, 0.3, 0.18, 0.012, axis='y', seg=12, tube=3), 0x7E7E78)
xf_since(n0, at(-1.15, -0.35, 0.18) @ Matrix.Rotation(0.7, 4, 'Z') @ Matrix.Rotation(1.45, 4, 'Y'))
add('metal', wb('oil_tin', -2.62, -2.46, -1.33, -1.17, 0.0, 0.22, 0.01), 0x6E7A64)
# hose coil hung on a nail on the kothri's right wall, near the back corner
add('metal', limb('nail', (x1, z0 + 0.4, 1.55), (x1 + 0.08, z0 + 0.4, 1.55), 0.012), 0x4E4A44)
for k in range(5):
    add('paint', ring('hose', x1 + 0.05 + k * 0.022, z0 + 0.4, 1.25 - k * 0.012, 0.3 - k * 0.012, 0.022, axis='x', seg=16, tube=4), 0x3A4A3C)
# roadster bicycle on its stand, leaning toward the kothri's right wall (front wheel to the front)
n0 = len(kit.records)
arch.bicycle(kit, 0.0, 0.0, col=0x3A3E44)
xf_since(n0, at(-1.5, -1.65) @ Matrix.Rotation(math.pi / 2, 4, 'Z') @ Matrix.Rotation(-0.12, 4, 'X'))

# the tree's root platform: a low brick ring where the shisham stands (tree is hers)
pk.brick_ring(kit, 4.3, -0.8, 0.9, 0, 0.18, 0.2, 16)
add('paint', cyl('root_soil', 4.3, -0.8, 0.0, 0.15, 0.82, 0.82, 16), 0x4A3A2A)
for k in range(14):                                   # fallen leaves under the canopy
    a, r = lr.uniform(0, math.tau), lr.uniform(0.9, 2.6)
    lx, lz = 4.3 + r * math.cos(a), -0.8 + r * math.sin(a)
    if lz > -4.9 and lx < 5.9:
        add('paint', blob('leaf', lx, lz, 0.056, 0.035, 60 + k, n=5, sq=0.5), [0x8A7A3E, 0x6E6A34, 0x9A8048][k % 3])

# ---------------------------------------------------------------- water material (not a library material: values from src/water.js's tubewell call)


def water_material():
    m = bpy.data.materials.new('village_water')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(0x46523C), 1.0)
    b.inputs['Roughness'].default_value = 0.12
    b.inputs['Metallic'].default_value = 0.0
    return m


wm = water_material()
for o in WATER_OBJS:
    o.data.materials.append(wm)
wobj = arch.join_objects(WATER_OBJS, 'tubewell_water')
box_uv(wobj, (1, 1, 1))
kit.extra.append(wobj)

TINTS = {'hb_plaster': '#FFF2D0', 'hb_trim': '#C9C6BE', 'hb_wood': '#8A6A48', 'hb_brick': '#A8705C', 'hb_metal': '#FFFFFF'}


def render():
    """three check renders into docs/shots/assets-tubewell/ (the exported glb is untouched)."""
    from mathutils import Vector as V
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    gm = load_pbr_material('ground', 'grass', repeat=(0.5, 0.5)) if os.path.isdir(os.path.join(ROOT, 'public', 'assets', 'textures', 'grass')) else load_pbr_material('ground', 'dryearth', repeat=(0.5, 0.5))
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.01))
    g = bpy.context.active_object
    g.data.materials.append(gm)
    box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 40
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
    d = os.path.join(ROOT, 'docs', 'shots', 'assets-tubewell')
    os.makedirs(d, exist_ok=True)
    # Blender frame: (wx, -wz, h)
    shots = [('a_front', (3.5, -11.5, 5.0), (-1.0, 0.0, 0.6), 24, (50, 0, 150)),
             ('b_hauz', (-0.2, -4.2, 2.1), (-3.3, 0.3, 0.5), 24, (55, 0, 160)),
             ('c_charpai', (6.5, -5.0, 2.4), (2.6, -1.2, 0.4), 26, (50, 0, 200))]
    for name, loc, look, lens, sun_rot in shots:
        sun.rotation_euler = tuple(math.radians(x) for x in sun_rot)
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(look) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(d, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)


kit.finalize(OUT, TINTS, drift={'hb_brick': 0.1})
if '--' in sys.argv and sys.argv[sys.argv.index('--') + 1:] == ['render']:
    render()
