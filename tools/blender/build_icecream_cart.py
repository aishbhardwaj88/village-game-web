"""
Ice-cream cart family (7 Nov): a 1990s UP village ice-cream / kulfi push cart ('thela'). Hard-surface only, no vendor.
Generic: no brand, no logo, no lettering. The painted side panels carry only pictures (a cone, a stick kulfi, a cup) and stripes.

  icecream_cart    : off-white insulated sheet-steel box with faded sky-blue bands, faded red and cream umbrella,
                     small tin stock box on the front of the bed, brass bell hung on the push bar's right side.
  icecream_cart_b  : yellowed box with faded green bands, faded blue and ochre umbrella tilted the other way,
                     slatted wooden stock crate instead of the tin, bell on the left, a rag over the lid, one leg bent.

Build: a wooden plank bed on two steel angle rails that sweep up into the push bar, two bicycle wheels on a dead axle,
two front rest legs. On the bed the insulated box: banded body, steel corner trims and band straps with rivets, a steel
top rim, two round lids with knobs and hinges, painted framed pictures on both long sides, chips and rust runs modelled
as thin proud geometry. A pole clamped to the box's back corner carries an 8-panel umbrella with scalloped edges and ribs.

FACING: the cart runs along X. Push bar at -X (the vendor's end), the rest legs at +X. Long painted sides face +Z and -Z.
Origin on the ground under the box centre. Wheels and leg feet touch y = 0. Size ~1.9 (X) x 0.82 (Z) x 2.15 (Y) m.

Meshes per model (one material each, all frozen library sets):
  hb_metal  : box, frame, rims, spokes, bell, tin (the shared 'metal' set, repeat 1.0)
  hb_wood   : bed planks, grips, crate (the shared 'wood' set, repeat 1.0, plank_wood relief)
  hb_main   : tyres, rag, string (the shared plaster set, repeat 0.5)
  hb_thatch : umbrella canopy (the shared 'tarpaulin' set riding the thatch slot, as build_scooter.py / build_goods_yard.py do)
Colour and wear are per-vertex (sun-faded tops, dust rising from the ground, chips, rust), then Kit.finalize's dirty-vertex AO.

Run (from the repo root):
  ~/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_icecream_cart.py [-- render]
  for s in icecream_cart icecream_cart_b; do
    node tools/shrink.js tmp/${s}_raw.glb public/assets/models/$s.glb 999999
    node tools/strip-textures.mjs --relink public/assets/models/$s.glb public/assets/models/$s.glb
  done
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import bmesh
from mathutils import Vector, Matrix
from common import ROOT, wb, cyl, limb, sphere, prism_z, quad, new_bmesh_obj, load_pbr_material, box_uv, hex_to_linear_rgb
import arch
from arch import Kit, ring, lathe

RND = random.Random(7)

VARIANT = {
    'a': dict(box=0xD6D0BF, band=0x6F93A3, trim=0x8E918C, frame=0x3F4741, panel=0xCDBF97, border=0x3E4A52,
              cone=0xB88A50, scoop=(0xC38E8C, 0xD8C9A6), kulfi=0x9A6448, umb=(0x9E4A3E, 0xCFC3A4), tilt=0.07,
              bell_side=1, stock='tin', rag=False, leg_bend=0.0, seed=11),
    'b': dict(box=0xD2C7A8, band=0x6E8C68, trim=0x878A84, frame=0x3A3631, panel=0xC6B48A, border=0x5A3B31,
              cone=0xAE7D45, scoop=(0xB9A0B0, 0xC9B07A), kulfi=0x8E5A3E, umb=(0x50708C, 0xC39B4E), tilt=-0.09,
              bell_side=-1, stock='crate', rag=True, leg_bend=0.035, seed=23),
}

# box envelope
BX0, BX1, BZ, BH0, BH1 = -0.50, 0.50, 0.28, 0.60, 1.12
WHEEL_X, WHEEL_Z, R_OUT = -0.06, 0.40, 0.33


# ================================================================ colour and wear (per vertex, like build_scooter.py)
def _fr(x):
    return x - math.floor(x)


def _hash(x, y, z, s):
    return _fr(math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453)


def _lerp(c, d, t):
    t = max(0.0, min(1.0, t))
    return [c[i] + (d[i] - c[i]) * t for i in range(3)]


def L(h):
    return list(hex_to_linear_rgb(h))


DUST, FADE, RUST, BARE, SOOT = 0x75695A, 0xB8B4A8, 0x6A4029, 0x85847E, 0x3A3530


def wear_colour(obj, base_hex, mode, seed):
    me = obj.data
    if 'Base' not in me.color_attributes:
        me.color_attributes.new(name='Base', type='BYTE_COLOR', domain='CORNER')
    layer = me.color_attributes['Base']
    base = L(base_hex)
    unit = 1.0 + RND.uniform(-0.05, 0.05)
    mw = obj.matrix_world
    out = []
    for lp in me.loops:
        v = me.vertices[lp.vertex_index]
        x, y, z = mw @ v.co
        n = v.normal
        j = 1.0 + (_hash(x, y, z, seed) - 0.5) * 0.08
        c = [ch * unit * j for ch in base]
        low = max(0.0, (0.55 - z) / 0.55)
        if mode == 'paint':        # painted steel / enamel: sun fade on top faces, dust rising, speckle chips
            c = _lerp(c, _lerp(c, L(FADE), 0.55), 0.5 * max(0.0, n.z))
            c = _lerp(c, L(DUST), 0.06 + 0.5 * low + 0.10 * max(0.0, n.z))
            h = _hash(round(x * 50), round(y * 50), round(z * 50), seed + 3)
            if h > 0.93:
                c = _lerp(c, L(RUST if h < 0.965 else BARE), 0.6)
        elif mode == 'box':        # the insulated box body: grime grading up from the bed line, sun-faded lid
            rel = max(0.0, min(1.0, (z - BH0) / (BH1 - BH0)))
            c = _lerp(c, L(DUST), 0.30 * (1.0 - rel) ** 2)
            c = _lerp(c, _lerp(c, L(FADE), 0.4), 0.35 * max(0.0, n.z))
            c = _lerp(c, L(SOOT), 0.05 * (0.5 + 0.5 * math.sin(x * 7 + y * 5 + seed)))   # handled-grime clouds
        elif mode == 'chrome':
            spot = math.sin(x * 41 + seed) * math.sin(y * 37 + z * 29) * math.sin(z * 53 + x * 13)
            c = _lerp(c, L(RUST), max(0.0, spot - 0.1) * 1.4 + 0.12)
            c = _lerp(c, L(DUST), 0.10 + 0.4 * low)
        elif mode == 'brass':      # dull brown patina, brighter on the rubbed rim and shoulder
            c = _lerp(c, L(0x5A4A2C), 0.12 + 0.10 * math.sin(x * 60 + z * 80 + seed))
            c = _lerp(c, L(0xC9A65C), 0.35 * max(0.0, -n.z) + 0.25 * max(0.0, n.z))
        elif mode == 'rubber':
            c = _lerp(c, L(DUST), 0.15 + 0.5 * low * max(0.0, -n.z + 0.4))
        elif mode == 'cloth':
            c = _lerp(c, L(0x6A5E4E), 0.2 * (0.5 + 0.5 * math.sin(x * 40 + y * 33)))
            c = _lerp(c, L(DUST), 0.12)
        elif mode == 'tarp':       # umbrella canvas: bleached on top, water stains toward the scalloped edge
            up = max(0.0, n.z)
            c = _lerp(c, _lerp(c, L(0xD2CBB8), 0.6), 0.55 * up ** 1.5)
            r = math.hypot(x - CANOPY[0], y - CANOPY[1])
            c = _lerp(c, L(0x5A5248), 0.25 * max(0.0, (r - 0.45) / 0.35) * (0.5 + 0.5 * math.sin(math.atan2(y, x) * 9 + seed)))
            c = _lerp(c, L(0x3F3A33), 0.35 * max(0.0, -n.z))            # underside in its own shade
        out.extend((min(c[0], 0.8), min(c[1], 0.8), min(c[2], 0.8), 1.0))
    layer.data.foreach_set('color', out)
    me.color_attributes.active_color = layer


CANOPY = [0.0, 0.0]          # canopy centre in Blender x/y, set per build for the tarp stain falloff
_orig_colorize = arch.colorize


def colorize_hook(obj, hex_color, attr='Col'):
    mode = obj.get('wear')
    if mode and attr == 'Base':
        wear_colour(obj, hex_color, mode, seed=len(obj.name) + RND.randint(0, 999))
        return obj
    return _orig_colorize(obj, hex_color, attr)


arch.colorize = colorize_hook   # Kit.finalize calls arch.colorize by its module global


def jit(hexc, amt=0.05):
    r, g, b = (hexc >> 16) & 255, (hexc >> 8) & 255, hexc & 255
    k = 1.0 + RND.uniform(-amt, amt)
    return (min(255, int(r * k)) << 16) | (min(255, int(g * k)) << 8) | min(255, int(b * k))


def mix(a, b, t):
    ca = [(a >> s) & 255 for s in (16, 8, 0)]
    cb = [(b >> s) & 255 for s in (16, 8, 0)]
    c = [int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3)]
    return (c[0] << 16) | (c[1] << 8) | c[2]


class Adder:
    def __init__(self, kit):
        self.kit = kit

    def S(self, o, col, wear='paint'):          # steel / brass -> hb_metal
        o['wear'] = wear
        return self.kit.add('steel', o, jit(col, 0.04))

    def W(self, o, col):                         # wood -> hb_wood (plank_wood relief on big faces)
        return self.kit.add('wood', o, jit(col, 0.06))

    def R(self, o, col, wear='rubber'):          # rubber, cloth, string -> hb_main
        o['wear'] = wear
        return self.kit.add('rubber', o, jit(col, 0.04))

    def T(self, o, col):                         # canvas -> hb_thatch (tarpaulin set)
        o['wear'] = 'tarp'
        return self.kit.add('tarp', o, col)


def rot_mesh(obj, axis, ang, pivot):
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()
    p = Vector((pivot[0], -pivot[1], pivot[2]))
    obj.data.transform(Matrix.Translation(p) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-p))
    return obj


# ================================================================ parts
def wheel(A, cz, seed, rim_col):
    R = R_OUT - 0.028
    for o in (A.R(ring('tyre', WHEEL_X, cz, R_OUT, R, 0.028, axis='z', seg=16, tube=4), 0x2C2A27),
              A.S(ring('rim', WHEEL_X, cz, R_OUT, R - 0.03, 0.012, axis='z', seg=14, tube=3), rim_col, 'chrome')):
        for poly in o.data.polygons:
            poly.use_smooth = True
    hub = A.S(cyl('hub', 0, 0, -0.05, 0.05, 0.03, 0.03, seg=6), 0x6E6D68, 'chrome')
    rot_mesh(hub, 'X', math.pi / 2, (0, 0, 0))
    hub.data.transform(Matrix.Translation((WHEEL_X, -cz, R_OUT)))
    rr = random.Random(seed)
    for k in range(8):
        a = k / 8 * math.tau + rr.uniform(-0.05, 0.05)
        dz = 0.035 if k % 2 else -0.035
        A.S(limb('spoke', (WHEEL_X, cz + dz, R_OUT), (WHEEL_X + (R - 0.035) * math.cos(a), cz, R_OUT + (R - 0.035) * math.sin(a)), 0.005), rim_col, 'chrome')


def painted_side(A, v, sgn):
    """Framed picture panel on the long side at wz = sgn*BZ: a cone, a stick kulfi, a cup, dots. Proud of the face by mm."""
    z0 = sgn * BZ
    z1 = sgn * (BZ + 0.004)
    z2 = sgn * (BZ + 0.007)
    x0, x1, h0, h1 = -0.40, 0.40, 0.73, 1.00
    A.S(prism_z('panel', z0, z1, [(x0, h0), (x1, h0), (x1, h1), (x0, h1)]), v['panel'], 'paint')
    t = 0.018
    zb = sgn * (BZ + 0.008)
    for bx0, bx1, bh0, bh1 in ((x0, x1, h0, h0 + t), (x0, x1, h1 - t, h1), (x0, x0 + t, h0, h1), (x1 - t, x1, h0, h1)):
        A.S(wb('border', bx0, bx1, min(z0, zb), max(z0, zb), bh0, bh1, 0), v['border'], 'paint')
    # cone with two scoops (left third)
    cx = -0.24 if sgn > 0 else 0.24
    A.S(prism_z('cone', z1, z2, [(cx - 0.045, 0.875), (cx + 0.045, 0.875), (cx, 0.755)]), v['cone'], 'paint')
    for i, (dx, dh, col) in enumerate(((-0.02, 0.0, v['scoop'][0]), (0.022, 0.012, v['scoop'][1]))):
        prof = [(cx + dx + 0.04 * math.cos(a), 0.875 + dh + 0.04 * math.sin(a)) for a in [k / 4 * math.pi for k in range(5)]]
        A.S(prism_z('scoop', z1, z2 + sgn * 0.001 * i, prof), col, 'paint')
    # stick kulfi (middle)
    kx = 0.0
    prof = [(kx - 0.03, 0.80), (kx + 0.03, 0.80)] + [(kx + 0.03 * math.cos(a), 0.93 + 0.03 * math.sin(a)) for a in [k / 6 * math.pi for k in range(7)]]
    A.S(prism_z('kulfi', z1, z2, prof), v['kulfi'], 'paint')
    A.S(prism_z('stick', z1, z2, [(kx - 0.007, 0.76), (kx + 0.007, 0.76), (kx + 0.007, 0.80), (kx - 0.007, 0.80)]), 0xC9B68C, 'paint')
    # cup (right third)
    ux = 0.24 if sgn > 0 else -0.24
    A.S(prism_z('cup', z1, z2, [(ux - 0.035, 0.78), (ux + 0.035, 0.78), (ux + 0.05, 0.88), (ux - 0.05, 0.88)]), v['band'], 'paint')
    A.S(prism_z('cup_top', z1, z2 + sgn * 0.001, [(ux - 0.05, 0.88), (ux + 0.05, 0.88), (ux + 0.035, 0.92), (ux - 0.035, 0.92)]), v['scoop'][1], 'paint')
    # a row of painted dots under the pictures
    for k in range(5):
        dx = x0 + 0.12 + k * 0.14
        A.S(prism_z('dot', z1, z2, [(dx + 0.014 * math.cos(a), 0.745 + 0.014 * math.sin(a)) for a in [i / 4 * math.tau for i in range(4)]]), v['border'] if k % 2 else v['cone'], 'paint')


def box(A, v, rr):
    # body in three stacked bands: colour skirt, off-white middle, colour top band
    A.S(wb('box_skirt', BX0, BX1, -BZ, BZ, BH0, BH0 + 0.11, 0.012), v['band'], 'box')
    A.S(wb('box_mid', BX0 + 0.002, BX1 - 0.002, -BZ + 0.002, BZ - 0.002, BH0 + 0.11, BH1 - 0.08, 0.008), v['box'], 'box')
    A.S(wb('box_top', BX0, BX1, -BZ, BZ, BH1 - 0.08, BH1, 0.012), v['band'], 'box')
    # lid deck and rim
    A.S(wb('deck', BX0 + 0.01, BX1 - 0.01, -BZ + 0.01, BZ - 0.01, BH1, BH1 + 0.012, 0.004), mix(v['box'], 0x9A968C, 0.25), 'box')
    for s in (-1, 1):
        A.S(limb('rim', (BX0 - 0.006, s * (BZ + 0.004), BH1 + 0.004), (BX1 + 0.006, s * (BZ + 0.004), BH1 + 0.004), 0.022, 0.012), v['trim'], 'chrome')
        A.S(limb('rim_e', (s * (BX1 + 0.004), -BZ, BH1 + 0.004), (s * (BX1 + 0.004), BZ, BH1 + 0.004), 0.022, 0.012), v['trim'], 'chrome')
    # corner trims (angle strips) and band straps at the band seams, rivets along the straps
    for sx in (BX0, BX1):
        for sz in (-BZ, BZ):
            A.S(limb('corner', (sx, sz, BH0 - 0.005), (sx, sz, BH1 + 0.008), 0.03, 0.03), v['trim'], 'chrome')
    for hh in (BH0 + 0.11, BH1 - 0.08):
        for s in (-1, 1):
            A.S(wb('strap', BX0, BX1, s * BZ, s * (BZ + 0.006), hh - 0.008, hh + 0.008, 0), v['trim'], 'chrome')
            A.S(wb('strap_e', s * BX1, s * (BX1 + 0.006), -BZ, BZ, hh - 0.008, hh + 0.008, 0), v['trim'], 'chrome')
    for s in (-1, 1):
        for k in range(5):
            x = BX0 + 0.1 + k * 0.2
            A.S(wb('rivet', x - 0.006, x + 0.006, s * (BZ + 0.005), s * (BZ + 0.0095), BH1 - 0.086, BH1 - 0.074, 0), 0x77756F, 'chrome')
    # two round lids with a knob each and a hinge strip
    for i, lx in enumerate((-0.22, 0.22)):
        A.S(cyl('lid', lx, 0.0, BH1 + 0.012, BH1 + 0.034, 0.14, 0.135, seg=12), mix(v['trim'], v['box'], 0.35), 'paint')
        A.S(cyl('lid_ring', lx, 0.0, BH1 + 0.012, BH1 + 0.02, 0.152, 0.152, seg=12), v['trim'], 'chrome')
        A.S(cyl('knob', lx, 0.0, BH1 + 0.034, BH1 + 0.07, 0.016, 0.026, seg=6), 0x55534E, 'chrome')
        A.S(limb('hinge', (lx - 0.05, -0.155, BH1 + 0.02), (lx + 0.05, -0.155, BH1 + 0.02), 0.012, 0.02), v['trim'], 'chrome')
    # pictures on both long sides, plain stripes on the ends
    for s in (-1, 1):
        painted_side(A, v, s)
        for k, hh in enumerate((0.80, 0.86, 0.92)):
            A.S(wb('end_stripe', s * BX1, s * (BX1 + 0.004), -0.2, 0.2, hh - 0.011, hh + 0.011, 0), v['border'] if k == 1 else v['cone'], 'paint')
    # chips through the paint (dark steel/rust flecks) and rust runs below the top strap and the lower corners
    for k in range(10):
        side = rr.choice((-1, 1))
        x = rr.uniform(BX0 + 0.03, BX1 - 0.03)
        hh = BH0 + 0.02 + (rr.random() ** 1.8) * (BH1 - BH0 - 0.05)
        w, t = rr.uniform(0.006, 0.02), rr.uniform(0.004, 0.012)
        A.S(wb('chip', x, x + w, side * BZ, side * (BZ + 0.0025), hh, hh + t, 0), mix(RUST, 0x4A4640, rr.random() * 0.6), 'chrome')
    for k in range(4):
        side = rr.choice((-1, 1))
        x = BX0 + 0.1 + rr.randint(0, 4) * 0.2
        ln = rr.uniform(0.05, 0.14)
        A.S(wb('run', x - 0.003, x + 0.003, side * BZ, side * (BZ + 0.0022), BH1 - 0.09 - ln, BH1 - 0.09, 0), mix(v['band'], RUST, 0.6), 'chrome')


def frame(A, v, rr):
    col = v['frame']
    # rails: steel angle under the bed, rising at the back into the push-bar uprights
    for s in (-1, 1):
        z = s * 0.30
        A.S(limb('rail', (0.86, z, 0.54), (-0.66, z, 0.54), 0.04, 0.04), col)
        A.S(limb('rail_up', (-0.66, z, 0.54), (-1.0, z * 0.98, 0.93), 0.034, 0.034), col)
        # front rest leg (B bends one a touch), with a flat foot
        bend = v['leg_bend'] if s > 0 else 0.0
        A.S(limb('leg', (0.74, z, 0.54), (0.76 + bend, z + s * bend, 0.02), 0.032, 0.032), col)
        A.S(limb('foot', (0.73 + bend, z + s * bend, 0.01), (0.82 + bend, z + s * bend, 0.01), 0.05, 0.02), col)
        # axle brackets: two struts per side from the rail to the axle end
        for dx in (-0.12, 0.12):
            A.S(limb('bracket', (WHEEL_X + dx, z, 0.53), (WHEEL_X, s * 0.33, R_OUT), 0.022, 0.022), col)
    A.S(limb('axle', (WHEEL_X, -0.43, R_OUT), (WHEEL_X, 0.43, R_OUT), 0.026, 0.026), 0x4E4B46, 'chrome')
    for x in (0.80, 0.30, -0.30, -0.62):
        A.S(limb('cross', (x, -0.30, 0.53), (x, 0.30, 0.53), 0.03, 0.03), col)
    A.S(limb('leg_brace', (0.75, -0.30, 0.20), (0.75, 0.30, 0.20), 0.022, 0.022), col)
    # push bar with wooden grips at both ends
    A.S(limb('push_bar', (-1.0, -0.36, 0.93), (-1.0, 0.36, 0.93), 0.032, 0.032), col)
    for s in (-1, 1):
        A.W(cyl('grip', 0, 0, -0.07, 0.07, 0.021, 0.021, seg=8), 0x6E4E33)
        g = A.kit.records[-1][1]
        rot_mesh(g, 'X', math.pi / 2, (0, 0, 0))
        g.data.transform(Matrix.Translation((-1.0, -(s * 0.27), 0.93)))
    # bed: one plank deck (plank_wood cuts it into real planks), front lip
    A.W(wb('bed', -0.66, 0.86, -0.33, 0.33, 0.56, 0.60, 0.006), 0x8A6A48)
    A.W(wb('bed_lip', 0.84, 0.88, -0.33, 0.33, 0.60, 0.66, 0.004), 0x7A5C3E)


def stock_box(A, v, rr):
    if v['stock'] == 'tin':
        A.S(wb('tin', 0.57, 0.80, -0.16, 0.13, 0.60, 0.78, 0.008), 0x8C8F86, 'paint')
        A.S(wb('tin_lid', 0.565, 0.805, -0.165, 0.135, 0.78, 0.80, 0.006), 0x7E817A, 'paint')
        A.S(limb('hasp', (0.805, -0.015, 0.74), (0.805, -0.015, 0.80), 0.02, 0.006), 0x5E5C57, 'chrome')
        A.S(limb('tin_handle', (0.62, -0.015, 0.815), (0.75, -0.015, 0.815), 0.012, 0.012), 0x5E5C57, 'chrome')
        A.S(wb('tin_rust', 0.57, 0.80, 0.13, 0.1325, 0.605, 0.63, 0), RUST, 'chrome')
    else:
        # slatted crate: four corner posts, three side slats a side, a plank bottom showing at the ends
        x0, x1, z0, z1 = 0.57, 0.81, -0.17, 0.15
        for x in (x0 + 0.015, x1 - 0.015):
            for z in (z0 + 0.015, z1 - 0.015):
                A.W(limb('post', (x, z, 0.60), (x, z, 0.80), 0.03, 0.03), 0x9A7A52)
        for k, hh in enumerate((0.63, 0.69, 0.75)):
            for z in (z0, z1):
                A.W(limb('slat', (x0, z, hh), (x1, z, hh), 0.04, 0.012), jit(0x9C7C55, 0.12))
            for x in (x0, x1):
                A.W(limb('slat_e', (x, z0, hh), (x, z1, hh), 0.012, 0.04), jit(0x93744E, 0.12))
        # bundle of paper cone sleeves standing in it
        for k in range(3):
            A.R(cyl('sleeves', 0.64 + k * 0.06, -0.03 + 0.04 * (k % 2), 0.62, 0.82 + 0.02 * k, 0.025, 0.028, seg=6), 0xB8AE96, 'cloth')


def bell(A, v):
    s = v['bell_side']
    bx, bz = -1.0, s * 0.18
    A.S(ring('bell_hook', bx, bz, 0.93, 0.024, 0.004, axis='x', seg=8, tube=3), 0x6A6862, 'chrome')
    A.R(limb('bell_string', (bx, bz, 0.905), (bx + 0.004, bz, 0.84), 0.004), 0x8C7A5A, 'cloth')
    A.S(cyl('bell_handle', bx + 0.004, bz, 0.80, 0.845, 0.009, 0.012, seg=6), 0x9A7A3E, 'brass')
    A.S(lathe('bell_cup', bx + 0.004, bz, [(0.012, 0.80), (0.028, 0.795), (0.036, 0.775), (0.040, 0.745), (0.048, 0.725), (0.050, 0.718)], seg=12, smooth=True), 0xB89048, 'brass')
    A.S(sphere('clapper', bx + 0.004, bz, 0.716, 0.011, 0.011, 0.011, 1), 0x6B5832, 'brass')


def umbrella(A, v, rr):
    """Pole clamped to the box's back corner, 8-panel canopy with scalloped edges, ribs and stretchers, a finial."""
    px, pz = BX0 - 0.03, -(BZ + 0.03)
    top = 2.0
    parts = []
    parts.append(A.S(cyl('pole', px, pz, 0.58, top + 0.12, 0.017, 0.015, seg=8), 0x7E807A, 'chrome'))
    for hh in (0.66, 1.0):
        parts.append(A.S(wb('clamp', px - 0.03, px + 0.03, pz - 0.03, pz + 0.03, hh, hh + 0.04, 0), v['frame']))
    R, apex, drop = 0.78, top + 0.12, 0.22
    cols = v['umb']
    N = 8
    ph = rr.uniform(0, 0.4)

    def P(r, a, sag=0.0):
        hh = apex - drop * (r / R) ** 1.25 - sag
        return (px + r * math.cos(a), pz + r * math.sin(a), hh)

    for i in range(N):
        a0, a1 = ph + i / N * math.tau, ph + (i + 1) / N * math.tau
        am = (a0 + a1) / 2
        ap = P(0.0, 0)
        m0, m1 = P(0.42 * R, a0), P(0.42 * R, a1)
        mm = P(0.42 * R * 0.97, am, 0.012)
        e0, e1 = P(R, a0), P(R, a1)
        em = P(R * 0.9, am, 0.0)             # scallop: the edge pulls in and up between the rib tips
        em = (em[0], em[1], em[2] + 0.03)
        tris = [(ap, m0, mm), (ap, mm, m1), (m0, e0, em), (m0, em, mm), (mm, em, e1), (mm, e1, m1)]
        bm = bmesh.new()
        cache = {}

        def V(p, dz):
            k = (round(p[0], 5), round(p[1], 5), round(p[2], 5), dz)
            if k not in cache:
                cache[k] = bm.verts.new((p[0], -p[1], p[2] - dz))
            return cache[k]
        for t in tris:
            for dz, up in ((0.0, True), (0.008, False)):      # canvas skin on top, a second skin 8 mm under it seen from below
                f = bm.faces.new([V(p, dz) for p in t])
                f.normal_update()
                if (f.normal.z > 0) != up:
                    f.normal_flip()
        o = new_bmesh_obj('canopy', bm)
        parts.append(A.T(o, jit(cols[i % 2], 0.05)))
        # rib under the panel edge, stretcher from the pole runner to mid rib
        e = P(R, a0)
        parts.append(A.S(limb('rib', (ap[0], ap[1], ap[2] - 0.012), (e[0], e[1], e[2] - 0.012), 0.008), 0x5E5F5A, 'chrome'))
        mid = P(0.5 * R, a0)
        parts.append(A.S(limb('stretcher', (px, pz, apex - 0.42), (mid[0], mid[1], mid[2] - 0.014), 0.006), 0x5E5F5A, 'chrome'))
    parts.append(A.S(cyl('runner', px, pz, apex - 0.45, apex - 0.40, 0.024, 0.024, seg=8), 0x5E5F5A, 'chrome'))
    parts.append(A.S(cyl('finial', px, pz, apex - 0.005, apex + 0.05, 0.022, 0.006, seg=8), 0x5E5F5A, 'chrome'))
    for o in parts:
        rot_mesh(o, 'X', v['tilt'], (px, pz, 0.6))
        rot_mesh(o, 'Y', v['tilt'] * 0.5, (px, pz, 0.6))
    CANOPY[0], CANOPY[1] = px, -pz


