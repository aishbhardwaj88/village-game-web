/**
 * S7 LAYOUT WIRING: the runtime half of moving the village onto the approved 21 Nov map, called ONCE from src/main.js
 * (the `// S7 WIRING (layout)` block, right after every zone is registered and before the zone manager is published).
 * Under ?layout=old it returns at once and changes nothing.
 *
 * What it does under ?layout=new (each step names the zone it touches, so it can be checked in the console:
 * window.__layoutWiring lists them):
 *  - turns the three code-built sites that main.js draws with no turn (health centre, masjid, Jain mandir) to their map front;
 *  - moves the existing yards and props the approved map re-places under new names (goods yard, gher yard, haystacks,
 *    dung-cake yard, carrom, culvert, the wheat field gate) to those spots;
 *  - drops the streamed things that only made sense round the old spots and would now stand inside new houses or on the
 *    canal green: the old north-south highway strip, the old lane laundry corners, the four walled plots round the old
 *    haveli spot and the 1 Nov roadside compound walls;
 *  - stands the pump attendant at the moved petrol pump and makes sure the player never starts inside a building.
 * Everything that reads src/anchors.js moves by itself (the anchors already hold the new spots).
 */
import { isNewLayout, getPlace, layoutYaw } from './layout.js';
import { safeSpawn, inBuilding } from '../save.js';
import { ANCHORS, localPt } from '../anchors.js';
import { turnSiteGroup } from '../turn.js';
import { createYardSite } from '../yardModels.js';
import { createMapHaystacks, createDungCakeYard, createCarromScene, createFieldPropSite, createChemist, createManihari } from '../farmSites.js';
import { RIDE_NOOK_SITES } from '../rideNooks.js';
import { buildTrees } from '../trees.js';
import { mergeGroupByMaterial } from '../mergeUtils.js';
import { nearestClear } from './seat.js';
import { LONG_WALK_SITES } from '../longWalks.js';
import { roadEmptyPush } from '../mapRoads.js';

// copied from src/main.js (the same yard walls, local to each yard's own origin)
const GOODS_SOLIDS = [{ x: -4.5, z: 0, w: 0.3, d: 10.44 }, { x: 4.5, z: 0, w: 0.3, d: 10.44 }, { x: -3.095, z: 5.22, w: 3.11, d: 0.3 }, { x: 3.075, z: 5.22, w: 3.15, d: 0.3 }];
const GHER_SOLIDS = [{ x: -4.55, z: -2.05, w: 0.3, d: 11.95 }, { x: 4.55, z: -2.05, w: 0.3, d: 11.95 }, { x: -3.15, z: -7.9, w: 3.1, d: 0.3 }, { x: 3.15, z: -7.9, w: 3.1, d: 0.3 }, { x: 0, z: 3.82, w: 9.3, d: 0.3 }];

const turnResult = (built, ry) => {
  if (!ry || !built) return built;
  if (built.isObject3D) return turnSiteGroup(built, ry);
  if (built.group && built.group.isObject3D) { turnSiteGroup(built.group, ry); return built; }
  return built;
};

