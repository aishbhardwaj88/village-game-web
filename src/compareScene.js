/**
 * 25 Nov: ?compare=tvuncle review scene. TV Uncle HD and Smart Mesh on the highway beside the Welcome gate, 2 m apart in
 * parallel lanes, both in idle until a button on the bottom bar picks a clip (played on BOTH at once, looping).
 * Walk and Swagger really walk a 4 m path back and forth (about 0.9 m/s, the measured stance-foot speed of both clips).
 * The player starts on foot ~5 m away, slightly to the side; the player body is hidden and the camera may come in to 1 m.
 * HD / SMART MESH labels hide when the camera is within 2 m. Face HD / Face Smart Mesh buttons: eye-level face view (A/D orbit, W/S zoom, Esc leaves). Review only: nothing here runs in normal play.
 */
import * as THREE from 'three';
import { reviewPlay } from './characterAnim.js';

const LANE_X = [606, 610], LANE_Z = { hd: -123.5, sm: -125.5 }, CENTRE = { x: 608, z: -124.5 }; // 4 m path along the highway, lanes 2 m apart
const VIEWER = { x: 604.2, z: -120.6 }; // ~5.4 m from the middle, to the side
const SPEED = 0.9, TURN_RATE = 3.5;
const CLIPS = [['Idle', 'idle'], ['Walk', 'walk'], ['Swagger', 'gesture_swagger'], ['Laugh', 'gesture_laugh'], ['Call', 'gesture_call'], ['Greet', 'gesture_greet'], ['Both', 'both'], ['Face HD', 'face_hd'], ['Face Smart Mesh', 'face_sm']];
// face view: camera at eye level on his face; A/D or arrows orbit, W/S zoom, Escape (or any other button) leaves
const FACE_DIST = [0.5, 2], FACE_START = 0.9, BOTH_DIST = 3.4, BOTH_RANGE = [1, 5], ORBIT_RATE = 0.6, ZOOM_RATE = 0.8;

function label(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff'; g.font = '700 64px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(1.0, 0.25, 1); sp.position.y = 2.1; sp.renderOrder = 999;
  return sp;
}

function bar(onPick) {
  const ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;display:flex;gap:10px;align-items:center;font:600 16px system-ui;background:rgba(0,0,0,.6);color:#fff;padding:10px 14px;border-radius:12px';
  const buttons = [];
  const mark = (id) => buttons.forEach(([b, i]) => { b.style.background = i === id ? '#f5c542' : '#fff'; });
  for (const [text, id] of CLIPS) {
    const b = document.createElement('button'); b.textContent = text;
    b.style.cssText = 'font:600 16px system-ui;padding:8px 14px;border-radius:8px;border:0;cursor:pointer';
    for (const ev of ['pointerdown', 'mousedown', 'click']) b.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'click') { onPick(id); mark(id); } });
    buttons.push([b, id]); ui.appendChild(b);
  }
  document.body.appendChild(ui); mark('idle');
  return mark;
}