def rag(A, v):
    """A worn cloth folded over the push bar: two hanging flaps (front one longer), slight swing and a ragged hem, with thickness."""
    z0, z1 = -0.02, 0.17
    bm = bmesh.new()
    for side, ln, sw in ((-1, 0.26, 0.02), (1, 0.19, -0.015)):
        rows = []
        for k, t in enumerate((0.0, 0.35, 0.7, 1.0)):
            hh = 0.95 - t * ln
            dx = side * (0.022 + 0.01 * t) + sw * t
            rows.append([bm.verts.new((-1.0 + dx, -z, hh - (0.02 * math.sin(z * 40) if k == 3 else 0.0))) for z in (z0, (z0 + z1) / 2, z1)])
        for k in range(3):
            for j in range(2):
                bm.faces.new((rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j]))
    top = [bm.verts.new((-1.0, -z, 0.955)) for z in (z0, (z0 + z1) / 2, z1)]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_bmesh_obj('rag', bm)
    mod = o.modifiers.new('sol', 'SOLIDIFY'); mod.thickness = 0.004
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    A.R(o, 0x8A6E5C, 'cloth')


def build(variant):
    v = VARIANT[variant]
    rr = random.Random(v['seed'])
    RND.seed(v['seed'])
    kit = Kit(split_props=False, own=('wood',), route={'steel': 'metal', 'tarp': 'thatch', 'rubber': 'main'},
              tex_override={'thatch': ('tarpaulin', 1.0)})
    A = Adder(kit)
    frame(A, v, rr)
    for s in (-1, 1):
        wheel(A, s * WHEEL_Z, v['seed'] + s, 0x8F918C if s > 0 else 0x878982)
    box(A, v, rr)
    stock_box(A, v, rr)
    bell(A, v)
    umbrella(A, v, rr)
    if v['rag']:
        rag(A, v)
    return kit


