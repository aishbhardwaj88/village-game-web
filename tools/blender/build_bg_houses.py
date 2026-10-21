"""
Background house variants for the abadi (instanced in-game, src/instancedHouses.js) — checklist: docs/bg-houses-checklist.md.
Four ordinary, cared-for village houses of different prosperity (art-direction 7.1b, "Panchayat"): never grand, never broken.
Run: tools/blender/make.sh bg_houses bg_houses   (exports 4 files: public/assets/models/bg_house_{a,b,c,d}.glb)
Each is authored at the origin, FRONT = +wz, ground at h=0. Footprints (collision is a box per placement, src/instancedHouses.js):
  A  single-room flat roof   5.5 x 5.0   h 3.4        B  two-storey painted      6.0 x 6.0   h 6.4
  C  tin roof + yard wall    8.0 x 8.0 (house 4.5 x 4.0 at the back)   D  mud-plaster house, red clay tile roof   5.0 x 4.5
"""
import sys, os, math, random, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl, sphere, prism_x, prism_z, boolean_cut, ROOT
from arch import Kit, barred_window, panel_door, pot, STEEL, LEAF, MARI

rnd = random.Random(61)
OUTDIR = os.path.join(ROOT, 'tmp')


class Face:
    """Minimal Bldg-like helper for the front (+z) face only."""
    def __init__(self, z, t=0.22):
        self.plane = {'S': z, 'N': z, 'E': 0, 'W': 0}
        self.t = t

    def fb(self, face, u0, u1, d0, d1, h0, h1, bevel=0.01):
        P = self.plane['S']
        return wb('fb', u0, u1, P + d0, P + d1, h0, h1, bevel)

    def recess(self, face, u0, u1, h0, h1, depth=0.1):
        return self.fb('S', u0, u1, -depth, 0.05, h0, h1, 0)


def variant_a(out):
    kit = Kit(split_props=False)
    w, d, h = 5.5, 5.0, 3.4
    f = Face(d / 2)
    wall = wb('block', -w / 2, w / 2, -d / 2, d / 2, 0, h, 0.012)
    cuts = [f.recess('S', -0.5, 0.5, 0, 2.15, 0.12), f.recess('S', 1.2, 2.2, 1.1, 2.2, 0.12), f.recess('S', -2.2, -1.2, 1.1, 2.2, 0.12)]
    for c in cuts:
        boolean_cut(wall, c, apply_mod=True)
    kit.add('wall', wall)
    panel_door(kit, f, 'S', -0.5, 0.5, 0, 2.15, 0.12)
    barred_window(kit, f, 'S', 1.2, 2.2, 1.1, 2.2, 0.12)
    barred_window(kit, f, 'S', -2.2, -1.2, 1.1, 2.2, 0.12)
    kit.add('ochre', wb('skirt', -w / 2 - 0.02, w / 2 + 0.02, -d / 2 - 0.02, d / 2 + 0.02, 0, 0.7, 0.006))
    kit.add('trim', wb('roof', -w / 2 - 0.3, w / 2 + 0.3, -d / 2 - 0.3, d / 2 + 0.3, h, h + 0.2, 0.012))
    for (x0, x1, z0, z1) in ((-w / 2 - 0.1, w / 2 + 0.1, -d / 2 - 0.1, -d / 2 + 0.1), (-w / 2 - 0.1, w / 2 + 0.1, d / 2 - 0.1, d / 2 + 0.1), (-w / 2 - 0.1, -w / 2 + 0.1, -d / 2, d / 2), (w / 2 - 0.1, w / 2 + 0.1, -d / 2, d / 2)):
        kit.add('wall', wb('par', x0, x1, z0, z1, h + 0.2, h + 0.6, 0.01))
    kit.add('apron', wb('step', -0.9, 0.9, d / 2, d / 2 + 0.5, 0, 0.15, 0.01))
    kit.add('paint', cyl('tank', 1.6, -1.2, h + 0.2, h + 0.95, 0.4, 0.4, 14), 0x1C1C1F)
    pot(kit, 1.9, d / 2 + 0.5, 0.0, 0.2, 0.28)
    pot(kit, -1.9, d / 2 + 0.5, 0.0, 0.2, 0.28, flower=MARI)
    kit.finalize(out, TINTS, drift_amp=0.06, ao_strength=0.4)


