"""
Primary school V2 - built with arch.py's Kit to Places V1/primary_school/LAYOUT.md (the spec) and the approved
MAIN_primary_school_top.png (TOP = layout authority) / MAIN_primary_school_isometrics.png (look).

Run:  tools/blender/make.sh primary_school primary_school   (Blender -> shrink -> public/assets/models/primary_school.glb)

Frame: site-local metres, +x east, +z south. Compound x[-30,30] z[-25,25], gate at the centre of the front wall (z=+25).
  U of single-storey blocks (roof parapet 4.4 m): back block along z=-25 (36 m centre + two 12 m corner rooms),
  two wings x[-30,-24] / [24,30] running 26 m from the back wall; every room is 6 m deep with a 3 m verandah on
  square pillars facing the yard. Classrooms 7 x 6 (back block) / 6.67 x 6 (wings), 5 rows x 2 desk-benches = 10.
  31 Oct, LAYOUT.md 25 Oct CORRECTION: the 1.8 m boundary wall runs round ALL FOUR sides; on the back and wing sides it
  stands hard against the blocks' outer walls, which rise above it (build_boundary). Back ventilators sit above it.
Organic things (trees, plants, kids) are hers: planters and platforms are built and left EMPTY.
Drawing notes (metre lines, view labels) are not built. All text is painted in-game on blank boards.
"""
import sys
import os
import math
import json
import random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, join_objects, ROOT
from arch import Kit, bicycle, decal_material, ring, STEEL, BRASS

OUT = os.path.join(ROOT, 'tmp', 'primary_school_raw.glb')
kit = Kit(split_props=False, own=('metal',), wood_slot='props')
rnd = random.Random(26)

HX, HZ = 30.0, 25.0
ROOM_D = 6.0          # room depth, inside the verandah line
VER = 3.0             # verandah depth
H = 3.4               # wall / room height
SLAB = 0.25
PAR_TOP = 4.4
T = 0.25
IRON = 0x2B2D30
INK = 0x1B1B1D
OCHRE = 0xE39A3C
CEMENT = 0xB9B4A8
RED_FLOOR = 0xA3523C


def add(kind, o, c=None):
    kit.add(kind, o, c)
    return o


# 28 Oct: the 65% plan squeeze (bottom of file) shrinks the LAYOUT, not the things people use. Doorways are cut wider in
# pre-squeeze metres so they land at ~1 m; anything built inside real_size() keeps its true shape and is only moved.
PLAN_SCALE = 0.65
DW = 1.5                      # classroom door opening, pre-squeeze (lands at 0.98 m)
REAL = []                     # [(objects, (anchor_x, anchor_z))] in pre-squeeze game metres


class real_size:
    """with real_size(x, z): ...  -> everything created inside is moved with the layout but not squeezed about (x, z)."""
    def __init__(self, x, z):
        self.a = (x, z)

    def __enter__(self):
        self.before = set(bpy.context.scene.objects)
        return self

    def __exit__(self, *exc):
        REAL.append((set(bpy.context.scene.objects) - self.before, self.a))
        return False


def F(v):
    """A final (post-squeeze) metre position written in the pre-squeeze frame the build uses."""
    return v / PLAN_SCALE


# ------------------------------------------------------------------------------------------------ local frames
def make_lm(kind, p):
    """Room-local (u along the front wall, v depth into the room from the verandah line) -> world (x, z)."""
    if kind == 'main':       # front wall at z=-19, rooms run north to the back wall z=-25; u = x
        return lambda u, v: (u, -19.0 - v)
    if kind == 'left':       # wing: front wall x=-24, rooms run west to x=-30; u = z
        return lambda u, v: (-24.0 - v, u)
    return lambda u, v: (24.0 + v, u)    # right wing


LM = {'main': make_lm('main', 0), 'left': make_lm('left', 0), 'right': make_lm('right', 0)}
SOLIDS = []   # kept for docs; the game derives colliders from the model (src/autoColliders.js)


def B(kind, lm, u0, u1, v0, v1, h0, h1, bevel=0.0, color=None, name='b'):
    (xa, za), (xb, zb) = lm(u0, v0), lm(u1, v1)
    return add(kind, wb(name, min(xa, xb), max(xa, xb), min(za, zb), max(za, zb), h0, h1, bevel), color)


def wall(lm, u0, u1, v0, v1, openings=(), h=H, kind='plaster', name='wall'):
    """A wall run in local coords with through-openings [(a, b, h0, h1)] along u (no booleans: piers + sills + lintels)."""
    ops = sorted(openings)
    cur = u0
    for a, b, h0, h1 in ops:
        if a - cur > 0.01:
            B(kind, lm, cur, a, v0, v1, 0, h, name=name)
        if h0 > 0.01:
            B(kind, lm, a, b, v0, v1, 0, h0, name=name + '_sill')
        if h - h1 > 0.01:
            B(kind, lm, a, b, v0, v1, h1, h, name=name + '_lintel')
        cur = b
    if u1 - cur > 0.01:
        B(kind, lm, cur, u1, v0, v1, 0, h, name=name)


def window(lm, u0, u1, h0, h1, v0, v1, bars=True):
    """Frame + iron bars + sill in a through-opening of the wall v0..v1 (both faces get a frame)."""
    ft = 0.07
    for vv in (v0, v1 - 0.03):
        B('wood', lm, u0, u0 + ft, vv, vv + 0.03, h0, h1, name='wf')
        B('wood', lm, u1 - ft, u1, vv, vv + 0.03, h0, h1, name='wf')
        B('wood', lm, u0, u1, vv, vv + 0.03, h1 - ft, h1, name='wf')
        B('wood', lm, u0, u1, vv, vv + 0.03, h0, h0 + ft, name='wf')
    B('trim', lm, u0 - 0.05, u1 + 0.05, v0 - 0.06, v0 + 0.02, h0 - 0.05, h0 + 0.02, 0.004, name='sill')
    if bars:
        n = max(4, int((u1 - u0) / 0.11))
        vm = (v0 + v1) / 2
        for i in range(1, n):
            u = u0 + ft + i * (u1 - u0 - 2 * ft) / n
            B('paint', lm, u - 0.012, u + 0.012, vm - 0.012, vm + 0.012, h0 + ft, h1 - ft, color=IRON, name='bar')
        B('paint', lm, u0 + ft, u1 - ft, vm - 0.015, vm + 0.015, (h0 + h1) / 2 - 0.015, (h0 + h1) / 2 + 0.015, color=IRON, name='bar_h')


def door(lm, u0, u1, h1, v0, v1, swing_dir=1, closed=False):
    """A real doorway: frame, lintel board, threshold, brass handle, and the dark panelled leaf swung open into the room."""
    ft = 0.09
    for vv in (v0, v1 - 0.04):
        B('wood', lm, u0, u0 + ft, vv, vv + 0.04, 0, h1, name='df')
        B('wood', lm, u1 - ft, u1, vv, vv + 0.04, 0, h1, name='df')
        B('wood', lm, u0, u1, vv, vv + 0.04, h1 - ft, h1, name='df')
    B('trim', lm, u0, u1, v0 - 0.12, v1, 0, 0.05, 0.004, name='thresh')
    if closed:
        # shut leaf filling the opening, two panels, a brass handle and a hasp latch (27 Oct: only one classroom stays open)
        vm = (v0 + v1) / 2 - 0.025
        B('wood', lm, u0 + ft, u1 - ft, vm, vm + 0.05, 0.05, h1 - ft, name='leaf_shut')
        for k in range(2):
            z0 = 0.2 + k * 1.0
            B('wood', lm, u0 + ft + 0.1, u1 - ft - 0.1, vm - 0.012, vm + 0.062, z0, z0 + 0.8, name='leaf_panel')
        B('paint', lm, u1 - ft - 0.22, u1 - ft - 0.1, vm - 0.04, vm + 0.09, 1.0, 1.12, color=BRASS, name='handle')
        B('paint', lm, u1 - ft - 0.3, u1 - ft - 0.04, vm - 0.03, vm + 0.08, 1.45, 1.5, color=IRON, name='hasp')
        return
    # leaf, open ~90 degrees, hinged on the u0 jamb, standing inside the room
    hu = u0 + ft + 0.02
    B('wood', lm, hu, hu + 0.045, v1, v1 + (u1 - u0 - 2 * ft), 0.05, h1 - ft - 0.02, name='leaf')
    for k in range(2):
        z0 = 0.18 + k * 1.0
        B('wood', lm, hu - 0.012, hu + 0.057, v1 + 0.12, v1 + (u1 - u0 - 2 * ft) - 0.12, z0, z0 + 0.8, name='leaf_panel')
    B('paint', lm, hu - 0.025, hu + 0.07, v1 + 0.1, v1 + 0.16, 1.0, 1.06, color=BRASS, name='handle')
    for hh in (0.35, h1 - 0.45):
        B('paint', lm, u0 + ft - 0.01, u0 + ft + 0.05, v1 - 0.02, v1 + 0.04, hh, hh + 0.12, color=IRON, name='hinge')


# ------------------------------------------------------------------------------------------------ decal atlas (one material)
AW, AH = 1024, 1024


def _blend(base, col, a):
    return (col[0], col[1], col[2], max(a, base[3] if base else 0)) if a > 0.5 else base


def paint_atlas(u, v):
    """v up. Regions: mural (top 12.5%), posters (next 25%), track (bottom half), flag (small, at v 0.45..0.5)."""
    if v > 0.875:
        return mural(u, (v - 0.875) / 0.125)
    if v > 0.625:
        return poster(u, (v - 0.625) / 0.25)
    if v > 0.5:
        return flag_px(u, (v - 0.5) / 0.125)
    return track_px(u, v / 0.5)


def lin(c):
    return tuple(((x / 255.0) ** 2.2) for x in c)


def c2(h):
    return lin(((h >> 16) & 255, (h >> 8) & 255, h & 255)) + (1.0,)


def inside_ellipse(x, y, cx, cy, rx, ry):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0


def inside_box(x, y, x0, x1, y0, y1):
    return x0 <= x <= x1 and y0 <= y <= y1


def seg_dist(x, y, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy + 1e-9)))
    return math.hypot(x - (ax + t * dx), y - (ay + t * dy))


