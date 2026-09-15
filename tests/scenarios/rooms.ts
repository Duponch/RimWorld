import { newDoorState } from '../../src/sim/door-rules.ts';
import { deconstructionCamp, fixtureBuilding } from './deconstruction.ts';

/** Synthetic two-room camp: 36 cells on either side of a dividing door. */
export function roomCamp() {
  const w = deconstructionCamp(); w.tick = 2000;
  for (let x = 11; x < 20; x++) {
    fixtureBuilding(w, 'wall', x, 10); fixtureBuilding(w, 'wall', x, 20);
  }
  for (let z = 11; z < 20; z++) {
    fixtureBuilding(w, 'wall', 10, z); fixtureBuilding(w, 'wall', 20, z);
    if (z !== 15) fixtureBuilding(w, 'wall', 15, z);
  }
  const door = { id: w.nextId++, kind: 'door' as const, x: 15, z: 15,
    material: 'wood' as const, orientation: 0 as const, footprint: 'standard' as const, door: newDoorState(w.tick) };
  w.structures.push(door);
  const p = w.pawns[0]!; p.x = 17; p.z = 15;
  return w;
}
