/**
 * 18 Nov: ?gather=1 puts the realistic Tripo cast together round the chauraha island (zero milestone), walking and standing in small groups facing each other. Review scene only:
 * the models carry idle + walk clips (src/characterAnim.js), so "interacting" here is blocking:
 * who stands with whom, who walks up to whom. Faces don't animate (Tripo has no face rig).
 */
import * as THREE from 'three';

const CAST = { maa: 1.65, dadi: 1.57, pitaji: 1.85, sarpanch: 1.73, dada: 1.73, postman: 1.88, sister: 1.47, brother: 1.12, teacher: 1.68, didi: 1.70 };
const FILE = { didi: 'parlour_didi' }; // 21 Nov: cast key -> model file when they differ

export function setupGather({ scene, assetSlots, groundAt, getCenter }) {
  let cx = 0, cz = 0, ready = false;
  const actors = {};
  for (const [key, h] of Object.entries(CAST)) {
    const g = new THREE.Group();
    g.name = `gather_${key}`;
    scene.add(g);
    assetSlots.register(`gather_${key}`, { file: FILE[key] || key, dimensions: { w: 2.4, h, d: 2.4 } /* wide box: height alone sets the scale (Sarpanch's depth is 1.45 m and shrank him to 1.42 m, 18 Nov) */, placements: [{ container: g, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }] });
    assetSlots.resolveOne(`gather_${key}`).catch(() => {});
    actors[key] = g;
  }
  const put = (g, x, z) => g.position.set(cx + x, groundAt(cx + x, cz + z, 0), cz + z);
  const face = (g, x, z) => { g.rotation.y = Math.atan2(cx + x - g.position.x, cz + z - g.position.z); };
  const turnTo = (g, want, dt) => { g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * 6); };
  // 21 Nov: Pitaji turns like a heavy, deliberate man: he ignores small angles, then turns at a steady 75 deg/s with
  // his feet stepping (characterAnim steps the walk clip while a standing character turns), instead of swivelling
  // smoothly after every move (that continuous swivel read as feminine).
  const heavyTurn = (g, want, dt) => {
    const d = Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y));
    if (!g.userData.turning && Math.abs(d) < 0.35) return;
    g.userData.turning = Math.abs(d) > 0.05;
    g.rotation.y += Math.sign(d) * Math.min(Math.abs(d), dt * 1.3);
  };

  function init() {
  const c = getCenter(); cx = c.x + 3.1; cz = c.z + 9.1; // open ground just south of the chauraha island (checked live: clear of the sweet shop and kiosks)
  // Women chatting: Maa and Dadi, face to face
  put(actors.maa, -2.2, 1.2); put(actors.dadi, -1.1, 1.8);
  face(actors.maa, -1.1, 1.8); face(actors.dadi, -2.2, 1.2);
  // Men's huddle: Pitaji, Sarpanch, Dada in a loose triangle
  put(actors.pitaji, 2.2, -1.2); put(actors.sarpanch, 3.4, -0.6); put(actors.dada, 2.3, 0.1);
  face(actors.pitaji, 3.0, -0.4); face(actors.sarpanch, 2.2, -0.6); face(actors.dada, 3.0, -0.9);
  // 21 Nov: Teacher and Didi chatting off to the left
  put(actors.teacher, -4.2, -1.4); put(actors.didi, -3.3, -1.9);
  face(actors.teacher, -3.3, -1.9); face(actors.didi, -4.2, -1.4);
  }

  // Postman: walks in from the road, stops at Pitaji with the letter, walks back out
  const postPath = [[9, 5], [2.6, -2.3]];
  let postT = 0;
  // Sister and Brother: walk a loop round the square side by side
  let loopA = 0;

  // 20 Nov: ?gather=1&lineup=1&proof=1 - everyone stands still in one line facing the camera, with
  // Previous / Next / Whole line buttons that zoom on each face (her face review).
  const LINEUP = new URLSearchParams(window.location.search).has('lineup');
  const ORDER = ['sister', 'brother', 'maa', 'dadi', 'dada', 'pitaji', 'sarpanch', 'postman', 'teacher', 'didi'];
  const X0 = -5.2; // left end of the line (10 people, 1.15 m apart, centred)
  const yaw = {};
  let sel = Math.max(-1, ORDER.indexOf(new URLSearchParams(window.location.search).get('face') || '')), ui = null, label = null;
  const tmpV = new THREE.Vector3();
  // 21 Nov: each person first WALKS (side view, in front of the line, out and back), then stops facing the camera
  // and the camera glides in to the face. "Walk again" replays it. Speeds are close to each walk's natural pace.
  const LINE_SPEED = { maa: 0.7, pitaji: 1.05, dada: 0.5, dadi: 0.38, sarpanch: 0.62, postman: 1.5, brother: 0.8, sister: 1.0, teacher: 0.85, didi: 0.9 };
  const WALK_T = 8, GLIDE_T = 1.6, FRONT_Z = 1.6;
  let phaseT = 0, lastSel = -2;
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), facePos = new THREE.Vector3(), faceTgt = new THREE.Vector3();
  function lineupUI() {
    ui = document.createElement('div');
    ui.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;display:flex;gap:10px;align-items:center;font:600 16px system-ui;background:rgba(0,0,0,.6);color:#fff;padding:10px 14px;border-radius:12px';
    label = document.createElement('span'); label.style.cssText = 'min-width:170px;text-align:center';
    const name = () => { label.textContent = sel < 0 ? 'Whole line' : `${sel + 1} / ${ORDER.length}: ${ORDER[sel][0].toUpperCase()}${ORDER[sel].slice(1)}`; };
    const btn = (t, fn) => {
      const b = document.createElement('button'); b.textContent = t;
      b.style.cssText = 'font:600 16px system-ui;padding:8px 14px;border-radius:8px;border:0;cursor:pointer';
      for (const ev of ['pointerdown', 'mousedown', 'click']) b.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'click') { fn(); name(); } });
      return b;
    };
    ui.append(btn('Previous', () => { sel = sel <= 0 ? ORDER.length - 1 : sel - 1; }), label,
      btn('Next', () => { sel = (sel + 1) % ORDER.length; }), btn('Walk again', () => { if (sel < 0) sel = 0; phaseT = 0; }),
      btn('Whole line', () => { sel = -1; }));
    document.body.appendChild(ui); name();
  }
  function lineupUpdate(dt) {
    if (!ui) lineupUI();
    if (sel !== lastSel) { lastSel = sel; phaseT = 0; }
    phaseT += dt;
    ORDER.forEach((k, i) => {
      const g = actors[k];
      if (yaw[k] === undefined) {
        const m = g.getObjectByName(`gather_${k}_model`);
        if (m) { g.rotation.y = 0; g.updateMatrixWorld(true); tmpV.set(0, 0, 1).transformDirection(m.matrixWorld); yaw[k] = -Math.atan2(tmpV.x, tmpV.z); }
      }
      if (i !== sel) { put(g, X0 + i * 1.15, 0); g.rotation.y = yaw[k] || 0; }
    });
    const cam = window.__dopahar && window.__dopahar.photoCamera;
    if (sel < 0) { if (cam) cam({ pos: [cx, 1.3, cz + 8.8], target: [cx, 0.95, cz], fov: 50 }); return; }
    const k = ORDER[sel], g = actors[k], base = yaw[k] || 0;
    const xs = X0 + sel * 1.15, amp = (LINE_SPEED[k] || 0.9) * WALK_T / 2;
    let xo = 0, walkingDir = 0;
    if (phaseT < WALK_T) { // out to the right, then back: a side view of the walk both ways
      const u = phaseT / WALK_T;
      xo = u < 0.5 ? amp * u * 2 : amp * (2 - u * 2) ;
      walkingDir = u < 0.5 ? 1 : -1;
      xo -= amp / 2; // centred on the person's own place
    }
    put(g, xs + xo, FRONT_Z);
    const want = walkingDir > 0 ? base + Math.PI / 2 : walkingDir < 0 ? base - Math.PI / 2 : base;
    turnTo(g, want, dt);
    if (!cam) return;
    let head = null;
    g.traverse((b) => { if (!head && b.isBone && /(^|rig|:)head$/i.test(b.name)) head = b; });
    const gx = cx + xs + xo, hy = head ? head.getWorldPosition(tmpV).y + 0.09 : 1.5;
    const h = CAST[k] || 1.6;
    camPos.set(gx, h * 0.6, cz + FRONT_Z + h * 2.4); camTgt.set(gx, h * 0.5, cz + FRONT_Z); // whole body, head to feet
    facePos.set(gx, hy, cz + FRONT_Z + 0.85); faceTgt.set(gx, hy, cz + FRONT_Z);
    let f = phaseT < WALK_T + 0.6 ? 0 : Math.min(1, (phaseT - WALK_T - 0.6) / GLIDE_T);
    f = f * f * (3 - 2 * f);
    camPos.lerp(facePos, f); camTgt.lerp(faceTgt, f);
    cam({ pos: camPos.toArray(), target: camTgt.toArray(), fov: 45 - 15 * f });
  }

  return function update(dt) {
    if (!(dt > 0)) return;
    if (!ready) { init(); ready = true; }
    if (LINEUP) { lineupUpdate(dt); return; }
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
    heavyTurn(pit, atPit ? Math.atan2(cx + x - pit.position.x, cz + z - pit.position.z) : Math.atan2(cx + 3.0 - pit.position.x, cz - 0.4 - pit.position.z), dt);
    // siblings walk side by side across the front of the square and back (about 1.1 m/s), Brother a step beside her
    loopA += dt * 1.1;
    const span = 9, ph = loopA % (2 * span), fwd = ph < span, sx = -4 + (fwd ? ph : 2 * span - ph);
    for (const [g, off] of [[actors.sister, 0], [actors.brother, 0.75]]) {
      put(g, sx, 4.2 + off);
      turnTo(g, fwd ? Math.PI / 2 : -Math.PI / 2, dt);
    }
  };
}
