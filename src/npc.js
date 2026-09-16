import * as THREE from 'three';

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

  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;

  return group;
}

export { NPC_HEIGHT, NPC_RADIUS };
