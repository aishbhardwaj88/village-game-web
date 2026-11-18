/**
 * 18 Nov: ?gather=1 puts the realistic Tripo cast together round the chauraha island (zero milestone), walking and standing in small groups facing each other. Review scene only:
 * the models carry idle + walk clips (src/characterAnim.js), so "interacting" here is blocking:
 * who stands with whom, who walks up to whom. Faces don't animate (Tripo has no face rig).
 */
import * as THREE from 'three';

const CAST = { maa: 1.65, dadi: 1.57, pitaji: 1.85, sarpanch: 1.73, dada: 1.73, postman: 1.88, sister: 1.47, brother: 1.12 };

export function setupGather({ scene, assetSlots, groundAt, getCenter }) {
  let cx = 0, cz = 0, ready = false;
  const actors = {};
  for (const [key, h] of Object.entries(CAST)) {
    const g = new THREE.Group();
    g.name = `gather_${key}`;
    scene.add(g);
    assetSlots.register(`gather_${key}`, { file: key, dimensions: { w: 2.4, h, d: 2.4 } /* wide box: height alone sets the scale (Sarpanch's depth is 1.45 m and shrank him to 1.42 m, 18 Nov) */, placements: [{ container: g, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }] });
    assetSlots.resolveOne(`gather_${key}`).catch(() => {});
    actors[key] = g;
  }
  const put = (g, x, z) => g.position.set(cx + x, groundAt(cx + x, cz + z, 0), cz + z);
  const face = (g, x, z) => { g.rotation.y = Math.atan2(cx + x - g.position.x, cz + z - g.position.z); };
  const turnTo = (g, want, dt) => { g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * 6); };

  function init() {
  const c = getCenter(); cx = c.x + 3.1; cz = c.z + 9.1; // open ground just south of the chauraha island (checked live: clear of the sweet shop and kiosks)
  // Women chatting: Maa and Dadi, face to face
  put(actors.maa, -2.2, 1.2); put(actors.dadi, -1.1, 1.8);
  face(actors.maa, -1.1, 1.8); face(actors.dadi, -2.2, 1.2);
  // Men's huddle: Pitaji, Sarpanch, Dada in a loose triangle
  put(actors.pitaji, 2.2, -1.2); put(actors.sarpanch, 3.4, -0.6); put(actors.dada, 2.3, 0.1);
  face(actors.pitaji, 3.0, -0.4); face(actors.sarpanch, 2.2, -0.6); face(actors.dada, 3.0, -0.9);
  }

  // Postman: walks in from the road, stops at Pitaji with the letter, walks back out
  const postPath = [[9, 5], [2.6, -2.3]];
  let postT = 0;
  // Sister and Brother: walk a loop round the square side by side
  let loopA = 0;

  return function update(dt) {
    if (!(dt > 0)) return;
    if (!ready) { init(); ready = true; }
    // postman cycle: 7 s in, 6 s at Pitaji, 7 s out, 3 s off-stage pause
    postT = (postT + dt) % 23;
    const p = actors.postman;
    const [a, b] = postPath;
    let x, z, walking = true, dir = 1;
    if (postT < 7) { const k = postT / 7; x = a[0] + (b[0] - a[0]) * k; z = a[1] + (b[1] - a[1]) * k; }
    else if (postT < 13) { x = b[0]; z = b[1]; walking = false; }
    else if (postT < 20) { const k = (postT - 13) / 7; x = b[0] + (a[0] - b[0]) * k; z = b[1] + (a[1] - b[1]) * k; dir = -1; }
    else { x = a[0]; z = a[1]; walking = false; dir = -1; }
    put(p, x, z);
    if (walking) turnTo(p, Math.atan2((b[0] - a[0]) * dir, (b[1] - a[1]) * dir), dt);
    else if (postT < 20) turnTo(p, Math.atan2(cx + 2.2 - p.position.x, cz - 1.2 - p.position.z), dt);
    // Pitaji turns to the postman while he's there, back to the huddle when he leaves
    const pit = actors.pitaji;
    const atPit = postT > 6 && postT < 13.5;
    turnTo(pit, atPit ? Math.atan2(cx + x - pit.position.x, cz + z - pit.position.z) : Math.atan2(cx + 3.0 - pit.position.x, cz - 0.4 - pit.position.z), dt);
    // siblings walk side by side across the front of the square and back (about 1.1 m/s), Brother a step beside her
    loopA += dt * 1.1;
    const span = 9, ph = loopA % (2 * span), fwd = ph < span, sx = -4 + (fwd ? ph : 2 * span - ph);
    for (const [g, off] of [[actors.sister, 0], [actors.brother, 0.75]]) {
      put(g, sx, 4.2 + off);
      turnTo(g, fwd ? Math.PI / 2 : -Math.PI / 2, dt);
    }
  };
}