def mural(u, v):
    """Children's wall painting, 12 x 1.1 m (u across, v up): panels of green grass, cow + calf, mango, apple, flowers, a palm."""
    X = u * 12.0
    Y = v * 1.1
    # red border line low, green grass strip
    if Y < 0.2:
        return c2(0x5C9A40) if (X * 9 + Y * 3) % 1.0 > 0.15 else c2(0x4A8333)
    # panel dividers every 3 m
    if abs((X % 3.0) - 1.5) > 1.47 and Y > 0.2:
        return c2(0xCE8A33)
    # sun in the corner
    if inside_ellipse(X, Y, 11.2, 0.88, 0.17, 0.17):
        return c2(0xF2B01E)
    # cow (panel 1): body, head, legs, horns, spots, tail; calf smaller
    for (ox, sc, body) in ((1.0, 1.0, 0xF4EFE4), (2.15, 0.55, 0xC98A4E)):
        x, y = (X - ox) / sc, (Y - 0.2) / sc
        if inside_ellipse(x, y, 0.45, 0.42, 0.42, 0.2):
            return c2(0xB8793F) if inside_ellipse(x, y, 0.35, 0.45, 0.1, 0.07) or inside_ellipse(x, y, 0.55, 0.38, 0.08, 0.06) else c2(body)
        if inside_ellipse(x, y, 0.92, 0.55, 0.13, 0.11):
            return c2(body)
        if inside_box(x, y, 0.1, 0.17, 0.0, 0.3) or inside_box(x, y, 0.3, 0.37, 0.0, 0.3) or inside_box(x, y, 0.58, 0.65, 0.0, 0.3) or inside_box(x, y, 0.76, 0.83, 0.0, 0.3):
            return c2(body)
        if seg_dist(x, y, 0.88, 0.64, 0.92, 0.72) < 0.02 or seg_dist(x, y, 1.0, 0.64, 0.97, 0.72) < 0.02:
            return c2(0x6B4A2A)
        if seg_dist(x, y, 0.03, 0.5, 0.0, 0.25) < 0.015:
            return c2(0x6B4A2A)
        if inside_ellipse(x, y, 0.97, 0.53, 0.012, 0.012):
            return c2(0x1B1B1D)
    # mango (panel 2): fruit + leaf + stalk
    if inside_ellipse(X, Y, 4.5, 0.62, 0.27, 0.33):
        return c2(0xF0A81C) if (X - 4.5) < 0.1 else c2(0xE08A14)
    if inside_ellipse(X, Y, 4.82, 0.98, 0.2, 0.07) and (X - 4.5) > 0.0:
        return c2(0x3F7A34)
    if inside_box(X, Y, 4.47, 4.51, 0.93, 1.02):
        return c2(0x5A3C22)
    # mango tree trunk + palm on the right of panel 2
    if inside_box(X, Y, 5.5, 5.58, 0.2, 0.8):
        return c2(0x6B4A2A)
    for k in range(5):
        a = -0.2 + k * 0.45
        if seg_dist(X, Y, 5.54, 0.8, 5.54 + 0.55 * math.sin(a * 2), 0.8 + 0.2 * math.cos(a * 2) + 0.12) < 0.03:
            return c2(0x3F7A34)
    # apple (panel 3): red body, leaf
    if inside_ellipse(X, Y, 7.0, 0.55, 0.3, 0.3):
        return c2(0xC4281E)
    if inside_ellipse(X, Y, 7.18, 0.92, 0.15, 0.06):
        return c2(0x3F7A34)
    if inside_box(X, Y, 6.99, 7.03, 0.82, 0.95):
        return c2(0x5A3C22)
    # tomato + banana (panel 3 right)
    if inside_ellipse(X, Y, 7.9, 0.45, 0.2, 0.2):
        return c2(0xD8321F)
    if seg_dist(X, Y, 8.2, 0.3, 8.65, 0.55) < 0.07 or seg_dist(X, Y, 8.25, 0.25, 8.7, 0.46) < 0.06:
        return c2(0xF2D04A)
    # flowers (panel 4): three stems, petals, yellow centres
    for fx, fy, col in ((9.6, 0.82, 0xE0529A), (10.35, 0.95, 0xE8591E), (11.0, 0.7, 0xE8D43A)):
        if inside_box(X, Y, fx - 0.015, fx + 0.015, 0.2, fy):
            return c2(0x3F7A34)
        if inside_ellipse(X, Y, fx, fy, 0.075, 0.075):
            return c2(0xF2B01E)
        for k in range(6):
            a = k / 6 * math.tau
            if inside_ellipse(X, Y, fx + 0.14 * math.cos(a), fy + 0.14 * math.sin(a), 0.09, 0.09):
                return c2(col)
    return c2(0xF1E6C6)


POSTER_BG = (0xF4E7B5, 0xBFE0EC, 0xF2D9D2, 0xD7ECC8, 0xCFE2F2)


def poster_flat(u, v):
    """Five picture-only hygiene posters, each 1 x 1.2 m card: hand washing, brushing teeth, cutting nails, dustbin, clean water."""
    i = min(4, int(u * 5))
    x = (u * 5 - i)           # 0..1 across the card
    y = v                     # 0..1 up
    if x < 0.04 or x > 0.96 or y < 0.03 or y > 0.97:
        return c2(0x6B3A1E)   # card edge
    if x < 0.07 or x > 0.93 or y < 0.06 or y > 0.94:
        return c2(0xF8F2E0)
    skin, water, white = c2(0xD59A6B), c2(0x3C8FD0), c2(0xF8F8F2)
    bg = c2(POSTER_BG[i])
    if i == 0:   # hands under a tap
        if inside_box(x, y, 0.25, 0.75, 0.82, 0.9) or inside_box(x, y, 0.42, 0.52, 0.7, 0.9):
            return c2(0x8E9399)
        for k in range(3):
            if inside_ellipse(x, y, 0.47, 0.64 - k * 0.1, 0.025, 0.04):
                return water
        if inside_ellipse(x, y, 0.5, 0.26, 0.27, 0.19):
            return skin
        for k in range(5):
            fx = 0.28 + k * 0.11
            if inside_box(x, y, fx - 0.03, fx + 0.03, 0.3, 0.5 + (0.05 if k in (1, 2, 3) else 0)):
                return skin
        if inside_ellipse(x, y, 0.5, 0.13, 0.3, 0.05):
            return white   # soap foam
    elif i == 1:  # tooth + brush
        if inside_ellipse(x, y, 0.38, 0.55, 0.2, 0.17) or inside_box(x, y, 0.2, 0.31, 0.2, 0.5) or inside_box(x, y, 0.45, 0.56, 0.2, 0.5):
            return white
        if seg_dist(x, y, 0.55, 0.3, 0.88, 0.78) < 0.035:
            return c2(0x2E6FB6)
        if seg_dist(x, y, 0.82, 0.7, 0.9, 0.84) < 0.065:
            return c2(0xE8F2FA)
        if inside_ellipse(x, y, 0.62, 0.78, 0.04, 0.04) or inside_ellipse(x, y, 0.7, 0.86, 0.03, 0.03):
            return water
    elif i == 2:  # fingers with trimmed nails + clippers
        for k in range(4):
            fx = 0.2 + k * 0.14
            if inside_box(x, y, fx - 0.05, fx + 0.05, 0.12, 0.62 + 0.05 * (k % 3)):
                return skin
            if inside_box(x, y, fx - 0.035, fx + 0.035, 0.6 + 0.05 * (k % 3), 0.69 + 0.05 * (k % 3)):
                return c2(0xF6D9D0)
        if seg_dist(x, y, 0.2, 0.88, 0.8, 0.78) < 0.025 or seg_dist(x, y, 0.2, 0.78, 0.8, 0.84) < 0.025:
            return c2(0x6D7378)
    elif i == 3:  # dustbin with a paper going in
        if inside_box(x, y, 0.28 + 0.05 * (0.5 - y), 0.72 - 0.05 * (0.5 - y), 0.1, 0.62) and not inside_box(x, y, 0.4, 0.6, 0.2, 0.5):
            return c2(0x2C8A4A)
        if inside_box(x, y, 0.4, 0.6, 0.2, 0.5):
            return c2(0x1F6B38)
        if inside_box(x, y, 0.22, 0.78, 0.62, 0.7):
            return c2(0x2C8A4A)
        if inside_ellipse(x, y, 0.5, 0.85, 0.09, 0.07) and not inside_box(x, y, 0.2, 0.8, 0.0, 0.7):
            return white
        if inside_box(x, y, 0.15, 0.25, 0.1, 0.18):
            return c2(0xCE8A33)
    else:         # glass of clean water + drop
        if inside_box(x, y, 0.3 + 0.04 * (0.5 - y), 0.7 - 0.04 * (0.5 - y), 0.14, 0.64):
            return water if y < 0.5 else c2(0xE6F2FA)
        if inside_ellipse(x, y, 0.5, 0.82, 0.07, 0.07):
            return water
        if inside_box(x, y, 0.47, 0.53, 0.84, 0.92):
            return water
    return bg


def _h(ix, iy, sd):
    n = (ix * 374761393 + iy * 668265263 + sd * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def _vn(x, y, sd):
    ix, iy = int(math.floor(x)), int(math.floor(y))
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _h(ix, iy, sd), _h(ix + 1, iy, sd)
    c, d = _h(ix, iy + 1, sd), _h(ix + 1, iy + 1, sd)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy


def poster(u, v):
    """The flat hygiene cards, weathered: sun-faded toward cream, paper grain, a fold crease, water stains, ragged edges, a torn corner on some cards."""
    c = poster_flat(u, v)
    i = min(4, int(u * 5))
    x, y = u * 5 - i, v
    e = 0.012 + 0.03 * _vn(x * 12 + i * 7, y * 12, 3)
    if x < e or x > 1 - e or y < e * 0.8 or y > 1 - e * 0.8:
        return None
    if i % 2 == 1 and x > 0.78 and y > 0.84 and _vn(x * 9, y * 9, 8) > 0.4:
        return None   # torn-off corner
    if i % 2 == 0 and x < 0.16 and y < 0.12 and _vn(x * 9, y * 9, 9) > 0.45:
        return None
    r, g, b = c[0], c[1], c[2]
    fade = 0.28 + 0.3 * y
    lum = 0.6 * r + 0.3 * g + 0.1 * b
    r, g, b = r + (lum * 0.8 + 0.3 - r) * fade, g + (lum * 0.8 + 0.28 - g) * fade, b + (lum * 0.8 + 0.2 - b) * fade
    grain = 0.9 + 0.2 * _vn(x * 70 + i * 5, y * 70, 5)
    crease = 0.16 if (abs(x - 0.5) < 0.012 or abs(y - 0.5) < 0.01) else 0.0
    stain = max(0.0, _vn(x * 4 + i * 3, y * 4, 11) - 0.55) * 0.9
    k = grain * (1 - crease) * (1 - stain * 0.5)
    return (r * k, g * k, b * k, 1.0)


def flag_px(u, v):
    """Indian national flag cloth: saffron, white with a 24-spoke navy chakra, green."""
    if v > 2 / 3:
        return c2(0xFF9933)
    if v < 1 / 3:
        return c2(0x138808)
    cx, cy = 0.5, 0.5
    # the strip is 3:2 on screen but square in uv; the wheel is drawn in a 1.5 : 1 aspect-corrected space
    dx, dy = (u - cx) * 1.5, (v - cy)
    r = math.hypot(dx, dy)
    if abs(r - 0.15) < 0.012 or r < 0.02:
        return c2(0x1C2A8C)
    if r < 0.15 and abs(math.sin(math.atan2(dy, dx) * 12)) > 0.96:
        return c2(0x1C2A8C)
    return c2(0xF8F8F2)


def track_px(u, v):
    """Assembly ground, 30 x 18 m stadium (v up, u across): three white lane lines, worn mid-tone beneath so it reads on the dirt."""
    x = (u - 0.5) * 30.0
    y = (v - 0.5) * 18.0
    for k, rad in enumerate((8.6, 8.0, 7.4)):
        half = 15.0 - 8.6 + 0 - 0.0
        cx = max(-6.4, min(6.4, x))
        d = math.hypot(x - cx, y)
        if abs(d - rad) < 0.07:
            wob = 0.55 + 0.45 * ((math.sin(x * 11.7 + y * 7.3 + k) * 43758.5453) % 1.0)
            return (0.92, 0.91, 0.86, 0.9 * wob)
    return None


dmat = decal_material('hb_decal', (AW, AH), paint_atlas)


def wall_decal(face, pos, a0, a1, h0, h1, uvr):
    """Vertical decal on the OUTWARD side of a wall plane. face S/N: pos=z, a=x; face E/W: pos=x, a=z. Reads left to right as seen by someone looking at it."""
    u0, v0, u1, v1 = uvr
    if face == 'S':
        pts = [(a0, pos, h0), (a1, pos, h0), (a1, pos, h1), (a0, pos, h1)]
    elif face == 'N':
        pts = [(a1, pos, h0), (a0, pos, h0), (a0, pos, h1), (a1, pos, h1)]
    elif face == 'E':
        pts = [(pos, a1, h0), (pos, a0, h0), (pos, a0, h1), (pos, a1, h1)]
    else:
        pts = [(pos, a0, h0), (pos, a1, h0), (pos, a1, h1), (pos, a0, h1)]
    o = quad('decal', pts)
    uvl = o.data.uv_layers.new(name='UVMap')
    for loop, uv in zip(o.data.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]):
        uvl.data[loop.index].uv = uv
    o.data.materials.append(dmat)
    kit.extra.append(o)


def ground_decal(x0, x1, z0, z1, h, uvr):
    u0, v0, u1, v1 = uvr
    o = quad('gdecal', [(x0, z1, h), (x1, z1, h), (x1, z0, h), (x0, z0, h)])
    uvl = o.data.uv_layers.new(name='UVMap')
    for loop, uv in zip(o.data.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]):
        uvl.data[loop.index].uv = uv
    o.data.materials.append(dmat)
    kit.extra.append(o)


