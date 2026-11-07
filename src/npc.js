import * as THREE from 'three';
import { keepOnGround, markFigure, settleDy } from './standOn.js';

// Placeholder people (item 5 brief): a capsule, same construction as the player
// (see src/player.js) but a touch shorter and stockier so it doesn't read as another
// player, just a villager.
const NPC_HEIGHT = 1.8;
const NPC_RADIUS = 0.33;

export function createNPC(tint, position, rotationY = 0, name = 'npc') {
  const group = new THREE.Group();
  group.name = name;

  const geometry = new THREE.CapsuleGeometry(NPC_RADIUS, NPC_HEIGHT - NPC_RADIUS * 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = NPC_HEIGHT / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  group.userData.mesh = mesh; // exposed for in-place animations (item 8's kadhai stir) that shouldn't move the group itself

  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;

  // Feet on whatever is under them (docs/PARALLEL.md G1): a post office plinth, a dhaba platform, a road's raised
  // surface, a dug bank. Only the capsule's own height inside the group moves, so routines that drive the group's
  // position (src/npcRoutines.js, rooftop waypoints) keep working; walkers re-settle as they move.
  markFigure(mesh);
  keepOnGround(group, (scene) => {
    const dy = settleDy(scene, mesh);
    if (Math.abs(dy) > 0.004 && Math.abs(dy) < 1.2) mesh.position.y += dy;
  }, true);

  return group;
}

export { NPC_HEIGHT, NPC_RADIUS };
