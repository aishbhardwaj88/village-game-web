import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';

// The bicycle under the player (3 Nov: the player starts mounted). player_cycle_v2.glb has
// its front toward +Z, origin between the wheels on the ground. One model, one child of the
// player group; it turns toward the movement direction and is hidden when on foot.
const TURN_RATE = 8; // 1/s, exponential ease toward the heading

export function createPlayerCycle(playerGroup) {
  const holder = new THREE.Group();
  holder.name = 'player_cycle';
  holder.visible = false;
  playerGroup.add(holder);
  let heading = 0;

  getGLTFLoader().loadAsync('assets/models/player_cycle_v2.glb').then((gltf) => {
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    holder.add(gltf.scene);
  }).catch((e) => console.warn('player cycle model failed', e));

  return {
    /** Call every frame. moveX/moveZ is the world-space step direction (0 when standing). */
    update(dt, onCycle, moveX, moveZ) {
      holder.visible = onCycle;
      if (!onCycle || moveX * moveX + moveZ * moveZ < 1e-4) return;
      const target = Math.atan2(moveX, moveZ);
      let d = target - heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading += d * (1 - Math.exp(-TURN_RATE * dt));
      holder.rotation.y = heading;
    },
  };
}
