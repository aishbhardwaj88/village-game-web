"""
Village pots (J0, 27 Oct playthrough note): matka, ghada, surahi, kulhad. Four tiny single-mesh models, each instanced/merged by src/pots.js.
Run: tools/blender/make_pots.sh   (writes public/assets/models/pot_<type>_v2.glb; slot ends in _v2: textures stripped, the game re-applies the shared set)
Local frame: origin at the base centre, upright, real sizes. matka 0.69 m, ghada 0.46 m, surahi 0.46 m, kulhad 0.09 m.
Clay: the shared matte plaster set (the terracotta scan reads glossy plastic at pot scale) tinted by vertex colour, steel: the shared 'metal' set. Colour/wear is vertex colour (wet ring at the foot, darker soot/damp, uneven shoulder),
the profile is hand-wobbled (never a perfect lathe), rims are chipped by dropping a few rim vertices.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import ROOT
from arch import Kit, lathe


def wobble(obj, amp, seed, chip=None):
    """Radial wobble by angle+height so the clay is never a perfect surface of revolution; chip=(height_min, drop) nicks a short stretch of the rim."""
    rnd = random.Random(seed)
    p1, p2, p3 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    me = obj.data
    top = max(v.co.z for v in me.vertices)
    for v in me.vertices:
        r = math.hypot(v.co.x, v.co.y)
        if r < 1e-5:
            continue
        a = math.atan2(v.co.y, v.co.x)
        k = 1.0 + amp * (math.sin(2 * a + p1 + v.co.z * 9) * 0.6 + math.sin(3 * a + p2) * 0.4 + math.sin(5 * a + v.co.z * 17 + p3) * 0.25)
        v.co.x *= k
        v.co.y *= k
        if chip and v.co.z > top - chip[0]:
            d = abs(((a - p1 + math.pi) % math.tau) - math.pi)
            if d < 0.35:
                v.co.z -= chip[1] * (1 - d / 0.35)


def build(name, parts, out_name, ao=0.55):
    kit = Kit(split_props=False, own=('metal',))
    seeds = 0
    for kind, prof, colour, seg, amp, chip in parts:
        o = kit.add(kind, lathe(name + str(seeds), 0, 0, prof, seg=seg), colour)
        if amp:
            wobble(o, amp, hash(name) % 997 + seeds, chip)
        seeds += 1
    tints = {'hb_metal': '#B8BEC4'}
    kit.finalize(os.path.join(ROOT, 'tmp', out_name + '_raw.glb'), tints, drift_amp=0.10, ao_strength=ao)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
# matka: round belly, tapering shoulder, short flared neck, rolled rim, open mouth; damp dark ring at the foot
MATKA = [(0.0, 0.0), (0.12, 0.0), (0.17, 0.03), (0.23, 0.13), (0.27, 0.27), (0.26, 0.38), (0.21, 0.49), (0.14, 0.57), (0.115, 0.61), (0.13, 0.65),
         (0.16, 0.675), (0.165, 0.69), (0.145, 0.698), (0.125, 0.685), (0.108, 0.66), (0.105, 0.55), (0.0, 0.5)]
MATKA_WET = [(0.0, 0.0), (0.123, 0.0), (0.176, 0.03), (0.236, 0.13), (0.246, 0.17), (0.0, 0.17)]
# ghada: steel water pot, wider mouth, neck ring, no flare
GHADA = [(0.0, 0.0), (0.13, 0.0), (0.2, 0.05), (0.235, 0.17), (0.225, 0.29), (0.17, 0.39), (0.135, 0.43), (0.145, 0.445), (0.15, 0.46), (0.138, 0.462),
         (0.128, 0.45), (0.12, 0.38), (0.0, 0.36)]
GHADA_RING = [(0.0, 0.405), (0.152, 0.405), (0.152, 0.425), (0.0, 0.425)]
# surahi: long-necked water flask, round belly, narrow neck, small lip
SURAHI = [(0.0, 0.0), (0.09, 0.0), (0.14, 0.04), (0.185, 0.14), (0.18, 0.24), (0.12, 0.31), (0.06, 0.355), (0.04, 0.4), (0.043, 0.43), (0.06, 0.447),
          (0.062, 0.46), (0.048, 0.463), (0.032, 0.44), (0.03, 0.36), (0.0, 0.3)]
# kulhad: unglazed clay cup, wider at the lip, hand-thrown
KULHAD = [(0.0, 0.0), (0.026, 0.0), (0.032, 0.012), (0.04, 0.05), (0.047, 0.09), (0.049, 0.095), (0.043, 0.093), (0.038, 0.08), (0.03, 0.02), (0.0, 0.012)]

if which in ('all', 'matka'):
    build('matka', [('paint', MATKA, 0xC47C50, 26, 0.012, (0.03, 0.022)), ('paint', MATKA_WET, 0x8F5A3E, 26, 0.012, None)], 'pot_matka_v2')
if which in ('all', 'ghada'):
    build('ghada', [('metal', GHADA, 0xB8BEC4, 26, 0.006, (0.02, 0.012)), ('metal', GHADA_RING, 0xA0A6AB, 26, 0.0, None)], 'pot_ghada_v2')
if which in ('all', 'surahi'):
    build('surahi', [('paint', SURAHI, 0xBB7148, 24, 0.012, (0.02, 0.012))], 'pot_surahi_v2')
if which in ('all', 'kulhad'):
    build('kulhad', [('paint', KULHAD, 0xCB8D60, 16, 0.04, (0.012, 0.01))], 'pot_kulhad_v2')
