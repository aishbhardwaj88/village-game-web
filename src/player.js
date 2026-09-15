import * as THREE from 'three';

const PLAYER_HEIGHT = 2; // metres
const PLAYER_RADIUS = 0.35;

const CAMERA_DISTANCE = 5;
const CAMERA_MIN_DISTANCE = 3; // normal (unoccluded) floor
const CAMERA_HEIGHT = 2.2;

const OCCLUSION_MIN_DISTANCE = 1.5; // absolute floor once a wall forces the camera in
const OCCLUSION_MARGIN = 0.3; // stop just short of the hit surface, not touching it
const PULL_IN_RATE = 25; // fast — never show clipped geometry, even for one frame
const EASE_OUT_RATE = 4; // slower — "easing smoothly back out" once the obstruction clears

export function createPlayer() {
  const group = new THREE.Group();
  group.name = 'player';

  const geometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - PLAYER_RADIUS * 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0x8a6a4f, roughness: 0.8 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = PLAYER_HEIGHT / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  group.position.set(0, 0, 0);

  return group;
}

/**
 * Third-person rig: yaw applied to the player, pitch/orbit applied to the camera
 * around a pivot above the player's head. Camera never gets closer than
 * CAMERA_MIN_DISTANCE regardless of look pitch — and, separately, a ray cast from the
 * pivot toward the desired camera position pulls the camera in to just before the
 * first obstruction (walls, buildings) so it never clips inside geometry, down to
 * OCCLUSION_MIN_DISTANCE, easing back out once the obstruction clears.
 */
export class ThirdPersonCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.yaw = Math.PI; // behind the player looking forward
    this.pitch = -0.15;
    this.distance = CAMERA_DISTANCE;
    this.height = CAMERA_HEIGHT; // settable per mount (bigger vehicles pull the rig back/up)
    this._pivot = new THREE.Vector3();
    this._offsetDir = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._effectiveDistance = this.distance;
    this._raycaster = new THREE.Raycaster();
    this._obstacles = [];
    this._excludeRoots = [];
  }

  /** Objects the camera should never clip through (buildings etc.) — checked every
   * frame via raycast, not just at setup, so it stays correct if the scene changes.
   * `excludeRoots` is the current target's own geometry (player, or the mounted
   * vehicle + its trolley) so the camera doesn't pull in from hitting itself; a single
   * root or an array are both fine. */
  setObstacles(objects, excludeRoots = null) {
    this._obstacles = objects;
    this._excludeRoots = excludeRoots ? (Array.isArray(excludeRoots) ? excludeRoots : [excludeRoots]) : [];
  }

  addYawPitch(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -0.9, 0.6);
  }

  _isExcluded(object) {
    if (!this._excludeRoots || this._excludeRoots.length === 0) return false;
    let o = object;
    while (o) {
      if (this._excludeRoots.includes(o)) return true;
      o = o.parent;
    }
    return false;
  }

  update(dt = 1 / 60) {
    const desiredDistance = Math.max(this.distance, CAMERA_MIN_DISTANCE);

    this._pivot.copy(this.target.position);
    this._pivot.y += this.height;

    const cosPitch = Math.cos(this.pitch);
    this._offsetDir.set(Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), Math.cos(this.yaw) * cosPitch);

    let targetDistance = desiredDistance;
    if (this._obstacles.length > 0) {
      this._raycaster.set(this._pivot, this._offsetDir);
      this._raycaster.far = desiredDistance;
      this._raycaster.near = 0;
      const hits = this._raycaster.intersectObjects(this._obstacles, true);
      const hit = hits.find((h) => !this._isExcluded(h.object));
      if (hit) {
        targetDistance = Math.max(OCCLUSION_MIN_DISTANCE, hit.distance - OCCLUSION_MARGIN);
      }
    }

    const rate = targetDistance < this._effectiveDistance ? PULL_IN_RATE : EASE_OUT_RATE;
    this._effectiveDistance = THREE.MathUtils.damp(this._effectiveDistance, targetDistance, rate, dt);

    this._desired.copy(this._pivot).addScaledVector(this._offsetDir, this._effectiveDistance);
    this.camera.position.copy(this._desired);
    this.camera.lookAt(this._pivot);
  }
}

export { PLAYER_HEIGHT, PLAYER_RADIUS, CAMERA_DISTANCE, CAMERA_HEIGHT };
