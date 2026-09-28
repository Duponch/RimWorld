import { expect, test } from 'vitest';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { structureShotLayer, SHOT_LAYER } from '../src/sim/combat-content.ts';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world.ts';
import { doorOpenTicks } from '../src/sim/door-rules.ts';
import { RoomTopologyCache } from '../src/sim/room-topology.ts';
import { ThermalTopologyCache } from '../src/sim/thermal-topology.ts';
import { RoofContext } from '../src/sim/roof-rules.ts';
import { roomCamp } from './scenarios/rooms.ts';

test('automatic doors keep the same doorway, roof support and open/closed shot semantics as manual doors', () => {
  const world = roomCamp();
  const door = world.structures.find(s => s.kind === 'door')!;
  door.kind = 'autodoor';
  door.power = { on: false, parentId: null };
  door.door!.duration = doorOpenTicks(door);
  const index = door.z * world.width + door.x;
  world.roofing = { constructed: [index], build: [], remove: [], cursor: 0 };

  const rooms = new RoomTopologyCache().read(world);
  expect(rooms.at(door.x, door.z)).toEqual({ kind: 'doorway' });
  expect(rooms.at(12, 15)).not.toBe(rooms.at(17, 15));
  expect(new RoofContext(world).holders[index]).toBe(1);
  expect(new ThermalTopologyCache().read(world).doors.map(d => d.id)).toContain(door.id);
  expect(structureShotLayer(door.kind)).toBe(SHOT_LAYER.door);

  const key = `structure:${door.id}`;
  const closed = captureWorldShotGrid(world);
  expect(closed.blocksSight(door.x, door.z)).toBe(true);
  expect(closed.coverAt(door.x, door.z)).toMatchObject({ key, fill: 1 });
  expect(captureWorldProjectileTargets(world).scene(new Set(), .4).target(key)).toMatchObject({ fill: 1, openDoor: false });

  door.door!.open = true;
  const open = captureWorldShotGrid(world);
  expect(open.blocksSight(door.x, door.z)).toBe(false);
  expect(open.coverAt(door.x, door.z)).toMatchObject({ key, openDoor: true });
  expect(captureWorldProjectileTargets(world).scene(new Set(), .4).target(key)).toMatchObject({ fill: 1, openDoor: true });
  expect(new RoomTopologyCache().read(world).at(door.x, door.z)).toEqual({ kind: 'doorway' });
});