# ------------------------------------------------------------------------------------------------ furniture
def desk_bench(lm, u, v, w=1.2, d=0.5):
    """A two-seat school desk-bench facing the board (toward v=large... the board is on the v=ROOM_D wall): desk top, side panels, seat plank, legs."""
    B('wood', lm, u - w / 2, u + w / 2, v - d / 2, v + d / 2 - 0.0, 0.72, 0.76, 0.003, name='desk_top')
    B('wood', lm, u - w / 2 + 0.03, u - w / 2 + 0.07, v - d / 2 + 0.03, v + d / 2 - 0.03, 0.0, 0.72, name='desk_side')
    B('wood', lm, u + w / 2 - 0.07, u + w / 2 - 0.03, v - d / 2 + 0.03, v + d / 2 - 0.03, 0.0, 0.72, name='desk_side')
    B('wood', lm, u - w / 2 + 0.05, u + w / 2 - 0.05, v - d / 2 - 0.3, v - d / 2 - 0.02, 0.4, 0.44, 0.003, name='seat')
    for uu in (u - w / 2 + 0.12, u + w / 2 - 0.12):
        B('wood', lm, uu - 0.025, uu + 0.025, v - d / 2 - 0.28, v - d / 2 - 0.22, 0.0, 0.4, name='seat_leg')
        B('wood', lm, uu - 0.025, uu + 0.025, v - d / 2 - 0.12, v - d / 2 - 0.06, 0.0, 0.4, name='seat_leg')
    B('wood', lm, u - w / 2 + 0.07, u + w / 2 - 0.07, v + d / 2 - 0.08, v + d / 2 - 0.04, 0.5, 0.7, name='desk_rail')


def fan_light(lm, u, v):
    x, z = lm(u, v)
    add('metal', cyl('fan_rod', x, z, H - 0.35, H, 0.015, 0.015, 6), 0x3A3C3E)
    add('metal', cyl('fan_hub', x, z, H - 0.42, H - 0.33, 0.09, 0.09, 10), 0x8A8D90)
    for k in range(3):
        a = k * math.tau / 3 + 0.3
        add('metal', limb('fan_blade', (x + 0.08 * math.cos(a), z + 0.08 * math.sin(a), H - 0.38), (x + 0.62 * math.cos(a), z + 0.62 * math.sin(a), H - 0.4), 0.14, 0.015), 0xD9D6CC)
    add('metal', cyl('fan_regulator', x, z, H - 0.2, H - 0.12, 0.05, 0.05, 6), 0x3A3C3E)


def tube_light(lm, u, v, vlen=0.0):
    (x0, z0), (x1, z1) = lm(u - 0.6, v), lm(u + 0.6, v)
    add('paint', limb('tube', (x0, z0, H - 0.1), (x1, z1, H - 0.1), 0.05, 0.05), 0xF4F2E6)
    add('metal', limb('tube_box', (x0, z0, H - 0.05), (x1, z1, H - 0.05), 0.09, 0.03), 0xDADAD6)


def blackboard(lm, u, v_wall, wid=3.2):
    """Dark-green board on the wall at v_wall (inner face), wooden frame, chalk tray, duster, chalk."""
    B('wood', lm, u - wid / 2 - 0.08, u + wid / 2 + 0.08, v_wall - 0.05, v_wall, 0.85, 2.2, name='board_frame')
    B('paint', lm, u - wid / 2, u + wid / 2, v_wall - 0.062, v_wall - 0.04, 0.93, 2.12, color=0x1F2E26, name='board')
    B('wood', lm, u - wid / 2 - 0.05, u + wid / 2 + 0.05, v_wall - 0.14, v_wall - 0.04, 0.8, 0.86, name='tray')
    B('paint', lm, u + 0.3, u + 0.55, v_wall - 0.13, v_wall - 0.07, 0.86, 0.92, color=0x6B5A3E, name='duster')
    for k in range(3):
        B('paint', lm, u - 0.4 + k * 0.07, u - 0.35 + k * 0.07, v_wall - 0.11, v_wall - 0.09, 0.86, 0.885, color=0xEEEEE6, name='chalk')
    # a few chalk marks (drawn as thin boxes): a ruled line and a sum
    for k, ww in enumerate((1.6, 1.1, 1.4)):
        B('paint', lm, u - wid / 2 + 0.2, u - wid / 2 + 0.2 + ww, v_wall - 0.066, v_wall - 0.062, 1.8 - k * 0.22, 1.83 - k * 0.22, color=0xE6E6DD, name='chalk_line')


def teacher_set(lm, u, v):
    """Teacher's table with drawer front, a chair, and a stack of exercise books + a register."""
    B('wood', lm, u - 0.65, u + 0.65, v - 0.35, v + 0.35, 0.72, 0.77, 0.004, name='t_top')
    for uu in (u - 0.6, u + 0.6):
        B('wood', lm, uu - 0.03, uu + 0.03, v - 0.32, v + 0.32, 0, 0.72, name='t_leg')
    B('wood', lm, u - 0.55, u + 0.55, v + 0.3, v + 0.34, 0.3, 0.7, name='t_modesty')
    B('wood', lm, u - 0.2, u + 0.2, v - 0.37, v - 0.33, 0.55, 0.7, name='t_drawer')
    B('paint', lm, u - 0.05, u + 0.05, v - 0.4, v - 0.37, 0.61, 0.64, color=BRASS, name='t_knob')
    # chair (back to the table)
    B('wood', lm, u - 0.22, u + 0.22, v + 0.38, v + 0.78, 0.42, 0.46, name='chair_seat')
    B('wood', lm, u - 0.22, u + 0.22, v + 0.76, v + 0.8, 0.46, 0.95, name='chair_back')
    for du in (-0.19, 0.19):
        for dv in (0.4, 0.76):
            B('wood', lm, u + du - 0.02, u + du + 0.02, v + dv - 0.02, v + dv + 0.02, 0, 0.42, name='chair_leg')
    B('paint', lm, u - 0.45, u - 0.1, v - 0.2, v + 0.1, 0.77, 0.85, color=0xC9C0A8, name='books')
    B('paint', lm, u + 0.1, u + 0.45, v - 0.15, v + 0.2, 0.77, 0.79, color=0x7A1F1F, name='register')


def almirah(lm, u, v, w=0.9, d=0.45, h=1.9):
    """Steel almirah (two doors, vent slots), against a wall."""
    B('paint', lm, u - w / 2, u + w / 2, v - d / 2, v + d / 2, 0, h, 0.01, color=0x58707A, name='almirah')
    B('paint', lm, u - 0.01, u + 0.01, v - d / 2 - 0.012, v - d / 2, 0.05, h - 0.05, color=0x3A4A52, name='alm_split')
    for sg in (-1, 1):
        B('paint', lm, u + sg * 0.1 - 0.015, u + sg * 0.1 + 0.015, v - d / 2 - 0.03, v - d / 2, 0.9, 1.1, color=0xB9BDC2, name='alm_handle')
    for k in range(4):
        B('paint', lm, u - w / 2 + 0.08, u + w / 2 - 0.08, v - d / 2 - 0.008, v - d / 2, 1.5 + k * 0.07, 1.53 + k * 0.07, color=0x3A4A52, name='alm_vent')


def tidy_shelf(lm, u, v_wall, wid=1.4):
    B('wood', lm, u - wid / 2, u + wid / 2, v_wall - 0.25, v_wall, 1.2, 1.24, name='shelf')
    B('wood', lm, u - wid / 2, u + wid / 2, v_wall - 0.25, v_wall, 1.6, 1.64, name='shelf')
    for k, c in enumerate((0xB8472E, 0x2E5E8B, 0xC9A83A, 0x4A7A4A, 0x7A4A8B)):
        B('paint', lm, u - wid / 2 + 0.1 + k * 0.12, u - wid / 2 + 0.2 + k * 0.12, v_wall - 0.2, v_wall - 0.04, 1.24, 1.5 - (k % 2) * 0.06, color=c, name='book')


# ------------------------------------------------------------------------------------------------ room builders
def classroom(kind, u0, u1, with_back_windows=True):
    """One classroom: floor, walls come from the block; here the fittings. Board on the back wall, 5 rows x 2 desk-benches facing it."""
    lm = LM[kind]
    wid = u1 - u0
    uc = (u0 + u1) / 2
    B('trim', lm, u0, u1, 0.0, ROOM_D, 0, 0.04, 0.0, color=CEMENT, name='floor')
    blackboard(lm, uc, ROOM_D - T, 3.2)
    teacher_set(lm, uc + 1.4, 4.9)
    # 5 rows x 2 benches; back row at v=1.1 near the door, front row at v=4.2... the board is at v=ROOM_D, so students face +v
    for r in range(5):
        v = 1.0 + r * 0.76
        for c in (-1, 1):
            bu = uc + c * (wid * 0.22)
            desk_bench(lm, bu, v)
            # scattered slate on the desk and a cloth bag on the floor beside the bench, never two alike
            if rnd.random() < 0.8:
                su = bu + rnd.uniform(-0.4, 0.2)
                B('wood', lm, su, su + 0.2, v - 0.1, v + 0.12, 0.76, 0.775, name='slate')
            if rnd.random() < 0.7:
                gu = bu + rnd.choice((-1, 1)) * rnd.uniform(0.5, 0.62)
                bw, bh = rnd.uniform(0.2, 0.28), rnd.uniform(0.26, 0.36)
                B('paint', lm, gu, gu + bw, v - 0.32, v - 0.1, 0.0, bh, 0.03,
                  color=rnd.choice((0x3E5E7A, 0x8A3B2E, 0x5E6B3A, 0x7A6A3E, 0x4A4A5E)), name='school_bag')
    almirah(lm, u0 + 0.7, ROOM_D - T - 0.23)
    tidy_shelf(lm, u1 - 0.8, ROOM_D - T, 1.0)
    fan_light(lm, uc, 3.0)
    fan_light(lm, uc, 1.2) if wid > 6.8 else None
    tube_light(lm, uc - 1.8, 4.3)
    tube_light(lm, uc + 1.8, 4.3)
    tube_light(lm, uc - 1.8, 1.7)
    tube_light(lm, uc + 1.8, 1.7)
    # a wall chart on each side wall + a calendar by the door (card colours only: pictures are the posters' job)
    B('paint', lm, u0 + 0.1, u0 + 0.12, 2.6, 3.4, 1.4, 2.1, color=0xE8D9A8, name='chart')
    B('paint', lm, u1 - 0.12, u1 - 0.1, 2.6, 3.4, 1.4, 2.1, color=0xBFD7E4, name='chart')


def office_room(lm, u0, u1):
    uc = (u0 + u1) / 2
    B('trim', lm, u0, u1, 0.0, ROOM_D, 0, 0.04, 0.0, color=CEMENT, name='floor')
    teacher_set(lm, uc, 3.2)
    almirah(lm, u0 + 0.6, ROOM_D - T - 0.23)
    almirah(lm, u1 - 0.6, ROOM_D - T - 0.23)
    # visitor bench, a notice board with a green baize, a water matka on an iron stand
    B('wood', lm, uc - 0.9, uc + 0.9, 0.7, 1.1, 0.42, 0.46, name='bench')
    B('paint', lm, uc - 0.95, uc + 0.95, ROOM_D - T - 0.05, ROOM_D - T, 1.1, 2.0, color=0x3B5E3A, name='notice')
    B('wood', lm, uc - 0.99, uc + 0.99, ROOM_D - T - 0.07, ROOM_D - T - 0.04, 1.06, 2.04, name='notice_frame')
    fan_light(lm, uc, 3.0)
    tube_light(lm, uc, 4.4)