export function setupCompare({ scene, camera, camRig, player, assetSlots, groundAt }) {
  // player on foot, body hidden, camera free to come in to 1 m, looking at the pair
  player.position.set(VIEWER.x, groundAt(VIEWER.x, VIEWER.z, 0), VIEWER.z);
  player.visible = false;
  camRig.minDistance = 1; camRig.distance = 1.2;
  camRig.yaw = Math.atan2(-(CENTRE.x - VIEWER.x), -(CENTRE.z - VIEWER.z));

  const actors = [];
  for (const [key, side] of [['hd', 'HD'], ['sm', 'SMART MESH']]) {
    const g = new THREE.Group();
    g.name = `gather_tvuncle_${key}`;
    const lbl = label(side); lbl.visible = false; scene.add(lbl);
    scene.add(g);
    assetSlots.register(`gather_tvuncle_${key}`, { file: `tvuncle_${key}`, dimensions: { w: 2.4, h: 1.72, d: 2.4 }, placements: [{ container: g, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }] });
    assetSlots.resolveOne(`gather_tvuncle_${key}`).catch(() => {});
    actors.push({ g, lbl, key, lane: LANE_Z[key], x: CENTRE.x, dir: 1, yaw: null, head: null });
  }
  let clip = 'idle', face = 'both', orbit = 0, dist = BOTH_DIST; // starts in the eye-level two-shot
  const keys = new Set();
  const origUpdate = camRig.update.bind(camRig);
  camRig.update = () => {}; // the two-shot / face views place the camera themselves
  const U = Math.hypot(VIEWER.x - CENTRE.x, VIEWER.z - CENTRE.z), ux = (VIEWER.x - CENTRE.x) / U, uz = (VIEWER.z - CENTRE.z) / U; // from the pair toward the viewer
  const resetLanes = () => { for (const a of actors) { a.x = CENTRE.x; a.lane = LANE_Z[a.key]; } };
  const leaveFace = () => { if (!face) return; face = null; keys.clear(); camRig.update = origUpdate; resetLanes(); camRig.update(); };
  let mark = () => {};
  mark = bar((id) => {
    if (id === 'face_hd' || id === 'face_sm') {
      clip = 'idle'; reviewPlay('idle'); // both stand still
      face = actors.find((a) => `face_${a.key}` === id); orbit = 0; dist = FACE_START;
      camRig.update = () => {}; // we place the camera ourselves while in face view
      mark(id);
    } else if (id === 'both') {
      clip = 'idle'; reviewPlay('idle'); face = 'both'; orbit = 0; dist = BOTH_DIST; camRig.update = () => {}; mark(id);
    } else { leaveFace(); clip = id; reviewPlay(id); mark(id); }
  });
  mark('both');
  const faceKey = (e) => ['a', 'd', 'w', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  window.addEventListener('keydown', (e) => {
    if (!face) return;
    if (face === 'both') { if (e.key === 'Escape' || faceKey(e)) { leaveFace(); mark(clip); } return; } // Escape or a walking key leaves the two-shot; the game still gets the key
    if (e.key === 'Escape') { leaveFace(); mark(clip); e.stopImmediatePropagation(); return; }
    if (faceKey(e)) { keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (face && face !== 'both' && faceKey(e)) { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); e.stopImmediatePropagation(); } }, true);
  const tmpV = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const turn = (a, want, dt) => {
    const d = Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw));
    a.yaw += Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * dt);
    return Math.abs(d);
  };
  return function update(dt) {
    if (!(dt > 0)) return;
    const walking = clip === 'walk' || clip === 'gesture_swagger';
    if (face && face !== 'both') {
      const k = (n) => keys.has(n);
      orbit += ((k('d') || k('ArrowRight') ? 1 : 0) - (k('a') || k('ArrowLeft') ? 1 : 0)) * ORBIT_RATE * dt;
      dist = Math.min(FACE_DIST[1], Math.max(FACE_DIST[0], dist + ((k('s') || k('ArrowDown') ? 1 : 0) - (k('w') || k('ArrowUp') ? 1 : 0)) * ZOOM_RATE * dt));
    }
    const headOf = (a) => { if (!a.head) a.g.traverse((b) => { if (!a.head && b.isBone && /(^|rig|:)head$/i.test(b.name)) a.head = b; }); return a.head; };
    const two = face === 'both';
    for (const a of actors) {
      if (a.yaw === null) a.yaw = Math.atan2(VIEWER.x - a.x, VIEWER.z - a.lane);
      if (two) { // side by side, 2 m apart, facing the camera
        const side = a.key === 'hd' ? -1 : 1;
        a.x = CENTRE.x + uz * side; a.lane = CENTRE.z - ux * side;
        turn(a, Math.atan2(ux, uz), dt);
      } else if (walking) {
        const want = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        const err = turn(a, want, dt);
        if (err < 0.3) {
          a.x += a.dir * SPEED * dt;
          if (a.x >= LANE_X[1]) { a.x = LANE_X[1]; a.dir = -1; } else if (a.x <= LANE_X[0]) { a.x = LANE_X[0]; a.dir = 1; }
        }
      } else if (a !== face) {
        turn(a, Math.atan2(player.position.x - a.x, player.position.z - a.lane), dt); // face the player
      }
      a.g.position.set(a.x, groundAt(a.x, a.lane, 0), a.lane);
      a.g.rotation.y = a.yaw;
      const h = headOf(a);
      if (!h) { a.lbl.visible = false; continue; }
      a.g.updateMatrixWorld(true);
      h.getWorldPosition(tmpV); tmpV.y += 0.3; // label sits just above the head
      a.lbl.position.copy(tmpV);
      const dl = camera.position.distanceTo(tmpV);
      const dBody = Math.hypot(camera.position.x - a.x, camera.position.z - a.lane);
      a.lbl.visible = !face || (two && dBody > 1.2); // hidden within 3 m of the Uncle in normal view, and in the close-ups
      if (!face && dBody <= 3) a.lbl.visible = false;
      a.lbl.scale.set(dl * 0.12, dl * 0.03, 1); // fixed small size on screen, whatever the distance
    }
    if (two) {
      const [h1, h2] = actors.map(headOf);
      if (h1 && h2) {
        h1.getWorldPosition(tmpV); h2.getWorldPosition(tmp2); tmpV.add(tmp2).multiplyScalar(0.5); tmpV.y += 0.1; // eye level, between the two faces
        const ang = Math.atan2(ux, uz) + orbit;
        camera.position.set(tmpV.x + Math.sin(ang) * dist, tmpV.y, tmpV.z + Math.cos(ang) * dist);
        camera.lookAt(tmpV);
      }
    } else if (face) { // eye level on the head bone, looking straight at the face
      const h = headOf(face);
      if (h) {
        h.getWorldPosition(tmpV); tmpV.y += 0.1; // head bone sits at the neck top; eyes are ~10 cm above
        const ang = face.yaw + orbit;
        camera.position.set(tmpV.x + Math.sin(ang) * dist, tmpV.y, tmpV.z + Math.cos(ang) * dist);
        camera.lookAt(tmpV);
      }
    }
  };
}
