import * as THREE from 'three';
import { getTiledMaterial } from './materials.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();

function setInstance(mesh, index, pos, size, rotY = 0) {
  _pos.set(pos.x, pos.y, pos.z);
  _euler.set(0, rotY, 0);
  _quat.setFromEuler(_euler);
  _scale.set(size.x, size.y, size.z);
  _mat.compose(_pos, _quat, _scale);
  mesh.setMatrixAt(index, _mat);
}

/**
 * Reusable instanced pieces — door/window frame bars, lintels, corner pilasters,
 * plinth segments, opening reveals, and small props (drainpipe/switchboard/step) —
 * shared across every building instead of one-off geometry per building. Each kind
 * is a single InstancedMesh (one draw call regardless of how many buildings use it).
 */
export class BuildingKit {
  constructor(capacity = 200) {
    // Wood-trim bars: door/window frames, lintels, corner pilasters, door leaves —
    // all just a unit box non-uniformly scaled, and all the same palette colour
    // (law: wood trim #8A6A4A), so one instanced mesh covers all of them.
    const trimMat = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, tint: 0x8a6a4a, roughness: 1 });
    this.trim = new THREE.InstancedMesh(UNIT_BOX, trimMat, capacity);
    this.trim.castShadow = true;
    this.trim.receiveShadow = true;
    this._trimCount = 0;

    // Plinth: a deeper, neutral cement tone — real plinths are usually exposed
    // concrete/stone regardless of the wall's paint colour above them.
    const plinthMat = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, tint: 0x8f8878, roughness: 1 });
    this.plinth = new THREE.InstancedMesh(UNIT_BOX, plinthMat, capacity);
    this.plinth.castShadow = true;
    this.plinth.receiveShadow = true;
    this._plinthCount = 0;

    // Reveal: a dark recess backing so a door/window opening reads as a real gap in
    // a wall of real thickness, without needing to actually cut a hole in the wall
    // geometry (see docs/parked.md).
    const revealMat = new THREE.MeshStandardMaterial({ color: 0x120f0a, roughness: 0.95 });
    this.reveal = new THREE.InstancedMesh(UNIT_BOX, revealMat, capacity);
    this._revealCount = 0;

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.3 });
    this.drainpipe = new THREE.InstancedMesh(UNIT_CYLINDER, pipeMat, capacity);
    this.drainpipe.castShadow = true;
    this._drainpipeCount = 0;

    const boardMat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.6 });
    this.switchboard = new THREE.InstancedMesh(UNIT_BOX, boardMat, capacity);
    this.switchboard.castShadow = true;
    this._switchboardCount = 0;

    const stepMat = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, tint: 0xd7d2c4, roughness: 1 });
    this.step = new THREE.InstancedMesh(UNIT_BOX, stepMat, capacity);
    this.step.castShadow = true;
    this.step.receiveShadow = true;
    this._stepCount = 0;
  }

  addTrimBar(pos, size, rotY = 0) {
    setInstance(this.trim, this._trimCount++, pos, size, rotY);
  }

  addPlinthSegment(pos, size, rotY = 0) {
    setInstance(this.plinth, this._plinthCount++, pos, size, rotY);
  }

  addReveal(pos, size, rotY = 0) {
    setInstance(this.reveal, this._revealCount++, pos, size, rotY);
  }

  addDrainpipe(pos, height) {
    setInstance(this.drainpipe, this._drainpipeCount++, pos, { x: 0.08, y: height, z: 0.08 }, 0);
  }

  addSwitchboard(pos, rotY = 0) {
    setInstance(this.switchboard, this._switchboardCount++, pos, { x: 0.3, y: 0.4, z: 0.08 }, rotY);
  }

  addStep(pos, size, rotY = 0) {
    setInstance(this.step, this._stepCount++, pos, size, rotY);
  }

  /** A rectangular plinth wrapping a building's footprint — 4 instanced segments,
   * slightly proud of the wall face, per docs/look-standard.md. */
  addPlinthRing(cx, cz, width, depth, wallThickness) {
    const h = 0.3;
    const proud = 0.05;
    this.addPlinthSegment({ x: cx, y: h / 2, z: cz - depth / 2 - proud / 2 }, { x: width + proud * 2, y: h, z: wallThickness + proud });
    this.addPlinthSegment({ x: cx, y: h / 2, z: cz + depth / 2 + proud / 2 }, { x: width + proud * 2, y: h, z: wallThickness + proud });
    this.addPlinthSegment({ x: cx - width / 2 - proud / 2, y: h / 2, z: cz }, { x: wallThickness + proud, y: h, z: depth + proud * 2 });
    this.addPlinthSegment({ x: cx + width / 2 + proud / 2, y: h / 2, z: cz }, { x: wallThickness + proud, y: h, z: depth + proud * 2 });
  }

  /** Four corner pilasters (thin proud strips) on a building's footprint, so corners
   * catch light instead of reading as a flat, edgeless box. */
  addCornerPilasters(cx, cz, width, depth, wallHeight, wallThickness) {
    const pilasterW = wallThickness * 0.9;
    const proud = 0.04;
    const corners = [
      [cx - width / 2, cz - depth / 2],
      [cx - width / 2, cz + depth / 2],
      [cx + width / 2, cz - depth / 2],
      [cx + width / 2, cz + depth / 2],
    ];
    for (const [x, z] of corners) {
      this.addTrimBar({ x, y: wallHeight / 2, z }, { x: pilasterW + proud, y: wallHeight, z: pilasterW + proud });
    }
  }

  /**
   * A door or window opening on a wall face: dark reveal, frame bars on the two
   * jambs + lintel above, and (doors only) a leaf panel. `widthAxis` is the world
   * axis the opening's *width* runs along ('x' for a wall facing north/south, 'z'
   * for a wall facing east/west) — the wall's own thickness runs along the other
   * horizontal axis.
   */
  addOpening({ center, width, height, wallThickness, widthAxis, sill = 0, isDoor = false }) {
    const frameW = 0.1;
    const revealDepth = wallThickness * 0.9;
    const across = widthAxis; // the direction along the wall's own length/width

    const mk = (offsetAcross, offsetY, sizeAcross, sizeY, sizeDepth) => {
      const p = { x: center.x, y: center.y + offsetY, z: center.z };
      p[across] += offsetAcross;
      const s = { x: sizeAcross, y: sizeY, z: sizeDepth };
      if (across === 'x') {
        s.x = sizeAcross;
        s.z = sizeDepth;
      } else {
        s.z = sizeAcross;
        s.x = sizeDepth;
      }
      return { p, s };
    };

    // Reveal backing, centred in the opening, recessed into the wall thickness.
    {
      const { p, s } = mk(0, sill + height / 2, width - frameW, height - frameW, revealDepth);
      this.addReveal(p, s);
    }

    // Jambs (left/right frame bars).
    for (const side of [-1, 1]) {
      const { p, s } = mk((side * width) / 2, sill + height / 2, frameW, height, wallThickness + 0.02);
      this.addTrimBar(p, s);
    }

    // Lintel bar above the opening.
    {
      const { p, s } = mk(0, sill + height + frameW / 2, width + frameW * 2, frameW, wallThickness + 0.02);
      this.addTrimBar(p, s);
    }

    if (isDoor) {
      const { p, s } = mk(0, sill + (height - frameW) / 2, width - frameW * 2.2, height - frameW * 1.4, 0.06);
      this.addTrimBar(p, s);
    }
  }

  finalize(scene) {
    for (const [mesh, count] of [
      [this.trim, this._trimCount],
      [this.plinth, this._plinthCount],
      [this.reveal, this._revealCount],
      [this.drainpipe, this._drainpipeCount],
      [this.switchboard, this._switchboardCount],
      [this.step, this._stepCount],
    ]) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (count > 0) scene.add(mesh);
    }
  }
}