def staff_room(lm, u0, u1):
    uc = (u0 + u1) / 2
    B('trim', lm, u0, u1, 0.0, ROOM_D, 0, 0.04, 0.0, color=CEMENT, name='floor')
    B('wood', lm, uc - 1.3, uc + 1.3, 2.2, 3.2, 0.72, 0.77, 0.004, name='long_table')
    for uu in (uc - 1.2, uc + 1.2):
        for vv in (2.3, 3.1):
            B('wood', lm, uu - 0.03, uu + 0.03, vv - 0.03, vv + 0.03, 0, 0.72, name='long_leg')
    for k in range(3):
        for sg in (-1, 1):
            B('wood', lm, uc - 1.0 + k * 0.95, uc - 0.55 + k * 0.95, 3.45 if sg > 0 else 1.55, 3.85 if sg > 0 else 1.95, 0.42, 0.46, name='stool')
    almirah(lm, u0 + 0.6, ROOM_D - T - 0.23)
    # tea corner: kettle + steel glasses on a small table
    B('wood', lm, u1 - 1.0, u1 - 0.4, 0.4, 0.8, 0.6, 0.64, name='tea_table')
    add('metal', cyl('kettle', *lm(u1 - 0.7, 0.6), 0.64, 0.84, 0.12, 0.09, 10), STEEL)
    fan_light(lm, uc, 3.0)
    tube_light(lm, uc, 4.4)


def corner_room(lm_, u0, u1):
    """Library + store at the back corners: shelves, a trunk, the sports kit, a drum of drinking water."""
    B('trim', lm_, u0, u1, 0.0, ROOM_D, 0, 0.04, 0.0, color=CEMENT, name='floor')
    for k in range(3):
        tidy_shelf(lm_, u0 + 1.6 + k * 3.5, ROOM_D - T, 1.6)
    B('paint', lm_, u0 + 0.5, u0 + 1.5, 0.8, 1.5, 0, 0.55, 0.01, color=0x4A5E6A, name='trunk')
    for k in range(4):   # sports kit: stumps leaning, a bat, a bundle of rope
        B('wood', lm_, u0 + 4 + k * 0.1, u0 + 4.04 + k * 0.1, 0.5, 0.54, 0, 0.9, name='stump')
    B('wood', lm_, u0 + 4.6, u0 + 4.7, 0.5, 0.56, 0, 0.85, name='bat')
    fan_light(lm_, (u0 + u1) / 2, 3.0)
    tube_light(lm_, (u0 + u1) / 2, 4.4)


# ------------------------------------------------------------------------------------------------ blocks
def room_walls(kind, rooms, u_lo, u_hi, doors_pos):
    """Outer + front + partition walls for a block. rooms: [(u0, u1, type)]. doors_pos: door span per room (offset from room start, width)."""
    lm = LM[kind]
    # front wall (verandah side) with a door + two windows per room
    ops = []
    for (a, b, t) in rooms:
        if t == 'corner':
            cd = -23.5 if a < 0 else 22.4
            ops.append((cd, cd + DW, 0, 2.3))
            continue
        dw = DW
        d0 = a + 0.5
        ops.append((d0, d0 + dw, 0, 2.3))
        span = b - a
        ws = [a + 0.5 + dw + 0.5, b - 1.7] if span > 6.0 else [a + 0.5 + dw + 0.4, b - 1.45]
        if t in ('office', 'staff'):
            ws = [a + 0.5 + dw + 0.3]
        for w0 in ws:
            if w0 + 1.1 < b - 0.2:
                ops.append((w0, w0 + 1.1, 1.2, 2.5))
    wall(lm, u_lo, u_hi, -T, 0.0, ops, name='front')
    for (a, b, t) in rooms:
        if t == 'corner':
            cd = -23.5 if a < 0 else 22.4
            door(lm, cd, cd + DW, 2.3, -T, 0.0)
            continue
        d0 = a + 0.5
        door(lm, d0, d0 + DW, 2.3, -T, 0.0, closed=(t == 'class' and not (kind == 'main' and a == -3)))
    for (a0, a1, h0, h1) in ops:
        if h0 > 0:
            window(lm, a0, a1, h0, h1, -T, 0.0)
    # back (outer) wall: two high ventilator windows per room (board between them)
    bops = []
    for (a, b, t) in rooms:
        if t in ('office', 'staff'):
            bops.append((a + 1.2, a + 2.4, 2.0, 2.8))     # sills above the 1.9 m boundary coping outside
        elif t == 'corner':
            for k in range(3):
                bops.append((a + 1.5 + k * 3.7, a + 2.9 + k * 3.7, 2.0, 2.8))
        else:
            span = b - a
            bops.append((a + 0.5, a + 1.5, 2.0, 2.8))
            bops.append((b - 1.5, b - 0.5, 2.0, 2.8))
    wall(lm, u_lo, u_hi, ROOM_D - T, ROOM_D, bops, name='back')
    for (a0, a1, h0, h1) in bops:
        window(lm, a0, a1, h0, h1, ROOM_D - T, ROOM_D)
    # partitions between rooms + end walls
    edges = sorted(set([u_lo, u_hi] + [e for (a, b, _) in rooms for e in (a, b)]))
    for e in edges:
        a0, a1 = (e, e + 0.2) if e == u_lo else ((e - 0.2, e) if e == u_hi else (e - 0.1, e + 0.1))
        B('plaster', lm, a0, a1, -T, ROOM_D, 0, H, name='part')


def plinth_band(lm, u0, u1, v, d=0.04, h=0.9, gaps=()):
    """Ochre band along the verandah/outer face at v (outer face), broken at doors."""
    edges = [u0] + [x for g in sorted(gaps) for x in g] + [u1]
    for a, b in zip(edges[0::2], edges[1::2]):
        if b - a > 0.05:
            B('plinth', lm, a, b, v - d, v, 0, h, 0.0, name='band')
            B('plinth', lm, a, b, v - d - 0.01, v + 0.0, h, h + 0.05, 0.0, name='band_cap')


def build_blocks():
    # BACK block (u = x): corner | office | staff | 4 classrooms | corner
    main_rooms = [(-30, -18, 'corner'), (-18, -14, 'office'), (-14, -10, 'staff'), (-10, -3, 'class'), (-3, 4, 'class'), (4, 11, 'class'), (11, 18, 'class'), (18, 30, 'corner')]
    # wall pieces: the corner rooms share the wing's end; their south wall is z=-19 from x=-30 to -21... drawn by room_walls('main')
    room_walls('main', main_rooms, -30, 30, None)
    # corner-room doors face the wing verandah (x in -23.4..-22.3 and 22.3..23.4) - cut by hand through the front wall
    lm = LM['main']
    for sg in (-1, 1):
        pass
    # fittings
    for (a, b, t) in main_rooms:
        if t == 'class':
            classroom('main', a, b)
        elif t == 'office':
            office_room(lm, a, b)
        elif t == 'staff':
            staff_room(lm, a, b)
        else:
            corner_room(lm, a, b)
    # WINGS: rooms in z, 3 classrooms each (6.67 m), plus the end wall
    zr = [-19.0 + k * (20.0 / 3.0) for k in range(4)]
    for kind in ('left', 'right'):
        rooms = [(zr[k], zr[k + 1], 'class') for k in range(3)]
        room_walls(kind, rooms, -19.0, 1.0, None)
        for (a, b, t) in rooms:
            classroom(kind, a, b)


# ------------------------------------------------------------------------------------------------ verandah, roof, bands
def pillar_at(x, z, h=H):
    add('plinth', wb('pil_base', x - 0.21, x + 0.21, z - 0.21, z + 0.21, 0.2, 1.0, 0.01))
    add('plaster', wb('pil_shaft', x - 0.18, x + 0.18, z - 0.18, z + 0.18, 1.0, h - 0.12, 0.01))
    add('plaster', wb('pil_cap', x - 0.25, x + 0.25, z - 0.25, z + 0.25, h - 0.12, h, 0.01))


def build_verandahs():
    # raised red-oxide floor + a step
    add('apron', wb('ver_floor_main', -21.0, 21.0, -19.0, -15.8, 0, 0.22, 0.01), RED_FLOOR)
    add('apron', wb('ver_step_main', -21.0, 21.0, -15.8, -15.45, 0, 0.11, 0.01), 0xB5B0A4)
    for sg in (-1, 1):
        x0, x1 = (-24.0, -20.8) if sg < 0 else (20.8, 24.0)
        add('apron', wb('ver_floor_wing', x0, x1, -19.0, 1.0, 0, 0.22, 0.01), RED_FLOOR)
        xs0, xs1 = (-20.8, -20.45) if sg < 0 else (20.45, 20.8)
        add('apron', wb('ver_step_wing', xs0, xs1, -15.8, 1.0, 0, 0.11, 0.01), 0xB5B0A4)
    # pillars along the main verandah every 4 m, and the wings every ~4 m; a beam on top
    for x in range(-20, 21, 4):
        pillar_at(x, -16.3)
    for sg in (-1, 1):
        for z in (-16.3, -12.0, -8.0, -4.0, 0.0):
            pillar_at(sg * 21.3, z)
    for z in (-16.3,):
        pass
    add('plaster', wb('beam_main', -21.45, 21.45, -16.5, -16.1, H - 0.4, H, 0.01))
    for sg in (-1, 1):
        add('plaster', wb('beam_wing', sg * 21.5 - 0.2, sg * 21.5 + 0.2, -16.5, 1.4, H - 0.4, H, 0.01))
    # fascia ochre stripes on the beams
    for hh in (H - 0.4, H - 0.12):
        add('plinth', wb('beam_band', -21.5, 21.5, -16.52, -16.46, hh, hh + 0.06, 0.004))


def slab(x0, x1, z0, z1):
    add('trim', wb('slab', x0, x1, z0, z1, H, H + SLAB, 0.01), 0xB4B1A9)


def parapet(x0, x1, z0, z1, sides='nsew'):
    t = 0.2
    y0, y1 = H + SLAB, PAR_TOP
    if 'n' in sides:
        add('plaster', wb('par_n', x0, x1, z0, z0 + t, y0, y1, 0.01))
        add('plinth', wb('cap_n', x0 - 0.05, x1 + 0.05, z0 - 0.04, z0 + t + 0.04, y1, y1 + 0.07, 0.01))
    if 's' in sides:
        add('plaster', wb('par_s', x0, x1, z1 - t, z1, y0, y1, 0.01))
        add('plinth', wb('cap_s', x0 - 0.05, x1 + 0.05, z1 - t - 0.04, z1 + 0.04, y1, y1 + 0.07, 0.01))
    if 'w' in sides:
        add('plaster', wb('par_w', x0, x0 + t, z0 + t, z1 - t, y0, y1, 0.01))
        add('plinth', wb('cap_w', x0 - 0.04, x0 + t + 0.04, z0 + t, z1 - t, y1, y1 + 0.07, 0.01))
    if 'e' in sides:
        add('plaster', wb('par_e', x1 - t, x1, z0 + t, z1 - t, y0, y1, 0.01))
        add('plinth', wb('cap_e', x1 - t - 0.04, x1 + 0.04, z0 + t, z1 - t, y1, y1 + 0.07, 0.01))