def variant_b(out):
    kit = Kit(split_props=False)
    w, d, h = 6.0, 6.0, 6.4
    f = Face(d / 2)
    wall = wb('block', -w / 2, w / 2, -d / 2, d / 2, 0, h, 0.012)
    cuts = [f.recess('S', -0.5, 0.5, 0, 2.2, 0.12), f.recess('S', -2.4, -1.4, 1.1, 2.3, 0.12), f.recess('S', 1.4, 2.4, 1.1, 2.3, 0.12),
            f.recess('S', -0.6, 0.6, 3.2, 5.4, 0.12), f.recess('S', -2.5, -1.5, 3.9, 5.1, 0.12), f.recess('S', 1.5, 2.5, 3.9, 5.1, 0.12)]
    for c in cuts:
        boolean_cut(wall, c, apply_mod=True)
    kit.add('wall', wall)
    panel_door(kit, f, 'S', -0.5, 0.5, 0, 2.2, 0.12)
    barred_window(kit, f, 'S', -2.4, -1.4, 1.1, 2.3, 0.12)
    barred_window(kit, f, 'S', 1.4, 2.4, 1.1, 2.3, 0.12)
    panel_door(kit, f, 'S', -0.6, 0.6, 3.2, 5.4, 0.12)
    for u0, u1 in ((-2.5, -1.5), (1.5, 2.5)):
        barred_window(kit, f, 'S', u0, u1, 3.9, 5.1, 0.12)
    kit.add('ochre', wb('skirt', -w / 2 - 0.02, w / 2 + 0.02, -d / 2 - 0.02, d / 2 + 0.02, 0, 0.8, 0.006))
    kit.add('trim', wb('string', -w / 2 - 0.05, w / 2 + 0.05, -d / 2 - 0.05, d / 2 + 0.05, 3.0, 3.25, 0.01))
    # first-floor balcony with a railing over the door
    kit.add('trim', wb('balc', -1.9, 1.9, d / 2, d / 2 + 1.1, 3.0, 3.2, 0.012))
    for k in range(10):
        x = -1.8 + k * 0.4
        kit.add('wood', wb('bal', x - 0.03, x + 0.03, d / 2 + 1.0, d / 2 + 1.06, 3.2, 4.1, 0.004))
    kit.add('wood', wb('rail', -1.95, 1.95, d / 2 + 0.98, d / 2 + 1.08, 4.05, 4.15, 0.006))
    kit.add('trim', wb('roof', -w / 2 - 0.3, w / 2 + 0.3, -d / 2 - 0.3, d / 2 + 0.3, h, h + 0.2, 0.012))
    for (x0, x1, z0, z1) in ((-w / 2 - 0.1, w / 2 + 0.1, -d / 2 - 0.1, -d / 2 + 0.1), (-w / 2 - 0.1, w / 2 + 0.1, d / 2 - 0.1, d / 2 + 0.1), (-w / 2 - 0.1, -w / 2 + 0.1, -d / 2, d / 2), (w / 2 - 0.1, w / 2 + 0.1, -d / 2, d / 2)):
        kit.add('wall', wb('par', x0, x1, z0, z1, h + 0.2, h + 0.7, 0.01))
    kit.add('paint', cyl('tank', -1.8, 1.6, h + 0.2, h + 1.3, 0.5, 0.5, 16), 0x1C1C1F)
    kit.add('paint', cyl('tank2', 1.8, -1.6, h + 0.2, h + 1.0, 0.45, 0.45, 16), 0x2A3A2A)
    kit.add('apron', wb('step', -0.9, 0.9, d / 2, d / 2 + 0.5, 0, 0.15, 0.01))
    for x in (-2.0, 2.0):
        pot(kit, x, d / 2 + 0.55, 0.0, 0.22, 0.3, flower=MARI if x < 0 else None)
    kit.finalize(out, TINTS_B, drift_amp=0.06, ao_strength=0.4)