# ================================================================ export, count, render
def tri_count(objs):
    t = 0
    for o in objs:
        o.data.calc_loop_triangles()
        t += len(o.data.loop_triangles)
    return t


def render(path, loc, look, lens=40):
    for m in bpy.data.materials:
        if m.node_tree:
            for nd in m.node_tree.nodes:
                if nd.type == 'MIX_RGB' and nd.blend_type == 'MULTIPLY':
                    nd.inputs['Fac'].default_value = 1.0
    if 'ground' not in bpy.data.objects:
        gm = load_pbr_material('ground_m', 'dryearth', repeat=(0.5, 0.5))
        bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0))
        g = bpy.context.active_object
        g.name = 'ground'
        g.data.materials.append(gm)
        box_uv(g, (1, 1, 1))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 64
    sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'AgX'
    if 'sun' not in bpy.data.objects:
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1)
        w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 4.0; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(1.0)
        sun.rotation_euler = tuple(math.radians(x) for x in (50, 0, 60))
    cam = bpy.data.objects.get('cam')
    if cam is None:
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    sc.camera = cam
    cam.location = Vector(loc)
    cam.data.lens = lens
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


if __name__ == '__main__':
    do_render = '--' in sys.argv and 'render' in sys.argv[sys.argv.index('--'):]
    shots = os.path.join(ROOT, 'docs', 'shots', 'assets-icecream_cart')
    for slot, var in (('icecream_cart', 'a'), ('icecream_cart_b', 'b')):
        kit = build(var)
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
            # Blender frame: +wz (glTF +Z) is Blender -Y. Side three-quarter from the +Z painted side, and one from the push-bar end.
            render(os.path.join(shots, slot + '_side34.png'), (2.6, -3.6, 1.7), (-0.05, 0.0, 1.1), 35)
            render(os.path.join(shots, slot + '_rear34.png'), (-3.2, 2.0, 1.8), (-0.2, 0.0, 1.05), 35)
            render(os.path.join(shots, slot + '_bell_close.png'), (-1.6, -0.9, 1.15), (-0.95, 0.0, 0.82), 50)