/** One call from main.js. ctx = { zoneManager, scene, player }. Returns the list of changes made. */
export function initLayoutWiring({ zoneManager, scene, player } = {}) {
  const done = [];
  if (typeof window !== 'undefined') window.__layoutWiring = done;
  if (!isNewLayout() || !zoneManager) return done;
  const Z = zoneManager.zones;

  // 1. drop what only made sense round the old spots
  const drop = (name) => { if (Z.delete(name)) done.push(`dropped zone ${name}`); };
  drop('highway');
  for (const name of [...Z.keys()]) if (/^lane_laundry_|^house_plots_\d|^map_wall_/.test(name)) drop(name);

  // 2. turn the sites built with no turn
  for (const [zone, id] of [['health_subcentre', 'health'], ['masjid', 'masjid'], ['jain_mandir', 'jain']]) {
    const z = Z.get(zone);
    if (!z) continue;
    const ry = layoutYaw(id, 0), build = z.build;
    z.build = () => turnResult(build(), ry);
    done.push(`turned ${zone} to ${(ry * 180 / Math.PI).toFixed(1)} deg`);
  }

  // 3. re-place the existing yards / props at the approved map's spots
  const move = (zone, placeId, makeBuild) => {
    const z = Z.get(zone), p = getPlace(placeId);
    if (!z || !p) return;
    z.x = p.x; z.z = p.z;
    z.build = makeBuild(p);
    done.push(`moved ${zone} to ${placeId} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  };
  move('goods_yard', 'new_358', (p) => () => turnSiteGroup(createYardSite('goods_yard', 'goods_yard.glb', { x: p.x, z: p.z }, GOODS_SOLIDS), p.ry));
  move('gher_yard', 'new_360', (p) => () => turnSiteGroup(createYardSite('gher_yard', 'gher_yard.glb', { x: p.x, z: p.z }, GHER_SOLIDS), p.ry));
  move('map_haystacks', 'new_370', (p) => () => createMapHaystacks({ x: p.x, z: p.z }));
  move('dung_cake_yard', 'new_369', (p) => () => createDungCakeYard({ x: p.x, z: p.z }));
  move('carrom_scene', 'new_355', (p) => () => createCarromScene({ x: p.x, z: p.z }, 'carrom_scene', p.ry));
  move('map_culvert', 'new_culvert', (p) => () => createFieldPropSite('map_culvert', { x: p.x, z: p.z }, [{ part: 'culvert', x: p.x, z: p.z }]));
  move('map_field_gate_wheat', 'zone:map_field_gate_wheat', (p) => () => createFieldPropSite('map_field_gate_wheat', { x: p.x, z: p.z }, [
    { part: 'field_gate', x: p.x - 5.4, z: p.z, solid: [0.9, 0.9] }, { part: 'field_gate_b', x: p.x + 5.4, z: p.z, ry: Math.PI, solid: [0.9, 0.9] },
  ]));

  // 3b. the chemist and the manihari were folded into bazaar units 3 and 7 on the 1 Nov map; the approved map stands them on
  // their own again (its 'Chemist' and 'Manihari' places), so their own site models come back there, turned to their fronts
  for (const [zone, id, make] of [['chemist', 'chemist', createChemist], ['manihari', 'manihari', createManihari]]) {
    const a = ANCHORS[id];
    if (!a || Z.has(zone)) continue;
    zoneManager.register(zone, { x: a.x, z: a.z, buildRadius: 38, teardownRadius: 50, build: () => turnSiteGroup(make({ x: a.x, z: a.z }), a.ry) });
    done.push(`built ${zone} on its own at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`);
  }

  // 4. ride nooks and long-walk sites: the map lists the ones it keeps (as zone:<name>, most moved onto the new farm loop);
  // the rest stood along roads the map removed and are dropped. The site objects are shared with the zone's build closure,
  // so moving the object moves what gets built.
  for (const [prefix, SITES] of [['ride_nook', RIDE_NOOK_SITES], ['long_walk', LONG_WALK_SITES]]) {
    let moved = 0, dropped = 0;
    for (const name of [...Z.keys()]) {
      if (!name.startsWith(prefix + '_')) continue;
      const i = +name.split('_')[2];
      const site = SITES[i], p = getPlace('zone:' + name);
      if (!p) { Z.delete(name); dropped++; continue; }
      if (p.untouched || !site) continue;
      site.x = p.x; site.z = p.z;
      if (prefix === 'ride_nook') {
        // 25 Nov, her order (ROADS MUST BE EMPTY, move never delete): the nook's footprint (its models reach about 2.4 m round the site) must
        // stand 0.6 m beyond the drawn road edge, so the dusty apron stays empty too. A site that does not clear it slides straight away from the road.
        const c = Math.cos(site.ry), sn = Math.sin(site.ry), R = 2.4, pr = [[0, 0]];
        for (const [lx, lz] of [[R, 0], [-R, 0], [0, R], [0, -R], [R * 0.7, R * 0.7], [-R * 0.7, R * 0.7], [R * 0.7, -R * 0.7], [-R * 0.7, -R * 0.7]]) pr.push([lx * c + lz * sn, -lx * sn + lz * c]);
        const mv = roadEmptyPush(site.x, site.z, pr, 8, 0.6);
        if (mv && mv.moved > 0) { done.push(`${name} slid ${mv.moved.toFixed(2)} m off the road apron`); site.x = mv.x; site.z = mv.z; }
      }
      const z = Z.get(name); z.x = site.x; z.z = site.z;
      moved++;
    }
    done.push(`${prefix}: ${moved} moved to the map, ${dropped} dropped (not on the map)`);
  }

  // 4b. hand-offset shade trees round moved places (main.js outskirtTrees: fixed offsets from the anchor, not turned with it)
  // and the old sugarcane belt / neighbour's orchard at the 'cane' anchor (the approved map has its own fields and orchards,
  // built by the shops-land agent; the old belt now crosses the cross road and the west edge lane). Each tree keeps its spot
  // where its trunk, with 2 m of crown, touches no building and no road of the approved map, or moves to the nearest such spot
  // within 8 m; a tree with no clear spot that close is left out.
  const OUTSKIRT = {
    trees_pond: ['pond', [['neem', -18, -10, 21], ['peepal', 20, 12, 22, 0.8], ['babool', -16, 14, 23]]],
    trees_johad: ['johad', [['babool', -16, -9, 24], ['neem', 18, 13, 25, 2.0], ['babool', -14, 15, 26, 1.0]]],
    trees_haveli: ['haveli', [['peepal', -18, 12, 27], ['neem', 20, -16, 28, 0.5]]],
    trees_gaushala: ['gaushala', [['neem', 19, -15, 29], ['peepal', -21, 15, 30, 1.4]]],
  }; // copied from src/main.js (same kinds, offsets, seeds)
  for (const [zone, [id, list]] of Object.entries(OUTSKIRT)) {
    const z = Z.get(zone), a = ANCHORS[id];
    if (!z || !a) continue;
    const keep = list.map(([kind, dx, dz, seed, rotationY]) => { const q = nearestClear(a.x + dx, a.z + dz, 2, 8); return q && { kind, x: q.x, z: q.z, seed, ...(rotationY ? { rotationY } : {}) }; })
      .filter(Boolean);
    if (!keep.length) { Z.delete(zone); done.push(`dropped zone ${zone} (every tree landed on a building or road)`); continue; }
    z.build = () => buildTrees(keep);
    done.push(`${zone}: ${keep.length} of ${list.length} trees kept`);
  }
  for (const zone of ['sugarcane_belt', 'neighbour_orchard']) drop(zone);

  // 5. people and the player
  const attendant = scene && scene.getObjectByName('npc_pump_attendant');
  if (attendant && ANCHORS.yard_petrol) {
    const q = localPt('yard_petrol', 6, 9);
    attendant.position.set(q.x, attendant.position.y, q.z);
    attendant.rotation.y = ANCHORS.yard_petrol.ry - Math.PI / 2;
    done.push('pump attendant stands at the moved petrol pump');
  }
  if (player && inBuilding(player.position.x, player.position.z)) {
    const s = safeSpawn({ x: player.position.x, z: player.position.z });
    player.position.set(s.x, player.position.y, s.z);
    done.push(`player start moved out of a building to (${s.x}, ${s.z})`);
  }
  return done;
}