def build_roofs():
    slab(-30.0, 30.0, -25.0, -16.0)
    slab(-30.0, -21.0, -16.0, 1.4)
    slab(21.0, 30.0, -16.0, 1.4)
    # parapets: back block all round except where the wings join; wings all round except the join with the back block
    t = 0.2
    y0, y1 = H + SLAB, PAR_TOP
    parapet(-30.0, 30.0, -25.0, -16.0, 'nwe')
    for (a, b) in ((-21.0, 21.0),):
        add('plaster', wb('par_s_mid', a, b, -16.0 - t, -16.0, y0, y1, 0.01))
        add('plinth', wb('cap_s_mid', a - 0.05, b + 0.05, -16.0 - t - 0.04, -16.0 + 0.04, y1, y1 + 0.07, 0.01))
    for sg in (-1, 1):
        a, b = (-30.0, -16.0 - 0) if sg < 0 else (16.0, 30.0)
        # south stretches of the back block roof outside the wings (x -30..-21) are covered by the wing slab; only the join needs nothing
    parapet(-30.0, -21.0, -16.0, 1.4, 'sw')
    for sx0 in (-30.0, 29.8):
        add('plaster', wb('par_fill', sx0, sx0 + 0.2, -16.2, -15.8, y0, y1, 0.0))
    parapet(21.0, 30.0, -16.0, 1.4, 'se')
    add('plaster', wb('par_wing_in_l', -21.2, -21.0, -16.0 + t, 1.4 - t, y0, y1, 0.01))
    add('plaster', wb('par_wing_in_r', 21.0, 21.2, -16.0 + t, 1.4 - t, y0, y1, 0.01))
    add('plinth', wb('cap_wing_in_l', -21.25, -20.95, -16.0 + t, 1.4 - t, y1, y1 + 0.07, 0.01))
    add('plinth', wb('cap_wing_in_r', 20.95, 21.25, -16.0 + t, 1.4 - t, y1, y1 + 0.07, 0.01))
    # ochre fascia stripes on the slab edge
    for hh in (H + 0.03, H + 0.15):
        add('plinth', wb('fas_s', -21.0, 21.0, -16.0 + 0.0, -15.96, hh, hh + 0.05, 0.004))
        add('plinth', wb('fas_ml', -30.0, -21.0, 1.4, 1.44, hh, hh + 0.05, 0.004))
        add('plinth', wb('fas_mr', 21.0, 30.0, 1.4, 1.44, hh, hh + 0.05, 0.004))
    # black plastic water tanks on the roof with a short pipe each (positions from the top view)
    for (tx, tz) in ((-15.3, -21.8), (-13.4, -21.8), (15.1, -21.8), (19.2, -21.8), (26.0, -22.0), (-27.8, -12.0), (27.7, -12.0)):
        b0 = H + SLAB
        add('paint', wb('tank_pad', tx - 0.8, tx + 0.8, tz - 0.8, tz + 0.8, b0, b0 + 0.12, 0.0), CEMENT)
        add('paint', cyl('tank', tx, tz, b0 + 0.12, b0 + 1.3, 0.62, 0.62, 18), 0x1C1C1F)
        add('paint', sphere('tank_dome', tx, tz, b0 + 1.3, 0.62, 0.62, 0.22, 2), 0x1C1C1F)
        for hr in (0.45, 0.9):
            add('paint', cyl('tank_rib', tx, tz, b0 + hr, b0 + hr + 0.05, 0.645, 0.645, 18), 0x2A2A2E)
        add('metal', limb('tank_pipe', (tx + 0.55, tz, b0 + 0.2), (tx + 0.55, tz, b0 + 0.6), 0.06, 0.06), 0x777A7D)
    # stairs-free: a roof door hut is not in the drawing. Drain pipes at the back corners
    for (x, z) in ((-29.8, -24.8), (29.8, -24.8), (-29.8, 1.2), (29.8, 1.2)):
        add('metal', limb('drain', (x, z, 0.1), (x, z, H + SLAB), 0.09, 0.09), 0x9A9EA3)


def build_bands():
    """Ochre plinth bands, cream-and-ochre outside faces, and the hygiene posters on verandah walls."""
    lm = LM['main']
    door_gaps = []
    for (a, b) in ((d, d + DW) for d in (-17.5, -13.5, -9.5, -2.5, 4.5, 11.5)):
        door_gaps.append((a - 0.1, b + 0.1))
    plinth_band(lm, -21.0, 21.0, -T, 0.04, 0.9, gaps=door_gaps)
    # (31 Oct: the outer back / side faces carry the 1.8 m boundary wall now, built in build_boundary, so no band here)
    # wing verandah-side bands
    for sg in (-1, 1):
        lmw = LM['left' if sg < 0 else 'right']
        gaps = []
        zr = [-19.0 + k * (20.0 / 3.0) for k in range(4)]
        for k in range(3):
            gaps.append((zr[k] + 0.4, zr[k] + 0.6 + DW))
        plinth_band(lmw, -19.0, 1.0, -T, 0.04, 0.9, gaps=gaps)
    # hygiene posters on verandah walls: 5 pictures, 1 x 1.2 m cards, three groups; atlas strip v 0.625..0.875
    uvr = (0.0, 0.625, 1.0, 0.875)
    def cards(face, pos, centres, per):
        for c in centres:
            for i in range(per):
                u0 = i / per
                if face in ('S', 'N'):
                    wall_decal(face, pos, c - 0.5 + 0.0, c + 0.5, 1.15, 2.35, (i / 5.0, 0.625, (i + 1) / 5.0, 0.875))
                else:
                    wall_decal(face, pos, c - 0.5, c + 0.5, 1.15, 2.35, (i / 5.0, 0.625, (i + 1) / 5.0, 0.875))
    # main block verandah wall faces +z at z=-19 - T
    pz = -19.0 + T + 0.015
    for i, x in enumerate((-14.25, -5.75, 1.75, 8.25, 15.25)):
        wall_decal('S', pz, x - 0.5, x + 0.5, 1.15, 2.35, (i / 5.0, 0.625, (i + 1) / 5.0, 0.875))
    # smaller second card pasted over a corner of three of them, a different picture, so the wall reads as layered over time
    for i, x, side in ((0, -14.25, 1), (2, 1.75, -1), (4, 15.25, 1)):
        j = (i + 2) % 5
        cx = x + side * 0.42
        wall_decal('S', pz + 0.012, cx - 0.3, cx + 0.3, 1.2 + 0.1 * side, 2.0 + 0.1 * side, (j / 5.0, 0.625, (j + 1) / 5.0, 0.875))
    # wing walls face the yard (+x for the left wing at x=-24-T... outer face x=-23.75, -x for the right wing at 23.75)
    for i, z in enumerate((-10.2, -3.6, 2.0)):
        pass
    for k, z in enumerate((-14.9, -8.25, -1.58)):
        wall_decal('E', -23.75 + 0.015, z - 0.5, z + 0.5, 1.15, 2.35, (((k + 1) % 5) / 5.0, 0.625, ((k + 1) % 5 + 1) / 5.0, 0.875))
        wall_decal('W', 23.75 - 0.015, z - 0.5, z + 0.5, 1.15, 2.35, (((k + 3) % 5) / 5.0, 0.625, ((k + 3) % 5 + 1) / 5.0, 0.875))
    # smaller second card over a corner of two wing posters per side (different picture, offset)
    for k, z, side in ((0, -14.9, 1), (2, -1.58, -1)):
        cz = z + side * 0.42
        jl, jr = (k + 3) % 5, (k + 0) % 5
        wall_decal('E', -23.75 + 0.027, cz - 0.3, cz + 0.3, 1.2 + 0.1 * side, 2.0 + 0.1 * side, (jl / 5.0, 0.625, (jl + 1) / 5.0, 0.875))
        wall_decal('W', 23.75 - 0.027, cz - 0.3, cz + 0.3, 1.2 - 0.1 * side, 2.0 - 0.1 * side, (jr / 5.0, 0.625, (jr + 1) / 5.0, 0.875))


# ------------------------------------------------------------------------------------------------ boundary + gate
GATE_HALF = 2.0
PIER = 0.6


def build_boundary():
    t = 0.3
    h = 1.8
    gx = GATE_HALF + PIER
    # front wall, both halves, ochre band + coping + pilasters every ~6 m
    for nm, x0, x1 in (('l', -HX, -gx), ('r', gx, HX)):
        add('plaster', wb('front_' + nm, x0, x1, HZ - t, HZ, 0, h, 0.01))
        add('plinth', wb('front_band_' + nm, x0 - 0.02, x1 + 0.02, HZ - t - 0.03, HZ + 0.03, 0, 0.45, 0.008))
        add('plinth', wb('front_band2_' + nm, x0 - 0.02, x1 + 0.02, HZ - t - 0.025, HZ + 0.025, 0.45, 0.5, 0.004))
        add('trim', wb('front_cope_' + nm, x0 - 0.04, x1 + 0.04, HZ - t - 0.06, HZ + 0.06, h, h + 0.1, 0.01))
    for x in (-24, -18, -12, -6.5, 6.5, 12, 18, 24):
        add('plaster', wb('pilaster', x - 0.25, x + 0.25, HZ - t - 0.08, HZ + 0.1, 0, h + 0.1, 0.01))
        add('trim', wb('pilaster_cap', x - 0.3, x + 0.3, HZ - t - 0.12, HZ + 0.14, h + 0.1, h + 0.2, 0.01))
        add('plinth', wb('pilaster_band', x - 0.27, x + 0.27, HZ - t - 0.1, HZ + 0.12, 0, 0.5, 0.008))
    # side boundary between the wing end and the front wall (the wings' outer faces are the boundary further north)
    for sg in (-1, 1):
        x0, x1 = (-HX, -HX + t) if sg < 0 else (HX - t, HX)
        add('plaster', wb('side_wall', x0, x1, 1.4, HZ - t, 0, h, 0.01))
        add('plinth', wb('side_band', x0 - 0.03, x1 + 0.03, 1.4, HZ - t, 0, 0.5, 0.008))
        add('trim', wb('side_cope', x0 - 0.05, x1 + 0.05, 1.4, HZ, h, h + 0.1, 0.01))
    # 31 Oct (LAYOUT 25 Oct correction): the boundary wall continues round the back and the wing sides, standing hard
    # against the blocks' outer walls (they rise above it). Same cream wall, ochre base band and coping as the front.
    bt = 0.15
    for nm, x0, x1, z0, z1, ax in (('back', -HX - bt, HX + bt, -HZ - bt, -HZ, 'z'),
                                   ('wside', -HX - bt, -HX, -HZ, 1.4, 'x'), ('eside', HX, HX + bt, -HZ, 1.4, 'x')):
        out = -1 if nm in ('back', 'wside') else 1
        add('plaster', wb('bwall_' + nm, x0, x1, z0, z1, 0.45, h, 0.0))
        if ax == 'z':
            add('plinth', wb('bwall_band_' + nm, x0, x1, z0 - 0.03, z1, 0, 0.45, 0.0))
            add('plinth', wb('bwall_band2_' + nm, x0, x1, z0 - 0.025, z1, 0.45, 0.5, 0.0))
            add('trim', wb('bwall_cope_' + nm, x0 - 0.04, x1 + 0.04, z0 - 0.06, z1, h, h + 0.1, 0.0))
        else:
            add('plinth', wb('bwall_band_' + nm, min(x0, x0 + out * 0.03), max(x1, x1 + out * 0.03), z0, z1, 0, 0.45, 0.0))
            add('plinth', wb('bwall_band2_' + nm, min(x0, x0 + out * 0.025), max(x1, x1 + out * 0.025), z0, z1, 0.45, 0.5, 0.0))
            add('trim', wb('bwall_cope_' + nm, min(x0, x0 + out * 0.06), max(x1, x1 + out * 0.06), z0, z1, h, h + 0.1, 0.0))
    # gate pillars: taller, stepped caps, an iron lantern each, cement apron
    for nm, cx in (('l', -GATE_HALF - PIER / 2), ('r', GATE_HALF + PIER / 2)):
        add('plaster', wb('pier_' + nm, cx - PIER / 2, cx + PIER / 2, HZ - t - 0.1, HZ + 0.1, 0, 2.5, 0.01))
        add('plinth', wb('pier_base_' + nm, cx - PIER / 2 - 0.03, cx + PIER / 2 + 0.03, HZ - t - 0.13, HZ + 0.13, 0, 0.7, 0.01))
        add('trim', wb('pier_cap_' + nm, cx - PIER / 2 - 0.08, cx + PIER / 2 + 0.08, HZ - t - 0.18, HZ + 0.18, 2.5, 2.64, 0.012))
        add('trim', wb('pier_cap2_' + nm, cx - PIER / 2 + 0.04, cx + PIER / 2 - 0.04, HZ - t - 0.06, HZ + 0.06, 2.64, 2.74, 0.01))
        add('metal', limb('lantern_stem', (cx, HZ - 0.15, 2.74), (cx, HZ - 0.15, 2.9), 0.04), IRON)
        add('metal', cyl('lantern', cx, HZ - 0.15, 2.9, 3.15, 0.12, 0.17, 6), IRON)
        add('paint', cyl('lantern_glass', cx, HZ - 0.15, 2.93, 3.12, 0.09, 0.13, 6), 0xF0E2A8)
        add('metal', cyl('lantern_cap', cx, HZ - 0.15, 3.15, 3.25, 0.19, 0.04, 6), IRON)
    add('trim', wb('gate_apron', -GATE_HALF - PIER, GATE_HALF + PIER, HZ - t - 0.4, HZ + 1.0, 0, 0.05, 0.01), 0xB2AFA7)
    # iron gate, both leaves swung open INTO the yard, tall bars + dark lower sheet + finials
    for sg in (-1, 1):
        hx = sg * (GATE_HALF - 0.05)
        zs, ze = HZ - 0.5, HZ - 2.0
        add('metal', limb('gate_hinge', (hx, zs, 0.1), (hx, zs, 2.1), 0.08), IRON)
        add('metal', limb('gate_free', (hx, ze, 0.1), (hx, ze, 2.1), 0.07), IRON)
        for hh in (0.15, 1.1, 2.05):
            add('metal', limb('gate_rail', (hx, zs, hh), (hx, ze, hh), 0.07, 0.05), IRON)
        add('metal', limb('gate_sheet', (hx, zs, 0.2), (hx, ze, 0.2), 0.03, 0.85), 0x2E3034)
        nb = 9
        for i in range(1, nb):
            z = zs + (ze - zs) * i / nb
            add('metal', limb('gate_bar', (hx, z, 1.1), (hx, z, 2.05), 0.025), IRON)
            add('metal', sphere('gate_finial', hx, z, 2.1, 0.035, 0.035, 0.05, 1), IRON)
    # blank board arch over the gate: cream board on two posts between the pillars' height (text painted in-game)
    add('plaster', wb('board_back', -2.6, 2.6, HZ - 0.2, HZ - 0.05, 2.95, 4.1, 0.01), 0xEFE3BE)
    for nm, x0, x1, h0, h1 in (('t', -2.68, 2.68, 4.1, 4.18), ('b', -2.68, 2.68, 2.87, 2.95), ('l', -2.68, -2.6, 2.87, 4.18), ('r', 2.6, 2.68, 2.87, 4.18)):
        add('metal', wb('board_edge_' + nm, x0, x1, HZ - 0.22, HZ - 0.03, h0, h1, 0.005), 0x3A3C3E)
    for sg in (-1, 1):
        add('metal', limb('board_post', (sg * 2.35, HZ - 0.15, 2.74), (sg * 2.35, HZ - 0.15, 3.0), 0.12), IRON)
    # donation board, blank, on the outer face of the front wall right of the gate (text painted in-game)
    add('plaster', wb('don_board', 7.2, 10.8, HZ + 0.1, HZ + 0.16, 0.55, 1.65, 0.01), 0xF2EBD2)
    for nm, x0, x1, h0, h1 in (('t', 7.12, 10.88, 1.65, 1.71), ('b', 7.12, 10.88, 0.49, 0.55), ('l', 7.12, 7.2, 0.49, 1.71), ('r', 10.8, 10.88, 0.49, 1.71)):
        add('wood', wb('don_edge_' + nm, x0, x1, HZ + 0.08, HZ + 0.18, h0, h1, 0.005))
    # children's mural on the outer face of the left front wall: cream band between the ochre base and the coping
    wall_decal('S', HZ + 0.035, -21.0, -9.0, 0.6, 1.7, (0.0, 0.875, 1.0, 1.0))