def variant_c(out):
    kit = Kit(split_props=False)
    hw, hd, hh = 4.5, 4.0, 3.0           # the house, at the back (+z end is the back? no: front = +z, house sits at -z)
    cz = -2.0                            # house centre z
    f = Face(cz + hd / 2)
    wall = wb('block', -hw / 2, hw / 2, cz - hd / 2, cz + hd / 2, 0, hh, 0.012)
    cuts = [f.recess('S', -0.45, 0.45, 0, 2.1, 0.12), f.recess('S', 1.0, 1.9, 1.1, 2.1, 0.12)]
    for c in cuts:
        boolean_cut(wall, c, apply_mod=True)
    kit.add('wall', wall)
    panel_door(kit, f, 'S', -0.45, 0.45, 0, 2.1, 0.12)
    barred_window(kit, f, 'S', 1.0, 1.9, 1.1, 2.1, 0.12)
    kit.add('ochre', wb('skirt', -hw / 2 - 0.02, hw / 2 + 0.02, cz - hd / 2 - 0.02, cz + hd / 2 + 0.02, 0, 0.6, 0.006))
    # sloped corrugated tin roof (high at the back) with a pale fascia, on a timber verandah
    kit.add('tin', prism_x('roof', -hw / 2 - 0.4, hw / 2 + 0.4, [(cz - hd / 2 - 0.2, hh + 0.55), (cz + hd / 2 + 0.9, hh - 0.05), (cz + hd / 2 + 0.9, hh + 0.02), (cz - hd / 2 - 0.2, hh + 0.62)]))
    for x in (-hw / 2, hw / 2):
        kit.add('wood', limb('post', (x, cz + hd / 2 + 0.8, 0), (x, cz + hd / 2 + 0.8, hh - 0.05), 0.12, 0.12))
    kit.add('apron', wb('veranda', -hw / 2 - 0.2, hw / 2 + 0.2, cz + hd / 2, cz + hd / 2 + 0.95, 0, 0.14, 0.01))
    # yard wall 1.2 m round an 8 x 8 plot with a gate gap in the front, a charpai in the yard, a haystack
    t = 0.2
    for (x0, x1, z0, z1) in ((-4, 4, -4, -4 + t), (-4, -4 + t, -4, 4), (4 - t, 4, -4, 4), (-4, -1.2, 4 - t, 4), (1.2, 4, 4 - t, 4)):
        kit.add('wall', wb('ywall', x0, x1, z0, z1, 0, 1.2, 0.01))
        kit.add('ochre', wb('ywall_band', x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02, 0, 0.35, 0.005))
        kit.add('trim', wb('ywall_cope', x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04, 1.2, 1.27, 0.006))
    kit.add('wood', wb('gate_post', -1.3, -1.15, 3.85, 4.0, 0, 1.6, 0.008))
    kit.add('wood', wb('gate_post', 1.15, 1.3, 3.85, 4.0, 0, 1.6, 0.008))
    kit.add('wood', wb('charpai', 1.2, 2.1, 0.8, 2.7, 0.36, 0.42, 0.01))
    for sx in (1.25, 2.05):
        for sz in (0.85, 2.65):
            kit.add('wood', limb('charpai_leg', (sx, sz, 0), (sx, sz, 0.38), 0.06, 0.06))
    kit.add('paint', sphere('hay', -2.8, 1.8, 0.9, 0.9, 0.9, 0.9, 2), 0xC9A85A)
    kit.add('paint', cyl('hay_top', -2.8, 1.8, 1.5, 1.9, 0.55, 0.05, 10), 0xC9A85A)
    pot(kit, -0.9, cz + hd / 2 + 0.7, 0.0, 0.2, 0.28)
    kit.finalize(out, TINTS_C, drift_amp=0.06, ao_strength=0.4)


