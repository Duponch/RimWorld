import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { RoomTopologyCache } from '../src/sim/room-topology.ts';
import { deconstructionCamp, fixtureBuilding } from '../tests/scenarios/deconstruction.ts';

const stats = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return { samples: s.length, p50: s[Math.ceil(s.length * .5) - 1], p95: s[Math.ceil(s.length * .95) - 1], p99: s[Math.ceil(s.length * .99) - 1], max: s.at(-1) };
};
const world = deconstructionCamp(100, 250);
// 100 separate 9x9 enclosures, deliberately independent of the pawn count.
for (let z = 10; z < 210; z += 20) for (let x = 10; x < 210; x += 20) {
  for (let d = 0; d <= 10; d++) { fixtureBuilding(world, 'wall', x + d, z); fixtureBuilding(world, 'wall', x + d, z + 10); }
  for (let d = 1; d < 10; d++) { fixtureBuilding(world, 'wall', x, z + d); fixtureBuilding(world, 'wall', x + 10, z + d); }
}
const cache = new RoomTopologyCache(), first = cache.read(world), gap = world.structures[5]!;
for (let n = 0; n < 100; n++) cache.read(world);
const unchanged: number[] = [], changed: number[] = [];
for (let n = 0; n < 1000; n++) {
  world.tick++; const start = performance.now(), result = cache.read(world); unchanged.push(performance.now() - start);
  if (result !== first) throw Error('Unchanged barriers rebuilt');
}
for (let n = 0; n < 300; n++) {
  gap.kind = n % 2 === 0 ? 'stool' : 'wall';
  const start = performance.now(), result = cache.read(world); changed.push(performance.now() - start);
  const room = result.at(15, 15);
  if (room?.kind !== 'space' || room.touchesMapEdge !== (n % 2 === 0)) throw Error('Breach not reflected');
}
const report = { date: new Date().toISOString(), cpu: cpus()[0]!.model, node: process.version,
  protocol: 'CPU only, 250x250, 4000 walls / 100 rooms / 100 pawns. Setup excluded; 100 warmup scans; 1000 unchanged reads then 300 alternating real barrier changes. One run; no simulation tick or GPU/FPS inference.',
  unchanged: stats(unchanged), rebuild: stats(changed) };
writeFileSync('artifacts/rooms-cpu.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
