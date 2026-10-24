"""
A kachcha (mud-and-dung-plaster, thatch-roofed) homestead at the village edge — Blender model, authored in world offsets from its anchor.
Run: tools/blender/make.sh kachcha kachcha_homestead
Courtyard 15 x 13 m inside a low mud wall (gate gap on the +z side): a one-room house with a raised veranda, wooden posts and a
thatched gable roof (west), a cattle shed with a manger (east), a charpai, a chulha, a tulsi chabutra, matkas, dung cakes, a haystack and
firewood. Swept, limewashed door borders, cared-for. Collision backing is built in src/kachcha.js (footprints below must match).
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, quad, ROOT
from arch import Kit, Bldg, panel_door, barred_window, pot, clay_pot, lathe, LEAF

OUT = os.path.join(ROOT, 'tmp', 'kachcha_homestead_raw.glb')
kit = Kit(split_props=False, tex_override={'props': ('thatch', 1.0)}, route={'thatch': 'props'})  # no separate paint-props mesh here: the 'props' slot carries the real thatch set (no extra draw call)
rnd = random.Random(31)
THATCH = [0xFFF4D6, 0xF2E6BE, 0xE8D8A8, 0xFFF8DC, 0xEBDDB2]
LIME = 0xE8DFC8
GEROO = 0xB4552F


def thatch_roof_z(x0, x1, zs, hs, name):
    """Gable thatch (ridge along x): zs/hs = (z_front, z_ridge, z_back), (h_eave_front, h_ridge, h_eave_back)."""
    zf, zr, zb = zs
    hf, hr, hb = hs
    t = 0.2
    kit.add('thatch', prism_x(name, x0, x1, [(zf, hf), (zr, hr), (zb, hb), (zb, hb + t), (zr, hr + t), (zf, hf + t)]), 0xD8C690)
    # shaggy straw bundles lying along the slope (random lengths/colours), and a bound ridge cap
    for (za, ha, zc, hc) in ((zf, hf, zr, hr), (zb, hb, zr, hr)):
        for k in range(14):
            f = (k + 0.5) / 14
            z = za + (zc - za) * f
            h = ha + (hc - ha) * f + t + 0.02
            xa = x0 + rnd.uniform(0, 0.4)
            xb = x1 - rnd.uniform(0, 0.4)
            kit.add('thatch', limb(name + '_straw', (xa, z, h), (xb, z, h), 0.2, 0.09), rnd.choice(THATCH))
        for k in range(10):  # ragged hanging eave ends
            x = x0 + (x1 - x0) * (k + rnd.random() * 0.6) / 10
            kit.add('thatch', limb(name + '_eave', (x, za, ha + 0.1), (x + rnd.uniform(-0.05, 0.05), za + (za - zr) * 0.05, ha - 0.12), 0.16, 0.05), rnd.choice(THATCH))
    kit.add('thatch', limb(name + '_ridge', (x0 - 0.1, zr, hr + t + 0.05), (x1 + 0.1, zr, hr + t + 0.05), 0.28, 0.2), THATCH[3])
    for k in range(7):
        x = x0 + (x1 - x0) * (k + 0.5) / 7
        kit.add('paint', limb(name + '_bind', (x, zr - 0.14, hr + t + 0.04), (x, zr + 0.14, hr + t + 0.04), 0.03, 0.3), 0x6F5836)


def house():
    b = Bldg('house', -6.0, 0.0, -5.5, -1.5, 2.45, t=0.3)
    cuts = [b.through('S', -3.45, -2.35, 0, 1.95), b.through('S', -5.4, -4.5, 1.05, 1.75), b.through('S', -1.5, -0.7, 1.05, 1.75)]
    kit.add('plaster', b.solid(cuts=cuts, bevel=0.05))
    kit.add('plinth', wb('plinth', -6.06, 0.06, -5.56, -1.44, 0, 0.4, 0.06))
    kit.add('trim', wb('dado_band', -6.07, 0.07, -1.47, -1.43, 0.46, 0.62, 0.01))   # white limewash band along the front
    kit.add('trim', wb('door_border_l', -3.62, -3.45, -1.47, -1.42, 0, 2.2, 0.01))
    kit.add('trim', wb('door_border_r', -2.35, -2.18, -1.47, -1.42, 0, 2.2, 0.01))
    kit.add('trim', wb('door_border_t', -3.62, -2.18, -1.47, -1.42, 1.96, 2.2, 0.01))
    for x in (-5.4, -1.5):
        kit.add('trim', wb('win_border', x - 0.08, x + 0.98, -1.47, -1.43, 1.76, 1.84, 0.01))
    panel_door(kit, b, 'S', -3.45, -2.35, 0, 1.95, depth=0.12)
    barred_window(kit, b, 'S', -5.4, -4.5, 1.05, 1.75)
    barred_window(kit, b, 'S', -1.5, -0.7, 1.05, 1.75)
    # raised veranda platform with an earth-red geroo edge + 4 wooden posts + bressumer beam
    kit.add('apron', wb('veranda', -6.2, 0.2, -1.5, 0.35, 0, 0.32, 0.03))
    kit.add('paint', wb('veranda_edge', -6.2, 0.2, 0.3, 0.35, 0.0, 0.1, 0.01), GEROO)
    for x in (-5.9, -3.7, -1.6, 0.0):
        kit.add('wood', limb('post', (x, 0.1, 0.32), (x, 0.1, 2.35), 0.17, 0.17, 0.01))
    kit.add('wood', limb('beam', (-6.15, 0.1, 2.3), (0.15, 0.1, 2.3), 0.2, 0.2, 0.01))
    for k in range(6):
        x = -5.8 + k * 1.1
        kit.add('wood', limb('rafter', (x, -1.2, 2.5), (x, 0.4, 2.3), 0.09, 0.09))
    thatch_roof_z(-6.5, 0.5, (-6.2, -3.5, -0.85), (2.2, 3.95, 2.2), 'roof')
    # lean-to thatch over the veranda, blending into the main roof's front eave
    kit.add('paint', prism_x('lean', -6.4, 0.4, [(-1.0, 2.55), (0.55, 2.2), (0.55, 2.38), (-1.0, 2.75)]), THATCH[1])
    for k in range(8):
        f = (k + 0.5) / 8
        z = -1.0 + 1.55 * f
        kit.add('paint', limb('lean_straw', (-6.35 + rnd.uniform(0, 0.3), z, 2.77 - 0.55 * f), (0.35 - rnd.uniform(0, 0.3), z, 2.77 - 0.55 * f), 0.2, 0.08), rnd.choice(THATCH))
    # chimney-less smoke vent, a low charpai on the veranda leaning wall, clay pots by the door
    clay_pot(kit, -1.9, 0.0, 1.0)
    clay_pot(kit, -4.4, -0.2, 0.9)
    pot(kit, -3.0, 0.1, 0.32, 0.17, 0.2)  # tulsi near the door


def shed():
    # three-sided cattle shed with a manger, east side
    kit.add('plaster', wb('shed_back', 2.5, 6.9, -5.5, -5.2, 0, 2.2, 0.04))
    kit.add('plaster', wb('shed_side_e', 6.6, 6.9, -5.5, -2.0, 0, 2.2, 0.04))
    kit.add('plaster', wb('shed_side_w', 2.5, 2.8, -5.5, -3.2, 0, 2.2, 0.04))
    kit.add('plinth', wb('shed_plinth', 2.44, 6.96, -5.56, -1.94, 0, 0.3, 0.05))
    for x in (2.7, 4.7, 6.7):
        kit.add('wood', limb('shed_post', (x, -2.1, 0.0), (x, -2.1, 2.3), 0.15, 0.15, 0.01))
    kit.add('wood', limb('shed_beam', (2.5, -2.1, 2.25), (6.9, -2.1, 2.25), 0.18, 0.18))
    thatch_roof_z(2.3, 7.1, (-6.0, -4.2, -1.3), (2.35, 3.35, 2.35), 'shed_roof')
    # mud manger, trough, hay, a tying post
    kit.add('plaster', wb('manger', 3.0, 6.2, -5.1, -4.45, 0, 0.55, 0.05))
    kit.add('paint', wb('manger_in', 3.15, 6.05, -5.0, -4.55, 0.3, 0.56, 0.02), 0xB59A55)
    kit.add('paint', cyl('trough', 4.4, -3.0, 0.0, 0.34, 0.38, 0.45, 14), 0xA08C70)
    kit.add('paint', cyl('trough_w', 4.4, -3.0, 0.3, 0.33, 0.36, 0.36, 14), 0x5E7A82)
    kit.add('wood', limb('tie_post', (6.0, -2.7, 0.0), (6.0, -2.7, 1.1), 0.12, 0.12))
    kit.add('paint', wb('shed_floor', 2.6, 6.8, -5.1, -2.2, 0.0, 0.03, 0.01), 0x6D5A40)
    # lime-wash geroo stripe marks on the shed side
    for k in range(4):
        kit.add('trim', wb('stripe', 6.55 - 0.0, 6.62, -5.0 + k * 0.8, -4.7 + k * 0.8, 1.2, 1.9, 0.0))


def compound():
    # low courtyard wall (1.2 m), 4 m pieces; gate gap x -1.3..1.3 on the +z side
    def seg(name, x0, x1, z0, z1):
        kit.add('plaster', wb(name, x0, x1, z0, z1, 0, 1.2, 0.05))
        kit.add('plinth', wb(name + '_cap', x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04, 1.2, 1.32, 0.04))
    seg('wall_n', -7.5, 7.5, -6.8, -6.5)
    seg('wall_w', -7.5, -7.2, -6.5, 6.5)
    seg('wall_e', 7.2, 7.5, -6.5, 6.5)
    seg('wall_sw', -7.5, -1.3, 6.2, 6.5)
    seg('wall_se', 1.3, 7.5, 6.2, 6.5)
    for x in (-1.45, 1.45):
        kit.add('wood', limb('gate_post', (x, 6.35, 0.0), (x, 6.35, 2.0), 0.2, 0.2, 0.01))
        kit.add('paint', wb('gate_cap', x - 0.2, x + 0.2, 6.15, 6.55, 2.0, 2.12, 0.02), THATCH[0])
    kit.add('wood', limb('gate_bar', (-1.45, 6.35, 1.0), (1.45, 6.35, 1.0), 0.07, 0.07))
    # dung cakes (gobar uple) patted onto the east wall + a stack
    for r in range(4):
        for c in range(9):
            if rnd.random() < 0.82:
                kit.add('paint', cyl('uple', 7.12, -4.0 + c * 0.38, 0.3 + r * 0.2, 0.46 + r * 0.2, 0.0, 0.0, 6) if False else sphere('uple', 7.15, -4.0 + c * 0.38 + (r % 2) * 0.15, 0.9 + r * 0.14, 0.03, 0.17, 0.07, 1), rnd.choice((0x6D5A40, 0x7A6648, 0x5E4D35)))
    # firewood bundle against the north wall
    for k in range(14):
        kit.add('wood', limb('log', (-6.9 + rnd.uniform(0, 0.2), -6.2 + (k % 3) * 0.18, 0.1 + (k // 3) * 0.12), (-4.6 - rnd.uniform(0, 0.3), -6.2 + (k % 3) * 0.18 + rnd.uniform(-0.05, 0.05), 0.12 + (k // 3) * 0.12), 0.1, 0.1), rnd.choice((0x7A5B3C, 0x6B4E33, 0x8A6A45)))


def yard_props():
    # charpai: four turned legs, wooden frame, rope weave (two crossed layers), folded quilt
    cx, cz = -3.2, 3.2
    for dx in (-0.9, 0.9):
        for dz in (-0.5, 0.5):
            kit.add('wood', cyl('cleg', cx + dx, cz + dz, 0.0, 0.4, 0.05, 0.04, 8))
    kit.add('wood', wb('cframe', cx - 1.0, cx + 1.0, cz - 0.6, cz + 0.6, 0.4, 0.46, 0.01))
    kit.add('paint', wb('rope', cx - 0.93, cx + 0.93, cz - 0.53, cz + 0.53, 0.44, 0.47, 0.003), 0xB8A57A)
    kit.add('paint', wb('quilt', cx - 0.9, cx - 0.1, cz - 0.5, cz + 0.5, 0.47, 0.57, 0.04), 0xA43A4A)
    kit.add('paint', wb('pillow', cx - 0.98, cx - 0.78, cz - 0.4, cz + 0.4, 0.47, 0.58, 0.05), 0xE4D9BD)
    # chulha: mud stove (horseshoe), pot on it, a pile of sticks beside
    sx, sz = 1.8, 2.0
    kit.add('plaster', wb('chulha_b', sx - 0.42, sx + 0.42, sz - 0.35, sz + 0.35, 0, 0.3, 0.1))
    kit.add('plaster', wb('chulha_wall', sx - 0.42, sx + 0.42, sz - 0.35, sz - 0.12, 0.3, 0.52, 0.06))
    kit.add('paint', cyl('chulha_hole', sx, sz + 0.05, 0.3, 0.32, 0.17, 0.17, 12), 0x1A1511)
    kit.add('paint', cyl('chulha_pot', sx, sz + 0.05, 0.32, 0.62, 0.2, 0.24, 14), 0xB8BCC1)
    kit.add('paint', cyl('chulha_lid', sx, sz + 0.05, 0.62, 0.65, 0.23, 0.23, 14), 0x8E9297)
    for k in range(5):
        kit.add('wood', limb('stick', (sx - 0.7, sz + 0.5 + k * 0.05, 0.05 + 0.03 * k), (sx - 0.2, sz + 0.55 + k * 0.04, 0.05), 0.04, 0.04), 0x7A5B3C)
    # tulsi chabutra in the middle of the courtyard
    kit.add('plaster', wb('chabutra', 3.8, 4.8, -0.5, 0.5, 0, 0.7, 0.05))
    kit.add('trim', wb('chabutra_band', 3.77, 4.83, -0.53, 0.53, 0.58, 0.64, 0.01))
    kit.add('paint', wb('chabutra_niche', 4.78, 4.84, -0.15, 0.15, 0.3, 0.52, 0.0), 0x4A3A2A)
    pot(kit, 4.3, 0.0, 0.7, 0.2, 0.3)
    # matka stand with three pots, a milk-can near the shed
    for (x, z, s) in ((-6.7, 1.5, 1.0), (-6.4, 2.2, 0.9), (-6.7, 2.9, 1.0)):
        clay_pot(kit, x, z, s)
    kit.add('wood', wb('matka_stand', -6.95, -6.0, 1.0, 3.4, 0.0, 0.06, 0.01))
    kit.add('paint', cyl('milkcan', 3.2, -1.8, 0.0, 0.5, 0.15, 0.15, 12), 0xB9BDC2)
    # haystack (golden cone, bound) beside the shed
    hx, hz = 5.2, 3.2
    kit.add('thatch', lathe('stack', hx, hz, [(0.0, 0.0), (1.25, 0.0), (1.42, 0.5), (1.38, 1.2), (1.12, 1.9), (0.7, 2.4), (0.28, 2.75), (0.0, 2.9)], seg=20), 0xF2E8C8)
    kit.add('paint', limb('stack_rope', (hx - 1.43, hz, 0.8), (hx + 1.43, hz, 0.8), 0.05, 0.05), 0x7A6A48) if False else None
    for k in range(5):
        a = k * 1.26
        kit.add('thatch', sphere('hay_tuft', hx + 1.5 * math.cos(a), hz + 1.5 * math.sin(a), 0.2, 0.3, 0.3, 0.22, 1), 0xEADFBC)
    # swept courtyard floor, slightly darker dung-plastered earth, with a wider sweep-mark apron at the gate
    kit.add('apron', wb('yard_floor', -7.2, 7.2, -6.5, 6.2, 0.0, 0.04, 0.01))
    kit.add('paint', wb('gate_apron', -1.9, 1.9, 6.2, 8.2, 0.0, 0.03, 0.01), 0x9C8566)


house()
shed()
compound()
yard_props()
TINTS = {'hb_plaster': '#B09572', 'hb_plinth': '#8A6F50', 'hb_trim': '#E8DFC8', 'hb_apron': '#9C8566', 'hb_wood': '#BFA07A'}
kit.finalize(OUT, TINTS, drift_amp=0.07, ao_strength=0.45)
