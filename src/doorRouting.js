import {
  HOUSE_BLOCK, HOUSE_DOOR_Z, HOUSE_PARTITION_Z,
  SCHOOL_ROOM, SCHOOL_ROOM_DOOR_X, schoolXZ, schoolInverseXZ,
} from './village.js';

/**
 * Walkable buildings, for followers (src/npcRoutines.js createFollowRoutine). `zoneOf(x, z)`
 * is 0 outside and 1, 2... for successive rooms; `links[i]` is the pair of points (one each
 * side of the door, centred on the opening) joining zone i to zone i+1. Doors are the same
 * values the wall geometry is built from, so a re-placed building carries its doors with it.
 */
const H = HOUSE_BLOCK;
const houseInside = (x, z) => Math.abs(x - H.cx) < H.w / 2 && Math.abs(z - H.cz) < H.d / 2;
const R = SCHOOL_ROOM;

export const BUILDING_ROUTES = [
  {
    name: 'house',
    zoneOf: (x, z) => (!houseInside(x, z) ? 0 : z > HOUSE_PARTITION_Z ? 1 : 2),
    links: [
      [{ x: H.cx, z: HOUSE_DOOR_Z + 1.2 }, { x: H.cx, z: HOUSE_DOOR_Z - 1.2 }],
      [{ x: H.cx, z: HOUSE_PARTITION_Z + 1 }, { x: H.cx, z: HOUSE_PARTITION_Z - 1 }],
    ],
  },
  {
    name: 'school_room',
    // the room is built square and the school is turned (map turn): test in the square frame, put the door links in the world
    zoneOf: (x, z) => { const q = schoolInverseXZ(x, z); return Math.abs(q.x - R.cx) < R.w / 2 && Math.abs(q.z - R.cz) < R.d / 2 ? 1 : 0; },
    links: [[schoolXZ(SCHOOL_ROOM_DOOR_X + 1.2, R.cz), schoolXZ(SCHOOL_ROOM_DOOR_X - 1.2, R.cz)]],
  },
];
