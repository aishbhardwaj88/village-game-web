/**
 * 25 Nov: ?compare=tvuncle review scene. TV Uncle on the highway beside the Welcome gate, 2 m apart in
 * parallel lanes, both in idle until a button on the bottom bar picks a clip (played on BOTH at once, looping).
 * Walk and Swagger really walk a 4 m path back and forth (speed per clip = its measured stance-foot speed, 0.90-0.93 m/s, so the feet do not slide; ~0.4 s eased turns at the ends).
 * The player starts on foot ~5 m away, slightly to the side; the player body is hidden and the camera may come in to 1 m.
 * 25 Nov: Parlour Didi (public/assets/models/parlour_didi.glb, loaded only here) stands 2 m left of HD in the two-shot, idle only, with a Face Didi button.
 * 25 Nov: Gossip Aunty (tvaunty.glb, loaded only here) stands 2 m left of Didi: idle / walk (in place) / call / laugh / greet / Look, Face Aunty button; the All two-shot frames all four.
 * 26 Nov: Milkman (milkman.glb, loaded only here) stands 2 m right of TV Uncle: idle / walk (in place) / run / laugh / wave / jump, Face Milkman button.
 * 26 Nov: Cyber boy (cyberboy.glb, loaded only here, round wire glasses on his Head bone) stands 2 m right of Milkman: same clips, Face Cyber boy button. Wave = standing wave (the raw Tripo clip is a squat).
 * 26 Nov: Kirana (shopkeeper, kirana.glb, 1.65 m) stands 2 m right of the Halwai: same clips, Face Kirana button.
 * 26 Nov: Halwai (sweet maker, halwai.glb, 1.6 m, very fat) stands 2 m right of the Darzi: same clips, Face Halwai button.
 * 26 Nov: Darzi (tailor, darzi.glb, loaded only here; glasses, tape measure and wrist cord added after Tripo) stands 2 m right of Cyber boy: same clips, Face Darzi button.
 * 26 Nov: Pehelwan (wrestler, pehelwan.glb, 1.88 m = 6 ft 2, the tallest man in the village) stands 2 m right of the Kirana, then Kulfiwala (kulfiwala.glb, 1.70 m): same clips, Face Pehelwan / Face Kulfiwala buttons.
 * 26 Nov: Sabziwala (vegetable seller, sabziwala.glb, 1.70 m) and Nai (barber, nai.glb, 1.72 m) stand 2 m right of the Kulfiwala: same clips, Face Sabziwala / Face Nai buttons. The 13-actor row is centred on order 6.
 * 26 Nov: Rascal (thief.glb, 1.68 m, jute sack on the right shoulder; the label never says thief) stands 2 m right of Nai: same clips, Face Rascal button. The 14-actor row is centred on order 7.5 (Rascal stood against the Gupta store at 6.5).
 * Labels hide when the camera is within 2 m. Face Uncle button: eye-level face view (A/D orbit, W/S zoom, Esc leaves). Review only: nothing here runs in normal play.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { reviewPlay } from './characterAnim.js';

const LANE_X = [606, 610], LANE_Z = { sm: -125.5, didi: -121.5, aunty: -119.5, daughter: -117.5, milkman: -115.5, cyber: -113.5, darzi: -111.5, halwai: -109.5, kirana: -107.5, pehelwan: -105.5, kulfiwala: -103.5, sabziwala: -101.5, nai: -99.5, rascal: -97.5 }, CENTRE = { x: 608, z: -124.5 }; // 4 m path along the highway, lanes 2 m apart
const VIEWER = { x: 604.2, z: -120.6 }; // ~5.4 m from the middle, to the side
// 25 Nov: ground speed that makes each clip's planted foot stand still on the ground (no sliding), MEASURED from the clips (tools: foot bone
// speed relative to the hips while the foot is within 4 cm of its lowest point, at the in-game model scale; both clips are in-place).
// Same idea as walkRef in src/characterAnim.js. Review clips play at 1x, so speed = stride length / cycle time.
const STRIDE = { aunty: { walk: 0.546, walk_plain: 0.546 }, sm: { walk: 0.914, gesture_swagger: 0.934 } }; // m/s
const TURN_K = 9; // yaw closes ~96% of a half turn in 0.35 s (smooth ease-out, about 0.4 s for 180 degrees)
const CLIPS = [['Idle', 'idle'], ['Walk', 'walk'], ['Walk plain', 'walk_plain'], ['Swagger', 'gesture_swagger'], ['Laugh', 'gesture_laugh'], ['Wave', 'gesture_wave'], ['Call', 'gesture_call'], ['Greet', 'gesture_greet'], ['Run', 'run'], ['Cheer', 'gesture_cheer'], ['Jump', 'gesture_jump'], ['Look', 'gesture_lookaround'], ['All', 'both'], ['Face Daughter', 'face_daughter'], ['Face Aunty', 'face_aunty'], ['Face Didi', 'face_didi'], ['Face Uncle', 'face_sm'], ['Face Milkman', 'face_milkman'], ['Face Cyber boy', 'face_cyber'], ['Face Darzi', 'face_darzi'], ['Face Halwai', 'face_halwai'], ['Face Kirana', 'face_kirana'], ['Face Pehelwan', 'face_pehelwan'], ['Face Kulfiwala', 'face_kulfiwala'], ['Face Sabziwala', 'face_sabziwala'], ['Face Nai', 'face_nai'], ['Face Rascal', 'face_rascal'], ['Studio light', 'studio']];
// face view: camera at eye level on his face; A/D or arrows orbit, W/S zoom, Escape (or any other button) leaves
const BOTH_ORBIT = -0.2; // 26 Nov: the straight-on two-shot of the 13-actor row puts the camera against the Gupta store wall (half the frame black); 0.2 rad round to the other side shows the whole row, Nai beside the store
const ROW_SHIFT = 4; // 26 Nov: 14-actor row slid 4 m toward TV Aunty so Nai and Rascal stand clear of the Gupta store stall (camera aims at the mean head position, so it follows)
const FACE_DIST = [0.5, 2], FACE_START = 0.9, BOTH_DIST = 7.2, BOTH_GAP = 2, BOTH_RANGE = [0.6, 22], ORBIT_RATE = 0.6, ZOOM_RATE = 0.8;

function label(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff'; g.font = '700 64px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(text).width; if (tw > 480) g.font = `700 ${Math.floor(64 * 480 / tw)}px system-ui`; g.fillText(text, 256, 66);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(1.0, 0.25, 1); sp.position.y = 2.1; sp.renderOrder = 999;
  return sp;
}

function bar(onPick) {
  const ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:96vw;font:600 15px system-ui;background:rgba(0,0,0,.6);color:#fff;padding:10px 14px;border-radius:12px';
  const buttons = [];
  const mark = (id) => buttons.forEach(([b, i]) => { if (i !== 'studio') b.style.background = i === id ? '#f5c542' : '#fff'; });
  for (const [text, id] of CLIPS) {
    const b = document.createElement('button'); b.textContent = text;
    b.style.cssText = 'font:600 15px system-ui;padding:7px 11px;border-radius:8px;border:0;cursor:pointer';
    for (const ev of ['pointerdown', 'mousedown', 'click']) b.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'click') { const r = onPick(id); if (id === 'studio') b.style.background = r ? '#7ad7f0' : '#fff'; else mark(id); } });
    buttons.push([b, id]); ui.appendChild(b);
  }
  document.body.appendChild(ui); mark('idle');
  return mark;
}

export function setupCompare({ scene, camera, camRig, player, renderer, assetSlots, groundAt }) {
  // player on foot, body hidden, camera free to come in to 1 m, looking at the pair
  player.position.set(VIEWER.x, groundAt(VIEWER.x, VIEWER.z, 0), VIEWER.z);
  player.visible = false;
  camRig.minDistance = 1; camRig.distance = 1.2;
  camRig.yaw = Math.atan2(-(CENTRE.x - VIEWER.x), -(CENTRE.z - VIEWER.z));

  const actors = [];
  const ORDER = [['daughter', "AUNTY'S DAUGHTER", 'tvdaughter', 1.33], ['aunty', 'TV AUNTY', 'tvaunty', 1.6], ['didi', 'PARLOUR DIDI', 'parlour_didi', 1.7], ['sm', 'TV UNCLE', 'tvuncle_sm', 1.72], ['milkman', 'MILKMAN', 'milkman', 1.65], ['cyber', 'CYBER BOY', 'cyberboy', 1.7], ['darzi', 'DARZI', 'darzi', 1.6], ['halwai', 'HALWAI', 'halwai', 1.6], ['kirana', 'KIRANA', 'kirana', 1.65], ['pehelwan', 'PEHELWAN', 'pehelwan', 1.88], ['kulfiwala', 'KULFIWALA', 'kulfiwala', 1.7], ['sabziwala', 'SABZIWALA', 'sabziwala', 1.7], ['nai', 'NAI', 'nai', 1.72], ['rascal', 'RASCAL', 'thief', 1.68]]; // left to right in the line-up; Didi 2 m to the left of HD (idle only)
  for (const [key, side, file, hh] of ORDER) {
    const g = new THREE.Group();
    g.name = `gather_tvuncle_${key}`;
    const lbl = label(side); lbl.visible = false; scene.add(lbl);
    scene.add(g);
    assetSlots.register(`gather_tvuncle_${key}`, { file, dimensions: { w: 2.4, h: hh, d: 2.4 }, placements: [{ container: g, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }] });
    assetSlots.resolveOne(`gather_tvuncle_${key}`).catch(() => {});
    actors.push({ g, lbl, key, order: ORDER.findIndex((o) => o[0] === key), lane: LANE_Z[key], x: CENTRE.x, dir: 1, yaw: null, head: null });
  }
  window.__compare = { get uncles() { return actors.map((a) => a.g); } }; // read-only debug handle (compare mode only): uncle.getObjectByName(...).userData.charLOD.mixer
  let fitted = false, clip = 'idle', face = 'both', orbit = BOTH_ORBIT, dist = BOTH_DIST; // starts in the eye-level two-shot
  const keys = new Set();
  const origUpdate = camRig.update.bind(camRig);
  camRig.update = () => {}; // the two-shot / face views place the camera themselves
  const U = Math.hypot(VIEWER.x - CENTRE.x, VIEWER.z - CENTRE.z), ux = (VIEWER.x - CENTRE.x) / U, uz = (VIEWER.z - CENTRE.z) / U; // from the pair toward the viewer
  const resetLanes = () => { for (const a of actors) { a.x = CENTRE.x; a.lane = LANE_Z[a.key]; } };
  const leaveFace = () => { if (!face) return; face = null; keys.clear(); camRig.update = origUpdate; resetLanes(); camRig.update(); };
  let lineup = true; // 25 Nov: actors stand in the line-up until a move button; move buttons never touch the camera
  const fitDist = () => { const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect); return Math.min(BOTH_RANGE[1], Math.max(BOTH_DIST, ((actors.length - 1) * BOTH_GAP / 2 + 1.3) / Math.tan(hf / 2))); }; // all three (4 m wide + margin) in frame
  // Studio light (review only): neutral room environment + a soft fill light from the camera, like a model viewer
  let studio = null, studioOn = false, origEnv = null, origInt = 1;
  const toggleStudio = () => {
    if (!studio) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.visible = false;
      scene.add(fill, fill.target);
      studio = { env: pmrem.fromScene(new RoomEnvironment(), 0.04).texture, fill, d: new THREE.Vector3() };
    }
    studioOn = !studioOn;
    if (studioOn) { origEnv = scene.environment; origInt = scene.environmentIntensity; scene.environment = studio.env; scene.environmentIntensity = 1; }
    else { scene.environment = origEnv; scene.environmentIntensity = origInt; }
    studio.fill.visible = studioOn;
    return studioOn;
  };
  let mark = () => {};
  mark = bar((id) => {
    if (id === 'studio') return toggleStudio();
    if (id.startsWith('face_')) {
      clip = 'idle'; reviewPlay('idle'); // everybody stands still
      face = actors.find((a) => `face_${a.key}` === id); orbit = 0; dist = FACE_START;
      camRig.update = () => {}; // we place the camera ourselves while in face view
      mark(id);
    } else if (id === 'both') {
      clip = 'idle'; reviewPlay('idle'); face = 'both'; lineup = true; orbit = BOTH_ORBIT; dist = fitDist(); camRig.update = () => {}; mark(id);
    } else { lineup = false; clip = id; reviewPlay(id); mark(id); } // animation only: camera untouched
  });
  mark('both');
  const faceKey = (e) => ['a', 'd', 'w', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  window.addEventListener('keydown', (e) => {
    if (!face) return;
    if (e.key === 'Escape' && face === 'both') { leaveFace(); mark(clip); return; } // 25 Nov: Escape returns to normal walking; W/S dolly and A/D orbit now work in the two-shot too (below)
    if (e.key === 'Escape') { leaveFace(); mark(clip); e.stopImmediatePropagation(); return; }
    if (faceKey(e)) { keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (face && faceKey(e)) { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); e.stopImmediatePropagation(); } }, true);
  const tmpV = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const turn = (a, want, dt) => { // exponential ease: fast at first, settles smoothly (no snap, no overshoot)
    const d = Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw));
    a.yaw += d * (1 - Math.exp(-TURN_K * dt));
    return Math.abs(d);
  };
  return function update(dt) {
    if (!(dt > 0)) return;
    const walking = clip === 'walk' || clip === 'walk_plain' || clip === 'gesture_swagger';
    if (face) {
      const k = (n) => keys.has(n);
      const range = face === 'both' ? BOTH_RANGE : FACE_DIST;
      orbit += ((k('d') || k('ArrowRight') ? 1 : 0) - (k('a') || k('ArrowLeft') ? 1 : 0)) * ORBIT_RATE * dt;
      if (face === 'both' && !fitted && actors.every((a) => a.head)) { dist = fitDist(); fitted = true; }
      dist = Math.min(range[1], Math.max(range[0], dist + ((k('s') || k('ArrowDown') ? 1 : 0) - (k('w') || k('ArrowUp') ? 1 : 0)) * ZOOM_RATE * dt));
    }
    const headOf = (a) => { if (!a.head) a.g.traverse((b) => { if (!a.head && b.isBone && /(^|rig|:)head$/i.test(b.name)) a.head = b; }); return a.head; };
    const two = face === 'both' && lineup;
    for (const a of actors) {
      if (a.yaw === null) a.yaw = Math.atan2(VIEWER.x - a.x, VIEWER.z - a.lane);
      if (two) { // side by side, 2 m apart, facing the camera
        const side = (a.order - 7.5) * BOTH_GAP - ROW_SHIFT; // 7 in a row now: Cyber boy 2 m right of Milkman; // 4 in a row (TV Uncle keeps his spot: +1 m), left to right, 2 m apart (HD and Smart Mesh keep their spots, Didi is 2 m left of HD, Aunty 2 m left of Didi)
        a.x = CENTRE.x + uz * side; a.lane = CENTRE.z - ux * side;
        turn(a, Math.atan2(ux, uz), dt);
      } else if (walking && a.key !== 'didi' && a.key !== 'daughter' && a.key !== 'milkman' && a.key !== 'cyber' && a.key !== 'darzi' && a.key !== 'halwai' && a.key !== 'kirana' && a.key !== 'pehelwan' && a.key !== 'kulfiwala' && a.key !== 'sabziwala' && a.key !== 'nai' && a.key !== 'rascal' && (a.key !== 'aunty' || clip.startsWith('walk'))) {
        const want = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        const err = turn(a, want, dt);
        const k = Math.max(0, Math.min(1, 1 - err / 1.2)); // walk speed ramps in as the body comes round (0 at 180 degrees, full under ~0 degrees)
        const go = k * k * (3 - 2 * k) * ((STRIDE[a.key] || {})[clip] || 0.9);
        if (go > 0) {
          a.x += a.dir * go * dt;
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
      a.lbl.visible = !face || (face === 'both' && dBody > 1.2); // hidden within 3 m of the Uncle in normal view, and in the close-ups
      if (!face && dBody <= 3) a.lbl.visible = false;
      a.lbl.scale.set(dl * 0.12, dl * 0.03, 1); // fixed small size on screen, whatever the distance
    }
    if (face === 'both') { // 25 Nov: locked eye-level two-shot from the first frame, pitch 0 (never looks down); the normal follow camera is a no-op (camRig.update replaced)
      const hs = actors.map(headOf);
      {
        if (hs.every(Boolean)) { tmpV.set(0, 0, 0); for (const h of hs) { h.getWorldPosition(tmp2); tmpV.add(tmp2); } tmpV.multiplyScalar(1 / hs.length); tmpV.y += 0.1; } // eye level, between the two faces
        else tmpV.set(CENTRE.x, groundAt(CENTRE.x, CENTRE.z, 0) + 1.65, CENTRE.z); // models still loading: same height, same spot
        const ang = Math.atan2(ux, uz) + orbit;
        camera.position.set(tmpV.x + Math.sin(ang) * dist, tmpV.y, tmpV.z + Math.cos(ang) * dist);
        camera.lookAt(tmpV);
      }
    } else if (face) { // eye level on the head bone, looking straight at the face
      const h = headOf(face);
      if (h) {
        h.getWorldPosition(tmpV); tmpV.y += ['daughter', 'milkman'].includes(face.key) ? 0.075 : face.key === 'cyber' ? 0.06 : face.key === 'darzi' ? 0.08 : face.key === 'halwai' ? 0.03 : face.key === 'kirana' ? 0.08 : face.key === 'pehelwan' ? 0.07 : face.key === 'kulfiwala' ? 0.07 : face.key === 'sabziwala' ? 0.07 : face.key === 'nai' ? 0.06 : face.key === 'rascal' ? 0.07 : 0.1; // head bone sits at the neck top; eyes are ~10 cm above (7.5 cm on the 1.33 m child)
        const ang = face.yaw + orbit;
        camera.position.set(tmpV.x + Math.sin(ang) * dist, tmpV.y, tmpV.z + Math.cos(ang) * dist);
        camera.lookAt(tmpV);
      }
    }
    if (studioOn) { // soft fill from the camera's side, aimed where the camera looks
      studio.fill.position.copy(camera.position).add(tmp2.set(0, 0.3, 0));
      camera.getWorldDirection(studio.d); studio.fill.target.position.copy(camera.position).addScaledVector(studio.d, 3);
    }
  };
}
