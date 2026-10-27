"""
Drinking taps (J0, 27 Oct playthrough note): three varieties, each ONE small model drawn merged by src/taps.js.
  tap_wall_v2  : short whitewashed brick wall stub with a brass-tint bib tap on a pipe stub, over a cement trough with a worn lip, lime scale and algae.
  tap_stand_v2 : galvanised standpipe on a small cement plinth, bib tap with a cross handle, a slab at the foot and a damp patch.
  tap_pyaau_v2 : pyaau-style tap stand: a brick pillar with a flat top, a row of two taps on a rail, a shallow cement basin and a steel glass on a chain.
Run: tools/blender/make_taps.sh   (writes public/assets/models/tap_<type>_v2.glb; textures stripped, the game re-applies the shared sets)
Local frame: origin at the base centre on the ground, the water side (trough/basin/spout) = +z. Iron rides the shared 'metal' set, the rest the plaster set.
Wear is vertex colour only (rust at joints, lime scale, algae, damp, worn brass).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl
from arch import Kit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IRON, RUST, SCALE, ALGAE, DAMP, BRASS, GALV = 0x2f3a38, 0x7a4a2c, 0xd9d6c8, 0x4d6a3a, 0x555b57, 0x8a6f3c, 0x8e9693


def bib(kit, x, y, z, cross=False):
    """Bib tap at (x,y,z) with its spout pointing +z: body, nozzle, handle, lime-scale lip."""
    kit.add('metal', cyl('tap_body', x, z, y, y + 0.07, 0.03, 0.03, seg=8), BRASS)
    kit.add('metal', limb('nozzle', (x, z, y + 0.05), (x, z + 0.11, y + 0.02), 0.04, 0.035), BRASS)
    kit.add('metal', limb('nozzle_lip', (x, z + 0.1, y + 0.02), (x, z + 0.125, y + 0.0), 0.044, 0.04), SCALE)
    if cross:
        kit.add('metal', limb('handle_a', (x - 0.05, z, y + 0.085), (x + 0.05, z, y + 0.085), 0.02), IRON)
        kit.add('metal', limb('handle_b', (x, z - 0.05, y + 0.085), (x, z + 0.05, y + 0.085), 0.02), IRON)
    else:
        kit.add('metal', limb('handle', (x - 0.055, z, y + 0.085), (x + 0.055, z, y + 0.085), 0.026), IRON)
    kit.add('metal', cyl('tap_rust', x, z, y - 0.01, y + 0.012, 0.036, 0.036, seg=8), RUST)


def wall():
    kit = Kit(split_props=False, own=('metal',))
    kit.add('plaster', wb('wall', -0.45, 0.45, -0.30, -0.14, 0, 1.15, 0.015), 0xb9b4a6)
    kit.add('plaster', wb('wall_cap', -0.48, 0.48, -0.33, -0.11, 1.15, 1.2, 0.012), 0xa6a298)
    kit.add('plaster', wb('wall_damp', -0.46, 0.46, -0.31, -0.13, 0, 0.18, 0.01), DAMP)
    # cement trough against the wall: thick walls, hollow suggested by a dark water-line slab
    kit.add('plaster', wb('trough', -0.38, 0.38, -0.14, 0.34, 0, 0.30, 0.025), 0x9d9990)
    kit.add('plaster', wb('water', -0.30, 0.30, -0.08, 0.28, 0.29, 0.305, 0.004), 0x4b5a5a)
    kit.add('plaster', wb('trough_algae', -0.39, 0.0, 0.30, 0.345, 0.0, 0.16, 0.005), ALGAE)
    kit.add('plaster', wb('trough_chip', 0.22, 0.38, 0.30, 0.345, 0.24, 0.30, 0.008), 0x7c796f)
    # pipe stub out of the wall, tap on it
    kit.add('metal', limb('stub', (0, -0.14, 0.66), (0, 0.0, 0.66), 0.045), GALV)
    kit.add('metal', limb('pipe_up', (0, -0.145, 0.2), (0, -0.145, 0.66), 0.04), GALV)
    kit.add('metal', cyl('clamp', 0, -0.145, 0.45, 0.48, 0.05, 0.05, seg=8), RUST)
    bib(kit, 0, 0.60, 0.0)
    kit.finalize(os.path.join(ROOT, 'tmp', 'tap_wall_v2_raw.glb'), {}, drift_amp=0.07, ao_strength=0.5)


def stand():
    kit = Kit(split_props=False, own=('metal',))
    kit.add('plaster', wb('plinth', -0.24, 0.24, -0.24, 0.24, 0, 0.22, 0.02), 0xa9a69c)
    kit.add('plaster', wb('plinth_damp', -0.25, 0.25, -0.25, 0.25, 0, 0.06, 0.01), DAMP)
    kit.add('plaster', wb('slab', -0.50, 0.50, 0.20, 0.80, 0.0, 0.035, 0.01), 0x9a978d)
    kit.add('plaster', wb('slab_wet', -0.18, 0.18, 0.28, 0.72, 0.035, 0.042, 0.004), 0x4b5a5a)
    kit.add('plaster', wb('slab_algae', 0.2, 0.5, 0.2, 0.8, 0.035, 0.045, 0.004), ALGAE)
    kit.add('metal', cyl('flange', 0, 0, 0.22, 0.25, 0.075, 0.075, seg=10), IRON)
    kit.add('metal', cyl('pipe', 0, 0, 0.25, 1.0, 0.03, 0.028, seg=10), GALV)
    kit.add('metal', cyl('pipe_rust', 0, 0, 0.25, 0.34, 0.033, 0.032, seg=10), RUST)
    kit.add('metal', cyl('elbow', 0, 0, 0.98, 1.04, 0.036, 0.036, seg=10), GALV)
    kit.add('metal', limb('cap', (0, 0, 1.03), (0, 0, 1.07), 0.05), IRON)
    bib(kit, 0, 0.78, 0.03, cross=True)
    kit.finalize(os.path.join(ROOT, 'tmp', 'tap_stand_v2_raw.glb'), {}, drift_amp=0.07, ao_strength=0.5)


def pyaau():
    kit = Kit(split_props=False, own=('metal',))
    kit.add('plaster', wb('pillar', -0.45, 0.45, -0.22, 0.22, 0, 1.0, 0.02), 0xb2a89a)
    kit.add('plaster', wb('pillar_top', -0.49, 0.49, -0.26, 0.26, 1.0, 1.06, 0.015), 0xa6a298)
    kit.add('plaster', wb('pillar_damp', -0.46, 0.46, -0.23, 0.23, 0, 0.15, 0.01), DAMP)
    kit.add('plaster', wb('pillar_stain', -0.2, 0.1, 0.215, 0.225, 0.4, 0.9, 0.003), 0x8c8576)
    # basin at the foot
    kit.add('plaster', wb('basin', -0.42, 0.42, 0.22, 0.62, 0, 0.16, 0.02), 0x9d9990)
    kit.add('plaster', wb('basin_water', -0.35, 0.35, 0.28, 0.56, 0.15, 0.162, 0.003), 0x4b5a5a)
    kit.add('plaster', wb('basin_algae', -0.43, -0.1, 0.60, 0.625, 0, 0.1, 0.004), ALGAE)
    # rail with two taps and a glass on a chain
    kit.add('metal', limb('rail', (-0.32, 0.22, 0.62), (0.32, 0.22, 0.62), 0.04), GALV)
    bib(kit, -0.20, 0.55, 0.22)
    bib(kit, 0.20, 0.55, 0.22, cross=True)
    kit.add('metal', limb('chain', (0.32, 0.23, 0.60), (0.36, 0.30, 0.42), 0.012), IRON)
    kit.add('metal', cyl('glass', 0.36, 0.30, 0.30, 0.42, 0.04, 0.03, seg=10), GALV)
    kit.finalize(os.path.join(ROOT, 'tmp', 'tap_pyaau_v2_raw.glb'), {}, drift_amp=0.07, ao_strength=0.5)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
if which in ('all', 'wall'):
    wall()
if which in ('all', 'stand'):
    stand()
if which in ('all', 'pyaau'):
    pyaau()
