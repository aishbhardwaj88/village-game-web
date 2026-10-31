"""Primary school yard props: slide, swings, see-saw, stapu court, dustbins, pots.

Her 27 Oct notes: "You will need to add more slides in the school. You will also need to
make a Stapu game... keep dustbins... earthen pots."
LAYOUT.md: front-left playground (slide, swings, see-saw).

Everything is a separate object so the game can instance and place each one. Painted
metal in a village school is repainted often and chipped, so nothing is one flat colour:
every frame gets a slightly different tint and the paint is worn at the hand and foot
contact points, which is where real wear happens.

Run: python3 tools/blender/build_school_props.py
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (clear_scene, wb, limb, cyl, quad, box_uv, colorize,
                    make_flat_material, load_pbr_material, export_glb, ROOT)
import random
rnd = random.Random(7)

objs = []


def jitter(hex_col, amt=0.09):
    """No two repainted items in a village school are the same shade. Every object gets
    its own small shift so a row of them never reads as copies."""
    r, g, b = (hex_col >> 16) & 255, (hex_col >> 8) & 255, hex_col & 255
    f = 1.0 + rnd.uniform(-amt, amt)
    w = rnd.uniform(-amt, amt) * 40          # warm/cool drift
    r = max(0, min(255, int(r * f + w)))
    g = max(0, min(255, int(g * f)))
    b = max(0, min(255, int(b * f - w)))
    return (r << 16) | (g << 8) | b


def add(o, m, tint=None):
    # Vertex-tint everything. The material multiplies by this, so one material serves
    # many objects and each still looks individually painted and individually faded.
    colorize(o, jitter(tint if tint is not None else 0xFFFFFF), attr='Col')
    box_uv(o, (1, 1, 1))
    o.data.materials.append(m)
    objs.append(o)
    return o


def main():
    clear_scene()
    # village school palette: repainted many times, never saturated
    red = make_flat_material('sp_red', 0xB4442E, roughness=0.72)
    blue = make_flat_material('sp_blue', 0x2E6B8A, roughness=0.72)
    yellow = make_flat_material('sp_yellow', 0xC9972E, roughness=0.74)
    green = make_flat_material('sp_green', 0x4A7A46, roughness=0.74)
    # rusted steel and painted wood are both APPROVED and frozen, so reuse them here
    # rather than inventing a new look that has to be judged again.
    steel = load_pbr_material('sp_steel', 'metal', repeat=(1.0, 1.0), roughness_factor=0.92)
    rust = load_pbr_material('sp_rust', 'rust', repeat=(1.0, 1.0))
    wood = load_pbr_material('sp_wood', 'wood', repeat=(1.0, 1.0))
    chalk = make_flat_material('sp_chalk', 0xE4DED0, roughness=0.95)
    clay = make_flat_material('sp_clay', 0xA9643E, roughness=0.92)

    # ---------- SLIDE ----------
    # Two sizes: a tall one for older children and a short one for the little ones.
    for tag, H, L, W, px in (('big', 2.05, 3.3, 0.62, 0.0), ('small', 1.25, 2.0, 0.52, 2.3)):
        pz = 0.0
        # ladder: two rails plus rungs
        for s in (-1, 1):
            add(limb(f'sl_{tag}_rail{s}', (px + s * W / 2, pz - 0.45, 0.0),
                     (px + s * W / 2, pz - 0.05, H + 0.42), t=0.035), steel)
        n = max(3, int(H / 0.26))
        for k in range(1, n + 1):
            h = H * k / (n + 1)
            # the rung sits on the sloping rail, so its z follows the slope
            zz = pz - 0.45 + 0.40 * (h / H)
            add(limb(f'sl_{tag}_rung{k}', (px - W / 2, zz, h), (px + W / 2, zz, h), t=0.018), steel)
        # platform
        add(wb(f'sl_{tag}_plat', px - W / 2, px + W / 2, pz - 0.10, pz + 0.30, H, H + 0.04), steel)
        # chute: a flat slope with turned-up side rails. Slide polish means the middle
        # of the chute wears bright where children sit, so it is split into 3 strips.
        z1 = pz + 0.30 + L
        for i, (a, b) in enumerate(((-W / 2, -W / 6), (-W / 6, W / 6), (W / 6, W / 2))):
            mat = steel if i == 1 else (red if tag == 'big' else blue)
            add(quad(f'sl_{tag}_chute{i}', [
                (px + a, pz + 0.30, H), (px + b, pz + 0.30, H),
                (px + b, z1, 0.09), (px + a, z1, 0.09)]), mat)
        for s in (-1, 1):
            add(limb(f'sl_{tag}_side{s}', (px + s * W / 2, pz + 0.30, H + 0.11),
                     (px + s * W / 2, z1, 0.20), t=0.030), red if tag == 'big' else blue)
        # concrete footings, because a real one is set in the ground
        for s in (-1, 1):
            add(cyl(f'sl_{tag}_ft{s}', px + s * W / 2, pz - 0.45, -0.02, 0.07, 0.07, seg=6), chalk)

    # ---------- SWING SET ----------
    SX, SZ, SH, SW = 6.0, 0.0, 2.25, 2.6
    for s in (-1, 1):                                   # two A-frames
        for d in (-1, 1):
            add(limb(f'sw_leg{s}{d}', (SX + s * SW / 2 + d * 0.0, SZ + d * 0.52, 0.0),
                     (SX + s * SW / 2, SZ, SH), t=0.045), blue)
        add(cyl(f'sw_ft{s}', SX + s * SW / 2, SZ, -0.02, 0.08, 0.09, seg=6), chalk)
    add(limb('sw_bar', (SX - SW / 2, SZ, SH), (SX + SW / 2, SZ, SH), t=0.050), blue)
    for k, off in enumerate((-0.62, 0.62)):             # two swings
        for s in (-1, 1):
            add(limb(f'sw_chain{k}{s}', (SX + off + s * 0.19, SZ, SH - 0.05),
                     (SX + off + s * 0.19, SZ + 0.03 * k, 0.52), t=0.009), steel)
        add(wb(f'sw_seat{k}', SX + off - 0.22, SX + off + 0.22,
               SZ - 0.09 + 0.03 * k, SZ + 0.09 + 0.03 * k, 0.50, 0.54), wood)

    # ---------- SEE-SAW ----------
    TX, TZ = -4.0, 0.0
    add(cyl('ss_post', TX, TZ, 0.0, 0.52, 0.07, seg=8), red)
    add(cyl('ss_ft', TX, TZ, -0.02, 0.07, 0.11, seg=6), chalk)
    # plank tilted: one end down, one up, which is how an idle see-saw always rests
    add(quad('ss_plank', [(TX - 0.13, TZ - 1.75, 0.14), (TX + 0.13, TZ - 1.75, 0.14),
                          (TX + 0.13, TZ + 1.75, 0.92), (TX - 0.13, TZ + 1.75, 0.92)]), wood)
    for e, h in ((-1.55, 0.26), (1.55, 0.80)):          # handles
        add(limb(f'ss_h{int(e)}', (TX - 0.17, TZ + e, h), (TX + 0.17, TZ + e, h), t=0.022), steel)

    # ---------- STAPU (hopscotch) COURT ----------
    # Painted on the ground, so it is flat quads lying just above the yard surface.
    # Village stapu is chalk or lime, scuffed, never a crisp printed grid.
    CX, CZ, C = 10.0, 0.0, 0.52
    cells = [(0, 0), (0, 1), (-1, 2), (1, 2), (0, 3), (-1, 4), (1, 4), (0, 5), (0, 6)]
    LW = 0.035                      # chalk line width

    def chalk_line(nm, ax, az, bx, bz):
        """One hand-drawn line. Real stapu is scratched out with a stone or a lump of
        lime, so the line wanders and the ends overshoot the corner."""
        ox = rnd.uniform(-0.012, 0.012)
        oz = rnd.uniform(-0.012, 0.012)
        ex = rnd.uniform(0.0, 0.035)        # overshoot past the corner
        dx, dz = bx - ax, bz - az
        ln = max(1e-6, (dx * dx + dz * dz) ** 0.5)
        dx, dz = dx / ln, dz / ln
        px, pz = -dz * LW / 2, dx * LW / 2  # perpendicular, to give the line width
        a = (ax - dx * ex + ox, az - dz * ex + oz)
        b = (bx + dx * ex + ox, bz + dz * ex + oz)
        add(quad(nm, [(a[0] + px, a[1] + pz, 0.012), (a[0] - px, a[1] - pz, 0.012),
                      (b[0] - px, b[1] - pz, 0.012), (b[0] + px, b[1] + pz, 0.012)]), chalk)

    drawn = set()
    for i, (gx, gy) in enumerate(cells):
        x0, z0 = CX + gx * C - C / 2, CZ + gy * C - C / 2
        x1, z1 = x0 + C, z0 + C
        # draw each edge once, so shared edges between touching cells are not doubled
        for j, (ax, az, bx, bz) in enumerate((
                (x0, z0, x1, z0), (x1, z0, x1, z1), (x1, z1, x0, z1), (x0, z1, x0, z0))):
            key = tuple(sorted([(round(ax, 2), round(az, 2)), (round(bx, 2), round(bz, 2))]))
            if key in drawn:
                continue
            drawn.add(key)
            chalk_line(f'st_l{i}_{j}', ax, az, bx, bz)

    # ---------- DUSTBINS ----------
    # Three kinds, because a village school never has a matching set:
    # a repainted oil drum, a small moulded bin, a concrete ring bin.
    # An oil drum has two rolling ribs and a rolled rim: without them it is just a tube.
    add(cyl('db_drum', 13.2, 0.0, 0.0, 0.84, 0.28, seg=14), green, 0x4A7A46)
    for h in (0.26, 0.56):
        add(cyl(f'db_drum_rib{int(h*100)}', 13.2, 0.0, h, h + 0.035, 0.293, seg=14), green, 0x4A7A46)
    add(cyl('db_drum_rim', 13.2, 0.0, 0.80, 0.86, 0.298, seg=14), rust, 0x7A4327)
    add(cyl('db_drum_foot', 13.2, 0.0, 0.0, 0.05, 0.287, seg=14), rust, 0x6A3A22)  # rusts first
    # small moulded bin with a lip and a lid
    add(cyl('db_moulded', 14.1, 0.0, 0.0, 0.56, 0.20, 0.24, seg=12), blue, 0x2E6B8A)
    add(cyl('db_moulded_lip', 14.1, 0.0, 0.54, 0.59, 0.25, seg=12), blue, 0x2E6B8A)
    add(cyl('db_moulded_lid', 14.1, 0.02, 0.59, 0.63, 0.245, 0.17, seg=12), blue, 0x27607D)
    # concrete ring bin, chipped at the rim
    add(cyl('db_concrete', 15.0, 0.0, 0.0, 0.52, 0.30, 0.27, seg=12), chalk, 0xB8B2A4)
    add(cyl('db_concrete_rim', 15.0, 0.0, 0.50, 0.55, 0.285, seg=12), chalk, 0xA8A294)

    # ---------- EARTHEN POTS ----------
    # Drinking water pots on a low stand near the verandah.
    add(wb('pot_stand', 16.5, 17.6, -0.22, 0.22, 0.0, 0.46), wood)
    for k, (dx, r) in enumerate(((0.18, 0.17), (0.62, 0.14), (0.95, 0.11))):
        add(cyl(f'pot_body{k}', 16.5 + dx, 0.0, 0.46, 0.46 + r * 1.5, r * 0.72, r, seg=12), clay)
        add(cyl(f'pot_neck{k}', 16.5 + dx, 0.0, 0.46 + r * 1.5, 0.52 + r * 1.7, r, r * 0.66, seg=12), clay)

    out = os.path.join(ROOT, 'tmp', 'school_props_raw.glb')
    export_glb(objs, out)
    tris = 0
    for o in objs:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    print(f'OBJECTS {len(objs)}  TRIANGLES {tris}')


main()
