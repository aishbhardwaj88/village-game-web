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
const CLIPS = [['Idle', 'idle'], ['Walk', 'walk'], ['Swagger', 'gesture_swagger'], ['Laugh', 'gesture_laugh'], ['Call', 'gesture_call'], ['Greet', 'gesture_greet'], ['Face HD', 'face_hd'], ['Face Smart Mesh', 'face_sm']];
// face view: camera at eye level on his face; A/D or arrows orbit, W/S zoom, Escape (or any other button) leaves
const FACE_DIST = [0.5, 2], FACE_START = 0.9, ORBIT_RATE = 0.6, ZOOM_RATE = 0.8;

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
    const lbl = label(side); g.add(lbl);
    scene.add(g);
    assetSlots.register(`gather_tvuncle_${key}`, { file: `tvuncle_${key}`, dimensions: { w: 2.4, h: 1.72, d: 2.4 }, placements: [{ container: g, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }] });
    assetSlots.resolveOne(`gather_tvuncle_${key}`).catch(() => {});
    actors.push({ g, lbl, key, lane: LANE_Z[key], x: CENTRE.x, dir: 1, yaw: null, head: null });
  }
  let clip = 'idle', face = null, orbit = 0, dist = FACE_START;
  const keys = new Set();
  const origUpdate = camRig.update.bind(camRig);
  const leaveFace = () => { if (!face) return; face = null; keys.clear(); camRig.update = origUpdate; camRig.update(); };
  const mark = bar((id) => {
    if (id === 'face_hd' || id === 'face_sm') {
      clip = 'idle'; reviewPlay('idle'); // both stand still
      face = actors.find((a) => `face_${a.key}` === id); orbit = 0; dist = FACE_START;
      camRig.update = () => {}; // we place the camera ourselves while in face view
      mark(id);
    } else { leaveFace(); clip = id; reviewPlay(id); mark(id); }
  });
  const faceKey = (e) => ['a', 'd', 'w', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  window.addEventListener('keydown', (e) => {
    if (!face) return;
    if (e.key === 'Escape') { leaveFace(); mark(clip); e.stopImmediatePropagation(); return; }
    if (faceKey(e)) { keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (face && faceKey(e)) { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); e.stopImmediatePropagation(); } }, true);
  const tmpV = new THREE.Vector3();
  const turn = (a, want, dt) => {
    const d = Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw));
    a.yaw += Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * dt);
    return Math.abs(d);
  };
  return function update(dt) {
    if (!(dt > 0)) return;
    const walking = clip === 'walk' || clip === 'gesture_swagger';
    if (face) {
      const k = (n) => keys.has(n);
      orbit += ((k('d') || k('ArrowRight') ? 1 : 0) - (k('a') || k('ArrowLeft') ? 1 : 0)) * ORBIT_RATE * dt;
      dist = Math.min(FACE_DIST[1], Math.max(FACE_DIST[0], dist + ((k('s') || k('ArrowDown') ? 1 : 0) - (k('w') || k('ArrowUp') ? 1 : 0)) * ZOOM_RATE * dt));
    }
    for (const a of actors) {
      if (a.yaw === null) a.yaw = Math.atan2(VIEWER.x - a.x, VIEWER.z - a.lane);
      if (walking) {
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
      a.lbl.getWorldPosition(tmpV);
      a.lbl.visible = !face && camera.position.distanceTo(tmpV) > 2; // out of the way of the face when the camera is close, and in face view
    }
    if (face) { // eye level on the head bone, looking straight at the face
      if (!face.head) face.g.traverse((b) => { if (!face.head && b.isBone && /(^|rig|:)head$/i.test(b.name)) face.head = b; });
      if (face.head) {
        face.head.getWorldPosition(tmpV); tmpV.y += 0.1; // head bone sits at the neck top; eyes are ~10 cm above
        const ang = face.yaw + orbit;
        camera.position.set(tmpV.x + Math.sin(ang) * dist, tmpV.y, tmpV.z + Math.cos(ang) * dist);
        camera.lookAt(tmpV);
      }
    }
  };
}
