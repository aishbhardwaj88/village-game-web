/**
 * 25 Nov: ?compare=tvuncle review scene. TV Uncle HD (left) and Smart Mesh (right), 2 m apart, 4 m in front of the player's
 * spawn, facing the camera, both looping the same 6 clips in the same order (src/characterAnim.js "cycle"). Review only.
 */
import * as THREE from 'three';

const D = { x: -0.341, z: 0.94 };      // the opening camera looks along this (main.js OPENING_YAW 2.793)
const RIGHT = { x: -0.94, z: -0.341 }; // camera's right-hand side
function label(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff'; g.font = '700 64px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(1.0, 0.25, 1); sp.position.y = 2.1; sp.renderOrder = 999;
  return sp;
}
export function setupCompare({ scene, assetSlots, spawn, groundAt }) {
  const cx = spawn.x + D.x * 4, cz = spawn.z + D.z * 4;
  for (const [key, file, side, text] of [['tvuncle_hd', 'tvuncle_hd', -1, 'HD'], ['tvuncle_sm', 'tvuncle_sm', 1, 'SMART MESH']]) {
    const g = new THREE.Group();
    g.name = `gather_${key}`;
    const x = cx + RIGHT.x * side, z = cz + RIGHT.z * side;
    g.position.set(x, groundAt(x, z, 0), z);
    g.rotation.y = 2.793; // facing back toward the player
    g.add(label(text));
    scene.add(g);
    assetSlots.register(`gather_${key}`, { file, dimensions: { w: 2.4, h: 1.72, d: 2.4 }, placements: [{ container: g, position: new THREE.Vector3(0, 0, 0), rotationY: 0 }] });
    assetSlots.resolveOne(`gather_${key}`).catch(() => {});
  }
}