# ------------------------------------------------------------------------------------------------ yard
def plat_ring(name, cx, cz, R, h=0.45, soil=True):
    """A round raised brick platform (a planter left empty: the tree is hers)."""
    n = 20
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        add('brick', limb(name + '_seg', (cx + R * math.cos(a0), cz + R * math.sin(a0), h / 2), (cx + R * math.cos(a1), cz + R * math.sin(a1), h / 2), 0.34, h, 0.0))
    add('trim', cyl(name + '_cap', cx, cz, h, h + 0.05, R + 0.2, R + 0.2, 20))
    if soil:
        add('paint', cyl(name + '_soil', cx, cz, 0.0, h - 0.06, R - 0.15, R - 0.15, 20), 0x4A3524)


def bed(name, x0, x1, z0, z1, h=0.3, soil=0x4A3524):
    t = 0.18
    add('brick', wb(name + '_n', x0, x1, z0, z0 + t, 0, h, 0.0))
    add('brick', wb(name + '_s', x0, x1, z1 - t, z1, 0, h, 0.0))
    add('brick', wb(name + '_w', x0, x0 + t, z0 + t, z1 - t, 0, h, 0.0))
    add('brick', wb(name + '_e', x1 - t, x1, z0 + t, z1 - t, 0, h, 0.0))
    add('paint', wb(name + '_soil', x0 + t, x1 - t, z0 + t, z1 - t, 0, h - 0.06, 0.0), soil)
    add('trim', wb(name + '_cap', x0 - 0.02, x1 + 0.02, z0 - 0.02, z0 + t + 0.02, h, h + 0.04, 0.0), CEMENT)
    add('trim', wb(name + '_cap2', x0 - 0.02, x1 + 0.02, z1 - t - 0.02, z1 + 0.02, h, h + 0.04, 0.0), CEMENT)


def build_ground():
    add('paint', wb('ground', -HX, HX, -HZ, HZ, -0.06, 0.03, 0), 0xD2A573)
    add('paint', wb('ground_swept', -22.0, 22.0, -15.0, 22.0, 0.03, 0.036, 0), 0xDDB482)    # swept assembly ground, a paler tone
    add('paint', wb('ground_worn', -4.0, 4.0, 16.0, HZ - 0.3, 0.03, 0.04, 0), 0xBE9462)      # worn gate-to-flag path
    add('paint', wb('ground_worn2', -3.0, 3.0, 4.0, 16.0, 0.03, 0.04, 0), 0xBE9462)
    ground_decal(-15.0, 15.0, -5.5, 12.5, 0.045, (0.0, 0.0, 1.0, 0.5))   # the track lines (atlas region v 0..0.5)
    # the flag-cloth atlas strip is used on the cloth quad below; paths from the gate to the verandah steps
    add('trim', wb('path_steps', -2.6, 2.6, -15.45, -14.3, 0, 0.05, 0.01), 0xB2AFA7)


def build_flag():
    cx, cz = 0.0, 3.5
    for i, w in enumerate((1.9, 1.35, 0.8)):
        add('trim', wb('flag_step', cx - w, cx + w, cz - w, cz + w, i * 0.16, (i + 1) * 0.16, 0.012), 0xD9D6CC)
    add('metal', cyl('flag_pole', cx, cz, 0.48, 8.0, 0.06, 0.04, 10), 0xC7CBCF)
    add('metal', sphere('flag_ball', cx, cz, 8.05, 0.09, 0.09, 0.09, 2), 0xB08A3E)
    add('metal', cyl('flag_base', cx, cz, 0.48, 0.7, 0.12, 0.09, 10), 0xC7CBCF)
    # flag cloth 1.8 x 1.2 m, gently waved (a sine ripple across 12 strips), textured from the atlas
    nx = 12
    FX0, FW, FTOP, FH = cx + 0.05, 1.8, 7.9, 1.2

    def pt(t, y):
        return (FX0 + FW * t, cz + 0.12 * math.sin(t * 6.0) * (0.3 + t), FTOP - y)

    def uv_by_pos(o):
        uvl = o.data.uv_layers.new(name='UVMap')
        me = o.data
        for loop in me.loops:
            co = me.vertices[loop.vertex_index].co
            u = (co.x - FX0) / FW
            v = 0.5 + 0.125 * ((co.z - (FTOP - FH)) / FH)     # top of the cloth = top of the atlas strip (saffron)
            uvl.data[loop.index].uv = (u, v)
        o.data.materials.append(dmat)
        kit.extra.append(o)
    for k in range(nx):
        a, b = k / nx, (k + 1) / nx
        uv_by_pos(quad('cloth', [pt(a, FH), pt(b, FH), pt(b, 0.0), pt(a, 0.0)]))
        uv_by_pos(quad('cloth_b', [pt(b, FH), pt(a, FH), pt(a, 0.0), pt(b, 0.0)]))


