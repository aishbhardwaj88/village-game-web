/**
 * Door marks for the kit houses (docs/VILLAGE_VOCABULARY.md section 1, "painted door: swastik, mango-leaf toran"; also the
 * nimbu-mirchi charm hung against the evil eye). Pure add-on geometry in the house's own frame, built by the same helpers
 * as src/houseExtras.js and merged by it into the cluster's existing props material: zero new draw calls, zero new textures.
 * Not every house gets them (hashed per house), and each of the three is chosen independently, so neighbours differ.
 * No text here: house numbers and "shubh labh" need the painted-sign atlas and are not built (listed in docs/NEEDS_YOU.md).
 */
import * as THREE from 'three';

const RED = 0xb0301f, LEAF = [0x4c7a3a, 0x5e8c3d, 0x3e6b34, 0x6b9444], MARIGOLD = 0xe0a02a, LEMON = 0xd9c93a, CHILLI = 0x3f7a2e;

/** a = the type's facade anchors (fz, door [x0,x1], dHi), put(list, geo, hex, matrix) and the primitives from houseExtras. */
export function buildDoorMarks(a, out, put, mat, boxG, cylG, rnd) {
  if (!a || !a.door) return;
  const [x0, x1] = a.door, cx = (x0 + x1) / 2, w = x1 - x0, top = a.dHi || 2.1, fz = a.fz;
  // swastik: painted red over the lintel, two bars and four hooks, about 22 cm across
  if (rnd(41) < 0.45) {
    const y = top + 0.28, z = fz + 0.013, s = 0.22, t = 0.03;
    put(out.props, boxG(s, t, 0.008), RED, mat(cx, y, z));
    put(out.props, boxG(t, s, 0.008), RED, mat(cx, y, z));
    for (const [sx, sy] of [[1, 1], [-1, -1], [-1, 1], [1, -1]]) {
      // hooks: the arm end turns 90 degrees, alternating so the cross reads as a swastik rather than a plus
      const horiz = sx * sy > 0;
      if (horiz) put(out.props, boxG(t, s / 2, 0.008), RED, mat(cx + sx * s / 2, y + sy * s / 4, z));
      else put(out.props, boxG(s / 2, t, 0.008), RED, mat(cx + sx * s / 4, y + sy * s / 2, z));
    }
  }
  // mango-leaf toran: a thread across the door top with leaves and a few marigolds hanging, sagging in the middle
  if (rnd(42) < 0.4) {
    const n = Math.max(5, Math.round(w / 0.16)), y0 = top - 0.04, z = fz + 0.07;
    put(out.props, boxG(w + 0.1, 0.012, 0.012), 0x8a6a48, mat(cx, y0, z));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, x = x0 - 0.02 + u * (w + 0.04), drop = 0.17 + 0.07 * Math.sin(u * Math.PI);
      const hex = (k % 4 === 2 && rnd(43 + k) < 0.8) ? MARIGOLD : LEAF[Math.floor(rnd(50 + k) * LEAF.length)];
      put(out.props, boxG(0.07, drop, 0.01), hex, mat(x, y0 - drop / 2, z, 0, 0, (rnd(60 + k) - 0.5) * 0.25));
    }
  }
  // nimbu-mirchi: a lemon and five green chillies on a thread beside the door, at the lintel
  if (rnd(44) < 0.3) {
    const x = x1 + 0.12, z = fz + 0.05;
    put(out.props, cylG(0.004, 0.004, 0.3, 4), 0x8a6a48, mat(x, top - 0.12, z));
    put(out.props, new THREE.SphereGeometry(0.035, 7, 5), LEMON, mat(x, top - 0.26, z));
    for (let k = 0; k < 5; k++) put(out.props, boxG(0.012, 0.07, 0.012), CHILLI, mat(x + (k - 2) * 0.014, top - 0.33 - (k % 2) * 0.02, z, 0, 0, (k - 2) * 0.12));
  }
}
