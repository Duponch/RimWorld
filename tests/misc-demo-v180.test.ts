import { withoutMiningSkill, withoutPredatorDefaults } from './scenarios/legacy-skills.ts';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { MISC_DEMO_TICK, miscDemoManifestEntry, prepareMiscDemo } from '../scripts/generate-misc-demo-v180.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { outdoorTemperature } from '../src/sim/temperature.ts';
import type { World } from '../src/sim/types.ts';

const fixturePath = new URL('../public/test-saves/v180/canicule-et-refuge.json', import.meta.url);
const stock = (world: World, item: string) => world.piles.filter(pile => pile.item === item).reduce((sum, pile) => sum + pile.quantity, 0);

test('V180 public refuge is sealed, physically supplied, and one real step resolves its introductory Cassandra ticket', () => {
  const raw = readFileSync(fixturePath, 'utf8');
  const world = deserializeWorld(raw);
  const prepared=withoutPredatorDefaults(withoutMiningSkill(prepareMiscDemo()));
  // Arid species and weights are unchanged; retain the published V169 profile.
  prepared.wildlife!.profile='biome-herbivores-v1';
  expect(world).toEqual(prepared);
  expect(world.tick).toBe(MISC_DEMO_TICK);
  expect(world.width).toBe(250);
  expect(world.site?.biome).toBe('arid-shrubland');
  expect(world.pawns).toHaveLength(3);
  expect(world.miscIncidents).toMatchObject({ introDone: false, opportunities: 0, heatwaves: 0 });
  expect(world.miscIncidents?.active).toBeUndefined();
  expect(world.pawns.every(pawn => pawn.health?.heatstroke === undefined && pawn.skills.plants?.xp === 0)).toBe(true);
  expect(stock(world, 'wood')).toBe(40);
  expect(stock(world, 'survival-meal')).toBe(50);
  expect(world.structures.filter(s => s.kind === 'wall')).toHaveLength(19);
  expect(world.structures.filter(s => s.kind === 'door')).toHaveLength(1);
  expect(world.structures.filter(s => s.kind === 'bed')).toHaveLength(2);
  expect(world.roofing?.constructed).toHaveLength(16);
  const cooler = world.structures.find(s => s.kind === 'passive-cooler')!;
  expect(cooler.fuel?.ticks).toBe(30_000);
  expect(world.thermal?.regions.some(r => r.cells.includes(cooler.z * world.width + cooler.x))).toBe(true);
  const hash = createHash('sha256').update(raw).digest('hex');
  expect(miscDemoManifestEntry(world, hash)).toMatchObject({ id: 'canicule-et-refuge-v180', sha256: hash, tick: MISC_DEMO_TICK });
  const gameRng = world.rng;
  stepWorld(world);
  expect(world.tick).toBe(26_400);
  expect(world.miscIncidents).toMatchObject({ introDone: true, opportunities: 1, heatwaves: 1, active: { start: 26_400 } });
  expect(world.rng).toBe(gameRng);
  expect(world.events.some(event => event.tick === 26_400 && event.message.startsWith('Canicule :'))).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});

test('V180 real warm ramp keeps roof air cooler and wood conserved across an exact saved continuation', () => {
  const world = deserializeWorld(readFileSync(fixturePath, 'utf8'));
  const initialOutside = outdoorTemperature(world);
  for (let n = 0; n < 250; n++) stepWorld(world);
  expect(validateWorld(world)).toEqual([]);
  const resumed = deserializeWorld(serializeWorld(world));
  for (let n = 0; n < 250; n++) { stepWorld(world); stepWorld(resumed); }
  expect(resumed).toEqual(world);
  expect(world.miscIncidents?.heatwaves).toBe(1);
  expect(world.miscIncidents?.active).toBeDefined();
  expect(outdoorTemperature(world)).toBeGreaterThan(initialOutside + 5);
  expect(world.thermal!.regions[0]!.temperature).toBeLessThan(outdoorTemperature(world) - 10);
  expect(world.structures.find(s => s.kind === 'passive-cooler')?.fuel).toMatchObject({ ticks: 29_500, burned: 500 });
  expect(stock(world, 'wood')).toBe(40);
  expect(stock(world, 'survival-meal')).toBe(50);
  expect(world.pawns.every(pawn => pawn.state !== 'dead' && pawn.state !== 'downed')).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});
