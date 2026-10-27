"""
Roadside milestone (J0, 27 Oct playthrough note): whitewashed stone body, yellow rounded top, weathered, NO lettering.
Run: tools/blender/make.sh milestone milestone_v2   (slot ends in _v2: textures stripped, src/stagingYard.js swapShared re-applies the shared plaster set)
Local frame: origin at the foot centre, front face = +z (glTF +z), 0.55 w x 0.20 d x 0.95 h, on a 0.07 m cement foot.
One mesh, one material (hb_main): src/milestones.js draws every stone as one InstancedMesh (one draw call for all).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import wb, prism_z, ROOT
from arch import Kit

OUT = os.path.join(ROOT, 'tmp', 'milestone_v2_raw.glb')
kit = Kit(split_props=False)
W, D = 0.55, 0.20
BODY_H = 0.62      # square shoulder height; the rounded top springs from here
R = W / 2

# cement foot, slightly proud, grubby
kit.add('plinth', wb('foot', -W / 2 - 0.05, W / 2 + 0.05, -D / 2 - 0.05, D / 2 + 0.05, -0.08, 0.07, 0.012), 0xB9B2A0)
# dust-and-splash band on the lower body (a hair proud of the body, brown-grey)
kit.add('paint', wb('grime', -W / 2 - 0.004, W / 2 + 0.004, -D / 2 - 0.004, D / 2 + 0.004, 0.07, 0.20, 0.004), 0xD6CDB6)
# whitewashed body
kit.add('plaster', wb('body', -W / 2, W / 2, -D / 2, D / 2, 0.07, BODY_H, 0.012), 0xFFFBEC)
# rounded top: a half-disc profile extruded through the depth, painted ochre (faded, uneven at the lip)
prof = [(-R, BODY_H - 0.002), (R, BODY_H - 0.002)] + [(R * math.cos(a), BODY_H + R * 0.95 * math.sin(a)) for a in [math.pi * i / 14 for i in range(1, 14)]]
prof = [(R, BODY_H - 0.002)] + [(R * math.cos(math.pi * i / 14), BODY_H - 0.002 + R * 0.95 * math.sin(math.pi * i / 14)) for i in range(0, 15)][1:] + [(-R, BODY_H - 0.002)]
kit.add('paint', prism_z('top', -D / 2, D / 2, prof), 0xE3B848)
# a lower dark-ochre edge where the paint was last brushed (hand-painted, not a clean line)
kit.add('paint', wb('paint_edge', -W / 2 - 0.003, W / 2 + 0.003, -D / 2 - 0.003, D / 2 + 0.003, BODY_H - 0.045, BODY_H + 0.002, 0.003), 0xC9972E)

TINTS = {'hb_plaster': '#E8E1CD', 'hb_plinth': '#B9B2A0'}
kit.finalize(OUT, TINTS, drift_amp=0.07, ao_strength=0.5)
