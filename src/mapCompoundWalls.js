// The 1 Nov map's compound walls (roadside places' front walls with their gate gaps), map metres; world x = map x + 600.
// The brick kiln's east end is cut at map x 277.5 because the world ends at x 880 (map 280). The gher and goods-yard walls are part of their own yard models and are left out. Generated from docs/layout/village-plan-positions-2026-11-01.json.
export const MAP_COMPOUND_WALLS = [{"name":"Bus stop","lines":[[[-53.6,-107.4],[-53.6,-106],[-44.8,-105.9]],[[-42.4,-105.8],[-33.6,-105.7],[-33.6,-107.1]]]},{"name":"Tyre repair shop","lines":[[[27.8,-110.3],[27.8,-106.8],[30.6,-106.8]],[[33,-106.8],[35.8,-106.7],[35.9,-110.2]]]},{"name":"Truck weighbridge","lines":[[[111.6,-104.4],[111.5,-100.9],[120.3,-100.8]],[[122.7,-100.7],[131.5,-100.6],[131.6,-104.1]]]},{"name":"Petrol pump","lines":[[[-58.4,-153.6],[-58.4,-154.4],[-44.5,-154.2]],[[-42.2,-154.1],[-28.3,-153.9],[-28.3,-153.1]]]},{"name":"Wholesale grain market","lines":[[[129.6,-189.6],[129.7,-193.1],[147,-192.8]],[[149.4,-192.8],[166.7,-192.5],[166.7,-189]]]},{"name":"Brick kiln","lines":[[[201.1,-192],[201.2,-195.5],[239.9,-194.8]],[[242.3,-194.8],[277.5,-194.2]]]},{"name":"Mosque","lines":[[[-104.1,-87],[-107.6,-87],[-107.6,-91.1]],[[-107.6,-93.5],[-107.6,-97.6],[-104.1,-97.6]]]},{"name":"Old mansion (haveli)","lines":[[[27.5,-12],[27.1,-8.5],[41.8,-6.7]],[[44.1,-6.4],[58.8,-4.5],[59.3,-8]]]},{"name":"Village council office","lines":[[[-58.4,52.1],[-58.7,55.6],[-52.4,56.1]],[[-50,56.4],[-43.8,56.9],[-43.5,53.4]]]},{"name":"Tea stall","lines":[[[-38.4,16.5],[-38.7,20],[-37.9,20.1]],[[-35.5,20.3],[-34.7,20.4],[-34.4,16.9]]]},{"name":"Post office","lines":[[[-49,61.2],[-49.6,57.7],[-52.4,58.3]],[[-54.7,58.7],[-57.5,59.3],[-56.8,62.7]]]},{"name":"General store","lines":[[[24.1,49],[23.8,52.5],[23.2,52.5]],[[20.8,52.3],[20.3,52.2],[20.6,48.7]]]},{"name":"Health centre","lines":[[[116.5,-7.3],[120,-7.3],[120,-4.5]],[[120,-2.1],[120,0.6],[116.5,0.6]]]},{"name":"Small shrine","lines":[[[82.5,3.9],[82.8,0.5],[82.9,0.5]],[[85.3,0.7],[85.4,0.7],[85.1,4.2]]]},{"name":"Village TV house","lines":[[[-52.9,16.3],[-52.6,12.9],[-47.8,13.3]],[[-45.4,13.5],[-40.6,13.9],[-40.9,17.4]]]},{"name":"Flour mill","lines":[[[-64.8,20.3],[-64.5,16.8],[-62.7,17]],[[-60.3,17.2],[-58.5,17.4],[-58.8,20.8]]]},{"name":"Sikh temple","lines":[[[-89.9,96.9],[-86.4,97],[-86.5,101.3]],[[-86.5,103.7],[-86.6,108],[-90.1,107.9]]]},{"name":"Tubewell and pump room","lines":[[[128.6,35],[128.3,38.5],[133.1,38.9]],[[135.5,39.1],[140.2,39.5],[140.5,36]]]},{"name":"Jain temple","lines":[[[121.4,91.5],[124.9,91.5],[124.9,95.1]],[[124.9,97.5],[124.9,101.1],[121.4,101.1]]]},{"name":"Tea stall at the square","lines":[[[39.9,0.9],[43.4,1.2],[43.3,3]],[[43.1,5.3],[42.9,7.1],[39.4,6.8]]]},{"name":"Sweet shop (halwai)","lines":[[[40.3,19.4],[43.8,19.7],[43.7,20.8]],[[43.5,23.2],[43.4,24.2],[39.9,23.9]]]},{"name":"Jalebi stall","lines":[[[37,24.4],[40.5,24.7],[40.4,25.6]],[[40.2,28],[40.1,28.9],[36.6,28.6]]]},{"name":"Soda drink stall","lines":[[[-24.7,26.4],[-28.2,26.1],[-28.2,25.4]],[[-27.9,23],[-27.9,22.3],[-24.4,22.6]]]},{"name":"Creche and preschool (anganwadi)","lines":[[[-17.9,98.9],[-17.2,102.3],[-21.3,103.1]],[[-23.6,103.6],[-27.6,104.4],[-28.3,100.9]]]}];

/** One zone's worth of walls for a MAP_COMPOUND_WALLS entry: the existing boundary-wall look, plus ~2 m collider boxes along every run. */
export function createMapCompoundWall(entry, createBoundaryWall, THREE) {
  const pts = entry.lines.flat().map(([x, z]) => ({ x: x + 600, z }));
  const c = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, z: pts.reduce((s, p) => s + p.z, 0) / pts.length };
  const runs = [], boxes = [];
  for (const line of entry.lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = { x: line[i][0] + 600, z: line[i][1] }, b = { x: line[i + 1][0] + 600, z: line[i + 1][1] };
      runs.push({ a, b });
      const nearAxis = Math.min(Math.abs(b.x - a.x), Math.abs(b.z - a.z)) <= 1.2; // gently sloped run: one box, no staggered 2 m nubs
      const n = nearAxis ? 1 : Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
      for (let k = 0; k < n; k++) {
        const x0 = a.x + (b.x - a.x) * k / n, x1 = a.x + (b.x - a.x) * (k + 1) / n, z0 = a.z + (b.z - a.z) * k / n, z1 = a.z + (b.z - a.z) * (k + 1) / n;
        const alongX = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z); // pad across the wall only, so neighbouring chunks butt instead of overlapping
        boxes.push({ minX: Math.min(x0, x1) - (alongX ? 0 : 0.15), maxX: Math.max(x0, x1) + (alongX ? 0 : 0.15), minZ: Math.min(z0, z1) - (alongX ? 0.15 : 0), maxZ: Math.max(z0, z1) + (alongX ? 0.15 : 0) });
      }
    }
  }
  for (let i = boxes.length - 1; i >= 0; i--) { boxes[i].maxX = Math.min(boxes[i].maxX, 879.4); if (boxes[i].maxX <= boxes[i].minX) boxes.splice(i, 1); } // the world ends at x 880 (the kiln wall's east end pokes past it)
  const group = createBoundaryWall(c, 'map_wall', runs, []);
  const carrier = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  carrier.visible = false;
  carrier.userData.colliderBoxes = boxes;
  group.add(carrier);
  return { group, centre: c };
}
