import { expect, test } from 'vitest';
import { GREENHOUSE_CROP_CELLS, GREENHOUSE_INITIAL_GROWTH, GREENHOUSE_LAMP_CELL, prepareGreenhouseDemo } from '../scripts/generate-greenhouse-demo-v189.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deliveredMaterial } from '../src/sim/construction-materials.ts';
import { plantGrowth } from '../src/sim/plants.ts';
import { sunLampActive } from '../src/sim/sun-lamp.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';

const steel = (world: World) => world.piles.filter(p => p.item === 'steel').reduce((sum, p) => sum + p.quantity, 0);
const rice = (world: World) => world.piles.filter(p => p.item === 'rice').reduce((sum, p) => sum + p.quantity, 0);

test('prepared greenhouse has physical roofs and fueled transmitters but no delivered lamp or harvested output', () => {
  const world = prepareGreenhouseDemo();
  expect(validateWorld(world)).toEqual([]);
  expect(world.pawns).toHaveLength(3); expect(world.roofing!.constructed).toHaveLength(100);
  expect(world.structures.filter(s => s.kind === 'wood-generator')).toHaveLength(3);
  expect(world.structures.filter(s => s.kind === 'wood-generator').every(s => s.fuel?.ticks === 45000 && s.fuel.burned === 0)).toBe(true);
  expect(world.jobs).toHaveLength(1);
  const job = world.jobs[0]!;
  expect(job).toMatchObject({ kind: 'sun-lamp', construction: 'blueprint', status: 'pending', progress: 0, reservedBy: null });
  expect(deliveredMaterial(world, job, 'steel')).toBe(0); expect(steel(world)).toBe(40);
  expect(world.structures.some(s => s.kind === 'sun-lamp')).toBe(false);
  expect(rice(world)).toBe(0);
  expect(world.resources).toHaveLength(3);
  for (const crop of world.resources) {
    expect(crop.growthTick).toBe(world.tick); expect(plantGrowth(world, crop)).toBe(GREENHOUSE_INITIAL_GROWTH);
    expect(world.roofing!.constructed).toContain(crop.z * world.width + crop.x);
  }
  expect(world.pawns.every(p => !p.haul && p.jobId === null && p.orders.active === null && p.orders.queue.length === 0)).toBe(true);
});

test('Ada delivers forty steel and builds before startup; covered rice grows and Noé harvests after exact construction replay', () => {
  const world = prepareGreenhouseDemo(), cropIds = world.resources.map(r => r.id), jobId = world.jobs[0]!.id;
  let resumed: World | undefined;
  let sawCarried = false, sawFrame = false, sawBuildContact = false, sawPowered = false, sawGrowth = false;
  const harvestContacts = new Set<number>();
  let elapsed = 0;
  while ((world.resources.some(r => cropIds.includes(r.id)) || !sawPowered) && elapsed < 2500) {
    const job = world.jobs.find(j => j.id === jobId);
    const lamp = world.structures.find(s => s.kind === 'sun-lamp');
    sawCarried ||= world.piles.some(p => p.item === 'steel' && p.owner.type === 'pawn' && p.owner.pawnId === world.pawns[0]!.id);
    sawFrame ||= job?.construction === 'frame';
    if (job && job.progress > 0) {
      expect(deliveredMaterial(world, job, 'steel')).toBe(40);
      const ada = world.pawns[0]!;
      expect(ada.jobId).toBe(jobId);
      expect(Math.abs(ada.x - GREENHOUSE_LAMP_CELL.x) + Math.abs(ada.z - GREENHOUSE_LAMP_CELL.z)).toBeLessThanOrEqual(1);
      sawBuildContact = true;
      if (!resumed) { expect(validateWorld(world)).toEqual([]); resumed = deserializeWorld(serializeWorld(world)); }
    }
    if (lamp && sunLampActive(world, lamp)) {
      expect(sawBuildContact).toBe(true); expect(lamp.power!.parentId).not.toBeNull(); sawPowered = true;
      for (const crop of world.resources.filter(r => cropIds.includes(r.id))) {
        expect(crop.growthLight).toBe('artificial-full');
        sawGrowth ||= plantGrowth(world, crop) > GREENHOUSE_INITIAL_GROWTH;
      }
    }
    for (const harvest of world.jobs.filter(j => j.kind === 'harvest' && j.progress > 0)) {
      const plant = world.resources.find(r => r.x === harvest.x && r.z === harvest.z);
      if (!plant || !cropIds.includes(plant.id)) continue;
      expect(sawPowered).toBe(true); expect(plantGrowth(world, plant)).toBe(1);
      const noe = world.pawns[1]!; expect(noe.jobId).toBe(harvest.id);
      expect(Math.abs(noe.x - plant.x) + Math.abs(noe.z - plant.z)).toBeLessThanOrEqual(1);
      harvestContacts.add(plant.id);
    }
    expect(steel(world) + (lamp ? 40 : 0)).toBe(40);
    stepWorld(world); if (resumed) stepWorld(resumed); elapsed++;
  }
  expect(elapsed).toBeLessThan(2500);
  expect(sawCarried && sawFrame && sawBuildContact && sawPowered && sawGrowth).toBe(true);
  expect(harvestContacts.size).toBe(3);
  expect(world.resources.some(r => cropIds.includes(r.id))).toBe(false);
  expect(rice(world)).toBe(18); expect(steel(world)).toBe(0);
  expect(world.piles.filter(p => p.item === 'rice').every(p => p.owner.type === 'ground' && GREENHOUSE_CROP_CELLS.some(c => p.owner.type === 'ground' && p.owner.x === c.x && p.owner.z === c.z))).toBe(true);
  expect(world.jobs.some(j => j.id === jobId)).toBe(false);
  expect(world.structures.filter(s => s.kind === 'sun-lamp')).toHaveLength(1);
  expect(world.structures.filter(s => s.kind === 'wood-generator').every(s => s.fuel!.ticks < 45000 && s.fuel!.ticks > 0 && s.fuel!.burned > 0)).toBe(true);
  expect(resumed).toBeDefined(); expect(resumed).toEqual(world); expect(validateWorld(world)).toEqual([]);
});
