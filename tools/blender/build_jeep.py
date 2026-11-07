"""
Jeep (VILLAGE_VOCABULARY.md section 13, nostalgic discoveries), 7 Nov. One hard-surface prop, parked by the village.
Generic: an old open-top army-surplus style utility jeep. No brand, no badge, no lettering, blank number plates, and a
NINE-slot grille (not the seven-slot trademark pattern).

  jeep_v2 : faded olive drab paint (sun-bleached on the bonnet and wings, chipped to rust on the edges, mud splash low
        down and behind each wheel). Open tub with the side cut-outs, flat front wings, a box bonnet, a windscreen folded
        flat onto the bonnet (frame, dusty glass, one wiper), the canvas hood folded into a strapped roll over the rear
        with its two steel bows laid back, a spare wheel on the tail panel and a jerrycan in a bracket on the left flank.
        Inside: two canvas bucket seats, side benches over the rear wheelhouses, dashboard with gauges, steering wheel on
        the RIGHT (Indian right-hand drive), gear and transfer levers. Under: ladder chassis rails, both axles with the
        differential, leaf springs, exhaust and silencer. Lug-tread tyres (MODELLED tread), pressed-steel rims, hub caps.

FACING: front toward +Z (glTF/three.js +Z = arch frame +wz). Origin on the ground midway between the axles. Wheels touch y=0.
Driver's seat is on the jeep's right, which is -wx in this frame (looking along +wz, right hand = -wx).
Meshes: hb_metal (painted steel, the shared 'metal' set, repeat 1.0), hb_main (rubber, canvas seats, glass, lenses: the
shared plaster set, repeat 0.5) and hb_thatch (the folded canvas hood: the shared 'tarpaulin' set riding the thatch slot
via tex_override, repeat 1.0), exactly the arrangement tools/blender/build_scooter.py uses. Its helpers are imported, not
copied. Colour and wear are per-vertex, then Kit.finalize's dirty-vertex AO.

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_jeep.py [-- render]
  node tools/shrink.js tmp/jeep_v2_raw.glb public/assets/models/jeep_v2.glb 999999
  node tools/strip-textures.mjs --relink public/assets/models/jeep_v2.glb public/assets/models/jeep_v2.glb
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import limb, new_bmesh_obj, wb
import arch
import build_scooter as bs          # helpers (rev, tube, polytube, loft, tread_tyre, fender, wear modes, Adder, render)
from build_scooter import B, rev, tube, polytube, loft, tread_tyre, fender, L, _lerp, _hash, Adder, new_kit, tri_count, render

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RND = random.Random(1971)

OLIVE = 0x72745a        # faded olive drab (never full saturation)
KHAKI_CANVAS = 0x8a7f5e  # the folded hood: sun-bleached khaki canvas
SEAT = 0x575239
BLACK = 0x2c2c2a
RUBBER = 0x2f2e2c
CHROME = 0x8e8f8a
GLASS = 0x7d8580
PLATE = 0xbfb79c
MUD = 0x6b5a45

FZ, RZ, HY = 1.015, -1.015, 0.355      # 2.03 m wheelbase, 0.355 m tyre radius (6.00-16)
TX = 0.62                               # half track


# ================================================================ jeep-specific weathering (falls back to the scooter's modes)
def jeep_wear(obj, base_hex, mode, seed):
    me = obj.data
    if 'Base' not in me.color_attributes:
        me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    layer = me.color_attributes['Base']
    base = L(base_hex)
    unit = 1.0 + RND.uniform(-0.05, 0.05)        # every panel a slightly different olive: repaints, sun, replaced parts
    out = []
    for lp in me.loops:
        v = me.vertices[lp.vertex_index]
        x, y, z = v.co                           # Blender frame: y = -wz
        n = v.normal
        j = 1.0 + (_hash(x, y, z, seed) - 0.5) * 0.12
        c = [ch * unit * j for ch in base]
        # sun fade on everything that faces the sky, a little on the flanks
        c = _lerp(c, _lerp(c, L(0x9a9a86), 0.55), 0.50 * max(0.0, n.z) + 0.08)
        # mud: splash band low down, heavier in a fan behind each wheel
        low = max(0.0, (0.75 - z) / 0.45)
        behind = 0.0
        for az in (FZ, RZ):
            dz = (-y) - az                       # wz relative to the axle; behind = negative
            if -0.75 < dz < 0.1 and z < 0.9:
                behind = max(behind, (1.0 - abs(dz + 0.35) / 0.45) * max(0.0, (0.9 - z) / 0.5))
        splat = 0.6 + 0.4 * math.sin(x * 31 + y * 17) * math.sin(y * 23 + z * 41)
        c = _lerp(c, L(MUD), min(0.75, 0.10 + 0.40 * low * splat + 0.35 * behind * splat))
        # a dust film on the upward faces
        c = _lerp(c, L(0x8a7c64), 0.14 * max(0.0, n.z))
        # rain runs under edges on the vertical faces
        if abs(n.z) < 0.4:
            run = max(0.0, math.sin(x * 47 + y * 53 + seed)) ** 8
            c = _lerp(c, L(0x4c4636), 0.25 * run)
        # chips: rust mostly, a few to bare steel, more on the high edges hands and boots touch
        h = _hash(round(x * 45), round(y * 45), round(z * 45), seed + 3)
        edge = 0.04 if z > 0.95 else 0.0
        if h > 0.93 - edge:
            c = _lerp(c, L(0x6a4430 if h < 0.975 else 0x7c7c77), 0.7)
        out.extend((min(c[0], 0.80), min(c[1], 0.80), min(c[2], 0.80), 1.0))
    layer.data.foreach_set('color', out)
    me.color_attributes.active_color = layer


_scooter_hook = arch.colorize


def colorize_hook(obj, hex_color, attr='Col'):
    if obj.get('wear') == 'jpaint' and attr == 'Base':
        jeep_wear(obj, hex_color, 'jpaint', seed=len(obj.name) + RND.randint(0, 999))
        return obj
    return _scooter_hook(obj, hex_color, attr)


arch.colorize = colorize_hook


# ================================================================ helpers
def mv(o, rot=None, loc=(0, 0, 0)):
    """Rotate (Blender Matrix) then move an object's mesh to an arch-frame location."""
    if rot is not None:
        o.data.transform(rot)
    o.data.transform(Matrix.Translation(B(loc)))
    return o


