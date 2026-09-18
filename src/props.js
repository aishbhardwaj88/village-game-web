import * as THREE from 'three';
import { mergeGroupByMaterial } from './mergeUtils.js';

/** School bell (item 5): a post, a short arm, and a small hanging bell — enough to
 * read as "the thing you ring," not a modelled asset. */
export function createBellProp(position) {
  const group = new THREE.Group();
  group.name = 'school_bell';

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6), postMat);
  post.position.y = 1.0;
  post.castShadow = true;
  group.add(post);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), postMat);
  arm.position.set(0.22, 1.95, 0);
  arm.castShadow = true;
  group.add(arm);

  const bellMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.22, 8, 1, true), bellMat);
  bell.position.set(0.42, 1.75, 0);
  bell.castShadow = true;
  group.add(bell);

  // Task 2 (draw-call budget) — post + arm already share postMat, so this folds
  // them into one draw call (bell keeps its own metal material).
  mergeGroupByMaterial(group);

  group.position.set(position.x, 0, position.z);
  return group;
}
