"""
Hand pumps (J0, 27 Oct playthrough note): three varieties, each ONE small model drawn merged/instanced by src/handPumps.js.
  pump_mark2_v2   : India Mark II on a cement plinth with a soak-drain channel: flanged standpipe, head casting, long lever with a counterweight knob,
                    spout with lime scale, rust at the joints, worn paint on the handle, damp patch and algae at the foot.
  pump_old_v2     : older short cast-iron pump on a brick-and-cement block: squat barrel, short handle, pitted dark iron, rust bleed.
  pump_cracked_v2 : Mark II on a cracked, tilted plinth with a puddle round the base.
Run: tools/blender/make_hand_pumps.sh   (writes public/assets/models/pump_<type>_v2.glb; _v2 slot: textures stripped, the game re-applies the shared sets)
Local frame: origin at the plinth centre on the ground, spout and drain side = +z (glTF +z), lever swings to -z. Mark II ~1.45 m, old 0.95 m.
Iron rides the shared 'metal' set, the plinth the shared plaster set. Wear is vertex colour (rust rings at joints, lime scale, algae, damp, worn handle).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, limb, cyl
from arch import Kit, lathe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IRON, RUST, SCALE, ALGAE, DAMP, WORN = 0x2f3a38, 0x7a4a2c, 0xd9d6c8, 0x4d6a3a, 0x555b57, 0x6b5a3a


def head(kit, y0, long_handle=True, z=0.0):
    """Head casting, lever on its pivot, counterweight knob, spout. y0 = top of the standpipe."""
    kit.add('metal', cyl('head', 0, z, y0, y0 + 0.17, 0.085, 0.07, seg=10), IRON)
    kit.add('metal', cyl('head_cap', 0, z, y0 + 0.17, y0 + 0.21, 0.06, 0.045, seg=10), IRON)
    kit.add('metal', cyl('joint_rust', 0, z, y0 - 0.01, y0 + 0.025, 0.098, 0.098, seg=10), RUST)
    # pivot boss + lever (down-swung at the grip end, slightly bent)
    L = 0.85 if long_handle else 0.5
    kit.add('metal', limb('pivot', (-0.07, z, y0 + 0.13), (0.07, z, y0 + 0.13), 0.05), IRON)
    kit.add('metal', limb('lever', (0, z - 0.06, y0 + 0.14), (0, z - L * 0.55, y0 + 0.30), 0.04, 0.03), IRON)
    kit.add('metal', limb('lever_far', (0, z - L * 0.55, y0 + 0.30), (0, z - L, y0 + 0.40 if long_handle else y0 + 0.34), 0.036, 0.028), IRON)
    kit.add('metal', limb('grip', (0, z - L * 0.7, y0 + 0.34), (0, z - L, y0 + 0.43), 0.052, 0.036), WORN)   # worn bare-metal grip
    kit.add('metal', limb('weight', (0, z + 0.05, y0 + 0.13), (0, z + 0.17, y0 + 0.20), 0.06), IRON)
    # spout: tapered pipe out to +z with a lime-scale mouth, a drip streak below
    kit.add('metal', limb('spout', (0, z + 0.06, y0 + 0.05), (0, z + 0.30, y0 - 0.04), 0.075, 0.065), IRON)
    kit.add('metal', limb('spout_lip', (0, z + 0.27, y0 - 0.035), (0, z + 0.32, y0 - 0.055), 0.088, 0.078), SCALE)
    kit.add('metal', limb('drip', (0, z + 0.30, y0 - 0.10), (0, z + 0.31, y0 - 0.34), 0.026, 0.02), SCALE)


def mark2(cracked=False):
    kit = Kit(split_props=False, own=('metal',))
    if not cracked:
        kit.add('plaster', wb('plinth', -0.46, 0.46, -0.46, 0.46, 0, 0.24, 0.02), 0xa9a69c)
        kit.add('plaster', wb('plinth_top', -0.42, 0.42, -0.42, 0.42, 0.24, 0.255, 0.01), 0xb4b1a6)
        kit.add('plaster', wb('damp', -0.47, 0.47, -0.47, 0.47, 0.0, 0.07, 0.01), DAMP)
        kit.add('plaster', wb('algae', -0.472, 0.1, 0.44, 0.475, 0.0, 0.09, 0.005), ALGAE)
        # soak-drain: a shallow gutter from the plinth top to a stub on the front edge, with a lip
        kit.add('plaster', wb('drain', -0.07, 0.07, 0.0, 0.47, 0.255, 0.268, 0.004), 0x8e8c84)
        kit.add('plaster', wb('drain_l', -0.09, -0.07, 0.0, 0.47, 0.255, 0.30, 0.004), 0xb4b1a6)
        kit.add('plaster', wb('drain_r', 0.07, 0.09, 0.0, 0.47, 0.255, 0.30, 0.004), 0xb4b1a6)
        base_y = 0.255
    else:
        # plinth split in two slabs, one sunk and tilted, a gap with dirt, puddle in front
        kit.add('plaster', wb('slab_a', -0.46, 0.04, -0.46, 0.46, 0, 0.22, 0.02), 0x9d9a90)
        kit.add('plaster', wb('slab_b', 0.06, 0.46, -0.44, 0.46, -0.03, 0.17, 0.02), 0x93908a)
        kit.add('plaster', wb('gap', 0.035, 0.065, -0.45, 0.45, 0.0, 0.05, 0.005), 0x3d332a)
        kit.add('plaster', wb('slab_top', -0.42, 0.0, -0.42, 0.42, 0.22, 0.233, 0.01), 0xa9a69c)
        kit.add('plaster', wb('damp', -0.47, 0.47, -0.47, 0.47, 0.0, 0.06, 0.01), DAMP)
        kit.add('plaster', wb('algae', -0.47, 0.47, 0.30, 0.47, 0.0, 0.08, 0.005), ALGAE)
        kit.add('plaster', wb('chip', 0.28, 0.46, 0.35, 0.46, 0.16, 0.19, 0.01), 0x7c796f)
        kit.add('plaster', lathe('puddle', 0.05, 0.85, [(0.0, 0.0), (0.45, 0.0), (0.58, 0.006), (0.0, 0.006)], seg=18), 0x4f5b60)
        base_y = 0.233
    # base flange + bolts, standpipe in two sections with a flanged joint, rust at the flange
    kit.add('metal', cyl('flange', 0, 0, base_y, base_y + 0.04, 0.17, 0.17, seg=10), IRON)
    for i in range(6):
        a = i * math.tau / 6
        kit.add('metal', cyl('bolt%d' % i, 0.14 * math.cos(a), 0.14 * math.sin(a), base_y + 0.04, base_y + 0.07, 0.014, 0.014, seg=6), RUST)
    kit.add('metal', cyl('pipe_lo', 0, 0, base_y + 0.04, base_y + 0.55, 0.062, 0.058, seg=10), IRON)
    kit.add('metal', cyl('rust_lo', 0, 0, base_y + 0.04, base_y + 0.16, 0.066, 0.064, seg=10), RUST)
    kit.add('metal', cyl('joint', 0, 0, base_y + 0.55, base_y + 0.60, 0.092, 0.092, seg=10), IRON)
    kit.add('metal', cyl('joint_rust', 0, 0, base_y + 0.575, base_y + 0.61, 0.095, 0.095, seg=10), RUST)
    kit.add('metal', cyl('pipe_hi', 0, 0, base_y + 0.60, base_y + 0.94, 0.058, 0.056, seg=10), IRON)
    head(kit, base_y + 0.94, True)
    name = 'pump_cracked_v2' if cracked else 'pump_mark2_v2'
    kit.finalize(os.path.join(ROOT, 'tmp', name + '_raw.glb'), {}, drift_amp=0.07, ao_strength=0.5)


def old():
    kit = Kit(split_props=False, own=('metal',))
    # brick-and-cement block, round-topped, rough
    kit.add('plaster', wb('block', -0.30, 0.30, -0.30, 0.30, 0, 0.30, 0.025), 0x9d9990)
    kit.add('plaster', wb('block_top', -0.27, 0.27, -0.27, 0.27, 0.30, 0.315, 0.012), 0xa6a298)
    kit.add('plaster', wb('damp', -0.31, 0.31, -0.31, 0.31, 0, 0.09, 0.01), DAMP)
    kit.add('plaster', wb('algae', -0.31, -0.05, 0.28, 0.315, 0, 0.12, 0.005), ALGAE)
    kit.add('plaster', wb('chip', -0.31, -0.18, -0.31, -0.2, 0.22, 0.31, 0.01), 0x7b786e)
    y = 0.315
    # squat barrel: fat cast body that narrows to the head, base ring, pitted iron, rust bleed
    kit.add('metal', lathe('barrel', 0, 0, [(0.0, y), (0.15, y), (0.145, y + 0.04), (0.115, y + 0.22), (0.085, y + 0.40), (0.075, y + 0.50), (0.0, y + 0.50)], seg=14), IRON)
    kit.add('metal', cyl('rust_base', 0, 0, y, y + 0.09, 0.152, 0.148, seg=14), RUST)
    kit.add('metal', cyl('band', 0, 0, y + 0.26, y + 0.30, 0.108, 0.105, seg=14), RUST)
    head(kit, y + 0.50, False)
    kit.finalize(os.path.join(ROOT, 'tmp', 'pump_old_v2_raw.glb'), {}, drift_amp=0.08, ao_strength=0.55)


which = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'all'
if which in ('all', 'mark2'):
    mark2()
if which in ('all', 'old'):
    old()
if which in ('all', 'cracked'):
    mark2(cracked=True)