def build_playground():
    """Front-left playground. Positions are layout (squeezed with the school); the equipment itself is built at real size."""
    # slide, red frame, yellow deck, steel chute
    sx, sz = -22.5, 17.0
    with real_size(sx, sz):
        for dx in (-0.4, 0.4):
            add('metal', limb('slide_leg', (sx + dx, sz - 0.7, 0), (sx + dx, sz - 0.7, 2.1), 0.07), 0xC0392B)
            add('metal', limb('slide_leg2', (sx + dx, sz + 0.2, 0), (sx + dx, sz + 0.2, 2.1), 0.07), 0xC0392B)
        add('metal', wb('slide_deck', sx - 0.5, sx + 0.5, sz - 0.85, sz + 0.35, 2.05, 2.12, 0.01), 0xE8B923)
        for k in range(8):
            add('metal', limb('ladder_rung', (sx - 0.4, sz - 0.9, 0.25 + k * 0.23), (sx + 0.4, sz - 0.9, 0.25 + k * 0.23), 0.04), 0xC0392B)
        add('metal', limb('ladder_side_a', (sx - 0.4, sz - 0.95, 0), (sx - 0.4, sz - 0.85, 2.1), 0.05), 0xC0392B)
        add('metal', limb('ladder_side_b', (sx + 0.4, sz - 0.95, 0), (sx + 0.4, sz - 0.85, 2.1), 0.05), 0xC0392B)
        add('metal', limb('slide_chute', (sx, sz + 0.3, 2.05), (sx, sz + 2.7, 0.15), 0.6, 0.04), 0xB9BDC2)
        for dx in (-0.32, 0.32):
            add('metal', limb('slide_rail', (sx + dx, sz + 0.3, 2.2), (sx + dx, sz + 2.7, 0.3), 0.04, 0.12), 0xC0392B)
        for dx in (-0.5, 0.5):
            add('metal', limb('deck_rail', (sx + dx, sz - 0.85, 2.15), (sx + dx, sz + 0.3, 2.15), 0.04), 0xC0392B)
    # swing set: A-frames and a top bar, two seats on chains
    wx, wz = F(-11.05), F(12.9)
    with real_size(wx, wz):
        for dz in (-0.9, 0.9):
            add('metal', limb('swing_leg_a', (wx - 1.6, wz + dz, 0), (wx - 1.25, wz, 2.6), 0.07, 0.07), 0x2E5E8B)
            add('metal', limb('swing_leg_b', (wx + 1.6, wz + dz, 0), (wx + 1.25, wz, 2.6), 0.07, 0.07), 0x2E5E8B)
        add('metal', limb('swing_bar_real', (wx - 1.3, wz, 2.6), (wx + 1.3, wz, 2.6), 0.09), 0x2E5E8B)
        for dx, seat_h in ((-0.5, 0.48), (0.5, 0.5)):
            for ddz in (-0.2, 0.2):
                add('metal', limb('swing_chain', (wx + dx, wz + ddz, 2.55), (wx + dx, wz + ddz, seat_h + 0.06), 0.015), 0x6D7378)
            add('wood', wb('swing_seat', wx + dx - 0.22, wx + dx + 0.22, wz - 0.22, wz + 0.22, seat_h, seat_h + 0.06, 0.01))
    # see-saw, by the toilet block wall, clear of the slide
    px, pz = F(-16.2), F(14.3)
    with real_size(px, pz):
        add('metal', wb('seesaw_base', px - 0.15, px + 0.15, pz - 0.35, pz + 0.35, 0, 0.1, 0.01), 0x2B2B2D)
        add('metal', wb('seesaw_post', px - 0.08, px + 0.08, pz - 0.08, pz + 0.08, 0.1, 0.5, 0.01), 0x2B2B2D)
        add('wood', limb('seesaw_plank', (px, pz - 1.4, 0.3), (px, pz + 1.4, 0.7), 0.24, 0.045))
        for (zz, hh) in ((pz - 1.2, 0.34), (pz + 1.2, 0.74)):
            add('metal', limb('seesaw_handle', (px - 0.12, zz, hh + 0.12), (px + 0.12, zz, hh + 0.12), 0.03), 0x2B2B2D)
    # 27 Oct: a second, shorter slide in blue (the little ones' slide), between the big slide and the swings
    s2x, s2z = F(-11.5), F(8.6)
    with real_size(s2x, s2z):
        for dx in (-0.35, 0.35):
            add('metal', limb('slide2_leg', (s2x + dx, s2z - 0.5, 0), (s2x + dx, s2z - 0.5, 1.5), 0.06), 0x2E5E8B)
            add('metal', limb('slide2_leg2', (s2x + dx, s2z + 0.2, 0), (s2x + dx, s2z + 0.2, 1.5), 0.06), 0x2E5E8B)
        add('metal', wb('slide2_deck', s2x - 0.45, s2x + 0.45, s2z - 0.65, s2z + 0.3, 1.45, 1.52, 0.01), 0xC0392B)
        for k in range(6):
            add('metal', limb('ladder2_rung', (s2x - 0.35, s2z - 0.7, 0.2 + k * 0.22), (s2x + 0.35, s2z - 0.7, 0.2 + k * 0.22), 0.035), 0x2E5E8B)
        add('metal', limb('ladder2_side_a', (s2x - 0.35, s2z - 0.74, 0), (s2x - 0.35, s2z - 0.66, 1.5), 0.045), 0x2E5E8B)
        add('metal', limb('ladder2_side_b', (s2x + 0.35, s2z - 0.74, 0), (s2x + 0.35, s2z - 0.66, 1.5), 0.045), 0x2E5E8B)
        add('metal', limb('slide2_chute', (s2x, s2z + 0.25, 1.45), (s2x, s2z + 2.1, 0.12), 0.5, 0.04), 0xB9BDC2)
        for dx in (-0.27, 0.27):
            add('metal', limb('slide2_rail', (s2x + dx, s2z + 0.25, 1.58), (s2x + dx, s2z + 2.1, 0.25), 0.035, 0.1), 0x2E5E8B)
    # stapu (hopscotch) court, chalk-white lines on the swept ground, real 0.56 m squares: 1 / 2-3 / 4 / 5-6 / 7 / 8,
    # clear of the running track, in the open strip in front of the right wing. A worn smudge where kids land.
    stx, stz = F(11.0), F(5.0)
    with real_size(stx, stz):
        cells = [(0, 0), (-0.5, 1), (0.5, 1), (0, 2), (-0.5, 3), (0.5, 3), (0, 4)]
        for k, (cx, cy) in enumerate(cells):
            x0, z0 = stx + cx * 0.6 - 0.28, stz + cy * 0.6
            add('paint', wb('stapu_%d' % k, x0, x0 + 0.56, z0, z0 + 0.56, 0.036, 0.042, 0), 0xE4DCC6)
            add('paint', wb('stapu_in_%d' % k, x0 + 0.045, x0 + 0.515, z0 + 0.045, z0 + 0.515, 0.04, 0.046, 0), 0xD2A573 if k % 3 else 0xC99C6A)
        # the half-moon "aasmaan" at the top, as three short chords
        for k in range(5):
            a0, a1 = math.pi * k / 5, math.pi * (k + 1) / 5
            add('paint', limb('stapu_arc', (stx + 0.55 * math.cos(a0), stz + 3.0 + 0.55 * math.sin(a0), 0.04),
                              (stx + 0.55 * math.cos(a1), stz + 3.0 + 0.55 * math.sin(a1), 0.04), 0.05, 0.008), 0xE4DCC6)
        add('paint', limb('stapu_pebble', (stx + 0.1, stz + 1.3, 0.05), (stx + 0.14, stz + 1.32, 0.05), 0.05, 0.03), 0x7A7470)
    # dustbins: one by each wing verandah, one by the playground, one at the kitchen; each a little different (lid on/off, lean)
    for k, (fx, fz) in enumerate(((-12.8, -1.9), (12.8, -1.6), (-9.0, 13.6), (10.7, 13.4), (12.0, -9.4))):
        bx, bz = F(fx), F(fz)
        body = (0x2C8A4A, 0x2E6FA8, 0x2E6FA8, 0x2C8A4A, 0x2E6FA8)[k]
        rim = (0x24703C, 0x24578F, 0x24578F, 0x24703C, 0x24578F)[k]
        hgt = (0.62, 0.66, 0.6, 0.62, 0.64)[k]
        with real_size(bx, bz):
            add('paint', cyl('dustbin_x%d' % k, bx, bz, 0.0, hgt, 0.21, 0.26, 12), body)
            add('paint', cyl('dustbin_xrim%d' % k, bx, bz, hgt, hgt + 0.04, 0.275, 0.275, 12), rim)
            if k % 2 == 0:
                add('paint', cyl('dustbin_lid%d' % k, bx, bz, hgt + 0.04, hgt + 0.08, 0.27, 0.22, 12), rim)
            add('paint', wb('dustbin_band%d' % k, bx - 0.24, bx + 0.24, bz - 0.25, bz - 0.23, 0.35, 0.42, 0), 0xE4DCC6)
    # a long wooden bench by the playground
    with real_size(F(-12.3), F(15.25)):
        b0, b1, bz = F(-12.3) - 0.9, F(-12.3) + 0.9, F(15.25)
        add('wood', wb('pg_bench', b0, b1, bz - 0.2, bz + 0.2, 0.4, 0.45, 0.008))
        for x in (b0 + 0.1, b1 - 0.1):
            add('wood', wb('pg_bench_leg', x - 0.04, x + 0.04, bz - 0.15, bz + 0.15, 0, 0.4, 0.004))


def build_toilets():
    """Small toilet block, two doors, front-left corner: two 3 x 3 m rooms with flat roofs, dark recessed doors, high vent windows, a tank."""
    for nm, z0 in (('a', 16.0), ('b', 20.4)):
        x0, x1, z1 = -29.6, -26.3, z0 + 3.2
        t = 0.2
        # three walls + a front wall (east, +x) with a door
        add('plaster', wb('wc_back_' + nm, x0, x0 + t, z0, z1, 0, 2.5, 0.0))
        add('plaster', wb('wc_n_' + nm, x0, x1, z0, z0 + t, 0, 2.5, 0.0))
        add('plaster', wb('wc_s_' + nm, x0, x1, z1 - t, z1, 0, 2.5, 0.0))
        # front wall with a door gap
        add('plaster', wb('wc_f1_' + nm, x1 - t, x1, z0 + t, z0 + 0.55, 0, 2.5, 0.0))
        add('plaster', wb('wc_f2_' + nm, x1 - t, x1, z0 + 1.55, z1 - t, 0, 2.5, 0.0))
        add('plaster', wb('wc_f3_' + nm, x1 - t, x1, z0 + 0.55, z0 + 1.55, 2.2, 2.5, 0.0))
        add('wood', wb('wc_df_a_' + nm, x1 - t - 0.02, x1 + 0.04, z0 + 0.5, z0 + 0.6, 0, 2.25, 0.0))
        add('wood', wb('wc_df_b_' + nm, x1 - t - 0.02, x1 + 0.04, z0 + 1.5, z0 + 1.6, 0, 2.25, 0.0))
        add('wood', wb('wc_df_c_' + nm, x1 - t - 0.02, x1 + 0.04, z0 + 0.5, z0 + 1.6, 2.2, 2.3, 0.0))
        add('wood', wb('wc_leaf_' + nm, x1 - 0.1, x1 + 0.45, z0 + 0.6, z0 + 0.65, 0.05, 2.15, 0.0))
        add('trim', wb('wc_floor_' + nm, x0, x1, z0, z1, 0, 0.05, 0.0), CEMENT)
        add('trim', wb('wc_roof_' + nm, x0 - 0.1, x1 + 0.15, z0 - 0.1, z1 + 0.1, 2.5, 2.7, 0.01))
        add('plaster', wb('wc_par_' + nm, x0 - 0.1, x1 + 0.15, z0 - 0.1, z0 + 0.0, 2.7, 3.0, 0.0))
        add('plaster', wb('wc_par2_' + nm, x0 - 0.1, x1 + 0.15, z1, z1 + 0.1, 2.7, 3.0, 0.0))
        add('plaster', wb('wc_par3_' + nm, x0 - 0.1, x0, z0, z1, 2.7, 3.0, 0.0))
        add('plaster', wb('wc_par4_' + nm, x1 + 0.05, x1 + 0.15, z0, z1, 2.7, 3.0, 0.0))
        add('plinth', wb('wc_band_' + nm, x1 - t - 0.01, x1 + 0.04, z0 + 0.2, z1 - 0.2, 0, 0.5, 0.0))
        add('paint', cyl('wc_tank_' + nm, (x0 + x1) / 2 - 0.5, z0 + 1.5, 2.7, 3.45, 0.42, 0.42, 14), 0x1C1C1F)
        # indian-style squat pan + a tap + bucket
        add('trim', wb('wc_pan_' + nm, x0 + 0.5, x0 + 1.2, z0 + 1.0, z0 + 1.6, 0.05, 0.12, 0.01), 0xE6E2D8)
        add('metal', limb('wc_pipe_' + nm, (x0 + 0.3, z0 + 0.4, 0.4), (x0 + 0.3, z0 + 0.4, 2.7), 0.04), 0x777A7D)
        add('metal', cyl('wc_bucket_' + nm, x0 + 0.5, z1 - 0.6, 0.0, 0.3, 0.14, 0.17, 10), 0x2E5E8B)
    add('plinth', wb('wc_step', -26.3, -25.6, 16.0, 23.6, 0, 0.07, 0.0))