def subdiv(o, cuts=2, min_area=0.05):
    """Split the big faces of a box so the vertex weathering (fade, mud, chips) has vertices to land on."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    big = [f for f in bm.faces if f.calc_area() > min_area]
    if big:
        bmesh.ops.subdivide_edges(bm, edges=list({e for f in big for e in f.edges}), cuts=cuts, use_grid_fill=True)
    bm.to_mesh(o.data)
    bm.free()
    return o


def sheet_x(name, wx, wzs, bot, top, rows=3):
    """A vertical panel in the plane wx, a quad grid over the wz samples from bot(wz) up to top(wz). Export is double-sided."""
    bm = bmesh.new()
    grid = []
    for wz in wzs:
        b, t = bot(wz), top(wz)
        grid.append([bm.verts.new(B((wx, wz, b + (t - b) * k / rows))) for k in range(rows + 1)])
    for i in range(len(grid) - 1):
        for k in range(rows):
            bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_bmesh_obj(name, bm)


def arch_h(wz, R=0.43):
    """Height of the rear wheel-arch cut at wz (0 outside the arch)."""
    d = abs(wz - RZ)
    return HY + math.sqrt(max(0.0, R * R - d * d)) if d < R else 0.0


def P(o, col, A):     # painted steel with the jeep weathering
    o['wear'] = 'jpaint'
    return A.kit.add('steel', o, bs.jit(col, 0.03))


# ================================================================ parts
def wheel(A, x, cz, hy, outward, rot=None, loc=None):
    """Tyre + pressed-steel rim + hub cap. outward = +1 / -1: the side the dished face shows. Axle along wx unless rot/loc
    re-place it (the spare)."""
    parts = []
    t = tread_tyre('tyre', 0.0, 0.0, 0.272, 0.083, seg=12, sides=5, depth=0.011)
    parts.append(A.R(t, RUBBER))
    s = outward
    rim = rev('rim', (-s * 0.07, 0.0, 0.0), (s * 0.07, 0.0, 0.0),
              [(0.0, 0.212), (0.45, 0.15), (1.0, 0.07)], seg=8)
    parts.append(P(rim, 0x6a6c55, A))
    parts.append(A.S(tube('hubcap', (s * 0.065, 0.0, 0.0), (s * 0.10, 0.0, 0.0), 0.062, 6, caps=True, r1=0.05), 0x77776c, 'chrome'))
    for o in parts:
        if rot is not None:
            o.data.transform(rot)
        o.data.transform(Matrix.Translation(B(loc if loc else (x, cz, hy))))


def build_jeep():
    kit = new_kit(tarp=True)
    A = Adder(kit)

    # ---- wheels
    for x, z in ((TX, FZ), (-TX, FZ), (TX, RZ), (-TX, RZ)):
        wheel(A, x, z, HY, 1 if x > 0 else -1)

    # ---- under: chassis rails, crossmember, axles + diffs, leaf springs, exhaust
    for s in (-1, 1):
        A.S(limb('rail', (s * 0.40, -1.62, 0.47), (s * 0.40, 1.62, 0.47), 0.06, 0.12), BLACK, 'rust')
        for az in (FZ, RZ):
            A.S(polytube('leaf', [(s * 0.46, az - 0.42, 0.44), (s * 0.46, az, 0.40), (s * 0.46, az + 0.42, 0.44)], 0.025, 3), BLACK, 'rust')
    A.S(limb('xmember', (-0.40, 1.58, 0.47), (0.40, 1.58, 0.47), 0.08, 0.10), BLACK, 'rust')
    for az, dx in ((FZ, -0.15), (RZ, 0.10)):
        A.S(tube('axle', (-0.56, az, HY), (0.56, az, HY), 0.04, 6, caps=True), BLACK, 'rust')
        A.S(rev('diff', (dx, az - 0.13, HY), (dx, az + 0.11, HY), [(0.0, 0.05), (0.4, 0.12), (1.0, 0.05)], seg=6), 0x3a3a34, 'alloy')
    A.S(tube('propshaft', (0.10, RZ + 0.1, HY), (0.0, 0.25, 0.45), 0.03, 5), BLACK, 'rust')
    A.S(polytube('exhaust', [(0.28, 0.55, 0.40), (0.30, 0.30, 0.34), (0.30, -0.40, 0.34), (0.32, -1.62, 0.36)], 0.022, 5), 0x4f4339, 'rust')
    A.S(rev('silencer', (0.30, -0.35, 0.34), (0.30, 0.05, 0.34), [(0, 0.04), (0.1, 0.075), (0.9, 0.075), (1, 0.04)], seg=6), 0x4a4038, 'rust')

    # ---- front: bumper, tow hooks, blank plate, grille (nine slots) with the radiator behind, headlamps, side lamps
    bump = wb('bumper', -0.82, 0.82, 1.60, 1.70, 0.40, 0.55, 0.0, segments=1)
    P(bump, OLIVE, A)
    for s in (-1, 1):
        A.S(polytube('hook', [(s * 0.55, 1.70, 0.50), (s * 0.55, 1.79, 0.49), (s * 0.55, 1.80, 0.43), (s * 0.55, 1.74, 0.41)], 0.016, 3), 0x4a4a42, 'rust')
    A.S(wb('plate_f', -0.19, 0.19, 1.700, 1.712, 0.415, 0.535, 0.0, segments=1), PLATE, 'paint')
    A.S(wb('radiator', -0.24, 0.24, 1.40, 1.45, 0.58, 0.96, 0.0, segments=1), 0x2a2a28, 'rust')
    GZ0, GZ1 = 1.48, 1.51
    P(wb('grille_l', -0.42, -0.22, GZ0, GZ1, 0.50, 1.03, 0.0, segments=1), OLIVE, A)
    P(wb('grille_r', 0.22, 0.42, GZ0, GZ1, 0.50, 1.03, 0.0, segments=1), OLIVE, A)
    P(wb('grille_t', -0.22, 0.22, GZ0, GZ1, 0.95, 1.03, 0.0, segments=1), OLIVE, A)
    P(wb('grille_b', -0.22, 0.22, GZ0, GZ1, 0.50, 0.60, 0.0, segments=1), OLIVE, A)
    nslot = 9
    bar_w = 0.022
    gap = (0.44 - (nslot - 1) * bar_w) / nslot
    for k in range(1, nslot):
        x0 = -0.22 + k * gap + (k - 1) * bar_w
        P(wb('slat', x0, x0 + bar_w, GZ0 + 0.004, GZ1, 0.60, 0.95, 0.0, segments=1), OLIVE, A)
    for s in (-1, 1):
        x = s * 0.32
        A.S(rev('lamp_bucket', (x, GZ1 - 0.01, 0.86), (x, GZ1 + 0.05, 0.86), [(0, 0.08), (0.8, 0.088), (1, 0.094)], seg=7), 0x6c6e60, 'chrome')
        A.R(rev('lens', (x, GZ1 + 0.045, 0.86), (x, GZ1 + 0.065, 0.86), [(0, 0.078), (1, 0.05)], seg=7), 0xa9a596, 'rubber')
        A.R(rev('side_lamp', (s * 0.33, GZ1, 0.66), (s * 0.33, GZ1 + 0.03, 0.66), [(0, 0.03), (1, 0.026)], seg=5), 0x9a7a40, 'rubber')

    # ---- bonnet (box with a crown, clips on its flanks), flat front wings, cowl with a hinge bar
    bon = subdiv(wb('bonnet', -0.405, 0.405, 0.55, 1.47, 0.70, 1.045, 0.02, segments=1), 1, 0.06)
    P(bon, OLIVE, A)
    A.S(limb('bonnet_rib', (0.0, 0.58, 1.047), (0.0, 1.44, 1.047), 0.05, 0.006), 0x63664a, 'paint')
    for s in (-1, 1):
        A.S(limb('clip', (s * 0.408, 1.05, 0.90), (s * 0.408, 1.05, 1.0), 0.012, 0.03), 0x3e3e36, 'rust')
        prof = [(0.45, 0.805), (1.46, 0.805), (1.60, 0.62), (1.62, 0.58), (1.59, 0.585), (1.445, 0.78), (0.45, 0.78)]
        wing = arch.prism_x('wing', min(s * 0.40, s * 0.80), max(s * 0.40, s * 0.80), prof)
        P(subdiv(wing, 1, 0.08), OLIVE, A)
        A.S(polytube('wing_lip', [(s * 0.80, 0.45, 0.79), (s * 0.80, 1.46, 0.79), (s * 0.80, 1.61, 0.60)], 0.012, 4), 0x6a6d52, 'paint')
        # inner wing / splash panel so the engine bay never shows through above the tyre
        P(wb('inner_wing', s * 0.40, s * 0.42, 0.55, 1.45, 0.50, 0.80, 0.0, segments=1), 0x46473a, A)
    cowl = subdiv(wb('cowl', -0.745, 0.745, 0.30, 0.56, 0.52, 1.07, 0.015, segments=1), 1, 0.08)
    P(cowl, OLIVE, A)
    A.S(tube('hinge', (-0.70, 0.565, 1.065), (0.70, 0.565, 1.065), 0.012, 5, caps=True), 0x4f513c, 'paint')

    # ---- windscreen folded flat forward onto the bonnet: frame, dusty glass, one parked wiper, rubber stop pads
    fz0, fz1, fh0, fh1 = 0.58, 1.02, 1.085, 1.075
    for s in (-1, 1):
        A.S(limb('ws_side', (s * 0.69, fz0, fh0), (s * 0.69, fz1, fh1), 0.035, 0.03), OLIVE, 'paint')
        A.R(limb('ws_pad', (s * 0.30, 0.98, 1.046), (s * 0.30, 0.98, 1.06), 0.05, 0.05), RUBBER)
    A.S(limb('ws_top', (-0.69, fz1, fh1), (0.69, fz1, fh1), 0.035, 0.03), OLIVE, 'paint')
    A.S(limb('ws_bot', (-0.69, fz0, fh0), (0.69, fz0, fh0), 0.04, 0.03), OLIVE, 'paint')
    A.R(limb('glass', (0.0, fz0 + 0.02, fh0 + 0.004), (0.0, fz1 - 0.02, fh1 + 0.004), 1.34, 0.008), GLASS)
    A.S(limb('wiper', (-0.40, fz0 + 0.03, fh0 + 0.016), (0.02, fz0 + 0.09, fh0 + 0.014), 0.012, 0.008), BLACK, 'rubber')

    # ---- tub: floor, side sheets with the door cut-out and the rear wheel arch, rolled top edge, tail panel, wheelhouses
    P(wb('floor', -0.73, 0.73, -1.63, 0.30, 0.50, 0.54, 0.0, segments=1), 0x65684d, A)
    wzs = [-1.635 + (0.305 + 1.635) * i / 13 for i in range(14)]
    wzs = [w for w in wzs if abs(w - RZ) > 0.46]
    for k in range(-5, 6):
        wzs.append(RZ + 0.43 * math.sin(k / 5 * math.pi / 2))    # dense samples round the arch so its curve is clean
    wzs = sorted(set(round(w, 4) for w in wzs))

    def top(wz):            # the tub top line: high at the rear, the scalloped door cut, up to the cowl
        if wz < -0.36:
            return 1.0
        if wz > 0.22:
            return 1.0 + (wz - 0.22) / 0.08 * 0.06
        t = (wz + 0.36) / 0.58
        return 0.76 + 0.24 * (math.cos(t * math.pi * 2) * 0.5 + 0.5) ** 1.6

    def bot(wz):
        return max(0.50, arch_h(wz))

    for s in (-1, 1):
        P(sheet_x('tub_side', s * 0.745, wzs, bot, top, rows=2), OLIVE, A)
        A.S(polytube('tub_roll', [(s * 0.737, wz, top(wz) + 0.008) for wz in [-1.635, -0.40, -0.33, -0.26, -0.18, -0.10, -0.02, 0.06, 0.14, 0.22, 0.30]], 0.014, 3), OLIVE, 'jpaint')
        # rear wheelhouse (inside the tub) and a pressed lip round the arch outside
        A.S(fender('wheelhouse', RZ, HY, 0.43, 18, 162, 6, [(s * 0.50, 0.0), (s * 0.745, 0.0)]), 0x63664b, 'jpaint')
        P(sheet_x('wh_wall', s * 0.50, [RZ + 0.43 * math.cos(math.radians(a)) for a in range(162, 17, -36)], lambda wz: 0.50, lambda wz: max(0.5, arch_h(wz))), 0x63664b, A)
        A.S(fender('arch_lip', RZ, HY, 0.435, 15, 165, 7, [(s * 0.745, 0.0), (s * 0.775, -0.01)]), OLIVE, 'jpaint')
        # grab handle on the cowl flank
        A.S(polytube('grab', [(s * 0.745, 0.33, 0.96), (s * 0.775, 0.36, 0.96), (s * 0.775, 0.49, 0.96), (s * 0.745, 0.52, 0.96)], 0.011, 3), 0x4a4c3a, 'paint')
    P(subdiv(wb('tail', -0.76, 0.76, -1.665, -1.635, 0.50, 1.01, 0.01, segments=1), 1, 0.1), OLIVE, A)
    A.S(polytube('tail_roll', [(-0.75, -1.65, 1.015), (0.75, -1.65, 1.015)], 0.014, 4), OLIVE, 'jpaint')
    for s in (-1, 1):
        A.R(wb('tail_lamp', s * 0.70, s * 0.60, -1.69, -1.665, 0.80, 0.88, 0.0, segments=1), 0x7a2e26)
    A.S(wb('plate_r', -0.58, -0.30, -1.677, -1.665, 0.55, 0.67, 0.0, segments=1), PLATE, 'paint')

    # ---- spare wheel on the tail (axle along wz), bracket; jerrycan in a bracket on the left flank
    rot = Matrix.Rotation(math.pi / 2, 4, 'Z')
    wheel(A, 0, 0, 0, 1, rot=rot, loc=(0.36, -1.775, 0.78))
    A.S(limb('spare_bracket', (0.36, -1.67, 0.78), (0.36, -1.74, 0.78), 0.06, 0.06), BLACK, 'rust')
    jx = 0.775
    A.S(wb('jerrycan', jx, jx + 0.17, -1.52, -1.17, 0.56, 1.02, 0.0, segments=1), 0x5e6646, 'paint')
    for zz in (-1.43, -1.26):
        A.S(limb('can_rib', (jx + 0.172, zz, 0.60), (jx + 0.172, zz + 0.0, 0.96), 0.008, 0.02), 0x4f5239, 'paint')
    A.S(limb('can_x1', (jx + 0.172, -1.48, 0.62), (jx + 0.172, -1.21, 0.96), 0.006, 0.02), 0x4f5239, 'paint')
    A.S(limb('can_x2', (jx + 0.172, -1.48, 0.96), (jx + 0.172, -1.21, 0.62), 0.006, 0.02), 0x4f5239, 'paint')
    A.S(limb('can_strap', (jx - 0.01, -1.345, 0.80), (jx + 0.18, -1.345, 0.80), 0.03, 0.012), BLACK, 'rust')
    A.S(polytube('can_handle', [(jx + 0.03, -1.47, 1.02), (jx + 0.06, -1.47, 1.05), (jx + 0.11, -1.47, 1.05), (jx + 0.14, -1.47, 1.02)], 0.01, 4), 0x5e6646, 'paint')

    # ---- mirror on the driver's (right, -wx) side
    A.S(tube('mirror_arm', (-0.745, 0.45, 1.0), (-0.86, 0.42, 1.16), 0.008, 4), BLACK, 'paint')
    A.S(rev('mirror', (-0.88, 0.40, 1.19), (-0.87, 0.43, 1.19), [(0, 0.065), (1, 0.06)], seg=8), BLACK, 'paint')

    # ---- inside: dashboard + gauges, steering column + wheel (right-hand drive), levers, bucket seats, rear side benches
    for gx in (-0.48, -0.36, -0.24):
        A.R(tube('gauge', (gx, 0.295, 0.92), (gx, 0.285, 0.92), 0.035, 5, caps=True), 0x3d3c36, 'rubber')
    A.S(limb('glovebox', (0.35, 0.298, 0.86), (0.35, 0.298, 0.96), 0.30, 0.01), 0x6a6d52, 'paint')
    DX = -0.36
    A.S(tube('column', (DX, 0.38, 0.70), (DX, 0.08, 0.98), 0.022, 6), BLACK, 'paint')
    sw = arch.ring('steer', 0.0, 0.0, 0.0, 0.19, 0.014, axis='y', seg=12, tube=3)
    sw_rot = Matrix.Rotation(math.radians(-48), 4, 'X')
    A.R(mv(sw, sw_rot, (DX, 0.07, 0.99)), 0x2b2926)
    for a in (90, 210, 330):
        sp = limb('spoke', (0.0, 0.0, 0.0), (0.18 * math.cos(math.radians(a)), 0.18 * math.sin(math.radians(a)), 0.0), 0.02, 0.008)
        A.R(mv(sp, sw_rot, (DX, 0.07, 0.99)), 0x2b2926)
    for lx, lz, lean in ((-0.06, 0.10, 0.10), (0.04, 0.12, -0.05)):
        A.S(polytube('lever', [(lx, lz, 0.54), (lx + lean * 0.3, lz - 0.05, 0.75), (lx + lean * 0.5, lz - 0.08, 0.86)], 0.01, 4), BLACK, 'paint')
        A.R(tube('knob', (lx + lean * 0.5, lz - 0.08, 0.85), (lx + lean * 0.5, lz - 0.08, 0.90), 0.024, 5, caps=True), 0x2f2b26)
    for s in (-1, 1):
        x = s * 0.36
        A.R(wb('seat', x - 0.21, x + 0.21, -0.32, 0.08, 0.66, 0.77, 0.03, segments=1), SEAT, 'leather')
        A.R(limb('seat_back', (x, -0.33, 0.74), (x, -0.42, 1.14), 0.40, 0.08), SEAT, 'leather')
        A.S(wb('seat_box', x - 0.18, x + 0.18, -0.28, 0.04, 0.54, 0.66, 0.0, segments=1), 0x5d604a, 'paint')
        A.R(wb('bench', s * 0.50, s * 0.71, -1.58, -0.52, 0.79, 0.87, 0.0, segments=1), SEAT, 'leather')
        A.R(limb('bench_back', (s * 0.715, -1.55, 0.88), (s * 0.715, -0.55, 0.88), 0.025, 0.14), SEAT, 'leather')

    # ---- the canvas hood folded into a roll over the tail, two strapped bands, its two steel bows laid back
    NU, NV = 10, 8
    secs = []
    ph = [RND.uniform(0, 6.28) for _ in range(4)]
    for i in range(NU + 1):
        wx = -0.70 + 1.40 * i / NU
        endtaper = 1.0 - 0.35 * max(0.0, abs(wx) - 0.55) / 0.15
        ring = []
        for j in range(NV):
            a = j / NV * math.tau
            fold = 1.0 + 0.10 * math.sin(a * 3 + wx * 9 + ph[0]) + 0.06 * math.sin(a * 5 - wx * 13 + ph[1])
            rz, rh = 0.17 * endtaper * fold, 0.10 * endtaper * fold
            sag = -0.02 * math.cos(wx / 0.7 * math.pi / 2) * 0          # flat, it rests on the tail and bench backs
            ring.append((wx, -1.47 + rz * math.cos(a), 1.115 + sag + rh * math.sin(a) + 0.012 * math.sin(wx * 17 + ph[2])))
        secs.append(ring)
    A.T(loft('hood_roll', secs, closed=True, caps=True), KHAKI_CANVAS)
    for bx in (-0.42, 0.40):
        pts = [(bx, -1.47 + 0.185 * math.cos(j / 6 * math.tau), 1.115 + 0.115 * math.sin(j / 6 * math.tau)) for j in range(7)]
        A.R(polytube('hood_strap', pts, 0.012, 3), 0x4a4532, 'leather')
    for k, (bz, bh) in enumerate(((-1.30, 1.25), (-1.38, 1.30))):
        pts = [(-0.735, -0.62 - 0.05 * k, 1.0), (-0.74, bz, bh - 0.06), (-0.62, bz - 0.08, bh), (0.62, bz - 0.08, bh),
               (0.74, bz, bh - 0.06), (0.735, -0.62 - 0.05 * k, 1.0)]
        A.S(polytube('bow', pts, 0.013, 4), 0x60634a, 'jpaint')
    return kit


# ================================================================ export, count, render
if __name__ == '__main__':
    do_render = '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--'):]
    shots = os.path.join(ROOT, 'docs', 'shots', 'assets-jeep')
    slot = 'jeep_v2'
    kit = build_jeep()
    if os.environ.get('TRI_DEBUG'):
        agg = {}
        for _, o, _ in kit.records:
            o.data.calc_loop_triangles()
            k = o.name.split('.')[0]
            agg[k] = agg.get(k, 0) + len(o.data.loop_triangles)
        print('BREAKDOWN', slot, sorted(agg.items(), key=lambda kv: -kv[1]))
    kit.finalize(os.path.join(ROOT, 'tmp', slot + '_raw.glb'), {}, drift_amp=0.05, ao_strength=0.45)
    objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('hb_')]
    for o in objs:
        print('mesh', slot, o.name, 'tris', tri_count([o]))
    print('TRIANGLES', slot, tri_count(objs))
    if do_render:
        # Blender frame: front (+wz) is Blender -Y. Driver's side front three-quarter, passenger rear three-quarter, high.
        render(os.path.join(shots, slot + '_front34.png'), (-4.2, -4.4, 1.9), (0.0, -0.1, 0.65), lens=38)
        render(os.path.join(shots, slot + '_rear34.png'), (4.0, 4.6, 2.3), (0.0, 0.1, 0.7), lens=38)
        render(os.path.join(shots, slot + '_top.png'), (2.6, -2.2, 4.6), (0.0, 0.0, 0.6), lens=34)