def variant_d(out):
    kit = Kit(split_props=False)
    w, d, h = 5.0, 4.5, 2.7
    f = Face(d / 2)
    wall = wb('block', -w / 2, w / 2, -d / 2, d / 2, 0, h, 0.02)
    cuts = [f.recess('S', -0.45, 0.45, 0, 1.95, 0.12), f.recess('S', 1.2, 2.0, 1.0, 1.9, 0.12)]
    for c in cuts:
        boolean_cut(wall, c, apply_mod=True)
    kit.add('wall', wall)
    # plain wooden plank door + a shuttered window (mud-plaster house)
    kit.add('wood', f.fb('S', -0.45, 0.45, -0.1, -0.04, 0, 1.95, 0.006))
    for k in range(5):
        kit.add('wood', f.fb('S', -0.45 + k * 0.18, -0.45 + k * 0.18 + 0.01, -0.1, -0.03, 0, 1.95, 0))
    kit.add('wood', f.fb('S', 1.2, 2.0, -0.1, -0.02, 1.0, 1.9, 0.006))
    kit.add('wood', f.fb('S', 1.18, 2.02, -0.1, 0.06, 0.95, 1.02, 0.004))
    kit.add('ochre', wb('skirt', -w / 2 - 0.02, w / 2 + 0.02, -d / 2 - 0.02, d / 2 + 0.02, 0, 0.55, 0.01))
    # hip-ish red clay tile roof: a gable roof as a prism with a ridge, overhanging the front into a veranda held by two wooden posts
    kit.add('terracotta', prism_x('roof', -w / 2 - 0.35, w / 2 + 0.35, [(-d / 2 - 0.25, h - 0.05), (0.0, h + 1.15), (d / 2 + 1.1, h - 0.2), (d / 2 + 1.1, h - 0.1), (0.0, h + 1.28), (-d / 2 - 0.25, h + 0.05)]))
    kit.add('wood', wb('ridge_beam', -w / 2 - 0.35, w / 2 + 0.35, -0.08, 0.08, h + 1.2, h + 1.3, 0.008))
    for x in (-w / 2 + 0.2, w / 2 - 0.2):
        kit.add('wood', limb('post', (x, d / 2 + 0.95, 0), (x, d / 2 + 0.95, h - 0.15), 0.13, 0.13))
    kit.add('apron', wb('veranda', -w / 2, w / 2, d / 2, d / 2 + 1.05, 0, 0.18, 0.012))
    kit.add('wood', wb('bench', -1.7, -0.3, d / 2 + 0.55, d / 2 + 0.9, 0.0, 0.4, 0.008))
    pot(kit, 1.9, d / 2 + 0.7, 0.0, 0.2, 0.28)
    kit.add('paint', cyl('matka', 2.2, d / 2 + 0.4, 0.0, 0.5, 0.2, 0.17, 12), 0xB5693F)
    kit.finalize(out, TINTS_D, drift_amp=0.08, ao_strength=0.4)


TINTS = {'hb_wall': '#F2E6C6', 'hb_ochre': '#E0A83F', 'hb_trim': '#D8D2C2', 'hb_apron': '#A59A88', 'hb_wood': '#B89A74'}
TINTS_B = {'hb_wall': '#CBE8E4', 'hb_ochre': '#6FAFA8', 'hb_trim': '#D8E4E0', 'hb_apron': '#A59A88', 'hb_wood': '#B89A74'}
TINTS_C = {'hb_wall': '#E8C9B0', 'hb_ochre': '#C98A5A', 'hb_trim': '#D8D2C2', 'hb_apron': '#A59A88', 'hb_wood': '#B89A74', 'hb_tin': '#C8D0D4'}
TINTS_D = {'hb_wall': '#D9B48A', 'hb_ochre': '#B5683F', 'hb_trim': '#D8D2C2', 'hb_apron': '#9C8264', 'hb_wood': '#B89A74', 'hb_terracotta': '#D98A68'}

for name, fn in (('a', variant_a), ('b', variant_b), ('c', variant_c), ('d', variant_d)):
    fn(os.path.join(OUTDIR, f'bg_house_{name}_raw.glb'))
