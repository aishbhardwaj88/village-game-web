import * as THREE from 'three';

const PLAYER_HEIGHT = 2; // metres
const PLAYER_RADIUS = 0.35;

const CAMERA_DISTANCE = 5;
const CAMERA_MIN_DISTANCE = 3;
const CAMERA_HEIGHT = 2.2;

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
 * CAMERA_MIN_DISTANCE regardless of look pitch.
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
    this._desired = new THREE.Vector3();
  }

  addYawPitch(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -0.9, 0.6);
  }

  update() {
    const distance = Math.max(this.distance, CAMERA_MIN_DISTANCE);

    this._pivot.copy(this.target.position);
    this._pivot.y += this.height;

    const cosPitch = Math.cos(this.pitch);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch
    ).multiplyScalar(distance);

    this._desired.copy(this._pivot).add(offset);
    this.camera.position.copy(this._desired);
    this.camera.lookAt(this._pivot);
  }
}

export { PLAYER_HEIGHT, PLAYER_RADIUS, CAMERA_DISTANCE, CAMERA_HEIGHT };