def build_kitchen_dining():
    """Kitchen shed + open tin-roofed dining shed (front-right), hand-washing trough with row of taps, blue tank."""
    x0, x1, zk0, zk1, zd1 = 18.0, 23.2, 16.2, 20.0, 24.2
    t = 0.25
    # kitchen: brick room, door onto the dining side, chimney, soot-dark smoke stain over the stove
    for nm, a0, a1, b0, b1 in (('kn', x0, x1, zk0, zk0 + t), ('kw', x0, x0 + t, zk0, zk1), ('ke', x1 - t, x1, zk0, zk1)):
        add('brick', wb(nm, a0, a1, b0, b1, 0, 2.7, 0.0))
    add('brick', wb('ks1', x0, x0 + 1.5, zk1 - t, zk1, 0, 2.7, 0.0))
    add('brick', wb('ks2', x0 + 2.6, x1, zk1 - t, zk1, 0, 2.7, 0.0))
    add('brick', wb('ks3', x0 + 1.5, x0 + 2.6, zk1 - t, zk1, 2.2, 2.7, 0.0))
    add('wood', wb('k_door_f', x0 + 1.45, x0 + 1.55, zk1 - t - 0.02, zk1 + 0.05, 0, 2.25, 0.0))
    add('wood', wb('k_door_f2', x0 + 2.55, x0 + 2.65, zk1 - t - 0.02, zk1 + 0.05, 0, 2.25, 0.0))
    add('trim', wb('k_floor', x0, x1, zk0, zd1, 0, 0.06, 0.0), CEMENT)
    # chulha (clay stove) with two pots, a wood stack and a big steel cooking vessel inside
    add('brick', wb('chulha', x0 + 0.5, x0 + 2.2, zk0 + 0.4, zk0 + 1.0, 0, 0.7, 0.01))
    for k, px in enumerate((x0 + 0.95, x0 + 1.75)):
        add('metal', cyl('pot_%d' % k, px, zk0 + 0.7, 0.7, 1.15, 0.28, 0.32, 14), 0x7A7E82)
    add('wood', wb('firewood', x0 + 3.4, x0 + 4.7, zk0 + 0.4, zk0 + 0.9, 0, 0.6, 0.0))
    for k in range(7):
        add('wood', cyl('log', x0 + 3.5 + k * 0.17, zk0 + 0.65, 0.6, 0.72, 0.08, 0.08, 6), 0x7A5A3A)
    add('brick', wb('chimney', x0 + 0.6, x0 + 1.1, zk0 + 0.25, zk0 + 0.7, 2.7, 3.9, 0.01))
    add('tin', prism_x('k_roof', x0 - 0.3, x1 + 0.3, [(zk0 - 0.2, 3.2), (zk1 + 0.2, 2.75), (zk1 + 0.2, 2.82), (zk0 - 0.2, 3.27)]))
    # dining: open shed, brick pillars, tin roof, two long tables with benches, a row of steel plates
    for (px, pz) in ((x0 + 0.2, zd1 - 0.2), (x1 - 0.2, zd1 - 0.2), (x0 + 0.2, zk1 + 1.5), (x1 - 0.2, zk1 + 1.5), ((x0 + x1) / 2, zd1 - 0.2)):
        add('brick', wb('d_pillar', px - 0.2, px + 0.2, pz - 0.2, pz + 0.2, 0, 2.6, 0.01))
    add('wood', limb('d_beam_f', (x0 - 0.1, zd1 - 0.2, 2.7), (x1 + 0.1, zd1 - 0.2, 2.7), 0.2, 0.16))
    add('tin', prism_x('d_roof', x0 - 0.3, x1 + 0.3, [(zk1 - 0.1, 2.9), (zd1 + 0.4, 2.55), (zd1 + 0.4, 2.62), (zk1 - 0.1, 2.97)]))
    for tz in (zk1 + 1.2, zk1 + 2.8):
        add('wood', wb('d_table', x0 + 0.5, x1 - 0.5, tz - 0.3, tz + 0.3, 0.72, 0.77, 0.004))
        for ux in (x0 + 0.7, x1 - 0.7):
            add('wood', wb('d_leg', ux - 0.04, ux + 0.04, tz - 0.25, tz + 0.25, 0, 0.72, 0.0))
        for sg in (-1, 1):
            add('wood', wb('d_bench', x0 + 0.5, x1 - 0.5, tz + sg * 0.55 - 0.13, tz + sg * 0.55 + 0.13, 0.42, 0.46, 0.004))
        for k in range(5):
            add('metal', cyl('plate', x0 + 0.9 + k * 0.85, tz, 0.77, 0.79, 0.14, 0.14, 12), STEEL)
    # hand-washing trough: low concrete trough with a row of taps and a drain gutter, blue tank on a stand
    hx0, hx1, hz = 23.5, 27.4, 23.4
    cut_trough = wb('wash_trough', hx0, hx1, hz - 0.3, hz + 0.3, 0, 0.6, 0.01)
    add('trim', cut_trough, CEMENT)
    add('paint', wb('wash_basin', hx0 + 0.08, hx1 - 0.08, hz - 0.22, hz + 0.22, 0.6, 0.64, 0.0), 0x6F6A5E)
    add('metal', limb('wash_pipe', (hx0 + 0.1, hz - 0.35, 0.9), (hx1 - 0.1, hz - 0.35, 0.9), 0.05), 0x777A7D)
    for k in range(6):
        px = hx0 + 0.4 + k * 0.62
        add('metal', limb('wash_tap', (px, hz - 0.35, 0.9), (px, hz - 0.2, 0.74), 0.035), BRASS)
    add('metal', limb('wash_post_a', (hx0 + 0.1, hz - 0.35, 0), (hx0 + 0.1, hz - 0.35, 0.9), 0.06), 0x777A7D)
    add('metal', limb('wash_post_b', (hx1 - 0.1, hz - 0.35, 0), (hx1 - 0.1, hz - 0.35, 0.9), 0.06), 0x777A7D)
    # blue plastic tank on a brick stand at the wall corner
    tx, tz = 28.4, 23.2
    add('brick', wb('tank_stand', tx - 0.7, tx + 0.7, tz - 0.7, tz + 0.7, 0, 0.8, 0.01))
    add('paint', cyl('blue_tank', tx, tz, 0.8, 1.9, 0.62, 0.66, 18), 0x2F6FB5)
    add('paint', cyl('blue_tank_lid', tx, tz, 1.9, 1.98, 0.5, 0.5, 18), 0x24578F)
    for hr in (1.1, 1.5):
        add('paint', cyl('blue_tank_rib', tx, tz, hr, hr + 0.05, 0.68, 0.68, 18), 0x24578F)
    add('metal', limb('tank_tap', (tx - 0.6, tz, 1.0), (tx - 0.95, tz, 0.9), 0.05), BRASS)
    # vegetable patch: low brick-edged beds in a wooden fence (the plants are hers: left as bare soil)
    bed('veg_a', 23.7, 26.1, 16.0, 18.6, 0.2)
    bed('veg_b', 26.3, 28.7, 16.0, 18.6, 0.2)
    bed('veg_c', 23.7, 26.1, 18.9, 21.5, 0.2)
    bed('veg_d', 26.3, 28.7, 18.9, 21.5, 0.2)
    gx0, gx1, gz0, gz1 = 23.3, 29.1, 15.7, 21.9
    for i in range(int((gx1 - gx0) / 0.6) + 1):
        for z in (gz0, gz1):
            add('wood', limb('fence_post', (gx0 + i * 0.6, z, 0), (gx0 + i * 0.6, z, 1.0), 0.06))
    for i in range(int((gz1 - gz0) / 0.6) + 1):
        for x in (gx0, gx1):
            add('wood', limb('fence_post', (x, gz0 + i * 0.6, 0), (x, gz0 + i * 0.6, 1.0), 0.06))
    for z in (gz0, gz1):
        for hh in (0.9, 0.5):
            add('wood', limb('fence_rail', (gx0, z, hh), (gx1, z, hh), 0.035))
    for x in (gx0, gx1):
        for hh in (0.9, 0.5):
            add('wood', limb('fence_rail', (x, gz0, hh), (x, gz1, hh), 0.035))


def build_pump_and_misc():
    # hand pump on a cement platform with a trough (centre-right of the gate approach)
    px, pz = 9.0, 19.5
    add('trim', wb('pump_plat', px - 1.1, px + 1.1, pz - 0.9, pz + 0.9, 0, 0.12, 0.012), CEMENT)
    add('trim', wb('pump_trough', px + 0.15, px + 1.05, pz - 0.2, pz + 0.2, 0.12, 0.3, 0.01), 0xA9A69F)
    add('metal', cyl('pump_base', px - 0.4, pz, 0.12, 0.5, 0.16, 0.13, 10), 0x2E5E3A)
    add('metal', cyl('pump_col', px - 0.4, pz, 0.5, 1.2, 0.08, 0.065, 10), 0x2E5E3A)
    add('metal', limb('pump_handle', (px - 0.4, pz, 1.12), (px - 0.88, pz, 1.4), 0.05), 0x2E5E3A)
    add('metal', limb('pump_spout', (px - 0.4, pz, 0.85), (px - 0.05, pz, 0.68), 0.06), 0x2E5E3A)
    add('metal', cyl('pump_bucket', px + 0.55, pz + 0.55, 0.12, 0.42, 0.14, 0.18, 10), 0x2E5E8B)
    # 28 Oct: ten cycles parked just inside the gate, right of the path: six adult roadsters and four children's cycles
    # (the same roadster at 0.72-0.80 about its own foot). Real size, never squeezed; laid out in final metres via F().
    def child_cycle(bx, bz, col, k):
        before = set(bpy.context.scene.objects)
        bicycle(kit, bx, bz, col)
        for o in set(bpy.context.scene.objects) - before:
            if o.type == 'MESH':
                for v in o.data.vertices:
                    v.co.x = bx + (v.co.x - bx) * k
                    v.co.y = -bz + (v.co.y + bz) * k
                    v.co.z *= k
                o.data.update()
    adults = ((2.7, 13.7, 0xC0392B), (2.75, 13.05, 0x2E86C1), (2.65, 12.4, 0x3A7A4A), (2.8, 11.75, 0x5C4A8B),
              (8.4, 13.7, 0x8E3B2F), (8.5, 13.05, 0x2B6E8B))
    for (fx, fz, col) in adults:
        bx, bz = F(fx), F(fz)
        with real_size(bx, bz):
            bicycle(kit, bx, bz, col)
    kids = ((7.0, 13.75, 0xD1495B, 0.74), (7.05, 13.2, 0x3D9970, 0.8), (6.95, 12.65, 0xE0A030, 0.72), (7.1, 12.1, 0x6A4C93, 0.78))
    for (fx, fz, col, k) in kids:
        bx, bz = F(fx), F(fz)
        with real_size(bx, bz):
            child_cycle(bx, bz, col, k)
    # a bench + a dustbin by the verandah steps
    add('wood', wb('ver_bench', -12.4, -10.0, -15.2, -14.8, 0.4, 0.45, 0.008))
    for x in (-12.2, -10.2):
        add('wood', wb('ver_bench_leg', x - 0.04, x + 0.04, -15.15, -14.85, 0, 0.4, 0.004))
    # school bell on a post + hand bell rack, by the verandah
    add('metal', limb('bell_post', (-6.5, -14.8, 0), (-6.5, -14.8, 1.9), 0.1), IRON)
    add('metal', limb('bell_arm', (-6.5, -14.8, 1.85), (-6.1, -14.8, 1.85), 0.06), IRON)
    add('metal', cyl('bell', -6.1, -14.8, 1.45, 1.8, 0.06, 0.17, 10), BRASS)
    # drinking-water matka stand on the verandah
    # (28 Oct: moved against the wall between two windows, it was standing in a classroom doorway after the resize)
    mx, mz = 10.6, -18.45
    with real_size(mx, mz):
        add('metal', limb('stand_leg_a', (mx - 0.3, mz, 0.22), (mx - 0.3, mz, 0.82), 0.04), IRON)
        add('metal', limb('stand_leg_b', (mx + 0.3, mz, 0.22), (mx + 0.3, mz, 0.82), 0.04), IRON)
        add('paint', sphere('matka', mx, mz, 1.07, 0.28, 0.28, 0.26, 2), 0xB5693F)
    # planters / platforms for her trees and beds (left empty)
    plat_ring('neem', -26.5, 11.0, 1.4)
    plat_ring('peepal', 27.0, 11.0, 1.5)
    for k, z in enumerate((-9.0, -4.0, 6.0)):
        plat_ring('tl_%d' % k, -19.0, z, 0.8, 0.35)
        plat_ring('tr_%d' % k, 19.0, z, 0.8, 0.35)
    # long front tree-planters along the inside of the front wall either side of the gate path
    bed('plant_l', -17.0, -3.6, 21.8, 24.2, 0.3)
    bed('plant_r', 3.6, 17.0, 21.8, 24.2, 0.3)
    # flower beds in front of the verandah, with a gap for the steps
    bed('fb_l', -17.0, -3.4, -14.2, -12.6, 0.25)
    bed('fb_r', 3.4, 17.0, -14.2, -12.6, 0.25)


build_ground()
build_blocks()
build_verandahs()
build_roofs()
build_bands()
build_boundary()
build_flag()
build_playground()
build_toilets()
build_kitchen_dining()
build_pump_and_misc()


# 27 Oct: her note - school at 65% of its size. Squeeze plan (x, z) only; heights stay real. 28 Oct: objects made inside
# real_size() keep their true shape and only move with the layout (cycles, playground kit, dustbins, stapu court).
_kept = {}
for _objs, (_ax, _az) in REAL:
    for _o in _objs:
        _kept[_o.name] = (_ax, _az)
for _o in bpy.context.scene.objects:
    if _o.name in _kept:
        _ax, _az = _kept[_o.name]
        _o.location.x += _ax * (PLAN_SCALE - 1.0)
        _o.location.y += -_az * (PLAN_SCALE - 1.0)
        continue
    if _o.type == 'MESH':
        for _v in _o.data.vertices:
            _v.co.x *= PLAN_SCALE
            _v.co.y *= PLAN_SCALE
        _o.data.update()
    _o.location.x *= PLAN_SCALE
    _o.location.y *= PLAN_SCALE

TINTS = {'hb_plaster': '#FFF1CF', 'hb_plinth': '#E39A3C', 'hb_trim': '#F6E6BC', 'hb_apron': '#A8845A',
         'hb_wood': '#7A5A3E', 'hb_brick': '#C26A44', 'hb_tin': '#C5CDD2', 'hb_metal': '#FFFFFF'}
if len(kit.extra) > 1:
    kit.extra[:] = [join_objects(kit.extra, 'decals')]
kit.finalize(OUT, TINTS, drift={'hb_plaster': 0.04, 'hb_plinth': 0.05, 'hb_apron': 0.08, 'hb_brick': 0.08})
if os.environ.get('DEBUG_ATLAS'):
    im = bpy.data.images['hb_decal_img']
    im.filepath_raw = os.path.join(ROOT, 'tmp', 'primary_school_atlas.png')
    im.file_format = 'PNG'
    im.save()
