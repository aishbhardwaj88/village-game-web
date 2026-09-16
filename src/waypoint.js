import * as THREE from 'three';

/**
 * Subtle wayfinding for the current objective step only (item 4 brief): a soft
 * pulsing glow on the ground at the target when it's in view, or a thin arrow at the
 * screen edge pointing toward it when it isn't. Nothing garish — low opacity, no
 * hard edges, no distance readout.
 */
const PULSE_SPEED = 2.2;
const EDGE_MARGIN = 0.86; // keep the arrow inside the screen, not flush to the edge

export function createWaypointGlow() {
  const geometry = new THREE.RingGeometry(0.6, 1.1, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xf2c47c,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'waypoint_glow';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  mesh.visible = false;
  mesh.renderOrder = 10;
  return mesh;
}

const _target = new THREE.Vector3();
const _ndc = new THREE.Vector3();

/**
 * Call once per frame with the current objective's world position (or null once the
 * errand is complete — hides everything). `camera` must already have a fresh
 * matrixWorld/projection for this frame (main.js calls camera.updateMatrixWorld()
 * right after moving the camera rig, before this).
 */
export function updateWaypoint({ glowMesh, arrowEl, arrowShapeEl, camera, targetPos, time, width, height }) {
  if (!targetPos) {
    glowMesh.visible = false;
    arrowEl.classList.remove('visible');
    return;
  }

  glowMesh.position.x = targetPos.x;
  glowMesh.position.z = targetPos.z;
  const pulse = 0.85 + Math.sin(time * PULSE_SPEED) * 0.15;
  glowMesh.scale.setScalar(pulse);
  glowMesh.material.opacity = 0.28 + Math.sin(time * PULSE_SPEED) * 0.09;

  _target.copy(targetPos);
  _target.y += 0.05;
  _ndc.copy(_target).project(camera);

  const behind = _ndc.z > 1;
  const onScreen = !behind && Math.abs(_ndc.x) <= 1 && Math.abs(_ndc.y) <= 1;
  glowMesh.visible = onScreen;

  if (onScreen) {
    arrowEl.classList.remove('visible');
    return;
  }

  // Off camera: point an arrow at the screen edge toward it. Points behind the
  // camera project with an inverted/unreliable x,y — flip them back the right way
  // round so the arrow doesn't point backwards.
  let x = _ndc.x;
  let y = _ndc.y;
  if (behind) {
    x = -x;
    y = -y;
  }
  const len = Math.hypot(x, y) || 1;
  const dirX = x / len;
  const dirY = y / len;
  const t = Math.min(EDGE_MARGIN / Math.max(Math.abs(dirX), 1e-5), EDGE_MARGIN / Math.max(Math.abs(dirY), 1e-5));
  const edgeX = dirX * t;
  const edgeY = dirY * t;

  const px = (edgeX * 0.5 + 0.5) * width;
  const py = (1 - (edgeY * 0.5 + 0.5)) * height;
  // Shape points up by default (see index.html #waypoint-arrow-shape); +90 makes
  // angle 0 (screen-right) point right.
  const angleDeg = (Math.atan2(py - height / 2, px - width / 2) * 180) / Math.PI + 90;

  arrowEl.style.transform = `translate(${px}px, ${py}px)`;
  arrowShapeEl.style.transform = `rotate(${angleDeg}deg)`;
  arrowEl.classList.add('visible');
}
